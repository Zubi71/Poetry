const Realtime = {
  channels: [],
  poemChannel: null,
  conversationChannel: null,
  presenceChannel: null,
  onlineUsers: new Set(),
  unreadCount: 0,
  activeConversationId: null,
  activePoemId: null,

  async init() {
    this.destroy();
    if (!SupabaseClient.isEnabled() || !Auth.isLoggedIn() || Auth.isGuest()) return;

    const user = Auth.getCurrentUser();
    if (!user?.id) return;

    this.unreadCount = await API.getUnreadNotificationCount();
    this.updateNotificationBadge();

    this._subscribeNotifications(user.id);
    this._subscribePoemUpdates();
    this._subscribePresence(user.id);
  },

  destroy() {
    const sb = SupabaseClient.get();
    this.channels.forEach(ch => {
      try { sb?.removeChannel(ch); } catch (_) {}
    });
    if (this.poemChannel) { try { sb?.removeChannel(this.poemChannel); } catch (_) {} }
    if (this.conversationChannel) { try { sb?.removeChannel(this.conversationChannel); } catch (_) {} }
    this.channels = [];
    this.poemChannel = null;
    this.conversationChannel = null;
    this.onlineUsers.clear();
    this.activeConversationId = null;
    this.activePoemId = null;
  },

  _addChannel(channel) {
    this.channels.push(channel);
    return channel;
  },

  _subscribeNotifications(userId) {
    const sb = SupabaseClient.get();
    if (!sb) return;

    const channel = this._addChannel(
      sb.channel(`notifications:${userId}`)
        .on('postgres_changes', {
          event: 'INSERT',
          schema: 'public',
          table: 'notifications',
          filter: `user_id=eq.${userId}`
        }, (payload) => {
          const notif = API.mapNotification(payload.new);
          this.unreadCount += 1;
          this.updateNotificationBadge();
          this.prependNotification(notif);
          Components.showToast(notif.text);
        })
        .on('postgres_changes', {
          event: 'UPDATE',
          schema: 'public',
          table: 'notifications',
          filter: `user_id=eq.${userId}`
        }, () => {
          API.getUnreadNotificationCount().then(count => {
            this.unreadCount = count;
            this.updateNotificationBadge();
          });
        })
        .subscribe()
    );
    return channel;
  },

  _subscribePoemUpdates() {
    const sb = SupabaseClient.get();
    if (!sb) return;

    this._addChannel(
      sb.channel('poem-updates')
        .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'poems' }, (payload) => {
          this.updatePoemCounts(payload.new.id, payload.new.likes_count, payload.new.comments_count);
        })
        .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'likes' }, (payload) => {
          const user = Auth.getCurrentUser();
          if (payload.new.user_id === user?.id) {
            Storage.set(Storage.KEYS.LIKES, [...new Set([...(Storage.get(Storage.KEYS.LIKES, [])), payload.new.poem_id])]);
          }
        })
        .on('postgres_changes', { event: 'DELETE', schema: 'public', table: 'likes' }, (payload) => {
          const user = Auth.getCurrentUser();
          if (payload.old.user_id === user?.id) {
            Storage.set(Storage.KEYS.LIKES, Storage.get(Storage.KEYS.LIKES, []).filter(id => id !== payload.old.poem_id));
          }
        })
        .subscribe()
    );
  },

  subscribePoem(poemId) {
    this.unsubscribePoem();
    this.activePoemId = poemId;
    const sb = SupabaseClient.get();
    if (!sb || !poemId) return;

    this.poemChannel = sb.channel(`poem:${poemId}`)
      .on('postgres_changes', {
        event: 'INSERT',
        schema: 'public',
        table: 'comments',
        filter: `poem_id=eq.${poemId}`
      }, async (payload) => {
        const user = Auth.getCurrentUser();
        if (payload.new.user_id === user?.id) return;
        const profile = await API.getProfile(payload.new.user_id);
        const comment = API.mapComment(payload.new, profile);
        this.appendComment(comment);
        this.bumpCommentCount(poemId);
      })
      .subscribe();
  },

  unsubscribePoem() {
    const sb = SupabaseClient.get();
    if (this.poemChannel && sb) {
      sb.removeChannel(this.poemChannel);
      this.poemChannel = null;
    }
    this.activePoemId = null;
  },

  subscribeConversation(conversationId) {
    this.unsubscribeConversation();
    this.activeConversationId = conversationId;
    const sb = SupabaseClient.get();
    if (!sb || !conversationId) return;

    API.markConversationRead(conversationId);

    this.conversationChannel = sb.channel(`conversation:${conversationId}`)
      .on('postgres_changes', {
        event: 'INSERT',
        schema: 'public',
        table: 'messages',
        filter: `conversation_id=eq.${conversationId}`
      }, (payload) => {
        const user = Auth.getCurrentUser();
        const msg = API.mapMessage(payload.new, user?.id);
        if (msg.from !== 'me') API.markConversationRead(conversationId);
        this.appendChatMessage(msg);
      })
      .subscribe();
  },

  unsubscribeConversation() {
    const sb = SupabaseClient.get();
    if (this.conversationChannel && sb) {
      sb.removeChannel(this.conversationChannel);
      this.conversationChannel = null;
    }
    this.activeConversationId = null;
  },

  _subscribePresence(userId) {
    const sb = SupabaseClient.get();
    if (!sb) return;

    const channel = this._addChannel(
      sb.channel('online-users', { config: { presence: { key: userId } } })
        .on('presence', { event: 'sync' }, () => {
          this.onlineUsers.clear();
          const state = channel.presenceState();
          Object.keys(state).forEach(key => this.onlineUsers.add(key));
          this.updateOnlineIndicators();
        })
        .on('presence', { event: 'join' }, ({ key }) => {
          this.onlineUsers.add(key);
          this.updateOnlineIndicators();
        })
        .on('presence', { event: 'leave' }, ({ key }) => {
          this.onlineUsers.delete(key);
          this.updateOnlineIndicators();
        })
        .subscribe(async (status) => {
          if (status === 'SUBSCRIBED') {
            await channel.track({ user_id: userId, online_at: new Date().toISOString() });
          }
        })
    );
  },

  isUserOnline(userId) {
    return this.onlineUsers.has(userId);
  },

  updateOnlineIndicators() {
    document.querySelectorAll('[data-online-user]').forEach(el => {
      const uid = el.dataset.onlineUser;
      const dot = el.querySelector('.online-dot');
      if (!dot) return;
      dot.classList.toggle('online', this.isUserOnline(uid));
      dot.classList.toggle('offline', !this.isUserOnline(uid));
    });
  },

  updateNotificationBadge() {
    const badge = document.querySelector('.notification-btn .badge-count');
    if (this.unreadCount > 0) {
      if (badge) badge.textContent = this.unreadCount > 99 ? '99+' : this.unreadCount;
      else {
        const btn = document.querySelector('.notification-btn');
        if (btn) btn.insertAdjacentHTML('beforeend', `<span class="badge-count">${this.unreadCount}</span>`);
      }
    } else if (badge) {
      badge.remove();
    }
  },

  updatePoemCounts(poemId, likes, comments) {
    document.querySelectorAll(`[data-poem-id="${poemId}"] [data-action="like"] span, [data-action="like"][data-id="${poemId}"] span`).forEach(el => {
      el.textContent = Components.formatNumber(likes || 0);
    });
    document.querySelectorAll(`[data-poem-id="${poemId}"] .comment-btn span, .comments-section h3`).forEach((el, i) => {
      if (el.tagName === 'H3') el.textContent = `Comments (${comments || 0})`;
      else el.textContent = comments || 0;
    });
    const poem = getPoemById(poemId);
    if (poem) {
      poem.likes = likes || 0;
      poem.comments = comments || 0;
    }
  },

  bumpCommentCount(poemId, delta = 1) {
    document.querySelectorAll(`[data-poem-id="${poemId}"] .comment-btn span, [data-poem-id="${poemId}"] .comment-count span`).forEach(el => {
      const n = parseInt(el.textContent, 10) || 0;
      el.textContent = Math.max(0, n + delta);
    });
    const h3 = document.querySelector('.comments-section h3');
    if (h3) {
      const match = h3.textContent.match(/\((\d+)\)/);
      const n = match ? parseInt(match[1], 10) : 0;
      h3.textContent = `Comments (${Math.max(0, n + delta)})`;
    }
  },

  updateLikeButton(poemId, liked, likes) {
    document.querySelectorAll(`[data-action="like"][data-id="${poemId}"]`).forEach(btn => {
      btn.classList.toggle('active', liked);
      const span = btn.querySelector('span');
      if (span && likes != null) span.textContent = Components.formatNumber(likes);
    });
  },

  renderCommentHtml(comment) {
    return `
      <div class="comment" data-comment-id="${comment.id}">
        ${avatarImg(comment.user, '', comment.user)}
        <div>
          <strong>${comment.user}</strong>
          <span class="comment-time">${comment.time}</span>
          <p>${this._escape(comment.text)}</p>
        </div>
      </div>
    `;
  },

  appendComment(comment) {
    const list = document.getElementById('comments-list') || document.querySelector('.comments-list');
    if (!list) return;
    if (list.querySelector(`[data-comment-id="${comment.id}"]`)) return;
    list.querySelector('.comments-empty')?.remove();
    list.querySelector('.loading-inline')?.remove();
    list.insertAdjacentHTML('beforeend', this.renderCommentHtml(comment));
  },

  prependNotification(notif) {
    const html = this.renderNotificationHtml(notif);
    const list = document.querySelector('.notifications-list');
    if (list) list.insertAdjacentHTML('afterbegin', html);
    const dash = document.getElementById('dashboard-notifications');
    if (dash && !dash.querySelector('.empty-state')) {
      dash.insertAdjacentHTML('afterbegin', html);
      const items = dash.querySelectorAll('.notification-item');
      if (items.length > 5) items[items.length - 1].remove();
    }
  },

  appendChatMessage(msg) {
    const box = document.getElementById('chat-messages');
    if (!box) return;
    if (box.querySelector(`[data-message-id="${msg.id}"]`)) return;
    box.insertAdjacentHTML('beforeend', `
      <div class="chat-message ${msg.from === 'me' ? 'sent' : 'received'}" data-message-id="${msg.id}">
        <p>${this._escape(msg.text)}</p>
        <span>${msg.time}</span>
      </div>
    `);
    box.scrollTop = box.scrollHeight;
  },

  async loadComments(poemId) {
    const list = document.getElementById('comments-list') || document.querySelector('.comments-list');
    if (!list) return;

    const comments = SupabaseClient.isEnabled()
      ? await API.getComments(poemId)
      : Storage.getPoemComments(poemId);

    if (!comments.length) {
      list.innerHTML = '<p class="empty-state comments-empty">No comments yet. Be the first!</p>';
      return;
    }
    list.innerHTML = comments.map(c => this.renderCommentHtml(c)).join('');
  },

  async loadConversations() {
    const list = document.querySelector('.chat-list');
    if (!list) return;
    const convs = await API.getConversations();
    if (!convs?.length) {
      list.innerHTML = '<p class="empty-state">No messages yet. Start a conversation!</p>';
      return;
    }
    list.innerHTML = convs.map(chat => `
      <a href="#/messages/${chat.id}" class="chat-item">
        <div class="chat-avatar-wrap" data-online-user="${chat.otherUserId}">
          ${avatarImg(chat.user, '', chat.user)}
          <span class="online-dot offline"></span>
        </div>
        <div class="chat-item-info">
          <div class="chat-item-header">
            <strong>${chat.user}</strong>
            <span>${chat.time}</span>
          </div>
          <p>${this._escape(chat.lastMessage)}</p>
        </div>
        ${chat.unread ? `<span class="unread-badge">${chat.unread}</span>` : ''}
      </a>
    `).join('');
    this.updateOnlineIndicators();
  },

  async loadChatThread(conversationId) {
    const box = document.getElementById('chat-messages');
    if (!box) return;
    const messages = await API.getMessages(conversationId);
    if (!messages?.length) {
      box.innerHTML = '<p class="empty-state chat-empty">Say hello!</p>';
      return;
    }
    box.innerHTML = messages.map(m => `
      <div class="chat-message ${m.from === 'me' ? 'sent' : 'received'}" data-message-id="${m.id}">
        <p>${this._escape(m.text)}</p>
        <span>${m.time}</span>
      </div>
    `).join('');
    box.scrollTop = box.scrollHeight;
    this.subscribeConversation(conversationId);
  },

  async loadNotifications(markRead = true) {
    const list = document.getElementById('notifications-list');
    if (!list) return;

    let notifications = null;
    if (SupabaseClient.isEnabled() && Auth.isLoggedIn() && !Auth.isGuest()) {
      notifications = await API.getNotifications();
    }
    if (notifications === null) {
      notifications = Storage.getNotifications();
      if (markRead) Storage.markNotificationsRead();
    }

    if (!notifications.length) {
      list.innerHTML = '<p class="empty-state">No notifications yet.</p>';
      return;
    }

    list.innerHTML = notifications.map(n => this.renderNotificationHtml(n)).join('');

    if (markRead && SupabaseClient.isEnabled() && Auth.isLoggedIn() && !Auth.isGuest()) {
      await API.markAllNotificationsRead();
      this.unreadCount = 0;
      this.updateNotificationBadge();
    }
  },

  async loadDashboardNotifications() {
    const list = document.getElementById('dashboard-notifications');
    if (!list) return;

    let notifications = null;
    if (SupabaseClient.isEnabled() && Auth.isLoggedIn() && !Auth.isGuest()) {
      notifications = await API.getNotifications(5);
    }
    if (notifications === null) {
      notifications = Storage.getNotifications().slice(0, 5);
    }

    if (!notifications.length) {
      list.innerHTML = '<p class="empty-state">No notifications yet.</p>';
      return;
    }
    list.innerHTML = notifications.map(n => this.renderNotificationHtml(n)).join('');
  },

  renderNotificationHtml(n) {
    const link = n.poemId ? `#/poem/${n.poemId}` : n.conversationId ? `#/messages/${n.conversationId}` : '#/notifications';
    const icon = n.type === 'like' ? '❤️' : n.type === 'comment' ? '💬' : n.type === 'message' ? '✉️' : n.type === 'follow' ? '👤' : '📅';
    return `
      <a href="${link}" class="notification-item ${n.read ? '' : 'unread'} type-${n.type}" data-notif-id="${n.id}">
        <span class="notif-icon">${icon}</span>
        <div>
          <p>${this._escape(n.text)}</p>
          <span class="notif-time">${n.time}</span>
        </div>
      </a>
    `;
  },

  _escape(text) {
    const div = document.createElement('div');
    div.textContent = text || '';
    return div.innerHTML;
  }
};
