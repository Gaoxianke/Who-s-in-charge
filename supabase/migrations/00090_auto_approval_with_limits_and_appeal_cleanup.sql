-- ═══════════════════════════════════════════════════════════
-- 自动审批模式 + 限制规则 + 系统拒绝写入申诉 + 7天自动清理
-- ═══════════════════════════════════════════════════════════

-- ── 1. 系统配置表（单行配置）──────────────────────────────
CREATE TABLE public.admin_settings (
  id                     uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  auto_approval_enabled  boolean NOT NULL DEFAULT false,
  auto_approval_note     text,
  updated_by             uuid REFERENCES auth.users(id),
  updated_at             timestamptz DEFAULT now()
);
ALTER TABLE public.admin_settings ENABLE ROW LEVEL SECURITY;
CREATE POLICY "admin_settings_read" ON public.admin_settings
  FOR SELECT TO authenticated USING (is_current_admin());
CREATE POLICY "admin_settings_super_write" ON public.admin_settings
  FOR UPDATE TO authenticated USING (current_admin_role() = 'super_admin')
  WITH CHECK (current_admin_role() = 'super_admin');
-- 初始化默认配置
INSERT INTO public.admin_settings (auto_approval_enabled, auto_approval_note)
VALUES (false, NULL);

-- ── 2. account_appeals 增加 system_rejected 来源字段 ──────────
ALTER TABLE public.account_appeals
  ADD COLUMN IF NOT EXISTS source_user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS auto_reject_reason text;

-- ── 3. 读取/切换自动审批 ─────────────────────────────────
CREATE OR REPLACE FUNCTION public.admin_get_auto_approval()
RETURNS jsonb LANGUAGE sql SECURITY DEFINER SET search_path = public AS $$
  SELECT jsonb_build_object(
    'enabled', auto_approval_enabled,
    'note', auto_approval_note,
    'updated_by', updated_by,
    'updated_at', updated_at
  ) FROM admin_settings LIMIT 1;
$$;

CREATE OR REPLACE FUNCTION public.admin_set_auto_approval(p_enabled boolean, p_note text DEFAULT NULL)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_reviewer uuid := auth.uid();
BEGIN
  IF COALESCE(current_admin_role(),'') <> 'super_admin' THEN RAISE EXCEPTION 'forbidden'; END IF;
  UPDATE admin_settings
     SET auto_approval_enabled = p_enabled,
         auto_approval_note = NULLIF(TRIM(COALESCE(p_note,'')), ''),
         updated_by = v_reviewer,
         updated_at = now();
  PERFORM admin_log_action('set_auto_approval', NULL,
    jsonb_build_object('enabled', p_enabled, 'note', p_note));
  RETURN admin_get_auto_approval();
END;
$$;

-- ── 4. 内部辅助：系统拒绝并写入申诉 ───────────────────────
CREATE OR REPLACE FUNCTION public._system_reject_and_appeal(
  p_uid uuid, p_email text, p_code_id uuid, p_device_id text, p_reason text
) RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  UPDATE user_approvals
     SET status = 'rejected',
         reject_reason = p_reason,
         reviewed_by = NULL,
         reviewed_at = now()
   WHERE user_id = p_uid;
  UPDATE player_saves SET approval_status = 'rejected', updated_at = now()
   WHERE user_id = p_uid;
  INSERT INTO account_appeals (target_user_id, target_email, appeal_type, appeal_reason,
                               source_user_id, auto_reject_reason, status, expires_at)
  VALUES (p_uid, p_email, 'system_rejected', p_reason, p_uid, p_reason, 'pending', now() + interval '7 days');
END;
$$;

-- ── 5. 改造 register_with_test_code：自动审批 + 限制规则 ─────
CREATE OR REPLACE FUNCTION public.register_with_test_code(p_test_code text, p_device_id text DEFAULT NULL)
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public', 'extensions', 'auth'
AS $function$
DECLARE
  v_uid   uuid := auth.uid();
  v_code  test_codes%ROWTYPE;
  v_app   user_approvals%ROWTYPE;
  v_email text;
  v_auto  boolean := false;
  v_dev   text := NULLIF(p_device_id, '');
BEGIN
  IF v_uid IS NULL THEN RETURN 'NOT_AUTHENTICATED'; END IF;

  -- 读取自动审批开关
  SELECT auto_approval_enabled INTO v_auto FROM admin_settings LIMIT 1;

  -- 设备指纹检测（绕过名单中的用户不受限制）
  IF v_dev IS NOT NULL AND v_dev NOT IN ('unknown', 'web') THEN
    IF NOT EXISTS (SELECT 1 FROM device_check_bypass WHERE user_id = v_uid) THEN
      IF EXISTS (
        SELECT 1 FROM user_approvals ua
        WHERE ua.device_id = v_dev
          AND ua.status = 'approved'
          AND ua.user_id <> v_uid
      ) THEN RETURN 'DEVICE_ALREADY_REGISTERED'; END IF;
    END IF;
  END IF;

  SELECT * INTO v_code FROM test_codes WHERE code = upper(trim(p_test_code));
  IF NOT FOUND THEN RETURN 'CODE_NOT_FOUND'; END IF;
  IF v_code.status = 'used'     THEN RETURN 'CODE_ALREADY_USED'; END IF;
  IF v_code.status = 'disabled' THEN RETURN 'CODE_DISABLED'; END IF;
  IF v_code.expires_at IS NOT NULL AND v_code.expires_at < now() THEN
    UPDATE test_codes SET status = 'expired' WHERE id = v_code.id;
    RETURN 'CODE_EXPIRED';
  END IF;

  SELECT email::text INTO v_email FROM auth.users WHERE id = v_uid;
  SELECT * INTO v_app FROM user_approvals WHERE user_id = v_uid;

  IF FOUND THEN
    IF v_app.status = 'approved' THEN RETURN 'ALREADY_APPROVED'; END IF;
    IF v_app.status = 'pending'  THEN RETURN 'ALREADY_PENDING'; END IF;
    -- 已被驳回：释放旧码，绑定新码，重新进入待审核
    IF v_app.test_code_id IS NOT NULL THEN
      UPDATE test_codes SET status='unused', used_by_user_id=NULL, used_by_email=NULL, used_at=NULL
        WHERE id = v_app.test_code_id AND status = 'used';
    END IF;
    UPDATE user_approvals
      SET status='pending', test_code_id=v_code.id, reject_reason=NULL,
          reviewed_by=NULL, reviewed_at=NULL, created_at=now(),
          device_id=COALESCE(v_dev, device_id)
      WHERE user_id = v_uid;
    UPDATE test_codes SET status='used', used_by_user_id=v_uid, used_by_email=v_email, used_at=now()
      WHERE id = v_code.id;

    -- 自动审批模式：应用限制规则
    IF v_auto THEN
      IF EXISTS (SELECT 1 FROM user_approvals ua
                  WHERE ua.email = v_email AND ua.user_id <> v_uid) THEN
        PERFORM _system_reject_and_appeal(v_uid, v_email, v_code.id, v_dev, '重复邮箱申请');
        RETURN 'AUTO_REJECTED_DUPLICATE_EMAIL';
      END IF;
      IF v_dev IS NOT NULL AND v_dev NOT IN ('unknown','web')
         AND NOT EXISTS (SELECT 1 FROM device_check_bypass WHERE user_id = v_uid)
         AND EXISTS (SELECT 1 FROM user_approvals ua
                      WHERE ua.device_id = v_dev AND ua.user_id <> v_uid) THEN
        PERFORM _system_reject_and_appeal(v_uid, v_email, v_code.id, v_dev, '同设备多账号申请');
        RETURN 'AUTO_REJECTED_DUPLICATE_DEVICE';
      END IF;
      -- 通过限制：自动通过
      UPDATE user_approvals SET status='approved', reject_reason='自动审批通过', reviewed_at=now()
        WHERE user_id = v_uid;
      UPDATE player_saves SET approval_status='approved', updated_at=now() WHERE user_id = v_uid;
      RETURN 'OK';
    END IF;
    RETURN 'OK';
  END IF;

  -- 全新提交
  UPDATE test_codes SET status='used', used_by_user_id=v_uid, used_by_email=v_email, used_at=now()
    WHERE id = v_code.id;
  INSERT INTO user_approvals (user_id, email, status, test_code_id, device_id)
    VALUES (v_uid, v_email, 'pending', v_code.id, v_dev);

  -- 自动审批模式：应用限制规则
  IF v_auto THEN
    IF EXISTS (SELECT 1 FROM user_approvals ua
                WHERE ua.email = v_email AND ua.user_id <> v_uid) THEN
      PERFORM _system_reject_and_appeal(v_uid, v_email, v_code.id, v_dev, '重复邮箱申请');
      RETURN 'AUTO_REJECTED_DUPLICATE_EMAIL';
    END IF;
    IF v_dev IS NOT NULL AND v_dev NOT IN ('unknown','web')
       AND NOT EXISTS (SELECT 1 FROM device_check_bypass WHERE user_id = v_uid)
       AND EXISTS (SELECT 1 FROM user_approvals ua
                    WHERE ua.device_id = v_dev AND ua.user_id <> v_uid) THEN
      PERFORM _system_reject_and_appeal(v_uid, v_email, v_code.id, v_dev, '同设备多账号申请');
      RETURN 'AUTO_REJECTED_DUPLICATE_DEVICE';
    END IF;
    UPDATE user_approvals SET status='approved', reject_reason='自动审批通过', reviewed_at=now()
      WHERE user_id = v_uid;
    UPDATE player_saves SET approval_status='approved', updated_at=now() WHERE user_id = v_uid;
  END IF;
  RETURN 'OK';
END;
$function$;

-- ── 6. 申诉7天自动清理 ───────────────────────────────────
CREATE OR REPLACE FUNCTION public.purge_expired_appeals()
RETURNS int LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_cnt int := 0;
BEGIN
  DELETE FROM account_appeals
   WHERE status = 'pending' AND expires_at IS NOT NULL AND expires_at < now();
  GET DIAGNOSTICS v_cnt = ROW_COUNT;
  RETURN v_cnt;
END;
$$;

-- ── 7. pg_cron 定时任务：每天清理过期申诉 ──────────────────
-- （需 pg_cron 扩展，若未启用则跳过）
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_extension WHERE extname = 'pg_cron') THEN
    PERFORM cron.schedule('purge_expired_appeals_daily', '0 3 * * *', 'SELECT public.purge_expired_appeals();');
  END IF;
EXCEPTION WHEN OTHERS THEN NULL;
END $$;

-- ── 8. 授权 ─────────────────────────────────────────────
GRANT EXECUTE ON FUNCTION public.admin_get_auto_approval() TO authenticated;
GRANT EXECUTE ON FUNCTION public.admin_set_auto_approval(boolean, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.purge_expired_appeals() TO authenticated;