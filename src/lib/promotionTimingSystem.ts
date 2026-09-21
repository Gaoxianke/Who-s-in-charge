// 晋升时机系统 v1.0
// 窗口期（3-5月春季 / 9-11月秋季）/ 外部环境因子（政治风向·经济周期·突发事件·高层空缺·派系斗争结果）
// 时机主动创造：造势 / 等待 / 紧急提拔（火线提拔）
import type { PlayerSave } from '@/types/game';
import { getTierOf } from '@/lib/promotionEngine';

/** 窗口期定义：每年 3-5 月（春季干部调整）、9-11 月（秋季干部调整） */
export const PROMOTION_WINDOWS = [
  { label: '春季干部调整', startMonth: 3, endMonth: 5 },
  { label: '秋季干部调整', startMonth: 9, endMonth: 11 },
];

/** 时机因子类型 */
export type TimingFactorType = 'wind' | 'economy' | 'incident' | 'vacancy' | 'faction';

/** 时机分析因子 */
export interface TimingFactor {
  type: TimingFactorType;
  label: string;
  delta: number;   // 成功率增减（百分数）
  detail: string;
}

/** 时机分析报告 */
export interface TimingReport {
  isWindowOpen: boolean;        // 当前是否处于窗口期
  windowLabel: string | null;   // 当前/最近窗口名称
  windowOpenDay: number | null; // 窗口开启的 gameDay
  windowCloseDay: number | null;
  daysToWindow: number | null;  // 距下一窗口天数
  factors: TimingFactor[];      // 环境因子
  score: number;                // 综合时机评分（0-100，含窗口加成）
  scoreLabel: string;           // 天时/地利/人和 标签
  momentum: boolean;            // 是否已造势
}

/** 玩家的等待（耐心积累）状态 */
export interface WaitingState {
  startedDay: number;    // 开始等待的游戏天
  accumulatedDays: number; // 已积累天数
  bonus: number;         // 下次竞争评分加成（最多+5）
}

/** 判断当前是否为晋升窗口期 */
export function getPromotionWindow(gameDays: number): {
  isOpen: boolean;
  label: string | null;
  openDay: number | null;
  closeDay: number | null;
  daysToOpen: number | null;
} {
  const dayOfYear = gameDays % 365;
  const currentMonth = Math.floor(dayOfYear / 30) + 1;

  for (const w of PROMOTION_WINDOWS) {
    if (currentMonth >= w.startMonth && currentMonth <= w.endMonth) {
      const openDay = ((w.startMonth - 1) * 30) + (gameDays - dayOfYear);
      const closeDay = ((w.endMonth) * 30) + (gameDays - dayOfYear);
      return { isOpen: true, label: w.label, openDay, closeDay, daysToOpen: 0 };
    }
  }
  // 距下一窗口
  const next = PROMOTION_WINDOWS.find(w => w.startMonth > currentMonth) ?? PROMOTION_WINDOWS[0];
  const daysToOpen = next.startMonth > currentMonth
    ? ((next.startMonth - 1) * 30) - dayOfYear
    : (365 - dayOfYear) + ((next.startMonth - 1) * 30);
  return { isOpen: false, label: next.label, openDay: null, closeDay: null, daysToOpen: Math.max(1, daysToOpen) };
}

/** 计算外部环境因子（读取游戏内政治风向/经济/事件/派系状态生成） */
export function computeTimingFactors(save: PlayerSave, gameDays: number): TimingFactor[] {
  const factors: TimingFactor[] = [];
  const primary = (save.primaryFaction as string) || '';
  const wind = save.politicalWind ?? 'balanced';

  // 1. 政治风向：改革派当政 → 改革派玩家+15%，保守派-10%（reform-heavy 表示改革势力当政）
  if (wind === 'reform-heavy' || (save.reformFaction ?? 50) >= 65) {
    const isReform = primary === 'reform';
    factors.push({
      type: 'wind',
      label: '政治风向',
      delta: isReform ? 15 : -10,
      detail: isReform
        ? '改革派当政，与你立场一致，晋升环境有利'
        : '改革派当政，你所属派系处于守势',
    });
  } else if (wind === 'pragmatic-heavy' || (save.pragmaticFaction ?? 50) >= 65) {
    factors.push({
      type: 'wind',
      label: '政治风向',
      delta: primary === 'pragmatic' ? 15 : -5,
      detail: '务实派当政，务实派成员晋升顺畅，其余派系受压制',
    });
  } else if ((save.cylRelation ?? 0) >= 65) {
    factors.push({
      type: 'wind',
      label: '政治风向',
      delta: 5,
      detail: '高层对你所在系统有明显倾斜',
    });
  }

  // 2. 高层空缺：正部级岗位出现空缺 → 通道放宽 +10%
  const consecutiveExcellent = save.consecutiveExcellentYears ?? 0;
  if (save.rankLevel >= 9 && consecutiveExcellent >= 2) {
    factors.push({
      type: 'vacancy',
      label: '高层空缺',
      delta: 10,
      detail: '近期中央/省级有岗位调整，晋升通道临时放宽',
    });
  }

  // 3. 派系斗争结果：本派胜利 → 顺风+20%，失败 → 逆风-20%
  // strugglePhase: idle/mobilize/active/truce（truce 表示交战结束，胜负看 factionSetbackUntilDay 是否被惩罚）
  const struggle = save.strugglePhase ?? 'idle';
  if (struggle === 'truce' && !(save.factionSetbackUntilDay && gameDays <= save.factionSetbackUntilDay)) {
    const winBuff = Math.max(0, (save.factionInfluence ?? 50) - 50) >= 10;
    factors.push({
      type: 'faction',
      label: '派系战果',
      delta: winBuff ? 20 : 10,
      detail: winBuff
        ? '派系斗争告捷，全体成员处在"顺风"期'
        : '派系斗争平息，你所在派系已重回正轨',
    });
  } else if (save.factionSetbackUntilDay && gameDays <= save.factionSetbackUntilDay) {
    factors.push({
      type: 'faction',
      label: '派系失利',
      delta: -20,
      detail: '派系斗争失利，当前处于"逆风"期',
    });
  }

  // 4. 突发事件：地方重大事故 → 冻结90天（detect from lastConfrontationDay / 简化：纪委立案）
  if (save.isFlagged) {
    factors.push({
      type: 'incident',
      label: '立案调查',
      delta: -100,
      detail: '正在接受组织调查，晋升通道完全关闭',
    });
  } else if (save.promotion_frozen) {
    factors.push({
      type: 'incident',
      label: '晋升冻结',
      delta: -100,
      detail: '存在冻结事由，暂不可发起晋升',
    });
  }

  // 5. 经济周期：与城市指标联动（民生/经济下行 → 财政岗位难度+20%）
  const business = save.cityBusiness ?? 50;
  const livel = save.cityLivelihood ?? 50;
  if (business < 35 || livel < 35) {
    factors.push({
      type: 'economy',
      label: '经济下行',
      delta: -20,
      detail: business < 35
        ? '辖区营商环境恶化，财政类岗位晋升难度加大'
        : '辖区民生指标低迷，群众口碑受损',
    });
  } else if (business >= 75 && livel >= 75) {
    factors.push({
      type: 'economy',
      label: '经济上行',
      delta: 10,
      detail: '辖区经济民生双优，属于政绩亮点期',
    });
  }

  return factors;
}

/** 综合时机评分与报告 */
export function buildTimingReport(save: PlayerSave, gameDays: number, momentum: boolean): TimingReport {
  const win = getPromotionWindow(gameDays);
  const factors = computeTimingFactors(save, gameDays);

  // 硬阻断因子优先
  const blocking = factors.filter(f => f.delta <= -100);
  let score = win.isOpen ? 60 : 30; // 基础分：窗口内 60，窗口外 30
  if (blocking.length > 0) {
    score = 0;
  } else {
    for (const f of factors) {
      if (f.delta === -100) continue;
      score += f.delta / 2; // 因子按一半折算进 0-100 分
    }
    if (momentum) score += 10;
    if (win.isOpen) score += 10;
  }
  score = Math.max(0, Math.min(100, Math.round(score)));

  // 天时/地利/人和 标签
  const scoreLabel = blocking.length > 0
    ? '时机极差（存在阻断因素）'
    : score >= 70 ? '天时地利人和' : score >= 50 ? '时机良好' : score >= 30 ? '时机一般' : '时机不利';

  return {
    isWindowOpen: win.isOpen,
    windowLabel: win.label,
    windowOpenDay: win.openDay,
    windowCloseDay: win.closeDay,
    daysToWindow: win.daysToOpen,
    factors,
    score,
    scoreLabel,
    momentum,
  };
}

/** 造势：消耗 50 万资金 + 100 声望（publicity）→ momentumActive=true */
export function applyMomentum(save: PlayerSave): { ok: boolean; msg: string; updates: Partial<PlayerSave> } {
  const needSilver = 50;
  const needPublicity = 100;
  if ((save.silver ?? 0) < needSilver) return { ok: false, msg: `资金不足：造势需 ${needSilver} 万（当前 ${save.silver ?? 0} 万）`, updates: {} };
  if ((save.reputation?.publicity ?? 50) < needPublicity) return { ok: false, msg: `声望不足：造势需 ${needPublicity} 舆论声望（当前 ${save.reputation?.publicity ?? 50}）`, updates: {} };
  const rep = save.reputation ? { ...save.reputation, publicity: save.reputation.publicity - needPublicity } : undefined;
  return {
    ok: true,
    msg: '已启动舆论造势：下一步晋升窗口成功率 +10%',
    updates: {
      silver: (save.silver ?? 0) - needSilver,
      ...(rep ? { reputation: rep } : {}),
      momentumActive: true,
    },
  };
}

/** 等待：主动放弃本窗口，功绩-5% 并积累耐心（下次竞争评分+5） */
export function startWaiting(save: PlayerSave, gameDays: number): { waitingState: WaitingState; meritPenalty: number } {
  const meritPenalty = Math.round((save.meritPoints ?? 0) * 0.05);
  return {
    waitingState: {
      startedDay: gameDays,
      accumulatedDays: 0,
      bonus: 5,
    },
    meritPenalty,
  };
}

/** 每日积累等待（每 30 天 +1 加成，最高 +5） */
export function accumulateWaiting(w: WaitingState, gameDays: number): WaitingState {
  const days = gameDays - w.startedDay;
  return {
    ...w,
    accumulatedDays: days,
    bonus: Math.min(5, 5 + Math.floor(days / 30) * 1),
  };
}

/** 紧急提拔（火线提拔）：跳过窗口限制，获得"根基不稳"debuff（90 天冻结） */
export function applyEmergencyPromotion(save: PlayerSave): { ok: boolean; msg: string; updates: Partial<PlayerSave> } {
  if (save.rankLevel >= 15) return { ok: false, msg: '已至最高职级，无法再提拔', updates: {} };
  return {
    ok: true,
    msg: '🔥 火线提拔批准：跳过窗口期限制直接晋升（获得"根基不稳"debuff：上任后 90 天内晋升冻结）',
    updates: {
      firePromotionDebuffDays: 90,
    },
  };
}

/** 便捷：当前是否处于窗口期（供 UI/逻辑直接判断） */
export function isInPromotionWindow(gameDays: number): boolean {
  return getPromotionWindow(gameDays).isOpen;
}

export { getTierOf as _timingGetTierOf };