-- ============================================================
-- Admin Bootstrap — One-time script (idempotent, safe to re-run)
-- Date: 2026-03-11
-- Purpose:
--   Mark manually created Supabase Dashboard users as
--   account_type=admin, account_status=active, must_change_password=true.
--
-- HOW TO USE:
--   1. Go to Supabase Dashboard → Authentication → Users
--   2. Click "Add user" → supply email + temporary password (min 8 chars)
--   3. Copy the UUID shown for that user in the users list
--   4. Paste the UUID after the := below (replace the placeholder)
--   5. For a second admin, fill in v_admin_2_id; otherwise leave it as NULL
--   6. Run this script in Supabase SQL Editor
--   7. The admin MUST change their password on first login.
--      All admin API calls return 403 until the password is changed
--      (the app will redirect them to /profile automatically).
-- ============================================================

DO $$
DECLARE
  -- Admin 1 — paste UUID from Supabase Dashboard here
  v_admin_1_id UUID := '980035ac-6e2b-46cd-adb6-1eb3dc170233';

  -- Admin 2 — paste UUID here, or leave NULL to skip
  v_admin_2_id UUID := NULL;

  v_id UUID;
BEGIN
  FOREACH v_id IN ARRAY ARRAY[v_admin_1_id, v_admin_2_id]
  LOOP
    CONTINUE WHEN v_id IS NULL;

    INSERT INTO public.user_accounts (
      id,
      account_type,
      account_status,
      must_change_password
    )
    VALUES (
      v_id,
      'admin',
      'active',
      TRUE
    )
    ON CONFLICT (id) DO UPDATE SET
      account_type         = 'admin',
      account_status       = 'active',
      must_change_password = TRUE,
      updated_at           = now();

    RAISE NOTICE 'Admin user % bootstrapped successfully.', v_id;
  END LOOP;
END;
$$;
