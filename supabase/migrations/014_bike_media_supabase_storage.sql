-- Private bucket for bike photos/videos (signed upload + signed read from the app server).
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'bike-media',
  'bike-media',
  false,
  125829120,
  ARRAY[
    'image/jpeg',
    'image/png',
    'image/webp',
    'video/mp4',
    'video/webm',
    'video/quicktime'
  ]
)
ON CONFLICT (id) DO UPDATE SET
  public = EXCLUDED.public,
  file_size_limit = EXCLUDED.file_size_limit,
  allowed_mime_types = EXCLUDED.allowed_mime_types;

-- Legacy: first version of 013 used column name s3_key.
DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'bike_media'
      AND column_name = 's3_key'
  ) THEN
    ALTER TABLE public.bike_media RENAME COLUMN s3_key TO storage_path;
  END IF;
END $$;

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'bike_media_tenant_s3_key') THEN
    ALTER TABLE public.bike_media RENAME CONSTRAINT bike_media_tenant_s3_key TO bike_media_tenant_storage_path_unique;
  END IF;
END $$;
