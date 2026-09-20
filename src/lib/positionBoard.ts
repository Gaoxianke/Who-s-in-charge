// 位置棋盘模块（派系晋升联动 §一.2）
// 基于官职数组构建棋盘席位，按派系关系值确定性分配控制权
import {
  COUNTY_OFFICIAL_POSITIONS,
  CITY_OFFICIAL_POSITIONS,
  SUB_PROVINCE_CITY_POSITIONS,
  PROVINCE_OFFICIAL_POSITIONS,
  ALL_FACTIONS,
  type FactionId,
  type PositionSeat,
  type PlayerSave,
} from '@/types/game';
import { getRelationFromSave } from '@/lib/factionSystem';

// ── 席位 tier 数值映射（越高=越枢纽）──────────────────────────────
const TIER_VALUE: Record<string, number> = {
  '正部级': 70, '副部级': 60,
  '正厅级': 50, '副厅级': 40,
  '正处级': 30, '副处级': 20,
  '正科级': 10, '副科级': 5,
};

/** 将官职数组平铺为棋盘席位（原始列表，holderFaction 未分配） */
function collectSeats(): Omit<PositionSeat, 'holderFaction'>[] {
  const seats: Omit<PositionSeat, 'holderFaction'>[] = [];

  // 县级席位（正处/副处/正科/副科）
  for (const p of COUNTY_OFFICIAL_POSITIONS) {
    seats.push({ key: p.key, title: p.title, tier: p.tier, organ: p.organ, isHub: false });
  }
  // 市级席位
  for (const p of CITY_OFFICIAL_POSITIONS) {
    seats.push({ key: p.key, title: p.title, tier: p.tier, organ: p.organ, isHub: false });
  }
  // 副省级城市席位
  for (const p of SUB_PROVINCE_CITY_POSITIONS) {
    seats.push({ key: p.key, title: p.title, tier: p.tier, organ: p.organ, isHub: false });
  }
  // 省级席位
  for (const p of PROVINCE_OFFICIAL_POSITIONS) {
    seats.push({ key: p.key, title: p.title, tier: p.tier, organ: p.organ, isHub: false });
  }

  return seats;
}

/** 找到最高 tier 值对应的 tier 字符串（枢纽席位标记用） */
function findHubTier(seats: Omit<PositionSeat, 'holderFaction'>[]): string | null {
  let maxVal = -1;
  let hubTier: string | null = null;
  for (const s of seats) {
    const v = TIER_VALUE[s.tier] ?? 0;
    if (v > maxVal) { maxVal = v; hubTier = s.tier; }
  }
  return hubTier;
}

/**
 * 确定性分配某席位的控制派系。
 * 算法：以 gameDays + seat.key hash 为种子，按各派关系值加权轮盘。
 * 避免随机抖动（同 gameDays 同 key 恒定返回同一派）。
 */
function assignHolder(
  seatKey: string,
  gameDays: number,
  relWeights: Record<FactionId, number>,
): FactionId | null {
  // 字符串哈希（djb2）
  let seed = gameDays;
  for (let i = 0; i < seatKey.length; i++) {
    seed = ((seed << 5) - seed + seatKey.charCodeAt(i)) >>> 0;
  }

  const totalWeight = ALL_FACTIONS.reduce((s, f) => s + Math.max(0, relWeights[f] ?? 0), 0);
  if (totalWeight === 0) return null;

  // LCG 伪随机（deterministic）
  const rand = ((seed * 1664525 + 1013904223) >>> 0) / 0xffffffff;
  let threshold = rand * totalWeight;
  for (const f of ALL_FACTIONS) {
    threshold -= Math.max(0, relWeights[f] ?? 0);
    if (threshold <= 0) return f;
  }
  return ALL_FACTIONS[ALL_FACTIONS.length - 1];
}

/**
 * 构建位置棋盘。
 * 根据玩家当前派系关系值与 gameDays 确定性计算每个席位的控制派系。
 */
export function buildBoard(save: PlayerSave): PositionSeat[] {
  const rawSeats = collectSeats();
  const hubTier = findHubTier(rawSeats);
  const relations = getRelationFromSave(save);

  // 构造加权关系表（关系值 >= 0 才参与竞争）
  const relWeights: Record<FactionId, number> = {
    reform: Math.max(0, relations.reform ?? 0),
    pragmatic: Math.max(0, relations.pragmatic ?? 0),
    cyl: Math.max(0, relations.cyl ?? 0),
    techno: Math.max(0, relations.techno ?? 0),
    local: Math.max(0, relations.local ?? 0),
  };

  return rawSeats.map(s => ({
    ...s,
    isHub: s.tier === hubTier,
    holderFaction: assignHolder(s.key, save.gameDays, relWeights),
  }));
}

/**
 * 计算指定派系的控制度（0~1）。
 * = 该派控制席位数 / 总席位数
 */
export function computeFactionControl(seats: PositionSeat[], fid: FactionId): number {
  if (seats.length === 0) return 0;
  const controlled = seats.filter(s => s.holderFaction === fid).length;
  return controlled / seats.length;
}

/** 按派系返回各派控制席位数量 */
export function countFactionSeats(seats: PositionSeat[]): Record<FactionId, number> {
  const counts: Record<FactionId, number> = {
    reform: 0, pragmatic: 0, cyl: 0, techno: 0, local: 0,
  };
  for (const s of seats) {
    if (s.holderFaction) counts[s.holderFaction] = (counts[s.holderFaction] ?? 0) + 1;
  }
  return counts;
}

/** 判断某派是否已控制枢纽席位 */
export function controlsHub(seats: PositionSeat[], fid: FactionId): boolean {
  return seats.some(s => s.isHub && s.holderFaction === fid);
}

/** 获取枢纽席位列表 */
export function getHubSeats(seats: PositionSeat[]): PositionSeat[] {
  return seats.filter(s => s.isHub);
}
