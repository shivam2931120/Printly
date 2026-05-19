-- ============================================================
-- Harden order writes around payment state.
-- Customers may create/read their own orders, request cancellation, and mark a
-- ready order collected. Payment confirmation stays server-owned.
-- Safe to re-run.
-- Date: 2026-05-19
-- ============================================================

BEGIN;

ALTER TABLE public."Order" ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "order_insert_auth" ON public."Order";
DROP POLICY IF EXISTS "order_insert" ON public."Order";
DROP POLICY IF EXISTS "order_insert_own" ON public."Order";
DROP POLICY IF EXISTS "order_select" ON public."Order";
DROP POLICY IF EXISTS "order_select_own" ON public."Order";
DROP POLICY IF EXISTS "order_select_admin" ON public."Order";
DROP POLICY IF EXISTS "order_select_admin_developer" ON public."Order";
DROP POLICY IF EXISTS "order_update" ON public."Order";
DROP POLICY IF EXISTS "order_update_own" ON public."Order";
DROP POLICY IF EXISTS "order_update_own_limited" ON public."Order";
DROP POLICY IF EXISTS "order_update_admin" ON public."Order";
DROP POLICY IF EXISTS "order_delete_admin" ON public."Order";

CREATE POLICY "order_insert_own"
  ON public."Order" FOR INSERT
  TO authenticated
  WITH CHECK (
    "userEmail" = auth.jwt()->>'email'
    OR public.is_admin_or_developer()
    OR EXISTS (
      SELECT 1
      FROM public."User" u
      WHERE u.id = "Order"."userId"
        AND u."authId" = auth.uid()::text
    )
  );

CREATE POLICY "order_select_own"
  ON public."Order" FOR SELECT
  TO authenticated
  USING (
    "userEmail" = auth.jwt()->>'email'
    OR public.is_admin_or_developer()
    OR EXISTS (
      SELECT 1
      FROM public."User" u
      WHERE u.id = "Order"."userId"
        AND u."authId" = auth.uid()::text
    )
  );

CREATE POLICY "order_update_own_limited"
  ON public."Order" FOR UPDATE
  TO authenticated
  USING (
    "userEmail" = auth.jwt()->>'email'
    OR public.is_admin_or_developer()
    OR EXISTS (
      SELECT 1
      FROM public."User" u
      WHERE u.id = "Order"."userId"
        AND u."authId" = auth.uid()::text
    )
  )
  WITH CHECK (
    "userEmail" = auth.jwt()->>'email'
    OR public.is_admin_or_developer()
    OR EXISTS (
      SELECT 1
      FROM public."User" u
      WHERE u.id = "Order"."userId"
        AND u."authId" = auth.uid()::text
    )
  );

CREATE POLICY "order_delete_admin"
  ON public."Order" FOR DELETE
  TO authenticated
  USING (public.is_admin_or_developer());

CREATE OR REPLACE FUNCTION public.guard_order_customer_update()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  jwt_role text := coalesce(auth.role(), current_setting('request.jwt.claim.role', true), '');
  jwt_email text := coalesce(auth.jwt()->>'email', '');
  owns_order boolean;
  only_cancel_fields boolean;
  only_collect_fields boolean;
BEGIN
  IF jwt_role = 'service_role' OR auth.uid() IS NULL OR public.is_admin_or_developer() THEN
    RETURN NEW;
  END IF;

  owns_order := (
    OLD."userEmail" = jwt_email
    OR EXISTS (
      SELECT 1
      FROM public."User" u
      WHERE u.id = OLD."userId"
        AND u."authId" = auth.uid()::text
    )
  );

  IF NOT owns_order THEN
    RAISE EXCEPTION 'Only the order owner or staff can update this order'
      USING ERRCODE = '42501';
  END IF;

  only_cancel_fields := (
    OLD.status IN ('PENDING', 'CONFIRMED')
    AND NEW."cancelRequested" IS TRUE
    AND NEW.id IS NOT DISTINCT FROM OLD.id
    AND NEW."orderToken" IS NOT DISTINCT FROM OLD."orderToken"
    AND NEW."totalAmount" IS NOT DISTINCT FROM OLD."totalAmount"
    AND NEW.status IS NOT DISTINCT FROM OLD.status
    AND NEW."paymentStatus" IS NOT DISTINCT FROM OLD."paymentStatus"
    AND NEW."paymentId" IS NOT DISTINCT FROM OLD."paymentId"
    AND NEW."razorpayOrderId" IS NOT DISTINCT FROM OLD."razorpayOrderId"
    AND NEW."clerkId" IS NOT DISTINCT FROM OLD."clerkId"
    AND NEW."userEmail" IS NOT DISTINCT FROM OLD."userEmail"
    AND NEW."userName" IS NOT DISTINCT FROM OLD."userName"
    AND NEW.items IS NOT DISTINCT FROM OLD.items
    AND NEW."inventoryProcessed" IS NOT DISTINCT FROM OLD."inventoryProcessed"
    AND NEW."printJobStatus" IS NOT DISTINCT FROM OLD."printJobStatus"
    AND NEW."printJobError" IS NOT DISTINCT FROM OLD."printJobError"
    AND NEW."printJobAttempts" IS NOT DISTINCT FROM OLD."printJobAttempts"
    AND NEW."isDeleted" IS NOT DISTINCT FROM OLD."isDeleted"
    AND NEW."deletedAt" IS NOT DISTINCT FROM OLD."deletedAt"
    AND NEW."createdAt" IS NOT DISTINCT FROM OLD."createdAt"
    AND NEW."userId" IS NOT DISTINCT FROM OLD."userId"
    AND NEW."shopId" IS NOT DISTINCT FROM OLD."shopId"
  );

  only_collect_fields := (
    OLD.status = 'READY'
    AND NEW.status = 'COMPLETED'
    AND NEW.id IS NOT DISTINCT FROM OLD.id
    AND NEW."orderToken" IS NOT DISTINCT FROM OLD."orderToken"
    AND NEW."totalAmount" IS NOT DISTINCT FROM OLD."totalAmount"
    AND NEW."paymentStatus" IS NOT DISTINCT FROM OLD."paymentStatus"
    AND NEW."paymentId" IS NOT DISTINCT FROM OLD."paymentId"
    AND NEW."razorpayOrderId" IS NOT DISTINCT FROM OLD."razorpayOrderId"
    AND NEW."clerkId" IS NOT DISTINCT FROM OLD."clerkId"
    AND NEW."userEmail" IS NOT DISTINCT FROM OLD."userEmail"
    AND NEW."userName" IS NOT DISTINCT FROM OLD."userName"
    AND NEW.items IS NOT DISTINCT FROM OLD.items
    AND NEW."inventoryProcessed" IS NOT DISTINCT FROM OLD."inventoryProcessed"
    AND NEW."cancelRequested" IS NOT DISTINCT FROM OLD."cancelRequested"
    AND NEW."cancelReason" IS NOT DISTINCT FROM OLD."cancelReason"
    AND NEW."cancelRequestedAt" IS NOT DISTINCT FROM OLD."cancelRequestedAt"
    AND NEW."printJobStatus" IS NOT DISTINCT FROM OLD."printJobStatus"
    AND NEW."printJobError" IS NOT DISTINCT FROM OLD."printJobError"
    AND NEW."printJobAttempts" IS NOT DISTINCT FROM OLD."printJobAttempts"
    AND NEW."isDeleted" IS NOT DISTINCT FROM OLD."isDeleted"
    AND NEW."deletedAt" IS NOT DISTINCT FROM OLD."deletedAt"
    AND NEW."createdAt" IS NOT DISTINCT FROM OLD."createdAt"
    AND NEW."userId" IS NOT DISTINCT FROM OLD."userId"
    AND NEW."shopId" IS NOT DISTINCT FROM OLD."shopId"
  );

  IF only_cancel_fields OR only_collect_fields THEN
    RETURN NEW;
  END IF;

  RAISE EXCEPTION 'Customers can only request cancellation or mark a ready order collected'
    USING ERRCODE = '42501';
END;
$$;

DROP TRIGGER IF EXISTS trg_guard_order_customer_update ON public."Order";
CREATE TRIGGER trg_guard_order_customer_update
  BEFORE UPDATE ON public."Order"
  FOR EACH ROW
  EXECUTE FUNCTION public.guard_order_customer_update();

COMMIT;
