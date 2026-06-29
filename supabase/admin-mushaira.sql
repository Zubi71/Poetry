-- ============================================================
-- Admin override for Mushaira events
-- Run in Supabase SQL Editor (after migrate-user-role.sql)
--
-- Without this, the existing "Hosts can delete own mushaira" policy
-- means only the original creator can delete/update an event — an
-- admin clicking Delete in the Admin Panel matches 0 rows (no error,
-- just silently does nothing) and the event reappears after refresh.
-- ============================================================

DROP POLICY IF EXISTS "Admins manage mushaira" ON public.mushaira_events;
CREATE POLICY "Admins manage mushaira" ON public.mushaira_events FOR ALL USING (
  EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND user_role = 'admin')
);
