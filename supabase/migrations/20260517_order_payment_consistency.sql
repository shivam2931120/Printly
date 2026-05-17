-- ============================================================
-- Order/payment consistency fixes
-- Adds durable payment tracking columns and normalizes paid orders.
-- Safe to re-run.
-- Date: 2026-05-17
-- ============================================================

BEGIN;

ALTER TABLE public."Order"
    ADD COLUMN IF NOT EXISTS "paymentId" text;

ALTER TABLE public."Order"
    ADD COLUMN IF NOT EXISTS "clerkId" text;

ALTER TABLE public."Order"
    ADD COLUMN IF NOT EXISTS "inventoryProcessed" boolean DEFAULT NULL;

CREATE INDEX IF NOT EXISTS idx_order_payment_id
    ON public."Order"("paymentId")
    WHERE "paymentId" IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_order_clerk_id
    ON public."Order"("clerkId");

CREATE INDEX IF NOT EXISTS idx_order_inventory_pending
    ON public."Order"(status, "inventoryProcessed")
    WHERE "inventoryProcessed" IS NULL;

-- Historical client orders used the Razorpay payment id as Order.id.
UPDATE public."Order"
SET "paymentId" = id
WHERE "paymentId" IS NULL
  AND "paymentStatus" = 'PAID'
  AND id LIKE 'pay_%';

-- Paid orders should enter the fulfilment queue, not stay pending.
UPDATE public."Order"
SET status = 'CONFIRMED',
    "updatedAt" = now()
WHERE "paymentStatus" = 'PAID'
  AND status = 'PENDING';

-- Keep pickup tokens numeric and short even if an older client sends a bad token.
CREATE OR REPLACE FUNCTION public.auto_assign_order_token()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    IF NEW."orderToken" IS NULL
       OR length(trim(NEW."orderToken")) = 0
       OR length(trim(NEW."orderToken")) != 4
       OR NEW."orderToken" ~ '[^0-9]' THEN
        NEW."orderToken" := public.generate_unique_order_token();
    END IF;
    RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_auto_order_token ON public."Order";
CREATE TRIGGER trg_auto_order_token
    BEFORE INSERT ON public."Order"
    FOR EACH ROW
    EXECUTE FUNCTION public.auto_assign_order_token();

COMMIT;
