// 省级席位系统（v4 派系玩法核心：全国棋盘 + 个人职位独立斗争）
// 硬性要求：所有权重/加成/阈值/成本一律走配置对象，业务函数内禁止硬编码数字
import {
  PROVINCE_LIST,
  PROVINCE_CITY_MAP,
  ALL_FACTIONS,
  FACTION_LABEL,
  type FactionId,
  type PlayerSave,
  type ProvinceSeat,
  type NationalSeatControl,
  type PersonalContest,
  type ContestDetail,
} from '@/types/game';
import { getRelationFromSave, hasActiveCoalitionWith, COALITION_CONTEST_BONUS } from '@/lib/factionSystem';

// ═══════════════════════════════════════════════════════════════
// §配置对象（唯一数值出口）
// ═══════════════════════════════════════════════════════════════

/** 派系实力构成权重（关系值/影响力/功绩/情报/经费池） */
export const FACTION_POWER_WEIGHTS = {
  relation:    0.30,  // 玩家对本派关系值
  influence:   0.25,  // 派系影响力
  merit:       0.15,  // 玩家功绩
  intelligence: 0.15, // 派系情报
  treasury:    0.15,  // 派系经费池
} as const;

/** 个人战力七维权重（全部来自 PlayerSave 真实字段） */
export const PERSONAL_POWER_WEIGHTS = {
  merit:    0.18,  // 政绩（meritPoints）
  support:  0.24,  // 民心（popularSupport）   P3 上调
  economy:  0.20,  // 经济（taxRevenue）        P3 上调
  integrity: 0.12, // 廉洁（integrity）
  events:   0.14,  // 事件处理（eventsThisYear） P3 上调
  network:  0.06,  // 人脉（factionInfluence）
  tenure:   0.06,  // 任期稳定（rankLevel 折算稳定度）
} as const;

/** 地域类型：从省份名称派生（直辖市/沿海/边疆民族/文化大省/内陆） */
export type DomainType = 'municipality' | 'coastal' | 'frontier' | 'cultural' | 'inland';

/**
 * 竞争派系在不同地域类型的加成系数。
 * 派系在擅长地域竞争省级席位时实力乘以 (1 + bonus)。
 */
export const FACTION_DOMAIN_BONUS: Record<FactionId, Partial<Record<DomainType, number>>> = {
  // 改革开放系：直辖市 + 沿海省加成
  reform:    { municipality: 0.15, coastal: 0.12 },
  // 稳健国家系：直辖市 + 内陆（中枢与腹地）加成
  pragmatic: { municipality: 0.10, inland: 0.10 },
  // 共青团/民生系：文化大省加成
  cyl:       { cultural: 0.15 },
  // 技术官僚系：沿海（产业技术）加成
  techno:    { coastal: 0.15 },
  // 地方实力派：边疆/民族地区加成
  local:     { frontier: 0.20 },
};

/** 省级席位战获胜阈值（控制全国总席位比例） */
export const VICTORY_THRESHOLD = 0.5;

/** 个人职位战贡献配比（派系 10% + 个人 90%） */
export const CONTEST_BLEND = {
  faction:  0.1,
  personal: 0.9,
} as const;

/** P3：对手实力随目标 rank 平滑上升（约 5 + rank×1.2） */
export const CONTEST_OPP = { base: 5, perRank: 1.2 } as const;
/** P3：玩家个人战力保底（低等级也有基本竞争力） */
export const PERSONAL_POWER_FLOOR = 9;
/** P3：胜率软保底（sYou<sOpp 时下限不低于此值） */
export const CONTEST_WIN_FLOOR = 0.35;

/** 争夺成本配置 */
export const CONTEST_COSTS = {
  personalContest: { merit: 80, cooldownDays: 30 },  // 个人职位战：80 功绩 + 30 天冷却
  provinceSeat:    { cooldownDays: 90 },             // 省级席位争夺冷却
} as const;

/** v5：省级攻夺战成本与进度配置 */
export const PROVINCE_ATTACK_COST = {
  meritCost:        50,   // 每次攻夺消耗功绩
  cooldownDays:     60,   // 两次攻夺之间冷却天数
  progressPerAttack: 12,  // 每次攻夺增加的进度点数
  maxProgress:      100,  // 进度上限（满控制）
  /** 联合争夺模式：竞争派系得分系数（降低对手难度） */
  coalitionRivalFactor: 0.85,
  /** 联合争夺功绩成本倍率 */
  coalitionMeritMultiplier: 1.5,
} as const;

/** 席位数公式参数（round(地级市数 × 每市系数)，clamp [下限, 上限]） */
export const SEAT_FORMULA = {
  perCityMultiplier: 1.8,
  minSeats: 3,
  maxSeats: 18,
} as const;

/** 地域类型派生规则（按省份名称关键词，从 PROVINCE_CITY_MAP 派生） */
const DOMAIN_TYPE_RULES: { type: DomainType; keywords: string[] }[] = [
  { type: 'municipality', keywords: ['北京市', '天津市', '上海市', '重庆市'] },
  { type: 'frontier',     keywords: ['新疆', '西藏', '内蒙古', '广西', '宁夏', '云南', '贵州', '青海', '黑龙江', '吉林', '辽宁', '海南'] },
  { type: 'coastal',      keywords: ['河北', '江苏', '浙江', '福建', '山东', '广东'] },
  { type: 'cultural',     keywords: ['山西', '安徽', '江西', '河南', '湖南', '湖北', '四川', '陕西'] },
  { type: 'inland',       keywords: [] },  // 其余默认内陆
];

// ═══════════════════════════════════════════════════════════════
// §地域类型派生
// ═══════════════════════════════════════════════════════════════

/** 从省份名称派生地域类型 */
export function getDomainTypeOfProvince(province: string): DomainType {
  for (const rule of DOMAIN_TYPE_RULES) {
    if (rule.keywords.length > 0 && rule.keywords.some(k => province.includes(k))) {
      return rule.type;
    }
  }
  return 'inland';
}

// ═══════════════════════════════════════════════════════════════
// §省级席位计算
// ═══════════════════════════════════════════════════════════════

/** 计算某省席位数：round(下辖地级市数 × 1.8)，clamp [3, 18] */
export function calcProvinceSeatCount(province: string): number {
  const cityCount = (PROVINCE_CITY_MAP[province] ?? []).length;
  const raw = Math.round(cityCount * SEAT_FORMULA.perCityMultiplier);
  return Math.min(SEAT_FORMULA.maxSeats, Math.max(SEAT_FORMULA.minSeats, raw));
}

/** 构建全国省级席位列表（未分配归属） */
export function buildNationalSeats(): ProvinceSeat[] {
  return PROVINCE_LIST.map(province => ({
    province,
    seatCount: calcProvinceSeatCount(province),
    holderFaction: null,
  }));
}

// ═══════════════════════════════════════════════════════════════
// §派系实力计算（配置化加权）
// ═══════════════════════════════════════════════════════════════

/** 归一化工具：值/满值 clamp [0,1] */
function normalize(value: number, max: number): number {
  if (max <= 0) return 0;
  return Math.min(1, Math.max(0, value / max));
}

/**
 * 计算某派系实力分（0~100）。
 * 用 FACTION_POWER_WEIGHTS 加权：关系值/影响力/功绩/情报/经费池。
 */
export function calcFactionPower(save: PlayerSave, faction: FactionId): number {
  const relations = getRelationFromSave(save);
  const relation    = normalize(relations[faction] ?? 0, 100);
  const influence   = normalize(save.factionInfluence ?? 0, 100);
  const merit       = normalize(save.meritPoints ?? 0, 500);
  const intelligence = normalize(save.factionIntelligence ?? 0, 100);
  const treasury    = normalize(save.factionTreasury?.[faction] ?? 0, 100);

  const score =
    FACTION_POWER_WEIGHTS.relation     * relation +
    FACTION_POWER_WEIGHTS.influence    * influence +
    FACTION_POWER_WEIGHTS.merit        * merit +
    FACTION_POWER_WEIGHTS.intelligence * intelligence +
    FACTION_POWER_WEIGHTS.treasury     * treasury;

  return Math.round(score * 100) / 10;  // → 0~100
}

/**
 * 计算某派系在指定省份的实力分（含地域加成）。
 */
export function calcFactionPowerInProvince(
  save: PlayerSave,
  faction: FactionId,
  province: string,
): number {
  const base = calcFactionPower(save, faction);
  const domainType = getDomainTypeOfProvince(province);
  const bonus = FACTION_DOMAIN_BONUS[faction]?.[domainType] ?? 0;
  return base * (1 + bonus);
}

/**
 * 计算个人独立战力（0~100）。
 * 七维加权：政绩+民心+经济+廉洁+事件处理+人脉+任期稳定，权重从配置读。
 * 廉洁维度 = 100 - 贪腐风险值（riskValue 越高廉洁越差）。
 */
export function calcPersonalPower(save: PlayerSave): number {
  const w = PERSONAL_POWER_WEIGHTS;
  const merit     = normalize(save.meritPoints ?? 0, 500);
  const support   = normalize(save.popularSupport ?? 0, 100);
  const economy   = normalize(save.taxRevenue ?? 0, 100);
  const integrity = normalize(100 - (save.riskValue ?? 0), 100);
  const events    = normalize(save.eventsThisYear ?? 0, 12);
  const network   = normalize(save.factionInfluence ?? 0, 100);
  // 任期稳定度：扎根期越久越稳（rooting_days 从 180 倒数到 0 视为逐步稳固）
  const tenure    = normalize(save.rankLevel, 15) * 0.6 + normalize(180 - Math.min(180, save.rooting_days ?? 0), 180) * 0.4;

  const score =
    w.merit     * merit +
    w.support   * support +
    w.economy   * economy +
    w.integrity * integrity +
    w.events    * events +
    w.network   * network +
    w.tenure    * tenure;

  // P3：个人战力保底，确保低等级玩家也有基本竞争力（约 8~10）
  return Math.max(PERSONAL_POWER_FLOOR, Math.round(score * 100) / 10);
}

/** 个人战力七维分解（供 UI 分解条渲染） */
export function personalPowerBreakdown(save: PlayerSave): ContestDetail['breakdown'] {
  const w = PERSONAL_POWER_WEIGHTS;
  const round1 = (n: number) => Math.round(n * 10) / 10;
  return {
    merit:     round1(w.merit     * normalize(save.meritPoints ?? 0, 500) * 100),
    support:   round1(w.support   * normalize(save.popularSupport ?? 0, 100) * 100),
    economy:   round1(w.economy   * normalize(save.taxRevenue ?? 0, 100) * 100),
    integrity: round1(w.integrity * normalize(100 - (save.riskValue ?? 0), 100) * 100),
    events:    round1(w.events    * normalize(save.eventsThisYear ?? 0, 12) * 100),
    network:   round1(w.network   * normalize(save.factionInfluence ?? 0, 100) * 100),
    tenure:    round1(w.tenure    * (normalize(save.rankLevel, 15) * 0.6 + normalize(180 - Math.min(180, save.rooting_days ?? 0), 180) * 0.4) * 100),
  };
}

// ═══════════════════════════════════════════════════════════════
// §个人职位争夺判定
// ═══════════════════════════════════════════════════════════════

export interface PersonalContestResult {
  win: boolean;
  sYou: number;
  sOpp: number;
  detail: ContestDetail;
}

/**
 * 个人职位争夺判定（10% 派系 + 90% 个人）。
 * @param save          玩家存档
 * @param bandFactions  班子派系列表（竞争派系来源，通常为班子中非本派成员）
 * @param positionKey   目标职位 key
 * @param positionTitle 目标职位名称
 * @param toRank        目标职级
 */
export function resolvePersonalContest(
  save: PlayerSave,
  bandFactions: FactionId[],
  positionKey: string,
  positionTitle: string,
  toRank: number,
  targetCity: string,
): PersonalContestResult {
  const primary = (save.primaryFaction || 'reform') as FactionId;
  const playerFactionPower = calcFactionPower(save, primary);
  const personalPower = calcPersonalPower(save);

  // 我方总分 = 派系贡献 × 10% + 个人战力 × 90%
  const factionShareScore = CONTEST_BLEND.faction * playerFactionPower;
  const personalShareScore = CONTEST_BLEND.personal * personalPower;
  let sYou = Math.round((factionShareScore + personalShareScore) * 10) / 10;

  // 竞争派系实力：班子中的对立派系（去重），无则取全部对立派均值
  const competitors = [...new Set(bandFactions.filter(f => f !== primary))];
  const oppList: FactionId[] = competitors.length > 0
    ? competitors
    : ALL_FACTIONS.filter(f => f !== primary);

  // C. 跨派系结契：若与任一竞争派系存在活跃同盟，我方 sYou 获得加成
  const hasAlly = oppList.some(f => hasActiveCoalitionWith(save.coalitions ?? [], primary, f, save.gameDays));
  if (hasAlly) {
    sYou = Math.round(sYou * (1 + COALITION_CONTEST_BONUS) * 10) / 10;
  }

  const oppBreakdown = oppList.map(f => ({
    faction: f,
    power: calcFactionPower(save, f),
  }));
  // 联合争夺模式：竞争派系得分乘以配置系数（降低对手难度）
  const coalition = save.contestMode === 'coalition';
  const rivalFactor = coalition ? PROVINCE_ATTACK_COST.coalitionRivalFactor : 1;
  // P3：对手实力随目标 rank 平滑上升（约 5 + rank×1.2），取该值与竞争派系均值的较大者
  const oppAvg = (oppBreakdown.reduce((s, o) => s + o.power, 0) / oppBreakdown.length) * rivalFactor;
  const rankBasedOpp = CONTEST_OPP.base + toRank * CONTEST_OPP.perRank;
  const sOpp = Math.round(Math.max(rankBasedOpp, oppAvg) * 10) / 10;

  // P3：胜率软保底——sYou≥sOpp 必胜；sYou<sOpp 时按比值给概率，下限不低于 CONTEST_WIN_FLOOR
  let win: boolean;
  if (sYou >= sOpp) {
    win = true;
  } else {
    const ratio = sYou / Math.max(0.1, sOpp);
    const winProb = Math.min(1, Math.max(CONTEST_WIN_FLOOR, ratio));
    win = Math.random() < winProb;
  }

  const detail: ContestDetail = {
    sYou,
    sOpp,
    factionShare: CONTEST_BLEND.faction,
    personalShare: CONTEST_BLEND.personal,
    breakdown: personalPowerBreakdown(save),
    oppBreakdown,
    win,
  };

  return { win, sYou, sOpp, detail };
}

/** 构建个人职位战记录（发起成功后写入历史） */
export function buildPersonalContestRecord(
  positionKey: string,
  positionTitle: string,
  toRank: number,
  targetCity: string,
  result: PersonalContestResult,
  day: number,
): PersonalContest {
  return {
    positionKey,
    positionTitle,
    toRank,
    targetCity,
    factionPower: Math.round(result.detail.factionShare * result.sYou * 10) / 10,
    personalPower: Math.round(result.detail.personalShare * result.sYou * 10) / 10,
    win: result.win,
    day,
  };
}

// ═══════════════════════════════════════════════════════════════
// §省级席位归属分配与全国结算
// ═══════════════════════════════════════════════════════════════

/** 确定性哈希（djb2）：同 seed 同 key 恒定 */
function hashSeed(seed: number, key: string): number {
  let h = seed;
  for (let i = 0; i < key.length; i++) {
    h = ((h << 5) - h + key.charCodeAt(i)) >>> 0;
  }
  return h >>> 0;
}

/**
 * 分配各省席位归属派系。
 * 算法：各省按五派「该省实力分（含地域加成）」加权轮盘，以 gameDays+province hash 为种子（确定性）。
 * @returns Record<province, factionId | null>
 */
export function assignProvinceSeats(save: PlayerSave): Record<string, FactionId | null> {
  const result: Record<string, FactionId | null> = {};
  const seed = save.gameDays;

  for (const province of PROVINCE_LIST) {
    // 各派在该省的实力（含地域加成）
    const weights = ALL_FACTIONS.map(f => ({
      faction: f,
      power: Math.max(0, calcFactionPowerInProvince(save, f, province)),
    }));
    const totalWeight = weights.reduce((s, w) => s + w.power, 0);
    if (totalWeight <= 0) {
      result[province] = null;
      continue;
    }

    // LCG 伪随机（确定性）
    const rand = ((hashSeed(seed, province) * 1664525 + 1013904223) >>> 0) / 0xffffffff;
    let threshold = rand * totalWeight;
    let winner: FactionId | null = null;
    for (const w of weights) {
      threshold -= w.power;
      if (threshold <= 0) { winner = w.faction; break; }
    }
    result[province] = winner ?? weights[weights.length - 1].faction;
  }

  return result;
}

/**
 * 统计全国席位控制。
 * @param seatControl  各省控制派系（province → factionId | null）
 * @param seats        全国席位列表（含 seatCount）
 */
export function computeNationalControl(
  seatControl: Record<string, FactionId | null>,
  seats: ProvinceSeat[],
): NationalSeatControl {
  const factionSeats: Record<FactionId, number> = {
    reform: 0, pragmatic: 0, cyl: 0, techno: 0, local: 0,
  };
  let totalSeats = 0;

  for (const seat of seats) {
    totalSeats += seat.seatCount;
    const holder = seatControl[seat.province];
    if (holder) factionSeats[holder] += seat.seatCount;
  }

  const controlRatios = {} as Record<FactionId, number>;
  for (const f of ALL_FACTIONS) {
    controlRatios[f] = totalSeats > 0 ? factionSeats[f] / totalSeats : 0;
  }

  let dominantFaction: FactionId | null = null;
  let thresholdRatio = 0;
  for (const f of ALL_FACTIONS) {
    if (controlRatios[f] > thresholdRatio) {
      thresholdRatio = controlRatios[f];
      dominantFaction = f;
    }
  }

  return {
    totalSeats,
    factionSeats,
    controlRatios,
    dominantFaction,
    reachedThreshold: thresholdRatio >= VICTORY_THRESHOLD,
    thresholdRatio,
  };
}

/**
 * 省级席位战结算（周期边界调用）。
 * - 刷新各省归属 → 统计控制度
 * - 若本派 ≥ 80%：truce + 解冻（提前收官）
 * - 周期边界仍未达标：本轮争夺 expired，下一轮重选
 * @returns { control, updates }：control 供 UI 展示；updates 可合并进 updateSave
 */
export function resolveNationalSeatControl(
  save: PlayerSave,
): {
  control: NationalSeatControl;
  seats: ProvinceSeat[];
  updates: Partial<PlayerSave>;
} {
  // 1) 重新分配各省归属
  const seatControl = assignProvinceSeats(save);
  const seats = buildNationalSeats().map(s => ({
    ...s,
    holderFaction: seatControl[s.province] ?? null,
  }));

  // 2) 统计控制度
  const control = computeNationalControl(seatControl, seats);

  // 3) 本派是否达标
  const primary = (save.primaryFaction || '') as FactionId | '';
  const primaryRatio = primary ? control.controlRatios[primary] ?? 0 : 0;

  const updates: Partial<PlayerSave> = {
    provinceSeatControl: seatControl,
  };

  if (primary && primaryRatio >= VICTORY_THRESHOLD) {
    // 本派省级席位战获胜：本轮斗争提前收官
    Object.assign(updates, {
      strugglePhase: 'truce' as const,
      factionPromotionLocked: false,
    });
  }
  // 未达标：不在此置 expired（由 promotionFaction.expireContest 处理个人争夺过期）

  return { control, seats, updates };
}

/** 便捷：获取当前存档的全国控制统计（UI 渲染用，不落库） */
export function getNationalControl(save: PlayerSave): { control: NationalSeatControl; seats: ProvinceSeat[] } {
  const seats = buildNationalSeats().map(s => ({
    ...s,
    holderFaction: save.provinceSeatControl?.[s.province] ?? null,
  }));
  return { control: computeNationalControl(save.provinceSeatControl ?? {}, seats), seats };
}

/** 地域类型中文标签 */
export const DOMAIN_TYPE_LABEL: Record<DomainType, string> = {
  municipality: '直辖市',
  coastal:      '沿海省',
  frontier:     '边疆/民族地区',
  cultural:     '文化大省',
  inland:       '内陆省',
};

/** 渲染用：各派系地域加成描述列表 */
export function describeFactionDomainBonuses(): { faction: FactionId; label: string; lines: string[] }[] {
  return ALL_FACTIONS.map(f => ({
    faction: f,
    label: FACTION_LABEL[f],
    lines: Object.entries(FACTION_DOMAIN_BONUS[f] ?? {}).map(([dt, bonus]) =>
      `${DOMAIN_TYPE_LABEL[dt as DomainType]} +${Math.round((bonus as number) * 100)}%`
    ),
  }));
}

// ──────────────────────────────────────────────────────────────────
// §v5  省级攻夺战（本派对各省控制进度）
// ──────────────────────────────────────────────────────────────────

/** 读取各省份本派攻夺进度（0–maxProgress），未记录为 0 */
export function getProvinceAttackProgress(save: PlayerSave): Record<string, number> {
  return { ...(save.provinceAttackProgress ?? {}) };
}

/** 某省本派当前攻夺进度（0–maxProgress） */
export function getProvinceAttackProgressOf(save: PlayerSave, province: string): number {
  return Math.min(PROVINCE_ATTACK_COST.maxProgress, Math.max(0, save.provinceAttackProgress?.[province] ?? 0));
}

/**
 * 是否可对该省发起攻夺。
 * - 政绩足够（meritCost）
 * - 未满控制（progress < maxProgress）
 * - 冷却已过（factionCooldowns['provinceAttack_'+province]）
 */
export function canLaunchProvinceAttack(save: PlayerSave, province: string, day: number): { ok: boolean; reason?: string } {
  const cost = PROVINCE_ATTACK_COST;
  const progress = getProvinceAttackProgressOf(save, province);
  if (progress >= cost.maxProgress) return { ok: false, reason: '已满控制，无需继续攻夺' };
  if ((save.meritPoints ?? 0) < cost.meritCost) return { ok: false, reason: `功绩不足，需要 ${cost.meritCost} 点` };
  const cooldownUntil = save.factionCooldowns?.[`provinceAttack_${province}`] ?? 0;
  if (day < cooldownUntil) return { ok: false, reason: `冷却中，剩 ${cooldownUntil - day} 天` };
  return { ok: true };
}

/**
 * 发起一次省级攻夺：扣 meritCost 功绩、进度 +progressPerAttack、设冷却。
 * 返回可合并的存档更新（不直接写库）。
 */
export function launchProvinceAttack(save: PlayerSave, province: string, day: number): Partial<PlayerSave> {
  const cost = PROVINCE_ATTACK_COST;
  const current = getProvinceAttackProgressOf(save, province);
  const newProgress = Math.min(cost.maxProgress, current + cost.progressPerAttack);
  const progressMap: Record<string, number> = { ...(save.provinceAttackProgress ?? {}), [province]: newProgress };
  const cooldowns: Record<string, number> = { ...(save.factionCooldowns ?? {}), [`provinceAttack_${province}`]: day + cost.cooldownDays };
  return {
    provinceAttackProgress: progressMap,
    factionCooldowns: cooldowns,
    meritPoints: Math.max(0, (save.meritPoints ?? 0) - cost.meritCost),
  };
}
