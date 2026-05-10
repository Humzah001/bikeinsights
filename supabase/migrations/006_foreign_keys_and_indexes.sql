-- 006: Foreign keys + helpful indexes (no data deletion)
--
-- BEFORE RUNNING (optional sanity check in SQL Editor):
--   SELECT id FROM rentals WHERE bike_id <> '' AND bike_id NOT IN (SELECT id FROM bikes);
--   SELECT id FROM repairs WHERE bike_id <> '' AND bike_id NOT IN (SELECT id FROM bikes);
--   SELECT id FROM expenses WHERE bike_id <> '' AND bike_id NOT IN (SELECT id FROM bikes);
--
-- Behavior:
--   * Rows with invalid or empty bike_id on rentals/repairs are pointed at a placeholder bike
--     (you can reassign them in the UI later). No rows are removed.
--   * Expenses with no bike ("general") use NULL bike_id so FK allows optional bike linkage.
--   * All FKs use ON DELETE RESTRICT so you cannot accidentally delete a bike that is still referenced.
--
-- Run after migrations 001–005.

-- ---------------------------------------------------------------------------
-- Placeholder bike for historic rows missing a valid bike_id (insert once)
-- ---------------------------------------------------------------------------
INSERT INTO bikes (
  id,
  name,
  brand,
  model,
  color,
  serial_number,
  status,
  purchase_date,
  purchase_price,
  weekly_rate,
  tracker_share_url,
  image_filename,
  notes
)
VALUES (
  'legacy-unassigned',
  'Unassigned (legacy link)',
  '',
  '',
  '',
  '',
  'retired',
  '',
  '0',
  '0',
  '',
  '',
  'Auto-created by migration 006 for rentals/repairs/expenses that had empty or invalid bike_id. Reassign in the app when possible; do not delete this bike while rows still reference it.'
)
ON CONFLICT (id) DO NOTHING;

-- ---------------------------------------------------------------------------
-- Normalize rentals & repairs → valid bike_id
-- ---------------------------------------------------------------------------
UPDATE rentals r
SET bike_id = 'legacy-unassigned'
WHERE
  trim(COALESCE(r.bike_id, '')) = ''
  OR NOT EXISTS (SELECT 1 FROM bikes b WHERE b.id = r.bike_id);

UPDATE repairs r
SET bike_id = 'legacy-unassigned'
WHERE
  trim(COALESCE(r.bike_id, '')) = ''
  OR NOT EXISTS (SELECT 1 FROM bikes b WHERE b.id = r.bike_id);

-- ---------------------------------------------------------------------------
-- Expenses: allow NULL = general / no bike; fix orphans
-- ---------------------------------------------------------------------------
ALTER TABLE expenses ALTER COLUMN bike_id DROP NOT NULL;
ALTER TABLE expenses ALTER COLUMN bike_id SET DEFAULT NULL;

UPDATE expenses
SET bike_id = NULL
WHERE trim(COALESCE(bike_id, '')) = '';

UPDATE expenses e
SET bike_id = 'legacy-unassigned'
WHERE
  e.bike_id IS NOT NULL
  AND NOT EXISTS (SELECT 1 FROM bikes b WHERE b.id = e.bike_id);

-- ---------------------------------------------------------------------------
-- Foreign keys (RESTRICT = no silent cascades; avoids accidental data loss)
-- ---------------------------------------------------------------------------
ALTER TABLE rentals
  ADD CONSTRAINT rentals_bike_id_fkey
  FOREIGN KEY (bike_id) REFERENCES public.bikes (id) ON DELETE RESTRICT;

ALTER TABLE repairs
  ADD CONSTRAINT repairs_bike_id_fkey
  FOREIGN KEY (bike_id) REFERENCES public.bikes (id) ON DELETE RESTRICT;

ALTER TABLE expenses
  ADD CONSTRAINT expenses_bike_id_fkey
  FOREIGN KEY (bike_id) REFERENCES public.bikes (id) ON DELETE RESTRICT;

-- rental_payments → rentals may already exist from 004; ensure CASCADE for consistency
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'rental_payments_rental_id_fkey'
  ) THEN
    ALTER TABLE rental_payments
      ADD CONSTRAINT rental_payments_rental_id_fkey
      FOREIGN KEY (rental_id) REFERENCES public.rentals (id) ON DELETE CASCADE;
  END IF;
END $$;

-- ---------------------------------------------------------------------------
-- Indexes (FK columns + common filters; IF NOT EXISTS safe on re-run)
-- ---------------------------------------------------------------------------
CREATE INDEX IF NOT EXISTS idx_rentals_bike_status ON rentals (bike_id, status);
CREATE INDEX IF NOT EXISTS idx_rentals_end_date ON rentals (end_date);
CREATE INDEX IF NOT EXISTS idx_rentals_start_date ON rentals (start_date);
CREATE INDEX IF NOT EXISTS idx_notifications_bike_id ON notifications (bike_id);
CREATE INDEX IF NOT EXISTS idx_notifications_created_at ON notifications (created_at DESC);
