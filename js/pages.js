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
                <h3>${poet.name} ${poet.verified ? '✓' : ''} ${poet.premium ? '👑' : ''}</h3>
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

  poetProfile(params) {
    const poet = getPoetById(params.id);
    if (!poet) return Components.renderAppLayout('<p class="empty-state">Poet not found.</p>');

    if (!Auth.canVisitProfile() && Auth.isGuest()) {
      Components.showGuestLimitModal();
    } else if (!Auth.isPremium()) {
      Storage.incrementProfileVisits();
    }

    const tab = new URLSearchParams(location.hash.split('?')[1] || '').get('tab') || 'posts';
    const poems = getPoemsByPoet(poet.id);
    const following = Storage.isFollowing(poet.id);
    const bookmarkedPoems = Storage.getBookmarks().map(id => getPoemById(id)).filter(Boolean);
    const likedPoems = Storage.getLikes().map(id => getPoemById(id)).filter(p => p && p.poetId === poet.id);

    let tabContent;
    if (tab === 'bookmarks') tabContent = bookmarkedPoems.map(p => Components.renderPoemCard(p)).join('') || '<p class="empty-state">No bookmarks yet.</p>';
    else if (tab === 'likes') tabContent = likedPoems.map(p => Components.renderPoemCard(p)).join('') || '<p class="empty-state">No likes yet.</p>';
    else tabContent = poems.map(p => Components.renderPoemCard(p)).join('') || '<p class="empty-state">No posts yet.</p>';

    const content = `
      <div class="poet-profile">
        <div class="profile-header">
          ${avatarImg(poet.name, 'profile-avatar', poet.name)}
          <div class="profile-info">
            <h1>${poet.name} ${poet.verified ? '<span class="verified-badge">✓</span>' : ''} ${poet.premium ? '<span class="premium-badge">👑</span>' : ''}</h1>
            <p>${poet.bio}</p>
            <div class="profile-stats">
              <span><strong>${poet.posts}</strong> Posts</span>
              <span><strong>${Components.formatNumber(poet.followers)}</strong> Followers</span>
              <span><strong>${poet.following}</strong> Following</span>
            </div>
            <div class="profile-actions">
              <button class="btn ${following ? 'btn-outline-gold' : 'btn-gold'} follow-btn" data-poet-id="${poet.id}">${following ? 'Following' : 'Follow'}</button>
              <a href="#/messages/${poet.id}" class="btn btn-outline-gold">Message</a>
              <button class="btn btn-ghost report-btn" data-type="user" data-id="${poet.id}">Report</button>
              <button class="btn btn-ghost block-btn" data-id="${poet.id}">Block</button>
            </div>
          </div>
        </div>
        <div class="profile-tabs">
          <a href="#/poet/${poet.id}?tab=posts" class="profile-tab ${tab === 'posts' ? 'active' : ''}">Posts</a>
          <a href="#/poet/${poet.id}?tab=likes" class="profile-tab ${tab === 'likes' ? 'active' : ''}">Likes</a>
          <a href="#/poet/${poet.id}?tab=bookmarks" class="profile-tab ${tab === 'bookmarks' ? 'active' : ''}">Bookmarks</a>
        </div>
        <div class="poem-feed">${tabContent}</div>
      </div>
    `;
    return Components.renderAppLayout(content);
  },

  poemDetail(params) {
    const poem = getPoemById(params.id);
    if (!poem) return Components.renderAppLayout('<p class="empty-state">Poem not found.</p>');

    const canRead = Auth.canReadPoem();
    if (!canRead.allowed) {
      Components.showGuestLimitModal();
    } else {
      Auth.recordPoemRead(poem.id);
    }

    const poet = getPoetById(poem.poetId);
    const category = getCategoryById(poem.category);
    const liked = Storage.isLiked(poem.id);
    const bookmarked = Storage.isBookmarked(poem.id);
    const tagLabel = poem.tagLabel || (category ? category.name : poem.category);

    const content = `
      <div class="poem-detail">
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
        </div>
        <div class="poem-detail-content poem-card-${poem.cardTheme || 'classic-dark'}">
          ${formatPoemHtml(poem.text, poem.cardTheme)}
          ${poem.english ? `<p class="english-text">${poem.english}</p>` : ''}
        </div>
        <div class="poem-actions">
          <button class="action-btn like-btn ${liked ? 'active' : ''}" data-action="like" data-id="${poem.id}">
            ${Components.icon('heart')} <span>${Components.formatNumber(poem.likes + (liked ? 1 : 0))}</span>
          </button>
          <span class="action-btn">${Components.icon('comment')} <span>${poem.comments}</span></span>
          <button class="action-btn share-btn" data-action="share" data-id="${poem.id}">${Components.icon('share')} Share</button>
          <button class="action-btn bookmark-btn ${bookmarked ? 'active' : ''}" data-action="bookmark" data-id="${poem.id}">
            ${Components.icon('bookmarks')} ${bookmarked ? 'Saved' : 'Save'}
          </button>
          ${Auth.isPremium() ? `<button class="action-btn download-btn" data-action="download" data-id="${poem.id}">⬇️ Download</button>` : ''}
          <button class="action-btn report-btn" data-type="post" data-id="${poem.id}">🚩 Report</button>
        </div>
        <section class="comments-section">
          <h3>Comments (${poem.comments})</h3>
          <form class="comment-form" id="comment-form" data-poem-id="${poem.id}">
            <input type="text" placeholder="Write a comment..." required>
            <button type="submit" class="btn btn-gold">Post</button>
          </form>
          <div class="comments-list">
            ${APP_DATA.sampleComments.map(c => `
              <div class="comment">
                ${avatarImg(c.user, '', c.user)}
                <div>
                  <strong>${c.user}</strong>
                  <span class="comment-time">${c.time}</span>
                  <p>${c.text}</p>
                </div>
              </div>
            `).join('')}
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

  mushaira(params) {
    const registered = Storage.getRegisteredEvents();
    const liveEvents = APP_DATA.mushairaEvents.filter(e => e.live);
    const upcoming = APP_DATA.mushairaEvents.filter(e => !e.live);

    const content = `
      <div class="page-header">
        <h1>Mushaira Events</h1>
        <p>Join live poetry gatherings and upcoming mushairas</p>
        ${Auth.canCreateEvent() ? '<a href="#/mushaira/create" class="btn btn-gold">Create Event</a>' : '<a href="#/premium" class="btn btn-outline-gold">Premium: Create Events</a>'}
      </div>
      ${liveEvents.length ? `
        <section class="events-section">
          <h2><span class="live-badge">Live</span> Live Now</h2>
          ${liveEvents.map(event => `
            <div class="event-card live">
              <div class="event-info">
                <h3>${event.title}</h3>
                <p>Host: ${event.host}</p>
                <p>${event.date} · ${event.time} · ${event.location}</p>
                <p>${event.registered} registered</p>
              </div>
              <button class="btn btn-gold join-event-btn" data-event-id="${event.id}">Join Now</button>
            </div>
          `).join('')}
        </section>
      ` : ''}
      <section class="events-section">
        <h2>Upcoming Events</h2>
        ${upcoming.map(event => `
          <div class="event-card">
            <div class="event-info">
              <h3>${event.title}</h3>
              <p>Host: ${event.host}</p>
              <p>${event.date} · ${event.time} · ${event.location}</p>
              <p>${event.registered} registered</p>
            </div>
            <button class="btn ${registered.includes(event.id) ? 'btn-outline-gold' : 'btn-gold'} register-event-btn" data-event-id="${event.id}">
              ${registered.includes(event.id) ? 'Registered ✓' : 'Register'}
            </button>
          </div>
        `).join('')}
      </section>
    `;
    return Components.renderAppLayout(content);
  },

  voiceRooms(params) {
    if (params.id) {
      const roomId = parseInt(params.id);
      const room = getVoiceRoomById(roomId);
      if (!room) {
        return Components.renderAppLayout('<div class="page-header"><h1>Room not found</h1><a href="#/voice-rooms" class="btn btn-gold">Back to Rooms</a></div>');
      }
      if (room.premium && !Auth.isPremium()) {
        return Components.renderAppLayout(`
          <div class="page-header">
            <h1>Premium Room</h1>
            <p>${room.title} requires a Premium subscription.</p>
            <a href="#/premium" class="btn btn-gold">Upgrade to Premium</a>
            <a href="#/voice-rooms" class="btn btn-outline-gold">Back</a>
          </div>
        `);
      }

      Storage.joinRoom(roomId);
      const user = Auth.getCurrentUser();
      const listeners = APP_DATA.roomListeners[roomId] || [room.host];
      const messages = Storage.getRoomMessages(roomId);

      const content = `
        <div class="voice-room-view">
          <div class="voice-room-header">
            <a href="#/voice-rooms" class="back-link">${Components.icon('back')}</a>
            <div class="voice-room-title">
              <h2>${room.title}</h2>
              <p>Host: ${room.host} · ${room.participants + 1} in room</p>
            </div>
            <span class="live-badge">● Live</span>
          </div>

          <div class="voice-room-stage">
            <p class="stage-label">On stage</p>
            <div class="voice-speakers">
              ${listeners.slice(0, 6).map((name, i) => `
                <div class="voice-speaker ${i === 0 ? 'host' : ''} ${name === user.name ? 'me' : ''}">
                  ${avatarImg(name, 'speaker-avatar', name)}
                  <span>${name === user.name ? 'You' : name.split(' ')[0]}</span>
                  <span class="mic-indicator">${i < 2 ? '🎙️' : '🔇'}</span>
                </div>
              `).join('')}
            </div>
          </div>

          <div class="voice-room-chat">
            <p class="chat-label">Live discussion</p>
            <div class="voice-room-messages" id="voice-room-messages">
              ${messages.map(m => `
                <div class="chat-message ${m.type === 'me' ? 'sent' : 'received'} ${m.type === 'host' ? 'host-message' : ''}">
                  ${m.type !== 'me' ? `<strong>${m.from}</strong>` : ''}
                  <p>${m.text}</p>
                  <span>${m.time}</span>
                </div>
              `).join('')}
            </div>
          </div>

          <div class="voice-room-controls">
            <button type="button" class="mic-btn" id="voice-mic-btn" title="Toggle microphone">🎤</button>
            <form class="voice-room-form" id="voice-room-form" data-room-id="${roomId}">
              <input type="text" placeholder="Share poetry or join the discussion..." required maxlength="500">
              <button type="submit" class="btn btn-gold">Send</button>
            </form>
            <button type="button" class="btn btn-outline-gold leave-room-btn" data-room-id="${roomId}">Leave</button>
          </div>
        </div>
      `;
      return Components.renderAppLayout(content, { noSidebar: true, showPremium: false });
    }

    const joined = Storage.getJoinedRooms();
    const content = `
      <div class="page-header">
        <h1>Voice Chat Rooms</h1>
        <p>Join live poetry discussions and recitations</p>
        ${Auth.canCreateRoom() ? '<button class="btn btn-gold" id="create-room-btn">Create Room</button>' : '<a href="#/premium" class="btn btn-outline-gold">Premium: Create Rooms</a>'}
      </div>
      <div class="rooms-grid">
        ${getAllVoiceRooms().map(room => `
          <div class="room-card ${room.premium ? 'premium-room' : ''}">
            <div class="room-header">
              <h3>${room.title}</h3>
              ${room.premium ? '<span class="premium-badge">Premium</span>' : ''}
              <span class="active-badge">${room.active ? '● Active' : 'Offline'}</span>
            </div>
            <p>Host: ${room.host}</p>
            <p>${room.participants} participants</p>
            <button class="btn ${joined.includes(room.id) ? 'btn-outline-gold' : 'btn-gold'} join-room-btn" data-room-id="${room.id}">
              ${joined.includes(room.id) ? 'Enter Room' : 'Join Room'}
            </button>
          </div>
        `).join('')}
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
          <div class="contest-card">
            <div class="contest-info">
              <h3>${contest.title} ${contest.premium ? '<span class="premium-badge">Premium</span>' : ''}</h3>
              <p>Prize: ${contest.prize} · Deadline: ${contest.deadline}</p>
              <p>${contest.entries} entries</p>
            </div>
            ${contest.premium && !Auth.isPremium() ?
              '<a href="#/premium" class="btn btn-outline-gold">Premium Required</a>' :
              `<button class="btn btn-gold submit-contest-btn" data-contest-id="${contest.id}">Submit Poetry</button>`
            }
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
            <input type="text" placeholder="Type a message..." required ${!Auth.canMessage() ? 'disabled' : ''}>
            <button type="submit" class="btn btn-gold" ${!Auth.canMessage() ? 'disabled' : ''}>Send</button>
          </form>
          ${!Auth.canMessage() ? '<p class="limit-warning">Message limit reached. <a href="#/premium">Upgrade to Premium</a></p>' : ''}
        </div>
      `;
      return Components.renderAppLayout(content, { noSidebar: true });
    }

    const content = `
      <div class="page-header">
        <h1>Messages</h1>
        <a href="#/messages/new" class="btn btn-gold btn-sm">New Message</a>
      </div>
      <div class="search-form">
        <input type="search" placeholder="Search messages..." id="message-search">
      </div>
      <div class="chat-list">
        ${APP_DATA.sampleChats.map(chat => `
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
      ${!Auth.canMessage() ? `<div class="limit-box"><p>Free users: ${APP_DATA.freeLimits.messages} messages max</p><a href="#/premium" class="btn btn-gold">Upgrade</a></div>` : ''}
    `;
    return Components.renderAppLayout(content);
  },

  notifications() {
    Storage.markNotificationsRead();
    const notifications = Storage.getNotifications();
    const content = `
      <div class="page-header">
        <h1>Notifications</h1>
      </div>
      <div class="notifications-list">
        ${notifications.map(n => `
          <div class="notification-item ${n.read ? '' : 'unread'} type-${n.type}">
            <span class="notif-icon">${n.type === 'like' ? '❤️' : n.type === 'comment' ? '💬' : n.type === 'follow' ? '👤' : '📅'}</span>
            <div>
              <p>${n.text}</p>
              <span class="notif-time">${n.time}</span>
            </div>
          </div>
        `).join('')}
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
        <p>${poems.length} saved poems ${!Auth.isPremium() ? `(max ${APP_DATA.freeLimits.bookmarks})` : ''}</p>
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
    const content = `
      <div class="premium-page">
        <div class="premium-hero">
          <h1>👑 Upgrade to Premium</h1>
          <p>Unlock the full Urdu Poetry experience</p>
        </div>
        <div class="premium-features-grid">
          ${APP_DATA.premiumFeatures.map(f => `
            <div class="premium-feature">
              <span class="feature-icon">${f.icon}</span>
              <h3>${f.title}</h3>
              <p>${f.desc}</p>
            </div>
          `).join('')}
        </div>
        <div class="premium-plans-section">
          <h2>Choose Your Plan</h2>
          <div class="premium-plans">
            ${APP_DATA.premiumPlans.map(plan => `
              <div class="plan-card ${plan.badge ? 'featured' : ''}">
                ${plan.badge ? `<span class="plan-badge">${plan.badge}</span>` : ''}
                <h3>${plan.name}</h3>
                <div class="plan-price">${plan.price}<span>${plan.period}</span></div>
                <p class="plan-note">${plan.note}</p>
                <button class="btn btn-gold subscribe-btn" data-plan="${plan.id}">Start ${plan.id === 'yearly' ? 'Yearly' : 'Monthly'}</button>
              </div>
            `).join('')}
          </div>
        </div>
        <div class="free-limits-box">
          <h3>Free User Limits</h3>
          <ul>
            <li>Max ${APP_DATA.freeLimits.messages} Messages</li>
            <li>Max ${APP_DATA.freeLimits.bookmarks} Bookmarks</li>
            <li>Max ${APP_DATA.freeLimits.poemsPerDay} Poems Per Day</li>
            <li>Limited Profile Visits</li>
            <li>Ads Enabled</li>
          </ul>
        </div>
        <div class="payment-methods">
          <span>Visa</span><span>Mastercard</span><span>PayPal</span><span>Apple Pay</span><span>Google Pay</span>
        </div>
      </div>
    `;
    return Components.renderAppLayout(content, { showPremium: false, fullWidth: true });
  },

  login() {
    const content = `
      <div class="auth-container">
        <div class="auth-card">
          <img src="${APP_DATA.logo}" alt="Urdu Poetry" class="auth-logo">
          <h1>Urdu Poetry</h1>
          <p class="auth-tagline">A gathering of souls through verse.</p>
          <div class="auth-tabs">
            <a href="#/login" class="auth-tab active">Sign In</a>
            <a href="#/register" class="auth-tab">Sign Up</a>
          </div>
          <form id="login-form" class="auth-form">
            <div class="form-group">
              <label>Email or Username</label>
              <input type="text" name="email" required placeholder="Email or username" autocomplete="username">
            </div>
            <div class="form-group">
              <label>Password</label>
              <input type="password" name="password" required placeholder="Enter your password">
              <a href="#/forgot-password" class="forgot-link">Forgot Password?</a>
            </div>
            <button type="submit" class="btn btn-gold btn-block">Sign In</button>
          </form>
          <div class="social-divider">or continue with</div>
          <div class="social-buttons">
            <button class="btn btn-social" data-social="google">Continue with Google</button>
            <button class="btn btn-social" data-social="facebook">Continue with Facebook</button>
          </div>
          <a href="#/register" class="auth-switch">Don't have an account? Sign Up</a>
          <a href="#/" class="guest-link" id="guest-login">Login as Guest</a>
          <p class="auth-footer-urdu urdu-text">شاعری دلوں کی زبان ہے</p>
          <p class="auth-footer">Poetry is the language of hearts.</p>
        </div>
        <div class="auth-features">
          <div class="auth-feature"><span>🚪</span><h4>Easy Login</h4><p>Login with Email, Google or Facebook</p></div>
          <div class="auth-feature"><span>🛡️</span><h4>Secure & Private</h4><p>Your data is safe with us</p></div>
          <div class="auth-feature"><span>🔑</span><h4>Password Recovery</h4><p>Reset your password via email</p></div>
          <div class="auth-feature"><span>💬</span><h4>Bilingual Support</h4><p>English & Urdu</p></div>
        </div>
      </div>
    `;
    return Components.renderAppLayout(content, { authPage: true });
  },

  register() {
    const content = `
      <div class="auth-container">
        <div class="auth-card">
          <img src="${APP_DATA.logo}" alt="Urdu Poetry" class="auth-logo">
          <h1>Urdu Poetry</h1>
          <p class="auth-tagline">A gathering of souls through verse.</p>
          <div class="auth-tabs">
            <a href="#/login" class="auth-tab">Sign In</a>
            <a href="#/register" class="auth-tab active">Sign Up</a>
          </div>
          <form id="register-form" class="auth-form">
            <div class="form-group">
              <label>Full Name</label>
              <input type="text" name="name" required placeholder="Enter your full name">
            </div>
            <div class="form-group">
              <label>Username</label>
              <input type="text" name="username" required pattern="[a-zA-Z0-9_]{3,20}" placeholder="Choose a unique username" autocomplete="username">
            </div>
            <div class="form-group">
              <label>Email</label>
              <input type="email" name="email" required placeholder="Enter your email" autocomplete="email">
            </div>
            <div class="form-group">
              <label>Password</label>
              <input type="password" name="password" required minlength="8" placeholder="Min 8 characters">
            </div>
            <div class="form-group">
              <label>Confirm Password</label>
              <input type="password" name="confirm" required placeholder="Confirm password">
            </div>
            <label class="checkbox-label">
              <input type="checkbox" required> I agree with Terms & Conditions and Privacy Policy
            </label>
            <button type="submit" class="btn btn-gold btn-block">Create Account</button>
          </form>
          <div class="social-divider">or continue with</div>
          <div class="social-buttons">
            <button class="btn btn-social" data-social="google">Continue with Google</button>
            <button class="btn btn-social" data-social="facebook">Continue with Facebook</button>
          </div>
          <a href="#/login" class="auth-switch">Already have an account? Sign In</a>
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

  dashboard() {
    const user = Auth.getCurrentUser();
    const stats = Storage.getAnalytics();
    const drafts = Storage.getDrafts();
    const scheduled = Storage.getScheduledPosts();
    const myPosts = Storage.getUserPosts().filter(p => p.poetName === user.name);
    const cardTheme = Storage.getCardTheme();
    const themes = [
      { id: 'classic-dark', label: 'Classic Dark', icon: '🌙' },
      { id: 'golden-border', label: 'Golden Border', icon: '✨' },
      { id: 'premium-paper', label: 'Premium Paper', icon: '📜' }
    ];

    const content = `
      <div class="dashboard-page">
        <div class="page-header dashboard-header">
          <div class="dashboard-profile">
            ${avatarImg(user.name, 'dashboard-avatar', user.name)}
            <div>
              <h1>${user.name}</h1>
              <p>${user.isGuest ? 'Guest User' : (user.premium ? '👑 Premium Poet' : 'Free Member')}</p>
            </div>
          </div>
          <button type="button" class="btn btn-gold" id="dashboard-write-btn">+ Write Poetry</button>
        </div>

        <div class="analytics-grid">
          <div class="stat-card"><span class="stat-icon">❤️</span><strong>${Components.formatNumber(stats.likes + Storage.getLikes().length)}</strong><span>Hearts</span></div>
          <div class="stat-card"><span class="stat-icon">💬</span><strong>${stats.comments}</strong><span>Comments</span></div>
          <div class="stat-card"><span class="stat-icon">↗️</span><strong>${stats.shares}</strong><span>Shares</span></div>
          <div class="stat-card"><span class="stat-icon">🔖</span><strong>${Storage.getBookmarks().length}</strong><span>Saves</span></div>
        </div>

        <section class="dashboard-section">
          <h2>Poetry Card Customizer</h2>
          <p class="section-desc">Choose your default card style for new posts and downloads</p>
          <div class="card-theme-options dashboard-themes">
            ${themes.map(t => `
              <button type="button" class="theme-chip dashboard-theme-btn ${cardTheme === t.id ? 'active' : ''}" data-theme="${t.id}">
                <span>${t.icon}</span> ${t.label}
              </button>
            `).join('')}
          </div>
          <div class="theme-preview-box poem-card-${cardTheme}">
            ${formatPoemHtml('ہر مصرعہ ایک لائن میں\nخوبصورت انداز میں', cardTheme)}
          </div>
        </section>

        <section class="dashboard-section">
          <div class="section-row">
            <h2>My Drafts</h2>
            <button type="button" class="btn btn-outline-gold btn-sm" id="new-draft-btn">+ New Draft</button>
          </div>
          ${drafts.length ? drafts.map(d => `
            <div class="draft-card">
              <div class="draft-preview urdu-text">${d.text.split('\n')[0]}...</div>
              <div class="draft-actions">
                <button type="button" class="btn btn-gold btn-sm edit-draft-btn" data-draft-id="${d.id}">Continue Writing</button>
                <button type="button" class="btn btn-ghost btn-sm delete-draft-btn" data-draft-id="${d.id}">Delete</button>
              </div>
            </div>
          `).join('') : '<p class="empty-state">No drafts yet. Start writing!</p>'}
        </section>

        <section class="dashboard-section">
          <h2>Scheduled Posts</h2>
          ${scheduled.length ? scheduled.map(s => `
            <div class="scheduled-card">
              <div class="urdu-text">${s.text.split('\n')[0]}...</div>
              <p>Scheduled: ${new Date(s.scheduleAt).toLocaleString()}</p>
              <button type="button" class="btn btn-ghost btn-sm cancel-scheduled-btn" data-id="${s.id}">Cancel</button>
            </div>
          `).join('') : '<p class="empty-state">No scheduled posts.</p>'}
        </section>

        <section class="dashboard-section">
          <h2>My Posts (${myPosts.length})</h2>
          <div class="poem-feed">
            ${myPosts.length ? myPosts.map(p => Components.renderPoemCard(p)).join('') : '<p class="empty-state">You haven\'t posted yet.</p>'}
          </div>
        </section>

        <div class="dashboard-links">
          <a href="#/bookmarks">Bookmarks</a>
          <a href="#/history">History</a>
          <a href="#/settings">Settings</a>
          <a href="#/premium">Premium</a>
        </div>
      </div>
    `;
    return Components.renderAppLayout(content);
  },

  admin() {
    if (!Auth.isAdmin()) {
      return Components.renderAppLayout(`
        <div class="empty-state">
          <h2>Admin Access Required</h2>
          <p>Login with admin@urdupoetry.com to access the admin panel.</p>
          <a href="#/login" class="btn btn-gold">Login</a>
        </div>
      `);
    }

    const tags = Storage.getWritingTags();
    const reports = Storage.getReports().filter(r => r.status === 'pending');
    const contests = APP_DATA.contests.filter(c => c.status === 'active');

    const content = `
      <div class="admin-page">
        <div class="page-header">
          <h1>🛡️ Admin Dashboard</h1>
          <p>Manage users, tags, contests & moderation</p>
        </div>

        <section class="admin-section">
          <h2>User Roles</h2>
          <p class="section-desc">Assign <strong>Admin</strong> or <strong>User</strong> from the dropdown — updates the database instantly</p>
          <div id="admin-users-list" class="admin-users-list">
            <p class="admin-loading">Loading users…</p>
          </div>
        </section>

        <section class="admin-section">
          <h2>Dynamic Tag Manager</h2>
          <p class="section-desc">Add, edit or remove scrolling tags in the writing window</p>
          <div class="admin-tags-list">
            ${tags.map(tag => `
              <div class="admin-tag-row">
                <input type="text" class="tag-label-input urdu-text" value="${tag.label}" data-tag-id="${tag.id}" data-field="label">
                <input type="text" class="tag-en-input" value="${tag.en}" data-tag-id="${tag.id}" data-field="en" placeholder="English">
                <button type="button" class="btn btn-ghost btn-sm delete-tag-btn" data-tag-id="${tag.id}">Delete</button>
              </div>
            `).join('')}
          </div>
          <div class="admin-actions">
            <button type="button" class="btn btn-outline-gold" id="add-tag-btn">+ Add Tag</button>
            <button type="button" class="btn btn-gold" id="save-tags-btn">Save Tags</button>
          </div>
        </section>

        <section class="admin-section">
          <h2>Contest Manager</h2>
          ${contests.map(c => `
            <div class="contest-card">
              <div>
                <h3>${c.title}</h3>
                <p>${c.entries} entries · Deadline: ${c.deadline} · Prize: ${c.prize}</p>
              </div>
              <a href="#/contests" class="btn btn-outline-gold btn-sm">View Submissions</a>
            </div>
          `).join('')}
        </section>

        <section class="admin-section">
          <h2>Report & Moderation Queue (${reports.length})</h2>
          ${reports.length ? reports.map(r => `
            <div class="report-card">
              <div>
                <strong>${r.type === 'post' ? 'Post' : 'User'} Report #${r.id}</strong>
                <p>${r.reason || 'Reported for review'}</p>
                <span class="notif-time">${r.time}</span>
              </div>
              <div class="report-actions">
                <button type="button" class="btn btn-gold btn-sm resolve-report-btn" data-id="${r.id}" data-action="approved">Approve</button>
                <button type="button" class="btn btn-ghost btn-sm resolve-report-btn" data-id="${r.id}" data-action="removed">Remove</button>
              </div>
            </div>
          `).join('') : '<p class="empty-state">No pending reports. Community is clean! ✓</p>'}
        </section>
      </div>
    `;
    return Components.renderAppLayout(content, { fullWidth: true });
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
