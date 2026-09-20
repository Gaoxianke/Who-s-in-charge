
-- 企业表新增规模、从业人数、引进月份字段
ALTER TABLE enterprises
  ADD COLUMN IF NOT EXISTS scale TEXT NOT NULL DEFAULT 'small',
  ADD COLUMN IF NOT EXISTS employee_count INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS introduced_month INTEGER NOT NULL DEFAULT 0;

-- 补齐存量数据
UPDATE enterprises
SET
  scale = CASE
    WHEN invest_amount >= 3000 THEN 'large'
    WHEN invest_amount >= 1200 THEN 'medium'
    ELSE 'small'
  END,
  employee_count = CASE
    WHEN invest_amount >= 3000 THEN 300
    WHEN invest_amount >= 1200 THEN 100
    ELSE 25
  END,
  introduced_month = GREATEST(1, FLOOR(founded_day / 30)::INTEGER + 1)
WHERE scale = 'small' AND employee_count = 0;
