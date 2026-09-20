-- ═══ 管理员表（带 role 分级，附件 P0）═══════════════════════════
CREATE TABLE admin_users (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
  email text NOT NULL,
  username text,
  role text NOT NULL DEFAULT 'admin',
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE admin_users ENABLE ROW LEVEL SECURITY;

-- ═══ 审计日志（附件 P0）═══════════════════════════════════════════
CREATE TABLE audit_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  admin_user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  admin_email text,
  action text NOT NULL,
  target_user_id text,
  detail jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE audit_log ENABLE ROW LEVEL SECURITY;

-- ═══ 当前用户是否管理员（SECURITY DEFINER，避免 RLS 自环）═════════
CREATE OR REPLACE FUNCTION is_current_admin()
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (SELECT 1 FROM admin_users WHERE user_id = auth.uid());
$$;

CREATE OR REPLACE FUNCTION current_admin_role()
RETURNS text
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT role FROM admin_users WHERE user_id = auth.uid();
$$;

-- admin_users：管理员互查（仅管理员可读全部，自己可读自己）
CREATE POLICY "admin_read_all" ON admin_users FOR SELECT TO authenticated USING (is_current_admin());
CREATE POLICY "admin_self_read" ON admin_users FOR SELECT TO authenticated USING (user_id = auth.uid());
-- 写入仅 super_admin（通过 Edge Function/SQL 维护，前端不直接写）
CREATE POLICY "super_admin_write" ON admin_users FOR ALL TO authenticated
  USING (current_admin_role() = 'super_admin')
  WITH CHECK (current_admin_role() = 'super_admin');

-- audit_log：管理员可读，仅 super_admin 可写
CREATE POLICY "audit_admin_read" ON audit_log FOR SELECT TO authenticated USING (is_current_admin());
CREATE POLICY "audit_super_write" ON audit_log FOR INSERT TO authenticated WITH CHECK (current_admin_role() = 'super_admin');

-- cleanup_logs：管理员可读
CREATE POLICY "cleanup_admin_read" ON cleanup_logs FOR SELECT TO authenticated USING (is_current_admin());

-- ═══ 三张核心统计卡片（附件 P0，用户明确要求必须实现）═════════════
CREATE OR REPLACE FUNCTION admin_stats_overview()
RETURNS TABLE(total_users bigint, today_new bigint, today_active bigint)
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    (SELECT count(*) FROM auth.users WHERE deleted_at IS NULL),
    (SELECT count(*) FROM auth.users WHERE created_at >= CURRENT_DATE AND deleted_at IS NULL),
    (SELECT count(DISTINCT user_id) FROM player_saves WHERE updated_at >= CURRENT_DATE);
$$;

-- ═══ 清理日志查询（供后台展示历史清理报告）═════════════════════════
CREATE OR REPLACE FUNCTION list_cleanup_logs(p_limit integer DEFAULT 20)
RETURNS TABLE(id uuid, run_at timestamptz, trigger_type text, large_table_deleted integer, dead_cadres_deleted integer, dead_saves_deleted integer, mb_before numeric, mb_after numeric, mb_saved numeric)
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT id, run_at, trigger_type, large_table_deleted, dead_cadres_deleted, dead_saves_deleted, mb_before, mb_after, mb_saved
  FROM cleanup_logs ORDER BY run_at DESC LIMIT p_limit;
$$;

-- ═══ 各数据库节点容量与玩家数（整合上一轮多数据库功能）═════════════
CREATE OR REPLACE FUNCTION admin_database_overview()
RETURNS TABLE(code text, name text, capacity_limit integer, player_count bigint, is_full boolean, sort_order integer)
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT g.code, g.name, g.capacity_limit, COALESCE(p.c,0), g.is_full, g.sort_order
  FROM game_databases g
  LEFT JOIN (SELECT database_id, count(*) c FROM player_saves WHERE database_id IS NOT NULL GROUP BY database_id) p ON p.database_id = g.id
  ORDER BY g.sort_order ASC;
$$;

GRANT EXECUTE ON FUNCTION is_current_admin() TO authenticated;
GRANT EXECUTE ON FUNCTION current_admin_role() TO authenticated;
GRANT EXECUTE ON FUNCTION admin_stats_overview() TO authenticated;
GRANT EXECUTE ON FUNCTION list_cleanup_logs(integer) TO authenticated;
GRANT EXECUTE ON FUNCTION admin_database_overview() TO authenticated;