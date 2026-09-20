ALTER TABLE player_saves
  ADD COLUMN IF NOT EXISTS vote_support          integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS last_vote_day         integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS national_gdp          bigint  NOT NULL DEFAULT 1200000,
  ADD COLUMN IF NOT EXISTS sci_tech_invest_total integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS sci_tech_research_dir text    NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS sci_tech_progress     integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS sci_tech_last_act_day integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS discipline_last_act_day integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS kpi_ranking_year      integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS kpi_ranking_result    text    NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS last_annual_promote_year integer NOT NULL DEFAULT 0;