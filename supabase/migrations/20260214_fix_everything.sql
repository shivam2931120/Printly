-- ============================================================
-- COMPREHENSIVE FIX: All DB issues, RLS, functions, triggers
-- Safe to re-run (idempotent). Run in Supabase SQL Editor.
-- Date: 2026-02-14  (v3 — fixes infinite recursion)
-- ============================================================

BEGIN;

-- ============================================================
-- 0. Extensions
-- ============================================================
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- ============================================================
-- 1. FIX: User.id DB default (Prisma cuid() is client-only)
-- ============================================================
ALTER TABLE public."User"
  ALTER COLUMN id SET DEFAULT gen_random_uuid()::text;

-- Backfill NULL names
UPDATE public."User"
SET name = split_part(email, '@', 1)
WHERE name IS NULL OR name = '';

-- ============================================================
-- 1b. CRITICAL: Helper function to check admin/developer role
--     SECURITY DEFINER = bypasses RLS → no infinite recursion
-- ============================================================
CREATE OR REPLACE FUNCTION public.is_admin_or_developer()
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
STABLE
AS $$
    SELECT EXISTS (
        SELECT 1 FROM public."User"
        WHERE "authId" = auth.uid()::text
          AND role IN ('ADMIN', 'DEVELOPER')
    );
$$;

GRANT EXECUTE ON FUNCTION public.is_admin_or_developer() TO authenticated;

-- ============================================================
-- 2. FIX: Trigger with proper search_path & id
-- ============================================================
CREATE OR REPLACE FUNCTION public.handle_new_auth_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    INSERT INTO public."User" (id, "authId", email, name, role)
    VALUES (
        gen_random_uuid()::text,
        NEW.id::text,
        COALESCE(NEW.email, ''),
        COALESCE(
            NEW.raw_user_meta_data->>'name',
            NEW.raw_user_meta_data->>'full_name',
            split_part(COALESCE(NEW.email, 'user@unknown'), '@', 1),
            'User'
        ),
        'USER'
    )
    ON CONFLICT ("authId") DO NOTHING;

    -- Backfill authId on legacy email-matched row
    UPDATE public."User"
    SET "authId" = NEW.id::text
    WHERE email = NEW.email
      AND ("authId" IS NULL OR "authId" = '');

    RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW
    EXECUTE FUNCTION public.handle_new_auth_user();

-- ============================================================
-- 3. FIX: All RPC functions — add SET search_path = public
-- ============================================================

-- 3a. get_admin_orders
CREATE OR REPLACE FUNCTION public.get_admin_orders(requesting_user_id text)
RETURNS SETOF public."Order"
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    -- Verify the requester is admin or developer
    IF NOT EXISTS (
        SELECT 1 FROM public."User"
        WHERE id = requesting_user_id
          AND role IN ('ADMIN', 'DEVELOPER')
    ) THEN
        RAISE EXCEPTION 'Access denied';
    END IF;

    RETURN QUERY
        SELECT * FROM public."Order"
        WHERE "isDeleted" = false
        ORDER BY "createdAt" DESC;
END;
$$;

-- 3b. mark_order_collected
CREATE OR REPLACE FUNCTION public.mark_order_collected(order_id text)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    UPDATE public."Order"
    SET status = 'COMPLETED',
        "updatedAt" = now()
    WHERE id = order_id;
END;
$$;

-- 3c. snapshot_daily_stats
CREATE OR REPLACE FUNCTION public.snapshot_daily_stats()
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    rows_upserted int := 0;
    stat record;
BEGIN
    FOR stat IN
        SELECT
            DATE("createdAt") AS day,
            COALESCE(SUM("totalAmount"), 0) AS revenue,
            COUNT(*) AS order_count,
            COUNT(*) FILTER (WHERE items::text LIKE '%print%') AS print_jobs,
            COUNT(*) FILTER (WHERE items::text LIKE '%product%') AS product_sales,
            ROUND(COALESCE(AVG("totalAmount"), 0)::numeric, 2) AS avg_order_value,
            COUNT(DISTINCT "userId") AS unique_customers,
            "shopId"
        FROM public."Order"
        WHERE status != 'CANCELLED'
          AND "isDeleted" = false
        GROUP BY DATE("createdAt"), "shopId"
    LOOP
        INSERT INTO public."DailyStats" (
            id, date, revenue, "orderCount", "printJobs",
            "productSales", "avgOrderValue", "uniqueCustomers",
            "bwPages", "colorPages", "shopId", "createdAt", "updatedAt"
        )
        VALUES (
            gen_random_uuid()::text,
            stat.day,
            stat.revenue,
            stat.order_count,
            stat.print_jobs,
            stat.product_sales,
            stat.avg_order_value,
            stat.unique_customers,
            0, 0,
            stat."shopId",
            now(), now()
        )
        ON CONFLICT (date) DO UPDATE SET
            revenue         = EXCLUDED.revenue,
            "orderCount"    = EXCLUDED."orderCount",
            "printJobs"     = EXCLUDED."printJobs",
            "productSales"  = EXCLUDED."productSales",
            "avgOrderValue" = EXCLUDED."avgOrderValue",
            "uniqueCustomers" = EXCLUDED."uniqueCustomers",
            "updatedAt"     = now();

        rows_upserted := rows_upserted + 1;
    END LOOP;

    RETURN jsonb_build_object('rowsUpserted', rows_upserted);
END;
$$;

-- 3d. get_db_usage
CREATE OR REPLACE FUNCTION public.get_db_usage()
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    used numeric;
    lim numeric := 500;
BEGIN
    SELECT ROUND(pg_database_size(current_database()) / (1024.0 * 1024), 2) INTO used;
    RETURN jsonb_build_object(
        'used_mb', used,
        'limit_mb', lim,
        'percent_used', ROUND((used / lim) * 100, 1)
    );
END;
$$;

-- 3e. cleanup_old_orders
CREATE OR REPLACE FUNCTION public.cleanup_old_orders(keep_days int DEFAULT 7, force boolean DEFAULT false)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    deleted int;
    freed_approx numeric;
BEGIN
    IF NOT force THEN
        -- Only cleanup if DB is over 80% utilization
        IF (SELECT pg_database_size(current_database()) / (1024.0 * 1024)) < 400 THEN
            RETURN jsonb_build_object('success', false, 'reason', 'DB usage below threshold');
        END IF;
    END IF;

    WITH deleted_rows AS (
        DELETE FROM public."Order"
        WHERE "isDeleted" = true
          AND "deletedAt" < now() - (keep_days || ' days')::interval
        RETURNING id
    )
    SELECT count(*) INTO deleted FROM deleted_rows;

    freed_approx := deleted * 0.002;

    RETURN jsonb_build_object(
        'success', true,
        'ordersDeleted', deleted,
        'freedMbApprox', freed_approx
    );
END;
$$;

-- 3f. auto_cleanup_if_needed
CREATE OR REPLACE FUNCTION public.auto_cleanup_if_needed()
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    usage_pct numeric;
    result jsonb;
BEGIN
    SELECT ROUND(
        (pg_database_size(current_database()) / (1024.0 * 1024 * 500)) * 100, 1
    ) INTO usage_pct;

    IF usage_pct < 80 THEN
        RETURN jsonb_build_object(
            'success', true,
            'action', 'none',
            'dbUsage', jsonb_build_object('percent_used', usage_pct)
        );
    END IF;

    result := public.cleanup_old_orders(7, true);

    RETURN jsonb_build_object(
        'success', true,
        'action', 'cleanup_performed',
        'ordersDeleted', result->'ordersDeleted',
        'dbUsage', jsonb_build_object('percent_used', usage_pct)
    );
END;
$$;

-- ============================================================
-- 4. FIX: RLS Policies — use is_admin_or_developer() helper
--    to avoid infinite recursion on User table
-- ============================================================

-- ---- USER TABLE ----
ALTER TABLE public."User" ENABLE ROW LEVEL SECURITY;

-- Drop ALL old policies (covers every variant we've ever created)
DROP POLICY IF EXISTS "user_insert" ON public."User";
DROP POLICY IF EXISTS "user_insert_anon" ON public."User";
DROP POLICY IF EXISTS "user_select" ON public."User";
DROP POLICY IF EXISTS "user_update" ON public."User";
DROP POLICY IF EXISTS "users_select_own" ON public."User";
DROP POLICY IF EXISTS "users_update_own" ON public."User";
DROP POLICY IF EXISTS "users_insert_authenticated" ON public."User";
DROP POLICY IF EXISTS "user_read_own" ON public."User";
DROP POLICY IF EXISTS "user_read" ON public."User";
DROP POLICY IF EXISTS "allow_user_read" ON public."User";
DROP POLICY IF EXISTS "allow_user_insert" ON public."User";
DROP POLICY IF EXISTS "allow_user_update" ON public."User";
DROP POLICY IF EXISTS "user_select_own" ON public."User";
DROP POLICY IF EXISTS "user_insert_auth" ON public."User";
DROP POLICY IF EXISTS "user_update_own" ON public."User";
DROP POLICY IF EXISTS "user_update_admin" ON public."User";
DROP POLICY IF EXISTS "Allow authenticated users to see all users" ON public."User";
DROP POLICY IF EXISTS "Users can update own profile" ON public."User";

-- SELECT: own row by authId/email, OR admin/dev via helper (no recursion)
CREATE POLICY "user_select_own" ON public."User"
    FOR SELECT TO authenticated
    USING (
        "authId" = auth.uid()::text
        OR email = auth.jwt()->>'email'
        OR public.is_admin_or_developer()
    );

-- INSERT: authenticated can create their own row
CREATE POLICY "user_insert_auth" ON public."User"
    FOR INSERT TO authenticated
    WITH CHECK ("authId" = auth.uid()::text);

-- UPDATE: own row
CREATE POLICY "user_update_own" ON public."User"
    FOR UPDATE TO authenticated
    USING ("authId" = auth.uid()::text)
    WITH CHECK ("authId" = auth.uid()::text);

-- UPDATE: admin/dev can update any user (via helper)
CREATE POLICY "user_update_admin" ON public."User"
    FOR UPDATE TO authenticated
    USING (public.is_admin_or_developer())
    WITH CHECK (true);

-- ---- SHOP TABLE ----
ALTER TABLE public."Shop" ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "shop_select_public" ON public."Shop";
DROP POLICY IF EXISTS "shop_select" ON public."Shop";
DROP POLICY IF EXISTS "shop_update" ON public."Shop";
DROP POLICY IF EXISTS "shop_insert" ON public."Shop";
DROP POLICY IF EXISTS "shop_read" ON public."Shop";
DROP POLICY IF EXISTS "shop_select_all" ON public."Shop";
DROP POLICY IF EXISTS "shop_modify_admin" ON public."Shop";

CREATE POLICY "shop_select_all" ON public."Shop"
    FOR SELECT TO anon, authenticated
    USING (true);

CREATE POLICY "shop_modify_admin" ON public."Shop"
    FOR ALL TO authenticated
    USING (public.is_admin_or_developer())
    WITH CHECK (public.is_admin_or_developer());

-- ---- PRODUCT TABLE ----
ALTER TABLE public."Product" ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "product_select" ON public."Product";
DROP POLICY IF EXISTS "product_modify" ON public."Product";
DROP POLICY IF EXISTS "product_read_all" ON public."Product";
DROP POLICY IF EXISTS "product_read" ON public."Product";
DROP POLICY IF EXISTS "products_select_all" ON public."Product";
DROP POLICY IF EXISTS "product_select_all" ON public."Product";
DROP POLICY IF EXISTS "product_modify_admin" ON public."Product";
DROP POLICY IF EXISTS "product_admin_insert" ON public."Product";
DROP POLICY IF EXISTS "product_admin_update" ON public."Product";
DROP POLICY IF EXISTS "product_admin_delete" ON public."Product";

CREATE POLICY "product_select_all" ON public."Product"
    FOR SELECT TO anon, authenticated
    USING (true);

CREATE POLICY "product_modify_admin" ON public."Product"
    FOR ALL TO authenticated
    USING (public.is_admin_or_developer())
    WITH CHECK (public.is_admin_or_developer());

-- ---- ORDER TABLE ----
ALTER TABLE public."Order" ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "order_insert_own" ON public."Order";
DROP POLICY IF EXISTS "order_select_own" ON public."Order";
DROP POLICY IF EXISTS "order_update_own" ON public."Order";
DROP POLICY IF EXISTS "order_select_admin_developer" ON public."Order";
DROP POLICY IF EXISTS "order_select_admin" ON public."Order";
DROP POLICY IF EXISTS "order_update_admin" ON public."Order";
DROP POLICY IF EXISTS "order_delete_admin" ON public."Order";
DROP POLICY IF EXISTS "order_insert" ON public."Order";
DROP POLICY IF EXISTS "order_select" ON public."Order";
DROP POLICY IF EXISTS "order_update" ON public."Order";
DROP POLICY IF EXISTS "order_insert_auth" ON public."Order";

-- Insert: any authenticated user
CREATE POLICY "order_insert_auth" ON public."Order"
    FOR INSERT TO authenticated
    WITH CHECK (true);

-- Select own orders
CREATE POLICY "order_select_own" ON public."Order"
    FOR SELECT TO authenticated
    USING (
        "userEmail" = auth.jwt()->>'email'
        OR EXISTS (
            SELECT 1 FROM public."User" u
            WHERE u.id = "Order"."userId"
              AND u."authId" = auth.uid()::text
        )
    );

-- Admin/dev can see all orders (via helper — no recursion)
CREATE POLICY "order_select_admin" ON public."Order"
    FOR SELECT TO authenticated
    USING (public.is_admin_or_developer());

-- Update own + admin
CREATE POLICY "order_update_own" ON public."Order"
    FOR UPDATE TO authenticated
    USING (
        "userEmail" = auth.jwt()->>'email'
        OR public.is_admin_or_developer()
        OR EXISTS (
            SELECT 1 FROM public."User" u
            WHERE u.id = "Order"."userId"
              AND u."authId" = auth.uid()::text
        )
    )
    WITH CHECK (true);

-- Delete admin only
CREATE POLICY "order_delete_admin" ON public."Order"
    FOR DELETE TO authenticated
    USING (public.is_admin_or_developer());

-- ---- INVENTORY TABLE ----
DO $$ BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'Inventory') THEN
        ALTER TABLE public."Inventory" ENABLE ROW LEVEL SECURITY;

        DROP POLICY IF EXISTS "inventory_select" ON public."Inventory";
        DROP POLICY IF EXISTS "inventory_modify" ON public."Inventory";
        DROP POLICY IF EXISTS "inventory_read" ON public."Inventory";
        DROP POLICY IF EXISTS "inventory_insert" ON public."Inventory";
        DROP POLICY IF EXISTS "inventory_update" ON public."Inventory";
        DROP POLICY IF EXISTS "inventory_delete" ON public."Inventory";

        EXECUTE 'CREATE POLICY "inventory_select" ON public."Inventory" FOR SELECT TO authenticated USING (true)';
        EXECUTE 'CREATE POLICY "inventory_modify" ON public."Inventory" FOR ALL TO authenticated USING (public.is_admin_or_developer()) WITH CHECK (public.is_admin_or_developer())';
    END IF;
END $$;

-- ---- STOCKLOG TABLE ----
DO $$ BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'StockLog') THEN
        ALTER TABLE public."StockLog" ENABLE ROW LEVEL SECURITY;

        DROP POLICY IF EXISTS "stocklog_select" ON public."StockLog";
        DROP POLICY IF EXISTS "stocklog_insert" ON public."StockLog";
        DROP POLICY IF EXISTS "stocklog_read" ON public."StockLog";

        EXECUTE 'CREATE POLICY "stocklog_select" ON public."StockLog" FOR SELECT TO authenticated USING (true)';
        EXECUTE 'CREATE POLICY "stocklog_insert" ON public."StockLog" FOR INSERT TO authenticated WITH CHECK (public.is_admin_or_developer())';
    END IF;
END $$;

-- ---- DAILYSTATS TABLE ----
DO $$ BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'DailyStats') THEN
        ALTER TABLE public."DailyStats" ENABLE ROW LEVEL SECURITY;

        DROP POLICY IF EXISTS "dailystats_select" ON public."DailyStats";
        DROP POLICY IF EXISTS "dailystats_modify" ON public."DailyStats";
        DROP POLICY IF EXISTS "Admin can read DailyStats" ON public."DailyStats";
        DROP POLICY IF EXISTS "Admin can upsert DailyStats" ON public."DailyStats";
        DROP POLICY IF EXISTS "Admin can update DailyStats" ON public."DailyStats";

        EXECUTE 'CREATE POLICY "dailystats_select" ON public."DailyStats" FOR SELECT TO authenticated USING (true)';
        EXECUTE 'CREATE POLICY "dailystats_modify" ON public."DailyStats" FOR ALL TO authenticated USING (public.is_admin_or_developer()) WITH CHECK (public.is_admin_or_developer())';
    END IF;
END $$;

-- ============================================================
-- 5. Grant execute on functions to authenticated + anon
-- ============================================================
GRANT EXECUTE ON FUNCTION public.is_admin_or_developer() TO authenticated;
GRANT EXECUTE ON FUNCTION public.handle_new_auth_user() TO postgres, service_role;
GRANT EXECUTE ON FUNCTION public.get_admin_orders(text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.mark_order_collected(text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.snapshot_daily_stats() TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_db_usage() TO authenticated;
GRANT EXECUTE ON FUNCTION public.cleanup_old_orders(int, boolean) TO authenticated;
GRANT EXECUTE ON FUNCTION public.auto_cleanup_if_needed() TO authenticated;

-- ============================================================
-- 7. Backfill orderToken to 4-digit numeric for all orders
-- ============================================================
UPDATE public."Order"
SET "orderToken" = LPAD(FLOOR(1000 + random() * 9000)::int::text, 4, '0')
WHERE "orderToken" IS NULL
   OR length(trim("orderToken")) != 4
   OR "orderToken" ~ '[^0-9]';

-- ============================================================
-- 8. DB Constraints, Indexes & Token Uniqueness
-- ============================================================

-- 8a. NOT NULL constraints (safe: only on columns that always have values)
ALTER TABLE public."Order" ALTER COLUMN "totalAmount" SET NOT NULL;
ALTER TABLE public."Order" ALTER COLUMN status SET NOT NULL;
ALTER TABLE public."Order" ALTER COLUMN "paymentStatus" SET NOT NULL;
ALTER TABLE public."Order" ALTER COLUMN "createdAt" SET NOT NULL;
ALTER TABLE public."Order" ALTER COLUMN "updatedAt" SET NOT NULL;
ALTER TABLE public."Order" ALTER COLUMN "isDeleted" SET NOT NULL;
ALTER TABLE public."Order" ALTER COLUMN "isDeleted" SET DEFAULT false;

ALTER TABLE public."User" ALTER COLUMN email SET NOT NULL;
ALTER TABLE public."User" ALTER COLUMN "createdAt" SET NOT NULL;
ALTER TABLE public."User" ALTER COLUMN "updatedAt" SET NOT NULL;

-- 8b. Performance indexes (IF NOT EXISTS for idempotency)
CREATE INDEX IF NOT EXISTS idx_order_userid ON public."Order"("userId");
CREATE INDEX IF NOT EXISTS idx_order_shopid ON public."Order"("shopId");
CREATE INDEX IF NOT EXISTS idx_order_status ON public."Order"(status);
CREATE INDEX IF NOT EXISTS idx_order_created ON public."Order"("createdAt" DESC);
CREATE INDEX IF NOT EXISTS idx_order_email ON public."Order"("userEmail");
CREATE INDEX IF NOT EXISTS idx_order_deleted ON public."Order"("isDeleted") WHERE "isDeleted" = false;
CREATE INDEX IF NOT EXISTS idx_order_token ON public."Order"("orderToken");

CREATE INDEX IF NOT EXISTS idx_user_authid ON public."User"("authId");
CREATE INDEX IF NOT EXISTS idx_user_email ON public."User"(email);
CREATE INDEX IF NOT EXISTS idx_user_role ON public."User"(role);

CREATE INDEX IF NOT EXISTS idx_product_shopid ON public."Product"("shopId");
CREATE INDEX IF NOT EXISTS idx_product_active ON public."Product"("isActive") WHERE "isActive" = true;

CREATE INDEX IF NOT EXISTS idx_dailystats_date ON public."DailyStats"(date DESC);
CREATE INDEX IF NOT EXISTS idx_stocklog_invid ON public."StockLog"("inventoryId");

-- 8c. Token uniqueness: generate_unique_order_token() function
--     Generates a 4-digit numeric token, retries on collision (max 50 attempts)
CREATE OR REPLACE FUNCTION public.generate_unique_order_token()
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    new_token text;
    attempts int := 0;
BEGIN
    LOOP
        new_token := LPAD(FLOOR(1000 + random() * 9000)::int::text, 4, '0');
        -- Check if this token is already used by an active (non-completed, non-cancelled) order
        IF NOT EXISTS (
            SELECT 1 FROM public."Order"
            WHERE "orderToken" = new_token
              AND status NOT IN ('COMPLETED', 'CANCELLED')
              AND "isDeleted" = false
        ) THEN
            RETURN new_token;
        END IF;
        attempts := attempts + 1;
        IF attempts > 50 THEN
            -- Fallback: 5-digit token for extreme load
            RETURN LPAD(FLOOR(10000 + random() * 90000)::int::text, 5, '0');
        END IF;
    END LOOP;
END;
$$;

GRANT EXECUTE ON FUNCTION public.generate_unique_order_token() TO authenticated;

-- 8d. Trigger: auto-assign unique token on INSERT if missing
CREATE OR REPLACE FUNCTION public.auto_assign_order_token()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    IF NEW."orderToken" IS NULL OR length(trim(NEW."orderToken")) = 0 THEN
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

-- 8e. Audit log table for order status changes
CREATE TABLE IF NOT EXISTS public."AuditLog" (
    id text PRIMARY KEY DEFAULT gen_random_uuid()::text,
    "tableName" text NOT NULL,
    "recordId" text NOT NULL,
    action text NOT NULL,            -- INSERT, UPDATE, DELETE
    "oldData" jsonb,
    "newData" jsonb,
    "changedBy" text,                -- auth.uid()
    "createdAt" timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_audit_table ON public."AuditLog"("tableName");
CREATE INDEX IF NOT EXISTS idx_audit_record ON public."AuditLog"("recordId");
CREATE INDEX IF NOT EXISTS idx_audit_created ON public."AuditLog"("createdAt" DESC);

-- Audit trigger for Order status changes
CREATE OR REPLACE FUNCTION public.audit_order_changes()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    IF TG_OP = 'UPDATE' AND OLD.status IS DISTINCT FROM NEW.status THEN
        INSERT INTO public."AuditLog" ("tableName", "recordId", action, "oldData", "newData", "changedBy")
        VALUES (
            'Order',
            NEW.id,
            'STATUS_CHANGE',
            jsonb_build_object('status', OLD.status, 'updatedAt', OLD."updatedAt"),
            jsonb_build_object('status', NEW.status, 'updatedAt', NEW."updatedAt"),
            auth.uid()::text
        );
    END IF;
    RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_audit_order ON public."Order";
CREATE TRIGGER trg_audit_order
    AFTER UPDATE ON public."Order"
    FOR EACH ROW
    EXECUTE FUNCTION public.audit_order_changes();

-- AuditLog RLS
ALTER TABLE public."AuditLog" ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "audit_select_admin" ON public."AuditLog";
DROP POLICY IF EXISTS "audit_insert_system" ON public."AuditLog";

CREATE POLICY "audit_select_admin" ON public."AuditLog"
    FOR SELECT TO authenticated
    USING (public.is_admin_or_developer());

-- Allow trigger to insert (SECURITY DEFINER handles this, but also grant for RPC)
CREATE POLICY "audit_insert_system" ON public."AuditLog"
    FOR INSERT TO authenticated
    WITH CHECK (true);

COMMIT;
