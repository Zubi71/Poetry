const MushairaEvents = {
  channel: null,
  _speakersCache: {},
  _audienceCache: {},
  _commentsChannel: null,

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

  _getActiveTab() {
    const hash = location.hash.slice(1) || '/';
    const qs = hash.split('?')[1] || '';
    return new URLSearchParams(qs).get('tab') || 'live';
  },

  _eventImage(event) {
    return event.image || getPlaceholderImage(640, 360, event.title);
  },

  _formatCount(n) {
    if (!n) return '0';
    if (n >= 1000) return (n / 1000).toFixed(1).replace(/\.0$/, '') + 'K';
    return String(n);
  },

  _getSpeakers(event) {
    const cached = this._speakersCache[event.id];
    if (cached?.length) return cached;
    const host = event.host || 'Host';
    const poets = APP_DATA.poets.filter(p => p.name !== host).slice(0, 3);
    return [
      { name: host, role: 'Host', muted: false },
      ...poets.map((p, i) => ({ name: p.name, role: i === 0 ? 'Speaker' : 'Guest', muted: i === 1 }))
    ];
  },

  async _loadSessionCaches(events) {
    if (!SupabaseClient.isEnabled()) return;
    const ids = [...new Set(events.slice(0, 12).map(e => e.id))];
    await Promise.all(ids.map(async (id) => {
      if (!this._speakersCache[id]?.length) {
        const speakers = await API.fetchSessionSpeakers(id);
        if (speakers.length) this._speakersCache[id] = speakers;
      }
    }));
    const live = events.find(e => e.live);
    if (live) {
      this._audienceCache[live.id] = await API.fetchSessionAudience(live.id);
    }
  },

  _getGuestNames(event) {
    const speakers = this._getSpeakers(event).filter(s => s.role !== 'Host');
    return speakers.map(s => s.name.split(' ')[0]).join(', ');
  },

  _getAudienceAvatars(count = 12, event) {
    const cached = event && this._audienceCache[event.id];
    if (cached?.list?.length) {
      return cached.list.slice(0, count).map(a => a.name);
    }
    return APP_DATA.poets.slice(0, count).map(p => p.name);
  },

  _groupScheduleEvents(events) {
    const today = new Date().toDateString();
    const tomorrow = new Date(Date.now() + 86400000).toDateString();
    const groups = { today: [], tomorrow: [], later: [] };

    events.forEach(event => {
      const d = event.date ? new Date(event.date).toDateString() : '';
      if (d === today) groups.today.push(event);
      else if (d === tomorrow) groups.tomorrow.push(event);
      else groups.later.push(event);
    });

    return groups;
  },

  _renderTags(tags = []) {
    const list = tags.length ? tags : ['Poetry', 'Shayari', 'Urdu'];
    return list.map(t => `<span class="mushaira-v2-tag">${this._esc(t)}</span>`).join('');
  },

  renderFeaturedLive(event) {
    const watching = event.watching || event.viewer_count || event.registered || 0;
    const likes = event.likes || event.like_count || 0;
    const duration = event.duration || event.duration_minutes ? `${event.duration_minutes}m` : 'Live';
    return `
      <article class="mushaira-v2-featured">
        <div class="mushaira-v2-featured-media">
          <img src="${this._eventImage(event)}" alt="${this._esc(event.title)}">
          <span class="mushaira-v2-live-pill">LIVE</span>
          <span class="mushaira-v2-watching"><span class="mushaira-v2-dot"></span> ${this._formatCount(watching)} watching</span>
        </div>
        <div class="mushaira-v2-featured-body">
          <h2>${this._esc(event.title)}</h2>
          <div class="mushaira-v2-tags">${this._renderTags(event.tags)}</div>
          <div class="mushaira-v2-live-stats">
            <span>👁 ${this._formatCount(watching)} viewers</span>
            <span>❤️ ${this._formatCount(likes)} likes</span>
            <span>⏱ ${this._esc(duration)}</span>
          </div>
          <button type="button" class="btn btn-gold mushaira-v2-join join-event-btn" data-event-id="${event.id}" data-live="1">
            ${Components.icon('voice')} Join Live
          </button>
        </div>
      </article>
    `;
  },

  renderSpeakersSection(event) {
    const speakers = this._getSpeakers(event);
    return `
      <section class="mushaira-v2-section">
        <div class="mushaira-v2-section-head">
          <h3>Speakers · ${speakers.length}</h3>
          <button type="button" class="mushaira-v2-link-btn view-speakers-btn" data-event-id="${event.id}">View all</button>
        </div>
        <div class="mushaira-v2-speakers">
          ${speakers.map(s => `
            <div class="mushaira-v2-speaker">
              ${avatarImg(s.name, 'mushaira-v2-speaker-avatar', s.name)}
              <span class="mushaira-v2-speaker-name">${this._esc(s.name.split(' ')[0])}</span>
              <span class="mushaira-v2-speaker-role ${s.role === 'Host' ? 'is-host' : ''}">${this._esc(s.role)}</span>
              <span class="mushaira-v2-mic ${s.muted ? 'muted' : ''}">${Components.icon('voice')}</span>
            </div>
          `).join('')}
          <div class="mushaira-v2-speaker mushaira-v2-speaker-more">+2</div>
        </div>
      </section>
    `;
  },

  renderAudienceSection(event) {
    const cached = this._audienceCache[event.id];
    const total = cached?.total || event.watching || event.viewer_count || event.registered || 0;
    const audience = this._getAudienceAvatars(10, event);
    return `
      <section class="mushaira-v2-section">
        <div class="mushaira-v2-section-head">
          <h3>Audience · ${this._formatCount(total)}</h3>
          <button type="button" class="mushaira-v2-link-btn view-audience-btn" data-event-id="${event.id}">View all</button>
        </div>
        <div class="mushaira-v2-audience">
          ${audience.map(name => avatarImg(name, 'mushaira-v2-audience-avatar', name)).join('')}
        </div>
      </section>
    `;
  },

  renderWatchBar(event) {
    const likes = event.likes || event.like_count || 0;
    return `
      <div class="mushaira-v2-watch-bar">
        <span class="mushaira-v2-watch-spark">✨</span>
        <p>You're watching Live! Enjoy the mushaira and show your love</p>
        <span class="mushaira-v2-watch-hearts">❤️ ${this._formatCount(likes)}</span>
      </div>
    `;
  },

  renderScheduleCard(event, registered) {
    const isRegistered = registered.includes(event.id);
    return `
      <article class="mushaira-v2-schedule-card">
        <img class="mushaira-v2-schedule-thumb" src="${this._eventImage(event)}" alt="">
        <div class="mushaira-v2-schedule-info">
          <span class="mushaira-v2-schedule-time">${this._esc(event.time)}</span>
          <strong>${this._esc(event.host)}</strong>
          ${this._getGuestNames(event) ? `<span class="mushaira-v2-guests">+ ${this._esc(this._getGuestNames(event))}</span>` : ''}
          <h4>${this._esc(event.title)}</h4>
          <p>${this._esc(event.description || event.location || '')}</p>
        </div>
        <div class="mushaira-v2-schedule-actions">
          <button type="button" class="mushaira-v2-reminder register-event-btn ${isRegistered ? 'active' : ''}" data-event-id="${event.id}">
            ${Components.icon('bell')} ${isRegistered ? 'Set' : 'Remind'}
          </button>
          <button type="button" class="mushaira-v2-details session-details-btn" data-event-id="${event.id}">Details</button>
        </div>
      </article>
    `;
  },

  renderScheduleFilters(active = 'all') {
    const base = '#/mushaira?tab=schedule';
    return `
      <nav class="mushaira-v2-subtabs" aria-label="Schedule date filter">
        <a href="${base}&filter=today" class="mushaira-v2-subtab ${active === 'today' ? 'active' : ''}">Today</a>
        <a href="${base}&filter=tomorrow" class="mushaira-v2-subtab ${active === 'tomorrow' ? 'active' : ''}">Tomorrow</a>
        <a href="${base}&filter=week" class="mushaira-v2-subtab ${active === 'week' ? 'active' : ''}">Weekly</a>
        <a href="${base}&filter=all" class="mushaira-v2-subtab ${active === 'all' ? 'active' : ''}">All</a>
      </nav>
    `;
  },

  _filterScheduleByDate(events, filter) {
    if (filter === 'all') return events;
    const today = new Date().toDateString();
    const tomorrow = new Date(Date.now() + 86400000).toDateString();
    const weekEnd = Date.now() + 7 * 86400000;
    return events.filter(event => {
      const d = event.date ? new Date(event.date) : null;
      if (!d || isNaN(d)) return filter === 'all';
      const ds = d.toDateString();
      if (filter === 'today') return ds === today;
      if (filter === 'tomorrow') return ds === tomorrow;
      if (filter === 'week') return d.getTime() <= weekEnd;
      return true;
    });
  },

  renderEndedCard(event) {
    const views = event.views || event.viewer_count || event.registered || 0;
    const likes = event.likes || event.like_count || 0;
    const duration = event.duration_minutes ? `${event.duration_minutes} min` : '';
    return `
      <article class="mushaira-v2-ended-card">
        <img class="mushaira-v2-ended-thumb" src="${this._eventImage(event)}" alt="">
        <div class="mushaira-v2-ended-info">
          <h4>${this._esc(event.title)}</h4>
          <div class="mushaira-v2-tags">${this._renderTags(event.tags)}</div>
          <p>${this._esc(event.date)} · ${this._esc(event.time)}${duration ? ` · ${duration}` : ''}</p>
          <p class="mushaira-v2-ended-meta">❤️ ${this._formatCount(likes)} · 👁 ${this._formatCount(views)} views</p>
        </div>
        <div class="mushaira-v2-ended-actions">
          <button type="button" class="mushaira-v2-play watch-replay-btn" data-event-id="${event.id}" aria-label="Watch replay">▶</button>
          <button type="button" class="mushaira-v2-details session-details-btn" data-event-id="${event.id}">Details</button>
        </div>
      </article>
    `;
  },

  renderLiveTab(liveEvents, registered) {
    if (!liveEvents.length) {
      return '<p class="empty-state">No live mushaira right now. Check Schedule for upcoming events.</p>';
    }
    const primary = liveEvents[0];
    return `
      ${this.renderFeaturedLive(primary)}
      ${this.renderSpeakersSection(primary)}
      ${this.renderAudienceSection(primary)}
      ${this.renderWatchBar(primary)}
      ${liveEvents.length > 1 ? `
        <section class="mushaira-v2-section">
          <div class="mushaira-v2-section-head"><h3>More Live</h3></div>
          <div class="mushaira-v2-more-live">
            ${liveEvents.slice(1).map(e => this.renderFeaturedLive(e)).join('')}
          </div>
        </section>
      ` : ''}
    `;
  },

  renderScheduleTab(scheduled, registered, filter = 'all') {
    const filtered = this._filterScheduleByDate(scheduled, filter);
    if (!filtered.length) {
      return this.renderScheduleFilters(filter) + '<p class="empty-state">No events for this period.</p>';
    }
    const groups = this._groupScheduleEvents(filtered);
    const renderGroup = (label, items) => items.length ? `
      <section class="mushaira-v2-schedule-group">
        <h3>${label}</h3>
        ${items.map(e => this.renderScheduleCard(e, registered)).join('')}
      </section>
    ` : '';

    const todayLabel = `Today's Schedule (${new Date().toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })})`;
    const tomorrow = new Date(Date.now() + 86400000);
    const tomorrowLabel = `Tomorrow's Schedule (${tomorrow.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })})`;

    return `
      ${this.renderScheduleFilters(filter)}
      ${renderGroup(todayLabel, groups.today)}
      ${renderGroup(tomorrowLabel, groups.tomorrow)}
      ${renderGroup('Upcoming', groups.later)}
    `;
  },

  _filterEndedEvents(events, filter) {
    let list = [...events];
    const now = Date.now();
    if (filter === 'views') list.sort((a, b) => (b.views || b.registered || 0) - (a.views || a.registered || 0));
    else if (filter === 'poetry' || filter === 'shayari') {
      list = list.filter(e => (e.tags || []).some(t => t.toLowerCase().includes(filter)));
    } else if (filter === 'week') {
      const weekAgo = now - 7 * 86400000;
      list = list.filter(e => {
        const d = e.date ? new Date(e.date).getTime() : 0;
        return d >= weekAgo;
      });
    } else if (filter === 'month') {
      const monthAgo = now - 30 * 86400000;
      list = list.filter(e => {
        const d = e.date ? new Date(e.date).getTime() : 0;
        return d >= monthAgo;
      });
    }
    return list;
  },

  renderEndedTab(endedEvents, filter = 'all') {
    const list = this._filterEndedEvents(endedEvents, filter);
    if (!list.length) {
      return '<p class="empty-state">No past sessions yet.</p>';
    }
    return `
      <div class="mushaira-v2-ended-head">
        <h3>Past Sessions</h3>
      </div>
      <div class="mushaira-v2-ended-list">
        ${list.map(e => this.renderEndedCard(e)).join('')}
      </div>
    `;
  },

  async showWatchReplay(eventId) {
    const event = getMushairaEventById(eventId);
    if (!event) return;
    const views = event.views || event.viewer_count || event.registered || 0;
    const likes = event.likes || event.like_count || 0;
    let commentsHtml = '';
    if (SupabaseClient.isEnabled()) {
      const comments = await API.fetchSessionComments(eventId);
      if (comments.length) {
        commentsHtml = `<div class="replay-comments"><h4>Comments</h4>${comments.slice(-8).map(c => `<p><strong>${this._esc(c.from)}:</strong> ${this._esc(c.text)}</p>`).join('')}</div>`;
      }
    }
    Components.showModal(event.title, `
      <div class="replay-modal">
        <div class="replay-player">
          ${event.replay_url
            ? `<video controls class="replay-video" src="${event.replay_url}" poster="${this._eventImage(event)}"></video>`
            : `<div class="replay-placeholder">
                <span class="replay-placeholder-icon">▶</span>
                <p>Replay recording will be available soon</p>
              </div>`}
        </div>
        <div class="replay-meta">
          <span>👁 ${this._formatCount(views)} views</span>
          <span>❤️ ${this._formatCount(likes)} likes</span>
          <span>${this._esc(event.date)} · ${this._esc(event.time)}</span>
        </div>
        <div class="mushaira-v2-tags">${this._renderTags(event.tags)}</div>
        <p class="replay-desc">${this._esc(event.description || '')}</p>
        ${commentsHtml}
        <div class="replay-actions">
          <button type="button" class="btn btn-outline-gold btn-sm replay-like-btn" data-event-id="${event.id}">❤️ Like (${this._formatCount(likes)})</button>
          <button type="button" class="btn btn-outline-gold btn-sm replay-share-btn">↗ Share</button>
        </div>
      </div>
    `, `<a href="#/mushaira/session/${event.id}" class="btn btn-gold">Session Details</a>`);
    document.querySelector('.replay-like-btn')?.addEventListener('click', async () => {
      if (SupabaseClient.isEnabled()) await API.incrementSessionLike(event.id);
      Components.showToast('Liked!');
    });
    document.querySelector('.replay-share-btn')?.addEventListener('click', async () => {
      const url = `${location.origin}${location.pathname}#/mushaira/session/${event.id}`;
      await navigator.clipboard.writeText(url);
      Components.showToast('Link copied!');
    });
    document.querySelector('.modal-footer .btn-gold')?.addEventListener('click', () => Components.closeModal());
  },

  showViewAllSpeakers(eventId) {
    const event = getMushairaEventById(eventId);
    if (!event) return;
    const speakers = this._getSpeakers(event);
    Components.showModal(`Speakers · ${speakers.length}`, `
      <ul class="session-list-modal">
        ${speakers.map(s => `
          <li class="session-list-item">
            ${avatarImg(s.name, 'session-list-avatar', s.name)}
            <div><strong>${this._esc(s.name)}</strong><span class="mushaira-v2-speaker-role ${s.role === 'Host' ? 'is-host' : ''}">${this._esc(s.role)}</span></div>
          </li>
        `).join('')}
      </ul>
    `);
  },

  async showViewAllAudience(eventId) {
    const event = getMushairaEventById(eventId);
    if (!event) return;
    let list = this._audienceCache[eventId]?.list;
    let total = this._audienceCache[eventId]?.total;
    if (SupabaseClient.isEnabled() && !list?.length) {
      const data = await API.fetchSessionAudience(eventId, 100);
      this._audienceCache[eventId] = data;
      list = data.list;
      total = data.total;
    }
    list = list || this._getAudienceAvatars(20, event).map(name => ({ name }));
    total = total || list.length;
    Components.showModal(`Audience · ${this._formatCount(total)}`, `
      <div class="session-audience-grid">
        ${list.map(a => `
          <div class="session-audience-item">${avatarImg(a.name, 'mushaira-v2-audience-avatar', a.name)}<span>${this._esc(a.name.split(' ')[0])}</span></div>
        `).join('')}
      </div>
    `);
  },

  renderSessionDetailsPage(event) {
    const speakers = this._getSpeakers(event).map(s => `${s.name} (${s.role})`).join(', ');
    const actionBtn = event.live
      ? `<a href="#/mushaira/live/${event.id}" class="btn btn-gold">Join Live</a>`
      : event.ended && event.replay_url
        ? `<button type="button" class="btn btn-gold watch-replay-btn" data-event-id="${event.id}">Watch Replay</button>`
        : event.waiting
          ? `<a href="#/mushaira/live/${event.id}" class="btn btn-gold">Enter Waiting Room</a>`
          : `<button type="button" class="btn btn-gold register-event-btn" data-event-id="${event.id}">Set Reminder</button>`;
    return `
      <div class="mushaira-v2 session-details-page">
        <a href="#/mushaira" class="session-details-back">← Back to Mushaira</a>
        <img class="session-details-cover" src="${this._eventImage(event)}" alt="">
        <h1>${this._esc(event.title)}</h1>
        <div class="mushaira-v2-tags">${this._renderTags(event.tags)}</div>
        <p class="session-details-desc">${this._esc(event.description || 'Join this mushaira session for live poetry.')}</p>
        <ul class="session-details-meta">
          <li><strong>Host:</strong> ${this._esc(event.host)}</li>
          <li><strong>When:</strong> ${this._esc(event.date)} · ${this._esc(event.time)}</li>
          <li><strong>Duration:</strong> ${event.duration_minutes ? `${event.duration_minutes} min` : 'TBD'}</li>
          <li><strong>Location:</strong> ${this._esc(event.location || 'Online')}</li>
          <li><strong>Speakers:</strong> ${this._esc(speakers)}</li>
          ${event.ended ? `<li><strong>Views:</strong> ${this._formatCount(event.views || 0)} · <strong>Likes:</strong> ${this._formatCount(event.likes || 0)}</li>` : ''}
        </ul>
        <div class="session-details-actions">${actionBtn}</div>
      </div>
    `;
  },

  async _registerReminder(event) {
    Storage.registerEvent(event.id);
    if (SupabaseClient.isEnabled()) {
      await API.setSessionReminders(event.id, event.date, event.time);
    }
    Components.showToast('Reminder set — we\'ll notify you 1 hour and 15 minutes before start');
  },

  showSessionDetails(eventId) {
    Router.go(`/mushaira/session/${eventId}`);
  },

  renderSessionDetailsModal(eventId) {
    const event = getMushairaEventById(eventId);
    if (!event) return;
    const speakers = this._getSpeakers(event).map(s => `${s.name} (${s.role})`).join(', ');
    Components.showModal(event.title, `
      <div class="session-details-modal">
        <img class="session-details-cover" src="${this._eventImage(event)}" alt="">
        <p class="session-details-desc">${this._esc(event.description || 'Join this mushaira session for live poetry.')}</p>
        <ul class="session-details-meta">
          <li><strong>Host:</strong> ${this._esc(event.host)}</li>
          <li><strong>When:</strong> ${this._esc(event.date)} · ${this._esc(event.time)}</li>
          <li><strong>Duration:</strong> ${event.duration_minutes ? `${event.duration_minutes} min` : 'TBD'}</li>
          <li><strong>Location:</strong> ${this._esc(event.location || 'Online')}</li>
          <li><strong>Speakers:</strong> ${this._esc(speakers)}</li>
        </ul>
        <div class="mushaira-v2-tags">${this._renderTags(event.tags)}</div>
      </div>
    `, event.live
      ? `<a href="#/mushaira/live/${event.id}" class="btn btn-gold">Join Live</a>`
      : event.waiting
        ? `<a href="#/mushaira/live/${event.id}" class="btn btn-gold">Enter Waiting Room</a>`
        : `<button type="button" class="btn btn-gold register-event-btn" data-event-id="${event.id}">Set Reminder</button>`);
    document.querySelector('.modal-footer .register-event-btn')?.addEventListener('click', async () => {
      await this._registerReminder(event);
      Components.closeModal();
      this.renderLists();
    });
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
    const searchQuery = root.dataset.search || '';
    let allEvents = getAllMushairaEvents();
    if (searchQuery) allEvents = API.searchMushairaEvents(allEvents, searchQuery);
    const tab = root.dataset.tab || this._getActiveTab();
    const scheduleFilter = root.dataset.scheduleFilter || 'all';
    const endedFilter = root.dataset.endedFilter || 'all';
    const liveEvents = allEvents.filter(e => e.live || e.paused);
    const endedEvents = allEvents.filter(e => e.ended);
    const scheduledEvents = allEvents.filter(e => !e.live && !e.ended && !e.paused);

    let html = '';
    if (tab === 'schedule') {
      html = this.renderScheduleTab(scheduledEvents, registered, scheduleFilter);
    } else if (tab === 'ended') {
      html = this.renderEndedTab(endedEvents, endedFilter);
    } else {
      html = this.renderLiveTab(liveEvents, registered);
    }

    if (!allEvents.length) {
      html = '<p class="empty-state">No mushaira events yet. Tap + to create one!</p>';
    }

    root.innerHTML = html;
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
      btn.onclick = async () => {
        const event = getMushairaEventById(btn.dataset.eventId);
        if (event) await this._registerReminder(event);
        else Storage.registerEvent(parseInt(btn.dataset.eventId));
        this.renderLists();
      };
    });

    document.querySelectorAll('.view-speakers-btn').forEach(btn => {
      btn.onclick = () => this.showViewAllSpeakers(parseInt(btn.dataset.eventId, 10));
    });

    document.querySelectorAll('.view-audience-btn').forEach(btn => {
      btn.onclick = () => this.showViewAllAudience(parseInt(btn.dataset.eventId, 10));
    });

    document.querySelectorAll('.session-details-btn').forEach(btn => {
      btn.onclick = () => this.showSessionDetails(parseInt(btn.dataset.eventId, 10));
    });

    document.querySelectorAll('.watch-replay-btn').forEach(btn => {
      btn.onclick = () => this.showWatchReplay(parseInt(btn.dataset.eventId, 10));
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

  async initSessionPage(eventId) {
    const root = document.getElementById('mushaira-session-root');
    if (!root) return;
    await this.load();
    let event = getMushairaEventById(eventId);
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
      root.innerHTML = '<div class="page-header"><h1>Session not found</h1><a href="#/mushaira" class="btn btn-gold">Back</a></div>';
      return;
    }
    await this._loadSessionCaches([event]);
    root.innerHTML = this.renderSessionDetailsPage(event);
    this._bindEventButtons();
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
      sessionStatus: event.status || (event.live ? 'live' : 'scheduled'),
      maxSeats: LIVE_ROOM.MUSHAIRA_SEATS,
      backPath: '#/mushaira',
      leavePath: '/mushaira',
      tags: event.tags,
      date: event.date,
      time: event.time
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
        sessionStatus: liveRoom.dataset.sessionStatus || 'live',
        maxSeats: parseInt(liveRoom.dataset.maxSeats, 10) || LIVE_ROOM.MUSHAIRA_SEATS,
        leavePath: liveRoom.dataset.leavePath || '/mushaira',
        tags: liveRoom.dataset.tags ? liveRoom.dataset.tags.split('|') : [],
        date: liveRoom.dataset.date || '',
        time: liveRoom.dataset.time || ''
      });
    }
  },

  async initPage() {
    const root = document.getElementById('mushaira-events-root');
    if (!root) return;
    await this.load();
    if (SupabaseClient.isEnabled()) await API.processDueReminders();
    const allEvents = getAllMushairaEvents();
    await this._loadSessionCaches(allEvents);
    this.renderLists();
    this.subscribe();
    this._startPoll();

    const searchInput = document.getElementById('mushaira-search-input');
    if (searchInput) {
      searchInput.addEventListener('input', () => {
        root.dataset.search = searchInput.value.trim();
        this.renderLists();
      });
    }
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
      const allEvents = getAllMushairaEvents();
      await this._loadSessionCaches(allEvents);
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
