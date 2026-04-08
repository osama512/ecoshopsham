
-- Add store_slug column to profiles table
ALTER TABLE public.profiles ADD COLUMN store_slug text UNIQUE;

-- Create index for fast slug lookups
CREATE INDEX idx_profiles_store_slug ON public.profiles (store_slug) WHERE store_slug IS NOT NULL;
