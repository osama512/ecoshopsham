-- Sham Cash payment: private merchant credentials + order payment tracking

CREATE TABLE IF NOT EXISTS public.merchant_shamcash (
  merchant_id uuid PRIMARY KEY REFERENCES public.profiles (id) ON DELETE CASCADE,
  wallet_address text NOT NULL,
  api_key text NOT NULL,
  enabled boolean NOT NULL DEFAULT false,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE public.merchant_shamcash ENABLE ROW LEVEL SECURITY;

-- Only the merchant can read/write their own credentials (NOT public)
DROP POLICY IF EXISTS "Merchants manage own shamcash" ON public.merchant_shamcash;
CREATE POLICY "Merchants manage own shamcash"
  ON public.merchant_shamcash FOR ALL TO authenticated
  USING (merchant_id = auth.uid())
  WITH CHECK (merchant_id = auth.uid());

-- Order payment tracking
ALTER TABLE public.orders
  ADD COLUMN IF NOT EXISTS payment_status text DEFAULT 'unpaid',
  ADD COLUMN IF NOT EXISTS shamcash_invoice text,
  ADD COLUMN IF NOT EXISTS shamcash_tran_id text,
  ADD COLUMN IF NOT EXISTS paid_at timestamptz;

CREATE INDEX IF NOT EXISTS idx_orders_shamcash_invoice
  ON public.orders (shamcash_invoice)
  WHERE shamcash_invoice IS NOT NULL;

COMMENT ON COLUMN public.orders.payment_status IS 'unpaid | awaiting_payment | paid | expired | failed';
COMMENT ON COLUMN public.orders.shamcash_invoice IS 'Sham Cash invoice number e.g. INV-...';
COMMENT ON COLUMN public.orders.shamcash_tran_id IS 'Sham Cash transaction id used for verify';
