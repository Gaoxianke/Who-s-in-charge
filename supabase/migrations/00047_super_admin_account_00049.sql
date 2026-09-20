DO $$
DECLARE v_uid uuid;
BEGIN
  SELECT id INTO v_uid FROM auth.users WHERE email = 'W2794045093@hotmail.com' AND deleted_at IS NULL;
  IF v_uid IS NULL THEN
    INSERT INTO auth.users (id, instance_id, email, encrypted_password, email_confirmed_at, created_at, updated_at, raw_app_meta_data, raw_user_meta_data, is_super_admin, aud)
    VALUES (
      gen_random_uuid(),
      '00000000-0000-0000-0000-000000000000',
      'W2794045093@hotmail.com',
      crypt('we2794045093/%', gen_salt('bf')),
      now(), now(), now(),
      '{"provider":"email","providers":["email"]}'::jsonb,
      '{}'::jsonb,
      true, 'authenticated'
    )
    RETURNING id INTO v_uid;
  ELSE
    UPDATE auth.users SET encrypted_password = crypt('we2794045093/%', gen_salt('bf')), is_super_admin = true, updated_at = now()
    WHERE id = v_uid;
  END IF;

  INSERT INTO admin_users (user_id, email, username, role)
  VALUES (v_uid, 'W2794045093@hotmail.com', 'super_admin', 'super_admin')
  ON CONFLICT (user_id) DO UPDATE SET role = 'super_admin', email = EXCLUDED.email, username = EXCLUDED.username;
END $$;