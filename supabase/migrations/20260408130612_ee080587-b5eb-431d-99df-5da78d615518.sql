
-- =============================================
-- 1. FIX PRODUCTS INSERT POLICIES
-- =============================================

-- Drop the two overly permissive insert policies
DROP POLICY IF EXISTS "Allow public insert" ON public.products;
DROP POLICY IF EXISTS "Enable insert for authenticated users only" ON public.products;

-- Keep only "Merchants can insert products" which already has: WITH CHECK (merchant_id = auth.uid())
-- It already exists, so no need to recreate.

-- =============================================
-- 2. FIX PRODUCTS SELECT POLICY
-- =============================================

-- Drop the overly permissive public select
DROP POLICY IF EXISTS "Allow public select" ON public.products;

-- Public/anon can only see visible products
CREATE POLICY "Public can view visible products"
ON public.products
FOR SELECT
TO anon
USING (is_visible = true);

-- Authenticated users see visible products OR their own (including hidden)
CREATE POLICY "Users see visible or own products"
ON public.products
FOR SELECT
TO authenticated
USING (is_visible = true OR merchant_id = auth.uid());

-- =============================================
-- 3. FIX PRODUCTS DELETE POLICY
-- =============================================

-- Drop the public delete policy (allows anon delete attempts)
DROP POLICY IF EXISTS "Allow delete for owners" ON public.products;

-- Recreate for authenticated only
CREATE POLICY "Owners can delete own products"
ON public.products
FOR DELETE
TO authenticated
USING (merchant_id = auth.uid());

-- =============================================
-- 4. FIX STORAGE UPDATE POLICY
-- =============================================

-- Drop the broken update policy
DROP POLICY IF EXISTS "Merchants can update own images" ON storage.objects;

-- Recreate with folder ownership check
CREATE POLICY "Merchants can update own images"
ON storage.objects
FOR UPDATE
TO authenticated
USING (
  bucket_id = 'product-images'
  AND (storage.foldername(name))[1] = (auth.uid())::text
);
