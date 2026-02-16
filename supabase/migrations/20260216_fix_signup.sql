-- ============================================================
-- FIX: User signup "database error"
-- Root cause: handle_new_auth_user() trigger + client inserts
-- don't provide updatedAt, which is NOT NULL with no DEFAULT.
-- Also: ON CONFLICT only handles authId, not email conflicts.
-- Safe to re-run (idempotent). Run in Supabase SQL Editor.
-- Date: 2026-02-16
-- ============================================================

BEGIN;

-- 1. Add DEFAULT now() to updatedAt on User table
--    (Prisma @updatedAt is client-only — no DB default was ever set)
ALTER TABLE public."User"
  ALTER COLUMN "updatedAt" SET DEFAULT now();

-- 2. Also ensure createdAt has a default (belt & suspenders)
ALTER TABLE public."User"
  ALTER COLUMN "createdAt" SET DEFAULT now();

-- 3. Fix the trigger: include createdAt + updatedAt,
--    and handle BOTH authId AND email conflicts gracefully
CREATE OR REPLACE FUNCTION public.handle_new_auth_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    -- First: try to backfill authId on an existing email-matched row
    UPDATE public."User"
    SET "authId" = NEW.id::text,
        "updatedAt" = now(),
        name = COALESCE(NULLIF(name, ''),
                        NEW.raw_user_meta_data->>'name',
                        NEW.raw_user_meta_data->>'full_name',
                        split_part(COALESCE(NEW.email, ''), '@', 1),
                        'User')
    WHERE email = COALESCE(NEW.email, '')
      AND ("authId" IS NULL OR "authId" = '' OR "authId" = NEW.id::text);

    -- If no existing row was updated, insert a new one
    IF NOT FOUND THEN
        INSERT INTO public."User" (id, "authId", email, name, role, "createdAt", "updatedAt")
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
            'USER',
            now(),
            now()
        )
        ON CONFLICT ("authId") DO UPDATE SET
            "updatedAt" = now(),
            name = COALESCE(NULLIF(EXCLUDED.name, ''), public."User".name)
        ;
    END IF;

    RETURN NEW;
EXCEPTION
    WHEN unique_violation THEN
        -- If we still get a conflict (rare race), just ignore — the row exists
        RETURN NEW;
    WHEN OTHERS THEN
        -- Never let trigger errors block auth signup
        RAISE WARNING 'handle_new_auth_user failed: %', SQLERRM;
        RETURN NEW;
END;
$$;

-- 4. Recreate trigger (idempotent)
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW
    EXECUTE FUNCTION public.handle_new_auth_user();

-- 5. Backfill any existing rows where updatedAt is NULL
UPDATE public."User"
SET "updatedAt" = "createdAt"
WHERE "updatedAt" IS NULL;

COMMIT;
