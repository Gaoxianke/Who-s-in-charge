-- 批次列表排序改为：最近复制时间倒序优先，其次码数量倒序，空批次按名称排序
DROP FUNCTION IF EXISTS public.admin_list_test_code_batches();
CREATE OR REPLACE FUNCTION public.admin_list_test_code_batches()
RETURNS TABLE(
  batch_name text, total bigint, used bigint, disabled bigint, available bigint,
  created_at timestamptz, copy_count bigint, last_copied_email text, last_copied_at timestamptz,
  max_codes bigint
)
LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public'
AS $$
BEGIN
  IF NOT is_current_admin() THEN RAISE EXCEPTION 'forbidden'; END IF;
  RETURN QUERY
  WITH code_stats AS (
    SELECT tc.batch_name,
           COUNT(*)::bigint AS total,
           COUNT(*) FILTER (WHERE tc.status = 'used')::bigint AS used_cnt,
           COUNT(*) FILTER (WHERE tc.status = 'disabled')::bigint AS disabled_cnt,
           COUNT(*) FILTER (WHERE tc.status = 'unused'
                              AND (tc.expires_at IS NULL OR tc.expires_at > now()))::bigint AS avail_cnt,
           MIN(tc.created_at) AS first_code_at
    FROM test_codes tc
    GROUP BY tc.batch_name
  ),
  copy_stats AS (
    SELECT bcl.batch_name,
           COUNT(*)::bigint AS cnt,
           MAX(bcl.copied_at) AS last_at,
           (array_agg(bcl.copied_by_email ORDER BY bcl.copied_at DESC))[1] AS last_email
    FROM batch_copy_logs bcl
    GROUP BY bcl.batch_name
  ),
  registry_batches AS (
    SELECT r.batch_name, r.created_at AS reg_created_at, r.max_codes::bigint AS max_codes
    FROM test_code_batch_registry r
  ),
  legacy_batches AS (
    SELECT tc2.batch_name, MIN(tc2.created_at) AS reg_created_at, 999999::bigint AS max_codes
    FROM test_codes tc2
    WHERE NOT EXISTS (SELECT 1 FROM test_code_batch_registry rr WHERE rr.batch_name = tc2.batch_name)
    GROUP BY tc2.batch_name
  ),
  all_batches AS (
    SELECT batch_name, reg_created_at, max_codes FROM registry_batches
    UNION ALL
    SELECT batch_name, reg_created_at, max_codes FROM legacy_batches
  )
  SELECT
    ab.batch_name,
    COALESCE(cs.total, 0)::bigint,
    COALESCE(cs.used_cnt, 0)::bigint,
    COALESCE(cs.disabled_cnt, 0)::bigint,
    COALESCE(cs.avail_cnt, 0)::bigint,
    COALESCE(cs.first_code_at, ab.reg_created_at),
    COALESCE(cps.cnt, 0)::bigint,
    cps.last_email,
    cps.last_at,
    ab.max_codes
  FROM all_batches ab
  LEFT JOIN code_stats cs ON cs.batch_name = ab.batch_name
  LEFT JOIN copy_stats cps ON cps.batch_name = ab.batch_name
  ORDER BY
    -- 有复制记录的优先，按最近使用时间倒序
    cps.last_at DESC NULLS LAST,
    -- 无复制记录时，按码数量倒序（越多越常用）
    COALESCE(cs.total, 0) DESC,
    -- 最后兜底按名称
    ab.batch_name ASC;
END;
$$;