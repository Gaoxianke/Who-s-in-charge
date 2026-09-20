-- ═══════════════════════════════════════════════════════
-- 1. 封禁实体库（IP / 设备 / Email / VPN / 综合 100年封禁）
-- ═══════════════════════════════════════════════════════
CREATE TABLE public.banned_entities (
  id           uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id      uuid,
  email        text,
  entity_type  text        NOT NULL CHECK (entity_type IN ('device','email','ip','vpn','user')),
  entity_value text,       -- device_id / IP / email / user_id
  ban_reason   text,
  banned_by    uuid,
  banned_by_email text,
  banned_at    timestamptz NOT NULL DEFAULT now(),
  banned_until timestamptz NOT NULL,
  created_at   timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.banned_entities ENABLE ROW LEVEL SECURITY;
CREATE POLICY "banned_entities_admin" ON public.banned_entities FOR ALL
  TO authenticated USING (public.is_current_admin()) WITH CHECK (public.is_current_admin());

-- ═══════════════════════════════════════════════════════
-- 2. 删除账号时同时封禁设备+邮箱+用户 100年
-- ═══════════════════════════════════════════════════════
CREATE OR REPLACE FUNCTION public.admin_delete_account(p_user_id uuid)
RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, extensions, auth
AS $$
DECLARE
  v_email      text;
  v_device_id  text;
  v_admin_uid  uuid := auth.uid();
  v_admin_email text;
  v_ban_until  timestamptz := now() + interval '100 years';
  v_already_deleted timestamptz;
BEGIN
  IF COALESCE(current_admin_role(),'') NOT IN ('admin','super_admin') THEN
    RAISE EXCEPTION 'forbidden';
  END IF;
  IF p_user_id IS NULL THEN RAISE EXCEPTION 'user_id required'; END IF;
  IF EXISTS(SELECT 1 FROM admin_users WHERE user_id = p_user_id) THEN
    RAISE EXCEPTION 'cannot delete admin account';
  END IF;
  SELECT email::text, deleted_at INTO v_email, v_already_deleted
    FROM auth.users WHERE id = p_user_id;
  IF NOT FOUND THEN RAISE EXCEPTION 'account not found'; END IF;
  IF v_already_deleted IS NOT NULL THEN RAISE EXCEPTION 'account already pending deletion'; END IF;

  -- 读取设备指纹
  SELECT device_id INTO v_device_id FROM user_approvals WHERE user_id = p_user_id LIMIT 1;
  -- 管理员信息
  SELECT email INTO v_admin_email FROM admin_users WHERE user_id = v_admin_uid;

  -- 软删除账号
  UPDATE auth.users
    SET deleted_at = now(), banned_until = v_ban_until
    WHERE id = p_user_id;
  UPDATE player_saves
    SET deleted_at = now(), delete_reason = 'admin_delete'
    WHERE user_id = p_user_id AND deleted_at IS NULL;

  -- 封禁用户ID（100年）
  INSERT INTO banned_entities (user_id, email, entity_type, entity_value, ban_reason, banned_by, banned_by_email, banned_until)
  VALUES (p_user_id, v_email, 'user', p_user_id::text, '管理员删除账号', v_admin_uid, v_admin_email, v_ban_until);

  -- 封禁邮箱（100年）
  IF v_email IS NOT NULL THEN
    INSERT INTO banned_entities (user_id, email, entity_type, entity_value, ban_reason, banned_by, banned_by_email, banned_until)
    VALUES (p_user_id, v_email, 'email', lower(trim(v_email)), '管理员删除账号', v_admin_uid, v_admin_email, v_ban_until)
    ON CONFLICT DO NOTHING;
  END IF;

  -- 封禁设备指纹（100年）
  IF v_device_id IS NOT NULL AND v_device_id NOT IN ('unknown','web') THEN
    INSERT INTO banned_entities (user_id, email, entity_type, entity_value, ban_reason, banned_by, banned_by_email, banned_until)
    VALUES (p_user_id, v_email, 'device', v_device_id, '管理员删除账号', v_admin_uid, v_admin_email, v_ban_until)
    ON CONFLICT DO NOTHING;
  END IF;

  PERFORM admin_log_action('delete_account_with_ban', p_user_id::text,
    jsonb_build_object('email', v_email, 'device_id', v_device_id,
                       'ban_until', v_ban_until::text, 'retention_until', (now() + interval '30 days')::text));
  RETURN jsonb_build_object('deleted', true, 'email', v_email,
                            'banned_until', v_ban_until::text, 'device_banned', v_device_id IS NOT NULL);
END;
$$;

-- ═══════════════════════════════════════════════════════
-- 3. 改名熔断时记录操作日志
-- ═══════════════════════════════════════════════════════
CREATE OR REPLACE FUNCTION public.admin_rename_player(p_id uuid, p_new_name text)
RETURNS TABLE(ok boolean, err text)
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_uid    uuid := auth.uid();
  v_name   text;
  v_hit    text;
  v_old    text;
BEGIN
  IF NOT is_current_admin() THEN RAISE EXCEPTION 'forbidden'; END IF;
  IF v_uid IS NULL THEN RETURN QUERY SELECT false, 'NOT_AUTHENTICATED'; RETURN; END IF;
  v_name := trim(p_new_name);
  IF length(v_name) < 1 OR length(v_name) > 20 THEN
    RETURN QUERY SELECT false, '名称长度需为1-20字符'; RETURN;
  END IF;
  SELECT player_name INTO v_old FROM player_saves WHERE id = p_id;
  IF NOT FOUND THEN
    RETURN QUERY SELECT false, '存档不存在'; RETURN;
  END IF;
  -- 敏感词熔断：命中则记录日志后拒绝
  SELECT word INTO v_hit FROM sensitive_words WHERE lower(v_name) LIKE '%' || word || '%' LIMIT 1;
  IF v_hit IS NOT NULL THEN
    PERFORM admin_log_action('rename_blocked_sensitive', p_id::text,
      jsonb_build_object('old_name', v_old, 'attempted_name', v_name, 'hit_word', v_hit));
    RETURN QUERY SELECT false, '名称包含敏感词「' || v_hit || '」，已被熔断'; RETURN;
  END IF;
  UPDATE player_saves SET player_name = v_name, updated_at = now() WHERE id = p_id;
  PERFORM admin_log_action('rename_player', p_id::text,
    jsonb_build_object('old_name', v_old, 'new_name', v_name));
  RETURN QUERY SELECT true, NULL::text;
END;
$$;

-- ═══════════════════════════════════════════════════════
-- 4. 存档名触发器：起名和改名均受敏感词库熔断（非管理员路径）
-- ═══════════════════════════════════════════════════════
CREATE OR REPLACE FUNCTION public.check_player_name_sensitive()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_hit text;
BEGIN
  IF NEW.player_name IS NULL OR NEW.player_name = '' THEN RETURN NEW; END IF;
  IF TG_OP = 'UPDATE' AND OLD.player_name = NEW.player_name THEN RETURN NEW; END IF;
  -- 管理员路径已经在RPC层做了校验，此触发器仅针对游戏客户端直接写入
  SELECT word INTO v_hit FROM sensitive_words WHERE lower(NEW.player_name) LIKE '%' || word || '%' LIMIT 1;
  IF v_hit IS NOT NULL THEN
    RAISE EXCEPTION '名称包含敏感词「%」，已被熔断', v_hit;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_check_player_name_sensitive ON public.player_saves;
CREATE TRIGGER trg_check_player_name_sensitive
  BEFORE INSERT OR UPDATE OF player_name ON public.player_saves
  FOR EACH ROW EXECUTE FUNCTION public.check_player_name_sensitive();

-- ═══════════════════════════════════════════════════════
-- 5. 超级管理员直接通过账号（无需等待申诉流程）
-- ═══════════════════════════════════════════════════════
CREATE OR REPLACE FUNCTION public.admin_direct_approve_account(
  p_target_email text,
  p_appeal_type  text DEFAULT 'system_rejected',
  p_note         text DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, auth AS $$
DECLARE
  v_role       text := current_admin_role();
  v_uid        uuid := auth.uid();
  v_admin_email text;
  v_target_id  uuid;
BEGIN
  IF v_role <> 'super_admin' THEN
    RETURN jsonb_build_object('ok', false, 'err', '仅超级管理员可直接通过');
  END IF;
  SELECT email::text INTO v_admin_email FROM auth.users WHERE id = v_uid;
  SELECT id INTO v_target_id FROM auth.users WHERE email = p_target_email;
  IF NOT FOUND THEN
    RETURN jsonb_build_object('ok', false, 'err', '找不到该邮箱对应的账号');
  END IF;
  IF EXISTS (SELECT 1 FROM admin_users WHERE user_id = v_target_id) THEN
    RETURN jsonb_build_object('ok', false, 'err', '不能操作管理员账号');
  END IF;

  IF p_appeal_type = 'system_rejected' THEN
    INSERT INTO device_check_bypass (user_id, bypass_reason, bypassed_by)
      VALUES (v_target_id, COALESCE(p_note,'超管直接通过：系统拒绝解封'), v_uid)
      ON CONFLICT (user_id) DO NOTHING;
    UPDATE user_approvals SET status='pending', reject_reason=NULL,
      reviewed_by=NULL, reviewed_at=NULL, created_at=now()
      WHERE user_id = v_target_id AND status IN ('rejected','system_rejected');
  ELSIF p_appeal_type = 'player_rejected' THEN
    UPDATE user_approvals
      SET status='pending', reject_reason=NULL, reviewed_by=NULL, reviewed_at=NULL, created_at=now()
      WHERE user_id = v_target_id AND status = 'rejected';
    UPDATE player_saves SET approval_status='pending', updated_at=now()
      WHERE user_id = v_target_id;
  ELSE
    -- 全量解封：同时处理两种类型
    INSERT INTO device_check_bypass (user_id, bypass_reason, bypassed_by)
      VALUES (v_target_id, COALESCE(p_note,'超管直接全量解封'), v_uid)
      ON CONFLICT (user_id) DO NOTHING;
    UPDATE user_approvals SET status='pending', reject_reason=NULL,
      reviewed_by=NULL, reviewed_at=NULL, created_at=now()
      WHERE user_id = v_target_id AND status NOT IN ('approved','pending');
    UPDATE player_saves SET approval_status='pending', updated_at=now()
      WHERE user_id = v_target_id AND approval_status NOT IN ('approved','pending');
  END IF;

  -- 插入一条自动通过的申诉记录，方便审计
  INSERT INTO account_appeals
    (target_user_id, target_email, appeal_type, appeal_reason,
     submitted_by, submitted_by_email, status, reviewed_by_email, reviewed_at)
  VALUES (v_target_id, p_target_email, COALESCE(p_appeal_type,'all'),
          COALESCE(p_note,'超管直接通过'), v_uid, v_admin_email,
          'approved', v_admin_email, now());

  PERFORM admin_log_action('direct_approve_account', v_target_id::text,
    jsonb_build_object('target_email', p_target_email, 'appeal_type', p_appeal_type, 'note', p_note));
  RETURN jsonb_build_object('ok', true, 'target_email', p_target_email);
END;
$$;

-- ═══════════════════════════════════════════════════════
-- 6. 查询所有未通过账号（供超管直接通过用）
-- ═══════════════════════════════════════════════════════
CREATE OR REPLACE FUNCTION public.admin_list_unapproved_accounts(
  p_limit int DEFAULT 50, p_offset int DEFAULT 0
)
RETURNS TABLE(
  user_id uuid, email text, status text, reject_reason text,
  device_id text, created_at timestamptz, has_pending_appeal boolean
)
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF current_admin_role() <> 'super_admin' THEN RAISE EXCEPTION 'forbidden'; END IF;
  RETURN QUERY
  SELECT ua.user_id, ua.email, ua.status, ua.reject_reason, ua.device_id, ua.created_at,
         EXISTS (
           SELECT 1 FROM account_appeals ap
           WHERE ap.target_user_id = ua.user_id AND ap.status = 'pending'
         ) AS has_pending_appeal
    FROM user_approvals ua
   WHERE ua.status IN ('rejected')
   ORDER BY ua.created_at DESC
   LIMIT p_limit OFFSET p_offset;
END;
$$;