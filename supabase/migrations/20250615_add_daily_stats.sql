-- ============================================================
-- DailyStats table — persists aggregated revenue/order data
-- so analytics survive order deletion
-- ============================================================

CREATE TABLE IF NOT EXISTS "DailyStats" (
    id          TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
    date        DATE NOT NULL UNIQUE,               -- one row per day
    revenue     DOUBLE PRECISION NOT NULL DEFAULT 0, -- total revenue that day
    "orderCount"  INT NOT NULL DEFAULT 0,
    "printJobs"   INT NOT NULL DEFAULT 0,            -- print-type items sold
    "productSales" INT NOT NULL DEFAULT 0,           -- product-type items sold
    "avgOrderValue" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "uniqueCustomers" INT NOT NULL DEFAULT 0,
    "bwPages"     INT NOT NULL DEFAULT 0,            -- B&W pages
    "colorPages"  INT NOT NULL DEFAULT 0,            -- Color pages
    "shopId"    TEXT REFERENCES "Shop"(id) ON DELETE SET NULL,
    "createdAt" TIMESTAMPTZ NOT NULL DEFAULT now(),
    "updatedAt" TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Index for date-range queries
CREATE INDEX IF NOT EXISTS idx_dailystats_date ON "DailyStats" (date DESC);

-- ============================================================
-- RLS
-- ============================================================
ALTER TABLE "DailyStats" ENABLE ROW LEVEL SECURITY;

-- Admin / developer can read
CREATE POLICY "Admin can read DailyStats"
    ON "DailyStats" FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM "User"
            WHERE "User"."authId" = auth.uid()::text
              AND "User".role IN ('ADMIN', 'DEVELOPER')
        )
    );

-- Admin can insert / update (for snapshot)
CREATE POLICY "Admin can upsert DailyStats"
    ON "DailyStats" FOR INSERT
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM "User"
            WHERE "User"."authId" = auth.uid()::text
              AND "User".role IN ('ADMIN', 'DEVELOPER')
        )
    );

CREATE POLICY "Admin can update DailyStats"
    ON "DailyStats" FOR UPDATE
    USING (
        EXISTS (
            SELECT 1 FROM "User"
            WHERE "User"."authId" = auth.uid()::text
              AND "User".role IN ('ADMIN', 'DEVELOPER')
        )
    );

-- ============================================================
-- RPC: snapshot_daily_stats
-- Aggregates all current Order data into DailyStats rows.
-- Uses UPSERT so it's safe to call multiple times.
-- ============================================================
CREATE OR REPLACE FUNCTION snapshot_daily_stats()
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    rows_affected INT;
BEGIN
    INSERT INTO "DailyStats" (
        date, revenue, "orderCount", "printJobs", "productSales",
        "avgOrderValue", "uniqueCustomers", "bwPages", "colorPages", "updatedAt"
    )
    SELECT
        ("createdAt" AT TIME ZONE 'Asia/Kolkata')::date AS day,
        COALESCE(SUM("totalAmount"), 0) AS revenue,
        COUNT(*) AS "orderCount",
        -- Count print items from JSONB
        COALESCE(SUM(
            (SELECT COUNT(*) FROM jsonb_array_elements(
                CASE WHEN jsonb_typeof(items::jsonb) = 'array' THEN items::jsonb ELSE '[]'::jsonb END
            ) elem WHERE elem->>'type' = 'print')
        ), 0)::int AS "printJobs",
        -- Count product items from JSONB
        COALESCE(SUM(
            (SELECT COUNT(*) FROM jsonb_array_elements(
                CASE WHEN jsonb_typeof(items::jsonb) = 'array' THEN items::jsonb ELSE '[]'::jsonb END
            ) elem WHERE elem->>'type' = 'product')
        ), 0)::int AS "productSales",
        CASE WHEN COUNT(*) > 0 THEN COALESCE(SUM("totalAmount"), 0) / COUNT(*) ELSE 0 END AS "avgOrderValue",
        COUNT(DISTINCT "userEmail") AS "uniqueCustomers",
        -- B&W pages: sum pageCount where colorMode != 'color'
        COALESCE(SUM(
            (SELECT COALESCE(SUM((elem->>'pageCount')::int * (elem->>'quantity')::int), 0)
             FROM jsonb_array_elements(
                CASE WHEN jsonb_typeof(items::jsonb) = 'array' THEN items::jsonb ELSE '[]'::jsonb END
             ) elem
             WHERE elem->>'type' = 'print'
               AND COALESCE(elem->'printConfig'->>'colorMode', elem->'options'->>'colorMode', 'bw') != 'color')
        ), 0)::int AS "bwPages",
        -- Color pages
        COALESCE(SUM(
            (SELECT COALESCE(SUM((elem->>'pageCount')::int * (elem->>'quantity')::int), 0)
             FROM jsonb_array_elements(
                CASE WHEN jsonb_typeof(items::jsonb) = 'array' THEN items::jsonb ELSE '[]'::jsonb END
             ) elem
             WHERE elem->>'type' = 'print'
               AND COALESCE(elem->'printConfig'->>'colorMode', elem->'options'->>'colorMode', 'bw') = 'color')
        ), 0)::int AS "colorPages",
        now() AS "updatedAt"
    FROM "Order"
    WHERE COALESCE("isDeleted", false) = false
      AND status != 'CANCELLED'
    GROUP BY day
    ON CONFLICT (date) DO UPDATE SET
        revenue          = EXCLUDED.revenue,
        "orderCount"     = EXCLUDED."orderCount",
        "printJobs"      = EXCLUDED."printJobs",
        "productSales"   = EXCLUDED."productSales",
        "avgOrderValue"  = EXCLUDED."avgOrderValue",
        "uniqueCustomers"= EXCLUDED."uniqueCustomers",
        "bwPages"        = EXCLUDED."bwPages",
        "colorPages"     = EXCLUDED."colorPages",
        "updatedAt"      = now();

    GET DIAGNOSTICS rows_affected = ROW_COUNT;

    RETURN jsonb_build_object(
        'success', true,
        'rowsUpserted', rows_affected
    );
END;
$$;
