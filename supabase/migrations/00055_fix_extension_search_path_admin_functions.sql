-- 修复：扩展函数(crypt/gen_salt/gen_random_bytes/digest)位于 extensions schema，
-- 但管理员函数 SET search_path TO 'public'，导致找不到扩展函数。
-- 将相关函数的 search_path 改为 'public, extensions'（含 auth 以便查询 auth.users）

CREATE OR REPLACE FUNCTION public.admin_generate_test_codes(p_batch_name text, p_count integer, p_expires_at timestamp with time zone DEFAULT NULL::timestamp with time zone, p_note text DEFAULT NULL::text)
RETURNS SETOF text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public', 'extensions', 'auth'
AS $function$
DECLARE i int; v_code text; v_uid uuid := auth.uid(); v_email text;
BEGIN
  IF COALESCE(current_admin_role(),'') NOT IN ('admin','super_admin') THEN RAISE EXCEPTION 'forbidden'; END IF;
  IF p_count IS NULL OR p_count < 1 THEN RAISE EXCEPTION '数量至少为 1'; END IF;
  SELECT email INTO v_email FROM admin_users WHERE user_id = v_uid;
  FOR i IN 1..p_count LOOP
    v_code := 'TEST-' || upper(substr(encode(gen_random_bytes(3),'hex'),1,6));
    INSERT INTO test_codes (code, batch_name, status, expires_at, note, created_by, created_by_email)
      VALUES (v_code, COALESCE(NULLIF(p_batch_name,''),'默认批次'), 'unused', p_expires_at, p_note, v_uid, COALESCE(v_email,''));
    RETURN NEXT v_code;
  END LOOP;
  PERFORM admin_log_action('generate_test_codes', NULL, jsonb_build_object('count', p_count, 'batch', p_batch_name));
END;
$function$;

CREATE OR REPLACE FUNCTION public.create_admin_account(p_email text, p_password text, p_role text DEFAULT 'admin')
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public', 'extensions', 'auth'
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