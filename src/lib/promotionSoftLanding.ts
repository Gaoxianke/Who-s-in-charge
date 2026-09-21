// 晋升失败后"软着陆"系统 v1.0
// 失败类型细分 / 沉淀期加成 / 复盘奖励 / 叙事事件 / 隐性政治资本
import type { PlayerSave } from '@/types/game';
import { getTierOf } from '@/lib/promotionEngine';
import { buildTimingReport } from '@/lib/promotionTimingSystem';

/** 失败类型 */
export type FailureType = 'insufficient' | 'competitive' | 'political' | 'timing';

/** 失败详情 */
export interface FailureDetail {
  type: FailureType;
  label: string;
  description: string;
  suggestion: string;
}

/** 软着陆状态 */
export interface SoftLandingState {
  failureType: FailureType;
  failureDay: number;
  settlingEndDay: number;
  settlingBonusActive: boolean;
  reviewDone: boolean;
  reviewRewardClaimed: boolean;
  weaknessKey: string;
  implicitCapital: number; // 0-20，每次失败+2%
  selfChoice: 'strive' | 'laylow' | null;
  choiceEffectiveDay: number;
}

/** 沉淀期效果 */
export interface SettlingEffect {
  meritMultiplier: number;  // 功绩获取倍率
  reputationDecayReduction: number; // 声望衰减减免
}

/** 叙事事件 */
export interface NarrativeEvent {
  speaker: string;
  text: string;
  mood: 'comfort' | 'mock' | 'neutral';
}

// ── 常量 ─────────────────────────────────────────────

const SETTLING_DAYS = 90;
const SETTLING_MERIT_BONUS = 0.20; // +20%
const IMPLICIT_CAP_PER_FAILURE = 0.02; // +2%
const IMPLICIT_CAP_MAX = 0.20; // 最高20%

// ── 失败类型判定 ───────────────────────────────────────

/** 根据晋升门控结果判定失败类型 */
export function classifyFailure(save: PlayerSave, gateBlockReason: string): FailureDetail {
  // 功绩/民心/年限不足
  if (gateBlockReason.includes('功绩') || gateBlockReason.includes('民心') || gateBlockReason.includes('年限')) {
    return {
      type: 'insufficient',
      label: '实力不足',
      description: '硬性指标未达标：功绩、民心或任职年限尚不满足晋升要求。',
      suggestion: `建议积累${Math.max(1, Math.ceil((save.requiredMerit - save.meritPoints) / 10))}个月后再试。`,
    };
  }
  // 政治原因
  if (gateBlockReason.includes('派系') || gateBlockReason.includes('冻结') || gateBlockReason.includes('纪检')) {
    return {
      type: 'political',
      label: '政治阻力',
      description: '晋升通道被政治生态因素阻断：派系打压、纪检冻结或领导阻挠。',
      suggestion: '建议先解决政治阻力，再考虑晋升时机。',
    };
  }
  // 时机不对
  if (gateBlockReason.includes('窗口') || gateBlockReason.includes('周期') || gateBlockReason.includes('冷却')) {
    return {
      type: 'timing',
      label: '时机不利',
      description: '当前不在晋升窗口期，或外部环境不利。',
      suggestion: '建议等待下一轮窗口期（3-5月或9-11月）。',
    };
  }
  // 默认：竞争激烈
  return {
    type: 'competitive',
    label: '竞争激烈',
    description: '你的竞争评分低于对手，在晋升争夺中落败。',
    suggestion: '建议分析政敌优势，针对性提升短板维度。',
  };
}

// ── 沉淀期 ───────────────────────────────────────────

/** 初始化软着陆状态 */
export function initSoftLanding(save: PlayerSave, failureType: FailureType, day: number): SoftLandingState {
  const existingCapital = (save as unknown as Record<string, number>).implicitCapital ?? 0;
  const newCapital = Math.min(IMPLICIT_CAP_MAX, existingCapital + IMPLICIT_CAP_PER_FAILURE);

  return {
    failureType,
    failureDay: day,
    settlingEndDay: day + SETTLING_DAYS,
    settlingBonusActive: true,
    reviewDone: false,
    reviewRewardClaimed: false,
    weaknessKey: '',
    implicitCapital: newCapital,
    selfChoice: null,
    choiceEffectiveDay: 0,
  };
}

/** 获取沉淀期效果 */
export function getSettlingEffect(state: SoftLandingState | null, day: number): SettlingEffect {
  if (!state || !state.settlingBonusActive || day > state.settlingEndDay) {
    return { meritMultiplier: 1, reputationDecayReduction: 0 };
  }

  if (state.selfChoice === 'strive') {
    return { meritMultiplier: 1 + SETTLING_MERIT_BONUS + 0.20, reputationDecayReduction: 0 };
  }
  if (state.selfChoice === 'laylow') {
    return { meritMultiplier: 1 - 0.10, reputationDecayReduction: 0.50 };
  }

  return { meritMultiplier: 1 + SETTLING_MERIT_BONUS, reputationDecayReduction: 0 };
}

/** 结束沉淀期 */
export function endSettlingPeriod(state: SoftLandingState, day: number): SoftLandingState {
  if (day > state.settlingEndDay && state.settlingBonusActive) {
    return { ...state, settlingBonusActive: false };
  }
  return state;
}

// ── 复盘奖励 ───────────────────────────────────────────

/** 触发复盘 */
export function triggerReview(save: PlayerSave, failureType: FailureType): { msg: string; weaknessKey: string } {
  let weaknessKey = '';
  let msg = '';

  switch (failureType) {
    case 'insufficient':
      weaknessKey = save.meritPoints < save.requiredMerit ? 'merit' : save.popularSupport < 60 ? 'popular' : 'tenure';
      msg = `组织反馈：你的${weaknessKey === 'merit' ? '政绩积累' : weaknessKey === 'popular' ? '民心基础' : '任职年限'}尚有不足，建议重点补强。`;
      break;
    case 'competitive':
      weaknessKey = 'competition';
      msg = '组织反馈：你的竞争评分落后于对手，建议提升声望或改善与上司关系。';
      break;
    case 'political':
      weaknessKey = 'political';
      msg = '组织反馈：当前政治环境对你不利，建议韬光养晦，等待时机。';
      break;
    case 'timing':
      weaknessKey = 'timing';
      msg = '组织反馈：晋升时机选择不当，建议关注窗口期与外部环境。';
      break;
  }

  return { msg, weaknessKey };
}

/** 补齐短板后领取复盘奖励 */
export function claimReviewReward(save: PlayerSave, weaknessKey: string): { ok: boolean; msg: string; updates: Partial<PlayerSave> } {
  let isFixed = false;
  switch (weaknessKey) {
    case 'merit':
      isFixed = save.meritPoints >= save.requiredMerit;
      break;
    case 'popular':
      isFixed = save.popularSupport >= 60;
      break;
    case 'tenure':
      isFixed = save.tenureYears >= 3;
      break;
    case 'competition':
      isFixed = save.reputation ? Object.values(save.reputation).some(v => v >= 60) : false;
      break;
    case 'political':
      isFixed = !save.factionPromotionLocked && !save.promotion_frozen;
      break;
    case 'timing': {
      const report = buildTimingReport(save, save.gameDays, save.momentumActive ?? false);
      isFixed = report.score >= 50;
      break;
    }
  }

  if (!isFixed) {
    return { ok: false, msg: '短板尚未补齐，无法领取复盘奖励。', updates: {} };
  }

  return {
    ok: true,
    msg: '🎉 复盘奖励：补齐短板表现突出，组织给予额外认可！功绩+100，声望+5',
    updates: {
      meritPoints: save.meritPoints + 100,
      ...(save.reputation ? {
        reputation: { ...save.reputation, merit: Math.min(100, save.reputation.merit + 5) },
      } : {}),
    },
  };
}

// ── 叙事事件 ───────────────────────────────────────────

/** 生成失败后叙事事件 */
export function generateFailureNarratives(save: PlayerSave): NarrativeEvent[] {
  const events: NarrativeEvent[] = [];

  events.push({
    speaker: '直属领导',
    text: '不要灰心，组织上对你还是有期待的。这次没成，下次机会更大。',
    mood: 'comfort',
  });

  const avgFavor = (save.bossFavor + save.boss2Favor + save.boss3Favor) / 3;
  if (avgFavor >= 60) {
    events.push({
      speaker: '同事',
      text: '没事，下次一定行！你能力这么强，晋升是迟早的事。',
      mood: 'comfort',
    });
  } else {
    events.push({
      speaker: '政敌',
      text: '早就说了你不行，还想破格？痴心妄想。',
      mood: 'mock',
    });
  }

  return events;
}

// ── 自我选择 ───────────────────────────────────────────

/** 发愤图强 */
export function chooseStrive(state: SoftLandingState, day: number): SoftLandingState {
  return { ...state, selfChoice: 'strive', choiceEffectiveDay: day };
}

/** 韬光养晦 */
export function chooseLayLow(state: SoftLandingState, day: number): SoftLandingState {
  return { ...state, selfChoice: 'laylow', choiceEffectiveDay: day };
}

// ── 便捷函数 ───────────────────────────────────────────

/** 计算含隐性资本的未来晋升成功率加成 */
export function calcImplicitCapitalBonus(state: SoftLandingState | null): number {
  return state?.implicitCapital ?? 0;
}

/** 月度结算时检查软着陆状态 */
export function monthlySoftLandingCheck(
  state: SoftLandingState | null,
  _save: PlayerSave,
  day: number,
): { state: SoftLandingState | null; events: string[] } {
  const events: string[] = [];
  if (!state) return { state: null, events };

  if (state.settlingBonusActive && day > state.settlingEndDay) {
    events.push('沉淀期结束：知耻后勇阶段已过，功绩加成恢复正常。');
    return { state: { ...state, settlingBonusActive: false }, events };
  }

  if (state.settlingBonusActive) {
    const remaining = state.settlingEndDay - day;
    if (remaining === 30 || remaining === 60) {
      events.push(`⏳ 沉淀期剩余 ${remaining} 天：功绩获取+20%（知耻后勇）`);
    }
  }

  return { state, events };
}
