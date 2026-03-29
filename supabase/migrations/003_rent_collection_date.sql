-- When set (YYYY-MM-DD), week 1 rent is due on this date; later weeks are +7 days.
-- Empty string keeps legacy behaviour: first Tuesday on or after rental start_date.
ALTER TABLE rentals ADD COLUMN IF NOT EXISTS rent_collection_date TEXT NOT NULL DEFAULT '';
