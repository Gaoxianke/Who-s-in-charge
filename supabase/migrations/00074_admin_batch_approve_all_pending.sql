-- 一键批量通过所有 pending 状态的用户（不含 rejected）
CREATE OR REPLACE FUNCTION public.admin_batch_approve_all_pending()
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_reviewer uuid := auth.uid();
  v_uid      uuid;
  v_cnt      int := 0;
BEGIN
  IF COALESCE(current_admin_role(), '') NOT IN ('admin', 'super_admin') THEN
    RAISE EXCEPTION 'forbidden';
  END IF;

  FOR v_uid IN
    SELECT user_id FROM user_approvals WHERE status = 'pending'
  LOOP
    UPDATE user_approvals
      SET status = 'approved', reviewed_by = v_reviewer, reviewed_at = now()
      WHERE user_id = v_uid AND status = 'pending';

    IF FOUND THEN
      -- 同步更新 player_saves（若已创建角色则解锁）
      UPDATE player_saves
        SET approval_status = 'approved', updated_at = now()
        WHERE user_id = v_uid;
      v_cnt := v_cnt + 1;
    END IF;
  END LOOP;

  PERFORM admin_log_action(
    'batch_approve_all_pending',
    NULL,
    jsonb_build_object('count', v_cnt, 'approved_by', v_reviewer)
  );
  RETURN v_cnt;
END;
$function$;