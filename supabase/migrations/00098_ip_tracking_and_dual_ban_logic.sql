-- ══════════════════════════════════════════
-- 1. user_approvals 增加 ip_address 列
-- ══════════════════════════════════════════
ALTER TABLE public.user_approvals ADD COLUMN IF NOT EXISTS ip_address text;

-- ══════════════════════════════════════════
-- 2. 辅助函数：判断是否私有/本地IP（排除误封）
-- ══════════════════════════════════════════
CREATE OR REPLACE FUNCTION public._is_private_ip(p_ip text)
RETURNS boolean LANGUAGE sql IMMUTABLE AS $$
  SELECT p_ip IS NULL OR p_ip = ''
      OR p_ip LIKE '127.%'
      OR p_ip LIKE '10.%'
      OR p_ip LIKE '192.168.%'
      OR p_ip LIKE '172.16.%' OR p_ip LIKE '172.17.%' OR p_ip LIKE '172.18.%'
      OR p_ip LIKE '172.19.%' OR p_ip LIKE '172.2_.%' OR p_ip LIKE '172.30.%'
      OR p_ip LIKE '172.31.%'
      OR p_ip = '::1'
      OR p_ip LIKE 'fc%' OR p_ip LIKE 'fd%';
$$;

-- ══════════════════════════════════════════
-- 3. 辅助函数：双封（封禁新老两个账号 + 封禁实体）
-- ══════════════════════════════════════════
CREATE OR REPLACE FUNCTION public._ban_both_accounts(
  p_uid1 uuid, p_uid2 uuid,
  p_entity_type text, p_entity_value text, p_reason text
)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, auth AS $$
DECLARE
  v_ban_until timestamptz := now() + interval '100 years';
  v_email1 text; v_email2 text;
  v_dev1 text; v_dev2 text;
BEGIN
  -- 获取两账号邮箱
  SELECT email::text INTO v_email1 FROM auth.users WHERE id = p_uid1;
  SELECT email::text INTO v_email2 FROM auth.users WHERE id = p_uid2;

  -- 设置 auth 层封禁
  UPDATE auth.users SET banned_until = v_ban_until
    WHERE id IN (p_uid1, p_uid2);

  -- 软删除两账号及存档
  UPDATE auth.users SET deleted_at = now()
    WHERE id IN (p_uid1, p_uid2) AND deleted_at IS NULL;
  UPDATE player_saves SET deleted_at = now(), delete_reason = 'auto_ban_duplicate'
    WHERE user_id IN (p_uid1, p_uid2) AND deleted_at IS NULL;

  -- 获取两账号设备ID
  SELECT device_id INTO v_dev1 FROM user_approvals WHERE user_id = p_uid1 LIMIT 1;
  SELECT device_id INTO v_dev2 FROM user_approvals WHERE user_id = p_uid2 LIMIT 1;

  -- banned_entities：封禁实体（触发原因）
  INSERT INTO banned_entities (user_id, email, entity_type, entity_value, ban_reason, banned_until)
  VALUES
    (p_uid1, v_email1, p_entity_type, p_entity_value, p_reason, v_ban_until),
    (p_uid2, v_email2, p_entity_type, p_entity_value, p_reason, v_ban_until)
  ON CONFLICT DO NOTHING;

  -- 同时封禁两账号邮箱
  INSERT INTO banned_entities (user_id, email, entity_type, entity_value, ban_reason, banned_until)
  VALUES
    (p_uid1, v_email1, 'email', lower(trim(COALESCE(v_email1,''))), p_reason, v_ban_until),
    (p_uid2, v_email2, 'email', lower(trim(COALESCE(v_email2,''))), p_reason, v_ban_until)
  ON CONFLICT DO NOTHING;

  -- 封禁两账号设备
  IF v_dev1 IS NOT NULL AND v_dev1 NOT IN ('unknown','web') THEN
    INSERT INTO banned_entities (user_id, email, entity_type, entity_value, ban_reason, banned_until)
    VALUES (p_uid1, v_email1, 'device', v_dev1, p_reason, v_ban_until)
    ON CONFLICT DO NOTHING;
  END IF;
  IF v_dev2 IS NOT NULL AND v_dev2 NOT IN ('unknown','web') AND v_dev2 IS DISTINCT FROM v_dev1 THEN
    INSERT INTO banned_entities (user_id, email, entity_type, entity_value, ban_reason, banned_until)
    VALUES (p_uid2, v_email2, 'device', v_dev2, p_reason, v_ban_until)
    ON CONFLICT DO NOTHING;
  END IF;
END;
$$;

-- ══════════════════════════════════════════
-- 4. 更新 register_with_test_code：采集IP + 封禁检查 + 同设备/同IP双封
-- ══════════════════════════════════════════
CREATE OR REPLACE FUNCTION public.register_with_test_code(p_test_code text, p_device_id text DEFAULT NULL::text)
RETURNS text
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, extensions, auth
AS $$
DECLARE
  v_uid   uuid := auth.uid();
  v_code  test_codes%ROWTYPE;
  v_app   user_approvals%ROWTYPE;
  v_email text;
  v_auto  boolean := false;
  v_dev   text := NULLIF(p_device_id, '');
  v_ip    text;
  v_ban_until timestamptz := now() + interval '100 years';
  v_dup_uid uuid;
BEGIN
  IF v_uid IS NULL THEN RETURN 'NOT_AUTHENTICATED'; END IF;

  -- 从请求头提取真实IP（server-side，无法伪造）
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

  -- ── 封禁检查：设备被封 ──
  IF v_dev IS NOT NULL AND v_dev NOT IN ('unknown', 'web') THEN
    IF EXISTS (SELECT 1 FROM banned_entities WHERE entity_type = 'device' AND entity_value = v_dev AND banned_until > now()) THEN
      RETURN 'BANNED_DEVICE';
    END IF;
  END IF;

  -- ── 封禁检查：IP被封（排除私有IP）──
  IF NOT _is_private_ip(v_ip) THEN
    IF EXISTS (SELECT 1 FROM banned_entities WHERE entity_type = 'ip' AND entity_value = v_ip AND banned_until > now()) THEN
      RETURN 'BANNED_IP';
    END IF;
  END IF;

  -- ── 封禁检查：邮箱被封 ──
  SELECT email::text INTO v_email FROM auth.users WHERE id = v_uid;
  IF EXISTS (SELECT 1 FROM banned_entities WHERE entity_type = 'email' AND entity_value = lower(trim(COALESCE(v_email,''))) AND banned_until > now()) THEN
    RETURN 'BANNED_EMAIL';
  END IF;

  -- 读取自动审批开关
  SELECT auto_approval_enabled INTO v_auto FROM admin_settings LIMIT 1;

  -- ── 设备指纹检测（绕过名单中的用户不受限制）──
  IF v_dev IS NOT NULL AND v_dev NOT IN ('unknown', 'web') THEN
    IF NOT EXISTS (SELECT 1 FROM device_check_bypass WHERE user_id = v_uid) THEN
      IF EXISTS (SELECT 1 FROM user_approvals ua WHERE ua.device_id = v_dev AND ua.status = 'approved' AND ua.user_id <> v_uid) THEN
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
        WHERE id = v_app.test_code_id AND status = 'used';
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
      -- 重复邮箱
      IF EXISTS (SELECT 1 FROM user_approvals ua WHERE ua.email = v_email AND ua.user_id <> v_uid) THEN
        PERFORM _system_reject_and_appeal(v_uid, v_email, v_code.id, v_dev, '重复邮箱申请');
        RETURN 'AUTO_REJECTED_DUPLICATE_EMAIL';
      END IF;
      -- 同设备双封
      IF v_dev IS NOT NULL AND v_dev NOT IN ('unknown','web')
         AND NOT EXISTS (SELECT 1 FROM device_check_bypass WHERE user_id = v_uid) THEN
        SELECT user_id INTO v_dup_uid FROM user_approvals ua
          WHERE ua.device_id = v_dev AND ua.user_id <> v_uid
          ORDER BY created_at DESC LIMIT 1;
        IF FOUND THEN
          PERFORM _ban_both_accounts(v_uid, v_dup_uid, 'device', v_dev, '同设备重复注册，双账号封禁');
          PERFORM _system_reject_and_appeal(v_uid, v_email, v_code.id, v_dev, '同设备多账号（已双封）');
          RETURN 'AUTO_REJECTED_DUPLICATE_DEVICE';
        END IF;
      END IF;
      -- 同IP双封（排除私有IP）
      IF NOT _is_private_ip(v_ip) THEN
        SELECT user_id INTO v_dup_uid FROM user_approvals ua
          WHERE ua.ip_address = v_ip AND ua.user_id <> v_uid
          ORDER BY created_at DESC LIMIT 1;
        IF FOUND THEN
          PERFORM _ban_both_accounts(v_uid, v_dup_uid, 'ip', v_ip, '同IP重复注册，双账号封禁');
          PERFORM _system_reject_and_appeal(v_uid, v_email, v_code.id, v_dev, '同IP多账号（已双封）');
          RETURN 'AUTO_REJECTED_DUPLICATE_IP';
        END IF;
      END IF;
      -- 通过
      UPDATE user_approvals SET status='approved', reject_reason='自动审批通过', reviewed_at=now()
        WHERE user_id = v_uid;
      UPDATE player_saves SET approval_status='approved', updated_at=now() WHERE user_id = v_uid;
    END IF;
    RETURN 'OK';
  END IF;

  -- 全新提交
  UPDATE test_codes SET status='used', used_by_user_id=v_uid, used_by_email=v_email, used_at=now()
    WHERE id = v_code.id;
  INSERT INTO user_approvals (user_id, email, status, test_code_id, device_id, ip_address)
    VALUES (v_uid, v_email, 'pending', v_code.id, v_dev, v_ip);

  IF v_auto THEN
    IF EXISTS (SELECT 1 FROM user_approvals ua WHERE ua.email = v_email AND ua.user_id <> v_uid) THEN
      PERFORM _system_reject_and_appeal(v_uid, v_email, v_code.id, v_dev, '重复邮箱申请');
      RETURN 'AUTO_REJECTED_DUPLICATE_EMAIL';
    END IF;
    IF v_dev IS NOT NULL AND v_dev NOT IN ('unknown','web')
       AND NOT EXISTS (SELECT 1 FROM device_check_bypass WHERE user_id = v_uid) THEN
      SELECT user_id INTO v_dup_uid FROM user_approvals ua
        WHERE ua.device_id = v_dev AND ua.user_id <> v_uid
        ORDER BY created_at DESC LIMIT 1;
      IF FOUND THEN
        PERFORM _ban_both_accounts(v_uid, v_dup_uid, 'device', v_dev, '同设备重复注册，双账号封禁');
        PERFORM _system_reject_and_appeal(v_uid, v_email, v_code.id, v_dev, '同设备多账号（已双封）');
        RETURN 'AUTO_REJECTED_DUPLICATE_DEVICE';
      END IF;
    END IF;
    IF NOT _is_private_ip(v_ip) THEN
      SELECT user_id INTO v_dup_uid FROM user_approvals ua
        WHERE ua.ip_address = v_ip AND ua.user_id <> v_uid
        ORDER BY created_at DESC LIMIT 1;
      IF FOUND THEN
        PERFORM _ban_both_accounts(v_uid, v_dup_uid, 'ip', v_ip, '同IP重复注册，双账号封禁');
        PERFORM _system_reject_and_appeal(v_uid, v_email, v_code.id, v_dev, '同IP多账号（已双封）');
        RETURN 'AUTO_REJECTED_DUPLICATE_IP';
      END IF;
    END IF;
    UPDATE user_approvals SET status='approved', reject_reason='自动审批通过', reviewed_at=now()
      WHERE user_id = v_uid;
    UPDATE player_saves SET approval_status='approved', updated_at=now() WHERE user_id = v_uid;
  END IF;
  RETURN 'OK';
END;
$$;

-- ══════════════════════════════════════════
-- 5. admin_delete_account：同时封禁IP
-- ══════════════════════════════════════════
CREATE OR REPLACE FUNCTION public.admin_delete_account(p_user_id uuid)
RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, extensions, auth
AS $$
DECLARE
  v_email       text;
  v_device_id   text;
  v_ip          text;
  v_admin_uid   uuid := auth.uid();
  v_admin_email text;
  v_ban_until   timestamptz := now() + interval '100 years';
  v_already_deleted timestamptz;
BEGIN
  IF COALESCE(current_admin_role(),'') NOT IN ('admin','super_admin') THEN RAISE EXCEPTION 'forbidden'; END IF;
  IF p_user_id IS NULL THEN RAISE EXCEPTION 'user_id required'; END IF;
  IF EXISTS(SELECT 1 FROM admin_users WHERE user_id = p_user_id) THEN RAISE EXCEPTION 'cannot delete admin account'; END IF;
  SELECT email::text, deleted_at INTO v_email, v_already_deleted FROM auth.users WHERE id = p_user_id;
  IF NOT FOUND THEN RAISE EXCEPTION 'account not found'; END IF;
  IF v_already_deleted IS NOT NULL THEN RAISE EXCEPTION 'account already pending deletion'; END IF;

  SELECT device_id, ip_address INTO v_device_id, v_ip FROM user_approvals WHERE user_id = p_user_id LIMIT 1;
  SELECT email INTO v_admin_email FROM admin_users WHERE user_id = v_admin_uid;

  -- 软删除 + auth 层封禁
  UPDATE auth.users SET deleted_at = now(), banned_until = v_ban_until WHERE id = p_user_id;
  UPDATE player_saves SET deleted_at = now(), delete_reason = 'admin_delete'
    WHERE user_id = p_user_id AND deleted_at IS NULL;

  -- banned_entities：封禁用户
  INSERT INTO banned_entities (user_id, email, entity_type, entity_value, ban_reason, banned_by, banned_by_email, banned_until)
  VALUES (p_user_id, v_email, 'user', p_user_id::text, '管理员删除账号', v_admin_uid, v_admin_email, v_ban_until);

  -- 封禁邮箱
  IF v_email IS NOT NULL THEN
    INSERT INTO banned_entities (user_id, email, entity_type, entity_value, ban_reason, banned_by, banned_by_email, banned_until)
    VALUES (p_user_id, v_email, 'email', lower(trim(v_email)), '管理员删除账号', v_admin_uid, v_admin_email, v_ban_until)
    ON CONFLICT DO NOTHING;
  END IF;

  -- 封禁设备
  IF v_device_id IS NOT NULL AND v_device_id NOT IN ('unknown','web') THEN
    INSERT INTO banned_entities (user_id, email, entity_type, entity_value, ban_reason, banned_by, banned_by_email, banned_until)
    VALUES (p_user_id, v_email, 'device', v_device_id, '管理员删除账号', v_admin_uid, v_admin_email, v_ban_until)
    ON CONFLICT DO NOTHING;
  END IF;

  -- 封禁IP（排除私有IP）
  IF NOT _is_private_ip(v_ip) THEN
    INSERT INTO banned_entities (user_id, email, entity_type, entity_value, ban_reason, banned_by, banned_by_email, banned_until)
    VALUES (p_user_id, v_email, 'ip', v_ip, '管理员删除账号', v_admin_uid, v_admin_email, v_ban_until)
    ON CONFLICT DO NOTHING;
  END IF;

  PERFORM admin_log_action('delete_account_with_ban', p_user_id::text,
    jsonb_build_object('email', v_email, 'device_id', v_device_id, 'ip', v_ip,
                       'ban_until', v_ban_until::text,
                       'auth_banned', true,
                       'retention_until', (now() + interval '30 days')::text));
  RETURN jsonb_build_object('deleted', true, 'email', v_email,
                            'banned_until', v_ban_until::text,
                            'device_banned', v_device_id IS NOT NULL,
                            'ip_banned', NOT _is_private_ip(v_ip) AND v_ip IS NOT NULL);
END;
$$;

-- ══════════════════════════════════════════
-- 6. 管理员查询封禁记录
-- ══════════════════════════════════════════
CREATE OR REPLACE FUNCTION public.admin_list_banned_entities(
  p_limit    int  DEFAULT 50,
  p_offset   int  DEFAULT 0,
  p_type     text DEFAULT NULL
)
RETURNS TABLE(
  id uuid, user_id uuid, email text, entity_type text, entity_value text,
  ban_reason text, banned_by_email text, banned_at timestamptz, banned_until timestamptz,
  is_active boolean
)
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF COALESCE(current_admin_role(),'') NOT IN ('admin','super_admin') THEN RAISE EXCEPTION 'forbidden'; END IF;
  RETURN QUERY
  SELECT b.id, b.user_id, b.email, b.entity_type, b.entity_value,
         b.ban_reason, b.banned_by_email, b.banned_at, b.banned_until,
         (b.banned_until > now()) AS is_active
    FROM banned_entities b
   WHERE (p_type IS NULL OR b.entity_type = p_type)
   ORDER BY b.banned_at DESC
   LIMIT p_limit OFFSET p_offset;
END;
$$;

-- ══════════════════════════════════════════
-- 7. 超管解封指定banned_entity
-- ══════════════════════════════════════════
CREATE OR REPLACE FUNCTION public.admin_unban_entity(p_id uuid)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, auth AS $$
DECLARE
  v_ban banned_entities%ROWTYPE;
BEGIN
  IF current_admin_role() <> 'super_admin' THEN RETURN jsonb_build_object('ok',false,'err','仅超级管理员可解封'); END IF;
  SELECT * INTO v_ban FROM banned_entities WHERE id = p_id;
  IF NOT FOUND THEN RETURN jsonb_build_object('ok',false,'err','记录不存在'); END IF;
  -- 将封禁时间改为当前（立即失效）
  UPDATE banned_entities SET banned_until = now() WHERE id = p_id;
  -- 如为用户类型，同步解除 auth 层封禁
  IF v_ban.entity_type = 'user' AND v_ban.user_id IS NOT NULL THEN
    UPDATE auth.users SET banned_until = NULL WHERE id = v_ban.user_id;
  END IF;
  PERFORM admin_log_action('unban_entity', p_id::text,
    jsonb_build_object('entity_type', v_ban.entity_type, 'entity_value', v_ban.entity_value, 'email', v_ban.email));
  RETURN jsonb_build_object('ok', true);
END;
$$;