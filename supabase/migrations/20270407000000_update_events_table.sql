ALTER TABLE public.events
ADD COLUMN IF NOT EXISTS start_time TIME,
ADD COLUMN IF NOT EXISTS end_time TIME,
ADD COLUMN IF NOT EXISTS location TEXT,
ADD COLUMN IF NOT EXISTS dress_code TEXT,
ADD COLUMN IF NOT EXISTS food_details TEXT,
ADD COLUMN IF NOT EXISTS snacks_available BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS family_invitation TEXT,
ADD COLUMN IF NOT EXISTS schedule JSONB DEFAULT '[]'::jsonb,
ADD COLUMN IF NOT EXISTS competitions JSONB DEFAULT '[]'::jsonb,
ADD COLUMN IF NOT EXISTS guests JSONB DEFAULT '[]'::jsonb,
ADD COLUMN IF NOT EXISTS principal_name TEXT,
ADD COLUMN IF NOT EXISTS handover JSONB DEFAULT '{}'::jsonb,
ADD COLUMN IF NOT EXISTS poster_url TEXT;

INSERT INTO storage.buckets (id, name, public) 
VALUES ('events', 'events', true) 
ON CONFLICT (id) DO NOTHING;

-- Drop policies if they exist to avoid errors on reruns
DROP POLICY IF EXISTS "Anyone can view event posters" ON storage.objects;
DROP POLICY IF EXISTS "Staff can upload event posters" ON storage.objects;
DROP POLICY IF EXISTS "Staff can update event posters" ON storage.objects;
DROP POLICY IF EXISTS "Staff can delete event posters" ON storage.objects;

CREATE POLICY "Anyone can view event posters" ON storage.objects FOR SELECT USING (bucket_id = 'events');
CREATE POLICY "Staff can upload event posters" ON storage.objects FOR INSERT WITH CHECK (bucket_id = 'events' AND (public.has_role(auth.uid(), 'staff') OR public.has_role(auth.uid(), 'admin')));
CREATE POLICY "Staff can update event posters" ON storage.objects FOR UPDATE USING (bucket_id = 'events' AND (public.has_role(auth.uid(), 'staff') OR public.has_role(auth.uid(), 'admin')));
CREATE POLICY "Staff can delete event posters" ON storage.objects FOR DELETE USING (bucket_id = 'events' AND (public.has_role(auth.uid(), 'staff') OR public.has_role(auth.uid(), 'admin')));
