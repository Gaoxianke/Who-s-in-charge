DO $$
DECLARE v_uid uuid;
BEGIN
  SELECT id INTO v_uid FROM auth.users WHERE email = 'W2794045093@hotmail.com' AND deleted_at IS NULL;
  IF v_uid IS NOT NULL THEN
    INSERT INTO admin_users (user_id, email, username, role)
    VALUES (v_uid, 'W2794045093@hotmail.com', 'super_admin', 'super_admin')
    ON CONFLICT (user_id) DO UPDATE SET role = 'super_admin', email = EXCLUDED.email;
  END IF;
END $$;