const API = {
  mapPoem(row) {
    if (!row) return null;
    const ago = this.timeAgo(row.created_at);
    return {
      id: row.id,
      poetId: row.user_id || 0,
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
      isAdmin: row?.is_admin || false,
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

  async toggleLike(poemId) {
    const sb = SupabaseClient.get();
    const user = Auth.getCurrentUser();
    if (!sb || !user?.id) return null;

    const { data: existing } = await sb.from('likes').select('*').eq('user_id', user.id).eq('poem_id', poemId).maybeSingle();
    if (existing) {
      await sb.from('likes').delete().eq('user_id', user.id).eq('poem_id', poemId);
      return false;
    }
    await sb.from('likes').insert({ user_id: user.id, poem_id: poemId });
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
  }
};
