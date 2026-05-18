-- Bike photos/videos in Supabase Storage (bucket `bike-media`); metadata keyed by tenant.
CREATE TABLE IF NOT EXISTS bike_media (
  id TEXT PRIMARY KEY,
  tenant_id TEXT NOT NULL REFERENCES public.tenants (id) ON DELETE CASCADE,
  bike_id TEXT NOT NULL REFERENCES public.bikes (id) ON DELETE CASCADE,
  storage_path TEXT NOT NULL,
  media_kind TEXT NOT NULL CHECK (media_kind IN ('image', 'video')),
  content_type TEXT NOT NULL DEFAULT 'application/octet-stream',
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT bike_media_tenant_storage_path_unique UNIQUE (tenant_id, storage_path)
);

CREATE INDEX IF NOT EXISTS idx_bike_media_tenant_bike_sort ON bike_media (tenant_id, bike_id, sort_order ASC);
