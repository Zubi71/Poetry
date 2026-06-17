-- ============================================================
-- Urdu Poetry — Supabase PostgreSQL Schema
-- Run in: Supabase Dashboard → SQL Editor → New Query → Run
-- ============================================================

-- Profiles (extends auth.users)
DO $$ BEGIN
  CREATE TYPE public.user_role AS ENUM ('user', 'admin');
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

CREATE TABLE IF NOT EXISTS public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  username TEXT UNIQUE,
  display_name TEXT,
  avatar_url TEXT,
  bio TEXT DEFAULT '',
  user_role public.user_role NOT NULL DEFAULT 'user',
  is_premium BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Writing tags (admin-managed, shown in compose window)
CREATE TABLE IF NOT EXISTS public.writing_tags (
  id SERIAL PRIMARY KEY,
  label TEXT NOT NULL,
  label_en TEXT,
  sort_order INT DEFAULT 0,
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Poems
CREATE TABLE IF NOT EXISTS public.poems (
  id BIGSERIAL PRIMARY KEY,
  user_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  poet_name TEXT NOT NULL,
  text TEXT NOT NULL,
  english TEXT,
  category TEXT DEFAULT 'shayari',
  tag_label TEXT,
  card_theme TEXT DEFAULT 'classic-dark',
  likes_count INT DEFAULT 0,
  comments_count INT DEFAULT 0,
  shares_count INT DEFAULT 0,
  is_trending BOOLEAN DEFAULT FALSE,
  is_featured BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Likes
CREATE TABLE IF NOT EXISTS public.likes (
  user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
  poem_id BIGINT REFERENCES public.poems(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  PRIMARY KEY (user_id, poem_id)
);

-- Bookmarks
CREATE TABLE IF NOT EXISTS public.bookmarks (
  user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
  poem_id BIGINT REFERENCES public.poems(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  PRIMARY KEY (user_id, poem_id)
);

-- Comments
CREATE TABLE IF NOT EXISTS public.comments (
  id BIGSERIAL PRIMARY KEY,
  poem_id BIGINT REFERENCES public.poems(id) ON DELETE CASCADE,
  user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
  text TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Following poets/users
CREATE TABLE IF NOT EXISTS public.following (
  follower_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
  following_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  PRIMARY KEY (follower_id, following_id)
);

-- Drafts
CREATE TABLE IF NOT EXISTS public.drafts (
  id BIGSERIAL PRIMARY KEY,
  user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
  text TEXT NOT NULL,
  tag_id INT,
  card_theme TEXT DEFAULT 'classic-dark',
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Scheduled posts
CREATE TABLE IF NOT EXISTS public.scheduled_posts (
  id BIGSERIAL PRIMARY KEY,
  user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
  text TEXT NOT NULL,
  tag_id INT,
  tag_label TEXT,
  card_theme TEXT DEFAULT 'classic-dark',
  schedule_at TIMESTAMPTZ NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Reports (moderation)
CREATE TABLE IF NOT EXISTS public.reports (
  id BIGSERIAL PRIMARY KEY,
  reporter_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  report_type TEXT NOT NULL,
  target_id TEXT NOT NULL,
  reason TEXT,
  status TEXT DEFAULT 'pending',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  resolved_at TIMESTAMPTZ
);

-- Featured poem (home slider)
CREATE TABLE IF NOT EXISTS public.featured_poem (
  id INT PRIMARY KEY DEFAULT 1 CHECK (id = 1),
  poem_id BIGINT REFERENCES public.poems(id) ON DELETE SET NULL,
  set_by UUID REFERENCES public.profiles(id),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Reading history
CREATE TABLE IF NOT EXISTS public.reading_history (
  user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
  poem_id BIGINT REFERENCES public.poems(id) ON DELETE CASCADE,
  read_at TIMESTAMPTZ DEFAULT NOW(),
  PRIMARY KEY (user_id, poem_id)
);

-- ============================================================
-- Indexes
-- ============================================================
CREATE INDEX IF NOT EXISTS idx_poems_user_id ON public.poems(user_id);
CREATE INDEX IF NOT EXISTS idx_poems_created_at ON public.poems(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_poems_category ON public.poems(category);
CREATE INDEX IF NOT EXISTS idx_comments_poem_id ON public.comments(poem_id);
CREATE INDEX IF NOT EXISTS idx_profiles_username ON public.profiles(username);

-- ============================================================
-- Auto-create profile on signup
-- ============================================================
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (id, username, display_name, avatar_url)
  VALUES (
    NEW.id,
    LOWER(COALESCE(NEW.raw_user_meta_data->>'username', SPLIT_PART(NEW.email, '@', 1))),
    COALESCE(NEW.raw_user_meta_data->>'display_name', SPLIT_PART(NEW.email, '@', 1)),
    NEW.raw_user_meta_data->>'avatar_url'
  )
  ON CONFLICT (id) DO UPDATE SET
    display_name = COALESCE(EXCLUDED.display_name, profiles.display_name),
    username = COALESCE(EXCLUDED.username, profiles.username);
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- ============================================================
-- Login with username OR email
-- ============================================================
CREATE OR REPLACE FUNCTION public.get_login_email(identifier TEXT)
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  result TEXT;
BEGIN
  IF identifier LIKE '%@%' THEN
    RETURN LOWER(TRIM(identifier));
  END IF;
  SELECT au.email INTO result
  FROM public.profiles p
  JOIN auth.users au ON au.id = p.id
  WHERE LOWER(p.username) = LOWER(TRIM(identifier));
  RETURN result;
END;
$$;

-- ============================================================
-- Seed default writing tags
-- ============================================================
INSERT INTO public.writing_tags (label, label_en, sort_order) VALUES
  ('شعر', 'Sher', 1),
  ('قطعہ', 'Qita', 2),
  ('غزل', 'Ghazal', 3),
  ('نظم', 'Nazm', 4),
  ('رباعی', 'Rubai', 5),
  ('شاعری', 'Shayari', 6),
  ('اقتباس', 'Quote', 7);

-- ============================================================
-- Row Level Security
-- ============================================================
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.poems ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.likes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.bookmarks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.comments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.following ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.drafts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.scheduled_posts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.reports ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.writing_tags ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.featured_poem ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.reading_history ENABLE ROW LEVEL SECURITY;

-- Profiles
CREATE POLICY "Profiles are viewable by everyone" ON public.profiles FOR SELECT USING (true);
CREATE POLICY "Users can update own profile" ON public.profiles FOR UPDATE USING (auth.uid() = id);
CREATE POLICY "Users can insert own profile" ON public.profiles FOR INSERT WITH CHECK (auth.uid() = id);

-- Poems
CREATE POLICY "Poems are viewable by everyone" ON public.poems FOR SELECT USING (true);
CREATE POLICY "Authenticated users can insert poems" ON public.poems FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own poems" ON public.poems FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own poems" ON public.poems FOR DELETE USING (auth.uid() = user_id);

-- Likes
CREATE POLICY "Likes viewable by everyone" ON public.likes FOR SELECT USING (true);
CREATE POLICY "Users manage own likes" ON public.likes FOR ALL USING (auth.uid() = user_id);

-- Bookmarks
CREATE POLICY "Users view own bookmarks" ON public.bookmarks FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users manage own bookmarks" ON public.bookmarks FOR ALL USING (auth.uid() = user_id);

-- Comments
CREATE POLICY "Comments viewable by everyone" ON public.comments FOR SELECT USING (true);
CREATE POLICY "Authenticated users can comment" ON public.comments FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users delete own comments" ON public.comments FOR DELETE USING (auth.uid() = user_id);

-- Following
CREATE POLICY "Following viewable by everyone" ON public.following FOR SELECT USING (true);
CREATE POLICY "Users manage own following" ON public.following FOR ALL USING (auth.uid() = follower_id);

-- Drafts
CREATE POLICY "Users manage own drafts" ON public.drafts FOR ALL USING (auth.uid() = user_id);

-- Scheduled
CREATE POLICY "Users manage own scheduled" ON public.scheduled_posts FOR ALL USING (auth.uid() = user_id);

-- Reports
CREATE POLICY "Users can submit reports" ON public.reports FOR INSERT WITH CHECK (auth.uid() = reporter_id);
CREATE POLICY "Admins view all reports" ON public.reports FOR SELECT USING (
  EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND user_role = 'admin')
);
CREATE POLICY "Admins update reports" ON public.reports FOR UPDATE USING (
  EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND user_role = 'admin')
);

-- Writing tags
CREATE POLICY "Tags viewable by everyone" ON public.writing_tags FOR SELECT USING (is_active = true);
CREATE POLICY "Admins manage tags" ON public.writing_tags FOR ALL USING (
  EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND user_role = 'admin')
);

-- Featured
CREATE POLICY "Featured viewable by everyone" ON public.featured_poem FOR SELECT USING (true);
CREATE POLICY "Admins manage featured" ON public.featured_poem FOR ALL USING (
  EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND user_role = 'admin')
);

-- Reading history
CREATE POLICY "Users manage own history" ON public.reading_history FOR ALL USING (auth.uid() = user_id);

-- ============================================================
-- Storage buckets (run separately or via Dashboard → Storage)
-- ============================================================
-- Create buckets: avatars, poem-images (public read)
-- Policy: authenticated users can upload to avatars/{user_id}/*
