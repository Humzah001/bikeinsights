-- Replace fixed tier columns with JSONB `rent_packages` (title, description, weekly_rate per row).

ALTER TABLE public.bikes ADD COLUMN IF NOT EXISTS rent_packages JSONB NOT NULL DEFAULT '[]'::jsonb;

DO $$
DECLARE
  r RECORD;
  pkgs jsonb;
  w text;
  rate_ok boolean;
BEGIN
  FOR r IN
    SELECT
      id,
      weekly_rate,
      battery_note_standard,
      weekly_rate_one_battery,
      battery_note_one,
      weekly_rate_extended,
      battery_note_extended
    FROM public.bikes
  LOOP
    pkgs := '[]'::jsonb;

    w := TRIM(COALESCE(r.weekly_rate, ''));
    rate_ok := w <> ''
      AND w ~ '^\d+(\.\d+)?$'
      AND w::numeric > 0;
    IF rate_ok THEN
      pkgs := pkgs
        || jsonb_build_array(
          jsonb_build_object(
            'id',
            gen_random_uuid()::text,
            'title',
            'Standard',
            'description',
            COALESCE(r.battery_note_standard, ''),
            'weekly_rate',
            w
          )
        );
    END IF;

    w := TRIM(COALESCE(r.weekly_rate_one_battery, ''));
    rate_ok := w <> ''
      AND w ~ '^\d+(\.\d+)?$'
      AND w::numeric > 0;
    IF rate_ok THEN
      pkgs := pkgs
        || jsonb_build_array(
          jsonb_build_object(
            'id',
            gen_random_uuid()::text,
            'title',
            'One battery',
            'description',
            COALESCE(r.battery_note_one, ''),
            'weekly_rate',
            w
          )
        );
    END IF;

    w := TRIM(COALESCE(r.weekly_rate_extended, ''));
    rate_ok := w <> ''
      AND w ~ '^\d+(\.\d+)?$'
      AND w::numeric > 0;
    IF rate_ok THEN
      pkgs := pkgs
        || jsonb_build_array(
          jsonb_build_object(
            'id',
            gen_random_uuid()::text,
            'title',
            'Larger batteries',
            'description',
            COALESCE(r.battery_note_extended, ''),
            'weekly_rate',
            w
          )
        );
    END IF;

    IF jsonb_array_length(pkgs) = 0 THEN
      pkgs := jsonb_build_array(
        jsonb_build_object(
          'id',
          gen_random_uuid()::text,
          'title',
          'Standard',
          'description',
          COALESCE(r.battery_note_standard, ''),
          'weekly_rate',
          ''
        )
      );
    END IF;

    UPDATE public.bikes SET rent_packages = pkgs WHERE id = r.id;
  END LOOP;
END $$;

-- Denormalized weekly_rate: first package with a positive numeric weekly_rate (matches app helper).
UPDATE public.bikes b
SET weekly_rate = COALESCE(
  (
    SELECT TRIM(t.elem->>'weekly_rate')
    FROM jsonb_array_elements(b.rent_packages) WITH ORDINALITY AS t(elem, ord)
    WHERE TRIM(COALESCE(t.elem->>'weekly_rate', '')) <> ''
      AND TRIM(t.elem->>'weekly_rate') ~ '^\d+(\.\d+)?$'
      AND TRIM(t.elem->>'weekly_rate')::numeric > 0
    ORDER BY ord
    LIMIT 1
  ),
  '0'
);

ALTER TABLE public.bikes DROP COLUMN IF EXISTS battery_note_standard;
ALTER TABLE public.bikes DROP COLUMN IF EXISTS weekly_rate_one_battery;
ALTER TABLE public.bikes DROP COLUMN IF EXISTS battery_note_one;
ALTER TABLE public.bikes DROP COLUMN IF EXISTS weekly_rate_extended;
ALTER TABLE public.bikes DROP COLUMN IF EXISTS battery_note_extended;

COMMENT ON COLUMN public.bikes.rent_packages IS 'Rent options for listings: array of { id, title, description, weekly_rate }.';
