// 权力交接仪式系统 v1.0
// 五步流程：组织谈话 → 公示期 → 任职宣布 → 权力交接 → 就职演讲
// 跨职级段特别仪式：基层→县级→市级→省级→高层
import type { PlayerSave, FactionId } from '@/types/game';
import { getTierOf } from '@/lib/promotionEngine';

/** 仪式阶段 */
export type CeremonyPhase = 'talk' | 'publicity' | 'announce' | 'handover' | 'speech' | 'complete';

/** 前任态度 */
export type PredecessorAttitude = 'friendly' | 'neutral' | 'hostile';

/** 下属表态 */
export type SubordinateStance = 'loyal' | 'waitsee' | 'leave';

/** 演讲类型 */
export type SpeechType = 'pragmatic' | 'reform' | 'steady';

/** 仪式状态 */
export interface CeremonyState {
  phase: CeremonyPhase;
  startedDay: number;        // 仪式开始的游戏天（晋升当天）
  targetRank: number;        // 目标职级
  talkDone: boolean;
  publicityDone: boolean;
  publicityReported: boolean; // 公示期是否被举报
  announceDone: boolean;
  handoverDone: boolean;
  predecessorAttitude: PredecessorAttitude;
  subordinateStances: Record<string, SubordinateStance>;
  speechDone: boolean;
  speechType?: SpeechType;
  // 跨职级段特别仪式标记
  isBigPromotion: boolean;     // 是否跨职级段大晋升
  tierFrom: number;          // 原职级段
  tierTo: number;            // 新职级段
}

/** 组织谈话内容 */
export interface TalkContent {
  speaker: string;
  text: string;
  options: { label: string; effect: string; reputationKey?: string }[];
}

/** 公示期事件 */
export interface PublicityEvent {
  reported: boolean;
  reportReason?: string;
  playerChoice?: 'explain' | 'silent';
}

/** 权力交接结果 */
export interface HandoverResult {
  attitude: PredecessorAttitude;
  gifts?: string[];        // 友好时传授的"秘籍"
  penalties?: string[];    // 敌对时的损失
}

/** 就职演讲效果 */
export interface SpeechEffect {
  popularDelta: number;
  reputationKey?: string;
  reputationDelta: number;
  factionDeltas?: Record<string, number>;
}

// ── 常量 ─────────────────────────────────────────────

const TALK_DAYS_BEFORE = 7;
const PUBLICITY_DAYS = 3;   // 公示期持续3天
const HANDOVER_DAYS_AFTER = 7;

const PREDECESSOR_NAMES = ['前任书记', '原局长', '老领导', '前任主任'];

// ── 阶段推进 ─────────────────────────────────────────

/** 晋升胜利时初始化仪式 */
export function initCeremony(save: PlayerSave, newRank: number, day: number): CeremonyState {
  const tierFrom = getTierOf(save.rankLevel);
  const tierTo = getTierOf(newRank);
  const isBig = tierFrom !== tierTo;
  return {
    phase: 'talk',
    startedDay: day,
    targetRank: newRank,
    talkDone: false,
    publicityDone: false,
    publicityReported: false,
    announceDone: false,
    handoverDone: false,
    predecessorAttitude: 'neutral',
    subordinateStances: {},
    speechDone: false,
    isBigPromotion: isBig,
    tierFrom,
    tierTo,
  };
}

/** 生成组织谈话内容 */
export function generateTalk(save: PlayerSave): TalkContent {
  const rep = save.reputation;
  let text = '组织上对你的表现进行了全面考察，总体评价是积极的。';
  let options: TalkContent['options'] = [
    { label: '感谢组织信任，我一定加倍努力', effect: '好感+5' },
    { label: '我会继续脚踏实地做好本职工作', effect: '声望+3' },
  ];

  if (rep) {
    const maxDim = Object.entries(rep).sort((a, b) => b[1] - a[1])[0];
    if (maxDim[0] === 'merit' && maxDim[1] >= 60) {
      text = '组织上认可你的能力，希望你到新岗位后继续保持优良作风。';
      options = [
        { label: '请组织放心，我一定不负重托', effect: '政绩声望+5', reputationKey: 'merit' },
        { label: '我会用实绩回报组织信任', effect: '政绩声望+3', reputationKey: 'merit' },
      ];
    } else if (maxDim[0] === 'network' && maxDim[1] >= 60) {
      text = '这次是多方推荐的结果，希望你记住各方的支持。';
      options = [
        { label: '我铭记在心，日后定当回报', effect: '人脉声望+5', reputationKey: 'network' },
        { label: '我会团结同志，共同进步', effect: '人脉声望+3', reputationKey: 'network' },
      ];
    } else if (maxDim[0] === 'faction' && maxDim[1] >= 60) {
      text = '这是派系对你的信任，希望你为派系争取更多资源。';
      options = [
        { label: '我一定不辱使命', effect: '派系声望+5', reputationKey: 'faction' },
        { label: '我会平衡各方利益', effect: '派系声望+3', reputationKey: 'faction' },
      ];
    }
  }

  return {
    speaker: '组织部领导',
    text,
    options,
  };
}

/** 进行公示期判定（含举报概率） */
export function runPublicity(save: PlayerSave, ceremony: CeremonyState): PublicityEvent {
  // 公示期被举报概率：有贪腐记录时高概率
  const hasCorruption = (save.riskValue ?? 0) > 20 || (save.bribe_log?.length ?? 0) > 0 || (save.illegalWealth ?? 0) > 0;
  const baseProb = hasCorruption ? 0.6 : 0.15;
  const reported = Math.random() < baseProb;

  return {
    reported,
    reportReason: reported
      ? (hasCorruption
        ? '群众来信反映该同志在经济问题上存在疑点'
        : '有人匿名反映该同志工作作风不够扎实')
      : undefined,
  };
}

/** 公示期玩家应对 */
export function handlePublicityChoice(
  save: PlayerSave,
  ceremony: CeremonyState,
  choice: 'explain' | 'silent',
): { msg: string; popularDelta: number; reputationDelta: number } {
  if (!ceremony.publicityReported) {
    return { msg: '公示期风平浪静，无人提出异议。', popularDelta: 0, reputationDelta: 2 };
  }
  if (choice === 'explain') {
    return {
      msg: '你主动召开说明会，澄清了相关疑点。群众评价：态度诚恳。',
      popularDelta: 5,
      reputationDelta: 3,
    };
  }
  // silent：赌不被深入调查
  const investigated = Math.random() < 0.3;
  if (investigated) {
    return {
      msg: '你的沉默引发了更多猜测，纪检部门决定进行例行核查。',
      popularDelta: -10,
      reputationDelta: -5,
    };
  }
  return {
    msg: '你保持沉默，公示期后风波平息。',
    popularDelta: -2,
    reputationDelta: 0,
  };
}

/** 生成任职宣布文案 */
export function generateAppointmentText(rankLevel: number, cityName: string, positionTitle: string): string {
  const cfg = ['科员', '副科', '正科', '副处', '正处', '副厅', '正厅', '副省', '正省', '国级'][Math.min(9, Math.max(0, Math.floor((rankLevel - 1) / 1.5)))];
  return `经组织研究决定，任命你为${cityName}${positionTitle}（${cfg}级）。望你恪尽职守，不负重托。`;
}

/** 判定前任态度 */
export function judgePredecessorAttitude(save: PlayerSave): PredecessorAttitude {
  // 简化：基于随机 + 玩家道德值微调
  const roll = Math.random();
  if (save.moralValue >= 80) return roll < 0.6 ? 'friendly' : roll < 0.9 ? 'neutral' : 'hostile';
  if (save.moralValue >= 50) return roll < 0.3 ? 'friendly' : roll < 0.7 ? 'neutral' : 'hostile';
  return roll < 0.15 ? 'friendly' : roll < 0.5 ? 'neutral' : 'hostile';
}

/** 执行权力交接 */
export function performHandover(save: PlayerSave, attitude: PredecessorAttitude): HandoverResult {
  if (attitude === 'friendly') {
    return {
      attitude,
      gifts: ['获得"岗位秘籍"：新岗位首月政绩获取+20%', '前任留下的人脉清单：人脉声望+10'],
    };
  }
  if (attitude === 'hostile') {
    return {
      attitude,
      penalties: ['前任带走核心资源：下属忠诚度-20%', '财政账户被冻结：本月部门资金-30%'],
    };
  }
  return { attitude };
}

/** 判定下属表态 */
export function judgeSubordinateStances(subIds: string[]): Record<string, SubordinateStance> {
  const stances: Record<string, SubordinateStance> = {};
  for (const id of subIds) {
    const roll = Math.random();
    stances[id] = roll < 0.5 ? 'loyal' : roll < 0.8 ? 'waitsee' : 'leave';
  }
  return stances;
}

/** 演讲效果 */
export function getSpeechEffect(type: SpeechType): SpeechEffect {
  switch (type) {
    case 'pragmatic':
      return { popularDelta: 10, reputationKey: 'merit', reputationDelta: 5, factionDeltas: {} };
    case 'reform':
      return {
        popularDelta: 0,
        reputationKey: 'merit',
        reputationDelta: 0,
        factionDeltas: { reform: 15, pragmatic: -5 },
      };
    case 'steady':
      return {
        popularDelta: 0,
        reputationKey: 'integrity',
        reputationDelta: 3,
        factionDeltas: {},
      };
  }
}

/** 获取跨职级段特别仪式文案 */
export function getBigPromotionNarrative(tierFrom: number, tierTo: number, cityName: string): string {
  const narratives: Record<string, string> = {
    '1_2': `你从乡镇基层踏入${cityName}县城，第一次走进县政府大楼。`,
    '2_3': `你进入${cityName}地级市，市委常委会的场景让你意识到责任的重大。`,
    '3_4': `你来到省会${cityName}，省委大院的庄严让你感受到权力的分量。`,
    '4_5': `你进京赴任，部委的走廊里回响着国家大事的讨论声。`,
  };
  return narratives[`${tierFrom}_${tierTo}`] ?? `你履新${cityName}，开启了职业生涯的新篇章。`;
}

/** 仪式推进（按游戏天数自动推进阶段） */
export function advanceCeremony(ceremony: CeremonyState, gameDays: number): CeremonyState {
  const daysSinceStart = gameDays - ceremony.startedDay;
  let phase: CeremonyPhase = ceremony.phase;

  if (phase === 'talk' && daysSinceStart >= 0) phase = 'publicity';
  if (phase === 'publicity' && daysSinceStart >= PUBLICITY_DAYS) phase = 'announce';
  if (phase === 'announce' && daysSinceStart >= PUBLICITY_DAYS + 1) phase = 'handover';
  if (phase === 'handover' && daysSinceStart >= PUBLICITY_DAYS + 1 + HANDOVER_DAYS_AFTER) phase = 'speech';

  return { ...ceremony, phase };
}

/** 判断仪式是否全部完成 */
export function isCeremonyComplete(ceremony: CeremonyState): boolean {
  return ceremony.phase === 'speech' && ceremony.speechDone;
}
