-- ============================================================
-- Admin user management — run once in Supabase SQL Editor
-- Lets admins assign User / Admin from the website admin panel
-- ============================================================

-- Admins may update any profile (role, etc.)
DROP POLICY IF EXISTS "Admins can update profiles" ON public.profiles;
CREATE POLICY "Admins can update profiles" ON public.profiles
FOR UPDATE USING (
  EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND is_admin = true)
);

-- List users (email + role) — admins only
CREATE OR REPLACE FUNCTION public.get_users_for_admin()
RETURNS TABLE (
  id UUID,
  email TEXT,
  username TEXT,
  display_name TEXT,
  is_admin BOOLEAN,
  posts_count INT
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT p.id, u.email::text, p.username, p.display_name, p.is_admin, p.posts_count
  FROM public.profiles p
  JOIN auth.users u ON u.id = p.id
  WHERE EXISTS (
    SELECT 1 FROM public.profiles ap WHERE ap.id = auth.uid() AND ap.is_admin = true
  )
  ORDER BY p.created_at DESC;
$$;

-- Set admin role from dropdown
CREATE OR REPLACE FUNCTION public.set_user_admin(target_user_id UUID, make_admin BOOLEAN)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND is_admin = true) THEN
    RAISE EXCEPTION 'Not authorized';
  END IF;
  IF target_user_id = auth.uid() AND make_admin = false THEN
    RAISE EXCEPTION 'Cannot remove your own admin access';
  END IF;
  UPDATE public.profiles SET is_admin = make_admin WHERE id = target_user_id;
  RETURN FOUND;
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_users_for_admin() TO authenticated;
GRANT EXECUTE ON FUNCTION public.set_user_admin(UUID, BOOLEAN) TO authenticated;
