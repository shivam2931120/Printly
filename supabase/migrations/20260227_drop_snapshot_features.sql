-- Migration to drop the DailyStats table and its associated data snapshot features

-- 1. Drop the table (CASCADE drops policies/indexes)
DROP TABLE IF EXISTS "DailyStats" CASCADE;

-- 2. Drop the specific snapshot RPC
DROP FUNCTION IF EXISTS snapshot_daily_stats();

-- 3. Redefine cleanup_old_orders to omit snapshotting
CREATE OR REPLACE FUNCTION cleanup_old_orders(
    keep_days INT DEFAULT 7,
    force BOOLEAN DEFAULT false
) RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
    deleted_count INT;
    size_before BIGINT;
    size_after BIGINT;
    cutoff_date TIMESTAMPTZ;
BEGIN
    SELECT pg_database_size(current_database()) INTO size_before;

    -- STEP 1: Determine cutoff
    IF force THEN
        cutoff_date := (now() AT TIME ZONE 'Asia/Kolkata')::date::timestamptz;
    ELSE
        cutoff_date := now() - (keep_days || ' days')::interval;
    END IF;

    -- STEP 2: Delete only COMPLETED / CANCELLED orders older than cutoff
    DELETE FROM "Order"
    WHERE "createdAt" < cutoff_date
      AND status IN ('COMPLETED', 'CANCELLED');

    GET DIAGNOSTICS deleted_count = ROW_COUNT;

    SELECT pg_database_size(current_database()) INTO size_after;

    RETURN jsonb_build_object(
        'success', true,
        'ordersDeleted', deleted_count,
        'freedMbApprox', round(((size_before - size_after) / 1048576.0)::numeric, 2),
        'cutoffDate', cutoff_date,
        'keepDays', keep_days
    );
END;
$$;
