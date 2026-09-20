// 秘书处页面 — 按职级配备对应办公室人员，全层级开放，功能随职级差异化
import React, { useCallback, useState } from 'react';
import { View, Text, ScrollView, Pressable, TextInput, ActivityIndicator, FlatList } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useFocusEffect, useRouter } from 'expo-router';
import { useGame } from '@/ctx/GameContext';
import { getOrCreateSecretary, doDocwork, updateSecretarySchedule, getSubordinates, getAllReports, appointSubordinate, appointSubAsSecretary, recallSecretary, assignLeadershipRole, assessSubordinate } from '@/db/gameApi';
import type { Secretary, Subordinate, MonthlyReport } from '@/types/game';
import { gameDaysToDate, getDeptNameByRank, DEPT_CONFIG, LEADERSHIP_ROLES } from '@/types/game';
import type { DeptKey } from '@/types/game';

type Tab = 'main' | 'appoint' | 'todo' | 'report' | 'draft' | 'apply' | 'recommend' | 'transfer' | 'guard';

// ── 秘书处职位体系（全层级，参照现实） ─────────────────────────────────
interface SecretaryConfig {
  title: string;           // 秘书/办公室主任头衔
  officeTitle: string;     // 办公室名称
  subTitle: string;        // 秘书职级说明
  abilityMax: number;      // 能力值上限
  docworkGainBonus: number;
  features: string[];      // 解锁功能
  badge: string;
  canRecommend: boolean;   // 是否可推荐干部任职
  canIntelligence: boolean;// 是否可收集情报
  canCounsel: boolean;     // 是否可决策参谋
}

// 参照现实：镇长（rank1-2）无专属秘书；正科级镇长（rank3）可配党政办主任兼助；县级（rank4+）起才有专属秘书
// rank1-2无秘书，在页面层拦截不进入此配置
const SECRETARY_CONFIG: Record<number, SecretaryConfig> = {
  3:  {
    title: '党政办主任', officeTitle: '党政综合办公室', subTitle: '（正科级，兼任）',
    abilityMax: 70, docworkGainBonus: 1, badge: '基层',
    features: ['公文处理', '日程安排'],
    canRecommend: false, canIntelligence: false, canCounsel: false,
  },
  4:  {
    title: '县委办秘书', officeTitle: '县委办公室', subTitle: '（副科级）',
    abilityMax: 74, docworkGainBonus: 2, badge: '初级',
    features: ['公文处理', '日程安排', '起草文件'],
    canRecommend: false, canIntelligence: false, canCounsel: false,
  },
  5:  {
    title: '县委办主任秘书', officeTitle: '县委办公室', subTitle: '（正科级）',
    abilityMax: 78, docworkGainBonus: 3, badge: '初级',
    features: ['公文处理', '日程安排', '起草文件', '辅助申请'],
    canRecommend: true, canIntelligence: false, canCounsel: false,
  },
  6:  {
    title: '县委办主任', officeTitle: '县委办公室', subTitle: '（正科级）',
    abilityMax: 80, docworkGainBonus: 4, badge: '初级',
    features: ['公文处理', '日程安排', '起草文件', '辅助申请', '情报汇报'],
    canRecommend: true, canIntelligence: true, canCounsel: false,
  },
  7:  {
    title: '市委办副主任秘书', officeTitle: '市委办公室', subTitle: '（副处级）',
    abilityMax: 82, docworkGainBonus: 6, badge: '中级',
    features: ['公文处理', '日程安排', '起草文件', '辅助申请', '情报汇报', '干部协调'],
    canRecommend: true, canIntelligence: true, canCounsel: false,
  },
  8:  {
    title: '市委办主任', officeTitle: '市委办公室', subTitle: '（正处级）',
    abilityMax: 85, docworkGainBonus: 8, badge: '中级',
    features: ['公文处理', '日程安排', '起草文件', '辅助申请', '情报汇报', '干部协调', '接待安排', '决策参谋'],
    canRecommend: true, canIntelligence: true, canCounsel: true,
  },
  9:  {
    title: '市委秘书长', officeTitle: '市委办公室', subTitle: '（正处/副厅级）',
    abilityMax: 87, docworkGainBonus: 10, badge: '高级',
    features: ['公文处理', '日程安排', '起草文件', '辅助申请', '情报汇报', '干部协调', '接待安排', '决策参谋'],
    canRecommend: true, canIntelligence: true, canCounsel: true,
  },
  10: {
    title: '省委办公厅副主任', officeTitle: '省委办公厅', subTitle: '（副厅级）',
    abilityMax: 89, docworkGainBonus: 12, badge: '高级',
    features: ['公文处理', '日程安排', '起草文件', '辅助申请', '情报汇报', '干部协调', '接待安排', '决策参谋', '省级协调'],
    canRecommend: true, canIntelligence: true, canCounsel: true,
  },
  11: {
    title: '省委秘书长', officeTitle: '省委办公厅', subTitle: '（正厅级）',
    abilityMax: 92, docworkGainBonus: 14, badge: '高级',
    features: ['公文处理', '日程安排', '起草文件', '辅助申请', '情报汇报', '干部协调', '接待安排', '决策参谋', '省级协调'],
    canRecommend: true, canIntelligence: true, canCounsel: true,
  },
  12: {
    title: '国政院部委秘书长', officeTitle: '国政院办公厅', subTitle: '（副部级）',
    abilityMax: 94, docworkGainBonus: 16, badge: '核心',
    features: ['公文处理', '日程安排', '起草文件', '辅助申请', '情报汇报', '干部协调', '接待安排', '决策参谋', '国政院协调'],
    canRecommend: true, canIntelligence: true, canCounsel: true,
  },
  13: {
    title: '中枢办公厅副主任', officeTitle: '中枢办公厅', subTitle: '（正部级）',
    abilityMax: 97, docworkGainBonus: 18, badge: '核心',
    features: ['公文处理', '日程安排', '起草文件', '辅助申请', '情报汇报', '干部协调', '接待安排', '决策参谋', '政治局联络'],
    canRecommend: true, canIntelligence: true, canCounsel: true,
  },
  14: {
    title: '中枢办公厅主任', officeTitle: '中枢办公厅', subTitle: '（正国级）',
    abilityMax: 100, docworkGainBonus: 20, badge: '最高',
    features: ['全权代理', '日程安排', '起草文件', '辅助申请', '情报汇报', '干部协调', '接待安排', '决策参谋', '最高级情报'],
    canRecommend: true, canIntelligence: true, canCounsel: true,
  },
};

function getSecretaryConfig(rankLevel: number): SecretaryConfig {
  const levels = Object.keys(SECRETARY_CONFIG).map(Number).sort((a, b) => a - b);
  let cfg = SECRETARY_CONFIG[levels[0]]; // rank3兜底
  for (const lv of levels) {
    if (rankLevel >= lv) cfg = SECRETARY_CONFIG[lv];
  }
  return cfg;
}

// ── 干部推荐任职：可推荐到哪些职位 ───────────────────────────────────────
// 玩家通过秘书协调，将下属推荐到适合职位（相当于组织部协调）
const RECOMMEND_POSITIONS: { label: string; pos: 'head' | 'deputy' | 'staff'; desc: string }[] = [
  { label: '推荐为正职（局长/主任）', pos: 'head',   desc: '担任该部门主要负责人，需能力70+' },
  { label: '推荐为副职（副局长）',   pos: 'deputy', desc: '担任该部门副职，需能力55+' },
  { label: '推荐为科员（工作人员）', pos: 'staff',  desc: '安排具体工作岗位，无能力门槛' },
];

const TALK_TOPICS = [
  { icon: '📋', label: '工作汇报', desc: '询问近期工作进展，了解下属动态', loyaltyDelta: +2 },
  { icon: '⚠️', label: '批评告诫', desc: '就失职行为进行批评教育', loyaltyDelta: -5 },
  { icon: '🤝', label: '关怀慰问', desc: '嘘寒问暖，增进关系', loyaltyDelta: +5 },
  { icon: '📌', label: '委派重任', desc: '委以重要任务，表达信任', loyaltyDelta: +3 },
];

const SCHEDULE_TEMPLATES = [
  '08:00 晨会·部署当日工作\n10:00 接待来访群众\n14:00 项目现场视察\n16:00 部门工作汇报',
  '09:00 政务会议\n11:00 信访接待\n14:30 调研走访\n17:00 文件批阅',
  '08:30 党委扩大会议\n11:00 招商引资座谈\n15:00 工程项目调研\n18:00 专题研讨',
];

// ── 职级分层辅助 ─────────────────────────────────────────────
// 1-3:乡科  4-6:县处  7-9:市厅  10-11:省部  12+:国家
function getRankTier(rankLevel: number): 1 | 2 | 3 | 4 | 5 {
  if (rankLevel <= 3)  return 1;
  if (rankLevel <= 6)  return 2;
  if (rankLevel <= 9)  return 3;
  if (rankLevel <= 11) return 4;
  return 5;
}
const TIER_LABEL: Record<number, string> = { 1: '乡科级', 2: '县处级', 3: '市厅级', 4: '省部级', 5: '国家级' };

// ── 下发文件效果类型 ─────────────────────────────────────────
interface DraftEffect {
  label: string;
  meritGain?: number;
  bossFavorGain?: number;
  cityGdpGain?: number;
  cityLivelihoodGain?: number;
  cityEcologyGain?: number;
  cityBusinessGain?: number;
  securityGain?: number;
  fundGain?: number;
  subLoyaltyGain?: number;
  subAbilityGain?: number;
  subIntegrityGain?: number;  // 下属廉洁度增益
}

interface DraftTemplate {
  icon: string;
  title: string;
  category: string;
  desc: string;
  tier: 1 | 2 | 3 | 4 | 5;
  effect: DraftEffect;
  content: (city: string, playerName: string, rankName: string) => string;
}

const DRAFT_TEMPLATES: DraftTemplate[] = [
  // ══════════════ 乡科级（1-3）══════════════
  {
    icon: '📋', tier: 1, title: '关于开展人居环境整治的通知',
    category: '乡村治理',
    desc: '部署村庄清洁行动，改善农村卫生和居住环境',
    effect: { label: '民生+3，政绩+5', cityLivelihoodGain: 3, meritGain: 5 },
    content: (city, name, rankName) =>
      `关于在${city}辖区开展人居环境整治专项行动的通知\n\n各村（居）委会：\n\n为切实改善农村人居环境，按照县委、县政府部署要求，现就开展人居环境整治专项行动有关事项通知如下：\n\n一、整治范围\n\n全镇各行政村及自然村组，重点抓好村庄道路、房前屋后、公共区域清洁整治。\n\n二、主要任务\n\n（一）清理生活垃圾、农业废弃物及乱堆乱放；\n（二）疏通整治排水沟渠，消除积水点；\n（三）规范畜禽养殖管理，推进"厕所革命"。\n\n三、工作要求\n\n各村组长为第一责任人，每周报送整治进度，镇政府将组织检查验收。\n\n${city}镇人民政府\n${name}（${rankName}）\n${new Date().getFullYear()}年`,
  },
  {
    icon: '🌾', tier: 1, title: '关于加强春耕生产保障的工作方案',
    category: '农业生产',
    desc: '统筹调配农资供应，保障辖区粮食生产',
    effect: { label: 'GDP+2，民生+2，政绩+6', cityGdpGain: 2, cityLivelihoodGain: 2, meritGain: 6 },
    content: (city, name, rankName) =>
      `关于切实做好${city}辖区春耕生产保障工作的方案\n\n各村（居）委会、农业服务站：\n\n当前正值春耕备耕关键时期，为确保粮食生产安全，保障农民增收，特制定本方案。\n\n一、目标任务\n\n确保粮食种植面积不减少，良种推广率达90%以上，化肥农药使用量负增长。\n\n二、主要措施\n\n（一）组织农技人员深入田间地头开展技术指导；\n（二）协调供销社做好农资储备保障，杜绝假冒伪劣；\n（三）落实惠农政策宣传，确保补贴及时兑付到位；\n（四）加强气象灾害预警，完善应急处置预案。\n\n${city}镇人民政府\n${name}（${rankName}）\n${new Date().getFullYear()}年`,
  },
  {
    icon: '🏛️', tier: 1, title: '关于加强基层党建规范化建设的意见',
    category: '党建工作',
    desc: '规范村级党组织运作，强化党员管理和教育',
    effect: { label: '下属忠诚+3，下属廉洁+2，政绩+7，上司好感+1', subLoyaltyGain: 3, subIntegrityGain: 2, meritGain: 7, bossFavorGain: 1 },
    content: (city, name, rankName) =>
      `关于加强${city}基层党建规范化建设的意见\n\n各党支部：\n\n为进一步夯实基层党组织战斗堡垒作用，根据上级组织部门要求，提出以下意见。\n\n一、严格执行"三会一课"制度\n\n各支部每月至少召开一次支委会、一次党员大会，每季度讲一次党课，书记亲自上课。\n\n二、推行党员积分制管理\n\n从政治理论学习、志愿服务、联系群众、完成急难险重任务等方面对党员进行积分考核。\n\n三、开展"主题党日"活动\n\n每月固定一天为"主题党日"，围绕中心工作开展有内涵、有实效的党建活动。\n\n四、建立党员档案动态管理机制\n\n及时更新党员基本信息，流动党员须进行报到登记。\n\n${city}镇党委\n${name}（${rankName}）\n${new Date().getFullYear()}年`,
  },
  {
    icon: '⚖️', tier: 1, title: '关于开展矛盾纠纷排查化解的通知',
    category: '综治维稳',
    desc: '排查化解基层矛盾，维护辖区社会稳定',
    effect: { label: '治安+3，政绩+6', securityGain: 3, meritGain: 6 },
    content: (city, name, rankName) =>
      `关于在${city}开展矛盾纠纷大排查大化解专项行动的通知\n\n各村（居）综治网格员：\n\n为将矛盾纠纷化解在萌芽状态，维护辖区社会和谐稳定，即日起开展矛盾纠纷大排查大化解专项行动。\n\n一、排查重点\n\n土地纠纷、邻里矛盾、婚姻家庭纠纷、涉法涉诉及群体性隐患。\n\n二、化解措施\n\n坚持"调解优先"，综合运用法律、行政、教育手段。对涉及重大利益的矛盾，提请上级部门协同化解。\n\n三、工作要求\n\n排查情况每周报告，重大风险即时上报，做到事事有记录、件件有回音。\n\n${city}镇综治中心\n${name}（${rankName}）\n${new Date().getFullYear()}年`,
  },

  // ══════════════ 县处级（4-6）══════════════
  {
    icon: '📈', tier: 2, title: '关于推进重点招商引资项目落地的工作方案',
    category: '经济发展',
    desc: '出台优惠政策吸引优质企业，推动项目快速落地',
    effect: { label: 'GDP+4，营商+3，政绩+10', cityGdpGain: 4, cityBusinessGain: 3, meritGain: 10 },
    content: (city, name, rankName) =>
      `关于推进${city}重点招商引资项目落地的工作方案\n\n各乡镇、各相关部门：\n\n为加快经济高质量发展，发挥区位比较优势，吸引更多优质企业落地，制定本方案。\n\n一、招商重点领域\n\n优先引进先进制造业、农产品加工、商贸物流及特色文旅产业，鼓励电商企业和返乡创业项目。\n\n二、优惠政策\n\n（一）新引进规上企业，给予一次性奖补；\n（二）对新建标准厂房企业提供2年租金补贴；\n（三）为高层次人才提供安家补贴及优惠住房。\n\n三、服务保障\n\n建立"一企一专员"跟踪服务机制，全程代办各类审批，重大项目报县委县政府协调推进。\n\n${city}县（区）人民政府\n${name}（${rankName}）\n${new Date().getFullYear()}年`,
  },
  {
    icon: '🏗️', tier: 2, title: '关于加快推进城乡基础设施建设的决定',
    category: '基础建设',
    desc: '统筹推进道路、供水、污水处理等基础设施项目',
    effect: { label: 'GDP+3，民生+3，政绩+10', cityGdpGain: 3, cityLivelihoodGain: 3, meritGain: 10 },
    content: (city, name, rankName) =>
      `关于加快推进${city}城乡基础设施建设的决定\n\n各乡镇、相关部门：\n\n基础设施是高质量发展的重要支撑。为补齐制约发展的基础设施短板，作出如下决定。\n\n一、重点建设任务\n\n（一）新建改建农村公路，打通"最后一公里"；\n（二）完善城区供水、排水及污水处理设施；\n（三）加快推进5G基站和数字乡村基础设施建设；\n（四）实施老旧小区改造，改善群众居住条件。\n\n二、资金来源\n\n综合运用政府专项债、财政预算资金和社会资本，建立项目清单，明确建设时序。\n\n三、推进机制\n\n实行项目负责制，县级领导挂帅督导重点项目，将建设进度纳入年度考核。\n\n${city}县委、县政府\n${name}（${rankName}）\n${new Date().getFullYear()}年`,
  },
  {
    icon: '📋', tier: 2, title: '关于深化"放管服"改革优化营商环境的实施意见',
    category: '行政改革',
    desc: '压缩审批时限、推行"最多跑一次"，提升市场主体满意度',
    effect: { label: '营商+4，政绩+9，上司好感+1', cityBusinessGain: 4, meritGain: 9, bossFavorGain: 1 },
    content: (city, name, rankName) =>
      `关于深化${city}"放管服"改革优化营商环境的实施意见\n\n为进一步激发市场活力，降低制度性交易成本，提升${city}营商环境综合排名，提出以下实施意见。\n\n一、深化行政审批改革\n\n全面梳理权责清单，精简不必要审批，企业注册登记时间压缩至1个工作日。\n\n二、推行"一窗受理"模式\n\n整合各部门窗口服务，实行前台综合受理、后台分类办理，推进电子证照互认。\n\n三、建立政企沟通机制\n\n定期召开企业家座谈会，设立营商环境投诉举报热线，对投诉事项限期回复。\n\n四、加强事中事后监管\n\n推广"双随机一公开"监管模式，防止监管缺位与过度干预并存。\n\n${city}县（区）政府\n${name}（${rankName}）\n${new Date().getFullYear()}年`,
  },
  {
    icon: '🌿', tier: 2, title: '关于推进农村生活污水治理的工作方案',
    category: '生态环保',
    desc: '整治农村污水排放，改善农村生态环境质量',
    effect: { label: '生态+4，民生+2，政绩+8', cityEcologyGain: 4, cityLivelihoodGain: 2, meritGain: 8 },
    content: (city, name, rankName) =>
      `关于推进${city}农村生活污水治理的工作方案\n\n各乡镇人民政府、生态环保局：\n\n农村生活污水治理是农村人居环境整治的重要内容。现制定本工作方案。\n\n一、目标任务\n\n到年底，行政村生活污水处理覆盖率达70%以上，黑臭水体全面消除。\n\n二、主要举措\n\n（一）因地制宜选择纳管处理、集中处理、分散处理等模式；\n（二）加强已建污水处理设施运营管护；\n（三）将污水治理纳入乡村建设评价指标。\n\n三、资金保障\n\n积极申请省级农村污水治理专项资金，县级配套不少于20%。\n\n${city}县委、县政府\n${name}（${rankName}）\n${new Date().getFullYear()}年`,
  },

  // ══════════════ 市厅级（7-9）══════════════
  {
    icon: '🔬', tier: 3, title: '关于推进科技创新驱动高质量发展的实施方案',
    category: '创新发展',
    desc: '搭建创新平台，引育科技人才，推动产学研深度融合',
    effect: { label: 'GDP+5，营商+4，政绩+14，上司好感+2', cityGdpGain: 5, cityBusinessGain: 4, meritGain: 14, bossFavorGain: 2 },
    content: (city, name, rankName) =>
      `关于推进${city}科技创新驱动高质量发展的实施方案\n\n各县（市、区）、市直相关部门：\n\n科技创新是推动高质量发展的第一动力。为充分激活${city}科技创新活力，制定本方案。\n\n一、发展目标\n\n全社会研发投入占GDP比重达2.8%，高新技术企业数量年均增长25%，国家级创新平台实现突破。\n\n二、重点举措\n\n（一）支持龙头企业牵头建设省级重点实验室，开展关键技术攻关；\n（二）实施"人才强市"战略，引进海内外高层次创新人才不少于500名；\n（三）推动高校院所与企业共建创新联合体，促进科技成果就地转化；\n（四）设立市级科技创新引导基金，引导社会资本加大研发投入。\n\n${city}市委、市政府\n${name}（${rankName}）\n${new Date().getFullYear()}年`,
  },
  {
    icon: '🌆', tier: 3, title: '关于加快新型城镇化建设的若干意见',
    category: '城镇化发展',
    desc: '提升城市综合承载力，推进城乡一体化协调发展',
    effect: { label: 'GDP+4，民生+4，政绩+13', cityGdpGain: 4, cityLivelihoodGain: 4, meritGain: 13 },
    content: (city, name, rankName) =>
      `关于加快${city}新型城镇化建设的若干意见\n\n各县（市、区）、市直相关部门：\n\n加快新型城镇化建设，是扩大内需、促进经济高质量发展的战略举措。现提出以下意见。\n\n一、优化城镇空间格局\n\n构建以中心城区为核心、县城为骨干、特色小镇为补充的多层次城镇体系。\n\n二、提升城市承载能力\n\n加快城市更新改造，补齐停车、排涝、绿化等基础设施短板，推进智慧城市建设。\n\n三、深化农业转移人口市民化\n\n加快户籍制度改革，完善随迁子女就学、社会保障等公共服务保障。\n\n四、推进城乡融合发展\n\n建立城乡产业协同发展机制，鼓励工商资本下乡，促进乡村振兴与城镇化协调推进。\n\n${city}市委、市政府\n${name}（${rankName}）\n${new Date().getFullYear()}年`,
  },
  {
    icon: '🛡️', tier: 3, title: '关于加强社会治理创新提升城市安全水平的决定',
    category: '社会治理',
    desc: '完善立体化社会治安防控体系，提升城市本质安全水平',
    effect: { label: '治安+5，民生+2，下属廉洁+3，政绩+12，下属能力+2', securityGain: 5, cityLivelihoodGain: 2, meritGain: 12, subAbilityGain: 2, subIntegrityGain: 3 },
    content: (city, name, rankName) =>
      `关于加强${city}社会治理创新提升城市安全水平的决定\n\n各相关部门：\n\n为持续提升${city}城市安全治理能力现代化水平，作出如下决定。\n\n一、构建立体化防控体系\n\n整合公安、综治、应急等部门力量，建设市域社会治理综合指挥平台，实现"一网统管"。\n\n二、深化平安${city}建设\n\n推进"雪亮工程"向农村延伸，扩大社会面视频覆盖率，压降刑事案件发案率。\n\n三、创新基层治理模式\n\n推广"网格化+大数据"治理模式，配齐配强网格员队伍，做到"人在格中走、事在网中办"。\n\n四、加强安全生产监管\n\n开展重点行业安全生产专项整治，严防各类重特大事故发生。\n\n${city}市委、市政府\n${name}（${rankName}）\n${new Date().getFullYear()}年`,
  },
  {
    icon: '🌿', tier: 3, title: '关于坚决打好污染防治攻坚战的实施方案',
    category: '生态文明',
    desc: '系统推进大气、水、土壤污染治理，改善生态环境质量',
    effect: { label: '生态+5，民生+3，政绩+13，上司好感+1', cityEcologyGain: 5, cityLivelihoodGain: 3, meritGain: 13, bossFavorGain: 1 },
    content: (city, name, rankName) =>
      `关于${city}坚决打好污染防治攻坚战的实施方案\n\n各县（市、区）、市直生态环境部门：\n\n为深入贯彻习近平生态文明思想，坚决打好蓝天、碧水、净土三大保卫战，制定本方案。\n\n一、打好蓝天保卫战\n\nPM2.5年均浓度下降10%，空气质量优良天数比率达85%以上。\n\n二、打好碧水保卫战\n\n县级以上集中式饮用水水源地水质达标率100%，消灭劣V类断面。\n\n三、打好净土保卫战\n\n受污染耕地安全利用率达90%，危险废物处置率100%。\n\n四、制度保障\n\n实行生态环境保护"一票否决"，对造成严重环境问题的，依法追究责任。\n\n${city}市委、市政府\n${name}（${rankName}）\n${new Date().getFullYear()}年`,
  },

  // ══════════════ 省部级（10-11）══════════════
  {
    icon: '🏭', tier: 4, title: '关于加快构建现代化产业体系的决定',
    category: '产业政策',
    desc: '优化产业结构，培育壮大新兴产业，推动制造业转型升级',
    effect: { label: 'GDP+7，营商+5，政绩+20，上司好感+2', cityGdpGain: 7, cityBusinessGain: 5, meritGain: 20, bossFavorGain: 2 },
    content: (city, name, rankName) =>
      `关于加快构建${city}现代化产业体系的决定\n\n各市（州）、省直相关部门：\n\n构建现代化产业体系是高质量发展的重要基础。省委、省政府作出如下决定。\n\n一、战略目标\n\n到"十五五"末，全省GDP突破XX万亿，先进制造业占规上工业比重超50%，数字经济规模居全国前列。\n\n二、重点任务\n\n（一）聚焦打造3-5个具有全国竞争力的产业集群；\n（二）深化国有企业改革，推进战略性重组整合；\n（三）加大对"专精特新"企业政策扶持力度；\n（四）构建"链主企业—配套企业—公共服务平台"产业生态圈。\n\n三、政策保障\n\n省级财政每年安排不低于100亿元产业发展引导基金，撬动社会资本共同参与。\n\n${city}省委、省政府\n${name}（${rankName}）\n${new Date().getFullYear()}年`,
  },
  {
    icon: '🎓', tier: 4, title: '关于深化高等教育改革提升创新人才培养质量的意见',
    category: '教育科技',
    desc: '推进高校学科建设，优化人才培养模式，服务区域发展战略',
    effect: { label: '民生+5，下属能力+3，政绩+16', cityLivelihoodGain: 5, subAbilityGain: 3, meritGain: 16 },
    content: (city, name, rankName) =>
      `关于深化${city}高等教育改革提升创新人才培养质量的意见\n\n各高等院校、省教育厅：\n\n高等教育是科技第一生产力和人才第一资源的重要结合点。为服务全省经济社会发展战略需求，提出以下意见。\n\n一、优化学科专业结构\n\n根据产业发展需求动态调整学科专业，大力发展新工科、新医科、新农科和新文科。\n\n二、深化产教融合\n\n支持高校与行业龙头企业共建产业学院，推行"工程师培养"订单式人才培养模式。\n\n三、提升科研创新能力\n\n引导高校聚焦关键技术攻关，承接省重大科研专项，推动科研成果在省内转化落地。\n\n四、加强高层次人才引育\n\n实施"省杰青""省特支计划"，打造区域人才高地，防止人才外流。\n\n${city}省委、省政府\n${name}（${rankName}）\n${new Date().getFullYear()}年`,
  },
  {
    icon: '🌉', tier: 4, title: '关于推进区域协调发展的战略部署',
    category: '区域战略',
    desc: '统筹推进城乡区域协调，构建优势互补的区域经济格局',
    effect: { label: 'GDP+6，生态+3，下属廉洁+4，政绩+18，上司好感+3', cityGdpGain: 6, cityEcologyGain: 3, meritGain: 18, bossFavorGain: 3, subIntegrityGain: 4 },
    content: (city, name, rankName) =>
      `关于推进${city}区域协调发展的战略部署\n\n各市（州）、省直相关部门：\n\n促进区域协调发展，是贯彻新发展理念、构建新发展格局的内在要求。省委、省政府作出以下战略部署。\n\n一、构建"一核多极"区域格局\n\n做强省会城市核心引领，培育区域性中心城市，形成多点支撑的发展格局。\n\n二、推进山区帮扶振兴\n\n制定差异化政策，加大对欠发达地区转移支付力度，鼓励发达地区结对帮扶。\n\n三、深化省际合作\n\n主动融入国家重大区域发展战略，积极承接产业转移，拓展发展空间。\n\n四、完善生态补偿机制\n\n建立横向生态补偿机制，推进跨区域流域综合治理，实现绿色协调发展。\n\n${city}省委、省政府\n${name}（${rankName}）\n${new Date().getFullYear()}年`,
  },

  // ══════════════ 国家级（12+）══════════════
  {
    icon: '🇨🇳', tier: 5, title: '关于深化供给侧结构性改革的指导意见',
    category: '宏观经济',
    desc: '优化要素配置，化解过剩产能，推动经济高质量发展',
    effect: { label: 'GDP+10，营商+6，下属廉洁+5，政绩+30，上司好感+4', cityGdpGain: 10, cityBusinessGain: 6, meritGain: 30, bossFavorGain: 4, subIntegrityGain: 5 },
    content: (_city, name, rankName) =>
      `关于深化供给侧结构性改革推动经济高质量发展的指导意见\n\n各省（自治区、直辖市）人民政府，各部委：\n\n当前经济运行面临的结构性矛盾依然突出，深化供给侧结构性改革是推动高质量发展的根本举措。\n\n一、总体目标\n\n"十五五"期间，全要素生产率持续提升，经济结构明显优化，发展质量和效益显著提高。\n\n二、重点任务\n\n（一）持续推进去产能、去库存，淘汰落后产能；\n（二）加快推进制度型开放，激发市场主体活力；\n（三）深化财税金融改革，优化资源配置效率；\n（四）强化国家战略科技力量，突破"卡脖子"技术瓶颈。\n\n三、保障措施\n\n国政院建立协调推进机制，定期督导，将改革任务完成情况纳入省级政府绩效考核。\n\n国政院\n${name}（${rankName}）\n${new Date().getFullYear()}年`,
  },
  {
    icon: '🌏', tier: 5, title: '关于推进高水平对外开放的战略部署',
    category: '对外开放',
    desc: '拓展国际合作空间，主动融入全球价值链，推进制度型开放',
    effect: { label: 'GDP+8，营商+7，政绩+28，上司好感+3', cityGdpGain: 8, cityBusinessGain: 7, meritGain: 28, bossFavorGain: 3 },
    content: (_city, name, rankName) =>
      `关于推进高水平对外开放的战略部署\n\n各省（自治区、直辖市）人民政府，各部委、委员会：\n\n对外开放是我国的基本国策。在世界百年未有之大变局背景下，加快推进高水平对外开放意义重大。\n\n一、战略方向\n\n稳步扩大规则、规制、管理、标准等制度型开放，主动对接高标准国际经贸规则。\n\n二、重点举措\n\n（一）高质量推进自由贸易试验区扩区提级；\n（二）深化"一带一路"高质量共建，拓展多元化市场；\n（三）完善外商投资促进和保护法律体系，提升外资吸引力；\n（四）推进跨境数据流动、数字贸易等新领域规则谈判。\n\n国政院\n${name}（${rankName}）\n${new Date().getFullYear()}年`,
  },
  {
    icon: '🏥', tier: 5, title: '关于深化医疗卫生体制改革的决定',
    category: '民生保障',
    desc: '破解看病难看病贵难题，健全全民医疗保障和公共卫生服务体系',
    effect: { label: '民生+8，下属廉洁+5，政绩+25，下属忠诚+3', cityLivelihoodGain: 8, meritGain: 25, subLoyaltyGain: 3, subIntegrityGain: 5 },
    content: (_city, name, rankName) =>
      `关于深化医疗卫生体制改革的决定\n\n各省（自治区、直辖市），国政院各部委、委员会：\n\n深化医疗卫生体制改革，是保障和改善民生的重大举措，是维护社会公平正义的内在要求。\n\n一、改革目标\n\n到2030年，基本建立覆盖城乡居民的基本医疗卫生制度，人均预期寿命达到79岁以上。\n\n二、重点任务\n\n（一）推进公立医院综合改革，破除以药补医机制；\n（二）健全分级诊疗制度，引导优质医疗资源下沉基层；\n（三）深化医保支付方式改革，建立DRG/DIP付费体系；\n（四）加快推进罕见病用药保障，将更多新药纳入医保目录。\n\n国政院\n${name}（${rankName}）\n${new Date().getFullYear()}年`,
  },
];

// ── 辅助申请类型 ──────────────────────────────────────────────
interface ApplyType {
  icon: string;
  title: string;
  category: string;
  desc: string;
  condition: string;
  successRate: number;
  tier: 1 | 2 | 3 | 4 | 5;
  effect: {
    label: string;
    meritGain?: number;
    bossFavorGain?: number;
    cityGdpGain?: number;
    cityLivelihoodGain?: number;
    cityEcologyGain?: number;
    cityBusinessGain?: number;
    securityGain?: number;
    fundGain?: number;
    subLoyaltyGain?: number;
    subAbilityGain?: number;
    subIntegrityGain?: number;  // 下属廉洁度增益
  };
  failEffect?: { label: string; meritGain?: number };
}

const APPLY_TYPES: ApplyType[] = [
  // ══════════════ 乡科级（1-3）══════════════
  {
    icon: '🏅', tier: 1, title: '申请"文明村镇"称号',
    category: '表彰激励',
    desc: '向县级文明办申报文明村镇荣誉称号，提升辖区形象',
    condition: '需治安及民生指数≥40，由县级文明委评审',
    successRate: 0.75,
    effect: { label: '民生+3，治安+2，下属廉洁+2，政绩+8，上司好感+1', cityLivelihoodGain: 3, securityGain: 2, meritGain: 8, bossFavorGain: 1, subIntegrityGain: 2 },
    failEffect: { label: '评审未通过，政绩+2', meritGain: 2 },
  },
  {
    icon: '💰', tier: 1, title: '申请农村基础设施补短板专项资金',
    category: '资金争取',
    desc: '向县财政申请农村道路、水利、电网等基础设施补短板专项资金',
    condition: '需提交项目清单，由县发改委和财政局联合审批',
    successRate: 0.6,
    effect: { label: '资金+30万，政绩+5', fundGain: 30, meritGain: 5 },
    failEffect: { label: '申请未获批，政绩+1', meritGain: 1 },
  },
  {
    icon: '🌾', tier: 1, title: '申请粮食生产功能区认定',
    category: '农业发展',
    desc: '申报粮食生产功能区认定，争取农业补贴和政策支持',
    condition: '需具备一定规模连片耕地，由县农业农村局评审',
    successRate: 0.7,
    effect: { label: 'GDP+2，民生+2，政绩+6', cityGdpGain: 2, cityLivelihoodGain: 2, meritGain: 6 },
    failEffect: { label: '认定材料不足，政绩+1', meritGain: 1 },
  },
  {
    icon: '🎓', tier: 1, title: '申请基层干部培训名额',
    category: '干部培养',
    desc: '向县委组织部申请干部学院或党校培训名额',
    condition: '向县委组织部申请，名额有限按需分配',
    successRate: 0.8,
    effect: { label: '下属能力+3，政绩+5', subAbilityGain: 3, meritGain: 5 },
    failEffect: { label: '本批名额已满，政绩+1', meritGain: 1 },
  },

  // ══════════════ 县处级（4-6）══════════════
  {
    icon: '🏆', tier: 2, title: '申请年度县级先进集体',
    category: '表彰激励',
    desc: '由秘书代拟年度优秀集体申报材料，经市级主管部门评审',
    condition: '需政绩值≥50，由市级主管部门评审',
    successRate: 0.75,
    effect: { label: '政绩+12，下属忠诚+4，上司好感+2', meritGain: 12, subLoyaltyGain: 4, bossFavorGain: 2 },
    failEffect: { label: '申报未通过，政绩+3', meritGain: 3 },
  },
  {
    icon: '🏗️', tier: 2, title: '申请县域重点项目立项',
    category: '项目申报',
    desc: '对重大基础设施和产业项目进行立项申请，争取省市支持',
    condition: '需工可研报告完整，经市发改委审批',
    successRate: 0.65,
    effect: { label: 'GDP+3，资金+60万，政绩+10', cityGdpGain: 3, fundGain: 60, meritGain: 10 },
    failEffect: { label: '项目暂缓立项，政绩+2', meritGain: 2 },
  },
  {
    icon: '💰', tier: 2, title: '申请基础设施补短板专项债',
    category: '资金争取',
    desc: '面向省市发改、财政部门争取基础设施专项债，加快补齐民生短板',
    condition: '需提交项目清单和偿债方案，省市级审批',
    successRate: 0.5,
    effect: { label: 'GDP+3，民生+3，资金+120万，政绩+14', cityGdpGain: 3, cityLivelihoodGain: 3, fundGain: 120, meritGain: 14 },
    failEffect: { label: '专项债未获批，政绩+4', meritGain: 4 },
  },
  {
    icon: '🌿', tier: 2, title: '申报国家级生态示范区',
    category: '品牌建设',
    desc: '以生态建设成果为基础，申报国家级生态文明建设示范县（市）',
    condition: '生态指数须≥55，经省生态环境厅评审报国家评定',
    successRate: 0.55,
    effect: { label: '生态+5，营商+3，政绩+15，上司好感+2', cityEcologyGain: 5, cityBusinessGain: 3, meritGain: 15, bossFavorGain: 2 },
    failEffect: { label: '申报未通过，政绩+4', meritGain: 4 },
  },

  // ══════════════ 市厅级（7-9）══════════════
  {
    icon: '🌟', tier: 3, title: '申报全国文明城市',
    category: '品牌建设',
    desc: '争创全国文明城市称号，全面提升城市形象和软实力',
    condition: '需综合指数较高，由中央文明办组织测评',
    successRate: 0.5,
    effect: { label: '民生+5，治安+4，下属廉洁+3，政绩+20，上司好感+3', cityLivelihoodGain: 5, securityGain: 4, meritGain: 20, bossFavorGain: 3, subIntegrityGain: 3 },
    failEffect: { label: '本届未入选，政绩+5', meritGain: 5 },
  },
  {
    icon: '💼', tier: 3, title: '申请国家级经济技术开发区',
    category: '开发区建设',
    desc: '向商务部申请升格为国家级经济技术开发区，争取更多政策支持',
    condition: '需省级开发区运营3年以上，报商务部审批',
    successRate: 0.45,
    effect: { label: 'GDP+6，营商+5，资金+200万，政绩+22', cityGdpGain: 6, cityBusinessGain: 5, fundGain: 200, meritGain: 22 },
    failEffect: { label: '申请暂缓，政绩+6', meritGain: 6 },
  },
  {
    icon: '🎓', tier: 3, title: '申请高层次人才引进专项资金',
    category: '人才引育',
    desc: '向省级人才办申请高层次人才引进补贴和安家费专项资金',
    condition: '需提供引才计划和岗位说明，省人才办审批',
    successRate: 0.7,
    effect: { label: '下属能力+4，下属忠诚+3，政绩+16', subAbilityGain: 4, subLoyaltyGain: 3, meritGain: 16 },
    failEffect: { label: '本批资金已分配完，政绩+4', meritGain: 4 },
  },
  {
    icon: '🤝', tier: 3, title: '申请区域协调发展合作框架协议',
    category: '区域合作',
    desc: '与周边城市签署战略合作协议，拓展区域合作空间',
    condition: '双方主要领导达成意向，经省政府备案',
    successRate: 0.8,
    effect: { label: 'GDP+4，营商+4，政绩+18，上司好感+2', cityGdpGain: 4, cityBusinessGain: 4, meritGain: 18, bossFavorGain: 2 },
    failEffect: { label: '合作暂搁置，政绩+4', meritGain: 4 },
  },

  // ══════════════ 省部级（10-11）══════════════
  {
    icon: '🏅', tier: 4, title: '申请国家重大战略项目落地',
    category: '战略布局',
    desc: '向国家发改委等部委争取重大战略性项目在本省落地',
    condition: '需充分准备可研材料，报国家发改委审核',
    successRate: 0.5,
    effect: { label: 'GDP+8，营商+6，资金+500万，政绩+28', cityGdpGain: 8, cityBusinessGain: 6, fundGain: 500, meritGain: 28 },
    failEffect: { label: '项目暂未批复，政绩+7', meritGain: 7 },
  },
  {
    icon: '🌱', tier: 4, title: '申报国家绿色发展示范省',
    category: '生态战略',
    desc: '全面推进绿色转型，争创国家绿色发展示范省称号',
    condition: '生态、民生、GDP等综合指数均衡，报生态环境部',
    successRate: 0.55,
    effect: { label: '生态+7，民生+4，政绩+25，上司好感+4', cityEcologyGain: 7, cityLivelihoodGain: 4, meritGain: 25, bossFavorGain: 4 },
    failEffect: { label: '申报未通过，政绩+7', meritGain: 7 },
  },
  {
    icon: '🎓', tier: 4, title: '申请"双一流"高校建设资金',
    category: '科教战略',
    desc: '向教育部争取省内高校入选"双一流"及配套建设经费',
    condition: '需高校有突出学科优势，教育部评审',
    successRate: 0.6,
    effect: { label: '民生+6，下属能力+5，政绩+22', cityLivelihoodGain: 6, subAbilityGain: 5, meritGain: 22 },
    failEffect: { label: '本批未能入选，政绩+6', meritGain: 6 },
  },

  // ══════════════ 国家级（12+）══════════════
  {
    icon: '🌐', tier: 5, title: '提请全国议政院审议重大法律修订',
    category: '立法工作',
    desc: '就社会高度关注的法律问题提请全国议政院常委会审议修订',
    condition: '需充分调研论证，提交法律修订草案',
    successRate: 0.65,
    effect: { label: '民生+10，下属忠诚+5，下属廉洁+6，政绩+40，上司好感+5', cityLivelihoodGain: 10, subLoyaltyGain: 5, meritGain: 40, bossFavorGain: 5, subIntegrityGain: 6 },
    failEffect: { label: '草案需进一步完善，政绩+10', meritGain: 10 },
  },
  {
    icon: '💹', tier: 5, title: '申请设立国家级产业投资基金',
    category: '战略投资',
    desc: '向国政院申请设立国家级战略性新兴产业投资基金',
    condition: '需经财政部、发改委联合评审，国政院审批',
    successRate: 0.55,
    effect: { label: 'GDP+12，营商+8，资金+2000万，政绩+45', cityGdpGain: 12, cityBusinessGain: 8, fundGain: 2000, meritGain: 45 },
    failEffect: { label: '方案需调整，政绩+12', meritGain: 12 },
  },
  {
    icon: '🤝', tier: 5, title: '推动签署重大国际合作协议',
    category: '外交合作',
    desc: '主导推进与主要经济体签署贸易、科技等领域合作协议',
    condition: '需外交部协调，双方谈判达成一致后正式签署',
    successRate: 0.7,
    effect: { label: 'GDP+10，营商+9，政绩+38，上司好感+4', cityGdpGain: 10, cityBusinessGain: 9, meritGain: 38, bossFavorGain: 4 },
    failEffect: { label: '谈判暂未达成，政绩+10', meritGain: 10 },
  },
];

// ── 情报汇报（中高层解锁）──────────────────────────────────────
const INTEL_ITEMS = [
  { icon: '👁️', title: '下属动态分析',   desc: '梳理在岗干部近期言行，识别异常情况',          gain: '政绩+5，风险-2' },
  { icon: '📡', title: '舆情监控报告',   desc: '汇总互联网及民间舆论，提前预判风险',           gain: '稳定+3，政绩+4' },
  { icon: '🤝', title: '上级意图研判',   desc: '分析上级最近动态，研判政策走向',               gain: '上司好感+3' },
  { icon: '🏢', title: '关键部门摸底',   desc: '了解关键部门实际运转情况与内部生态',           gain: '政绩+6' },
];

// ── 决策参谋（高层解锁）────────────────────────────────────────
const COUNSEL_ITEMS = [
  { icon: '💡', title: '重大事项预研',   desc: '就即将面临的重要决策提供专业意见',             gain: '政绩+8，风险-3' },
  { icon: '⚖️', title: '政策利弊评估',   desc: '对拟出台政策进行系统性利弊评估',               gain: 'GDP+2，政绩+6' },
  { icon: '🎯', title: '重点工作排序',   desc: '结合当前形势帮助排定工作优先级',               gain: '政绩+7，效率+5' },
];

// ── 警卫处 ─────────────────────────────────────────────────────
interface GuardConfig {
  level: string; totalGuards: number; personalGuards: number;
  vehicleGuards: number; residenceGuards: number; rank: string; upgradeDesc: string;
}
function getGuardConfig(rankLevel: number): GuardConfig {
  if (rankLevel >= 14) return { level: '国家领导人警卫规格', totalGuards: 100, personalGuards: 12, vehicleGuards: 20, residenceGuards: 68, rank: '中央警卫局直属', upgradeDesc: '总理警卫工作由中央警卫局统筹安排，配备专属警卫车队及驻地警卫分队' };
  if (rankLevel >= 13) return { level: '副国级警卫规格', totalGuards: 60, personalGuards: 8, vehicleGuards: 12, residenceGuards: 40, rank: '中央警卫局协管', upgradeDesc: '晋升正国级后警卫升格为国家领导人规格' };
  if (rankLevel >= 12) return { level: '省部级警卫规格', totalGuards: 20, personalGuards: 4, vehicleGuards: 4, residenceGuards: 12, rank: '省公安厅/中央直属', upgradeDesc: '晋升副国级后可申请升格警卫规格' };
  if (rankLevel >= 10) return { level: '厅局级警卫规格', totalGuards: 8, personalGuards: 2, vehicleGuards: 2, residenceGuards: 4, rank: '省公安厅统一安排', upgradeDesc: '晋升省部级后可申请配备更高规格警卫' };
  if (rankLevel >= 8)  return { level: '市厅级警卫规格', totalGuards: 4, personalGuards: 1, vehicleGuards: 1, residenceGuards: 2, rank: '市公安局配备', upgradeDesc: '晋升副省级后升格为厅局级警卫规格' };
  if (rankLevel >= 6)  return { level: '处级安保规格', totalGuards: 2, personalGuards: 1, vehicleGuards: 0, residenceGuards: 1, rank: '县公安局配备', upgradeDesc: '晋升市厅级后配备正式警卫规格' };
  return { level: '暂无专属警卫', totalGuards: 0, personalGuards: 0, vehicleGuards: 0, residenceGuards: 0, rank: '—', upgradeDesc: '晋升至县处级（6级）后方可配备安保' };
}
const GUARD_TASKS = [
  { icon: '🔍', name: '安全审查', desc: '对即将参加的重要活动进行安全预评估', cost: 20, secGain: 2 },
  { icon: '🚨', name: '反侦察演练', desc: '组织警卫人员进行应急处置演练', cost: 50, secGain: 5 },
  { icon: '🏛️', name: '住所安保升级', desc: '对住所及办公室进行安保升级', cost: 100, secGain: 8 },
  { icon: '🛡️', name: '特勤装备更换', desc: '为警卫配备新型防护装备', cost: 200, secGain: 12 },
];

function AbilityBar({ value }: { value: number }) {
  const color = value >= 60 ? '#2a7a3b' : value >= 30 ? '#e07a00' : '#C82829';
  return (
    <View style={{ height: 8, backgroundColor: '#e8e8e6', marginTop: 4, flex: 1 }}>
      <View style={{ height: 8, width: `${value}%`, backgroundColor: color }} />
    </View>
  );
}

export default function SecretaryPage() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { save, updateGameSave, refreshSave } = useGame();
  const [secretary, setSecretary] = useState<Secretary | null>(null);
  const [subordinates, setSubordinates] = useState<Subordinate[]>([]);
  const [reports, setReports] = useState<MonthlyReport[]>([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<Tab>('main');
  const [selectedSub, setSelectedSub] = useState<Subordinate | null>(null);
  const [selectedTopic, setSelectedTopic] = useState<number | null>(null);
  const [scheduleText, setScheduleText] = useState('');
  const [draftIdx, setDraftIdx] = useState<number | null>(null);
  const [draftContent, setDraftContent] = useState('');
  const [draftDone, setDraftDone] = useState<Set<number>>(new Set());
  const [msg, setMsg] = useState('');
  const [msgOk, setMsgOk] = useState(false);
  const [acting, setActing] = useState(false);
  const [applyDone, setApplyDone] = useState<Set<number>>(new Set());
  const [intelDone, setIntelDone] = useState<Set<number>>(new Set());
  const [counselDone, setCounselDone] = useState<Set<number>>(new Set());
  const [recSub, setRecSub]   = useState<Subordinate | null>(null);
  const [recDept, setRecDept] = useState<DeptKey | null>(null);
  const [recPos,  setRecPos]  = useState<'head' | 'deputy' | 'staff' | null>(null);
  const [recResult, setRecResult] = useState('');
  // 任命秘书
  const [appointSub, setAppointSub] = useState<Subordinate | null>(null);
  // 调任官职
  const [transferRoleKey, setTransferRoleKey] = useState<string | null>(null);

  const showMsg = (text: string, ok = true) => {
    setMsg(text); setMsgOk(ok);
    setTimeout(() => setMsg(''), 4000);
  };

  const load = useCallback(async () => {
    if (!save) return;
    setLoading(true);
    const [sec, subs, rpts] = await Promise.all([
      getOrCreateSecretary(save.id, save.userId),
      getSubordinates(save.id),
      getAllReports(save.id),
    ]);
    setSecretary(sec);
    setSubordinates(subs);
    setReports(rpts);
    if (sec?.dailySchedule) setScheduleText(sec.dailySchedule);
    setLoading(false);
  }, [save]);

  useFocusEffect(useCallback(() => { void load(); }, [load]));

  if (!save) return null;

  const secCfg = getSecretaryConfig(save.rankLevel);
  const effectiveAbility = (secretary?.isAppointed) ? Math.min(secretary.ability, secCfg.abilityMax) : 0;

  // 整理公文
  const handleDocwork = async () => {
    if (!secretary) return;
    if (secretary.ability < 20) { showMsg('办公室工作人员能力值不足，请等待月度自动恢复', false); return; }
    setActing(true);
    const result = await doDocwork(secretary.id, save.gameDays);
    if (result) {
      await updateGameSave({ meritPoints: save.meritPoints + result.meritGain + secCfg.docworkGainBonus });
      await refreshSave();
      await load();
      showMsg(`整理公文完成，政绩 +${result.meritGain + secCfg.docworkGainBonus} 点`);
    } else {
      showMsg('整理公文失败', false);
    }
    setActing(false);
  };

  // 保存日程
  const handleSaveSchedule = async () => {
    if (!secretary || !scheduleText.trim()) return;
    setActing(true);
    const ok = await updateSecretarySchedule(secretary.id, scheduleText);
    showMsg(ok ? '日程已保存' : '保存失败', ok);
    if (ok) await load();
    setActing(false);
  };

  // 起草文件 — 选择模板
  const handleSelectDraft = (idx: number) => {
    setDraftIdx(idx);
    setDraftContent(DRAFT_TEMPLATES[idx].content(save.cityName, save.playerName ?? '本人', save.rankName ?? ''));
  };

  // 起草文件 — 定稿报送（实际执行增益）
  const handleDraftSubmit = async () => {
    if (draftIdx === null || draftDone.has(draftIdx)) return;
    const tpl = DRAFT_TEMPLATES[draftIdx];
    const eff = tpl.effect;
    setActing(true);

    // 1) 玩家属性增益
    const saveUpdates: Parameters<typeof updateGameSave>[0] = {};
    if (eff.meritGain)          saveUpdates.meritPoints    = save.meritPoints + eff.meritGain;
    if (eff.bossFavorGain)      saveUpdates.bossFavor      = Math.min(100, save.bossFavor + eff.bossFavorGain);
    if (eff.cityGdpGain)        saveUpdates.cityGdp        = Math.min(100, save.cityGdp + eff.cityGdpGain);
    if (eff.cityLivelihoodGain) saveUpdates.cityLivelihood = Math.min(100, save.cityLivelihood + eff.cityLivelihoodGain);
    if (eff.cityEcologyGain)    saveUpdates.cityEcology    = Math.min(100, save.cityEcology + eff.cityEcologyGain);
    if (eff.cityBusinessGain)   saveUpdates.cityBusiness   = Math.min(100, save.cityBusiness + eff.cityBusinessGain);
    if (eff.securityGain)       saveUpdates.securityIndex  = Math.min(100, save.securityIndex + eff.securityGain);
    if (eff.fundGain)           saveUpdates.fundBalance    = (save.fundBalance ?? 0) + eff.fundGain;
    await updateGameSave(saveUpdates);

    // 2) 下属属性增益（遍历在职下属）
    if ((eff.subLoyaltyGain || eff.subAbilityGain || eff.subIntegrityGain) && subordinates.length > 0) {
      const loyDelta  = eff.subLoyaltyGain  ?? 0;
      const abiDelta  = eff.subAbilityGain  ?? 0;
      const intDelta  = eff.subIntegrityGain ?? 0;
      await Promise.all(
        subordinates
          .filter(s => s.isAppointed)
          .map(s => assessSubordinate(s.id, save.gameDays, abiDelta, loyDelta, intDelta, 0))
      );
    }

    setDraftDone(prev => new Set([...prev, draftIdx]));
    showMsg(`✅ 「${tpl.title}」已定稿报送！${eff.label}`);
    setActing(false);
  };

  // 辅助申请
  const handleApply = async (idx: number) => {
    if (!save || applyDone.has(idx)) return;
    const ap = APPLY_TYPES[idx];
    setActing(true);
    const success = Math.random() < ap.successRate;
    const eff = success ? ap.effect : ap.failEffect;
    if (!eff) { setActing(false); return; }

    // 玩家属性增益
    const saveUpdates: Parameters<typeof updateGameSave>[0] = {};
    if (eff.meritGain)          saveUpdates.meritPoints    = save.meritPoints + eff.meritGain;
    if (success) {
      const se = ap.effect;
      if (se.bossFavorGain)      saveUpdates.bossFavor      = Math.min(100, save.bossFavor + se.bossFavorGain);
      if (se.cityGdpGain)        saveUpdates.cityGdp        = Math.min(100, save.cityGdp + se.cityGdpGain);
      if (se.cityLivelihoodGain) saveUpdates.cityLivelihood = Math.min(100, save.cityLivelihood + se.cityLivelihoodGain);
      if (se.cityEcologyGain)    saveUpdates.cityEcology    = Math.min(100, save.cityEcology + se.cityEcologyGain);
      if (se.cityBusinessGain)   saveUpdates.cityBusiness   = Math.min(100, save.cityBusiness + se.cityBusinessGain);
      if (se.securityGain)       saveUpdates.securityIndex  = Math.min(100, save.securityIndex + se.securityGain);
      if (se.fundGain)           saveUpdates.fundBalance    = (save.fundBalance ?? 0) + se.fundGain;
    }
    await updateGameSave(saveUpdates);

    // 下属属性增益（成功时）
    if (success && (ap.effect.subLoyaltyGain || ap.effect.subAbilityGain || ap.effect.subIntegrityGain) && subordinates.length > 0) {
      const loyDelta = ap.effect.subLoyaltyGain  ?? 0;
      const abiDelta = ap.effect.subAbilityGain  ?? 0;
      const intDelta = ap.effect.subIntegrityGain ?? 0;
      await Promise.all(
        subordinates
          .filter(s => s.isAppointed)
          .map(s => assessSubordinate(s.id, save.gameDays, abiDelta, loyDelta, intDelta, 0))
      );
    }

    setApplyDone(prev => new Set([...prev, idx]));
    showMsg(success ? `✅ ${ap.title}已批准！${ap.effect.label}` : `⚠️ ${ap.title}申请未获批。${eff.label}`, success);
    setActing(false);
  };

  // 情报汇报
  const handleIntel = async (idx: number) => {
    if (intelDone.has(idx)) return;
    setActing(true);
    await updateGameSave({ meritPoints: save.meritPoints + 5 });
    showMsg(`✅ ${INTEL_ITEMS[idx].title}已完成，${INTEL_ITEMS[idx].gain}`);
    setIntelDone(prev => new Set([...prev, idx]));
    setActing(false);
  };

  // 决策参谋
  const handleCounsel = async (idx: number) => {
    if (counselDone.has(idx)) return;
    setActing(true);
    await updateGameSave({ meritPoints: save.meritPoints + 7 });
    showMsg(`✅ ${COUNSEL_ITEMS[idx].title}已完成，${COUNSEL_ITEMS[idx].gain}`);
    setCounselDone(prev => new Set([...prev, idx]));
    setActing(false);
  };

  // ── 干部推荐任职 ──
  const handleRecommend = async () => {
    if (!recSub || !recDept || !recPos) { showMsg('请选择推荐对象、目标部门和职位', false); return; }
    if (recPos === 'head' && recSub.ability < 70) { showMsg('正职要求能力70+，请选择其他干部或职位', false); return; }
    if (recPos === 'deputy' && recSub.ability < 55) { showMsg('副职要求能力55+，请选择其他干部或职位', false); return; }
    setActing(true);
    const deptLabel = getDeptNameByRank(recDept, save.rankLevel);
    const posLabel = recPos === 'head' ? `${deptLabel}局长` : recPos === 'deputy' ? `${deptLabel}副局长` : `${deptLabel}科员`;
    const ok = await appointSubordinate(recSub.id, posLabel, posLabel, recDept, recPos, save.rankLevel);
    if (ok) {
      setRecResult(`✅ ${recSub.name}已由办公室协调任命为${posLabel}`);
      await updateGameSave({ meritPoints: save.meritPoints + 3 });
      await load();
      setRecSub(null); setRecDept(null); setRecPos(null);
    } else {
      showMsg('推荐任职失败，请稍后再试', false);
    }
    setActing(false);
  };

  // ── 任命下属为专属秘书 ──
  const handleAppointSub = async () => {
    if (!appointSub || !save || !secretary) return;
    setActing(true);
    const ok = await appointSubAsSecretary(save.id, {
      id: appointSub.id,
      name: appointSub.name,
      avatarId: appointSub.avatarId ?? 1,
      ability: appointSub.ability,
    });
    if (ok) {
      showMsg(`✅ 已任命 ${appointSub.name} 为专属秘书`);
      setAppointSub(null);
      setTab('main');
      await load();
    } else {
      showMsg('任命未生效，请重试或检查网络后再次尝试', false);
    }
    setActing(false);
  };

  // ── 解除秘书任命 ──
  const handleRecallSecretary = async () => {
    if (!secretary?.subId || !save) return;
    setActing(true);
    const ok = await recallSecretary(save.id, secretary.subId);
    if (ok) {
      showMsg('已解除专属秘书任命');
      await load();
    } else {
      showMsg('解除任命失败', false);
    }
    setActing(false);
  };

  // ── 调任秘书至官职 ──
  const handleTransferSecretary = async () => {
    if (!secretary?.subId || !save || !transferRoleKey) return;
    const roles = LEADERSHIP_ROLES[save.rankLevel] ?? [];
    const role = roles.find(r => r.key === transferRoleKey);
    if (!role) return;
    setActing(true);
    // 找到当前秘书对应的下属
    const secSub = subordinates.find(s => s.id === secretary.subId);
    if (!secSub) { showMsg('秘书下属信息不存在', false); setActing(false); return; }
    const ok1 = await assignLeadershipRole(
      save.id, save.userId, secSub.id,
      role.key, role.label,
      secSub.name, secSub.avatarId ?? 1, secSub.gender ?? '男', save.gameDays,
    );
    const ok2 = await recallSecretary(save.id, secretary.subId);
    if (ok1 && ok2) {
      showMsg(`✅ 已将 ${secSub.name} 调任为${role.label}`);
      setTransferRoleKey(null);
      setTab('main');
      await load();
    } else {
      showMsg('调任失败，请稍后再试', false);
    }
    setActing(false);
  };

  // 待办计算
  const unassigned = subordinates.filter(s => !s.isAppointed && !s.transferredCity);
  const needAssess = subordinates.filter(s => s.isAppointed && save.gameDays - s.lastAssessedDay >= 90);
  const todos = [
    !reports.find(r => Number(r.monthKey) === Math.floor(save.gameDays / 30))
      ? { icon: '📋', text: '本月工作会议待召开', link: '/(app)/meeting', urgent: true }
      : null,
    save.isPromotionAvailable
      ? { icon: '🎖️', text: '晋升条件已满足，建议申请晋升', link: '/(app)/promotion', urgent: true }
      : null,
    save.gameDays - save.lastRankDay >= 330
      ? { icon: '📊', text: '年度排名结算即将来临（≤30天）', link: null, urgent: true }
      : null,
    needAssess.length > 0
      ? { icon: '⚠️', text: `有 ${needAssess.length} 名下属待考评`, link: '/(app)/subordinates', urgent: false }
      : null,
    unassigned.length > 2
      ? { icon: '👥', text: `${unassigned.length} 名干部未分配岗位`, link: '/(app)/subordinates', urgent: false }
      : null,
    (save.fundBalance ?? 0) < 50
      ? { icon: '💸', text: '城市资金余额不足50万，注意财政风险', link: '/(app)/fiscal', urgent: true }
      : null,
  ].filter(Boolean) as { icon: string; text: string; link: string | null; urgent: boolean }[];

  // 可用部门列表
  const availableDepts = Object.keys(DEPT_CONFIG) as DeptKey[];

  // Tab配置（根据职级动态显示）
  const TABS: { key: Tab; label: string; badge?: number }[] = [
    ...(save.rankLevel >= 3 ? [{ key: 'appoint' as Tab, label: secretary?.isAppointed ? '更换秘书' : '任命秘书' }] : []),
    { key: 'main',      label: '秘书台' },
    ...(secretary?.isAppointed && (LEADERSHIP_ROLES[save.rankLevel] ?? []).length > 0 ? [{ key: 'transfer' as Tab, label: '调任官职' }] : []),
    { key: 'todo',      label: '待办提醒', badge: todos.filter(t => t.urgent).length || undefined },
    { key: 'report',    label: '报告摘要' },
    { key: 'draft',     label: '起草文件' },
    { key: 'apply',     label: '辅助申请' },
    ...(secCfg.canRecommend ? [{ key: 'recommend' as Tab, label: '干部协调' }] : []),
    { key: 'guard' as Tab, label: '🛡️ 安保' },
  ];

  return (
    <View style={{ flex: 1, backgroundColor: '#F7F7F5' }}>
      {/* 顶栏 */}
      <View style={{ backgroundColor: '#1D3B5E', paddingTop: insets.top + 8, paddingBottom: 14, paddingHorizontal: 16, flexDirection: 'row', alignItems: 'center' }}>
        <Pressable onPress={() => router.back()} style={{ marginRight: 12 }}>
          <Text style={{ color: '#ccc', fontSize: 22 }}>‹</Text>
        </Pressable>
        <View style={{ flex: 1 }}>
          <Text style={{ color: '#a0b4cc', fontSize: 10, letterSpacing: 2 }}>{save?.rankName} · {save?.cityName}</Text>
          <Text style={{ color: '#fff', fontSize: 16, fontWeight: '700', letterSpacing: 1 }}>{secCfg.officeTitle}</Text>
        </View>
        {secretary?.isAppointed ? (
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
            <Text style={{ color: '#a0b4cc', fontSize: 11 }}>能力值</Text>
            <View style={{ backgroundColor: effectiveAbility >= 60 ? '#2a7a3b' : '#C82829', paddingHorizontal: 8, paddingVertical: 2 }}>
              <Text style={{ color: '#fff', fontSize: 11, fontWeight: '700', fontVariant: ['tabular-nums'] }}>{effectiveAbility}/{secCfg.abilityMax}</Text>
            </View>
          </View>
        ) : (
          <View style={{ backgroundColor: 'rgba(255,255,255,0.12)', paddingHorizontal: 8, paddingVertical: 2 }}>
            <Text style={{ color: '#a0b4cc', fontSize: 11 }}>待任命</Text>
          </View>
        )}
      </View>

      {loading ? (
        <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
          <ActivityIndicator size="large" color="#1D3B5E" />
        </View>
      ) : (
        <View style={{ flex: 1 }}>
          {/* Tab栏 — 外层View固定高度，隔离Android flex高度计算异常 */}
          <View style={{ height: 44, backgroundColor: '#fff', borderBottomWidth: 1, borderBottomColor: '#D1D1CF' }}>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ flex: 1 }} contentContainerStyle={{ flexDirection: 'row', alignItems: 'stretch' }}>
              {TABS.map(t => (
                <Pressable
                  key={t.key}
                  onPress={() => { setTab(t.key); setMsg(''); }}
                  style={{ paddingHorizontal: 14, justifyContent: 'center', alignItems: 'center', borderBottomWidth: 2, borderBottomColor: tab === t.key ? '#C82829' : 'transparent', flexDirection: 'row', gap: 4 }}
                >
                  <Text style={{ fontSize: 13, color: tab === t.key ? '#C82829' : '#888', fontWeight: tab === t.key ? '700' : '400' }}>{t.label}</Text>
                  {t.badge ? (
                    <View style={{ backgroundColor: '#C82829', borderRadius: 8, paddingHorizontal: 5, paddingVertical: 1 }}>
                      <Text style={{ color: '#fff', fontSize: 9, fontWeight: '700' }}>{t.badge}</Text>
                    </View>
                  ) : null}
                </Pressable>
              ))}
            </ScrollView>
          </View>

          <ScrollView style={{ flex: 1 }} contentInsetAdjustmentBehavior="never" contentContainerStyle={{ padding: 16, gap: 14 }}>
            {msg ? (
              <View style={{ backgroundColor: msgOk ? '#f0faf3' : '#fff5f5', borderWidth: 1, borderColor: msgOk ? '#2a7a3b' : '#C82829', padding: 10 }}>
                <Text style={{ fontSize: 12, color: msgOk ? '#2a7a3b' : '#C82829' }}>{msg}</Text>
              </View>
            ) : null}

            {/* ══════ 秘书台 ══════ */}
            {tab === 'main' && secretary && (
              <View style={{ gap: 14 }}>
                {/* rank1-2：无秘书提示 */}
                {save.rankLevel < 3 ? (
                  <View style={{ backgroundColor: '#fff', borderWidth: 1, borderColor: '#D1D1CF', padding: 24, alignItems: 'center', gap: 10 }}>
                    <Text style={{ fontSize: 36 }}>🔒</Text>
                    <Text style={{ fontSize: 15, fontWeight: '700', color: '#333', textAlign: 'center' }}>本级别暂无专属秘书</Text>
                    <Text style={{ fontSize: 12, color: '#888', textAlign: 'center', lineHeight: 18 }}>
                      参照现实，乡镇股级、副科级干部一般无配备专属秘书的条件。{'\n'}晋升至正科级镇长（3级）及以上后方可任命。
                    </Text>
                  </View>
                ) : !secretary.isAppointed ? (
                  /* 已达职级但尚未任命秘书 */
                  <View style={{ backgroundColor: '#fff', borderWidth: 1, borderColor: '#D1D1CF', padding: 24, alignItems: 'center', gap: 10 }}>
                    <Text style={{ fontSize: 36 }}>🤵</Text>
                    <Text style={{ fontSize: 15, fontWeight: '700', color: '#333', textAlign: 'center' }}>尚未任命专属秘书</Text>
                    <Text style={{ fontSize: 12, color: '#888', textAlign: 'center', lineHeight: 18 }}>
                      请从下属列表中选择合适人选担任{secCfg.title}。{'\n'}秘书同时在{secCfg.officeTitle}挂职。
                    </Text>
                    <Pressable
                      onPress={() => setTab('appoint')}
                      style={{ backgroundColor: '#1D3B5E', paddingHorizontal: 28, paddingVertical: 12, marginTop: 6 }}
                      android_ripple={{ color: 'rgba(255,255,255,0.15)' }}
                    >
                      <Text style={{ color: '#fff', fontWeight: '700', fontSize: 13 }}>📋 立即任命专属秘书</Text>
                    </Pressable>
                  </View>
                ) : (
                  /* ── 已任命：正常秘书台内容 ── */
                  <View style={{ gap: 14 }}>
                    {/* 秘书信息卡 */}
                    <View style={{ backgroundColor: '#fff', borderWidth: 1, borderColor: '#D1D1CF', padding: 14, flexDirection: 'row', alignItems: 'center', gap: 14 }}>
                      <View style={{ width: 56, height: 56, backgroundColor: '#1D3B5E', justifyContent: 'center', alignItems: 'center' }}>
                        <Text style={{ fontSize: 28 }}>👤</Text>
                      </View>
                      <View style={{ flex: 1 }}>
                        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                          <Text style={{ fontSize: 15, fontWeight: '700', color: '#222' }}>{secretary.name}</Text>
                          <View style={{ backgroundColor: secCfg.badge === '最高' ? '#4a2c8a' : secCfg.badge === '核心' ? '#C82829' : secCfg.badge === '高级' ? '#2a7a3b' : secCfg.badge === '中级' ? '#2B4B6F' : '#7B5E2A', paddingHorizontal: 5, paddingVertical: 1 }}>
                            <Text style={{ color: '#fff', fontSize: 8, fontWeight: '700' }}>{secCfg.badge}</Text>
                          </View>
                        </View>
                        <Text style={{ fontSize: 11, color: '#888', marginTop: 1 }}>{secCfg.title} · {secCfg.officeTitle} {secCfg.subTitle}</Text>
                        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 4 }}>
                          <AbilityBar value={effectiveAbility} />
                        </View>
                        <Text style={{ fontSize: 10, color: '#aaa', marginTop: 2 }}>
                          能力值 {effectiveAbility}/{secCfg.abilityMax}（上限随职级提升）
                        </Text>
                      </View>
                      {/* 解除任命 */}
                      <Pressable
                        onPress={() => void handleRecallSecretary()}
                        disabled={acting}
                        style={{ paddingHorizontal: 8, paddingVertical: 5, borderWidth: 1, borderColor: '#C82829' }}
                      >
                        <Text style={{ color: '#C82829', fontSize: 10, fontWeight: '600' }}>解除</Text>
                      </Pressable>
                    </View>

                    {/* 解锁能力 */}
                    <View style={{ backgroundColor: '#F0F4F8', borderWidth: 1, borderColor: '#D1D1CF', padding: 12 }}>
                      <Text style={{ fontSize: 10, color: '#1D3B5E', fontWeight: '700', letterSpacing: 1, marginBottom: 6 }}>✨ 当前解锁能力</Text>
                      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6 }}>
                        {secCfg.features.map(f => (
                          <View key={f} style={{ backgroundColor: '#1D3B5E', paddingHorizontal: 8, paddingVertical: 3 }}>
                            <Text style={{ color: '#fff', fontSize: 10 }}>{f}</Text>
                          </View>
                        ))}
                      </View>
                      {secCfg.docworkGainBonus > 0 && (
                        <Text style={{ fontSize: 10, color: '#2a7a3b', marginTop: 6 }}>
                          🎖️ 职位加成：公文整理额外获得 +{secCfg.docworkGainBonus} 政绩
                        </Text>
                      )}
                    </View>

                {/* 整理公文 */}
                <View style={{ backgroundColor: '#fff', borderWidth: 1, borderColor: '#D1D1CF', padding: 14 }}>
                  <Text style={{ fontSize: 11, color: '#888', letterSpacing: 2, marginBottom: 8 }}>公文处理</Text>
                  <Text style={{ fontSize: 12, color: '#555', marginBottom: 12, lineHeight: 18 }}>
                    {secCfg.title}协助整理公文，消耗10点能力值，获得 {5 + Math.floor(effectiveAbility / 20) + secCfg.docworkGainBonus} 点政绩。能力值每月自动恢复，上限{secCfg.abilityMax}。
                  </Text>
                  <Pressable
                    onPress={() => void handleDocwork()}
                    disabled={acting || effectiveAbility < 20}
                    style={{ backgroundColor: effectiveAbility >= 20 ? '#1D3B5E' : '#ccc', padding: 13, alignItems: 'center' }}
                    android_ripple={{ color: 'rgba(255,255,255,0.15)' }}
                  >
                    <Text style={{ color: '#fff', fontWeight: '700', fontSize: 13 }}>
                      {effectiveAbility >= 20 ? `整理公文（政绩+${5 + Math.floor(effectiveAbility / 20) + secCfg.docworkGainBonus}）` : '能力不足（需≥20），等待月度恢复'}
                    </Text>
                  </Pressable>
                  {secretary.lastDocworkDay > 0 && (
                    <Text style={{ fontSize: 11, color: '#888', marginTop: 8, textAlign: 'center' }}>上次整理：{gameDaysToDate(secretary.lastDocworkDay)}</Text>
                  )}
                </View>

                {/* 情报汇报（副科级+解锁） */}
                {secCfg.canIntelligence && (
                  <View style={{ backgroundColor: '#fff', borderWidth: 1, borderColor: '#D1D1CF', padding: 14, gap: 8 }}>
                    <Text style={{ fontSize: 11, color: '#888', letterSpacing: 2, marginBottom: 4 }}>情报汇报</Text>
                    {INTEL_ITEMS.map((item, i) => {
                      const done = intelDone.has(i);
                      return (
                        <Pressable
                          key={i}
                          onPress={() => !done && void handleIntel(i)}
                          disabled={done || acting}
                          style={{ flexDirection: 'row', alignItems: 'center', gap: 10, backgroundColor: done ? '#F9F9F9' : '#EEF2F7', padding: 10, opacity: done ? 0.7 : 1 }}
                        >
                          <Text style={{ fontSize: 22 }}>{item.icon}</Text>
                          <View style={{ flex: 1 }}>
                            <Text style={{ fontSize: 13, fontWeight: '700', color: done ? '#999' : '#222' }}>{item.title}</Text>
                            <Text style={{ fontSize: 10, color: '#888', marginTop: 2 }}>{item.desc}</Text>
                            <Text style={{ fontSize: 10, color: '#2a7a3b', marginTop: 2 }}>预期：{item.gain}</Text>
                          </View>
                          {done ? (
                            <Text style={{ fontSize: 10, color: '#888' }}>✓ 已完成</Text>
                          ) : (
                            <View style={{ backgroundColor: '#1D3B5E', paddingHorizontal: 8, paddingVertical: 4 }}>
                              <Text style={{ color: '#fff', fontSize: 11, fontWeight: '700' }}>执行</Text>
                            </View>
                          )}
                        </Pressable>
                      );
                    })}
                  </View>
                )}

                {/* 决策参谋（正处级+解锁） */}
                {secCfg.canCounsel && (
                  <View style={{ backgroundColor: '#fff', borderWidth: 1, borderColor: '#D1D1CF', padding: 14, gap: 8 }}>
                    <Text style={{ fontSize: 11, color: '#888', letterSpacing: 2, marginBottom: 4 }}>决策参谋</Text>
                    <Text style={{ fontSize: 11, color: '#555', lineHeight: 17, marginBottom: 6 }}>
                      {secCfg.title}基于当前形势，为您提供重大事项的专业参谋意见。
                    </Text>
                    {COUNSEL_ITEMS.map((item, i) => {
                      const done = counselDone.has(i);
                      return (
                        <Pressable
                          key={i}
                          onPress={() => !done && void handleCounsel(i)}
                          disabled={done || acting}
                          style={{ flexDirection: 'row', alignItems: 'center', gap: 10, backgroundColor: done ? '#F9F9F9' : '#FFF9E6', padding: 10, opacity: done ? 0.7 : 1 }}
                        >
                          <Text style={{ fontSize: 22 }}>{item.icon}</Text>
                          <View style={{ flex: 1 }}>
                            <Text style={{ fontSize: 13, fontWeight: '700', color: done ? '#999' : '#222' }}>{item.title}</Text>
                            <Text style={{ fontSize: 10, color: '#888', marginTop: 2 }}>{item.desc}</Text>
                            <Text style={{ fontSize: 10, color: '#7B5E2A', marginTop: 2 }}>预期：{item.gain}</Text>
                          </View>
                          {done ? (
                            <Text style={{ fontSize: 10, color: '#888' }}>✓ 已完成</Text>
                          ) : (
                            <View style={{ backgroundColor: '#7B5E2A', paddingHorizontal: 8, paddingVertical: 4 }}>
                              <Text style={{ color: '#fff', fontSize: 11, fontWeight: '700' }}>咨询</Text>
                            </View>
                          )}
                        </Pressable>
                      );
                    })}
                  </View>
                )}

                {/* ── 与秘书交流 ──────────────────────────────── */}
                <View style={{ backgroundColor: '#fff', borderWidth: 1, borderColor: '#D1D1CF', padding: 14, gap: 8 }}>
                  <Text style={{ fontSize: 11, color: '#888', letterSpacing: 2, marginBottom: 4 }}>与秘书交流</Text>
                  <Text style={{ fontSize: 11, color: '#555', lineHeight: 17, marginBottom: 6 }}>
                    与{secCfg.title}进行工作交流，不同话题产生不同效果。
                  </Text>
                  {TALK_TOPICS.map((topic, i) => {
                    const isSel = selectedTopic === i;
                    return (
                      <Pressable
                        key={i}
                        onPress={() => setSelectedTopic(isSel ? null : i)}
                        style={{ flexDirection: 'row', alignItems: 'center', gap: 10, padding: 10, borderWidth: 1.5, borderColor: isSel ? '#1D3B5E' : '#E0E0E0', backgroundColor: isSel ? '#EEF2F7' : '#fafafa' }}
                      >
                        <Text style={{ fontSize: 22 }}>{topic.icon}</Text>
                        <View style={{ flex: 1 }}>
                          <Text style={{ fontSize: 13, fontWeight: '700', color: isSel ? '#1D3B5E' : '#222' }}>{topic.label}</Text>
                          <Text style={{ fontSize: 10, color: '#888', marginTop: 2 }}>{topic.desc}</Text>
                          <Text style={{ fontSize: 10, color: topic.loyaltyDelta > 0 ? '#2a7a3b' : '#C82829', marginTop: 2 }}>
                            政绩 {topic.loyaltyDelta > 0 ? `+${topic.loyaltyDelta}` : topic.loyaltyDelta}
                          </Text>
                        </View>
                        {isSel && (
                          <View style={{ width: 18, height: 18, borderRadius: 9, backgroundColor: '#1D3B5E', alignItems: 'center', justifyContent: 'center' }}>
                            <Text style={{ color: '#fff', fontSize: 10, fontWeight: '700' }}>✓</Text>
                          </View>
                        )}
                      </Pressable>
                    );
                  })}
                  {selectedTopic !== null && (
                    <Pressable
                      onPress={async () => {
                        if (acting) return;
                        const topic = TALK_TOPICS[selectedTopic];
                        setActing(true);
                        const delta = topic.loyaltyDelta;
                        await updateGameSave({ meritPoints: save.meritPoints + Math.max(0, delta) });
                        await refreshSave();
                        showMsg(delta > 0
                          ? `✅ 「${topic.label}」交流完成，政绩+${delta}`
                          : `⚠️ 「${topic.label}」反馈不佳，注意处理关系`);
                        setSelectedTopic(null);
                        setActing(false);
                      }}
                      disabled={acting}
                      style={{ backgroundColor: '#1D3B5E', padding: 12, alignItems: 'center', marginTop: 4 }}
                      android_ripple={{ color: 'rgba(255,255,255,0.15)' }}
                    >
                      <Text style={{ color: '#fff', fontWeight: '700', fontSize: 13 }}>
                        {acting ? '处理中…' : `💬 执行「${TALK_TOPICS[selectedTopic].label}」`}
                      </Text>
                    </Pressable>
                  )}
                </View>

                {/* ── 上下协调（副科级rank3+解锁） ─────────────── */}
                {save.rankLevel >= 3 && (
                  <View style={{ backgroundColor: '#fff', borderWidth: 1, borderColor: '#D1D1CF', padding: 14, gap: 8 }}>
                    <Text style={{ fontSize: 11, color: '#888', letterSpacing: 2, marginBottom: 4 }}>上下协调</Text>
                    <Text style={{ fontSize: 11, color: '#555', lineHeight: 17, marginBottom: 4 }}>
                      由{secCfg.title}代为联络上下级，疏通工作关系，推动重点事项落实。
                    </Text>
                    {[
                      { icon: '📞', title: '联络上级部门', desc: '请秘书代为联络上级主管部门，传递工作诉求', effect: '上司好感+2，政绩+3', key: 'contact_boss' },
                      { icon: '📋', title: '协调平级单位', desc: '与同级单位沟通协调，消除工作阻碍', effect: '政绩+4', key: 'contact_peer' },
                      { icon: '🏢', title: '指导下级工作', desc: '通过秘书渠道向下级传达工作指示', effect: '政绩+5，稳定+2', key: 'contact_sub' },
                    ].map((item, i) => (
                      <Pressable
                        key={item.key}
                        onPress={async () => {
                          if (acting) return;
                          setActing(true);
                          const meritMap: Record<string, number> = { contact_boss: 3, contact_peer: 4, contact_sub: 5 };
                          const favorMap: Record<string, number> = { contact_boss: 2, contact_peer: 0, contact_sub: 0 };
                          await updateGameSave({
                            meritPoints: save.meritPoints + (meritMap[item.key] ?? 3),
                            ...(favorMap[item.key] ? { bossFavor: Math.min(100, (save.bossFavor ?? 50) + favorMap[item.key]) } : {}),
                          });
                          await refreshSave();
                          showMsg(`✅ ${item.title}完成，${item.effect}`);
                          setActing(false);
                        }}
                        disabled={acting}
                        style={{ flexDirection: 'row', alignItems: 'center', gap: 10, padding: 10, backgroundColor: '#EEF2F7' }}
                        android_ripple={{ color: 'rgba(0,0,0,0.05)' }}
                      >
                        <Text style={{ fontSize: 22 }}>{item.icon}</Text>
                        <View style={{ flex: 1 }}>
                          <Text style={{ fontSize: 13, fontWeight: '700', color: '#1D3B5E' }}>{item.title}</Text>
                          <Text style={{ fontSize: 10, color: '#888', marginTop: 2 }}>{item.desc}</Text>
                          <Text style={{ fontSize: 10, color: '#2a7a3b', marginTop: 2 }}>预期：{item.effect}</Text>
                        </View>
                        <View style={{ backgroundColor: '#1D3B5E', paddingHorizontal: 8, paddingVertical: 4 }}>
                          <Text style={{ color: '#fff', fontSize: 11, fontWeight: '700' }}>执行</Text>
                        </View>
                      </Pressable>
                    ))}
                  </View>
                )}

                {/* ── 接待安排（副处级rank7+解锁） ─────────────── */}
                {save.rankLevel >= 7 && (
                  <View style={{ backgroundColor: '#fff', borderWidth: 1, borderColor: '#D1D1CF', padding: 14, gap: 8 }}>
                    <Text style={{ fontSize: 11, color: '#888', letterSpacing: 2, marginBottom: 4 }}>接待安排</Text>
                    <Text style={{ fontSize: 11, color: '#555', lineHeight: 17, marginBottom: 4 }}>
                      {secCfg.title}负责统筹安排上级来访接待、重要客商迎接等事宜，展示地方形象。
                    </Text>
                    {[
                      { icon: '🏛️', title: '上级领导来访接待', desc: '精心安排上级领导考察参观，展示辖区亮点成效', effect: '上司好感+4，政绩+6' },
                      { icon: '🤝', title: '重要客商商务接待', desc: '高规格接待意向投资客商，助力招商引资工作', effect: '政绩+8，GDP+1' },
                      { icon: '🌐', title: '友好交流访问接待', desc: '接待兄弟省市代表团，加强区域协作联络', effect: '政绩+5，营商+1' },
                    ].map((item, i) => (
                      <Pressable
                        key={i}
                        onPress={async () => {
                          if (acting) return;
                          setActing(true);
                          const meritArr = [6, 8, 5];
                          const favorArr = [4, 0, 0];
                          const gdpArr   = [0, 1, 0];
                          const bizArr   = [0, 0, 1];
                          await updateGameSave({
                            meritPoints: save.meritPoints + meritArr[i],
                            ...(favorArr[i]  ? { bossFavor:    Math.min(100, (save.bossFavor ?? 50) + favorArr[i]) } : {}),
                            ...(gdpArr[i]    ? { cityGdp:      Math.min(100, (save.cityGdp ?? 50) + gdpArr[i]) } : {}),
                            ...(bizArr[i]    ? { cityBusiness: Math.min(100, (save.cityBusiness ?? 50) + bizArr[i]) } : {}),
                          });
                          await refreshSave();
                          showMsg(`✅ ${item.title}顺利完成，${item.effect}`);
                          setActing(false);
                        }}
                        disabled={acting}
                        style={{ flexDirection: 'row', alignItems: 'center', gap: 10, padding: 10, backgroundColor: '#FFF9E6' }}
                        android_ripple={{ color: 'rgba(0,0,0,0.05)' }}
                      >
                        <Text style={{ fontSize: 22 }}>{item.icon}</Text>
                        <View style={{ flex: 1 }}>
                          <Text style={{ fontSize: 13, fontWeight: '700', color: '#7B5E2A' }}>{item.title}</Text>
                          <Text style={{ fontSize: 10, color: '#888', marginTop: 2 }}>{item.desc}</Text>
                          <Text style={{ fontSize: 10, color: '#2a7a3b', marginTop: 2 }}>预期：{item.effect}</Text>
                        </View>
                        <View style={{ backgroundColor: '#7B5E2A', paddingHorizontal: 8, paddingVertical: 4 }}>
                          <Text style={{ color: '#fff', fontSize: 11, fontWeight: '700' }}>安排</Text>
                        </View>
                      </Pressable>
                    ))}
                  </View>
                )}

                {/* ── 安排日程 ─────────────────────────────────── */}
                <View style={{ backgroundColor: '#fff', borderWidth: 1, borderColor: '#D1D1CF', padding: 14 }}>
                  <Text style={{ fontSize: 11, color: '#888', letterSpacing: 2, marginBottom: 8 }}>今日日程</Text>
                  <TextInput
                    value={scheduleText}
                    onChangeText={setScheduleText}
                    multiline
                    numberOfLines={6}
                    placeholder="输入今日日程安排…"
                    placeholderTextColor="#aaa"
                    style={{ borderWidth: 1, borderColor: '#D1D1CF', padding: 10, fontSize: 12, color: '#222', lineHeight: 20, minHeight: 130, textAlignVertical: 'top', backgroundColor: '#fafafa', marginBottom: 8 }}
                  />
                  <View style={{ flexDirection: 'row', gap: 8, marginBottom: 8 }}>
                    {SCHEDULE_TEMPLATES.map((tpl, i) => (
                      <Pressable key={i} onPress={() => setScheduleText(tpl)} style={{ flex: 1, backgroundColor: '#EEF2F7', padding: 6, alignItems: 'center' }}>
                        <Text style={{ fontSize: 10, color: '#1D3B5E' }}>模板{i + 1}</Text>
                      </Pressable>
                    ))}
                  </View>
                  <Pressable
                    onPress={() => void handleSaveSchedule()}
                    disabled={acting}
                    style={{ backgroundColor: '#1D3B5E', padding: 11, alignItems: 'center' }}
                    android_ripple={{ color: 'rgba(255,255,255,0.15)' }}
                  >
                    <Text style={{ color: '#fff', fontWeight: '700', fontSize: 12 }}>保存日程</Text>
                  </Pressable>
                </View>
                  </View>
                )}
              </View>
            )}

            {/* ══════ 任命专属秘书 ══════ */}
            {tab === 'appoint' && (
              <View style={{ gap: 14 }}>
                {/* 确认任命（置于最上方） */}
                <Pressable
                  onPress={() => void handleAppointSub()}
                  disabled={acting || !appointSub}
                  style={{ backgroundColor: appointSub ? '#1D3B5E' : '#ccc', padding: 14, alignItems: 'center' }}
                  android_ripple={{ color: 'rgba(255,255,255,0.15)' }}
                >
                  <Text style={{ color: '#fff', fontWeight: '700', fontSize: 14 }}>
                    {acting ? '任命中…' : appointSub ? `📋 任命 ${appointSub.name} 为${secCfg.title}` : '请从下方选择人选'}
                  </Text>
                </Pressable>
                <View style={{ backgroundColor: '#EEF2F7', borderWidth: 1, borderColor: '#D0DCE8', padding: 10 }}>
                  <Text style={{ fontSize: 11, color: '#1D3B5E', lineHeight: 17 }}>
                    👔 从在职下属中选择合适人选担任{secCfg.title}，同时挂职于{secCfg.officeTitle}。
                    {'\n'}秘书任职期间仍保留原有下属身份，可随时更换或调任官职。
                  </Text>
                </View>
                {/* 当前秘书提示 */}
                {secretary?.isAppointed && (
                  <View style={{ backgroundColor: '#fff9e6', borderWidth: 1, borderColor: '#f0c040', padding: 10 }}>
                    <Text style={{ fontSize: 11, color: '#7B5E2A', lineHeight: 17 }}>
                      ⚠️ 当前已任命 <Text style={{ fontWeight: '700' }}>{secretary.name}</Text> 为专属秘书。选择新人选后将自动替换。
                    </Text>
                  </View>
                )}
                {/* 下属候选列表 */}
                <View style={{ backgroundColor: '#fff', borderWidth: 1, borderColor: '#D1D1CF', padding: 14 }}>
                  <Text style={{ fontSize: 11, color: '#888', letterSpacing: 2, marginBottom: 10 }}>选择秘书人选</Text>
                  {subordinates.filter(s => !s.transferredCity && s.id !== secretary?.subId).length === 0 ? (
                    <View style={{ paddingVertical: 20, alignItems: 'center' }}>
                      <Text style={{ fontSize: 13, color: '#aaa' }}>暂无可任命的下属</Text>
                    </View>
                  ) : (
                    <FlatList
                      data={subordinates.filter(s => !s.transferredCity && s.id !== secretary?.subId)}
                      keyExtractor={s => s.id}
                      scrollEnabled={false}
                      ItemSeparatorComponent={() => <View style={{ height: 1, backgroundColor: '#F0F0F0' }} />}
                      renderItem={({ item: s }) => {
                        const isSel = appointSub?.id === s.id;
                        return (
                          <Pressable
                            onPress={() => setAppointSub(isSel ? null : s)}
                            style={{ flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 12, paddingHorizontal: 8, backgroundColor: isSel ? '#EEF2F7' : '#fff' }}
                          >
                            <View style={{ width: 40, height: 40, backgroundColor: isSel ? '#1D3B5E' : '#D1D1CF', alignItems: 'center', justifyContent: 'center' }}>
                              <Text style={{ fontSize: 20 }}>👤</Text>
                            </View>
                            <View style={{ flex: 1 }}>
                              <Text style={{ fontSize: 14, fontWeight: isSel ? '700' : '400', color: isSel ? '#1D3B5E' : '#222' }}>{s.name}</Text>
                              <Text style={{ fontSize: 10, color: '#888', marginTop: 2 }}>
                                {s.appointedRole ?? '待分配'} · 能力 {s.ability} · 忠诚 {s.loyalty}
                              </Text>
                              <Text style={{ fontSize: 10, color: '#aaa', marginTop: 1 }}>
                                {s.appointedDept ? getDeptNameByRank(s.appointedDept, save.rankLevel) : '无归属部门'}
                              </Text>
                            </View>
                            {isSel && (
                              <View style={{ width: 20, height: 20, borderRadius: 10, backgroundColor: '#1D3B5E', alignItems: 'center', justifyContent: 'center' }}>
                                <Text style={{ color: '#fff', fontSize: 12, fontWeight: '700' }}>✓</Text>
                              </View>
                            )}
                          </Pressable>
                        );
                      }}
                    />
                  )}
                </View>
              </View>
            )}

            {/* ══════ 调任官职（秘书→领导班子职位） ══════ */}
            {tab === 'transfer' && secretary?.isAppointed && (
              <View style={{ gap: 14 }}>
                <View style={{ backgroundColor: '#EEF2F7', borderWidth: 1, borderColor: '#D0DCE8', padding: 10 }}>
                  <Text style={{ fontSize: 11, color: '#1D3B5E', lineHeight: 17 }}>
                    🔄 根据代会任命程序，可将专属秘书调任为领导班子正式职位。{'\n'}
                    调任后秘书职位自动空缺，可重新任命新人选。
                  </Text>
                </View>
                {/* 当前秘书 */}
                <View style={{ backgroundColor: '#fff', borderWidth: 1, borderColor: '#D1D1CF', padding: 12, flexDirection: 'row', alignItems: 'center', gap: 12 }}>
                  <View style={{ width: 44, height: 44, backgroundColor: '#1D3B5E', alignItems: 'center', justifyContent: 'center' }}>
                    <Text style={{ fontSize: 22 }}>👤</Text>
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={{ fontSize: 14, fontWeight: '700', color: '#1D3B5E' }}>{secretary.name}</Text>
                    <Text style={{ fontSize: 11, color: '#888', marginTop: 2 }}>{secCfg.title} · {secCfg.officeTitle}</Text>
                  </View>
                  <View style={{ backgroundColor: '#1D3B5E', paddingHorizontal: 8, paddingVertical: 3 }}>
                    <Text style={{ color: '#fff', fontSize: 10, fontWeight: '700' }}>待调任</Text>
                  </View>
                </View>
                {/* 可调任的官职列表 */}
                <View style={{ backgroundColor: '#fff', borderWidth: 1, borderColor: '#D1D1CF', padding: 14 }}>
                  <Text style={{ fontSize: 11, color: '#888', letterSpacing: 2, marginBottom: 10 }}>选择目标职位（本级代会任命职务）</Text>
                  {(LEADERSHIP_ROLES[save.rankLevel] ?? []).length === 0 ? (
                    <View style={{ paddingVertical: 20, alignItems: 'center' }}>
                      <Text style={{ fontSize: 13, color: '#aaa' }}>本级无可调任职位</Text>
                    </View>
                  ) : (
                    (LEADERSHIP_ROLES[save.rankLevel] ?? []).map(role => {
                      const isSel = transferRoleKey === role.key;
                      return (
                        <Pressable
                          key={role.key}
                          onPress={() => setTransferRoleKey(isSel ? null : role.key)}
                          style={{ flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 10, paddingHorizontal: 8, marginBottom: 4, borderWidth: 1.5, borderColor: isSel ? '#C82829' : '#E0E0E0', backgroundColor: isSel ? '#fff5f5' : '#fafafa' }}
                        >
                          <View style={{ width: 16, height: 16, borderRadius: 8, borderWidth: 2, borderColor: isSel ? '#C82829' : '#ccc', backgroundColor: isSel ? '#C82829' : '#fff', alignItems: 'center', justifyContent: 'center' }}>
                            {isSel && <View style={{ width: 6, height: 6, borderRadius: 3, backgroundColor: '#fff' }} />}
                          </View>
                          <View style={{ flex: 1 }}>
                            <Text style={{ fontSize: 13, fontWeight: isSel ? '700' : '400', color: isSel ? '#C82829' : '#222' }}>
                              {role.label}
                              <Text style={{ fontSize: 10, color: '#888', fontWeight: '400' }}>  {role.tierLabel}</Text>
                            </Text>
                            {role.concurrentLabel && (
                              <Text style={{ fontSize: 10, color: '#888', marginTop: 2 }}>{role.concurrentLabel}</Text>
                            )}
                          </View>
                          <View style={{ backgroundColor: '#EEF2F7', paddingHorizontal: 6, paddingVertical: 2 }}>
                            <Text style={{ fontSize: 9, color: '#1D3B5E' }}>需职级≥{role.requiredSubLevel}</Text>
                          </View>
                        </Pressable>
                      );
                    })
                  )}
                </View>
                {/* 确认调任 */}
                <Pressable
                  onPress={() => void handleTransferSecretary()}
                  disabled={acting || !transferRoleKey}
                  style={{ backgroundColor: transferRoleKey ? '#C82829' : '#ccc', padding: 14, alignItems: 'center' }}
                  android_ripple={{ color: 'rgba(255,255,255,0.2)' }}
                >
                  <Text style={{ color: '#fff', fontWeight: '700', fontSize: 14 }}>
                    {acting ? '调任中…' : transferRoleKey
                      ? `🏛️ 调任 ${secretary.name} → ${(LEADERSHIP_ROLES[save.rankLevel] ?? []).find(r => r.key === transferRoleKey)?.label ?? ''}`
                      : '请从上方选择目标职位'}
                  </Text>
                </Pressable>
              </View>
            )}

            {/* ══════ 待办提醒 ══════ */}
            {tab === 'todo' && (
              <View style={{ backgroundColor: '#fff', borderWidth: 1, borderColor: '#D1D1CF', padding: 14 }}>
                <Text style={{ fontSize: 11, color: '#888', letterSpacing: 2, marginBottom: 12 }}>
                  待办事项 — 由{secretary?.name ?? '办公室'}整理
                </Text>
                {todos.length === 0 ? (
                  <View style={{ paddingVertical: 24, alignItems: 'center' }}>
                    <Text style={{ fontSize: 32, marginBottom: 8 }}>✅</Text>
                    <Text style={{ fontSize: 14, color: '#2a7a3b', fontWeight: '600' }}>暂无待办事项</Text>
                    <Text style={{ fontSize: 11, color: '#aaa', marginTop: 4 }}>各项工作均已处理，继续保持！</Text>
                  </View>
                ) : todos.map((t, i) => (
                  <Pressable
                    key={i}
                    onPress={() => t.link && router.push(t.link as never)}
                    style={{ flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 12, borderTopWidth: i > 0 ? 1 : 0, borderTopColor: '#f0f0f0' }}
                  >
                    <View style={{ width: 32, height: 32, backgroundColor: t.urgent ? '#ffebee' : '#EEF2F7', alignItems: 'center', justifyContent: 'center' }}>
                      <Text style={{ fontSize: 16 }}>{t.icon}</Text>
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={{ fontSize: 13, color: t.urgent ? '#C82829' : '#333', fontWeight: t.urgent ? '700' : '400' }}>{t.text}</Text>
                      {t.link && <Text style={{ fontSize: 10, color: '#888', marginTop: 2 }}>点击前往处理 ›</Text>}
                    </View>
                    {t.urgent && (
                      <View style={{ backgroundColor: '#C82829', paddingHorizontal: 6, paddingVertical: 2 }}>
                        <Text style={{ color: '#fff', fontSize: 9, fontWeight: '700' }}>紧急</Text>
                      </View>
                    )}
                  </Pressable>
                ))}
              </View>
            )}

            {/* ══════ 报告摘要 ══════ */}
            {tab === 'report' && (
              <>
                <View style={{ backgroundColor: '#EEF2F7', borderWidth: 1, borderColor: '#D0DCE8', padding: 10 }}>
                  <Text style={{ fontSize: 11, color: '#1D3B5E', lineHeight: 17 }}>
                    📄 {secretary?.name ?? '办公室'}为您整理了最近 {Math.min(reports.length, 6)} 份月度工作报告摘要，点击可查看详情。
                  </Text>
                </View>
                {reports.length === 0 ? (
                  <View style={{ backgroundColor: '#fff', borderWidth: 1, borderColor: '#D1D1CF', padding: 24, alignItems: 'center' }}>
                    <Text style={{ fontSize: 32, marginBottom: 8 }}>📭</Text>
                    <Text style={{ fontSize: 14, color: '#888' }}>暂无月度报告</Text>
                    <Text style={{ fontSize: 11, color: '#aaa', marginTop: 4 }}>每月结算后自动生成工作报告</Text>
                  </View>
                ) : reports.slice(0, 6).map(r => {
                  const isGood = r.meritReward >= 30;
                  return (
                    <Pressable
                      key={r.id}
                      onPress={() => router.push('/(app)/monthly-report')}
                      style={{ backgroundColor: '#fff', borderWidth: 1, borderColor: isGood ? '#c8e6c9' : '#D1D1CF', padding: 14 }}
                    >
                      <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
                        <Text style={{ fontSize: 13, fontWeight: '700', color: '#222' }}>第{r.monthKey}月工作报告</Text>
                        <View style={{ backgroundColor: isGood ? '#2a7a3b' : '#888', paddingHorizontal: 8, paddingVertical: 2 }}>
                          <Text style={{ color: '#fff', fontSize: 10, fontWeight: '700' }}>政绩+{r.meritReward}</Text>
                        </View>
                      </View>
                      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6 }}>
                        {r.gdpChange !== 0 && <View style={{ backgroundColor: '#EEF2F7', paddingHorizontal: 6, paddingVertical: 2 }}><Text style={{ fontSize: 10, color: '#1D2D44' }}>GDP {r.gdpChange > 0 ? '+' : ''}{r.gdpChange}</Text></View>}
                        {r.livelihoodChange !== 0 && <View style={{ backgroundColor: '#e8f5e9', paddingHorizontal: 6, paddingVertical: 2 }}><Text style={{ fontSize: 10, color: '#2a7a3b' }}>民生 {r.livelihoodChange > 0 ? '+' : ''}{r.livelihoodChange}</Text></View>}
                        {r.ecologyChange !== 0 && <View style={{ backgroundColor: '#e8f5e9', paddingHorizontal: 6, paddingVertical: 2 }}><Text style={{ fontSize: 10, color: '#2a7a3b' }}>生态 {r.ecologyChange > 0 ? '+' : ''}{r.ecologyChange}</Text></View>}
                        {r.businessChange !== 0 && <View style={{ backgroundColor: '#EEF2F7', paddingHorizontal: 6, paddingVertical: 2 }}><Text style={{ fontSize: 10, color: '#1D2D44' }}>营商 {r.businessChange > 0 ? '+' : ''}{r.businessChange}</Text></View>}
                      </View>
                      <Text style={{ fontSize: 10, color: '#aaa', marginTop: 6 }}>第{r.yearKey}年 · 点击查看完整报告 ›</Text>
                    </Pressable>
                  );
                })}
                {reports.length > 6 && (
                  <Pressable onPress={() => router.push('/(app)/monthly-report')} style={{ backgroundColor: '#fff', borderWidth: 1, borderColor: '#D1D1CF', padding: 12, alignItems: 'center' }}>
                    <Text style={{ fontSize: 12, color: '#1D3B5E', fontWeight: '600' }}>查看全部 {reports.length} 份报告 ›</Text>
                  </Pressable>
                )}
              </>
            )}

            {/* ══════ 起草文件 ══════ */}
            {tab === 'draft' && (() => {
              const currentTier = getRankTier(save.rankLevel);
              // 当前职级及下一档可预览（锁定展示）
              const visible = DRAFT_TEMPLATES.filter(t => t.tier <= currentTier + 1);
              return (
                <View style={{ gap: 14 }}>
                  {/* 说明栏 */}
                  <View style={{ backgroundColor: '#EEF2F7', borderWidth: 1, borderColor: '#D0DCE8', padding: 10, flexDirection: 'row', gap: 8, alignItems: 'flex-start' }}>
                    <Text style={{ fontSize: 18 }}>✍️</Text>
                    <View style={{ flex: 1 }}>
                      <Text style={{ fontSize: 12, color: '#1D3B5E', fontWeight: '700', marginBottom: 2 }}>{secretary?.name ?? '办公室'} 协助起草公文</Text>
                      <Text style={{ fontSize: 11, color: '#4A6080', lineHeight: 17 }}>
                        当前{TIER_LABEL[currentTier]}可用{visible.filter(t => t.tier === currentTier).length}种公文。随职级晋升解锁更高规格文件，定稿后效果立即生效，每份本轮限发一次。
                      </Text>
                    </View>
                  </View>

                  {/* 按 tier 分组展示 */}
                  {([1, 2, 3, 4, 5] as const).filter(tier => visible.some(t => t.tier === tier)).map(tier => {
                    const tierItems = visible.filter(t => t.tier === tier);
                    const isLocked = tier > currentTier;
                    const tierColors = { 1: '#5C8A5C', 2: '#5C7A9A', 3: '#8A5C5C', 4: '#7A5C8A', 5: '#8A6A2A' };
                    const tierColor = tierColors[tier] ?? '#666';
                    return (
                      <View key={tier} style={{ gap: 6 }}>
                        {/* 职级档位标题 */}
                        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: 2 }}>
                          <View style={{ flex: 1, height: 1, backgroundColor: isLocked ? '#E0E0E0' : tierColor, opacity: 0.4 }} />
                          <View style={{ backgroundColor: isLocked ? '#F0F0F0' : tierColor, paddingHorizontal: 8, paddingVertical: 2, borderRadius: 3, flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                            {isLocked && <Text style={{ fontSize: 10 }}>🔒</Text>}
                            <Text style={{ fontSize: 10, color: isLocked ? '#bbb' : '#fff', fontWeight: '700' }}>{TIER_LABEL[tier]}</Text>
                          </View>
                          <View style={{ flex: 1, height: 1, backgroundColor: isLocked ? '#E0E0E0' : tierColor, opacity: 0.4 }} />
                        </View>

                        {tierItems.map((tpl, _idx) => {
                          const i = DRAFT_TEMPLATES.indexOf(tpl);
                          const done = draftDone.has(i);
                          const isSelected = draftIdx === i;
                          return (
                            <Pressable
                              key={i}
                              onPress={() => { if (!done && !isLocked) handleSelectDraft(i); }}
                              style={{ borderWidth: 1, borderColor: isSelected ? '#C82829' : done ? '#E8E8E8' : isLocked ? '#E8E8E8' : '#D1D1CF', backgroundColor: isSelected ? '#fff5f5' : done ? '#f7f7f7' : '#fafafa', padding: 10, flexDirection: 'row', alignItems: 'center', gap: 8, opacity: isLocked ? 0.5 : 1 }}
                              android_ripple={{ color: 'rgba(0,0,0,0.05)' }}
                              disabled={isLocked}
                            >
                              <Text style={{ fontSize: 18 }}>{tpl.icon}</Text>
                              <View style={{ flex: 1 }}>
                                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                                  <Text style={{ fontSize: 12, color: isLocked ? '#bbb' : isSelected ? '#C82829' : done ? '#999' : '#222', fontWeight: isSelected ? '700' : '500', flex: 1 }}>{tpl.title}</Text>
                                  <View style={{ backgroundColor: isSelected ? '#fff0f0' : '#F0F4F8', paddingHorizontal: 5, paddingVertical: 1, borderRadius: 3 }}>
                                    <Text style={{ fontSize: 9, color: isSelected ? '#C82829' : '#5A7A9A', fontWeight: '600' }}>{tpl.category}</Text>
                                  </View>
                                </View>
                                <Text style={{ fontSize: 10, color: isLocked ? '#ccc' : isSelected ? '#C82829' : done ? '#aaa' : '#888', marginTop: 2 }}>
                                  {isLocked ? `晋升${TIER_LABEL[tier]}后解锁` : done ? '✓ 本轮已发文' : `效果：${tpl.effect.label}`}
                                </Text>
                              </View>
                              {done && !isLocked && <Text style={{ fontSize: 11, color: '#bbb' }}>已发✓</Text>}
                            </Pressable>
                          );
                        })}
                      </View>
                    );
                  })}

                  {/* 编辑区 + 效果预览 + 定稿按钮 */}
                  {draftIdx !== null && !draftDone.has(draftIdx) && (
                    <View style={{ backgroundColor: '#fff', borderWidth: 1, borderColor: '#D1D1CF', padding: 14, gap: 10 }}>
                      <View style={{ backgroundColor: '#FFF8EC', borderWidth: 1, borderColor: '#F0D080', padding: 8, flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                        <Text style={{ fontSize: 14 }}>⚡</Text>
                        <View style={{ flex: 1 }}>
                          <Text style={{ fontSize: 10, color: '#7A5C00', fontWeight: '700' }}>定稿后立即生效</Text>
                          <Text style={{ fontSize: 11, color: '#A07800', marginTop: 1 }}>{DRAFT_TEMPLATES[draftIdx].effect.label}</Text>
                        </View>
                      </View>
                      {(DRAFT_TEMPLATES[draftIdx].effect.subLoyaltyGain || DRAFT_TEMPLATES[draftIdx].effect.subAbilityGain || DRAFT_TEMPLATES[draftIdx].effect.subIntegrityGain) && (
                        <View style={{ backgroundColor: '#F0FBF4', borderWidth: 1, borderColor: '#B0DCC0', padding: 8, flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                          <Text style={{ fontSize: 14 }}>👥</Text>
                          <Text style={{ fontSize: 11, color: '#1A6B3A' }}>
                            将对 <Text style={{ fontWeight: '700' }}>{subordinates.filter(s => s.isAppointed).length} 名在职下属</Text> 生效
                            {DRAFT_TEMPLATES[draftIdx].effect.subLoyaltyGain ? `，忠诚+${DRAFT_TEMPLATES[draftIdx].effect.subLoyaltyGain}` : ''}
                            {DRAFT_TEMPLATES[draftIdx].effect.subAbilityGain ? `，能力+${DRAFT_TEMPLATES[draftIdx].effect.subAbilityGain}` : ''}
                            {DRAFT_TEMPLATES[draftIdx].effect.subIntegrityGain ? `，廉洁+${DRAFT_TEMPLATES[draftIdx].effect.subIntegrityGain}` : ''}
                          </Text>
                        </View>
                      )}
                      <Text style={{ fontSize: 11, color: '#888', letterSpacing: 1 }}>编辑正文（可修改后定稿）</Text>
                      <TextInput
                        value={draftContent}
                        onChangeText={setDraftContent}
                        multiline
                        style={{ borderWidth: 1, borderColor: '#D1D1CF', padding: 10, fontSize: 12, color: '#222', lineHeight: 20, minHeight: 220, textAlignVertical: 'top', backgroundColor: '#fafafa' }}
                      />
                      <Pressable
                        onPress={() => void handleDraftSubmit()}
                        disabled={acting}
                        style={{ backgroundColor: acting ? '#aaa' : '#C82829', padding: 13, alignItems: 'center' }}
                        android_ripple={{ color: 'rgba(255,255,255,0.2)' }}
                      >
                        <Text style={{ color: '#fff', fontWeight: '700', fontSize: 13 }}>
                          {acting ? '报送中…' : '📤 定稿并正式报送'}
                        </Text>
                      </Pressable>
                    </View>
                  )}
                  {draftIdx !== null && draftDone.has(draftIdx) && (
                    <View style={{ backgroundColor: '#f0faf3', borderWidth: 1, borderColor: '#2a7a3b', padding: 12, flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                      <Text style={{ fontSize: 18 }}>✅</Text>
                      <Text style={{ fontSize: 12, color: '#2a7a3b', flex: 1 }}>「{DRAFT_TEMPLATES[draftIdx].title}」已报送归档，本轮效果已生效。</Text>
                    </View>
                  )}
                </View>
              );
            })()}

            {/* ══════ 辅助申请 ══════ */}
            {tab === 'apply' && (() => {
              const currentTier = getRankTier(save.rankLevel);
              const visible = APPLY_TYPES.filter(a => a.tier <= currentTier + 1);
              return (
                <View style={{ gap: 14 }}>
                  <View style={{ backgroundColor: '#EEF2F7', borderWidth: 1, borderColor: '#D0DCE8', padding: 10, flexDirection: 'row', gap: 8, alignItems: 'flex-start' }}>
                    <Text style={{ fontSize: 18 }}>🏛️</Text>
                    <View style={{ flex: 1 }}>
                      <Text style={{ fontSize: 12, color: '#1D3B5E', fontWeight: '700', marginBottom: 2 }}>{secretary?.name ?? '办公室'} 协助处理行政申请</Text>
                      <Text style={{ fontSize: 11, color: '#4A6080', lineHeight: 17 }}>
                        当前{TIER_LABEL[currentTier]}可申请{visible.filter(a => a.tier === currentTier).length}种事项，晋升后解锁更高规格申请。各类申请本轮各限一次。
                      </Text>
                    </View>
                  </View>

                  {([1, 2, 3, 4, 5] as const).filter(tier => visible.some(a => a.tier === tier)).map(tier => {
                    const tierItems = visible.filter(a => a.tier === tier);
                    const isLocked = tier > currentTier;
                    const tierColors = { 1: '#5C8A5C', 2: '#5C7A9A', 3: '#8A5C5C', 4: '#7A5C8A', 5: '#8A6A2A' };
                    const tierColor = tierColors[tier] ?? '#666';
                    return (
                      <View key={tier} style={{ gap: 8 }}>
                        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: 2 }}>
                          <View style={{ flex: 1, height: 1, backgroundColor: isLocked ? '#E0E0E0' : tierColor, opacity: 0.4 }} />
                          <View style={{ backgroundColor: isLocked ? '#F0F0F0' : tierColor, paddingHorizontal: 8, paddingVertical: 2, borderRadius: 3, flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                            {isLocked && <Text style={{ fontSize: 10 }}>🔒</Text>}
                            <Text style={{ fontSize: 10, color: isLocked ? '#bbb' : '#fff', fontWeight: '700' }}>{TIER_LABEL[tier]}</Text>
                          </View>
                          <View style={{ flex: 1, height: 1, backgroundColor: isLocked ? '#E0E0E0' : tierColor, opacity: 0.4 }} />
                        </View>

                        {tierItems.map((ap) => {
                          const i = APPLY_TYPES.indexOf(ap);
                          const done = applyDone.has(i);
                          const srPct = Math.round(ap.successRate * 100);
                          return (
                            <View key={i} style={{ backgroundColor: '#fff', borderWidth: 1, borderColor: done ? '#E8E8E8' : isLocked ? '#ECECEC' : '#D1D1CF', overflow: 'hidden', opacity: isLocked ? 0.55 : 1 }}>
                              <View style={{ flexDirection: 'row', alignItems: 'flex-start', padding: 12, gap: 10 }}>
                                <Text style={{ fontSize: 26, marginTop: 2 }}>{ap.icon}</Text>
                                <View style={{ flex: 1 }}>
                                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 3 }}>
                                    <Text style={{ fontSize: 13, fontWeight: '700', color: isLocked ? '#bbb' : done ? '#999' : '#1A1A1A', flex: 1 }}>{ap.title}</Text>
                                    <View style={{ backgroundColor: '#F0F4F8', paddingHorizontal: 5, paddingVertical: 1, borderRadius: 3 }}>
                                      <Text style={{ fontSize: 9, color: '#5A7A9A', fontWeight: '600' }}>{ap.category}</Text>
                                    </View>
                                  </View>
                                  <Text style={{ fontSize: 11, color: isLocked ? '#ccc' : '#888', lineHeight: 16 }}>{ap.desc}</Text>
                                  {isLocked && (
                                    <Text style={{ fontSize: 10, color: '#C0A050', marginTop: 3 }}>🔒 晋升{TIER_LABEL[tier]}后可申请</Text>
                                  )}
                                </View>
                              </View>

                              {!isLocked && (
                                <View style={{ backgroundColor: '#F8F9FB', borderTopWidth: 1, borderTopColor: '#EAEAEA', padding: 10, gap: 5 }}>
                                  <View style={{ flexDirection: 'row', gap: 6, flexWrap: 'wrap' }}>
                                    {ap.effect.label.split('，').map((tag, ti) => (
                                      <View key={ti} style={{ backgroundColor: done ? '#F0F0F0' : '#E8F0E8', paddingHorizontal: 7, paddingVertical: 2, borderRadius: 3 }}>
                                        <Text style={{ fontSize: 10, color: done ? '#aaa' : '#2A6A2A', fontWeight: '600' }}>{tag}</Text>
                                      </View>
                                    ))}
                                  </View>
                                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                                      <View style={{ height: 4, borderRadius: 2, overflow: 'hidden', width: 60, backgroundColor: '#E0E0E0' }}>
                                        <View style={{ height: 4, width: `${srPct}%` as `${number}%`, backgroundColor: srPct >= 75 ? '#2a7a3b' : srPct >= 50 ? '#F59E0B' : '#C82829', borderRadius: 2 }} />
                                      </View>
                                      <Text style={{ fontSize: 10, color: '#666' }}>批准率{srPct}%</Text>
                                    </View>
                                    <Text style={{ fontSize: 10, color: '#999', flex: 1 }}>{ap.condition}</Text>
                                  </View>
                                  {ap.failEffect && (
                                    <Text style={{ fontSize: 10, color: '#aaa' }}>未获批：{ap.failEffect.label}</Text>
                                  )}
                                </View>
                              )}

                              {!isLocked && (
                                <Pressable
                                  onPress={() => void handleApply(i)}
                                  disabled={done || acting}
                                  style={{ backgroundColor: done ? '#F0F0F0' : '#1D2D44', padding: 12, alignItems: 'center' }}
                                  android_ripple={{ color: 'rgba(255,255,255,0.15)' }}
                                >
                                  <Text style={{ color: done ? '#aaa' : '#fff', fontWeight: '700', fontSize: 12 }}>
                                    {done ? '✓ 本轮已申请' : acting ? '申请中…' : '🚀 提交申请'}
                                  </Text>
                                </Pressable>
                              )}
                            </View>
                          );
                        })}
                      </View>
                    );
                  })}
                </View>
              );
            })()}

            {/* ══════ 干部协调（推荐任职） ══════ */}
            {tab === 'recommend' && (
              <>
                <View style={{ backgroundColor: '#EEF2F7', borderWidth: 1, borderColor: '#D0DCE8', padding: 10 }}>
                  <Text style={{ fontSize: 11, color: '#1D3B5E', lineHeight: 17 }}>
                    🤝 {secCfg.title}可通过办公室渠道，协调将合适干部推荐至对应职位。职级越高的领导，秘书协调能力越强。
                  </Text>
                </View>

                {recResult ? (
                  <View style={{ backgroundColor: '#f0faf3', borderWidth: 1, borderColor: '#2a7a3b', padding: 12 }}>
                    <Text style={{ fontSize: 13, color: '#2a7a3b', fontWeight: '600' }}>{recResult}</Text>
                    <Pressable onPress={() => setRecResult('')} style={{ marginTop: 8 }}>
                      <Text style={{ fontSize: 11, color: '#2a7a3b' }}>继续推荐 ›</Text>
                    </Pressable>
                  </View>
                ) : (
                  <>
                    {/* 第一步：选择干部 */}
                    <View style={{ backgroundColor: '#fff', borderWidth: 1, borderColor: '#D1D1CF', padding: 14 }}>
                      <Text style={{ fontSize: 11, color: '#888', letterSpacing: 2, marginBottom: 10 }}>第一步：选择推荐干部</Text>
                      {subordinates.filter(s => !s.transferredCity).length === 0 ? (
                        <Text style={{ color: '#aaa', fontSize: 12, textAlign: 'center', paddingVertical: 16 }}>暂无可推荐干部</Text>
                      ) : (
                        <FlatList
                          data={subordinates.filter(s => !s.transferredCity)}
                          keyExtractor={s => s.id}
                          scrollEnabled={false}
                          renderItem={({ item: s }) => {
                            const isSelected = recSub?.id === s.id;
                            return (
                              <Pressable
                                onPress={() => setRecSub(s)}
                                style={{ flexDirection: 'row', alignItems: 'center', paddingVertical: 10, borderTopWidth: 1, borderTopColor: '#F0F0F0', backgroundColor: isSelected ? '#EEF2F7' : '#fff', paddingHorizontal: 8 }}
                              >
                                <View style={{ width: 6, height: 6, borderRadius: 3, backgroundColor: isSelected ? '#1D3B5E' : '#D1D1CF', marginRight: 10 }} />
                                <View style={{ flex: 1 }}>
                                  <Text style={{ fontSize: 13, fontWeight: isSelected ? '700' : '400', color: '#222' }}>{s.name}</Text>
                                  <Text style={{ fontSize: 10, color: '#888' }}>{s.appointedRole ?? '待分配'} · 能力{s.ability} · 忠诚{s.loyalty}</Text>
                                </View>
                                {isSelected && <Text style={{ color: '#1D3B5E', fontSize: 12, fontWeight: '700' }}>✓ 已选</Text>}
                              </Pressable>
                            );
                          }}
                        />
                      )}
                    </View>

                    {/* 第二步：选择目标部门 */}
                    <View style={{ backgroundColor: '#fff', borderWidth: 1, borderColor: '#D1D1CF', padding: 14 }}>
                      <Text style={{ fontSize: 11, color: '#888', letterSpacing: 2, marginBottom: 10 }}>第二步：选择目标部门</Text>
                      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
                        {availableDepts.map(dk => {
                          const dName = getDeptNameByRank(dk, save.rankLevel);
                          const isSel = recDept === dk;
                          return (
                            <Pressable
                              key={dk}
                              onPress={() => setRecDept(dk)}
                              style={{ backgroundColor: isSel ? '#1D3B5E' : '#EEF2F7', paddingHorizontal: 10, paddingVertical: 7, borderWidth: 1, borderColor: isSel ? '#1D3B5E' : '#D1D1CF' }}
                            >
                              <Text style={{ fontSize: 11, color: isSel ? '#fff' : '#333' }}>{dName}</Text>
                            </Pressable>
                          );
                        })}
                      </View>
                    </View>

                    {/* 第三步：选择职位 */}
                    <View style={{ backgroundColor: '#fff', borderWidth: 1, borderColor: '#D1D1CF', padding: 14 }}>
                      <Text style={{ fontSize: 11, color: '#888', letterSpacing: 2, marginBottom: 10 }}>第三步：选择推荐职位</Text>
                      {RECOMMEND_POSITIONS.map(rp => {
                        const isSel = recPos === rp.pos;
                        return (
                          <Pressable
                            key={rp.pos}
                            onPress={() => setRecPos(rp.pos)}
                            style={{ flexDirection: 'row', alignItems: 'center', gap: 10, padding: 10, marginBottom: 6, borderWidth: 1.5, borderColor: isSel ? '#C82829' : '#E0E0E0', backgroundColor: isSel ? '#fff5f5' : '#fafafa' }}
                          >
                            <View style={{ width: 18, height: 18, borderRadius: 9, borderWidth: 2, borderColor: isSel ? '#C82829' : '#ccc', backgroundColor: isSel ? '#C82829' : '#fff', alignItems: 'center', justifyContent: 'center' }}>
                              {isSel && <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: '#fff' }} />}
                            </View>
                            <View style={{ flex: 1 }}>
                              <Text style={{ fontSize: 12, fontWeight: '600', color: isSel ? '#C82829' : '#333' }}>{rp.label}</Text>
                              <Text style={{ fontSize: 10, color: '#888', marginTop: 2 }}>{rp.desc}</Text>
                            </View>
                          </Pressable>
                        );
                      })}
                    </View>

                    {/* 确认推荐 */}
                    <Pressable
                      onPress={() => void handleRecommend()}
                      disabled={acting || !recSub || !recDept || !recPos}
                      style={{ backgroundColor: (!recSub || !recDept || !recPos) ? '#ccc' : '#C82829', padding: 14, alignItems: 'center' }}
                      android_ripple={{ color: 'rgba(255,255,255,0.2)' }}
                    >
                      <Text style={{ color: '#fff', fontWeight: '700', fontSize: 14 }}>
                        {acting ? '处理中…' : recSub && recDept && recPos
                          ? `📋 由${secCfg.title}协调推荐 ${recSub.name} 至 ${getDeptNameByRank(recDept, save.rankLevel)}`
                          : '请完成上述三步选择'}
                      </Text>
                    </Pressable>
                  </>
                )}
              </>
            )}

            {acting && tab !== 'main' && <ActivityIndicator color="#1D3B5E" />}

            {/* ══════ 警卫安保 ══════ */}
            {tab === 'guard' && (() => {
              const guardCfg = getGuardConfig(save.rankLevel);
              return (
                <>
                  <View style={{ backgroundColor: '#1D3B5E', padding: 14 }}>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 10 }}>
                      <Text style={{ fontSize: 32 }}>🛡️</Text>
                      <View style={{ flex: 1 }}>
                        <Text style={{ color: '#fff', fontWeight: '700', fontSize: 14 }}>{guardCfg.level}</Text>
                        <Text style={{ color: 'rgba(180,200,230,0.8)', fontSize: 10, marginTop: 2 }}>{guardCfg.rank}</Text>
                      </View>
                      <View style={{ backgroundColor: save.rankLevel >= 14 ? '#C82829' : save.rankLevel >= 12 ? '#7B5E2A' : save.rankLevel >= 8 ? '#2B4B6F' : '#2a7a3b', paddingHorizontal: 8, paddingVertical: 3 }}>
                        <Text style={{ color: '#fff', fontSize: 9, fontWeight: '700' }}>
                          {save.rankLevel >= 14 ? '国家级' : save.rankLevel >= 12 ? '省部级' : save.rankLevel >= 8 ? '厅局级' : '处级'}
                        </Text>
                      </View>
                    </View>
                    <Text style={{ color: 'rgba(200,220,240,0.8)', fontSize: 11, lineHeight: 17 }}>{guardCfg.upgradeDesc}</Text>
                  </View>

                  {guardCfg.totalGuards > 0 ? (
                    <View style={{ backgroundColor: '#fff', borderWidth: 1, borderColor: '#D1D1CF' }}>
                      <View style={{ backgroundColor: '#F0F4F8', paddingHorizontal: 14, paddingVertical: 8 }}>
                        <Text style={{ fontSize: 11, color: '#1D3B5E', fontWeight: '700', letterSpacing: 1 }}>警卫人员配置</Text>
                        <Text style={{ fontSize: 10, color: '#888', marginTop: 2 }}>参照中央警卫条例，按职级标准配备</Text>
                      </View>
                      {[
                        { label: '贴身警卫', count: guardCfg.personalGuards, icon: '👮', desc: '24小时随身护卫，具备反恐特训资质' },
                        { label: '随车警卫', count: guardCfg.vehicleGuards, icon: '🚗', desc: '出行车队护卫，含前导车辆和后卫车辆' },
                        { label: '住所警卫', count: guardCfg.residenceGuards, icon: '🏛️', desc: '驻守官邸及办公场所' },
                        { label: '警卫总人数', count: guardCfg.totalGuards, icon: '🎖️', desc: '警卫队伍总规模（含后备人员）' },
                      ].map((item, i) => (
                        <View key={item.label} style={{ flexDirection: 'row', alignItems: 'center', padding: 12, borderTopWidth: i > 0 ? 1 : 0, borderTopColor: '#F0F0F0', gap: 10 }}>
                          <View style={{ width: 40, height: 40, backgroundColor: '#EEF2F7', alignItems: 'center', justifyContent: 'center' }}>
                            <Text style={{ fontSize: 20 }}>{item.icon}</Text>
                          </View>
                          <View style={{ flex: 1 }}>
                            <Text style={{ fontSize: 13, fontWeight: '700', color: '#222' }}>{item.label}</Text>
                            <Text style={{ fontSize: 10, color: '#888', marginTop: 1 }}>{item.desc}</Text>
                          </View>
                          <View style={{ backgroundColor: item.label === '警卫总人数' ? '#1D3B5E' : '#F0F4F8', paddingHorizontal: 10, paddingVertical: 4, alignItems: 'center' }}>
                            <Text style={{ fontSize: 18, fontWeight: '700', color: item.label === '警卫总人数' ? '#fff' : '#1D3B5E', fontVariant: ['tabular-nums'] }}>{item.count}</Text>
                            <Text style={{ fontSize: 8, color: item.label === '警卫总人数' ? 'rgba(255,255,255,0.7)' : '#888' }}>人</Text>
                          </View>
                        </View>
                      ))}
                    </View>
                  ) : (
                    <View style={{ backgroundColor: '#fff', borderWidth: 1, borderColor: '#D1D1CF', padding: 24, alignItems: 'center' }}>
                      <Text style={{ fontSize: 32, marginBottom: 8 }}>🔒</Text>
                      <Text style={{ fontSize: 13, color: '#888', textAlign: 'center' }}>当前级别暂未配备专属警卫</Text>
                      <Text style={{ fontSize: 11, color: '#aaa', marginTop: 4 }}>晋升至县处级（6级）后配备基础安保</Text>
                    </View>
                  )}

                  {guardCfg.totalGuards > 0 && (
                    <>
                      <View style={{ backgroundColor: '#EEF2F7', borderWidth: 1, borderColor: '#D0DCE8', padding: 10 }}>
                        <Text style={{ fontSize: 11, color: '#1D3B5E', fontWeight: '700' }}>🔐 安保特勤任务</Text>
                        <Text style={{ fontSize: 10, color: '#888', marginTop: 2 }}>指派警卫处执行安保任务，提升安全指数</Text>
                      </View>
                      {GUARD_TASKS.map((task, i) => {
                        const canAfford = (save.fundBalance ?? 0) >= task.cost;
                        return (
                          <View key={i} style={{ backgroundColor: '#fff', borderWidth: 1, borderColor: '#D1D1CF', padding: 12, gap: 6 }}>
                            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                              <Text style={{ fontSize: 22 }}>{task.icon}</Text>
                              <View style={{ flex: 1 }}>
                                <Text style={{ fontSize: 13, fontWeight: '700', color: '#222' }}>{task.name}</Text>
                                <Text style={{ fontSize: 10, color: '#888', marginTop: 2, lineHeight: 14 }}>{task.desc}</Text>
                                <View style={{ flexDirection: 'row', gap: 6, marginTop: 4 }}>
                                  <View style={{ backgroundColor: '#FFF9E6', paddingHorizontal: 5, paddingVertical: 2 }}>
                                    <Text style={{ fontSize: 9, color: '#7B5E2A' }}>费用 ¥{task.cost}万</Text>
                                  </View>
                                  <View style={{ backgroundColor: '#EEF2F7', paddingHorizontal: 5, paddingVertical: 2 }}>
                                    <Text style={{ fontSize: 9, color: '#1D3B5E' }}>安全+{task.secGain}</Text>
                                  </View>
                                </View>
                              </View>
                            </View>
                            <Pressable
                              onPress={async () => {
                                if (!canAfford || acting) return;
                                setActing(true);
                                const curSec = save.securityIndex ?? 50;
                                await updateGameSave({ fundBalance: (save.fundBalance ?? 0) - task.cost, securityIndex: Math.min(100, curSec + task.secGain) });
                                await refreshSave();
                                showMsg(`✅ ${task.name}完成，安全指数+${task.secGain}`);
                                setActing(false);
                              }}
                              disabled={!canAfford || acting}
                              style={{ backgroundColor: canAfford ? '#1D3B5E' : '#CCC', paddingVertical: 9, alignItems: 'center' }}
                            >
                              <Text style={{ color: '#fff', fontWeight: '700', fontSize: 11 }}>
                                {canAfford ? `▶ 执行（¥${task.cost}万）` : '经费不足'}
                              </Text>
                            </Pressable>
                          </View>
                        );
                      })}
                    </>
                  )}
                </>
              );
            })()}

            <View style={{ height: 16 }} />
          </ScrollView>
        </View>
      )}
    </View>
  );
}
