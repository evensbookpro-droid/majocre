-- Migration script to add a UNIQUE constraint to public.banks on (country_code, bank_code)
-- This is required to support correct UPSERT operations.

-- 1. Eliminate any existing duplicates (retaining the earliest record) to prevent constraint failure
DELETE FROM public.banks a USING public.banks b 
WHERE a.id > b.id 
  AND a.country_code = b.country_code 
  AND a.bank_code = b.bank_code;

-- 2. Ensure that the search index on those columns is UNIQUE
DROP INDEX IF EXISTS public.banks_country_bank_code_idx;
CREATE UNIQUE INDEX IF NOT EXISTS banks_country_bank_code_idx ON public.banks (country_code, bank_code);

-- 3. Add the UNIQUE constraint if it doesn't already exist
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint 
    WHERE conname = 'banks_country_bank_code_unique'
  ) THEN
    ALTER TABLE public.banks ADD CONSTRAINT banks_country_bank_code_unique UNIQUE (country_code, bank_code);
  END IF;
END $$;
