// ════════════════════════════════════════════════════════════
// 上级与任务系统 · 统一配置表
// 所有数值、阈值、概率、档位集中于此；前端读表渲染，改参数即改数据，禁止任何硬编码。
// 依据《上级与任务系统（纯文本重写版）》文档整理。
// ════════════════════════════════════════════════════════════

import type { PlayerSave } from '@/types/game';

// ── 三级上司层级 ────────────────────────────────────────────
export interface BossLevelDef {
  level: 1 | 2 | 3;
  nameField: 'bossName' | 'boss2Name' | 'boss3Name';
  favorField: 'bossFavor' | 'boss2Favor' | 'boss3Favor';
  rankHint: string;
  altHint: string;
  desc: string;
}
export const BOSS_LEVELS: BossLevelDef[] = [
  { level: 1, nameField: 'bossName', favorField: 'bossFavor', rankHint: '直属上司', altHint: '直接管辖上司', desc: '最日常、最常互动的直接上级' },
  { level: 2, nameField: 'boss2Name', favorField: 'boss2Favor', rankHint: '分管上司', altHint: '上级主管领导', desc: '主管条线的上级领导' },
  { level: 3, nameField: 'boss3Name', favorField: 'boss3Favor', rankHint: '主要领导', altHint: '上级核心领导', desc: '本地核心一把手' },
];

// ── 上司个性风格 ────────────────────────────────────────────
export interface BossStyleDef {
  key: string;
  label: string;
  desc: string;
  tip: string;
  color: string;
}
export const BOSS_STYLES: BossStyleDef[] = [
  { key: 'result', label: '结果导向', desc: '只看成绩、重视数字、不谈虚的', tip: '汇报工作效果更佳（+40%）', color: '#C82829' },
  { key: 'relation', label: '关系优先', desc: '人情往来、广结善缘、情感投入型', tip: '请示事项效果更佳（+25%）', color: '#7B3F00' },
  { key: 'steady', label: '保守稳健', desc: '求稳为主、中规中矩、不喜冒进', tip: '各种操作效果均衡', color: '#2B4B6F' },
  { key: 'dominant', label: '强势主导', desc: '独断专行、要求服从、容不得违拗', tip: '汇报工作有效，请示事项适得其反', color: '#4A235A' },
  { key: 'expert', label: '技术专家', desc: '注重实务、依靠数据、不讲政治', tip: '汇报工作效果最佳（+60%）', color: '#1A5276' },
];

// ── 关系经营操作 ────────────────────────────────────────────
export type ActionType = 'report' | 'consult' | 'greet';
export interface BossActionDef {
  key: ActionType;
  label: string;
  energyCost: number;
  baseFavor: number;
  desc: string;
}
export const BOSS_ACTIONS: BossActionDef[] = [
  { key: 'report', label: '汇报工作', energyCost: 10, baseFavor: 5, desc: '向上司汇报近期工作进展，展示执行力与成效' },
  { key: 'consult', label: '请示事项', energyCost: 15, baseFavor: 8, desc: '就重大决策事前请示，体现对上司权威的尊重' },
  { key: 'greet', label: '节日问候', energyCost: 5, baseFavor: 3, desc: '节假日送去问候，维持日常人情关系' },
];

// ── 好感倍率表（风格 × 操作）────────────────────────────────
export const ACTION_MULTIPLIER: Record<string, Record<ActionType, number>> = {
  result: { report: 1.4, consult: 0.75, greet: 0.67 },
  relation: { report: 0.8, consult: 1.25, greet: 1.67 },
  steady: { report: 1.0, consult: 1.0, greet: 1.0 },
  dominant: { report: 1.2, consult: 0.5, greet: 0.67 },
  expert: { report: 1.6, consult: 0.75, greet: 0.33 },
};

// ── 操作约束 ────────────────────────────────────────────────
export const BOSS_CONSTRAINTS = {
  cooldownDays: 30, // 同上司 + 同操作冷却天数
  favorCap: 100, // 好感上限
};

// ── 好感度等级 ──────────────────────────────────────────────
export interface FavorLevelDef {
  min: number;
  label: string;
  color: string;
  tip: string;
}
export const FAVOR_LEVELS: FavorLevelDef[] = [
  { min: 85, label: '深度信赖', color: '#2a7a3b', tip: '晋升推荐加成最强' },
  { min: 70, label: '器重有加', color: '#2B6CB0', tip: '🔑 晋升推荐加成已激活' },
  { min: 55, label: '关系融洽', color: '#276749', tip: '📋 年度考核评优有利' },
  { min: 40, label: '正常同事', color: '#888', tip: '维持中性' },
  { min: 25, label: '态度冷淡', color: '#e67e22', tip: '需积极维护' },
  { min: 0, label: '关系紧张', color: '#C82829', tip: '⚠️ 关系恶化可能影响晋升' },
];

// ── 好感提示阈值 ────────────────────────────────────────────
export const FAVOR_HINTS = {
  recommendActive: 70, // 显示「晋升推荐加成已激活」
  assessFavor: 55, // 显示「年度考核评优有利」
  worsenWarn: 30, // 显示「关系恶化可能影响晋升」
};

// ── 任务类型 ────────────────────────────────────────────────
export const TASK_TYPES: Record<string, { label: string }> = {
  merit: { label: '政绩考核' },
  city: { label: '城市发展' },
  security: { label: '治安维稳' },
};

// ── 任务紧急度 ──────────────────────────────────────────────
export type TaskUrgency = 'normal' | 'important' | 'urgent';
export const URGENCY: Record<TaskUrgency, { label: string; color: string }> = {
  normal: { label: '普通', color: '#888' },
  important: { label: '重要', color: '#2B6CB0' },
  urgent: { label: '紧急', color: '#C82829' },
};

// ── 进度颜色阈值 ────────────────────────────────────────────
export const PROGRESS_COLOR = {
  red: 25, // 完成度 < 25% 红
  orange: 60, // 完成度 < 60% 橙
};

// ── 任务模板库（16 条）──────────────────────────────────────
export interface TaskTemplateDef {
  title: string;
  description: string;
  taskType: 'merit' | 'city' | 'security';
  category: string;
  targetValue: number;
  rewardMerit: number;
  rewardFavor: number;
  penaltyMerit: number;
  penaltyFavor: number;
  deadlineDays: number;
  urgency: TaskUrgency;
}
export const TASK_TEMPLATES: TaskTemplateDef[] = [
  { title: 'GDP增长指标完成', description: '省委年度经济工作会议要求本辖区GDP指数达到60以上。增长不达标将影响年终考核评优，请统筹安排招商引资与项目推进工作。', taskType: 'city', category: 'economic', targetValue: 60, rewardMerit: 30, rewardFavor: 15, penaltyMerit: 20, penaltyFavor: 10, deadlineDays: 365, urgency: 'normal' },
  { title: '营商环境专项提升', description: '省营商环境督导组将于近期来访，要求营商环境指数提升至65以上。请尽快落实"放管服"改革举措，减少审批环节。', taskType: 'city', category: 'economic', targetValue: 65, rewardMerit: 28, rewardFavor: 14, penaltyMerit: 18, penaltyFavor: 8, deadlineDays: 270, urgency: 'important' },
  { title: '财政收入目标', description: '年度预算编制显示财政收入缺口较大，需通过强化税收征管、规范非税收入完成财政目标。请督促财政和税务部门落实。', taskType: 'city', category: 'economic', targetValue: 58, rewardMerit: 25, rewardFavor: 12, penaltyMerit: 15, penaltyFavor: 7, deadlineDays: 365, urgency: 'normal' },
  { title: '民生满意度提升', description: '第三方机构民意调查显示民生指数偏低，位列全省后三分之一。上级明确要求限期整改，重点在教育、医疗、住房保障方面发力。', taskType: 'city', category: 'livelihood', targetValue: 60, rewardMerit: 25, rewardFavor: 12, penaltyMerit: 15, penaltyFavor: 8, deadlineDays: 365, urgency: 'normal' },
  { title: '老旧小区改造工程', description: '住建部门将城区老旧小区列为民生重点项目，要求在年底前完成改造并达到宜居标准，改善居民生活条件，提升民生满意度至62以上。', taskType: 'city', category: 'livelihood', targetValue: 62, rewardMerit: 22, rewardFavor: 10, penaltyMerit: 12, penaltyFavor: 6, deadlineDays: 300, urgency: 'important' },
  { title: '治安专项整治', description: '连续发生多起入室盗窃和街面寻衅滋事事件，群众安全感下降。上级部署专项整治，要求治安指数在90天内恢复至65以上。', taskType: 'security', category: 'security', targetValue: 65, rewardMerit: 20, rewardFavor: 10, penaltyMerit: 15, penaltyFavor: 8, deadlineDays: 90, urgency: 'urgent' },
  { title: '扫黑除恶专项行动', description: '中央部署扫黑除恶专项行动，要求各地清除黑恶势力，摧毁地下势力保护伞，治安指数需提升至68以上，并提交专项报告。', taskType: 'security', category: 'security', targetValue: 68, rewardMerit: 30, rewardFavor: 15, penaltyMerit: 25, penaltyFavor: 12, deadlineDays: 180, urgency: 'important' },
  { title: '迎接省级调研组', description: '省委调研组定于下月初莅临检查，重点考察经济发展和营商环境。请做好汇报材料准备，确保重点指标达标，营造良好接待氛围。累计政绩须达50分。', taskType: 'merit', category: 'reception', targetValue: 50, rewardMerit: 35, rewardFavor: 20, penaltyMerit: 10, penaltyFavor: 15, deadlineDays: 90, urgency: 'important' },
  { title: '全国现场会承办', description: '本辖区被确定为全国典型经验现场交流会举办地，需确保各项指标全面达标、接待工作万无一失。这是难得的亮相机会，政绩须达60分。', taskType: 'merit', category: 'reception', targetValue: 60, rewardMerit: 45, rewardFavor: 22, penaltyMerit: 20, penaltyFavor: 18, deadlineDays: 120, urgency: 'urgent' },
  { title: '重点信访积案化解', description: '信访局上报多起跨越三年以上的积案，上级已将其列为重点督查事项。要求在180天内将治安指数提升至62以上，从根源上减少信访产生。', taskType: 'security', category: 'petition', targetValue: 62, rewardMerit: 18, rewardFavor: 10, penaltyMerit: 20, penaltyFavor: 12, deadlineDays: 180, urgency: 'important' },
  { title: '负面舆情应对处置', description: '辖区一工厂排污事件被网络曝光，引发大量负面舆情，新闻媒体持续追踪。上级要求立即处置，限期治理，民生指数须恢复至58以上以平息民意。', taskType: 'city', category: 'opinion', targetValue: 58, rewardMerit: 20, rewardFavor: 12, penaltyMerit: 25, penaltyFavor: 15, deadlineDays: 60, urgency: 'urgent' },
  { title: '重点项目年底开工', description: '纳入省重点项目名单的基础设施工程须在年底前开工建设，请协调国土、住建、环保等部门加快审批，推进征地拆迁工作，确保GDP增长目标。', taskType: 'city', category: 'project', targetValue: 63, rewardMerit: 32, rewardFavor: 16, penaltyMerit: 20, penaltyFavor: 10, deadlineDays: 330, urgency: 'normal' },
  { title: '产业园区招商引资', description: '开发区管委会完成基础设施建设，现阶段核心任务是招商引资。上级要求在年内引进有效项目，推动园区GDP指数提升至65以上。', taskType: 'city', category: 'project', targetValue: 65, rewardMerit: 28, rewardFavor: 14, penaltyMerit: 15, penaltyFavor: 8, deadlineDays: 365, urgency: 'normal' },
  { title: '配合中央巡视组工作', description: '中央巡视组已进驻，要求领导干部如实提供材料并接受约谈。这是政治上的重要考验，须保持高政绩分值展示执政成效，政绩须达55分。', taskType: 'merit', category: 'inspection', targetValue: 55, rewardMerit: 40, rewardFavor: 18, penaltyMerit: 30, penaltyFavor: 20, deadlineDays: 90, urgency: 'urgent' },
  { title: '年度政绩综合考核', description: '年度领导干部综合考核即将启动，组织部门将全面评估政绩。须积累足够的政绩值（≥50）以获得优秀评级，进入晋升考察序列。', taskType: 'merit', category: 'merit', targetValue: 50, rewardMerit: 35, rewardFavor: 18, penaltyMerit: 15, penaltyFavor: 10, deadlineDays: 365, urgency: 'normal' },
  { title: '环保督察整改落实', description: '省环保督察组反馈整改意见，要求在120天内完成涉及大气、水质、土壤污染的整改任务，并提交书面整改报告。城市综合指数须提升至62。', taskType: 'city', category: 'inspection', targetValue: 62, rewardMerit: 25, rewardFavor: 13, penaltyMerit: 30, penaltyFavor: 18, deadlineDays: 120, urgency: 'urgent' },
];

// ── 任务约束 ────────────────────────────────────────────────
export const TASK_CONSTRAINTS = {
  activeLimit: 5, // 进行中任务上限
  postponeMeritCost: 10, // 减负消耗政绩
  postponeDays: 30, // 减负延期天数
  warningDays: 90, // 临近截止告警天数
};

// ── 初始任务分配（开局为三级上司各派任务）──────────────────
export const INIT_TASKS: { templateIndex: number; bossLevel: 1 | 2 | 3 }[] = [
  { templateIndex: 0, bossLevel: 1 },
  { templateIndex: 3, bossLevel: 1 },
  { templateIndex: 5, bossLevel: 2 },
  { templateIndex: 14, bossLevel: 3 },
];

// ════════════════════════════════════════════════════════════
// 纯函数（读配置派生，禁止硬编码）
// ════════════════════════════════════════════════════════════

/** 上司个性风格：由姓名哈希确定性派生（各字符 ASCII 求和取模风格数） */
export function getBossStyle(name: string): BossStyleDef {
  const sum = Array.from(name).reduce((acc, ch) => acc + ch.charCodeAt(0), 0);
  return BOSS_STYLES[sum % BOSS_STYLES.length];
}

/** 取指定层级上司信息 */
export function getBossInfo(level: number, save: PlayerSave): BossLevelDef {
  if (level === 2) return BOSS_LEVELS[1];
  if (level === 3) return BOSS_LEVELS[2];
  return BOSS_LEVELS[0];
}

/** 好感度等级映射 */
export function getFavorLevel(favor: number): FavorLevelDef {
  return FAVOR_LEVELS.find(l => favor >= l.min) ?? FAVOR_LEVELS[FAVOR_LEVELS.length - 1];
}

/** 任务进度取值（实时取玩家指标） */
export function getTaskProgress(
  taskType: string,
  title: string,
  targetValue: number,
  save: PlayerSave,
): number {
  if (taskType === 'security') return save.securityIndex;
  if (taskType === 'merit') return Math.min(targetValue, save.meritPoints);
  // city 类型按标题细分
  if (/GDP|财政|营商|园区|项目|舆情/.test(title)) return save.cityGdp;
  if (/民生|老旧/.test(title)) return save.cityLivelihood;
  return (save.cityGdp + save.cityLivelihood + save.cityBusiness) / 3;
}

/** 任务是否可交付 */
export function isTaskComplete(
  taskType: string,
  title: string,
  targetValue: number,
  save: PlayerSave,
): boolean {
  return getTaskProgress(taskType, title, targetValue, save) >= targetValue;
}

/** 进度条颜色（按完成度） */
export function progressColor(current: number, target: number): string {
  const ratio = target > 0 ? (current / target) * 100 : 0;
  if (ratio < PROGRESS_COLOR.red) return '#C82829';
  if (ratio < PROGRESS_COLOR.orange) return '#e67e22';
  return '#2a7a3b';
}

/** 最终好感增量 = 基础好感 × 风格倍率（四舍五入） */
export function computeFavorDelta(styleKey: string, actionType: ActionType, baseFavor: number): number {
  const mult = ACTION_MULTIPLIER[styleKey]?.[actionType] ?? 1;
  return Math.round(baseFavor * mult);
}