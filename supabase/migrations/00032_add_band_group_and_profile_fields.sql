
-- npc_band表新增band_group字段，区分党委/政府/人大
ALTER TABLE npc_band
  ADD COLUMN IF NOT EXISTS band_group TEXT NOT NULL DEFAULT 'party';

-- npc_band新增完整档案字段（如已存在则跳过）
ALTER TABLE npc_band
  ADD COLUMN IF NOT EXISTS birth_year INTEGER DEFAULT 0;

-- 给subordinates补充仕途档案字段
ALTER TABLE subordinates
  ADD COLUMN IF NOT EXISTS career_history JSONB NOT NULL DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS birth_province TEXT DEFAULT '',
  ADD COLUMN IF NOT EXISTS birth_city     TEXT DEFAULT '',
  ADD COLUMN IF NOT EXISTS graduation_year INTEGER DEFAULT 0;

-- 给recruit_candidates补充完整档案字段
ALTER TABLE recruit_candidates
  ADD COLUMN IF NOT EXISTS birth_province TEXT DEFAULT '',
  ADD COLUMN IF NOT EXISTS birth_city     TEXT DEFAULT '',
  ADD COLUMN IF NOT EXISTS graduation_year INTEGER DEFAULT 0,
  ADD COLUMN IF NOT EXISTS career_history  JSONB NOT NULL DEFAULT '[]'::jsonb;

-- 索引
CREATE INDEX IF NOT EXISTS idx_npc_band_group ON npc_band(save_id, band_group);
