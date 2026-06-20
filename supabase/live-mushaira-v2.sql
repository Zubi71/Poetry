-- ============================================================
-- Live Mushaira v2 — Extended schema (run after mushaira-events.sql)
-- Maps to developer spec: sessions, speakers, audience, chat, reactions, donations
-- ============================================================

-- Session status enum
DO $$ BEGIN
  CREATE TYPE public.session_status AS ENUM ('waiting', 'scheduled', 'live', 'paused', 'ended');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- Extend mushaira_events OR create live_sessions view alias
-- Add columns to existing table if missing
ALTER TABLE public.mushaira_events
  ADD COLUMN IF NOT EXISTS description TEXT DEFAULT '',
  ADD COLUMN IF NOT EXISTS thumbnail_url TEXT,
  ADD COLUMN IF NOT EXISTS category TEXT DEFAULT 'poetry',
  ADD COLUMN IF NOT EXISTS status public.session_status DEFAULT 'live',
  ADD COLUMN IF NOT EXISTS end_time TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS duration_minutes INT DEFAULT 0,
  ADD COLUMN IF NOT EXISTS viewer_count INT DEFAULT 0,
  ADD COLUMN IF NOT EXISTS like_count INT DEFAULT 0,
  ADD COLUMN IF NOT EXISTS ended_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS replay_url TEXT;

-- Sync status from is_live for existing rows
UPDATE public.mushaira_events
SET status = CASE
  WHEN is_live = true THEN 'live'::public.session_status
  WHEN ended_at IS NOT NULL THEN 'ended'::public.session_status
  ELSE 'scheduled'::public.session_status
END
WHERE status IS NULL OR status = 'live' AND is_live = false;

CREATE TABLE IF NOT EXISTS public.session_speakers (
  id BIGSERIAL PRIMARY KEY,
  session_id BIGINT NOT NULL REFERENCES public.mushaira_events(id) ON DELETE CASCADE,
  user_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  display_name TEXT NOT NULL,
  role TEXT NOT NULL DEFAULT 'speaker' CHECK (role IN ('host', 'speaker', 'guest')),
  is_muted BOOLEAN DEFAULT false,
  sort_order INT DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.session_audience (
  id BIGSERIAL PRIMARY KEY,
  session_id BIGINT NOT NULL REFERENCES public.mushaira_events(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  joined_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(session_id, user_id)
);

CREATE TABLE IF NOT EXISTS public.session_comments (
  id BIGSERIAL PRIMARY KEY,
  session_id BIGINT NOT NULL REFERENCES public.mushaira_events(id) ON DELETE CASCADE,
  user_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  author_name TEXT NOT NULL,
  message TEXT NOT NULL,
  is_pinned BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.session_reactions (
  id BIGSERIAL PRIMARY KEY,
  session_id BIGINT NOT NULL REFERENCES public.mushaira_events(id) ON DELETE CASCADE,
  user_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  reaction_type TEXT NOT NULL CHECK (reaction_type IN ('heart', 'clap', 'fire')),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.session_donations (
  id BIGSERIAL PRIMARY KEY,
  session_id BIGINT NOT NULL REFERENCES public.mushaira_events(id) ON DELETE CASCADE,
  sender_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  sender_name TEXT NOT NULL,
  amount INT NOT NULL DEFAULT 0,
  gift_type TEXT DEFAULT 'coin',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.session_reminders (
  id BIGSERIAL PRIMARY KEY,
  session_id BIGINT NOT NULL REFERENCES public.mushaira_events(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  remind_at TIMESTAMPTZ NOT NULL,
  sent BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(session_id, user_id, remind_at)
);

CREATE INDEX IF NOT EXISTS idx_session_speakers_session ON public.session_speakers(session_id);
CREATE INDEX IF NOT EXISTS idx_session_comments_session ON public.session_comments(session_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_session_reactions_session ON public.session_reactions(session_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_mushaira_events_status ON public.mushaira_events(status);

ALTER TABLE public.session_speakers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.session_audience ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.session_comments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.session_reactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.session_donations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.session_reminders ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Session speakers public read" ON public.session_speakers FOR SELECT USING (true);
CREATE POLICY "Session audience public read" ON public.session_audience FOR SELECT USING (true);
CREATE POLICY "Session comments public read" ON public.session_comments FOR SELECT USING (true);
CREATE POLICY "Auth users post comments" ON public.session_comments FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Auth users post reactions" ON public.session_reactions FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Auth users set reminders" ON public.session_reminders FOR ALL USING (auth.uid() = user_id);
