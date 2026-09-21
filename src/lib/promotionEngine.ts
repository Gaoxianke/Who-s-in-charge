// 晋升系统 v2 核心逻辑引擎
// 六项硬门槛 / 竞争综合评分 / 政治生态规则 / 破格判定 / 洗白与协调
import type { PlayerSave, FactionId, PoliticalWind } from '@/types/game';
import { calcKFaction, getDominantFaction, getLosingFaction } from '@/lib/factionSystem';
import { computeReputationScore } from '@/lib/reputationSystem';
import {
  AGE_RANGES, AGE_BONUS, POPULAR_THRESHOLD, FAVOR_THRESHOLD,
  COMPETITION_WEIGHTS, BASE_TENURE, BREAK_RULE, ASSESS_ACCEL,
  FREEZE_RULES, assessToScore, computeAgeBonus, computeBaseTenureFactor,
  LAUNDER_RISK_DIVISOR, COORD_RISK, PATRONAGE_TIERS,
} from '@/lib/promotionConfig';

// ── 门槛检查结果 ──
export interface GateResult {
  key: string;
  label: string;
  passed: boolean;
  detail: string;
}

/** 六项硬门槛检查（一票否决） */
export function checkHardGates(save: PlayerSave): GateResult[] {
  const tier = getTierOf(save.rankLevel);
  const range = AGE_RANGES[tier];
  const popularReq = POPULAR_THRESHOLD[tier] ?? 30;
  const favors = [save.bossFavor, save.boss2Favor, save.boss3Favor];
  const minFavor = Math.min(...favors);
  const accel = computeTenureAccel(save);
  const effectiveTenure = save.tenureYears * (1 + accel);

  return [
    {
      key: 'tenure',
      label: '任职年限',
      passed: effectiveTenure >= save.requiredTenureYears,
      detail: `已任职 ${save.tenureYears.toFixed(1)} 年（加速后 ${effectiveTenure.toFixed(1)} 年），要求 ${save.requiredTenureYears} 年`,
    },
    {
      key: 'merit',
      label: '功绩积累',
      passed: save.meritPoints >= save.requiredMerit,
      detail: `当前功绩 ${Math.round(save.meritPoints)}，要求 ${save.requiredMerit}`,
    },
    {
      key: 'assess',
      label: '考评等级',
      passed: save.assessmentGrade === '优秀' || save.assessmentGrade === '良好' || save.assessmentGrade === '特等',
      detail: `当前考评 ${save.assessmentGrade}，需达到良好及以上`,
    },
    {
      key: 'popular',
      label: '民心值',
      passed: save.popularSupport >= popularReq,
      detail: `当前民心值 ${save.popularSupport}，要求 ${popularReq}`,
    },
    {
      key: 'favor',
      label: '上级认可度',
      passed: minFavor >= FAVOR_THRESHOLD.min,
      detail: `三位上级最低认可度 ${minFavor}，要求均 ≥ ${FAVOR_THRESHOLD.min}`,
    },
    {
      key: 'age',
      label: '年龄条件',
      passed: save.playerAge >= range.ageMin && save.playerAge <= range.ageMax,
      detail: `当前年龄 ${save.playerAge} 岁，适龄区间 ${range.ageMin}-${range.ageMax} 岁`,
    },
  ];
}

export function getTierOf(rankLevel: number): number {
  if (rankLevel <= 3) return 1;
  if (rankLevel <= 6) return 2;
  if (rankLevel <= 9) return 3;
  if (rankLevel <= 11) return 4;
  return 5;
}

/** 考评加速减免比例 */
export function computeTenureAccel(save: PlayerSave): number {
  const g = save.assessmentGrade;
  const c = save.consecutiveExcellentYears;
  if (g === '特等') return c >= 2 ? ASSESS_ACCEL.special2 : ASSESS_ACCEL.special;
  if (g === '优秀') return c >= 2 ? ASSESS_ACCEL.excellent2 : ASSESS_ACCEL.excellent;
  return 0;
}

/** 是否晋升冻结（含 §3.22 派系斗争交战期锁定 + 火线提拔 debuff） */
export function isPromotionFrozen(save: PlayerSave): boolean {
  if (save.promotion_frozen) return true;
  // §4.2⑧ 派系斗争交战期：factionPromotionLocked=true → 一票否决
  if (save.factionPromotionLocked) return true;
  // §2.5⑦ 无派系永久锁死
  if (save.factionlessLocked) return true;
  if (save.popularSupport <= FREEZE_RULES.popularEnd) return true;
  // 火线提拔"根基不稳"：90 天内冻结
  if ((save.firePromotionDebuffDays ?? 0) > 0) return true;
  return false;
}

/** 返回晋升冻结的具体原因（未冻结返回 null），用于在晋升页标明原因 */
export function getFreezeReason(save: PlayerSave): string | null {
  // §2.5⑦ 无派系永久锁死
  if (save.factionlessLocked) return '无派系：未加入任何派系，晋升被永久锁死';
  // §4.2⑧ 派系斗争交战期：factionPromotionLocked=true → 一票否决
  if (save.factionPromotionLocked) return '派系斗争交战期：当前处于派系斗争交战期，晋升被锁定';
  if (save.promotion_frozen) return '晋升冻结：系统已冻结当前晋升通道';
  // 火线提拔 debuff
  if ((save.firePromotionDebuffDays ?? 0) > 0) return `根基不稳：火线提拔后 ${save.firePromotionDebuffDays} 天内晋升冻结`;
  if (save.popularSupport <= FREEZE_RULES.popularEnd) {
    return `民心不足：民心支持度 ${save.popularSupport} 低于冻结阈值 ${FREEZE_RULES.popularEnd}`;
  }
  return null;
}

/** 是否超龄窗口关闭 */
export function isWindowLocked(save: PlayerSave): boolean {
  const tier = getTierOf(save.rankLevel);
  const range = AGE_RANGES[tier];
  return save.playerAge > range.ageMax + AGE_BONUS.overAgeGraceYears;
}

/** 是否处于超龄过渡（超上限 5 年）*/
export function isOverAgeTransition(save: PlayerSave): boolean {
  const tier = getTierOf(save.rankLevel);
  const range = AGE_RANGES[tier];
  return save.playerAge > range.ageMax + AGE_BONUS.overAgeGraceYears;
}

/** 是否功高盖主：民心≥90 且连续2年优秀/特等 */
export function isPrestigeHigh(save: PlayerSave): boolean {
  return save.popularSupport >= 90 && (save.consecutiveExcellentYears ?? 0) >= 2;
}

/** 是否非正式关系密切：某位上司好感≥85 */
export function isClique(save: PlayerSave): boolean {
  const favors = [save.bossFavor, save.boss2Favor, save.boss3Favor];
  return favors.some(f => f >= 85);
}

/** 是否领导阻挠：某位上司好感<40 */
export function isLeaderObstruct(save: PlayerSave): boolean {
  const favors = [save.bossFavor, save.boss2Favor, save.boss3Favor];
  return favors.some(f => f < 40);
}

/** 玩家竞争综合评分（含年龄红利、基层系数、§4.2 K_faction） */
export function computePlayerScore(save: PlayerSave): number {
  const tier = getTierOf(save.rankLevel);
  const meritNorm = Math.min(100, (save.meritPoints / save.requiredMerit) * 60 + 40);
  const popularNorm = save.popularSupport;
  const assessNorm = assessToScore(save.assessmentGrade);
  const favorNorm = Math.min(100, (save.bossFavor + save.boss2Favor + save.boss3Favor) / 3);
  let score = meritNorm * COMPETITION_WEIGHTS.merit
    + popularNorm * COMPETITION_WEIGHTS.popular
    + assessNorm * COMPETITION_WEIGHTS.assess
    + favorNorm * COMPETITION_WEIGHTS.favor;
  // 年龄红利
  score += computeAgeBonus(save.playerAge, tier);
  // 基层任期系数
  score *= computeBaseTenureFactor(save.base_tenure_years);
  // 下次优先加分（旧机制）+ 等待耐心积累加成
  score += save.next_priority_bonus + (save.waitingState?.bonus ?? 0);
  // 造势加成（窗口内成功率 +10%，按竞争评分折算）
  if (save.momentumActive) score *= 1.1;

  // §4.2  K_faction 晋升派系系数（0.4–1.8，默认 1.0 即原行为）
  // factionlessLocked / factionPromotionLocked 已在 isPromotionFrozen 中一票否决，
  // 此处仅对 promotable=true 时应用系数缩放。
  const kResult = calcKFaction({
    primaryFaction: (save.primaryFaction as FactionId) || null,
    relation: {
      reform:    save.reformFaction    ?? 50,
      pragmatic: save.pragmaticFaction ?? 50,
      cyl:       save.cylRelation      ?? 30,
      techno:    save.technoRelation   ?? 30,
      local:     save.localRelation    ?? 30,
    },
    dominantFaction: (save.dominantFaction as FactionId | null) ?? null,
    losingFaction:   getLosingFaction((save.politicalWind ?? 'balanced') as PoliticalWind),
    bandFactions:    [],   // 同步调用无 band 数据；PostsTab 异步版可传入完整列表
    isFlagged:             save.isFlagged            ?? false,
    factionlessLocked:     save.factionlessLocked    ?? false,
    factionPromotionLocked: save.factionPromotionLocked ?? false,
  });
  // promotable=false 时得分归零（与 isPromotionFrozen 双重保险）
  if (!kResult.promotable) return 0;

  // §5 政治声望加成：五维声望综合分（0-100）与基准 50 的差值，按 0.5 折算进竞争评分
  if (save.reputation) {
    const repScore = computeReputationScore(save.reputation, save.rankLevel);
    score += (repScore - 50) * 0.5;
  }

  return Math.round(score * kResult.kFaction * 10) / 10;
}

/** NPC 候选人综合评分 */
export function computeNpcScore(c: {
  merit_score: number; popularity_score: number; assess_score: number; favor_score: number;
}): number {
  const score = c.merit_score * COMPETITION_WEIGHTS.merit
    + c.popularity_score * COMPETITION_WEIGHTS.popular
    + c.assess_score * COMPETITION_WEIGHTS.assess
    + c.favor_score * COMPETITION_WEIGHTS.favor;
  return Math.round(score * 10) / 10;
}

// ── 破格条件检查 ──
export interface BreakCondition {
  key: string;
  label: string;
  met: boolean;
  detail: string;
}
export function checkBreakConditions(save: PlayerSave): BreakCondition[] {
  return [
    {
      key: 'merit_special',
      label: '年度功绩特别突出',
      met: save.meritPoints >= save.requiredMerit * BREAK_RULE.meritMultiple && save.assessmentGrade === '特等',
      detail: `功绩达到要求值的 ${BREAK_RULE.meritMultiple} 倍且考评特等`,
    },
    {
      key: 'popular_solid',
      label: '民心基础扎实',
      met: save.popularSupport >= 90 && save.consecutiveExcellentYears >= 3,
      detail: `民心值 ≥90 且连续 3 年优秀`,
    },
    {
      key: 'major_task',
      label: '重大专项任务完成',
      met: false,
      detail: '完成重大攻坚专项并被上级通报表扬（事件触发）',
    },
    {
      key: 'major_contribution',
      label: '重大贡献',
      met: false,
      detail: '重大突发情况处置得力，获专项嘉奖（事件触发）',
    },
  ];
}

/** 破格是否可用 */
export function canBreak(save: PlayerSave): { ok: boolean; reason: string } {
  if (save.break_rule_used >= BREAK_RULE.maxUsePerTier) return { ok: false, reason: '本职级段破格机会已用完' };
  const favors = [save.bossFavor, save.boss2Favor, save.boss3Favor];
  if (Math.min(...favors) < BREAK_RULE.favorMin) return { ok: false, reason: `三位上级认可度需均 ≥ ${BREAK_RULE.favorMin}` };
  const met = checkBreakConditions(save).some(c => c.met);
  if (!met) return { ok: false, reason: '尚未满足任何破格触发条件' };
  return { ok: true, reason: '' };
}

/** 破格年限减免（减半，最低1年） */
export function breakTenureReduction(requiredYears: number): number {
  return Math.max(BREAK_RULE.minYears, requiredYears / 2);
}

// ── 洗白查获概率计算 ──
export function computeLaunderProb(baseProb: number, riskValue: number): number {
  const prob = baseProb + riskValue / LAUNDER_RISK_DIVISOR;
  return Math.round(prob * 10) / 10;
}

// ── 非正式协调查获概率计算 ──
export function computeCoordProb(
  tierId: string,
  targetIntegrity: number,
  bribeCount: number,
  riskValue: number,
  source: 'legal' | 'illicit',
): number {
  let prob = COORD_RISK.baseProb;
  if (tierId === 'large') prob += COORD_RISK.largeBonus;
  if (tierId === 'huge') prob += COORD_RISK.hugeBonus;
  if (targetIntegrity >= 80) prob += COORD_RISK.integrityHighBonus;
  prob += bribeCount * COORD_RISK.freqBonus;
  prob += (riskValue / 10) * COORD_RISK.riskPer10;
  if (source === 'illicit') prob += COORD_RISK.illicitExtraProb;
  return Math.round(prob * 10) / 10;
}

/** 是否获得庇护状态 */
export function hasPatronage(tierId: string): boolean {
  return PATRONAGE_TIERS.includes(tierId);
}

/** 生成任职文号 */
export function generateDocNo(gameDays: number): string {
  const year = 2020 + Math.floor(gameDays / 365);
  const seq = String(Math.floor(Math.random() * 900) + 100);
  return `任职〔${year}〕第 ${seq} 号`;
}

// ── 政治生态月度结算 ──
// 功高盖主 / 非正式关系密切 / 领导阻挠 / 越级赏识 四类政治生态事件
export interface EcologyResult {
  bossFavorDelta: number;
  boss2FavorDelta: number;
  boss3FavorDelta: number;
  meritDelta: number;
  popularDelta: number;
  prestige_flag: boolean;
  clique_flag: boolean;
  leader_obstruct: boolean;
  promotion_frozen: boolean;
  promo_freeze_until_day: number;
  patron_id: string | null;
  patron_favor: number;
  patron_expire_day: number;
  patron_fail_months: number;
  investState?: 'liangan';
  caseStartDay?: number;
  events: string[];
}

/**
 * 每月结算政治生态：功高盖主 / 非正式关系密切 / 领导阻挠 / 越级赏识
 * 返回增量与标记，由 GameContext 合并写入存档。
 */
export function settlePoliticalEcology(save: PlayerSave, gameDays: number): EcologyResult {
  const r: EcologyResult = {
    bossFavorDelta: 0, boss2FavorDelta: 0, boss3FavorDelta: 0,
    meritDelta: 0, popularDelta: 0,
    prestige_flag: false, clique_flag: false,
    leader_obstruct: false, promotion_frozen: save.promotion_frozen,
    promo_freeze_until_day: save.promo_freeze_until_day,
    patron_id: save.patron_id ?? null, patron_favor: save.patron_favor ?? 0,
    patron_expire_day: save.patron_expire_day ?? 0, patron_fail_months: save.patron_fail_months ?? 0,
    events: [],
  };

  // 冻结到期解除
  if (save.promotion_frozen && save.promo_freeze_until_day > 0 && gameDays >= save.promo_freeze_until_day) {
    r.promotion_frozen = false;
    r.promo_freeze_until_day = 0;
    r.events.push('晋升冻结已解除');
  }

  // §1 功高盖主：民心≥90且连续2年优秀 → 上司好感每月衰减
  if (isPrestigeHigh(save)) {
    r.prestige_flag = true;
    r.bossFavorDelta -= 2;
    r.boss2FavorDelta -= 2;
    r.boss3FavorDelta -= 2;
    r.events.push('⚠️ 功高盖主：民心声望过高，引发上级警觉，三位上司好感每月-2');
  }

  // §2 非正式关系密切：某位上司好感≥85 → 冻结晋升180天
  if (isClique(save)) {
    r.clique_flag = true;
    if (!save.promotion_frozen) {
      r.promotion_frozen = true;
      r.promo_freeze_until_day = gameDays + 180;
      r.meritDelta -= 200;
      r.popularDelta -= 10;
      r.events.push('❌ 非正式关系密切：与某位上司关系过于密切，引发纪检关注，晋升冻结180天，功绩-200，民心-10');
    }
  }

  // §3 领导阻挠：某位上司好感<40 → 竞争对手加分
  if (isLeaderObstruct(save)) {
    r.leader_obstruct = true;
    r.meritDelta -= 50;
    r.events.push('⚠️ 领导阻挠：某位上司对你不满，晋升竞争中处于劣势，功绩-50');
  }

  // §4 越级赏识：功绩≥1.2倍要求且民心≥80 → 5%概率触发庇护
  const meritRatio = save.meritPoints / (save.requiredMerit || 1);
  if (meritRatio >= 1.2 && save.popularSupport >= 80 && Math.random() < 0.05) {
    r.patron_id = 'upper_patron';
    r.patron_favor = 15;
    r.patron_expire_day = gameDays + 365;
    r.meritDelta += 80;
    r.events.push('✨ 越级赏识：上级领导注意到你的突出表现，获得政治庇护，功绩+80，庇护有效期365天');
  }

  // §5 庇护到期检查
  if (save.patron_id && save.patron_expire_day > 0 && gameDays >= save.patron_expire_day) {
    r.patron_id = null;
    r.patron_favor = 0;
    r.patron_expire_day = 0;
    r.events.push('庇护关系已到期');
  }

  return r;
}