// 晋升后权力感知系统 v1.0
// 职级解锁能力 / 专属事件池 / NPC称谓变化 / 视觉反馈标记
import type { PlayerSave } from '@/types/game';
import { getTierOf } from '@/lib/promotionEngine';

/** 职级段 */
export type PowerTier = 1 | 2 | 3 | 4 | 5;

/** 解锁功能类型 */
export type UnlockedFeature =
  | 'subordinate_mgmt'    // 管理下属
  | 'county_finance'      // 县级财政
  | 'city_policy'         // 市级政策
  | 'provincial_coord'    // 跨省协调
  | 'national_affairs'    // 国家级事务
  | 'military_diplomacy'; // 军事/外交

/** 办公室等级 */
export type OfficeLevel = 'basic' | 'standard' | 'spacious' | 'luxury' | 'command';

/** NPC 称谓 */
export interface NpcTitle {
  casual: string;    // 口语称呼：小张、张科长
  formal: string;    // 正式称呼：张同志、张局长
  news: string;      // 新闻播报：乡镇干部、县领导
}

/** 职级段配置 */
export interface TierConfig {
  tier: number;
  label: string;
  officeLevel: OfficeLevel;
  maxSubordinates: number;
  unlockedFeatures: UnlockedFeature[];
  events: string[];
  titles: Record<string, string>;
}

/** 权力感知状态 */
export interface PowerPerceptionState {
  currentTier: PowerTier;
  officeLevel: OfficeLevel;
  unlockedFeatures: UnlockedFeature[];
  tierEventsTriggered: Record<number, string[]>; // tier -> 已触发事件ID列表
  titleStyle: 'casual' | 'formal' | 'news';
  lastTitleChangeDay: number;
}

// ── 常量 ─────────────────────────────────────────────

export const TIER_CONFIGS: Record<PowerTier, TierConfig> = {
  1: {
    tier: 1,
    label: '基层',
    officeLevel: 'basic',
    maxSubordinates: 2,
    unlockedFeatures: ['subordinate_mgmt'],
    events: ['村民上访', '乡镇企业改制', '土地承包纠纷', '修路集资'],
    titles: { casual: '小', formal: '同志', news: '乡镇干部' },
  },
  2: {
    tier: 2,
    label: '县级',
    officeLevel: 'standard',
    maxSubordinates: 8,
    unlockedFeatures: ['subordinate_mgmt', 'county_finance'],
    events: ['开发区建设', '招商引资', '县级财政紧张', '教育基建'],
    titles: { casual: '', formal: '科长', news: '县领导' },
  },
  3: {
    tier: 3,
    label: '市级',
    officeLevel: 'spacious',
    maxSubordinates: 20,
    unlockedFeatures: ['subordinate_mgmt', 'county_finance', 'city_policy'],
    events: ['地铁规划争议', '房地产调控', '环保督查', '创城验收'],
    titles: { casual: '', formal: '局长', news: '市领导' },
  },
  4: {
    tier: 4,
    label: '省级',
    officeLevel: 'luxury',
    maxSubordinates: 50,
    unlockedFeatures: ['subordinate_mgmt', 'county_finance', 'city_policy', 'provincial_coord'],
    events: ['跨省流域治理', '自贸区建设', '高铁线路争夺', '央企落地'],
    titles: { casual: '', formal: '省长', news: '省领导' },
  },
  5: {
    tier: 5,
    label: '高层',
    officeLevel: 'command',
    maxSubordinates: 100,
    unlockedFeatures: ['subordinate_mgmt', 'county_finance', 'city_policy', 'provincial_coord', 'national_affairs', 'military_diplomacy'],
    events: ['外交危机', '军事演习', '经济危机应对', '换届筹备'],
    titles: { casual: '', formal: '部长', news: '国家领导人' },
  },
};

const OFFICE_LEVEL_LABELS: Record<OfficeLevel, string> = {
  basic: '简陋办公室 · 纸质文件',
  standard: '标准办公室 · 电脑办公',
  spacious: '宽敞办公室 · 大屏幕 · 多部门连线',
  luxury: '豪华办公室 · 全省地图 · 实时数据',
  command: '国家地图 · 全球连线 · 军事指挥台',
};

// ── 初始化与更新 ───────────────────────────────────────

/** 根据职级初始化权力感知状态 */
export function initPowerPerception(rankLevel: number, day: number): PowerPerceptionState {
  const tier = getTierOf(rankLevel) as PowerTier;
  const cfg = TIER_CONFIGS[tier];
  return {
    currentTier: tier,
    officeLevel: cfg.officeLevel,
    unlockedFeatures: [...(cfg.unlockedFeatures as UnlockedFeature[])],
    tierEventsTriggered: {},
    titleStyle: 'casual',
    lastTitleChangeDay: day,
  };
}

/** 职级变化时更新权力感知 */
export function updatePowerPerception(
  state: PowerPerceptionState,
  newRank: number,
  day: number,
): { updated: PowerPerceptionState; changes: string[]; isBigPromotion: boolean } {
  const newTier = getTierOf(newRank) as PowerTier;
  const changes: string[] = [];
  const isBig = newTier !== state.currentTier;

  if (!isBig) {
    return { updated: state, changes: [], isBigPromotion: false };
  }

  const oldCfg = TIER_CONFIGS[state.currentTier];
  const newCfg = TIER_CONFIGS[newTier];

  // 检测新解锁功能
  const newFeatures = newCfg.unlockedFeatures.filter(f => !state.unlockedFeatures.includes(f));
  if (newFeatures.length > 0) {
    changes.push(`🔓 解锁新权限：${newFeatures.map(f => FEATURE_LABELS[f]).join('、')}`);
  }

  // 办公室升级
  if (newCfg.officeLevel !== state.officeLevel) {
    changes.push(`🏢 办公环境升级：${OFFICE_LEVEL_LABELS[newCfg.officeLevel]}`);
  }

  // 管理规模扩大
  if (newCfg.maxSubordinates > oldCfg.maxSubordinates) {
    changes.push(`👥 管理规模扩大：可管辖下属 ${newCfg.maxSubordinates} 人`);
  }

  // 称谓变化
  changes.push(`📢 称谓变化：${oldCfg.titles.news} → ${newCfg.titles.news}`);

  const updated: PowerPerceptionState = {
    currentTier: newTier,
    officeLevel: newCfg.officeLevel,
    unlockedFeatures: [...new Set([...state.unlockedFeatures, ...newCfg.unlockedFeatures])],
    tierEventsTriggered: { ...state.tierEventsTriggered },
    titleStyle: state.titleStyle,
    lastTitleChangeDay: day,
  };

  return { updated, changes, isBigPromotion: true };
}

/** 功能标签 */
export const FEATURE_LABELS: Record<UnlockedFeature, string> = {
  subordinate_mgmt: '管理下属',
  county_finance: '县级财政调配',
  city_policy: '市级政策制定',
  provincial_coord: '跨省协调',
  national_affairs: '国家级事务',
  military_diplomacy: '军事/外交权限',
};

// ── NPC 称谓 ───────────────────────────────────────────

/** 获取当前称谓 */
export function getCurrentTitle(state: PowerPerceptionState, playerName: string): NpcTitle {
  const cfg = TIER_CONFIGS[state.currentTier];
  const surname = playerName.charAt(0);
  return {
    casual: cfg.titles.casual ? `${cfg.titles.casual}${surname}` : `${surname}${cfg.titles.formal}`,
    formal: `${surname}${cfg.titles.formal}`,
    news: cfg.titles.news,
  };
}

/** 生成NPC对话称谓 */
export function generateNpcGreeting(state: PowerPerceptionState, playerName: string, npcRelation: 'friendly' | 'neutral' | 'hostile'): string {
  const titles = getCurrentTitle(state, playerName);
  const relationPrefix = npcRelation === 'friendly' ? '' : npcRelation === 'hostile' ? '哼，' : '';

  switch (state.titleStyle) {
    case 'casual':
      return `${relationPrefix}${titles.casual}，`;
    case 'formal':
      return `${relationPrefix}${titles.formal}，`;
    case 'news':
      return `${relationPrefix}${titles.news}，`;
  }
}

// ── 专属事件 ───────────────────────────────────────────

/** 随机抽取一个未触发的职级专属事件 */
export function drawTierEvent(state: PowerPerceptionState): { eventId: string; eventText: string } | null {
  const cfg = TIER_CONFIGS[state.currentTier];
  const triggered = state.tierEventsTriggered[state.currentTier] ?? [];
  const available = cfg.events.filter(e => !triggered.includes(e));

  if (available.length === 0) return null;

  const pick = available[Math.floor(Math.random() * available.length)];
  return { eventId: pick, eventText: pick };
}

/** 标记事件已触发 */
export function markTierEventTriggered(state: PowerPerceptionState, eventId: string): PowerPerceptionState {
  const triggered = state.tierEventsTriggered[state.currentTier] ?? [];
  if (triggered.includes(eventId)) return state;
  return {
    ...state,
    tierEventsTriggered: {
      ...state.tierEventsTriggered,
      [state.currentTier]: [...triggered, eventId],
    },
  };
}

// ── 视觉反馈标记（供UI读取）────────────────────────────

/** 获取办公室视觉描述 */
export function getOfficeVisual(state: PowerPerceptionState): {
  level: OfficeLevel;
  label: string;
  themeColor: string;
} {
  const level = state.officeLevel;
  const colors: Record<OfficeLevel, string> = {
    basic: '#8B7355',
    standard: '#4A7C59',
    spacious: '#1E3A5F',
    luxury: '#7B1FA2',
    command: '#B71C1C',
  };
  return {
    level,
    label: OFFICE_LEVEL_LABELS[level],
    themeColor: colors[level],
  };
}

/** 获取当前可执行操作列表（基于解锁功能） */
export function getAvailableActions(state: PowerPerceptionState): { key: UnlockedFeature; label: string }[] {
  return state.unlockedFeatures.map(f => ({ key: f, label: FEATURE_LABELS[f] }));
}

// ── 便捷函数 ───────────────────────────────────────────

/** 检查是否已解锁某功能 */
export function hasFeature(state: PowerPerceptionState, feature: UnlockedFeature): boolean {
  return state.unlockedFeatures.includes(feature);
}

/** 获取当前职级段最大下属数 */
export function getMaxSubordinates(state: PowerPerceptionState): number {
  return TIER_CONFIGS[state.currentTier].maxSubordinates;
}
