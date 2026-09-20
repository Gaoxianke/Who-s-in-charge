
-- secretary表：新增任命下属为专属秘书相关字段
ALTER TABLE secretary
  ADD COLUMN IF NOT EXISTS sub_id uuid REFERENCES subordinates(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS is_appointed boolean NOT NULL DEFAULT false;
