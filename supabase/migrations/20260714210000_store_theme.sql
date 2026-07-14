-- Merchant storefront theme (colors, fonts, banners)
ALTER TABLE public.store_settings
  ADD COLUMN IF NOT EXISTS theme jsonb DEFAULT NULL;

COMMENT ON COLUMN public.store_settings.theme IS
  'Storefront appearance: primary/accent hex colors, font, logo_url, banners[], tagline';
