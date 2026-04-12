-- Scheduled rent due date per payment row (vs collected_on = when you recorded it)
ALTER TABLE rental_payments ADD COLUMN IF NOT EXISTS due_on DATE;
