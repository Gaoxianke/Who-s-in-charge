
-- boss_tasks: 新增 boss_level(1/2/3) 和 is_postponed
ALTER TABLE boss_tasks
  ADD COLUMN IF NOT EXISTS boss_level integer NOT NULL DEFAULT 1,
  ADD COLUMN IF NOT EXISTS is_postponed boolean NOT NULL DEFAULT false;

-- player_saves: 新增配偶关系值与结婚纪念日
ALTER TABLE player_saves
  ADD COLUMN IF NOT EXISTS spouse_relation_value integer NOT NULL DEFAULT 50,
  ADD COLUMN IF NOT EXISTS marriage_day integer NOT NULL DEFAULT 0;

-- welfare_actions: 新增资金消耗字段
ALTER TABLE welfare_actions
  ADD COLUMN IF NOT EXISTS cost_fund integer NOT NULL DEFAULT 0;
