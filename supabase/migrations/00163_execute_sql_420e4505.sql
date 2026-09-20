CREATE TEMPORARY TABLE _t (
  step text,
  res text
); DO $$
DECLARE v uuid := 'dddd0001-0001-0001-0001-000000000001';
BEGIN
  INSERT INTO auth.users (id,instance_id,aud,role,email,created_at,updated_at)
    VALUES(v,'00000000-0000-0000-0000-000000000000','authenticated','authenticated','zzfinal_001@test.com',now(),now());
  INSERT INTO test_codes(code,status) VALUES('ZZFIN01','unused');
  UPDATE admin_settings SET auto_approval_enabled=true;
  PERFORM set_config('request.jwt.claims',json_build_object('sub',v,'role','authenticated')::text,true);
  INSERT INTO _t VALUES('1.新用户auto',register_with_test_code('ZZFIN01','device_A'));
END $$; DO $$
DECLARE v uuid := 'dddd0001-0001-0001-0001-000000000002';
BEGIN
  INSERT INTO auth.users (id,instance_id,aud,role,email,created_at,updated_at)
    VALUES(v,'00000000-0000-0000-0000-000000000000','authenticated','authenticated','zzfinal_002@test.com',now(),now());
  INSERT INTO test_codes(code,status) VALUES('ZZFIN02','unused');
  PERFORM set_config('request.jwt.claims',json_build_object('sub',v,'role','authenticated')::text,true);
  -- 同设备 device_A，auto=true → 应该 AUTO_APPROVED（不再返回 DEVICE_ALREADY_REGISTERED）
  INSERT INTO _t VALUES('2.同设备auto',register_with_test_code('ZZFIN02','device_A'));
END $$; DO $$
DECLARE v uuid := 'dddd0001-0001-0001-0001-000000000001';
BEGIN
  INSERT INTO test_codes(code,status) VALUES('ZZFIN03','unused');
  PERFORM set_config('request.jwt.claims',json_build_object('sub',v,'role','authenticated')::text,true);
  INSERT INTO _t VALUES('3.已通过再提交',register_with_test_code('ZZFIN03','device_A'));
END $$; DO $$
DECLARE v uuid := 'dddd0001-0001-0001-0001-000000000004';
BEGIN
  INSERT INTO auth.users (id,instance_id,aud,role,email,created_at,updated_at)
    VALUES(v,'00000000-0000-0000-0000-000000000000','authenticated','authenticated','zzfinal_004@test.com',now(),now());
  INSERT INTO test_codes(code,status) VALUES('ZZFIN04','unused');
  INSERT INTO player_saves(user_id,player_name,needs_character_creation,rank_level,rank_name,player_position,city_name,boss_name)
    VALUES(v,'新官员',true,1,'科员','科员','测试镇','镇长');
  PERFORM set_config('request.jwt.claims',json_build_object('sub',v,'role','authenticated')::text,true);
  INSERT INTO _t VALUES('4.占位档不误报',register_with_test_code('ZZFIN04','device_B'));
END $$; DO $$
DECLARE v uuid := 'dddd0001-0001-0001-0001-000000000005';
BEGIN
  INSERT INTO auth.users (id,instance_id,aud,role,email,created_at,updated_at)
    VALUES(v,'00000000-0000-0000-0000-000000000000','authenticated','authenticated','zzfinal_005@test.com',now(),now());
  INSERT INTO test_codes(code,status) VALUES('ZZFIN05','unused');
  INSERT INTO player_saves(user_id,player_name,needs_character_creation,rank_level,rank_name,player_position,city_name,boss_name)
    VALUES(v,'真实玩家',false,3,'科长','科长','正式城市','局长');
  PERFORM set_config('request.jwt.claims',json_build_object('sub',v,'role','authenticated')::text,true);
  INSERT INTO _t VALUES('5.真实存档拦截',register_with_test_code('ZZFIN05','device_C'));
END $$;