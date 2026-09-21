// 政治声望系统 v1.0
// 五维声望：政绩声望 / 人脉声望 / 廉洁声望 / 舆论声望 / 派系声望
// 核心设计：每项都是"双刃剑"——必需但不可过量

import type { PlayerSave } from '@/types/game';
import { getTier } from '@/lib/promotionConfig';

/** 声望五维度 */
export type ReputationDimension = 'merit' | 'network' | 'integrity' | 'publicity' | 'faction';

export interface ReputationState {
  merit: number;      // 政绩声望：0-100
  network: number;    // 人脉声望：0-100
  integrity: number;  // 廉洁声望：0-100
  publicity: number;    // 舆论声望：0-100
  faction: number;    // 派系声望：0-100
}

/** 每个维度的"溢出阈值"——超过此值触发负面事件 */
export const REPUTATION_OVERFLOW_THRESHOLD = 80;

/** 声望的理想均衡区间 */
export const REPUTATION_BALANCED_RANGE = { min: 40, max: 70 };

/** 声望获取系数（根据职级段权重不同） */
export const REPUTATION_GAIN_WEIGHTS: Record<number, Record<ReputationDimension, number>> = {
  1: { merit: 1.5, network: 0.8, integrity: 1.0, publicity: 0.6, faction: 0.5 }, // 基层重政绩
  2: { merit: 1.3, network: 1.0, integrity: 1.0, publicity: 0.7, faction: 0.8 }, // 县级
  3: { merit: 1.2, network: 1.1, integrity: 1.0, publicity: 0.8, faction: 1.0 }, // 市级
  4: { merit: 1.0, network: 1.3, integrity: 1.0, publicity: 1.0, faction: 1.2 }, // 省级重人脉
  5: { merit: 0.8, network: 1.5, integrity: 0.9, publicity: 1.1, faction: 1.3 }, // 高层重人脉派系
};

/** 初始化声望（新存档默认值） */
export function initReputation(): ReputationState {
  return {
    merit: 50,
    network: 45,
    integrity: 50,
    publicity: 40,
    faction: 45,
  };
}

/** 从存档读取声望（向后兼容：旧存档无此字段时用默认值） */
export function getReputationFromSave(save: PlayerSave): ReputationState {
  const rep = (save as unknown as Record<string, unknown>).reputation;
  if (rep && typeof rep === 'object') {
    const r = rep as Record<string, number>;
    return {
      merit: r.merit ?? 50,
      network: r.network ?? 45,
      integrity: r.integrity ?? 50,
      publicity: r.publicity ?? 40,
      faction: r.faction ?? 45,
    };
  }
  return initReputation();
}

/** 计算声望综合分（用于晋升竞争评分加成） */
export function computeReputationScore(rep: ReputationState, rankLevel: number): number {
  const tier = getTier(rankLevel);
  const weights = REPUTATION_GAIN_WEIGHTS[tier] ?? REPUTATION_GAIN_WEIGHTS[3];

  const raw =
    rep.merit * weights.merit +
    rep.network * weights.network +
    rep.integrity * weights.integrity +
    rep.publicity * weights.publicity +
    rep.faction * weights.faction;

  // 均衡加成：五维标准差越小，加成越高（鼓励均衡发展）
  const values = [rep.merit, rep.network, rep.integrity, rep.publicity, rep.faction];
  const avg = values.reduce((a, b) => a + b, 0) / 5;
  const variance = values.reduce((sum, v) => sum + Math.pow(v - avg, 2), 0) / 5;
  const stdDev = Math.sqrt(variance);
  const balanceBonus = Math.max(0, (20 - stdDev) / 20) * 10; // 最大+10分

  return Math.round((raw / 5) + balanceBonus);
}

/** 声望变化时的副作用检测 */
export function checkReputationOverflow(rep: ReputationState): { dimension: ReputationDimension; severity: 'warning' | 'critical' } | null {
  const dims: ReputationDimension[] = ['merit', 'network', 'integrity', 'publicity', 'faction'];
  for (const dim of dims) {
    if (rep[dim] >= 90) return { dimension: dim, severity: 'critical' };
    if (rep[dim] >= REPUTATION_OVERFLOW_THRESHOLD) return { dimension: dim, severity: 'warning' };
  }
  return null;
}

/** 月度自然衰减（防止声望无限增长） */
export function applyReputationDecay(rep: ReputationState): ReputationState {
  return {
    merit: Math.max(0, rep.merit - 0.5),
    network: Math.max(0, rep.network - 0.3),
    integrity: Math.max(0, rep.integrity - 0.2),
    publicity: Math.max(0, rep.publicity - 0.4),
    faction: Math.max(0, rep.faction - 0.3),
  };
}

/** 获取声望维度的中文名称 */
export function getReputationLabel(dim: ReputationDimension): string {
  const labels: Record<ReputationDimension, string> = {
    merit: '政绩声望',
    network: '人脉声望',
    integrity: '廉洁声望',
    publicity: '舆论声望',
    faction: '派系声望',
  };
  return labels[dim];
}

/** 获取声望溢出时的负面事件描述 */
export function getOverflowEventDescription(dim: ReputationDimension): string {
  const events: Record<ReputationDimension, string> = {
    merit: '功高盖主：政绩声望过高，引发上级警觉',
    network: '拉帮结派：人脉声望过高，被纪检部门关注',
    integrity: '不懂变通：过于清廉被视为不近人情，影响晋升',
    publicity: '爱出风头：舆论声望过高，被上级认为不安分',
    faction: '派系色彩过重：派系声望过高，被其他派系联合打压',
  };
  return events[dim];
}

/** 月度声望获取：根据本月表现计算各维度声望增量（形成"表现→声望"闭环） */
export function computeReputationGain(input: {
  meritPoints: number;      // 本月政绩增量
  popularDelta: number;     // 本民心变化（可正可负）
  bossFavorDelta: number;   // 上司好感变化
  riskValue: number;        // 贪腐风险值（越高廉洁声望越难涨）
  factionAvg: number;       // 派系关系平均值（0-100）
}): ReputationState {
  // 政绩声望：本月政绩每10点 +0.8（封顶 +4）
  const meritGain = Math.min(4, Math.max(-1, (input.meritPoints / 10) * 0.8));
  // 人脉声望：上司好感净变化（长期互动积累）
  const networkGain = Math.min(3, Math.max(-2, input.bossFavorDelta / 3));
  // 廉洁声望：风险低则微涨，风险高则大降
  const integrityGain = input.riskValue >= 50 ? -3 : Math.min(2, (50 - input.riskValue) / 25);
  // 舆论声望：民心变化直接影响口碑
  const publicityGain = Math.min(2.5, Math.max(-2, input.popularDelta / 10));
  // 派系声望：跟随派系关系（≥60才开始积累，越高越快）
  const factionGain = input.factionAvg >= 60 ? Math.min(3, (input.factionAvg - 60) / 15) : -0.5;

  return { merit: meritGain, network: networkGain, integrity: integrityGain, publicity: publicityGain, faction: factionGain };
}

/** 将声望增量应用到现有声望（0-100 夹紧） */
export function applyReputationGain(rep: ReputationState, gain: ReputationState): ReputationState {
  const clamp = (v: number) => Math.max(0, Math.min(100, v));
  return {
    merit:     clamp(rep.merit + gain.merit),
    network:   clamp(rep.network + gain.network),
    integrity: clamp(rep.integrity + gain.integrity),
    publicity: clamp(rep.publicity + gain.publicity),
    faction:   clamp(rep.faction + gain.faction),
  };
}
