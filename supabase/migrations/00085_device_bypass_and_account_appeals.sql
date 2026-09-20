
-- ══════════════════════════════════════════════
-- 批次1：设备绕过表 + 解封指定账号
-- ══════════════════════════════════════════════
CREATE TABLE IF NOT EXISTS public.device_check_bypass (
  id serial PRIMARY KEY,
  user_id uuid UNIQUE NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  bypass_reason text,
  bypassed_by uuid REFERENCES auth.users(id),
  created_at timestamptz DEFAULT now()
);
ALTER TABLE public.device_check_bypass ENABLE ROW LEVEL SECURITY;
CREATE POLICY "bypass_admin_all" ON public.device_check_bypass
  FOR ALL TO authenticated USING (is_current_admin());

-- 解封 3104281546@qq.com（user_id: 26c52257-9b39-49f5-a585-2d9f1b2cc150）
INSERT INTO public.device_check_bypass (user_id, bypass_reason)
VALUES ('26c52257-9b39-49f5-a585-2d9f1b2cc150', '管理员手动解封：同设备注册误判')
ON CONFLICT (user_id) DO NOTHING;

-- 更新 register_with_test_code：绕过名单用户跳过设备检测
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
BEGIN
  IF v_uid IS NULL THEN RETURN 'NOT_AUTHENTICATED'; END IF;

  -- 设备指纹检测（绕过名单中的用户不受限制）
  IF p_device_id IS NOT NULL AND p_device_id NOT IN ('unknown', 'web', '') THEN
    IF NOT EXISTS (SELECT 1 FROM device_check_bypass WHERE user_id = v_uid) THEN
      IF EXISTS (
        SELECT 1 FROM user_approvals ua
        WHERE ua.device_id = p_device_id
          AND ua.status = 'approved'
          AND ua.user_id <> v_uid
      ) THEN
        RETURN 'DEVICE_ALREADY_REGISTERED';
      END IF;
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
          device_id=COALESCE(NULLIF(p_device_id,''), device_id)
      WHERE user_id = v_uid;
    UPDATE test_codes SET status='used', used_by_user_id=v_uid, used_by_email=v_email, used_at=now()
      WHERE id = v_code.id;
    RETURN 'OK';
  END IF;

  -- 全新提交
  UPDATE test_codes SET status='used', used_by_user_id=v_uid, used_by_email=v_email, used_at=now()
    WHERE id = v_code.id;
  INSERT INTO user_approvals (user_id, email, status, test_code_id, device_id)
    VALUES (v_uid, v_email, 'pending', v_code.id, NULLIF(p_device_id,''));
  RETURN 'OK';
END;
$function$;

-- ══════════════════════════════════════════════
-- 批次2：账户申诉表 + RPCs
-- ══════════════════════════════════════════════
CREATE TABLE IF NOT EXISTS public.account_appeals (
  id               uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  target_user_id   uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  target_email     text NOT NULL,
  appeal_type      text NOT NULL CHECK (appeal_type IN ('system_rejected','player_rejected')),
  appeal_reason    text,
  status           text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','approved','rejected')),
  reject_reason    text,
  submitted_by     uuid REFERENCES auth.users(id),
  submitted_by_email text,
  reviewed_by_email  text,
  reviewed_at      timestamptz,
  expires_at       timestamptz DEFAULT (now() + interval '7 days'),
  created_at       timestamptz DEFAULT now()
);
ALTER TABLE public.account_appeals ENABLE ROW LEVEL SECURITY;
CREATE POLICY "appeals_admin_all" ON public.account_appeals
  FOR ALL TO authenticated USING (is_current_admin());
CREATE INDEX IF NOT EXISTS idx_appeals_status ON public.account_appeals (status, created_at DESC);

-- RPC: admin_submit_appeal（admin+）
CREATE OR REPLACE FUNCTION public.admin_submit_appeal(
  p_target_email text,
  p_appeal_type  text,
  p_reason       text DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public','auth'
AS $$
DECLARE
  v_role      text := current_admin_role();
  v_uid       uuid := auth.uid();
  v_my_email  text;
  v_target_id uuid;
BEGIN
  IF COALESCE(v_role,'') NOT IN ('admin','super_admin') THEN RAISE EXCEPTION 'forbidden'; END IF;
  SELECT email::text INTO v_my_email FROM auth.users WHERE id = v_uid;
  SELECT id INTO v_target_id FROM auth.users WHERE email = p_target_email;
  IF NOT FOUND THEN
    RETURN jsonb_build_object('ok', false, 'err', '找不到该邮箱对应的账号');
  END IF;
  IF p_appeal_type NOT IN ('system_rejected','player_rejected') THEN
    RETURN jsonb_build_object('ok', false, 'err', '申诉类型无效');
  END IF;
  -- 清理过期待处理申诉
  DELETE FROM account_appeals WHERE expires_at < now() AND status = 'pending';
  IF EXISTS (SELECT 1 FROM account_appeals WHERE target_user_id = v_target_id AND status = 'pending') THEN
    RETURN jsonb_build_object('ok', false, 'err', '该账号已有待处理的申诉');
  END IF;
  INSERT INTO account_appeals
    (target_user_id, target_email, appeal_type, appeal_reason, submitted_by, submitted_by_email)
    VALUES (v_target_id, p_target_email, p_appeal_type, NULLIF(p_reason,''), v_uid, v_my_email);
  RETURN jsonb_build_object('ok', true);
END;
$$;

-- RPC: admin_list_appeals（admin+，含自动清理过期）
CREATE OR REPLACE FUNCTION public.admin_list_appeals(p_status text DEFAULT NULL)
RETURNS TABLE(
  id uuid, target_user_id uuid, target_email text, appeal_type text, appeal_reason text,
  status text, reject_reason text, submitted_by_email text,
  reviewed_by_email text, reviewed_at timestamptz, expires_at timestamptz, created_at timestamptz
)
LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public'
AS $$
BEGIN
  IF NOT is_current_admin() THEN RAISE EXCEPTION 'forbidden'; END IF;
  DELETE FROM account_appeals WHERE expires_at < now() AND status = 'pending';
  RETURN QUERY
  SELECT aa.id, aa.target_user_id, aa.target_email, aa.appeal_type, aa.appeal_reason,
         aa.status, aa.reject_reason, aa.submitted_by_email,
         aa.reviewed_by_email, aa.reviewed_at, aa.expires_at, aa.created_at
  FROM account_appeals aa
  WHERE (p_status IS NULL OR p_status = 'all' OR aa.status = p_status)
  ORDER BY aa.created_at DESC
  LIMIT 100;
END;
$$;

-- RPC: admin_approve_appeal（仅 super_admin）
CREATE OR REPLACE FUNCTION public.admin_approve_appeal(p_id uuid)
RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public','auth'
AS $$
DECLARE
  v_role   text := current_admin_role();
  v_uid    uuid := auth.uid();
  v_email  text;
  v_appeal account_appeals%ROWTYPE;
BEGIN
  IF v_role <> 'super_admin' THEN RAISE EXCEPTION 'forbidden: super_admin only'; END IF;
  SELECT email::text INTO v_email FROM auth.users WHERE id = v_uid;
  SELECT * INTO v_appeal FROM account_appeals WHERE id = p_id;
  IF NOT FOUND            THEN RETURN jsonb_build_object('ok',false,'err','申诉不存在'); END IF;
  IF v_appeal.status <> 'pending' THEN RETURN jsonb_build_object('ok',false,'err','申诉已处理'); END IF;

  IF v_appeal.appeal_type = 'system_rejected' THEN
    INSERT INTO device_check_bypass (user_id, bypass_reason, bypassed_by)
      VALUES (v_appeal.target_user_id, '申诉通过：系统拒绝解封', v_uid)
      ON CONFLICT (user_id) DO NOTHING;
  ELSIF v_appeal.appeal_type = 'player_rejected' THEN
    UPDATE user_approvals
      SET status='pending', reject_reason=NULL, reviewed_by=NULL, reviewed_at=NULL, created_at=now()
      WHERE user_id = v_appeal.target_user_id AND status = 'rejected';
    UPDATE player_saves SET approval_status='pending', updated_at=now()
      WHERE user_id = v_appeal.target_user_id;
  END IF;

  UPDATE account_appeals
    SET status='approved', reviewed_by_email=v_email, reviewed_at=now()
    WHERE id = p_id;
  RETURN jsonb_build_object('ok', true);
END;
$$;

-- RPC: admin_reject_appeal（仅 super_admin）
CREATE OR REPLACE FUNCTION public.admin_reject_appeal(p_id uuid, p_reason text DEFAULT NULL)
RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public','auth'
AS $$
DECLARE
  v_role  text := current_admin_role();
  v_uid   uuid := auth.uid();
  v_email text;
BEGIN
  IF v_role <> 'super_admin' THEN RAISE EXCEPTION 'forbidden: super_admin only'; END IF;
  SELECT email::text INTO v_email FROM auth.users WHERE id = v_uid;
  IF NOT EXISTS (SELECT 1 FROM account_appeals WHERE id = p_id AND status = 'pending') THEN
    RETURN jsonb_build_object('ok',false,'err','申诉不存在或已处理');
  END IF;
  UPDATE account_appeals
    SET status='rejected',
        reject_reason=COALESCE(NULLIF(p_reason,''),'已驳回'),
        reviewed_by_email=v_email, reviewed_at=now()
    WHERE id = p_id;
  RETURN jsonb_build_object('ok', true);
END;
$$;

-- RPC: admin_appeals_pending_count（用于顶栏红点）
CREATE OR REPLACE FUNCTION public.admin_appeals_pending_count()
RETURNS bigint
LANGUAGE sql SECURITY DEFINER SET search_path TO 'public'
AS $$
  SELECT COUNT(*)::bigint FROM account_appeals WHERE status = 'pending' AND expires_at > now();
$$;
