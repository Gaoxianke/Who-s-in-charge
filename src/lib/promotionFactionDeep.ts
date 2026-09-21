// 派系深度耦合系统 v1.0
// 职位体系（外围→核心）/ 资源池（资金·人脉·媒体）/ 庇护与打压 / 忠诚度测试
import type { PlayerSave } from '@/types/game';

/** 派系内职位层级 */
export type FactionRank = 'peripheral' | 'activist' | 'backbone' | 'core' | 'successor';

/** 派系资源类型 */
export type FactionResource = 'fund' | 'network' | 'media';

/** 派系内职位定义 */
export interface FactionRankDef {
  key: FactionRank;
  label: string;
  requiredContribution: number; // 所需派系贡献
  promotionBonus: number;      // 晋升时功绩损失减免比例
  freezeReduction: number;     // 冻结期减半天数
  privilege: string;             // 特权描述
}

/** 忠诚度测试选项 */
export interface LoyaltyOption {
  key: 'a' | 'b' | 'c';
  label: string;
  factionRelationDelta: number;
  otherFactionDelta: number;
  publicityDelta: number;
  tag?: string; // 获得标签
}

/** 申请资源结果 */
export interface ResourceApplyResult {
  ok: boolean;
  msg: string;
  granted?: { type: FactionResource; amount: number };
  repay?: { meritPenalty: number; silverPenalty: number };
}

// ── 常量 ─────────────────────────────────────────────

export const FACTION_RANKS: FactionRankDef[] = [
  { key: 'peripheral',  label: '外围成员', requiredContribution: 0,    promotionBonus: 0,   freezeReduction: 0,  privilege: '无' },
  { key: 'activist',    label: '积极分子', requiredContribution: 500,  promotionBonus: 0.1, freezeReduction: 15, privilege: '晋升功绩损失-10%' },
  { key: 'backbone',    label: '中层骨干', requiredContribution: 1500, promotionBonus: 0.25, freezeReduction: 30, privilege: '晋升功绩损失-25%，冻结期-30天' },
  { key: 'core',        label: '核心成员', requiredContribution: 3000, promotionBonus: 0.5,  freezeReduction: 60, privilege: '晋升功绩损失减半，冻结期减半' },
  { key: 'successor',   label: '接班人',   requiredContribution: 6000, promotionBonus: 0.5, freezeReduction: 90, privilege: '派系力保（失败惩罚减半）+ 冻结期减半' },
];

const RESOURCE_COSTS: Record<FactionResource, { contributionCost: number; label: string }> = {
  fund:    { contributionCost: 100, label: '派系资金' },
  network: { contributionCost: 150, label: '派系人脉' },
  media:   { contributionCost: 200, label: '派系媒体' },
};

const MIN_RANK_FOR_LOYALTY_TEST = 7; // 副厅级及以上才触发忠诚度测试

// ── 派系职位体系 ───────────────────────────────────────

/** 根据派系贡献计算当前派系职位 */
export function calcFactionRank(contribution: number): FactionRankDef {
  for (let i = FACTION_RANKS.length - 1; i >= 0; i--) {
    if (contribution >= FACTION_RANKS[i].requiredContribution) {
      return FACTION_RANKS[i];
    }
  }
  return FACTION_RANKS[0];
}

/** 获取下一级派系职位信息 */
export function getNextFactionRank(contribution: number): { current: FactionRankDef; next: FactionRankDef | null; progress: number } {
  const current = calcFactionRank(contribution);
  const currentIndex = FACTION_RANKS.findIndex(r => r.key === current.key);
  const next = FACTION_RANKS[currentIndex + 1] ?? null;
  const progress = next
    ? Math.min(1, (contribution - current.requiredContribution) / (next.requiredContribution - current.requiredContribution))
    : 1;
  return { current, next, progress };
}

// ── 派系资源池 ─────────────────────────────────────────

/** 向派系申请资源 */
export function applyFactionResource(
  save: PlayerSave,
  type: FactionResource,
): ResourceApplyResult {
  const cost = RESOURCE_COSTS[type];
  const contribution = save.factionContribution ?? 0;
  if (contribution < cost.contributionCost) {
    return { ok: false, msg: `派系贡献不足：申请${cost.label}需${cost.contributionCost}贡献（当前${contribution}）` };
  }

  const grantedAmount = type === 'fund'
    ? 10 + Math.floor(Math.random() * 90) // 10-100万
    : type === 'network'
      ? 1
      : 1; // 人脉和媒体各消耗1单位

  return {
    ok: true,
    msg: `申请成功：获得${cost.label} ${type === 'fund' ? grantedAmount + '万' : '1单位'}（消耗${cost.contributionCost}贡献）`,
    granted: { type, amount: grantedAmount },
    repay: { meritPenalty: 200, silverPenalty: type === 'fund' ? 50 : 0 },
  };
}

// ── 派系庇护与打压 ─────────────────────────────────────

/** 检查晋升失败时是否触发派系庇护 */
export function checkFactionProtection(save: PlayerSave): {
  protected: boolean;
  msg: string;
  penaltyReduction: number;
} {
  const factionRelation = save.primaryFaction
    ? (save.reformFaction ?? save.pragmaticFaction ?? 50)
    : 0;
  const rank = calcFactionRank(save.factionContribution ?? 0);

  // 核心成员以上 + 派系关系≥60 才有庇护
  if (rank.key !== 'core' && rank.key !== 'successor') {
    return { protected: false, msg: '派系职位不足，无法获得派系庇护', penaltyReduction: 0 };
  }
  if (factionRelation < 60) {
    return { protected: false, msg: '派系关系值不足（需≥60），派系不愿出面', penaltyReduction: 0 };
  }

  const roll = Math.random();
  if (roll < 0.3) {
    return {
      protected: true,
      msg: '✨ 派系力保：你的核心身份让派系出面斡旋，失败惩罚减半！',
      penaltyReduction: 0.5,
    };
  }

  return { protected: false, msg: '派系未触发庇护（概率30%）', penaltyReduction: 0 };
}

/** 检查是否遭受派系打压 */
export function checkFactionSuppression(save: PlayerSave): {
  suppressed: boolean;
  msg: string;
  scorePenalty: number;
} {
  const factionRelation = save.primaryFaction
    ? (save.reformFaction ?? save.pragmaticFaction ?? 50)
    : 0;

  // 与派系领袖关系<30 触发打压
  if (factionRelation >= 30) {
    return { suppressed: false, msg: '', scorePenalty: 0 };
  }

  return {
    suppressed: true,
    msg: '⚠️ 派系打压：你与派系领袖关系恶劣，派系在评审中暗中投反对票！',
    scorePenalty: 15,
  };
}

/** 派系斗争失败后执行清洗 */
export function applyFactionPurge(save: PlayerSave, day: number): {
  msg: string;
  updates: Partial<PlayerSave>;
} {
  const rank = calcFactionRank(save.factionContribution ?? 0);
  // 核心成员才受影响（清洗针对核心层）
  if (rank.key !== 'core' && rank.key !== 'successor') {
    return { msg: '你是派系外围成员，清洗未波及到你。', updates: {} };
  }

  return {
    msg: `💥 派系清洗：作为${rank.label}，你被卷入派系斗争失败的漩涡，晋升冻结180天，竞争评分-15%`,
    updates: {
      factionSetbackUntilDay: day + 180,
    },
  };
}

// ── 忠诚度测试 ─────────────────────────────────────────

/** 获取忠诚度测试选项 */
export function getLoyaltyOptions(save: PlayerSave): LoyaltyOption[] {
  const primary = save.primaryFaction || 'reform';
  const wind = save.politicalWind ?? 'balanced';
  const isWindAligned = wind === `${primary}-heavy`;

  return [
    {
      key: 'a',
      label: '公开表态支持派系立场',
      factionRelationDelta: 30,
      otherFactionDelta: -20,
      publicityDelta: isWindAligned ? 10 : -10,
    },
    {
      key: 'b',
      label: '保持中立，不置可否',
      factionRelationDelta: -10,
      otherFactionDelta: 0,
      publicityDelta: 0,
    },
    {
      key: 'c',
      label: '暗中反对派系立场',
      factionRelationDelta: -50,
      otherFactionDelta: 15,
      publicityDelta: 5,
      tag: 'independent',
    },
  ];
}

/** 检查是否需要忠诚度测试 */
export function requiresLoyaltyTest(rankLevel: number): boolean {
  return rankLevel >= MIN_RANK_FOR_LOYALTY_TEST;
}

/** 应用忠诚度测试选择 */
export function applyLoyaltyChoice(
  save: PlayerSave,
  choice: LoyaltyOption,
): { msg: string; updates: Partial<PlayerSave>; tag?: string } {
  const updates: Partial<PlayerSave> = {};

  // 调整派系关系值
  if (save.primaryFaction === 'reform') {
    updates.reformFaction = Math.min(100, Math.max(0, save.reformFaction + choice.factionRelationDelta));
  } else if (save.primaryFaction === 'pragmatic') {
    updates.pragmaticFaction = Math.min(100, Math.max(0, save.pragmaticFaction + choice.factionRelationDelta));
  }

  // 调整其他派系好感
  if (save.primaryFaction !== 'reform') {
    updates.reformFaction = Math.min(100, Math.max(0, save.reformFaction + choice.otherFactionDelta));
  }
  if (save.primaryFaction !== 'pragmatic') {
    updates.pragmaticFaction = Math.min(100, Math.max(0, save.pragmaticFaction + choice.otherFactionDelta));
  }

  // 舆论声望
  if (save.reputation && choice.publicityDelta !== 0) {
    updates.reputation = {
      ...save.reputation,
      publicity: Math.min(100, Math.max(0, save.reputation.publicity + choice.publicityDelta)),
    };
  }

  return {
    msg: choice.key === 'a'
      ? '你公开表态支持派系，获得派系信任但引起其他派系警惕。'
      : choice.key === 'b'
        ? '你的中立态度让派系失望，被视为不可靠。'
        : '你暗中反对派系，获得了独立派标签。',
    updates,
    tag: choice.tag,
  };
}

// ── 便捷函数 ─────────────────────────────────────────

/** 获取派系职位标签名 */
export function getFactionRankLabel(contribution: number): string {
  return calcFactionRank(contribution).label;
}

/** 计算派系力保后的实际功绩损失 */
export function calcProtectedMeritLoss(baseLoss: number, save: PlayerSave): number {
  const rank = calcFactionRank(save.factionContribution ?? 0);
  const reduction = rank.promotionBonus;
  return Math.round(baseLoss * (1 - reduction));
}

/** 计算派系力保后的实际冻结期 */
export function calcProtectedFreezeDays(baseDays: number, save: PlayerSave): number {
  const rank = calcFactionRank(save.factionContribution ?? 0);
  return Math.max(0, baseDays - rank.freezeReduction);
}
