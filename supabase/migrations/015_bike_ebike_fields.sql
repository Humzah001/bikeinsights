-- Optional e-bike specs and optional premium weekly rate (e.g. dual / high-capacity battery).
ALTER TABLE public.bikes ADD COLUMN IF NOT EXISTS tyre_size TEXT NOT NULL DEFAULT '';
ALTER TABLE public.bikes ADD COLUMN IF NOT EXISTS frame_height_cm TEXT NOT NULL DEFAULT '';
ALTER TABLE public.bikes ADD COLUMN IF NOT EXISTS battery_count TEXT NOT NULL DEFAULT '';
ALTER TABLE public.bikes ADD COLUMN IF NOT EXISTS battery_1_capacity_wh TEXT NOT NULL DEFAULT '';
ALTER TABLE public.bikes ADD COLUMN IF NOT EXISTS battery_2_capacity_wh TEXT NOT NULL DEFAULT '';
ALTER TABLE public.bikes ADD COLUMN IF NOT EXISTS weekly_rate_large_battery TEXT NOT NULL DEFAULT '';
ALTER TABLE public.bikes ADD COLUMN IF NOT EXISTS motor_power_w TEXT NOT NULL DEFAULT '';
ALTER TABLE public.bikes ADD COLUMN IF NOT EXISTS max_range_km TEXT NOT NULL DEFAULT '';

COMMENT ON COLUMN public.bikes.weekly_rate_large_battery IS 'Optional higher weekly rent when renting with extended or dual-battery package; empty = same as weekly_rate.';
