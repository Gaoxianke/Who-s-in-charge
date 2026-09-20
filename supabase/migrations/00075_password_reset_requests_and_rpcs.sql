-- 密码重置申请表：普通管理员发起 → 超级管理员审批（审批时可重新设置密码）
CREATE TABLE public.password_reset_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  target_user_id uuid NOT NULL,
  target_email text NOT NULL,
  target_player_name text,
  requested_by uuid NOT NULL,
  requested_by_email text NOT NULL,
  reason text,
  new_password text,
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','approved','rejected')),
  reviewed_by uuid,
  reviewed_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_prr_status ON public.password_reset_requests (status, created_at DESC);
ALTER TABLE public.password_reset_requests ENABLE ROW LEVEL SECURITY;

-- 普通管理员发起密码重置申请（不能直接改密）
CREATE OR REPLACE FUNCTION public.admin_request_password_reset(p_target_user_id uuid, p_reason text DEFAULT NULL)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_uid uuid := auth.uid();
  v_role text;
  v_target_email text;
  v_target_name text;
  v_id uuid;
BEGIN
  IF v_uid IS NULL THEN RAISE EXCEPTION 'not_authenticated'; END IF;
  SELECT role INTO v_role FROM admin_users WHERE user_id = v_uid;
  IF COALESCE(v_role,'') NOT IN ('admin','super_admin') THEN RAISE EXCEPTION 'forbidden'; END IF;

  SELECT email::text INTO v_target_email FROM auth.users WHERE id = p_target_user_id;
  IF v_target_email IS NULL THEN RAISE EXCEPTION 'target_not_found'; END IF;

  SELECT s.player_name INTO v_target_name FROM player_saves s WHERE s.user_id = p_target_user_id LIMIT 1;

  INSERT INTO password_reset_requests (target_user_id, target_email, target_player_name, requested_by, requested_by_email, reason)
  VALUES (p_target_user_id, v_target_email, v_target_name, v_uid,
          COALESCE((SELECT email::text FROM auth.users WHERE id = v_uid),''), p_reason)
  RETURNING id INTO v_id;

  PERFORM admin_log_action('request_password_reset', p_target_user_id,
    jsonb_build_object('request_id', v_id, 'target_email', v_target_email, 'reason', p_reason));
  RETURN v_id;
END;
$function$;

-- 超级管理员审批：重新设置玩家新密码并标记通过
CREATE OR REPLACE FUNCTION public.admin_approve_password_reset(p_request_id uuid, p_new_password text)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public','extensions','auth'
AS $function$
DECLARE
  v_uid uuid := auth.uid();
  v_role text;
  v_req password_reset_requests%ROWTYPE;
BEGIN
  IF v_uid IS NULL THEN RAISE EXCEPTION 'not_authenticated'; END IF;
  SELECT role INTO v_role FROM admin_users WHERE user_id = v_uid;
  IF COALESCE(v_role,'') <> 'super_admin' THEN RAISE EXCEPTION 'forbidden'; END IF;
  IF length(p_new_password) < 6 THEN RAISE EXCEPTION 'password_too_short'; END IF;

  SELECT * INTO v_req FROM password_reset_requests WHERE id = p_request_id;
  IF NOT FOUND THEN RAISE EXCEPTION 'request_not_found'; END IF;
  IF v_req.status <> 'pending' THEN RAISE EXCEPTION 'already_processed'; END IF;

  PERFORM auth.admin.update_user_by_id(v_req.target_user_id,
    jsonb_build_object('password', p_new_password));

  UPDATE password_reset_requests
    SET status='approved', new_password=p_new_password, reviewed_by=v_uid, reviewed_at=now()
    WHERE id = p_request_id;

  PERFORM admin_log_action('approve_password_reset', v_req.target_user_id,
    jsonb_build_object('request_id', p_request_id, 'target_email', v_req.target_email));
  RETURN true;
END;
$function$;

-- 超级管理员驳回
CREATE OR REPLACE FUNCTION public.admin_reject_password_reset(p_request_id uuid)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_uid uuid := auth.uid();
  v_role text;
  v_req password_reset_requests%ROWTYPE;
BEGIN
  IF v_uid IS NULL THEN RAISE EXCEPTION 'not_authenticated'; END IF;
  SELECT role INTO v_role FROM admin_users WHERE user_id = v_uid;
  IF COALESCE(v_role,'') <> 'super_admin' THEN RAISE EXCEPTION 'forbidden'; END IF;

  SELECT * INTO v_req FROM password_reset_requests WHERE id = p_request_id;
  IF NOT FOUND THEN RAISE EXCEPTION 'request_not_found'; END IF;
  IF v_req.status <> 'pending' THEN RAISE EXCEPTION 'already_processed'; END IF;

  UPDATE password_reset_requests
    SET status='rejected', reviewed_by=v_uid, reviewed_at=now()
    WHERE id = p_request_id;

  PERFORM admin_log_action('reject_password_reset', v_req.target_user_id,
    jsonb_build_object('request_id', p_request_id));
  RETURN true;
END;
$function$;

-- 列出密码重置申请（admin+ 可看）
CREATE OR REPLACE FUNCTION public.admin_list_password_reset_requests(p_status text DEFAULT NULL, p_limit int DEFAULT 50)
RETURNS TABLE(
  id uuid, target_user_id uuid, target_email text, target_player_name text,
  requested_by uuid, requested_by_email text, reason text, new_password text,
  status text, reviewed_by uuid, reviewed_at timestamptz, created_at timestamptz
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_role text;
BEGIN
  SELECT role INTO v_role FROM admin_users WHERE user_id = auth.uid();
  IF COALESCE(v_role,'') NOT IN ('admin','super_admin') THEN RAISE EXCEPTION 'forbidden'; END IF;

  RETURN QUERY
    SELECT r.id, r.target_user_id, r.target_email, r.target_player_name,
           r.requested_by, r.requested_by_email, r.reason, r.new_password,
           r.status, r.reviewed_by, r.reviewed_at, r.created_at
    FROM password_reset_requests r
    WHERE (p_status IS NULL OR r.status = p_status)
    ORDER BY r.created_at DESC
    LIMIT p_limit;
END;
$function$;

-- 超级管理员直接修改玩家密码（无条件）
CREATE OR REPLACE FUNCTION public.admin_set_player_password(p_target_user_id uuid, p_new_password text)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public','extensions','auth'
AS $function$
DECLARE
  v_uid uuid := auth.uid();
  v_role text;
BEGIN
  IF v_uid IS NULL THEN RAISE EXCEPTION 'not_authenticated'; END IF;
  SELECT role INTO v_role FROM admin_users WHERE user_id = v_uid;
  IF COALESCE(v_role,'') <> 'super_admin' THEN RAISE EXCEPTION 'forbidden'; END IF;
  IF length(p_new_password) < 6 THEN RAISE EXCEPTION 'password_too_short'; END IF;

  PERFORM auth.admin.update_user_by_id(p_target_user_id,
    jsonb_build_object('password', p_new_password));

  PERFORM admin_log_action('set_player_password', p_target_user_id,
    jsonb_build_object('target_email', (SELECT email::text FROM auth.users WHERE id = p_target_user_id)));
  RETURN true;
END;
$function$;

-- 超级管理员删除玩家账号（无条件）
CREATE OR REPLACE FUNCTION public.admin_delete_player_account(p_target_user_id uuid)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public','extensions','auth'
AS $function$
DECLARE
  v_uid uuid := auth.uid();
  v_role text;
  v_email text;
BEGIN
  IF v_uid IS NULL THEN RAISE EXCEPTION 'not_authenticated'; END IF;
  SELECT role INTO v_role FROM admin_users WHERE user_id = v_uid;
  IF COALESCE(v_role,'') <> 'super_admin' THEN RAISE EXCEPTION 'forbidden'; END IF;
  IF p_target_user_id = v_uid THEN RAISE EXCEPTION 'cannot_delete_self'; END IF;

  SELECT email::text INTO v_email FROM auth.users WHERE id = p_target_user_id;
  IF v_email IS NULL THEN RAISE EXCEPTION 'target_not_found'; END IF;

  PERFORM auth.admin.delete_user(p_target_user_id);

  PERFORM admin_log_action('delete_player_account', p_target_user_id,
    jsonb_build_object('target_email', v_email));
  RETURN true;
END;
$function$;

-- 超级管理员查看玩家明文密码：Auth 密码为哈希不可逆，返回占位说明
CREATE OR REPLACE FUNCTION public.admin_get_player_password(p_target_user_id uuid)
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public','extensions','auth'
AS $function$
DECLARE
  v_uid uuid := auth.uid();
  v_role text;
  v_email text;
BEGIN
  IF v_uid IS NULL THEN RAISE EXCEPTION 'not_authenticated'; END IF;
  SELECT role INTO v_role FROM admin_users WHERE user_id = v_uid;
  IF COALESCE(v_role,'') <> 'super_admin' THEN RAISE EXCEPTION 'forbidden'; END IF;

  SELECT email::text INTO v_email FROM auth.users WHERE id = p_target_user_id;
  IF v_email IS NULL THEN RAISE EXCEPTION 'target_not_found'; END IF;

  -- 系统密码为单向哈希存储，无法还原明文；返回账号标识供管理员核对
  RETURN v_email;
END;
$function$;