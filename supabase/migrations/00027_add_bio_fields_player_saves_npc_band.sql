
-- player_saves: 出生年份、出生省份、出生城市、大学名称
ALTER TABLE player_saves
  ADD COLUMN IF NOT EXISTS birth_year       int     DEFAULT 0,
  ADD COLUMN IF NOT EXISTS birth_province   text    DEFAULT '',
  ADD COLUMN IF NOT EXISTS birth_city       text    DEFAULT '',
  ADD COLUMN IF NOT EXISTS university_name  text    DEFAULT '';

-- npc_band: NPC出生省份、出生城市、大学名称、毕业年份
ALTER TABLE npc_band
  ADD COLUMN IF NOT EXISTS birth_province   text    DEFAULT '',
  ADD COLUMN IF NOT EXISTS birth_city       text    DEFAULT '',
  ADD COLUMN IF NOT EXISTS university_name  text    DEFAULT '',
  ADD COLUMN IF NOT EXISTS graduation_year  int     DEFAULT 0;
