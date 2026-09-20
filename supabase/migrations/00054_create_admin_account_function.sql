-- 创建管理员账号的统一函数：自动补齐 role=authenticated + identity 记录 + admin_users
-- 确保以后新建的管理员账号结构完整，可正常登录且不进入游戏
CREATE OR REPLACE FUNCTION public.create_admin_account(p_email text, p_password text, p_role text DEFAULT 'admin')
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public', 'auth'
AS $function$
DECLARE
  v_uid uuid;
  v_hash text;
  v_email text := lower(trim(p_email));
BEGIN
  IF NOT is_current_admin() THEN RAISE EXCEPTION 'forbidden: only admins can create admin accounts'; END IF;
  IF p_role NOT IN ('admin', 'super_admin') THEN RAISE EXCEPTION 'invalid role: must be admin or super_admin'; END IF;
  IF char_length(p_password) < 6 THEN RAISE EXCEPTION 'password too short (min 6)'; END IF;
  IF EXISTS (SELECT 1 FROM auth.users WHERE email = v_email) THEN RAISE EXCEPTION 'email already exists'; END IF;

  v_hash := crypt(p_password, gen_salt('bf'));
  INSERT INTO auth.users (
    instance_id, id, aud, role, email, encrypted_password,
    email_confirmed_at, confirmed_at, created_at, updated_at,
    raw_app_meta_data, raw_user_meta_data, is_sso_user, is_anonymous
  ) VALUES (
    '00000000-0000-0000-0000-000000000000', gen_random_uuid(), 'authenticated', 'authenticated',
    v_email, v_hash, now(), now(), now(), now(),
    '{"provider":"email","providers":["email"]}'::jsonb, '{}'::jsonb, false, false
  ) RETURNING id INTO v_uid;

  INSERT INTO auth.identities (provider_id, user_id, identity_data, provider, created_at, updated_at)
  VALUES (
    v_uid, v_uid,
    jsonb_build_object('email', v_email, 'email_verified', true, 'phone_verified', false, 'sub', v_uid::text),
    'email', now(), now()
  );

  INSERT INTO admin_users (user_id, email, username, role)
  VALUES (v_uid, v_email, split_part(v_email, '@', 1), p_role);

  RETURN v_uid;
END;
$function$;
GRANT EXECUTE ON FUNCTION public.create_admin_account(text, text, text) TO authenticated;