-- ============================================================
-- ADD INVENTORY + STOCK LOG TABLES
-- Run AFTER 20250615_simplify_schema.sql
-- ============================================================

-- ============================================================
-- STEP 1: Create Inventory table
-- ============================================================
CREATE TABLE IF NOT EXISTS public."Inventory" (
  id          text PRIMARY KEY DEFAULT gen_random_uuid()::text,
  name        text NOT NULL,
  stock       integer NOT NULL DEFAULT 0,
  unit        text NOT NULL DEFAULT 'pieces',
  threshold   integer NOT NULL DEFAULT 10,
  "shopId"    text REFERENCES public."Shop"(id) ON DELETE SET NULL,
  "createdAt" timestamptz NOT NULL DEFAULT now(),
  "updatedAt" timestamptz NOT NULL DEFAULT now()
);

-- ============================================================
-- STEP 2: Create StockLog table (tracks every stock change)
-- ============================================================
CREATE TABLE IF NOT EXISTS public."StockLog" (
  id            text PRIMARY KEY DEFAULT gen_random_uuid()::text,
  "inventoryId" text NOT NULL REFERENCES public."Inventory"(id) ON DELETE CASCADE,
  amount        integer NOT NULL,           -- positive = added, negative = removed
  note          text DEFAULT '',
  "createdBy"   text DEFAULT '',            -- admin email or name
  "createdAt"   timestamptz NOT NULL DEFAULT now()
);

-- ============================================================
-- STEP 3: Enable RLS
-- ============================================================
ALTER TABLE public."Inventory" ENABLE ROW LEVEL SECURITY;
ALTER TABLE public."StockLog"  ENABLE ROW LEVEL SECURITY;

-- ============================================================
-- STEP 4: RLS Policies — Admins/Developers manage, all can read
-- ============================================================

-- Inventory: everyone reads (for display), admin/dev manages
CREATE POLICY "inventory_read"
  ON public."Inventory" FOR SELECT
  TO anon, authenticated
  USING (true);

CREATE POLICY "inventory_insert"
  ON public."Inventory" FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public."User"
      WHERE "authId" = auth.uid()::text
        AND role IN ('ADMIN', 'DEVELOPER')
    )
  );

CREATE POLICY "inventory_update"
  ON public."Inventory" FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public."User"
      WHERE "authId" = auth.uid()::text
        AND role IN ('ADMIN', 'DEVELOPER')
    )
  );

CREATE POLICY "inventory_delete"
  ON public."Inventory" FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public."User"
      WHERE "authId" = auth.uid()::text
        AND role IN ('ADMIN', 'DEVELOPER')
    )
  );

-- StockLog: everyone reads, admin/dev inserts
CREATE POLICY "stocklog_read"
  ON public."StockLog" FOR SELECT
  TO anon, authenticated
  USING (true);

CREATE POLICY "stocklog_insert"
  ON public."StockLog" FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public."User"
      WHERE "authId" = auth.uid()::text
        AND role IN ('ADMIN', 'DEVELOPER')
    )
  );

-- ============================================================
-- STEP 5: Seed default inventory items for print shops
-- ============================================================
INSERT INTO public."Inventory" (id, name, stock, unit, threshold) VALUES
  (gen_random_uuid()::text, 'A4 Paper (White)',      0, 'sheets',     2000),
  (gen_random_uuid()::text, 'A3 Paper',              0, 'sheets',     500),
  (gen_random_uuid()::text, 'Black Ink',             0, 'cartridges', 2),
  (gen_random_uuid()::text, 'Color Ink (Cyan)',      0, 'cartridges', 2),
  (gen_random_uuid()::text, 'Color Ink (Magenta)',   0, 'cartridges', 2),
  (gen_random_uuid()::text, 'Color Ink (Yellow)',    0, 'cartridges', 2),
  (gen_random_uuid()::text, 'Spiral Binding Coils',  0, 'pieces',     20)
ON CONFLICT DO NOTHING;

-- ============================================================
-- DONE! New tables: Inventory, StockLog
-- ============================================================
