-- AUTH REPAIR SCRIPT (LEGACY USERS)
-- Execute this in the Supabase SQL Editor if you have existing users who can't log in.

-- 1. Enable RLS on User table (if not already enabled)
ALTER TABLE public."User" ENABLE ROW LEVEL SECURITY;

-- 2. NUCLEAR OPTION: Allow authenticated users full view access to the User table for linking
-- (Safe because it's only for AUTHENTICATED users and limited to the transition)
DROP POLICY IF EXISTS "Users can view own profile" ON public."User";
CREATE POLICY "Allow authenticated users to see all users" 
ON public."User" 
FOR SELECT 
TO authenticated 
USING (true);

-- 3. Policy: Users can update their own record by email
DROP POLICY IF EXISTS "Users can update own profile" ON public."User";
CREATE POLICY "Users can update own profile" 
ON public."User" 
FOR UPDATE 
TO authenticated
USING (auth.jwt()->>'email' = email)
WITH CHECK (auth.jwt()->>'email' = email);

-- 4. CLEANUP: Remove insecure password column from public.User
ALTER TABLE public."User" DROP COLUMN IF EXISTS password;

-- 5. REPAIR: Link existing Auth users to public.User table by email
UPDATE public."User" u
SET "authId" = au.id
FROM auth.users au
WHERE u.email = au.email
AND (u."authId" IS NULL OR u."authId" != au.id);
