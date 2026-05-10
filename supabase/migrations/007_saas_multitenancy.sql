-- 007: Multi-tenant SaaS — tenants, app users, invitations, tenant_id on fleet tables
-- Run AFTER 006 (or after 001–005 if you skipped 006 — FK order still OK).
-- Backfills existing bikes/rentals/etc. into tenant `tenant-buildit4me`.

-- ---------------------------------------------------------------------------
-- Core SaaS tables
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS tenants (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL DEFAULT '',
  slug TEXT NOT NULL DEFAULT '',
  billing_status TEXT NOT NULL DEFAULT 'trial'
    CHECK (billing_status IN ('trial', 'active', 'past_due', 'canceled')),
  notes TEXT NOT NULL DEFAULT '',
  trial_ends_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS app_users (
  id TEXT PRIMARY KEY,
  email TEXT NOT NULL UNIQUE,
  password_hash TEXT NOT NULL DEFAULT '',
  display_name TEXT NOT NULL DEFAULT '',
  is_platform_admin BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS tenant_members (
  tenant_id TEXT NOT NULL REFERENCES tenants (id) ON DELETE CASCADE,
  user_id TEXT NOT NULL REFERENCES app_users (id) ON DELETE CASCADE,
  role TEXT NOT NULL DEFAULT 'owner' CHECK (role IN ('owner', 'member')),
  PRIMARY KEY (tenant_id, user_id)
);

CREATE TABLE IF NOT EXISTS invitations (
  id TEXT PRIMARY KEY,
  tenant_id TEXT NOT NULL REFERENCES tenants (id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  token_hash TEXT NOT NULL,
  role TEXT NOT NULL DEFAULT 'owner' CHECK (role IN ('owner', 'member')),
  expires_at TIMESTAMPTZ NOT NULL,
  accepted_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (token_hash)
);

CREATE INDEX IF NOT EXISTS idx_invitations_email ON invitations (email);
CREATE INDEX IF NOT EXISTS idx_tenant_members_user_id ON tenant_members (user_id);
CREATE INDEX IF NOT EXISTS idx_tenants_billing_status ON tenants (billing_status);

INSERT INTO tenants (id, name, slug, billing_status, notes)
VALUES (
  'tenant-buildit4me',
  'Buildit4me',
  'buildit4me',
  'active',
  'Primary workspace for Buildit4me / platform operators.'
)
ON CONFLICT (id) DO NOTHING;

-- ---------------------------------------------------------------------------
-- Fleet tables: tenant scope
-- ---------------------------------------------------------------------------
ALTER TABLE bikes ADD COLUMN IF NOT EXISTS tenant_id TEXT REFERENCES tenants (id) ON DELETE CASCADE;
UPDATE bikes SET tenant_id = 'tenant-buildit4me' WHERE tenant_id IS NULL;
ALTER TABLE bikes ALTER COLUMN tenant_id SET NOT NULL;

ALTER TABLE rentals ADD COLUMN IF NOT EXISTS tenant_id TEXT REFERENCES tenants (id) ON DELETE CASCADE;
UPDATE rentals SET tenant_id = 'tenant-buildit4me' WHERE tenant_id IS NULL;
ALTER TABLE rentals ALTER COLUMN tenant_id SET NOT NULL;

ALTER TABLE repairs ADD COLUMN IF NOT EXISTS tenant_id TEXT REFERENCES tenants (id) ON DELETE CASCADE;
UPDATE repairs SET tenant_id = 'tenant-buildit4me' WHERE tenant_id IS NULL;
ALTER TABLE repairs ALTER COLUMN tenant_id SET NOT NULL;

ALTER TABLE expenses ADD COLUMN IF NOT EXISTS tenant_id TEXT REFERENCES tenants (id) ON DELETE CASCADE;
UPDATE expenses SET tenant_id = 'tenant-buildit4me' WHERE tenant_id IS NULL;
ALTER TABLE expenses ALTER COLUMN tenant_id SET NOT NULL;

ALTER TABLE notifications ADD COLUMN IF NOT EXISTS tenant_id TEXT REFERENCES tenants (id) ON DELETE CASCADE;
UPDATE notifications SET tenant_id = 'tenant-buildit4me' WHERE tenant_id IS NULL;
ALTER TABLE notifications ALTER COLUMN tenant_id SET NOT NULL;

ALTER TABLE rental_payments ADD COLUMN IF NOT EXISTS tenant_id TEXT REFERENCES tenants (id) ON DELETE CASCADE;
UPDATE rental_payments rp
SET tenant_id = r.tenant_id
FROM rentals r
WHERE rp.rental_id = r.id AND (rp.tenant_id IS NULL OR rp.tenant_id = '');
UPDATE rental_payments SET tenant_id = 'tenant-buildit4me' WHERE tenant_id IS NULL;
ALTER TABLE rental_payments ALTER COLUMN tenant_id SET NOT NULL;

CREATE INDEX IF NOT EXISTS idx_bikes_tenant_created ON bikes (tenant_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_rentals_tenant_created ON rentals (tenant_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_repairs_tenant_created ON repairs (tenant_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_expenses_tenant_created ON expenses (tenant_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_notifications_tenant_created ON notifications (tenant_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_rental_payments_tenant_collected ON rental_payments (tenant_id, collected_on DESC);
