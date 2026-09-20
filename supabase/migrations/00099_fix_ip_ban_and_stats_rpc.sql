-- ══════════════════════════════════════════
-- 1. 修复IP双封逻辑：同IP只拒绝新账号，不株连已审核的老账号
--    同设备双封保留（设备指纹更可靠）
-- ══════════════════════════════════════════
CREATE OR REPLACE FUNCTION public.register_with_test_code(p_test_code text, p_device_id text DEFAULT NULL::text)
RETURNS text
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, extensions, auth
AS $$
DECLARE
  v_uid        uuid := auth.uid();
  v_code       test_codes%ROWTYPE;
  v_app        user_approvals%ROWTYPE;
  v_email      text;
  v_auto       boolean := false;
  v_dev        text := NULLIF(p_device_id, '');
  v_ip         text;
  v_ban_until  timestamptz := now() + interval '100 years';
  v_dup_uid    uuid;
BEGIN
  IF v_uid IS NULL THEN RETURN 'NOT_AUTHENTICATED'; END IF;

  -- 从请求头提取真实 IP（server-side，不可伪造）
  BEGIN
    v_ip := TRIM(SPLIT_PART(COALESCE(
      current_setting('request.headers', true)::json->>'cf-connecting-ip',
      current_setting('request.headers', true)::json->>'x-real-ip',
      current_setting('request.headers', true)::json->>'x-forwarded-for',
      ''
    ), ',', 1));
  EXCEPTION WHEN OTHERS THEN
    v_ip := NULL;
  END;
  v_ip := NULLIF(TRIM(COALESCE(v_ip, '')), '');

  -- ── 封禁检查：设备/IP/邮箱 ──
  IF v_dev IS NOT NULL AND v_dev NOT IN ('unknown', 'web') THEN
    IF EXISTS (SELECT 1 FROM banned_entities WHERE entity_type='device' AND entity_value=v_dev AND banned_until>now()) THEN
      RETURN 'BANNED_DEVICE';
    END IF;
  END IF;
  IF NOT _is_private_ip(v_ip) THEN
    IF EXISTS (SELECT 1 FROM banned_entities WHERE entity_type='ip' AND entity_value=v_ip AND banned_until>now()) THEN
      RETURN 'BANNED_IP';
    END IF;
  END IF;
  SELECT email::text INTO v_email FROM auth.users WHERE id = v_uid;
  IF EXISTS (SELECT 1 FROM banned_entities WHERE entity_type='email' AND entity_value=lower(trim(COALESCE(v_email,''))) AND banned_until>now()) THEN
    RETURN 'BANNED_EMAIL';
  END IF;

  -- 读取自动审批开关
  SELECT auto_approval_enabled INTO v_auto FROM admin_settings LIMIT 1;

  -- ── 设备指纹检测（绕过名单豁免）──
  IF v_dev IS NOT NULL AND v_dev NOT IN ('unknown','web') THEN
    IF NOT EXISTS (SELECT 1 FROM device_check_bypass WHERE user_id = v_uid) THEN
      IF EXISTS (SELECT 1 FROM user_approvals ua WHERE ua.device_id=v_dev AND ua.status='approved' AND ua.user_id<>v_uid) THEN
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

  SELECT * INTO v_app FROM user_approvals WHERE user_id = v_uid;

  IF FOUND THEN
    IF v_app.status = 'approved' THEN RETURN 'ALREADY_APPROVED'; END IF;
    IF v_app.status = 'pending'  THEN RETURN 'ALREADY_PENDING'; END IF;
    IF v_app.test_code_id IS NOT NULL THEN
      UPDATE test_codes SET status='unused', used_by_user_id=NULL, used_by_email=NULL, used_at=NULL
        WHERE id = v_app.test_code_id AND status='used';
    END IF;
    UPDATE user_approvals
      SET status='pending', test_code_id=v_code.id, reject_reason=NULL,
          reviewed_by=NULL, reviewed_at=NULL, created_at=now(),
          device_id=COALESCE(v_dev, device_id),
          ip_address=COALESCE(v_ip, ip_address)
      WHERE user_id = v_uid;
    UPDATE test_codes SET status='used', used_by_user_id=v_uid, used_by_email=v_email, used_at=now()
      WHERE id = v_code.id;

    IF v_auto THEN
      IF EXISTS (SELECT 1 FROM user_approvals ua WHERE ua.email=v_email AND ua.user_id<>v_uid) THEN
        PERFORM _system_reject_and_appeal(v_uid, v_email, v_code.id, v_dev, '重复邮箱申请');
        RETURN 'AUTO_REJECTED_DUPLICATE_EMAIL';
      END IF;
      -- 同设备：双封（设备指纹可靠，两个账号都封）
      IF v_dev IS NOT NULL AND v_dev NOT IN ('unknown','web')
         AND NOT EXISTS (SELECT 1 FROM device_check_bypass WHERE user_id=v_uid) THEN
        SELECT user_id INTO v_dup_uid FROM user_approvals ua
          WHERE ua.device_id=v_dev AND ua.user_id<>v_uid ORDER BY created_at DESC LIMIT 1;
        IF FOUND THEN
          PERFORM _ban_both_accounts(v_uid, v_dup_uid, 'device', v_dev, '同设备重复注册，双账号封禁');
          PERFORM _system_reject_and_appeal(v_uid, v_email, v_code.id, v_dev, '同设备多账号（已双封）');
          RETURN 'AUTO_REJECTED_DUPLICATE_DEVICE';
        END IF;
      END IF;
      -- 同IP：仅封禁新账号，不株连老账号（IP可能为共享网络/NAT）
      IF NOT _is_private_ip(v_ip) THEN
        IF EXISTS (SELECT 1 FROM user_approvals ua WHERE ua.ip_address=v_ip AND ua.user_id<>v_uid) THEN
          -- 封禁当前新账号
          UPDATE auth.users SET banned_until=v_ban_until WHERE id=v_uid;
          INSERT INTO banned_entities(user_id,email,entity_type,entity_value,ban_reason,banned_until)
          VALUES(v_uid,v_email,'ip',v_ip,'同IP重复注册（自动封禁新账号）',v_ban_until) ON CONFLICT DO NOTHING;
          INSERT INTO banned_entities(user_id,email,entity_type,entity_value,ban_reason,banned_until)
          VALUES(v_uid,v_email,'email',lower(trim(COALESCE(v_email,''))),
                 '同IP重复注册（自动封禁新账号）',v_ban_until) ON CONFLICT DO NOTHING;
          PERFORM _system_reject_and_appeal(v_uid, v_email, v_code.id, v_dev, '同IP多账号（已封禁新账号）');
          RETURN 'AUTO_REJECTED_DUPLICATE_IP';
        END IF;
      END IF;
      UPDATE user_approvals SET status='approved', reject_reason='自动审批通过', reviewed_at=now()
        WHERE user_id=v_uid;
      UPDATE player_saves SET approval_status='approved', updated_at=now() WHERE user_id=v_uid;
    END IF;
    RETURN 'OK';
  END IF;

  -- 全新提交
  UPDATE test_codes SET status='used', used_by_user_id=v_uid, used_by_email=v_email, used_at=now()
    WHERE id = v_code.id;
  INSERT INTO user_approvals (user_id, email, status, test_code_id, device_id, ip_address)
    VALUES (v_uid, v_email, 'pending', v_code.id, v_dev, v_ip);

  IF v_auto THEN
    IF EXISTS (SELECT 1 FROM user_approvals ua WHERE ua.email=v_email AND ua.user_id<>v_uid) THEN
      PERFORM _system_reject_and_appeal(v_uid, v_email, v_code.id, v_dev, '重复邮箱申请');
      RETURN 'AUTO_REJECTED_DUPLICATE_EMAIL';
    END IF;
    IF v_dev IS NOT NULL AND v_dev NOT IN ('unknown','web')
       AND NOT EXISTS (SELECT 1 FROM device_check_bypass WHERE user_id=v_uid) THEN
      SELECT user_id INTO v_dup_uid FROM user_approvals ua
        WHERE ua.device_id=v_dev AND ua.user_id<>v_uid ORDER BY created_at DESC LIMIT 1;
      IF FOUND THEN
        PERFORM _ban_both_accounts(v_uid, v_dup_uid, 'device', v_dev, '同设备重复注册，双账号封禁');
        PERFORM _system_reject_and_appeal(v_uid, v_email, v_code.id, v_dev, '同设备多账号（已双封）');
        RETURN 'AUTO_REJECTED_DUPLICATE_DEVICE';
      END IF;
    END IF;
    IF NOT _is_private_ip(v_ip) THEN
      IF EXISTS (SELECT 1 FROM user_approvals ua WHERE ua.ip_address=v_ip AND ua.user_id<>v_uid) THEN
        UPDATE auth.users SET banned_until=v_ban_until WHERE id=v_uid;
        INSERT INTO banned_entities(user_id,email,entity_type,entity_value,ban_reason,banned_until)
        VALUES(v_uid,v_email,'ip',v_ip,'同IP重复注册（自动封禁新账号）',v_ban_until) ON CONFLICT DO NOTHING;
        INSERT INTO banned_entities(user_id,email,entity_type,entity_value,ban_reason,banned_until)
        VALUES(v_uid,v_email,'email',lower(trim(COALESCE(v_email,''))),
               '同IP重复注册（自动封禁新账号）',v_ban_until) ON CONFLICT DO NOTHING;
        PERFORM _system_reject_and_appeal(v_uid, v_email, v_code.id, v_dev, '同IP多账号（已封禁新账号）');
        RETURN 'AUTO_REJECTED_DUPLICATE_IP';
      END IF;
    END IF;
    UPDATE user_approvals SET status='approved', reject_reason='自动审批通过', reviewed_at=now()
      WHERE user_id=v_uid;
    UPDATE player_saves SET approval_status='approved', updated_at=now() WHERE user_id=v_uid;
  END IF;
  RETURN 'OK';
END;
$$;

-- ══════════════════════════════════════════
-- 2. 封禁统计 RPC（BannedTab 用）
-- ══════════════════════════════════════════
CREATE OR REPLACE FUNCTION public.admin_banned_entities_stats()
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_now timestamptz := now();
  v_today_start timestamptz := date_trunc('day', now() AT TIME ZONE 'Asia/Shanghai') AT TIME ZONE 'Asia/Shanghai';
BEGIN
  IF COALESCE(current_admin_role(),'') NOT IN ('admin','super_admin') THEN RAISE EXCEPTION 'forbidden'; END IF;
  RETURN (
    SELECT jsonb_build_object(
      'today',       count(*) FILTER (WHERE banned_at >= v_today_start),
      'total_active',count(*) FILTER (WHERE banned_until > v_now),
      'by_type', jsonb_build_object(
        'user',   count(*) FILTER (WHERE banned_until>v_now AND entity_type='user'),
        'email',  count(*) FILTER (WHERE banned_until>v_now AND entity_type='email'),
        'device', count(*) FILTER (WHERE banned_until>v_now AND entity_type='device'),
        'ip',     count(*) FILTER (WHERE banned_until>v_now AND entity_type='ip'),
        'vpn',    count(*) FILTER (WHERE banned_until>v_now AND entity_type='vpn')
      )
    ) FROM banned_entities
  );
END;
$$;

-- ══════════════════════════════════════════
-- 3. VPN封禁辅助：管理员标记某IP为VPN并封禁
-- ══════════════════════════════════════════
CREATE OR REPLACE FUNCTION public.admin_ban_vpn_ip(p_ip text, p_reason text DEFAULT 'VPN/代理检测')
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, auth AS $$
DECLARE
  v_ban_until timestamptz := now() + interval '100 years';
BEGIN
  IF COALESCE(current_admin_role(),'') NOT IN ('admin','super_admin') THEN RAISE EXCEPTION 'forbidden'; END IF;
  INSERT INTO banned_entities(entity_type, entity_value, ban_reason, banned_by_email, banned_until)
  VALUES('vpn', p_ip, p_reason,
    (SELECT email FROM admin_users WHERE user_id=auth.uid()),
    v_ban_until)
  ON CONFLICT DO NOTHING;
  -- 同时写一条 ip 类型
  INSERT INTO banned_entities(entity_type, entity_value, ban_reason, banned_by_email, banned_until)
  VALUES('ip', p_ip, p_reason,
    (SELECT email FROM admin_users WHERE user_id=auth.uid()),
    v_ban_until)
  ON CONFLICT DO NOTHING;
  RETURN jsonb_build_object('ok',true,'ip',p_ip);
END;
$$;