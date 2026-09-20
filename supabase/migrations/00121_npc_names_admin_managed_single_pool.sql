-- 新建 npc_names：管理员维护的完整 NPC 姓名名册（供游戏生成取用）
CREATE TABLE public.npc_names (
  id         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name       text NOT NULL UNIQUE,
  source     text NOT NULL DEFAULT 'manual',   -- manual / scanned
  created_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at timestamptz DEFAULT now()
);
ALTER TABLE public.npc_names ENABLE ROW LEVEL SECURITY;
CREATE POLICY "npc_names_read"  ON public.npc_names FOR SELECT TO authenticated USING (true);
CREATE POLICY "npc_names_admin" ON public.npc_names FOR ALL    TO authenticated
  USING (is_current_admin()) WITH CHECK (is_current_admin());

CREATE OR REPLACE FUNCTION public.admin_list_npc_names(p_search text DEFAULT NULL, p_limit int DEFAULT 300, p_offset int DEFAULT 0)
RETURNS TABLE(id uuid, name text, source text, created_at timestamptz)
LANGUAGE sql SECURITY DEFINER SET search_path = public AS $$
  SELECT id, name, source, created_at FROM npc_names
  WHERE (p_search IS NULL OR name ILIKE '%' || p_search || '%')
  ORDER BY created_at DESC
  LIMIT p_limit OFFSET p_offset;
$$;

CREATE OR REPLACE FUNCTION public.admin_add_npc_name_full(p_name text)
RETURNS TABLE(ok boolean, err text)
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NOT is_current_admin() THEN RETURN QUERY SELECT false, '无权限'; RETURN; END IF;
  IF length(trim(p_name)) = 0 THEN RETURN QUERY SELECT false, '名字不能为空'; RETURN; END IF;
  IF length(trim(p_name)) > 20 THEN RETURN QUERY SELECT false, '名字不超过20字符'; RETURN; END IF;
  INSERT INTO npc_names (name, source, created_by)
    VALUES (trim(p_name), 'manual', auth.uid())
    ON CONFLICT (name) DO NOTHING;
  IF NOT FOUND THEN RETURN QUERY SELECT false, '该名字已存在'; RETURN; END IF;
  RETURN QUERY SELECT true, NULL::text;
END;
$$;

CREATE OR REPLACE FUNCTION public.admin_delete_npc_name_full(p_id uuid)
RETURNS TABLE(ok boolean, err text)
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NOT is_current_admin() THEN RETURN QUERY SELECT false, '无权限'; RETURN; END IF;
  DELETE FROM npc_names WHERE id = p_id;
  IF NOT FOUND THEN RETURN QUERY SELECT false, '记录不存在'; RETURN; END IF;
  RETURN QUERY SELECT true, NULL::text;
END;
$$;

CREATE OR REPLACE FUNCTION public.admin_import_npc_names(p_names text[])
RETURNS TABLE(imported int, skipped int)
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_imp int := 0; v_skp int := 0; v_name text;
BEGIN
  IF NOT is_current_admin() THEN RAISE EXCEPTION 'forbidden'; END IF;
  IF p_names IS NULL THEN RETURN QUERY SELECT 0, 0; RETURN; END IF;
  FOREACH v_name IN ARRAY p_names LOOP
    v_name := trim(v_name);
    IF v_name = '' THEN CONTINUE; END IF;
    INSERT INTO npc_names (name, source, created_by)
      VALUES (v_name, 'scanned', auth.uid())
      ON CONFLICT (name) DO NOTHING;
    IF FOUND THEN v_imp := v_imp + 1; ELSE v_skp := v_skp + 1; END IF;
  END LOOP;
  PERFORM admin_log_action('import_npc_names', NULL, jsonb_build_object('imported', v_imp, 'skipped', v_skp));
  RETURN QUERY SELECT v_imp, v_skp;
END;
$$;

GRANT EXECUTE ON FUNCTION public.admin_list_npc_names(text,int,int)         TO authenticated;
GRANT EXECUTE ON FUNCTION public.admin_add_npc_name_full(text)              TO authenticated;
GRANT EXECUTE ON FUNCTION public.admin_delete_npc_name_full(uuid)           TO authenticated;
GRANT EXECUTE ON FUNCTION public.admin_import_npc_names(text[])             TO authenticated;