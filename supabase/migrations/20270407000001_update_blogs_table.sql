ALTER TABLE public.blogs
ADD COLUMN IF NOT EXISTS image_url TEXT,
ADD COLUMN IF NOT EXISTS category TEXT,
ADD COLUMN IF NOT EXISTS author_name TEXT,
ADD COLUMN IF NOT EXISTS publish_date DATE;

-- create bucket for blog images
INSERT INTO storage.buckets (id, name, public) 
VALUES ('blogs', 'blogs', true) 
ON CONFLICT (id) DO NOTHING;

-- Drop policies to avoid 'already exists' errors
DROP POLICY IF EXISTS "Anyone can view blog images" ON storage.objects;
DROP POLICY IF EXISTS "Staff can upload blog images" ON storage.objects;
DROP POLICY IF EXISTS "Staff can update blog images" ON storage.objects;
DROP POLICY IF EXISTS "Staff can delete blog images" ON storage.objects;

-- Create policies for blogs bucket
CREATE POLICY "Anyone can view blog images" ON storage.objects FOR SELECT USING (bucket_id = 'blogs');
CREATE POLICY "Staff can upload blog images" ON storage.objects FOR INSERT WITH CHECK (bucket_id = 'blogs' AND (public.has_role(auth.uid(), 'staff') OR public.has_role(auth.uid(), 'admin')));
CREATE POLICY "Staff can update blog images" ON storage.objects FOR UPDATE USING (bucket_id = 'blogs' AND (public.has_role(auth.uid(), 'staff') OR public.has_role(auth.uid(), 'admin')));
CREATE POLICY "Staff can delete blog images" ON storage.objects FOR DELETE USING (bucket_id = 'blogs' AND (public.has_role(auth.uid(), 'staff') OR public.has_role(auth.uid(), 'admin')));
