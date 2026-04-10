-- Add register_number column with a unique constraint so no two students share one
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS register_number TEXT;

-- Add unique constraint (safe to run even if constraint already exists)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'profiles_register_number_unique'
  ) THEN
    ALTER TABLE public.profiles
      ADD CONSTRAINT profiles_register_number_unique UNIQUE (register_number);
  END IF;
END $$;
