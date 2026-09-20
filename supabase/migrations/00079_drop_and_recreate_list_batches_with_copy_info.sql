-- 先删除旧函数（返回类型变了必须 DROP）
DROP FUNCTION IF EXISTS public.admin_list_test_code_batches();

-- 重建：追加复制统计列
CREATE OR REPLACE FUNCTION public.admin_list_test_code_batches()
RETURNS TABLE(
  batch_name text, total bigint, used bigint, disabled bigint, available bigint,
  created_at timestamptz, copy_count bigint, last_copied_email text, last_copied_at timestamptz
)
LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public'
AS $$
BEGIN
  IF NOT is_current_admin() THEN RAISE EXCEPTION 'forbidden'; END IF;
  RETURN QUERY
  SELECT
    tc.batch_name,
    COUNT(*)::bigint AS total,
    COUNT(*) FILTER (WHERE tc.status = 'used')::bigint AS used,
    COUNT(*) FILTER (WHERE tc.status = 'disabled')::bigint AS disabled,
    COUNT(*) FILTER (WHERE tc.status = 'unused'
                       AND (tc.expires_at IS NULL OR tc.expires_at > now()))::bigint AS available,
    MIN(tc.created_at) AS created_at,
    COALESCE((SELECT COUNT(*) FROM batch_copy_logs bcl WHERE bcl.batch_name = tc.batch_name), 0)::bigint AS copy_count,
    (SELECT bcl2.copied_by_email FROM batch_copy_logs bcl2 WHERE bcl2.batch_name = tc.batch_name ORDER BY bcl2.copied_at DESC LIMIT 1) AS last_copied_email,
    (SELECT bcl3.copied_at       FROM batch_copy_logs bcl3 WHERE bcl3.batch_name = tc.batch_name ORDER BY bcl3.copied_at DESC LIMIT 1) AS last_copied_at
  FROM test_codes tc
  GROUP BY tc.batch_name
  ORDER BY MIN(tc.created_at) DESC;
END;
$$;