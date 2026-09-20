-- 初建存档敏感词两段式熔断：首次拦截并警告，第二次直接封号
-- 计数持久化在 auth.users.raw_user_meta_data，跨存档创建/删除生效
CREATE OR REPLACE FUNCTION public.player_check_create_save_name(p_name text)
RETURNS TABLE(ok boolean, message text)
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_uid  uuid := auth.uid();
  v_name text := trim(p_name);
  v_hit  text;
  v_cnt  int;
BEGIN
  -- 管理员豁免
  IF v_uid IS NOT NULL AND _is_admin_user(v_uid) THEN
    RETURN QUERY SELECT true, '管理员账号，已豁免审查';
    RETURN;
  END IF;

  IF v_name IS NULL OR length(v_name) = 0 THEN
    RETURN QUERY SELECT false, '姓名不能为空';
    RETURN;
  END IF;
  IF length(v_name) > 6 THEN
    RETURN QUERY SELECT false, '姓名最多6个字符';
    RETURN;
  END IF;

  SELECT word INTO v_hit FROM sensitive_words
  WHERE lower(v_name) LIKE '%' || word || '%' LIMIT 1;

  IF v_hit IS NULL THEN
    RETURN QUERY SELECT true, '名字合规';
    RETURN;
  END IF;

  -- 命中敏感词：读取累计违规次数（跨存档）
  SELECT COALESCE(((raw_user_meta_data->>'name_warning_count')::int), 0)
    INTO v_cnt FROM auth.users WHERE id = v_uid;
  v_cnt := COALESCE(v_cnt, 0);

  IF v_cnt >= 1 THEN
    -- 第二次违规：直接封号
    UPDATE auth.users
      SET raw_user_meta_data = COALESCE(raw_user_meta_data, '{}'::jsonb)
        || jsonb_build_object('name_warning_count', v_cnt + 1),
          banned_until = '9999-12-31 23:59:59+00'::timestamptz
      WHERE id = v_uid;
    PERFORM admin_log_action('auto_ban_sensitive_name_create', v_uid::text,
      jsonb_build_object('attempted_name', v_name, 'hit_word', v_hit,
                         'warning_count', v_cnt + 1, 'scene', 'create_save'));
    RETURN QUERY SELECT false,
      '您已多次使用违禁词命名，账号已被自动封禁。如有异议请在登录页提交申诉。';
  ELSE
    -- 首次违规：拦截并警告
    UPDATE auth.users
      SET raw_user_meta_data = COALESCE(raw_user_meta_data, '{}'::jsonb)
        || jsonb_build_object('name_warning_count', v_cnt + 1)
      WHERE id = v_uid;
    PERFORM admin_log_action('warn_sensitive_name_create', v_uid::text,
      jsonb_build_object('attempted_name', v_name, 'hit_word', v_hit,
                         'warning_count', 1, 'scene', 'create_save'));
    RETURN QUERY SELECT false,
      '⚠️ 该名称包含禁用词汇，不可使用。请更换名称后重新创建存档。再次违规将直接封号。';
  END IF;
END;
$$;
GRANT EXECUTE ON FUNCTION public.player_check_create_save_name(text) TO authenticated, anon;