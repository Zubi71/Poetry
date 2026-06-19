const MushairaEvents = {
  channel: null,

  async load() {
    if (SupabaseClient.isEnabled()) {
      const events = await API.fetchMushairaEvents();
      window.REMOTE_MUSHAIRA_EVENTS = events !== null ? events : (window.REMOTE_MUSHAIRA_EVENTS || []);
    }
    return getAllMushairaEvents();
  },

  subscribe() {
    if (!SupabaseClient.isEnabled()) return;
    const sb = SupabaseClient.get();
    if (!sb || this.channel) return;

    this.channel = sb.channel('mushaira-events-feed')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'mushaira_events' }, (payload) => {
        const event = API.mapMushairaEvent(payload.new);
        if (!event) return;
        const list = window.REMOTE_MUSHAIRA_EVENTS || [];
        if (!list.find(e => e.id === event.id)) {
          window.REMOTE_MUSHAIRA_EVENTS = [event, ...list];
        }
        this.renderLists();
        this.updateLiveUI();
        if (event.live) {
          Components.showLiveToast(`Mushaira Live: ${event.title}`, `#/mushaira/live/${event.id}`);
        }
      })
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'mushaira_events' }, (payload) => {
        const event = API.mapMushairaEvent(payload.new);
        if (!event) return;
        window.REMOTE_MUSHAIRA_EVENTS = (window.REMOTE_MUSHAIRA_EVENTS || []).map(e =>
          e.id === event.id ? event : e
        );
        this.renderLists();
        this.updateLiveUI();
      })
      .on('postgres_changes', { event: 'DELETE', schema: 'public', table: 'mushaira_events' }, (payload) => {
        const id = payload.old?.id;
        if (!id) return;
        this.removeFromList(id);
        this._handleEventDeletedOnLivePage(id);
      })
      .subscribe();

    this._startGlobalPoll();
  },

  _globalPollTimer: null,

  _startGlobalPoll() {
    if (this._globalPollTimer) clearInterval(this._globalPollTimer);
    if (!SupabaseClient.isEnabled()) return;
    this._globalPollTimer = setInterval(async () => {
      await this.load();
      this.updateLiveUI();
      if (document.getElementById('mushaira-events-root')) this.renderLists();
    }, 15000);
  },

  _isOnLivePage() {
    const hash = location.hash || '';
    return hash.includes('/mushaira/live/');
  },

  _renderLiveBannerHtml(events) {
    const primary = events[0];
    const more = events.length > 1 ? `<a href="#/mushaira" class="mushaira-live-more">+${events.length - 1} more live</a>` : '';
    return `
      <div class="mushaira-live-banner" role="alert">
        <div class="mushaira-live-banner-inner">
          <span class="mushaira-live-pulse" aria-hidden="true">●</span>
          <span class="mushaira-live-label">Mushaira Live</span>
          <span class="mushaira-live-title">${this._esc(primary.title)}</span>
          <span class="mushaira-live-meta">Host: ${this._esc(primary.host)} · ${this._esc(primary.location)}</span>
          ${more}
          <a href="#/mushaira/live/${primary.id}" class="btn btn-gold btn-sm mushaira-live-join">Join Live</a>
        </div>
      </div>
    `;
  },

  _renderHomeLiveStripHtml(events) {
    const slides = events.map((event, i) => `
      <div class="home-mushaira-slide${i === 0 ? ' active' : ''}" data-slide="${i}">
        <div class="home-mushaira-live-inner content-card-v2 live">
          <span class="live-badge">Live</span>
          <div class="home-mushaira-live-text">
            <h2>Mushaira Live Now</h2>
            <p><strong>${this._esc(event.title)}</strong> — ${this._esc(event.host)} is hosting</p>
            ${event.location ? `<p class="home-mushaira-location">${this._esc(event.location)}</p>` : ''}
          </div>
          <a href="#/mushaira/live/${event.id}" class="btn btn-gold">Join Mushaira Live</a>
        </div>
      </div>
    `).join('');

    const dots = events.length > 1 ? `
      <div class="home-mushaira-dots" role="tablist" aria-label="Live mushaira events">
        ${events.map((_, i) => `
          <button type="button" class="home-mushaira-dot${i === 0 ? ' active' : ''}" data-slide="${i}" aria-label="Event ${i + 1}"></button>
        `).join('')}
      </div>
    ` : '';

    return `
      <section class="home-mushaira-carousel" data-count="${events.length}">
        <div class="home-mushaira-carousel-viewport">
          ${slides}
        </div>
        ${dots}
      </section>
    `;
  },

  _homeCarouselTimer: null,

  _initHomeCarousel() {
    if (this._homeCarouselTimer) {
      clearInterval(this._homeCarouselTimer);
      this._homeCarouselTimer = null;
    }

    const carousel = document.querySelector('.home-mushaira-carousel');
    if (!carousel) return;

    const slides = carousel.querySelectorAll('.home-mushaira-slide');
    const dots = carousel.querySelectorAll('.home-mushaira-dot');
    if (slides.length <= 1) return;

    let current = 0;

    const goTo = (index) => {
      current = (index + slides.length) % slides.length;
      slides.forEach((s, i) => s.classList.toggle('active', i === current));
      dots.forEach((d, i) => d.classList.toggle('active', i === current));
    };

    dots.forEach(dot => {
      dot.onclick = () => goTo(parseInt(dot.dataset.slide, 10));
    });

    this._homeCarouselTimer = setInterval(() => goTo(current + 1), 5000);
  },

  updateLiveBanner() {
    const root = document.getElementById('mushaira-live-banner-root');
    if (root) root.innerHTML = '';
  },

  updateHomeStrip() {
    const root = document.getElementById('home-mushaira-live-root');
    if (!root) return;

    const live = getLiveMushairaEvents();
    root.innerHTML = live.length ? this._renderHomeLiveStripHtml(live) : '';
    this._initHomeCarousel();
  },

  updateNavBadge() {
    const live = getLiveMushairaEvents();
    const link = document.querySelector('.sidebar-link[href="#/mushaira"]');
    if (!link) return;

    let badge = link.querySelector('.nav-badge.live');
    if (live.length) {
      const label = live.length === 1 ? 'Live' : `${live.length} Live`;
      if (!badge) {
        badge = document.createElement('span');
        badge.className = 'nav-badge live';
        link.appendChild(badge);
      }
      badge.textContent = label;
    } else if (badge) {
      badge.remove();
    }
  },

  updateLiveUI() {
    this.updateLiveBanner();
    this.updateHomeStrip();
    this.updateSidebar();
    this.updateNavBadge();
  },

  removeFromList(eventId) {
    const id = parseInt(eventId, 10);
    window.REMOTE_MUSHAIRA_EVENTS = (window.REMOTE_MUSHAIRA_EVENTS || []).filter(e => e.id !== id);
    Storage.removeCustomMushaira(id);
    this.renderLists();
    this.updateLiveUI();
  },

  _handleEventDeletedOnLivePage(eventId) {
    const hash = location.hash || '';
    const match = hash.match(/\/mushaira\/live\/(\d+)/);
    if (!match || parseInt(match[1], 10) !== parseInt(eventId, 10)) return;
    Components.showToast('This mushaira has ended', 'info');
    if (typeof VoiceRoomLive !== 'undefined') VoiceRoomLive.destroy();
    Router.go('/mushaira');
  },

  updateSidebar() {
    this._updateSidebarWidget();
  },

  destroy() {
    const sb = SupabaseClient.get();
    if (this.channel && sb) {
      try { sb.removeChannel(this.channel); } catch (_) {}
    }
    this.channel = null;
    if (this._globalPollTimer) {
      clearInterval(this._globalPollTimer);
      this._globalPollTimer = null;
    }
    if (this._pollTimer) {
      clearInterval(this._pollTimer);
      this._pollTimer = null;
    }
    if (this._homeCarouselTimer) {
      clearInterval(this._homeCarouselTimer);
      this._homeCarouselTimer = null;
    }
  },

  renderEventCard(event, registered) {
    if (event.live) {
      return `
        <div class="event-card content-card-v2 live" data-event-id="${event.id}">
          <div class="event-info">
            <h3>${this._esc(event.title)}</h3>
            <p>Host: ${this._esc(event.host)}</p>
            <p>${this._esc(event.date)} · ${this._esc(event.time)} · ${this._esc(event.location)}</p>
            <p>${event.registered} joined</p>
          </div>
          <button class="btn btn-gold join-event-btn" data-event-id="${event.id}" data-live="1">Join Live</button>
        </div>
      `;
    }
    return `
      <div class="event-card content-card-v2" data-event-id="${event.id}">
        <div class="event-info">
          <h3>${this._esc(event.title)}</h3>
          <p>Host: ${this._esc(event.host)}</p>
          <p>${this._esc(event.date)} · ${this._esc(event.time)} · ${this._esc(event.location)}</p>
          <p>${event.registered} registered</p>
        </div>
        <button class="btn ${registered.includes(event.id) ? 'btn-outline-gold' : 'btn-gold'} register-event-btn" data-event-id="${event.id}">
          ${registered.includes(event.id) ? 'Registered ✓' : 'Register'}
        </button>
      </div>
    `;
  },

  renderLists() {
    const root = document.getElementById('mushaira-events-root');
    if (!root) return;

    const registered = Storage.getRegisteredEvents();
    const allEvents = getAllMushairaEvents();
    const liveEvents = allEvents.filter(e => e.live);
    const upcoming = allEvents.filter(e => !e.live);

    if (!allEvents.length) {
      root.innerHTML = `
        <section class="events-section">
          <p class="empty-state">No mushaira events yet. Be the first to create one!</p>
        </section>
      `;
      return;
    }

    root.innerHTML = `
      ${liveEvents.length ? `
        <section class="events-section">
          <h2><span class="live-badge">Live</span> Live Now</h2>
          <div class="events-list">${liveEvents.map(e => this.renderEventCard(e, registered)).join('')}</div>
        </section>
      ` : ''}
      <section class="events-section">
        <h2>${liveEvents.length ? 'Other Events' : 'All Events'}</h2>
        <div class="events-list">
          ${(liveEvents.length ? upcoming : allEvents).length
            ? (liveEvents.length ? upcoming : allEvents).map(e => this.renderEventCard(e, registered)).join('')
            : '<p class="empty-state">No upcoming events scheduled.</p>'}
        </div>
      </section>
    `;

    this._bindEventButtons();
  },

  _bindEventButtons() {
    document.querySelectorAll('.join-event-btn').forEach(btn => {
      btn.onclick = () => {
        Storage.registerEvent(parseInt(btn.dataset.eventId));
        Router.go(`/mushaira/live/${btn.dataset.eventId}`);
      };
    });
    document.querySelectorAll('.register-event-btn').forEach(btn => {
      btn.onclick = () => {
        Storage.registerEvent(parseInt(btn.dataset.eventId));
        Components.showToast('Successfully registered!');
        this.renderLists();
      };
    });
  },

  _updateSidebarWidget() {
    const widget = document.getElementById('sidebar-mushaira-widget');
    if (!widget) return;
    const live = getAllMushairaEvents().filter(e => e.live).slice(0, 2);
    if (!live.length) {
      widget.innerHTML = '<p class="empty-state">No live events right now.</p>';
      return;
    }
    widget.innerHTML = live.map(event => `
      <div class="widget-event">
        <strong>${this._esc(event.title)}</strong>
        <span>${this._esc(event.date)} · ${this._esc(event.host)}</span>
        <a href="#/mushaira/live/${event.id}" class="btn btn-gold btn-sm">Join Live</a>
      </div>
    `).join('');
  },

  async initLivePage(eventId) {
    const mount = document.getElementById('mushaira-live-mount');
    if (!mount) return;

    let event = getMushairaEventById(eventId);
    if (!event) {
      await this.load();
      event = getMushairaEventById(eventId);
    }
    if (!event && SupabaseClient.isEnabled()) {
      event = await API.fetchMushairaEventById(eventId);
      if (event) {
        const list = window.REMOTE_MUSHAIRA_EVENTS || [];
        if (!list.find(e => e.id === event.id)) {
          window.REMOTE_MUSHAIRA_EVENTS = [event, ...list];
        }
      }
    }

    if (!event) {
      mount.innerHTML = '<div class="page-header"><h1>Event not found</h1><a href="#/mushaira" class="btn btn-gold">Back</a></div>';
      return;
    }

    mount.outerHTML = renderLiveRoomView({
      roomKey: `mushaira-${event.id}`,
      roomId: `M-${event.id}`,
      title: event.title,
      host: event.host,
      hostOwnerId: event.ownerId || '',
      eventId: event.id,
      roomType: 'mushaira',
      maxSeats: LIVE_ROOM.MUSHAIRA_SEATS,
      backPath: '#/mushaira',
      leavePath: '/mushaira'
    });

    const liveRoom = document.querySelector('.live-room-page');
    if (liveRoom && typeof VoiceRoomLive !== 'undefined') {
      VoiceRoomLive.init({
        roomKey: liveRoom.dataset.roomKey,
        roomId: liveRoom.dataset.roomId,
        title: liveRoom.dataset.roomTitle,
        host: liveRoom.dataset.roomHost,
        hostOwnerId: liveRoom.dataset.hostOwnerId || null,
        eventId: parseInt(liveRoom.dataset.eventId, 10) || event.id,
        roomType: liveRoom.dataset.roomType || 'mushaira',
        maxSeats: parseInt(liveRoom.dataset.maxSeats, 10) || LIVE_ROOM.MUSHAIRA_SEATS,
        leavePath: liveRoom.dataset.leavePath || '/mushaira'
      });
    }
  },

  async initPage() {
    const root = document.getElementById('mushaira-events-root');
    if (!root) return;
    await this.load();
    this.renderLists();
    this.subscribe();
    this._startPoll();
  },

  _pollTimer: null,

  _startPoll() {
    if (this._pollTimer) clearInterval(this._pollTimer);
    if (!SupabaseClient.isEnabled()) return;
    this._pollTimer = setInterval(async () => {
      if (!document.getElementById('mushaira-events-root')) {
        clearInterval(this._pollTimer);
        this._pollTimer = null;
        return;
      }
      await this.load();
      this.renderLists();
      this.updateLiveUI();
    }, 10000);
  },

  _esc(text) {
    const d = document.createElement('div');
    d.textContent = text || '';
    return d.innerHTML;
  }
};

const VoiceRoomsList = {
  channel: null,

  async load() {
    if (SupabaseClient.isEnabled()) {
      const rooms = await API.fetchVoiceRooms();
      window.REMOTE_VOICE_ROOMS = rooms !== null ? rooms : (window.REMOTE_VOICE_ROOMS || []);
    }
    return getAllVoiceRooms();
  },

  subscribe() {
    if (!SupabaseClient.isEnabled()) return;
    const sb = SupabaseClient.get();
    if (!sb || this.channel) return;

    this.channel = sb.channel('voice-rooms-feed')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'voice_rooms' }, (payload) => {
        const room = API.mapVoiceRoom(payload.new);
        if (!room) return;
        const list = window.REMOTE_VOICE_ROOMS || [];
        if (!list.find(r => r.id === room.id)) {
          window.REMOTE_VOICE_ROOMS = [room, ...list];
        }
        this.renderList();
        Components.showToast(`New voice room: ${room.title}`);
      })
      .subscribe();
  },

  destroy() {
    const sb = SupabaseClient.get();
    if (this.channel && sb) try { sb.removeChannel(this.channel); } catch (_) {}
    this.channel = null;
  },

  renderList() {
    const grid = document.getElementById('voice-rooms-grid');
    if (!grid) return;
    const joined = Storage.getJoinedRooms();
    const rooms = getAllVoiceRooms();

    if (!rooms.length) {
      grid.innerHTML = '<p class="empty-state">No voice rooms yet. Create one to get started!</p>';
      return;
    }

    grid.innerHTML = rooms.map(room => `
      <div class="room-card content-card-v2">
        <div class="room-header">
          <h3>${room.title}</h3>
          <span class="active-badge">${room.active ? '● Active' : 'Offline'}</span>
        </div>
        <p>Host: ${room.host}</p>
        <p>${room.participants || 0} participants</p>
        <button class="btn ${joined.includes(room.id) ? 'btn-outline-gold' : 'btn-gold'} join-room-btn" data-room-id="${room.id}">
          ${joined.includes(room.id) ? 'Enter Room' : 'Join Room'}
        </button>
      </div>
    `).join('');

    grid.querySelectorAll('.join-room-btn').forEach(btn => {
      btn.onclick = () => {
        Storage.joinRoom(parseInt(btn.dataset.roomId));
        Router.go(`/voice-rooms/${btn.dataset.roomId}`);
      };
    });
  },

  async initPage() {
    const grid = document.getElementById('voice-rooms-grid');
    if (!grid) return;
    await this.load();
    this.renderList();
    this.subscribe();
  }
};
