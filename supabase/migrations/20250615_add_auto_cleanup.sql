-- ============================================================
-- AUTO-CLEANUP: Snapshot + purge old orders when DB is full
-- Run AFTER 20250615_add_daily_stats.sql
-- ============================================================

-- 1. Check approximate DB usage
CREATE OR REPLACE FUNCTION get_db_usage()
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    used_bytes BIGINT;
    used_mb DOUBLE PRECISION;
    limit_mb DOUBLE PRECISION := 500; -- Supabase free tier
BEGIN
    SELECT pg_database_size(current_database()) INTO used_bytes;
    used_mb := round((used_bytes / 1048576.0)::numeric, 2);

    RETURN jsonb_build_object(
        'used_mb', used_mb,
        'limit_mb', limit_mb,
        'percent_used', round(((used_mb / limit_mb) * 100)::numeric, 1)
    );
END;
$$;

-- 2. Cleanup: snapshot first, then delete old completed/cancelled orders
CREATE OR REPLACE FUNCTION cleanup_old_orders(
    keep_days INT DEFAULT 7,
    force BOOLEAN DEFAULT false
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    snapshot_result jsonb;
    deleted_count INT;
    size_before BIGINT;
    size_after BIGINT;
    cutoff_date TIMESTAMPTZ;
BEGIN
    SELECT pg_database_size(current_database()) INTO size_before;

    -- STEP 1: Snapshot current order analytics into DailyStats
    SELECT snapshot_daily_stats() INTO snapshot_result;

    -- STEP 2: Determine cutoff
    IF force THEN
        cutoff_date := (now() AT TIME ZONE 'Asia/Kolkata')::date::timestamptz;
    ELSE
        cutoff_date := now() - (keep_days || ' days')::interval;
    END IF;

    -- STEP 3: Delete only COMPLETED / CANCELLED orders older than cutoff
    DELETE FROM "Order"
    WHERE "createdAt" < cutoff_date
      AND status IN ('COMPLETED', 'CANCELLED');

    GET DIAGNOSTICS deleted_count = ROW_COUNT;

    SELECT pg_database_size(current_database()) INTO size_after;

    RETURN jsonb_build_object(
        'success', true,
        'snapshotResult', snapshot_result,
        'ordersDeleted', deleted_count,
        'freedMbApprox', round(((size_before - size_after) / 1048576.0)::numeric, 2),
        'cutoffDate', cutoff_date,
        'keepDays', keep_days
    );
END;
$$;

-- 3. Auto-cleanup: progressively aggressive based on DB usage
--    90% → keep 30 days, 95% → keep 7 days, 98% → keep today only
CREATE OR REPLACE FUNCTION auto_cleanup_if_needed()
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    usage jsonb;
    pct DOUBLE PRECISION;
    result jsonb;
BEGIN
    SELECT get_db_usage() INTO usage;
    pct := (usage->>'percent_used')::double precision;

    IF pct >= 98 THEN
        SELECT cleanup_old_orders(0, true) INTO result;
    ELSIF pct >= 95 THEN
        SELECT cleanup_old_orders(7, false) INTO result;
    ELSIF pct >= 90 THEN
        SELECT cleanup_old_orders(30, false) INTO result;
    ELSE
        result := jsonb_build_object(
            'success', true,
            'action', 'none',
            'percentUsed', pct
        );
    END IF;

    RETURN result || jsonb_build_object('dbUsage', usage);
END;
$$;
