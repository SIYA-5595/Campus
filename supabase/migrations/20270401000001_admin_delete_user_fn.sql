-- Function: admin_delete_user
-- Deletes a student fully: profile, role, and auth.users record (so email can be reused).
-- SECURITY DEFINER means it runs as the DB owner who has access to auth schema.
-- The caller must be authenticated as admin/staff — enforced inside the function.

CREATE OR REPLACE FUNCTION public.admin_delete_user(target_user_id UUID)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  caller_role TEXT;
BEGIN
  -- Only allow admin or staff to call this
  SELECT role INTO caller_role
  FROM public.user_roles
  WHERE user_id = auth.uid()
  LIMIT 1;

  IF caller_role NOT IN ('admin', 'staff') THEN
    RAISE EXCEPTION 'Access denied: only admins can delete users';
  END IF;

  -- Delete from profiles
  DELETE FROM public.profiles WHERE user_id = target_user_id;

  -- Delete from user_roles
  DELETE FROM public.user_roles WHERE user_id = target_user_id;

  -- Delete from auth.users (removes the account entirely so email can be re-used)
  DELETE FROM auth.users WHERE id = target_user_id;
END;
$$;

-- Grant execute to authenticated users (the function itself enforces admin-only)
GRANT EXECUTE ON FUNCTION public.admin_delete_user(UUID) TO authenticated;
