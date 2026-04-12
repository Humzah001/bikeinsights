-- Per rent collection events (actual collected date, not weekly due schedule)
CREATE TABLE IF NOT EXISTS rental_payments (
  id TEXT PRIMARY KEY,
  rental_id TEXT NOT NULL REFERENCES rentals(id) ON DELETE CASCADE,
  amount TEXT NOT NULL DEFAULT '0',
  collected_on DATE NOT NULL,
  week_number INTEGER,
  payment_type TEXT NOT NULL DEFAULT 'manual',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_rental_payments_rental_id ON rental_payments(rental_id);
CREATE INDEX IF NOT EXISTS idx_rental_payments_collected_on ON rental_payments(collected_on DESC);
