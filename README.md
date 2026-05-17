# Printly - College Printing Service

## 🔑 Login Credentials

The demo accounts have been replaced with a real database account.

| Role | Email | Password |
|------|-------|----------|
| **Developer** | `shivam.bgp@outlook.com` | `Sh@2931120` |

> This account has full access to:
> - Student Portal
> - Admin Dashboard
> - Developer Panel

## Setup & Run

1. **Install dependencies**:
   ```bash
   npm install
   ```

2. **Environment Setup**:
   - Ensure `.env` contains your `DATABASE_URL`.
   - Ensure `.env.local` contains your Supabase keys.
   - For Razorpay Checkout with server-created Orders API, configure:
     - `RAZORPAY_KEY_ID` or `VITE_RAZORPAY_KEY_ID`
     - `RAZORPAY_KEY_SECRET`
     - `RAZORPAY_WEBHOOK_SECRET`
     - `SUPABASE_URL` or `VITE_SUPABASE_URL`
     - `SUPABASE_SERVICE_ROLE_KEY`
   - The browser creates a Printly order first, `/api/razorpay-order` creates the Razorpay order, Checkout receives that `order_id`, and `/api/verify-razorpay-payment` verifies the returned signature before marking the order paid.
   - Cloud uploads need provider app credentials before picker wiring can be enabled:
     - `VITE_GOOGLE_PICKER_API_KEY`
     - `VITE_GOOGLE_CLIENT_ID`
     - `VITE_ONEDRIVE_CLIENT_ID`

3. **Run Locally**:
   ```bash
   npm run dev
   ```

4. **Database Management**:
   - To update schema: `npx prisma db push`
   - To seed users: `npx prisma generate && npx tsx prisma/seed.ts`
