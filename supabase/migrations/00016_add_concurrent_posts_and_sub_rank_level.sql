
-- 为 player_saves 增加兼职职务字段（text数组，存储兼职职务key列表）
ALTER TABLE player_saves
  ADD COLUMN IF NOT EXISTS concurrent_posts text[] NOT NULL DEFAULT '{}';

-- 为 subordinates 增加 rank_level 字段（对应玩家rankLevel，用于职级过滤）
ALTER TABLE subordinates
  ADD COLUMN IF NOT EXISTS rank_level integer NOT NULL DEFAULT 1;

-- 将现有下属的 rank_level 根据 sub_level 估算设置
UPDATE subordinates SET rank_level = CASE
  WHEN sub_level <= 3 THEN 3
  WHEN sub_level <= 5 THEN 6
  WHEN sub_level <= 7 THEN 9
  WHEN sub_level <= 9 THEN 11
  ELSE 12
END;
