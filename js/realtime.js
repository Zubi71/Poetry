const Realtime = {
  channels: [],
  poemChannel: null,
  conversationChannel: null,
  userChannel: null,
  feedChannel: null,
  onlineUsers: new Set(),
  unreadCount: 0,
  activeConversationId: null,
  activePoemId: null,
  _pollTimer: null,
  _knownCommentIds: new Set(),

  async init() {
    this.destroy();
    if (!SupabaseClient.isEnabled() || !Auth.isLoggedIn() || Auth.isGuest()) return;

    const user = Auth.getCurrentUser();
    if (!user?.id) return;

    this.unreadCount = await API.getUnreadNotificationCount();
    this.updateNotificationBadge();

    this._subscribeNotifications(user.id);
    this._subscribeUserBroadcast(user.id);
    this._subscribeFeedBroadcast();
    this._subscribePoemUpdates();
    this._subscribePresence(user.id);
    this._startPollFallback();
  },

  destroy() {
    const sb = SupabaseClient.get();
    this.channels.forEach(ch => {
      try { sb?.removeChannel(ch); } catch (_) {}
    });
    if (this.poemChannel) { try { sb?.removeChannel(this.poemChannel); } catch (_) {} }
    if (this.conversationChannel) { try { sb?.removeChannel(this.conversationChannel); } catch (_) {} }
    if (this.userChannel) { try { sb?.removeChannel(this.userChannel); } catch (_) {} }
    if (this.feedChannel) { try { sb?.removeChannel(this.feedChannel); } catch (_) {} }
    if (this._pollTimer) clearInterval(this._pollTimer);
    this.channels = [];
    this.poemChannel = null;
    this.conversationChannel = null;
    this.userChannel = null;
    this.feedChannel = null;
    this._pollTimer = null;
    this._knownCommentIds.clear();
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

    this._addChannel(
      sb.channel(`notifications:${userId}`)
        .on('postgres_changes', {
          event: 'INSERT',
          schema: 'public',
          table: 'notifications',
          filter: `user_id=eq.${userId}`
        }, (payload) => {
          this._handleIncomingNotification(API.mapNotification(payload.new));
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
  },

  _subscribeUserBroadcast(userId) {
    const sb = SupabaseClient.get();
    if (!sb) return;

    this.userChannel = sb.channel(`user-notify:${userId}`, {
      config: { broadcast: { ack: false, self: false } }
    })
      .on('broadcast', { event: 'new_notification' }, ({ payload }) => {
        if (payload) this._handleIncomingNotification(payload);
      })
      .subscribe();

    this._addChannel(this.userChannel);
  },

  _subscribeFeedBroadcast() {
    const sb = SupabaseClient.get();
    if (!sb) return;

    this.feedChannel = sb.channel('feed-activity', {
      config: { broadcast: { ack: false, self: false } }
    })
      .on('broadcast', { event: 'poem_update' }, ({ payload }) => {
        if (payload?.poemId) this.handlePoemActivity(payload);
      })
      .subscribe();

    this._addChannel(this.feedChannel);
  },

  _subscribePoemUpdates() {
    const sb = SupabaseClient.get();
    if (!sb) return;

    const onLikeChange = async (poemId) => {
      const counts = await API.getPoemCounts(poemId);
      if (counts) this.updatePoemCounts(poemId, counts.likes, counts.comments);
    };

    const onCommentInsert = async (row) => {
      const poemId = row.poem_id;
      const counts = await API.getPoemCounts(poemId);
      if (counts) this.updatePoemCounts(poemId, counts.likes, counts.comments);

      const user = Auth.getCurrentUser();
      if (row.user_id === user?.id) return;

      const section = document.querySelector(`.comments-section[data-poem-id="${poemId}"]`);
      if (section) {
        const profile = await API.getProfile(row.user_id);
        this.appendComment(API.mapComment(row, profile));
      }
    };

    this._addChannel(
      sb.channel('poem-db-updates')
        .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'poems' }, (payload) => {
          this.updatePoemCounts(payload.new.id, payload.new.likes_count, payload.new.comments_count);
        })
        .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'likes' }, (payload) => {
          onLikeChange(payload.new.poem_id);
          const user = Auth.getCurrentUser();
          if (payload.new.user_id === user?.id) {
            Storage.set(Storage.KEYS.LIKES, [...new Set([...(Storage.get(Storage.KEYS.LIKES, [])), payload.new.poem_id])]);
          }
        })
        .on('postgres_changes', { event: 'DELETE', schema: 'public', table: 'likes' }, (payload) => {
          onLikeChange(payload.old.poem_id);
          const user = Auth.getCurrentUser();
          if (payload.old.user_id === user?.id) {
            Storage.set(Storage.KEYS.LIKES, Storage.get(Storage.KEYS.LIKES, []).filter(id => id !== payload.old.poem_id));
          }
        })
        .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'comments' }, (payload) => {
          onCommentInsert(payload.new);
        })
        .subscribe()
    );
  },

  _startPollFallback() {
    if (this._pollTimer) clearInterval(this._pollTimer);
    this._pollTimer = setInterval(() => this._pollUpdates(), 5000);
    this._pollUpdates();
  },

  async _pollUpdates() {
    if (!Auth.isLoggedIn() || Auth.isGuest()) return;

    try {
      const count = await API.getUnreadNotificationCount();
      if (count !== this.unreadCount) {
        this.unreadCount = count;
        this.updateNotificationBadge();
      }

      const poemIds = [...new Set(
        [...document.querySelectorAll('[data-poem-id]')]
          .map(el => parseInt(el.dataset.poemId, 10))
          .filter(Boolean)
      )];

      await Promise.all(poemIds.map(async (id) => {
        const counts = await API.getPoemCounts(id);
        if (counts) this.updatePoemCounts(id, counts.likes, counts.comments);
      }));

      const section = document.querySelector('.comments-section[data-poem-id]');
      if (section) {
        const poemId = parseInt(section.dataset.poemId, 10);
        const comments = await API.getComments(poemId);
        comments.forEach(c => {
          if (!this._knownCommentIds.has(String(c.id))) {
            this._knownCommentIds.add(String(c.id));
            this.appendComment(c);
          }
        });
        if (comments.length) {
          this.updatePoemCounts(poemId, null, comments.length);
        }
      }
    } catch (_) {}
  },

  _handleIncomingNotification(notif) {
    if (!notif?.text) return;
    this.unreadCount += 1;
    this.updateNotificationBadge();
    this.prependNotification(notif);
    Components.showToast(notif.text);
  },

  async broadcastPoemUpdate(poemId, data = {}) {
    const sb = SupabaseClient.get();
    if (!sb) return;
    const counts = data.likes != null ? data : await API.getPoemCounts(poemId);
    const payload = {
      poemId,
      likes: counts?.likes,
      comments: counts?.comments,
      type: data.type || 'update'
    };
    await sb.channel('feed-activity').send({
      type: 'broadcast',
      event: 'poem_update',
      payload
    });
    this.handlePoemActivity(payload);
  },

  async broadcastUserNotification(targetUserId, notif) {
    const sb = SupabaseClient.get();
    if (!sb || !targetUserId) return;
    await sb.channel(`user-notify:${targetUserId}`).send({
      type: 'broadcast',
      event: 'new_notification',
      payload: {
        id: Date.now(),
        type: notif.type,
        text: notif.text,
        poemId: notif.poemId,
        time: 'Just now',
        read: false
      }
    });
  },

  handlePoemActivity(payload) {
    const { poemId, likes, comments } = payload;
    if (likes != null || comments != null) {
      this.updatePoemCounts(poemId, likes, comments);
    }
  },

  subscribePoem(poemId) {
    this.unsubscribePoem();
    this.activePoemId = poemId;
    this._knownCommentIds.clear();
    document.querySelectorAll('#comments-list [data-comment-id], .comments-list [data-comment-id]').forEach(el => {
      this._knownCommentIds.add(el.dataset.commentId);
    });
  },

  unsubscribePoem() {
    this.activePoemId = null;
    this._knownCommentIds.clear();
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
        if (btn) btn.insertAdjacentHTML('beforeend', `<span class="badge-count">${this.unreadCount > 99 ? '99+' : this.unreadCount}</span>`);
      }
    } else if (badge) {
      badge.remove();
    }
  },

  syncPoemInCache(poemId, likes, comments) {
    const patch = (p) => {
      if (p && p.id === poemId) {
        if (likes != null) p.likes = likes;
        if (comments != null) p.comments = comments;
      }
    };
    (window.REMOTE_POEMS || []).forEach(patch);
    Storage.getUserPosts().forEach(patch);
  },

  updatePoemCounts(poemId, likes, comments) {
    if (likes != null) {
      document.querySelectorAll(`[data-poem-id="${poemId}"] [data-action="like"] span, [data-action="like"][data-id="${poemId}"] span`).forEach(el => {
        el.textContent = Components.formatNumber(likes);
      });
    }
    if (comments != null) {
      document.querySelectorAll(`[data-poem-id="${poemId}"] .comment-btn span`).forEach(el => {
        el.textContent = Components.formatNumber(comments);
      });
      document.querySelectorAll(`.comments-section[data-poem-id="${poemId}"] h3`).forEach(el => {
        el.textContent = `Comments (${comments})`;
      });
      document.querySelectorAll(`[data-poem-id="${poemId}"] .comment-count span`).forEach(el => {
        el.textContent = Components.formatNumber(comments);
      });
    }
    this.syncPoemInCache(poemId, likes, comments);
  },

  bumpCommentCount(poemId, delta = 1) {
    document.querySelectorAll(`[data-poem-id="${poemId}"] .comment-btn span, [data-poem-id="${poemId}"] .comment-count span`).forEach(el => {
      const n = parseInt(el.textContent, 10) || 0;
      const next = Math.max(0, n + delta);
      el.textContent = Components.formatNumber(next);
    });
    const h3 = document.querySelector(`.comments-section[data-poem-id="${poemId}"] h3`);
    if (h3) {
      const match = h3.textContent.match(/\((\d+)\)/);
      const n = match ? parseInt(match[1], 10) : 0;
      h3.textContent = `Comments (${Math.max(0, n + delta)})`;
    }
    const poem = getPoemById(poemId);
    if (poem) poem.comments = Math.max(0, (poem.comments || 0) + delta);
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
    const id = String(comment.id);
    if (list.querySelector(`[data-comment-id="${id}"]`)) return;
    this._knownCommentIds.add(id);
    list.querySelector('.comments-empty')?.remove();
    list.querySelector('.loading-inline')?.remove();
    list.insertAdjacentHTML('beforeend', this.renderCommentHtml(comment));
  },

  prependNotification(notif) {
    const html = this.renderNotificationHtml(notif);
    const list = document.querySelector('.notifications-list');
    if (list) {
      if (list.querySelector('.empty-state')) list.innerHTML = '';
      list.insertAdjacentHTML('afterbegin', html);
    }
    const dash = document.getElementById('dashboard-notifications');
    if (dash) {
      if (dash.querySelector('.empty-state')) dash.innerHTML = '';
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

    this._knownCommentIds.clear();
    if (!comments.length) {
      list.innerHTML = '<p class="empty-state comments-empty">No comments yet. Be the first!</p>';
      return;
    }
    list.innerHTML = comments.map(c => this.renderCommentHtml(c)).join('');
    comments.forEach(c => this._knownCommentIds.add(String(c.id)));
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
