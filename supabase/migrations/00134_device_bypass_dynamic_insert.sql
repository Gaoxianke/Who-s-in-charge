-- 将 00085 的硬编码用户改为动态查询插入（幂等，生产已存在则跳过）
INSERT INTO public.device_check_bypass (user_id, bypass_reason)
SELECT id, '管理员手动解封：同设备注册误判'
FROM auth.users WHERE email = '3104281546@qq.com'
ON CONFLICT (user_id) DO NOTHING;