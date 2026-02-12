-- ============================================================
-- SCHEMA SIMPLIFICATION MIGRATION
-- 8 tables → 4 tables
-- Drop:  Service, ServiceVariant, InventoryItem (unused)
-- Merge: OrderItem → Order.items (JSONB)
-- Keep:  Shop, User, Product, Order
-- ============================================================

-- ============================================================
-- STEP 1: Add items JSONB column to Order
-- ============================================================
ALTER TABLE public."Order"
  ADD COLUMN IF NOT EXISTS "items" jsonb DEFAULT '[]'::jsonb;

-- Ensure userEmail and userName columns exist (they were added in Prisma schema)
ALTER TABLE public."Order"
  ADD COLUMN IF NOT EXISTS "userEmail" text,
  ADD COLUMN IF NOT EXISTS "userName" text;

-- ============================================================
-- STEP 2: Migrate existing OrderItem data into Order.items JSONB
-- (Only runs if OrderItem table exists)
-- ============================================================
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_schema = 'public' AND table_name = 'OrderItem'
  ) THEN
    UPDATE public."Order" o
    SET "items" = COALESCE(
      (
        SELECT jsonb_agg(
          jsonb_build_object(
            'id', oi.id,
            'type', oi.type,
            'productId', oi."productId",
            'productName', COALESCE(p.name, ''),
            'productImage', COALESCE(p.image, ''),
            'serviceId', oi."serviceId",
            'fileUrl', oi."fileUrl",
            'fileName', oi."fileName",
            'printConfig', oi."printConfig",
            'details', oi.details,
            'quantity', oi.quantity,
            'price', oi.price
          )
        )
        FROM public."OrderItem" oi
        LEFT JOIN public."Product" p ON p.id = oi."productId"
        WHERE oi."orderId" = o.id
      ),
      '[]'::jsonb
    )
    WHERE EXISTS (SELECT 1 FROM public."OrderItem" oi WHERE oi."orderId" = o.id);
  END IF;
END $$;

-- ============================================================
-- STEP 3: Drop OrderItem table (data preserved in Order.items)
-- ============================================================
DROP TABLE IF EXISTS public."OrderItem" CASCADE;

-- ============================================================
-- STEP 4: Drop unused tables
-- ============================================================
DROP TABLE IF EXISTS public."ServiceVariant" CASCADE;
DROP TABLE IF EXISTS public."Service" CASCADE;
DROP TABLE IF EXISTS public."InventoryItem" CASCADE;

-- ============================================================
-- STEP 5: Backfill User.authId from auth.users by email match
-- ============================================================
UPDATE public."User" u
SET "authId" = (
  SELECT au.id::text
  FROM auth.users au
  WHERE lower(au.email) = lower(u.email)
  LIMIT 1
)
WHERE u."authId" IS NULL
  AND EXISTS (
    SELECT 1 FROM auth.users au WHERE lower(au.email) = lower(u.email)
  );

-- ============================================================
-- STEP 6: Clean ALL existing RLS policies (fresh start)
-- ============================================================

-- Shop policies
DROP POLICY IF EXISTS "shop_select_public" ON public."Shop";
DROP POLICY IF EXISTS "shop_read_all" ON public."Shop";
DROP POLICY IF EXISTS "Enable read access for all users" ON public."Shop";
DROP POLICY IF EXISTS "shop_select_all" ON public."Shop";
DROP POLICY IF EXISTS "shop_insert_admin" ON public."Shop";

-- Order policies
DROP POLICY IF EXISTS "order_insert_own" ON public."Order";
DROP POLICY IF EXISTS "order_select_own" ON public."Order";
DROP POLICY IF EXISTS "order_update_own" ON public."Order";
DROP POLICY IF EXISTS "order_select_admin_developer" ON public."Order";
DROP POLICY IF EXISTS "Enable read access for all users" ON public."Order";
DROP POLICY IF EXISTS "Enable insert for authenticated users only" ON public."Order";
DROP POLICY IF EXISTS "Allow own orders" ON public."Order";

-- Product policies
DROP POLICY IF EXISTS "Enable read access for all users" ON public."Product";
DROP POLICY IF EXISTS "product_select_all" ON public."Product";
DROP POLICY IF EXISTS "product_insert_admin" ON public."Product";
DROP POLICY IF EXISTS "product_update_admin" ON public."Product";
DROP POLICY IF EXISTS "product_delete_admin" ON public."Product";

-- User policies
DROP POLICY IF EXISTS "Enable read access for all users" ON public."User";
DROP POLICY IF EXISTS "user_select_own" ON public."User";
DROP POLICY IF EXISTS "user_update_own" ON public."User";
DROP POLICY IF EXISTS "user_read_all" ON public."User";
DROP POLICY IF EXISTS "user_insert_self" ON public."User";

-- ============================================================
-- STEP 7: Enable RLS on all remaining tables
-- ============================================================
ALTER TABLE public."Shop"    ENABLE ROW LEVEL SECURITY;
ALTER TABLE public."User"    ENABLE ROW LEVEL SECURITY;
ALTER TABLE public."Product" ENABLE ROW LEVEL SECURITY;
ALTER TABLE public."Order"   ENABLE ROW LEVEL SECURITY;

-- ============================================================
-- STEP 8: Create clean, simple RLS policies
-- ============================================================

-- ---- SHOP: Everyone can read, nobody inserts from client ----
CREATE POLICY "shop_read"
  ON public."Shop" FOR SELECT
  TO anon, authenticated
  USING (true);

-- ---- USER: Auth users can read all, update own ----
CREATE POLICY "user_read"
  ON public."User" FOR SELECT
  TO anon, authenticated
  USING (true);

CREATE POLICY "user_insert_auth"
  ON public."User" FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "user_update_own"
  ON public."User" FOR UPDATE
  TO authenticated
  USING ("authId" = auth.uid()::text)
  WITH CHECK ("authId" = auth.uid()::text);

-- ---- PRODUCT: Everyone reads, admins manage ----
CREATE POLICY "product_read"
  ON public."Product" FOR SELECT
  TO anon, authenticated
  USING (true);

CREATE POLICY "product_admin_insert"
  ON public."Product" FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public."User"
      WHERE "authId" = auth.uid()::text
        AND role IN ('ADMIN', 'DEVELOPER')
    )
  );

CREATE POLICY "product_admin_update"
  ON public."Product" FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public."User"
      WHERE "authId" = auth.uid()::text
        AND role IN ('ADMIN', 'DEVELOPER')
    )
  );

CREATE POLICY "product_admin_delete"
  ON public."Product" FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public."User"
      WHERE "authId" = auth.uid()::text
        AND role IN ('ADMIN', 'DEVELOPER')
    )
  );

-- ---- ORDER: The critical one — simple email-based check ----

-- INSERT: Any authenticated user can create their own order
-- Uses email from JWT token to match the order's userEmail
CREATE POLICY "order_insert"
  ON public."Order" FOR INSERT
  TO authenticated
  WITH CHECK (
    -- The order's userEmail must match the authenticated user's email
    "userEmail" = (auth.jwt()->>'email')
  );

-- SELECT: Own orders (by email) + admin/developer sees all
CREATE POLICY "order_select"
  ON public."Order" FOR SELECT
  TO authenticated
  USING (
    "userEmail" = (auth.jwt()->>'email')
    OR EXISTS (
      SELECT 1 FROM public."User"
      WHERE "authId" = auth.uid()::text
        AND role IN ('ADMIN', 'DEVELOPER')
    )
  );

-- UPDATE: Own orders (by email) + admin/developer can update all
CREATE POLICY "order_update"
  ON public."Order" FOR UPDATE
  TO authenticated
  USING (
    "userEmail" = (auth.jwt()->>'email')
    OR EXISTS (
      SELECT 1 FROM public."User"
      WHERE "authId" = auth.uid()::text
        AND role IN ('ADMIN', 'DEVELOPER')
    )
  )
  WITH CHECK (
    "userEmail" = (auth.jwt()->>'email')
    OR EXISTS (
      SELECT 1 FROM public."User"
      WHERE "authId" = auth.uid()::text
        AND role IN ('ADMIN', 'DEVELOPER')
    )
  );

-- ============================================================
-- STEP 9: Update RPC functions for simplified schema
-- ============================================================

-- Recreate mark_order_collected (no OrderItem dependency)
CREATE OR REPLACE FUNCTION public.mark_order_collected(order_id text)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  UPDATE public."Order"
  SET status = 'COMPLETED',
      "updatedAt" = now()
  WHERE id = order_id;
END;
$$;

-- Recreate get_admin_orders (no OrderItem join needed)
CREATE OR REPLACE FUNCTION public.get_admin_orders(requesting_user_id text)
RETURNS SETOF public."Order"
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Verify the requesting user is admin or developer
  IF NOT EXISTS (
    SELECT 1 FROM public."User"
    WHERE id = requesting_user_id
      AND role IN ('ADMIN', 'DEVELOPER')
  ) THEN
    RAISE EXCEPTION 'Unauthorized: not admin/developer';
  END IF;

  RETURN QUERY
    SELECT * FROM public."Order"
    ORDER BY "createdAt" DESC;
END;
$$;

-- ============================================================
-- DONE! Final table count: Shop, User, Product, Order (4 tables)
-- ============================================================
