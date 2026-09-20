-- 生成测试码：多开头随机前缀
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
DECLARE i int; v_code text; v_uid uuid := auth.uid(); v_email text; v_exp timestamptz; v_prefix text;
  v_prefixes text[] := ARRAY['TEST','BETA','VIP','GAME','CODE','KEY'];
BEGIN
  IF COALESCE(current_admin_role(),'') NOT IN ('admin','super_admin') THEN RAISE EXCEPTION 'forbidden'; END IF;
  IF p_count IS NULL OR p_count < 1 THEN RAISE EXCEPTION '数量至少为 1'; END IF;
  SELECT email INTO v_email FROM admin_users WHERE user_id = v_uid;
  v_exp := COALESCE(p_expires_at, now() + interval '15 minutes');
  FOR i IN 1..p_count LOOP
    v_prefix := v_prefixes[1 + floor(random() * array_length(v_prefixes,1))::int];
    v_code := v_prefix || '-' || upper(substr(encode(gen_random_bytes(3),'hex'),1,6));
    INSERT INTO test_codes (code, batch_name, status, expires_at, note, created_by, created_by_email, group_name)
      VALUES (v_code, COALESCE(NULLIF(p_batch_name,''),'默认批次'), 'unused', v_exp, p_note, v_uid, COALESCE(v_email,''), COALESCE(NULLIF(p_group_name,''),''));
    RETURN NEXT v_code;
  END LOOP;
  PERFORM admin_log_action('generate_test_codes', NULL, jsonb_build_object('count', p_count, 'batch', p_batch_name, 'group', p_group_name, 'expires_at', v_exp));
END;
$function$;

-- 列出测试码：新增按编组筛选
DROP FUNCTION IF EXISTS public.admin_list_test_codes(text,text,integer,integer);
CREATE OR REPLACE FUNCTION public.admin_list_test_codes(
  p_batch_name text DEFAULT NULL::text,
  p_status text DEFAULT NULL::text,
  p_limit integer DEFAULT 100,
  p_offset integer DEFAULT 0,
  p_group_name text DEFAULT NULL::text
)
RETURNS TABLE(id uuid, code text, batch_name text, status text, used_by_user_id uuid, used_by_email text, used_at timestamp with time zone, expires_at timestamp with time zone, note text, created_at timestamp with time zone, group_name text)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public', 'extensions', 'auth'
AS $function$
BEGIN
  IF NOT is_current_admin() THEN RAISE EXCEPTION 'forbidden'; END IF;
  RETURN QUERY
  SELECT tc.id, tc.code, tc.batch_name, tc.status, tc.used_by_user_id, tc.used_by_email, tc.used_at, tc.expires_at, tc.note, tc.created_at, tc.group_name
  FROM test_codes tc
  WHERE (p_batch_name IS NULL OR p_batch_name = 'all' OR tc.batch_name = p_batch_name)
    AND (p_status IS NULL OR p_status = 'all' OR tc.status = p_status)
    AND (p_group_name IS NULL OR p_group_name = 'all' OR tc.group_name = p_group_name)
  ORDER BY tc.created_at DESC
  LIMIT p_limit OFFSET p_offset;
END;
$function$;

-- 清除所有未使用的测试码
CREATE OR REPLACE FUNCTION public.admin_clear_unused_test_codes()
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public', 'extensions', 'auth'
AS $function$
DECLARE v_count int;
BEGIN
  IF NOT is_current_admin() THEN RAISE EXCEPTION 'forbidden'; END IF;
  DELETE FROM test_codes WHERE status = 'unused';
  GET DIAGNOSTICS v_count = ROW_COUNT;
  PERFORM admin_log_action('clear_unused_test_codes', NULL, jsonb_build_object('deleted', v_count));
  RETURN v_count;
END;
$function$;