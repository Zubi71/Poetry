-- ============================================================
-- Mushaira Events (shared across all users, real-time)
-- Run in Supabase SQL Editor
-- ============================================================

CREATE TABLE IF NOT EXISTS public.mushaira_events (
  id BIGSERIAL PRIMARY KEY,
  user_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  host_name TEXT NOT NULL,
  title TEXT NOT NULL,
  location TEXT DEFAULT 'Online',
  event_date TEXT,
  event_time TEXT,
  is_live BOOLEAN DEFAULT TRUE,
  registered_count INT DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_mushaira_events_created ON public.mushaira_events(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_mushaira_events_live ON public.mushaira_events(is_live) WHERE is_live = TRUE;

ALTER TABLE public.mushaira_events ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Mushaira events viewable by everyone" ON public.mushaira_events;
CREATE POLICY "Mushaira events viewable by everyone" ON public.mushaira_events
  FOR SELECT USING (true);

DROP POLICY IF EXISTS "Authenticated users can create mushaira" ON public.mushaira_events;
CREATE POLICY "Authenticated users can create mushaira" ON public.mushaira_events
  FOR INSERT WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Hosts can update own mushaira" ON public.mushaira_events;
CREATE POLICY "Hosts can update own mushaira" ON public.mushaira_events
  FOR UPDATE USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Hosts can delete own mushaira" ON public.mushaira_events;
CREATE POLICY "Hosts can delete own mushaira" ON public.mushaira_events
  FOR DELETE USING (auth.uid() = user_id);

DO $$ BEGIN
  ALTER PUBLICATION supabase_realtime ADD TABLE public.mushaira_events;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

ALTER TABLE public.mushaira_events REPLICA IDENTITY FULL;

-- Voice rooms (user-created, shared globally)
CREATE TABLE IF NOT EXISTS public.voice_rooms (
  id BIGSERIAL PRIMARY KEY,
  user_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  host_name TEXT NOT NULL,
  title TEXT NOT NULL,
  description TEXT DEFAULT '',
  is_active BOOLEAN DEFAULT TRUE,
  participant_count INT DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_voice_rooms_created ON public.voice_rooms(created_at DESC);

ALTER TABLE public.voice_rooms ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Voice rooms viewable by everyone" ON public.voice_rooms;
CREATE POLICY "Voice rooms viewable by everyone" ON public.voice_rooms
  FOR SELECT USING (true);

DROP POLICY IF EXISTS "Authenticated users can create voice rooms" ON public.voice_rooms;
CREATE POLICY "Authenticated users can create voice rooms" ON public.voice_rooms
  FOR INSERT WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Hosts can update own voice rooms" ON public.voice_rooms;
CREATE POLICY "Hosts can update own voice rooms" ON public.voice_rooms
  FOR UPDATE USING (auth.uid() = user_id);

DO $$ BEGIN
  ALTER PUBLICATION supabase_realtime ADD TABLE public.voice_rooms;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

ALTER TABLE public.voice_rooms REPLICA IDENTITY FULL;
