-- Store Razorpay server-created order ids so checkout signatures can be verified
-- against data retrieved from the server, not only from the browser callback.
ALTER TABLE public."Order"
  ADD COLUMN IF NOT EXISTS "razorpayOrderId" TEXT;

-- Users may request cancellation only before printing starts. Staff still owns
-- the final decision, so this is a request flag instead of a destructive status.
ALTER TABLE public."Order"
  ADD COLUMN IF NOT EXISTS "cancelRequested" BOOLEAN NOT NULL DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS "cancelReason" TEXT,
  ADD COLUMN IF NOT EXISTS "cancelRequestedAt" TIMESTAMPTZ;

-- Local print/inventory agents can report automation health without overloading
-- the customer-facing order status.
ALTER TABLE public."Order"
  ADD COLUMN IF NOT EXISTS "printJobStatus" TEXT,
  ADD COLUMN IF NOT EXISTS "printJobError" TEXT,
  ADD COLUMN IF NOT EXISTS "printJobAttempts" INTEGER NOT NULL DEFAULT 0;

CREATE INDEX IF NOT EXISTS "Order_razorpayOrderId_idx"
  ON public."Order" ("razorpayOrderId");

CREATE INDEX IF NOT EXISTS "Order_cancelRequested_idx"
  ON public."Order" ("cancelRequested")
  WHERE "cancelRequested" = TRUE;

CREATE INDEX IF NOT EXISTS "Order_printJobStatus_idx"
  ON public."Order" ("printJobStatus");
