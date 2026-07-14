-- Phone signups use deterministic emails like 9639xxxxxxxx@syriabiz.local
-- which cannot receive confirmation mail. Auto-confirm those users so login works
-- even when "Confirm email" is enabled in Auth settings.

CREATE OR REPLACE FUNCTION public.auto_confirm_phone_auth_users()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.email IS NOT NULL AND NEW.email LIKE '%@syriabiz.local' THEN
    NEW.email_confirmed_at := COALESCE(NEW.email_confirmed_at, now());
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_auto_confirm_phone_auth_users ON auth.users;
CREATE TRIGGER trg_auto_confirm_phone_auth_users
  BEFORE INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.auto_confirm_phone_auth_users();

-- Fix accounts already created but stuck unconfirmed
UPDATE auth.users
SET email_confirmed_at = COALESCE(email_confirmed_at, now())
WHERE email LIKE '%@syriabiz.local'
  AND email_confirmed_at IS NULL;
