-- ============================================================
-- Notify every user when a mushaira goes live
-- Run in Supabase SQL Editor (after realtime-social.sql / fix-notifications.sql
-- and mushaira-events.sql)
-- ============================================================

-- The notifications table only allowed like/comment/message/follow — add 'event'.
ALTER TABLE public.notifications DROP CONSTRAINT IF EXISTS notifications_type_check;
ALTER TABLE public.notifications ADD CONSTRAINT notifications_type_check
  CHECK (type IN ('like', 'comment', 'message', 'follow', 'event'));

-- Lets the client deep-link a "X is live now" notification straight to the room.
ALTER TABLE public.notifications
  ADD COLUMN IF NOT EXISTS mushaira_event_id BIGINT REFERENCES public.mushaira_events(id) ON DELETE CASCADE;

CREATE OR REPLACE FUNCTION public.notify_mushaira_live()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  host_label TEXT;
BEGIN
  -- Fire only on the transition INTO live — not on every later update to an
  -- already-live row (viewer_count ticks, like_count, etc. all go through
  -- the same generic update path and would otherwise re-notify everyone).
  IF NEW.status IS DISTINCT FROM 'live' THEN RETURN NEW; END IF;
  IF TG_OP = 'UPDATE' AND OLD.status = 'live' THEN RETURN NEW; END IF;

  host_label := COALESCE(NEW.host_name, 'Someone');

  INSERT INTO public.notifications (user_id, actor_id, type, text, mushaira_event_id)
  SELECT p.id, NEW.user_id, 'event', host_label || ' is live now: ' || NEW.title, NEW.id
  FROM public.profiles p
  WHERE p.id IS DISTINCT FROM NEW.user_id;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_mushaira_live ON public.mushaira_events;
CREATE TRIGGER on_mushaira_live
  AFTER INSERT OR UPDATE OF status ON public.mushaira_events
  FOR EACH ROW EXECUTE FUNCTION public.notify_mushaira_live();
