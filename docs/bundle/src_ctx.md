# src/ctx

共 1 个文件。
<a id="srcctxgamecontexttsx"></a>
## `src/ctx/GameContext.tsx`

```tsx
// 游戏状态Context管理
import React, { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react';
import { getSave, getSaveById, getActiveSaveLocal, updateSave, addNewCases, supplementSubordinates, getSubordinates, completeBuildProjects, triggerSubVisit, runAnnualSubAssessment, generateMonthlyReports, getUnreadReports, generateMonthlyEnterprises, calcMonthlyTax, generatePetitionEvent, generateAnnualRankReport, fillDeptStaff, execDeptAutoActions, growPopulation, autoGrowSecretaryAbility, generateExchangeOfficer, resolveMeetingTasks, dailyEnergyRegen, monthlyHealthRegen, checkPartySchoolCompletion, tryTriggerNationalPolicy, agingLeadershipBand, checkPolicyExpiry, autoGrowSubAbility } from '@/db/gameApi';
// §3.3 / §3.22  风口周期与派系斗争阶段自动推进
import { shouldTriggerWindCycle, isInMobilizationPeriod, getDominantFaction, getLosingFaction, getRelationFromSave, getRepLevel, applyRelDeltaToSave, WIND_CYCLE_DAYS } from '@/lib/factionSystem';
// 派系晋升联动：双轨胜利结算 + 棋盘刷新 + 年度委托
import { evaluateStruggle, applyFactionWin, applyFactionLossPenalty, expireContest } from '@/lib/promotionFaction';
// v4 省级席位控制：周期边界全国棋盘结算
import { resolveNationalSeatControl, VICTORY_THRESHOLD } from '@/lib/provinceSeatSystem';
import { buildBoard } from '@/lib/positionBoard';
import { generateMandates } from '@/lib/factionGameplay';
// v6：周期功绩分红
import { settleCycleDividend } from '@/lib/factionExpansion';
import type { PoliticalWind, FactionId } from '@/types/game';
import type { PlayerSave, MonthlyReport } from '@/types/game';
import type { ExchangeOfficer } from '@/db/gameApi';
import { RANK_CONFIG, RANK_SALARY, RANK_FUND_MULTIPLIER, RANK_PERSONAL_HPF, RANK_MONTHLY_ALLOWANCE, RANK_ANNUAL_BONUS_MONTHS, checkRetirementStatus, calcRenewalVote } from '@/types/game';
import { getRandomMinistry } from '@/types/game';
import { computeKpi } from '@/lib/kpiEngine';
import { settlePoliticalEcology } from '@/lib/promotionEngine';

export interface BossChangeEvent {
  bossNum: 1 | 2 | 3;
  oldBossName: string;
  newBossName: string;
  position: string;       // 职衔
  newFavor: number;       // 新好感度（30-60）
}

// 纪委风险事件
export interface DisciplineWarnEvent {
  type: 'warn' | 'investigation'; // warn=约谈, investigation=立案审查
  officerName: string;
  meritPenalty: number;    // 政绩扣除
  moralChange: number;     // 民心值变化
  content: string;
}

export interface UpperInspectEvent {
  inspectorName: string;
  inspectorTitle: string;
  focus: 'gdp' | 'livelihood' | 'ecology' | 'business' | 'security' | 'overall';
  focusLabel: string;
  result: 'excellent' | 'good' | 'pass' | 'fail';
  resultLabel: string;
  meritDelta: number;   // 政绩奖惩（正=奖，负=罚）
  favorDelta: number;   // 上司好感（正=奖，负=罚）
  comment: string;
}

interface GameContextType {
  save: PlayerSave | null;
  isLoading: boolean;
  timeGranularity: '天' | '周' | '月';
  isRunning: boolean;
  annualRankNotice: { pct: number; isExcellent: boolean } | null;
  clearAnnualRankNotice: () => void;
  unreadReports: MonthlyReport[];
  clearUnreadReports: () => void;
  personnelReviewPending: boolean;
  clearPersonnelReview: () => void;
  exchangeOfficer: ExchangeOfficer | null;
  clearExchangeOfficer: () => void;
  upperInspectEvent: UpperInspectEvent | null;
  clearUpperInspectEvent: () => void;
  meetingTaskFeedback: string | null;
  clearMeetingTaskFeedback: () => void;
  // 退休弹窗状态
  retirementTrigger: 'voluntary' | 'mandatory' | null;
  clearRetirementTrigger: () => void;
  // 续任投票弹窗状态（rank14 总理届满两届强退；rank15 届满触发全国执政党代表大会/议政院投票）
  renewalVoteTrigger: { rankLevel: number; voteRate: number; passed: boolean; termsAfter: number } | null;
  clearRenewalVoteTrigger: () => void;
  // 上司换届
  bossChangeEvent: BossChangeEvent | null;
  clearBossChangeEvent: () => void;
  // 纪委风险
  disciplineWarnEvent: DisciplineWarnEvent | null;
  clearDisciplineWarnEvent: () => void;
  // Game Over结局
  gameOverTrigger: PlayerSave['gameOverType'];
  clearGameOverTrigger: () => void;
  setTimeGranularity: (g: '天' | '周' | '月') => void;
  setIsRunning: (v: boolean) => void;
  advanceTime: () => Promise<void>;
  refreshSave: () => Promise<void>;
  updateGameSave: (updates: Parameters<typeof updateSave>[1]) => Promise<void>;
}

const GameContext = createContext<GameContextType>({
  save: null,
  isLoading: true,
  timeGranularity: '月',
  isRunning: false,
  annualRankNotice: null,
  clearAnnualRankNotice: () => {},
  unreadReports: [],
  clearUnreadReports: () => {},
  personnelReviewPending: false,
  clearPersonnelReview: () => {},
  exchangeOfficer: null,
  clearExchangeOfficer: () => {},
  upperInspectEvent: null,
  clearUpperInspectEvent: () => {},
  meetingTaskFeedback: null,
  clearMeetingTaskFeedback: () => {},
  retirementTrigger: null,
  clearRetirementTrigger: () => {},
  renewalVoteTrigger: null,
  clearRenewalVoteTrigger: () => {},
  bossChangeEvent: null,
  clearBossChangeEvent: () => {},
  disciplineWarnEvent: null,
  clearDisciplineWarnEvent: () => {},
  gameOverTrigger: null,
  clearGameOverTrigger: () => {},
  setTimeGranularity: () => {},
  setIsRunning: () => {},
  advanceTime: async () => {},
  refreshSave: async () => {},
  updateGameSave: async () => {},
});

import { ensureNpcNamePoolLoaded, pickNpcName } from '@/lib/npcNamePool';

const DISCIPLINE_OFFICERS = ['李纪委副书记', '王纪检专员', '张纪检组长', '刘督察专员', '陈监察委员'];
const genBossName = () => pickNpcName();
const genDisciplineOfficer = () => DISCIPLINE_OFFICERS[Math.floor(Math.random() * DISCIPLINE_OFFICERS.length)];

export function GameProvider({ children }: { children: React.ReactNode }) {
  const [save, setSave] = useState<PlayerSave | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [timeGranularity, setTimeGranularity] = useState<'天' | '周' | '月'>('月');
  const [isRunning, setIsRunning] = useState(false);
  const [annualRankNotice, setAnnualRankNotice] = useState<{ pct: number; isExcellent: boolean } | null>(null);
  const [unreadReports, setUnreadReports] = useState<MonthlyReport[]>([]);
  const [personnelReviewPending, setPersonnelReviewPending] = useState(false);
  const [exchangeOfficer, setExchangeOfficer] = useState<ExchangeOfficer | null>(null);
  const [upperInspectEvent, setUpperInspectEvent] = useState<UpperInspectEvent | null>(null);
  const upperInspectRef = useRef<UpperInspectEvent | null>(null);
  useEffect(() => { upperInspectRef.current = upperInspectEvent; }, [upperInspectEvent]);
  const [meetingTaskFeedback, setMeetingTaskFeedback] = useState<string | null>(null);
  const exchangeOfficerRef = useRef<ExchangeOfficer | null>(null);
  useEffect(() => { exchangeOfficerRef.current = exchangeOfficer; }, [exchangeOfficer]);
  // 退休触发类型（voluntary=自主/mandatory=强制）
  const [retirementTrigger, setRetirementTrigger] = useState<'voluntary' | 'mandatory' | null>(null);
  const retirementTriggerRef = useRef<'voluntary' | 'mandatory' | null>(null);
  useEffect(() => { retirementTriggerRef.current = retirementTrigger; }, [retirementTrigger]);

  const [renewalVoteTrigger, setRenewalVoteTrigger] = useState<{ rankLevel: number; voteRate: number; passed: boolean; termsAfter: number } | null>(null);
  const renewalVoteTriggerRef = useRef<{ rankLevel: number; voteRate: number; passed: boolean; termsAfter: number } | null>(null);
  useEffect(() => { renewalVoteTriggerRef.current = renewalVoteTrigger; }, [renewalVoteTrigger]);
  // 上司换届事件
  const [bossChangeEvent, setBossChangeEvent] = useState<BossChangeEvent | null>(null);
  const bossChangeRef = useRef<BossChangeEvent | null>(null);
  useEffect(() => { bossChangeRef.current = bossChangeEvent; }, [bossChangeEvent]);
  // 纪委风险事件
  const [disciplineWarnEvent, setDisciplineWarnEvent] = useState<DisciplineWarnEvent | null>(null);
  const disciplineWarnRef = useRef<DisciplineWarnEvent | null>(null);
  useEffect(() => { disciplineWarnRef.current = disciplineWarnEvent; }, [disciplineWarnEvent]);
  // Game Over结局
  const [gameOverTrigger, setGameOverTrigger] = useState<PlayerSave['gameOverType']>(null);
  const gameOverRef = useRef<PlayerSave['gameOverType']>(null);
  useEffect(() => { gameOverRef.current = gameOverTrigger; }, [gameOverTrigger]);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const saveRef = useRef<PlayerSave | null>(null);
  // 防止并发推进
  const isAdvancingRef = useRef(false);
  const granularityRef = useRef<'天' | '周' | '月'>('月');
  useEffect(() => { saveRef.current = save; }, [save]);
  useEffect(() => { granularityRef.current = timeGranularity; }, [timeGranularity]);

  // 纪委约谈官员池

  /** 生成上级来访考察事件 */
  const generateUpperInspect = useCallback((current: PlayerSave): UpperInspectEvent => {
    const INSPECTOR_POOL = [
      { name: '王建国', title: '省纪委巡察组组长' },
      { name: '李明远', title: '省委组织部副部长' },
      { name: '张宏伟', title: '省政府督查室主任' },
      { name: '刘志远', title: '市委书记' },
      { name: '陈国华', title: '省委常委' },
      { name: '赵一凡', title: '国政院督察专员' },
    ];
    const FOCUS_OPTIONS: UpperInspectEvent['focus'][] = ['gdp', 'livelihood', 'ecology', 'business', 'security', 'overall'];
    const FOCUS_LABELS: Record<UpperInspectEvent['focus'], string> = {
      gdp: 'GDP发展', livelihood: '民生保障', ecology: '生态文明',
      business: '营商环境', security: '社会治安', overall: '综合治理',
    };
    const inspector = INSPECTOR_POOL[Math.floor(Math.random() * INSPECTOR_POOL.length)];
    const focus = FOCUS_OPTIONS[Math.floor(Math.random() * FOCUS_OPTIONS.length)];
    // 根据对应指标判断考察结果
    const scores: Record<UpperInspectEvent['focus'], number> = {
      gdp: current.cityGdp, livelihood: current.cityLivelihood, ecology: current.cityEcology,
      business: current.cityBusiness, security: current.securityIndex,
      overall: (current.cityGdp + current.cityLivelihood + current.cityEcology + current.cityBusiness + current.securityIndex) / 5,
    };
    const score = scores[focus];
    let result: UpperInspectEvent['result'];
    let resultLabel: string;
    let meritDelta: number;
    let favorDelta: number;
    let comment: string;
    if (score >= 80) {
      result = 'excellent'; resultLabel = '考察优秀';
      meritDelta = 15; favorDelta = 8;
      comment = `考察组认为您在${FOCUS_LABELS[focus]}方面工作成效突出，值得全市推广借鉴，建议上报表彰。`;
    } else if (score >= 65) {
      result = 'good'; resultLabel = '考察良好';
      meritDelta = 8; favorDelta = 3;
      comment = `考察组对您在${FOCUS_LABELS[focus]}方面的工作给予积极评价，指出仍有进一步提升空间。`;
    } else if (score >= 45) {
      result = 'pass'; resultLabel = '考察合格';
      meritDelta = 0; favorDelta = -2;
      comment = `考察组指出${FOCUS_LABELS[focus]}工作有待改进，要求限期整改并上报整改方案。`;
    } else {
      result = 'fail'; resultLabel = '考察不达标';
      meritDelta = -10; favorDelta = -8;
      comment = `考察组对${FOCUS_LABELS[focus]}工作给予严肃批评，指出存在明显短板，已向省委发出预警通报。`;
    }
    return { inspectorName: inspector.name, inspectorTitle: inspector.title, focus, focusLabel: FOCUS_LABELS[focus], result, resultLabel, meritDelta, favorDelta, comment };
  }, []);

  const refreshSave = useCallback(async () => {
    setIsLoading(true);
    // 按设备存档偏好加载：有偏好档则优先加载该档，偏好为空或该档不存在时回退最新存档
    const activeId = getActiveSaveLocal();
    const data = activeId ? (await getSaveById(activeId)) ?? (await getSave()) : await getSave();
    setSave(data);
    setIsLoading(false);
    // 预加载 NPC 姓名词库到内存，供后续同步取词
    void ensureNpcNamePoolLoaded();
  }, []);

  useEffect(() => { refreshSave(); }, [refreshSave]);

  const updateGameSave = useCallback(async (updates: Parameters<typeof updateSave>[1]) => {
    if (!saveRef.current) return;
    // 乐观更新：立即更新本地状态，无需等待数据库响应
    const optimistic = { ...saveRef.current, ...updates } as PlayerSave;
    setSave(optimistic);
    const updated = await updateSave(saveRef.current.id, updates);
    if (updated) setSave(updated);
  }, []);

  // 每天增量计算
  const computeDailyDelta = useCallback((current: PlayerSave) => {
    const baseRate = current.rankLevel * 0.5;
    const gdpDelta = (Math.random() - 0.48) * 0.3 + baseRate * 0.05;
    const livelDelta = (Math.random() - 0.48) * 0.3 + (current.securityIndex - 50) * 0.02;
    const ecoDelta = (Math.random() - 0.50) * 0.2;
    const bizDelta = (Math.random() - 0.48) * 0.3 + baseRate * 0.03;
    const meritDelta = 0.12 + baseRate * 0.025;
    const clamp = (v: number) => Math.max(0, Math.min(100, v));
    return {
      cityGdp: clamp(current.cityGdp + gdpDelta),
      cityLivelihood: clamp(current.cityLivelihood + livelDelta),
      cityEcology: clamp(current.cityEcology + ecoDelta),
      cityBusiness: clamp(current.cityBusiness + bizDelta),
      meritPoints: current.meritPoints + meritDelta,
    };
  }, []);

  // 年度排名计算（模拟：基于四项指标与随机对手比较）
  const computeAnnualRank = useCallback((s: PlayerSave): { pct: number; isExcellent: boolean } => {
    const myScore = (s.cityGdp + s.cityLivelihood + s.cityEcology + s.cityBusiness) / 4;
    // 模拟20个同级竞争者
    let beaten = 0;
    for (let i = 0; i < 20; i++) {
      const rival = 40 + Math.random() * 40;
      if (myScore > rival) beaten++;
    }
    const pct = Math.round((beaten / 20) * 100);
    return { pct, isExcellent: pct >= 80 };
  }, []);

  const advanceTime = useCallback(async () => {
    if (isAdvancingRef.current) return;
    const current = saveRef.current;
    if (!current) return;
    // 角色创建未完成时不推进时间
    if (current.needsCharacterCreation) return;

    isAdvancingRef.current = true;
    const gran = granularityRef.current;
    const daysToAdvance = gran === '天' ? 1 : gran === '周' ? 7 : 30;

    let cumGdp = current.cityGdp;
    let cumLivel = current.cityLivelihood;
    let cumEco = current.cityEcology;
    let cumBiz = current.cityBusiness;
    let cumMerit = current.meritPoints;
    let newGameDays = current.gameDays;
    let newTenureDays = current.tenureDays;

    for (let i = 0; i < daysToAdvance; i++) {
      const delta = computeDailyDelta({
        ...current,
        cityGdp: cumGdp, cityLivelihood: cumLivel,
        cityEcology: cumEco, cityBusiness: cumBiz,
        meritPoints: cumMerit,
      });
      cumGdp = delta.cityGdp;
      cumLivel = delta.cityLivelihood;
      cumEco = delta.cityEcology;
      cumBiz = delta.cityBusiness;
      cumMerit = delta.meritPoints;
      newGameDays++;
      newTenureDays++;
    }

    const newTenureYears = Math.floor(newTenureDays / 365);

    const avgIndex = (cumGdp + cumLivel + cumEco + cumBiz) / 4;
    let assessmentGrade: PlayerSave['assessmentGrade'] = '合格';
    if (avgIndex >= 75) assessmentGrade = '优秀';
    else if (avgIndex >= 60) assessmentGrade = '良好';
    else if (avgIndex < 35) assessmentGrade = '不合格';

    // 年度排名：跨越365天整数倍则触发
    const prevYear = Math.floor(current.gameDays / 365);
    const newYear = Math.floor(newGameDays / 365);
    let newLastRankDay = current.lastRankDay;
    let newAnnualRankPct = current.annualRankPct;
    let newIsExcellentRank = current.isExcellentRank;
    let newEventsThisYear = current.eventsThisYear;
    let newConsecutiveExcellentYears = current.consecutiveExcellentYears ?? 0;

    if (newYear > prevYear) {
      const rank = computeAnnualRank({ ...current, cityGdp: cumGdp, cityLivelihood: cumLivel, cityEcology: cumEco, cityBusiness: cumBiz });
      newLastRankDay = newGameDays;
      newAnnualRankPct = rank.pct;
      newIsExcellentRank = rank.isExcellent;
      newEventsThisYear = 0; // 新年重置事件计数
      setAnnualRankNotice(rank);

      // 连续优秀/特等计数：优秀(≥80)累加，否则清零
      if (rank.isExcellent) {
        newConsecutiveExcellentYears = (current.consecutiveExcellentYears ?? 0) + 1;
      } else {
        newConsecutiveExcellentYears = 0;
      }

      // ── 年度新系统：NPC老化 + 政策运动触发 ──────────────────────
      void Promise.all([
        agingLeadershipBand(current.id, newGameDays, current.rankLevel, current.cityName, current.birthProvince, current.birthCity),
        tryTriggerNationalPolicy(current.id, newGameDays),
      ]);
    }

    // 突发事件：每年不超过6次，按月概率触发
    const eventProbability = daysToAdvance >= 30 ? 0.55 : daysToAdvance >= 7 ? 0.25 : 0.05;
    const canTriggerEvent = newEventsThisYear < 6 && !current.isEventPending;
    const shouldTriggerEvent = canTriggerEvent && Math.random() < eventProbability;
    if (shouldTriggerEvent) newEventsThisYear++;

    // 计算晋升条件：优秀排名缩短任期要求（加速效果×0.2）
    // 原加速档位（下调前）：连续2年特等-75%、特等-65%、连续2年优秀-62.5%、优秀-50%
    // 现加速档位（下调后）：连续2年特等-15%、特等-13%、连续2年优秀-12.5%、优秀-10%
    const rankConfig = RANK_CONFIG[current.rankLevel];
    const isTopRank = newAnnualRankPct >= 95; // 特等
    let effectiveTenureRequired: number;
    if (!newIsExcellentRank) {
      effectiveTenureRequired = rankConfig.requiredTenureYears;
    } else if (isTopRank && newConsecutiveExcellentYears >= 2) {
      effectiveTenureRequired = Math.ceil(rankConfig.requiredTenureYears * 0.85); // 原0.25→减免75%削弱为减免15%
    } else if (isTopRank) {
      effectiveTenureRequired = Math.ceil(rankConfig.requiredTenureYears * 0.87); // 原0.35→减免65%削弱为减免13%
    } else if (newConsecutiveExcellentYears >= 2) {
      effectiveTenureRequired = Math.ceil(rankConfig.requiredTenureYears * 0.875); // 原0.375→减免62.5%削弱为减免12.5%
    } else {
      effectiveTenureRequired = Math.ceil(rankConfig.requiredTenureYears * 0.9); // 原0.5→减免50%削弱为减免10%
    }

    // ── 分层级 KPI 考核评估（替代单一政绩门槛） ──────────────────────────────
    // 构建当前时间点的快照（使用本轮最新累计值）
    const kpiSnapshot = {
      rankLevel:      current.rankLevel,
      popularSupport: current.popularSupport,
      securityIndex:  current.securityIndex,
      cityGdp:        cumGdp,
      cityLivelihood: cumLivel,
      cityEcology:    cumEco,
      cityBusiness:   cumBiz,
      bossFavor:      current.bossFavor,
      boss2Favor:     current.boss2Favor,
      boss3Favor:     current.boss3Favor,
      annualRankPct:  newAnnualRankPct,
      taxRevenue:     current.taxRevenue ?? 0,
      tenureYears:    newTenureYears,
      meritPoints:    cumMerit + (0), // bonusMerit 在后面计算，此处用当前值兜底
    };
    const kpiResult = computeKpi(kpiSnapshot);

    const promotionAvailable =
      current.rankLevel < 15 &&
      newTenureYears >= effectiveTenureRequired &&
      kpiResult.eligible &&
      (current.rankLevel !== 14 || (current.partyCongressVote ?? 0) >= 75);

    if (daysToAdvance >= 30) {
      await addNewCases(current.id, current.userId, newGameDays);
    }

    // 完成到期建设项目
    const doneProjects = await completeBuildProjects(current.id, newGameDays);
    let bonusMerit = 0;
    let bonusGdp = cumGdp;
    let bonusLivel = cumLivel;
    let bonusEco = cumEco;
    let bonusBiz = cumBiz;
    for (const proj of doneProjects) {
      bonusMerit += proj.meritReward;
      if (proj.effectType === 'gdp') bonusGdp = Math.min(100, bonusGdp + proj.effectValue);
      if (proj.effectType === 'livelihood') bonusLivel = Math.min(100, bonusLivel + proj.effectValue);
      if (proj.effectType === 'ecology') bonusEco = Math.min(100, bonusEco + proj.effectValue);
      if (proj.effectType === 'business') bonusBiz = Math.min(100, bonusBiz + proj.effectValue);
    }

    // 年龄更新
    const ageFromDays = Math.floor(newGameDays / 365);
    const newPlayerAge = (current.playerAge - Math.floor(current.gameDays / 365)) + ageFromDays;

    // §3.3 / §3.22  风口周期 & 派系斗争阶段自动推进
    // 每 1825 天（5 年）触发一次风口轮换；60 天预备窗进入动员期
    const WIND_OPTIONS: PoliticalWind[] = [
      'reform-heavy', 'pragmatic-heavy', 'techno-surge', 'local-crackdown', 'balanced',
    ];
    const prevCycleDay = current.lastWindCycleDay ?? 0;
    const windFields: Partial<typeof current> = {};
    const factionFields: Partial<typeof current> = {};

    // §3.7 情报自然增长：每 10 天按 techno 派关系 +relation/20
    if (newGameDays % 10 === 0) {
      const technoRel = getRelationFromSave(current).techno;
      factionFields.factionIntelligence = Math.round(Math.min(100, (current.factionIntelligence ?? 0) + technoRel / 20) * 10) / 10;
    }

    if (shouldTriggerWindCycle(newGameDays, prevCycleDay)) {
      // 选一个与当前不同的风向
      const opts = WIND_OPTIONS.filter(w => w !== current.politicalWind);
      const newWind = opts[Math.floor(Math.random() * opts.length)];
      windFields.politicalWind        = newWind;
      windFields.dominantFaction      = getDominantFaction(newWind) ?? undefined;
      windFields.lastWindCycleDay     = newGameDays;
      windFields.strugglePhase        = 'active';     // 正式进入派系斗争交战期
      windFields.factionPromotionLocked = true;       // §3.22 交战期晋升冻结

      // ══ 派系晋升联动：周期边界结算（双轨胜利）══════════════════
      // 1) 刷新棋盘（buildBoard 依当前关系确定性重算席位归属）
      const freshSeats = buildBoard(current);
      windFields.boardSeats = freshSeats;

      // 2) v4 省级席位战结算（全国棋盘：本派控制 ≥ 80% 即提前收官）
      const nationalResult = resolveNationalSeatControl(current);
      Object.assign(windFields, nationalResult.updates);
      const primaryFid = (current.primaryFaction || '') as FactionId | '';
      const nationalRatio = primaryFid ? nationalResult.control.controlRatios[primaryFid] ?? 0 : 0;
      const nationalWin = primaryFid !== '' && nationalRatio >= VICTORY_THRESHOLD;

      // 3) 结算派系整体胜负（省级席位达标优先；否则走棋盘 evaluateStruggle：过半 OR 攻克枢纽）
      const evaluation = nationalWin || evaluateStruggle(current, freshSeats).factionWin;
      if (evaluation) {
        // 派系整体胜：strugglePhase 置 truce、解除 factionPromotionLocked
        Object.assign(windFields, applyFactionWin(current));
      } else {
        // 派系整体败：玩家必受惩罚（与个人职务胜负无关）；争夺过期（本轮 expired，下一轮重选）
        Object.assign(windFields, applyFactionLossPenalty(current, newGameDays));
        Object.assign(windFields, expireContest(current, newGameDays));
      }

      // v6：周期功绩分红（按本周期赢下争夺次数 / 派系整体胜负发放，发放后清零周期计数）
      const dividend = settleCycleDividend(current, evaluation);
      Object.assign(windFields, dividend.updates);

      // §3.10 派系危机/清洗：风向反转，玩家站错队（对该派关系≥60）
      const newLosing = getLosingFaction(newWind);
      if (newLosing) {
        const rels = getRelationFromSave(current);
        if (rels[newLosing] >= 60) {
          const primary = current.primaryFaction as FactionId | null;
          const protectedNow = primary ? getRepLevel(rels[primary]) >= 4 : false;
          if (!protectedNow) {
            factionFields.purgeCount = (current.purgeCount ?? 0) + 1;
            factionFields.factionInfluence = Math.max(0, (current.factionInfluence ?? 0) - 10);
            Object.assign(factionFields, applyRelDeltaToSave(current, newLosing, -20));
            factionFields.meritPoints = Math.max(0, (current.meritPoints ?? 0) - 30);
            factionFields.bossFavor = Math.max(0, (current.bossFavor ?? 0) - 10);
          }
        }
      }
    } else if (
      isInMobilizationPeriod(newGameDays, prevCycleDay) &&
      (current.strugglePhase ?? 'idle') === 'idle'
    ) {
      windFields.strugglePhase = 'mobilize';          // 进入60天动员预备期
    } else if ((current.strugglePhase ?? 'idle') === 'truce') {
      // 休战 60 天后回归 idle，解除晋升冻结
      if (!isInMobilizationPeriod(newGameDays, prevCycleDay)) {
        windFields.strugglePhase        = 'idle';
        windFields.factionPromotionLocked = false;
      }
    }

    // ══ 派系玩法：每政治年（365 天）刷新派系委托 ════════════════
    const mandateUpdates = generateMandates(current);
    if (mandateUpdates.factionMandates) {
      factionFields.factionMandates = mandateUpdates.factionMandates;
      if (mandateUpdates.lastMandateYear !== undefined) {
        factionFields.lastMandateYear = mandateUpdates.lastMandateYear;
      }
    }

    const updated = await updateSave(current.id, {
      gameDays: newGameDays,
      tenureDays: newTenureDays,
      tenureYears: newTenureYears,
      playerAge: newPlayerAge,
      cityGdp: Math.round(bonusGdp * 10) / 10,
      cityLivelihood: Math.round(bonusLivel * 10) / 10,
      cityEcology: Math.round(bonusEco * 10) / 10,
      cityBusiness: Math.round(bonusBiz * 10) / 10,
      meritPoints: Math.round((cumMerit + bonusMerit) * 10) / 10,
      assessmentGrade,
      isPromotionAvailable: promotionAvailable,
      isEventPending: shouldTriggerEvent || current.isEventPending,
      eventsThisYear: newEventsThisYear,
      lastRankDay: newLastRankDay,
      annualRankPct: newAnnualRankPct,
      isExcellentRank: newIsExcellentRank,
      consecutiveExcellentYears: newConsecutiveExcellentYears,
      ...windFields,
      ...factionFields,
    });
    if (updated) setSave(updated);

    // 补充下属（如晋升后下属不足）
    if (updated && updated.rankLevel !== current.rankLevel) {
      const subs = await getSubordinates(updated.id);
      await supplementSubordinates(updated.id, updated.userId, updated.rankLevel, subs.length);
    }

    // 月度工作报告：每月30天触发
    const prevMonth = Math.floor(current.gameDays / 30);
    const newMonth = Math.floor(newGameDays / 30);
    if (newMonth > prevMonth && updated) {
      const reports = await generateMonthlyReports(updated.id, updated.userId, newGameDays);
      if (reports.length > 0) {
        const fresh = await getUnreadReports(updated.id);
        setUnreadReports(fresh);
      }

      // 招商局月度引进企业（若有招商局局长）
      const allSubs = await getSubordinates(updated.id);
      const investHead = allSubs.find(s => s.appointedDept === 'invest' && s.deptPosition === 'head');
      if (investHead) {
        await generateMonthlyEnterprises(updated.id, updated.userId, newGameDays, investHead.ability, updated.rankLevel);
      }

      // 税务局：计算企业月度税收，累加到资金余额
      const monthlyTax = await calcMonthlyTax(updated.id);

      // 各省财政上缴（rank14+ 国政院院理）：参考现实，全国31个省市每月向中央上缴60%
      // 各省财政规模参考实际数据：全国年财政收入约20万亿，月均约1667亿
      // 游戏中按资金单位（万元）缩放，基准值1500万/月，按城市GDP指数动态浮动
      let provincialRemittance = 0;
      if (updated.rankLevel >= 14) {
        const gdpFactor = 0.8 + (updated.cityGdp / 100) * 0.4; // 0.8~1.2
        const baseMontly = 1500 + Math.random() * 300;
        provincialRemittance = Math.round(baseMontly * gdpFactor * 0.6 * 10) / 10;
      }

      // 国家建设月度收益（rank14+）：外贸/金融/制造业综合产出，随游戏天数增长
      let nationalBuildRevenue = 0;
      if (updated.rankLevel >= 14) {
        const progressFactor = Math.min(3.0, 1 + newGameDays / 730); // 最多3倍，约2年线性增长
        nationalBuildRevenue = Math.round((800 + Math.random() * 400) * progressFactor * 10) / 10;
      }

      // 各部门正职月度自动行动
      const autoResult = await execDeptAutoActions(updated.id);

      // 上级来访考察：省级以下（rank < 9）才触发，每月15%概率，且当前无挂起考察事件
      let inspectEvent: ReturnType<typeof generateUpperInspect> | null = null;
      if (!upperInspectRef.current && updated.rankLevel < 9 && Math.random() < 0.15) {
        inspectEvent = generateUpperInspect(updated);
      }

      // 国政院部委轮换（级别12）：每365天轮换一次部委，政绩不清零继续积累
      let ministryRotate: { cityName: string; lastMinistryRotateDay: number } | null = null;
      if (updated.rankLevel === 12) {
        const lastRotate = updated.lastMinistryRotateDay ?? 0;
        if (lastRotate === 0 || newGameDays - lastRotate >= 365) {
          const newMinistry = getRandomMinistry();
          ministryRotate = { cityName: newMinistry.name, lastMinistryRotateDay: newGameDays };
          // 注意：轮换时刻意不重置 meritPoints，政绩持续积累直到晋升
        }
      }

      // 每180天触发干部交流任职事件（仅rank8，省级以上由组织部自行处理）
      const lastExchange = updated.lastExchangeDay ?? 0;
      if (updated.rankLevel === 8 && newGameDays - lastExchange >= 180 && !exchangeOfficerRef.current) {
        const officer = generateExchangeOfficer();
        setExchangeOfficer(officer);
        await updateSave(updated.id, { lastExchangeDay: newGameDays });
      }

      // 月度会议任务结算：下属完成/失败任务，产生政绩奖励
      const meetingResult = await resolveMeetingTasks(updated.id, newGameDays);

      // 政治生态月度结算：功高盖主 / 非正式关系密切 / 领导阻挠 / 越级赏识
      const eco = settlePoliticalEcology(updated, newGameDays);

      const feedbackParts: string[] = [];
      if (meetingResult.meritBonus > 0) feedbackParts.push(`📋 本月任务结算：+${meetingResult.meritBonus} 政绩`);
      if (meetingResult.failedSubIds.length > 0) feedbackParts.push(`⚠️ ${meetingResult.failedSubIds.length} 名干部未完成任务`);
      feedbackParts.push(...eco.events);
      if (feedbackParts.length > 0) setMeetingTaskFeedback(feedbackParts.join('　'));

      // 信访办：30%概率月度触发信访事件（并行，不阻塞主流程）
      // 民生人口自然增长 / 秘书能力增长（并行，不阻塞主流程）
      // 日常新系统：精力恢复（含职级加成）/ 月度健康保健 / 党校结算 / 政策到期检查（并行，不阻塞）
      void Promise.all([
        Math.random() < 0.30 ? generatePetitionEvent(updated.id, updated.userId, newGameDays) : Promise.resolve(),
        growPopulation(updated.id),
        autoGrowSecretaryAbility(updated.id),
        autoGrowSubAbility(updated.id),
        dailyEnergyRegen(updated.id, newGameDays, updated.rankLevel, updated.personalAssets ?? []),
        monthlyHealthRegen(updated.id, newGameDays, updated.rankLevel, updated.personalAssets ?? [], updated.playerAge ?? 30),
        checkPartySchoolCompletion(updated.id, newGameDays),
        checkPolicyExpiry(updated.id, newGameDays),
      ]);

      // 合并月度所有更新，单次写库 + 单次 setSave
      const base = updated;
      const meetingMeritBonus = meetingResult.meritBonus;

      // 个人薪资：每月自动发放（按职级薪资配置，含补贴）
      const monthlySalary = RANK_SALARY[base.rankLevel] ?? 5500;
      // 各类补贴（车补、通讯、餐补等）：每月到账
      const monthlyAllowance = RANK_MONTHLY_ALLOWANCE[base.rankLevel] ?? 500;
      // 公积金个人缴存（月），单位同等缴存 → 每月进账 = 个人 + 单位 = 2倍个人缴存
      const personalHpf = RANK_PERSONAL_HPF[base.rankLevel] ?? 816;
      const monthlyHpfTotal = personalHpf * 2; // 个人+单位双倍计入公积金账户
      // 股票/基金投资月收益：遍历已购置资产
      const investItems = (base.personalAssets ?? []).filter(k =>
        ['stock_small', 'stock_medium', 'fund_invest'].includes(k)
      );
      const INVEST_PRICES: Record<string, number> = { stock_small: 50000, stock_medium: 200000, fund_invest: 100000 };
      const INVEST_RATES: Record<string, number> = { stock_small: 0.08, stock_medium: 0.06, fund_invest: 0.03 };
      let investReturn = 0;
      for (const k of investItems) {
        const basePrice = INVEST_PRICES[k] ?? 0;
        const rate = INVEST_RATES[k] ?? 0;
        // 股票有随机波动，基金较稳定
        const volatility = k === 'fund_invest' ? (Math.random() * 0.5 + 0.75) : (Math.random() * 1.4 + 0.3);
        investReturn += Math.round(basePrice * rate * volatility);
      }
      // 年终奖：每年12月（game_month===12）且当年未发过（lastAnnualBonusDay在本年之前）触发
      const gameMonth = Math.floor((newGameDays % 365) / 30) + 1;
      const gameYear = Math.floor(newGameDays / 365);
      const lastBonusYear = Math.floor((base.lastAnnualBonusDay ?? 0) / 365);
      const isAnnualBonusMonth = gameMonth === 12 && gameYear > lastBonusYear;
      // 绩效系数：优秀加20%，称职基准，不合格无年终奖
      const bonusMonths = RANK_ANNUAL_BONUS_MONTHS[base.rankLevel] ?? 1.0;
      const performanceMult = base.meritPoints >= 90 ? 1.2 : base.meritPoints >= 60 ? 1.0 : 0;
      const annualBonus = isAnnualBonusMonth ? Math.round(monthlySalary * bonusMonths * performanceMult) : 0;

      // 月度到账：工资 + 补贴 + 投资收益（公积金单独累计，不计入savings）
      const totalPersonalIncome = monthlySalary + monthlyAllowance + investReturn + annualBonus;

      // 部门自动效益 fundBalance 按职级系数放大
      // DEPT_CONFIG 里财政局 15万/月、税务局 20万/月 基准适用县级(rank4-6)
      // 乡镇(rank1-3)缩小、市/省/国家级按倍率扩大，贴近现实财政规模
      const fundMultiplier = RANK_FUND_MULTIPLIER[updated.rankLevel] ?? 1;
      const scaledDeptFund = Math.round(autoResult.fundBalance * fundMultiplier * 10) / 10;

      const monthlyUpdates: Parameters<typeof updateSave>[1] = {
        lastMonthDay: newGameDays,
        lastSalaryDay: newGameDays,
        personalSavings: (base.personalSavings ?? 0) + totalPersonalIncome,
        providentFundBalance: (base.providentFundBalance ?? 0) + monthlyHpfTotal,
        ...(isAnnualBonusMonth ? { lastAnnualBonusDay: newGameDays } : {}),
        fundBalance: Math.round((base.fundBalance + monthlyTax + scaledDeptFund + provincialRemittance + nationalBuildRevenue) * 10) / 10,
        taxRevenue: Math.round(base.taxRevenue + monthlyTax + scaledDeptFund + provincialRemittance + nationalBuildRevenue),
        cityGdp:        Math.min(100, Math.max(0, base.cityGdp        + autoResult.cityGdp)),
        cityLivelihood: Math.min(100, Math.max(0, base.cityLivelihood + autoResult.cityLivelihood)),
        cityEcology:    Math.min(100, Math.max(0, base.cityEcology    + autoResult.cityEcology)),
        cityBusiness:   Math.min(100, Math.max(0, base.cityBusiness   + autoResult.cityBusiness)),
        securityIndex:  Math.min(100, Math.max(0, base.securityIndex  + autoResult.securityIndex)),
        meritPoints:    Math.max(0, Math.round((base.meritPoints + autoResult.meritPoints + (inspectEvent?.meritDelta ?? 0) + meetingMeritBonus + eco.meritDelta) * 10) / 10),
        bossFavor:      Math.min(100, Math.max(0, base.bossFavor + autoResult.bossFavor + (inspectEvent?.favorDelta ?? 0) + eco.bossFavorDelta)),
        boss2Favor:     Math.min(100, Math.max(0, base.boss2Favor + eco.boss2FavorDelta)),
        boss3Favor:     Math.min(100, Math.max(0, base.boss3Favor + eco.boss3FavorDelta)),
        popularSupport: Math.min(100, Math.max(0, base.popularSupport + eco.popularDelta)),
        prestige_flag:  eco.prestige_flag,
        clique_flag:    eco.clique_flag,
        leader_obstruct: eco.leader_obstruct,
        promotion_frozen: eco.promotion_frozen,
        promo_freeze_until_day: eco.promo_freeze_until_day,
        patron_id:      eco.patron_id,
        patron_favor:   eco.patron_favor,
        patron_expire_day: eco.patron_expire_day,
        patron_fail_months: eco.patron_fail_months,
        ...(eco.investState ? { investState: eco.investState, caseStartDay: eco.caseStartDay } : {}),
        ...(ministryRotate ? { cityName: ministryRotate.cityName, lastMinistryRotateDay: ministryRotate.lastMinistryRotateDay } : {}),
      };
      const withMonthly = await updateSave(updated.id, monthlyUpdates);
      if (withMonthly) setSave(withMonthly);
      if (inspectEvent) setUpperInspectEvent(inspectEvent);

      // 退休检查：每月结算后，检查是否达到退休年龄（尚未触发弹窗时才检测）
      if (!retirementTriggerRef.current && !renewalVoteTriggerRef.current) {
        const finalSave = withMonthly ?? updated;
        const retireStatus = checkRetirementStatus(
          finalSave.rankLevel,
          finalSave.playerAge,
          finalSave.retirementDelayYears,
        );

        if (finalSave.rankLevel === 15 && finalSave.tenureYears >= 5 && finalSave.tenureYears % 5 === 0) {
          // rank15（总执书记·华夏主席）：每届5年届满触发全国执政党代表大会/议政院续任投票
          const alreadyVotedThisTerm = (finalSave.lastPartyCongressDay ?? 0) >= (finalSave.tenureDays - 45);
          if (!alreadyVotedThisTerm) {
            const voteResult = calcRenewalVote(
              finalSave.moralValue,
              finalSave.meritPoints,
              finalSave.cityGdp,
              finalSave.bossFavor,
              finalSave.boss2Favor,
              finalSave.nationalTermsServed,
            );
            setIsRunning(false);
            setRenewalVoteTrigger({
              rankLevel: 15,
              voteRate: voteResult.voteRate,
              passed: voteResult.passed,
              termsAfter: voteResult.termsAfter,
            });
            await updateSave(finalSave.id, { lastPartyCongressDay: finalSave.tenureDays });
          }
        } else if (finalSave.rankLevel === 14 && finalSave.tenureYears >= 5 && finalSave.tenureYears % 5 === 0) {
          // rank14（国政院院理）：宪法规定连任不超过两届
          const alreadyVotedThisTerm = (finalSave.lastPartyCongressDay ?? 0) >= (finalSave.tenureDays - 45);
          if (!alreadyVotedThisTerm) {
            if (finalSave.nationalTermsServed >= 1) {
              // 已满一届，宪法硬性限制，触发强制卸任
              setIsRunning(false);
              setRetirementTrigger('mandatory');
            } else {
              // 第一届届满，触发续任投票（连任第二届）
              const voteResult = calcRenewalVote(
                finalSave.moralValue,
                finalSave.meritPoints,
                finalSave.cityGdp,
                finalSave.bossFavor,
                finalSave.boss2Favor,
                finalSave.nationalTermsServed,
              );
              setIsRunning(false);
              setRenewalVoteTrigger({
                rankLevel: 14,
                voteRate: voteResult.voteRate,
                passed: voteResult.passed,
                termsAfter: voteResult.termsAfter,
              });
              await updateSave(finalSave.id, { lastPartyCongressDay: finalSave.tenureDays });
            }
          }
        } else if (retireStatus.type === 'mandatory') {
          setIsRunning(false);
          setRetirementTrigger('mandatory');
        } else if (retireStatus.type === 'voluntary') {
          setIsRunning(false);
          setRetirementTrigger('voluntary');
        }
      }

      // ══ 三大机制月度检测 ════════════════════════════════════════
      const latestSave = withMonthly ?? updated;

      // ══ 贪腐玩法月度结算（风险衰减 / 线索产生 / 调查阶段触发）══
      if (!gameOverRef.current) {
        const risk = latestSave.riskValue ?? 0;
        const clue = latestSave.clueLevel ?? 0;
        const illegal = Number(latestSave.illegalWealth ?? 0);
        const invest = latestSave.investState ?? 'none';
        const newRisk = Math.max(0, risk - 3);
        let newClue = clue;
        let newInvest = invest;
        let newCustody = latestSave.custodyDays ?? 0;

        // 线索产生：风险≥30 时按概率生成举报信
        if (newRisk >= 30 && Math.random() < 0.35) {
          newClue = Math.min(100, newClue + 5);
        }

        // 调查阶段触发（仅在未处于审查时）
        if (invest === 'none') {
          if (newRisk >= 85 && (newClue >= 70 || illegal >= 5000000)) {
            newInvest = 'liangan';
          } else if (newRisk >= 70) {
            newInvest = 'chushi';
          } else if (newRisk >= 55 && newClue >= 40) {
            newInvest = 'fuhan';
          }
        }
        // 留置触发
        if (invest !== 'liuzhi' && (illegal >= 5000000 || (latestSave.testimonyChain ?? 0) >= 80)) {
          newInvest = 'liuzhi';
          newCustody = 90;
        }
        // 留置天数递减
        if (invest === 'liuzhi' && newCustody > 0) {
          newCustody = Math.max(0, newCustody - 30);
        }

        if (newRisk !== risk || newClue !== clue || newInvest !== invest || newCustody !== (latestSave.custodyDays ?? 0)) {
          await updateSave(latestSave.id, {
            riskValue: newRisk,
            clueLevel: newClue,
            investState: newInvest,
            custodyDays: newCustody,
          });
          Object.assign(latestSave, { riskValue: newRisk, clueLevel: newClue, investState: newInvest, custodyDays: newCustody });
        }
      }

      // ① Game Over 检测（最高优先级）
      if (!gameOverRef.current) {
        // 落马：民心值归零
        if (latestSave.moralValue <= 0) {
          setIsRunning(false);
          setGameOverTrigger('corruption');
          await updateSave(latestSave.id, { gameOverType: 'corruption' });
        }
        // 重大事故：连续失败事件 >= 3 且安全指数归零
        else if (latestSave.consecutiveFailEvents >= 3 && latestSave.securityIndex <= 0) {
          setIsRunning(false);
          setGameOverTrigger('accident');
          await updateSave(latestSave.id, { gameOverType: 'accident' });
        }
        // 政治清洗：某派系被彻底压制
        else if (
          (latestSave.reformFaction <= 0 && latestSave.pragmaticFaction >= 80) ||
          (latestSave.pragmaticFaction <= 0 && latestSave.reformFaction >= 80)
        ) {
          setIsRunning(false);
          setGameOverTrigger('purge');
          await updateSave(latestSave.id, { gameOverType: 'purge' });
        }
        // §3.16 / §4.8 落马结局：资源输送账目留痕累积（purgeCount）且民心（integrity）偏低
        else if ((latestSave.purgeCount ?? 0) >= 3 && latestSave.moralValue < 25) {
          setIsRunning(false);
          setGameOverTrigger('corruption');
          await updateSave(latestSave.id, { gameOverType: 'corruption' });
        }
      }

      // ② 纪委风险检测（未触发Game Over 且 无待处理弹窗时）
      if (!gameOverRef.current && !disciplineWarnRef.current) {
        const moral = latestSave.moralValue;
        const daysSinceWarn = newGameDays - (latestSave.lastDisciplineWarnDay ?? 0);
        const daysSinceCase = newGameDays - (latestSave.lastCaseCheckDay ?? 0);

        if (moral > 0 && moral < 15 && daysSinceCase >= 30 && Math.random() < 0.50) {
          // 立案审查
          const officer = genDisciplineOfficer();
          const event: DisciplineWarnEvent = {
            type: 'investigation',
            officerName: officer,
            meritPenalty: 40,
            moralChange: -10,
            content: `纪检监察委员会已对你的相关违纪问题展开初步调查。经组织研究决定，对你进行立案审查。请你配合调查，如实说明问题，如隐瞒情节将从重处理。`,
          };
          setIsRunning(false);
          setDisciplineWarnEvent(event);
          await updateSave(latestSave.id, { lastCaseCheckDay: newGameDays });
        } else if (moral >= 15 && moral < 30 && daysSinceWarn >= 90 && Math.random() < 0.40) {
          // 纪委约谈
          const officer = genDisciplineOfficer();
          const event: DisciplineWarnEvent = {
            type: 'warn',
            officerName: officer,
            meritPenalty: 20,
            moralChange: 5,
            content: `纪委${officer}约谈通知：经研究，决定对你进行提醒谈话。请认真对照党纪党规进行自查，提高廉洁自律意识，维护干部队伍形象。`,
          };
          setDisciplineWarnEvent(event);
          await updateSave(latestSave.id, { lastDisciplineWarnDay: newGameDays });
        }
      }

      // ③ 上司换届检测（串行，每次只换一个，避免信息轰炸）
      if (!bossChangeRef.current && !gameOverRef.current) {
        const s = latestSave;
        const rankCfg = RANK_CONFIG[s.rankLevel];
        // 检测上司1
        if (newGameDays >= (s.bossTenureStart ?? 0) + (s.bossTenureDuration ?? 1460)) {
          const newName = genBossName();
          const newFavor = 30 + Math.floor(Math.random() * 31); // 30-60
          const newDuration = 1095 + Math.floor(Math.random() * 731); // 3-5年
          setBossChangeEvent({
            bossNum: 1, oldBossName: s.bossName, newBossName: newName,
            position: rankCfg.bossTitle, newFavor,
          });
          await updateSave(s.id, {
            bossName: newName, bossFavor: newFavor,
            bossTenureStart: newGameDays, bossTenureDuration: newDuration,
          });
        }
        // 检测上司2
        else if (newGameDays >= (s.boss2TenureStart ?? 0) + (s.boss2TenureDuration ?? 1460)) {
          const newName = genBossName();
          const newFavor = 30 + Math.floor(Math.random() * 31);
          const newDuration = 1095 + Math.floor(Math.random() * 731);
          setBossChangeEvent({
            bossNum: 2, oldBossName: s.boss2Name, newBossName: newName,
            position: rankCfg.bossTitle2, newFavor,
          });
          await updateSave(s.id, {
            boss2Name: newName, boss2Favor: newFavor,
            boss2TenureStart: newGameDays, boss2TenureDuration: newDuration,
          });
        }
        // 检测上司3
        else if (newGameDays >= (s.boss3TenureStart ?? 0) + (s.boss3TenureDuration ?? 1460)) {
          const newName = genBossName();
          const newFavor = 30 + Math.floor(Math.random() * 31);
          const newDuration = 1095 + Math.floor(Math.random() * 731);
          setBossChangeEvent({
            bossNum: 3, oldBossName: s.boss3Name, newBossName: newName,
            position: rankCfg.bossTitle3, newFavor,
          });
          await updateSave(s.id, {
            boss3Name: newName, boss3Favor: newFavor,
            boss3TenureStart: newGameDays, boss3TenureDuration: newDuration,
          });
        }
      }
    }

    // 年度并行处理：报表生成 + 人事评审 + 下属晋升候选 + 下属考核 + 年初拜访
    if (newYear > prevYear && updated) {
      const savedForYear = updated;
      // 人事局年底评审提醒
      if (savedForYear.lastPersonnelYear < newYear) {
        setPersonnelReviewPending(true);
      }

      // 并行执行互不依赖的年度任务
      const [allSubsForReport] = await Promise.all([
        getSubordinates(savedForYear.id),
        runAnnualSubAssessment(savedForYear.id, newGameDays),
      ]);

      // 年度排行报表
      const totalStaff = allSubsForReport.filter(s => s.isAppointed).length;
      const annualReport = await generateAnnualRankReport(
        savedForYear.id, savedForYear.userId, newGameDays,
        {
          cityGdp: savedForYear.cityGdp,
          cityLivelihood: savedForYear.cityLivelihood,
          cityEcology: savedForYear.cityEcology,
          cityBusiness: savedForYear.cityBusiness,
          meritPoints: savedForYear.meritPoints,
          taxRevenue: savedForYear.taxRevenue,
          enterpriseCount: 0,
          totalStaff,
          eventsThisYear: 0,
          annualRankPct: savedForYear.annualRankPct,
          isExcellentRank: savedForYear.annualRankPct >= 80,
        }
      );
      if (annualReport) {
        const fresh = await getUnreadReports(savedForYear.id);
        setUnreadReports(fresh);
      }

      // 下属随机拜访（30%概率）
      if (!current.subVisitPending && Math.random() < 0.30) {
        const visit = await triggerSubVisit(savedForYear.id);
        if (visit) {
          const withVisit = await updateSave(savedForYear.id, {
            subVisitPending: true,
            subVisitSubId: visit.subId,
            subVisitSubName: visit.subName,
          });
          if (withVisit) setSave(withVisit);
        }
      }
    }

    isAdvancingRef.current = false;
  }, [computeDailyDelta, computeAnnualRank, updateGameSave, generateUpperInspect]);

  // 自动推进定时器
  useEffect(() => {
    if (isRunning) {
      timerRef.current = setInterval(() => {
        void advanceTime();
      }, 800);
    } else {
      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }
    }
    return () => {
      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }
    };
  }, [isRunning, advanceTime]);

  return (
    <GameContext.Provider value={{
      save,
      isLoading,
      timeGranularity,
      isRunning,
      annualRankNotice,
      clearAnnualRankNotice: () => setAnnualRankNotice(null),
      unreadReports,
      clearUnreadReports: () => setUnreadReports([]),
      personnelReviewPending,
      clearPersonnelReview: () => setPersonnelReviewPending(false),
      exchangeOfficer,
      clearExchangeOfficer: () => setExchangeOfficer(null),
      upperInspectEvent,
      clearUpperInspectEvent: () => setUpperInspectEvent(null),
      meetingTaskFeedback,
      clearMeetingTaskFeedback: () => setMeetingTaskFeedback(null),
      retirementTrigger,
      clearRetirementTrigger: () => setRetirementTrigger(null),
      renewalVoteTrigger,
      clearRenewalVoteTrigger: () => setRenewalVoteTrigger(null),
      bossChangeEvent,
      clearBossChangeEvent: () => setBossChangeEvent(null),
      disciplineWarnEvent,
      clearDisciplineWarnEvent: () => setDisciplineWarnEvent(null),
      gameOverTrigger,
      clearGameOverTrigger: () => setGameOverTrigger(null),
      setTimeGranularity,
      setIsRunning,
      advanceTime,
      refreshSave,
      updateGameSave,
    }}>
      {children}
    </GameContext.Provider>
  );
}

export const useGame = () => useContext(GameContext);
```
