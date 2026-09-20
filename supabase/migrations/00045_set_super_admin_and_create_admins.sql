DO $$
DECLARE
  i int;
  v_email text;
  v_uid uuid;
BEGIN
  FOR i IN 1..20 LOOP
    v_email := 'admin_' || lpad(i::text, 2, '0') || '@zhuchen.who';
    SELECT id INTO v_uid FROM auth.users WHERE email = v_email AND deleted_at IS NULL;
    IF v_uid IS NULL THEN
      INSERT INTO auth.users (id, instance_id, email, encrypted_password, email_confirmed_at, created_at, updated_at, raw_app_meta_data, raw_user_meta_data, is_super_admin, aud)
      VALUES (
        gen_random_uuid(),
        '00000000-0000-0000-0000-000000000000',
        v_email,
        crypt('WH@Admin' || lpad(i::text, 2, '0') || '!', gen_salt('bf')),
        now(), now(), now(),
        '{"provider":"email","providers":["email"]}'::jsonb,
        '{}'::jsonb,
        false, 'authenticated'
      )
      RETURNING id INTO v_uid;
    ELSE
      UPDATE auth.users SET encrypted_password = crypt('WH@Admin' || lpad(i::text, 2, '0') || '!', gen_salt('bf')), updated_at = now()
      WHERE id = v_uid;
    END IF;

    INSERT INTO admin_users (user_id, email, username, role)
    VALUES (v_uid, v_email, 'admin_' || lpad(i::text, 2, '0'), 'admin')
    ON CONFLICT (user_id) DO UPDATE SET email = EXCLUDED.email, username = EXCLUDED.username, role = 'admin';
  END LOOP;
END $$;