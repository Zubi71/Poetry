const Auth = {
  _session: null,
  _initializing: false,

  isSupabase() {
    return SupabaseClient.isEnabled();
  },

  isLoggedIn() {
    if (this.isSupabase() && this._session) return true;
    const user = Storage.getUser();
    return user && user.loggedIn && !user.isGuest;
  },

  isGuest() {
    if (this.isSupabase() && this._session) return false;
    const user = Storage.getUser();
    return !user || user.isGuest;
  },

  isPremium() {
    const user = this.getCurrentUser();
    return user && user.premium;
  },

  isAdmin() {
    const user = this.getCurrentUser();
    return user && (user.isAdmin || user.email === 'admin@urdupoetry.com');
  },

  getCurrentUser() {
    const user = Storage.getUser();
    if (user && !user.isGuest) {
      if (!user.avatar || String(user.avatar).includes('pravatar')) {
        user.avatar = getAvatarUrl(user.name || 'Guest');
      }
      return user;
    }
    return { name: 'Guest', isGuest: true, avatar: getAvatarUrl('Guest') };
  },

  async init() {
    if (!this.isSupabase()) return;
    if (this._initializing) return;
    this._initializing = true;

    const sb = SupabaseClient.init();
    if (!sb) return;

    const { data: { session } } = await sb.auth.getSession();
    if (session) {
      await this._applySession(session);
    }

    sb.auth.onAuthStateChange(async (event, session) => {
      if (session) {
        await this._applySession(session);
      } else if (event === 'SIGNED_OUT') {
        this._session = null;
        Storage.clearUser();
      }
      if (event === 'SIGNED_IN' || event === 'TOKEN_REFRESHED') {
        Router.navigate();
      }
    });

    this._initializing = false;
  },

  async _applySession(session) {
    this._session = session;
    const profile = await API.getProfile(session.user.id);
    const user = API.mapProfile(profile, session.user);
    Storage.setUser(user);
    await API.syncUserData();
  },

  async login(emailOrUsername, password) {
    if (this.isSupabase()) {
      try {
        const sb = SupabaseClient.get();
        let email = emailOrUsername.trim();

        if (!email.includes('@')) {
          const { data: resolved } = await sb.rpc('get_login_email', { identifier: email });
          if (!resolved) return { success: false, error: 'Username not found' };
          email = resolved;
        }

        const { data, error } = await sb.auth.signInWithPassword({ email, password });
        if (error) return { success: false, error: error.message };
        await this._applySession(data.session);
        return { success: true, user: this.getCurrentUser() };
      } catch (e) {
        return { success: false, error: e.message || 'Login failed' };
      }
    }

    return this._localLogin(emailOrUsername, password);
  },

  _localLogin(email, password) {
    const users = Storage.get('urdu_poetry_users', []);
    let user = users.find(u => u.email === email && u.password === password);
    if (!user && email) {
      const isAdmin = email === 'admin@urdupoetry.com';
      user = {
        id: Date.now(),
        name: isAdmin ? 'Admin' : email.split('@')[0],
        email,
        loggedIn: true,
        isGuest: false,
        premium: isAdmin,
        isAdmin,
        avatar: getAvatarUrl(isAdmin ? 'Admin' : email.split('@')[0])
      };
    }
    if (user) {
      user.loggedIn = true;
      user.isGuest = false;
      if (user.email === 'admin@urdupoetry.com') user.isAdmin = true;
      Storage.setUser(user);
      return { success: true, user };
    }
    return { success: false, error: 'Invalid email or password' };
  },

  async register(name, email, password, username) {
    if (this.isSupabase()) {
      try {
        const sb = SupabaseClient.get();
        const cleanUsername = (username || name).toLowerCase().replace(/[^a-z0-9_]/g, '');

        const { data: existing } = await sb.from('profiles').select('id').eq('username', cleanUsername).maybeSingle();
        if (existing) return { success: false, error: 'Username already taken' };

        const { data, error } = await sb.auth.signUp({
          email,
          password,
          options: {
            data: { display_name: name, username: cleanUsername }
          }
        });

        if (error) return { success: false, error: error.message };

        if (data.session) {
          await this._applySession(data.session);
          return { success: true, user: this.getCurrentUser() };
        }

        return {
          success: true,
          needsConfirmation: true,
          message: 'Check your email to confirm your account, then sign in.'
        };
      } catch (e) {
        return { success: false, error: e.message || 'Registration failed' };
      }
    }

    return this._localRegister(name, email, password);
  },

  _localRegister(name, email, password) {
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
    this._session = null;
    const user = { name: 'Guest', isGuest: true, loggedIn: true, premium: false, avatar: getAvatarUrl('Guest') };
    Storage.setUser(user);
    return user;
  },

  async loginWithOAuth(provider) {
    if (this.isSupabase()) {
      const sb = SupabaseClient.get();
      const redirectTo = window.location.origin + window.location.pathname;
      const { error } = await sb.auth.signInWithOAuth({
        provider,
        options: { redirectTo }
      });
      if (error) {
        Components.showToast(error.message, 'error');
        return null;
      }
      return { redirecting: true };
    }

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

  async logout() {
    if (this.isSupabase()) {
      const sb = SupabaseClient.get();
      await sb.auth.signOut();
    }
    this._session = null;
    Storage.clearUser();
  },

  async resetPassword(email) {
    if (this.isSupabase()) {
      const sb = SupabaseClient.get();
      const redirectTo = window.location.origin + window.location.pathname + '#/reset-password';
      const { error } = await sb.auth.resetPasswordForEmail(email, { redirectTo });
      if (error) return { success: false, error: error.message };
      Storage.set('urdu_poetry_reset_email', email);
      return { success: true };
    }
    if (email) {
      Storage.set('urdu_poetry_reset_email', email);
      return { success: true };
    }
    return { success: false, error: 'Please enter a valid email' };
  },

  async updatePassword(newPassword) {
    if (this.isSupabase()) {
      const sb = SupabaseClient.get();
      const { error } = await sb.auth.updateUser({ password: newPassword });
      return { success: !error, error: error?.message };
    }
    return { success: true };
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
    if (this.isGuest()) return Storage.incrementGuestReads();
    if (!this.isPremium()) return Storage.incrementDailyReads();
    return 0;
  },

  canBookmark() {
    if (this.isPremium()) return true;
    return Storage.getBookmarks().length < APP_DATA.freeLimits.bookmarks;
  },

  canMessage() {
    if (this.isPremium()) return true;
    return Storage.getMessages().length + APP_DATA.sampleChats.length < APP_DATA.freeLimits.messages;
  },

  canVisitProfile() {
    if (this.isPremium()) return true;
    return Storage.getProfileVisits() < APP_DATA.freeLimits.profileVisits;
  },

  canCreateEvent() { return this.isPremium(); },
  canCreateRoom() { return this.isPremium(); },
  showAds() { return !this.isPremium(); },

  getResetEmail() {
    return Storage.get('urdu_poetry_reset_email', 'user@example.com');
  }
};
