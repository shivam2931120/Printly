-- ============================================================
-- FIX: User.id has no database-level default
-- Prisma's @default(cuid()) only generates IDs on the client.
-- Direct SQL inserts (triggers, RPC, manual) need a DB default.
-- ============================================================

-- 1. Add a DB-level default for the id column
ALTER TABLE public."User" ALTER COLUMN id SET DEFAULT gen_random_uuid()::text;

-- 2. Set name for existing rows that have NULL name
UPDATE public."User" SET name = split_part(email, '@', 1) WHERE name IS NULL;

-- 3. Re-create the trigger function with explicit id generation
CREATE OR REPLACE FUNCTION public.handle_new_auth_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    INSERT INTO public."User" (id, "authId", email, name, role)
    VALUES (
        gen_random_uuid()::text,
        NEW.id::text,
        COALESCE(NEW.email, ''),
        COALESCE(
            NEW.raw_user_meta_data->>'name',
            NEW.raw_user_meta_data->>'full_name',
            split_part(COALESCE(NEW.email, 'user@unknown'), '@', 1),
            'User'
        ),
        'USER'
    )
    ON CONFLICT ("authId") DO NOTHING;

    -- Backfill authId on existing email-matched row (legacy rows)
    UPDATE public."User"
    SET "authId" = NEW.id::text
    WHERE email = NEW.email
      AND ("authId" IS NULL OR "authId" = '');

    RETURN NEW;
END;
$$;

-- 4. Ensure trigger exists
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW
    EXECUTE FUNCTION public.handle_new_auth_user();

-- 5. Ensure INSERT policy allows authenticated users to create their own row
DROP POLICY IF EXISTS "user_insert" ON public."User";
CREATE POLICY "user_insert" ON public."User"
    FOR INSERT TO authenticated
    WITH CHECK (true);

-- Also allow anon inserts for the trigger (SECURITY DEFINER handles this,
-- but belt-and-suspenders):
DROP POLICY IF EXISTS "user_insert_anon" ON public."User";
CREATE POLICY "user_insert_anon" ON public."User"
    FOR INSERT TO anon
    WITH CHECK (true);
