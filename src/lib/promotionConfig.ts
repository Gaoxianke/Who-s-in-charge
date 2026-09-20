// 晋升系统 v2 统一配置常量（参考《晋升机制设计文档》）
// 所有数值与规则集中于此，前端只读渲染，禁止硬编码

// ── 职级段划分（tier）──
export const TIER_BY_RANK: Record<number, number> = {
  1: 1, 2: 1, 3: 1,
  4: 2, 5: 2, 6: 2,
  7: 3, 8: 3, 9: 3,
  10: 4, 11: 4,
  12: 5, 13: 5, 14: 5, 15: 5,
};
export const TIER_NAMES: Record<number, string> = {
  1: '基层', 2: '区县级', 3: '市级', 4: '省级', 5: '高层',
};

export function getTier(rankLevel: number): number {
  return TIER_BY_RANK[rankLevel] ?? 1;
}

// ── 适龄区间 ──
export interface AgeRange {
  ageMin: number; ageMax: number; bestMin: number; bestMax: number; retireAge: number;
}
export const AGE_RANGES: Record<number, AgeRange> = {
  1: { ageMin: 22, ageMax: 35, bestMin: 26, bestMax: 30, retireAge: 55 },
  2: { ageMin: 30, ageMax: 45, bestMin: 34, bestMax: 40, retireAge: 58 },
  3: { ageMin: 38, ageMax: 52, bestMin: 42, bestMax: 48, retireAge: 60 },
  4: { ageMin: 45, ageMax: 58, bestMin: 48, bestMax: 53, retireAge: 62 },
  5: { ageMin: 50, ageMax: 70, bestMin: 55, bestMax: 60, retireAge: 70 }, // P5：tier5 退休放宽至 70 岁
};

// ── 年龄红利 ──
export const AGE_BONUS = { bestBonus: 5, lowAgeBonus: 10, overAgeGraceYears: 5 };

// ── 民心门槛（按 tier）──
export const POPULAR_THRESHOLD: Record<number, number> = {
  1: 30, 2: 35, 3: 40, 4: 45, 5: 50,
};

// ── 上级认可度门槛 ──
export const FAVOR_THRESHOLD = { min: 50, breakMin: 70, closeFlag: 85, obstructMax: 40 };

// ── 竞争综合评分权重 ──
export const COMPETITION_WEIGHTS = { merit: 0.4, popular: 0.3, assess: 0.2, favor: 0.1 };

// ── 基层任期要求 ──
export const BASE_TENURE = { requireYears: 5, factorLt5: 0.8, factorLt3: 0.9 };

// ── 破格规则 ──
export const BREAK_RULE = {
  meritMultiple: 1.5,
  minYears: 1,
  observeDays: 90,
  extendObserveDays: 180,
  favorMin: 70,
  lowPopularThreshold: 40,
  lowPopularPenalty: 10,
  publicOpinion: 20,
  maxUsePerTier: 1,
};

// ── 考评加速减免比例 ──
export const ASSESS_ACCEL = { excellent: 0.10, excellent2: 0.125, special: 0.13, special2: 0.15 };

// ── 晋升冻结与扎根期 ──
export const FREEZE_RULES = {
  popularFreeze: 30,
  popularEnd: 0,
  frozenDays: 180,
  rootingDays: 90,
  rootingExtendDays: 180,
  rootingExtendThreshold: 30,
  promotePopularCost: 5,
};

// ── 岗位编制 ──
export const POST_QUOTA: Record<number, number> = { 1: 6, 2: 5, 3: 4, 4: 3, 5: 42 };
export const POST_COMPOSITION: Record<number, string[]> = {
  1: ['基层职员', '基层职员', '基层副职', '基层副职', '基层正职', '专项岗'],
  2: ['副职', '副职', '正职', '正职', '专项岗'],
  3: ['副职', '副职', '正职', '正职'],
  4: ['副职', '副职', '正职'],
  5: Array(15).fill('核心岗位').concat(Array(24).fill('部级岗位')).concat(Array(3).fill('委员岗位')),
};

// ── 公示期 ──
export const PUBLICITY = { days: 30, democraticMin: 60, publicityDays: 7, extendDays: 7 };

// ── 洗白方式 ──
export interface LaunderMethod {
  id: string; name: string; unlockRank: number; fee: number; days: number;
  risk: 'low' | 'mid' | 'high' | 'extreme'; baseProb: number;
}
export const LAUNDER_METHODS: LaunderMethod[] = [
  { id: 'card', name: '消费卡套现', unlockRank: 5, fee: 0.15, days: 15, risk: 'low', baseProb: 3 },
  { id: 'relative', name: '亲属代持', unlockRank: 4, fee: 0.10, days: 30, risk: 'mid', baseProb: 8 },
  { id: 'invest', name: '投资理财', unlockRank: 9, fee: 0.10, days: 90, risk: 'mid', baseProb: 8 },
  { id: 'shell', name: '空壳公司', unlockRank: 8, fee: 0.20, days: 60, risk: 'mid', baseProb: 8 },
  { id: 'overseas', name: '境外账户', unlockRank: 10, fee: 0.25, days: 120, risk: 'high', baseProb: 15 },
  { id: 'antique', name: '古董字画', unlockRank: 13, fee: 0.30, days: 180, risk: 'low', baseProb: 3 },
  { id: 'crypto', name: '加密货币', unlockRank: 12, fee: 0.05, days: 7, risk: 'extreme', baseProb: 25 },
];
export const LAUNDER_RISK_DIVISOR = 10;
export const LAUNDER_RECOVERY_RANGE = [10, 50];

// ── 藏匿方式 ──
export interface HidingMethod { id: string; name: string; recoveryRate: number; }
export const HIDING_METHODS: HidingMethod[] = [
  { id: 'cash', name: '现金藏匿', recoveryRate: 0.70 },
  { id: 'safe', name: '保险柜', recoveryRate: 0.50 },
  { id: 'relative', name: '亲属保管', recoveryRate: 0.30 },
];
export const HIDING_EXTRA_RECOVERY = 0.10;

// ── 非正式资源协调分档 ──
export interface CoordTier {
  id: string; name: string; amountMin: number; amountMax: number;
  favorGain: number; scoreGain: number;
}
export const COORD_TIERS: CoordTier[] = [
  { id: 'small', name: '小额·礼品礼金', amountMin: 10000, amountMax: 50000, favorGain: 5, scoreGain: 3 },
  { id: 'medium', name: '中额·消费卡/安排家属', amountMin: 100000, amountMax: 500000, favorGain: 12, scoreGain: 8 },
  { id: 'large', name: '大额·干股/项目分成', amountMin: 1000000, amountMax: 5000000, favorGain: 20, scoreGain: 12 },
  { id: 'huge', name: '巨额·境外账户/房产', amountMin: 10000000, amountMax: 99999999, favorGain: 30, scoreGain: 15 },
];
export const COORD_RISK = {
  baseProb: 5, largeBonus: 10, hugeBonus: 20,
  integrityHighBonus: 10, freqBonus: 3, riskPer10: 2, illicitExtraProb: 5,
};
export const PATRONAGE_TIERS = ['large', 'huge'];

// ── 功高盖主 ──
export const PRESTIGE_RULE = {
  popularMin: 90, consecutiveYears: 2, meritMultiple: 1.5,
  favorMonthlyDecay: 2, scorePenalty: 10, patronHalveDecay: 1,
  mitigateLowkey: { popular: -5, favor: 10 },
  mitigateReport: { favor: 5 },
  mitigateShare: { merit: -100, favor: 8 },
};

// ── 非正式关系密切 ──
export const CLIQUE_RULE = {
  favorThreshold: 85, meritPenalty: 200, popularPenalty: 10, freezeDays: 180,
  cutFavor: -15, cooperateMerit: -50, investigateMerit: -50,
};

// ── 领导干扰 ──
export const LEADER_OBSTRUCT = {
  favorBelow: 40, competitorBonus: 10, playerPenalty: 10,
  counterMerit: 500, counterFund: 50, counterProb: 0.30, counterCompensation: 100,
};

// ── 越级赏识 ──
export const PATRON_RULE = {
  meritMultiple: 1.2, popularMin: 80, baseProb: 5, probGrowth: 1, probCap: 20,
  scoreBonus: 8, favorGain: 10, meritGain: 30, meritPraise: 20, popularPraise: 5,
  meritBorrow: 50, borrowDays: 90, favorPenalty: 10, disappointFavor: -20,
  lowPopularEnd: 50, consecutiveFailYears: 2, extraBreakChance: 1,
};

// ── NPC 成长与衰减 ──
export const NPC_GROWTH = {
  monthlyGrowthMin: 0.2, monthlyGrowthMax: 0.5,
  ageDecayMonthly: 0.5, integrityLow: 40,
  retireCheckAge: 55, fallIntegrity: 30, fallProb: 0.05,
};

// ── 五步流程 ──
export const INTERVIEW_OPTIONS = [
  { key: 'fact', label: '谈成绩、摆事实', score: 3 },
  { key: 'plan', label: '谈打算、表决心', score: 2 },
  { key: 'humble', label: '表谦虚、求指导', score: 1 },
];

// ── 考评等级归一化评分（0-100）──
export function assessToScore(grade: string): number {
  switch (grade) {
    case '特等': return 95;
    case '优秀': return 85;
    case '良好': return 70;
    case '合格': return 55;
    case '不合格': return 30;
    default: return 50;
  }
}

// ── 计算年龄红利（就高原则，互斥）──
export function computeAgeBonus(age: number, tier: number): number {
  const range = AGE_RANGES[tier];
  if (!range) return 0;
  if (age < range.ageMin) return AGE_BONUS.lowAgeBonus; // 低龄红利
  if (age >= range.bestMin && age <= range.bestMax) return AGE_BONUS.bestBonus; // 最佳年龄红利
  return 0;
}

// ── 计算基层任期系数 ──
export function computeBaseTenureFactor(baseTenureYears: number): number {
  let factor = 1;
  if (baseTenureYears < BASE_TENURE.requireYears) factor *= BASE_TENURE.factorLt5;
  if (baseTenureYears < 3) factor *= BASE_TENURE.factorLt3;
  return factor;
}