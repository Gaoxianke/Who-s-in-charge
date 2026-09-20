-- ① 下属干部姓名同步
CREATE OR REPLACE FUNCTION public.sync_subordinate_name_to_roster()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NEW.name IS NOT NULL AND length(trim(NEW.name)) > 0 THEN
    INSERT INTO npc_names (name, source) VALUES (trim(NEW.name), 'auto') ON CONFLICT (name) DO NOTHING;
  END IF;
  RETURN NEW;
END;
$$;
DROP TRIGGER IF EXISTS trg_sync_subordinate_name ON public.subordinates;
CREATE TRIGGER trg_sync_subordinate_name
  AFTER INSERT ON public.subordinates
  FOR EACH ROW EXECUTE FUNCTION public.sync_subordinate_name_to_roster();

-- ② boss_name 同步
CREATE OR REPLACE FUNCTION public.sync_boss_name_to_roster()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NEW.boss_name IS NOT NULL AND length(trim(NEW.boss_name)) > 0 THEN
    INSERT INTO npc_names (name, source) VALUES (trim(NEW.boss_name), 'auto') ON CONFLICT (name) DO NOTHING;
  END IF;
  RETURN NEW;
END;
$$;
DROP TRIGGER IF EXISTS trg_sync_boss_name ON public.player_saves;
CREATE TRIGGER trg_sync_boss_name
  AFTER INSERT OR UPDATE OF boss_name ON public.player_saves
  FOR EACH ROW EXECUTE FUNCTION public.sync_boss_name_to_roster();

-- ③ 管理员手动全量回填
CREATE OR REPLACE FUNCTION public.admin_sync_npc_names_from_saves()
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_imported int := 0; v_total int := 0;
BEGIN
  IF NOT is_current_admin() THEN RAISE EXCEPTION 'forbidden'; END IF;
  INSERT INTO npc_names (name, source)
  SELECT DISTINCT trim(n) FROM (
    SELECT name AS n FROM subordinates WHERE name IS NOT NULL AND length(trim(name)) > 0
    UNION
    SELECT boss_name AS n FROM player_saves WHERE boss_name IS NOT NULL AND length(trim(boss_name)) > 0
  ) s
  ON CONFLICT (name) DO NOTHING;
  GET DIAGNOSTICS v_imported = ROW_COUNT;
  SELECT count(*) INTO v_total FROM npc_names;
  PERFORM admin_log_action('sync_npc_names_from_saves', NULL,
    jsonb_build_object('imported', v_imported, 'total', v_total));
  RETURN jsonb_build_object('imported', v_imported, 'total', v_total);
END;
$$;
GRANT EXECUTE ON FUNCTION public.admin_sync_npc_names_from_saves() TO authenticated;