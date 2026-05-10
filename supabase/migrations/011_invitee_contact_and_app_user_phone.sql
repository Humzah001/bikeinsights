-- Invitee name + phone captured at platform-admin invite; mirrored to app_users on accept.

ALTER TABLE invitations
  ADD COLUMN IF NOT EXISTS invitee_name TEXT NOT NULL DEFAULT '';

ALTER TABLE invitations
  ADD COLUMN IF NOT EXISTS invitee_phone TEXT NOT NULL DEFAULT '';

ALTER TABLE app_users
  ADD COLUMN IF NOT EXISTS phone TEXT NOT NULL DEFAULT '';
