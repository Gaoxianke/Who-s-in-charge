
-- 1. player_health 新增 last_monthly_care_day
ALTER TABLE player_health
  ADD COLUMN IF NOT EXISTS last_monthly_care_day INTEGER NOT NULL DEFAULT 0;

-- 2. party_school_records 新增 network_bonus + cert_name
ALTER TABLE party_school_records
  ADD COLUMN IF NOT EXISTS network_bonus INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS cert_name TEXT NOT NULL DEFAULT '';
