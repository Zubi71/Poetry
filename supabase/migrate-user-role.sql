-- ============================================================
-- RUN THIS ONCE in Supabase SQL Editor
-- 1) Removes extra profile columns (follower/post counts)
-- 2) Replaces is_admin with user_role dropdown: user | admin
-- ============================================================

-- Step 1: Role dropdown type
DO $$ BEGIN
  CREATE TYPE public.user_role AS ENUM ('user', 'admin');
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

-- Step 2: Add user_role column
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS user_role public.user_role NOT NULL DEFAULT 'user';

-- Step 3: Copy is_admin → user_role (keep column for now)
UPDATE public.profiles
SET user_role = 'admin'
WHERE is_admin = true
  AND EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'profiles' AND column_name = 'is_admin'
  );

-- Step 4: DROP policies that depend on is_admin (must happen BEFORE dropping column)
DROP POLICY IF EXISTS "Admins view all reports" ON public.reports;
DROP POLICY IF EXISTS "Admins update reports" ON public.reports;
DROP POLICY IF EXISTS "Admins manage tags" ON public.writing_tags;
DROP POLICY IF EXISTS "Admins manage featured" ON public.featured_poem;
DROP POLICY IF EXISTS "Admins can update profiles" ON public.profiles;

-- Step 5: Now safe to drop is_admin and extra columns
ALTER TABLE public.profiles DROP COLUMN IF EXISTS is_admin;

ALTER TABLE public.profiles
  DROP COLUMN IF EXISTS followers_count,
  DROP COLUMN IF EXISTS following_count,
  DROP COLUMN IF EXISTS posts_count;

-- Step 6: Recreate policies using user_role
CREATE POLICY "Admins view all reports" ON public.reports FOR SELECT USING (
  EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND user_role = 'admin')
);

CREATE POLICY "Admins update reports" ON public.reports FOR UPDATE USING (
  EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND user_role = 'admin')
);

CREATE POLICY "Admins manage tags" ON public.writing_tags FOR ALL USING (
  EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND user_role = 'admin')
);

CREATE POLICY "Admins manage featured" ON public.featured_poem FOR ALL USING (
  EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND user_role = 'admin')
);

CREATE POLICY "Admins can update profiles" ON public.profiles FOR UPDATE USING (
  EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND user_role = 'admin')
);

-- Step 7: Make yourself first admin (change email if needed)
UPDATE public.profiles
SET user_role = 'admin'
WHERE id = (
  SELECT id FROM auth.users WHERE email = 'zahidzubair489@gmail.com'
);

-- Step 8: Admin panel functions (website dropdown)
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

DROP FUNCTION IF EXISTS public.set_user_admin(UUID, BOOLEAN);

GRANT EXECUTE ON FUNCTION public.get_users_for_admin() TO authenticated;
GRANT EXECUTE ON FUNCTION public.set_user_role(UUID, public.user_role) TO authenticated;
