/**
 * Live Mushaira / Voice Room — WebRTC audio + Supabase Realtime (WebSocket) sync.
 * Signaling, presence, seat state, and host commands use Supabase Realtime channels.
 */
const LIVE_ROOM = {
  MUSHAIRA_SEATS: 120,
  VOICE_ROOM_SEATS: 50,
  MAX_ACTIVE_SPEAKERS: 15,
  ICE_SERVERS: [
    { urls: 'stun:stun.l.google.com:19302' },
    { urls: 'stun:stun1.l.google.com:19302' },
    { urls: 'stun:stun2.l.google.com:19302' }
  ]
};

const VoiceRoomLive = {
  roomKey: null,
  roomMeta: null,
  channel: null,
  localStream: null,
  micOn: false,
  mutedByHost: false,
  canSpeak: true,
  isSpeaking: false,
  mySlot: null,
  peers: new Map(),
  remoteAudios: new Map(),
  pendingCandidates: new Map(),
  presenceState: {},
  chatMessages: [],
  _pollTimer: null,
  _storageKey: null,
  _speakInterval: null,
  _audioCtx: null,

  get maxSlots() {
    if (this.roomMeta?.maxSeats) return this.roomMeta.maxSeats;
    return (this.roomKey || '').startsWith('mushaira')
      ? LIVE_ROOM.MUSHAIRA_SEATS
      : LIVE_ROOM.VOICE_ROOM_SEATS;
  },

  async init(meta) {
    this.destroy();
    this.roomKey = meta.roomKey;
    this.roomMeta = meta;
    this._storageKey = `voice_room_${this.roomKey}`;
    this.mutedByHost = false;
    this.canSpeak = true;
    this.isSpeaking = false;

    if (Auth.isGuest()) {
      Components.showToast('Please sign in to join voice rooms', 'error');
      return;
    }

    this._renderSlots();
    this._renderParticipantList();
    this._renderChat();
    this._bindControls();
    this._updateHostPanelVisibility();

    if (SupabaseClient.isEnabled() && Auth.getCurrentUser()?.id) {
      await this._initSupabase();
    } else {
      this._initLocalFallback();
    }

    this._appendSystemMessage(
      `Welcome to ${meta.title}! Tap "Check In" or pick a seat (${this.maxSlots} max), then turn on your mic to speak.`
    );
  },

  destroy() {
    const sb = SupabaseClient.get();
    if (this._onStorageSync) {
      window.removeEventListener('storage', this._onStorageSync);
      this._onStorageSync = null;
    }
    if (this.channel && sb) {
      try { sb.removeChannel(this.channel); } catch (_) {}
    }
    if (this._pollTimer) clearInterval(this._pollTimer);
    this._stopSpeakingMonitor();
    this._stopMicTracks();
    this._closeAllPeers();
    this.channel = null;
    this.roomKey = null;
    this.presenceState = {};
    this.chatMessages = [];
    this.mySlot = null;
    this.mutedByHost = false;
    this.canSpeak = true;
  },

  _isHost() {
    const user = Auth.getCurrentUser();
    if (!user) return false;
    if (this.roomMeta.hostOwnerId && user.id === this.roomMeta.hostOwnerId) return true;
    return this.roomMeta.host === user.name;
  },

  _isTransmitting() {
    return !!(this.micOn && this.localStream && !this.mutedByHost && this.canSpeak);
  },

  _isAudible(p) {
    return !!(p?.micOn && !p.mutedByHost && p.canSpeak !== false);
  },

  _activeSpeakerCount() {
    return this._getAllParticipants().filter(p => this._isAudible(p)).length;
  },

  _shouldInitiateOffer(localId, remoteId) {
    return String(localId).localeCompare(String(remoteId)) < 0;
  },

  _initLocalFallback() {
    this._loadLocalState();
    this._pollTimer = setInterval(() => this._loadLocalState(), 2000);
    window.addEventListener('storage', this._onStorageSync = (e) => {
      if (e.key === this._storageKey) this._loadLocalState();
    });
    this._joinLocalPresence();
  },

  async _initSupabase() {
    const sb = SupabaseClient.get();
    const user = Auth.getCurrentUser();
    if (!sb || !user?.id) return;

    this.channel = sb.channel(`voice:${this.roomKey}`, {
      config: { presence: { key: user.id }, broadcast: { self: false } }
    });

    const onPresenceChange = () => {
      this.presenceState = this.channel.presenceState();
      this._syncMyStateFromPresence();
      this._renderSlots();
      this._renderParticipantList();
      this._updateParticipantCount();
      this._updateSeatStats();
      this._syncVoiceConnections();
    };

    this.channel
      .on('presence', { event: 'sync' }, onPresenceChange)
      .on('presence', { event: 'join' }, ({ key, newPresences }) => {
        onPresenceChange();
        const name = newPresences?.[0]?.name;
        if (name && key !== user.id) {
          this._appendSystemMessage(`${name} joined the room`);
        }
      })
      .on('presence', { event: 'leave' }, ({ leftPresences }) => {
        onPresenceChange();
        const name = leftPresences?.[0]?.name;
        if (name) this._appendSystemMessage(`${name} left the room`);
      })
      .on('broadcast', { event: 'room_chat' }, ({ payload }) => {
        if (payload) this._appendChatMessage(payload, false);
      })
      .on('broadcast', { event: 'webrtc_signal' }, ({ payload }) => {
        if (payload) this._handleSignal(payload);
      })
      .on('broadcast', { event: 'host_action' }, ({ payload }) => {
        if (payload) this._handleHostAction(payload);
      })
      .subscribe(async (status) => {
        if (status === 'SUBSCRIBED') await this._trackPresence();
      });
  },

  async _trackPresence() {
    const user = Auth.getCurrentUser();
    await this.channel?.track({
      userId: user.id,
      name: user.name,
      avatar: user.avatar,
      slot: this.mySlot,
      micOn: this.micOn && !this.mutedByHost,
      mutedByHost: this.mutedByHost,
      canSpeak: this.canSpeak,
      isSpeaking: this.isSpeaking,
      isHost: this._isHost(),
      checkedIn: !!this.mySlot
    });
  },

  _joinLocalPresence() {
    const user = Auth.getCurrentUser();
    const state = this._getLocalState();
    if (!state.users[user.id]) {
      state.users[user.id] = {
        userId: user.id,
        name: user.name,
        avatar: user.avatar,
        slot: null,
        micOn: false,
        mutedByHost: false,
        canSpeak: true,
        isSpeaking: false,
        isHost: this._isHost(),
        checkedIn: false
      };
      this._saveLocalState(state);
    }
    this._applyLocalUsers(state.users);
  },

  _getLocalState() {
    return Storage.get(this._storageKey, { users: {}, messages: [] });
  },

  _saveLocalState(state) {
    Storage.set(this._storageKey, state);
  },

  _loadLocalState() {
    const state = this._getLocalState();
    this._applyLocalUsers(state.users);
    (state.messages || []).forEach(m => {
      if (!this.chatMessages.find(c => c.id === m.id)) this.chatMessages.push(m);
    });
    this._renderChat();
    this._updateParticipantCount();
    this._updateSeatStats();
  },

  _applyLocalUsers(users) {
    this.presenceState = {};
    Object.entries(users || {}).forEach(([id, data]) => {
      this.presenceState[id] = [{ ...data }];
    });
    this._syncMyStateFromPresence();
    this._renderSlots();
    this._renderParticipantList();
  },

  _getAllParticipants() {
    const list = [];
    Object.values(this.presenceState).forEach(arr => {
      (arr || []).forEach(p => { if (p?.userId) list.push(p); });
    });
    return list;
  },

  _getParticipant(userId) {
    return this._getAllParticipants().find(p => p.userId === userId);
  },

  _getParticipantInSlot(slot) {
    return this._getAllParticipants().find(p => p.slot === slot);
  },

  _syncMyStateFromPresence() {
    const user = Auth.getCurrentUser();
    const me = this._getAllParticipants().find(p => p.userId === user?.id);
    if (me?.slot) this.mySlot = me.slot;
    if (me && me.mutedByHost && !this.mutedByHost) {
      this._applyHostMute(true, false);
    }
    if (me && me.canSpeak === false && this.canSpeak) {
      this.canSpeak = false;
      if (this.micOn) this._stopMicTracks();
    }
  },

  _getParticipantStatus(p) {
    const user = Auth.getCurrentUser();
    const isMe = p.userId === user?.id;
    if (p.isSpeaking && this._isAudible(p)) return { label: 'Speaking', cls: 'status-speaking' };
    if (p.mutedByHost) return { label: 'Muted by host', cls: 'status-muted-host' };
    if (p.micOn) return { label: 'Mic on', cls: 'status-live' };
    if (p.slot) return { label: 'Seated', cls: 'status-connected' };
    return { label: 'Connected', cls: 'status-connected' };
  },

  _updateMicUI() {
    const btn = document.getElementById('live-mic-btn');
    const label = btn?.querySelector('.mic-label');
    const icon = btn?.querySelector('.mic-icon');
    const blocked = this.mutedByHost || !this.canSpeak;

    if (btn) {
      btn.classList.toggle('active', this.micOn && !blocked);
      btn.disabled = blocked;
    }
    if (label) {
      if (this.mutedByHost) label.textContent = 'Host Muted';
      else if (!this.canSpeak) label.textContent = 'No Speak';
      else label.textContent = this.micOn ? 'Mic On' : 'Mic Off';
    }
    if (icon) icon.textContent = this.micOn && !blocked ? '🎙️' : '🎤';

    const prompt = document.getElementById('live-mic-prompt');
    if (prompt) {
      if (blocked) {
        prompt.hidden = false;
        prompt.querySelector('.live-mic-prompt-text').textContent =
          this.mutedByHost ? 'The host muted your microphone.' : 'Speaking permission revoked by host.';
        prompt.querySelector('#live-mic-prompt-btn')?.setAttribute('hidden', '');
      } else if (this.mySlot && !this.micOn) {
        prompt.hidden = false;
        prompt.querySelector('.live-mic-prompt-text').textContent =
          `Seat ${this.mySlot} reserved — tap Mic Off below or your avatar to speak.`;
        prompt.querySelector('#live-mic-prompt-btn')?.removeAttribute('hidden');
      } else {
        prompt.hidden = true;
      }
    }
  },

  _updateHostPanelVisibility() {
    const panel = document.getElementById('live-host-panel');
    if (panel) panel.hidden = !this._isHost();
  },

  _updateSeatStats() {
    const el = document.getElementById('live-seat-filled');
    if (el) {
      const seated = this._getAllParticipants().filter(p => p.slot).length;
      el.textContent = seated;
    }
    const maxEl = document.getElementById('live-seat-max');
    if (maxEl) maxEl.textContent = this.maxSlots;
  },

  _renderSlots() {
    const grid = document.getElementById('live-room-slots');
    if (!grid) return;

    const user = Auth.getCurrentUser();
    const maxSlots = this.maxSlots;
    const compact = maxSlots > 30;
    grid.classList.toggle('compact-grid', compact);

    grid.innerHTML = Array.from({ length: maxSlots }, (_, i) => {
      const slot = i + 1;
      const occupant = this._getParticipantInSlot(slot);
      const isMe = occupant?.userId === user?.id;
      const audible = occupant && this._isAudible(occupant);
      const speaking = occupant?.isSpeaking && audible;
      const hostMuted = occupant?.mutedByHost;

      if (occupant) {
        const micBtn = isMe && !hostMuted && this.canSpeak ? `
          <button type="button" class="live-slot-mic ${audible ? 'on' : 'off'} mic-toggle-btn" aria-label="${audible ? 'Mute' : 'Unmute'}">
            ${speaking ? '🗣️' : audible ? '🎙️' : '🔇'}
          </button>
        ` : `<span class="live-slot-mic ${hostMuted ? 'host-muted' : audible ? 'on' : 'off'}">${hostMuted ? '🚫' : speaking ? '🗣️' : audible ? '🎙️' : '🔇'}</span>`;

        return `
          <button type="button" class="live-slot occupied ${isMe ? 'me' : ''} ${speaking ? 'speaking' : audible ? 'live' : ''} ${hostMuted ? 'host-muted' : ''}" data-slot="${slot}">
            <div class="live-slot-avatar-wrap">
              ${avatarImg(occupant.name, 'live-slot-avatar', occupant.name)}
              ${micBtn}
            </div>
            <span class="live-slot-name">${isMe ? 'You' : (occupant.name || '').split(' ')[0]}</span>
            ${occupant.isHost ? '<span class="live-slot-badge">Host</span>' : ''}
          </button>
        `;
      }
      return `
        <button type="button" class="live-slot empty" data-slot="${slot}">
          <div class="live-slot-empty-icon">+</div>
          <span class="live-slot-label">${compact ? slot : 'NO.' + slot}</span>
        </button>
      `;
    }).join('');

    grid.querySelectorAll('.live-slot').forEach(btn => {
      btn.onclick = (e) => {
        if (e.target.closest('.mic-toggle-btn')) {
          e.stopPropagation();
          this.toggleMic();
          return;
        }
        this._handleSlotClick(parseInt(btn.dataset.slot, 10));
      };
    });

    this._updateMicUI();
    this._updateHostPanelVisibility();
  },

  _renderParticipantList() {
    const list = document.getElementById('live-participants-list');
    if (!list) return;

    const user = Auth.getCurrentUser();
    const participants = this._getAllParticipants();
    const isHost = this._isHost();

    list.innerHTML = participants.length ? participants.map(p => {
      const status = this._getParticipantStatus(p);
      const isMe = p.userId === user?.id;
      return `
        <div class="live-participant-row ${status.cls}" data-user-id="${p.userId}">
          ${avatarImg(p.name, 'live-participant-avatar', p.name)}
          <div class="live-participant-info">
            <strong>${isMe ? 'You' : this._escape(p.name)}${p.isHost ? ' ★' : ''}</strong>
            <span class="live-participant-status">${status.label}${p.slot ? ` · Seat ${p.slot}` : ''}</span>
          </div>
          ${isHost && !isMe ? `
            <div class="live-host-actions">
              ${p.micOn ? `<button type="button" class="btn btn-sm btn-outline-gold host-mute-btn" data-user-id="${p.userId}">Mute</button>` :
                `<button type="button" class="btn btn-sm btn-gold host-unmute-btn" data-user-id="${p.userId}">Unmute</button>`}
              ${p.canSpeak === false ?
                `<button type="button" class="btn btn-sm btn-gold host-grant-btn" data-user-id="${p.userId}">Allow</button>` :
                `<button type="button" class="btn btn-sm btn-outline-gold host-revoke-btn" data-user-id="${p.userId}">Revoke</button>`}
              <button type="button" class="btn btn-sm host-remove-btn" data-user-id="${p.userId}">Remove</button>
            </div>
          ` : ''}
        </div>
      `;
    }).join('') : '<p class="empty-state">Waiting for participants…</p>';

    list.querySelectorAll('.host-mute-btn').forEach(b => {
      b.onclick = () => this._hostAction('mute', b.dataset.userId);
    });
    list.querySelectorAll('.host-unmute-btn').forEach(b => {
      b.onclick = () => this._hostAction('unmute', b.dataset.userId);
    });
    list.querySelectorAll('.host-grant-btn').forEach(b => {
      b.onclick = () => this._hostAction('grant_speak', b.dataset.userId);
    });
    list.querySelectorAll('.host-revoke-btn').forEach(b => {
      b.onclick = () => this._hostAction('revoke_speak', b.dataset.userId);
    });
    list.querySelectorAll('.host-remove-btn').forEach(b => {
      b.onclick = () => this._hostAction('remove', b.dataset.userId);
    });
  },

  async _handleSlotClick(slot) {
    const user = Auth.getCurrentUser();
    const occupant = this._getParticipantInSlot(slot);

    if (occupant && occupant.userId !== user.id) {
      Components.showToast(`${occupant.name} is on seat ${slot}`, 'error');
      return;
    }

    if (occupant && occupant.userId === user.id) {
      await this.toggleMic();
      return;
    }

    if (this.mySlot) await this._updateMySlot(null);
    this.mySlot = slot;
    await this._updateMySlot(this.mySlot);
    this._renderSlots();
    this._renderParticipantList();
    Components.showToast(`Seat ${slot} reserved — turn on mic to speak`);
  },

  async _checkIn() {
    if (this.mySlot) {
      Components.showToast(`Already checked in at seat ${this.mySlot}`);
      return;
    }
    for (let s = 1; s <= this.maxSlots; s++) {
      if (!this._getParticipantInSlot(s)) {
        this.mySlot = s;
        await this._updateMySlot(s);
        this._renderSlots();
        this._renderParticipantList();
        Components.showToast(`Checked in — seat ${s} reserved`);
        return;
      }
    }
    Components.showToast('All seats are full (120 max)', 'error');
  },

  async _updateMySlot(slot) {
    const user = Auth.getCurrentUser();
    const payload = {
      userId: user.id,
      name: user.name,
      avatar: user.avatar,
      slot,
      micOn: this.micOn && !this.mutedByHost,
      mutedByHost: this.mutedByHost,
      canSpeak: this.canSpeak,
      isSpeaking: this.isSpeaking,
      isHost: this._isHost(),
      checkedIn: !!slot
    };

    if (SupabaseClient.isEnabled() && this.channel) {
      await this.channel.track(payload);
    } else {
      const state = this._getLocalState();
      if (!state.users[user.id]) state.users[user.id] = { userId: user.id, name: user.name };
      Object.assign(state.users[user.id], payload);
      this._saveLocalState(state);
      this._applyLocalUsers(state.users);
    }
  },

  _bindControls() {
    document.getElementById('live-mic-btn')?.addEventListener('click', () => this.toggleMic());
    document.getElementById('live-mic-prompt-btn')?.addEventListener('click', () => this.toggleMic());
    document.getElementById('live-checkin-btn')?.addEventListener('click', () => this._checkIn());
    document.getElementById('live-leave-seat-btn')?.addEventListener('click', () => this._leaveSeat());
    document.getElementById('live-leave-btn')?.addEventListener('click', () => {
      this.destroy();
      Router.go(this.roomMeta.leavePath || '/voice-rooms');
    });

    const form = document.getElementById('live-room-chat-form');
    form?.addEventListener('submit', (e) => {
      e.preventDefault();
      const text = form.querySelector('input')?.value?.trim();
      if (!text) return;
      this.sendChat(text);
      form.querySelector('input').value = '';
    });

    document.getElementById('live-chat-toggle')?.addEventListener('click', () => {
      document.querySelector('.live-room-chat-panel')?.classList.toggle('collapsed');
    });
  },

  async toggleMic() {
    if (this.mutedByHost) {
      Components.showToast('Host muted you — wait for host to unmute', 'error');
      return;
    }
    if (!this.canSpeak) {
      Components.showToast('Host revoked speaking permission', 'error');
      return;
    }

    if (this.micOn) {
      await this._stopMicTracks();
      Components.showToast('Microphone off');
      return;
    }

    if (!this.mySlot) {
      Components.showToast('Check in or pick a seat first', 'error');
      return;
    }

    if (this._activeSpeakerCount() >= LIVE_ROOM.MAX_ACTIVE_SPEAKERS) {
      Components.showToast(`Max ${LIVE_ROOM.MAX_ACTIVE_SPEAKERS} speakers at once — wait for a slot`, 'error');
      return;
    }

    try {
      this.localStream = await navigator.mediaDevices.getUserMedia({
        audio: { echoCancellation: true, noiseSuppression: true, autoGainControl: true },
        video: false
      });
      this.micOn = true;
      await this._updateMySlot(this.mySlot);
      this._startSpeakingMonitor();
      this._renderSlots();
      this._renderParticipantList();
      await this._syncVoiceConnections();
      await this._addLocalTracksToPeers();
      Components.showToast('Microphone on — others can hear you now');
    } catch {
      Components.showToast('Allow microphone access in browser settings', 'error');
    }
  },

  async _leaveSeat() {
    if (!this.mySlot) {
      Components.showToast('No seat to leave', 'error');
      return;
    }
    await this._stopMicTracks();
    this.mySlot = null;
    await this._updateMySlot(null);
    this._renderSlots();
    this._renderParticipantList();
    Components.showToast('Seat released');
  },

  async _stopMicTracks() {
    this.micOn = false;
    this.isSpeaking = false;
    this._stopSpeakingMonitor();
    if (this.localStream) {
      this.localStream.getTracks().forEach(t => t.stop());
      this.localStream = null;
    }
    await this._removeLocalTracksFromPeers();
    if (this.mySlot) await this._updateMySlot(this.mySlot);
    this._renderSlots();
    this._renderParticipantList();
  },

  _startSpeakingMonitor() {
    this._stopSpeakingMonitor();
    if (!this.localStream) return;

    try {
      this._audioCtx = new (window.AudioContext || window.webkitAudioContext)();
      const analyser = this._audioCtx.createAnalyser();
      analyser.fftSize = 512;
      const source = this._audioCtx.createMediaStreamSource(this.localStream);
      source.connect(analyser);
      const data = new Uint8Array(analyser.frequencyBinCount);

      this._speakInterval = setInterval(async () => {
        analyser.getByteFrequencyData(data);
        const avg = data.reduce((a, b) => a + b, 0) / data.length;
        const speaking = avg > 18 && this._isTransmitting();
        if (speaking !== this.isSpeaking) {
          this.isSpeaking = speaking;
          await this._updateMySlot(this.mySlot);
          this._renderSlots();
          this._renderParticipantList();
        }
      }, 250);
    } catch (_) {}
  },

  _stopSpeakingMonitor() {
    if (this._speakInterval) clearInterval(this._speakInterval);
    this._speakInterval = null;
    if (this._audioCtx) {
      try { this._audioCtx.close(); } catch (_) {}
      this._audioCtx = null;
    }
  },

  /* ===== WebRTC (mesh among speakers; recv-only for listeners) ===== */

  async _createPeerConnection(remoteUserId) {
    if (this.peers.has(remoteUserId)) {
      const existing = this.peers.get(remoteUserId);
      if (existing.connectionState !== 'closed') return existing;
      this.peers.delete(remoteUserId);
    }

    const pc = new RTCPeerConnection({ iceServers: LIVE_ROOM.ICE_SERVERS });
    this.peers.set(remoteUserId, pc);

    pc.ontrack = (e) => {
      const stream = e.streams[0] || new MediaStream([e.track]);
      this._playRemoteAudio(remoteUserId, stream);
    };

    pc.onicecandidate = (e) => {
      if (e.candidate) this._sendSignal(remoteUserId, { candidate: e.candidate.toJSON() });
    };

    pc.onconnectionstatechange = () => {
      if (pc.connectionState === 'failed') {
        this._closePeer(remoteUserId);
        this._negotiateWithPeer(remoteUserId);
      }
    };

    if (this._isTransmitting() && this.localStream) {
      this.localStream.getTracks().forEach(track => pc.addTrack(track, this.localStream));
    } else {
      pc.addTransceiver('audio', { direction: 'recvonly' });
    }

    return pc;
  },

  async _negotiateWithPeer(remoteUserId) {
    const user = Auth.getCurrentUser();
    const pc = await this._createPeerConnection(remoteUserId);

    if (this._shouldInitiateOffer(user.id, remoteUserId) && pc.signalingState === 'stable') {
      try {
        const offer = await pc.createOffer();
        await pc.setLocalDescription(offer);
        this._sendSignal(remoteUserId, { sdp: pc.localDescription });
      } catch (err) {
        console.warn('Offer error:', err);
      }
    }
  },

  async _syncVoiceConnections() {
    const user = Auth.getCurrentUser();
    const needed = new Set();

    this._getAllParticipants().forEach(p => {
      if (p.userId === user.id) return;
      if (this._isAudible(p)) needed.add(p.userId);
      if (this._isTransmitting()) needed.add(p.userId);
    });

    for (const id of needed) {
      await this._negotiateWithPeer(id);
    }

    for (const [id] of this.peers) {
      if (!needed.has(id)) this._closePeer(id);
    }
  },

  async _addLocalTracksToPeers() {
    if (!this.localStream) return;
    for (const [remoteId, pc] of this.peers) {
      if (pc.connectionState === 'closed') continue;
      const hasAudio = pc.getSenders().some(s => s.track?.kind === 'audio');
      if (!hasAudio) {
        this.localStream.getTracks().forEach(t => pc.addTrack(t, this.localStream));
        const user = Auth.getCurrentUser();
        if (this._shouldInitiateOffer(user.id, remoteId) && pc.signalingState === 'stable') {
          const offer = await pc.createOffer();
          await pc.setLocalDescription(offer);
          this._sendSignal(remoteId, { sdp: pc.localDescription });
        }
      }
    }
  },

  async _removeLocalTracksFromPeers() {
    for (const [, pc] of this.peers) {
      pc.getSenders().forEach(s => { if (s.track) pc.removeTrack(s); });
    }
    await this._syncVoiceConnections();
  },

  _closePeer(remoteUserId) {
    const pc = this.peers.get(remoteUserId);
    if (pc) {
      try { pc.close(); } catch (_) {}
      this.peers.delete(remoteUserId);
    }
    this.pendingCandidates.delete(remoteUserId);
    const audio = this.remoteAudios.get(remoteUserId);
    if (audio) {
      audio.srcObject = null;
      audio.remove();
      this.remoteAudios.delete(remoteUserId);
    }
  },

  _closeAllPeers() {
    for (const id of [...this.peers.keys()]) this._closePeer(id);
  },

  _sendSignal(toUserId, data) {
    const user = Auth.getCurrentUser();
    const payload = { from: user.id, to: toUserId, ...data };
    if (this.channel) {
      this.channel.send({ type: 'broadcast', event: 'webrtc_signal', payload });
    }
  },

  async _handleSignal(payload) {
    const user = Auth.getCurrentUser();
    if (payload.to !== user.id) return;

    const remoteId = payload.from;
    let pc = this.peers.get(remoteId);
    if (!pc) pc = await this._createPeerConnection(remoteId);

    try {
      if (payload.sdp) {
        const desc = new RTCSessionDescription(payload.sdp);
        if (desc.type === 'offer') {
          await pc.setRemoteDescription(desc);
          await this._flushPendingCandidates(remoteId, pc);
          const answer = await pc.createAnswer();
          await pc.setLocalDescription(answer);
          this._sendSignal(remoteId, { sdp: pc.localDescription });
        } else if (desc.type === 'answer') {
          await pc.setRemoteDescription(desc);
          await this._flushPendingCandidates(remoteId, pc);
        }
      } else if (payload.candidate?.candidate) {
        if (pc.remoteDescription) {
          await pc.addIceCandidate(new RTCIceCandidate(payload.candidate));
        } else {
          if (!this.pendingCandidates.has(remoteId)) this.pendingCandidates.set(remoteId, []);
          this.pendingCandidates.get(remoteId).push(payload.candidate);
        }
      }
    } catch (err) {
      console.warn('WebRTC signal error:', err);
    }
  },

  async _flushPendingCandidates(remoteId, pc) {
    const pending = this.pendingCandidates.get(remoteId) || [];
    this.pendingCandidates.delete(remoteId);
    for (const c of pending) {
      try { await pc.addIceCandidate(new RTCIceCandidate(c)); } catch (_) {}
    }
  },

  _playRemoteAudio(userId, stream) {
    let audio = this.remoteAudios.get(userId);
    if (!audio) {
      audio = document.createElement('audio');
      audio.autoplay = true;
      audio.playsInline = true;
      audio.setAttribute('playsinline', '');
      audio.style.display = 'none';
      document.body.appendChild(audio);
      this.remoteAudios.set(userId, audio);
    }
    audio.srcObject = stream;
    audio.play().catch(() => {});
  },

  /* ===== Host controls ===== */

  _hostAction(action, targetUserId) {
    if (!this._isHost()) {
      Components.showToast('Only the host can do this', 'error');
      return;
    }
    const target = this._getParticipant(targetUserId);
    if (!target) return;

    const payload = {
      action,
      targetUserId,
      by: Auth.getCurrentUser().id,
      targetName: target.name
    };

    if (this.channel) {
      this.channel.send({ type: 'broadcast', event: 'host_action', payload });
    }
    this._handleHostAction(payload, true);
  },

  async _handleHostAction(payload, fromSelf = false) {
    const user = Auth.getCurrentUser();
    const isTarget = payload.targetUserId === user?.id;
    const isHost = this._isHost();

    if (!isTarget && !isHost && !fromSelf) return;

    switch (payload.action) {
      case 'mute':
        if (isTarget) await this._applyHostMute(true);
        if (isHost || fromSelf) this._appendSystemMessage(`${payload.targetName || 'User'} was muted by host`);
        break;
      case 'unmute':
        if (isTarget) await this._applyHostMute(false);
        if (isHost || fromSelf) this._appendSystemMessage(`${payload.targetName || 'User'} was unmuted by host`);
        break;
      case 'revoke_speak':
        if (isTarget) await this._applySpeakPermission(false);
        if (isHost || fromSelf) this._appendSystemMessage(`${payload.targetName || 'User'} speaking revoked`);
        break;
      case 'grant_speak':
        if (isTarget) await this._applySpeakPermission(true);
        if (isHost || fromSelf) this._appendSystemMessage(`${payload.targetName || 'User'} can speak now`);
        break;
      case 'remove':
        if (isTarget) {
          await this._forceRemove();
          Components.showToast('Removed from room by host', 'error');
          setTimeout(() => Router.go(this.roomMeta.leavePath || '/mushaira'), 1500);
        } else if (isHost || fromSelf) {
          this._appendSystemMessage(`${payload.targetName || 'User'} was removed by host`);
        }
        break;
    }

    if (isHost || fromSelf) {
      this._renderParticipantList();
      this._renderSlots();
    }
  },

  async _applyHostMute(muted, updatePresence = true) {
    this.mutedByHost = muted;
    if (muted && this.micOn) await this._stopMicTracks();
    if (updatePresence) await this._updateMySlot(this.mySlot);
    this._updateMicUI();
    this._renderSlots();
  },

  async _applySpeakPermission(canSpeak) {
    this.canSpeak = canSpeak;
    if (!canSpeak && this.micOn) await this._stopMicTracks();
    await this._updateMySlot(this.mySlot);
    this._updateMicUI();
  },

  async _forceRemove() {
    await this._stopMicTracks();
    this.mySlot = null;
    this.destroy();
  },

  sendChat(text) {
    const user = Auth.getCurrentUser();
    const msg = {
      id: Date.now() + Math.random(),
      from: user.name,
      text,
      time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      type: this._isHost() ? 'host' : 'user'
    };
    this._appendChatMessage(msg, true);
  },

  _appendChatMessage(msg, broadcast) {
    if (this.chatMessages.find(m => m.id === msg.id)) return;
    this.chatMessages.push(msg);
    this._renderChat();

    if (broadcast) {
      if (this.channel) {
        this.channel.send({ type: 'broadcast', event: 'room_chat', payload: msg });
      } else {
        const state = this._getLocalState();
        state.messages = (state.messages || []).concat(msg).slice(-100);
        this._saveLocalState(state);
      }
    }

    const box = document.getElementById('live-room-messages');
    if (box) box.scrollTop = box.scrollHeight;
  },

  _appendSystemMessage(text) {
    this._appendChatMessage({
      id: 'sys-' + Date.now(),
      from: 'System',
      text,
      time: '',
      type: 'system'
    }, false);
  },

  _renderChat() {
    const box = document.getElementById('live-room-messages');
    if (!box) return;
    box.innerHTML = this.chatMessages.map(m => `
      <div class="live-chat-msg ${m.type === 'host' ? 'host' : ''} ${m.type === 'system' ? 'system' : ''}">
        ${m.type !== 'system' ? `<strong>${this._escape(m.from)}</strong>` : ''}
        ${m.type === 'system' ? `<em>${m.text}</em>` : `<p>${this._escape(m.text)}</p>`}
        ${m.time ? `<span>${m.time}</span>` : ''}
      </div>
    `).join('');
    box.scrollTop = box.scrollHeight;
  },

  _updateParticipantCount() {
    const el = document.getElementById('live-room-count');
    if (el) el.textContent = this._getAllParticipants().length;
  },

  _escape(text) {
    const d = document.createElement('div');
    d.textContent = text || '';
    return d.innerHTML;
  }
};

function renderLiveRoomView(meta) {
  const maxSeats = meta.maxSeats || ((meta.roomKey || '').startsWith('mushaira') ? LIVE_ROOM.MUSHAIRA_SEATS : LIVE_ROOM.VOICE_ROOM_SEATS);
  return `
    <div class="live-room-page"
      data-room-key="${meta.roomKey || ''}"
      data-room-title="${(meta.title || '').replace(/"/g, '&quot;')}"
      data-room-host="${(meta.host || '').replace(/"/g, '&quot;')}"
      data-room-id="${meta.roomId || ''}"
      data-host-owner-id="${meta.hostOwnerId || ''}"
      data-max-seats="${maxSeats}"
      data-leave-path="${meta.leavePath || '/voice-rooms'}">
      <div class="live-room-topbar">
        <a href="${meta.backPath || '#/voice-rooms'}" class="back-link">${Components.icon('back')}</a>
        <div class="live-room-info">
          <h1>${meta.title}</h1>
          <p>Room: ${meta.roomId} · Host: ${meta.host} · <span id="live-room-count">1</span> online · <span id="live-seat-filled">0</span>/<span id="live-seat-max">${maxSeats}</span> seated</p>
        </div>
        <span class="live-room-live-badge">● LIVE</span>
      </div>

      <div id="live-host-panel" class="live-host-panel" hidden>
        <span class="live-host-badge">★ Host Controls</span>
        <span class="live-host-hint">Mute, unmute, revoke speaking, or remove participants from the list →</span>
      </div>

      <div class="live-room-body live-room-body-extended">
        <div class="live-room-main-col">
          <div class="live-room-stage-wrap">
            <div class="live-room-actions-bar">
              <button type="button" class="btn btn-gold btn-sm" id="live-checkin-btn">Check In (Get Seat)</button>
            </div>
            <div id="live-mic-prompt" class="live-mic-prompt" hidden>
              <span class="live-mic-prompt-text">Turn on your microphone to speak</span>
              <button type="button" class="btn btn-gold btn-sm" id="live-mic-prompt-btn">Turn On Mic</button>
            </div>
            <div class="live-room-stage">
              <div class="live-room-slots" id="live-room-slots"></div>
            </div>
          </div>

          <div class="live-room-chat-panel">
            <div class="live-room-chat-header">
              <span>Live Chat</span>
              <button type="button" class="live-chat-toggle-btn" id="live-chat-toggle">−</button>
            </div>
            <div class="live-room-messages" id="live-room-messages"></div>
            <form class="live-room-chat-form" id="live-room-chat-form">
              <input type="text" placeholder="Say something..." maxlength="300" required>
              <button type="submit" class="btn btn-gold btn-sm">Send</button>
            </form>
          </div>
        </div>

        <aside class="live-participants-panel">
          <h3>Participants</h3>
          <p class="live-participants-legend">
            <span class="status-speaking">● Speaking</span>
            <span class="status-live">● Mic on</span>
            <span class="status-muted-host">● Muted</span>
            <span class="status-connected">● Connected</span>
          </p>
          <div id="live-participants-list" class="live-participants-list"></div>
        </aside>
      </div>

      <div class="live-room-toolbar">
        <button type="button" class="live-tool-btn" id="live-chat-toggle-mobile" title="Chat">💬</button>
        <button type="button" class="live-tool-btn mic-tool" id="live-mic-btn" title="Turn microphone on or off">
          <span class="mic-icon">🎤</span>
          <span class="mic-label">Mic Off</span>
        </button>
        <button type="button" class="live-tool-btn seat-tool" id="live-leave-seat-btn">Leave Seat</button>
        <button type="button" class="live-tool-btn leave-tool" id="live-leave-btn">Leave</button>
      </div>
    </div>
  `;
}
