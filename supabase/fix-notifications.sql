-- Quick fix: run this if you already ran realtime-social.sql and notifications still don't work.
-- Adds the create_notification RPC used by the app for like/comment alerts.

CREATE OR REPLACE FUNCTION public.create_notification(
  p_user_id UUID,
  p_actor_id UUID,
  p_type TEXT,
  p_text TEXT,
  p_poem_id BIGINT DEFAULT NULL,
  p_conversation_id BIGINT DEFAULT NULL
)
RETURNS BIGINT
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  new_id BIGINT;
BEGIN
  IF p_user_id IS NULL OR p_actor_id IS NULL OR p_user_id = p_actor_id THEN RETURN NULL; END IF;
  INSERT INTO public.notifications (user_id, actor_id, type, text, poem_id, conversation_id)
  VALUES (p_user_id, p_actor_id, p_type, p_text, p_poem_id, p_conversation_id)
  RETURNING id INTO new_id;
  RETURN new_id;
END;
$$;

GRANT EXECUTE ON FUNCTION public.create_notification(UUID, UUID, TEXT, TEXT, BIGINT, BIGINT) TO authenticated;

-- Remove duplicate notification triggers (counts only)
CREATE OR REPLACE FUNCTION public.update_poem_likes_count()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    UPDATE public.poems SET likes_count = likes_count + 1 WHERE id = NEW.poem_id;
    RETURN NEW;
  ELSIF TG_OP = 'DELETE' THEN
    UPDATE public.poems SET likes_count = GREATEST(likes_count - 1, 0) WHERE id = OLD.poem_id;
    RETURN OLD;
  END IF;
  RETURN NULL;
END;
$$;

CREATE OR REPLACE FUNCTION public.update_poem_comments_count()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    UPDATE public.poems SET comments_count = comments_count + 1 WHERE id = NEW.poem_id;
    RETURN NEW;
  ELSIF TG_OP = 'DELETE' THEN
    UPDATE public.poems SET comments_count = GREATEST(comments_count - 1, 0) WHERE id = OLD.poem_id;
    RETURN OLD;
  END IF;
  RETURN NULL;
END;
$$;
