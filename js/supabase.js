const SupabaseClient = {
  client: null,
  ready: false,

  isEnabled() {
    return SUPABASE_CONFIG &&
      SUPABASE_CONFIG.enabled &&
      SUPABASE_CONFIG.url &&
      !SUPABASE_CONFIG.url.includes('YOUR_PROJECT_ID') &&
      SUPABASE_CONFIG.anonKey &&
      !SUPABASE_CONFIG.anonKey.includes('YOUR_SUPABASE');
  },

  init() {
    if (!this.isEnabled() || typeof supabase === 'undefined') {
      this.ready = false;
      return null;
    }
    this.client = supabase.createClient(SUPABASE_CONFIG.url, SUPABASE_CONFIG.anonKey, {
      auth: {
        flowType: 'pkce',
        detectSessionInUrl: true,
        persistSession: true
      }
    });
    this.ready = true;
    return this.client;
  },

  get() {
    if (!this.client) this.init();
    return this.client;
  }
};
