-- Manual billing: admin pause/resume and optional fixed paid-access end date.

ALTER TABLE tenants ADD COLUMN IF NOT EXISTS access_paused BOOLEAN NOT NULL DEFAULT FALSE;
ALTER TABLE tenants ADD COLUMN IF NOT EXISTS paid_access_ends_at TIMESTAMPTZ;

COMMENT ON COLUMN tenants.access_paused IS 'When true, workspace login and API access blocked until resumed.';
COMMENT ON COLUMN tenants.paid_access_ends_at IS 'When billing_status is active and set, access ends after this instant; NULL means no fixed end date.';
