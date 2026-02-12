-- Trigger to automatically create a user record in the 'User' table
-- when a new user signs up via Supabase Auth.

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public."User" (id, authId, email, name, role, "createdAt", "updatedAt")
  VALUES (
    -- generate a cuid-like string or use uuid_generate_v4 if extensions are enabled
    -- simpler to just use the auth ID or a random string for now if cuid isn't available in PG
    'u_' || encode(gen_random_bytes(12), 'hex'), 
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'name', NEW.raw_user_meta_data->>'full_name', SPLIT_PART(NEW.email, '@', 1)),
    'USER',
    NOW(),
    NOW()
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger execution
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();
