-- Add pricingConfig JSONB column to Shop table
ALTER TABLE "Shop"
ADD COLUMN IF NOT EXISTS "pricingConfig" JSONB;

-- Seed existing shop rows with default pricing so the column is never NULL
UPDATE "Shop"
SET "pricingConfig" = '{
  "perPageBW": 2,
  "perPageColor": 10,
  "doubleSidedDiscount": 0.5,
  "bindingPrices": { "none": 0, "spiral": 25, "soft": 60, "hard": 150 },
  "serviceFee": 5,
  "paperSizeMultiplier": { "a4": 1, "a3": 2, "letter": 1, "legal": 1.5 },
  "paperTypeFees": { "normal": 0, "bond": 2, "glossy": 5 },
  "holePunchPrice": 10,
  "coverPagePrice": 15
}'::jsonb
WHERE "pricingConfig" IS NULL;
