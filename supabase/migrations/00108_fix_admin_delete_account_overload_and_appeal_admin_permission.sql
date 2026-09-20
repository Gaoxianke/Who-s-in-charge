-- ① 修复 admin_delete_account 重载歧义：删除旧的单参数版本，只保留带 reason 的版本
DROP FUNCTION public.admin_delete_account(uuid);

-- ② 放宽账号申诉审批权限：admin 及以上均可（原 super_admin only）
CREATE OR REPLACE FUNCTION public.admin_approve_appeal(p_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_role   text := current_admin_role();
  v_uid    uuid := auth.uid();
  v_email  text;
  v_appeal account_appeals%ROWTYPE;
BEGIN
  IF COALESCE(v_role,'') NOT IN ('admin','super_admin') THEN RAISE EXCEPTION 'forbidden'; END IF;
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

DROP FUNCTION public.admin_reject_appeal(uuid, text);

CREATE FUNCTION public.admin_reject_appeal(p_id uuid, p_reason text)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_role text := current_admin_role();
  v_uid  uuid := auth.uid();
  v_email text;
BEGIN
  IF COALESCE(v_role,'') NOT IN ('admin','super_admin') THEN RAISE EXCEPTION 'forbidden'; END IF;
  IF NOT EXISTS (SELECT 1 FROM account_appeals WHERE id = p_id AND status = 'pending') THEN
    RETURN jsonb_build_object('ok', false, 'err', '申诉不存在或已处理');
  END IF;
  SELECT email::text INTO v_email FROM auth.users WHERE id = v_uid;
  UPDATE account_appeals
    SET status='rejected', reject_reason=p_reason, reviewed_by_email=v_email, reviewed_at=now()
    WHERE id = p_id AND status='pending';
  RETURN jsonb_build_object('ok', true);
END;
$$;