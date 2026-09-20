
-- 修复 device_id = 'web' 导致所有 Web 用户被误判为同一设备的 Bug
-- 新逻辑：web 平台已改为生成唯一 UUID（web-xxxx），此处同时排除旧的固定值 'web'
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
    AND ua.device_id <> 'web'
  GROUP BY ua.device_id
  HAVING COUNT(DISTINCT ua.user_id) >= p_min_count
  ORDER BY COUNT(DISTINCT ua.user_id) DESC, MAX(ua.created_at) DESC
  LIMIT p_limit;
$$;
GRANT EXECUTE ON FUNCTION admin_scan_device_clusters(int, int) TO authenticated;
