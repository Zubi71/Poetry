const App = {
  _micStream: null,

  _stopMic() {
    if (this._micStream) {
      this._micStream.getTracks().forEach(track => track.stop());
      this._micStream = null;
    }
  },

  _hideLoadingScreen() {
    const loading = document.getElementById('loading-screen');
    if (loading) loading.style.display = 'none';
  },

  async init() {
    const storedUser = Storage.getUser();
    if (storedUser && storedUser.avatar && String(storedUser.avatar).includes('pravatar')) {
      storedUser.avatar = getAvatarUrl(storedUser.name || 'User');
      Storage.setUser(storedUser);
    }
    Components.closeModal();
    this._hideLoadingScreen();

    // Never block the UI on network — bootstrap Supabase in background
    const loaderMaxMs = 4000;

    try {
      Auth.ensureGuestBrowsing();
      Router.init();
      this.bindGlobalEvents();
    } catch (err) {
      console.error('App startup:', err);
    }

    if (!SupabaseClient.isEnabled()) return;

    try {
      await Promise.race([
        this._bootstrapSupabase(),
        new Promise(resolve => setTimeout(resolve, loaderMaxMs))
      ]);
    } catch (err) {
      console.warn('Supabase bootstrap:', err);
    }
    Router.navigate();
  },

  async _bootstrapSupabase() {
    await Auth.init();
    await loadRemoteData();
    if (typeof MushairaEvents !== 'undefined') MushairaEvents.subscribe();
    if (typeof VoiceRoomsList !== 'undefined') VoiceRoomsList.subscribe();
    if (Auth.isLoggedIn() && !Auth.isGuest() && typeof Realtime !== 'undefined') {
      await Realtime.init();
    }
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
        const wasLiked = btn.classList.contains('active');
        const countEl = btn.querySelector('span');

        btn.classList.toggle('active', !wasLiked);
        if (countEl) {
          const current = parseInt(String(countEl.textContent).replace(/[^\d]/g, ''), 10) || 0;
          countEl.textContent = Components.formatNumber(current + (wasLiked ? -1 : 1));
        }

        let liked;
        if (SupabaseClient.isEnabled() && Auth.isLoggedIn()) {
          liked = await API.toggleLike(id);
          if (liked === null) {
            btn.classList.toggle('active', wasLiked);
            if (countEl) {
              const current = parseInt(String(countEl.textContent).replace(/[^\d]/g, ''), 10) || 0;
              countEl.textContent = Components.formatNumber(current + (wasLiked ? 1 : -1));
            }
            Components.showToast('Could not update like', 'error');
            return;
          }
          Storage.set(Storage.KEYS.LIKES, await API.getUserLikes());
          const counts = await API.getPoemCounts(id);
          if (counts) {
            Realtime.updatePoemCounts(id, counts.likes, counts.comments);
            if (liked) await Realtime.broadcastPoemUpdate(id, { type: 'like', likes: counts.likes, comments: counts.comments });
          }
        } else {
          liked = Storage.toggleLike(id);
          document.querySelectorAll(`[data-action="like"][data-id="${id}"]`).forEach(b => {
            b.classList.toggle('active', liked);
          });
        }
        if (liked) Storage.incrementAnalytics('likes');
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
        const eventId = parseInt(btn.dataset.eventId);
        Storage.registerEvent(eventId);
        if (btn.dataset.live === '1') {
          Router.go(`/mushaira/live/${eventId}`);
        } else {
          Components.showToast('Successfully registered!');
          Router.navigate();
        }
      };
    });

    document.querySelectorAll('.create-mushaira-btn').forEach(btn => {
      btn.onclick = () => Pages.showCreateMushairaModal();
    });

    // Voice rooms list — join navigates to live room (handled by join-room-btn)
    document.querySelectorAll('.join-room-btn').forEach(btn => {
      btn.onclick = () => {
        const roomId = parseInt(btn.dataset.roomId);
        Storage.joinRoom(roomId);
        Router.go(`/voice-rooms/${roomId}`);
      };
    });

    const createRoomBtn = document.getElementById('create-room-btn');
    if (createRoomBtn) {
      createRoomBtn.onclick = () => {
        Components.showModal('Create Voice Room', `
          <form id="create-room-form">
            <div class="form-group"><label>Room Title</label><input type="text" name="title" required></div>
            <div class="form-group"><label>Description</label><input type="text" name="desc" placeholder="Optional topic"></div>
          </form>
        `, '<button class="btn btn-gold" id="submit-room">Create Room</button>');
        document.getElementById('submit-room').onclick = async () => {
          const form = document.getElementById('create-room-form');
          const title = form?.title?.value?.trim();
          if (!title) return;
          if (Auth.isGuest()) {
            Components.showToast('Please sign in to create rooms', 'error');
            return;
          }
          const submitBtn = document.getElementById('submit-room');
          if (submitBtn) { submitBtn.disabled = true; submitBtn.textContent = 'Creating...'; }

          const desc = form.desc?.value?.trim() || '';
          let room = null;

          if (SupabaseClient.isEnabled()) {
            room = await API.createVoiceRoom({ title, desc });
            if (!room) {
              Components.showToast('Could not create room online. Run supabase/mushaira-events.sql in Supabase.', 'error');
              if (submitBtn) { submitBtn.disabled = false; submitBtn.textContent = 'Create Room'; }
              return;
            }
            window.REMOTE_VOICE_ROOMS = [room, ...(window.REMOTE_VOICE_ROOMS || [])];
          } else {
            const user = Auth.getCurrentUser();
            room = Storage.addCustomRoom({
              id: Date.now(),
              title,
              host: user.name || 'You',
              participants: 1,
              active: true,
              premium: false,
              desc
            });
          }

          if (submitBtn) { submitBtn.disabled = false; submitBtn.textContent = 'Create Room'; }
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
      chatForm.onsubmit = async (e) => {
        e.preventDefault();
        if (!Auth.canMessage()) {
          Components.showToast('Please login to send messages', 'error');
          return;
        }
        const input = chatForm.querySelector('input');
        const text = input.value.trim();
        if (!text) return;

        const conversationId = chatForm.dataset.conversationId;
        if (conversationId && SupabaseClient.isEnabled()) {
          const msg = await API.sendMessage(parseInt(conversationId), text);
          if (!msg) {
            Components.showToast('Failed to send message', 'error');
            return;
          }
          input.value = '';
          Realtime.appendChatMessage(msg);
          return;
        }

        const chatId = parseInt(chatForm.dataset.chatId);
        Storage.addMessage(chatId, text);
        input.value = '';
        Router.navigate();
      };
    }

    // Comment form
    const commentForm = document.getElementById('comment-form');
    if (commentForm) {
      commentForm.onsubmit = async (e) => {
        e.preventDefault();
        if (!Auth.isLoggedIn() || Auth.isGuest()) {
          Components.showToast('Please sign in to comment', 'error');
          return;
        }
        const poemId = parseInt(commentForm.dataset.poemId);
        const input = commentForm.querySelector('input');
        const text = input.value.trim();
        if (!text) return;

        const user = Auth.getCurrentUser();
        const tempId = `temp-${Date.now()}`;
        const optimistic = { id: tempId, user: user.name, text, time: 'Just now' };

        document.querySelector('.comments-empty')?.remove();
        document.querySelector('.comments-list .loading-inline')?.remove();
        Realtime.appendComment(optimistic);
        Realtime.bumpCommentCount(poemId);
        input.value = '';

        const comment = await API.postComment(poemId, text);
        if (!comment) {
          document.querySelector(`[data-comment-id="${tempId}"]`)?.remove();
          Realtime.bumpCommentCount(poemId, -1);
          Components.showToast('Failed to post comment', 'error');
          return;
        }

        const tempEl = document.querySelector(`[data-comment-id="${tempId}"]`);
        if (tempEl && comment.id !== tempId) {
          tempEl.dataset.commentId = comment.id;
          tempEl.querySelector('.comment-time').textContent = comment.time;
        }
        Realtime._knownCommentIds.add(String(comment.id));
        await Realtime.broadcastPoemUpdate(poemId, { type: 'comment' });
        Storage.incrementAnalytics('comments');
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

    document.querySelectorAll('.message-poet-btn').forEach(btn => {
      btn.onclick = async () => {
        const convId = await API.getOrCreateConversation(btn.dataset.userId);
        if (convId) Router.go(`/messages/${convId}`);
        else Components.showToast('Could not start conversation', 'error');
      };
    });

    this.bindPageRealtime();
  },

  bindPageRealtime() {
    if (typeof Realtime === 'undefined') return;

    const poemSection = document.querySelector('.comments-section[data-poem-id]');
    if (poemSection) {
      const poemId = parseInt(poemSection.dataset.poemId);
      Realtime.loadComments(poemId);
      if (SupabaseClient.isEnabled() && Auth.isLoggedIn() && !Auth.isGuest()) {
        Realtime.subscribePoem(poemId);
      }
    } else {
      Realtime.unsubscribePoem();
    }

    const notifList = document.getElementById('notifications-list');
    if (notifList) Realtime.loadNotifications(true);

    const dashNotif = document.getElementById('dashboard-notifications');
    if (dashNotif) Realtime.loadDashboardNotifications();

    const mushairaMount = document.getElementById('mushaira-live-mount');
    if (mushairaMount && typeof MushairaEvents !== 'undefined') {
      MushairaEvents.initLivePage(mushairaMount.dataset.eventId);
    }

    if (document.getElementById('mushaira-events-root') && typeof MushairaEvents !== 'undefined') {
      MushairaEvents.initPage();
    }

    if (document.getElementById('voice-rooms-grid') && typeof VoiceRoomsList !== 'undefined') {
      VoiceRoomsList.initPage();
    }

    if (typeof MushairaEvents !== 'undefined') {
      MushairaEvents.updateLiveUI();
    }

    const liveRoom = document.querySelector('.live-room-page');
    if (liveRoom && typeof VoiceRoomLive !== 'undefined') {
      VoiceRoomLive.init({
        roomKey: liveRoom.dataset.roomKey,
        roomId: liveRoom.dataset.roomId,
        title: liveRoom.dataset.roomTitle,
        host: liveRoom.dataset.roomHost,
        hostOwnerId: liveRoom.dataset.hostOwnerId || null,
        maxSeats: parseInt(liveRoom.dataset.maxSeats, 10) || undefined,
        leavePath: liveRoom.dataset.leavePath || '/voice-rooms'
      });
      document.getElementById('live-chat-toggle-mobile')?.addEventListener('click', () => {
        document.querySelector('.live-v2-chat-card')?.classList.toggle('mobile-open');
        document.querySelector('.live-room-chat-panel')?.classList.toggle('mobile-open');
      });
    } else if (typeof VoiceRoomLive !== 'undefined') {
      VoiceRoomLive.destroy();
    }

    if (!SupabaseClient.isEnabled() || !Auth.isLoggedIn() || Auth.isGuest()) return;

    const chatList = document.getElementById('chat-list');
    if (chatList) Realtime.loadConversations();

    const chatView = document.querySelector('.chat-view[data-conversation-id]');
    if (chatView) {
      const convId = parseInt(chatView.dataset.conversationId);
      Realtime.loadChatThread(convId);
      API.getConversations().then(convs => {
        const conv = convs?.find(c => c.id === convId);
        const header = document.getElementById('chat-header-user');
        if (conv && header) {
          header.innerHTML = `
            <div class="chat-avatar-wrap" data-online-user="${conv.otherUserId}">
              ${avatarImg(conv.user, '', conv.user)}
              <span class="online-dot ${Realtime.isUserOnline(conv.otherUserId) ? 'online' : 'offline'}"></span>
            </div>
            <div>
              <h2>${conv.user}</h2>
              <span class="presence-label ${Realtime.isUserOnline(conv.otherUserId) ? 'online' : 'offline'}">
                ${Realtime.isUserOnline(conv.otherUserId) ? 'Online' : 'Offline'}
              </span>
            </div>
          `;
        }
      });
    } else {
      Realtime.unsubscribeConversation();
    }

    const userSearch = document.getElementById('user-search');
    if (userSearch) {
      let timer;
      userSearch.oninput = () => {
        clearTimeout(timer);
        timer = setTimeout(async () => {
          const results = document.getElementById('user-search-results');
          const q = userSearch.value.trim();
          if (!q || q.length < 2) {
            results.innerHTML = '<p class="empty-state">Type at least 2 characters to search.</p>';
            return;
          }
          const users = await API.searchProfiles(q);
          if (!users.length) {
            results.innerHTML = '<p class="empty-state">No users found.</p>';
            return;
          }
          results.innerHTML = users.map(u => `
            <button type="button" class="user-search-item" data-user-id="${u.id}">
              ${avatarImg(u.name, '', u.name)}
              <div>
                <strong>${u.name}</strong>
                ${u.username ? `<span>@${u.username}</span>` : ''}
              </div>
            </button>
          `).join('');
          results.querySelectorAll('.user-search-item').forEach(btn => {
            btn.onclick = async () => {
              const convId = await API.getOrCreateConversation(btn.dataset.userId);
              if (convId) Router.go(`/messages/${convId}`);
              else Components.showToast('Could not start conversation', 'error');
            };
          });
        }, 300);
      };
    }
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
