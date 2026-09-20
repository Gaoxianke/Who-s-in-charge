DO $$ DECLARE v uuid := 'aaaaaaaa-0001-0001-0001-000000000001'; BEGIN
  INSERT INTO auth.users (id,instance_id,aud,role,email) VALUES (v,'00000000-0000-0000-0000-000000000000','authenticated','authenticated','t1@test.com');
  INSERT INTO test_codes(code,status) VALUES('T0001','unused');
  PERFORM set_config('request.jwt.claims',json_build_object('sub',v,'role','authenticated')::text,true);
  RAISE NOTICE '手动模式新用户: %', register_with_test_code('T0001','devA','');
  RAISE EXCEPTION 'rollback_t1';
EXCEPTION WHEN OTHERS THEN IF sqlerrm LIKE '%rollback_t1%' THEN NULL; ELSE RAISE; END IF;
END $$; DO $$ DECLARE v uuid := 'aaaaaaaa-0002-0002-0002-000000000002'; BEGIN
  INSERT INTO auth.users (id,instance_id,aud,role,email) VALUES (v,'00000000-0000-0000-0000-000000000000','authenticated','authenticated','t2@test.com');
  INSERT INTO test_codes(code,status) VALUES('T0002','unused');
  UPDATE admin_settings SET auto_approval_enabled=true;
  PERFORM set_config('request.jwt.claims',json_build_object('sub',v,'role','authenticated')::text,true);
  RAISE NOTICE 'auto模式无冲突: %', register_with_test_code('T0002','devB','');
  RAISE EXCEPTION 'rollback_t2';
EXCEPTION WHEN OTHERS THEN
  UPDATE admin_settings SET auto_approval_enabled=false;
  IF sqlerrm LIKE '%rollback_t2%' THEN NULL; ELSE RAISE; END IF;
END $$; DO $$ DECLARE v1 uuid := 'aaaaaaaa-0003-0003-0003-000000000003'; v2 uuid := 'aaaaaaaa-0003-0003-0003-000000000004'; BEGIN
  INSERT INTO auth.users (id,instance_id,aud,role,email) VALUES (v1,'00000000-0000-0000-0000-000000000000','authenticated','authenticated','t3a@test.com'),(v2,'00000000-0000-0000-0000-000000000000','authenticated','authenticated','t3b@test.com');
  INSERT INTO test_codes(code,status) VALUES('T0003','unused'),('T0004','unused');
  INSERT INTO user_approvals(user_id,email,status,device_id) VALUES(v1,'t3a@test.com','approved','devC');
  UPDATE admin_settings SET auto_approval_enabled=true;
  PERFORM set_config('request.jwt.claims',json_build_object('sub',v2,'role','authenticated')::text,true);
  RAISE NOTICE 'auto模式设备重复: %', register_with_test_code('T0003','devC','');
  RAISE EXCEPTION 'rollback_t3';
EXCEPTION WHEN OTHERS THEN
  UPDATE admin_settings SET auto_approval_enabled=false;
  IF sqlerrm LIKE '%rollback_t3%' THEN NULL; ELSE RAISE; END IF;
END $$;