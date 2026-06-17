# Urdu Poetry

A gathering of souls through verse — HTML/CSS/JS poetry platform with Supabase backend.

## Live Stack

- **Frontend:** HTML, CSS, JavaScript
- **Backend:** Supabase (Auth + API)
- **Database:** PostgreSQL
- **Storage:** Supabase Storage (avatars, images)

## Quick Start (Local)

```bash
npx serve .
```

Open `http://localhost:3000` (or the port shown).

## Go Live with Supabase

**Read the full guide:** [SUPABASE_SETUP.md](SUPABASE_SETUP.md)

1. Create a project at [supabase.com](https://supabase.com)
2. Run `supabase/schema.sql` and `supabase/storage.sql` in SQL Editor
3. Enable Email, Google, Facebook in Authentication
4. Add your keys to `js/supabase-config.js` and set `enabled: true`
5. Deploy to GitHub Pages, Netlify, or Vercel

## Deploy

- **GitHub Pages:** `https://zubi71.github.io/Poetry/`
- **Netlify:** Connect repo (uses included `netlify.toml`)
