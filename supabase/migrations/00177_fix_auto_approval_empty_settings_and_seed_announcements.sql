-- ── 修复自动审批：admin_settings 表为空导致 UPDATE 无效 ──
-- 1) 若无配置行则插入默认行（仅当表为空时）
INSERT INTO public.admin_settings (auto_approval_enabled, auto_approval_note)
SELECT false, NULL
WHERE NOT EXISTS (SELECT 1 FROM public.admin_settings);

-- 2) 重写 admin_set_auto_approval：改为 upsert（无行时插入，有行时更新）
CREATE OR REPLACE FUNCTION public.admin_set_auto_approval(p_enabled boolean, p_note text DEFAULT NULL)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE v_reviewer uuid := auth.uid();
BEGIN
  IF COALESCE(current_admin_role(),'') <> 'super_admin' THEN RAISE EXCEPTION 'forbidden'; END IF;

  IF EXISTS (SELECT 1 FROM admin_settings) THEN
    UPDATE admin_settings
       SET auto_approval_enabled = p_enabled,
           auto_approval_note    = NULLIF(TRIM(COALESCE(p_note,'')), ''),
           updated_by            = v_reviewer,
           updated_at            = now();
  ELSE
    INSERT INTO admin_settings (auto_approval_enabled, auto_approval_note, updated_by, updated_at)
    VALUES (p_enabled, NULLIF(TRIM(COALESCE(p_note,'')), ''), v_reviewer, now());
  END IF;

  PERFORM admin_log_action('set_auto_approval', NULL,
    jsonb_build_object('enabled', p_enabled, 'note', p_note));
  RETURN admin_get_auto_approval();
END;
$$;
GRANT EXECUTE ON FUNCTION public.admin_set_auto_approval(boolean, text) TO authenticated;

-- ── 预填两页公告（已发布），让功能立即可见 ──
INSERT INTO public.announcements (page_key, title, content, active, updated_at, updated_by_email)
VALUES
  ('login',      '系统公告', '欢迎进入档案系统，当前为内部测试阶段，请使用管理员分配的测试码完成身份核验后进入。', true, now(), 'system'),
  ('enter_code', '测试码说明', '请输入管理员分配的测试码，每码仅可使用一次。如遇问题请联系管理员处理。', true, now(), 'system')
ON CONFLICT (page_key) DO UPDATE
  SET title = EXCLUDED.title, content = EXCLUDED.content, active = true, updated_at = now(), updated_by_email = 'system';