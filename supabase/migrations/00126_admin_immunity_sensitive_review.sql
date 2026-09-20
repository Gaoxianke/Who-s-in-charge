-- 管理员账户赦免所有审查设定：改名/建档/触发器均对 _is_admin_user 跳过敏感词检测

-- ① player_check_name_sensitive：管理员直接返回 false（不触发）
CREATE OR REPLACE FUNCTION public.player_check_name_sensitive(p_name text)
RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT CASE WHEN _is_admin_user(auth.uid()) THEN false ELSE EXISTS (
    SELECT 1 FROM sensitive_words WHERE lower(p_name) LIKE '%' || word || '%'
  ) END;
$$;
GRANT EXECUTE ON FUNCTION public.player_check_name_sensitive(text) TO authenticated, anon;

-- ② player_check_create_save_name：管理员直接放行
CREATE OR REPLACE FUNCTION public.player_check_create_save_name(p_name text)
RETURNS TABLE(ok boolean, message text)
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_hit text;
BEGIN
  IF _is_admin_user(auth.uid()) THEN
    RETURN QUERY SELECT true, '管理员账号，已豁免审查';
    RETURN;
  END IF;
  IF p_name IS NULL OR length(trim(p_name)) = 0 THEN
    RETURN QUERY SELECT false, '姓名不能为空';
    RETURN;
  END IF;
  IF length(trim(p_name)) > 6 THEN
    RETURN QUERY SELECT false, '姓名最多6个字符';
    RETURN;
  END IF;
  SELECT word INTO v_hit FROM sensitive_words WHERE lower(trim(p_name)) LIKE '%' || word || '%' LIMIT 1;
  IF v_hit IS NOT NULL THEN
    RETURN QUERY SELECT false, '⚠️ 当前名字已违规，包含禁用词汇，请重新整改后再创建存档。';
    RETURN;
  END IF;
  RETURN QUERY SELECT true, '名字合规';
END;
$$;
GRANT EXECUTE ON FUNCTION public.player_check_create_save_name(text) TO authenticated, anon;

-- ③ player_rename_save：管理员跳过违禁词检测，直接改名
CREATE OR REPLACE FUNCTION public.player_rename_save(p_save_id uuid, p_new_name text)
RETURNS TABLE(ok boolean, code text, message text)
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_uid        uuid := auth.uid();
  v_owner      uuid;
  v_old_name   text;
  v_name       text := trim(p_new_name);
  v_hit        text;
  v_warn_count int2 := 0;
BEGIN
  IF v_uid IS NULL THEN
    RETURN QUERY SELECT false, 'NOT_AUTH', '请先登录'; RETURN;
  END IF;

  SELECT ps.user_id, ps.player_name INTO v_owner, v_old_name
  FROM player_saves ps WHERE ps.id = p_save_id;
  IF NOT FOUND   THEN RETURN QUERY SELECT false, 'NOT_FOUND', '存档不存在'; RETURN; END IF;
  IF v_owner <> v_uid THEN RETURN QUERY SELECT false, 'FORBIDDEN', '无权操作该存档'; RETURN; END IF;

  IF length(v_name) < 1 OR length(v_name) > 20 THEN
    RETURN QUERY SELECT false, 'INVALID', '名称需为 1-20 个字符'; RETURN;
  END IF;
  IF v_name = v_old_name THEN
    RETURN QUERY SELECT false, 'SAME', '名称与当前相同，无需修改'; RETURN;
  END IF;

  -- 管理员豁免：跳过违禁词检测与封号逻辑
  IF NOT _is_admin_user(v_uid) THEN
    SELECT sw.word INTO v_hit
    FROM sensitive_words sw
    WHERE lower(v_name) LIKE '%' || lower(sw.word) || '%'
    LIMIT 1;

    IF v_hit IS NOT NULL THEN
      SELECT COALESCE(ps.name_warning_count, 0) INTO v_warn_count
      FROM player_saves ps WHERE ps.id = p_save_id;

      IF v_warn_count >= 1 THEN
        UPDATE player_saves SET name_warning_count = v_warn_count + 1 WHERE id = p_save_id;
        UPDATE auth.users SET banned_until = '9999-12-31 23:59:59+00'::timestamptz WHERE id = v_uid;
        PERFORM admin_log_action('auto_ban_sensitive_name', v_uid::text,
          jsonb_build_object('attempted_name',v_name,'hit_word',v_hit,
                             'warning_count',v_warn_count+1,'save_id',p_save_id));
        RETURN QUERY SELECT false, 'BANNED',
          '您已多次使用违禁词命名，账号已被自动封禁。如有异议请在登录页提交申诉。';
      ELSE
        UPDATE player_saves SET name_warning_count = v_warn_count + 1 WHERE id = p_save_id;
        PERFORM admin_log_action('warn_sensitive_name', v_uid::text,
          jsonb_build_object('attempted_name',v_name,'hit_word',v_hit,
                             'warning_count',1,'save_id',p_save_id));
        RETURN QUERY SELECT false, 'WARNING',
          '名称含违禁词「'||v_hit||'」，操作已被拦截。⚠️ 第一次警告，再次违规将自动封号。';
      END IF;
      RETURN;
    END IF;
  END IF;

  -- 无违禁词或管理员，正常更新
  UPDATE player_saves SET player_name = v_name, updated_at = now()
  WHERE id = p_save_id AND user_id = v_uid;
  PERFORM admin_log_action('player_self_rename', p_save_id::text,
    jsonb_build_object('old_name',v_old_name,'new_name',v_name,
                       'admin_exempt', _is_admin_user(v_uid)));
  RETURN QUERY SELECT true, 'OK', '改名成功，新名称：'||v_name;
END;
$$;
GRANT EXECUTE ON FUNCTION public.player_rename_save(uuid, text) TO authenticated;

-- ④ DB 触发器兜底：管理员写入直接放行
CREATE OR REPLACE FUNCTION public.check_player_name_sensitive()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_hit text;
BEGIN
  IF NEW.player_name IS NULL OR NEW.player_name = '' THEN RETURN NEW; END IF;
  IF TG_OP = 'UPDATE' AND OLD.player_name = NEW.player_name THEN RETURN NEW; END IF;
  IF _is_admin_user(NEW.user_id) THEN RETURN NEW; END IF;
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