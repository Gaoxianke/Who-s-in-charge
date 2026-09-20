-- ══════════════════════════════════════════
-- 1. 封禁申诉表 ban_appeals
-- ════════════════════════════════════════════════
CREATE TABLE public.ban_appeals (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  email text NOT NULL,
  reason text NOT NULL,
  status text NOT NULL DEFAULT 'pending',
  review_note text,
  reviewed_by uuid,
  reviewed_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_ban_appeals_status ON public.ban_appeals(status, created_at DESC);
CREATE INDEX idx_ban_appeals_email ON public.ban_appeals(email);
ALTER TABLE public.ban_appeals ENABLE ROW LEVEL SECURITY;

-- ══════════════════════════════════════════
-- 2. 管理员账号判定（永不封禁）
-- ══════════════════════════════════════════
CREATE OR REPLACE FUNCTION public._is_admin_user(p_uid uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM admin_users WHERE user_id = p_uid);
$$;

-- ══════════════════════════════════════════
-- 3. 公众提交封禁申诉（无需登录）
-- ══════════════════════════════════════════
CREATE OR REPLACE FUNCTION public.submit_ban_appeal(p_email text, p_reason text)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, auth AS $$
DECLARE
  v_email text := lower(trim(p_email));
  v_reason text := trim(p_reason);
  v_uid uuid;
  v_banned boolean;
BEGIN
  IF v_email = '' THEN
    RETURN jsonb_build_object('ok', false, 'err', '请输入被封禁的账号邮箱');
  END IF;
  IF length(v_reason) < 5 THEN
    RETURN jsonb_build_object('ok', false, 'err', '请填写不少于 5 字的申诉理由');
  END IF;
  SELECT id INTO v_uid FROM auth.users WHERE lower(email) = v_email;
  IF v_uid IS NULL THEN
    RETURN jsonb_build_object('ok', false, 'err', '该账号不存在，请检查邮箱');
  END IF;
  SELECT (banned_until IS NOT NULL AND banned_until > now()) INTO v_banned FROM auth.users WHERE id = v_uid;
  IF NOT v_banned THEN
    RETURN jsonb_build_object('ok', false, 'err', '该账号当前未被封禁');
  END IF;
  IF EXISTS (SELECT 1 FROM ban_appeals WHERE email = v_email AND status = 'pending') THEN
    RETURN jsonb_build_object('ok', false, 'err', '您已有一条待审核的申诉，请耐心等待处理');
  END IF;
  INSERT INTO ban_appeals (email, reason) VALUES (v_email, v_reason);
  RETURN jsonb_build_object('ok', true);
END;
$$;

-- ══════════════════════════════════════════
-- 4. 管理员查看申诉列表
-- ══════════════════════════════════════════
CREATE OR REPLACE FUNCTION public.admin_list_ban_appeals(p_status text DEFAULT NULL, p_limit int DEFAULT 50, p_offset int DEFAULT 0)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_rows jsonb;
BEGIN
  IF COALESCE(current_admin_role(),'') NOT IN ('admin','super_admin') THEN RAISE EXCEPTION 'forbidden'; END IF;
  SELECT jsonb_agg(t) INTO v_rows FROM (
    SELECT id, email, reason, status, review_note, reviewed_by, reviewed_at, created_at
    FROM ban_appeals
    WHERE (p_status IS NULL OR status = p_status)
    ORDER BY created_at DESC
    LIMIT p_limit OFFSET p_offset
  ) t;
  RETURN COALESCE(v_rows, '[]'::jsonb);
END;
$$;

-- ══════════════════════════════════════════
-- 5. 超管审核申诉（通过即解封）
-- ══════════════════════════════════════════
CREATE OR REPLACE FUNCTION public.admin_review_ban_appeal(p_id uuid, p_approve boolean, p_note text DEFAULT NULL)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, auth AS $$
DECLARE
  v_appeal ban_appeals%ROWTYPE;
  v_uid uuid;
BEGIN
  IF COALESCE(current_admin_role(),'') <> 'super_admin' THEN RAISE EXCEPTION 'forbidden'; END IF;
  SELECT * INTO v_appeal FROM ban_appeals WHERE id = p_id;
  IF NOT FOUND THEN RETURN jsonb_build_object('ok', false, 'err', '申诉不存在'); END IF;
  IF v_appeal.status <> 'pending' THEN RETURN jsonb_build_object('ok', false, 'err', '该申诉已处理'); END IF;

  IF p_approve THEN
    SELECT id INTO v_uid FROM auth.users WHERE lower(email) = v_appeal.email;
    UPDATE auth.users SET banned_until = NULL WHERE lower(email) = v_appeal.email;
    DELETE FROM banned_entities WHERE user_id = v_uid OR lower(email) = v_appeal.email;
    UPDATE ban_appeals SET status='approved', review_note=p_note, reviewed_by=auth.uid(), reviewed_at=now() WHERE id=p_id;
  ELSE
    UPDATE ban_appeals SET status='rejected', review_note=p_note, reviewed_by=auth.uid(), reviewed_at=now() WHERE id=p_id;
  END IF;
  RETURN jsonb_build_object('ok', true);
END;
$$;

-- ══════════════════════════════════════════
-- 6. admin_delete_account 拒绝封禁管理员账号
-- ══════════════════════════════════════════
CREATE OR REPLACE FUNCTION public.admin_delete_account(p_user_id uuid, p_reason text DEFAULT NULL::text)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, auth AS $$
DECLARE
  v_email text;
  v_dev text;
  v_ip text;
  v_ban_until timestamptz := now() + interval '100 years';
  v_is_admin boolean;
  v_actor text;
BEGIN
  IF COALESCE(current_admin_role(),'') NOT IN ('admin','super_admin') THEN RAISE EXCEPTION 'forbidden'; END IF;
  IF p_user_id = auth.uid() THEN RAISE EXCEPTION '不能删除自己'; END IF;
  v_is_admin := _is_admin_user(p_user_id);
  IF v_is_admin THEN
    RAISE EXCEPTION '管理员账号不可封禁或删除';
  END IF;
  SELECT email::text INTO v_email FROM auth.users WHERE id = p_user_id;
  SELECT device_id, ip_address INTO v_dev, v_ip FROM user_approvals WHERE user_id = p_user_id LIMIT 1;
  SELECT email INTO v_actor FROM admin_users WHERE user_id = auth.uid();

  UPDATE auth.users SET banned_until = v_ban_until WHERE id = p_user_id;
  INSERT INTO banned_entities(user_id,email,entity_type,entity_value,ban_reason,banned_by_email,banned_until)
  VALUES
    (p_user_id,v_email,'user',p_user_id::text,COALESCE(p_reason,'管理员删除账号'),v_actor,v_ban_until),
    (p_user_id,v_email,'email',lower(trim(COALESCE(v_email,''))),COALESCE(p_reason,'管理员删除账号'),v_actor,v_ban_until)
  ON CONFLICT DO NOTHING;
  IF v_dev IS NOT NULL AND v_dev NOT IN ('unknown','web') AND NOT _is_private_ip(v_ip) THEN
    INSERT INTO banned_entities(user_id,email,entity_type,entity_value,ban_reason,banned_by_email,banned_until)
    VALUES
      (p_user_id,v_email,'device',v_dev,COALESCE(p_reason,'管理员删除账号'),v_actor,v_ban_until),
      (p_user_id,v_email,'ip',v_ip,COALESCE(p_reason,'管理员删除账号'),v_actor,v_ban_until)
    ON CONFLICT DO NOTHING;
  END IF;
  INSERT INTO audit_logs(actor_email, action, target_email, details)
  VALUES(v_actor, 'delete_account', v_email,
         jsonb_build_object('reason', p_reason, 'banned', true, 'device', v_dev, 'ip', v_ip)::text);
  RETURN jsonb_build_object('ok', true);
END;
$$;

-- ══════════════════════════════════════════
-- 7. 解封 W2794045093@hotmail.com（已是超管）
-- ══════════════════════════════════════════
UPDATE auth.users SET banned_until = NULL WHERE email = 'W2794045093@hotmail.com';
DELETE FROM banned_entities WHERE email = 'W2794045093@hotmail.com';