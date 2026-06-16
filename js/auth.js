const Auth = {
  isLoggedIn() {
    const user = Storage.getUser();
    return user && user.loggedIn;
  },

  isGuest() {
    const user = Storage.getUser();
    return !user || user.isGuest;
  },

  isPremium() {
    const user = Storage.getUser();
    return user && user.premium;
  },

  getCurrentUser() {
    const user = Storage.getUser() || { name: 'Guest', isGuest: true };
    if (!user.avatar || String(user.avatar).includes('pravatar')) {
      user.avatar = getAvatarUrl(user.name || 'Guest');
    }
    return user;
  },

  login(email, password) {
    const users = Storage.get('urdu_poetry_users', []);
    let user = users.find(u => u.email === email && u.password === password);
    if (!user && email) {
      user = { id: Date.now(), name: email.split('@')[0], email, loggedIn: true, isGuest: false, premium: false, avatar: getAvatarUrl(email.split('@')[0]) };
    }
    if (user) {
      user.loggedIn = true;
      user.isGuest = false;
      Storage.setUser(user);
      return { success: true, user };
    }
    return { success: false, error: 'Invalid email or password' };
  },

  register(name, email, password) {
    const users = Storage.get('urdu_poetry_users', []);
    if (users.find(u => u.email === email)) {
      return { success: false, error: 'Email already registered' };
    }
    const user = {
      id: Date.now(),
      name,
      email,
      password,
      loggedIn: true,
      isGuest: false,
      premium: false,
      avatar: getAvatarUrl(name)
    };
    users.push(user);
    Storage.set('urdu_poetry_users', users);
    Storage.setUser(user);
    return { success: true, user };
  },

  loginAsGuest() {
    const user = { name: 'Guest', isGuest: true, loggedIn: true, premium: false, avatar: getAvatarUrl('Guest') };
    Storage.setUser(user);
    return user;
  },

  loginWithSocial(provider) {
    const displayName = provider === 'google' ? 'Google User' : 'Facebook User';
    const user = {
      id: Date.now(),
      name: displayName,
      email: `${provider}@social.com`,
      loggedIn: true,
      isGuest: false,
      premium: false,
      avatar: getAvatarUrl(displayName),
      provider
    };
    Storage.setUser(user);
    return user;
  },

  logout() {
    Storage.clearUser();
  },

  upgradePremium(plan) {
    const user = Storage.getUser();
    if (user) {
      user.premium = true;
      user.premiumPlan = plan;
      Storage.setUser(user);
      return true;
    }
    return false;
  },

  canReadPoem() {
    if (this.isPremium()) return { allowed: true };
    if (this.isGuest()) {
      const reads = Storage.getGuestReads();
      if (reads >= APP_DATA.guestPoemLimit) {
        return { allowed: false, reason: 'guest_limit' };
      }
      return { allowed: true };
    }
    const daily = Storage.getDailyReads();
    if (daily.count >= APP_DATA.freeLimits.poemsPerDay) {
      return { allowed: false, reason: 'daily_limit' };
    }
    return { allowed: true };
  },

  recordPoemRead(poemId) {
    Storage.addToHistory(poemId);
    if (this.isGuest()) {
      return Storage.incrementGuestReads();
    }
    if (!this.isPremium()) {
      return Storage.incrementDailyReads();
    }
    return 0;
  },

  canBookmark() {
    if (this.isPremium()) return true;
    return Storage.getBookmarks().length < APP_DATA.freeLimits.bookmarks;
  },

  canMessage() {
    if (this.isPremium()) return true;
    const count = Storage.getMessages().length + APP_DATA.sampleChats.length;
    return count < APP_DATA.freeLimits.messages;
  },

  canVisitProfile() {
    if (this.isPremium()) return true;
    return Storage.getProfileVisits() < APP_DATA.freeLimits.profileVisits;
  },

  canCreateEvent() {
    return this.isPremium();
  },

  canCreateRoom() {
    return this.isPremium();
  },

  showAds() {
    return !this.isPremium();
  },

  resetPassword(email) {
    if (email) {
      Storage.set('urdu_poetry_reset_email', email);
      return { success: true };
    }
    return { success: false, error: 'Please enter a valid email' };
  },

  getResetEmail() {
    return Storage.get('urdu_poetry_reset_email', 'user@example.com');
  }
};
