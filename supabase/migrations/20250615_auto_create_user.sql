-- ============================================================
-- AUTO-CREATE User row when a new auth.users entry is created
-- This trigger fires server-side so the User row is always
-- created, even if the frontend insert fails.
-- ============================================================

-- First, ensure the id column has a default (Prisma cuid() is client-side only)
ALTER TABLE public."User" ALTER COLUMN id SET DEFAULT gen_random_uuid()::text;

-- Function that inserts into public."User" from auth.users data
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
    -- Also handle email conflict (legacy row without authId)
    -- Backfill authId on existing email-matched row
    UPDATE public."User"
    SET "authId" = NEW.id::text
    WHERE email = NEW.email
      AND ("authId" IS NULL OR "authId" = '');
    
    RETURN NEW;
END;
$$;

-- Drop if exists, then create trigger
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW
    EXECUTE FUNCTION public.handle_new_auth_user();
