-- 生成测试码：新增 p_group_name 参数
CREATE OR REPLACE FUNCTION public.admin_generate_test_codes(
  p_batch_name text DEFAULT '',
  p_count int DEFAULT 10,
  p_expires_at timestamptz DEFAULT NULL,
  p_note text DEFAULT NULL,
  p_group_name text DEFAULT ''
)
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
  v_exp := COALESCE(p_expires_at, now() + interval '15 minutes');
  FOR i IN 1..p_count LOOP
    v_code := 'TEST-' || upper(substr(encode(gen_random_bytes(3),'hex'),1,6));
    INSERT INTO test_codes (code, batch_name, status, expires_at, note, created_by, created_by_email, group_name)
      VALUES (v_code, COALESCE(NULLIF(p_batch_name,''),'默认批次'), 'unused', v_exp, p_note, v_uid, COALESCE(v_email,''), COALESCE(NULLIF(p_group_name,''),''));
    RETURN NEXT v_code;
  END LOOP;
  PERFORM admin_log_action('generate_test_codes', NULL, jsonb_build_object('count', p_count, 'batch', p_batch_name, 'group', p_group_name, 'expires_at', v_exp));
END;
$function$;

-- 列出测试码编组（去重，含统计）
CREATE OR REPLACE FUNCTION public.admin_list_test_code_groups()
RETURNS TABLE(group_name text, total int, used int, available int, created_at timestamp with time zone)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public', 'extensions', 'auth'
AS $function$
BEGIN
  IF NOT is_current_admin() THEN RAISE EXCEPTION 'forbidden'; END IF;
  RETURN QUERY
  SELECT
    COALESCE(NULLIF(tc.group_name,''),'未分组') AS group_name,
    count(*)::int AS total,
    count(*) FILTER (WHERE tc.status = 'used')::int AS used,
    count(*) FILTER (WHERE tc.status = 'unused')::int AS available,
    max(tc.created_at) AS created_at
  FROM test_codes tc
  GROUP BY COALESCE(NULLIF(tc.group_name,''),'未分组')
  ORDER BY max(tc.created_at) DESC;
END;
$function$;