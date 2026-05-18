-- Three rent tiers: standard (weekly_rate + battery_note_standard), optional one-battery, optional extended.
ALTER TABLE public.bikes ADD COLUMN IF NOT EXISTS battery_note_standard TEXT NOT NULL DEFAULT '';
ALTER TABLE public.bikes ADD COLUMN IF NOT EXISTS weekly_rate_one_battery TEXT NOT NULL DEFAULT '';
ALTER TABLE public.bikes ADD COLUMN IF NOT EXISTS battery_note_one TEXT NOT NULL DEFAULT '';
ALTER TABLE public.bikes ADD COLUMN IF NOT EXISTS weekly_rate_extended TEXT NOT NULL DEFAULT '';
ALTER TABLE public.bikes ADD COLUMN IF NOT EXISTS battery_note_extended TEXT NOT NULL DEFAULT '';

DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'bikes'
      AND column_name = 'weekly_rate_large_battery'
  ) THEN
    UPDATE public.bikes
    SET weekly_rate_extended = TRIM(weekly_rate_large_battery)
    WHERE COALESCE(TRIM(weekly_rate_extended), '') = ''
      AND COALESCE(TRIM(weekly_rate_large_battery), '') <> '';
    ALTER TABLE public.bikes DROP COLUMN weekly_rate_large_battery;
  END IF;
END $$;

COMMENT ON COLUMN public.bikes.battery_note_standard IS 'What the main weekly_rate includes, e.g. 13Ah + 13Ah (two batteries).';
COMMENT ON COLUMN public.bikes.weekly_rate_one_battery IS 'Optional weekly rent when renter takes only one battery.';
COMMENT ON COLUMN public.bikes.battery_note_one IS 'Description for one-battery tier.';
COMMENT ON COLUMN public.bikes.weekly_rate_extended IS 'Optional weekly rent for larger / higher-capacity battery setup.';
COMMENT ON COLUMN public.bikes.battery_note_extended IS 'Description for extended tier, e.g. 2× 17Ah.';
