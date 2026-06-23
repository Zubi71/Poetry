/**
 * Live Mushaira / Voice Room — LiveKit audio (SFU) + Supabase Realtime (WebSocket) sync.
 * Presence, seat state, chat, and host commands use Supabase Realtime channels.
 * Audio transport (publish/subscribe) is handled by a LiveKit Room, joined via a
 * server-minted token from /api/livekit-token.
 */
const LIVE_ROOM = {
  MUSHAIRA_SEATS: 20,
  VOICE_ROOM_SEATS: 20,
  MAX_ACTIVE_SPEAKERS: 10
};

const VoiceRoomLive = {
  roomKey: null,
  roomMeta: null,
  channel: null,
  room: null,
  micOn: false,
  mutedByHost: false,
  canSpeak: true,
  isSpeaking: false,
  mySlot: null,
  remoteAudios: new Map(),
  presenceState: {},
  chatMessages: [],
  _pollTimer: null,
  _storageKey: null,
  _onActiveSpeakers: null,
  _paused: false,
  _sessionCommentsChannel: null,
  _handRequests: [],

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

    const eventId = meta.eventId;
    if (eventId && SupabaseClient.isEnabled()) {
      const banned = await API.isUserBanned(eventId, Auth.getCurrentUser()?.id);
      if (banned) {
        Components.showToast('You have been banned from this session', 'error');
        Router.go(meta.leavePath || '/mushaira');
        return;
      }
      await API.joinSessionAudience(eventId);
      this._audienceCount = await API.fetchSessionAudience(eventId).then(d => d.total).catch(() => 0);
    }

    this._applySessionStatus(meta.sessionStatus);
    await this._loadSessionChat(eventId);
    this._subscribeSessionComments(eventId);
    this._renderSlots();
    this._renderParticipantList();
    this._renderChat();
    this._renderDonations();
    this._renderHandRequests();
    this._bindControls();
    this._updateHostPanelVisibility();

    if (SupabaseClient.isEnabled() && Auth.getCurrentUser()?.id) {
      await this._initSupabase();
      await this._connectLiveKit();
    } else {
      this._initLocalFallback();
    }

    this._appendSystemMessage(
      `Welcome to ${meta.title}! Tap "Check In" or pick a seat (${this.maxSlots} max), then turn on your mic to speak.`
    );

    if (this._isHost() && this.roomMeta?.eventId) {
      this._handPollTimer = setInterval(() => this._renderHandRequests(), 5000);
    }
  },

  destroy() {
    const sb = SupabaseClient.get();
    if (this._onStorageSync) {
      window.removeEventListener('storage', this._onStorageSync);
      this._onStorageSync = null;
    }
    if (this._handPollTimer) {
      clearInterval(this._handPollTimer);
      this._handPollTimer = null;
    }
    if (this._sessionCommentsChannel && sb) {
      try { sb.removeChannel(this._sessionCommentsChannel); } catch (_) {}
    }
    this._sessionCommentsChannel = null;
    if (this.channel && sb) {
      try { sb.removeChannel(this.channel); } catch (_) {}
    }
    const eventId = this.roomMeta?.eventId;
    if (eventId && SupabaseClient.isEnabled()) {
      API.leaveSessionAudience(eventId);
    }
    if (this._pollTimer) clearInterval(this._pollTimer);
    if (this._handPollTimer) clearInterval(this._handPollTimer);
    this._stopSpeakingMonitor();
    this._stopMicTracks();
    if (this.room) {
      try { this.room.disconnect(); } catch (_) {}
      this.room = null;
    }
    this.remoteAudios.forEach(audio => audio.remove());
    this.remoteAudios.clear();
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
    return !!(this.micOn && this.room && !this.mutedByHost && this.canSpeak);
  },

  _isAudible(p) {
    return !!(p?.micOn && !p.mutedByHost && p.canSpeak !== false);
  },

  _activeSpeakerCount() {
    return this._getAllParticipants().filter(p => this._isAudible(p)).length;
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
      .on('broadcast', { event: 'host_action' }, ({ payload }) => {
        if (payload) this._handleHostAction(payload);
      })
      .on('broadcast', { event: 'event_ended' }, ({ payload }) => {
        if (payload) this._handleEventEnded(payload);
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
    const byId = new Map();
    Object.values(this.presenceState).forEach(arr => {
      (arr || []).forEach(p => {
        if (p?.userId) byId.set(p.userId, { ...byId.get(p.userId), ...p });
      });
    });
    return [...byId.values()].sort((a, b) => {
      if (a.isHost) return -1;
      if (b.isHost) return 1;
      if (a.slot && !b.slot) return -1;
      if (b.slot && !a.slot) return 1;
      return (a.name || '').localeCompare(b.name || '');
    });
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
      if (this.mutedByHost) label.textContent = 'Muted';
      else if (!this.canSpeak) label.textContent = 'Blocked';
      else label.textContent = this.micOn ? 'Mic On' : 'Mic Off';
    }
    if (icon) icon.textContent = this.micOn && !blocked ? '🎙️' : '🎤';

    const prompt = document.getElementById('live-mic-prompt');
    if (prompt) {
      if (blocked) {
        prompt.hidden = false;
        prompt.className = 'live-v2-notice live-v2-notice-warn';
        prompt.querySelector('.live-mic-prompt-text').textContent =
          this.mutedByHost ? 'Host muted your microphone.' : 'Speaking permission revoked by host.';
      } else if (this.mySlot && !this.micOn) {
        prompt.hidden = false;
        prompt.className = 'live-v2-notice';
        prompt.querySelector('.live-mic-prompt-text').textContent =
          `Seat ${this.mySlot} — tap Mic in the bar below to speak.`;
      } else {
        prompt.hidden = true;
      }
    }
  },

  _updateHostPanelVisibility() {
    const panel = document.getElementById('live-host-panel');
    const endBtn = document.getElementById('live-end-event-btn');
    const pauseBtn = document.getElementById('live-pause-btn');
    const isHost = this._isHost();
    const isMushaira = this.roomMeta?.roomType === 'mushaira' && this.roomMeta?.eventId;

    if (panel) panel.hidden = !isHost;
    if (endBtn) endBtn.hidden = !(isHost && isMushaira);
    if (pauseBtn) {
      pauseBtn.hidden = !(isHost && isMushaira);
      pauseBtn.textContent = this._paused ? 'Resume Live' : 'Pause Live';
    }
    this._renderHandRequests();
  },

  async _togglePauseLive() {
    if (!this._isHost()) return;
    this._paused = !this._paused;
    const banner = document.getElementById('live-paused-banner');
    if (banner) banner.hidden = !this._paused;
    document.querySelector('.live-room-v2')?.classList.toggle('is-paused', this._paused);
    const badge = document.querySelector('.live-v2-badge');
    if (badge) badge.classList.toggle('paused', this._paused);
    if (this.roomMeta?.eventId && SupabaseClient.isEnabled()) {
      await API.pauseMushairaSession(this.roomMeta.eventId, this._paused);
    }
    if (this.channel) {
      this.channel.send({ type: 'broadcast', event: 'host_action', payload: { action: this._paused ? 'pause' : 'resume' } });
    }
    this._appendSystemMessage(this._paused ? 'Session paused by host' : 'Session resumed');
    this._updateHostPanelVisibility();
    Components.showToast(this._paused ? 'Live session paused' : 'Live session resumed');
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

  _renderSlotCell(slot, occupant, opts = {}) {
    const user = Auth.getCurrentUser();
    const isMe = occupant?.userId === user?.id;
    const audible = occupant && this._isAudible(occupant);
    const speaking = occupant?.isSpeaking && audible;
    const hostMuted = occupant?.mutedByHost;
    const size = opts.size || 'md';

    const micGlyph = speaking
      ? '<span class="live-slot-mic-bars"><span></span><span></span><span></span></span>'
      : (audible ? '🎙️' : '🔇');

    if (occupant) {
      const micBtn = isMe && !hostMuted && this.canSpeak ? `
        <button type="button" class="live-slot-mic ${audible ? 'on' : 'off'} mic-toggle-btn" aria-label="${audible ? 'Mute' : 'Unmute'}">
          ${micGlyph}
        </button>
      ` : `<span class="live-slot-mic ${hostMuted ? 'host-muted' : audible ? 'on' : 'off'}">${hostMuted ? '🚫' : micGlyph}</span>`;

      return `
        <button type="button" class="live-slot occupied size-${size} ${isMe ? 'me' : ''} ${speaking ? 'speaking' : audible ? 'live' : ''} ${hostMuted ? 'host-muted' : ''}" data-slot="${slot}">
          <div class="live-slot-avatar-wrap">
            ${avatarImg(occupant.name, 'live-slot-avatar', occupant.name, occupant.avatar)}
            ${micBtn}
          </div>
          <div class="live-slot-meta">
            <span class="live-slot-name">${isMe ? 'You' : (occupant.name || '').split(' ')[0]}</span>
            ${occupant.isHost ? '<span class="live-slot-badge">Host</span>' : ''}
          </div>
        </button>
      `;
    }

    return `
      <button type="button" class="live-slot empty size-${size}" data-slot="${slot}" title="Seat ${slot}">
        <div class="live-slot-empty-icon">${opts.compact ? slot : '+'}</div>
        ${opts.compact ? '' : `<div class="live-slot-meta"><span class="live-slot-label">${slot}</span></div>`}
      </button>
    `;
  },

  _bindSlotGrid(grid) {
    if (!grid) return;
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
  },

  _renderSlots() {
    const grid = document.getElementById('live-room-slots');
    if (!grid) return;

    const maxSlots = this.maxSlots;
    grid.innerHTML = Array.from({ length: maxSlots }, (_, i) =>
      this._renderSlotCell(i + 1, this._getParticipantInSlot(i + 1), { size: 'md' })
    ).join('');
    this._bindSlotGrid(grid);
    this._updateMicUI();
    this._updateHostPanelVisibility();
    this._renderNowSpeaking();
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
          ${avatarImg(p.name, 'live-participant-avatar', p.name, p.avatar)}
          <div class="live-participant-info">
            <strong>${isMe ? 'You' : this._escape(p.name)}${p.isHost ? ' · Host' : ''}</strong>
            <span class="live-participant-status">${status.label}${p.slot ? ` · #${p.slot}` : ''}</span>
          </div>
          ${isHost && !isMe ? `
            <div class="live-host-actions">
              <button type="button" class="host-action-btn ${p.micOn ? 'mute' : 'unmute'}" data-action="${p.micOn ? 'mute' : 'unmute'}" data-user-id="${p.userId}">${p.micOn ? 'Mute' : 'Unmute'}</button>
              <button type="button" class="host-action-btn remove" data-action="remove" data-user-id="${p.userId}">Remove</button>
            </div>
          ` : ''}
        </div>
      `;
    }).join('') : '<p class="empty-state">No one here yet</p>';

    list.querySelectorAll('.host-action-btn').forEach(b => {
      b.onclick = () => this._hostAction(b.dataset.action, b.dataset.userId);
    });
  },

  _renderNowSpeaking() {
    const bar = document.getElementById('live-now-speaking');
    if (!bar) return;
    const user = Auth.getCurrentUser();
    const speaker = this._getAllParticipants().find(p => p.isSpeaking && this._isAudible(p));

    if (!speaker) {
      bar.hidden = true;
      bar.innerHTML = '';
      return;
    }

    bar.hidden = false;
    bar.innerHTML = `
      ${avatarImg(speaker.name, 'live-now-speaking-avatar', speaker.name, speaker.avatar)}
      <div class="live-now-speaking-info">
        <span class="live-now-speaking-label">Now Speaking</span>
        <strong>${speaker.userId === user?.id ? 'You' : this._escape(speaker.name)}</strong>
      </div>
      <div class="live-waveform">${Array.from({ length: 18 }, () => '<span></span>').join('')}</div>
      <div class="live-now-speaking-level"><span></span><span></span><span></span><span></span></div>
    `;
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
    Components.showToast('All 20 seats are full', 'error');
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
    document.getElementById('live-checkin-btn')?.addEventListener('click', () => this._checkIn());
    document.getElementById('live-leave-seat-btn')?.addEventListener('click', () => this._leaveSeat());
    document.getElementById('live-leave-btn')?.addEventListener('click', () => {
      this.destroy();
      Router.go(this.roomMeta.leavePath || '/voice-rooms');
    });
    document.getElementById('live-end-event-btn')?.addEventListener('click', () => this._confirmEndMushairaEvent());
    document.getElementById('live-pause-btn')?.addEventListener('click', () => this._togglePauseLive());

    document.getElementById('live-raise-hand-btn')?.addEventListener('click', async () => {
      if (this.roomMeta?.eventId && SupabaseClient.isEnabled()) {
        await API.requestToSpeak(this.roomMeta.eventId);
        if (this._isHost()) this._renderHandRequests();
      }
      this._appendSystemMessage(`${Auth.getCurrentUser()?.name || 'Someone'} raised their hand to speak`);
      this.sendChat('✋ Request to speak');
      Components.showToast('Hand raised — host will review your request');
    });

    document.getElementById('live-react-btn')?.addEventListener('click', () => {
      Components.showModal('Send Reaction', `
        <div class="live-react-picker">
          <button type="button" class="live-react-choice" data-emoji="❤️">❤️</button>
          <button type="button" class="live-react-choice" data-emoji="👏">👏</button>
          <button type="button" class="live-react-choice" data-emoji="🔥">🔥</button>
        </div>
      `);
      document.querySelectorAll('.live-react-choice').forEach(btn => {
        btn.onclick = async () => {
          const emoji = btn.dataset.emoji;
          if (this.roomMeta?.eventId && SupabaseClient.isEnabled()) {
            await API.postSessionReaction(this.roomMeta.eventId, emoji);
          }
          this.sendChat(emoji);
          Components.closeModal();
          Components.showToast(`Sent ${emoji}`);
        };
      });
    });

    document.getElementById('live-share-btn')?.addEventListener('click', async () => {
      const url = location.href;
      try {
        if (navigator.share) await navigator.share({ title: this.roomMeta?.title || 'Live Mushaira', url });
        else {
          await navigator.clipboard.writeText(url);
          Components.showToast('Live link copied!');
        }
      } catch (_) {}
    });

    document.getElementById('live-donate-btn')?.addEventListener('click', () => this._showDonationModal());
    document.getElementById('live-start-btn')?.addEventListener('click', () => this._startLiveSession());

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

    if (!this.room) {
      Components.showToast('Voice audio is unavailable right now', 'error');
      return;
    }

    try {
      await this.room.localParticipant.setMicrophoneEnabled(true);
      this.micOn = true;
      await this._updateMySlot(this.mySlot);
      this._startSpeakingMonitor();
      this._renderSlots();
      this._renderParticipantList();
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
    if (this.room) {
      try { await this.room.localParticipant.setMicrophoneEnabled(false); } catch (_) {}
    }
    if (this.mySlot) await this._updateMySlot(this.mySlot);
    this._renderSlots();
    this._renderParticipantList();
  },

  _startSpeakingMonitor() {
    this._stopSpeakingMonitor();
    if (!this.room) return;

    this._onActiveSpeakers = async (speakers) => {
      const user = Auth.getCurrentUser();
      const speaking = speakers.some(p => p.identity === user.id) && this._isTransmitting();
      if (speaking !== this.isSpeaking) {
        this.isSpeaking = speaking;
        await this._updateMySlot(this.mySlot);
        this._renderSlots();
        this._renderParticipantList();
      }
    };
    this.room.on(LivekitClient.RoomEvent.ActiveSpeakersChanged, this._onActiveSpeakers);
  },

  _stopSpeakingMonitor() {
    if (this.room && this._onActiveSpeakers) {
      this.room.off(LivekitClient.RoomEvent.ActiveSpeakersChanged, this._onActiveSpeakers);
    }
    this._onActiveSpeakers = null;
  },

  /* ===== LiveKit audio (SFU; server routes publish/subscribe) ===== */

  async _connectLiveKit() {
    if (typeof LivekitClient === 'undefined') {
      console.warn('LiveKit client SDK not loaded');
      return;
    }
    const user = Auth.getCurrentUser();
    if (!user?.id) return;

    try {
      const resp = await fetch('/api/livekit-token', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ roomName: `voice-${this.roomKey}`, identity: user.id, name: user.name })
      });
      if (!resp.ok) throw new Error('token request failed');
      const { token, url } = await resp.json();
      if (!token || !url) throw new Error('missing token/url');

      const room = new LivekitClient.Room({ adaptiveStream: true, dynacast: true });
      room
        .on(LivekitClient.RoomEvent.TrackSubscribed, (track, _pub, participant) => {
          if (track.kind === LivekitClient.Track.Kind.Audio) {
            this._playRemoteAudio(participant.identity, track);
          }
        })
        .on(LivekitClient.RoomEvent.TrackUnsubscribed, (track, _pub, participant) => {
          if (track.kind === LivekitClient.Track.Kind.Audio) {
            this._stopRemoteAudio(participant.identity);
          }
        });

      await room.connect(url, token);
      this.room = room;
    } catch (err) {
      console.warn('LiveKit connect error:', err);
      Components.showToast('Voice audio unavailable — chat still works', 'error');
    }
  },

  _playRemoteAudio(userId, track) {
    const existing = this.remoteAudios.get(userId);
    const audio = track.attach(existing);
    audio.style.display = 'none';
    audio.setAttribute('playsinline', '');
    if (!existing) {
      document.body.appendChild(audio);
      this.remoteAudios.set(userId, audio);
    }
  },

  _stopRemoteAudio(userId) {
    const audio = this.remoteAudios.get(userId);
    if (audio) {
      audio.remove();
      this.remoteAudios.delete(userId);
    }
  },

  _applySessionStatus(status) {
    const waiting = status === 'waiting';
    const paused = status === 'paused';
    this._paused = paused;
    const waitEl = document.getElementById('live-waiting-room');
    const startBtn = document.getElementById('live-start-btn');
    const badge = document.querySelector('.live-v2-badge');
    if (waitEl) waitEl.hidden = !waiting;
    if (startBtn) startBtn.hidden = !(waiting && this._isHost());
    if (badge) {
      badge.textContent = waiting ? 'SOON' : paused ? 'PAUSED' : 'LIVE';
      badge.classList.toggle('paused', paused);
    }
    const banner = document.getElementById('live-paused-banner');
    if (banner) banner.hidden = !paused;
    document.querySelector('.live-room-v2')?.classList.toggle('is-paused', paused);
  },

  async _loadSessionChat(eventId) {
    if (!eventId || !SupabaseClient.isEnabled()) return;
    const comments = await API.fetchSessionComments(eventId);
    this.chatMessages = comments;
    this._renderChat();
  },

  _subscribeSessionComments(eventId) {
    if (!eventId || !SupabaseClient.isEnabled()) return;
    const sb = SupabaseClient.get();
    if (!sb) return;
    this._sessionCommentsChannel = sb.channel(`session-comments-${eventId}`)
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'session_comments', filter: `session_id=eq.${eventId}` }, (payload) => {
        const row = payload.new;
        const msg = {
          id: row.id,
          dbId: row.id,
          from: row.author_name,
          text: row.message,
          time: new Date(row.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
          type: 'user',
          userId: row.user_id,
          pinned: row.is_pinned
        };
        if (!this.chatMessages.find(m => m.dbId === msg.dbId)) {
          this._appendChatMessage(msg, false);
        }
      })
      .subscribe();
  },

  async _renderDonations() {
    const box = document.getElementById('live-donations-list');
    if (!box || !this.roomMeta?.eventId) return;
    const donations = SupabaseClient.isEnabled()
      ? await API.fetchSessionDonations(this.roomMeta.eventId, 10)
      : [];
    if (!donations.length) {
      box.innerHTML = '<p class="empty-hint">No gifts yet — be the first!</p>';
      return;
    }
    box.innerHTML = donations.map(d => `
      <div class="live-donation-item">
        <strong>${this._escape(d.sender_name)}</strong>
        <span>${d.gift_type === 'star' ? '⭐' : d.gift_type === 'gift' ? '🎁' : '🪙'} ${d.amount}</span>
      </div>
    `).join('');
  },

  async _renderHandRequests() {
    const panel = document.getElementById('live-hand-requests');
    if (!panel || !this._isHost() || !this.roomMeta?.eventId) {
      if (panel) panel.hidden = true;
      return;
    }
    panel.hidden = false;
    this._handRequests = SupabaseClient.isEnabled()
      ? await API.fetchSpeakerRequests(this.roomMeta.eventId)
      : [];
    const list = document.getElementById('live-hand-requests-list');
    if (!list) return;
    if (!this._handRequests.length) {
      list.innerHTML = '<p class="empty-hint">No hand raise requests</p>';
      return;
    }
    list.innerHTML = this._handRequests.map(r => `
      <div class="live-hand-request-item">
        <span>${this._escape(r.display_name)}</span>
        <button type="button" class="btn btn-gold btn-sm approve-hand-btn" data-request-id="${r.id}" data-user-id="${r.user_id}">Approve</button>
        <button type="button" class="btn btn-ghost btn-sm deny-hand-btn" data-request-id="${r.id}">Deny</button>
      </div>
    `).join('');
    list.querySelectorAll('.approve-hand-btn').forEach(btn => {
      btn.onclick = async () => {
        await API.resolveSpeakerRequest(btn.dataset.requestId, true);
        this._hostAction('grant_speak', btn.dataset.userId);
        this._renderHandRequests();
        Components.showToast('Speaker approved');
      };
    });
    list.querySelectorAll('.deny-hand-btn').forEach(btn => {
      btn.onclick = async () => {
        await API.resolveSpeakerRequest(btn.dataset.requestId, false);
        this._renderHandRequests();
      };
    });
  },

  async _startLiveSession() {
    if (!this._isHost() || !this.roomMeta?.eventId) return;
    if (SupabaseClient.isEnabled()) {
      await API.startMushairaSession(this.roomMeta.eventId);
    }
    this._applySessionStatus('live');
    if (this.channel) {
      this.channel.send({ type: 'broadcast', event: 'host_action', payload: { action: 'start_live' } });
    }
    this._appendSystemMessage('Live session has started!');
    Components.showToast('Mushaira is now live!');
    Storage.addNotification({ type: 'event', text: `${this.roomMeta.title} is live now!`, link: location.hash });
  },

  _showDonationModal() {
    const eventId = this.roomMeta?.eventId;
    if (!eventId) return;
    Components.showModal('Send a Gift', `
      <div class="donation-picker">
        <button type="button" class="donation-choice" data-amount="10" data-type="coin">🪙 10 Coins</button>
        <button type="button" class="donation-choice" data-amount="50" data-type="coin">🪙 50 Coins</button>
        <button type="button" class="donation-choice" data-amount="1" data-type="gift">🎁 Gift</button>
        <button type="button" class="donation-choice" data-amount="5" data-type="star">⭐ 5 Stars</button>
      </div>
    `);
    document.querySelectorAll('.donation-choice').forEach(btn => {
      btn.onclick = async () => {
        const user = Auth.getCurrentUser();
        if (SupabaseClient.isEnabled()) {
          await API.postSessionDonation(eventId, {
            amount: parseInt(btn.dataset.amount, 10),
            giftType: btn.dataset.type,
            senderName: user?.name
          });
        }
        Components.closeModal();
        Components.showToast('Gift sent! 🎉');
        this._appendSystemMessage(`${user?.name || 'Someone'} sent a ${btn.dataset.type}!`);
        this._renderDonations();
        Storage.addNotification({ type: 'gift', text: `You received a gift in ${this.roomMeta.title}` });
      };
    });
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
          if (this.roomMeta?.eventId && SupabaseClient.isEnabled()) {
            API.banSessionUser(this.roomMeta.eventId, user.id, 'Removed by host');
          }
          await this._forceRemove();
          Components.showToast('Removed from room by host', 'error');
          setTimeout(() => Router.go(this.roomMeta.leavePath || '/mushaira'), 1500);
        } else if (isHost || fromSelf) {
          this._appendSystemMessage(`${payload.targetName || 'User'} was removed by host`);
        }
        break;
      case 'pause':
        if (!isHost) {
          this._paused = true;
          document.getElementById('live-paused-banner').hidden = false;
          document.querySelector('.live-room-v2')?.classList.add('is-paused');
          this._appendSystemMessage('Session paused by host');
        }
        break;
      case 'resume':
      case 'start_live':
        if (!isHost) {
          this._paused = false;
          document.getElementById('live-paused-banner').hidden = true;
          document.getElementById('live-waiting-room')?.setAttribute('hidden', '');
          document.querySelector('.live-room-v2')?.classList.remove('is-paused');
          if (payload.action === 'start_live') this._appendSystemMessage('Live session has started!');
          else this._appendSystemMessage('Session resumed');
        }
        break;
    }

    if (isHost || fromSelf) {
      this._renderParticipantList();
      this._renderSlots();
    }
  },

  _confirmEndMushairaEvent() {
    if (!this._isHost()) {
      Components.showToast('Only the host can end this event', 'error');
      return;
    }
    if (this.roomMeta?.roomType !== 'mushaira' || !this.roomMeta?.eventId) return;

    Components.showModal(
      'End Mushaira Event?',
      '<p class="live-end-event-copy">This will end the live session and move it to Past Sessions. Viewers will be disconnected.</p>',
      '<button type="button" class="btn btn-ghost" id="end-event-cancel">Cancel</button><button type="button" class="live-end-event-btn" id="end-event-confirm">End Event</button>'
    );
    document.getElementById('end-event-cancel')?.addEventListener('click', () => Components.closeModal());
    document.getElementById('end-event-confirm')?.addEventListener('click', () => {
      Components.closeModal();
      this._performEndMushairaEvent();
    });
  },

  async _performEndMushairaEvent() {
    const eventId = this.roomMeta?.eventId;
    if (!eventId || !this._isHost()) return;

    const payload = {
      eventId,
      message: 'The host ended this mushaira.'
    };

    if (this.channel) {
      try {
        this.channel.send({ type: 'broadcast', event: 'event_ended', payload });
      } catch (_) {}
    }

    let ended = true;
    if (SupabaseClient.isEnabled()) {
      const result = await API.endMushairaSession(eventId);
      ended = !!result;
      if (result) {
        const list = (window.REMOTE_MUSHAIRA_EVENTS || []).map(e =>
          e.id === parseInt(eventId, 10) ? result : e
        );
        window.REMOTE_MUSHAIRA_EVENTS = list;
      }
    } else {
      Storage.removeCustomMushaira(eventId);
    }

    if (!ended) {
      Components.showToast('Could not end event. Please try again.', 'error');
      return;
    }

    if (typeof MushairaEvents !== 'undefined') {
      MushairaEvents.renderLists?.();
      MushairaEvents.updateLiveUI?.();
    }

    Components.showToast('Mushaira event ended', 'success');
    this.destroy();
    Router.go(this.roomMeta.leavePath || '/mushaira');
  },

  _handleEventEnded(payload) {
    if (!payload?.eventId || !this.roomMeta?.eventId) return;
    if (parseInt(payload.eventId, 10) !== parseInt(this.roomMeta.eventId, 10)) return;

    Components.showToast(payload.message || 'This mushaira has ended', 'info');
    setTimeout(() => {
      this.destroy();
      Router.go(this.roomMeta?.leavePath || '/mushaira');
    }, 1200);
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
    const eventId = this.roomMeta?.eventId;
    const post = async () => {
      if (eventId && SupabaseClient.isEnabled()) {
        const saved = await API.postSessionComment(eventId, text);
        if (saved) {
          this._appendChatMessage({ ...saved, type: this._isHost() ? 'host' : 'user' }, false);
          if (this.channel) {
            this.channel.send({ type: 'broadcast', event: 'room_chat', payload: { ...saved, type: this._isHost() ? 'host' : 'user' } });
          }
          return;
        }
      }
      const msg = {
        id: Date.now() + Math.random(),
        from: user.name,
        text,
        time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        type: this._isHost() ? 'host' : 'user',
        userId: user.id
      };
      this._appendChatMessage(msg, true);
    };
    post();
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
    const user = Auth.getCurrentUser();
    const isHost = this._isHost();
    box.innerHTML = this.chatMessages.map(m => `
      <div class="live-chat-msg ${m.type === 'host' ? 'host' : ''} ${m.type === 'system' ? 'system' : ''} ${m.pinned ? 'pinned' : ''}" data-msg-id="${m.dbId || m.id}">
        ${m.type !== 'system' ? `<strong>${this._escape(m.from)}</strong>` : ''}
        ${m.pinned ? '<span class="live-chat-pin">📌</span>' : ''}
        ${m.type === 'system' ? `<em>${m.text}</em>` : `<p>${this._escape(m.text)}</p>`}
        ${m.time ? `<span>${m.time}</span>` : ''}
        ${m.dbId && (m.userId === user?.id || isHost) ? `
          <span class="live-chat-actions">
            ${isHost ? `<button type="button" class="live-chat-action pin-msg-btn" data-id="${m.dbId}" data-pinned="${m.pinned ? '1' : '0'}">${m.pinned ? 'Unpin' : 'Pin'}</button>` : ''}
            ${m.userId === user?.id ? `<button type="button" class="live-chat-action delete-msg-btn" data-id="${m.dbId}">Delete</button>` : ''}
          </span>
        ` : ''}
      </div>
    `).join('');
    box.querySelectorAll('.pin-msg-btn').forEach(btn => {
      btn.onclick = async () => {
        const pinned = btn.dataset.pinned !== '1';
        await API.pinSessionComment(btn.dataset.id, pinned);
        const msg = this.chatMessages.find(x => String(x.dbId) === btn.dataset.id);
        if (msg) msg.pinned = pinned;
        this._renderChat();
      };
    });
    box.querySelectorAll('.delete-msg-btn').forEach(btn => {
      btn.onclick = async () => {
        await API.deleteSessionComment(btn.dataset.id);
        this.chatMessages = this.chatMessages.filter(x => String(x.dbId) !== btn.dataset.id);
        this._renderChat();
      };
    });
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
  const maxSeats = meta.maxSeats || LIVE_ROOM.MUSHAIRA_SEATS;

  return `
    <div class="live-room-page live-room-v2"
      data-room-key="${meta.roomKey || ''}"
      data-room-title="${(meta.title || '').replace(/"/g, '&quot;')}"
      data-room-host="${(meta.host || '').replace(/"/g, '&quot;')}"
      data-room-id="${meta.roomId || ''}"
      data-host-owner-id="${meta.hostOwnerId || ''}"
      data-room-type="${meta.roomType || ''}"
      data-event-id="${meta.eventId || ''}"
      data-session-status="${meta.sessionStatus || 'live'}"
      data-max-seats="${maxSeats}"
      data-leave-path="${meta.leavePath || '/voice-rooms'}">

      <header class="live-v2-header">
        <a href="${meta.backPath || '#/voice-rooms'}" class="live-v2-back" aria-label="Back">${Components.icon('back')}</a>
        <div class="live-v2-header-main">
          <div class="live-v2-title-row">
            <h1>${meta.title} <span class="live-v2-title-feather">🪶</span></h1>
            <span class="live-v2-badge">LIVE</span>
          </div>
          <p class="live-v2-host">Host · ${meta.host}</p>
        </div>
        <div class="live-v2-stats">
          <span class="live-v2-stat"><strong id="live-room-count">0</strong> online</span>
          <span class="live-v2-stat live-v2-stat-gold"><strong id="live-seat-filled">0</strong>/<span id="live-seat-max">${maxSeats}</span> seats</span>
        </div>
      </header>

      <div id="live-host-panel" class="live-host-panel" hidden>
        <span class="live-host-badge">Host</span>
        <span class="live-host-hint">Tap participants to manage</span>
        <button type="button" class="btn btn-gold btn-sm" id="live-start-btn" hidden>Start Live</button>
        <button type="button" class="btn btn-outline-gold btn-sm" id="live-pause-btn" hidden>Pause Live</button>
        <button type="button" class="live-end-event-btn" id="live-end-event-btn" hidden>End Event</button>
      </div>

      <div id="live-waiting-room" class="live-waiting-room" hidden>
        <h2>Live starts soon</h2>
        <p class="live-waiting-countdown" id="live-waiting-countdown">Get ready for the mushaira</p>
      </div>

      <div id="live-hand-requests" class="live-hand-requests" hidden>
        <h3>Hand Raise Requests</h3>
        <div id="live-hand-requests-list"></div>
      </div>

      <div id="live-paused-banner" class="live-paused-banner" hidden>
        <span>Session Temporarily Paused</span>
      </div>

      <div id="live-mic-prompt" class="live-v2-notice" hidden>
        <span class="live-mic-prompt-text"></span>
      </div>

      <div class="live-v2-body">
        <section class="live-v2-seats-card">
          <div class="live-v2-seats-head">
            <h2>Speakers on Stage</h2>
            <span class="live-v2-seats-cap">${maxSeats} seats</span>
          </div>
          <div class="live-room-slots live-v2-slots" id="live-room-slots"></div>

          <div id="live-now-speaking" class="live-now-speaking" hidden></div>
        </section>

        <aside class="live-v2-sidebar">
          <section class="live-v2-participants-card">
            <h3>Participants</h3>
            <div id="live-participants-list" class="live-participants-list"></div>
          </section>
          <section class="live-v2-chat-card">
            <div class="live-room-chat-header">
              <span>Chat</span>
              <button type="button" class="live-chat-toggle-btn" id="live-chat-toggle">−</button>
            </div>
            <div class="live-room-messages" id="live-room-messages"></div>
            <form class="live-room-chat-form" id="live-room-chat-form">
              <input type="text" placeholder="Message…" maxlength="300" required>
              <button type="submit" class="btn btn-gold btn-sm">Send</button>
            </form>
          </section>
          ${meta.roomType === 'mushaira' ? `
          <section class="live-v2-donations-card">
            <h3>Top Gifts</h3>
            <div id="live-donations-list"><p class="empty-hint">Loading…</p></div>
          </section>
          ` : ''}
        </aside>
      </div>

      <nav class="live-dock" aria-label="Room controls">
        <button type="button" class="live-dock-btn" id="live-checkin-btn">
          <span class="live-dock-icon">💺</span>
          <span class="live-dock-label">Book Seat</span>
        </button>
        <button type="button" class="live-dock-btn live-dock-mic" id="live-mic-btn">
          <span class="mic-icon live-dock-icon">🎤</span>
          <span class="mic-label live-dock-label">Mic Off</span>
        </button>
        <button type="button" class="live-dock-btn" id="live-raise-hand-btn">
          <span class="live-dock-icon">✋</span>
          <span class="live-dock-label">Hand</span>
        </button>
        <button type="button" class="live-dock-btn" id="live-react-btn">
          <span class="live-dock-icon">❤️</span>
          <span class="live-dock-label">React</span>
        </button>
        <button type="button" class="live-dock-btn" id="live-share-btn">
          <span class="live-dock-icon">↗</span>
          <span class="live-dock-label">Share</span>
        </button>
        ${meta.roomType === 'mushaira' ? `
        <button type="button" class="live-dock-btn" id="live-donate-btn">
          <span class="live-dock-icon">🎁</span>
          <span class="live-dock-label">Gift</span>
        </button>
        ` : ''}
        <button type="button" class="live-dock-btn" id="live-leave-seat-btn">
          <span class="live-dock-icon">↩</span>
          <span class="live-dock-label">Leave</span>
        </button>
        <button type="button" class="live-dock-btn live-dock-exit" id="live-leave-btn">
          <span class="live-dock-icon">✕</span>
          <span class="live-dock-label">Exit</span>
        </button>
        <button type="button" class="live-dock-btn live-dock-chat-mobile" id="live-chat-toggle-mobile" aria-label="Chat">
          <span class="live-dock-icon">💬</span>
          <span class="live-dock-label">Chat</span>
        </button>
      </nav>
    </div>
  `;
}
