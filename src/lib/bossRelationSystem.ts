// 上级关系网系统 v1.0
// 将"三位上司好感度"升级为"资源交换网络"
// 每位上司有：诉求、困境、立场、主动行为

import type { PlayerSave } from '@/types/game';
import type { ReputationState } from '@/lib/reputationSystem';

/** 上司的政治立场 */
export type BossStance = 'reform' | 'conservative' | 'neutral';

/** 上司的核心诉求类型 */
export type BossAspiration = 'promotion' | 'safe_retirement' | 'faction_expansion' | 'wealth' | 'legacy';

/** 上司档案 */
export interface BossProfile {
  id: string;
  name: string;
  title: string;
  stance: BossStance;
  aspiration: BossAspiration;
  favor: number;        // 0-100 好感度
  loyalty: number;      // 0-100 忠诚度（对派系）
  power: number;        // 0-100 权力值（影响评审权重）
  // 动态状态
  personalDilemma: string | null;  // 当前个人困境
  dilemmaResolved: boolean;
  lastActiveDay: number;            // 上次主动行为的天数
}

/** 关系维护方式 */
export interface RelationAction {
  id: string;
  label: string;
  description: string;
  cost: { merit?: number; network?: number; fund?: number };
  effect: { favorDelta: number; riskValue?: number; reputationDelta?: Partial<ReputationState> };
  cooldownDays: number;
}

/** 三上司的默认档案（根据职级段动态生成） */
export function generateBossProfiles(rankLevel: number, gameDays: number): BossProfile[] {
  const tier = rankLevel <= 3 ? 1 : rankLevel <= 6 ? 2 : rankLevel <= 9 ? 3 : rankLevel <= 11 ? 4 : 5;

  const bossTitles: Record<number, [string, string, string]> = {
    1: ['乡镇党委书记', '乡镇长', '县委组织部长'],
    2: ['县委书记', '县长', '市委组织部长'],
    3: ['市委书记', '市长', '省委组织部长'],
    4: ['省委书记', '省长', '中央组织部长'],
    5: ['中央政治局常委', '国务院总理', '中央纪委书记'],
  };

  const titles = bossTitles[tier] ?? bossTitles[1];
  const names = ['王建国', '李明华', '张伟强'];
  const stances: BossStance[] = ['reform', 'conservative', 'neutral'];
  const aspirations: BossAspiration[] = ['promotion', 'safe_retirement', 'faction_expansion'];

  return titles.map((title, i) => ({
    id: `boss_${i + 1}`,
    name: names[i],
    title,
    stance: stances[i],
    aspiration: aspirations[i],
    favor: 55,          // 初始好感略高于旧版50
    loyalty: 60,
    power: 70 - i * 10, // boss1权力最高
    personalDilemma: null,
    dilemmaResolved: false,
    lastActiveDay: gameDays,
  }));
}

/** 关系维护行动清单 */
export const RELATION_ACTIONS: RelationAction[] = [
  {
    id: 'merit_bundle',
    label: '政绩捆绑',
    description: '完成上司分管领域的KPI，获得背书',
    cost: { merit: 20 },
    effect: { favorDelta: 15, reputationDelta: { merit: 2 } },
    cooldownDays: 30,
  },
  {
    id: 'personal_help',
    label: '私人帮助',
    description: '解决上司的个人困境（如子女入学、医疗等）',
    cost: { network: 15, fund: 10 },
    effect: { favorDelta: 20, riskValue: 5 },
    cooldownDays: 60,
  },
  {
    id: 'intel_exchange',
    label: '情报交换',
    description: '向上司提供政敌把柄，换取暗中相助',
    cost: { network: 10 },
    effect: { favorDelta: 10, reputationDelta: { network: 3 } },
    cooldownDays: 45,
  },
  {
    id: 'interest_transfer',
    label: '利益输送',
    description: '高风险高回报的利益交换',
    cost: { fund: 50 },
    effect: { favorDelta: 25, riskValue: 20 },
    cooldownDays: 90,
  },
];

/** 上司主动行为判定（接受 PlayerSave 中的宽松 bossProfiles 结构与 BossProfile） */
export function checkBossInitiative(
  boss: Pick<BossProfile, 'id' | 'name' | 'title' | 'favor' | 'power' | 'lastActiveDay'> & { stance?: BossProfile['stance'] | string },
  playerRep: ReputationState,
  gameDays: number,
): string | null {
  // 每月最多一次主动行为
  if (gameDays - boss.lastActiveDay < 30) return null;

  // 好感≥70：主动提点
  if (boss.favor >= 70 && Math.random() < 0.3) {
    return `【提点】${boss.name}提醒你："该注意XX方面的准备了"`;
  }

  // 好感<40：主动打压
  if (boss.favor < 40 && Math.random() < 0.4) {
    return `【打压】${boss.name}向组织部门递交了"该同志尚需锻炼"的评语`;
  }

  // 派系斗争期间：要求站位
  if ((playerRep.faction ?? 0) > 60 && boss.stance !== 'neutral' && boss.stance !== undefined && Math.random() < 0.2) {
    return `【动员】${boss.name}要求你在即将到来的派系斗争中明确站位`;
  }

  // 退休前：传帮带
  if (boss.power < 30 && Math.random() < 0.15) {
    return `【传承】${boss.name}准备退休，愿意传授你"${boss.title}"的岗位秘籍`;
  }

  return null;
}

/** 三角博弈：三上司之间的关系矩阵 */
export const BOSS_RELATION_MATRIX: Record<string, Record<string, number>> = {
  boss_1: { boss_2: +5, boss_3: -10 },  // boss1和boss2盟友，和boss3政敌
  boss_2: { boss_1: +5, boss_3: -5 },  // boss2和boss1盟友，和boss3微妙
  boss_3: { boss_1: -10, boss_2: -5 }, // boss3和两者都敌对
};

/** 晋升推荐制：需要几位上司的推荐信 */
export function checkPromotionRecommendations(bosses: BossProfile[], rankLevel: number): {
  canPromote: boolean;
  missing: number;
  recommendations: string[];
} {
  // 副处级以上(rank≥4)需要至少2位上司推荐
  if (rankLevel < 4) {
    return { canPromote: true, missing: 0, recommendations: [] };
  }

  const recommendations = bosses.filter(b => b.favor >= 60).map(b => b.name);
  const canPromote = recommendations.length >= 2;

  return {
    canPromote,
    missing: Math.max(0, 2 - recommendations.length),
    recommendations,
  };
}

/** 述职评委团权重：三上司占60% */
export function computeBossJudgementWeight(bosses: BossProfile[]): number {
  const totalPower = bosses.reduce((sum, b) => sum + b.power, 0);
  const avgPower = totalPower / 3;
  return Math.min(0.6, avgPower / 100); // 最高60%
}
