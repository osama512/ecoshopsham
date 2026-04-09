
-- Add discount_type and discount_value columns to coupons
ALTER TABLE public.coupons
ADD COLUMN IF NOT EXISTS discount_type text NOT NULL DEFAULT 'percentage',
ADD COLUMN IF NOT EXISTS discount_value numeric NOT NULL DEFAULT 0;

-- Migrate existing data: copy discount_percent into discount_value
UPDATE public.coupons SET discount_value = discount_percent WHERE discount_value = 0 AND discount_percent > 0;
