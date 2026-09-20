-- 修复存量存档中所有已任命下属的 sub_level 与 position 字段
-- 依据现实体系：
--   公安/人事/税务等高配部门正职 sub_level = 玩家rank_level（比普通部门高一级）
--   普通部门正职 sub_level = rank_level - 1（乡镇至少副科=2）
--   副职统一 sub_level = rank_level - 2（最低科员=1）
--   position 字段更新为实际职务名称（与 appointed_role 一致，去除历史随机值）
UPDATE subordinates s
SET
  sub_level = CASE
    WHEN s.dept_position = 'head' AND s.appointed_dept IN ('police', 'personnel', 'tax')
      THEN GREATEST(2, LEAST(12, ps.rank_level))
    WHEN s.dept_position = 'head'
      THEN GREATEST(2, LEAST(12, ps.rank_level - 1))
    WHEN s.dept_position = 'deputy'
      THEN GREATEST(1, LEAST(12, ps.rank_level - 2))
    ELSE s.sub_level
  END,
  position = CASE
    WHEN s.appointed_role IS NOT NULL THEN s.appointed_role
    ELSE s.position
  END
FROM player_saves ps
WHERE s.save_id = ps.id
  AND s.is_appointed = true
  AND s.dept_position IN ('head', 'deputy')
  AND s.transferred_city IS NULL;