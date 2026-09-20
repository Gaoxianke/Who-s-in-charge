
ALTER TABLE player_saves
  ADD COLUMN IF NOT EXISTS cyl_relation      integer NOT NULL DEFAULT 30,
  ADD COLUMN IF NOT EXISTS techno_relation   integer NOT NULL DEFAULT 30,
  ADD COLUMN IF NOT EXISTS local_relation    integer NOT NULL DEFAULT 30,
  ADD COLUMN IF NOT EXISTS primary_faction   text    NOT NULL DEFAULT '';
