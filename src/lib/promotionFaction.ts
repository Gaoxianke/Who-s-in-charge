// 派系晋升联动模块（§一：双轨胜利）
// evaluateStruggle / resolveContest / applyContestWin / applyFactionLossPenalty
// v4：resolveContest 底层改调 provinceSeatSystem（calcFactionPower / resolvePersonalContest），
//     applyContestWin / applyFactionLossPenalty 保持不变
import {
  ALL_FACTIONS,
  RANK_CONFIG,
  getRandomCityForRank,
  type FactionId,
  type PlayerSave,
  type PositionSeat,
  type PromotionContest,
  type ContestRecord,
  type PromotionKind,
  type FactionPositionDef,
  FACTION_POSITIONS,
} from '@/types/game';
import {
  calcBandSynergy,
  applyRelDeltaToSave,
  getRelationFromSave,
  FACTION_RELATION_MATRIX,
  WIND_CYCLE_DAYS,
} from '@/lib/factionSystem';
import { buildBoard, computeFactionControl, controlsHub } from '@/lib/positionBoard';
import { resolvePersonalContest } from '@/lib/provinceSeatSystem';

// ── 配置常量（统一出口，不硬编码在业务函数内）────────────────────
export const FACTION_LOSS_INFLUENCE_PENALTY  = 15;  // 影响力损失
export const FACTION_LOSS_RELATION_PENALTY   = 12;  // 主派关系损失
export const FACTION_LOSS_SUPPORT_PENALTY    = 6;   // 民心损失
export const FACTION_LOSS_TAX_PENALTY        = 8;   // 税收指数损失
export const FACTION_LOSS_SETBACK_DAYS       = 180; // 失势冻结天数
export const FACTION_WIN_CONTROL_THRESHOLD   = 0.5; // 控制度过半阈值

// ──────────────────────────────────────────────────────────────────
// §一.1  evaluateStruggle：棋盘胜负判定
// ──────────────────────────────────────────────────────────────────

export interface StruggleEvaluation {
  /** 本派控制度（0~1） */
  controlRatio: number;
  /** 是否整体胜利（过半 OR 攻克枢纽） */
  factionWin: boolean;
  /** 是否通过控制度过半胜利 */
  winByMajority: boolean;
  /** 是否通过攻克枢纽席位胜利 */
  winByHub: boolean;
  /** 玩家个人职务是否胜利（sYou >= sOpp） */
  playerContestWin: boolean;
}

/**
 * 综合评估当前派系斗争结果。
 * @param save   玩家存档
 * @param boardSeats  当前棋盘席位（由 buildBoard 生成，或从 save.boardSeats 读取）
 */
export function evaluateStruggle(
  save: PlayerSave,
  boardSeats: PositionSeat[],
): StruggleEvaluation {
  const fid = save.primaryFaction as FactionId | '';
  if (!fid) {
    return { controlRatio: 0, factionWin: false, winByMajority: false, winByHub: false, playerContestWin: false };
  }

  const controlRatio   = computeFactionControl(boardSeats, fid as FactionId);
  const winByMajority  = controlRatio >= FACTION_WIN_CONTROL_THRESHOLD;
  const winByHub       = controlsHub(boardSeats, fid as FactionId);
  const factionWin     = winByMajority || winByHub;

  // 玩家个人职务胜利：当前进行中的争夺 sYou >= sOpp
  const contest = save.promotionContest;
  const playerContestWin = contest
    ? contest.status === 'active' && contest.sYou >= contest.sOpp
    : false;

  return { controlRatio, factionWin, winByMajority, winByHub, playerContestWin };
}

// ──────────────────────────────────────────────────────────────────
// §一.1  resolveContest：计算争夺力（sYou / sOpp）
// v4：底层改调 provinceSeatSystem.resolvePersonalContest（10% 派系 + 90% 个人）
// ──────────────────────────────────────────────────────────────────

/**
 * 计算玩家发起争夺时的 sYou / sOpp，返回可写入 PromotionContest 的数值。
 * v4 公式：sYou = 派系贡献(10%) + 个人战力(90%)；sOpp = 竞争派系实力均值。
 */
export function resolveContest(
  save: PlayerSave,
  bandFactions: FactionId[] = [],
  positionKey = '',
  positionTitle = '',
  toRank = 0,
): { sYou: number; sOpp: number } {
  const targetCity = save.cityName;
  const result = resolvePersonalContest(
    save,
    bandFactions,
    positionKey,
    positionTitle,
    toRank,
    targetCity,
  );
  return { sYou: result.sYou, sOpp: result.sOpp };
}

/**
 * resolveContest 的完整版：附带战力分解详情（供 UI 分解条/历史记录）。
 */
export function resolveContestDetailed(
  save: PlayerSave,
  bandFactions: FactionId[],
  positionKey: string,
  positionTitle: string,
  toRank: number,
  targetCity: string,
) {
  return resolvePersonalContest(save, bandFactions, positionKey, positionTitle, toRank, targetCity);
}

// ──────────────────────────────────────────────────────────────────
// §一.1  applyContestWin：玩家个人职务晋升落地
// ──────────────────────────────────────────────────────────────────

/**
 * 玩家个人职务赢得争夺后，更新存档字段。
 * 注意：此函数只处理玩家职务晋升，不结束派系斗争回合。
 * @returns Partial<PlayerSave> 可合并进 updateSave 的更新集合
 */
export function applyContestWin(
  save: PlayerSave,
  contest: PromotionContest,
  day: number,
): Partial<PlayerSave> {
  // #4 禁止跳级：目标职级严格 = 当前职级 + 1，忽略 contest.toRank 中的越级值
  const newRank    = save.rankLevel + 1;
  const rankCfg    = RANK_CONFIG[newRank];
  const newRankName = rankCfg?.name ?? save.rankName;
  const shouldChangeCity = rankCfg?.randomCity ?? false;
  // #1 职位不乱窜：落档城市严格使用界面选择的目标城市，不再随机替换
  // 兼容历史存档中可能缺失 targetCity 的争夺，缺省时保持当前城市
  const newCity    = shouldChangeCity ? (contest.targetCity || save.cityName) : save.cityName;

  // 结束当前争夺，写入历史
  const wonContest: PromotionContest = { ...contest, status: 'won' };
  const historyEntry: ContestRecord = {
    id:            contest.id,
    positionTitle: contest.positionTitle,
    toRank:        newRank,
    sYou:          contest.sYou,
    sOpp:          contest.sOpp,
    result:        'won',
    day,
  };

  // #8 编制占用：该职位已占用数 +1
  const occupancy = { ...(save.positionOccupancy ?? {}) };
  occupancy[contest.positionKey] = (occupancy[contest.positionKey] ?? 0) + 1;

  return {
    rankLevel:        newRank,
    rankName:         newRankName,
    playerPosition:   contest.positionTitle,
    cityName:         newCity,
    promotionContest: wonContest,
    contestHistory:   [...(save.contestHistory ?? []), historyEntry],
    last_promotion_day: day,
    tenureDays:       0,
    tenureYears:      0,
    rooting_days:     90,
    popularSupport:   Math.max(0, (save.popularSupport ?? 50) - 5),
    // #7 普通晋升每斗争周期内最多一次：记录所用周期（不再因考核优秀连升）
    lastPromotionCycleId: getContestCycleId(day),
    // #6 派系贡献累计：赢下个人争夺 +150
    factionContribution: (save.factionContribution ?? 0) + 150,
    positionOccupancy:   occupancy,
  };
}

// ──────────────────────────────────────────────────────────────────
// §一.1  applyFactionLossPenalty：派系整体败时的惩罚
// ──────────────────────────────────────────────────────────────────

/**
 * 派系整体败时施加惩罚（与玩家个人职务胜负无关，必须触发）。
 * @returns Partial<PlayerSave> 可合并进 updateSave 的更新集合
 */
export function applyFactionLossPenalty(
  save: PlayerSave,
  day: number,
): Partial<PlayerSave> {
  const fid = save.primaryFaction as FactionId | '';
  const relDelta = fid
    ? applyRelDeltaToSave(save, fid as FactionId, -FACTION_LOSS_RELATION_PENALTY)
    : {};

  // 若当前有进行中的争夺，也写入 expired 历史
  const current = save.promotionContest;
  const expiredEntry: ContestRecord | null = current && current.status === 'active'
    ? {
        id:            current.id,
        positionTitle: current.positionTitle,
        toRank:        current.toRank,
        sYou:          current.sYou,
        sOpp:          current.sOpp,
        result:        'lost',
        day,
      }
    : null;

  // v6：若有声望经济兑换的失势豁免次数，消耗一次并豁免失势冻结
  const hasImmunity = (save.setbackImmunity ?? 0) > 0;
  const setbackUntil = hasImmunity ? 0 : day + FACTION_LOSS_SETBACK_DAYS;

  return {
    // P2：派系整体败仅施加软性损失（影响力/民心/税收/关系）+ 派系席位失势冷却，
    //     不再写入玩家 lastPromotionCycleId、不再冻结个人晋升（factionPromotionLocked），
    //     避免弱势派系连败导致玩家晋升周期被永久消耗。
    factionInfluence:       Math.max(0, (save.factionInfluence ?? 0) - FACTION_LOSS_INFLUENCE_PENALTY),
    popularSupport:         Math.max(0, (save.popularSupport ?? 50) - FACTION_LOSS_SUPPORT_PENALTY),
    taxRevenue:             Math.max(0, (save.taxRevenue ?? 0) - FACTION_LOSS_TAX_PENALTY),
    factionSetbackUntilDay: setbackUntil,
    promotionContest:       null,
    contestHistory: expiredEntry
      ? [...(save.contestHistory ?? []), expiredEntry]
      : save.contestHistory ?? [],
    ...(hasImmunity ? { setbackImmunity: (save.setbackImmunity ?? 0) - 1 } : {}),
    ...relDelta,
  };
}

// ──────────────────────────────────────────────────────────────────
// §一.4  周期边界：expire 过期争夺
// ──────────────────────────────────────────────────────────────────

/** 到达周期边界仍未赢的争夺置为 expired */
export function expireContest(
  save: PlayerSave,
  day: number,
): Partial<PlayerSave> {
  const current = save.promotionContest;
  if (!current || current.status !== 'active') return {};

  const expiredEntry: ContestRecord = {
    id:            current.id,
    positionTitle: current.positionTitle,
    toRank:        current.toRank,
    sYou:          current.sYou,
    sOpp:          current.sOpp,
    result:        'expired',
    day,
  };

  return {
    promotionContest: { ...current, status: 'expired' },
    contestHistory:   [...(save.contestHistory ?? []), expiredEntry],
  };
}

// ──────────────────────────────────────────────────────────────────
// §一.4  周期边界：派系整体胜后解锁
// ──────────────────────────────────────────────────────────────────

/** 派系整体胜后解锁晋升冻结，斗争阶段置 truce */
export function applyFactionWin(_save: PlayerSave): Partial<PlayerSave> {
  return {
    strugglePhase:          'truce',
    factionPromotionLocked: false,
  };
}

// ──────────────────────────────────────────────────────────────────
// 辅助：刷新棋盘（构建并写入 boardSeats）
// ──────────────────────────────────────────────────────────────────

/** 重新构建棋盘，返回可合并的存档更新 */
export function refreshBoard(save: PlayerSave): Partial<PlayerSave> {
  const seats = buildBoard(save);
  return { boardSeats: seats };
}

// ──────────────────────────────────────────────────────────────────
// §v5  晋升硬门控（checkPromotionGate）
// ──────────────────────────────────────────────────────────────────

/** v5 晋升附加条件配置（全部可覆盖，禁止在函数体内硬编码） */
export const PROMOTION_HARD_CONDITIONS = {
  minMeritPoints:    60,   // 最低功绩要求
  minPopularSupport: 45,   // 最低民心要求
  minFactionRelation: 35,  // 最低主派关系值
  requireNoCase:     true, // 是否要求无立案（isFlagged=false）
  requireNoSetback:  true, // 是否要求未处于失势冻结期
} as const;

export interface PromotionGateDetail {
  key: string;
  label: string;
  pass: boolean;
  current: number | boolean | string;
  required: number | boolean | string;
}

export interface PromotionGateResult {
  allowed: boolean;
  blockReason: string | null;
  details: PromotionGateDetail[];
}

/** v5：晋升/斗争周期 id（与斗争周期同源，每 WIND_CYCLE_DAYS 天一轮） */
export function getContestCycleId(gameDays: number): number {
  return Math.floor(gameDays / WIND_CYCLE_DAYS);
}

/**
 * 统一晋升调度：所有晋升（普通 / 破格 / 举荐）走同一入口校验。
 * 硬性阻断（一票否决，返回空 details）：进行中争夺、降职冷却期、本轮已用（普通/举荐）、破格前置不满足。
 * 软性门控（写入 details 逐项展示）：年龄、任期、政绩、派系贡献、编制空缺、无立案、无失势冻结、民心、主派关系。
 */
export function validatePromotion(
  save: PlayerSave,
  kind: PromotionKind,
  positionKey = '',
): PromotionGateResult {
  const contest = save.promotionContest;
  const currentCycleId = getContestCycleId(save.gameDays);

  // 硬性阻断：进行中的职位争夺
  if (contest && contest.status === 'active') {
    return { allowed: false, blockReason: '存在进行中的职位争夺战，等待周期结算', details: [] };
  }
  // 硬性阻断：降职冷却期（P5）
  if (save.gameDays <= (save.demotionCooldownUntil ?? 0)) {
    return { allowed: false, blockReason: '处于降职冷却期，暂不可晋升', details: [] };
  }
  // 普通晋升 / 举荐：每斗争周期内最多一次
  if (kind !== 'break' && save.lastPromotionCycleId === currentCycleId) {
    return { allowed: false, blockReason: '本轮晋升机会已使用，下一周期（1095 天后）自动开放', details: [] };
  }
  // 破格：前置条件（贡献≥3000、政绩≥2500、首领认可≥90、本周期名额未用）
  if (kind === 'break') {
    const check = canBreakPromote(save);
    if (!check.ok) {
      return { allowed: false, blockReason: check.reason, details: [] };
    }
  }

  const details = getUnifiedGateDetails(save, kind, positionKey);
  const failed = details.find(d => !d.pass);
  if (failed) {
    return { allowed: false, blockReason: `门控未满足：${failed.label}（当前 ${failed.current}，需 ${failed.required}）`, details };
  }
  return { allowed: true, blockReason: null, details };
}

/** 兼容旧调用：普通晋升门控（无具体职位时按聚合编制判定） */
export function checkPromotionGate(save: PlayerSave): PromotionGateResult {
  return validatePromotion(save, 'normal', '');
}

/** 构建统一门控明细（供 UI 展示） */
export function getUnifiedGateDetails(
  save: PlayerSave,
  kind: PromotionKind,
  positionKey: string,
): PromotionGateDetail[] {
  const cond = PROMOTION_HARD_CONDITIONS;
  const nextRank = save.rankLevel + 1;
  const primary = save.primaryFaction as import('@/types/game').FactionId | '';
  const relation = primary ? (getRelationFromSave(save)[primary] ?? 0) : 0;

  // 编制空缺：指定职位取该职位，未指定时按聚合（总占用 vs 总配额）
  const quota = getFactionLevel(save) * 2 + 1;
  const occMap = save.positionOccupancy ?? {};
  const totalOccupied = positionKey
    ? (occMap[positionKey] ?? 0)
    : Object.values(occMap).reduce((s, n) => s + n, 0);
  const vacancy = Math.max(0, quota - totalOccupied);

  const details: PromotionGateDetail[] = [];

  // P7 年龄门槛（所有晋升通用）
  details.push({
    key: 'age',
    label: '年龄门槛',
    pass: (save.playerAge ?? 0) >= 18,
    current: `${save.playerAge ?? 0} 岁`,
    required: '≥18 岁',
  });

  if (kind === 'break') {
    // 破格：额外展示其苛刻条件（前置已在 validatePromotion 中一票否决）
    details.push({
      key: 'breakContribution',
      label: '派系贡献（破格）',
      pass: (save.factionContribution ?? 0) >= 1500,
      current: save.factionContribution ?? 0,
      required: 1500,
    });
    details.push({
      key: 'breakMerit',
      label: '政绩（破格）',
      pass: (save.meritPoints ?? 0) >= 2500,
      current: Math.round(save.meritPoints ?? 0),
      required: 2500,
    });
    details.push({
      key: 'breakFavor',
      label: '首领特批',
      pass: (save.bossFavor ?? 0) >= 90,
      current: save.bossFavor ?? 0,
      required: 90,
    });
  } else {
    // 普通 / 举荐：任期 + 双池（政绩 + 派系贡献）
    details.push({
      key: 'tenure',
      label: '任期门槛',
      pass: (save.tenureDays ?? 0) >= 1095,
      current: `${Math.round(((save.tenureDays ?? 0) / 365) * 10) / 10} 年`,
      required: '3 年（1095 天）',
    });
    details.push({
      key: 'merit',
      label: '政绩',
      pass: (save.meritPoints ?? 0) >= 200 + nextRank * 100,
      current: Math.round(save.meritPoints ?? 0),
      required: 200 + nextRank * 100,
    });
    details.push({
      key: 'contribution',
      label: '派系贡献',
      pass: (save.factionContribution ?? 0) >= 150 + nextRank * 75,
      current: save.factionContribution ?? 0,
      required: 150 + nextRank * 75,
    });
    details.push({
      key: 'support',
      label: '民心支持率',
      pass: (save.popularSupport ?? 0) >= cond.minPopularSupport,
      current: save.popularSupport ?? 0,
      required: cond.minPopularSupport,
    });
    details.push({
      key: 'relation',
      label: '主派关系值',
      pass: relation >= cond.minFactionRelation,
      current: relation,
      required: cond.minFactionRelation,
    });
  }

  // 通用：编制空缺、无立案、无失势冻结
  details.push({
    key: 'vacancy',
    label: '编制空缺',
    pass: vacancy > 0,
    current: `${vacancy}/${quota}`,
    required: '有空缺',
  });
  details.push({
    key: 'noCase',
    label: '无立案',
    pass: !cond.requireNoCase || !save.isFlagged,
    current: save.isFlagged ? '已立案' : '无立案',
    required: cond.requireNoCase ? '无立案' : '不限',
  });
  details.push({
    key: 'noSetback',
    label: '无失势冻结',
    pass: !cond.requireNoSetback || save.gameDays > (save.factionSetbackUntilDay ?? 0),
    current: save.gameDays <= (save.factionSetbackUntilDay ?? 0) ? '冻结中' : '正常',
    required: cond.requireNoSetback ? '无冻结' : '不限',
  });

  return details;
}

// ──────────────────────────────────────────────────────────────────
// §P1/P3  编制空缺与派系等级
// ──────────────────────────────────────────────────────────────────

/** 派系等级：由派系影响力映射到 1~5 级 */
export function getFactionLevel(save: PlayerSave): number {
  return Math.min(5, Math.max(1, Math.floor((save.factionInfluence ?? 0) / 20) + 1));
}

export interface PositionVacancy {
  quota: number;     // 编制总数（派系等级*2 + 1）
  occupied: number;  // 已占用数
  vacancy: number;   // 剩余空缺
  available: boolean;
}

/** 个人目标职位的编制空缺情况（配额 = 派系等级*2 + 1） */
export function getPositionVacancy(save: PlayerSave, positionKey: string): PositionVacancy {
  const quota = getFactionLevel(save) * 2 + 1;
  const occupied = (save.positionOccupancy ?? {})[positionKey] ?? 0;
  const vacancy = Math.max(0, quota - occupied);
  return { quota, occupied, vacancy, available: vacancy > 0 };
}

// ── 破格晋升（#7）：独立通道，条件极苛刻 ──
export const BREAK_PROMOTE_BASE_RATE = 0.05; // 基础成功率 5%

export interface BreakPromoteCheck {
  ok: boolean;
  reason: string;
}

/** 破格晋升前置条件检查 */
export function canBreakPromote(save: PlayerSave): BreakPromoteCheck {
  const currentCycleId = getContestCycleId(save.gameDays);
  if (save.breakPromotionCycleId === currentCycleId) {
    return { ok: false, reason: '本周期破格名额已使用（全局每周期仅 1 个）' };
  }
  if ((save.factionContribution ?? 0) < 1500) {
    return { ok: false, reason: `派系贡献不足（当前 ${save.factionContribution ?? 0}，需 ≥1500）` };
  }
  if ((save.meritPoints ?? 0) < 2500) {
    return { ok: false, reason: `政绩不足（当前 ${Math.round(save.meritPoints ?? 0)}，需 ≥2500）` };
  }
  if ((save.bossFavor ?? 0) < 90) {
    return { ok: false, reason: '派系首领未特批（上级认可度需 ≥90）' };
  }
  return { ok: true, reason: '' };
}

export interface BreakPromoteResult {
  success: boolean;
  updates: Partial<PlayerSave>;
  message: string;
}

/**
 * 尝试破格晋升（#7）。成功则严格 +1 级并授予所选目标职务/城市；
 * 无论成败均消耗全部政绩与派系贡献，并占用本周期破格名额。
 * 调用方应先通过 validatePromotion(save,'break',positionKey) 校验通用门控。
 */
export function attemptBreakPromote(
  save: PlayerSave,
  positionKey: string,
  positionTitle: string,
  targetCity: string,
  day: number,
): BreakPromoteResult {
  const check = canBreakPromote(save);
  if (!check.ok) {
    return { success: false, updates: {}, message: check.reason };
  }
  const currentCycleId = getContestCycleId(save.gameDays);
  const success = Math.random() < BREAK_PROMOTE_BASE_RATE;

  if (success) {
    // #4 破格同样严格 +1 级，不跨级
    const newRank = save.rankLevel + 1;
    const rankCfg = RANK_CONFIG[newRank];
    const shouldChangeCity = rankCfg?.randomCity ?? false;
    const newCity = shouldChangeCity ? targetCity : save.cityName;
    // #8 编制占用 +1
    const occupancy = { ...(save.positionOccupancy ?? {}) };
    occupancy[positionKey] = (occupancy[positionKey] ?? 0) + 1;

    return {
      success: true,
      message: '破格晋升成功！已消耗全部政绩与派系贡献。',
      updates: {
        rankLevel: newRank,
        rankName: rankCfg?.name ?? save.rankName,
        playerPosition: positionTitle,
        cityName: newCity,
        tenureDays: 0,
        tenureYears: 0,
        rooting_days: 90,
        last_promotion_day: day,
        breakPromotionCycleId: currentCycleId,
        meritPoints: 0,
        factionContribution: 0,
        positionOccupancy: occupancy,
        popularSupport: Math.max(0, (save.popularSupport ?? 50) - 10),
      },
    };
  }

  // 失败：消耗全部资源并占用本周期名额
  return {
    success: false,
    message: '破格晋升失败！全部政绩与派系贡献已被消耗。',
    updates: {
      meritPoints: 0,
      factionContribution: 0,
      breakPromotionCycleId: currentCycleId,
    },
  };
}

// ──────────────────────────────────────────────────────────────────
// §P3  派系内职位（独立于个人官职职级）
// ──────────────────────────────────────────────────────────────────

/** 当前派系等级解锁的派系内职位 */
export function getUnlockedFactionPositions(save: PlayerSave): FactionPositionDef[] {
  const level = getFactionLevel(save);
  return FACTION_POSITIONS.filter(p => p.minFactionLevel <= level);
}

/** 派系职位的编制空缺（配额 = 派系等级*2 + 1） */
export function getFactionPositionVacancy(save: PlayerSave, key: string): PositionVacancy {
  const quota = getFactionLevel(save) * 2 + 1;
  const occupied = (save.factionPositionOccupancy ?? {})[key] ?? 0;
  const vacancy = Math.max(0, quota - occupied);
  return { quota, occupied, vacancy, available: vacancy > 0 };
}

/** 就任派系内职位（独立晋升线，不改变个人 rankLevel） */
export function promoteFactionPosition(save: PlayerSave, key: string, day: number): Partial<PlayerSave> {
  const occ = { ...(save.factionPositionOccupancy ?? {}) };
  occ[key] = (occ[key] ?? 0) + 1;
  return {
    factionPosition: key,
    factionPositionOccupancy: occ,
    factionContribution: (save.factionContribution ?? 0) + 100,
    factionInfluence: Math.min(100, (save.factionInfluence ?? 0) + 5),
    last_promotion_day: day,
  };
}

// ──────────────────────────────────────────────────────────────────
// §P5  降职（任期考核不合格 / 严重违规）
// ──────────────────────────────────────────────────────────────────

/** 降职：levels 级（1=不合格，2=严重违规），并设降职冷却 */
export function applyDemotion(save: PlayerSave, levels: number, day: number): Partial<PlayerSave> {
  const newRank = Math.max(1, save.rankLevel - levels);
  const rankCfg = RANK_CONFIG[newRank];
  const cooldown = levels >= 2 ? 3650 : 1825;
  return {
    rankLevel: newRank,
    rankName: rankCfg?.name ?? save.rankName,
    playerPosition: rankCfg?.name ?? save.playerPosition,
    tenureDays: 0,
    tenureYears: 0,
    demotionCooldownUntil: day + cooldown,
    meritPoints: Math.max(0, (save.meritPoints ?? 0) - 50),
    popularSupport: Math.max(0, (save.popularSupport ?? 50) - 10),
    bossFavor: Math.max(0, (save.bossFavor ?? 50) - 10),
  };
}

// ──────────────────────────────────────────────────────────────────
// §P6  调任 / 平调（跨派系或跨行政区划）
// ──────────────────────────────────────────────────────────────────

export interface TransferResult {
  ok: boolean;
  reason: string;
  updates: Partial<PlayerSave>;
}

/**
 * 调任 / 平调：跨行政区划（换城市）或跨派系（换主派）。
 * 重置部分区域性加成（四项指标向 50 回归），不动 rooting_days。
 */
export function applyTransfer(
  save: PlayerSave,
  day: number,
  opts: { crossFaction?: FactionId | null } = {},
): TransferResult {
  if (save.gameDays - (save.lastTransferDay ?? 0) < 365) {
    return { ok: false, reason: '调任冷却中（每 365 天一次）', updates: {} };
  }
  const newCity = getRandomCityForRank(save.rankLevel) || save.cityName;
  const updates: Partial<PlayerSave> = {
    cityName: newCity,
    cityGdp: Math.round(((save.cityGdp ?? 50) + 50) / 2 * 10) / 10,
    cityLivelihood: Math.round(((save.cityLivelihood ?? 50) + 50) / 2 * 10) / 10,
    cityEcology: Math.round(((save.cityEcology ?? 50) + 50) / 2 * 10) / 10,
    cityBusiness: Math.round(((save.cityBusiness ?? 50) + 50) / 2 * 10) / 10,
    lastTransferDay: day,
  };
  if (opts.crossFaction) {
    updates.primaryFaction = opts.crossFaction;
  }
  return { ok: true, reason: '', updates };
}

// ──────────────────────────────────────────────────────────────────
// §P6  举荐（高阶玩家举荐新人入派系/接任）
// ──────────────────────────────────────────────────────────────────

export interface RecommendResult {
  ok: boolean;
  reason: string;
  updates: Partial<PlayerSave>;
}

/**
 * 举荐新人入派系：须满足 年龄+任期+编制+贡献 全套限制（走统一门控，不得豁免）。
 * 成功后消耗本轮晋升机会，新人占用一个派系职位编制，玩家获得影响力与贡献。
 */
export function recommendPromote(save: PlayerSave, day: number): RecommendResult {
  if (save.rankLevel < 7) {
    return { ok: false, reason: '举荐需职级 ≥7（高阶玩家）', updates: {} };
  }
  const v = validatePromotion(save, 'recommend', '');
  if (!v.allowed) {
    return { ok: false, reason: v.blockReason ?? '举荐条件未满足', updates: {} };
  }
  const occ = { ...(save.factionPositionOccupancy ?? {}) };
  occ['steward'] = (occ['steward'] ?? 0) + 1;
  return {
    ok: true,
    reason: '',
    updates: {
      factionPositionOccupancy: occ,
      factionInfluence: Math.min(100, (save.factionInfluence ?? 0) + 8),
      factionContribution: (save.factionContribution ?? 0) + 200,
      lastPromotionCycleId: getContestCycleId(day),
      last_promotion_day: day,
    },
  };
}
