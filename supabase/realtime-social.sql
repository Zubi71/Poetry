-- ============================================================
-- Real-time Social Features
-- Run in Supabase Dashboard → SQL Editor AFTER schema.sql
-- Enables: notifications, DMs, live likes/comments, presence
-- ============================================================

-- Conversations (direct messages between two users)
CREATE TABLE IF NOT EXISTS public.conversations (
  id BIGSERIAL PRIMARY KEY,
  user1_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  user2_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  last_message_at TIMESTAMPTZ DEFAULT NOW(),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  CONSTRAINT conversations_users_ordered CHECK (user1_id < user2_id),
  UNIQUE (user1_id, user2_id)
);

-- Direct messages
CREATE TABLE IF NOT EXISTS public.messages (
  id BIGSERIAL PRIMARY KEY,
  conversation_id BIGINT NOT NULL REFERENCES public.conversations(id) ON DELETE CASCADE,
  sender_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  text TEXT NOT NULL,
  read_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Notifications (like, comment, message, follow)
CREATE TABLE IF NOT EXISTS public.notifications (
  id BIGSERIAL PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  actor_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  type TEXT NOT NULL CHECK (type IN ('like', 'comment', 'message', 'follow')),
  poem_id BIGINT REFERENCES public.poems(id) ON DELETE CASCADE,
  message_id BIGINT REFERENCES public.messages(id) ON DELETE CASCADE,
  conversation_id BIGINT REFERENCES public.conversations(id) ON DELETE CASCADE,
  text TEXT NOT NULL,
  read BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_notifications_user_created ON public.notifications(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_notifications_unread ON public.notifications(user_id) WHERE read = FALSE;
CREATE INDEX IF NOT EXISTS idx_messages_conversation ON public.messages(conversation_id, created_at);
CREATE INDEX IF NOT EXISTS idx_conversations_user1 ON public.conversations(user1_id);
CREATE INDEX IF NOT EXISTS idx_conversations_user2 ON public.conversations(user2_id);

-- ============================================================
-- Like / comment count + notification triggers
-- ============================================================
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

CREATE OR REPLACE FUNCTION public.on_message_insert()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  recipient_id UUID;
  sender_name TEXT;
  conv RECORD;
BEGIN
  SELECT * INTO conv FROM public.conversations WHERE id = NEW.conversation_id;
  IF conv.user1_id = NEW.sender_id THEN recipient_id := conv.user2_id;
  ELSE recipient_id := conv.user1_id; END IF;

  UPDATE public.conversations SET last_message_at = NOW() WHERE id = NEW.conversation_id;

  IF recipient_id IS NOT NULL AND recipient_id <> NEW.sender_id THEN
    SELECT COALESCE(display_name, username, 'Someone') INTO sender_name FROM public.profiles WHERE id = NEW.sender_id;
    INSERT INTO public.notifications (user_id, actor_id, type, message_id, conversation_id, text)
    VALUES (recipient_id, NEW.sender_id, 'message', NEW.id, NEW.conversation_id, sender_name || ' sent you a message');
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_like_change ON public.likes;
CREATE TRIGGER on_like_change
  AFTER INSERT OR DELETE ON public.likes
  FOR EACH ROW EXECUTE FUNCTION public.update_poem_likes_count();

DROP TRIGGER IF EXISTS on_comment_change ON public.comments;
CREATE TRIGGER on_comment_change
  AFTER INSERT OR DELETE ON public.comments
  FOR EACH ROW EXECUTE FUNCTION public.update_poem_comments_count();

DROP TRIGGER IF EXISTS on_message_insert ON public.messages;
CREATE TRIGGER on_message_insert
  AFTER INSERT ON public.messages
  FOR EACH ROW EXECUTE FUNCTION public.on_message_insert();

-- ============================================================
-- Helper: get or create a DM conversation
-- ============================================================
CREATE OR REPLACE FUNCTION public.get_or_create_conversation(other_user_id UUID)
RETURNS BIGINT
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  uid UUID := auth.uid();
  low_id UUID;
  high_id UUID;
  conv_id BIGINT;
BEGIN
  IF uid IS NULL OR other_user_id IS NULL OR uid = other_user_id THEN RETURN NULL; END IF;
  IF uid < other_user_id THEN
    low_id := uid; high_id := other_user_id;
  ELSE
    low_id := other_user_id; high_id := uid;
  END IF;
  SELECT id INTO conv_id FROM public.conversations WHERE user1_id = low_id AND user2_id = high_id;
  IF conv_id IS NULL THEN
    INSERT INTO public.conversations (user1_id, user2_id) VALUES (low_id, high_id) RETURNING id INTO conv_id;
  END IF;
  RETURN conv_id;
END;
$$;

-- Create a notification (called from the app after like/comment/message)
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

GRANT EXECUTE ON FUNCTION public.get_or_create_conversation(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.create_notification(UUID, UUID, TEXT, TEXT, BIGINT, BIGINT) TO authenticated;

-- ============================================================
-- Row Level Security
-- ============================================================
ALTER TABLE public.conversations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users view own conversations" ON public.conversations;
CREATE POLICY "Users view own conversations" ON public.conversations
  FOR SELECT USING (auth.uid() = user1_id OR auth.uid() = user2_id);

DROP POLICY IF EXISTS "Users create conversations" ON public.conversations;
CREATE POLICY "Users create conversations" ON public.conversations
  FOR INSERT WITH CHECK (auth.uid() = user1_id OR auth.uid() = user2_id);

DROP POLICY IF EXISTS "Users view conversation messages" ON public.messages;
CREATE POLICY "Users view conversation messages" ON public.messages
  FOR SELECT USING (EXISTS (
    SELECT 1 FROM public.conversations c
    WHERE c.id = conversation_id AND (c.user1_id = auth.uid() OR c.user2_id = auth.uid())
  ));

DROP POLICY IF EXISTS "Users send messages" ON public.messages;
CREATE POLICY "Users send messages" ON public.messages
  FOR INSERT WITH CHECK (
    auth.uid() = sender_id AND EXISTS (
      SELECT 1 FROM public.conversations c
      WHERE c.id = conversation_id AND (c.user1_id = auth.uid() OR c.user2_id = auth.uid())
    )
  );

DROP POLICY IF EXISTS "Users mark messages read" ON public.messages;
CREATE POLICY "Users mark messages read" ON public.messages
  FOR UPDATE USING (EXISTS (
    SELECT 1 FROM public.conversations c
    WHERE c.id = conversation_id AND (c.user1_id = auth.uid() OR c.user2_id = auth.uid())
  ));

DROP POLICY IF EXISTS "Users view own notifications" ON public.notifications;
CREATE POLICY "Users view own notifications" ON public.notifications
  FOR SELECT USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users mark own notifications read" ON public.notifications;
CREATE POLICY "Users mark own notifications read" ON public.notifications
  FOR UPDATE USING (auth.uid() = user_id);

-- ============================================================
-- Enable Supabase Realtime on social tables
-- ============================================================
DO $$
BEGIN
  ALTER PUBLICATION supabase_realtime ADD TABLE public.notifications;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$
BEGIN
  ALTER PUBLICATION supabase_realtime ADD TABLE public.messages;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$
BEGIN
  ALTER PUBLICATION supabase_realtime ADD TABLE public.comments;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$
BEGIN
  ALTER PUBLICATION supabase_realtime ADD TABLE public.likes;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$
BEGIN
  ALTER PUBLICATION supabase_realtime ADD TABLE public.poems;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;
