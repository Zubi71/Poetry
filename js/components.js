const Components = {
  icon(name) {
    const icons = {
      home: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M3 9l9-7 9 7v11a2 2 0 01-2 2H5a2 2 0 01-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/></svg>',
      poems: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M4 19.5A2.5 2.5 0 016.5 17H20"/><path d="M6.5 2H20v20H6.5A2.5 2.5 0 014 19.5v-15A2.5 2.5 0 016.5 2z"/></svg>',
      trending: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="23 6 13.5 15.5 8.5 10.5 1 18"/><polyline points="17 6 23 6 23 12"/></svg>',
      categories: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/><rect x="14" y="14" width="7" height="7"/><rect x="3" y="14" width="7" height="7"/></svg>',
      poets: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 00-3-3.87"/><path d="M16 3.13a4 4 0 010 7.75"/></svg>',
      events: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>',
      contests: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="8" r="7"/><polyline points="8.21 13.89 7 23 12 20 17 23 15.79 13.88"/></svg>',
      bookmarks: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M19 21l-7-5-7 5V5a2 2 0 012-2h10a2 2 0 012 2z"/></svg>',
      history: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>',
      messages: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z"/></svg>',
      settings: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 00.33 1.82l.06.06a2 2 0 010 2.83 2 2 0 01-2.83 0l-.06-.06a1.65 1.65 0 00-1.82-.33 1.65 1.65 0 00-1 1.51V21a2 2 0 01-4 0v-.09A1.65 1.65 0 009 19.4a1.65 1.65 0 00-1.82.33l-.06.06a2 2 0 01-2.83 0 2 2 0 010-2.83l.06-.06A1.65 1.65 0 004.68 15a1.65 1.65 0 00-1.51-1H3a2 2 0 010-4h.09A1.65 1.65 0 004.6 9a1.65 1.65 0 00-.33-1.82l-.06-.06a2 2 0 012.83-2.83l.06.06A1.65 1.65 0 009 4.68a1.65 1.65 0 001-1.51V3a2 2 0 014 0v.09a1.65 1.65 0 001 1.51 1.65 1.65 0 001.82-.33l.06-.06a2 2 0 012.83 2.83l-.06.06A1.65 1.65 0 0019.4 9a1.65 1.65 0 001.51 1H21a2 2 0 010 4h-.09a1.65 1.65 0 00-1.51 1z"/></svg>',
      voice: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 1a3 3 0 00-3 3v8a3 3 0 006 0V4a3 3 0 00-3-3z"/><path d="M19 10v2a7 7 0 01-14 0v-2"/><line x1="12" y1="19" x2="12" y2="23"/><line x1="8" y1="23" x2="16" y2="23"/></svg>',
      search: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>',
      bell: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M18 8A6 6 0 006 8c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M13.73 21a2 2 0 01-3.46 0"/></svg>',
      heart: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M20.84 4.61a5.5 5.5 0 00-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 00-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 000-7.78z"/></svg>',
      comment: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z"/></svg>',
      share: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="18" cy="5" r="3"/><circle cx="6" cy="12" r="3"/><circle cx="18" cy="19" r="3"/><line x1="8.59" y1="13.51" x2="15.42" y2="17.49"/><line x1="15.41" y1="6.51" x2="8.59" y2="10.49"/></svg>',
      back: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="19" y1="12" x2="5" y2="12"/><polyline points="12 19 5 12 12 5"/></svg>',
      clock: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>',
      eye: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>',
      eyeOff: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M17.94 17.94A10.07 10.07 0 0112 20c-7 0-11-8-11-8a18.45 18.45 0 015.06-5.94M9.9 4.24A9.12 9.12 0 0112 4c7 0 11 8 11 8a18.5 18.5 0 01-2.16 3.19m-6.72-1.07a3 3 0 11-4.24-4.24"/><line x1="1" y1="1" x2="23" y2="23"/></svg>',
      plus: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>',
      menu: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="3" y1="12" x2="21" y2="12"/><line x1="3" y1="6" x2="21" y2="6"/><line x1="3" y1="18" x2="21" y2="18"/></svg>',
      crown: '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M2 19h20v2H2v-2zm2-8l3.5 4.5L12 8l4.5 7.5L20 11l2 8H2l2-8z"/></svg>',
      explore: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><polygon points="16.24 7.76 14.12 14.12 7.76 16.24 9.88 9.88 16.24 7.76"/></svg>',
      profile: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>'
    };
    return icons[name] || '';
  },

  formatNumber(n) {
    if (n >= 1000) return (n / 1000).toFixed(1) + 'K';
    return n.toString();
  },

  isActive(path) {
    const current = Router.getCurrentPath();
    if (path === '/' || path === '/home') return current === '/' || current === '/home';
    return current.startsWith(path);
  },

  sidebarLinks() {
    return [
      { path: '/', icon: 'home', label: 'Home' },
      { action: 'write', icon: 'plus', label: 'Write Poetry' },
      { path: '/poems', icon: 'poems', label: 'All Poems' },
      { path: '/poems?trending=1', icon: 'trending', label: 'Trending' },
      { path: '/categories', icon: 'categories', label: 'Categories' },
      { path: '/poets', icon: 'poets', label: 'Poets' },
      { path: '/top-poets', icon: 'contests', label: 'Top Poets' },
      { path: '/mushaira', icon: 'events', label: 'Mushaira Events', badge: 'Live', badgeType: 'live' },
      { path: '/voice-rooms', icon: 'voice', label: 'Voice Rooms' },
      { path: '/contests', icon: 'contests', label: 'Contests', badge: 'New', badgeType: 'new' },
      { path: '/bookmarks', icon: 'bookmarks', label: 'Bookmarks' },
      { path: '/history', icon: 'history', label: 'History' },
      { path: '/messages', icon: 'messages', label: 'Messages' },
      { path: '/settings', icon: 'settings', label: 'Settings' },
      { path: '/dashboard', icon: 'profile', label: 'Dashboard' }
    ];
  },

  renderHeader() {
    const user = Auth.getCurrentUser();
    const unread = (typeof Realtime !== 'undefined' && Realtime.unreadCount != null && SupabaseClient.isEnabled() && Auth.isLoggedIn() && !Auth.isGuest())
      ? Realtime.unreadCount
      : Storage.getNotifications().filter(n => !n.read).length;
    return `
      <header class="header">
        <button class="menu-toggle" id="menu-toggle" aria-label="Menu">${this.icon('menu')}</button>
        <a href="#/" class="header-logo">
          <img src="${APP_DATA.logo}" alt="Urdu Poetry">
          <span>Urdu Poetry</span>
        </a>
        <div class="header-search">
          <span class="search-icon">${this.icon('search')}</span>
          <input type="search" id="global-search" placeholder="Search poems, poets, topics..." aria-label="Search">
        </div>
        <div class="header-actions">
          <a href="#/notifications" class="icon-btn notification-btn" aria-label="Notifications">
            ${this.icon('bell')}
            ${unread > 0 ? `<span class="badge-count">${unread}</span>` : ''}
          </a>
          <div class="user-menu">
            ${avatarImg(user.name, 'user-avatar')}
            <div class="user-info">
              <span class="user-name">${user.name}</span>
              <a href="#/settings" class="view-profile">View Profile</a>
            </div>
          </div>
        </div>
      </header>
    `;
  },

  renderSidebar() {
    const links = this.sidebarLinks();
    return `
      <aside class="sidebar" id="sidebar">
        <nav class="sidebar-nav">
          ${links.map(link => link.action === 'write' ? `
            <button type="button" class="sidebar-link open-write-btn">
              <span class="sidebar-icon">${this.icon(link.icon)}</span>
              <span>${link.label}</span>
            </button>
          ` : `
            <a href="#${link.path}" class="sidebar-link ${this.isActive(link.path.split('?')[0]) ? 'active' : ''}">
              <span class="sidebar-icon">${this.icon(link.icon)}</span>
              <span>${link.label}</span>
              ${link.badge ? `<span class="nav-badge ${link.badgeType}">${link.badge}</span>` : ''}
            </a>
          `).join('')}
        </nav>
      </aside>
      <div class="sidebar-overlay" id="sidebar-overlay"></div>
    `;
  },

  renderBottomNav() {
    const items = [
      { path: '/', icon: 'home', label: 'Home' },
      { path: '/poems', icon: 'explore', label: 'Explore' },
      { path: null, icon: 'plus', label: 'Create', special: true, action: 'write' },
      { path: '/messages', icon: 'messages', label: 'Messages' },
      { path: '/dashboard', icon: 'profile', label: 'Profile' }
    ];
    return `
      <nav class="bottom-nav">
        ${items.map(item => item.action === 'write' ? `
          <button type="button" class="bottom-nav-item special open-write-btn" id="create-post-btn">
            <span class="bottom-nav-icon">${this.icon(item.icon)}</span>
            <span>${item.label}</span>
          </button>
        ` : `
          <a href="#${item.path}" class="bottom-nav-item ${this.isActive(item.path) ? 'active' : ''}">
            <span class="bottom-nav-icon">${this.icon(item.icon)}</span>
            <span>${item.label}</span>
          </a>
        `).join('')}
      </nav>
    `;
  },

  renderRightSidebar() {
    const topPoets = getTopPoets('week').slice(0, 5);
    const trophies = ['🥇', '🥈', '🥉'];
    return `
      <aside class="right-sidebar">
        ${Auth.showAds() ? this.renderAd('sidebar') : ''}
        <div class="widget">
          <h3 class="widget-title">Top Poets This Week</h3>
          <div class="top-poets-list">
            ${topPoets.map((poet, i) => `
              <a href="#/poet/${poet.id}" class="top-poet-item">
                <span class="trophy">${i < 3 ? trophies[i] : i + 1}</span>
                ${avatarImg(poet.name, '', poet.name)}
                <div class="top-poet-info">
                  <span class="name">${poet.name}</span>
                  <span class="likes">${this.formatNumber(poet.followers)} followers</span>
                </div>
              </a>
            `).join('')}
          </div>
          <a href="#/top-poets" class="widget-link">View All Rankings</a>
        </div>
        <div class="widget">
          <h3 class="widget-title">Popular Categories</h3>
          <div class="category-tags">
            ${APP_DATA.categories.slice(0, 8).map(c => `
              <a href="#/categories/${c.id}" class="category-tag">${c.name}</a>
            `).join('')}
          </div>
          <a href="#/categories" class="widget-link">View All Categories</a>
        </div>
        <div class="widget">
          <h3 class="widget-title">Mushaira Events</h3>
          ${APP_DATA.mushairaEvents.slice(0, 2).map(event => `
            <div class="event-widget-item">
              ${event.live ? '<span class="live-badge">Live</span>' : ''}
              <h4>${event.title}</h4>
              <p>${event.date} · ${event.time}</p>
              <p class="location">${event.location}</p>
              <a href="#/mushaira" class="btn btn-gold btn-sm">${event.live ? 'Join Now' : 'Register'}</a>
            </div>
          `).join('')}
        </div>
      </aside>
    `;
  },

  renderAd(type) {
    const ad = APP_DATA.ads.find(a => a.type === type);
    if (!ad || !Auth.showAds()) return '';
    Storage.trackAdView(ad.id);
    return `
      <div class="ad-banner ad-${type}" data-ad-id="${ad.id}">
        <a href="${ad.link}" class="ad-link" data-ad-click="${ad.id}">
          <img src="${ad.image}" alt="${ad.title}" loading="lazy" onerror="this.onerror=null;this.src='${getPlaceholderImage(600, 200, ad.title)}'">
          <span class="ad-label">Ad</span>
        </a>
      </div>
    `;
  },

  renderFeedAd() {
    if (!Auth.showAds()) return '';
    return this.renderAd('feed');
  },

  renderPoemCard(poem, showActions = true) {
    const poet = getPoetById(poem.poetId);
    const category = getCategoryById(poem.category);
    const liked = Storage.isLiked(poem.id);
    const bookmarked = Storage.isBookmarked(poem.id);
    const theme = poem.cardTheme || 'classic-dark';
    const tagLabel = poem.tagLabel || (category ? category.name : poem.category);
    const likeCount = this.formatNumber(poem.likes + (liked ? 1 : 0));
    return `
      <article class="poem-card poem-card-v2 poem-card-${theme}" data-poem-id="${poem.id}">
        <div class="poem-card-header">
          <a href="${poet ? `#/poet/${poem.poetId}` : '#/dashboard'}" class="poet-info">
            ${avatarImg(poem.poetName, 'poet-avatar-gold', poem.poetName)}
            <div>
              <span class="poet-name">${poem.poetName}</span>
              <span class="post-time"><span class="time-icon">${this.icon('clock')}</span> ${poem.time}</span>
            </div>
          </a>
          <span class="category-badge" style="background:${category ? category.color : '#8B5CF6'}">${tagLabel}</span>
        </div>
        <a href="#/poem/${poem.id}" class="poem-content">
          ${formatPoemHtml(poem.text, theme)}
        </a>
        ${showActions ? `
          <div class="poem-actions poem-actions-bar">
            <button class="action-btn like-btn ${liked ? 'active' : ''}" data-action="like" data-id="${poem.id}">
              ${this.icon('heart')} <span>${likeCount}</span>
            </button>
            <span class="action-divider"></span>
            <a href="#/poem/${poem.id}" class="action-btn comment-btn">
              ${this.icon('comment')} <span>${poem.comments}</span>
            </a>
            <span class="action-divider"></span>
            <button class="action-btn share-btn" data-action="share" data-id="${poem.id}">
              ${this.icon('share')} <span>Share</span>
            </button>
            <span class="action-divider"></span>
            <button class="action-btn bookmark-btn ${bookmarked ? 'active' : ''}" data-action="bookmark" data-id="${poem.id}">
              ${this.icon('bookmarks')} <span>${bookmarked ? 'Saved' : 'Save'}</span>
            </button>
          </div>
        ` : ''}
      </article>
    `;
  },

  renderPremiumSection() {
    return '';
  },

  renderSocialAuthIcons() {
    return `
      <div class="social-icon-row">
        <button type="button" class="social-icon-btn" data-social="google" aria-label="Continue with Google">
          <svg viewBox="0 0 24 24"><path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 01-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z"/><path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/><path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/><path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/></svg>
        </button>
        <button type="button" class="social-icon-btn" data-social="apple" aria-label="Continue with Apple">
          <svg viewBox="0 0 24 24" fill="currentColor"><path d="M17.05 20.28c-.98.95-2.05.88-3.08.4-1.09-.5-2.08-.48-3.24 0-1.44.62-2.2.44-3.06-.4C2.79 15.25 3.51 7.59 9.05 7.31c1.35.07 2.29.74 3.08.8 1.18-.24 2.31-.93 3.57-.84 1.51.12 2.65.72 3.4 1.8-3.12 1.87-2.38 5.98.48 7.13-.57 1.5-1.31 2.99-2.54 4.09zM12.03 7.25c-.15-2.23 1.66-4.07 3.74-4.25.29 2.58-2.34 4.5-3.74 4.25z"/></svg>
        </button>
        <button type="button" class="social-icon-btn" data-social="facebook" aria-label="Continue with Facebook">
          <svg viewBox="0 0 24 24" fill="#1877F2"><path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/></svg>
        </button>
      </div>
    `;
  },

  renderFooter() {
    return `
      <footer class="footer">
        <div class="footer-grid">
          <div class="footer-brand">
            <img src="${APP_DATA.logo}" alt="Urdu Poetry">
            <p>A gathering of souls through verse. Discover, share, and celebrate the beauty of Urdu poetry.</p>
            <div class="social-links">
              <a href="#" aria-label="Facebook">Facebook</a>
              <a href="#" aria-label="Instagram">Instagram</a>
              <a href="#" aria-label="YouTube">YouTube</a>
            </div>
          </div>
          <div class="footer-links">
            <h4>Explore</h4>
            <a href="#/poems">All Poems</a>
            <a href="#/poets">Poets</a>
            <a href="#/categories">Categories</a>
            <a href="#/poems?trending=1">Trending</a>
          </div>
          <div class="footer-links">
            <h4>Community</h4>
            <a href="#/mushaira">Mushaira Events</a>
            <a href="#/contests">Contests</a>
            <a href="#/voice-rooms">Voice Rooms</a>
            <a href="#/settings">Guidelines</a>
          </div>
          <div class="footer-links">
            <h4>Support</h4>
            <a href="#/settings">Help Center</a>
            <a href="#/settings">Contact Us</a>
            <a href="#/settings">Privacy Policy</a>
            <a href="#/settings">Terms of Service</a>
          </div>
          <div class="footer-newsletter">
            <h4>Subscribe to Newsletter</h4>
            <form id="newsletter-form" class="newsletter-form">
              <input type="email" placeholder="Your email" required>
              <button type="submit" class="btn btn-gold">Subscribe</button>
            </form>
          </div>
        </div>
        <div class="footer-bottom">
          <p>© 2024 Urdu Poetry. All rights reserved.</p>
        </div>
      </footer>
    `;
  },

  renderAppLayout(content, options = {}) {
    const { fullWidth = false, noSidebar = false, authPage = false } = options;
    if (authPage) {
      return `<div class="auth-layout">${content}</div>`;
    }
    return `
      <div class="app-layout">
        ${this.renderHeader()}
        ${Auth.showAds() ? this.renderAd('header') : ''}
        <div class="main-container ${fullWidth ? 'full-width' : ''} ${noSidebar ? 'no-sidebar' : ''}">
          ${noSidebar ? '' : this.renderSidebar()}
          <main class="main-content" id="main-content">${content}</main>
          ${noSidebar || fullWidth ? '' : this.renderRightSidebar()}
        </div>
        ${options.showPremium !== false ? '' : ''}
        ${this.renderFooter()}
        ${this.renderBottomNav()}
      </div>
    `;
  },

  showToast(message, type = 'info') {
    const root = document.getElementById('toast-root');
    const toast = document.createElement('div');
    toast.className = `toast toast-${type}`;
    toast.textContent = message;
    root.appendChild(toast);
    setTimeout(() => toast.classList.add('show'), 10);
    setTimeout(() => {
      toast.classList.remove('show');
      setTimeout(() => toast.remove(), 300);
    }, 3000);
  },

  renderGuestBanner() {
    if (!Auth.isGuest()) return '';
    const remaining = Auth.getGuestReadsRemaining();
    const limit = APP_DATA.guestPoemLimit;
    if (remaining <= 0) {
      return `
        <div class="guest-read-banner guest-read-banner-limit">
          <p><strong>Free reading limit reached.</strong> Register or sign in to continue.</p>
          <p class="urdu-text">${APP_DATA.guestLimitUrdu}</p>
          <div class="guest-read-banner-actions">
            <a href="#/register" class="btn btn-gold btn-sm">Create Account</a>
            <a href="#/login" class="btn btn-outline-gold btn-sm">Sign In</a>
          </div>
        </div>
      `;
    }
    const warn = remaining <= 3;
    return `
      <div class="guest-read-banner ${warn ? 'guest-read-banner-warn' : ''}">
        <p>Reading as guest — <strong>${remaining}</strong> of ${limit} free poems left</p>
        <a href="#/register" class="btn btn-outline-gold btn-sm">Register free</a>
      </div>
    `;
  },

  showGuestLimitModal() {
    const root = document.getElementById('modal-root');
    if (document.getElementById('guest-limit-modal')) return;
    this.openModalLock();
    root.innerHTML = `
      <div class="modal-overlay active" id="guest-limit-modal">
        <div class="modal guest-limit-modal auth-style-modal">
          <img src="${APP_DATA.logo}" alt="" class="auth-logo-sm">
          <h2>Want to read more poems?</h2>
          <p>${APP_DATA.guestLimitPromptEn}</p>
          <p class="urdu-text modal-urdu">${APP_DATA.guestLimitPromptUrdu}</p>
          <p class="guest-limit-note">You have read ${APP_DATA.guestPoemLimit} poems as a guest.</p>
          <div class="modal-actions guest-limit-actions">
            <a href="#/register" class="btn btn-gold" id="guest-limit-register">Create Account</a>
            <a href="#/login" class="btn btn-outline-gold" id="guest-limit-login">Sign In</a>
          </div>
          <div class="social-divider">Or continue with</div>
          ${this.renderSocialAuthIcons()}
          <button type="button" class="btn btn-ghost btn-block" id="guest-limit-close">Continue Browsing</button>
        </div>
      </div>
    `;
    document.getElementById('guest-limit-close').addEventListener('click', () => this.closeModal());
    ['guest-limit-register', 'guest-limit-login'].forEach(id => {
      document.getElementById(id)?.addEventListener('click', () => this.closeModal());
    });
    root.querySelectorAll('[data-social]').forEach(btn => {
      btn.addEventListener('click', async () => {
        const result = await Auth.loginWithOAuth(btn.dataset.social);
        if (result?.redirecting) this.closeModal();
      });
    });
    root.querySelector('.modal-overlay')?.addEventListener('click', (e) => {
      if (e.target.classList.contains('modal-overlay')) this.closeModal();
    });
  },

  showModal(title, content, actions = '') {
    const root = document.getElementById('modal-root');
    this.openModalLock();
    root.innerHTML = `
      <div class="modal-overlay active">
        <div class="modal">
          <h2>${title}</h2>
          ${content}
          <div class="modal-actions">${actions}</div>
        </div>
      </div>
    `;
    root.querySelector('.modal-overlay').addEventListener('click', (e) => {
      if (e.target.classList.contains('modal-overlay')) this.closeModal();
    });
  },

  closeModal() {
    const root = document.getElementById('modal-root');
    if (root) root.innerHTML = '';
    document.body.classList.remove('modal-open');
    document.body.style.overflow = '';
  },

  openModalLock() {
    document.body.classList.add('modal-open');
    document.body.style.overflow = 'hidden';
  },
};
