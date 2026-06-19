const App = {
  _micStream: null,

  _stopMic() {
    if (this._micStream) {
      this._micStream.getTracks().forEach(track => track.stop());
      this._micStream = null;
    }
  },

  async init() {
    const storedUser = Storage.getUser();
    if (storedUser && storedUser.avatar && String(storedUser.avatar).includes('pravatar')) {
      storedUser.avatar = getAvatarUrl(storedUser.name || 'User');
      Storage.setUser(storedUser);
    }
    Components.closeModal();

    if (SupabaseClient.isEnabled()) {
      await Auth.init();
      await loadRemoteData();
    }

    Auth.ensureGuestBrowsing();

    Router.init();
    this.bindGlobalEvents();
  },

  bindGlobalEvents() {
    document.addEventListener('click', (e) => {
      const adLink = e.target.closest('[data-ad-click]');
      if (adLink) {
        Storage.trackAdClick(adLink.dataset.adClick);
      }

      if (e.target.closest('.open-write-btn')) {
        e.preventDefault();
        Write.openModal();
      }

      const poemLink = e.target.closest('a[href*="#/poem/"]');
      if (poemLink && Auth.isGuest()) {
        const match = poemLink.getAttribute('href')?.match(/\/poem\/(\d+)/);
        if (match && !Auth.tryAccessPoem(match[1])) {
          e.preventDefault();
        }
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
      btn.onclick = async () => {
        const id = parseInt(btn.dataset.id);
        let liked;
        if (SupabaseClient.isEnabled() && Auth.isLoggedIn()) {
          liked = await API.toggleLike(id);
          if (liked !== null) Storage.set(Storage.KEYS.LIKES, await API.getUserLikes());
        } else {
          liked = Storage.toggleLike(id);
        }
        if (liked) Storage.incrementAnalytics('likes');
        btn.classList.toggle('active', liked);
        Components.showToast(liked ? 'Poem liked!' : 'Like removed');
        Router.navigate();
      };
    });

    document.querySelectorAll('[data-action="bookmark"]').forEach(btn => {
      btn.onclick = async () => {
        const id = parseInt(btn.dataset.id);
        let saved;
        if (SupabaseClient.isEnabled() && Auth.isLoggedIn()) {
          saved = await API.toggleBookmark(id);
          if (saved !== null) Storage.set(Storage.KEYS.BOOKMARKS, await API.getUserBookmarks());
        } else {
          saved = Storage.toggleBookmark(id);
        }
        if (saved) Storage.incrementAnalytics('saves');
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
          Storage.incrementAnalytics('shares');
        } else {
          navigator.clipboard?.writeText(url);
          Storage.incrementAnalytics('shares');
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
      btn.onclick = async () => {
        const report = {
          type: btn.dataset.type || 'post',
          targetId: btn.dataset.id,
          reason: 'User reported content for moderation review'
        };
        if (SupabaseClient.isEnabled()) await API.addReport(report);
        else Storage.addReport(report);
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
        const room = getVoiceRoomById(roomId);
        Storage.joinRoom(roomId);
        Router.go(`/voice-rooms/${roomId}`);
      };
    });

    document.querySelectorAll('.leave-room-btn').forEach(btn => {
      btn.onclick = () => {
        const roomId = parseInt(btn.dataset.roomId);
        Storage.leaveRoom(roomId);
        App._stopMic?.();
        Components.showToast('Left voice room');
        Router.go('/voice-rooms');
      };
    });

    const voiceRoomForm = document.getElementById('voice-room-form');
    if (voiceRoomForm) {
      voiceRoomForm.onsubmit = (e) => {
        e.preventDefault();
        const input = voiceRoomForm.querySelector('input');
        const roomId = voiceRoomForm.dataset.roomId;
        if (!input.value.trim()) return;
        Storage.addRoomMessage(roomId, input.value.trim());
        input.value = '';
        Router.navigate();
        const msgBox = document.getElementById('voice-room-messages');
        if (msgBox) msgBox.scrollTop = msgBox.scrollHeight;
      };
    }

    const voiceMicBtn = document.getElementById('voice-mic-btn');
    if (voiceMicBtn) {
      voiceMicBtn.onclick = async () => {
        if (voiceMicBtn.classList.contains('active')) {
          App._stopMic?.();
          voiceMicBtn.classList.remove('active');
          Components.showToast('Microphone muted');
          return;
        }
        try {
          const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
          App._micStream = stream;
          voiceMicBtn.classList.add('active');
          Components.showToast('Microphone on — you can speak in the room');
        } catch {
          Components.showToast('Microphone access denied. You can still chat by text.', 'error');
        }
      };
    }

    const voiceMsgBox = document.getElementById('voice-room-messages');
    if (voiceMsgBox) voiceMsgBox.scrollTop = voiceMsgBox.scrollHeight;

    const createRoomBtn = document.getElementById('create-room-btn');
    if (createRoomBtn) {
      createRoomBtn.onclick = () => {
        Components.showModal('Create Voice Room', `
          <form id="create-room-form">
            <div class="form-group"><label>Room Title</label><input type="text" name="title" required></div>
            <div class="form-group"><label>Description</label><input type="text" name="desc" placeholder="Optional topic"></div>
          </form>
        `, '<button class="btn btn-gold" id="submit-room">Create Room</button>');
        document.getElementById('submit-room').onclick = () => {
          const form = document.getElementById('create-room-form');
          const title = form?.title?.value?.trim();
          if (!title) return;
          const user = Auth.getCurrentUser();
          const room = Storage.addCustomRoom({
            id: Date.now(),
            title,
            host: user.name || 'You',
            participants: 1,
            active: true,
            premium: false,
            desc: form.desc?.value?.trim() || ''
          });
          Components.closeModal();
          Components.showToast('Voice room created!');
          Router.go(`/voice-rooms/${room.id}`);
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
          Components.showToast('Please login to send messages', 'error');
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
        Storage.incrementAnalytics('comments');
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
      loginForm.onsubmit = async (e) => {
        e.preventDefault();
        const data = new FormData(loginForm);
        const btn = loginForm.querySelector('[type="submit"]');
        if (btn) { btn.disabled = true; btn.textContent = 'Signing in...'; }
        const result = await Auth.login(data.get('email'), data.get('password'));
        if (btn) { btn.disabled = false; btn.textContent = 'Sign In'; }
        if (result.success) {
          Components.closeModal();
          await loadRemoteData();
          Components.showToast('Welcome back!');
          Router.go('/');
        } else {
          Components.showToast(result.error, 'error');
        }
      };
    }

    const registerForm = document.getElementById('register-form');
    if (registerForm) {
      registerForm.onsubmit = async (e) => {
        e.preventDefault();
        const data = new FormData(registerForm);
        if (data.get('password') !== data.get('confirm')) {
          Components.showToast('Passwords do not match', 'error');
          return;
        }
        const btn = registerForm.querySelector('[type="submit"]');
        if (btn) { btn.disabled = true; btn.textContent = 'Creating...'; }
        const result = await Auth.register(
          data.get('name'),
          data.get('email'),
          data.get('password'),
          data.get('username')
        );
        if (btn) { btn.disabled = false; btn.textContent = 'Create Account'; }
        if (result.success) {
          Components.closeModal();
          if (result.needsConfirmation) {
            Components.showToast(result.message || 'Check your email to confirm!');
            Router.go('/login');
          } else {
            await loadRemoteData();
            Components.showToast('Account created!');
            Router.go('/');
          }
        } else {
          Components.showToast(result.error, 'error');
        }
      };
    }

    const forgotForm = document.getElementById('forgot-form');
    if (forgotForm) {
      forgotForm.onsubmit = async (e) => {
        e.preventDefault();
        const email = new FormData(forgotForm).get('email');
        const result = await Auth.resetPassword(email);
        if (result.success) Router.go('/check-email');
        else Components.showToast(result.error, 'error');
      };
    }

    const resetForm = document.getElementById('reset-form');
    if (resetForm) {
      resetForm.onsubmit = async (e) => {
        e.preventDefault();
        const data = new FormData(resetForm);
        if (data.get('password') !== data.get('confirm')) {
          Components.showToast('Passwords do not match', 'error');
          return;
        }
        const result = await Auth.updatePassword(data.get('password'));
        if (result.success) Router.go('/reset-success');
        else Components.showToast(result.error || 'Failed to update password', 'error');
      };
    }

    // Social login (auth pages + guest limit modal)
    document.querySelectorAll('[data-social]').forEach(btn => {
      btn.onclick = async () => {
        const result = await Auth.loginWithOAuth(btn.dataset.social);
        if (result?.redirecting) return;
        Components.closeModal();
        await loadRemoteData();
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

    // Password visibility toggle
    document.querySelectorAll('.password-toggle').forEach(btn => {
      btn.onclick = () => {
        const field = btn.closest('.password-field')?.querySelector('input');
        if (!field) return;
        const show = field.type === 'password';
        field.type = show ? 'text' : 'password';
        btn.innerHTML = show ? Components.icon('eyeOff') : Components.icon('eye');
      };
    });

    // Logout
    const logoutBtn = document.getElementById('logout-btn');
    if (logoutBtn) {
      logoutBtn.onclick = async () => {
        await Auth.logout();
        window.REMOTE_POEMS = [];
        Auth.loginAsGuest();
        Components.showToast('Logged out — browsing as guest');
        Router.go('/');
      };
    }

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

    // Create post button (bottom nav +)
    const createBtn = document.getElementById('create-post-btn');
    if (createBtn) createBtn.onclick = () => Write.openModal();

    const dashboardWriteBtn = document.getElementById('dashboard-write-btn');
    if (dashboardWriteBtn) dashboardWriteBtn.onclick = () => Write.openModal();

    const newDraftBtn = document.getElementById('new-draft-btn');
    if (newDraftBtn) newDraftBtn.onclick = () => Write.openModal();

    document.querySelectorAll('.edit-draft-btn').forEach(btn => {
      btn.onclick = () => {
        const draft = Storage.getDrafts().find(d => d.id === parseInt(btn.dataset.draftId));
        if (draft) Write.openModal(draft);
      };
    });

    document.querySelectorAll('.delete-draft-btn').forEach(btn => {
      btn.onclick = () => {
        Storage.deleteDraft(parseInt(btn.dataset.draftId));
        Components.showToast('Draft deleted');
        Router.navigate();
      };
    });

    document.querySelectorAll('.cancel-scheduled-btn').forEach(btn => {
      btn.onclick = () => {
        Storage.deleteScheduled(parseInt(btn.dataset.id));
        Components.showToast('Scheduled post cancelled');
        Router.navigate();
      };
    });

    document.querySelectorAll('.dashboard-theme-btn').forEach(btn => {
      btn.onclick = () => {
        Storage.setCardTheme(btn.dataset.theme);
        Components.showToast('Card theme updated!');
        Router.navigate();
      };
    });

    // Admin panel
    if (document.getElementById('admin-users-list')) {
      this.loadAdminUsers();
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
        if (SupabaseClient.isEnabled()) {
          await API.saveWritingTags(tags);
        } else {
          Storage.saveWritingTags(tags);
        }
        Components.showToast('Tags saved!');
        Router.navigate();
      };
    }

    const addTagBtn = document.getElementById('add-tag-btn');
    if (addTagBtn) {
      addTagBtn.onclick = () => {
        const tags = Storage.getWritingTags();
        tags.push({ id: Date.now(), label: 'نیا', en: 'New' });
        Storage.saveWritingTags(tags);
        Router.navigate();
      };
    }

    document.querySelectorAll('.delete-tag-btn').forEach(btn => {
      btn.onclick = () => {
        const id = parseInt(btn.dataset.tagId);
        Storage.saveWritingTags(Storage.getWritingTags().filter(t => t.id !== id));
        Router.navigate();
      };
    });

    document.querySelectorAll('.resolve-report-btn').forEach(btn => {
      btn.onclick = async () => {
        const id = parseInt(btn.dataset.id);
        const action = btn.dataset.action;
        if (SupabaseClient.isEnabled()) {
          await API.resolveReport(id, action);
        } else {
          Storage.resolveReport(id, action);
        }
        Components.showToast('Report resolved');
        Router.navigate();
      };
    });
  },

  async loadAdminUsers() {
    const container = document.getElementById('admin-users-list');
    if (!container) return;

    const users = SupabaseClient.isEnabled()
      ? await API.fetchAdminUsers()
      : Storage.getAdminUsersList();

    if (users === null) {
      container.innerHTML = `
        <p class="admin-error">Could not load users. Run <code>supabase/migrate-user-role.sql</code> in Supabase SQL Editor first.</p>
      `;
      return;
    }

    if (!users.length) {
      container.innerHTML = '<p class="empty-state">No registered users yet.</p>';
      return;
    }

    const currentId = Auth.getCurrentUser()?.id;
    container.innerHTML = users.map(u => `
      <div class="admin-user-row">
        <div class="admin-user-info">
          <strong>${u.displayName || u.username || 'User'}</strong>
          <span>${u.email || u.username || ''}</span>
        </div>
        <select class="admin-role-select filter-select" data-user-id="${u.id}" aria-label="User role" ${u.id === currentId ? 'title="You cannot remove your own admin role"' : ''}>
          <option value="user" ${u.userRole !== 'admin' ? 'selected' : ''}>user</option>
          <option value="admin" ${u.userRole === 'admin' ? 'selected' : ''}>admin</option>
        </select>
      </div>
    `).join('');

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
        if (SupabaseClient.isEnabled()) {
          ok = await API.setUserRole(userId, role);
        } else {
          ok = Storage.setLocalUserRole(userId, role);
        }

        if (ok) {
          Components.showToast(role === 'admin' ? 'Role set to admin' : 'Role set to user');
        } else {
          Components.showToast('Failed to update role. Run supabase/migrate-user-role.sql first.', 'error');
          this.loadAdminUsers();
        }
      });
    });
  }
};

document.addEventListener('DOMContentLoaded', () => App.init());
