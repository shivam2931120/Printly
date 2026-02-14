-- ============================================================
-- Migration: Add inventoryProcessed flag to Order table
-- Run this ONCE on your Supabase DB when ready to link the agent.
-- Kept here for reference only — does NOT auto-apply.
-- ============================================================

ALTER TABLE public."Order"
  ADD COLUMN IF NOT EXISTS "inventoryProcessed" boolean DEFAULT NULL;

-- Partial index for fast polling of unprocessed orders
CREATE INDEX IF NOT EXISTS idx_order_inventory_pending
  ON public."Order" (status, "inventoryProcessed")
  WHERE "inventoryProcessed" IS NULL;
