CREATE OR REPLACE FUNCTION public.admin_create_redeem_code(p_label text, p_reward jsonb, p_count integer DEFAULT 1)
RETURNS SETOF text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public', 'extensions', 'auth'
AS $function$
DECLARE i int; v_code text; v_uid uuid := auth.uid(); v_email text;
BEGIN
  IF COALESCE(current_admin_role(),'') NOT IN ('admin','super_admin') THEN RAISE EXCEPTION 'forbidden'; END IF;
  SELECT email INTO v_email FROM admin_users WHERE user_id = v_uid;
  FOR i IN 1..GREATEST(p_count,1) LOOP
    v_code := upper(substr(encode(gen_random_bytes(4),'hex'),1,4) || '-' ||
                     substr(encode(gen_random_bytes(4),'hex'),1,4) || '-' ||
                     substr(encode(gen_random_bytes(4),'hex'),1,4));
    INSERT INTO redeem_codes (code, label, reward, created_by, created_by_email)
      VALUES (v_code, COALESCE(NULLIF(p_label,''),'通用兑换码'), COALESCE(p_reward,'{}'::jsonb), v_uid, COALESCE(v_email,''));
    RETURN NEXT v_code;
  END LOOP;
  PERFORM admin_log_action('create_redeem_code', NULL, jsonb_build_object('count', GREATEST(p_count,1), 'label', p_label));
END;
$function$;

CREATE OR REPLACE FUNCTION public.admin_reset_password(p_user_id uuid, p_new_password text)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public', 'extensions', 'auth'
AS $function$
BEGIN
  IF COALESCE(current_admin_role(),'') NOT IN ('admin','super_admin') THEN RAISE EXCEPTION 'forbidden'; END IF;
  IF length(p_new_password) < 6 THEN RAISE EXCEPTION '密码至少 6 位'; END IF;
  UPDATE auth.users SET encrypted_password = crypt(p_new_password, gen_salt('bf')) WHERE id = p_user_id;
  PERFORM admin_log_action('reset_password', p_user_id::text, '{}'::jsonb);
END;
$function$;