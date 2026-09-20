-- ═══════════════════════════════════════════════════════════════
-- 1. npc_in_use 表：管理员维护的「在册NPC名册」（独立于玩家 npc_band）
-- ═══════════════════════════════════════════════════════════════
CREATE TABLE IF NOT EXISTS public.npc_in_use (
  id         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name       text NOT NULL UNIQUE,
  source     text NOT NULL DEFAULT 'scanned',  -- scanned/manual
  created_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at timestamptz DEFAULT now()
);
ALTER TABLE public.npc_in_use ENABLE ROW LEVEL SECURITY;
CREATE POLICY "npc_in_use_read"  ON public.npc_in_use FOR SELECT TO authenticated USING (true);
CREATE POLICY "npc_in_use_admin" ON public.npc_in_use FOR ALL    TO authenticated
  USING (is_current_admin()) WITH CHECK (is_current_admin());

-- ═══════════════════════════════════════════════════════════════
-- 2. Admin RPC：扫描所有存档的NPC姓名，去重后导入 npc_in_use + npc_name_pool
--    来源：subordinates.name / npc_band.name / leadership_band.name / player_saves.boss_name
--    仅扫描已激活(approved)存档
-- ═══════════════════════════════════════════════════════════════
CREATE OR REPLACE FUNCTION public.admin_scan_npc_names()
RETURNS TABLE(scanned int, imported int, skipped int)
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_uid   uuid := auth.uid();
  v_name  text;
  v_count int := 0;
  v_imp   int := 0;
  v_skp   int := 0;
  v_surname text;
  v_given   text;
  v_names  text[];
BEGIN
  IF NOT is_current_admin() THEN RAISE EXCEPTION 'forbidden'; END IF;

  -- 收集所有去重后的NPC姓名（仅已激活存档）
  SELECT array_agg(DISTINCT n) INTO v_names FROM (
    SELECT s.name AS n FROM subordinates s
      JOIN player_saves ps ON ps.id = s.save_id
      WHERE COALESCE(ps.approval_status,'approved')='approved' AND s.name IS NOT NULL AND s.name <> ''
    UNION
    SELECT nb.name AS n FROM npc_band nb
      JOIN player_saves ps ON ps.id = nb.save_id
      WHERE COALESCE(ps.approval_status,'approved')='approved' AND nb.name IS NOT NULL AND nb.name <> ''
    UNION
    SELECT lb.name AS n FROM leadership_band lb
      JOIN player_saves ps ON ps.id = lb.save_id
      WHERE COALESCE(ps.approval_status,'approved')='approved' AND lb.name IS NOT NULL AND lb.name <> ''
    UNION
    SELECT ps.boss_name AS n FROM player_saves ps
      WHERE COALESCE(ps.approval_status,'approved')='approved' AND ps.boss_name IS NOT NULL AND ps.boss_name <> ''
  ) t;

  IF v_names IS NULL THEN
    RETURN QUERY SELECT 0, 0, 0; RETURN;
  END IF;

  v_count := array_length(v_names, 1);

  FOREACH v_name IN ARRAY v_names LOOP
    -- 写入在册NPC名册（去重，已存在则跳过）
    INSERT INTO npc_in_use (name, source, created_by)
      VALUES (v_name, 'scanned', v_uid)
      ON CONFLICT (name) DO NOTHING;
    IF NOT FOUND THEN v_skp := v_skp + 1; END IF;

    -- 拆分姓名写入词库：若首字命中姓库则拆为姓+名，否则整体作为名
    SELECT value INTO v_surname FROM npc_name_pool
      WHERE type='surname' AND char_length(value)=1
        AND left(v_name,1) = value LIMIT 1;

    IF v_surname IS NOT NULL THEN
      INSERT INTO npc_name_pool (type, value, created_by)
        VALUES ('surname', v_surname, v_uid) ON CONFLICT (type,value) DO NOTHING;
      v_given := substring(v_name from char_length(v_surname)+1);
      IF v_given <> '' THEN
        INSERT INTO npc_name_pool (type, value, created_by)
          VALUES ('given_name', v_given, v_uid) ON CONFLICT (type,value) DO NOTHING;
      END IF;
    ELSE
      INSERT INTO npc_name_pool (type, value, created_by)
        VALUES ('given_name', v_name, v_uid) ON CONFLICT (type,value) DO NOTHING;
    END IF;

    v_imp := v_imp + 1;
  END LOOP;

  PERFORM admin_log_action('scan_npc_names', NULL,
    jsonb_build_object('scanned', v_count, 'imported', v_imp, 'skipped_existing', v_skp));

  RETURN QUERY SELECT v_count, v_imp, v_skp;
END;
$$;

-- ═══════════════════════════════════════════════════════════════
-- 3. Admin RPC：列出在册NPC名册
-- ═══════════════════════════════════════════════════════════════
CREATE OR REPLACE FUNCTION public.admin_list_npc_in_use(
  p_search text DEFAULT NULL,
  p_limit  int  DEFAULT 200,
  p_offset int  DEFAULT 0
)
RETURNS TABLE(id uuid, name text, source text, created_at timestamptz)
LANGUAGE sql SECURITY DEFINER SET search_path = public AS $$
  SELECT id, name, source, created_at FROM npc_in_use
  WHERE (p_search IS NULL OR name ILIKE '%' || p_search || '%')
  ORDER BY created_at DESC
  LIMIT p_limit OFFSET p_offset;
$$;

-- ═══════════════════════════════════════════════════════════════
-- 4. Admin RPC：手动新增在册NPC名字
-- ═══════════════════════════════════════════════════════════════
CREATE OR REPLACE FUNCTION public.admin_add_npc_in_use(p_name text)
RETURNS TABLE(ok boolean, err text)
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NOT is_current_admin() THEN RETURN QUERY SELECT false, '无权限'; RETURN; END IF;
  IF length(trim(p_name)) = 0 THEN RETURN QUERY SELECT false, '名字不能为空'; RETURN; END IF;
  IF length(trim(p_name)) > 20 THEN RETURN QUERY SELECT false, '名字不超过20字符'; RETURN; END IF;
  INSERT INTO npc_in_use (name, source, created_by)
    VALUES (trim(p_name), 'manual', auth.uid())
    ON CONFLICT (name) DO NOTHING;
  IF NOT FOUND THEN RETURN QUERY SELECT false, '该名字已存在'; RETURN; END IF;
  RETURN QUERY SELECT true, NULL::text;
END;
$$;

-- ═══════════════════════════════════════════════════════════════
-- 5. Admin RPC：删除在册NPC名字
-- ═══════════════════════════════════════════════════════════════
CREATE OR REPLACE FUNCTION public.admin_delete_npc_in_use(p_id uuid)
RETURNS TABLE(ok boolean, err text)
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NOT is_current_admin() THEN RETURN QUERY SELECT false, '无权限'; RETURN; END IF;
  DELETE FROM npc_in_use WHERE id = p_id;
  IF NOT FOUND THEN RETURN QUERY SELECT false, '记录不存在'; RETURN; END IF;
  RETURN QUERY SELECT true, NULL::text;
END;
$$;

-- ═══════════════════════════════════════════════════════════════
-- 6. 授权
-- ═══════════════════════════════════════════════════════════════
GRANT EXECUTE ON FUNCTION public.admin_scan_npc_names      TO authenticated;
GRANT EXECUTE ON FUNCTION public.admin_list_npc_in_use     TO authenticated;
GRANT EXECUTE ON FUNCTION public.admin_add_npc_in_use      TO authenticated;
GRANT EXECUTE ON FUNCTION public.admin_delete_npc_in_use   TO authenticated;