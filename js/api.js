const API = {
  mapPoem(row) {
    if (!row) return null;
    const ago = this.timeAgo(row.created_at);
    return {
      id: row.id,
      poetId: row.user_id || 0,
      ownerId: row.user_id || null,
      poetName: row.poet_name,
      category: row.category || 'shayari',
      tagLabel: row.tag_label,
      cardTheme: row.card_theme || 'classic-dark',
      text: row.text,
      english: row.english,
      likes: row.likes_count || 0,
      comments: row.comments_count || 0,
      shares: row.shares_count || 0,
      time: ago,
      trending: row.is_trending,
      userPost: true,
      created_at: row.created_at
    };
  },

  mapProfile(row, authUser) {
    if (!row && !authUser) return null;
    const name = row?.display_name || authUser?.user_metadata?.display_name || 'User';
    return {
      id: row?.id || authUser?.id,
      name,
      username: row?.username,
      email: authUser?.email,
      avatar: row?.avatar_url || getAvatarUrl(name),
      premium: row?.is_premium || false,
      isAdmin: row?.user_role === 'admin',
      bio: row?.bio || '',
      loggedIn: true,
      isGuest: false
    };
  },

  timeAgo(dateStr) {
    if (!dateStr) return 'Just now';
    const diff = Date.now() - new Date(dateStr).getTime();
    const mins = Math.floor(diff / 60000);
    if (mins < 1) return 'Just now';
    if (mins < 60) return `${mins} min ago`;
    const hrs = Math.floor(mins / 60);
    if (hrs < 24) return `${hrs} hours ago`;
    const days = Math.floor(hrs / 24);
    if (days < 7) return `${days} days ago`;
    return new Date(dateStr).toLocaleDateString();
  },

  async getProfile(userId) {
    const sb = SupabaseClient.get();
    if (!sb || !userId) return null;
    const { data, error } = await sb.from('profiles').select('*').eq('id', userId).single();
    if (error) return null;
    return data;
  },

  async fetchPoems(limit = 50) {
    const sb = SupabaseClient.get();
    if (!sb) return [];
    const { data, error } = await sb
      .from('poems')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(limit);
    if (error) { console.warn('fetchPoems:', error.message); return []; }
    return (data || []).map(p => this.mapPoem(p));
  },

  async createPoem(post) {
    const sb = SupabaseClient.get();
    const user = Auth.getCurrentUser();
    if (!sb || !user?.id || user.isGuest) return null;

    const { data, error } = await sb.from('poems').insert({
      user_id: user.id,
      poet_name: user.name,
      text: post.text,
      category: post.category || 'shayari',
      tag_label: post.tagLabel,
      card_theme: post.cardTheme || 'classic-dark'
    }).select().single();

    if (error) { console.warn('createPoem:', error.message); return null; }
    return this.mapPoem(data);
  },

  async getWritingTags() {
    const sb = SupabaseClient.get();
    if (!sb) return null;
    const { data } = await sb.from('writing_tags').select('*').eq('is_active', true).order('sort_order');
    return (data || []).map(t => ({ id: t.id, label: t.label, en: t.label_en }));
  },

  async saveWritingTags(tags) {
    const sb = SupabaseClient.get();
    if (!sb || !Auth.isAdmin()) return false;
    await sb.from('writing_tags').delete().neq('id', 0);
    const rows = tags.map((t, i) => ({ id: t.id, label: t.label, label_en: t.en, sort_order: i + 1, is_active: true }));
    const { error } = await sb.from('writing_tags').upsert(rows);
    return !error;
  },

  async fetchAdminUsers() {
    const sb = SupabaseClient.get();
    if (!sb || !Auth.isAdmin()) return [];
    const { data, error } = await sb.rpc('get_users_for_admin');
    if (error) {
      console.warn('fetchAdminUsers:', error.message);
      return null;
    }
    return (data || []).map(u => ({
      id: u.id,
      email: u.email,
      username: u.username,
      displayName: u.display_name,
      userRole: u.user_role || 'user',
      isAdmin: u.user_role === 'admin'
    }));
  },

  async setUserRole(userId, role) {
    const sb = SupabaseClient.get();
    if (!sb || !Auth.isAdmin()) return false;
    const { error } = await sb.rpc('set_user_role', {
      target_user_id: userId,
      new_role: role
    });
    if (error) {
      console.warn('setUserRole:', error.message);
      return false;
    }
    return true;
  },

  /** @deprecated use setUserRole */
  async setUserAdminRole(userId, isAdmin) {
    return this.setUserRole(userId, isAdmin ? 'admin' : 'user');
  },

  async getFeaturedPoemId() {
    const sb = SupabaseClient.get();
    if (!sb) return null;
    const { data } = await sb.from('featured_poem').select('poem_id').eq('id', 1).single();
    return data?.poem_id || null;
  },

  async setFeaturedPoem(poemId) {
    const sb = SupabaseClient.get();
    if (!sb || !Auth.isAdmin()) return false;
    const { error } = await sb.from('featured_poem').upsert({
      id: 1,
      poem_id: poemId,
      set_by: Auth.getCurrentUser().id,
      updated_at: new Date().toISOString()
    });
    return !error;
  },

  async getReports() {
    const sb = SupabaseClient.get();
    if (!sb || !Auth.isAdmin()) return null;
    const { data } = await sb.from('reports').select('*').order('created_at', { ascending: false });
    return data || [];
  },

  async addReport(report) {
    const sb = SupabaseClient.get();
    if (!sb) return false;
    const user = Auth.getCurrentUser();
    const { error } = await sb.from('reports').insert({
      reporter_id: user?.id || null,
      report_type: report.type,
      target_id: String(report.targetId),
      reason: report.reason
    });
    return !error;
  },

  async resolveReport(id, status) {
    const sb = SupabaseClient.get();
    if (!sb || !Auth.isAdmin()) return false;
    const { error } = await sb.from('reports').update({
      status,
      resolved_at: new Date().toISOString()
    }).eq('id', id);
    return !error;
  },

  async getPoemRecord(poemId) {
    const sb = SupabaseClient.get();
    if (!sb) return null;
    const { data, error } = await sb.from('poems').select('id, user_id, poet_name').eq('id', poemId).maybeSingle();
    if (error || !data) return null;
    return data;
  },

  async notifyPostOwner(poemId, type, textOverride) {
    const sb = SupabaseClient.get();
    const user = Auth.getCurrentUser();
    if (!sb || !user?.id) return false;

    const poem = await this.getPoemRecord(poemId);
    if (!poem?.user_id || poem.user_id === user.id) return false;

    const actorName = user.name || 'Someone';
    const text = textOverride || (type === 'like'
      ? `${actorName} liked your poem`
      : `${actorName} commented on your poem`);

    const { error } = await sb.rpc('create_notification', {
      p_user_id: poem.user_id,
      p_actor_id: user.id,
      p_type: type,
      p_text: text,
      p_poem_id: poemId,
      p_conversation_id: null
    });

    if (error) console.warn('notifyPostOwner:', error.message);

    if (typeof Realtime !== 'undefined') {
      await Realtime.broadcastUserNotification(poem.user_id, { type, text, poemId });
    }

    return !error;
  },

  async toggleLike(poemId) {
    const sb = SupabaseClient.get();
    const user = Auth.getCurrentUser();
    if (!sb || !user?.id) return null;

    const poem = await this.getPoemRecord(poemId);
    if (!poem) return null;

    const { data: existing } = await sb.from('likes').select('*').eq('user_id', user.id).eq('poem_id', poemId).maybeSingle();
    if (existing) {
      await sb.from('likes').delete().eq('user_id', user.id).eq('poem_id', poemId);
      if (typeof Realtime !== 'undefined') await Realtime.broadcastPoemUpdate(poemId, { type: 'unlike' });
      return false;
    }
    const { error } = await sb.from('likes').insert({ user_id: user.id, poem_id: poemId });
    if (error) {
      console.warn('toggleLike:', error.message);
      return null;
    }
    await this.notifyPostOwner(poemId, 'like');
    if (typeof Realtime !== 'undefined') await Realtime.broadcastPoemUpdate(poemId, { type: 'like' });
    return true;
  },

  async getUserLikes() {
    const sb = SupabaseClient.get();
    const user = Auth.getCurrentUser();
    if (!sb || !user?.id) return [];
    const { data } = await sb.from('likes').select('poem_id').eq('user_id', user.id);
    return (data || []).map(r => r.poem_id);
  },

  async toggleBookmark(poemId) {
    const sb = SupabaseClient.get();
    const user = Auth.getCurrentUser();
    if (!sb || !user?.id) return null;

    const { data: existing } = await sb.from('bookmarks').select('*').eq('user_id', user.id).eq('poem_id', poemId).maybeSingle();
    if (existing) {
      await sb.from('bookmarks').delete().eq('user_id', user.id).eq('poem_id', poemId);
      return false;
    }
    await sb.from('bookmarks').insert({ user_id: user.id, poem_id: poemId });
    return true;
  },

  async getUserBookmarks() {
    const sb = SupabaseClient.get();
    const user = Auth.getCurrentUser();
    if (!sb || !user?.id) return [];
    const { data } = await sb.from('bookmarks').select('poem_id').eq('user_id', user.id);
    return (data || []).map(r => r.poem_id);
  },

  async saveDraft(draft) {
    const sb = SupabaseClient.get();
    const user = Auth.getCurrentUser();
    if (!sb || !user?.id) return null;

    if (draft.id && typeof draft.id === 'number' && draft.id < 1e12) {
      const { data } = await sb.from('drafts').update({
        text: draft.text,
        tag_id: draft.tagId,
        card_theme: draft.cardTheme,
        updated_at: new Date().toISOString()
      }).eq('id', draft.id).eq('user_id', user.id).select().single();
      return data;
    }
    const { data } = await sb.from('drafts').insert({
      user_id: user.id,
      text: draft.text,
      tag_id: draft.tagId,
      card_theme: draft.cardTheme
    }).select().single();
    return data;
  },

  async getDrafts() {
    const sb = SupabaseClient.get();
    const user = Auth.getCurrentUser();
    if (!sb || !user?.id) return null;
    const { data } = await sb.from('drafts').select('*').eq('user_id', user.id).order('updated_at', { ascending: false });
    return (data || []).map(d => ({ id: d.id, text: d.text, tagId: d.tag_id, cardTheme: d.card_theme }));
  },

  async deleteDraft(id) {
    const sb = SupabaseClient.get();
    const user = Auth.getCurrentUser();
    if (!sb || !user?.id) return;
    await sb.from('drafts').delete().eq('id', id).eq('user_id', user.id);
  },

  async uploadAvatar(file) {
    const sb = SupabaseClient.get();
    const user = Auth.getCurrentUser();
    if (!sb || !user?.id) return null;

    const ext = file.name.split('.').pop();
    const path = `${user.id}/avatar.${ext}`;
    const { error } = await sb.storage.from('avatars').upload(path, file, { upsert: true });
    if (error) { console.warn('uploadAvatar:', error.message); return null; }

    const { data: urlData } = sb.storage.from('avatars').getPublicUrl(path);
    const avatarUrl = urlData.publicUrl + '?t=' + Date.now();

    await sb.from('profiles').update({ avatar_url: avatarUrl }).eq('id', user.id);
    return avatarUrl;
  },

  async syncUserData() {
    if (!SupabaseClient.isEnabled()) return;
    const likes = await this.getUserLikes();
    const bookmarks = await this.getUserBookmarks();
    if (likes.length) Storage.set(Storage.KEYS.LIKES, likes);
    if (bookmarks.length) Storage.set(Storage.KEYS.BOOKMARKS, bookmarks);
  },

  mapComment(row, profile) {
    const name = profile?.display_name || profile?.username || 'User';
    return {
      id: row.id,
      poemId: row.poem_id,
      userId: row.user_id,
      user: name,
      avatar: profile?.avatar_url || getAvatarUrl(name),
      text: row.text,
      time: this.timeAgo(row.created_at),
      created_at: row.created_at
    };
  },

  mapNotification(row) {
    return {
      id: row.id,
      type: row.type,
      text: row.text,
      read: row.read,
      time: this.timeAgo(row.created_at),
      poemId: row.poem_id,
      conversationId: row.conversation_id,
      actorId: row.actor_id,
      created_at: row.created_at
    };
  },

  mapMessage(row, currentUserId) {
    return {
      id: row.id,
      conversationId: row.conversation_id,
      senderId: row.sender_id,
      from: row.sender_id === currentUserId ? 'me' : 'them',
      text: row.text,
      time: this.formatMessageTime(row.created_at),
      read: !!row.read_at,
      created_at: row.created_at
    };
  },

  formatMessageTime(dateStr) {
    if (!dateStr) return '';
    const d = new Date(dateStr);
    const now = new Date();
    const isToday = d.toDateString() === now.toDateString();
    if (isToday) return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    return d.toLocaleDateString([], { month: 'short', day: 'numeric' }) + ' ' +
      d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  },

  async getComments(poemId) {
    const local = Storage.getPoemComments(poemId);
    const sb = SupabaseClient.get();
    if (!sb) return local;

    const poem = await this.getPoemRecord(poemId);
    if (!poem) return local;

    const { data, error } = await sb
      .from('comments')
      .select('*')
      .eq('poem_id', poemId)
      .order('created_at', { ascending: true });
    if (error) {
      console.warn('getComments:', error.message);
      return local;
    }
    if (!data?.length) return local;

    const userIds = [...new Set(data.map(c => c.user_id))];
    const { data: profiles } = await sb.from('profiles').select('id, display_name, username, avatar_url').in('id', userIds);
    const profileMap = Object.fromEntries((profiles || []).map(p => [p.id, p]));
    const remote = data.map(c => this.mapComment(c, profileMap[c.user_id]));
    const remoteIds = new Set(remote.map(c => c.id));
    return [...remote, ...local.filter(c => !remoteIds.has(c.id))];
  },

  async addComment(poemId, text) {
    const sb = SupabaseClient.get();
    const user = Auth.getCurrentUser();
    if (!sb || !user?.id || user.isGuest) return null;

    const poem = await this.getPoemRecord(poemId);
    if (!poem) return null;

    const { data, error } = await sb.from('comments').insert({
      poem_id: poemId,
      user_id: user.id,
      text
    }).select().single();

    if (error) {
      console.warn('addComment:', error.message);
      return null;
    }
    await this.notifyPostOwner(poemId, 'comment');
    if (typeof Realtime !== 'undefined') await Realtime.broadcastPoemUpdate(poemId, { type: 'comment' });
    const profile = await this.getProfile(user.id);
    return this.mapComment(data, profile);
  },

  async postComment(poemId, text) {
    const user = Auth.getCurrentUser();
    if (!user?.id || user.isGuest) return null;

    if (SupabaseClient.isEnabled()) {
      const dbComment = await this.addComment(poemId, text);
      if (dbComment) return dbComment;
    }

    return Storage.addPoemComment(poemId, text, user);
  },

  async getNotifications(limit = 50) {
    const sb = SupabaseClient.get();
    const user = Auth.getCurrentUser();
    if (!sb || !user?.id) return null;

    const { data, error } = await sb
      .from('notifications')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
      .limit(limit);
    if (error) { console.warn('getNotifications:', error.message); return null; }
    return (data || []).map(n => this.mapNotification(n));
  },

  async getUnreadNotificationCount() {
    const sb = SupabaseClient.get();
    const user = Auth.getCurrentUser();
    if (!sb || !user?.id) return 0;

    const { count, error } = await sb
      .from('notifications')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', user.id)
      .eq('read', false);
    if (error) return 0;
    return count || 0;
  },

  async markNotificationRead(id) {
    const sb = SupabaseClient.get();
    const user = Auth.getCurrentUser();
    if (!sb || !user?.id) return false;
    const { error } = await sb.from('notifications').update({ read: true }).eq('id', id).eq('user_id', user.id);
    return !error;
  },

  async markAllNotificationsRead() {
    const sb = SupabaseClient.get();
    const user = Auth.getCurrentUser();
    if (!sb || !user?.id) return false;
    const { error } = await sb.from('notifications').update({ read: true }).eq('user_id', user.id).eq('read', false);
    return !error;
  },

  async searchProfiles(query, limit = 10) {
    const sb = SupabaseClient.get();
    const user = Auth.getCurrentUser();
    if (!sb || !query?.trim()) return [];

    const q = query.trim();
    const { data, error } = await sb
      .from('profiles')
      .select('id, username, display_name, avatar_url')
      .or(`display_name.ilike.%${q}%,username.ilike.%${q}%`)
      .neq('id', user?.id || '')
      .limit(limit);
    if (error) { console.warn('searchProfiles:', error.message); return []; }
    return (data || []).map(p => ({
      id: p.id,
      name: p.display_name || p.username || 'User',
      username: p.username,
      avatar: p.avatar_url || getAvatarUrl(p.display_name || p.username)
    }));
  },

  async getOrCreateConversation(otherUserId) {
    const sb = SupabaseClient.get();
    if (!sb || !otherUserId) return null;
    const { data, error } = await sb.rpc('get_or_create_conversation', { other_user_id: otherUserId });
    if (error) { console.warn('getOrCreateConversation:', error.message); return null; }
    return data;
  },

  async getConversations() {
    const sb = SupabaseClient.get();
    const user = Auth.getCurrentUser();
    if (!sb || !user?.id) return null;

    const { data, error } = await sb
      .from('conversations')
      .select('*')
      .or(`user1_id.eq.${user.id},user2_id.eq.${user.id}`)
      .order('last_message_at', { ascending: false });
    if (error) { console.warn('getConversations:', error.message); return null; }

    const convs = data || [];
    if (!convs.length) return [];

    const otherIds = convs.map(c => c.user1_id === user.id ? c.user2_id : c.user1_id);
    const { data: profiles } = await sb.from('profiles').select('id, display_name, username, avatar_url').in('id', otherIds);
    const profileMap = Object.fromEntries((profiles || []).map(p => [p.id, p]));

    const convIds = convs.map(c => c.id);
    const { data: lastMsgs } = await sb
      .from('messages')
      .select('conversation_id, text, created_at, sender_id, read_at')
      .in('conversation_id', convIds)
      .order('created_at', { ascending: false });

    const lastByConv = {};
    (lastMsgs || []).forEach(m => {
      if (!lastByConv[m.conversation_id]) lastByConv[m.conversation_id] = m;
    });

    const { data: unreadRows } = await sb
      .from('messages')
      .select('conversation_id')
      .in('conversation_id', convIds)
      .neq('sender_id', user.id)
      .is('read_at', null);

    const unreadMap = {};
    (unreadRows || []).forEach(m => {
      unreadMap[m.conversation_id] = (unreadMap[m.conversation_id] || 0) + 1;
    });

    return convs.map(c => {
      const otherId = c.user1_id === user.id ? c.user2_id : c.user1_id;
      const profile = profileMap[otherId] || {};
      const last = lastByConv[c.id];
      return {
        id: c.id,
        otherUserId: otherId,
        user: profile.display_name || profile.username || 'User',
        avatar: profile.avatar_url || getAvatarUrl(profile.display_name || profile.username),
        lastMessage: last?.text || 'No messages yet',
        time: last ? this.timeAgo(last.created_at) : this.timeAgo(c.created_at),
        unread: unreadMap[c.id] || 0
      };
    });
  },

  async getMessages(conversationId) {
    const sb = SupabaseClient.get();
    const user = Auth.getCurrentUser();
    if (!sb || !user?.id) return null;

    const { data, error } = await sb
      .from('messages')
      .select('*')
      .eq('conversation_id', conversationId)
      .order('created_at', { ascending: true });
    if (error) { console.warn('getMessages:', error.message); return null; }
    return (data || []).map(m => this.mapMessage(m, user.id));
  },

  async sendMessage(conversationId, text) {
    const sb = SupabaseClient.get();
    const user = Auth.getCurrentUser();
    if (!sb || !user?.id) return null;

    const { data, error } = await sb.from('messages').insert({
      conversation_id: conversationId,
      sender_id: user.id,
      text
    }).select().single();
    if (error) { console.warn('sendMessage:', error.message); return null; }
    return this.mapMessage(data, user.id);
  },

  async markConversationRead(conversationId) {
    const sb = SupabaseClient.get();
    const user = Auth.getCurrentUser();
    if (!sb || !user?.id) return;
    await sb.from('messages')
      .update({ read_at: new Date().toISOString() })
      .eq('conversation_id', conversationId)
      .neq('sender_id', user.id)
      .is('read_at', null);
  },

  async getPoemCounts(poemId) {
    const sb = SupabaseClient.get();
    if (!sb) return null;
    const { data } = await sb.from('poems').select('likes_count, comments_count').eq('id', poemId).single();
    return data ? { likes: data.likes_count || 0, comments: data.comments_count || 0 } : null;
  },

  mapMushairaEvent(row) {
    if (!row) return null;
    return {
      id: row.id,
      title: row.title,
      host: row.host_name,
      date: row.event_date || API.timeAgo(row.created_at),
      time: row.event_time || 'Now',
      location: row.location || 'Online',
      live: row.is_live !== false,
      registered: row.registered_count || 0,
      ownerId: row.user_id,
      userPost: true,
      created_at: row.created_at
    };
  },

  mapVoiceRoom(row) {
    if (!row) return null;
    return {
      id: row.id,
      title: row.title,
      host: row.host_name,
      participants: row.participant_count || 0,
      active: row.is_active !== false,
      desc: row.description || '',
      userPost: true,
      ownerId: row.user_id
    };
  },

  async fetchMushairaEvents() {
    const sb = SupabaseClient.get();
    if (!sb) return null;
    const { data, error } = await sb
      .from('mushaira_events')
      .select('*')
      .order('created_at', { ascending: false });
    if (error) {
      console.warn('fetchMushairaEvents:', error.message);
      return null;
    }
    return (data || []).map(r => this.mapMushairaEvent(r));
  },

  async fetchMushairaEventById(id) {
    const sb = SupabaseClient.get();
    if (!sb) return null;
    const { data, error } = await sb
      .from('mushaira_events')
      .select('*')
      .eq('id', parseInt(id, 10))
      .maybeSingle();
    if (error) {
      console.warn('fetchMushairaEventById:', error.message);
      return null;
    }
    return data ? this.mapMushairaEvent(data) : null;
  },

  async createMushairaEvent(event) {
    const sb = SupabaseClient.get();
    const user = Auth.getCurrentUser();
    if (!sb || !user?.id || user.isGuest) return null;

    const now = new Date();
    const { data, error } = await sb.from('mushaira_events').insert({
      user_id: user.id,
      host_name: user.name || 'Host',
      title: event.title,
      location: event.location || 'Online',
      event_date: now.toLocaleDateString(),
      event_time: now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      is_live: event.live !== false,
      registered_count: 1
    }).select().single();

    if (error) {
      console.warn('createMushairaEvent:', error.message);
      return null;
    }
    return this.mapMushairaEvent(data);
  },

  async deleteMushairaEvent(id) {
    const sb = SupabaseClient.get();
    const user = Auth.getCurrentUser();
    if (!sb || !user?.id || user.isGuest) return false;

    const eventId = parseInt(id, 10);
    if (!eventId) return false;

    const { error } = await sb
      .from('mushaira_events')
      .delete()
      .eq('id', eventId)
      .eq('user_id', user.id);

    if (error) {
      console.warn('deleteMushairaEvent:', error.message);
      return false;
    }
    return true;
  },

  async fetchVoiceRooms() {
    const sb = SupabaseClient.get();
    if (!sb) return null;
    const { data, error } = await sb
      .from('voice_rooms')
      .select('*')
      .eq('is_active', true)
      .order('created_at', { ascending: false });
    if (error) {
      console.warn('fetchVoiceRooms:', error.message);
      return null;
    }
    return (data || []).map(r => this.mapVoiceRoom(r));
  },

  async createVoiceRoom(room) {
    const sb = SupabaseClient.get();
    const user = Auth.getCurrentUser();
    if (!sb || !user?.id || user.isGuest) return null;

    const { data, error } = await sb.from('voice_rooms').insert({
      user_id: user.id,
      host_name: user.name || 'Host',
      title: room.title,
      description: room.desc || '',
      is_active: true,
      participant_count: 1
    }).select().single();

    if (error) {
      console.warn('createVoiceRoom:', error.message);
      return null;
    }
    return this.mapVoiceRoom(data);
  }
};
