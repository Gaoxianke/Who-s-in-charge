DO $$
DECLARE
  v_save player_saves%ROWTYPE;
  v_today date := (now() at time zone 'Asia/Shanghai')::date;
  v_new integer;
BEGIN
  SELECT * INTO v_save FROM player_saves ORDER BY created_at DESC LIMIT 1;
  IF v_save.id IS NULL THEN RAISE NOTICE 'no save found, skip'; RETURN; END IF;

  -- 注册为上榜存档
  INSERT INTO player_profiles (user_id, leaderboard_save_id, region_code)
  VALUES (v_save.user_id, v_save.id, 'test_region')
  ON CONFLICT (user_id) DO UPDATE SET leaderboard_save_id = EXCLUDED.leaderboard_save_id, region_code = EXCLUDED.region_code;

  -- 累加两次
  PERFORM record_daily_gain(v_save.id, 'merit', 10);
  SELECT record_daily_gain(v_save.id, 'merit', 5) INTO v_new;
  RAISE NOTICE 'accumulated merit delta = % (expect 15)', v_new;

  -- 验证记录存在
  PERFORM 1 FROM daily_scores WHERE save_id = v_save.id AND metric='merit' AND score_date = v_today;
  RAISE NOTICE 'daily_scores row exists';

  -- 清理测试数据
  DELETE FROM daily_scores WHERE save_id = v_save.id;
  DELETE FROM player_profiles WHERE region_code = 'test_region';
  RAISE NOTICE 'cleanup done';
END $$;