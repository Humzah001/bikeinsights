-- Move bike-level battery fields into the first rent package, then drop columns.

DO $$
DECLARE
  r RECORD;
  pk jsonb;
  new_elem jsonb;
  bc text;
  b1 text;
  b2 text;
  merged_count text;
  merge_patch jsonb;
BEGIN
  FOR r IN
    SELECT id, rent_packages, battery_count, battery_1_capacity_wh, battery_2_capacity_wh
    FROM public.bikes
  LOOP
    pk := r.rent_packages;
    IF pk IS NULL OR jsonb_typeof(pk) <> 'array' OR jsonb_array_length(pk) = 0 THEN
      CONTINUE;
    END IF;

    new_elem := pk->0;
    IF trim(coalesce(new_elem->>'battery_count', '')) IN ('1', '2')
       OR trim(coalesce(new_elem->>'battery_1_capacity_wh', '')) <> ''
       OR trim(coalesce(new_elem->>'battery_2_capacity_wh', '')) <> '' THEN
      CONTINUE;
    END IF;

    bc := trim(coalesce(r.battery_count, ''));
    b1 := trim(coalesce(r.battery_1_capacity_wh, ''));
    b2 := trim(coalesce(r.battery_2_capacity_wh, ''));

    IF bc NOT IN ('1', '2') AND b1 = '' AND b2 = '' THEN
      CONTINUE;
    END IF;

    IF bc IN ('1', '2') THEN
      merged_count := bc;
    ELSIF b1 <> '' AND b2 <> '' THEN
      merged_count := '2';
    ELSIF b1 <> '' OR b2 <> '' THEN
      merged_count := '1';
    ELSE
      merged_count := '';
    END IF;

    IF merged_count = '1' AND b1 = '' AND b2 <> '' THEN
      b1 := b2;
      b2 := '';
    END IF;

    IF merged_count = '1' THEN
      b2 := '';
    END IF;

    merge_patch := jsonb_build_object(
      'battery_count', merged_count,
      'battery_1_capacity_wh', b1,
      'battery_2_capacity_wh', b2
    );

    new_elem := new_elem || merge_patch;
    pk := jsonb_set(pk, '{0}', new_elem);
    UPDATE public.bikes SET rent_packages = pk WHERE id = r.id;
  END LOOP;
END $$;

ALTER TABLE public.bikes DROP COLUMN IF EXISTS battery_count;
ALTER TABLE public.bikes DROP COLUMN IF EXISTS battery_1_capacity_wh;
ALTER TABLE public.bikes DROP COLUMN IF EXISTS battery_2_capacity_wh;
