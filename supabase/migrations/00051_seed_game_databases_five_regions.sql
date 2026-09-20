INSERT INTO game_databases (code, name, capacity_limit, is_active, is_full, sort_order)
VALUES
  ('huadong',  '华东大区', 500, true,  false, 1),
  ('huabei',   '华北大区', 500, true,  false, 2),
  ('huanan',   '华南大区', 500, true,  false, 3),
  ('xinan',    '西南大区', 500, true,  false, 4),
  ('xibei',    '西北大区', 500, true,  false, 5)
ON CONFLICT DO NOTHING;