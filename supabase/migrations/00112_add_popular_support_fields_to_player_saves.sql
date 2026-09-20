
ALTER TABLE player_saves
  ADD COLUMN IF NOT EXISTS popular_support int2 DEFAULT 50,
  ADD COLUMN IF NOT EXISTS popular_log jsonb DEFAULT '[]',
  ADD COLUMN IF NOT EXISTS popular_action_cooldowns jsonb DEFAULT '{}';

-- 初始化已有存档的民心值为50（创建时统一值）
UPDATE player_saves SET popular_support = 50 WHERE popular_support IS NULL;
