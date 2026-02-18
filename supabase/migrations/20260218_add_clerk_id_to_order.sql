-- Migration: Add clerkId to Order table
-- Allows direct Clerk user ID tracing on every order without a JOIN
-- Run once in Supabase SQL editor or via migration runner

ALTER TABLE public."Order"
    ADD COLUMN IF NOT EXISTS "clerkId" TEXT;

-- Index for fast queries like "show all orders by this Clerk user"
CREATE INDEX IF NOT EXISTS idx_order_clerk_id ON public."Order"("clerkId");

-- Backfill: link existing orders to Clerk ID via User.authId
UPDATE public."Order" o
SET "clerkId" = u."authId"
FROM public."User" u
WHERE o."userId" = u.id
  AND u."authId" IS NOT NULL
  AND o."clerkId" IS NULL;

-- Also add clerkId to User table if not already present (authId serves this purpose)
-- authId already exists: no change needed there.

COMMENT ON COLUMN public."Order"."clerkId" IS 'Clerk user ID (auth.id) — denormalized for fast lookup without JOIN';
