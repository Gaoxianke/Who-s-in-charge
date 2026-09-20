-- ① 管理员批量添加敏感词
CREATE OR REPLACE FUNCTION public.admin_batch_add_sensitive_words(p_words text[])
RETURNS TABLE(imported int, skipped int, errors text)
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_imported int := 0; v_skipped int := 0;
  v_word text; v_email text;
BEGIN
  IF NOT is_current_admin() THEN RAISE EXCEPTION 'forbidden'; END IF;
  SELECT email INTO v_email FROM auth.users WHERE id = auth.uid();
  FOREACH v_word IN ARRAY p_words LOOP
    v_word := trim(v_word);
    CONTINUE WHEN length(v_word) = 0 OR length(v_word) > 50;
    IF EXISTS (SELECT 1 FROM sensitive_words WHERE word = lower(v_word)) THEN
      v_skipped := v_skipped + 1;
    ELSE
      INSERT INTO sensitive_words(word, created_by, created_by_email) VALUES (lower(v_word), auth.uid(), v_email);
      v_imported := v_imported + 1;
    END IF;
  END LOOP;
  PERFORM admin_log_action('batch_add_sensitive_words', NULL, jsonb_build_object('imported', v_imported, 'skipped', v_skipped));
  RETURN QUERY SELECT v_imported, v_skipped, NULL::text;
END;
$$;
GRANT EXECUTE ON FUNCTION public.admin_batch_add_sensitive_words(text[]) TO authenticated;

-- ② 玩家检测姓名是否含敏感词（仅返回boolean，不暴露具体词汇）
CREATE OR REPLACE FUNCTION public.player_check_name_sensitive(p_name text)
RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (
    SELECT 1 FROM sensitive_words
    WHERE lower(p_name) LIKE '%' || word || '%'
  );
$$;
GRANT EXECUTE ON FUNCTION public.player_check_name_sensitive(text) TO authenticated, anon;

-- ③ 加强 character create 中的姓名敏感词检测
--    completeCharacterCreation 最终写入 player_saves.player_name，已有DB触发器兜底
--    此处额外创建 RPC player_complete_character_creation_safe，供前端调用时提前拦截
CREATE OR REPLACE FUNCTION public.player_check_create_save_name(p_name text)
RETURNS TABLE(ok boolean, message text)
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_hit text;
BEGIN
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