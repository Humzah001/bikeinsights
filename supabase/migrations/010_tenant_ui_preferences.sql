-- Per-tenant dashboard preferences (currency, owner display name, defaults).

ALTER TABLE tenants ADD COLUMN IF NOT EXISTS owner_display_name TEXT NOT NULL DEFAULT '';
ALTER TABLE tenants ADD COLUMN IF NOT EXISTS currency_symbol TEXT NOT NULL DEFAULT '£';
ALTER TABLE tenants ADD COLUMN IF NOT EXISTS default_weekly_rate NUMERIC(12, 2) NOT NULL DEFAULT 80;
ALTER TABLE tenants ADD COLUMN IF NOT EXISTS notification_email TEXT NOT NULL DEFAULT '';

COMMENT ON COLUMN tenants.owner_display_name IS 'Display-only owner/contact name for this workspace.';
COMMENT ON COLUMN tenants.currency_symbol IS 'Prefix/symbol shown with amounts (e.g. £, €, $).';
COMMENT ON COLUMN tenants.default_weekly_rate IS 'Prefilled weekly rent when bike has no rate.';
COMMENT ON COLUMN tenants.notification_email IS 'Optional tenant-scoped email for reminders (when wired).';
