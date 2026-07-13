-- Custom domains for merchant storefronts (Vercel multi-tenant)
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS custom_domain text UNIQUE,
  ADD COLUMN IF NOT EXISTS domain_status text DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS domain_verified_at timestamptz DEFAULT NULL;

COMMENT ON COLUMN public.profiles.custom_domain IS 'External hostname e.g. shop.example.com';
COMMENT ON COLUMN public.profiles.domain_status IS 'pending | verifying | active | error | null';
COMMENT ON COLUMN public.profiles.domain_verified_at IS 'When Vercel/DNS verification succeeded';

CREATE INDEX IF NOT EXISTS idx_profiles_custom_domain
  ON public.profiles (custom_domain)
  WHERE custom_domain IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_profiles_domain_status
  ON public.profiles (domain_status)
  WHERE domain_status IS NOT NULL;
