# Printly - College Printing Service

## Authentication

Printly uses Clerk for authentication and Supabase RLS for data access. Create
developer or admin users in the `User` table by assigning the `DEVELOPER` or
`ADMIN` role to the row linked to the Clerk `authId`.

## Setup & Run

1. **Install dependencies**:
   ```bash
   npm install
   ```

2. **Environment Setup**:
   - Ensure `.env` contains your `DATABASE_URL`.
   - Ensure `.env.local` contains your Supabase browser keys:
     - `VITE_SUPABASE_URL`
     - `VITE_SUPABASE_ANON_KEY`
   - For Razorpay Checkout with server-created Orders API, configure:
     - `RAZORPAY_KEY_ID` or `VITE_RAZORPAY_KEY_ID`
     - `RAZORPAY_KEY_SECRET`
     - `RAZORPAY_WEBHOOK_SECRET`
     - `SUPABASE_URL` or `VITE_SUPABASE_URL`
     - `SUPABASE_SERVICE_ROLE_KEY` (server-only; never prefix this with `VITE_`)
   - The browser creates a Printly order first, `/api/razorpay-order` creates the Razorpay order, Checkout receives that `order_id`, and `/api/verify-razorpay-payment` verifies the returned signature before marking the order paid.
   - Run `supabase/migrations/create_prints_bucket.sql` or `npx tsx scripts/create-bucket.ts` when provisioning storage. The `prints` bucket is public-read, authenticated-write, accepts PDF/images/DOC/DOCX, and has a 50 MB file limit.
   - The local inventory agent uses `SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY` from `local-agent/.env`.
3. **Run Locally**:
   ```bash
   npm run dev
   ```

4. **Quality checks**:
   ```bash
   npm run typecheck
   npm test
   npm run build
   ```

5. **Database Management**:
   - To update schema: `npx prisma db push`
   - To seed users: `npx prisma generate && npx tsx prisma/seed.ts`

6. **Local Inventory Agent**:
   ```bash
   npm install --prefix local-agent
   npm start --prefix local-agent
   ```
   The agent polls confirmed/printing orders where `inventoryProcessed` is null or false, retries failed jobs up to `MAX_JOB_ATTEMPTS`, and marks inventory processing state on the `Order` row.
   Set `SHOP_ID` in `local-agent/.env` to restrict one agent to one shop.

## Pricing behavior

Print job totals use the active shop pricing configuration. Per-order checkout
totals add the configured `serviceFee` once per non-empty cart; they do not add a
hardcoded tax percentage.
