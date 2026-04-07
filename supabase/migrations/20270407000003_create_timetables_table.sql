-- Create timetables table
CREATE TABLE public.timetables (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  academic_year TEXT NOT NULL,
  department TEXT NOT NULL,
  year TEXT NOT NULL, -- '1st Year', '2nd Year', '3rd Year'
  semester TEXT NOT NULL,
  day TEXT NOT NULL, -- 'Monday', 'Tuesday', etc.
  period INTEGER NOT NULL, -- 1 to 8
  time_slot TEXT NOT NULL,
  subject_name TEXT NOT NULL,
  staff_name TEXT NOT NULL,
  classroom TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (department, year, semester, day, period) -- Prevent overlapping periods for the same class
);

-- Enable RLS
ALTER TABLE public.timetables ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Anyone can view timetables" ON public.timetables FOR SELECT TO authenticated USING (true);
CREATE POLICY "Admin can manage timetables" ON public.timetables FOR ALL USING (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'staff'));
