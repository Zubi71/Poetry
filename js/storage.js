const Storage = {
  KEYS: {
    USER: 'urdu_poetry_user',
    LIKES: 'urdu_poetry_likes',
    BOOKMARKS: 'urdu_poetry_bookmarks',
    FOLLOWING: 'urdu_poetry_following',
    HISTORY: 'urdu_poetry_history',
    MESSAGES: 'urdu_poetry_messages',
    NOTIFICATIONS: 'urdu_poetry_notifications',
    GUEST_READS: 'urdu_poetry_guest_reads',
    DAILY_READS: 'urdu_poetry_daily_reads',
    PROFILE_VISITS: 'urdu_poetry_profile_visits',
    BLOCKED: 'urdu_poetry_blocked',
    REGISTERED_EVENTS: 'urdu_poetry_registered_events',
    JOINED_ROOMS: 'urdu_poetry_joined_rooms',
    ROOM_MESSAGES: 'urdu_poetry_room_messages',
    CUSTOM_ROOMS: 'urdu_poetry_custom_rooms',
    CUSTOM_MUSHAIRA: 'urdu_poetry_custom_mushaira',
    CONTEST_ENTRIES: 'urdu_poetry_contest_entries',
    AD_CLICKS: 'urdu_poetry_ad_clicks',
    AD_VIEWS: 'urdu_poetry_ad_views',
    SETTINGS: 'urdu_poetry_settings',
    WRITING_TAGS: 'urdu_poetry_writing_tags',
    USER_POSTS: 'urdu_poetry_user_posts',
    DRAFTS: 'urdu_poetry_drafts',
    SCHEDULED: 'urdu_poetry_scheduled',
    REPORTS: 'urdu_poetry_reports',
    FEATURED: 'urdu_poetry_featured',
    CARD_THEME: 'urdu_poetry_card_theme',
    ANALYTICS: 'urdu_poetry_analytics',
    POEM_COMMENTS: 'urdu_poetry_poem_comments'
  },

  get(key, defaultVal = null) {
    try {
      const val = localStorage.getItem(key);
      return val ? JSON.parse(val) : defaultVal;
    } catch {
      return defaultVal;
    }
  },

  set(key, value) {
    localStorage.setItem(key, JSON.stringify(value));
  },

  getUser() {
    return this.get(this.KEYS.USER);
  },

  setUser(user) {
    this.set(this.KEYS.USER, user);
  },

  clearUser() {
    localStorage.removeItem(this.KEYS.USER);
  },

  getLikes() {
    return this.get(this.KEYS.LIKES, []);
  },

  toggleLike(poemId) {
    const likes = this.getLikes();
    const idx = likes.indexOf(poemId);
    if (idx > -1) {
      likes.splice(idx, 1);
    } else {
      likes.push(poemId);
    }
    this.set(this.KEYS.LIKES, likes);
    return likes.includes(poemId);
  },

  isLiked(poemId) {
    return this.getLikes().includes(poemId);
  },

  getBookmarks() {
    return this.get(this.KEYS.BOOKMARKS, []);
  },

  toggleBookmark(poemId) {
    const bookmarks = this.getBookmarks();
    const idx = bookmarks.indexOf(poemId);
    if (idx > -1) {
      bookmarks.splice(idx, 1);
    } else {
      bookmarks.push(poemId);
    }
    this.set(this.KEYS.BOOKMARKS, bookmarks);
    return bookmarks.includes(poemId);
  },

  isBookmarked(poemId) {
    return this.getBookmarks().includes(poemId);
  },

  getFollowing() {
    return this.get(this.KEYS.FOLLOWING, []);
  },

  toggleFollow(poetId) {
    const following = this.getFollowing();
    const idx = following.indexOf(poetId);
    if (idx > -1) {
      following.splice(idx, 1);
    } else {
      following.push(poetId);
      this.addNotification({ type: 'follow', text: `You started following a poet`, poetId });
    }
    this.set(this.KEYS.FOLLOWING, following);
    return following.includes(poetId);
  },

  isFollowing(poetId) {
    return this.getFollowing().includes(poetId);
  },

  addToHistory(poemId) {
    let history = this.get(this.KEYS.HISTORY, []);
    history = history.filter(id => id !== poemId);
    history.unshift(poemId);
    if (history.length > 50) history = history.slice(0, 50);
    this.set(this.KEYS.HISTORY, history);
  },

  getHistory() {
    return this.get(this.KEYS.HISTORY, []);
  },

  getGuestReads() {
    return this.get(this.KEYS.GUEST_READS, 0);
  },

  incrementGuestReads() {
    const count = this.getGuestReads() + 1;
    this.set(this.KEYS.GUEST_READS, count);
    return count;
  },

  getDailyReads() {
    const data = this.get(this.KEYS.DAILY_READS, { date: '', count: 0 });
    const today = new Date().toDateString();
    if (data.date !== today) {
      return { date: today, count: 0 };
    }
    return data;
  },

  incrementDailyReads() {
    const data = this.getDailyReads();
    data.count++;
    this.set(this.KEYS.DAILY_READS, data);
    return data.count;
  },

  getProfileVisits() {
    return this.get(this.KEYS.PROFILE_VISITS, 0);
  },

  incrementProfileVisits() {
    const count = this.getProfileVisits() + 1;
    this.set(this.KEYS.PROFILE_VISITS, count);
    return count;
  },

  getMessages() {
    return this.get(this.KEYS.MESSAGES, []);
  },

  addMessage(chatId, text) {
    const messages = this.getMessages();
    messages.push({ chatId, text, from: 'me', time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) });
    this.set(this.KEYS.MESSAGES, messages);
    return messages;
  },

  getMessageCount() {
    const stored = this.getMessages();
    const baseCount = APP_DATA.sampleChats.reduce((sum, c) => sum + (c.unread || 0), 0);
    return stored.length + baseCount;
  },

  getNotifications() {
    return this.get(this.KEYS.NOTIFICATIONS, [
      { id: 1, type: 'like', text: 'Mirza Ghalib liked your comment', time: '1 hour ago', read: false },
      { id: 2, type: 'comment', text: 'New comment on a poem you liked', time: '3 hours ago', read: false },
      { id: 3, type: 'event', text: 'Live Mushaira Night is starting now!', time: '5 hours ago', read: false },
      { id: 4, type: 'follow', text: 'Parveen Shakir started following you', time: '1 day ago', read: true }
    ]);
  },

  addNotification(notif) {
    const notifications = this.getNotifications();
    notifications.unshift({
      id: Date.now(),
      time: 'Just now',
      read: false,
      ...notif
    });
    this.set(this.KEYS.NOTIFICATIONS, notifications);
  },

  getPoemComments(poemId) {
    const all = this.get(this.KEYS.POEM_COMMENTS, {});
    return all[String(poemId)] || [];
  },

  addPoemComment(poemId, text, user) {
    const all = this.get(this.KEYS.POEM_COMMENTS, {});
    const key = String(poemId);
    const comment = {
      id: Date.now(),
      poemId: parseInt(poemId),
      user: user?.name || 'User',
      text,
      time: 'Just now'
    };
    if (!all[key]) all[key] = [];
    all[key].push(comment);
    this.set(this.KEYS.POEM_COMMENTS, all);
    return comment;
  },

  getUnreadNotificationCount() {
    return this.getNotifications().filter(n => !n.read).length;
  },

  markNotificationsRead() {
    const notifications = this.getNotifications().map(n => ({ ...n, read: true }));
    this.set(this.KEYS.NOTIFICATIONS, notifications);
  },

  getRegisteredEvents() {
    return this.get(this.KEYS.REGISTERED_EVENTS, []);
  },

  registerEvent(eventId) {
    const events = this.getRegisteredEvents();
    if (!events.includes(eventId)) {
      events.push(eventId);
      this.set(this.KEYS.REGISTERED_EVENTS, events);
      this.addNotification({ type: 'event', text: 'Successfully registered for event', eventId });
    }
    return events;
  },

  getJoinedRooms() {
    return this.get(this.KEYS.JOINED_ROOMS, []);
  },

  joinRoom(roomId) {
    const rooms = this.getJoinedRooms();
    if (!rooms.includes(roomId)) {
      rooms.push(roomId);
      this.set(this.KEYS.JOINED_ROOMS, rooms);
      this.addNotification({ type: 'room', text: 'Joined voice room', roomId });
    }
    return rooms;
  },

  leaveRoom(roomId) {
    const rooms = this.getJoinedRooms().filter(id => id !== roomId);
    this.set(this.KEYS.JOINED_ROOMS, rooms);
    return rooms;
  },

  getCustomRooms() {
    return this.get(this.KEYS.CUSTOM_ROOMS, []);
  },

  addCustomRoom(room) {
    const rooms = this.getCustomRooms();
    rooms.push(room);
    this.set(this.KEYS.CUSTOM_ROOMS, rooms);
    return room;
  },

  getCustomMushaira() {
    return this.get(this.KEYS.CUSTOM_MUSHAIRA, []);
  },

  addCustomMushaira(event) {
    const events = this.getCustomMushaira();
    events.unshift(event);
    this.set(this.KEYS.CUSTOM_MUSHAIRA, events);
    return event;
  },

  removeCustomMushaira(id) {
    const pid = parseInt(id, 10);
    const events = this.getCustomMushaira().filter(e => e.id !== pid);
    this.set(this.KEYS.CUSTOM_MUSHAIRA, events);
  },

  getRoomMessages(roomId) {
    const rid = parseInt(roomId);
    const saved = this.get(this.KEYS.ROOM_MESSAGES, {});
    const seed = APP_DATA.roomChatMessages[rid] || [];
    return [...seed, ...(saved[rid] || [])];
  },

  addRoomMessage(roomId, text) {
    const rid = parseInt(roomId);
    const user = Auth.getCurrentUser();
    const saved = this.get(this.KEYS.ROOM_MESSAGES, {});
    const list = saved[rid] || [];
    const time = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    list.push({ from: user.name || 'You', text, time, type: 'me' });
    saved[rid] = list;
    this.set(this.KEYS.ROOM_MESSAGES, saved);
    return list;
  },

  getContestEntries() {
    return this.get(this.KEYS.CONTEST_ENTRIES, []);
  },

  submitContest(contestId, poemText) {
    const entries = this.getContestEntries();
    entries.push({ contestId, poemText, date: new Date().toISOString() });
    this.set(this.KEYS.CONTEST_ENTRIES, entries);
    return entries;
  },

  trackAdView(adId) {
    const views = this.get(this.KEYS.AD_VIEWS, {});
    views[adId] = (views[adId] || 0) + 1;
    this.set(this.KEYS.AD_VIEWS, views);
  },

  trackAdClick(adId) {
    const clicks = this.get(this.KEYS.AD_CLICKS, {});
    clicks[adId] = (clicks[adId] || 0) + 1;
    this.set(this.KEYS.AD_CLICKS, clicks);
  },

  getSettings() {
    return this.get(this.KEYS.SETTINGS, {
      language: 'en',
      privacy: 'public',
      notifications: true,
      emailNotifications: true
    });
  },

  updateSettings(settings) {
    const current = this.getSettings();
    this.set(this.KEYS.SETTINGS, { ...current, ...settings });
  },

  getBlocked() {
    return this.get(this.KEYS.BLOCKED, []);
  },

  blockUser(userId) {
    const blocked = this.getBlocked();
    if (!blocked.includes(userId)) {
      blocked.push(userId);
      this.set(this.KEYS.BLOCKED, blocked);
    }
    return blocked;
  },

  getWritingTags() {
    return this.get(this.KEYS.WRITING_TAGS, [
      { id: 1, label: 'شعر', en: 'Sher' },
      { id: 2, label: 'قطعہ', en: 'Qita' },
      { id: 3, label: 'غزل', en: 'Ghazal' },
      { id: 4, label: 'نظم', en: 'Nazm' },
      { id: 5, label: 'رباعی', en: 'Rubai' },
      { id: 6, label: 'شاعری', en: 'Shayari' },
      { id: 7, label: 'اقتباس', en: 'Quote' }
    ]);
  },

  saveWritingTags(tags) {
    this.set(this.KEYS.WRITING_TAGS, tags);
  },

  getAdminUsersList() {
    const users = this.get('urdu_poetry_users', []);
    const current = this.getUser();
    const list = users.length ? users : (current && !current.isGuest ? [current] : []);
    return list.map(u => ({
      id: u.id,
      email: u.email,
      username: u.username || u.email?.split('@')[0],
      displayName: u.name,
      userRole: u.userRole || (u.isAdmin ? 'admin' : 'user'),
      isAdmin: Boolean(u.isAdmin)
    }));
  },

  setLocalUserRole(userId, role) {
    const isAdmin = role === 'admin';
    const users = this.get('urdu_poetry_users', []);
    const updated = users.map(u => u.id === userId ? { ...u, isAdmin, userRole: role } : u);
    this.set('urdu_poetry_users', updated);
    const current = this.getUser();
    if (current && current.id === userId) {
      this.setUser({ ...current, isAdmin, userRole: role });
    }
    return true;
  },

  /** @deprecated use setLocalUserRole */
  setLocalUserAdmin(userId, isAdmin) {
    return this.setLocalUserRole(userId, isAdmin ? 'admin' : 'user');
  },

  getUserPosts() {
    return this.get(this.KEYS.USER_POSTS, []);
  },

  addUserPost(post) {
    const posts = this.getUserPosts();
    const newPost = {
      id: Date.now(),
      likes: 0,
      comments: 0,
      shares: 0,
      time: 'Just now',
      trending: false,
      userPost: true,
      ...post
    };
    posts.unshift(newPost);
    this.set(this.KEYS.USER_POSTS, posts);
    this.incrementAnalytics('posts');
    return newPost;
  },

  getDrafts() {
    return this.get(this.KEYS.DRAFTS, []);
  },

  saveDraft(draft) {
    const drafts = this.getDrafts();
    if (draft.id) {
      const idx = drafts.findIndex(d => d.id === draft.id);
      if (idx > -1) drafts[idx] = { ...drafts[idx], ...draft, updatedAt: new Date().toISOString() };
      else drafts.unshift({ ...draft, id: draft.id, updatedAt: new Date().toISOString() });
    } else {
      drafts.unshift({ ...draft, id: Date.now(), updatedAt: new Date().toISOString() });
    }
    this.set(this.KEYS.DRAFTS, drafts);
    return drafts;
  },

  deleteDraft(id) {
    const drafts = this.getDrafts().filter(d => d.id !== id);
    this.set(this.KEYS.DRAFTS, drafts);
  },

  getScheduledPosts() {
    return this.get(this.KEYS.SCHEDULED, []);
  },

  addScheduledPost(post) {
    const scheduled = this.getScheduledPosts();
    scheduled.push({ ...post, id: Date.now(), createdAt: new Date().toISOString() });
    this.set(this.KEYS.SCHEDULED, scheduled);
    return scheduled;
  },

  deleteScheduled(id) {
    this.set(this.KEYS.SCHEDULED, this.getScheduledPosts().filter(p => p.id !== id));
  },

  processScheduledPosts() {
    const scheduled = this.getScheduledPosts();
    const now = new Date();
    const due = scheduled.filter(p => new Date(p.scheduleAt) <= now);
    const remaining = scheduled.filter(p => new Date(p.scheduleAt) > now);
    due.forEach(p => this.addUserPost(p));
    this.set(this.KEYS.SCHEDULED, remaining);
    return due.length;
  },

  getReports() {
    return this.get(this.KEYS.REPORTS, []);
  },

  addReport(report) {
    const reports = this.getReports();
    reports.unshift({ id: Date.now(), status: 'pending', time: 'Just now', ...report });
    this.set(this.KEYS.REPORTS, reports);
    return reports;
  },

  resolveReport(id, action) {
    const reports = this.getReports().map(r =>
      r.id === id ? { ...r, status: action, resolvedAt: new Date().toISOString() } : r
    );
    this.set(this.KEYS.REPORTS, reports);
  },

  getFeaturedPoem() {
    return this.get(this.KEYS.FEATURED, null);
  },

  setFeaturedPoem(poemId) {
    this.set(this.KEYS.FEATURED, poemId);
  },

  getCardTheme() {
    return this.get(this.KEYS.CARD_THEME, 'classic-dark');
  },

  setCardTheme(theme) {
    this.set(this.KEYS.CARD_THEME, theme);
  },

  getAnalytics() {
    return this.get(this.KEYS.ANALYTICS, { likes: 0, comments: 0, shares: 0, saves: 0, posts: 0 });
  },

  incrementAnalytics(type) {
    const stats = this.getAnalytics();
    stats[type] = (stats[type] || 0) + 1;
    this.set(this.KEYS.ANALYTICS, stats);
  }
};
