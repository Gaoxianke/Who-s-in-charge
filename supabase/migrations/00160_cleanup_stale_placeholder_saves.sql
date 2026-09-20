-- 异常占位档清理机制
-- 1. 管理员手动清理函数：删除超过指定天数仍为占位档（needs_character_creation=true）的存档
CREATE OR REPLACE FUNCTION public.admin_cleanup_stale_placeholder_saves(
  p_days integer DEFAULT 3
)
RETURNS integer
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_uid uuid := auth.uid();
  v_is_admin boolean := false;
  v_count integer := 0;
BEGIN
  IF v_uid IS NULL THEN RETURN -1; END IF;
  SELECT EXISTS(SELECT 1 FROM admin_users WHERE user_id = v_uid) INTO v_is_admin;
  IF NOT v_is_admin THEN RETURN -2; END IF;

  IF p_days < 1 THEN p_days := 1; END IF;

  WITH del AS (
    DELETE FROM player_saves
    WHERE needs_character_creation = true
      AND created_at < now() - (p_days || ' days')::interval
    RETURNING id
  )
  SELECT count(*) INTO v_count FROM del;

  INSERT INTO audit_logs (actor_email, action, details)
  VALUES ('admin', 'cleanup_stale_placeholder_saves', json_build_object('days', p_days, 'deleted', v_count)::text);

  RETURN v_count;
END;
$$;

-- 2. 定时任务：每天凌晨3点自动清理超过 3 天的异常占位档（防止未来误判）
SELECT cron.schedule(
  'daily_cleanup_stale_placeholder_saves',
  '0 3 * * *',
  $$SELECT public.admin_cleanup_stale_placeholder_saves(3);$$
);

-- 3. 彻底移除 temp_appeals 的 IP 相关列（同IP查重机制彻底删除）
ALTER TABLE public.temp_appeals DROP COLUMN IF EXISTS ip;
ALTER TABLE public.temp_appeals DROP COLUMN IF EXISTS same_ip_count;