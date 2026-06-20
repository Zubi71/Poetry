-- ============================================================
-- Live Mushaira v3 — Run after live-mushaira-v2.sql
-- Speaker requests, bans, extra policies, realtime
-- ============================================================

CREATE TABLE IF NOT EXISTS public.session_speaker_requests (
  id BIGSERIAL PRIMARY KEY,
  session_id BIGINT NOT NULL REFERENCES public.mushaira_events(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  display_name TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'denied')),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.session_bans (
  id BIGSERIAL PRIMARY KEY,
  session_id BIGINT NOT NULL REFERENCES public.mushaira_events(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  banned_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  reason TEXT DEFAULT '',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(session_id, user_id)
);

CREATE INDEX IF NOT EXISTS idx_speaker_requests_session ON public.session_speaker_requests(session_id, status);
CREATE INDEX IF NOT EXISTS idx_session_bans_session ON public.session_bans(session_id);

ALTER TABLE public.session_speaker_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.session_bans ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Speaker requests public read" ON public.session_speaker_requests;
CREATE POLICY "Speaker requests public read" ON public.session_speaker_requests FOR SELECT USING (true);

DROP POLICY IF EXISTS "Auth users request to speak" ON public.session_speaker_requests;
CREATE POLICY "Auth users request to speak" ON public.session_speaker_requests
  FOR INSERT WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Hosts update speaker requests" ON public.session_speaker_requests;
CREATE POLICY "Hosts update speaker requests" ON public.session_speaker_requests
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM public.mushaira_events e
      WHERE e.id = session_id AND e.user_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "Session bans public read" ON public.session_bans;
CREATE POLICY "Session bans public read" ON public.session_bans FOR SELECT USING (true);

DROP POLICY IF EXISTS "Hosts can ban users" ON public.session_bans;
CREATE POLICY "Hosts can ban users" ON public.session_bans
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.mushaira_events e
      WHERE e.id = session_id AND e.user_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "Auth join audience" ON public.session_audience;
CREATE POLICY "Auth join audience" ON public.session_audience
  FOR INSERT WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Auth leave audience" ON public.session_audience;
CREATE POLICY "Auth leave audience" ON public.session_audience
  FOR DELETE USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Auth delete own comments" ON public.session_comments;
CREATE POLICY "Auth delete own comments" ON public.session_comments
  FOR DELETE USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Hosts pin comments" ON public.session_comments;
CREATE POLICY "Hosts pin comments" ON public.session_comments
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM public.mushaira_events e
      WHERE e.id = session_id AND e.user_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "Session donations public read" ON public.session_donations;
CREATE POLICY "Session donations public read" ON public.session_donations FOR SELECT USING (true);

DROP POLICY IF EXISTS "Auth users donate" ON public.session_donations;
CREATE POLICY "Auth users donate" ON public.session_donations
  FOR INSERT WITH CHECK (auth.uid() = sender_id);

DROP POLICY IF EXISTS "Hosts manage speakers" ON public.session_speakers;
CREATE POLICY "Hosts manage speakers" ON public.session_speakers
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM public.mushaira_events e
      WHERE e.id = session_id AND e.user_id = auth.uid()
    )
  );

DO $$ BEGIN
  ALTER PUBLICATION supabase_realtime ADD TABLE public.session_comments;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  ALTER PUBLICATION supabase_realtime ADD TABLE public.session_speaker_requests;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

ALTER TABLE public.session_comments REPLICA IDENTITY FULL;
ALTER TABLE public.session_speaker_requests REPLICA IDENTITY FULL;
