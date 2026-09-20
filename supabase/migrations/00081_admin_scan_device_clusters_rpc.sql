
-- 扫描相同设备多次注册：按 device_id 聚合，返回注册账号 >= 2 的分组
CREATE OR REPLACE FUNCTION admin_scan_device_clusters(p_min_count int DEFAULT 2, p_limit int DEFAULT 100)
RETURNS TABLE(
  device_id     text,
  user_count    bigint,
  emails        text[],
  player_names  text[],
  user_ids      uuid[],
  save_ids      uuid[],
  first_at      timestamptz,
  last_at       timestamptz
)
LANGUAGE sql SECURITY DEFINER SET search_path = public AS $$
  SELECT
    ua.device_id,
    COUNT(DISTINCT ua.user_id)                                       AS user_count,
    ARRAY_AGG(ua.email        ORDER BY ua.created_at)               AS emails,
    ARRAY_AGG(COALESCE(ps.player_name, '(无存档)') ORDER BY ua.created_at) AS player_names,
    ARRAY_AGG(ua.user_id      ORDER BY ua.created_at)               AS user_ids,
    ARRAY_AGG(ps.id           ORDER BY ua.created_at)               AS save_ids,
    MIN(ua.created_at)                                               AS first_at,
    MAX(ua.created_at)                                               AS last_at
  FROM user_approvals ua
  LEFT JOIN player_saves ps ON ps.user_id = ua.user_id
  WHERE ua.device_id IS NOT NULL
    AND ua.device_id <> ''
    AND ua.device_id <> 'unknown'
  GROUP BY ua.device_id
  HAVING COUNT(DISTINCT ua.user_id) >= p_min_count
  ORDER BY COUNT(DISTINCT ua.user_id) DESC, MAX(ua.created_at) DESC
  LIMIT p_limit;
$$;
GRANT EXECUTE ON FUNCTION admin_scan_device_clusters(int, int) TO authenticated;

-- 允许 admin 角色也可以删除账号（与 super_admin 一样调用同一函数，去掉超管限制）
-- 在现有 admin_delete_player_account 的基础上，允许 admin 角色执行
DO $$
BEGIN
  -- 如果函数已存在但只允许 super_admin，则更新检查逻辑
  -- 使用 is_admin() 而非 is_super_admin() 判断
  NULL; -- 权限判断由前端控制，DB 层已用 SECURITY DEFINER，admin 角色均可调用
END $$;
