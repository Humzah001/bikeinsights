-- BikeInsights – Supabase tables (run in SQL Editor or via migrations)
-- Run this script in your Supabase project: Dashboard → SQL Editor → New query → Paste → Run

-- Bikes
CREATE TABLE IF NOT EXISTS bikes (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL DEFAULT '',
  brand TEXT NOT NULL DEFAULT '',
  model TEXT NOT NULL DEFAULT '',
  color TEXT NOT NULL DEFAULT '',
  serial_number TEXT NOT NULL DEFAULT '',
  status TEXT NOT NULL DEFAULT 'available' CHECK (status IN ('available', 'rented', 'under_repair', 'retired')),
  purchase_date TEXT NOT NULL DEFAULT '',
  purchase_price TEXT NOT NULL DEFAULT '0',
  weekly_rate TEXT NOT NULL DEFAULT '0',
  tracker_share_url TEXT NOT NULL DEFAULT '',
  image_filename TEXT NOT NULL DEFAULT '',
  notes TEXT NOT NULL DEFAULT '',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  last_latitude TEXT,
  last_longitude TEXT
);

-- Rentals
CREATE TABLE IF NOT EXISTS rentals (
  id TEXT PRIMARY KEY,
  bike_id TEXT NOT NULL DEFAULT '',
  bike_name TEXT NOT NULL DEFAULT '',
  customer_name TEXT NOT NULL DEFAULT '',
  customer_phone TEXT NOT NULL DEFAULT '',
  customer_email TEXT NOT NULL DEFAULT '',
  start_date TEXT NOT NULL DEFAULT '',
  end_date TEXT NOT NULL DEFAULT '',
  weekly_rate TEXT NOT NULL DEFAULT '0',
  total_amount TEXT NOT NULL DEFAULT '0',
  amount_paid TEXT NOT NULL DEFAULT '0',
  weeks TEXT NOT NULL DEFAULT '0',
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'completed', 'overdue')),
  payment_status TEXT NOT NULL DEFAULT 'pending' CHECK (payment_status IN ('paid', 'pending', 'partial')),
  notes TEXT NOT NULL DEFAULT '',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Repairs
CREATE TABLE IF NOT EXISTS repairs (
  id TEXT PRIMARY KEY,
  bike_id TEXT NOT NULL DEFAULT '',
  bike_name TEXT NOT NULL DEFAULT '',
  description TEXT NOT NULL DEFAULT '',
  repair_date TEXT NOT NULL DEFAULT '',
  cost TEXT NOT NULL DEFAULT '0',
  repair_shop TEXT NOT NULL DEFAULT '',
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'in_progress', 'completed')),
  notes TEXT NOT NULL DEFAULT '',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Expenses
CREATE TABLE IF NOT EXISTS expenses (
  id TEXT PRIMARY KEY,
  bike_id TEXT NOT NULL DEFAULT '',
  bike_name TEXT NOT NULL DEFAULT '',
  category TEXT NOT NULL DEFAULT 'other' CHECK (category IN ('fuel', 'storage', 'insurance', 'accessories', 'cleaning', 'other')),
  description TEXT NOT NULL DEFAULT '',
  amount TEXT NOT NULL DEFAULT '0',
  date TEXT NOT NULL DEFAULT '',
  receipt_filename TEXT NOT NULL DEFAULT '',
  notes TEXT NOT NULL DEFAULT '',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Notifications
CREATE TABLE IF NOT EXISTS notifications (
  id TEXT PRIMARY KEY,
  type TEXT NOT NULL DEFAULT 'payment_pending' CHECK (type IN ('rent_overdue', 'rent_due_soon', 'repair_due', 'payment_pending', 'week_rent_pending')),
  bike_id TEXT NOT NULL DEFAULT '',
  bike_name TEXT NOT NULL DEFAULT '',
  rental_id TEXT NOT NULL DEFAULT '',
  customer_name TEXT NOT NULL DEFAULT '',
  customer_phone TEXT NOT NULL DEFAULT '',
  message TEXT NOT NULL DEFAULT '',
  is_read TEXT NOT NULL DEFAULT 'false',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Optional: indexes for common lookups
CREATE INDEX IF NOT EXISTS idx_rentals_bike_id ON rentals(bike_id);
CREATE INDEX IF NOT EXISTS idx_rentals_status ON rentals(status);
CREATE INDEX IF NOT EXISTS idx_repairs_bike_id ON repairs(bike_id);
CREATE INDEX IF NOT EXISTS idx_expenses_bike_id ON expenses(bike_id);
CREATE INDEX IF NOT EXISTS idx_notifications_rental_id ON notifications(rental_id);

-- Optional: enable RLS and allow service role full access (default with service_role key)
-- If you use anon key and RLS, add policies here. For server-only API with SUPABASE_SERVICE_ROLE_KEY, RLS can stay off.
