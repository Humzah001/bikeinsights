-- Move bike-level max_range_km into the first rent package when the package has no range, then drop column.

DO $$
DECLARE
  r RECORD;
  pk jsonb;
  new_elem jsonb;
  rk text;
BEGIN
  FOR r IN SELECT id, rent_packages, max_range_km FROM public.bikes
  LOOP
    pk := r.rent_packages;
    IF pk IS NULL OR jsonb_typeof(pk) <> 'array' OR jsonb_array_length(pk) = 0 THEN
      CONTINUE;
    END IF;

    new_elem := pk->0;
    IF trim(coalesce(new_elem->>'max_range_km', '')) <> '' THEN
      CONTINUE;
    END IF;

    rk := trim(coalesce(r.max_range_km, ''));
    IF rk = '' THEN
      CONTINUE;
    END IF;

    new_elem := new_elem || jsonb_build_object('max_range_km', rk);
    pk := jsonb_set(pk, '{0}', new_elem);
    UPDATE public.bikes SET rent_packages = pk WHERE id = r.id;
  END LOOP;
END $$;

ALTER TABLE public.bikes DROP COLUMN IF EXISTS max_range_km;
