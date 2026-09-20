// 排行榜评分工具：官职评分、综合实力评分、日榜增量累加

// 官职综合评分：职级(rank_level) × 100 + 派系职位(faction_position)加成
export function rankScore(rankLevel: number, factionPosition: string | null): number {
  const base = (rankLevel ?? 1) * 100;
  // 派系职位加成：leader +500, deputy +200, member +50
  let bonus = 0;
  if (factionPosition === 'leader') bonus = 500;
  else if (factionPosition === 'deputy') bonus = 200;
  else if (factionPosition === 'member') bonus = 50;
  return base + bonus;
}

// 综合实力评分 = 政绩×0.35 + 贡献×0.30 + 官职×0.20 + 财富×0.10 + 门生×0.05
export function powerScore(
  merit: number,
  contribution: number,
  rank: number,
  wealth: number,
  students: number,
): number {
  // 归一化各维度到可比量级（粗略缩放，保证权重有意义）
  const m = merit * 0.35;
  const c = contribution * 0.30;
  const r = rank * 0.20;
  const w = wealth * 0.10;
  const s = students * 0.05;
  return Math.round(m + c + r + w + s);
}

// 维度标识
export type Metric = 'merit' | 'contribution' | 'rank' | 'power';

export const METRICS: Metric[] = ['merit', 'contribution', 'rank', 'power'];