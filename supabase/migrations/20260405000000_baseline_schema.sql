-- Baseline schema for fresh ecoshopsham project
-- Creates core tables, RLS, and storage bucket assumed by later migrations.

CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- profiles
CREATE TABLE IF NOT EXISTS public.profiles (
  id uuid PRIMARY KEY REFERENCES auth.users (id) ON DELETE CASCADE,
  email text,
  phone text,
  role text DEFAULT 'merchant',
  status text DEFAULT 'active',
  plan_type text DEFAULT 'free',
  store_name text,
  whatsapp_number text,
  payment_instructions text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- products
CREATE TABLE IF NOT EXISTS public.products (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  merchant_id uuid REFERENCES public.profiles (id) ON DELETE CASCADE,
  name text NOT NULL,
  price numeric NOT NULL DEFAULT 0,
  description text,
  image_url text,
  images text[] DEFAULT '{}',
  stock_quantity integer DEFAULT 0,
  is_visible boolean NOT NULL DEFAULT true,
  created_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_products_merchant_id ON public.products (merchant_id);

-- orders
CREATE TABLE IF NOT EXISTS public.orders (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  merchant_id uuid NOT NULL REFERENCES public.profiles (id) ON DELETE CASCADE,
  customer_name text NOT NULL,
  customer_phone text,
  order_details jsonb,
  total_price numeric NOT NULL DEFAULT 0,
  status text DEFAULT 'pending',
  created_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_orders_merchant_id ON public.orders (merchant_id);

-- coupons
CREATE TABLE IF NOT EXISTS public.coupons (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  merchant_id uuid NOT NULL REFERENCES public.profiles (id) ON DELETE CASCADE,
  code text NOT NULL,
  discount_percent numeric NOT NULL DEFAULT 0,
  is_active boolean DEFAULT true,
  created_at timestamptz DEFAULT now(),
  UNIQUE (merchant_id, code)
);

CREATE INDEX IF NOT EXISTS idx_coupons_merchant_id ON public.coupons (merchant_id);

-- store_settings
CREATE TABLE IF NOT EXISTS public.store_settings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  merchant_id uuid NOT NULL UNIQUE REFERENCES public.profiles (id) ON DELETE CASCADE,
  payment_instructions text,
  payment_methods jsonb DEFAULT '{}'::jsonb,
  shipping_zones jsonb DEFAULT '[]'::jsonb,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.products ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.coupons ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.store_settings ENABLE ROW LEVEL SECURITY;

-- profiles policies
DROP POLICY IF EXISTS "Public can view profiles" ON public.profiles;
CREATE POLICY "Public can view profiles"
  ON public.profiles FOR SELECT
  USING (true);

DROP POLICY IF EXISTS "Users can update own profile" ON public.profiles;
CREATE POLICY "Users can update own profile"
  ON public.profiles FOR UPDATE TO authenticated
  USING (id = auth.uid())
  WITH CHECK (id = auth.uid());

DROP POLICY IF EXISTS "Users can insert own profile" ON public.profiles;
CREATE POLICY "Users can insert own profile"
  ON public.profiles FOR INSERT TO authenticated
  WITH CHECK (id = auth.uid());

-- products policies (later migration refines SELECT/DELETE)
DROP POLICY IF EXISTS "Merchants can insert products" ON public.products;
CREATE POLICY "Merchants can insert products"
  ON public.products FOR INSERT TO authenticated
  WITH CHECK (merchant_id = auth.uid());

DROP POLICY IF EXISTS "Merchants can update own products" ON public.products;
CREATE POLICY "Merchants can update own products"
  ON public.products FOR UPDATE TO authenticated
  USING (merchant_id = auth.uid())
  WITH CHECK (merchant_id = auth.uid());

DROP POLICY IF EXISTS "Allow public select" ON public.products;
CREATE POLICY "Allow public select"
  ON public.products FOR SELECT
  USING (true);

DROP POLICY IF EXISTS "Allow delete for owners" ON public.products;
CREATE POLICY "Allow delete for owners"
  ON public.products FOR DELETE
  USING (merchant_id = auth.uid());

-- orders policies
DROP POLICY IF EXISTS "Anyone can create orders" ON public.orders;
CREATE POLICY "Anyone can create orders"
  ON public.orders FOR INSERT
  WITH CHECK (true);

DROP POLICY IF EXISTS "Merchants can view own orders" ON public.orders;
CREATE POLICY "Merchants can view own orders"
  ON public.orders FOR SELECT TO authenticated
  USING (merchant_id = auth.uid());

DROP POLICY IF EXISTS "Merchants can update own orders" ON public.orders;
CREATE POLICY "Merchants can update own orders"
  ON public.orders FOR UPDATE TO authenticated
  USING (merchant_id = auth.uid())
  WITH CHECK (merchant_id = auth.uid());

-- coupons policies
DROP POLICY IF EXISTS "Public can read active coupons" ON public.coupons;
CREATE POLICY "Public can read active coupons"
  ON public.coupons FOR SELECT
  USING (is_active = true OR merchant_id = auth.uid());

DROP POLICY IF EXISTS "Merchants manage own coupons" ON public.coupons;
CREATE POLICY "Merchants manage own coupons"
  ON public.coupons FOR ALL TO authenticated
  USING (merchant_id = auth.uid())
  WITH CHECK (merchant_id = auth.uid());

-- store_settings policies
DROP POLICY IF EXISTS "Public can read store settings" ON public.store_settings;
CREATE POLICY "Public can read store settings"
  ON public.store_settings FOR SELECT
  USING (true);

DROP POLICY IF EXISTS "Merchants manage own store settings" ON public.store_settings;
CREATE POLICY "Merchants manage own store settings"
  ON public.store_settings FOR ALL TO authenticated
  USING (merchant_id = auth.uid())
  WITH CHECK (merchant_id = auth.uid());

-- storage bucket for product images
INSERT INTO storage.buckets (id, name, public)
VALUES ('product-images', 'product-images', true)
ON CONFLICT (id) DO UPDATE SET public = true;

DROP POLICY IF EXISTS "Public can view product images" ON storage.objects;
CREATE POLICY "Public can view product images"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'product-images');

DROP POLICY IF EXISTS "Merchants can upload product images" ON storage.objects;
CREATE POLICY "Merchants can upload product images"
  ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (
    bucket_id = 'product-images'
    AND (storage.foldername(name))[1] = (auth.uid())::text
  );

DROP POLICY IF EXISTS "Merchants can update own images" ON storage.objects;
CREATE POLICY "Merchants can update own images"
  ON storage.objects FOR UPDATE TO authenticated
  USING (
    bucket_id = 'product-images'
    AND (storage.foldername(name))[1] = (auth.uid())::text
  );

DROP POLICY IF EXISTS "Merchants can delete own images" ON storage.objects;
CREATE POLICY "Merchants can delete own images"
  ON storage.objects FOR DELETE TO authenticated
  USING (
    bucket_id = 'product-images'
    AND (storage.foldername(name))[1] = (auth.uid())::text
  );
