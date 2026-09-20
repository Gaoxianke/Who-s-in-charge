/**
 * factionSystem.ts — 派系系统 v2 核心逻辑层
 *
 * 本文件为纯函数库（无副作用、无 React 依赖），对应设计规格 §2–§4。
 * UI 层（factions.tsx）和全局接线（promotion / leadership / gameLoop）
 * 从这里导入工具函数，避免逻辑散落。
 *
 * 数值一律使用参数化常量，不硬编码，可灰度回退：
 *   默认系数为 1.0 时即原行为；缺字段时按旧逻辑兜底。
 */

import type {
  FactionId,
  PoliticalWind,
  StrugglePhase,
  FactionRepLevel,
  FactionStruggle,
  FactionCoalition,
} from '@/types/game';
import { ALL_FACTIONS } from '@/types/game';

// ═══════════════════════════════════════════════════════════
// §2.1  派系关系矩阵（叙事底色，正=友好/负=对立）
// ═══════════════════════════════════════════════════════════
export const FACTION_RELATION_MATRIX: Record<FactionId, Partial<Record<FactionId, number>>> = {
  reform:    { pragmatic: -2, cyl: 1,  techno: 2,  local: -1 },
  pragmatic: { reform: -2,   cyl: -2,             local: 1  },
  cyl:       { reform: 1,    pragmatic: -2                   },
  techno:    { reform: 2,    local: -1                       },
  local:     { reform: -1,   pragmatic: 1, techno: -1        },
};

// ═══════════════════════════════════════════════════════════
// §2.3  风向派生规则（dominantFaction / losingFaction）
// ═══════════════════════════════════════════════════════════
export const DOMINANT_FACTION_MAP: Record<PoliticalWind, FactionId | null> = {
  'reform-heavy':    'reform',
  'pragmatic-heavy': 'pragmatic',
  'techno-surge':    'techno',
  'local-crackdown': 'pragmatic',   // 纪律整肃方为国家系
  'balanced':         null,
};

export const LOSING_FACTION_MAP: Record<PoliticalWind, FactionId | null> = {
  'reform-heavy':    'local',
  'pragmatic-heavy': 'reform',
  'techno-surge':    'local',
  'local-crackdown': 'local',
  'balanced':         null,
};

export function getDominantFaction(wind: PoliticalWind): FactionId | null {
  return DOMINANT_FACTION_MAP[wind];
}

export function getLosingFaction(wind: PoliticalWind): FactionId | null {
  return LOSING_FACTION_MAP[wind];
}

// ═══════════════════════════════════════════════════════════
// §D2 修复  hashNameToFaction（统一 FactionId，废除旧别名）
// ═══════════════════════════════════════════════════════════
const FACTION_POOL: FactionId[] = ['reform', 'pragmatic', 'cyl', 'techno', 'local'];

export function hashNameToFaction(name: string): FactionId {
  if (!name) return 'pragmatic';
  let h = 0;
  for (let i = 0; i < name.length; i++) {
    h = (h * 31 + name.charCodeAt(i)) >>> 0;
  }
  return FACTION_POOL[h % 5];
}

// ═══════════════════════════════════════════════════════════
// §2.2  声望等级（Reputation Level，L0–L4）
// ═══════════════════════════════════════════════════════════
const REP_THRESHOLDS = [20, 40, 60, 80] as const;  // L1/L2/L3/L4 起点

export function getRepLevel(relation: number): FactionRepLevel {
  if (relation >= 80) return 4;
  if (relation >= 60) return 3;
  if (relation >= 40) return 2;
  if (relation >= 20) return 1;
  return 0;
}

export const REP_LABELS: Record<FactionRepLevel, string> = {
  0: '陌路',
  1: '相识',
  2: '同道',
  3: '心腹',
  4: '核心',
};

// ═══════════════════════════════════════════════════════════
// §3.3  行动得势倍率
// ═══════════════════════════════════════════════════════════
/** 当前风口下对某派做正向行动的效果倍率（§2.4 / §3.3）*/
export function getWindMultiplier(
  actionFaction: FactionId,
  dominantFaction: FactionId | null,
  losingFaction: FactionId | null,
): number {
  if (dominantFaction && actionFaction === dominantFaction) return 1.15;
  if (losingFaction  && actionFaction === losingFaction)   return 0.90;
  return 1.0;
}

// ═══════════════════════════════════════════════════════════
// §4.2  K_faction 晋升系数（clamp 0.4–1.8）
// ═══════════════════════════════════════════════════════════
export interface KFactionParams {
  primaryFaction: FactionId | null;
  relation: Record<FactionId, number>;
  dominantFaction: FactionId | null;
  losingFaction: FactionId | null;
  /** 班子 / 四大班子成员的派系归属数组 */
  bandFactions: FactionId[];
  isFlagged: boolean;
  factionlessLocked: boolean;
  /** 派系斗争交战期冻结（§3.22 / §4.2⑧） */
  factionPromotionLocked: boolean;
}

export interface KFactionResult {
  kFaction: number;
  promotable: boolean;
  reason: string;
}

export function calcKFaction(p: KFactionParams): KFactionResult {
  // ⑦ 无派系永久锁死
  if (p.factionlessLocked || !p.primaryFaction) {
    return { kFaction: 0, promotable: false, reason: '无派系·晋升锁死' };
  }
  // ⑧ 斗争交战期临时冻结
  if (p.factionPromotionLocked) {
    return { kFaction: 0, promotable: false, reason: '派系斗争中·晋升冻结' };
  }

  const total = p.bandFactions.length || 1;
  const primary = p.primaryFaction;

  // 同派评委占比
  const sameCount = p.bandFactions.filter(f => f === primary).length;
  const sameRatio = sameCount / total;

  // 对立派占比（矩阵值 ≤ -1）
  const oppCount = p.bandFactions.filter(f => {
    const v = FACTION_RELATION_MATRIX[primary]?.[f] ?? 0;
    return v <= -1;
  }).length;
  const oppRatio = oppCount / total;

  // 风口主流派加成（§4.2 明确要求：+0.20 / -0.15）
  let windBonus = 0;
  if (p.dominantFaction && primary === p.dominantFaction) windBonus = 0.20;
  else if (p.losingFaction && primary === p.losingFaction) windBonus = -0.15;

  // 声望等级项（L0–L4 对应 0–0.4，每级 +0.1）
  const repBonus = getRepLevel(p.relation[primary] ?? 0) * 0.1;

  let k = 1 + 0.4 * sameRatio - 0.3 * oppRatio + windBonus + repBonus;

  // ⑥ 被针对惩罚（§2.5③ / §4.2）
  if (p.isFlagged) k *= 0.6;

  const kClamped = Math.min(1.8, Math.max(0.4, k));
  return { kFaction: kClamped, promotable: true, reason: '' };
}

// ═══════════════════════════════════════════════════════════
// §3.4  班子派系合力（bandSynergy，0.85–1.15）
// ═══════════════════════════════════════════════════════════
export function calcBandSynergy(bandFactions: FactionId[]): number {
  if (bandFactions.length === 0) return 1.0;

  const counts: Partial<Record<FactionId, number>> = {};
  for (const f of bandFactions) counts[f] = (counts[f] ?? 0) + 1;

  const total = bandFactions.length;
  const maxPct = Math.max(...Object.values(counts as Record<string, number>)) / total;

  // 严重对立：两派均在班子且差值 >40%
  const facs = Object.keys(counts) as FactionId[];
  for (let i = 0; i < facs.length; i++) {
    for (let j = i + 1; j < facs.length; j++) {
      const rel = FACTION_RELATION_MATRIX[facs[i]]?.[facs[j]] ?? 0;
      if (rel <= -2) {
        const diff = Math.abs((counts[facs[i]] ?? 0) - (counts[facs[j]] ?? 0)) / total;
        if (diff > 0.4) return 0.85;
      }
    }
  }

  if (maxPct >= 0.6) return 1.15; // 高度一致但单一
  return 1.10;                     // 跨派均衡
}

// ═══════════════════════════════════════════════════════════
// §3.11  派系斗争力 S_you
// ═══════════════════════════════════════════════════════════
export interface SYouParams {
  relation: Record<FactionId, number>;
  supportFaction: FactionId;
  factionInfluence: number;
  bandSynergy: number;
  /** 本次下注投入的政绩（起步 500，见 §2.3） */
  meritInvested: number;
  factionIntelligence: number;
}

export function calcSYou(p: SYouParams): number {
  const rel = p.relation[p.supportFaction] ?? 0;
  // 政绩杠杆 = min(投入政绩 ÷ 500, 10)（§2.3 / §3.11③）
  const leverage = Math.min(p.meritInvested / 500, 10);
  return (
    rel * 0.5 +
    p.factionInfluence * 0.3 +
    p.bandSynergy * 20 +
    leverage * 0.2 +
    p.factionIntelligence * 0.1
  );
}

/**
 * §3.17–§3.21 战前部署折算进 S_you 的总加成。
 * 代理人×5 · 舆论×3 · 离间×4 · 先发制人×8 · 接班人×6
 */
export function prepBonus(prep: { proxy: number; media: number; discord: number; preempt: number; successor: number }): number {
  return (
    (prep.proxy ?? 0) * 5 +
    (prep.media ?? 0) * 3 +
    (prep.discord ?? 0) * 4 +
    (prep.preempt ?? 0) * 8 +
    (prep.successor ?? 0) * 6
  );
}

/** 含战前部署的 S_you 预估（供 Tab11 展示/结算使用） */
export function computeSYouWithPrep(
  relation: number,
  factionInfluence: number,
  factionIntelligence: number,
  prep: { proxy: number; media: number; discord: number; preempt: number; successor: number },
): number {
  return relation * 0.5 + factionInfluence * 0.3 + factionIntelligence * 0.1 + prepBonus(prep);
}

/**
 * §3.23 多方混战判定：取各派关系值（含主派影响力）排序，
 * 若前 3 名最大值与第 3 名差距 <15，视为多方混战格局（S_opp +20%）。
 */
export function isMultiFactionFreeForAll(
  relation: Record<FactionId, number>,
  primaryInfluence: number,
): boolean {
  const powers = ALL_FACTIONS.map(f => relation[f] + (f === 'reform' ? 0 : 0));
  powers.sort((a, b) => b - a);
  return powers.length >= 3 && powers[0] - powers[2] < 15 && primaryInfluence > 0;
}

/**
 * §4.8 派系结局判定（退休/终局时调用）。
 * 返回结局类型与展示文案。
 */
export type FactionEnding = {
  key: 'core' | 'balancer' | 'marginalized' | 'purged' | 'none';
  title: string;
  desc: string;
  color: string;
};

export function evaluateFactionEnding(
  influence: number,
  purgeCount: number,
  hasPrimary: boolean,
): FactionEnding {
  if (purgeCount >= 2) {
    return { key: 'purged', title: '被清算 · 落马', desc: '派系账目留痕累积，终被揪出，仕途以落马收场。', color: '#C82829' };
  }
  if (!hasPrimary) {
    return { key: 'none', title: '无派无系', desc: '始终未选边站队，左右逢源却也无人庇护。', color: '#888' };
  }
  if (influence >= 80) {
    return { key: 'core', title: '核心圈层 · 平安着陆', desc: '主派声望与影响力登顶，或斗争胜出主导风口，更上层楼。', color: '#C8A84B' };
  }
  if (influence < 30) {
    return { key: 'marginalized', title: '被边缘化', desc: '影响力不足，派系失势后被迫退居二线。', color: '#C87820' };
  }
  return { key: 'balancer', title: '平衡大师', desc: '五派关系均衡、无大清洗，各方都能接受，稳健终局。', color: '#2a7a3b' };
}

// ═══════════════════════════════════════════════════════════
// §3.7  情报增速（每旬）
// ═══════════════════════════════════════════════════════════
export function intelligenceGainPer10Days(technoRelation: number): number {
  return technoRelation / 20;
}

// ═══════════════════════════════════════════════════════════
// §2.5③  暴露率（discoveryRoll，随接触次数递增）
// ═══════════════════════════════════════════════════════════
const BASE_DISCOVERY = [0.15, 0.30, 0.55];

export function getDiscoveryProbability(
  contactAttempts: number,
  factionIntelligence: number,
  primaryRelation: number,
): number {
  const base =
    contactAttempts < BASE_DISCOVERY.length
      ? BASE_DISCOVERY[contactAttempts]
      : Math.min(0.90, 0.55 + (contactAttempts - 2) * 0.15);
  const intReduction = (factionIntelligence / 100) * 0.20;
  const relReduction = (primaryRelation / 100) * 0.10;
  return Math.max(0.05, base - intReduction - relReduction);
}

// ═══════════════════════════════════════════════════════════
// §3.10  清洗命中率
// ═══════════════════════════════════════════════════════════
export function getPurgeHitProbability(factionIntelligence: number): number {
  return 0.3 * (1 - factionIntelligence / 100);
}

// ═══════════════════════════════════════════════════════════
// §D1 修复  持久化冷却工具（读写 save.factionCooldowns）
// ═══════════════════════════════════════════════════════════
const COOL_PREFIX = 'fac_';

export function isCooldownActive(
  cooldowns: Record<string, number>,
  key: string,
  currentDay: number,
): boolean {
  return currentDay < (cooldowns[COOL_PREFIX + key] ?? 0);
}

export function setCooldown(
  cooldowns: Record<string, number>,
  key: string,
  currentDay: number,
  duration: number,
): Record<string, number> {
  return { ...cooldowns, [COOL_PREFIX + key]: currentDay + duration };
}

export function cooldownRemaining(
  cooldowns: Record<string, number>,
  key: string,
  currentDay: number,
): number {
  return Math.max(0, (cooldowns[COOL_PREFIX + key] ?? 0) - currentDay);
}

// ═══════════════════════════════════════════════════════════
// §3.3  风口周期 tick（3 游戏年 = 1095 天，P5 由 5 年改为 3 年）
// ═══════════════════════════════════════════════════════════
export const WIND_CYCLE_DAYS = 1095; // 3 × 365，锚定 getGameYear

/**
 * 检查是否到达下一个风口周期边界。
 * 返回 true 时调用方应触发派系斗争（§3.11）并更新 lastWindCycleDay。
 */
export function shouldTriggerWindCycle(
  currentDay: number,
  lastWindCycleDay: number,
): boolean {
  return currentDay - lastWindCycleDay >= WIND_CYCLE_DAYS;
}

/**
 * 斗争准备期检测（§3.22①）：距周期边界 ≤60 天进入动员。
 */
export function isInMobilizationPeriod(
  currentDay: number,
  lastWindCycleDay: number,
): boolean {
  const remaining = WIND_CYCLE_DAYS - (currentDay - lastWindCycleDay);
  return remaining > 0 && remaining <= 60;
}

// ═══════════════════════════════════════════════════════════
// §4.1  政策触发偏置（respondToPolicy 回写系数）
// ═══════════════════════════════════════════════════════════
/** 响应政策时，若主派 == favoredFaction，meritBonus 乘 1.2；若是 disfavored，乘 0.85 */
export function getPolicyFactionMultiplier(
  primaryFaction: FactionId | null,
  favoredFaction: FactionId | null | undefined,
  disfavoredFaction: FactionId | null | undefined,
): number {
  if (!primaryFaction) return 1.0;
  if (favoredFaction   && primaryFaction === favoredFaction)   return 1.2;
  if (disfavoredFaction && primaryFaction === disfavoredFaction) return 0.85;
  return 1.0;
}

// ═══════════════════════════════════════════════════════════
// §6  迁移：旧五列 → 新 relation Record
// ═══════════════════════════════════════════════════════════
export function migrateLegacyRelation(save: {
  reformFaction?: number;
  pragmaticFaction?: number;
  cylRelation?: number;
  technoRelation?: number;
  localRelation?: number;
}): Record<FactionId, number> {
  return {
    reform:    save.reformFaction    ?? 50,
    pragmatic: save.pragmaticFaction ?? 50,
    cyl:       save.cylRelation      ?? 30,
    techno:    save.technoRelation   ?? 30,
    local:     save.localRelation    ?? 30,
  };
}

/**
 * 便捷工具：从 PlayerSave 读取统一 relation 对象。
 * 优先读 v2 字段（cylRelation 等），兼容旧存档。
 */
export function getRelationFromSave(save: {
  reformFaction: number;
  pragmaticFaction: number;
  cylRelation: number;
  technoRelation: number;
  localRelation: number;
}): Record<FactionId, number> {
  return migrateLegacyRelation(save);
}

/** relation 字段名映射（统一派系 ID → 存档字段） */
export function relFieldOf(faction: FactionId): string {
  switch (faction) {
    case 'reform':    return 'reformFaction';
    case 'pragmatic': return 'pragmaticFaction';
    case 'cyl':       return 'cylRelation';
    case 'techno':    return 'technoRelation';
    default:          return 'localRelation';
  }
}

/** 对某派关系施加增量，返回需写入存档的字段更新（0-100 封顶） */
export function applyRelDeltaToSave(
  save: { reformFaction: number; pragmaticFaction: number; cylRelation: number; technoRelation: number; localRelation: number },
  faction: FactionId,
  delta: number,
): Record<string, number> {
  const field = relFieldOf(faction);
  const cur = (save as Record<string, number>)[field] ?? 50;
  return { [field]: Math.max(0, Math.min(100, cur + delta)) };
}

// ═══════════════════════════════════════════════════════════
// §3.9  联盟有效性检查
// ═══════════════════════════════════════════════════════════
export function isCoalitionActive(c: FactionCoalition, currentDay: number): boolean {
  return currentDay < c.endDay;
}

export function getActiveCoalitions(
  coalitions: FactionCoalition[],
  currentDay: number,
): FactionCoalition[] {
  return coalitions.filter(c => isCoalitionActive(c, currentDay));
}

/** 两派是否可缔结联盟（互斥派 local-reform 不可联盟，§3.9）*/
export function canFormCoalition(a: FactionId, b: FactionId): boolean {
  if (a === b) return false;
  const relAtoB = FACTION_RELATION_MATRIX[a]?.[b] ?? 0;
  const relBtoA = FACTION_RELATION_MATRIX[b]?.[a] ?? 0;
  // 双方关系矩阵均为 -1（互斥，如 reform-local）需额外政绩 ×2
  // 此处仅判断是否"完全禁止"（-2 级相互）
  return !(relAtoB <= -2 && relBtoA <= -2);
}

// ═══════════════════════════════════════════════════════════
// §C  跨派系结契（v6 扩充玩法）
// ═══════════════════════════════════════════════════════════
/** 同盟期间个人职位战的 sYou 加成系数 */
export const COALITION_CONTEST_BONUS = 0.12;
/** 缔结联盟时双方的互惠关系增益 */
export const COALITION_FORM_RELATION_BOOST = 6;

/** 玩家主派是否与指定派系存在活跃同盟 */
export function hasActiveCoalitionWith(
  coalitions: FactionCoalition[],
  primary: FactionId,
  other: FactionId,
  day: number,
): boolean {
  return coalitions.some(
    c =>
      isCoalitionActive(c, day) &&
      ((c.a === primary && c.b === other) || (c.a === other && c.b === primary)),
  );
}

// ═══════════════════════════════════════════════════════════
// §4.7  城市指标派系偏置方向
// ═══════════════════════════════════════════════════════════
export const FACTION_METRIC_BIAS: Record<FactionId, string[]> = {
  reform:    ['gdp', 'investBonus'],
  pragmatic: ['stability'],
  cyl:       ['healthcare', 'education'],
  techno:    ['gdp', 'digital'],
  local:     ['finance'],  // 长期承压 integrity
};

// ═══════════════════════════════════════════════════════════
// §2.5④  上司好感倍率（§4.4）
// ═══════════════════════════════════════════════════════════
export function getBossFavorMultiplier(
  playerFaction: FactionId | null,
  bossFaction: FactionId | null,
  isFlagged: boolean,
): number {
  let mult = 1.0;
  if (playerFaction && bossFaction) {
    if (playerFaction === bossFaction) {
      mult = 1.3;
    } else {
      const rel = FACTION_RELATION_MATRIX[playerFaction]?.[bossFaction] ?? 0;
      if (rel <= -1) mult = 0.6;
    }
  }
  if (isFlagged) mult *= 0.7;
  return mult;
}

// ═══════════════════════════════════════════════════════════
// §4.1  政策 favoredFaction 表（NationalPolicyDef 扩展用）
// ═══════════════════════════════════════════════════════════
export const POLICY_FACTION_MAP: Record<string, {
  favored: FactionId | null;
  disfavored: FactionId | null;
}> = {
  '扫黑除恶':       { favored: 'pragmatic', disfavored: 'local' },
  '中央环保督查':   { favored: 'techno',    disfavored: 'local' },
  '反腐败专项':     { favored: 'reform',    disfavored: 'local' },
  '乡村振兴攻坚':   { favored: 'cyl',       disfavored: null    },
  '共同富裕示范':   { favored: 'cyl',       disfavored: 'reform'},
  '安全生产整治':   { favored: 'pragmatic', disfavored: null    },
  '教育质量提升':   { favored: 'cyl',       disfavored: null    },
  '经济高质量发展': { favored: 'reform',    disfavored: 'pragmatic' },
};

// ═══════════════════════════════════════════════════════════
// §2.3  派系影响力计算（factionInfluence 0-100）
// ═══════════════════════════════════════════════════════════
export function calcFactionInfluence(
  relation: Record<FactionId, number>,
  primaryFaction: FactionId | null,
): number {
  const all: FactionId[] = ['reform', 'pragmatic', 'cyl', 'techno', 'local'];
  const avg = all.reduce((s, f) => s + (relation[f] ?? 0), 0) / 5;
  const primaryLevel = primaryFaction ? getRepLevel(relation[primaryFaction] ?? 0) : 0;
  const raw = avg * 0.7 + primaryLevel * 5 * 0.3;
  return Math.min(100, Math.max(0, Math.round(raw)));
}

// ═══════════════════════════════════════════════════════════
// §3.22  斗争阶段状态机
// ═══════════════════════════════════════════════════════════
export function resolveStrugglePhase(
  currentDay: number,
  lastWindCycleDay: number,
  currentPhase: StrugglePhase,
  activeStartDay: number | null,
  truceStartDay: number | null,
): StrugglePhase {
  if (currentPhase === 'truce' && truceStartDay !== null) {
    return (currentDay - truceStartDay) >= 60 ? 'idle' : 'truce';
  }
  if (currentPhase === 'active') return 'active'; // 由结算函数推进到 truce
  if (isInMobilizationPeriod(currentDay, lastWindCycleDay)) return 'mobilize';
  if (shouldTriggerWindCycle(currentDay, lastWindCycleDay)) return 'active';
  return 'idle';
}
