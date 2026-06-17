-- ============================================================
-- RUN THIS ONCE in Supabase SQL Editor
-- 1) Removes extra profile columns (follower/post counts)
-- 2) Replaces is_admin (true/false) with user_role dropdown: user | admin
-- ============================================================

-- Role dropdown type (shows as User / Admin in Supabase Table Editor)
DO $$ BEGIN
  CREATE TYPE public.user_role AS ENUM ('user', 'admin');
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

-- Add user_role column
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS user_role public.user_role NOT NULL DEFAULT 'user';

-- Copy old is_admin values into user_role (if is_admin still exists)
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'profiles' AND column_name = 'is_admin'
  ) THEN
    UPDATE public.profiles SET user_role = 'admin' WHERE is_admin = true;
    ALTER TABLE public.profiles DROP COLUMN is_admin;
  END IF;
END $$;

-- Remove unused count columns (always show 0 — not needed)
ALTER TABLE public.profiles
  DROP COLUMN IF EXISTS followers_count,
  DROP COLUMN IF EXISTS following_count,
  DROP COLUMN IF EXISTS posts_count;

-- Make yourself first admin (change email if needed)
UPDATE public.profiles
SET user_role = 'admin'
WHERE id = (
  SELECT id FROM auth.users WHERE email = 'zahidzubair489@gmail.com'
);

-- ============================================================
-- Update RLS policies (is_admin → user_role)
-- ============================================================
DROP POLICY IF EXISTS "Admins view all reports" ON public.reports;
CREATE POLICY "Admins view all reports" ON public.reports FOR SELECT USING (
  EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND user_role = 'admin')
);

DROP POLICY IF EXISTS "Admins update reports" ON public.reports;
CREATE POLICY "Admins update reports" ON public.reports FOR UPDATE USING (
  EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND user_role = 'admin')
);

DROP POLICY IF EXISTS "Admins manage tags" ON public.writing_tags;
CREATE POLICY "Admins manage tags" ON public.writing_tags FOR ALL USING (
  EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND user_role = 'admin')
);

DROP POLICY IF EXISTS "Admins manage featured" ON public.featured_poem;
CREATE POLICY "Admins manage featured" ON public.featured_poem FOR ALL USING (
  EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND user_role = 'admin')
);

DROP POLICY IF EXISTS "Admins can update profiles" ON public.profiles;
CREATE POLICY "Admins can update profiles" ON public.profiles FOR UPDATE USING (
  EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND user_role = 'admin')
);

-- ============================================================
-- Admin panel functions (website dropdown)
-- ============================================================
CREATE OR REPLACE FUNCTION public.get_users_for_admin()
RETURNS TABLE (
  id UUID,
  email TEXT,
  username TEXT,
  display_name TEXT,
  user_role public.user_role
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT p.id, u.email::text, p.username, p.display_name, p.user_role
  FROM public.profiles p
  JOIN auth.users u ON u.id = p.id
  WHERE EXISTS (
    SELECT 1 FROM public.profiles ap WHERE ap.id = auth.uid() AND ap.user_role = 'admin'
  )
  ORDER BY p.created_at DESC;
$$;

CREATE OR REPLACE FUNCTION public.set_user_role(target_user_id UUID, new_role public.user_role)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND user_role = 'admin') THEN
    RAISE EXCEPTION 'Not authorized';
  END IF;
  IF target_user_id = auth.uid() AND new_role = 'user' THEN
    RAISE EXCEPTION 'Cannot remove your own admin access';
  END IF;
  UPDATE public.profiles SET user_role = new_role WHERE id = target_user_id;
  RETURN FOUND;
END;
$$;

-- Remove old function name if it exists
DROP FUNCTION IF EXISTS public.set_user_admin(UUID, BOOLEAN);

GRANT EXECUTE ON FUNCTION public.get_users_for_admin() TO authenticated;
GRANT EXECUTE ON FUNCTION public.set_user_role(UUID, public.user_role) TO authenticated;
