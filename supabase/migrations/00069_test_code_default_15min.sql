CREATE OR REPLACE FUNCTION public.admin_generate_test_codes(p_batch_name text DEFAULT '', p_count int DEFAULT 10, p_expires_at timestamptz DEFAULT NULL, p_note text DEFAULT NULL)
RETURNS SETOF text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public', 'extensions', 'auth'
AS $function$
DECLARE i int; v_code text; v_uid uuid := auth.uid(); v_email text; v_exp timestamptz;
BEGIN
  IF COALESCE(current_admin_role(),'') NOT IN ('admin','super_admin') THEN RAISE EXCEPTION 'forbidden'; END IF;
  IF p_count IS NULL OR p_count < 1 THEN RAISE EXCEPTION '数量至少为 1'; END IF;
  SELECT email INTO v_email FROM admin_users WHERE user_id = v_uid;
  -- 未指定过期时间时默认 15 分钟后失效
  v_exp := COALESCE(p_expires_at, now() + interval '15 minutes');
  FOR i IN 1..p_count LOOP
    v_code := 'TEST-' || upper(substr(encode(gen_random_bytes(3),'hex'),1,6));
    INSERT INTO test_codes (code, batch_name, status, expires_at, note, created_by, created_by_email)
      VALUES (v_code, COALESCE(NULLIF(p_batch_name,''),'默认批次'), 'unused', v_exp, p_note, v_uid, COALESCE(v_email,''));
    RETURN NEXT v_code;
  END LOOP;
  PERFORM admin_log_action('generate_test_codes', NULL, jsonb_build_object('count', p_count, 'batch', p_batch_name, 'expires_at', v_exp));
END;
$function$;