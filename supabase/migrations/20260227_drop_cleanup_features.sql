-- Migration to drop the auto-cleanup features

-- Drop auto cleanup procedure
DROP FUNCTION IF EXISTS auto_cleanup_if_needed();

-- Drop manual prune old orders procedure
DROP FUNCTION IF EXISTS cleanup_old_orders(INT, BOOLEAN);
