const Router = {
  routes: [
    { path: '/', handler: 'home' },
    { path: '/home', handler: 'home' },
    { path: '/poems', handler: 'poems' },
    { path: '/categories', handler: 'categories' },
    { path: '/categories/:id', handler: 'categories' },
    { path: '/poets', handler: 'poets' },
    { path: '/poet/:id', handler: 'poetProfile' },
    { path: '/poem/:id', handler: 'poemDetail' },
    { path: '/top-poets', handler: 'topPoets' },
    { path: '/mushaira', handler: 'mushaira' },
    { path: '/voice-rooms', handler: 'voiceRooms' },
    { path: '/contests', handler: 'contests' },
    { path: '/messages', handler: 'messages' },
    { path: '/messages/:id', handler: 'messages' },
    { path: '/notifications', handler: 'notifications' },
    { path: '/bookmarks', handler: 'bookmarks' },
    { path: '/history', handler: 'history' },
    { path: '/settings', handler: 'settings' },
    { path: '/premium', handler: 'premium' },
    { path: '/login', handler: 'login' },
    { path: '/register', handler: 'register' },
    { path: '/forgot-password', handler: 'forgotPassword' },
    { path: '/check-email', handler: 'checkEmail' },
    { path: '/reset-password', handler: 'resetPassword' },
    { path: '/reset-success', handler: 'resetSuccess' }
  ],

  init() {
    window.addEventListener('hashchange', () => this.navigate());
    this.navigate();
  },

  getCurrentPath() {
    const hash = location.hash.slice(1) || '/';
    return hash.split('?')[0];
  },

  getQuery() {
    const hash = location.hash.slice(1) || '/';
    const queryString = hash.split('?')[1] || '';
    const params = {};
    if (queryString) {
      new URLSearchParams(queryString).forEach((value, key) => {
        params[key] = value;
      });
    }
    return params;
  },

  matchRoute(path) {
    for (const route of this.routes) {
      const routeParts = route.path.split('/').filter(Boolean);
      const pathParts = path.split('/').filter(Boolean);

      if (routeParts.length !== pathParts.length && !route.path.includes(':')) continue;
      if (routeParts.length !== pathParts.length && route.path.includes(':')) {
        if (routeParts.length !== pathParts.length) continue;
      }

      const params = {};
      let matched = true;

      for (let i = 0; i < routeParts.length; i++) {
        if (routeParts[i].startsWith(':')) {
          params[routeParts[i].slice(1)] = pathParts[i];
        } else if (routeParts[i] !== pathParts[i]) {
          matched = false;
          break;
        }
      }

      if (matched && routeParts.length === pathParts.length) {
        return { route, params };
      }

      if (route.path === '/' && path === '/') {
        return { route, params: {} };
      }
    }

    if (path === '/' || path === '') {
      return { route: this.routes[0], params: {} };
    }

    return null;
  },

  navigate() {
    const path = this.getCurrentPath();
    const query = this.getQuery();
    const match = this.matchRoute(path);

    const app = document.getElementById('app');
    const loading = document.getElementById('loading-screen');
    if (loading) loading.style.display = 'none';

    if (match) {
      const handler = Pages[match.route.handler];
      if (handler) {
        document.title = this.getPageTitle(match.route.handler) + ' - Urdu Poetry';
        app.innerHTML = handler(match.params, query);
        App.bindEvents();
        window.scrollTo(0, 0);
        return;
      }
    }

    app.innerHTML = Pages.notFound();
    App.bindEvents();
  },

  getPageTitle(handler) {
    const titles = {
      home: 'Home',
      poems: 'All Poems',
      categories: 'Categories',
      poets: 'Poets',
      poetProfile: 'Poet Profile',
      poemDetail: 'Poem',
      topPoets: 'Top Poets',
      mushaira: 'Mushaira Events',
      voiceRooms: 'Voice Chat Rooms',
      contests: 'Contests',
      messages: 'Messages',
      notifications: 'Notifications',
      bookmarks: 'Bookmarks',
      history: 'Reading History',
      settings: 'Settings',
      premium: 'Premium',
      login: 'Sign In',
      register: 'Sign Up',
      forgotPassword: 'Forgot Password',
      checkEmail: 'Check Email',
      resetPassword: 'Reset Password',
      resetSuccess: 'Success'
    };
    return titles[handler] || 'Urdu Poetry';
  },

  go(path) {
    location.hash = path;
  }
};
