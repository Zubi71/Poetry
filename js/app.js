const App = {
  init() {
    const storedUser = Storage.getUser();
    if (storedUser && storedUser.avatar && String(storedUser.avatar).includes('pravatar')) {
      storedUser.avatar = getAvatarUrl(storedUser.name || 'User');
      Storage.setUser(storedUser);
    }
    Router.init();
    this.bindGlobalEvents();
  },

  bindGlobalEvents() {
    document.addEventListener('click', (e) => {
      const adLink = e.target.closest('[data-ad-click]');
      if (adLink) {
        Storage.trackAdClick(adLink.dataset.adClick);
      }
    });
  },

  bindEvents() {
    // Sidebar toggle
    const menuToggle = document.getElementById('menu-toggle');
    const sidebar = document.getElementById('sidebar');
    const overlay = document.getElementById('sidebar-overlay');
    if (menuToggle && sidebar) {
      menuToggle.onclick = () => {
        sidebar.classList.toggle('open');
        overlay?.classList.toggle('active');
      };
      overlay?.addEventListener('click', () => {
        sidebar.classList.remove('open');
        overlay.classList.remove('active');
      });
    }

    // Global search
    const globalSearch = document.getElementById('global-search');
    if (globalSearch) {
      globalSearch.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') {
          Router.go(`/poems?q=${encodeURIComponent(globalSearch.value)}`);
        }
      });
    }

    // Poem actions
    document.querySelectorAll('[data-action="like"]').forEach(btn => {
      btn.onclick = () => {
        const id = parseInt(btn.dataset.id);
        const liked = Storage.toggleLike(id);
        btn.classList.toggle('active', liked);
        Components.showToast(liked ? 'Poem liked!' : 'Like removed');
        Router.navigate();
      };
    });

    document.querySelectorAll('[data-action="bookmark"]').forEach(btn => {
      btn.onclick = () => {
        const id = parseInt(btn.dataset.id);
        if (!Storage.isBookmarked(id) && !Auth.canBookmark()) {
          Components.showToast('Bookmark limit reached. Upgrade to Premium!', 'error');
          return;
        }
        const saved = Storage.toggleBookmark(id);
        btn.classList.toggle('active', saved);
        Components.showToast(saved ? 'Poem saved!' : 'Removed from bookmarks');
        Router.navigate();
      };
    });

    document.querySelectorAll('[data-action="share"]').forEach(btn => {
      btn.onclick = () => {
        const id = btn.dataset.id;
        const url = `${location.origin}${location.pathname}#/poem/${id}`;
        if (navigator.share) {
          navigator.share({ title: 'Urdu Poetry', url });
        } else {
          navigator.clipboard?.writeText(url);
          Components.showToast('Link copied to clipboard!');
        }
      };
    });

    document.querySelectorAll('[data-action="download"]').forEach(btn => {
      btn.onclick = () => {
        const poem = getPoemById(btn.dataset.id);
        if (poem) {
          const blob = new Blob([poem.text + '\n\n— ' + poem.poetName], { type: 'text/plain' });
          const a = document.createElement('a');
          a.href = URL.createObjectURL(blob);
          a.download = `poem-${poem.id}.txt`;
          a.click();
          Components.showToast('Poem downloaded!');
        }
      };
    });

    // Follow buttons
    document.querySelectorAll('.follow-btn').forEach(btn => {
      btn.onclick = (e) => {
        e.preventDefault();
        e.stopPropagation();
        const poetId = parseInt(btn.dataset.poetId);
        const following = Storage.toggleFollow(poetId);
        Components.showToast(following ? 'Now following!' : 'Unfollowed');
        Router.navigate();
      };
    });

    // Report & Block
    document.querySelectorAll('.report-btn').forEach(btn => {
      btn.onclick = () => {
        Components.showModal('Report Submitted', '<p>Thank you for your report. Our moderation team will review it within 24 hours.</p>', '<button class="btn btn-gold" onclick="Components.closeModal()">OK</button>');
      };
    });

    document.querySelectorAll('.block-btn').forEach(btn => {
      btn.onclick = () => {
        Storage.blockUser(parseInt(btn.dataset.id));
        Components.showToast('User blocked');
        Router.go('/poets');
      };
    });

    // Event registration
    document.querySelectorAll('.register-event-btn').forEach(btn => {
      btn.onclick = () => {
        Storage.registerEvent(parseInt(btn.dataset.eventId));
        Components.showToast('Successfully registered!');
        Router.navigate();
      };
    });

    document.querySelectorAll('.join-event-btn').forEach(btn => {
      btn.onclick = () => {
        Storage.registerEvent(parseInt(btn.dataset.eventId));
        Components.showToast('Joined live mushaira!');
      };
    });

    // Voice rooms
    document.querySelectorAll('.join-room-btn').forEach(btn => {
      btn.onclick = () => {
        const roomId = parseInt(btn.dataset.roomId);
        const room = APP_DATA.voiceRooms.find(r => r.id === roomId);
        if (room?.premium && !Auth.isPremium()) {
          Components.showToast('Premium room. Upgrade to join!', 'error');
          return;
        }
        Storage.joinRoom(roomId);
        Components.showToast('Joined voice room!');
        Router.navigate();
      };
    });

    const createRoomBtn = document.getElementById('create-room-btn');
    if (createRoomBtn) {
      createRoomBtn.onclick = () => {
        Components.showModal('Create Voice Room', `
          <form id="create-room-form">
            <div class="form-group"><label>Room Title</label><input type="text" name="title" required></div>
            <div class="form-group"><label>Description</label><input type="text" name="desc"></div>
          </form>
        `, '<button class="btn btn-gold" id="submit-room">Create Room</button>');
        document.getElementById('submit-room').onclick = () => {
          Components.showToast('Voice room created!');
          Components.closeModal();
        };
      };
    }

    // Contest submission
    document.querySelectorAll('.submit-contest-btn').forEach(btn => {
      btn.onclick = () => {
        Components.showModal('Submit Poetry', `
          <form id="contest-form">
            <div class="form-group"><label>Your Poetry</label><textarea name="poem" rows="5" required placeholder="Enter your poem..."></textarea></div>
          </form>
        `, '<button class="btn btn-gold" id="submit-poem">Submit</button>');
        document.getElementById('submit-poem').onclick = () => {
          const textarea = document.querySelector('#contest-form textarea');
          if (textarea?.value) {
            Storage.submitContest(parseInt(btn.dataset.contestId), textarea.value);
            Components.showToast('Poetry submitted!');
            Components.closeModal();
            Router.navigate();
          }
        };
      };
    });

    // Chat form
    const chatForm = document.getElementById('chat-form');
    if (chatForm) {
      chatForm.onsubmit = (e) => {
        e.preventDefault();
        if (!Auth.canMessage()) {
          Components.showToast('Message limit reached!', 'error');
          return;
        }
        const input = chatForm.querySelector('input');
        const chatId = parseInt(chatForm.dataset.chatId);
        Storage.addMessage(chatId, input.value);
        input.value = '';
        Router.navigate();
      };
    }

    // Comment form
    const commentForm = document.getElementById('comment-form');
    if (commentForm) {
      commentForm.onsubmit = (e) => {
        e.preventDefault();
        Components.showToast('Comment posted!');
        commentForm.querySelector('input').value = '';
      };
    }

    // Search forms
    const poemsSearch = document.getElementById('poems-search-form');
    if (poemsSearch) {
      poemsSearch.onsubmit = (e) => {
        e.preventDefault();
        const q = new FormData(poemsSearch).get('q');
        Router.go(`/poems?q=${encodeURIComponent(q)}`);
      };
    }

    const poetsSearch = document.getElementById('poets-search-form');
    if (poetsSearch) {
      poetsSearch.onsubmit = (e) => {
        e.preventDefault();
        const q = new FormData(poetsSearch).get('q');
        Router.go(`/poets?q=${encodeURIComponent(q)}`);
      };
    }

    const categoryFilter = document.getElementById('category-filter');
    if (categoryFilter) {
      categoryFilter.onchange = () => {
        Router.go(categoryFilter.value ? `/poems?category=${categoryFilter.value}` : '/poems');
      };
    }

    // Auth forms
    const loginForm = document.getElementById('login-form');
    if (loginForm) {
      loginForm.onsubmit = (e) => {
        e.preventDefault();
        const data = new FormData(loginForm);
        const result = Auth.login(data.get('email'), data.get('password'));
        if (result.success) {
          Components.showToast('Welcome back!');
          Router.go('/');
        } else {
          Components.showToast(result.error, 'error');
        }
      };
    }

    const registerForm = document.getElementById('register-form');
    if (registerForm) {
      registerForm.onsubmit = (e) => {
        e.preventDefault();
        const data = new FormData(registerForm);
        if (data.get('password') !== data.get('confirm')) {
          Components.showToast('Passwords do not match', 'error');
          return;
        }
        const result = Auth.register(data.get('name'), data.get('email'), data.get('password'));
        if (result.success) {
          Components.showToast('Account created!');
          Router.go('/');
        } else {
          Components.showToast(result.error, 'error');
        }
      };
    }

    const forgotForm = document.getElementById('forgot-form');
    if (forgotForm) {
      forgotForm.onsubmit = (e) => {
        e.preventDefault();
        const email = new FormData(forgotForm).get('email');
        Auth.resetPassword(email);
        Router.go('/check-email');
      };
    }

    const resetForm = document.getElementById('reset-form');
    if (resetForm) {
      resetForm.onsubmit = (e) => {
        e.preventDefault();
        const data = new FormData(resetForm);
        if (data.get('password') !== data.get('confirm')) {
          Components.showToast('Passwords do not match', 'error');
          return;
        }
        Router.go('/reset-success');
      };
    }

    // Social login
    document.querySelectorAll('[data-social]').forEach(btn => {
      btn.onclick = () => {
        Auth.loginWithSocial(btn.dataset.social);
        Components.showToast('Logged in!');
        Router.go('/');
      };
    });

    const guestLogin = document.getElementById('guest-login');
    if (guestLogin) {
      guestLogin.onclick = (e) => {
        e.preventDefault();
        Auth.loginAsGuest();
        Components.showToast('Browsing as guest');
        Router.go('/');
      };
    }

    // Logout
    const logoutBtn = document.getElementById('logout-btn');
    if (logoutBtn) {
      logoutBtn.onclick = () => {
        Auth.logout();
        Components.showToast('Logged out');
        Router.go('/login');
      };
    }

    // Premium subscribe
    document.querySelectorAll('.subscribe-btn').forEach(btn => {
      btn.onclick = () => {
        Auth.upgradePremium(btn.dataset.plan);
        Components.showToast('Welcome to Premium! 👑');
        Router.go('/');
      };
    });

    // Settings forms
    const accountForm = document.getElementById('account-form');
    if (accountForm) {
      accountForm.onsubmit = (e) => {
        e.preventDefault();
        const user = Auth.getCurrentUser();
        const data = new FormData(accountForm);
        user.name = data.get('name');
        if (data.get('email')) user.email = data.get('email');
        Storage.setUser(user);
        Components.showToast('Settings saved!');
      };
    }

    const privacyForm = document.getElementById('privacy-form');
    if (privacyForm) {
      privacyForm.onsubmit = (e) => {
        e.preventDefault();
        Storage.updateSettings({ privacy: new FormData(privacyForm).get('privacy') });
        Components.showToast('Privacy updated!');
      };
    }

    const passwordForm = document.getElementById('password-form');
    if (passwordForm) {
      passwordForm.onsubmit = (e) => {
        e.preventDefault();
        Components.showToast('Password updated!');
      };
    }

    const languageForm = document.getElementById('language-form');
    if (languageForm) {
      languageForm.onsubmit = (e) => {
        e.preventDefault();
        Storage.updateSettings({ language: new FormData(languageForm).get('language') });
        Components.showToast('Language updated!');
      };
    }

    // Newsletter
    const newsletterForm = document.getElementById('newsletter-form');
    if (newsletterForm) {
      newsletterForm.onsubmit = (e) => {
        e.preventDefault();
        Components.showToast('Subscribed to newsletter!');
        newsletterForm.reset();
      };
    }

    // Hero carousel
    this.initCarousel();
  },

  initCarousel() {
    const slides = APP_DATA.heroSlides;
    const heroSlide = document.querySelector('.hero-slide');
    const dots = document.querySelectorAll('.carousel-dots .dot');
    if (!heroSlide || !dots.length) return;

    let current = 0;
    setInterval(() => {
      current = (current + 1) % slides.length;
      const slide = slides[current];
      const poem = getPoemById(slide.poemId);
      heroSlide.style.backgroundImage = `url('${slide.image}')`;
      const poemEl = heroSlide.querySelector('.hero-poem');
      const btn = heroSlide.querySelector('.btn');
      if (poemEl && poem) poemEl.textContent = poem.text.split('\n')[0];
      if (btn) btn.href = `#/poem/${slide.poemId}`;
      dots.forEach((d, i) => d.classList.toggle('active', i === current));
    }, 5000);
  }
};

document.addEventListener('DOMContentLoaded', () => App.init());
