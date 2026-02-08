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

3. **Run Locally**:
   ```bash
   npm run dev
   ```

4. **Database Management**:
   - To update schema: `npx prisma db push`
   - To seed users: `npx prisma generate && npx tsx prisma/seed.ts`
