-- ── 激活码制开关 ──
ALTER TABLE public.admin_settings ADD COLUMN IF NOT EXISTS code_system_enabled boolean NOT NULL DEFAULT true;

-- 更新 getter，返回 code_system_enabled
CREATE OR REPLACE FUNCTION public.admin_get_auto_approval()
RETURNS jsonb LANGUAGE sql SECURITY DEFINER SET search_path = public AS $$
  SELECT jsonb_build_object(
    'enabled', auto_approval_enabled,
    'note', auto_approval_note,
    'updated_by', updated_by,
    'updated_at', updated_at,
    'code_system_enabled', code_system_enabled
  ) FROM admin_settings LIMIT 1;
$$;

-- super_admin 切换激活码制
CREATE OR REPLACE FUNCTION public.admin_set_code_system(p_enabled boolean)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_reviewer uuid := auth.uid();
BEGIN
  IF COALESCE(current_admin_role(),'') <> 'super_admin' THEN RAISE EXCEPTION 'forbidden'; END IF;
  IF EXISTS (SELECT 1 FROM admin_settings) THEN
    UPDATE admin_settings SET code_system_enabled = p_enabled, updated_by = v_reviewer, updated_at = now();
  ELSE
    INSERT INTO admin_settings (code_system_enabled, updated_by, updated_at) VALUES (p_enabled, v_reviewer, now());
  END IF;
  PERFORM admin_log_action('set_code_system', NULL, jsonb_build_object('enabled', p_enabled));
  RETURN admin_get_auto_approval();
END;
$$;
GRANT EXECUTE ON FUNCTION public.admin_set_code_system(boolean) TO authenticated;

-- 公开读取激活码制状态（供登录网关判断）
CREATE OR REPLACE FUNCTION public.get_code_system_enabled()
RETURNS boolean LANGUAGE sql SECURITY DEFINER SET search_path = public AS $$
  SELECT code_system_enabled FROM admin_settings LIMIT 1;
$$;
GRANT EXECUTE ON FUNCTION public.get_code_system_enabled() TO anon, authenticated;