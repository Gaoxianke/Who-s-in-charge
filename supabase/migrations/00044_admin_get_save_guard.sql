-- 给 admin_get_save 加管理员守卫（查看存档：admin+ 权限），避免任意用户读取他人存档
CREATE OR REPLACE FUNCTION admin_get_save(p_save_id uuid)
RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF COALESCE(current_admin_role(),'') NOT IN ('admin','super_admin') THEN RAISE EXCEPTION 'forbidden: admin+ only'; END IF;
  RETURN (SELECT jsonb_build_object(
    'id', id, 'user_id', user_id, 'player_name', player_name,
    'rank_level', rank_level, 'rank_name', rank_name,
    'merit_points', merit_points, 'moral_value', moral_value,
    'city_gdp', city_gdp, 'city_livelihood', city_livelihood,
    'city_ecology', city_ecology, 'city_business', city_business,
    'security_index', security_index, 'boss_favor', boss_favor,
    'fund_balance', fund_balance, 'personal_savings', personal_savings,
    'is_retired', is_retired, 'game_over_type', game_over_type,
    'updated_at', updated_at
  ) FROM player_saves WHERE id = p_save_id);
END;
$$;
GRANT EXECUTE ON FUNCTION admin_get_save(uuid) TO authenticated;