-- 修复：admin_log_action 第二参数为 text，传入 uuid 会因无法隐式转换而报错，显式 ::text 转换
CREATE OR REPLACE FUNCTION public.admin_clear_player_save(p_target_user_id uuid)
RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public','extensions','auth'
AS $$
DECLARE
  v_uid uuid := auth.uid();
  v_role text;
  v_email text;
  v_save_id uuid;
  v_name text;
  v_rank int;
BEGIN
  IF v_uid IS NULL THEN RAISE EXCEPTION 'not_authenticated'; END IF;
  SELECT role INTO v_role FROM admin_users WHERE user_id = v_uid;
  IF COALESCE(v_role,'') NOT IN ('admin','super_admin') THEN RAISE EXCEPTION 'forbidden'; END IF;
  IF p_target_user_id = v_uid THEN RAISE EXCEPTION 'cannot_clear_self'; END IF;
  IF EXISTS(SELECT 1 FROM admin_users WHERE user_id = p_target_user_id) THEN RAISE EXCEPTION 'cannot clear admin account'; END IF;

  SELECT email::text INTO v_email FROM auth.users WHERE id = p_target_user_id;
  IF v_email IS NULL THEN RAISE EXCEPTION 'target_not_found'; END IF;

  SELECT id, player_name, rank_level INTO v_save_id, v_name, v_rank
    FROM player_saves WHERE user_id = p_target_user_id AND deleted_at IS NULL LIMIT 1;

  IF v_save_id IS NOT NULL THEN
    DELETE FROM npc_band       WHERE save_id = v_save_id;
    DELETE FROM npc_posts      WHERE save_id = v_save_id;
    DELETE FROM npc_candidates WHERE save_id = v_save_id;
  END IF;
  DELETE FROM player_saves WHERE user_id = p_target_user_id;

  PERFORM admin_log_action('clear_player_save', p_target_user_id::text,
    jsonb_build_object('target_email', v_email,
                       'player_name', v_name,
                       'rank_level', v_rank,
                       'save_id', v_save_id));

  RETURN jsonb_build_object('ok', true, 'email', v_email, 'player_name', v_name, 'rank_level', v_rank);
END;
$$;

GRANT EXECUTE ON FUNCTION public.admin_clear_player_save(uuid) TO authenticated;