// 派系系统 v6 扩展玩法：声望经济 / 暗线举报 / 周期功绩分红
// 全部为纯函数（无副作用），数值走配置对象，复用现有 factionInfluence / riskValue / factionIntelligence 等字段
import type { FactionId, PlayerSave } from '@/types/game';
import { getRelationFromSave } from '@/lib/factionSystem';
import { calcFactionPower } from '@/lib/provinceSeatSystem';

// ═══════════════════════════════════════════════════════════════
// §配置对象（唯一数值出口，禁止在业务函数硬编码）
// ═══════════════════════════════════════════════════════════════

/** A. 声望经济：用影响力兑换短期增益 */
export const PRESTIGE_ECONOMY = {
  // 兑换一次「失势豁免」：消耗影响力，获得 1 次豁免次数（使用时抵消一次失势冻结）
  immunity: {
    influenceCost: 25,   // 消耗影响力
    cooldownDays: 365,   // 冷却天数
    cooldownKey: 'prestige_immunity',
  },
  // 兑换「加速争夺冷却」：消耗影响力，把个人职位战冷却缩短指定天数
  accelerate: {
    influenceCost: 15,   // 消耗影响力
    shortenDays: 30,     // 缩短的天数
    cooldownDays: 180,   // 冷却天数
    cooldownKey: 'prestige_accelerate',
  },
} as const;

/** B. 暗线举报/纪检：削弱对手派系斗争力 */
export const INFORM_REPORT = {
  /** 对手派系斗争力达到此阈值才可发起举报（异常高） */
  powerThreshold: 70,
  /** 举报成功削弱对手派系实力的幅度（直接降低其关系值） */
  weakenRelation: -15,
  /** 举报成功后自身获得的情报增益 */
  intelGain: 8,
  /** 举报成功后获得的功绩奖励 */
  meritReward: 30,
  /** 举报暴露（失败）时的风险值增加 */
  exposureRiskAdd: 15,
  /** 举报暴露（失败）时本派关系损失 */
  exposureRelPenalty: -10,
  /** 举报基础暴露概率 */
  baseExposureProb: 0.35,
  /** 每点情报降低的暴露概率 */
  intelExposureReductionPerPoint: 0.004,
  /** 暴露概率下限 */
  minExposureProb: 0.1,
  /** 举报冷却天数 */
  cooldownDays: 365,
  cooldownKey: 'inform_report',
} as const;

/** D. 周期结算功绩分红 */
export const CYCLE_DIVIDEND = {
  /** 每赢下一次职位争夺的基础功绩分红 */
  perContestWinMerit: 40,
  /** 派系整体胜的额外功绩分红 */
  factionWinMeritBonus: 60,
  /** 派系整体胜的影响力分红 */
  factionWinInfluenceBonus: 10,
  /** 分红影响力上限 */
  maxInfluence: 100,
} as const;

// ═══════════════════════════════════════════════════════════════
// A. 声望经济
// ═══════════════════════════════════════════════════════════════

export interface PrestigeResult {
  ok: boolean;
  message: string;
  updates: Partial<PlayerSave>;
}

/** 兑换一次失势豁免 */
export function buySetbackImmunity(save: PlayerSave, day: number): PrestigeResult {
  const cfg = PRESTIGE_ECONOMY.immunity;
  const cd = save.factionCooldowns ?? {};
  if ((cd[cfg.cooldownKey] ?? 0) > day) {
    return { ok: false, message: `失势豁免冷却中（剩 ${(cd[cfg.cooldownKey] ?? 0) - day} 天）`, updates: {} };
  }
  if ((save.factionInfluence ?? 0) < cfg.influenceCost) {
    return { ok: false, message: `影响力不足（需 ${cfg.influenceCost}，当前 ${save.factionInfluence ?? 0}）`, updates: {} };
  }
  return {
    ok: true,
    message: `✓ 已兑换一次失势豁免（影响力−${cfg.influenceCost}），下次失势可抵消冻结`,
    updates: {
      factionInfluence: (save.factionInfluence ?? 0) - cfg.influenceCost,
      setbackImmunity: (save.setbackImmunity ?? 0) + 1,
      factionCooldowns: { ...cd, [cfg.cooldownKey]: day + cfg.cooldownDays },
    },
  };
}

/** 兑换加速争夺冷却（缩短个人职位战冷却） */
export function buyAccelerateContest(save: PlayerSave, day: number): PrestigeResult {
  const cfg = PRESTIGE_ECONOMY.accelerate;
  const cd = save.factionCooldowns ?? {};
  if ((cd[cfg.cooldownKey] ?? 0) > day) {
    return { ok: false, message: `加速冷却中（剩 ${(cd[cfg.cooldownKey] ?? 0) - day} 天）`, updates: {} };
  }
  if ((save.factionInfluence ?? 0) < cfg.influenceCost) {
    return { ok: false, message: `影响力不足（需 ${cfg.influenceCost}，当前 ${save.factionInfluence ?? 0}）`, updates: {} };
  }
  const cur = save.personalContestCooldownUntil ?? 0;
  // 仅当当前存在冷却时才有意义
  if (cur <= day) {
    return { ok: false, message: '当前无个人职位战冷却，无需加速', updates: {} };
  }
  return {
    ok: true,
    message: `✓ 争夺冷却已加速（缩短 ${cfg.shortenDays} 天），影响力−${cfg.influenceCost}`,
    updates: {
      factionInfluence: (save.factionInfluence ?? 0) - cfg.influenceCost,
      personalContestCooldownUntil: Math.max(day, cur - cfg.shortenDays),
      factionCooldowns: { ...cd, [cfg.cooldownKey]: day + cfg.cooldownDays },
    },
  };
}

// ═══════════════════════════════════════════════════════════════
// B. 暗线举报/纪检
// ═══════════════════════════════════════════════════════════════

export interface InformResult {
  ok: boolean;
  message: string;
  updates: Partial<PlayerSave>;
}

/** 计算举报某对手派系的暴露概率 */
export function getInformExposureProb(save: PlayerSave): number {
  const intel = save.factionIntelligence ?? 0;
  const prob = INFORM_REPORT.baseExposureProb - intel * INFORM_REPORT.intelExposureReductionPerPoint;
  return Math.max(INFORM_REPORT.minExposureProb, prob);
}

/** 判断某派系斗争力是否异常高（可举报） */
export function isFactionReportable(save: PlayerSave, faction: FactionId): boolean {
  return calcFactionPower(save, faction) >= INFORM_REPORT.powerThreshold;
}

/**
 * 对指定对手派系发起暗线举报。
 * - 成功：削弱对方关系值、自身获得情报与功绩
 * - 暴露：风险值上升、本派关系受损
 * 使用确定性伪随机（day + faction hash），保证可复现。
 */
export function attemptInformReport(
  save: PlayerSave,
  targetFaction: FactionId,
  day: number,
): InformResult {
  const cfg = INFORM_REPORT;
  const cd = save.factionCooldowns ?? {};
  if ((cd[cfg.cooldownKey] ?? 0) > day) {
    return { ok: false, message: `举报冷却中（剩 ${(cd[cfg.cooldownKey] ?? 0) - day} 天）`, updates: {} };
  }
  if (!isFactionReportable(save, targetFaction)) {
    return { ok: false, message: '该派系斗争力未达异常阈值，暂无举报价值', updates: {} };
  }

  const prob = getInformExposureProb(save);
  // 确定性伪随机
  let seed = day;
  for (const c of targetFaction) seed = ((seed << 5) - seed + c.charCodeAt(0)) >>> 0;
  const rand = ((seed * 1664525 + 1013904223) >>> 0) / 0xffffffff;
  const exposed = rand < prob;

  const relations = getRelationFromSave(save);
  const baseUpdates: Partial<PlayerSave> = {
    factionCooldowns: { ...cd, [cfg.cooldownKey]: day + cfg.cooldownDays },
  };

  if (!exposed) {
    // 成功：削弱对手关系值
    const cur = relations[targetFaction] ?? 0;
    return {
      ok: true,
      message: `✓ 举报成功！削弱${targetFaction}派实力（关系${cfg.weakenRelation}），情报+${cfg.intelGain}，功绩+${cfg.meritReward}`,
      updates: {
        ...baseUpdates,
        [relField(targetFaction)]: Math.max(0, cur + cfg.weakenRelation),
        factionIntelligence: Math.min(100, (save.factionIntelligence ?? 0) + cfg.intelGain),
        meritPoints: (save.meritPoints ?? 0) + cfg.meritReward,
      },
    };
  }

  // 暴露
  const primary = save.primaryFaction as FactionId | '';
  const primaryCur = primary ? relations[primary] ?? 0 : 0;
  return {
    ok: false,
    message: `⚠ 举报暴露！风险值+${cfg.exposureRiskAdd}，本派关系${cfg.exposureRelPenalty}`,
    updates: {
      ...baseUpdates,
      riskValue: Math.min(100, (save.riskValue ?? 0) + cfg.exposureRiskAdd),
      ...(primary ? { [relField(primary)]: Math.max(0, primaryCur + cfg.exposureRelPenalty) } : {}),
    },
  };
}

/** relation 字段名映射（与 factionSystem.relFieldOf 一致，避免循环依赖） */
function relField(faction: FactionId): string {
  switch (faction) {
    case 'reform':    return 'reformFaction';
    case 'pragmatic': return 'pragmaticFaction';
    case 'cyl':       return 'cylRelation';
    case 'techno':    return 'technoRelation';
    default:          return 'localRelation';
  }
}

// ═══════════════════════════════════════════════════════════════
// D. 周期结算功绩分红
// ═══════════════════════════════════════════════════════════════

export interface DividendResult {
  merit: number;
  influence: number;
  message: string;
  updates: Partial<PlayerSave>;
}

/**
 * 周期结算时按本周期贡献发放功绩/声望分红。
 * @param factionWin 本周期派系是否整体胜出
 * @returns 分红结果与需写入的存档更新（含 cycleContestWins/cycleContribution 清零）
 */
export function settleCycleDividend(save: PlayerSave, factionWin: boolean): DividendResult {
  const cfg = CYCLE_DIVIDEND;
  const wins = save.cycleContestWins ?? 0;
  const merit = wins * cfg.perContestWinMerit + (factionWin ? cfg.factionWinMeritBonus : 0);
  const influence = factionWin ? cfg.factionWinInfluenceBonus : 0;
  const influenceCapped = Math.min(cfg.maxInfluence, (save.factionInfluence ?? 0) + influence);

  const parts: string[] = [];
  if (wins > 0) parts.push(`赢下 ${wins} 次争夺，功绩+${wins * cfg.perContestWinMerit}`);
  if (factionWin) parts.push(`派系整体胜，额外功绩+${cfg.factionWinMeritBonus}、影响力+${cfg.factionWinInfluenceBonus}`);
  const message = parts.length > 0
    ? `💰 周期功绩分红：${parts.join('；')}`
    : '💰 本周期无争夺贡献，无分红';

  return {
    merit,
    influence: influence,
    message,
    updates: {
      cycleContestWins: 0,
      cycleContribution: 0,
      meritPoints: (save.meritPoints ?? 0) + merit,
      factionInfluence: influenceCapped,
    },
  };
}

/** 记录一次职位争夺胜利（供 applyContestWin 调用方累加） */
export function bumpCycleContestWin(save: PlayerSave): Partial<PlayerSave> {
  return {
    cycleContestWins: (save.cycleContestWins ?? 0) + 1,
    cycleContribution: (save.cycleContribution ?? 0) + 1,
  };
}