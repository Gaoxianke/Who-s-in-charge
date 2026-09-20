DO $$
DECLARE
  v_uid uuid := gen_random_uuid();
  v_id uuid;
BEGIN
  INSERT INTO player_saves (user_id, needs_character_creation, rank_level, rank_name, player_position,
    merit_points, moral_value, assessment_grade, tenure_years, tenure_days, max_tenure_years,
    game_days, city_name, city_gdp, city_livelihood, city_ecology, city_business, police_force,
    security_index, reform_faction, pragmatic_faction, cyl_relation, techno_relation, local_relation,
    primary_faction, faction_influence, political_wind, last_wind_cycle_day, faction_intelligence,
    faction_cooldowns, coalitions, struggle_prep, cultivate_binding, board_seats, promotion_contest,
    contest_history, faction_mandates, covert_exposed_count, defect_cooldown_until_day,
    faction_setback_until_day, mandate_reject_cooldown_until_day, last_mandate_year,
    province_seat_control, personal_contest_cooldown_until, personal_contest_history,
    province_attack_progress, contest_mode, last_promotion_cycle_id, cycle_contest_wins,
    cycle_contribution, setback_immunity, purge_count, faction_joined_day, is_flagged,
    contact_attempts, factionless_locked, faction_promotion_locked, struggle_phase,
    struggle_history, faction_echo_log, region_control, faction_treasury, cultivate_tier,
    boss_name, boss_favor, boss2_name, boss2_favor, boss3_name, boss3_favor,
    required_merit, required_tenure_years, is_promotion_available, is_event_pending,
    family_happiness, marriage_status, fund_balance, city_tax_rate, city_tax_income,
    player_name, player_gender, player_age, player_birth_day, avatar_id, school,
    police_chief_name, dominant_faction)
  VALUES (v_uid, true, 1, '乡科级科员', '乡科级科员',
    0, 80, '合格', 0, 0, 3,
    0, '青河镇', 50, 50, 50, 50, 100,
    50, 50, 50, 30, 30, 30,
    '', 0, 'balanced', 0, 0,
    '{}'::jsonb, '[]'::jsonb, '{"proxy":0,"media":0,"discord":0,"preempt":0,"successor":0}'::jsonb, '{}'::jsonb, '[]'::jsonb, NULL,
    '[]'::jsonb, '[]'::jsonb, 0, 0,
    0, 0, -1,
    '{}'::jsonb, 0, '[]'::jsonb,
    '{}'::jsonb, 'direct', 0, 0,
    0, 0, 0, 0, false,
    0, false, false, 'idle',
    '[]'::jsonb, '[]'::jsonb, '{}'::jsonb, '{}'::jsonb, '{}'::jsonb,
    '李主任', 50, '', 50, '', 50,
    100, 2, false, false,
    50, 'single', 30, 0.12, 0,
    '新官员', '男', 22, 0, 0, '普通本科',
    NULL, NULL)
  RETURNING id INTO v_id;
  RAISE NOTICE 'INSERT OK, id=%', v_id;
  -- cleanup
  DELETE FROM player_saves WHERE id = v_id;
  RAISE NOTICE 'CLEANUP OK';
END $$;