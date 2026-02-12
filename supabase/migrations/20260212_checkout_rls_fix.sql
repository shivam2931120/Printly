-- Checkout / Order save RLS stabilization
-- Run this in Supabase SQL editor (or via migration pipeline).

-- -----------------------------
-- SHOP: read access only
-- -----------------------------
ALTER TABLE public."Shop" ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "shop_select_public" ON public."Shop";
CREATE POLICY "shop_select_public"
ON public."Shop"
FOR SELECT
TO anon, authenticated
USING (true);

-- -----------------------------
-- ORDER: create/select/update own + admin/developer read
-- -----------------------------
ALTER TABLE public."Order" ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "order_insert_own" ON public."Order";
CREATE POLICY "order_insert_own"
ON public."Order"
FOR INSERT
TO authenticated
WITH CHECK (
  (
    "Order"."userEmail" = auth.jwt()->>'email'
  )
  OR EXISTS (
    SELECT 1
    FROM public."User" u
    WHERE u.id = "Order"."userId"
      AND u."authId" = auth.uid()::text
  )
);

DROP POLICY IF EXISTS "order_select_own" ON public."Order";
CREATE POLICY "order_select_own"
ON public."Order"
FOR SELECT
TO authenticated
USING (
  (
    "Order"."userEmail" = auth.jwt()->>'email'
  )
  OR EXISTS (
    SELECT 1
    FROM public."User" u
    WHERE u.id = "Order"."userId"
      AND u."authId" = auth.uid()::text
  )
);

DROP POLICY IF EXISTS "order_update_own" ON public."Order";
CREATE POLICY "order_update_own"
ON public."Order"
FOR UPDATE
TO authenticated
USING (
  (
    "Order"."userEmail" = auth.jwt()->>'email'
  )
  OR EXISTS (
    SELECT 1
    FROM public."User" u
    WHERE u.id = "Order"."userId"
      AND u."authId" = auth.uid()::text
  )
)
WITH CHECK (
  (
    "Order"."userEmail" = auth.jwt()->>'email'
  )
  OR EXISTS (
    SELECT 1
    FROM public."User" u
    WHERE u.id = "Order"."userId"
      AND u."authId" = auth.uid()::text
  )
);

DROP POLICY IF EXISTS "order_select_admin_developer" ON public."Order";
CREATE POLICY "order_select_admin_developer"
ON public."Order"
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1
    FROM public."User" u
    WHERE u."authId" = auth.uid()::text
      AND u.role IN ('ADMIN', 'DEVELOPER')
  )
);

-- -----------------------------
-- ORDER ITEM: create/select via order ownership + admin/developer read
-- -----------------------------
ALTER TABLE public."OrderItem" ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "order_item_insert_own" ON public."OrderItem";
CREATE POLICY "order_item_insert_own"
ON public."OrderItem"
FOR INSERT
TO authenticated
WITH CHECK (
  EXISTS (
    SELECT 1
    FROM public."Order" o
    WHERE o.id = "OrderItem"."orderId"
      AND (
        o."userEmail" = auth.jwt()->>'email'
        OR EXISTS (
          SELECT 1
          FROM public."User" u
          WHERE u.id = o."userId"
            AND u."authId" = auth.uid()::text
        )
      )
  )
);

DROP POLICY IF EXISTS "order_item_select_own" ON public."OrderItem";
CREATE POLICY "order_item_select_own"
ON public."OrderItem"
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1
    FROM public."Order" o
    WHERE o.id = "OrderItem"."orderId"
      AND (
        o."userEmail" = auth.jwt()->>'email'
        OR EXISTS (
          SELECT 1
          FROM public."User" u
          WHERE u.id = o."userId"
            AND u."authId" = auth.uid()::text
        )
      )
  )
);

DROP POLICY IF EXISTS "order_item_select_admin_developer" ON public."OrderItem";
CREATE POLICY "order_item_select_admin_developer"
ON public."OrderItem"
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1
    FROM public."User" u
    WHERE u."authId" = auth.uid()::text
      AND u.role IN ('ADMIN', 'DEVELOPER')
  )
);
