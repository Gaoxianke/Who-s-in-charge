
ALTER TABLE subordinates
  ADD COLUMN IF NOT EXISTS gender text DEFAULT '男',
  ADD COLUMN IF NOT EXISTS appointed_dept text DEFAULT null;
