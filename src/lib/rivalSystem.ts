// 政敌系统 v1.0
// 生成 / 行为AI（情报战·舆论战·关系战·资源战·狙击战）/ 玩家反制（调查·爆料·联盟·收编）/ 生涯演变
import type { PlayerSave } from '@/types/game';
import type { ReputationState } from '@/lib/reputationSystem';

/** 政敌阵营 */
export type RivalFaction = 'reform' | 'conservative' | 'neutral';

/** 政敌生涯状态 */
export type RivalStatus = 'active' | 'defeated' | 'recruited' | 'retired' | 'fell';

/** 政敌档案 */
export interface RivalProfile {
  id: string;
  name: string;
  faction: RivalFaction;
  isSameFactionRival: boolean;  // 与玩家同派 = 同派竞争者，否则 = 跨派打压者
  meritScore: number;    // 竞争评分（与玩家镜像，略高或略低）
  power: number;         // 势力值 0-100
  favor: number;         // 与玩家的关系度 -100 ~ 100（<0 为敌对）
  hasLeverage: boolean;  // 玩家是否掌握其把柄
  leverageDetail: string | null;
  status: RivalStatus;
  lastActionDay: number; // 上次实施行为的天数
  grudgeOrigin: string;  // 与玩家的恩怨起源
  motto: string;         // 座右铭
  investigation: { startedDay: number; endsDay: number; success: boolean | null } | null;
  revengeOfId: string | null;  // 复仇链：替哪位被击败政敌复仇
  examReport: string;    // 干部考察材料式档案描述
}

/** 政敌行为返回事件 */
export interface RivalActionEvent {
  rivalId: string;
  rivalName: string;
  type: 'intel' | 'publicity' | 'relation' | 'resource' | 'snipe';
  text: string;
  effects?: {
    meritDelta?: number;
    competitionPenalty?: number;
    publicity?: number;
    bossFavor?: number;
    boss2Favor?: number;
    boss3Favor?: number;
  };
}

/** 按职级段生成政敌（每段 2-3 名） */
export function generateRivals(save: PlayerSave, gameDays: number): RivalProfile[] {
  const tier = getTierOf(save.rankLevel);
  const count = 2 + Math.floor(Math.random() * 2); // 2-3 名
  const playerFaction: RivalFaction = (save.primaryFaction as RivalFaction) || 'neutral';
  const otherFactions: RivalFaction[] = (['reform', 'conservative', 'neutral'] as RivalFaction[]).filter(f => f !== playerFaction);

  const rivals: RivalProfile[] = [];
  for (let i = 0; i < count; i++) {
    // 约 2/3 概率为跨派打压者，1/3 为同派竞争者
    const crossFaction = i < count - 1 ? Math.random() < 0.66 : false;
    const faction = crossFaction
      ? otherFactions[Math.floor(Math.random() * otherFactions.length)]
      : playerFaction;

    rivals.push({
      id: `rival_${tier}_${i + 1}`,
      name: pickRivalName(i),
      faction,
      isSameFactionRival: faction === playerFaction,
      // 镜像玩家评分：±15% 浮动
      meritScore: Math.max(30, Math.round(estimatePlayerScore(save) * (1 + (Math.random() * 0.3 - 0.15)))),
      power: Math.max(10, Math.min(100, Math.round((save.bossFavor + save.popularSupport) / 2 + (Math.random() * 20 - 10)))),
      favor: -30 - Math.round(Math.random() * 40), // 初始即敌对
      hasLeverage: false,
      leverageDetail: null,
      status: 'active',
      lastActionDay: gameDays - Math.round(Math.random() * 20), // 随机错开首次行为时间
      grudgeOrigin: pickGrudge(i, faction, playerFaction),
      motto: pickMotto(i),
      investigation: null,
      revengeOfId: null,
      examReport: '',
    });
  }

  // 生成考察材料式档案描述
  for (const r of rivals) {
    r.examReport = buildExamReport(r);
  }
  return rivals;
}

/** 生成复仇链政敌（前一段击败者的徒弟/盟友） */
export function generateRevengeRival(save: PlayerSave, defeatedName: string, gameDays: number): RivalProfile {
  const base: RivalProfile = {
    id: `rival_revenge_${gameDays}`,
    name: pickRivalName(Math.floor(Math.random() * 10)),
    faction: 'neutral',
    isSameFactionRival: false,
    meritScore: Math.round(estimatePlayerScore(save) * 1.15), // 更强
    power: 70,
    favor: -50,
    hasLeverage: false,
    leverageDetail: null,
    status: 'active',
    lastActionDay: gameDays,
    grudgeOrigin: `他是${defeatedName}的门生，发誓要为恩师讨回公道`,
    motto: '师恩难忘，此仇必报',
    investigation: null,
    revengeOfId: null,
    examReport: '',
  };
  base.examReport = buildExamReport(base);
  return base;
}

/** 政敌行为 AI：每月结算触发（兼容 PlayerSave.rivals 的宽松字段类型） */
export function checkRivalActions(
  save: PlayerSave,
  rivals: Array<PlayerSave['rivals'][number]>,
  rep: ReputationState,
  gameDays: number,
  inPromotionMonth: boolean,
): RivalActionEvent[] {
  const events: RivalActionEvent[] = [];
  for (const rival of rivals) {
    if (rival.status !== 'active') continue;
    if (gameDays - rival.lastActionDay < 30) continue; // 每月最多一次

    // 1. 狙击战：玩家晋升关键月，概率触发（功绩-100，竞争分-8）
    if (inPromotionMonth && Math.random() < 0.35) {
      rival.lastActionDay = gameDays;
      events.push({
        rivalId: rival.id,
        rivalName: rival.name,
        type: 'snipe',
        text: `🎯 ${rival.name}在晋升关键期发动狙击："此人政绩注水，建议组织彻查"（功绩-100，竞争分-8）`,
        effects: { meritDelta: -100, competitionPenalty: -8 },
      });
      continue;
    }

    const roll = Math.random();
    // 2. 舆论战：玩家声望即将达标（任一维度 55-75）时降舆论声望
    if (rep.publicity >= 55 && rep.publicity <= 75 && roll < 0.25) {
      rival.lastActionDay = gameDays;
      events.push({
        rivalId: rival.id,
        rivalName: rival.name,
        type: 'publicity',
        text: `📰 ${rival.name}散布负面消息，抹黑你的群众口碑（舆论声望-15）`,
        effects: { publicity: -15 },
      });
      continue;
    }
    // 3. 情报战：玩家有把柄（贪腐/贿赂记录）时窃取
    if (hasLeverageOnPlayer(save) && roll < 0.3) {
      rival.lastActionDay = gameDays;
      events.push({
        rivalId: rival.id,
        rivalName: rival.name,
        type: 'intel',
        text: `🕵️ ${rival.name}通过内线接触到了你的私密材料，你的处境变得危险（线索+15）`,
        effects: {},
      });
      continue;
    }
    // 4. 关系战：降低与玩家特定上司好感
    if (roll < 0.45) {
      rival.lastActionDay = gameDays;
      const target = pickBossIndex();
      const bossLabels = ['上级一', '上级二', '上级三'] as const;
      const fork: Partial<Record<number, keyof typeof bossLabels>> = {};
      const label = bossLabels[target];
      events.push({
        rivalId: rival.id,
        rivalName: rival.name,
        type: 'relation',
        text: `🤝 ${rival.name}频繁拜访${label}，挑拨你与上级的关系（${label}好感-5）`,
        effects: target === 0 ? { bossFavor: -5 } : target === 1 ? { boss2Favor: -5 } : { boss3Favor: -5 },
      });
      continue;
    }
    // 5. 资源战：晋升竞争前提升自己评分
    if (roll >= 0.45 && roll < 0.65) {
      rival.lastActionDay = gameDays;
      rival.meritScore += 5;
      events.push({
        rivalId: rival.id,
        rivalName: rival.name,
        type: 'resource',
        text: `💰 ${rival.name}动用资源拉拢评委，竞争评分+5（现 ${rival.meritScore}）`,
        effects: {},
      });
      continue;
    }
  }
  return events;
}

/** 玩家反制：调查政敌（消耗 50 万 + 30 天，成功率 60%） */
export function startRivalInvestigation(rival: RivalProfile, gameDays: number): { ok: boolean; msg: string; investigation: RivalProfile['investigation'] } {
  if (rival.investigation && gameDays < rival.investigation.endsDay) {
    return { ok: false, msg: '已有进行中的调查，请等待其完成', investigation: rival.investigation };
  }
  const inv = { startedDay: gameDays, endsDay: gameDays + 30, success: null };
  return { ok: true, msg: `已派人对 ${rival.name} 开展调查（30天后出结果，成功率60%）`, investigation: inv };
}

/** 调查到期结算 */
export function settleRivalInvestigation(rival: RivalProfile, gameDays: number): { found: boolean; msg: string } {
  if (!rival.investigation || rival.investigation.success !== null) {
    return { found: false, msg: '' };
  }
  if (gameDays < rival.investigation.endsDay) {
    return { found: false, msg: '' };
  }
  const success = Math.random() < 0.6;
  rival.investigation.success = success;
  if (success) {
    rival.hasLeverage = true;
    rival.leverageDetail = `掌握 ${rival.name} 曾收受工程回扣的证据`;
    return { found: true, msg: `🔍 调查完成：查实 ${rival.name} 存在经济问题线索，现已掌握其把柄！` };
  }
  return { found: false, msg: `🔍 调查完成：未发现 ${rival.name} 的实质问题，打草惊蛇（其好感-10）` };
}

/** 玩家反制：匿名爆料（政敌声望-20，冻结90天） */
export function applyAnonymousLeak(rival: RivalProfile, gameDays: number): { ok: boolean; msg: string } {
  if (!rival.hasLeverage) return { ok: false, msg: `未掌握 ${rival.name} 的把柄，无法爆料` };
  rival.hasLeverage = false;
  rival.leverageDetail = null;
  rival.status = 'defeated';  // 冻结视为本段出局（简化处理：defeated 即退出竞争）
  return { ok: true, msg: `📢 匿名爆料成功：${rival.name} 被纪检约谈，退出本轮晋升竞争（90天冻结）` };
}

/** 玩家反制：收编（派系贡献200 + 个人资金100万，政敌转为下属） */
export function applyCooptRival(rival: RivalProfile): { ok: boolean; msg: string } {
  if (rival.status !== 'active') return { ok: false, msg: `${rival.name} 当前无法收编` };
  rival.status = 'recruited';
  return { ok: true, msg: `🤝 收编成功：${rival.name} 已投诚，成为你的政治盟友（不再与你竞争）` };
}

// ── 内部工具 ──

function getTierOf(rankLevel: number): number {
  if (rankLevel <= 3) return 1;
  if (rankLevel <= 6) return 2;
  if (rankLevel <= 9) return 3;
  if (rankLevel <= 11) return 4;
  return 5;
}

/** 估算玩家竞争评分（简化版，与 promotionEngine.computePlayerScore 同量纲） */
function estimatePlayerScore(save: PlayerSave): number {
  const merit = Math.min(100, (save.meritPoints / Math.max(1, save.requiredMerit)) * 60 + 40);
  const favor = (save.bossFavor + save.boss2Favor + save.boss3Favor) / 3;
  return Math.round(merit * 0.35 + save.popularSupport * 0.25 + favor * 0.25 + (save.assessmentGrade === '特等' ? 15 : save.assessmentGrade === '优秀' ? 10 : 0));
}

/** 玩家是否有把柄可被窃取 */
function hasLeverageOnPlayer(save: PlayerSave): boolean {
  return (save.riskValue ?? 0) >= 30 || (save.bribe_log?.length ?? 0) > 0 || (save.illegalWealth ?? 0) > 0;
}

function pickBossIndex(): number {
  return Math.floor(Math.random() * 3);
}

function buildExamReport(r: RivalProfile): string {
  const ability = r.meritScore >= 70 ? '工作能力较强' : r.meritScore >= 45 ? '工作基本称职' : '能力有待提升';
  const relation = r.power >= 70 ? '在班子内有较深根基' : r.power >= 40 ? '有一定人脉' : '群众基础一般';
  const factionDesc = r.faction === 'reform' ? '改革派骨干' : r.faction === 'conservative' ? '稳健派代表' : '立场游移';
  return `考察意见：该同志${ability}，${relation}，系${factionDesc}。${r.isSameFactionRival ? '与本人同属一派，存在晋升名额竞争。' : '与本人立场相左，需注意其动向。'}`;
}

const RIVAL_NAMES = ['赵德柱', '钱守业', '孙立威', '李卫东', '周正雄', '吴永昌', '郑克俭', '王学究', '冯铁山', '陈继忠'];
function pickRivalName(i: number): string {
  return RIVAL_NAMES[(i + Math.floor(Math.random() * RIVAL_NAMES.length)) % RIVAL_NAMES.length];
}

function pickGrudge(i: number, faction: RivalFaction, playerFaction: RivalFaction): string {
  if (faction !== playerFaction) return '在一次班子会议上公开反对你的规划方案，双方结下梁子';
  const grudges = [
    '与你竞争同一岗位，副职考核中惜败于你，怀恨在心',
    '你曾在年度考核中对其工作提出批评，从此记恨',
    '同派系内与你争夺资源调配权，关系日益紧张',
  ];
  return grudges[i % grudges.length];
}

function pickMotto(i: number): string {
  const mottos = ['成大事者不拘小节', '顺我者昌，逆我者亡', '位子只有一个', '政治就是站队', '宁教我负天下人'];
  return mottos[i % mottos.length];
}