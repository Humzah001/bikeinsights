-- Deposit tracking and inactive (fully paid, billing closed) rental status
ALTER TABLE rentals ADD COLUMN IF NOT EXISTS deposit_amount TEXT NOT NULL DEFAULT '0';
ALTER TABLE rentals ADD COLUMN IF NOT EXISTS deposit_refunded TEXT NOT NULL DEFAULT 'false';

ALTER TABLE rentals DROP CONSTRAINT IF EXISTS rentals_status_check;
ALTER TABLE rentals ADD CONSTRAINT rentals_status_check
  CHECK (status IN ('active', 'completed', 'overdue', 'inactive'));
