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
    CONTEST_ENTRIES: 'urdu_poetry_contest_entries',
    AD_CLICKS: 'urdu_poetry_ad_clicks',
    AD_VIEWS: 'urdu_poetry_ad_views',
    SETTINGS: 'urdu_poetry_settings'
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
    }
    return rooms;
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
  }
};
