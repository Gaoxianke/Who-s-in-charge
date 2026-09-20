ALTER TABLE player_saves ADD COLUMN IF NOT EXISTS player_position text NOT NULL DEFAULT '';
UPDATE player_saves SET player_position = rank_name WHERE player_position = '';