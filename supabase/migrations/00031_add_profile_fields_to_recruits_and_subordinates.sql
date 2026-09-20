-- 给招募候选人表加入个人档案字段
ALTER TABLE recruit_candidates
  ADD COLUMN IF NOT EXISTS birth_year    INTEGER,
  ADD COLUMN IF NOT EXISTS university    TEXT,
  ADD COLUMN IF NOT EXISTS major         TEXT,
  ADD COLUMN IF NOT EXISTS hometown      TEXT,
  ADD COLUMN IF NOT EXISTS score         INTEGER;   -- 综合评分（系统自动计算）

-- 给下属表加入个人档案字段（录用后档案随人转入）
ALTER TABLE subordinates
  ADD COLUMN IF NOT EXISTS birth_year    INTEGER,
  ADD COLUMN IF NOT EXISTS university    TEXT,
  ADD COLUMN IF NOT EXISTS major         TEXT,
  ADD COLUMN IF NOT EXISTS hometown      TEXT;