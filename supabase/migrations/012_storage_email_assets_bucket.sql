-- Public bucket for invite-email images (logo). Email clients load this URL without cookies.
-- After migrating: upload the file (see npm run storage:upload-email-logo) or Dashboard → Storage.

INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'email-assets',
  'email-assets',
  true,
  1048576,
  ARRAY['image/png', 'image/jpeg', 'image/svg+xml', 'image/webp', 'image/gif']
)
ON CONFLICT (id) DO UPDATE SET
  public = true,
  file_size_limit = EXCLUDED.file_size_limit,
  allowed_mime_types = EXCLUDED.allowed_mime_types;

DROP POLICY IF EXISTS "email_assets_public_read" ON storage.objects;

CREATE POLICY "email_assets_public_read"
ON storage.objects
FOR SELECT
USING (bucket_id = 'email-assets');
