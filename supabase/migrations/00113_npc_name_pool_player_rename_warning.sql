
-- ═══════════════════════════════════════════════════
-- 1. npc_name_pool：NPC姓名词库
-- ═══════════════════════════════════════════════════
CREATE TABLE IF NOT EXISTS public.npc_name_pool (
  id         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  type       text NOT NULL CHECK (type IN ('surname','given_name')),
  value      text NOT NULL,
  created_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at timestamptz DEFAULT now(),
  UNIQUE (type, value)
);
ALTER TABLE public.npc_name_pool ENABLE ROW LEVEL SECURITY;
CREATE POLICY "npc_name_pool_read"  ON public.npc_name_pool FOR SELECT TO authenticated USING (true);
CREATE POLICY "npc_name_pool_admin" ON public.npc_name_pool FOR ALL    TO authenticated
  USING (is_current_admin()) WITH CHECK (is_current_admin());

INSERT INTO public.npc_name_pool (type, value) VALUES
  ('surname','王'),('surname','李'),('surname','张'),('surname','刘'),('surname','陈'),
  ('surname','赵'),('surname','孙'),('surname','周'),('surname','吴'),('surname','郑'),
  ('surname','冯'),('surname','许'),('surname','韩'),('surname','唐'),('surname','曹'),
  ('surname','邓'),('surname','杨'),('surname','林'),('surname','黄'),('surname','胡'),
  ('given_name','建国'),('given_name','志远'),('given_name','国华'),('given_name','宏伟'),('given_name','一凡'),
  ('given_name','明远'),('given_name','明志'),('given_name','国强'),('given_name','兴华'),('given_name','书平'),
  ('given_name','德胜'),('given_name','正阳'),('given_name','向阳'),('given_name','全忠'),('given_name','克强'),
  ('given_name','文斌'),('given_name','大勇'),('given_name','海峰'),('given_name','志刚'),('given_name','东升'),
  ('given_name','卫国'),('given_name','思远'),('given_name','长征'),('given_name','继先'),('given_name','光辉'),
  ('given_name','福生'),('given_name','振兴'),('given_name','承志'),('given_name','永红'),('given_name','民强')
ON CONFLICT (type, value) DO NOTHING;

-- ═══════════════════════════════════════════════════
-- 2. player_saves：新增 name_warning_count
-- ═══════════════════════════════════════════════════
ALTER TABLE public.player_saves
  ADD COLUMN IF NOT EXISTS name_warning_count int2 NOT NULL DEFAULT 0;

-- ═══════════════════════════════════════════════════
-- 3. Admin RPC：列出词库（姓/名分型）
-- ═══════════════════════════════════════════════════
CREATE OR REPLACE FUNCTION public.admin_list_npc_name_pool(
  p_type   text DEFAULT NULL,
  p_limit  int  DEFAULT 200,
  p_offset int  DEFAULT 0
)
RETURNS TABLE(id uuid, type text, value text, created_at timestamptz)
LANGUAGE sql SECURITY DEFINER SET search_path = public AS $$
  SELECT id, type, value, created_at FROM npc_name_pool
  WHERE (p_type IS NULL OR type = p_type)
  ORDER BY type, value
  LIMIT p_limit OFFSET p_offset;
$$;

-- ═══════════════════════════════════════════════════
-- 4. Admin RPC：新增词条
-- ═══════════════════════════════════════════════════
CREATE OR REPLACE FUNCTION public.admin_add_npc_name(p_type text, p_value text)
RETURNS TABLE(ok boolean, err text)
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NOT is_current_admin() THEN RETURN QUERY SELECT false, '无权限'; RETURN; END IF;
  IF p_type NOT IN ('surname','given_name') THEN RETURN QUERY SELECT false, '类型错误'; RETURN; END IF;
  IF length(trim(p_value)) = 0 THEN RETURN QUERY SELECT false, '值不能为空'; RETURN; END IF;
  IF length(trim(p_value)) > 10 THEN RETURN QUERY SELECT false, '词条不超过10字符'; RETURN; END IF;
  INSERT INTO npc_name_pool (type, value, created_by)
    VALUES (p_type, trim(p_value), auth.uid())
    ON CONFLICT (type, value) DO NOTHING;
  IF NOT FOUND THEN RETURN QUERY SELECT false, '该词条已存在'; RETURN; END IF;
  RETURN QUERY SELECT true, NULL::text;
END;
$$;

-- ═══════════════════════════════════════════════════
-- 5. Admin RPC：删除词条
-- ═══════════════════════════════════════════════════
CREATE OR REPLACE FUNCTION public.admin_delete_npc_name(p_id uuid)
RETURNS TABLE(ok boolean, err text)
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NOT is_current_admin() THEN RETURN QUERY SELECT false, '无权限'; RETURN; END IF;
  DELETE FROM npc_name_pool WHERE id = p_id;
  IF NOT FOUND THEN RETURN QUERY SELECT false, '词条不存在'; RETURN; END IF;
  RETURN QUERY SELECT true, NULL::text;
END;
$$;

-- ═══════════════════════════════════════════════════
-- 6. Admin RPC：查看在册NPC（npc_band + player_saves）
-- ═══════════════════════════════════════════════════
CREATE OR REPLACE FUNCTION public.admin_list_npc_names_in_use(
  p_search text DEFAULT NULL,
  p_limit  int  DEFAULT 100,
  p_offset int  DEFAULT 0
)
RETURNS TABLE(
  npc_id         uuid,
  npc_name       text,
  position_label text,
  rank_level     int,
  save_id        uuid,
  player_name    text
)
LANGUAGE sql SECURITY DEFINER SET search_path = public AS $$
  SELECT nb.id, nb.name, nb.position_label, nb.rank_level, nb.save_id, ps.player_name
  FROM npc_band nb
  JOIN player_saves ps ON ps.id = nb.save_id
  WHERE nb.is_retired = false
    AND (p_search IS NULL OR nb.name ILIKE '%' || p_search || '%')
  ORDER BY nb.name
  LIMIT p_limit OFFSET p_offset;
$$;

-- ═══════════════════════════════════════════════════
-- 7. Player RPC：玩家自助改名（违禁词 → 警告 / 封号）
--    SECURITY DEFINER 直接操作 auth.users，绕过 admin_toggle_ban 的角色检查
-- ═══════════════════════════════════════════════════
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

  -- 违禁词检测
  SELECT sw.word INTO v_hit
  FROM sensitive_words sw
  WHERE lower(v_name) LIKE '%' || lower(sw.word) || '%'
  LIMIT 1;

  IF v_hit IS NOT NULL THEN
    SELECT COALESCE(ps.name_warning_count, 0) INTO v_warn_count
    FROM player_saves ps WHERE ps.id = p_save_id;

    IF v_warn_count >= 1 THEN
      -- 第二次及以上：直接封号（SECURITY DEFINER 可写 auth.users）
      UPDATE player_saves SET name_warning_count = v_warn_count + 1 WHERE id = p_save_id;
      UPDATE auth.users SET banned_until = '9999-12-31 23:59:59+00'::timestamptz WHERE id = v_uid;
      PERFORM admin_log_action('auto_ban_sensitive_name', v_uid::text,
        jsonb_build_object('attempted_name',v_name,'hit_word',v_hit,
                           'warning_count',v_warn_count+1,'save_id',p_save_id));
      RETURN QUERY SELECT false, 'BANNED',
        '您已多次使用违禁词命名，账号已被自动封禁。如有异议请在登录页提交申诉。';
    ELSE
      -- 第一次：警告
      UPDATE player_saves SET name_warning_count = v_warn_count + 1 WHERE id = p_save_id;
      PERFORM admin_log_action('warn_sensitive_name', v_uid::text,
        jsonb_build_object('attempted_name',v_name,'hit_word',v_hit,
                           'warning_count',1,'save_id',p_save_id));
      RETURN QUERY SELECT false, 'WARNING',
        '名称含违禁词「'||v_hit||'」，操作已被拦截。⚠️ 第一次警告，再次违规将自动封号。';
    END IF;
    RETURN;
  END IF;

  -- 无违禁词，正常更新（DB触发器二次兜底）
  UPDATE player_saves SET player_name = v_name, updated_at = now()
  WHERE id = p_save_id AND user_id = v_uid;
  PERFORM admin_log_action('player_self_rename', p_save_id::text,
    jsonb_build_object('old_name',v_old_name,'new_name',v_name));
  RETURN QUERY SELECT true, 'OK', '改名成功，新名称：'||v_name;
END;
$$;

-- ═══════════════════════════════════════════════════
-- 8. 授权
-- ═══════════════════════════════════════════════════
GRANT EXECUTE ON FUNCTION public.admin_list_npc_name_pool    TO authenticated;
GRANT EXECUTE ON FUNCTION public.admin_add_npc_name           TO authenticated;
GRANT EXECUTE ON FUNCTION public.admin_delete_npc_name        TO authenticated;
GRANT EXECUTE ON FUNCTION public.admin_list_npc_names_in_use  TO authenticated;
GRANT EXECUTE ON FUNCTION public.player_rename_save           TO authenticated;
