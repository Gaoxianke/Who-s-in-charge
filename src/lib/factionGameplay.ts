// 派系玩法扩展模块（§二：三类玩法 + 六限制）
// generateMandates / applyMandateComplete / applyMandateReject
// attemptCovertOp / canDefect / applyDefection
// 六条限制谓词：R1~R6
import {
  ALL_FACTIONS,
  type FactionId,
  type PlayerSave,
  type FactionMandate,
  type CovertOpRecord,
} from '@/types/game';
import {
  FACTION_RELATION_MATRIX,
  getRepLevel,
  applyRelDeltaToSave,
  getRelationFromSave,
} from '@/lib/factionSystem';
import { nanoid } from '@/lib/nanoid';

// ── 配置常量（统一导出，不在业务函数硬编码）─────────────────────
export const COVERT_MERIT_COST      = 50;    // 密谋每次花费政绩点
export const DEFECT_MERIT_COST      = 100;   // 叛逃花费政绩点
export const MANDATE_MERIT_REWARD_MIN = 25;  // 完成委托最低奖励
export const MANDATE_MERIT_REWARD_MAX = 35;  // 完成委托最高奖励
export const MANDATE_REJECT_COOLDOWN  = 90;  // 拒绝委托冷却天数
export const DEFECT_COOLDOWN_DAYS     = 365; // 叛逃冷却天数
export const EXPOSURE_CASE_THRESHOLD  = 3;   // 累计暴露次数触发立案
export const EXPOSURE_RISK_ADD        = 12;  // 暴露时风险值增加
export const EXPOSURE_RELATION_PENALTY = 8;  // 暴露时本派关系损失
export const COVERT_BASE_DISCOVERY    = 0.15; // 密谋基础暴露概率
export const DEFECT_NEW_BASE_RELATION = 40;  // 叛逃后新派基线关系
export const DEFECT_OLD_RELATION_FLOOR = 20; // 叛逃后旧派关系下限
export const DEFECT_INFLUENCE_PENALTY = 20;  // 叛逃影响力损失

// ── 任期轮岗限制（R5） ────────────────────────────────────────────
export const POSITION_TERM_LIMIT = 3; // 同职位连任超过此届数强制轮岗

// ──────────────────────────────────────────────────────────────────
// A. 派系委托
// ──────────────────────────────────────────────────────────────────

/** 按派系叙事底色的委托模板 */
const MANDATE_TEMPLATES: Record<FactionId, { title: string; desc: string; reward: FactionMandate['reward']; penalty: FactionMandate['penalty'] }[]> = {
  reform: [
    {
      title: '推进开发区改革',
      desc: '协助本派在辖区推行开发区体制改革试点，吸引外资企业落地。',
      reward: { relation: 5, influence: 8, treasury: 50, merit: 0 },
      penalty: { relation: -8 },
    },
    {
      title: '简政放权调研报告',
      desc: '撰写简政放权实施情况调研报告，为本派提供政策弹药。',
      reward: { relation: 3, influence: 5, treasury: 30, merit: 0 },
      penalty: { relation: -5 },
    },
  ],
  pragmatic: [
    {
      title: '意识形态教育专项',
      desc: '在辖区开展意识形态工作专项检查，强化党的集中统一领导。',
      reward: { relation: 6, influence: 7, treasury: 40, merit: 0 },
      penalty: { relation: -8 },
    },
    {
      title: '国企改革阻滞评估',
      desc: '评估本地国企改革中存在的"去国有化"倾向，提交本派内参。',
      reward: { relation: 4, influence: 6, treasury: 35, merit: 0 },
      penalty: { relation: -6 },
    },
  ],
  cyl: [
    {
      title: '青年干部培训营',
      desc: '组织辖区团干部参加本派主导的青年干部培训营，扩大团系基础。',
      reward: { relation: 5, influence: 6, treasury: 30, merit: 0 },
      penalty: { relation: -7 },
    },
    {
      title: '民生调研走基层',
      desc: '赴偏远乡镇走访调研，形成民生保障专项报告上报本派核心。',
      reward: { relation: 4, influence: 7, treasury: 25, merit: 0 },
      penalty: { relation: -5 },
    },
  ],
  techno: [
    {
      title: '数字政务试点',
      desc: '推动本辖区数字政务平台建设，为本派数字化治理议题提供示范。',
      reward: { relation: 5, influence: 8, treasury: 45, merit: 0 },
      penalty: { relation: -8 },
    },
    {
      title: '科创园区引进计划',
      desc: '主导引进两家以上高科技企业，完成本派产业升级战略部署。',
      reward: { relation: 6, influence: 7, treasury: 40, merit: 0 },
      penalty: { relation: -7 },
    },
  ],
  local: [
    {
      title: '土地资源协调',
      desc: '为本派关联企业协调土地指标，务必低调操作，不留书面痕迹。',
      reward: { relation: 7, influence: 6, treasury: 60, merit: 0 },
      penalty: { relation: -10 },
    },
    {
      title: '地方人事安排',
      desc: '在下一轮换届中为本派推荐人员创造有利条件，巩固地方基础。',
      reward: { relation: 5, influence: 5, treasury: 35, merit: 0 },
      penalty: { relation: -8 },
    },
  ],
};

/**
 * 生成本政治年的派系委托（每 365 天刷新 1~2 条）。
 * @returns Partial<PlayerSave> 可合并入 updateSave
 */
export function generateMandates(save: PlayerSave): Partial<PlayerSave> {
  const fid = save.primaryFaction as FactionId | '';
  if (!fid) return {};

  const currentYear = Math.floor(save.gameDays / 365);
  // 本年已生成则不重复
  if ((save.lastMandateYear ?? -1) >= currentYear) return {};

  const templates = MANDATE_TEMPLATES[fid as FactionId] ?? [];
  if (templates.length === 0) return {};

  // 生成 1~2 条（确定性：gameDays 末位奇偶决定数量）
  const count = currentYear % 2 === 0 ? 1 : 2;
  const newMandates: FactionMandate[] = [];
  for (let i = 0; i < Math.min(count, templates.length); i++) {
    const tpl = templates[i];
    newMandates.push({
      id:      nanoid(),
      faction: fid as FactionId,
      title:   tpl.title,
      desc:    tpl.desc,
      reward:  { ...tpl.reward, merit: 0 }, // merit 在完成时随机填入
      penalty: { ...tpl.penalty },
      status:  'active',
      year:    currentYear,
    });
  }

  // 保留未完成的旧委托 + 新委托（最多保留 4 条）
  const existing = (save.factionMandates ?? []).filter(m => m.status === 'active');
  const merged = [...existing, ...newMandates].slice(0, 4);

  return {
    factionMandates: merged,
    lastMandateYear: currentYear,
  };
}

/**
 * 完成委托：给本派关系/影响力/经费池/meritPoints 加成。
 * merit 奖励随机 25~35（根据 mandate id hash 确定性）
 */
export function applyMandateComplete(
  save: PlayerSave,
  mandateId: string,
): Partial<PlayerSave> {
  const mandates = save.factionMandates ?? [];
  const idx = mandates.findIndex(m => m.id === mandateId && m.status === 'active');
  if (idx < 0) return {};

  const m = mandates[idx];
  const fid = m.faction;

  // 确定性 merit 奖励
  let hash = 0;
  for (const c of mandateId) hash = ((hash << 5) - hash + c.charCodeAt(0)) >>> 0;
  const meritReward = MANDATE_MERIT_REWARD_MIN + (hash % (MANDATE_MERIT_REWARD_MAX - MANDATE_MERIT_REWARD_MIN + 1));

  // 更新委托列表
  const updated = [...mandates];
  updated[idx] = { ...m, reward: { ...m.reward, merit: meritReward }, status: 'done' };

  // 关系增量
  const relDelta = applyRelDeltaToSave(save, fid, m.reward.relation);

  // 经费池更新
  const treasury = { ...(save.factionTreasury ?? {}) } as Record<FactionId, number>;
  treasury[fid] = (treasury[fid] ?? 0) + m.reward.treasury;

  return {
    factionMandates:  updated,
    factionInfluence: Math.min(100, (save.factionInfluence ?? 0) + m.reward.influence),
    meritPoints:      Math.round((save.meritPoints ?? 0) + meritReward),
    factionTreasury:  treasury,
    ...relDelta,
  };
}

/**
 * 拒绝委托：仅关系惩罚 + 进入 90 天冷却。
 */
export function applyMandateReject(
  save: PlayerSave,
  mandateId: string,
  day: number,
): Partial<PlayerSave> {
  const mandates = save.factionMandates ?? [];
  const idx = mandates.findIndex(m => m.id === mandateId && m.status === 'active');
  if (idx < 0) return {};

  const m = mandates[idx];
  const updated = [...mandates];
  updated[idx] = { ...m, status: 'rejected' };

  const relDelta = applyRelDeltaToSave(save, m.faction, m.penalty.relation);

  return {
    factionMandates:               updated,
    mandateRejectCooldownUntilDay: day + MANDATE_REJECT_COOLDOWN,
    ...relDelta,
  };
}

// ──────────────────────────────────────────────────────────────────
// B. 密谋行动
// ──────────────────────────────────────────────────────────────────

/** 获取密谋暴露概率（isFlagged 时 ×1.5） */
function getDiscoveryProbability(save: PlayerSave): number {
  const base = COVERT_BASE_DISCOVERY + (save.covertExposedCount ?? 0) * 0.03;
  const flagged = save.isFlagged ? 1.5 : 1;
  return Math.min(0.95, base * flagged);
}

/**
 * 执行密谋行动。
 * @param type  行动类型
 * @param targetFaction 针对的目标派系
 * @param day  当前游戏天
 * @returns { updates: Partial<PlayerSave>; exposed: boolean; message: string }
 */
export function attemptCovertOp(
  save: PlayerSave,
  type: CovertOpRecord['type'],
  targetFaction: FactionId,
  day: number,
): { updates: Partial<PlayerSave>; exposed: boolean; message: string } {
  // 政绩点不足
  if ((save.meritPoints ?? 0) < COVERT_MERIT_COST) {
    return {
      updates: {},
      exposed: false,
      message: `政绩点不足（需 ${COVERT_MERIT_COST}，当前 ${save.meritPoints ?? 0}）`,
    };
  }

  const discoveryProb = getDiscoveryProbability(save);
  // 确定性伪随机（day + type hash）
  let seed = day;
  for (const c of type) seed = ((seed << 5) - seed + c.charCodeAt(0)) >>> 0;
  const rand = ((seed * 1664525 + 1013904223) >>> 0) / 0xffffffff;
  const exposed = rand < discoveryProb;

  const record: CovertOpRecord = { id: nanoid(), type, targetFaction, exposed, day };
  const baseUpdates: Partial<PlayerSave> = {
    meritPoints: Math.max(0, (save.meritPoints ?? 0) - COVERT_MERIT_COST),
  };

  if (!exposed) {
    // 成功：对目标派系施加轻微关系损伤（叙事层面）
    const relDelta = applyRelDeltaToSave(save, targetFaction, -3);
    return {
      updates: { ...baseUpdates, ...relDelta },
      exposed: false,
      message: `密谋（${type}）成功，对${targetFaction}派施加影响`,
    };
  } else {
    // 暴露处理
    const newExposed   = (save.covertExposedCount ?? 0) + 1;
    const triggerCase  = newExposed >= EXPOSURE_CASE_THRESHOLD;
    const relDelta     = applyRelDeltaToSave(save, save.primaryFaction as FactionId, -EXPOSURE_RELATION_PENALTY);

    return {
      updates: {
        ...baseUpdates,
        ...relDelta,
        riskValue:         Math.min(100, (save.riskValue ?? 0) + EXPOSURE_RISK_ADD),
        covertExposedCount: newExposed,
        isFlagged:          triggerCase ? true : save.isFlagged,
        caseStartDay:       triggerCase && !save.isFlagged ? day : save.caseStartDay,
      },
      exposed: true,
      message: triggerCase
        ? `⚠ 密谋曝光！累计暴露 ${newExposed} 次，纪委已启动立案审查`
        : `密谋暴露！风险值+${EXPOSURE_RISK_ADD}，本派关系-${EXPOSURE_RELATION_PENALTY}`,
    };
  }
}

// ──────────────────────────────────────────────────────────────────
// C. 叛逃换系
// ──────────────────────────────────────────────────────────────────

/** 叛逃前置校验，返回 null 表示可叛逃，否则返回阻止原因 */
export function canDefect(
  save: PlayerSave,
  targetFaction: FactionId,
  day: number,
): string | null {
  const currentFaction = save.primaryFaction as FactionId | '';

  // 无主派无法叛逃
  if (!currentFaction) return '尚未加入任何派系';

  // 不能叛逃到同一派
  if (currentFaction === targetFaction) return '目标派系即为当前主派';

  // R1 失势期
  if ((save.factionSetbackUntilDay ?? 0) > day) {
    const daysLeft = (save.factionSetbackUntilDay ?? 0) - day;
    return `失势期内禁止叛逃（还有 ${daysLeft} 天）`;
  }

  // 叛逃冷却
  if ((save.defectCooldownUntilDay ?? 0) > day) {
    const daysLeft = (save.defectCooldownUntilDay ?? 0) - day;
    return `叛逃冷却中（还有 ${daysLeft} 天）`;
  }

  // 立案期禁止
  if (save.isFlagged && (save.caseStartDay ?? 0) > 0) {
    return '正在接受纪委调查，禁止叛逃';
  }

  // 目标派声望需 ≥ L2
  const relations = getRelationFromSave(save);
  const targetRel = relations[targetFaction] ?? 0;
  if (getRepLevel(targetRel) < 2) {
    return `目标派声望不足（需 L2，当前 ${getRepLevel(targetRel)} 级，关系值 ${targetRel}）`;
  }

  // 不得投奔死敌（关系矩阵 <= -2）
  const matrixVal = FACTION_RELATION_MATRIX[currentFaction as FactionId]?.[targetFaction] ?? 0;
  if (matrixVal <= -2) {
    return `${currentFaction} 与 ${targetFaction} 为死敌，无法投奔`;
  }

  // 政绩点不足
  if ((save.meritPoints ?? 0) < DEFECT_MERIT_COST) {
    return `政绩点不足（需 ${DEFECT_MERIT_COST}，当前 ${save.meritPoints ?? 0}）`;
  }

  return null; // 可以叛逃
}

/**
 * 执行叛逃：旧派关系压底、新派基线设置、冷却开始。
 * @returns Partial<PlayerSave>
 */
export function applyDefection(
  save: PlayerSave,
  targetFaction: FactionId,
  day: number,
): Partial<PlayerSave> {
  const oldFaction = save.primaryFaction as FactionId;
  const relations  = getRelationFromSave(save);

  // 旧派关系压到下限 20
  const oldRelDelta = applyRelDeltaToSave(
    save,
    oldFaction,
    DEFECT_OLD_RELATION_FLOOR - (relations[oldFaction] ?? 0),
  );

  // 新派关系设为基线 40（仅提升，不降低）
  const currentTargetRel = relations[targetFaction] ?? 0;
  const newRelDelta = currentTargetRel < DEFECT_NEW_BASE_RELATION
    ? applyRelDeltaToSave(save, targetFaction, DEFECT_NEW_BASE_RELATION - currentTargetRel)
    : {};

  return {
    primaryFaction:         targetFaction,
    factionInfluence:       Math.max(0, (save.factionInfluence ?? 0) - DEFECT_INFLUENCE_PENALTY),
    meritPoints:            Math.max(0, (save.meritPoints ?? 0) - DEFECT_MERIT_COST),
    defectCooldownUntilDay: day + DEFECT_COOLDOWN_DAYS,
    factionPromotionLocked: true,           // 本周期冻结
    factionJoinedDay:       day,
    factionMandates:        [],             // 委托清零（换系后重新生成）
    lastMandateYear:        -1,
    ...oldRelDelta,
    ...newRelDelta,
  };
}

// ──────────────────────────────────────────────────────────────────
// D. 六条限制谓词（供 UI / 主循环门控）
// ──────────────────────────────────────────────────────────────────

/** R1：失势期软锁（返回 true = 当前处于失势期） */
export function isInSetback(save: PlayerSave): boolean {
  return (save.factionSetbackUntilDay ?? 0) > save.gameDays;
}

/** R2：被针对时禁止争枢纽席位（isFlagged = true 时禁争枢纽） */
export function canContestHub(save: PlayerSave): boolean {
  return !save.isFlagged;
}

/**
 * R3：声望门槛
 * - 争核心/枢纽席位需主派 L3
 * - 叛逃需目标派 L2
 */
export function meetsRepReq(save: PlayerSave, isHubContest: boolean): boolean {
  const fid = save.primaryFaction as FactionId | '';
  if (!fid) return false;
  const rel = getRelationFromSave(save)[fid as FactionId] ?? 0;
  const rep = getRepLevel(rel);
  if (isHubContest) return rep >= 3;
  return rep >= 1; // 普通席位无声望门槛
}

/**
 * R4：派系互斥班子（local + reform 不可共存）
 * 若玩家主派为 local 或 reform，进入另一方则违规。
 */
export function isExclusiveConflict(
  currentFaction: FactionId | string,
  targetFaction: FactionId,
): boolean {
  const exclusive: [FactionId, FactionId] = ['local', 'reform'];
  return (
    (currentFaction === exclusive[0] && targetFaction === exclusive[1]) ||
    (currentFaction === exclusive[1] && targetFaction === exclusive[0])
  );
}

/**
 * R5：任期轮岗（同职位连任 >= POSITION_TERM_LIMIT 届强制轮岗）
 * concurrentPosts 中包含同 key 记录数作为代理指标
 */
export function isMandatoryRotation(save: PlayerSave): boolean {
  const posts = save.concurrentPosts ?? [];
  const current = save.playerPosition ?? '';
  if (!current) return false;
  const sameCount = posts.filter(k => k === current).length;
  return sameCount >= POSITION_TERM_LIMIT;
}

/**
 * R6：暴露立案（行动效果 -50% + 降声望 + 长冷却）
 * 返回暴露立案状态下的行动效率系数（0.5 = 半效）
 */
export function getCovertEfficiency(save: PlayerSave): number {
  if (save.isFlagged && (save.caseStartDay ?? 0) > 0) return 0.5;
  return 1.0;
}

// ──────────────────────────────────────────────────────────────────
// nanoid shim（轻量 ID 生成）
// ──────────────────────────────────────────────────────────────────
