/**
 * Urdu Poetry — Full Admin Panel (sidebar layout)
 */
const AdminPanel = {
  nav: [
    { id: 'dashboard', label: 'Dashboard', icon: 'dashboard' },
    { id: 'users', label: 'Users', icon: 'users' },
    { id: 'categories', label: 'Categories', icon: 'categories' },
    { id: 'poems', label: 'Poems', icon: 'poems' },
    { id: 'mushaira', label: 'Mushaira', icon: 'mushaira', badge: 'live' },
    { id: 'reports', label: 'Reports', icon: 'reports' },
    { id: 'ads', label: 'Ads', icon: 'ads' },
    { id: 'premium', label: 'Premium', icon: 'premium' },
    { id: 'contests', label: 'Contests', icon: 'contests' },
    { id: 'staff', label: 'Staff', icon: 'staff' },
    { id: 'history', label: 'History', icon: 'history' },
    { id: 'settings', label: 'Settings', icon: 'settings' }
  ],

  titles: {
    dashboard: 'Dashboard Overview',
    users: 'User Management',
    categories: 'Category Management',
    poems: 'Poetry Management',
    mushaira: 'Mushaira Events',
    reports: 'Reports & Moderation Queue',
    ads: 'Advertisements Management',
    premium: 'Premium Subscriptions',
    contests: 'Community & Contest Management',
    staff: 'Staff & Permissions',
    history: 'Admin History',
    settings: 'System Settings & Analytics'
  },

  esc(text) {
    const d = document.createElement('div');
    d.textContent = text || '';
    return d.innerHTML;
  },

  icon(name) {
    const icons = {
      dashboard: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/><rect x="3" y="14" width="7" height="7" rx="1"/><rect x="14" y="14" width="7" height="7" rx="1"/></svg>',
      users: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 00-3-3.87"/><path d="M16 3.13a4 4 0 010 7.75"/></svg>',
      categories: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/><rect x="14" y="14" width="7" height="7"/><rect x="3" y="14" width="7" height="7"/></svg>',
      poems: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M4 19.5A2.5 2.5 0 016.5 17H20"/><path d="M6.5 2H20v20H6.5A2.5 2.5 0 014 19.5v-15A2.5 2.5 0 016.5 2z"/></svg>',
      mushaira: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 1a3 3 0 00-3 3v8a3 3 0 006 0V4a3 3 0 00-3-3z"/><path d="M19 10v2a7 7 0 01-14 0v-2"/></svg>',
      reports: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M4 15s1-1 4-1 5 2 8 2 4-1 4-1V3s-1 1-4 1-5-2-8-2-4 1-4 1z"/><line x1="4" y1="22" x2="4" y2="15"/></svg>',
      ads: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="2" y="7" width="20" height="14" rx="2"/><path d="M16 7V5a2 2 0 00-2-2h-4a2 2 0 00-2 2v2"/></svg>',
      premium: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/></svg>',
      contests: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="8" r="7"/><polyline points="8.21 13.89 7 23 12 20 17 23 15.79 13.88"/></svg>',
      staff: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>',
      history: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>',
      settings: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 00.33 1.82l.06.06a2 2 0 010 2.83 2 2 0 01-2.83 0l-.06-.06a1.65 1.65 0 00-1.82-.33 1.65 1.65 0 00-1 1.51V21a2 2 0 01-4 0v-.09A1.65 1.65 0 009 19.4a1.65 1.65 0 00-1.82.33l-.06.06a2 2 0 01-2.83 0 2 2 0 010-2.83l.06-.06A1.65 1.65 0 004.68 15a1.65 1.65 0 00-1.51-1H3a2 2 0 010-4h.09A1.65 1.65 0 004.6 9a1.65 1.65 0 00-.33-1.82l-.06-.06a2 2 0 012.83-2.83l.06.06A1.65 1.65 0 009 4.68a1.65 1.65 0 001-1.51V3a2 2 0 014 0v.09a1.65 1.65 0 001 1.51 1.65 1.65 0 001.82-.33l.06-.06a2 2 0 012.83 2.83l-.06.06A1.65 1.65 0 0019.4 9a1.65 1.65 0 001.51 1H21a2 2 0 010 4h-.09a1.65 1.65 0 00-1.51 1z"/></svg>',
      search: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>',
      bell: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M18 8A6 6 0 006 8c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M13.73 21a2 2 0 01-3.46 0"/></svg>',
      menu: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="3" y1="12" x2="21" y2="12"/><line x1="3" y1="6" x2="21" y2="6"/><line x1="3" y1="18" x2="21" y2="18"/></svg>',
      close: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>',
    };
    return icons[name] || '';
  },

  render(section = 'dashboard') {
    const user = Auth.getCurrentUser();
    const liveCount = getLiveMushairaEvents().length;
    const navHtml = this.nav.map(item => {
      const badge = item.badge === 'live' && liveCount
        ? `<span class="admin-nav-badge live">${liveCount} Live</span>`
        : '';
      return `
        <a href="#/admin?section=${item.id}" class="admin-nav-link ${section === item.id ? 'active' : ''}">
          <span class="admin-nav-icon">${this.icon(item.icon)}</span>
          <span class="admin-nav-label">${item.label}</span>
          ${badge}
        </a>
      `;
    }).join('');

    const content = this.renderSection(section);

    return `
      <div class="admin-shell" data-section="${section}">
        <div class="admin-sidebar-backdrop" id="admin-sidebar-backdrop" aria-hidden="true"></div>
        <aside class="admin-sidebar" id="admin-sidebar">
          <div class="admin-sidebar-head">
            <a href="#/" class="admin-brand">
              <img src="${APP_DATA.logo}" alt="Urdu Poetry">
              <span>Urdu Poetry</span>
            </a>
            <button type="button" class="admin-sidebar-close" id="admin-sidebar-close" aria-label="Close menu">${this.icon('close')}</button>
          </div>
          <nav class="admin-nav">${navHtml}</nav>
          <a href="#/" class="admin-back-site">← Back to Site</a>
        </aside>
        <div class="admin-main">
          <header class="admin-topbar">
            <button type="button" class="admin-menu-btn" id="admin-menu-toggle" aria-label="Open menu">${this.icon('menu')}</button>
            <div class="admin-topbar-search">
              ${this.icon('search')}
              <input type="search" id="admin-global-search" placeholder="Search poems, poets, topics..." aria-label="Admin search">
            </div>
            <div class="admin-topbar-actions">
              <a href="#/premium" class="btn btn-gold btn-sm admin-upgrade-btn">Upgrade Plan</a>
              <a href="#/notifications" class="admin-icon-btn" aria-label="Notifications">${this.icon('bell')}</a>
              <div class="admin-user-chip">
                ${avatarImg(user.name, 'admin-user-avatar', user.name)}
                <span>${this.esc(user.name || 'Admin')}</span>
              </div>
            </div>
          </header>
          <div class="admin-content">
            <div class="admin-page-head">
              <h1>${this.titles[section] || 'Admin'}</h1>
            </div>
            <div id="admin-section-root">${content}</div>
          </div>
        </div>
      </div>
    `;
  },

  renderSection(section) {
    const map = {
      dashboard: () => this.renderDashboard(),
      users: () => this.renderUsers(),
      categories: () => this.renderCategories(),
      poems: () => this.renderPoems(),
      mushaira: () => this.renderMushaira(),
      reports: () => this.renderReports(),
      ads: () => this.renderAds(),
      premium: () => this.renderPremium(),
      contests: () => this.renderContests(),
      staff: () => this.renderStaff(),
      history: () => this.renderHistory(),
      settings: () => this.renderSettings()
    };
    return (map[section] || map.dashboard)();
  },

  renderDashboard() {
    const poems = getAllPoems();
    const userPosts = Storage.getUserPosts();
    const liveEvents = getLiveMushairaEvents();
    const reports = Storage.getReports().filter(r => r.status === 'pending');
    const chartData = [42, 58, 45, 72, 68, 55, 80];

    return `
      <div class="admin-stats-row">
        <div class="admin-stat-card">
          <span class="admin-stat-label">New Users (24h)</span>
          <strong class="admin-stat-value">${Math.max(1, Storage.getAdminUsersList().length)}</strong>
          <span class="admin-stat-trend up">+12%</span>
        </div>
        <div class="admin-stat-card">
          <span class="admin-stat-label">Poems Published (24h)</span>
          <strong class="admin-stat-value">${userPosts.length || poems.length}</strong>
          <span class="admin-stat-trend up">+8%</span>
        </div>
        <div class="admin-stat-card">
          <span class="admin-stat-label">Live Mushaira</span>
          <strong class="admin-stat-value">${liveEvents.length}</strong>
          <span class="admin-stat-trend">${liveEvents.length ? 'Active now' : 'None'}</span>
        </div>
        <div class="admin-stat-card">
          <span class="admin-stat-label">Pending Reports</span>
          <strong class="admin-stat-value">${reports.length}</strong>
          <span class="admin-stat-trend ${reports.length ? 'warn' : ''}">${reports.length ? 'Needs review' : 'Clear'}</span>
        </div>
      </div>
      <div class="admin-card admin-chart-card">
        <h2>Daily Engagement (Likes / Comments)</h2>
        <div class="admin-chart">
          ${chartData.map((v, i) => `
            <div class="admin-chart-bar-wrap">
              <div class="admin-chart-bar" style="height:${v}%"></div>
              <span>${['Mon','Tue','Wed','Thu','Fri','Sat','Sun'][i]}</span>
            </div>
          `).join('')}
        </div>
      </div>
      <div class="admin-grid-2">
        <div class="admin-card">
          <h2>Quick Actions</h2>
          <div class="admin-quick-actions">
            <a href="#/admin?section=users" class="admin-quick-btn">Manage Users</a>
            <a href="#/admin?section=reports" class="admin-quick-btn">Review Reports</a>
            <a href="#/admin?section=mushaira" class="admin-quick-btn">Mushaira Events</a>
            <a href="#/admin?section=settings" class="admin-quick-btn">Writing Tags</a>
          </div>
        </div>
        <div class="admin-card">
          <h2>Recent Activity</h2>
          <ul class="admin-activity-list">
            ${(Storage.getAdminLog().slice(0, 5).map(e => `
              <li><strong>${this.esc(e.action)}</strong> — ${this.esc(e.detail)} <span>${this.esc(e.time)}</span></li>
            `).join('')) || '<li class="empty-hint">No admin actions logged yet.</li>'}
          </ul>
        </div>
      </div>
    `;
  },

  renderUsers() {
    return `
      <div class="admin-toolbar">
        <input type="search" class="admin-filter-input" id="admin-user-search" placeholder="Search users…">
        <select class="admin-filter-select" id="admin-user-filter">
          <option value="">All Roles</option>
          <option value="admin">Admin</option>
          <option value="user">User</option>
        </select>
      </div>
      <div class="admin-card">
        <div class="admin-table-wrap">
          <table class="admin-table" id="admin-users-table">
            <thead>
              <tr>
                <th>User</th>
                <th>Email</th>
                <th>Role</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody id="admin-users-list">
              <tr><td colspan="4" class="admin-loading">Loading users…</td></tr>
            </tbody>
          </table>
        </div>
      </div>
    `;
  },

  renderCategories() {
    const cats = APP_DATA.categories;
    return `
      <div class="admin-card">
        <p class="admin-card-desc">Manage poetry categories shown across the site.</p>
        <div class="admin-table-wrap">
          <table class="admin-table">
            <thead><tr><th>Category</th><th>Urdu</th><th>Color</th><th>Poems</th></tr></thead>
            <tbody>
              ${cats.map(c => {
                const count = getAllPoems().filter(p => p.category === c.id).length;
                return `<tr>
                  <td><span class="admin-cat-icon">${c.icon}</span> ${this.esc(c.name)}</td>
                  <td class="urdu-text">${this.esc(c.urdu)}</td>
                  <td><span class="admin-color-swatch" style="background:${c.color}"></span></td>
                  <td>${count}</td>
                </tr>`;
              }).join('')}
            </tbody>
          </table>
        </div>
      </div>
    `;
  },

  renderPoems() {
    const poems = getAllPoems().slice(0, 20);
    return `
      <div class="admin-toolbar">
        <input type="search" class="admin-filter-input" id="admin-poem-search" placeholder="Search poems…">
      </div>
      <div class="admin-card">
        <h2>Recently Published Poems</h2>
        <div class="admin-poem-grid">
          ${poems.map(p => `
            <div class="admin-poem-card">
              <p class="admin-poem-snippet urdu-text">${this.esc((p.text || '').split('\n')[0])}</p>
              <div class="admin-poem-meta">
                <span>${this.esc(p.poetName)}</span>
                <span>${this.esc(p.time)}</span>
              </div>
              <div class="admin-poem-footer">
                <span class="admin-badge published">Published</span>
                <a href="#/poem/${p.id}" class="btn btn-ghost btn-sm">View</a>
              </div>
            </div>
          `).join('')}
        </div>
      </div>
    `;
  },

  renderMushaira() {
    const events = getAllMushairaEvents();
    const live = events.filter(e => e.live);
    const totalViews = events.reduce((s, e) => s + (e.viewer_count || e.views || 0), 0);
    const totalLikes = events.reduce((s, e) => s + (e.like_count || e.likes || 0), 0);
    return `
      <div class="admin-stats-row admin-stats-row-sm">
        <div class="admin-stat-card"><span class="admin-stat-label">Total Sessions</span><strong class="admin-stat-value">${events.length}</strong></div>
        <div class="admin-stat-card"><span class="admin-stat-label">Live Now</span><strong class="admin-stat-value">${live.length}</strong></div>
        <div class="admin-stat-card"><span class="admin-stat-label">Total Viewers</span><strong class="admin-stat-value">${totalViews}</strong></div>
        <div class="admin-stat-card"><span class="admin-stat-label">Total Likes</span><strong class="admin-stat-value">${totalLikes}</strong></div>
      </div>
      <div class="admin-card">
        <div class="admin-toolbar">
          <h2>Mushaira Events</h2>
          <div class="admin-toolbar-actions">
            <span class="admin-bulk-info" id="admin-mushaira-bulk-info" hidden>
              <strong id="admin-mushaira-selected-count">0</strong> selected
              <button type="button" class="btn btn-ghost btn-sm" id="admin-mushaira-bulk-delete">Delete Selected</button>
              <button type="button" class="btn btn-ghost btn-sm" id="admin-mushaira-clear-selection">Clear</button>
            </span>
            <button type="button" class="btn btn-gold btn-sm" id="admin-create-mushaira">+ Create Event</button>
            <a href="#/mushaira" class="btn btn-outline-gold btn-sm">View Public Page</a>
          </div>
        </div>
        <div class="admin-table-wrap">
          <table class="admin-table">
            <thead>
              <tr>
                <th><input type="checkbox" id="admin-mushaira-select-all" aria-label="Select all events"></th>
                <th>Event</th><th>Host</th><th>Status</th><th>Viewers</th><th>Likes</th><th>Actions</th>
              </tr>
            </thead>
            <tbody>
              ${events.length ? events.map(e => `
                <tr data-event-id="${e.id}">
                  <td><input type="checkbox" class="admin-mushaira-select" data-id="${e.id}" aria-label="Select ${this.esc(e.title)}"></td>
                  <td><strong>${this.esc(e.title)}</strong><br><small>${this.esc(e.date || '')} ${this.esc(e.time || '')}</small></td>
                  <td>${this.esc(e.host)}</td>
                  <td>${e.live ? '<span class="admin-badge live">Live</span>' : e.ended ? '<span class="admin-badge">Ended</span>' : e.waiting ? '<span class="admin-badge">Waiting</span>' : '<span class="admin-badge">Scheduled</span>'}</td>
                  <td>${e.viewer_count || e.registered || 0}</td>
                  <td>${e.like_count || e.likes || 0}</td>
                  <td class="admin-actions-cell">
                    ${e.live || e.waiting ? `<a href="#/mushaira/live/${e.id}" class="btn btn-gold btn-sm">Join</a>` : ''}
                    <button type="button" class="btn btn-ghost btn-sm admin-edit-mushaira" data-id="${e.id}">Edit</button>
                    <button type="button" class="btn btn-ghost btn-sm admin-delete-mushaira" data-id="${e.id}">Delete</button>
                  </td>
                </tr>
              `).join('') : '<tr><td colspan="7" class="empty-hint">No mushaira events yet.</td></tr>'}
            </tbody>
          </table>
        </div>
      </div>
    `;
  },

  async _deleteMushairaEvents(ids) {
    let deletedIds = ids;
    if (SupabaseClient.isEnabled()) {
      deletedIds = await API.deleteMushairaEvents(ids);
      if (!deletedIds.length) {
        Components.showToast('Could not delete — you may not have permission for this event', 'error');
        return;
      }
      if (deletedIds.length < ids.length) {
        Components.showToast(`Deleted ${deletedIds.length} of ${ids.length} — some events could not be deleted`, 'error');
      } else {
        Components.showToast(deletedIds.length > 1 ? `${deletedIds.length} events deleted` : 'Event deleted');
      }
    } else {
      ids.forEach(id => Storage.removeCustomMushaira(id));
    }
    const deletedSet = new Set(deletedIds);
    window.REMOTE_MUSHAIRA_EVENTS = (window.REMOTE_MUSHAIRA_EVENTS || []).filter(e => !deletedSet.has(e.id));
    Router.navigate();
  },

  bindMushairaAdminEvents() {
    document.getElementById('admin-create-mushaira')?.addEventListener('click', () => Pages.showCreateMushairaModal());
    document.querySelectorAll('.admin-edit-mushaira').forEach(btn => {
      btn.onclick = () => this._showEditMushairaModal(parseInt(btn.dataset.id, 10));
    });
    document.querySelectorAll('.admin-delete-mushaira').forEach(btn => {
      btn.onclick = async () => {
        if (!confirm('Delete this event?')) return;
        await this._deleteMushairaEvents([parseInt(btn.dataset.id, 10)]);
      };
    });

    const selected = new Set();
    const selectAll = document.getElementById('admin-mushaira-select-all');
    const bulkInfo = document.getElementById('admin-mushaira-bulk-info');
    const countEl = document.getElementById('admin-mushaira-selected-count');
    const rowChecks = () => Array.from(document.querySelectorAll('.admin-mushaira-select'));

    const refreshBulkUI = () => {
      if (countEl) countEl.textContent = String(selected.size);
      if (bulkInfo) bulkInfo.hidden = selected.size === 0;
      const all = rowChecks();
      if (selectAll) {
        selectAll.checked = all.length > 0 && selected.size === all.length;
        selectAll.indeterminate = selected.size > 0 && selected.size < all.length;
      }
    };

    rowChecks().forEach(cb => {
      cb.onchange = () => {
        const id = parseInt(cb.dataset.id, 10);
        if (cb.checked) selected.add(id);
        else selected.delete(id);
        refreshBulkUI();
      };
    });

    if (selectAll) {
      selectAll.onchange = () => {
        rowChecks().forEach(cb => {
          cb.checked = selectAll.checked;
          const id = parseInt(cb.dataset.id, 10);
          if (selectAll.checked) selected.add(id);
          else selected.delete(id);
        });
        refreshBulkUI();
      };
    }

    document.getElementById('admin-mushaira-clear-selection')?.addEventListener('click', () => {
      selected.clear();
      rowChecks().forEach(cb => { cb.checked = false; });
      refreshBulkUI();
    });

    document.getElementById('admin-mushaira-bulk-delete')?.addEventListener('click', async () => {
      if (!selected.size) return;
      if (!confirm(`Delete ${selected.size} selected event(s)? This cannot be undone.`)) return;
      await this._deleteMushairaEvents([...selected]);
    });
  },

  _showEditMushairaModal(eventId) {
    const event = getMushairaEventById(eventId);
    if (!event) return;
    Components.showModal('Edit Mushaira Event', `
      <form id="admin-edit-mushaira-form">
        <div class="form-group"><label>Title</label><input type="text" name="title" value="${this.esc(event.title)}" required></div>
        <div class="form-group"><label>Description</label><textarea name="description" rows="2">${this.esc(event.description || '')}</textarea></div>
        <div class="form-group"><label>Location</label><input type="text" name="location" value="${this.esc(event.location || '')}"></div>
        <div class="form-group"><label>Category</label><input type="text" name="category" value="${this.esc(event.category || 'poetry')}"></div>
        <div class="form-group"><label>Replay URL</label><input type="url" name="replay_url" value="${this.esc(event.replay_url || '')}" placeholder="https://…"></div>
      </form>
    `, '<button type="button" class="btn btn-gold" id="admin-save-mushaira">Save Changes</button>');
    document.getElementById('admin-save-mushaira').onclick = async () => {
      const form = document.getElementById('admin-edit-mushaira-form');
      const updates = {
        title: form.title.value.trim(),
        description: form.description.value.trim(),
        location: form.location.value.trim(),
        category: form.category.value.trim(),
        replay_url: form.replay_url.value.trim() || null
      };
      if (SupabaseClient.isEnabled()) {
        const updated = await API.adminUpdateMushairaEvent(eventId, updates);
        if (updated) {
          window.REMOTE_MUSHAIRA_EVENTS = (window.REMOTE_MUSHAIRA_EVENTS || []).map(e => e.id === eventId ? updated : e);
        }
      }
      Components.closeModal();
      Components.showToast('Event updated');
      Router.navigate();
    };
  },

  renderReports() {
    const reports = Storage.getReports();
    const pending = reports.filter(r => r.status === 'pending');
    return `
      <div class="admin-stats-row admin-stats-row-sm">
        <div class="admin-stat-card"><span class="admin-stat-label">Pending</span><strong class="admin-stat-value">${pending.length}</strong></div>
        <div class="admin-stat-card"><span class="admin-stat-label">Resolved</span><strong class="admin-stat-value">${reports.filter(r => r.status !== 'pending').length}</strong></div>
      </div>
      <div class="admin-card">
        <h2>Moderation Queue</h2>
        <div class="admin-table-wrap">
          <table class="admin-table">
            <thead><tr><th>Type</th><th>Reason</th><th>Time</th><th>Status</th><th>Actions</th></tr></thead>
            <tbody>
              ${reports.length ? reports.map(r => `
                <tr>
                  <td>${r.type === 'post' ? 'Poem' : 'User'} #${r.targetId || r.id}</td>
                  <td>${this.esc(r.reason || 'Reported for review')}</td>
                  <td>${this.esc(r.time || '—')}</td>
                  <td><span class="admin-badge ${r.status === 'pending' ? 'warn' : 'ok'}">${this.esc(r.status || 'pending')}</span></td>
                  <td class="admin-table-actions">
                    ${r.status === 'pending' ? `
                      <button type="button" class="btn btn-gold btn-sm resolve-report-btn" data-id="${r.id}" data-action="approved">Approve</button>
                      <button type="button" class="btn btn-ghost btn-sm resolve-report-btn" data-id="${r.id}" data-action="removed">Remove</button>
                    ` : '—'}
                  </td>
                </tr>
              `).join('') : '<tr><td colspan="5" class="empty-hint">No reports. Community is clean!</td></tr>'}
            </tbody>
          </table>
        </div>
      </div>
    `;
  },

  renderAds() {
    const ads = APP_DATA.ads || [];
    const clicks = Storage.get(Storage.KEYS.AD_CLICKS, {});
    const views = Storage.get(Storage.KEYS.AD_VIEWS, {});
    const totalClicks = Object.values(clicks).reduce((a, b) => a + b, 0);
    const totalViews = Object.values(views).reduce((a, b) => a + b, 0) || 1;
    const ctr = ((totalClicks / totalViews) * 100).toFixed(1);

    return `
      <div class="admin-stats-row">
        <div class="admin-stat-card"><span class="admin-stat-label">Active Ad Slots</span><strong class="admin-stat-value">${ads.length}</strong></div>
        <div class="admin-stat-card"><span class="admin-stat-label">Total Impressions</span><strong class="admin-stat-value">${totalViews}</strong></div>
        <div class="admin-stat-card"><span class="admin-stat-label">Total Clicks</span><strong class="admin-stat-value">${totalClicks}</strong></div>
        <div class="admin-stat-card"><span class="admin-stat-label">CTR %</span><strong class="admin-stat-value">${ctr}%</strong></div>
      </div>
      <div class="admin-card">
        <h2>Ad Slots</h2>
        <div class="admin-table-wrap">
          <table class="admin-table">
            <thead><tr><th>Placement</th><th>Title</th><th>Impressions</th><th>Clicks</th></tr></thead>
            <tbody>
              ${ads.map(ad => `
                <tr>
                  <td><span class="admin-badge">${this.esc(ad.type)}</span></td>
                  <td>${this.esc(ad.title)}</td>
                  <td>${views[ad.id] || 0}</td>
                  <td>${clicks[ad.id] || 0}</td>
                </tr>
              `).join('')}
            </tbody>
          </table>
        </div>
      </div>
    `;
  },

  renderPremium() {
    const users = Storage.getAdminUsersList();
    const premiumCount = users.filter(u => u.premium).length || 3;
    return `
      <div class="admin-stats-row admin-stats-row-sm">
        <div class="admin-stat-card"><span class="admin-stat-label">Premium Users</span><strong class="admin-stat-value">${premiumCount}</strong></div>
        <div class="admin-stat-card"><span class="admin-stat-label">MRR (est.)</span><strong class="admin-stat-value">$${(premiumCount * 2.99).toFixed(0)}</strong></div>
      </div>
      <div class="admin-card">
        <h2>Premium Members</h2>
        <p class="admin-card-desc">Manage premium subscriptions from Supabase when billing is connected.</p>
        <div class="admin-table-wrap">
          <table class="admin-table">
            <thead><tr><th>User</th><th>Plan</th><th>Status</th></tr></thead>
            <tbody>
              ${users.slice(0, 10).map((u, i) => `
                <tr>
                  <td>${avatarImg(u.displayName, 'admin-table-avatar', u.displayName)} ${this.esc(u.displayName || u.email)}</td>
                  <td>${i % 3 === 0 ? 'Yearly' : 'Monthly'}</td>
                  <td><span class="admin-badge ok">Active</span></td>
                </tr>
              `).join('') || '<tr><td colspan="3" class="empty-hint">No users yet.</td></tr>'}
            </tbody>
          </table>
        </div>
      </div>
    `;
  },

  renderContests() {
    const contests = APP_DATA.contests;
    return `
      <div class="admin-card">
        <h2>Poetry Contests</h2>
        <div class="admin-table-wrap">
          <table class="admin-table">
            <thead><tr><th>Contest</th><th>Status</th><th>Deadline</th><th>Entries</th><th>Prize</th><th></th></tr></thead>
            <tbody>
              ${contests.map(c => `
                <tr>
                  <td><strong>${this.esc(c.title)}</strong></td>
                  <td><span class="admin-badge ${c.status === 'active' ? 'ok' : ''}">${this.esc(c.status)}</span></td>
                  <td>${this.esc(c.deadline || '—')}</td>
                  <td>${c.entries || 0}</td>
                  <td>${this.esc(c.prize || '—')}</td>
                  <td><a href="#/contests" class="btn btn-outline-gold btn-sm">View</a></td>
                </tr>
              `).join('')}
            </tbody>
          </table>
        </div>
      </div>
    `;
  },

  renderStaff() {
    return `
      <div class="admin-card">
        <p class="admin-card-desc">Assign admin or user roles. Admins can access this panel and manage the platform.</p>
        <div id="admin-staff-list" class="admin-users-list">
          <p class="admin-loading">Loading staff…</p>
        </div>
      </div>
    `;
  },

  renderHistory() {
    const log = Storage.getAdminLog();
    return `
      <div class="admin-card">
        <h2>Admin Audit Log</h2>
        <div class="admin-table-wrap">
          <table class="admin-table">
            <thead><tr><th>Action</th><th>Detail</th><th>Admin</th><th>Time</th></tr></thead>
            <tbody>
              ${log.length ? log.map(e => `
                <tr>
                  <td>${this.esc(e.action)}</td>
                  <td>${this.esc(e.detail)}</td>
                  <td>${this.esc(e.admin || '—')}</td>
                  <td>${this.esc(e.time)}</td>
                </tr>
              `).join('') : '<tr><td colspan="4" class="empty-hint">No history yet.</td></tr>'}
            </tbody>
          </table>
        </div>
      </div>
    `;
  },

  renderSettings() {
    const tags = Storage.getWritingTags();
    return `
      <div class="admin-grid-2">
        <div class="admin-card">
          <h2>Writing Tags</h2>
          <p class="admin-card-desc">Tags shown in the compose window when users write poetry.</p>
          <div class="admin-tags-list">
            ${tags.map(tag => `
              <div class="admin-tag-row">
                <input type="text" class="tag-label-input urdu-text" value="${this.esc(tag.label)}" data-tag-id="${tag.id}" data-field="label">
                <input type="text" class="tag-en-input" value="${this.esc(tag.en)}" data-tag-id="${tag.id}" data-field="en" placeholder="English">
                <button type="button" class="btn btn-ghost btn-sm delete-tag-btn" data-tag-id="${tag.id}">Delete</button>
              </div>
            `).join('')}
          </div>
          <div class="admin-actions">
            <button type="button" class="btn btn-outline-gold" id="add-tag-btn">+ Add Tag</button>
            <button type="button" class="btn btn-gold" id="save-tags-btn">Save Tags</button>
          </div>
        </div>
        <div class="admin-card">
          <h2>System</h2>
          <div class="admin-settings-list">
            <label class="admin-toggle-row">
              <span>Dark Mode (default)</span>
              <input type="checkbox" checked disabled>
            </label>
            <label class="admin-toggle-row">
              <span>Email Notifications</span>
              <input type="checkbox" id="admin-notif-toggle" ${Storage.getSettings().emailNotifications ? 'checked' : ''}>
            </label>
            <label class="admin-toggle-row">
              <span>Guest Poem Limit</span>
              <span class="admin-setting-val">${APP_DATA.guestPoemLimit} poems</span>
            </label>
          </div>
        </div>
      </div>
    `;
  },

  async loadUsers(containerId = 'admin-users-list', tableMode = true) {
    const container = document.getElementById(containerId);
    if (!container) return;

    const users = SupabaseClient.isEnabled()
      ? await API.fetchAdminUsers()
      : Storage.getAdminUsersList();

    if (users === null) {
      container.innerHTML = tableMode
        ? '<tr><td colspan="4" class="admin-error">Could not load users. Run <code>supabase/migrate-user-role.sql</code> first.</td></tr>'
        : '<p class="admin-error">Could not load users.</p>';
      return;
    }

    if (!users.length) {
      container.innerHTML = tableMode
        ? '<tr><td colspan="4" class="empty-hint">No registered users yet.</td></tr>'
        : '<p class="empty-hint">No registered users yet.</p>';
      return;
    }

    const currentId = Auth.getCurrentUser()?.id;

    if (tableMode) {
      container.innerHTML = users.map(u => `
        <tr class="admin-user-row" data-role="${u.userRole || 'user'}" data-search="${this.esc((u.displayName + ' ' + u.email).toLowerCase())}">
          <td>
            <div class="admin-table-user">
              ${avatarImg(u.displayName || 'User', 'admin-table-avatar', u.displayName)}
              <strong>${this.esc(u.displayName || u.username || 'User')}</strong>
            </div>
          </td>
          <td>${this.esc(u.email || '—')}</td>
          <td>
            <select class="admin-role-select filter-select" data-user-id="${u.id}">
              <option value="user" ${u.userRole !== 'admin' ? 'selected' : ''}>User</option>
              <option value="admin" ${u.userRole === 'admin' ? 'selected' : ''}>Admin</option>
            </select>
          </td>
          <td>
            <a href="#/dashboard" class="btn btn-ghost btn-sm">View</a>
          </td>
        </tr>
      `).join('');
    } else {
      container.innerHTML = users.map(u => `
        <div class="admin-user-row" data-role="${u.userRole || 'user'}">
          <div class="admin-user-info">
            ${avatarImg(u.displayName || 'User', 'admin-table-avatar', u.displayName)}
            <div>
              <strong>${this.esc(u.displayName || u.username || 'User')}</strong>
              <span>${this.esc(u.email || '')}</span>
            </div>
          </div>
          <select class="admin-role-select filter-select" data-user-id="${u.id}">
            <option value="user" ${u.userRole !== 'admin' ? 'selected' : ''}>User</option>
            <option value="admin" ${u.userRole === 'admin' ? 'selected' : ''}>Admin</option>
          </select>
        </div>
      `).join('');
    }

    container.querySelectorAll('.admin-role-select').forEach(select => {
      select.addEventListener('change', async () => {
        const userId = select.dataset.userId;
        const role = select.value;
        const currentUser = Auth.getCurrentUser();
        if (userId === currentUser?.id && role === 'user') {
          Components.showToast('You cannot remove your own admin role', 'error');
          select.value = 'admin';
          return;
        }
        let ok = false;
        if (SupabaseClient.isEnabled()) ok = await API.setUserRole(userId, role);
        else ok = Storage.setLocalUserRole(userId, role);
        if (ok) {
          Storage.logAdminAction('Role changed', `${role} for user ${userId}`);
          Components.showToast(`Role set to ${role}`);
        } else {
          Components.showToast('Failed to update role', 'error');
          this.loadUsers(containerId, tableMode);
        }
      });
    });
  },

  bindEvents() {
    this.bindMobileNav();

    const section = document.querySelector('.admin-shell')?.dataset.section;

    if (document.getElementById('admin-users-list')) {
      this.loadUsers('admin-users-list', true);
    }
    if (document.getElementById('admin-staff-list')) {
      this.loadUsers('admin-staff-list', false);
    }

    document.getElementById('admin-user-search')?.addEventListener('input', (e) => {
      const q = e.target.value.toLowerCase();
      document.querySelectorAll('#admin-users-table tbody tr.admin-user-row').forEach(row => {
        row.style.display = row.dataset.search?.includes(q) ? '' : 'none';
      });
    });

    document.getElementById('admin-user-filter')?.addEventListener('change', (e) => {
      const role = e.target.value;
      document.querySelectorAll('#admin-users-table tbody tr.admin-user-row').forEach(row => {
        row.style.display = !role || row.dataset.role === role ? '' : 'none';
      });
    });

    document.getElementById('admin-poem-search')?.addEventListener('input', (e) => {
      const q = e.target.value.toLowerCase();
      document.querySelectorAll('.admin-poem-card').forEach(card => {
        card.style.display = card.textContent.toLowerCase().includes(q) ? '' : 'none';
      });
    });

    document.getElementById('admin-global-search')?.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') {
        const q = e.target.value.trim();
        if (q) Router.go(`/poems?q=${encodeURIComponent(q)}`);
      }
    });

    if (section === 'mushaira' || document.getElementById('admin-create-mushaira')) {
      this.bindMushairaAdminEvents();
    }

    const saveTagsBtn = document.getElementById('save-tags-btn');
    if (saveTagsBtn) {
      saveTagsBtn.onclick = async () => {
        const rows = document.querySelectorAll('.admin-tag-row');
        const tags = [];
        rows.forEach(row => {
          const id = parseInt(row.querySelector('[data-field="label"]').dataset.tagId);
          const label = row.querySelector('[data-field="label"]').value.trim();
          const en = row.querySelector('[data-field="en"]').value.trim();
          if (label) tags.push({ id, label, en });
        });
        if (SupabaseClient.isEnabled()) await API.saveWritingTags(tags);
        else Storage.saveWritingTags(tags);
        Storage.logAdminAction('Tags saved', `${tags.length} writing tags updated`);
        Components.showToast('Tags saved!');
        Router.go('/admin?section=settings');
      };
    }

    document.getElementById('add-tag-btn')?.addEventListener('click', () => {
      const tags = Storage.getWritingTags();
      tags.push({ id: Date.now(), label: 'نیا', en: 'New' });
      Storage.saveWritingTags(tags);
      Router.go('/admin?section=settings');
    });

    document.querySelectorAll('.delete-tag-btn').forEach(btn => {
      btn.onclick = () => {
        const id = parseInt(btn.dataset.tagId);
        Storage.saveWritingTags(Storage.getWritingTags().filter(t => t.id !== id));
        Router.go('/admin?section=settings');
      };
    });

    document.querySelectorAll('.resolve-report-btn').forEach(btn => {
      btn.onclick = async () => {
        const id = parseInt(btn.dataset.id);
        const action = btn.dataset.action;
        if (SupabaseClient.isEnabled()) await API.resolveReport(id, action);
        else Storage.resolveReport(id, action);
        Storage.logAdminAction('Report resolved', `${action} report #${id}`);
        Components.showToast('Report resolved');
        Router.go(`/admin?section=${section || 'reports'}`);
      };
    });

    document.getElementById('admin-notif-toggle')?.addEventListener('change', (e) => {
      Storage.updateSettings({ emailNotifications: e.target.checked });
      Storage.logAdminAction('Settings updated', 'Email notifications toggled');
      Components.showToast('Settings saved');
    });
  },

  bindMobileNav() {
    const shell = document.querySelector('.admin-shell');
    const openBtn = document.getElementById('admin-menu-toggle');
    const closeBtn = document.getElementById('admin-sidebar-close');
    const backdrop = document.getElementById('admin-sidebar-backdrop');

    const openNav = () => {
      shell?.classList.add('admin-nav-open');
      backdrop?.setAttribute('aria-hidden', 'false');
    };

    const closeNav = () => {
      shell?.classList.remove('admin-nav-open');
      backdrop?.setAttribute('aria-hidden', 'true');
    };

    openBtn?.addEventListener('click', openNav);
    closeBtn?.addEventListener('click', closeNav);
    backdrop?.addEventListener('click', closeNav);

    document.querySelectorAll('.admin-nav-link').forEach(link => {
      link.addEventListener('click', closeNav);
    });
  }
};
