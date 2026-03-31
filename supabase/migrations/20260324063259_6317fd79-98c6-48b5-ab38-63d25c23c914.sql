
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS is_approved boolean NOT NULL DEFAULT false;

-- Update the handle_new_user function to set is_approved = false for students
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
  INSERT INTO public.profiles (user_id, email, full_name, is_approved)
  VALUES (NEW.id, NEW.email, COALESCE(NEW.raw_user_meta_data->>'full_name', ''), false);
  INSERT INTO public.user_roles (user_id, role)
  VALUES (NEW.id, 'student');
  RETURN NEW;
END;
$function$;

-- Allow staff/admin to update all profiles (for approval)
CREATE POLICY "Staff can update all profiles"
ON public.profiles
FOR UPDATE
TO public
USING (has_role(auth.uid(), 'staff'::app_role) OR has_role(auth.uid(), 'admin'::app_role))
WITH CHECK (has_role(auth.uid(), 'staff'::app_role) OR has_role(auth.uid(), 'admin'::app_role));

-- Allow staff/admin to delete profiles
CREATE POLICY "Admin can delete profiles"
ON public.profiles
FOR DELETE
TO public
USING (has_role(auth.uid(), 'admin'::app_role));

-- Allow staff to manage user_roles (for role changes)
CREATE POLICY "Staff can manage roles"
ON public.user_roles
FOR ALL
TO public
USING (has_role(auth.uid(), 'staff'::app_role) OR has_role(auth.uid(), 'admin'::app_role));
