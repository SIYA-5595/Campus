ALTER TABLE public.holidays
ADD COLUMN IF NOT EXISTS holiday_type TEXT,
ADD COLUMN IF NOT EXISTS year INTEGER;

-- Ensure we don't duplicate holidays with same title and date
DO $$ 
BEGIN 
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'holidays_date_title_key') THEN
    ALTER TABLE public.holidays ADD CONSTRAINT holidays_date_title_key UNIQUE (date, title);
  END IF;
END $$;

-- Seed Default Indian Government Holidays for 2026
INSERT INTO public.holidays (title, date, holiday_type, description)
VALUES 
  ('Republic Day', '2026-01-26', 'Government Holiday', 'National festival celebrating the Constitution of India'),
  ('Independence Day', '2026-08-15', 'Government Holiday', 'National festival celebrating India''s independence'),
  ('Gandhi Jayanti', '2026-10-02', 'Government Holiday', 'Birthday of Mahatma Gandhi'),
  ('Ambedkar Jayanti', '2026-04-14', 'Government Holiday', 'Birthday of Dr. B.R. Ambedkar'),
  ('May Day', '2026-05-01', 'Government Holiday', 'International Workers'' Day'),
  ('Christmas Day', '2026-12-25', 'Festival Holiday', 'Celebration of the birth of Jesus Christ'),
  ('New Year''s Day', '2026-01-01', 'Normal Leave', 'First day of the year 2026')
ON CONFLICT DO NOTHING;
