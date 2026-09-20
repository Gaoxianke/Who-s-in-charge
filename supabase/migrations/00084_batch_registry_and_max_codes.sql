
-- 批次注册表（20个预设批次 + 上限1000配置）
CREATE TABLE IF NOT EXISTS public.test_code_batch_registry (
  id serial PRIMARY KEY,
  batch_name text UNIQUE NOT NULL,
  max_codes int NOT NULL DEFAULT 1000,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE public.test_code_batch_registry ENABLE ROW LEVEL SECURITY;
CREATE POLICY "registry_admin_read" ON public.test_code_batch_registry
  FOR SELECT TO authenticated USING (is_current_admin());

INSERT INTO public.test_code_batch_registry (batch_name, max_codes) VALUES
  ('管理员01', 1000),('管理员02', 1000),('管理员03', 1000),('管理员04', 1000),('管理员05', 1000),
  ('管理员06', 1000),('管理员07', 1000),('管理员08', 1000),('管理员09', 1000),('管理员10', 1000),
  ('管理员11', 1000),('管理员12', 1000),('管理员13', 1000),('管理员14', 1000),('管理员15', 1000),
  ('管理员16', 1000),('管理员17', 1000),('管理员18', 1000),('管理员19', 1000),('管理员20', 1000)
ON CONFLICT (batch_name) DO NOTHING;

-- 重建 admin_list_test_code_batches：包含空批次 + max_codes 字段
DROP FUNCTION IF EXISTS public.admin_list_test_code_batches();
CREATE OR REPLACE FUNCTION public.admin_list_test_code_batches()
RETURNS TABLE(
  batch_name text, total bigint, used bigint, disabled bigint, available bigint,
  created_at timestamptz, copy_count bigint, last_copied_email text, last_copied_at timestamptz,
  max_codes int
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
    SELECT r.batch_name, r.created_at AS reg_created_at, r.max_codes
    FROM test_code_batch_registry r
  ),
  legacy_batches AS (
    SELECT tc2.batch_name, MIN(tc2.created_at) AS reg_created_at, 1000::int AS max_codes
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
  ORDER BY ab.batch_name;
END;
$$;
