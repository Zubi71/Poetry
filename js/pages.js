const Pages = {
  home(params, query) {
    Storage.processScheduledPosts();
    const tab = query.tab || 'foryou';
    const allPoems = getAllPoems();
    let poems;
    if (tab === 'trending') poems = allPoems.filter(p => p.trending);
    else if (tab === 'latest') poems = allPoems.slice(0, 15);
    else if (tab === 'following') {
      const following = Storage.getFollowing();
      poems = following.length ? allPoems.filter(p => following.includes(p.poetId)) : allPoems.slice(0, 5);
    } else poems = allPoems.slice(0, 10);

    const content = `
      ${Components.renderGuestBanner()}
      <div id="home-mushaira-live-root"></div>
      <div class="feed-tabs">
        <a href="#/?tab=foryou" class="feed-tab ${tab === 'foryou' ? 'active' : ''}">For You</a>
        <a href="#/?tab=trending" class="feed-tab ${tab === 'trending' ? 'active' : ''}">Trending</a>
        <a href="#/?tab=latest" class="feed-tab ${tab === 'latest' ? 'active' : ''}">Latest</a>
        <a href="#/?tab=following" class="feed-tab ${tab === 'following' ? 'active' : ''}">Following</a>
      </div>
      <div class="poem-feed">
        ${poems.map((p, i) => (i === 3 ? Components.renderFeedAd() + Components.renderPoemCard(p) : Components.renderPoemCard(p))).join('')}
      </div>
      <div class="load-more-wrap">
        <a href="#/poems" class="btn btn-outline-gold">Load More</a>
      </div>
    `;
    return Components.renderAppLayout(content);
  },

  poems(params, query) {
    let poems = [...getAllPoems()];
    const filter = query.filter || (query.trending ? 'trending' : 'all');
    const search = query.q || '';
    const category = query.category || '';

    if (filter === 'trending' || query.trending) poems = getTrendingPoems();
    else if (filter === 'latest') poems = getLatestPoems();
    if (category) poems = poems.filter(p => p.category === category);
    if (search) poems = searchPoems(search);

    const content = `
      <div class="page-header">
        <h1>All Poems</h1>
        <p>Browse our complete collection of Urdu poetry</p>
      </div>
      <div class="filters-bar">
        <form class="search-form" id="poems-search-form">
          <input type="search" name="q" placeholder="Search poems..." value="${search}">
          <button type="submit" class="btn btn-gold">Search</button>
        </form>
        <div class="filter-tabs">
          <a href="#/poems" class="filter-tab ${filter === 'all' && !category ? 'active' : ''}">All</a>
          <a href="#/poems?trending=1" class="filter-tab ${filter === 'trending' ? 'active' : ''}">Trending</a>
          <a href="#/poems?filter=latest" class="filter-tab ${filter === 'latest' ? 'active' : ''}">Latest</a>
        </div>
        <select id="category-filter" class="filter-select">
          <option value="">All Categories</option>
          ${APP_DATA.categories.map(c => `<option value="${c.id}" ${category === c.id ? 'selected' : ''}>${c.name}</option>`).join('')}
        </select>
      </div>
      <div class="poem-feed">
        ${poems.length ? poems.map(p => Components.renderPoemCard(p)).join('') : '<p class="empty-state">No poems found.</p>'}
      </div>
    `;
    return Components.renderAppLayout(content);
  },

  categories(params) {
    const categoryId = params.id;
    if (categoryId) {
      const category = getCategoryById(categoryId);
      const poems = getPoemsByCategory(categoryId);
      const content = `
        <div class="page-header">
          <a href="#/categories" class="back-link">${Components.icon('back')} Back to Categories</a>
          <h1>${category ? category.name : categoryId}</h1>
          <p class="urdu-text">${category ? category.urdu : ''}</p>
        </div>
        <div class="poem-feed">
          ${poems.length ? poems.map(p => Components.renderPoemCard(p)).join('') : '<p class="empty-state">No poems in this category yet.</p>'}
        </div>
      `;
      return Components.renderAppLayout(content);
    }

    const content = `
      <div class="page-header">
        <h1>Categories</h1>
        <p>Explore poetry by genre and mood</p>
      </div>
      <div class="categories-grid">
        ${APP_DATA.categories.map(c => `
          <a href="#/categories/${c.id}" class="category-card" style="--cat-color:${c.color}">
            <span class="cat-icon">${c.icon}</span>
            <span class="cat-name">${c.name}</span>
            <span class="cat-urdu urdu-text">${c.urdu}</span>
            <span class="cat-count">${getPoemsByCategory(c.id).length} poems</span>
          </a>
        `).join('')}
      </div>
    `;
    return Components.renderAppLayout(content);
  },

  poets(params, query) {
    const search = query.q || '';
    let poets = search ? searchPoets(search) : APP_DATA.poets;

    const content = `
      <div class="page-header">
        <h1>Poet Directory</h1>
        <p>Discover talented Urdu poets</p>
      </div>
      <form class="search-form" id="poets-search-form">
        <input type="search" name="q" placeholder="Search poets..." value="${search}">
        <button type="submit" class="btn btn-gold">Search</button>
      </form>
      <div class="poets-grid">
        ${poets.map(poet => {
          const following = Storage.isFollowing(poet.id);
          return `
            <div class="poet-card">
              <a href="#/poet/${poet.id}">
                ${avatarImg(poet.name, '', poet.name)}
                <h3>${poet.name} ${poet.verified ? '✓' : ''}</h3>
                <p>${poet.bio}</p>
                <span class="follower-count">${Components.formatNumber(poet.followers)} followers</span>
              </a>
              <button class="btn ${following ? 'btn-outline-gold' : 'btn-gold'} btn-sm follow-btn" data-poet-id="${poet.id}">
                ${following ? 'Following' : 'Follow'}
              </button>
            </div>
          `;
        }).join('')}
      </div>
    `;
    return Components.renderAppLayout(content);
  },

  poetProfile(params, query) {
    const poet = getPoetById(params.id);
    if (!poet) return Components.renderAppLayout('<p class="empty-state">Poet not found.</p>');

    if (Auth.isGuest() && !Auth.canVisitProfile()) {
      Components.showGuestLimitModal();
    }

    const tab = query.tab || 'poems';
    const poems = getPoemsByPoet(poet.id);
    const following = Storage.isFollowing(poet.id);
    const bookmarkedPoems = Storage.getBookmarks().map(id => getPoemById(id)).filter(Boolean);
    const likedPoems = Storage.getLikes().map(id => getPoemById(id)).filter(p => p && p.poetId === poet.id);

    let tabContent;
    if (tab === 'starred') {
      tabContent = bookmarkedPoems.length
        ? bookmarkedPoems.map(p => Components.renderProfilePoemCard(p)).join('')
        : '<p class="empty-state">No starred poems yet.</p>';
    } else if (tab === 'likes') {
      tabContent = likedPoems.length
        ? likedPoems.map(p => Components.renderProfilePoemCard(p)).join('')
        : '<p class="empty-state">No likes yet.</p>';
    } else {
      tabContent = poems.length
        ? poems.map(p => Components.renderProfilePoemCard(p)).join('')
        : '<p class="empty-state">No poems yet.</p>';
    }

    const totalHearts = poems.reduce((sum, p) => sum + (p.likes || 0), 0);
    const totalComments = poems.reduce((sum, p) => sum + (p.comments || 0), 0);
    const totalShares = poems.reduce((sum, p) => sum + (p.shares || 0), 0);
    const username = poet.name.toLowerCase().replace(/\s+/g, '');

    const actionsHtml = `
      <button class="profile-v2-btn profile-v2-btn-primary btn ${following ? 'btn-outline-gold' : 'btn-gold'} follow-btn" data-poet-id="${poet.id}">
        ${following ? 'Following' : 'Follow'}
      </button>
      <a href="#/messages" class="profile-v2-btn btn btn-outline-gold">Message</a>
    `;

    const content = Components.renderUserProfile({
      user: { name: poet.name, verified: poet.verified },
      username,
      bio: poet.bio,
      isOwn: false,
      profilePath: `#/poet/${poet.id}`,
      sharePath: `${location.origin}${location.pathname}#/poet/${poet.id}`,
      followers: poet.followers || 0,
      following: poet.following || 0,
      poemCount: poet.posts || poems.length,
      activity: { hearts: totalHearts, comments: totalComments, shares: totalShares },
      tabs: [
        { label: 'Poems', href: `#/poet/${poet.id}?tab=poems`, active: tab === 'poems' },
        { label: 'Likes', href: `#/poet/${poet.id}?tab=likes`, active: tab === 'likes' },
        { label: 'Starred', href: `#/poet/${poet.id}?tab=starred`, active: tab === 'starred' }
      ],
      tabContent,
      actionsHtml
    });

    return Components.renderAppLayout(content, { noSidebar: true });
  },

  poemDetail(params) {
    const poem = getPoemById(params.id);
    if (!poem) return Components.renderAppLayout('<p class="empty-state">Poem not found.</p>');

    if (!Auth.tryAccessPoem(poem.id)) {
      return Components.renderAppLayout(`
        ${Components.renderGuestBanner()}
        <div class="poem-detail poem-locked">
          <a href="#/" class="back-link">${Components.icon('back')} Back to Home</a>
          <div class="empty-state">
            <h2>Register to read more</h2>
            <p class="urdu-text">${APP_DATA.guestLimitPromptUrdu}</p>
            <p>${APP_DATA.guestLimitPromptEn}</p>
            <a href="#/register" class="btn btn-gold">Create Free Account</a>
            <a href="#/login" class="btn btn-outline-gold">Sign In</a>
          </div>
        </div>
      `);
    }

    const poet = getPoetById(poem.poetId);
    const category = getCategoryById(poem.category);
    const liked = Storage.isLiked(poem.id);
    const bookmarked = Storage.isBookmarked(poem.id);
    const tagLabel = poem.tagLabel || (category ? category.name : poem.category);

    const content = `
      <div class="poem-detail" data-poem-id="${poem.id}">
        <a href="#/poems" class="back-link">${Components.icon('back')} Back to Poems</a>
        <div class="poem-detail-header">
          <a href="${poet ? `#/poet/${poem.poetId}` : '#/dashboard'}" class="poet-info">
            ${avatarImg(poem.poetName, '', poem.poetName)}
            <div>
              <span class="poet-name">${poem.poetName}</span>
              <span class="post-time">${poem.time}</span>
            </div>
          </a>
          <span class="category-badge" style="background:${category ? category.color : '#D4AF37'}">${tagLabel}</span>
          ${poem.ownerId && Auth.getCurrentUser()?.id && poem.ownerId !== Auth.getCurrentUser().id && SupabaseClient.isEnabled() ? `
            <button type="button" class="btn btn-outline-gold btn-sm message-poet-btn" data-user-id="${poem.ownerId}">Message</button>
          ` : ''}
        </div>
        <div class="poem-detail-content poem-card-${poem.cardTheme || 'classic-dark'}">
          ${formatPoemHtml(poem.text, poem.cardTheme)}
          ${poem.english ? `<p class="english-text">${poem.english}</p>` : ''}
        </div>
        <div class="poem-actions poem-actions-bar">
          <button class="action-btn like-btn ${liked ? 'active' : ''}" data-action="like" data-id="${poem.id}">
            ${Components.icon('heart')} <span>${Components.formatNumber(poem.likes || 0)}</span>
          </button>
          <span class="action-divider"></span>
          <span class="action-btn comment-count">${Components.icon('comment')} <span>${poem.comments}</span></span>
          <span class="action-divider"></span>
          <button class="action-btn share-btn" data-action="share" data-id="${poem.id}">${Components.icon('share')} Share</button>
          <span class="action-divider"></span>
          <button class="action-btn bookmark-btn ${bookmarked ? 'active' : ''}" data-action="bookmark" data-id="${poem.id}">
            ${Components.icon('bookmarks')} ${bookmarked ? 'Saved' : 'Save'}
          </button>
          <span class="action-divider"></span>
          <button class="action-btn download-btn" data-action="download" data-id="${poem.id}">⬇️ Download</button>
          <button class="action-btn report-btn" data-type="post" data-id="${poem.id}">🚩 Report</button>
        </div>
        <section class="comments-section" data-poem-id="${poem.id}">
          <h3>Comments (${poem.comments})</h3>
          ${Auth.isLoggedIn() && !Auth.isGuest() ? `
          <form class="comment-form" id="comment-form" data-poem-id="${poem.id}">
            <input type="text" placeholder="Write a comment..." required maxlength="500">
            <button type="submit" class="btn btn-gold">Post</button>
          </form>
          ` : '<p class="comment-login-hint"><a href="#/login">Sign in</a> to comment.</p>'}
          <div class="comments-list" id="comments-list">
            <p class="loading-inline">Loading comments...</p>
          </div>
        </section>
      </div>
    `;
    return Components.renderAppLayout(content);
  },

  topPoets(params, query) {
    const period = query.period || 'weekly';
    const poets = getTopPoets(period);
    const trophies = ['🥇', '🥈', '🥉'];

    const content = `
      <div class="page-header">
        <h1>Top Poets</h1>
        <p>Rankings of the most popular poets</p>
      </div>
      <div class="period-tabs">
        <a href="#/top-poets?period=weekly" class="period-tab ${period === 'weekly' ? 'active' : ''}">Weekly</a>
        <a href="#/top-poets?period=monthly" class="period-tab ${period === 'monthly' ? 'active' : ''}">Monthly</a>
        <a href="#/top-poets?period=alltime" class="period-tab ${period === 'alltime' ? 'active' : ''}">All-Time</a>
      </div>
      <div class="podium">
        ${poets.slice(0, 3).map((p, i) => `
          <a href="#/poet/${p.id}" class="podium-item rank-${i + 1}">
            <span class="trophy">${trophies[i]}</span>
            ${avatarImg(p.name, '', p.name)}
            <h3>${p.name}</h3>
            <span>${Components.formatNumber(p.followers)} pts</span>
          </a>
        `).join('')}
      </div>
      <div class="rankings-list">
        ${poets.slice(3).map((p, i) => `
          <a href="#/poet/${p.id}" class="ranking-item">
            <span class="rank">${i + 4}</span>
            ${avatarImg(p.name, '', p.name)}
            <span class="name">${p.name}</span>
            <span class="points">${Components.formatNumber(p.followers)} pts</span>
          </a>
        `).join('')}
      </div>
    `;
    return Components.renderAppLayout(content);
  },

  mushaira(params, query) {
    const tab = query.tab || 'live';
    const user = Auth.getCurrentUser();
    const unread = Storage.getNotifications().filter(n => !n.read).length;

    const content = `
      <div class="mushaira-v2">
        <header class="mushaira-v2-header">
          <div class="mushaira-v2-brand">
            <span class="mushaira-v2-logo">${Components.icon('voice')}</span>
            <div>
              <h1>Live Mushaira</h1>
              <p class="mushaira-v2-tagline urdu-text">شبوں کی محفل، دلوں کا سنگم</p>
            </div>
          </div>
          <div class="mushaira-v2-header-actions">
            <a href="#/poems" class="mushaira-v2-icon-btn" aria-label="Search">${Components.icon('search')}</a>
            <a href="#/notifications" class="mushaira-v2-icon-btn mushaira-v2-notif" aria-label="Notifications">
              ${Components.icon('bell')}
              ${unread ? `<span class="mushaira-v2-badge">${unread > 9 ? '9+' : unread}</span>` : ''}
            </a>
            <a href="#/dashboard" class="mushaira-v2-avatar-link">${avatarImg(user.name, 'mushaira-v2-avatar', user.name)}</a>
          </div>
        </header>

        <nav class="mushaira-v2-tabs" aria-label="Mushaira sections">
          <a href="#/mushaira?tab=live" class="mushaira-v2-tab ${tab === 'live' ? 'active' : ''}">Live Now</a>
          <a href="#/mushaira?tab=schedule" class="mushaira-v2-tab ${tab === 'schedule' ? 'active' : ''}">Schedule</a>
          <a href="#/mushaira?tab=ended" class="mushaira-v2-tab ${tab === 'ended' ? 'active' : ''}">Ended</a>
        </nav>

        <div id="mushaira-events-root" data-tab="${tab}" data-schedule-filter="${query.filter || 'all'}" data-ended-filter="${query.efilter || 'all'}">
          <p class="loading-inline">Loading events...</p>
        </div>

        <button type="button" class="mushaira-v2-create create-mushaira-btn" aria-label="Create event">+</button>
      </div>
    `;
    return Components.renderAppLayout(content, { noSidebar: true });
  },

  showCreateMushairaModal() {
    Components.showModal('Create Mushaira Event', `
      <form id="create-mushaira-form">
        <div class="form-group"><label>Event Title</label><input type="text" name="title" required placeholder="e.g. Friday Night Mushaira"></div>
        <div class="form-group"><label>Location</label><input type="text" name="location" placeholder="City, Country"></div>
      </form>
    `, '<button type="button" class="btn btn-gold" id="submit-mushaira">Start Live Event</button>');
    document.getElementById('submit-mushaira').onclick = async () => {
      const form = document.getElementById('create-mushaira-form');
      const title = form?.title?.value?.trim();
      if (!title) return;
      if (Auth.isGuest()) {
        Components.showToast('Please sign in to create events', 'error');
        return;
      }
      const btn = document.getElementById('submit-mushaira');
      if (btn) { btn.disabled = true; btn.textContent = 'Creating...'; }

      const location = form.location?.value?.trim() || 'Online';
      let event = null;

      if (SupabaseClient.isEnabled()) {
        event = await API.createMushairaEvent({ title, location, live: true });
        if (!event) {
          Components.showToast('Could not create event online. Run supabase/mushaira-events.sql in Supabase.', 'error');
          if (btn) { btn.disabled = false; btn.textContent = 'Start Live Event'; }
          return;
        }
        window.REMOTE_MUSHAIRA_EVENTS = [event, ...(window.REMOTE_MUSHAIRA_EVENTS || [])];
        if (typeof MushairaEvents !== 'undefined') MushairaEvents.updateLiveUI();
      } else {
        const user = Auth.getCurrentUser();
        event = {
          id: Date.now(),
          title,
          date: new Date().toLocaleDateString(),
          time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
          location,
          live: true,
          registered: 1,
          host: user.name || 'You'
        };
        Storage.addCustomMushaira(event);
        if (typeof MushairaEvents !== 'undefined') MushairaEvents.updateLiveUI();
      }

      if (btn) { btn.disabled = false; btn.textContent = 'Start Live Event'; }
      Components.closeModal();
      Router.go(`/mushaira/live/${event.id}`);
    };
  },

  mushairaLive(params) {
    const content = `
      <div id="mushaira-live-mount" data-event-id="${params.id}">
        <p class="loading-inline">Joining event...</p>
      </div>
    `;
    return Components.renderAppLayout(content, { noSidebar: true, liveRoom: true });
  },

  voiceRooms(params) {
    if (params.id) {
      const roomId = parseInt(params.id);
      const room = getVoiceRoomById(roomId);
      if (!room) {
        return Components.renderAppLayout('<div class="page-header"><h1>Room not found</h1><a href="#/voice-rooms" class="btn btn-gold">Back to Rooms</a></div>');
      }
      Storage.joinRoom(roomId);
      const content = renderLiveRoomView({
        roomKey: `room-${roomId}`,
        roomId: roomId,
        title: room.title,
        host: room.host,
        hostOwnerId: room.ownerId || '',
        maxSeats: LIVE_ROOM.VOICE_ROOM_SEATS,
        backPath: '#/voice-rooms',
        leavePath: '/voice-rooms'
      });
      return Components.renderAppLayout(content, { noSidebar: true, liveRoom: true });
    }

    const joined = Storage.getJoinedRooms();
    const content = `
      <div class="page-header">
        <h1>Voice Chat Rooms</h1>
        <p>Join live poetry discussions — new rooms appear instantly for everyone</p>
        <button class="btn btn-gold" id="create-room-btn">Create Room</button>
      </div>
      <div class="rooms-grid" id="voice-rooms-grid">
        <p class="loading-inline">Loading rooms...</p>
      </div>
    `;
    return Components.renderAppLayout(content);
  },

  contests(params) {
    const active = APP_DATA.contests.filter(c => c.status === 'active');
    const completed = APP_DATA.contests.filter(c => c.status === 'completed');
    const entries = Storage.getContestEntries();

    const content = `
      <div class="page-header">
        <h1>Poetry Contests</h1>
        <p>Compete and showcase your talent</p>
      </div>
      <section class="contests-section">
        <h2>Active Contests</h2>
        ${active.map(contest => `
          <div class="contest-card content-card-v2">
            <div class="contest-info">
              <h3>${contest.title}</h3>
              <p>Prize: ${contest.prize} · Deadline: ${contest.deadline}</p>
              <p>${contest.entries} entries</p>
            </div>
            <button class="btn btn-gold submit-contest-btn" data-contest-id="${contest.id}">Submit Poetry</button>
          </div>
        `).join('')}
      </section>
      <section class="contests-section">
        <h2>Winners</h2>
        ${completed.map(contest => `
          <div class="contest-card completed">
            <h3>${contest.title}</h3>
            <p>🏆 Winner: ${contest.winner} · Prize: ${contest.prize}</p>
          </div>
        `).join('')}
      </section>
      ${entries.length ? `
        <section class="contests-section">
          <h2>Your Submissions</h2>
          ${entries.map(e => `<div class="contest-entry"><p>${e.poemText.substring(0, 100)}...</p><small>${new Date(e.date).toLocaleDateString()}</small></div>`).join('')}
        </section>
      ` : ''}
    `;
    return Components.renderAppLayout(content);
  },

  messages(params) {
    const chatId = params.id;

    if (chatId === 'new') {
      const content = `
        <div class="page-header">
          <a href="#/messages" class="back-link">${Components.icon('back')} Messages</a>
          <h1>New Message</h1>
        </div>
        <div class="search-form">
          <input type="search" placeholder="Search users by name or username..." id="user-search" autofocus>
        </div>
        <div class="user-search-results" id="user-search-results">
          <p class="empty-state">Type to find someone to message.</p>
        </div>
      `;
      return Components.renderAppLayout(content, { noSidebar: true });
    }

    if (chatId && SupabaseClient.isEnabled() && Auth.isLoggedIn() && !Auth.isGuest()) {
      const content = `
        <div class="chat-view" data-conversation-id="${chatId}">
          <div class="chat-header">
            <a href="#/messages" class="back-link">${Components.icon('back')}</a>
            <div class="chat-header-user" id="chat-header-user">
              <span class="loading-inline">Loading...</span>
            </div>
          </div>
          <div class="chat-messages" id="chat-messages">
            <p class="loading-inline">Loading messages...</p>
          </div>
          <form class="chat-input" id="chat-form" data-conversation-id="${chatId}">
            <input type="text" placeholder="Type a message..." required maxlength="1000">
            <button type="submit" class="btn btn-gold">Send</button>
          </form>
        </div>
      `;
      return Components.renderAppLayout(content, { noSidebar: true });
    }

    if (chatId) {
      const chat = APP_DATA.sampleChats.find(c => c.id === parseInt(chatId));
      const messages = [...(APP_DATA.chatMessages[chatId] || []), ...Storage.getMessages().filter(m => m.chatId === parseInt(chatId))];
      const content = `
        <div class="chat-view">
          <div class="chat-header">
            <a href="#/messages" class="back-link">${Components.icon('back')}</a>
            ${chat ? avatarImg(chat.user, '', chat.user) : avatarImg('User')}
            <h2>${chat ? chat.user : 'Chat'}</h2>
          </div>
          <div class="chat-messages" id="chat-messages">
            ${messages.map(m => `
              <div class="chat-message ${m.from === 'me' ? 'sent' : 'received'}">
                <p>${m.text}</p>
                <span>${m.time}</span>
              </div>
            `).join('')}
          </div>
          <form class="chat-input" id="chat-form" data-chat-id="${chatId}">
            <input type="text" placeholder="Type a message..." required>
            <button type="submit" class="btn btn-gold">Send</button>
          </form>
        </div>
      `;
      return Components.renderAppLayout(content, { noSidebar: true });
    }

    const useLive = SupabaseClient.isEnabled() && Auth.isLoggedIn() && !Auth.isGuest();
    const content = `
      <div class="page-header">
        <h1>Messages</h1>
        ${useLive ? '<a href="#/messages/new" class="btn btn-gold btn-sm">New Message</a>' : ''}
      </div>
      <div class="search-form">
        <input type="search" placeholder="Search messages..." id="message-search">
      </div>
      <div class="chat-list" id="chat-list">
        ${useLive ? '<p class="loading-inline">Loading conversations...</p>' : APP_DATA.sampleChats.map(chat => `
          <a href="#/messages/${chat.id}" class="chat-item">
            ${avatarImg(chat.user, '', chat.user)}
            <div class="chat-item-info">
              <div class="chat-item-header">
                <strong>${chat.user}</strong>
                <span>${chat.time}</span>
              </div>
              <p>${chat.lastMessage}</p>
            </div>
            ${chat.unread ? `<span class="unread-badge">${chat.unread}</span>` : ''}
          </a>
        `).join('')}
      </div>
    `;
    return Components.renderAppLayout(content);
  },

  notifications() {
    const useLive = SupabaseClient.isEnabled() && Auth.isLoggedIn() && !Auth.isGuest();
    if (!useLive) Storage.markNotificationsRead();
    const notifications = useLive ? [] : Storage.getNotifications();
    const content = `
      <div class="page-header">
        <h1>Notifications</h1>
      </div>
      <div class="notifications-list" id="notifications-list">
        ${useLive ? '<p class="loading-inline">Loading notifications...</p>' : notifications.map(n => {
          const link = n.poemId ? `#/poem/${n.poemId}` : '#';
          return `
          <a href="${link}" class="notification-item ${n.read ? '' : 'unread'} type-${n.type}">
            <span class="notif-icon">${n.type === 'like' ? '❤️' : n.type === 'comment' ? '💬' : n.type === 'follow' ? '👤' : '📅'}</span>
            <div>
              <p>${n.text}</p>
              <span class="notif-time">${n.time}</span>
            </div>
          </a>`;
        }).join('')}
      </div>
    `;
    return Components.renderAppLayout(content);
  },

  bookmarks() {
    const bookmarkIds = Storage.getBookmarks();
    const poems = bookmarkIds.map(id => getPoemById(id)).filter(Boolean);
    const content = `
      <div class="page-header">
        <h1>Bookmarks</h1>
        <p>${poems.length} saved poems</p>
      </div>
      <div class="poem-feed">
        ${poems.length ? poems.map(p => Components.renderPoemCard(p)).join('') : '<p class="empty-state">No bookmarks yet. Save poems to read later!</p>'}
      </div>
    `;
    return Components.renderAppLayout(content);
  },

  history() {
    const historyIds = Storage.getHistory();
    const poems = historyIds.map(id => getPoemById(id)).filter(Boolean);
    const content = `
      <div class="page-header">
        <h1>Reading History</h1>
        <p>Recently read poems</p>
      </div>
      <div class="poem-feed">
        ${poems.length ? poems.map(p => Components.renderPoemCard(p)).join('') : '<p class="empty-state">No reading history yet.</p>'}
      </div>
    `;
    return Components.renderAppLayout(content);
  },

  settings() {
    const settings = Storage.getSettings();
    const user = Auth.getCurrentUser();
    const content = `
      <div class="page-header">
        <h1>Settings</h1>
      </div>
      <div class="settings-sections">
        <section class="settings-section">
          <h2>Quick Links</h2>
          <div class="quick-links">
            <a href="#/dashboard" class="btn btn-outline-gold">My Dashboard</a>
            <a href="#/settings" class="btn btn-outline-gold">Account Settings</a>
            ${Auth.isAdmin() ? '<a href="#/admin" class="btn btn-gold">Admin Panel</a>' : ''}
          </div>
        </section>
        <section class="settings-section">
          <h2>Account Settings</h2>
          <form id="account-form" class="settings-form">
            <div class="form-group">
              <label>Name</label>
              <input type="text" name="name" value="${user.name || ''}">
            </div>
            <div class="form-group">
              <label>Email</label>
              <input type="email" name="email" value="${user.email || ''}" ${user.isGuest ? 'disabled' : ''}>
            </div>
            <button type="submit" class="btn btn-gold">Save Changes</button>
          </form>
        </section>
        <section class="settings-section">
          <h2>Privacy</h2>
          <form id="privacy-form" class="settings-form">
            <div class="form-group">
              <label>Profile Visibility</label>
              <select name="privacy">
                <option value="public" ${settings.privacy === 'public' ? 'selected' : ''}>Public</option>
                <option value="private" ${settings.privacy === 'private' ? 'selected' : ''}>Private</option>
              </select>
            </div>
            <button type="submit" class="btn btn-gold">Save Privacy</button>
          </form>
        </section>
        <section class="settings-section">
          <h2>Change Password</h2>
          <form id="password-form" class="settings-form">
            <div class="form-group">
              <label>Current Password</label>
              <input type="password" name="current">
            </div>
            <div class="form-group">
              <label>New Password</label>
              <input type="password" name="new" minlength="8">
            </div>
            <button type="submit" class="btn btn-gold">Update Password</button>
          </form>
        </section>
        <section class="settings-section">
          <h2>Language</h2>
          <form id="language-form" class="settings-form">
            <div class="form-group">
              <select name="language">
                <option value="en" ${settings.language === 'en' ? 'selected' : ''}>English</option>
                <option value="ur" ${settings.language === 'ur' ? 'selected' : ''}>Urdu</option>
                <option value="both" ${settings.language === 'both' ? 'selected' : ''}>Both</option>
              </select>
            </div>
            <button type="submit" class="btn btn-gold">Save Language</button>
          </form>
        </section>
        <section class="settings-section">
          <h2>Community Guidelines</h2>
          <div class="guidelines">
            <p>Be respectful to all poets and readers. Do not post offensive content. Report violations. Support original poets.</p>
          </div>
        </section>
        <section class="settings-section">
          <h2>Account</h2>
          ${Auth.isLoggedIn() && !Auth.isGuest() ?
            '<button class="btn btn-outline-gold" id="logout-btn">Logout</button>' :
            '<a href="#/login" class="btn btn-gold">Login</a>'
          }
        </section>
      </div>
    `;
    return Components.renderAppLayout(content);
  },

  premium() {
    setTimeout(() => Router.go('/'), 0);
    return Components.renderAppLayout('<p class="empty-state">Redirecting...</p>');
  },

  login() {
    const content = `
      <div class="auth-container auth-modern">
        <div class="auth-card auth-modern-card">
          <a href="#/" class="auth-back" aria-label="Back">${Components.icon('back')}</a>
          <h1 class="auth-welcome">WELCOME BACK!</h1>
          <p class="auth-subtitle">Today is a new day. It's your day. You shape it. Sign in to start reading and sharing poetry.</p>
          <form id="login-form" class="auth-form auth-form-modern">
            <input type="text" name="email" required placeholder="Email address" autocomplete="username">
            <div class="password-field">
              <input type="password" name="password" required placeholder="Password" autocomplete="current-password">
              <button type="button" class="password-toggle" aria-label="Show password">${Components.icon('eye')}</button>
            </div>
            <a href="#/forgot-password" class="forgot-link-right">Forgot password?</a>
            <button type="submit" class="btn btn-gold btn-block auth-submit">Login</button>
          </form>
          <p class="auth-switch">Don't have an account? <a href="#/register">Sign Up</a></p>
          <div class="social-divider">Or continue with</div>
          ${Components.renderSocialAuthIcons()}
          <a href="#/" class="guest-link" id="guest-login">Continue browsing as guest</a>
        </div>
      </div>
    `;
    return Components.renderAppLayout(content, { authPage: true });
  },

  register() {
    const content = `
      <div class="auth-container auth-modern">
        <div class="auth-card auth-modern-card">
          <a href="#/login" class="auth-back" aria-label="Back">${Components.icon('back')}</a>
          <h1 class="auth-welcome">CREATE ACCOUNT</h1>
          <p class="auth-subtitle">Join our community of poets and poetry lovers. Share your verses with the world.</p>
          <form id="register-form" class="auth-form auth-form-modern">
            <input type="text" name="name" required placeholder="Full name">
            <input type="text" name="username" required pattern="[a-zA-Z0-9_]{3,20}" placeholder="Username" autocomplete="username">
            <input type="email" name="email" required placeholder="Email address" autocomplete="email">
            <div class="password-field">
              <input type="password" name="password" required minlength="8" placeholder="Password (min 8 characters)" autocomplete="new-password">
              <button type="button" class="password-toggle" aria-label="Show password">${Components.icon('eye')}</button>
            </div>
            <div class="password-field">
              <input type="password" name="confirm" required placeholder="Confirm password" autocomplete="new-password">
              <button type="button" class="password-toggle" aria-label="Show password">${Components.icon('eye')}</button>
            </div>
            <label class="checkbox-label">
              <input type="checkbox" required> I agree to the Terms & Conditions and Privacy Policy
            </label>
            <button type="submit" class="btn btn-gold btn-block auth-submit">Create Account</button>
          </form>
          <p class="auth-switch">Already have an account? <a href="#/login">Sign In</a></p>
          <div class="social-divider">Or continue with</div>
          ${Components.renderSocialAuthIcons()}
          <a href="#/" class="guest-link" id="guest-login">Continue browsing as guest</a>
        </div>
      </div>
    `;
    return Components.renderAppLayout(content, { authPage: true });
  },

  forgotPassword() {
    const content = `
      <div class="auth-container">
        <div class="auth-card auth-simple">
          <a href="#/login" class="back-link">${Components.icon('back')} Back</a>
          <div class="auth-icon">✉️</div>
          <h1>Forgot Password?</h1>
          <p>Enter your registered email. We'll send you a link to reset your password.</p>
          <form id="forgot-form" class="auth-form">
            <div class="form-group">
              <label>Email</label>
              <input type="email" name="email" required placeholder="Enter your email">
            </div>
            <button type="submit" class="btn btn-gold btn-block">Send Reset Link</button>
          </form>
          <p class="auth-footer-urdu urdu-text">ہم آپ کو آپ کے اکاؤنٹ تک واپس لانے میں مدد کریں گے</p>
        </div>
      </div>
    `;
    return Components.renderAppLayout(content, { authPage: true });
  },

  checkEmail() {
    const email = Auth.getResetEmail();
    const content = `
      <div class="auth-container">
        <div class="auth-card auth-simple">
          <a href="#/login" class="back-link">${Components.icon('back')} Back</a>
          <div class="auth-icon">📧</div>
          <h1>Check Your Email</h1>
          <p>We have sent a password reset link to <strong>${email}</strong>. Please check your inbox and follow the instructions.</p>
          <a href="#/reset-password" class="btn btn-gold btn-block">Continue to Reset</a>
          <p class="auth-footer-urdu urdu-text">براہ کرم اپنا سپام فولڈر چیک کریں اگر آپ کو ای میل نظر نہیں آتی</p>
        </div>
      </div>
    `;
    return Components.renderAppLayout(content, { authPage: true });
  },

  resetPassword() {
    const content = `
      <div class="auth-container">
        <div class="auth-card auth-simple">
          <a href="#/login" class="back-link">${Components.icon('back')} Back</a>
          <div class="auth-icon">🔒</div>
          <h1>Create New Password</h1>
          <p>Enter your new password below.</p>
          <form id="reset-form" class="auth-form">
            <div class="form-group">
              <label>New Password</label>
              <input type="password" name="password" required minlength="8">
            </div>
            <div class="form-group">
              <label>Confirm New Password</label>
              <input type="password" name="confirm" required minlength="8">
            </div>
            <button type="submit" class="btn btn-gold btn-block">Reset Password</button>
          </form>
          <p class="auth-footer-urdu urdu-text">یقینی بنائیں کہ یہ کم از کم 8 حروف کا ہو</p>
        </div>
      </div>
    `;
    return Components.renderAppLayout(content, { authPage: true });
  },

  resetSuccess() {
    const content = `
      <div class="auth-container">
        <div class="auth-card auth-simple">
          <div class="auth-icon success">✓</div>
          <h1>Password Reset Successful</h1>
          <p>Your password has been updated successfully. You can now sign in with your new password.</p>
          <a href="#/login" class="btn btn-gold btn-block">Go to Sign In</a>
          <p class="auth-footer-urdu urdu-text">اب آپ اپنے نئے پاس ورڈ سے لاگ ان کر سکتے ہیں</p>
        </div>
      </div>
    `;
    return Components.renderAppLayout(content, { authPage: true });
  },

  dashboard(params, query) {
    const user = Auth.getCurrentUser();
    const tab = query.tab || 'poems';
    const stats = Storage.getAnalytics();
    const drafts = Storage.getDrafts();
    const myPosts = Storage.getUserPosts().filter(p => p.poetName === user.name);
    const likedPoems = Storage.getLikes().map(id => getPoemById(id)).filter(Boolean);
    const starredPoems = Storage.getBookmarks().map(id => getPoemById(id)).filter(Boolean);
    const poetMatch = APP_DATA.poets.find(p => p.name === user.name);
    const username = user.username || user.name?.toLowerCase().replace(/\s+/g, '') || 'poet';
    const followers = poetMatch?.followers || 0;
    const following = Storage.getFollowing().length;
    const poemCount = myPosts.length;
    const hearts = stats.likes + Storage.getLikes().length + myPosts.reduce((s, p) => s + (p.likes || 0), 0);

    let tabContent;
    if (tab === 'likes') {
      tabContent = likedPoems.length
        ? likedPoems.map(p => Components.renderProfilePoemCard(p)).join('')
        : '<p class="empty-state">No liked poems yet.</p>';
    } else if (tab === 'drafts') {
      tabContent = drafts.length
        ? drafts.map(d => Components.renderProfileDraftCard(d)).join('')
        : '<p class="empty-state">No drafts yet. Start writing!</p>';
    } else if (tab === 'starred') {
      tabContent = starredPoems.length
        ? starredPoems.map(p => Components.renderProfilePoemCard(p)).join('')
        : '<p class="empty-state">No starred poems yet.</p>';
    } else {
      tabContent = myPosts.length
        ? myPosts.map(p => Components.renderProfilePoemCard(p)).join('')
        : '<p class="empty-state">You haven\'t posted yet. <button type="button" class="btn btn-gold btn-sm" id="dashboard-write-btn">Write Poetry</button></p>';
    }

    const content = Components.renderUserProfile({
      user,
      username,
      bio: user.bio,
      isOwn: true,
      profilePath: '#/dashboard',
      sharePath: `${location.origin}${location.pathname}#/dashboard`,
      followers,
      following,
      poemCount,
      activity: {
        hearts,
        comments: stats.comments,
        shares: stats.shares
      },
      tabs: [
        { label: 'Poems', href: '#/dashboard?tab=poems', active: tab === 'poems' },
        { label: 'Likes', href: '#/dashboard?tab=likes', active: tab === 'likes' },
        { label: 'Drafts', href: '#/dashboard?tab=drafts', active: tab === 'drafts' },
        { label: 'Starred', href: '#/dashboard?tab=starred', active: tab === 'starred' }
      ],
      tabContent
    });

    return Components.renderAppLayout(content, { noSidebar: true });
  },

  adminLogin(params, query) {
    if (Auth.isAdmin()) {
      setTimeout(() => Router.go(query.section ? `/admin?section=${query.section}` : '/admin'), 0);
      return '<div class="admin-auth-page"><p class="admin-auth-redirect">Opening admin dashboard…</p></div>';
    }

    const section = query.section || 'dashboard';
    const loggedInNonAdmin = Auth.isLoggedIn() && !Auth.isAdmin();

    return `
      <div class="admin-auth-page">
        <div class="admin-auth-card">
          <a href="#/" class="admin-auth-back">← Back to Site</a>
          <div class="admin-auth-brand">
            <img src="${APP_DATA.logo}" alt="Urdu Poetry">
            <span>Urdu Poetry</span>
          </div>
          <div class="admin-auth-icon">🛡️</div>
          <h1>Admin Portal</h1>
          <p class="admin-auth-subtitle">Sign in with your administrator account to access the control panel.</p>
          ${loggedInNonAdmin ? '<p class="admin-auth-warn">You are signed in as a regular user. Enter admin credentials to continue.</p>' : ''}
          <form id="admin-login-form" class="admin-auth-form" data-section="${section}">
            <label for="admin-email">Email address</label>
            <input id="admin-email" type="email" name="email" required placeholder="admin@urdupoetry.com" autocomplete="username">
            <label for="admin-password">Password</label>
            <div class="password-field">
              <input id="admin-password" type="password" name="password" required placeholder="Enter password" autocomplete="current-password">
              <button type="button" class="password-toggle" aria-label="Show password">${Components.icon('eye')}</button>
            </div>
            <button type="submit" class="btn btn-gold btn-block admin-auth-submit">Sign In to Admin Panel</button>
          </form>
          <p class="admin-auth-foot">Authorized personnel only. All actions are logged.</p>
        </div>
      </div>
    `;
  },

  admin(params, query) {
    if (!Auth.isAdmin()) {
      const dest = query.section ? `/admin/login?section=${encodeURIComponent(query.section)}` : '/admin/login';
      setTimeout(() => Router.go(dest), 0);
      return '<div class="admin-auth-page"><p class="admin-auth-redirect">Redirecting to admin login…</p></div>';
    }
    const section = query.section || 'dashboard';
    return AdminPanel.render(section);
  },

  notFound() {
    return Components.renderAppLayout(`
      <div class="empty-state page-404">
        <h1>404</h1>
        <p>Page not found</p>
        <a href="#/" class="btn btn-gold">Go Home</a>
      </div>
    `);
  }
};
