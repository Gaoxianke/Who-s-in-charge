
DO $$
DECLARE
  i       int;
  v_email text;
  v_uid   uuid;
  v_pw    text;
BEGIN
  -- ── 20 个普通管理员 ──
  FOR i IN 1..20 LOOP
    v_email := 'admin_' || lpad(i::text, 2, '0') || '@zhuchen.who';
    v_pw    := 'WH@Admin' || lpad(i::text, 2, '0') || '!';

    SELECT id INTO v_uid FROM auth.users WHERE email = v_email AND deleted_at IS NULL;

    IF v_uid IS NULL THEN
      INSERT INTO auth.users (
        id, instance_id, aud, role, email, encrypted_password,
        email_confirmed_at, created_at, updated_at,
        raw_app_meta_data, raw_user_meta_data, is_super_admin, is_sso_user, is_anonymous
      ) VALUES (
        gen_random_uuid(),
        '00000000-0000-0000-0000-000000000000',
        'authenticated', 'authenticated',
        v_email,
        crypt(v_pw, gen_salt('bf')),
        now(), now(), now(),
        '{"provider":"email","providers":["email"]}'::jsonb,
        '{}'::jsonb,
        false, false, false
      ) RETURNING id INTO v_uid;
    ELSE
      UPDATE auth.users SET
        encrypted_password = crypt(v_pw, gen_salt('bf')),
        aud                = 'authenticated',
        role               = 'authenticated',
        email_confirmed_at = COALESCE(email_confirmed_at, now()),
        updated_at         = now()
      WHERE id = v_uid;
    END IF;

    INSERT INTO auth.identities (provider_id, user_id, identity_data, provider, created_at, updated_at)
    VALUES (
      v_uid::text, v_uid,
      jsonb_build_object('sub', v_uid::text, 'email', v_email,
                         'email_verified', true, 'phone_verified', false),
      'email', now(), now()
    ) ON CONFLICT (provider, provider_id) DO NOTHING;

    INSERT INTO admin_users (user_id, email, username, role)
    VALUES (v_uid, v_email, 'admin_' || lpad(i::text, 2, '0'), 'admin')
    ON CONFLICT (user_id) DO UPDATE
      SET email = EXCLUDED.email, username = EXCLUDED.username, role = 'admin';
  END LOOP;

  -- ── 超级管理员 ──
  v_email := 'W2794045093@hotmail.com';
  v_pw    := 'we2794045093/%';

  SELECT id INTO v_uid FROM auth.users WHERE email = v_email AND deleted_at IS NULL;

  IF v_uid IS NULL THEN
    INSERT INTO auth.users (
      id, instance_id, aud, role, email, encrypted_password,
      email_confirmed_at, created_at, updated_at,
      raw_app_meta_data, raw_user_meta_data, is_super_admin, is_sso_user, is_anonymous
    ) VALUES (
      gen_random_uuid(),
      '00000000-0000-0000-0000-000000000000',
      'authenticated', 'authenticated',
      v_email,
      crypt(v_pw, gen_salt('bf')),
      now(), now(), now(),
      '{"provider":"email","providers":["email"]}'::jsonb,
      '{}'::jsonb,
      true, false, false
    ) RETURNING id INTO v_uid;
  ELSE
    UPDATE auth.users SET
      encrypted_password = crypt(v_pw, gen_salt('bf')),
      aud                = 'authenticated',
      role               = 'authenticated',
      is_super_admin     = true,
      email_confirmed_at = COALESCE(email_confirmed_at, now()),
      updated_at         = now()
    WHERE id = v_uid;
  END IF;

  INSERT INTO auth.identities (provider_id, user_id, identity_data, provider, created_at, updated_at)
  VALUES (
    v_uid::text, v_uid,
    jsonb_build_object('sub', v_uid::text, 'email', v_email,
                       'email_verified', true, 'phone_verified', false),
    'email', now(), now()
  ) ON CONFLICT (provider, provider_id) DO NOTHING;

  INSERT INTO admin_users (user_id, email, username, role)
  VALUES (v_uid, v_email, 'super_admin', 'super_admin')
  ON CONFLICT (user_id) DO UPDATE
    SET role = 'super_admin', email = EXCLUDED.email, username = EXCLUDED.username;
END $$;
