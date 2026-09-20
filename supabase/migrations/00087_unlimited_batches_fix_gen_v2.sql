-- 先删除旧函数定义（参数默认值变更需 DROP）
DROP FUNCTION IF EXISTS public.admin_generate_test_codes(text, integer, timestamp with time zone, text);

CREATE OR REPLACE FUNCTION public.admin_generate_test_codes(p_batch_name text, p_count integer, p_expires_at timestamp with time zone DEFAULT NULL::timestamp with time zone, p_note text DEFAULT NULL::text)
RETURNS SETOF text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public', 'extensions', 'auth'
AS $function$
DECLARE
  i int; v_code text; v_uid uuid := auth.uid(); v_email text; v_exp timestamptz; v_batch text;
BEGIN
  IF COALESCE(current_admin_role(),'') NOT IN ('admin','super_admin') THEN RAISE EXCEPTION 'forbidden'; END IF;
  IF p_count IS NULL OR p_count < 1 THEN RAISE EXCEPTION '数量至少为 1'; END IF;
  IF p_count > 5000 THEN RAISE EXCEPTION '单次生成数量不能超过 5000'; END IF;
  SELECT email INTO v_email FROM admin_users WHERE user_id = v_uid;
  v_batch := COALESCE(NULLIF(btrim(p_batch_name), ''), '默认批次');
  -- 批次不存在则自动创建（无限批次，上限极大）
  IF NOT EXISTS (SELECT 1 FROM test_code_batch_registry WHERE batch_name = v_batch) THEN
    INSERT INTO test_code_batch_registry (batch_name, max_codes) VALUES (v_batch, 999999);
  END IF;
  v_exp := COALESCE(p_expires_at, now() + interval '12 hours');
  FOR i IN 1..p_count LOOP
    v_code := 'TEST-' || upper(substr(encode(gen_random_bytes(3),'hex'),1,6));
    INSERT INTO test_codes (code, batch_name, status, expires_at, note, created_by, created_by_email)
      VALUES (v_code, v_batch, 'unused', v_exp, p_note, v_uid, COALESCE(v_email,''));
    RETURN NEXT v_code;
  END LOOP;
  PERFORM admin_log_action('generate_test_codes', NULL, jsonb_build_object('count', p_count, 'batch', v_batch, 'expires_at', v_exp));
END;
$function$;