-- Trial end date + migrate old primary tenant id `tenant-default` → `tenant-buildit4me`
-- Run after 007.

ALTER TABLE tenants ADD COLUMN IF NOT EXISTS trial_ends_at TIMESTAMPTZ;

-- Existing installs that still use tenant-default: move to tenant-buildit4me
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM tenants WHERE id = 'tenant-default')
     AND NOT EXISTS (SELECT 1 FROM tenants WHERE id = 'tenant-buildit4me') THEN

    INSERT INTO tenants (id, name, slug, billing_status, notes, created_at, trial_ends_at)
    SELECT
      'tenant-buildit4me',
      'Buildit4me',
      'buildit4me',
      billing_status,
      COALESCE(NULLIF(trim(notes), ''), 'Primary workspace for Buildit4me / platform operators.'),
      created_at,
      trial_ends_at
    FROM tenants WHERE id = 'tenant-default';

    UPDATE bikes SET tenant_id = 'tenant-buildit4me' WHERE tenant_id = 'tenant-default';
    UPDATE rentals SET tenant_id = 'tenant-buildit4me' WHERE tenant_id = 'tenant-default';
    UPDATE repairs SET tenant_id = 'tenant-buildit4me' WHERE tenant_id = 'tenant-default';
    UPDATE expenses SET tenant_id = 'tenant-buildit4me' WHERE tenant_id = 'tenant-default';
    UPDATE notifications SET tenant_id = 'tenant-buildit4me' WHERE tenant_id = 'tenant-default';
    UPDATE rental_payments SET tenant_id = 'tenant-buildit4me' WHERE tenant_id = 'tenant-default';
    UPDATE tenant_members SET tenant_id = 'tenant-buildit4me' WHERE tenant_id = 'tenant-default';
    UPDATE invitations SET tenant_id = 'tenant-buildit4me' WHERE tenant_id = 'tenant-default';

    DELETE FROM tenants WHERE id = 'tenant-default';
  END IF;
END $$;

-- Normalize naming for primary workspace
UPDATE tenants
SET name = 'Buildit4me',
    slug = 'buildit4me',
    trial_ends_at = NULL
WHERE id = 'tenant-buildit4me'
  AND billing_status = 'active';
