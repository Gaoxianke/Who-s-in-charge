ALTER TABLE player_saves
  ADD COLUMN IF NOT EXISTS promo_freeze_until_day integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS patron_fail_months smallint NOT NULL DEFAULT 0;