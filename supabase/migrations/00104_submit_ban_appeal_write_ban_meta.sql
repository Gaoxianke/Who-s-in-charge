CREATE OR REPLACE FUNCTION public.submit_ban_appeal(p_email text, p_reason text)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_email text := lower(trim(p_email));
  v_reason text := trim(p_reason);
  v_uid uuid;
  v_banned boolean;
  v_ban_type text := NULL;
  v_banned_at timestamptz := NULL;
  v_row record;
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

  -- 取该账号最近一条有效封禁记录的类型与时间
  SELECT entity_type, banned_until INTO v_ban_type, v_banned_at
  FROM banned_entities
  WHERE user_id = v_uid AND banned_until > now()
  ORDER BY created_at DESC
  LIMIT 1;

  INSERT INTO ban_appeals (email, reason, ban_type, banned_at)
  VALUES (v_email, v_reason, v_ban_type, v_banned_at);
  RETURN jsonb_build_object('ok', true);
END;
$$;