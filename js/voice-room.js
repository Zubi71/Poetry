const VoiceRoomLive = {
  roomKey: null,
  roomMeta: null,
  channel: null,
  localStream: null,
  micOn: false,
  mySlot: null,
  peers: new Map(),
  remoteAudios: new Map(),
  presenceState: {},
  chatMessages: [],
  _pollTimer: null,
  _storageKey: null,

  async init(meta) {
    this.destroy();
    this.roomKey = meta.roomKey;
    this.roomMeta = meta;
    this._storageKey = `voice_room_${this.roomKey}`;

    if (Auth.isGuest()) {
      Components.showToast('Please sign in to join voice rooms', 'error');
      return;
    }

    this._renderSlots();
    this._renderChat();
    this._bindControls();

    if (SupabaseClient.isEnabled() && Auth.getCurrentUser()?.id) {
      await this._initSupabase();
    } else {
      this._initLocalFallback();
    }

    this._appendSystemMessage(`Welcome to ${meta.title}! Tap an empty seat, then turn on your mic to speak.`);
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
    this._stopMic();
    this.peers.forEach(pc => pc.close());
    this.peers.clear();
    this.remoteAudios.forEach(el => el.remove());
    this.remoteAudios.clear();
    this.channel = null;
    this.roomKey = null;
    this.presenceState = {};
    this.chatMessages = [];
    this.mySlot = null;
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

    this.channel
      .on('presence', { event: 'sync' }, () => {
        this.presenceState = this.channel.presenceState();
        this._syncMySlotFromPresence();
        this._renderSlots();
        this._updateParticipantCount();
        this._syncVoiceConnections();
      })
      .on('presence', { event: 'join' }, ({ key, newPresences }) => {
        this.presenceState = this.channel.presenceState();
        this._syncMySlotFromPresence();
        this._renderSlots();
        this._updateParticipantCount();
        const name = newPresences?.[0]?.name;
        const user = Auth.getCurrentUser();
        if (name && key !== user?.id) {
          this._appendSystemMessage(`${name} entered the room`);
        }
      })
      .on('presence', { event: 'leave' }, () => {
        this.presenceState = this.channel.presenceState();
        this._syncMySlotFromPresence();
        this._renderSlots();
        this._updateParticipantCount();
        this._syncVoiceConnections();
      })
      .on('broadcast', { event: 'room_chat' }, ({ payload }) => {
        if (payload) this._appendChatMessage(payload, false);
      })
      .on('broadcast', { event: 'webrtc_signal' }, ({ payload }) => {
        if (payload) this._handleSignal(payload);
      })
      .subscribe(async (status) => {
        if (status === 'SUBSCRIBED') {
          await this._trackPresence();
        }
      });
  },

  async _trackPresence() {
    const user = Auth.getCurrentUser();
    await this.channel?.track({
      userId: user.id,
      name: user.name,
      avatar: user.avatar,
      slot: this.mySlot,
      micOn: this.micOn,
      isHost: this.roomMeta.host === user.name
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
        isHost: this.roomMeta.host === user.name
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
      if (!this.chatMessages.find(c => c.id === m.id)) {
        this.chatMessages.push(m);
      }
    });
    this._renderChat();
    this._updateParticipantCount();
  },

  _applyLocalUsers(users) {
    this.presenceState = {};
    Object.entries(users || {}).forEach(([id, data]) => {
      this.presenceState[id] = [{ ...data }];
    });
    this._syncMySlotFromPresence();
    this._renderSlots();
  },

  _getAllParticipants() {
    const list = [];
    Object.values(this.presenceState).forEach(arr => {
      (arr || []).forEach(p => {
        if (p?.userId) list.push(p);
      });
    });
    return list;
  },

  _getParticipantInSlot(slot) {
    return this._getAllParticipants().find(p => p.slot === slot);
  },

  _syncMySlotFromPresence() {
    const user = Auth.getCurrentUser();
    const me = this._getAllParticipants().find(p => p.userId === user?.id);
    if (me?.slot) this.mySlot = me.slot;
  },

  _updateMicUI() {
    const btn = document.getElementById('live-mic-btn');
    const label = btn?.querySelector('.mic-label');
    const icon = btn?.querySelector('.mic-icon');
    if (btn) btn.classList.toggle('active', this.micOn);
    if (label) label.textContent = this.micOn ? 'Mic On' : 'Mic Off';
    if (icon) icon.textContent = this.micOn ? '🎙️' : '🎤';

    const prompt = document.getElementById('live-mic-prompt');
    if (prompt) {
      if (this.mySlot && !this.micOn) {
        prompt.hidden = false;
        prompt.querySelector('.live-mic-prompt-text').textContent =
          `You're on seat ${this.mySlot}. Tap the mic button below to speak.`;
      } else {
        prompt.hidden = true;
      }
    }
  },

  _renderSlots() {
    const grid = document.getElementById('live-room-slots');
    if (!grid) return;
    const user = Auth.getCurrentUser();
    const maxSlots = 15;

    grid.innerHTML = Array.from({ length: maxSlots }, (_, i) => {
      const slot = i + 1;
      const occupant = this._getParticipantInSlot(slot);
      const isMe = occupant?.userId === user?.id;
      const micOn = occupant?.micOn;

      if (occupant) {
        const micBtn = isMe ? `
          <button type="button" class="live-slot-mic ${micOn ? 'on' : 'off'} mic-toggle-btn" data-action="mic" aria-label="${micOn ? 'Turn off microphone' : 'Turn on microphone'}">
            ${micOn ? '🎙️' : '🔇'}
          </button>
        ` : `<span class="live-slot-mic ${micOn ? 'on' : 'off'}" aria-hidden="true">${micOn ? '🎙️' : '🔇'}</span>`;

        return `
          <button type="button" class="live-slot occupied ${isMe ? 'me' : ''} ${micOn ? 'speaking' : ''}" data-slot="${slot}" aria-label="Seat ${slot}">
            <div class="live-slot-avatar-wrap">
              ${avatarImg(occupant.name, 'live-slot-avatar', occupant.name)}
              ${micBtn}
            </div>
            <span class="live-slot-name">${isMe ? 'You' : (occupant.name || '').split(' ')[0]}</span>
            ${occupant.isHost ? '<span class="live-slot-badge">Host</span>' : ''}
            ${isMe && !micOn ? '<span class="live-slot-hint">Tap to speak</span>' : ''}
          </button>
        `;
      }
      return `
        <button type="button" class="live-slot empty" data-slot="${slot}" aria-label="Join seat ${slot}">
          <div class="live-slot-empty-icon">🎤</div>
          <span class="live-slot-label">NO.${slot}</span>
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
  },

  async _handleSlotClick(slot) {
    const user = Auth.getCurrentUser();
    const occupant = this._getParticipantInSlot(slot);

    if (occupant && occupant.userId !== user.id) {
      Components.showToast(`${occupant.name} is on this seat`, 'error');
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
    Components.showToast(`Seat ${slot} — tap Mic Off below or your avatar to turn on your microphone`);
  },

  async _updateMySlot(slot) {
    const user = Auth.getCurrentUser();
    if (SupabaseClient.isEnabled() && this.channel) {
      await this.channel.track({
        userId: user.id,
        name: user.name,
        avatar: user.avatar,
        slot,
        micOn: this.micOn,
        isHost: this.roomMeta.host === user.name
      });
    } else {
      const state = this._getLocalState();
      if (!state.users[user.id]) state.users[user.id] = { userId: user.id, name: user.name };
      state.users[user.id].slot = slot;
      state.users[user.id].micOn = this.micOn;
      this._saveLocalState(state);
      this._applyLocalUsers(state.users);
    }
  },

  _bindControls() {
    document.getElementById('live-mic-btn')?.addEventListener('click', () => this.toggleMic());
    document.getElementById('live-mic-prompt-btn')?.addEventListener('click', () => this.toggleMic());
    document.getElementById('live-leave-seat-btn')?.addEventListener('click', () => this._leaveSeat());
    document.getElementById('live-leave-btn')?.addEventListener('click', () => {
      this.destroy();
      if (this.roomMeta.leavePath) Router.go(this.roomMeta.leavePath);
      else Router.go('/voice-rooms');
    });

    const form = document.getElementById('live-room-chat-form');
    form?.addEventListener('submit', (e) => {
      e.preventDefault();
      const input = form.querySelector('input');
      const text = input?.value?.trim();
      if (!text) return;
      this.sendChat(text);
      input.value = '';
    });

    const chatToggle = document.getElementById('live-chat-toggle');
    chatToggle?.addEventListener('click', () => {
      document.querySelector('.live-room-chat-panel')?.classList.toggle('collapsed');
    });
  },

  async toggleMic() {
    if (this.micOn) {
      await this._stopMic();
      Components.showToast('Microphone off');
      return;
    }

    if (!this.mySlot) {
      Components.showToast('Join a seat first — tap an empty 🎤 seat', 'error');
      return;
    }

    try {
      this.localStream = await navigator.mediaDevices.getUserMedia({ audio: true, video: false });
      this.micOn = true;
      await this._updateMySlot(this.mySlot);
      this._renderSlots();
      this._syncVoiceConnections();
      Components.showToast('Microphone on — you can speak now');
    } catch {
      Components.showToast('Microphone blocked — allow mic access in your browser settings', 'error');
    }
  },

  async _leaveSeat() {
    if (!this.mySlot) {
      Components.showToast('You are not on a seat', 'error');
      return;
    }
    await this._stopMic();
    this.mySlot = null;
    await this._updateMySlot(null);
    this._renderSlots();
    Components.showToast('You left the stage');
  },

  async _stopMic() {
    this.micOn = false;
    if (this.localStream) {
      this.localStream.getTracks().forEach(t => t.stop());
      this.localStream = null;
    }
    this.peers.forEach(pc => pc.close());
    this.peers.clear();
    this.remoteAudios.forEach(el => el.remove());
    this.remoteAudios.clear();
    if (this.mySlot) await this._updateMySlot(this.mySlot);
    this._renderSlots();
  },

  _syncVoiceConnections() {
    if (!this.micOn || !this.localStream) return;
    const user = Auth.getCurrentUser();
    this._getAllParticipants().forEach(p => {
      if (p.userId !== user.id && p.micOn) {
        this._connectToPeer(p.userId);
      }
    });
  },

  async _connectToPeer(remoteUserId) {
    if (this.peers.has(remoteUserId)) return;
    const user = Auth.getCurrentUser();
    const pc = new RTCPeerConnection({
      iceServers: [{ urls: 'stun:stun.l.google.com:19302' }, { urls: 'stun:stun1.l.google.com:19302' }]
    });
    this.localStream.getTracks().forEach(track => pc.addTrack(track, this.localStream));
    pc.ontrack = (e) => this._playRemoteAudio(remoteUserId, e.streams[0]);
    pc.onicecandidate = (e) => {
      if (e.candidate) this._sendSignal(remoteUserId, { candidate: e.candidate });
    };
    this.peers.set(remoteUserId, pc);

    if (user.id < remoteUserId) {
      const offer = await pc.createOffer();
      await pc.setLocalDescription(offer);
      this._sendSignal(remoteUserId, { sdp: pc.localDescription });
    }
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

    let pc = this.peers.get(payload.from);
    if (!pc && this.micOn && this.localStream) {
      await this._connectToPeer(payload.from);
      pc = this.peers.get(payload.from);
    }
    if (!pc) return;

    try {
      if (payload.sdp) {
        await pc.setRemoteDescription(new RTCSessionDescription(payload.sdp));
        if (payload.sdp.type === 'offer') {
          const answer = await pc.createAnswer();
          await pc.setLocalDescription(answer);
          this._sendSignal(payload.from, { sdp: pc.localDescription });
        }
      } else if (payload.candidate) {
        await pc.addIceCandidate(new RTCIceCandidate(payload.candidate));
      }
    } catch (err) {
      console.warn('WebRTC signal error:', err);
    }
  },

  _playRemoteAudio(userId, stream) {
    let audio = this.remoteAudios.get(userId);
    if (!audio) {
      audio = document.createElement('audio');
      audio.autoplay = true;
      audio.playsInline = true;
      audio.style.display = 'none';
      document.body.appendChild(audio);
      this.remoteAudios.set(userId, audio);
    }
    audio.srcObject = stream;
  },

  sendChat(text) {
    const user = Auth.getCurrentUser();
    const msg = {
      id: Date.now(),
      from: user.name,
      text,
      time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      type: user.name === this.roomMeta.host ? 'host' : 'user'
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
        state.messages = state.messages || [];
        state.messages.push(msg);
        if (state.messages.length > 100) state.messages = state.messages.slice(-100);
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
      <div class="live-chat-msg ${m.type === 'me' ? 'sent' : ''} ${m.type === 'host' ? 'host' : ''} ${m.type === 'system' ? 'system' : ''}">
        ${m.type !== 'me' && m.type !== 'system' ? `<strong>${m.from}</strong>` : ''}
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
  return `
    <div class="live-room-page"
      data-room-key="${meta.roomKey}"
      data-room-title="${meta.title.replace(/"/g, '&quot;')}"
      data-room-host="${meta.host.replace(/"/g, '&quot;')}"
      data-room-id="${meta.roomId}"
      data-leave-path="${meta.leavePath || '/voice-rooms'}">
      <div class="live-room-topbar">
        <a href="${meta.backPath || '#/voice-rooms'}" class="back-link">${Components.icon('back')}</a>
        <div class="live-room-info">
          <h1>${meta.title}</h1>
          <p>Room: ${meta.roomId} · Host: ${meta.host} · <span id="live-room-count">1</span> online</p>
        </div>
        <span class="live-room-live-badge">● LIVE</span>
      </div>

      <div class="live-room-body">
        <div class="live-room-stage-wrap">
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

      <div class="live-room-toolbar">
        <button type="button" class="live-tool-btn" id="live-chat-toggle-mobile" title="Chat">💬</button>
        <button type="button" class="live-tool-btn mic-tool" id="live-mic-btn" title="Turn microphone on or off">
          <span class="mic-icon">🎤</span>
          <span class="mic-label">Mic Off</span>
        </button>
        <button type="button" class="live-tool-btn seat-tool" id="live-leave-seat-btn" title="Leave your seat">Leave Seat</button>
        <button type="button" class="live-tool-btn leave-tool" id="live-leave-btn" title="Leave room">Leave</button>
      </div>
    </div>
  `;
}

