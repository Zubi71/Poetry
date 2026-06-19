# Supabase Setup Guide — Urdu Poetry

Follow these steps to make the site live with real user registration, login, and cloud database.

## Architecture

| Layer | Service |
|-------|---------|
| Frontend | HTML/CSS/JS → GitHub Pages, Netlify, or Vercel |
| Auth | Supabase Auth (Email, Google, Facebook) |
| Database | PostgreSQL (Supabase) |
| Files | Supabase Storage (avatars, poem images) |

---

## Step 1: Create Supabase Project

1. Go to [supabase.com](https://supabase.com) and sign up / log in
2. Click **New Project**
3. Choose a name (e.g. `urdu-poetry`), set a database password, pick a region close to your users
4. Wait for the project to finish provisioning

---

## Step 2: Run Database Schema

1. Open **SQL Editor** in your Supabase dashboard
2. Copy the entire contents of `supabase/schema.sql` and click **Run**
3. Copy the contents of `supabase/storage.sql` and click **Run**
4. Copy the contents of `supabase/realtime-social.sql` and click **Run**

   **Or** if you only need to fix notifications, run `supabase/fix-notifications.sql` — it creates all social tables and functions in one go.

This creates tables: `profiles`, `poems`, `likes`, `bookmarks`, `drafts`, `writing_tags`, `reports`, `notifications`, `conversations`, `messages`, and enables real-time triggers.

---

## Step 3: Configure Authentication

### Email + Password
1. Go to **Authentication → Providers → Email**
2. Enable **Email** provider

### Google Login
1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Create OAuth 2.0 Client ID (Web application)
3. Add authorized redirect URI: `https://YOUR_PROJECT_ID.supabase.co/auth/v1/callback`
4. In Supabase: **Authentication → Providers → Google** → paste Client ID and Secret

### Facebook Login
1. Go to [Meta for Developers](https://developers.facebook.com/)
2. Create an app → add **Facebook Login**
3. Add OAuth redirect URI: `https://YOUR_PROJECT_ID.supabase.co/auth/v1/callback`
4. In Supabase: **Authentication → Providers → Facebook** → paste App ID and Secret

### Site URL (important!)
1. Go to **Authentication → URL Configuration**
2. Set **Site URL** to your live site, e.g. `https://zubi71.github.io/Poetry/`
3. Add the same URL to **Redirect URLs**

---

## Step 4: Connect Your Frontend

1. In Supabase: **Project Settings → API**
2. Copy **Project URL** and **anon public** key
3. Open `js/supabase-config.js` and update:

```javascript
const SUPABASE_CONFIG = {
  url: 'https://xxxxxxxx.supabase.co',
  anonKey: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...',
  enabled: true
};
```

4. Set `enabled: true` when credentials are real

---

## Step 5: Create Admin User

1. Register on your site with your admin email
2. In Supabase **SQL Editor**, run:

```sql
UPDATE public.profiles
SET is_admin = true
WHERE id = (
  SELECT id FROM auth.users WHERE email = 'your-admin@email.com'
);
```

---

## Step 6: Deploy Frontend

### GitHub Pages
1. Push to [github.com/Zubi71/Poetry](https://github.com/Zubi71/Poetry)
2. **Settings → Pages** → branch `main`, folder `/ (root)`
3. Live at: `https://zubi71.github.io/Poetry/`

### Netlify
1. Connect repo — publish directory: `/`
2. `netlify.toml` is included for SPA support

---

## Step 7: Test

1. Register with name, **username**, email, password
2. Login with **email OR username** + password
3. Test Google / Facebook buttons
4. Post poetry via **(+)** — saves to PostgreSQL

When `enabled: false` in config, the app runs in local demo mode.
