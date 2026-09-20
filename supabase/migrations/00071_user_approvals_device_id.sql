-- 新增设备指纹字段
ALTER TABLE public.user_approvals ADD COLUMN IF NOT EXISTS device_id text DEFAULT NULL;
CREATE INDEX IF NOT EXISTS idx_user_approvals_device_id ON public.user_approvals(device_id) WHERE device_id IS NOT NULL;