/*
# Fix handle_new_user trigger function

## Changes
1. Recreate handle_new_user() with SET search_path = public to prevent schema resolution failures
2. This fixes the "Database error saving new user" 500 error during signup

## Notes
- The trigger function is SECURITY DEFINER and needs an explicit search_path
- Without SET search_path, the function can't find the profiles table during trigger execution
*/

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;

CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO profiles (id, display_name)
  VALUES (NEW.id, COALESCE(NEW.raw_user_meta_data->>'display_name', split_part(NEW.email, '@', 1)))
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END;
$$;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION handle_new_user();
