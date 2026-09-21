// 破格晋升系统 v2.0（重构）
// 流程：提名 → 评审 → 公示 → 表决
// 触发条件：重大事件处置 / 国家级表彰 / 派系领袖提名 / 上司力荐
import type { PlayerSave } from '@/types/game';

/** 破格资格来源 */
export type BreakQualificationSource =
  | 'emergency'      // 重大突发事件处置得当
  | 'national_award' // 国家级表彰
  | 'faction_boss'   // 派系领袖提名
  | 'patron_push';   // 上司力排众议

/** 破格提名状态 */
export interface BreakNominationState {
  qualified: boolean;           // 是否具备破格资格
  source: BreakQualificationSource | null;
  qualifiedDay: number;         // 获得资格的游戏天
  expiryDay: number;           // 资格有效期（180天）
  applied: boolean;            // 是否已提交申请
  applicationStyle: 'merit' | 'network' | 'faction' | null; // 申请书风格
}

/** 评审委员 */
export interface Reviewer {
  id: string;
  name: string;
  faction: string;
  preference: 'merit' | 'network' | 'faction' | 'age';
  favor: number;      // -100~100，对玩家的态度
  bribed: boolean;    // 是否已被私下沟通
}

/** 评审阶段状态 */
export interface ReviewPhase {
  reviewers: Reviewer[];
  startedDay: number;
  endsDay: number;
  playerCommunicated: string[]; // 已沟通过的评审ID
  internalConflict: boolean;   // 是否触发内讧
  conflictResolved: boolean;
}

/** 公示阶段状态 */
export interface PublicityPhase {
  startedDay: number;
  endsDay: number;
  reports: { from: string; reason: string; day: number }[];
  playerChoice?: 'lawyer' | 'media' | 'connections' | null;
}

/** 表决阶段状态 */
export interface VotePhase {
  votes: { reviewerId: string; approve: boolean }[];
  passed: boolean;
}

/** 破格晋升全流程状态 */
export interface BreakPromotionFlow {
  nomination: BreakNominationState;
  review: ReviewPhase | null;
  publicity: PublicityPhase | null;
  vote: VotePhase | null;
  status: 'idle' | 'nominated' | 'reviewing' | 'publicity' | 'voting' | 'passed' | 'rejected';
}

/** 破格晋升后果标签 */
export interface BreakPromotionTag {
  label: '破格提拔';
  meritBonus: number;      // 政绩获取加成
  popularDecay: number;    // 民心衰减加成
  bossFavorBonus: number;  // 上司好感加成
  riskMultiplier: number; // 纪检关注度倍率
  remainingRanks: number;  // 剩余有效职级数
}

/** 失败标签 */
export interface BreakFailureTag {
  label: '揠苗助长';
  meritLossPercent: number; // 功绩损失比例
  penaltyDays: number;     // 惩罚持续天数
}

// ── 常量 ─────────────────────────────────────────────

const QUALIFY_EXPIRY_DAYS = 180;
const REVIEW_DAYS = 30;
const PUBLICITY_DAYS = 7;
const MIN_REVIEWERS = 5;
const MAX_REVIEWERS = 7;
const VOTE_PASS_THRESHOLD = 4; // 至少4票赞成

const REVIEWER_NAMES = ['组织部长', '纪检书记', '人事司长', '党派委员', '老领导', '政策专家', '地区代表'];

// ── 资格获取 ─────────────────────────────────────────

/** 检查是否满足破格资格（可在事件触发后调用） */
export function checkBreakQualification(save: PlayerSave, source: BreakQualificationSource): boolean {
  switch (source) {
    case 'emergency':
      // 重大事件：功绩≥2500 且 民心≥60
      return save.meritPoints >= 2500 && save.popularSupport >= 60;
    case 'national_award':
      // 国家级表彰：需要连续2年特等考评
      return save.consecutiveExcellentYears >= 2;
    case 'faction_boss':
      // 派系领袖提名：派系贡献≥2000
      return (save.factionContribution ?? 0) >= 2000;
    case 'patron_push':
      // 上司力荐：至少2位上司好感≥85
      return [save.bossFavor, save.boss2Favor, save.boss3Favor].filter(f => f >= 85).length >= 2;
  }
}

/** 初始化破格资格 */
export function grantBreakQualification(
  save: PlayerSave,
  source: BreakQualificationSource,
  day: number,
): BreakNominationState {
  return {
    qualified: true,
    source,
    qualifiedDay: day,
    expiryDay: day + QUALIFY_EXPIRY_DAYS,
    applied: false,
    applicationStyle: null,
  };
}

/** 资格是否过期 */
export function isQualificationExpired(nomination: BreakNominationState, day: number): boolean {
  return day > nomination.expiryDay;
}

// ── 提名阶段 ─────────────────────────────────────────

/** 提交破格申请（消耗100声望+50万资金） */
export function applyBreakNomination(
  save: PlayerSave,
  nomination: BreakNominationState,
  style: 'merit' | 'network' | 'faction',
): { ok: boolean; msg: string; updatedNomination: BreakNominationState } {
  const needSilver = 50;
  const needPublicity = 100;
  if ((save.silver ?? 0) < needSilver) {
    return { ok: false, msg: `资金不足：申请需 ${needSilver} 万`, updatedNomination: nomination };
  }
  if ((save.reputation?.publicity ?? 50) < needPublicity) {
    return { ok: false, msg: `声望不足：申请需 ${needPublicity} 舆论声望`, updatedNomination: nomination };
  }

  // 检查联名推荐：至少2位上司好感≥60
  const recommends = [save.bossFavor, save.boss2Favor, save.boss3Favor].filter(f => f >= 60).length;
  if (recommends < 2) {
    return {
      ok: false,
      msg: `联名推荐不足：需至少2位上司好感≥60（当前${recommends}位）`,
      updatedNomination: nomination,
    };
  }

  return {
    ok: true,
    msg: '破格申请已提交，进入评审阶段（30天）',
    updatedNomination: { ...nomination, applied: true, applicationStyle: style },
  };
}

// ── 评审阶段 ─────────────────────────────────────────

/** 生成评审委员会 */
export function generateReviewers(save: PlayerSave): Reviewer[] {
  const count = MIN_REVIEWERS + Math.floor(Math.random() * (MAX_REVIEWERS - MIN_REVIEWERS + 1));
  const prefs: Reviewer['preference'][] = ['merit', 'network', 'faction', 'age'];
  const primaryFaction = save.primaryFaction || 'neutral';

  const reviewers: Reviewer[] = [];
  for (let i = 0; i < count; i++) {
    const isSameFaction = Math.random() < 0.4;
    const baseFavor = isSameFaction ? 20 : -10;
    reviewers.push({
      id: `reviewer_${i}`,
      name: REVIEWER_NAMES[i % REVIEWER_NAMES.length],
      faction: isSameFaction ? primaryFaction : 'other',
      preference: prefs[i % prefs.length],
      favor: baseFavor + Math.floor(Math.random() * 20 - 10),
      bribed: false,
    });
  }
  return reviewers;
}

/** 初始化评审阶段 */
export function initReviewPhase(save: PlayerSave, day: number): ReviewPhase {
  return {
    reviewers: generateReviewers(save),
    startedDay: day,
    endsDay: day + REVIEW_DAYS,
    playerCommunicated: [],
    internalConflict: Math.random() < 0.2, // 20%概率内讧
    conflictResolved: false,
  };
}

/** 玩家私下沟通评审 */
export function communicateWithReviewer(
  save: PlayerSave,
  review: ReviewPhase,
  reviewerId: string,
  costSilver: number,
  costReputation: number,
): { ok: boolean; msg: string; updatedReview: ReviewPhase } {
  const rv = review.reviewers.find(r => r.id === reviewerId);
  if (!rv) return { ok: false, msg: '评审不存在', updatedReview: review };
  if (rv.bribed) return { ok: false, msg: '该评审已被沟通', updatedReview: review };
  if ((save.silver ?? 0) < costSilver) return { ok: false, msg: '资金不足', updatedReview: review };

  // 根据评审偏好判断沟通效果
  let favorDelta = 10;
  if (rv.preference === 'merit' && save.meritPoints >= 2000) favorDelta += 10;
  if (rv.preference === 'network' && (save.reputation?.network ?? 0) >= 50) favorDelta += 10;
  if (rv.preference === 'faction' && rv.faction === save.primaryFaction) favorDelta += 15;

  const nextReviewers = review.reviewers.map(r =>
    r.id === reviewerId ? { ...r, favor: Math.min(100, r.favor + favorDelta), bribed: true } : r,
  );

  return {
    ok: true,
    msg: `沟通成功：${rv.name} 态度改善（+${favorDelta}）`,
    updatedReview: {
      ...review,
      reviewers: nextReviewers,
      playerCommunicated: [...review.playerCommunicated, reviewerId],
    },
  };
}

/** 解决评审内讧 */
export function resolveReviewConflict(review: ReviewPhase): { resolved: boolean; msg: string } {
  if (!review.internalConflict) return { resolved: true, msg: '评审委员会运行平稳' };
  // 玩家已沟通过半评审时，可平息内讧
  if (review.playerCommunicated.length >= Math.ceil(review.reviewers.length / 2)) {
    return { resolved: true, msg: '你的斡旋平息了评审委员会的分歧' };
  }
  return { resolved: false, msg: '评审委员会内部争论激烈，需进一步沟通' };
}

// ── 公示阶段 ─────────────────────────────────────────

/** 初始化公示期 */
export function initPublicityPhase(save: PlayerSave, day: number): PublicityPhase {
  const reports: PublicityPhase['reports'] = [];
  // 政敌密集举报：每有一名活跃政敌，增加举报概率
  const activeRivals = (save.rivals ?? []).filter(r => r.status === 'active');
  for (const rival of activeRivals) {
    if (Math.random() < 0.4) {
      reports.push({
        from: rival.name,
        reason: `反映该同志在${rival.grudgeOrigin}中存在不当行为`,
        day: day + Math.floor(Math.random() * PUBLICITY_DAYS),
      });
    }
  }

  return {
    startedDay: day,
    endsDay: day + PUBLICITY_DAYS,
    reports,
    playerChoice: null,
  };
}

/** 危机公关选择 */
export function handlePublicityCrisis(
  save: PlayerSave,
  publicity: PublicityPhase,
  choice: 'lawyer' | 'media' | 'connections',
): { ok: boolean; msg: string; effect: { silverDelta: number; reputationDelta: number; popularDelta: number } } {
  switch (choice) {
    case 'lawyer':
      return {
        ok: true,
        msg: '聘请专业律师团队应对举报，法律层面澄清疑点。',
        effect: { silverDelta: -30, reputationDelta: 0, popularDelta: 5 },
      };
    case 'media':
      return {
        ok: true,
        msg: '通过媒体发布正面报道，塑造良好公众形象。',
        effect: { silverDelta: -20, reputationDelta: -50, popularDelta: 10 },
      };
    case 'connections':
      return {
        ok: true,
        msg: '通过关系网暗中摆平，举报材料被"妥善处置"。',
        effect: { silverDelta: -50, reputationDelta: 0, popularDelta: -5 },
      };
  }
}

// ── 表决阶段 ─────────────────────────────────────────

/** 执行表决 */
export function runVote(review: ReviewPhase, publicity: PublicityPhase): VotePhase {
  const votes = review.reviewers.map(rv => {
    // 基础概率：根据favor计算
    let approveProb = 0.5 + rv.favor / 200; // -100→0, 0→0.5, 100→1.0
    // 修正：被举报多的降概率
    const reportCount = publicity.reports.length;
    approveProb -= reportCount * 0.05;
    // 修正：同派系加成
    if (rv.faction === 'same') approveProb += 0.1;

    return { reviewerId: rv.id, approve: Math.random() < Math.max(0, Math.min(1, approveProb)) };
  });

  const approveCount = votes.filter(v => v.approve).length;
  return {
    votes,
    passed: approveCount >= VOTE_PASS_THRESHOLD,
  };
}

// ── 后果 ─────────────────────────────────────────────

/** 成功后果 */
export function applyBreakSuccess(save: PlayerSave): { tag: BreakPromotionTag; updates: Partial<PlayerSave> } {
  const tag: BreakPromotionTag = {
    label: '破格提拔',
    meritBonus: 0.15,
    popularDecay: 0.20,
    bossFavorBonus: 10,
    riskMultiplier: 1.5,
    remainingRanks: 2,
  };

  return {
    tag,
    updates: {
      // 上司初始好感+10
      bossFavor: Math.min(100, save.bossFavor + tag.bossFavorBonus),
      boss2Favor: Math.min(100, save.boss2Favor + tag.bossFavorBonus),
      boss3Favor: Math.min(100, save.boss3Favor + tag.bossFavorBonus),
    },
  };
}

/** 失败后果 */
export function applyBreakFailure(save: PlayerSave): { tag: BreakFailureTag; updates: Partial<PlayerSave> } {
  const tag: BreakFailureTag = {
    label: '揠苗助长',
    meritLossPercent: 0.5,
    penaltyDays: 180,
  };

  const meritLoss = Math.round(save.meritPoints * tag.meritLossPercent);

  return {
    tag,
    updates: {
      meritPoints: Math.max(0, save.meritPoints - meritLoss),
    },
  };
}

// ── 便捷函数 ─────────────────────────────────────────

/** 推进破格晋升流程（按天数自动推进） */
export function advanceBreakPromotion(
  flow: BreakPromotionFlow,
  save: PlayerSave,
  day: number,
): BreakPromotionFlow {
  if (flow.status === 'idle' || flow.status === 'passed' || flow.status === 'rejected') return flow;

  const next = { ...flow };

  if (next.status === 'nominated' && next.review && day >= next.review.endsDay) {
    // 评审结束，进入公示
    if (next.review.internalConflict && !next.review.conflictResolved) {
      // 内讧未解决，直接失败
      return { ...next, status: 'rejected', vote: null };
    }
    next.status = 'publicity';
    next.publicity = initPublicityPhase(save, day);
  }

  if (next.status === 'publicity' && next.publicity && day >= next.publicity.endsDay) {
    // 公示结束，进入表决
    next.status = 'voting';
    next.vote = runVote(next.review!, next.publicity);
    next.status = next.vote.passed ? 'passed' : 'rejected';
  }

  return next;
}

/** 检查是否可发起破格晋升 */
export function canStartBreakPromotion(save: PlayerSave): { ok: boolean; reason: string } {
  if (save.rankLevel >= 15) return { ok: false, reason: '已至最高职级' };
  // 检查是否有活跃流程
  // TODO: 检查 save.breakPromotionFlow 字段
  return { ok: true, reason: '' };
}
