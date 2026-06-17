-- ============================================================
-- Admin user management (run AFTER migrate-user-role.sql)
-- Website admin panel: User / Admin dropdown
-- ============================================================

DROP POLICY IF EXISTS "Admins can update profiles" ON public.profiles;
CREATE POLICY "Admins can update profiles" ON public.profiles FOR UPDATE USING (
  EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND user_role = 'admin')
);

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
