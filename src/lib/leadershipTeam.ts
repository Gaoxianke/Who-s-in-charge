// 领导班子配置——按职级分层定义班子成员职位
// 班子成员的姓名在游戏存档中动态生成并持久化

export interface TeamMember {
  position: string;   // 职位
  name: string;       // 姓名（运行时生成）
  favorability: number; // 好感度 0-100
}

export interface LeadershipConfig {
  size: number;
  positions: string[];
  levelName: string;  // 班子所属层级名称
}

// ─────────────────────────────────────────────
// 各职级班子配置（符合中国现实党政体制）
// ─────────────────────────────────────────────
const LEADERSHIP_CONFIGS: Record<string, LeadershipConfig> = {
  // 乡镇党委常委会（9人）
  town: {
    levelName: '镇党委常委会',
    size: 9,
    positions: [
      '党委书记',
      '党委副书记、镇长',
      '专职党委副书记',
      '纪委书记',
      '组织委员',
      '宣传委员',
      '政法委员',
      '武装部长',
      '议政院主席',
    ],
  },
  // 县委常委会（11人）
  county: {
    levelName: '县委常委会',
    size: 11,
    positions: [
      '县委书记',
      '县委副书记、县长',
      '专职县委副书记',
      '县纪委书记',
      '县委组织部长',
      '县委宣传部长',
      '县委政法委书记',
      '县人武部部长',
      '常务副县长（县委常委）',
      '县委统战部长',
      '议政院主任',
    ],
  },
  // 市委常委会（13人）
  city: {
    levelName: '市委常委会',
    size: 13,
    positions: [
      '市委书记',
      '市委副书记、市长',
      '专职市委副书记',
      '市纪委书记',
      '市委组织部长',
      '市委宣传部长',
      '市委政法委书记',
      '常务副市长（市委常委）',
      '市委统战部长',
      '市人武部政委',
      '市委秘书长',
      '市委副书记（专职）',
      '议政院常委会主任',
    ],
  },
  // 省委常委会（13人）
  province: {
    levelName: '省委常委会',
    size: 13,
    positions: [
      '省委书记',
      '省委副书记、省长',
      '专职省委副书记',
      '省纪委书记',
      '省委组织部长',
      '省委宣传部长',
      '省委政法委书记',
      '常务副省长（省委常委）',
      '省委统战部长',
      '省委秘书长',
      '省军区政委',
      '省委副书记',
      '议政院常委会主任',
    ],
  },
  // 部党委常委会（9人）
  ministry: {
    levelName: '部党委常委会',
    size: 9,
    positions: [
      '部党委书记（部长）',
      '部党委副书记（常务副部长）',
      '副部长（党委委员）',
      '副部长（党委委员）',
      '纪检组长',
      '部长助理（党委委员）',
      '机关党委书记（党委委员）',
      '总工程师（党委委员）',
      '政策研究室主任（党委委员）',
    ],
  },
  // 中枢决策常委会（7人）
  national: {
    levelName: '中枢决策常委会',
    size: 7,
    positions: [
      '常委（总执书记）',
      '常委（国政院院理）',
      '常委（全国议政院常委会议政委员长）',
      '常委（全国参政院主席）',
      '常委（中枢纪委书记）',
      '常委（国政院常务副院理）',
      '常委（中枢书记处书记）',
    ],
  },
};

/** 根据职级数值返回班子配置 */
export function getLeadershipConfig(rankLevel: number): LeadershipConfig {
  if (rankLevel <= 3) return LEADERSHIP_CONFIGS.town;
  if (rankLevel <= 6) return LEADERSHIP_CONFIGS.county;
  if (rankLevel <= 9) return LEADERSHIP_CONFIGS.city;
  if (rankLevel <= 11) return LEADERSHIP_CONFIGS.province;
  if (rankLevel <= 13) return LEADERSHIP_CONFIGS.ministry;
  return LEADERSHIP_CONFIGS.national;
}

// ─────────────────────────────────────────────
// 姓名生成工具
// ─────────────────────────────────────────────
import { ensureNpcNamePoolLoaded, pickNpcName } from '@/lib/npcNamePool';

/** 生成一套完整的领导班子成员列表（玩家本人占第一位，其余为AI成员） */
export async function generateTeamMembers(rankLevel: number, playerName: string, playerPosition?: string): Promise<TeamMember[]> {
  await ensureNpcNamePoolLoaded();
  const config = getLeadershipConfig(rankLevel);
  const members: TeamMember[] = [];
  const usedNames: string[] = [playerName];

  for (let i = 0; i < config.size; i++) {
    if (i === 0) {
      // 第一位是玩家自己：优先使用传入的 playerPosition（当前实际职位），否则取班子第一职位
      members.push({
        position: playerPosition || config.positions[0],
        name: playerName,
        favorability: 100, // 玩家自己好感度固定100（不参与AI投票）
      });
    } else {
      const name = pickNpcName(usedNames);
      usedNames.push(name);
      members.push({
        position: config.positions[i] ?? `委员${i}`,
        name,
        favorability: 40 + Math.floor(Math.random() * 31), // 40-70随机好感度
      });
    }
  }
  return members;
}

// ─────────────────────────────────────────────
// AI 投票逻辑
// ─────────────────────────────────────────────
export type VoteResult = 'support' | 'oppose' | 'abstain';

/**
 * 根据好感度计算 AI 成员的投票结果
 * 好感度≥70：大概率支持（80%支持，15%弃权，5%反对）
 * 好感度40-69：中性判断（50%支持，30%弃权，20%反对）
 * 好感度<40：大概率反对（15%支持，15%弃权，70%反对）
 */
export function calcAiVote(favorability: number): VoteResult {
  const r = Math.random();
  if (favorability >= 70) {
    if (r < 0.80) return 'support';
    if (r < 0.95) return 'abstain';
    return 'oppose';
  }
  if (favorability >= 40) {
    if (r < 0.50) return 'support';
    if (r < 0.80) return 'abstain';
    return 'oppose';
  }
  if (r < 0.15) return 'support';
  if (r < 0.30) return 'abstain';
  return 'oppose';
}

/**
 * 计算投票通过后的效果倍率
 * 全票通过（100%支持）：1.2×
 * 绝对多数（≥80%）：1.1×
 * 简单多数（50-79%）：1.0×
 * 勉强过半（刚好过半，<55%）：0.9×
 * 未通过：0（否决，返回 null 表示使用否决逻辑）
 */
export function calcVoteMultiplier(supportCount: number, total: number): number | null {
  const ratio = supportCount / total;
  if (ratio < 0.5) return null; // 否决
  if (ratio === 1.0) return 1.2;
  if (ratio >= 0.8) return 1.1;
  if (ratio >= 0.55) return 1.0;
  return 0.9; // 勉强过半
}
