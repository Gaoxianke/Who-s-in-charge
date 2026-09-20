-- 为 subordinates 表添加 faction 列（如已存在则跳过）
ALTER TABLE subordinates ADD COLUMN IF NOT EXISTS faction TEXT DEFAULT 'pragmatic';

-- 更新已有记录中 NULL 值
UPDATE subordinates SET faction = 'pragmatic' WHERE faction IS NULL;