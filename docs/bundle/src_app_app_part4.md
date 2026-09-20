# src/app/(app)_part4

共 5 个文件。
<a id="srcappappsecretarytsx"></a>
## `src/app/(app)/secretary.tsx`

```tsx
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
```

<a id="srcappappsponsortsx"></a>
## `src/app/(app)/sponsor.tsx`

```tsx
// 赞助支持作者页面
import { Image } from 'expo-image';
import { Pressable, ScrollView, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { useRouter } from 'expo-router';

const QR_URL = 'https://miaoda-conversation-file.cdn.bcebos.com/user-chghfrv91n28/app-du8r0a7ctszl/20260817/md_20260817_060437_1.png';

const COMMITMENTS = [
  '赞助凭自愿，并非任何强制',
  '赞助将全部投入游戏运营',
  '每月将抽出一定额数的赞助进行慈善捐款，以谁主沉浮全体赞助玩家名义',
  '在此承诺游戏内容不管本体还是激活码永久免费，没有任何收费项目可能',
  '一天或两天统一公开当天所赞助的所有赞助额，以确保公开',
];

export default function SponsorScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();

  return (
    <View style={{ flex: 1, backgroundColor: '#0D0A04' }}>
      <StatusBar style="light" backgroundColor="#1A1200" />

      {/* 头部 */}
      <View style={{ backgroundColor: '#1A1200', paddingTop: insets.top + 8, paddingHorizontal: 16, paddingBottom: 12, borderBottomWidth: 2, borderBottomColor: '#C8A84B' }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
          <Pressable onPress={() => router.back()}>
            <Text style={{ color: '#E8D08A', fontSize: 22 }}>←</Text>
          </Pressable>
          <Text style={{ color: '#E8D08A', fontSize: 16, fontWeight: '700', letterSpacing: 1 }}>❤️ 赞助支持作者</Text>
        </View>
      </View>

      <ScrollView contentContainerStyle={{ padding: 20, paddingBottom: insets.bottom + 32 }}>
        {/* 说明文字区域 */}
        <View style={{ backgroundColor: '#1A1200', borderWidth: 1, borderColor: '#7A6428', padding: 16, marginBottom: 20 }}>
          {/* 顶部标题 */}
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 14 }}>
            <View style={{ width: 3, height: 16, backgroundColor: '#C8A84B' }} />
            <Text style={{ color: '#E8D08A', fontSize: 13, fontWeight: '700', letterSpacing: 1 }}>作者寄语</Text>
          </View>

          {/* 引言 */}
          <Text style={{ color: '#C8B87A', fontSize: 12, lineHeight: 20, marginBottom: 16 }}>
            由于作者更新花费个人实在承担不住，在此开通赞助：
          </Text>

          {/* 承诺列表 */}
          {COMMITMENTS.map((text, i) => (
            <View key={i} style={{ flexDirection: 'row', alignItems: 'flex-start', gap: 10, marginBottom: i < COMMITMENTS.length - 1 ? 12 : 0 }}>
              {/* 序号圆标 */}
              <View style={{ width: 20, height: 20, backgroundColor: '#C8A84B', alignItems: 'center', justifyContent: 'center', marginTop: 1 }}>
                <Text style={{ color: '#1A1200', fontSize: 10, fontWeight: '900' }}>{i + 1}</Text>
              </View>
              <Text style={{ flex: 1, color: '#EDE8DC', fontSize: 12, lineHeight: 20 }}>{text}</Text>
            </View>
          ))}
        </View>

        {/* 分隔间距 */}
        <View style={{ height: 20 }} />

        {/* 赞赏码图片区域 */}
        <View style={{ alignItems: 'center' }}>
          <Image
            source={{ uri: QR_URL }}
            style={{ width: 280, height: 320 }}
            contentFit="contain"
          />
        </View>
      </ScrollView>
    </View>
  );
}
```

<a id="srcappappsubordinatestsx"></a>
## `src/app/(app)/subordinates.tsx`

```tsx
// 下属管理页面 v2 - 现实化干部人事管理
// 核心机制：组织考察流程 / 五维考核 / 后备干部库 / 干部随机事件 / 派系冲突提示
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useCallback, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  Pressable,
  ScrollView,
  Text,
  TextInput,
  View,
} from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { useRouter, useFocusEffect } from 'expo-router';
import { useGame } from '@/ctx/GameContext';
import {
  getSubordinatesByRank, appointSubordinate, transferSubordinate,
  promoteSubordinate, demoteSubordinate, getSubResumes,
  fillDeptStaff, autoAssignSubordinates, batchAssessSubordinates,
  startNomination, cancelNomination, processNominations, resetNominationRejected,
  setReserveStatus, getSubsWithEvents, handleSubEvent,
  conductFiveDimReview, triggerSubEvents, recallBorrowedSub,
  getNewRecruits, clearNewRecruitFlag,
} from '@/db/gameApi';
import type { Subordinate, DeptKey, SubResume, PlayerSave, SubEventType, CadreSpecialty } from '@/types/game';
import {
  getSubAvatarEmoji, getAvatarBgColor, DEPT_CONFIG, FACTION_LABEL,
  FACTION_COLOR, SUB_LEVEL_NAMES, SUB_LEVEL_MAX_COUNT,
  MINISTRY_POOL, getDeptHeadTitle, getDeptDeputyTitle,
  getDeptNameByRank, LEADERSHIP_CONCURRENT, getDeptPositionSubLevel,
  CADRE_SPECIALTY_LABEL, CADRE_SPECIALTY_COLOR, SUB_EVENT_CONFIG,
} from '@/types/game';
import { StatBar } from '@/components/StatBar';


// ── 岗位与特长匹配表 ──────────────────────────────────────────────
const SPECIALTY_DEPT_MATCH: Record<CadreSpecialty, DeptKey[]> = {
  economy:     ['ndrc', 'finance', 'invest', 'market'],
  social:      ['education', 'health', 'agriculture'],
  legal:       ['police'],
  agriculture: ['agriculture', 'ecology'],
  tech:        ['urban', 'invest'],
  party:       ['personnel'],
  finance:     ['finance', 'tax'],
  military:    ['police'],
};

function getMatchBonus(specialty: CadreSpecialty, dept: DeptKey | null): string {
  if (!dept) return '';
  const matched = SPECIALTY_DEPT_MATCH[specialty]?.includes(dept);
  return matched ? '🎯 专长匹配' : '';
}

// ── 五维考核等级 ──────────────────────────────────────────────────
const REVIEW_GRADES = [
  { label: '优秀',   color: '#C82829', meritGain: 15, desc: '工作成绩突出，各方面表现优异' },
  { label: '称职',   color: '#2a7a3b', meritGain: 8,  desc: '完成本职工作，符合岗位要求' },
  { label: '基本称职', color: '#7B5E2A', meritGain: 3, desc: '尚能完成工作，但存在明显不足' },
  { label: '不称职', color: '#666',    meritGain: 0,  desc: '工作表现不达标，需调整岗位' },
] as const;

type ReviewGrade = typeof REVIEW_GRADES[number]['label'];

// ── 考察期天数配置 ────────────────────────────────────────────────
const REVIEW_DAYS: Record<'head' | 'deputy', number> = { head: 5, deputy: 2 };

// ── 工作任务池 ────────────────────────────────────────────────────
const WORK_TASKS = [
  { label: '经济调研',   desc: '深入企业和市场一线开展调研，提交专题报告', meritReward: 8,  abilityBonus: 2, tag: '经济' },
  { label: '信访接待',   desc: '负责信访案件处置，化解群众矛盾纠纷',       meritReward: 6,  abilityBonus: 1, tag: '民生' },
  { label: '项目督导',   desc: '赴重点项目现场督导，确保进度和质量',       meritReward: 10, abilityBonus: 3, tag: '建设' },
  { label: '政策宣讲',   desc: '组织基层政策宣传培训，提高干部执行力',     meritReward: 5,  abilityBonus: 2, tag: '培训' },
  { label: '专项整治',   desc: '牵头开展专项整治行动，整治行业乱象',       meritReward: 12, abilityBonus: 3, tag: '治理' },
  { label: '招商洽谈',   desc: '赴外省市参加招商活动，推介当地投资环境',   meritReward: 15, abilityBonus: 2, tag: '招商' },
  { label: '统计核查',   desc: '核查本辖区统计数据，保证数据质量',         meritReward: 4,  abilityBonus: 1, tag: '统计' },
  { label: '应急处置',   desc: '负责突发事件应急协调处置',                 meritReward: 18, abilityBonus: 4, tag: '应急' },
];

// ── 工具函数 ──────────────────────────────────────────────────────
function calcSubAge(subLevel: number, name: string): number {
  let hash = 0;
  for (let i = 0; i < name.length; i++) hash = (hash * 31 + name.charCodeAt(i)) & 0xffff;
  const base: Record<number, number> = { 13: 57, 12: 55, 11: 52, 10: 49, 9: 46, 8: 44, 7: 42, 6: 40, 5: 38, 4: 36, 3: 34, 2: 32, 1: 28 };
  return (base[subLevel] ?? 30) + (hash % 7);
}

/**
 * 任命权限说明（现实层级对应）
 *   乡镇长(rank3)    → 负责村/居委会干部，不任命编制内干部
 *   县委常委(rank4)  → 任命乡镇副职（副乡镇长/乡镇副书记，副科级）
 *   县长(rank5)      → 任命乡镇主要负责人（乡镇长/乡镇党委书记，正科级）
 *   县委书记(rank6)  → 提名县直部门局长（正科级），报市委批准
 *   副市长(rank7)    → 任命县区副职（副县长/副区长，副处级）
 *   市长(rank8)      → 任命县区主要负责人（县长/区长，正处级）
 *   市委书记(rank9)  → 提名县委书记（正处级，报省委批准）
 *   副省长(rank10)   → 任命市厅局副职（副厅级）
 *   省长(rank10)     → 提名市长/市委书记候选人（正厅级）
 *   省委书记(rank11) → 提名市委书记（正厅级，报中央批准）
 */
function getRankAppointDesc(rankLevel: number): string {
  if (rankLevel <= 1)  return '科员级：暂无任命权，向直属领导汇报工作';
  if (rankLevel === 2) return '副乡镇长：协助乡镇长管理各村/居委会，无独立任命权';
  if (rankLevel === 3) return '乡镇长（正科）：管辖各村书记/主任（村级），任命乡镇各办公室负责人（科员级）';
  if (rankLevel === 4) return '县委常委/副县长（副处）：任命乡镇副职干部（副乡镇长/副书记，副科级）';
  if (rankLevel === 5) return '县长（正处）：任命乡镇主要负责人（乡镇长/党委书记，正科级），考察副科级干部';
  if (rankLevel === 6) return '县委书记（正处）：提名任命县直部门局长（正科级），主持乡镇班子调整，任命范围：副科至正科';
  if (rankLevel === 7) return '副市长（副厅）：协助市长分管县区工作，任命县区副职（副县长，副处级）';
  if (rankLevel === 8) return '市长（正厅）：任命县区主要负责人（县长/区长，正处级），考察副处级干部';
  if (rankLevel === 9) return '市委书记（正厅）：提名县委书记（正处级，报省委批准），统筹市管干部任免';
  if (rankLevel === 10) return '省长/副省长（副部）：任命市厅局副职（副厅级），考察地级市副职干部';
  if (rankLevel === 11) return '省委书记（正部）：提名任命市委书记、市长（正厅级），统筹全省厅局级干部调配';
  return '国家级：统筹省部级及以上干部任免，由中枢政治局审议通过';
}

function getSatisfactionColor(v: number) {
  return v >= 70 ? '#2a7a3b' : v >= 45 ? '#e67e22' : '#C82829';
}

// ── 考察进度徽章 ──────────────────────────────────────────────────
function NominationBadge({ sub, currentDay, rankLevel, onResult }: {
  sub: Subordinate; currentDay: number; rankLevel: number;
  onResult: (name: string, approved: boolean, dept: string, pos: string) => void;
}) {
  if (sub.nominationStatus === 'idle') return null;
  if (sub.nominationStatus === 'rejected') {
    return (
      <View style={{ backgroundColor: '#fff0f0', borderWidth: 1, borderColor: '#C82829', paddingHorizontal: 6, paddingVertical: 2, marginTop: 4 }}>
        <Text style={{ fontSize: 9, color: '#C82829', fontWeight: '700' }}>⛔ 组织部不予通过，需重新提名</Text>
      </View>
    );
  }
  if (sub.nominationStatus === 'approved') {
    return (
      <View style={{ backgroundColor: '#e8f5e9', borderWidth: 1, borderColor: '#2a7a3b', paddingHorizontal: 6, paddingVertical: 2, marginTop: 4 }}>
        <Text style={{ fontSize: 9, color: '#2a7a3b', fontWeight: '700' }}>✅ 组织部已批准任命</Text>
      </View>
    );
  }
  // reviewing
  const reqDays = REVIEW_DAYS[sub.nominationPosition ?? 'deputy'];
  const elapsed = currentDay - (sub.nominationStartDay ?? currentDay);
  const pct = Math.min(100, Math.round((elapsed / reqDays) * 100));
  const deptName = sub.nominationDept ? getDeptNameByRank(sub.nominationDept, rankLevel) : '待定';
  const posLabel = sub.nominationPosition === 'head' ? '正职' : '副职';
  return (
    <View style={{ backgroundColor: '#fffbe6', borderWidth: 1, borderColor: '#e6a817', padding: 6, marginTop: 4, gap: 3 }}>
      <Text style={{ fontSize: 9, color: '#7B5E00', fontWeight: '700' }}>
        📋 组织考察中 · {deptName}{posLabel} · {elapsed}/{reqDays}天
      </Text>
      <View style={{ height: 4, backgroundColor: '#FFE082' }}>
        <View style={{ height: 4, width: `${pct}%`, backgroundColor: '#e6a817' }} />
      </View>
    </View>
  );
}

// ── 派系冲突检测 ──────────────────────────────────────────────────
function detectFactionConflict(subs: Subordinate[], deptKey: DeptKey): string | null {
  const heads = subs.filter(s => s.appointedDept === deptKey && s.deptPosition === 'head' && s.isAppointed);
  const deps  = subs.filter(s => s.appointedDept === deptKey && s.deptPosition === 'deputy' && s.isAppointed);
  if (heads.length === 0 || deps.length === 0) return null;
  const headFac = heads[0].faction;
  const conflictDeps = deps.filter(d => d.faction !== headFac);
  if (conflictDeps.length >= 2) return `${FACTION_LABEL[headFac]}正职与${conflictDeps.length}名副职派系不同，工作效率-15%`;
  return null;
}

type MainTab = 'event' | 'all' | 'dept' | 'review' | 'reserve';

// ── 部委视图（rank 12 专用）────────────────────────────────────────
const MINISTRY_OFFICES_MAP: Record<string, { name: string; headTitle: string; duty: string; staff: { name: string; title: string; level: 'head' | 'deputy' | 'staff' }[] }[]> = {
  'GDP经济': [
    { name: '综合发展司', headTitle: '司长', duty: '统筹全国经济发展规划',
      staff: [{ name: '张宏远', title: '司长', level: 'head' }, { name: '李思成', title: '副司长', level: 'deputy' }, { name: '王立群', title: '副司长', level: 'deputy' }] },
    { name: '产业政策司', headTitle: '司长', duty: '推进产业结构调整升级',
      staff: [{ name: '陈博文', title: '司长', level: 'head' }, { name: '刘晓燕', title: '副司长', level: 'deputy' }] },
    { name: '数字经济司', headTitle: '司长', duty: '引导数字经济与实体经济融合',
      staff: [{ name: '孙志远', title: '司长', level: 'head' }, { name: '周磊', title: '副司长', level: 'deputy' }] },
  ],
  '民生保障': [
    { name: '社会保障司', headTitle: '司长', duty: '统筹城乡社会保障政策',
      staff: [{ name: '林德义', title: '司长', level: 'head' }, { name: '杨春梅', title: '副司长', level: 'deputy' }] },
    { name: '就业促进司', headTitle: '司长', duty: '推动就业政策落地见效',
      staff: [{ name: '马国华', title: '司长', level: 'head' }, { name: '钱思远', title: '副司长', level: 'deputy' }] },
  ],
  '生态文明': [
    { name: '生态保护司', headTitle: '司长', duty: '推进自然保护区建设管理',
      staff: [{ name: '宋建民', title: '司长', level: 'head' }, { name: '冯志远', title: '副司长', level: 'deputy' }] },
    { name: '大气环境司', headTitle: '司长', duty: '统筹大气污染防治攻坚',
      staff: [{ name: '韩世杰', title: '司长', level: 'head' }, { name: '蒋玉清', title: '副司长', level: 'deputy' }] },
  ],
  '营商环境': [
    { name: '市场准入司', headTitle: '司长', duty: '降低市场准入壁垒',
      staff: [{ name: '卢建中', title: '司长', level: 'head' }, { name: '苏明远', title: '副司长', level: 'deputy' }] },
    { name: '公平竞争司', headTitle: '司长', duty: '维护市场公平竞争秩序',
      staff: [{ name: '廖国建', title: '司长', level: 'head' }, { name: '姜思成', title: '副司长', level: 'deputy' }] },
  ],
  '社会治安': [
    { name: '治安管理司', headTitle: '司长', duty: '全国治安态势研判与部署',
      staff: [{ name: '许志强', title: '司长', level: 'head' }, { name: '闫国平', title: '副司长', level: 'deputy' }] },
  ],
  '外交事务': [
    { name: '双边关系司', headTitle: '司长', duty: '负责重点国家双边外交',
      staff: [{ name: '魏志国', title: '司长', level: 'head' }, { name: '傅思远', title: '副司长', level: 'deputy' }] },
  ],
  '国家安全': [
    { name: '战略研究司', headTitle: '司长', duty: '国家安全形势分析研判',
      staff: [{ name: '常志强', title: '司长', level: 'head' }, { name: '段思远', title: '副司长', level: 'deputy' }] },
  ],
};

function MinistryRosterView({ save, onBack }: { save: PlayerSave; onBack: () => void }) {
  const insets = useSafeAreaInsets();
  const foundMinistry = MINISTRY_POOL.find(m => m.name === save.cityName);
  const focus = foundMinistry?.focus ?? 'GDP经济';
  const offices = MINISTRY_OFFICES_MAP[focus] ?? MINISTRY_OFFICES_MAP['GDP经济'] ?? [];
  const allStaff = offices.flatMap(o => o.staff);
  const [expandedOffice, setExpandedOffice] = useState<string | null>(null);
  return (
    <View style={{ flex: 1, backgroundColor: '#F5F4F1' }}>
      <StatusBar style="light" backgroundColor="#0D1F35" />
      <View style={{ backgroundColor: '#0D1F35', paddingTop: insets.top + 8, paddingBottom: 12, paddingHorizontal: 16 }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
          <Pressable onPress={onBack}><Text style={{ color: '#a0b4cc', fontSize: 22 }}>‹</Text></Pressable>
          <View style={{ flex: 1 }}>
            <Text style={{ color: '#a0b4cc', fontSize: 10, letterSpacing: 1 }}>国政院 · {save.cityName}</Text>
            <Text style={{ color: '#fff', fontSize: 16, fontWeight: '700', letterSpacing: 1 }}>本部委人员名单</Text>
          </View>
          <Text style={{ color: '#FFD700', fontSize: 14, fontWeight: '700' }}>{allStaff.length} 人</Text>
        </View>
      </View>
      <FlatList data={offices} keyExtractor={o => o.name} contentContainerStyle={{ padding: 14, paddingBottom: insets.bottom + 24, gap: 10 }}
        renderItem={({ item: office }) => {
          const isExp = expandedOffice === office.name;
          return (
            <View style={{ backgroundColor: '#fff', borderWidth: 1, borderColor: isExp ? '#9FA8DA' : '#DDD' }}>
              <Pressable onPress={() => setExpandedOffice(isExp ? null : office.name)} style={{ flexDirection: 'row', alignItems: 'center', padding: 12, gap: 10 }}>
                <View style={{ flex: 1 }}>
                  <Text style={{ fontSize: 13, fontWeight: '700', color: '#1D2D44' }}>{office.name}</Text>
                  <Text style={{ fontSize: 10, color: '#999', marginTop: 2 }}>{office.duty}</Text>
                </View>
                <Text style={{ fontSize: 10, color: '#aaa' }}>{isExp ? '▲' : '▼'}</Text>
              </Pressable>
              {isExp && (
                <View style={{ borderTopWidth: 1, borderTopColor: '#F0EEEA' }}>
                  {office.staff.map((s, si) => {
                    const lc = s.level === 'head' ? '#C82829' : '#2B4B6F';
                    return (
                      <View key={si} style={{ flexDirection: 'row', alignItems: 'center', paddingVertical: 8, paddingHorizontal: 12, gap: 8, backgroundColor: si % 2 === 0 ? '#FAFAFA' : '#fff' }}>
                        <View style={{ backgroundColor: lc, paddingHorizontal: 5, paddingVertical: 2 }}>
                          <Text style={{ color: '#fff', fontSize: 8, fontWeight: '700' }}>{s.level === 'head' ? '正职' : '副职'}</Text>
                        </View>
                        <Text style={{ flex: 1, fontSize: 13, color: '#222', fontWeight: '600' }}>{s.name}</Text>
                        <Text style={{ fontSize: 11, color: '#888' }}>{s.title}</Text>
                      </View>
                    );
                  })}
                </View>
              )}
            </View>
          );
        }}
      />
    </View>
  );
}

// ── 部委管辖视图（rank 13 专用）──────────────────────────────────────
const SUPERVISED_DEPTS = [
  { id: 'ndrc', icon: '📊', name: '国家发展和改革委员会', headTitle: '主任', staffCount: 1200, functions: ['宏观经济调控','固定资产投资审批','价格监管'] },
  { id: 'mof',  icon: '💰', name: '财政部',               headTitle: '部长', staffCount: 800,  functions: ['国家预算编制','税收政策','国债管理'] },
  { id: 'moe',  icon: '🎓', name: '教育部',               headTitle: '部长', staffCount: 500,  functions: ['教育政策','高考制度','义务教育'] },
  { id: 'nhc',  icon: '🏥', name: '国家卫生健康委员会',   headTitle: '主任', staffCount: 700,  functions: ['公共卫生','医疗改革','药品监管'] },
  { id: 'mps',  icon: '🛡️', name: '公安部',               headTitle: '部长', staffCount: 8000, functions: ['社会治安','打击犯罪','出入境管理'] },
  { id: 'mee',  icon: '🌿', name: '生态环境部',           headTitle: '部长', staffCount: 600,  functions: ['环境保护','碳排放管理','生态修复'] },
];

function DeptManagementView({ save, router }: { save: PlayerSave; router: ReturnType<typeof useRouter> }) {
  const insets = useSafeAreaInsets();
  const [expanded, setExpanded] = useState<string | null>(null);
  return (
    <View style={{ flex: 1, backgroundColor: '#F4F4F0' }}>
      <View style={{ backgroundColor: '#2B4B6F', paddingTop: insets.top + 8, paddingBottom: 14, paddingHorizontal: 16 }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
          <Pressable onPress={() => router.back()}><Text style={{ color: '#a0b4cc', fontSize: 22 }}>‹</Text></Pressable>
          <View style={{ flex: 1 }}>
            <Text style={{ color: 'rgba(160,180,204,0.7)', fontSize: 9, letterSpacing: 3 }}>国政院 · 管辖部门</Text>
            <Text style={{ color: '#fff', fontWeight: '700', fontSize: 16 }}>🏛️ 管辖部门总览</Text>
          </View>
        </View>
      </View>
      <ScrollView contentContainerStyle={{ padding: 12, paddingBottom: insets.bottom + 24, gap: 8 }}>
        {SUPERVISED_DEPTS.map(dept => {
          const isOpen = expanded === dept.id;
          return (
            <Pressable key={dept.id} onPress={() => setExpanded(isOpen ? null : dept.id)}
              style={{ backgroundColor: '#fff', borderWidth: 1, borderColor: isOpen ? '#2B4B6F' : '#D8D8D8' }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', padding: 12, gap: 10 }}>
                <Text style={{ fontSize: 20 }}>{dept.icon}</Text>
                <View style={{ flex: 1 }}>
                  <Text style={{ fontSize: 12, fontWeight: '700', color: '#1D2D44' }}>{dept.name}</Text>
                  <Text style={{ fontSize: 10, color: '#888', marginTop: 1 }}>正职：{dept.headTitle} · 编制：{dept.staffCount.toLocaleString()}人</Text>
                </View>
                <Text style={{ fontSize: 11, color: '#aaa' }}>{isOpen ? '▲' : '▼'}</Text>
              </View>
              {isOpen && (
                <View style={{ borderTopWidth: 1, borderTopColor: '#F0F0F0', padding: 12, gap: 8 }}>
                  <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 5 }}>
                    {dept.functions.map(fn => (
                      <View key={fn} style={{ backgroundColor: '#EEF4FF', paddingHorizontal: 7, paddingVertical: 3 }}>
                        <Text style={{ fontSize: 9, color: '#2B4B6F' }}>{fn}</Text>
                      </View>
                    ))}
                  </View>
                </View>
              )}
            </Pressable>
          );
        })}
        <View style={{ height: 20 }} />
      </ScrollView>
    </View>
  );
}

// ── 事件处理面板 ──────────────────────────────────────────────────
function EventPanel({ sub, onHandle, onClose }: {
  sub: Subordinate;
  onHandle: (action: 'approve' | 'reject' | 'punish' | 'protect') => void;
  onClose: () => void;
}) {
  const et = sub.eventType!;
  const cfg = SUB_EVENT_CONFIG[et];

  const actions: { key: 'approve' | 'reject' | 'punish' | 'protect'; label: string; color: string; desc: string }[] = et === 'corruption_risk'
    ? [
      { key: 'punish',  label: '果断处置', color: '#C82829', desc: '启动纪律审查，廉洁指数+10，政绩+5' },
      { key: 'protect', label: '包庇保护', color: '#888',    desc: '压制举报，忠诚度+10，但廉洁-15，存在政治风险' },
    ]
    : et === 'complaint'
    ? [
      { key: 'punish',  label: '责令整改', color: '#C82829', desc: '公开处理投诉，平息矛盾，政绩+2' },
      { key: 'protect', label: '压制投诉', color: '#888',    desc: '压下投诉，忠诚度+5，但积累隐患' },
    ]
    : et === 'transfer_request'
    ? [
      { key: 'approve', label: '同意调动', color: '#2a7a3b', desc: '干部满意度+15，调出后编制空缺需补充' },
      { key: 'reject',  label: '驳回申请', color: '#C82829', desc: '留住干部，但满意度-20，忠诚度-10' },
    ]
    : et === 'achievement'
    ? [
      { key: 'approve', label: '通报表扬', color: '#2a7a3b', desc: '政绩+12，干部能力+2，树立标杆效应' },
      { key: 'reject',  label: '不予表彰', color: '#888',    desc: '干部积极性受损，满意度-8' },
    ]
    : [
      { key: 'approve', label: '同意借调', color: '#2a7a3b', desc: '干部开阔视野，能力+3，获上级好感' },
      { key: 'reject',  label: '拒绝借调', color: '#C82829', desc: '上级关系略有影响，政绩-3' },
    ];

  return (
    <View style={{ backgroundColor: '#fff', borderWidth: 2, borderColor: cfg.urgency === 'high' ? '#C82829' : '#e67e22', margin: 14, padding: 14, gap: 10 }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
        <Text style={{ fontSize: 20 }}>{cfg.icon}</Text>
        <View style={{ flex: 1 }}>
          <Text style={{ fontSize: 13, fontWeight: '700', color: '#111' }}>{cfg.label} · {sub.name}</Text>
          <Text style={{ fontSize: 10, color: '#888', marginTop: 2 }}>
            {sub.position} · {FACTION_LABEL[sub.faction]} · 第{sub.eventDay}天
          </Text>
        </View>
        <Pressable onPress={onClose}>
          <Text style={{ fontSize: 18, color: '#aaa' }}>×</Text>
        </Pressable>
      </View>
      <Text style={{ fontSize: 11, color: '#555', lineHeight: 18, backgroundColor: '#F8F6F0', padding: 8 }}>
        {et === 'corruption_risk' && `${sub.name}被举报存在廉洁风险，需要您决策处理方式。包庇会影响班子风气，但处置会损害其忠诚度。`}
        {et === 'complaint'       && `群众对${sub.name}的工作方式投诉，涉及工作作风问题。您的处置方式将影响干群关系和政绩评估。`}
        {et === 'transfer_request'&& `${sub.name}主动申请调动至其他单位。批准有利于干部成长，但岗位将出现空缺；驳回会影响其积极性。`}
        {et === 'achievement'     && `${sub.name}在近期工作中取得突出成绩，经请示上级同意予以通报表扬。`}
        {et === 'borrow'          && `上级机关申请借调${sub.name}参与专项工作，预计3-6个月。期间该干部暂时离开本地编制。`}
      </Text>
      <View style={{ flexDirection: 'row', gap: 8 }}>
        {actions.map(a => (
          <Pressable key={a.key} onPress={() => onHandle(a.key)}
            style={{ flex: 1, backgroundColor: a.color, padding: 10, alignItems: 'center', gap: 3 }}>
            <Text style={{ color: '#fff', fontSize: 12, fontWeight: '700' }}>{a.label}</Text>
            <Text style={{ color: 'rgba(255,255,255,0.8)', fontSize: 9, textAlign: 'center' }}>{a.desc}</Text>
          </Pressable>
        ))}
      </View>
    </View>
  );
}

// ── 主页面 ────────────────────────────────────────────────────────
export default function SubordinatesScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { save, updateGameSave } = useGame();
  const [subordinates, setSubordinates] = useState<Subordinate[]>([]);
  const [pendingEvents, setPendingEvents] = useState<Subordinate[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedSub, setSelectedSub] = useState<Subordinate | null>(null);
  const [feedback, setFeedback] = useState('');
  const [tab, setTab] = useState<MainTab>('event');
  const [showTransferModal, setShowTransferModal] = useState(false);
  const [transferCity, setTransferCity] = useState('');
  const [resumeModal, setResumeModal] = useState<{ sub: Subordinate; resumes: SubResume[] } | null>(null);
  const [promotingId, setPromotingId] = useState<string | null>(null);
  const [batchLoading, setBatchLoading] = useState(false);
  const [workPanelId, setWorkPanelId] = useState<string | null>(null);
  const [reviewPanelId, setReviewPanelId] = useState<string | null>(null);
  const [nominatePanelId, setNominatePanelId] = useState<string | null>(null);
  const [reviewingId, setReviewingId] = useState<string | null>(null);
  const [eventSub, setEventSub] = useState<Subordinate | null>(null);
  // 新录用干部提醒
  const [newRecruits, setNewRecruits] = useState<Subordinate[]>([]);
  // 五维考核结果弹窗
  const [fiveDimResult, setFiveDimResult] = useState<{ sub: Subordinate; de: number; neng: number; qin: number; ji: number; lian: number; total: number; grade: string } | null>(null);

  const reload = useCallback(async () => {
    if (!save) return;
    setLoading(true);
    const [subs, events, recruits] = await Promise.all([
      getSubordinatesByRank(save.id, save.rankLevel),
      getSubsWithEvents(save.id),
      getNewRecruits(save.id),
    ]);
    setSubordinates(subs);
    setPendingEvents(events);
    setNewRecruits(recruits);
    setLoading(false);
  }, [save]);

  useFocusEffect(useCallback(() => { void reload(); }, [reload]));

  const showFeedback = (msg: string) => {
    setFeedback(msg);
    setTimeout(() => setFeedback(''), 4000);
  };

  // 关闭新录用提醒（标记为已查看）
  const handleDismissNewRecruits = async () => {
    if (!save) return;
    setNewRecruits([]);
    await clearNewRecruitFlag(save.id);
  };

  // ── 启动组织考察流程 ──────────────────────────────────────────
  const handleStartNomination = async (sub: Subordinate, deptKey: DeptKey, position: 'head' | 'deputy') => {
    if (!save) return;
    // 检查是否满足基本资格
    const minAbility = position === 'head' ? 45 : 35;
    if (sub.ability < minAbility) {
      showFeedback(`⚠ ${sub.name} 能力值 ${sub.ability} 不达标（正职需≥45，副职需≥35），建议先培养`);
      return;
    }
    if (sub.integrity < 30) {
      showFeedback(`⚠ ${sub.name} 廉洁值 ${sub.integrity} 过低（需≥30），有被组织部否决风险`);
    }
    // 检查正职名额
    if (position === 'head') {
      const existHead = subordinates.filter(s => s.appointedDept === deptKey && s.deptPosition === 'head' && s.isAppointed);
      if (existHead.length >= 1) {
        showFeedback(`${getDeptNameByRank(deptKey, save.rankLevel)}正职已有人选，须先解除现任`);
        return;
      }
    } else {
      const existDep = subordinates.filter(s => s.appointedDept === deptKey && s.deptPosition === 'deputy' && s.isAppointed);
      if (existDep.length >= 3) {
        showFeedback(`${getDeptNameByRank(deptKey, save.rankLevel)}副职已满（最多3名）`);
        return;
      }
    }
    await startNomination(sub.id, deptKey, position, save.gameDays);
    const reqDays = REVIEW_DAYS[position];
    showFeedback(`📋 已启动 ${sub.name} 的组织考察，需经 ${reqDays} 天考察期后方可正式任命`);
    setNominatePanelId(null);
    void reload();
  };

  // ── 推进考察审批（每次加载时检查） ──────────────────────────────
  const handleProcessNominations = async () => {
    if (!save) return;
    const { approved, rejected } = await processNominations(save.id, save.userId, save.gameDays, save.rankLevel);
    if (approved.length > 0) showFeedback(`✅ 组织部批准任命：${approved.join('、')}`);
    if (rejected.length > 0) showFeedback(`⛔ 组织部不予通过：${rejected.join('、')}（能力或廉洁不达标）`);
    void reload();
  };

  // ── 撤回提名 ─────────────────────────────────────────────────
  const handleCancelNomination = async (sub: Subordinate) => {
    await cancelNomination(sub.id);
    showFeedback(`已撤回 ${sub.name} 的组织考察提名`);
    void reload();
  };

  // ── 解除职务 ─────────────────────────────────────────────────
  const handleRemove = async (sub: Subordinate) => {
    if (!save) return;
    await appointSubordinate(sub.id, null, null, null);
    if (sub.appointedDept === 'police' && sub.deptPosition === 'head') {
      await updateGameSave({ policeChiefName: null });
    }
    showFeedback(`已解除 ${sub.name} 的职务`);
    setSelectedSub(null);
    void reload();
  };

  // ── 五维考核 ─────────────────────────────────────────────────
  const handleFiveDimReview = async (sub: Subordinate, grade: ReviewGrade) => {
    if (!save) return;
    const daysSince = save.gameDays - sub.lastAssessedDay;
    if (daysSince < 30) {
      showFeedback(`${sub.name} 近期已接受考核，请30天后再进行`);
      return;
    }
    setReviewingId(sub.id);
    const result = await conductFiveDimReview(sub.id, save.gameDays, grade);
    if (result.meritGain > 0) await updateGameSave({ meritPoints: save.meritPoints + result.meritGain });
    setFiveDimResult({ sub, ...result, grade });
    setReviewPanelId(null);
    setReviewingId(null);
    showFeedback(`📋 ${sub.name} 五维考核完成（${grade}），政绩+${result.meritGain}`);
    void reload();
  };

  // ── 晋升/降级 ─────────────────────────────────────────────────
  const handlePromote = async (sub: Subordinate) => {
    if (!save) return;
    const maxSubLevel = Math.min(12, save.rankLevel - 1);
    if (sub.subLevel >= maxSubLevel) {
      showFeedback(`⚠ ${sub.name} 职级已达上限`);
      return;
    }
    const targetLevel = sub.subLevel + 1;
    const cap = SUB_LEVEL_MAX_COUNT[targetLevel] ?? 999;
    const countAtTarget = subordinates.filter(s => s.subLevel === targetLevel).length;
    if (countAtTarget >= cap) {
      showFeedback(`⚠ ${SUB_LEVEL_NAMES[targetLevel]}名额已满（上限${cap}人）`);
      return;
    }
    setPromotingId(sub.id);
    const deptName = DEPT_CONFIG[sub.appointedDept ?? 'police']?.name ?? '机关';
    await promoteSubordinate(save.id, sub.id, sub.subLevel, save.gameDays, sub.position, deptName);
    showFeedback(`✅ ${sub.name} 晋升为 ${SUB_LEVEL_NAMES[sub.subLevel + 1]}`);
    setPromotingId(null);
    void reload();
  };

  const handleDemote = async (sub: Subordinate) => {
    if (!save || sub.subLevel <= 1) return;
    setPromotingId(sub.id);
    const deptName = DEPT_CONFIG[sub.appointedDept ?? 'police']?.name ?? '机关';
    await demoteSubordinate(save.id, sub.id, sub.subLevel, save.gameDays, sub.position, deptName);
    showFeedback(`⚠ ${sub.name} 降级为 ${SUB_LEVEL_NAMES[sub.subLevel - 1]}`);
    setPromotingId(null);
    void reload();
  };

  // ── 后备干部切换 ─────────────────────────────────────────────
  const handleToggleReserve = async (sub: Subordinate) => {
    await setReserveStatus(sub.id, !sub.isReserve);
    showFeedback(sub.isReserve ? `已将 ${sub.name} 移出后备干部库` : `已将 ${sub.name} 列入后备干部库`);
    void reload();
  };

  // ── 处理干部事件 ─────────────────────────────────────────────
  const handleEvent = async (action: 'approve' | 'reject' | 'punish' | 'protect') => {
    if (!save || !eventSub || !eventSub.eventType) return;
    const result = await handleSubEvent(eventSub.id, eventSub.eventType, action);
    if (result.meritDelta !== 0) await updateGameSave({ meritPoints: save.meritPoints + result.meritDelta });
    showFeedback(result.feedback);
    setEventSub(null);
    void reload();
  };

  // ── 调任 ─────────────────────────────────────────────────────
  const handleTransfer = async () => {
    if (!save || !selectedSub || !transferCity.trim()) return;
    await transferSubordinate(selectedSub.id, transferCity.trim());
    showFeedback(`已将 ${selectedSub.name} 调任至${transferCity.trim()}`);
    setShowTransferModal(false);
    setTransferCity('');
    setSelectedSub(null);
    void reload();
  };

  // ── 分配工作任务 ─────────────────────────────────────────────
  const handleAssignWork = async (sub: Subordinate, task: typeof WORK_TASKS[0]) => {
    if (!save) return;
    await conductFiveDimReview(sub.id, save.gameDays, '称职');
    await updateGameSave({ meritPoints: save.meritPoints + task.meritReward });
    setWorkPanelId(null);
    showFeedback(`✅ 已向 ${sub.name} 分配「${task.label}」，政绩+${task.meritReward}`);
    void reload();
  };

  // ── 一键批量 ─────────────────────────────────────────────────
  const handleAutoAssign = async () => {
    if (!save) return;
    setBatchLoading(true);
    const count = await autoAssignSubordinates(save.id, save.userId);
    setBatchLoading(false);
    showFeedback(count > 0 ? `✅ 一键分配完成，已启动 ${count} 名干部的组织考察` : '所有岗位已满员或暂无待分配人员');
    void reload();
  };

  // ── 副职/正职快捷数量检查 ─────────────────────────────────────
  const getAppointedForDeptPosition = (deptKey: DeptKey, position: 'head' | 'deputy') =>
    subordinates.filter(s => s.appointedDept === deptKey && s.deptPosition === position && s.isAppointed);

  // ── 过滤 ──────────────────────────────────────────────────────
  const totalCount     = subordinates.filter(s => !s.transferredCity).length;
  const appointedCount = subordinates.filter(s => s.isAppointed && !s.transferredCity).length;
  const reserveCount   = subordinates.filter(s => s.isReserve).length;
  const reviewingCount = subordinates.filter(s => s.nominationStatus === 'reviewing').length;
  const eventCount     = pendingEvents.length;

  const filteredSubs = (() => {
    switch (tab) {
      case 'event':   return pendingEvents;
      case 'reserve': return [...subordinates.filter(s => s.isReserve)].sort((a, b) => b.subLevel - a.subLevel);
      case 'review':  return [...subordinates.filter(s => s.nominationStatus !== 'idle')].sort((a, b) => b.subLevel - a.subLevel);
      case 'dept':    return [];
      // 全部在职：按级别降序排列，同级按能力值倒排
      default:        return [...subordinates.filter(s => !s.transferredCity)].sort((a, b) => b.subLevel !== a.subLevel ? b.subLevel - a.subLevel : b.ability - a.ability);
    }
  })();

  // rank 12 专用
  if (save && save.rankLevel === 12) {
    return <MinistryRosterView save={save} onBack={() => router.back()} />;
  }
  // rank 13 专用
  if (save && save.rankLevel === 13) {
    return <DeptManagementView save={save} router={router} />;
  }

  const TABS: { key: MainTab; label: string; badge?: number }[] = [
    { key: 'event',   label: '📮 待处理',  badge: eventCount },
    { key: 'all',     label: '全部在职' },
    { key: 'dept',    label: '按部门' },
    { key: 'review',  label: '📋 考察中',  badge: reviewingCount },
    { key: 'reserve', label: '⭐ 后备库', badge: reserveCount },
  ];

  return (
    <View style={{ flex: 1, backgroundColor: '#F5F4F1' }}>
      <StatusBar style="light" backgroundColor="#1D3B5E" />

      {/* 顶栏 */}
      <View style={{ backgroundColor: '#2B4B6F', paddingTop: insets.top + 8, paddingBottom: 10, paddingHorizontal: 16 }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 8 }}>
          <Pressable onPress={() => router.back()}>
            <Text style={{ color: '#ccc', fontSize: 22, marginRight: 4 }}>‹</Text>
          </Pressable>
          <View style={{ flex: 1 }}>
            <Text style={{ color: '#a0b4cc', fontSize: 10, letterSpacing: 1 }}>{save?.rankName} · {save?.cityName}</Text>
            <Text style={{ color: '#fff', fontSize: 16, fontWeight: '700', letterSpacing: 1 }}>干部管理</Text>
          </View>
          <View style={{ alignItems: 'flex-end', gap: 2 }}>
            <Text style={{ color: '#a0b4cc', fontSize: 10 }}>在职{totalCount} · 任命{appointedCount}</Text>
            {eventCount > 0 && (
              <View style={{ backgroundColor: '#C82829', paddingHorizontal: 7, paddingVertical: 2 }}>
                <Text style={{ color: '#fff', fontSize: 10, fontWeight: '700' }}>⚠ {eventCount} 件待处理</Text>
              </View>
            )}
          </View>
        </View>
        {/* 操作行 */}
        <View style={{ flexDirection: 'row', gap: 8 }}>
          <Pressable onPress={() => void handleProcessNominations()} disabled={batchLoading}
            style={{ flex: 1, backgroundColor: '#15263d', borderWidth: 1, borderColor: '#a0b4cc', paddingVertical: 7, alignItems: 'center' }}>
            <Text style={{ color: '#fff', fontSize: 10, fontWeight: '700' }}>⚡ 推进考察审批</Text>
          </Pressable>
          <Pressable onPress={() => void handleAutoAssign()} disabled={batchLoading}
            style={{ flex: 1, backgroundColor: '#1a4a2e', paddingVertical: 7, alignItems: 'center' }}>
            <Text style={{ color: '#fff', fontSize: 10, fontWeight: '700' }}>🔄 自动提名岗位</Text>
          </Pressable>
        </View>
        {batchLoading && <ActivityIndicator size="small" color="#a0b4cc" style={{ marginTop: 6 }} />}
      </View>

      {/* Tab栏 — 用 View 包裹 ScrollView，确保 Android 上高度由内容撑开 */}
      <View style={{ flexShrink: 0, backgroundColor: '#fff', borderBottomWidth: 1, borderBottomColor: '#DDD' }}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ paddingHorizontal: 4 }}>
          {TABS.map(t => (
            <Pressable key={t.key} onPress={() => setTab(t.key)}
              style={{ paddingHorizontal: 10, paddingVertical: 10, borderBottomWidth: 2, borderBottomColor: tab === t.key ? '#2B4B6F' : 'transparent', flexDirection: 'row', alignItems: 'center', gap: 4 }}>
              <Text style={{ fontSize: 11, fontWeight: tab === t.key ? '700' : '400', color: tab === t.key ? '#2B4B6F' : '#888' }}>{t.label}</Text>
              {(t.badge ?? 0) > 0 && (
                <View style={{ backgroundColor: t.key === 'event' ? '#C82829' : '#2B4B6F', borderRadius: 8, paddingHorizontal: 5, paddingVertical: 1 }}>
                  <Text style={{ color: '#fff', fontSize: 9, fontWeight: '700' }}>{t.badge}</Text>
                </View>
              )}
            </Pressable>
          ))}
        </ScrollView>
      </View>

      {/* 反馈条 */}
      {feedback ? (
        <View style={{ backgroundColor: '#e8f5e9', borderBottomWidth: 1, borderBottomColor: '#c8e6c9', paddingHorizontal: 14, paddingVertical: 8 }}>
          <Text style={{ color: '#2a7a3b', fontSize: 11, fontWeight: '600' }}>{feedback}</Text>
        </View>
      ) : null}

      {/* 新录用干部提醒横幅 */}
      {newRecruits.length > 0 && (
        <View style={{ backgroundColor: '#FFF9E6', borderBottomWidth: 1, borderBottomColor: '#E6C84B', paddingHorizontal: 14, paddingVertical: 10 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
              <Text style={{ fontSize: 12, fontWeight: '700', color: '#7A5C00' }}>🔔 组织部新录用干部</Text>
              <View style={{ backgroundColor: '#C82829', paddingHorizontal: 6, paddingVertical: 1 }}>
                <Text style={{ color: '#fff', fontSize: 9, fontWeight: '700' }}>{newRecruits.length} 名</Text>
              </View>
            </View>
            <Pressable onPress={() => void handleDismissNewRecruits()} style={{ paddingHorizontal: 8, paddingVertical: 2 }}>
              <Text style={{ color: '#888', fontSize: 16 }}>✕</Text>
            </Pressable>
          </View>
          <Text style={{ fontSize: 10, color: '#7A5C00', marginBottom: 6 }}>
            国考/省考新录用干部已自动转入干部管理并全部在职，请及时安排工作。
          </Text>
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6 }}>
            {newRecruits.slice(0, 6).map(r => (
              <View key={r.id} style={{ backgroundColor: '#fff', borderWidth: 1, borderColor: '#E6C84B', paddingHorizontal: 8, paddingVertical: 3 }}>
                <Text style={{ fontSize: 10, color: '#333', fontWeight: '600' }}>{r.name}</Text>
              </View>
            ))}
            {newRecruits.length > 6 && (
              <View style={{ paddingHorizontal: 8, paddingVertical: 3 }}>
                <Text style={{ fontSize: 10, color: '#888' }}>等 {newRecruits.length} 人</Text>
              </View>
            )}
          </View>
        </View>
      )}

      {/* 干部事件弹窗 */}
      {eventSub && (
        <View style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.55)', zIndex: 99, justifyContent: 'center' }}>
          <EventPanel sub={eventSub} onHandle={handleEvent} onClose={() => setEventSub(null)} />
        </View>
      )}

      {/* 五维考核结果弹窗 */}
      {fiveDimResult && (
        <View style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.55)', zIndex: 99, justifyContent: 'center', padding: 20 }}>
          <View style={{ backgroundColor: '#fff', padding: 18, gap: 10 }}>
            <Text style={{ fontSize: 15, fontWeight: '700', color: '#2B4B6F' }}>📋 五维考核结果 · {fiveDimResult.sub.name}</Text>
            <View style={{ gap: 6 }}>
              {[
                { label: '德（政治品质）', value: fiveDimResult.de },
                { label: '能（工作能力）', value: fiveDimResult.neng },
                { label: '勤（工作态度）', value: fiveDimResult.qin },
                { label: '绩（工作实绩）', value: fiveDimResult.ji },
                { label: '廉（廉洁自律）', value: fiveDimResult.lian },
              ].map(item => {
                const color = item.value >= 80 ? '#2a7a3b' : item.value >= 60 ? '#e67e22' : '#C82829';
                return (
                  <View key={item.label}>
                    <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 2 }}>
                      <Text style={{ fontSize: 11, color: '#555' }}>{item.label}</Text>
                      <Text style={{ fontSize: 11, color, fontWeight: '700' }}>{item.value}分</Text>
                    </View>
                    <View style={{ height: 5, backgroundColor: '#EEE' }}>
                      <View style={{ height: 5, width: `${item.value}%`, backgroundColor: color }} />
                    </View>
                  </View>
                );
              })}
            </View>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingTop: 6, borderTopWidth: 1, borderTopColor: '#EEE' }}>
              <Text style={{ fontSize: 13, color: '#333', fontWeight: '700' }}>综合得分：{fiveDimResult.total} 分 · {fiveDimResult.grade}</Text>
              <Pressable onPress={() => setFiveDimResult(null)} style={{ backgroundColor: '#2B4B6F', paddingHorizontal: 16, paddingVertical: 8 }}>
                <Text style={{ color: '#fff', fontSize: 12, fontWeight: '700' }}>确认</Text>
              </Pressable>
            </View>
          </View>
        </View>
      )}

      {loading ? (
        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
          <ActivityIndicator size="large" color="#C82829" />
        </View>
      ) : tab === 'dept' && save ? (
        <DeptOrgView subordinates={subordinates} save={save} />
      ) : (
        <FlatList
          data={filteredSubs}
          keyExtractor={item => item.id}
          contentContainerStyle={{ padding: 14, paddingBottom: insets.bottom + 24 }}
          ListEmptyComponent={
            <View style={{ alignItems: 'center', marginTop: 60, gap: 8 }}>
              <Text style={{ color: '#888', fontSize: 14 }}>
                {tab === 'event' ? '暂无待处理事件' : tab === 'reserve' ? '后备干部库为空' : tab === 'review' ? '无进行中的考察程序' : '暂无人员'}
              </Text>
              {tab === 'event' && <Text style={{ color: '#aaa', fontSize: 11 }}>推进时间后可能触发干部随机事件</Text>}
              {tab === 'reserve' && <Text style={{ color: '#aaa', fontSize: 11 }}>在干部详情中点击「加入后备库」</Text>}
            </View>
          }
          ListHeaderComponent={
            tab === 'all' && save ? (
              <View style={{ marginBottom: 10, backgroundColor: '#EEF4FF', borderWidth: 1, borderColor: '#B8CCF0', padding: 10, gap: 4 }}>
                <Text style={{ fontSize: 11, color: '#2B4B6F', fontWeight: '700' }}>
                  📋 {save.rankName}（{save.rankLevel}级）任命权限
                </Text>
                <Text style={{ fontSize: 10, color: '#3A5A8A', lineHeight: 16 }}>
                  {getRankAppointDesc(save.rankLevel)}
                </Text>
                <Text style={{ fontSize: 10, color: '#5577AA', lineHeight: 16 }}>
                  正职任命须经5天组织考察 · 副职须经2天 · 考察结果受能力/廉洁/忠诚影响
                </Text>
              </View>
            ) : null
          }
          renderItem={({ item }) => (
            <SubCard
              item={item}
              save={save!}
              subordinates={subordinates}
              selectedSub={selectedSub}
              setSelectedSub={setSelectedSub}
              workPanelId={workPanelId}
              setWorkPanelId={setWorkPanelId}
              reviewPanelId={reviewPanelId}
              setReviewPanelId={setReviewPanelId}
              nominatePanelId={nominatePanelId}
              setNominatePanelId={setNominatePanelId}
              promotingId={promotingId}
              reviewingId={reviewingId}
              onNominate={handleStartNomination}
              onCancelNomination={handleCancelNomination}
              onRemove={handleRemove}
              onReview={handleFiveDimReview}
              onPromote={handlePromote}
              onDemote={handleDemote}
              onToggleReserve={handleToggleReserve}
              onAssignWork={handleAssignWork}
              onTransfer={() => setShowTransferModal(true)}
              onViewResume={async (sub) => {
                const resumes = await getSubResumes(sub.id);
                setResumeModal({ sub, resumes });
              }}
              onEventTap={() => setEventSub(item)}
              onPromoteToLeadership={() => router.push('/(app)/leadership')}
            />
          )}
        />
      )}

      {/* 调任弹窗 */}
      {showTransferModal && selectedSub && (
        <View style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.5)', alignItems: 'center', justifyContent: 'center', zIndex: 99 }}>
          <View style={{ backgroundColor: '#fff', padding: 20, width: '85%', gap: 12 }}>
            <Text style={{ fontSize: 15, fontWeight: '700', color: '#2B4B6F' }}>调任干部</Text>
            <Text style={{ fontSize: 12, color: '#888' }}>将 {selectedSub.name} 调任至其他城市，调任后不再参与本地任命</Text>
            <TextInput value={transferCity} onChangeText={setTransferCity} placeholder="输入目标城市名称"
              style={{ borderWidth: 1, borderColor: '#CCC', paddingHorizontal: 12, paddingVertical: 8, fontSize: 14 }} />
            <View style={{ flexDirection: 'row', gap: 10 }}>
              <Pressable onPress={() => { setShowTransferModal(false); setTransferCity(''); }}
                style={{ flex: 1, paddingVertical: 10, borderWidth: 1, borderColor: '#CCC', alignItems: 'center' }}>
                <Text style={{ color: '#666', fontSize: 13 }}>取消</Text>
              </Pressable>
              <Pressable onPress={() => void handleTransfer()}
                style={{ flex: 1, paddingVertical: 10, backgroundColor: '#2B4B6F', alignItems: 'center' }}>
                <Text style={{ color: '#fff', fontSize: 13, fontWeight: '700' }}>确认调任</Text>
              </Pressable>
            </View>
          </View>
        </View>
      )}

      {/* 履历弹窗 */}
      {resumeModal && (
        <View style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.55)', justifyContent: 'flex-end', zIndex: 99 }}>
          <View style={{ backgroundColor: '#fff', maxHeight: '65%' }}>
            <View style={{ backgroundColor: '#2B4B6F', padding: 14, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
              <View>
                <Text style={{ color: '#a0b4cc', fontSize: 10, letterSpacing: 1 }}>个人档案</Text>
                <Text style={{ color: '#fff', fontSize: 14, fontWeight: '700' }}>{resumeModal.sub.name} 履历</Text>
              </View>
              <Pressable onPress={() => setResumeModal(null)}>
                <Text style={{ color: '#a0b4cc', fontSize: 22 }}>×</Text>
              </Pressable>
            </View>
            <ScrollView contentContainerStyle={{ padding: 14, gap: 8 }}>
              {resumeModal.resumes.length === 0 ? (
                <View style={{ alignItems: 'center', paddingVertical: 24 }}>
                  <Text style={{ color: '#888', fontSize: 13 }}>暂无履历记录</Text>
                  <Text style={{ color: '#aaa', fontSize: 11, marginTop: 4 }}>任命或晋降级后将自动记录</Text>
                </View>
              ) : (
                resumeModal.resumes.map((r, i) => (
                  <View key={r.id} style={{ flexDirection: 'row', gap: 10 }}>
                    <View style={{ alignItems: 'center', width: 24 }}>
                      <View style={{ width: 10, height: 10, borderRadius: 5, backgroundColor: '#2B4B6F', marginTop: 2 }} />
                      {i < resumeModal.resumes.length - 1 && <View style={{ width: 1, flex: 1, backgroundColor: '#D1D1D1', marginTop: 2 }} />}
                    </View>
                    <View style={{ flex: 1, paddingBottom: 12 }}>
                      <Text style={{ fontSize: 12, fontWeight: '700', color: '#222' }}>{r.position}</Text>
                      <Text style={{ fontSize: 11, color: '#888', marginTop: 1 }}>{r.deptName}</Text>
                      <Text style={{ fontSize: 10, color: '#aaa', marginTop: 2 }}>第{r.startDay}天{r.endDay ? ` — 第${r.endDay}天` : ' — 至今'}</Text>
                      {r.note && <Text style={{ fontSize: 10, color: '#7a5c00', marginTop: 2, fontStyle: 'italic' }}>{r.note}</Text>}
                    </View>
                  </View>
                ))
              )}
            </ScrollView>
          </View>
        </View>
      )}
    </View>
  );
}

// ══════════════════════════════════════════════════════════════════════════════
// SubCard — 单条干部卡片
// ══════════════════════════════════════════════════════════════════════════════
type SubCardProps = {
  item: Subordinate;
  save: PlayerSave;
  subordinates: Subordinate[];
  selectedSub: Subordinate | null;
  setSelectedSub: (s: Subordinate | null) => void;
  workPanelId: string | null;
  setWorkPanelId: (id: string | null) => void;
  reviewPanelId: string | null;
  setReviewPanelId: (id: string | null) => void;
  nominatePanelId: string | null;
  setNominatePanelId: (id: string | null) => void;
  promotingId: string | null;
  reviewingId: string | null;
  onNominate: (sub: Subordinate, dept: DeptKey, position: 'head' | 'deputy') => void;
  onCancelNomination: (sub: Subordinate) => void;
  onRemove: (sub: Subordinate) => void;
  onReview: (sub: Subordinate, grade: ReviewGrade) => void;
  onPromote: (sub: Subordinate) => void;
  onDemote: (sub: Subordinate) => void;
  onToggleReserve: (sub: Subordinate) => void;
  onAssignWork: (sub: Subordinate, task: typeof WORK_TASKS[0]) => void;
  onTransfer: () => void;
  onViewResume: (sub: Subordinate) => void;
  onEventTap: () => void;
  onPromoteToLeadership: () => void;
};

function SubCard({ item, save, subordinates, selectedSub, setSelectedSub,
  workPanelId, setWorkPanelId, reviewPanelId, setReviewPanelId,
  nominatePanelId, setNominatePanelId,
  promotingId, reviewingId,
  onNominate, onCancelNomination, onRemove, onReview, onPromote, onDemote,
  onToggleReserve, onAssignWork, onTransfer, onViewResume, onEventTap, onPromoteToLeadership,
}: SubCardProps) {
  const isExpanded = selectedSub?.id === item.id;
  const avatarEmoji = getSubAvatarEmoji(item.avatarId ?? 0, item.gender ?? '男');
  const avatarBg    = getAvatarBgColor(item.avatarId ?? 0, item.faction ?? 'neutral');
  const factionLabel = FACTION_LABEL[item.faction] ?? '无';
  const factionColor = FACTION_COLOR[item.faction] ?? '#888';
  const levelName   = SUB_LEVEL_NAMES[item.subLevel] ?? '待定';
  const age         = calcSubAge(item.subLevel, item.name);
  const specColor   = CADRE_SPECIALTY_COLOR[item.specialty] ?? '#888';
  const specLabel   = CADRE_SPECIALTY_LABEL[item.specialty] ?? '通才';
  const hasEvent    = !item.eventHandled && !!item.eventType;
  const isBorrowed  = !!item.borrowedTo;
  const satisfColor = getSatisfactionColor(item.satisfaction);

  // 派系冲突检测（仅已任命正职时）
  const conflictWarning = item.isAppointed && item.deptPosition === 'head' && item.appointedDept
    ? detectFactionConflict(subordinates, item.appointedDept)
    : null;

  return (
    <Pressable onPress={() => setSelectedSub(isExpanded ? null : item)}
      style={{ backgroundColor: isBorrowed ? '#F5F5F0' : '#fff', borderWidth: 1, borderColor: hasEvent ? '#C82829' : isExpanded ? '#2B4B6F' : '#D1D1D1', padding: 12, marginBottom: 8, opacity: isBorrowed ? 0.75 : 1 }}>

      {/* 待处理事件提示条 */}
      {hasEvent && (
        <Pressable onPress={onEventTap} style={{ backgroundColor: '#fff0f0', borderWidth: 1, borderColor: '#C82829', padding: 7, marginBottom: 8, flexDirection: 'row', alignItems: 'center', gap: 6 }}>
          <Text style={{ fontSize: 12 }}>{SUB_EVENT_CONFIG[item.eventType!].icon}</Text>
          <Text style={{ fontSize: 10, color: '#C82829', fontWeight: '700', flex: 1 }}>
            {SUB_EVENT_CONFIG[item.eventType!].label} — 点击处理
          </Text>
          <View style={{ backgroundColor: '#C82829', paddingHorizontal: 5, paddingVertical: 2 }}>
            <Text style={{ color: '#fff', fontSize: 9, fontWeight: '700' }}>{SUB_EVENT_CONFIG[item.eventType!].urgency === 'high' ? '紧急' : '待处理'}</Text>
          </View>
        </Pressable>
      )}

      {/* 头部信息行 */}
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 8 }}>
        <View style={{ width: 44, height: 44, borderRadius: 22, backgroundColor: avatarBg, alignItems: 'center', justifyContent: 'center', borderWidth: 2, borderColor: item.isReserve ? '#FFD700' : 'rgba(255,255,255,0.25)' }}>
          <Text style={{ fontSize: 22 }}>{avatarEmoji}</Text>
        </View>
        <View style={{ flex: 1 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 5, flexWrap: 'wrap' }}>
            <Text style={{ fontSize: 14, fontWeight: '700', color: '#222' }}>{item.name}</Text>
            <Text style={{ fontSize: 10, color: '#888' }}>{item.gender} · {age}岁</Text>
            {item.isReserve && (
              <View style={{ backgroundColor: '#FFF0C0', borderWidth: 1, borderColor: '#D4A017', paddingHorizontal: 4, paddingVertical: 1 }}>
                <Text style={{ fontSize: 8, color: '#8B6A00', fontWeight: '700' }}>⭐ 后备</Text>
              </View>
            )}
            <View style={{ backgroundColor: factionColor + '22', borderWidth: 1, borderColor: factionColor, paddingHorizontal: 5, paddingVertical: 1 }}>
              <Text style={{ color: factionColor, fontSize: 9, fontWeight: '700' }}>{factionLabel}</Text>
            </View>
            <View style={{ backgroundColor: specColor + '18', borderWidth: 1, borderColor: specColor, paddingHorizontal: 5, paddingVertical: 1 }}>
              <Text style={{ fontSize: 9, color: specColor }}>专长·{specLabel}</Text>
            </View>
          </View>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 5, marginTop: 2 }}>
            <View style={{ backgroundColor: '#E8F0F8', paddingHorizontal: 5, paddingVertical: 1 }}>
              <Text style={{ fontSize: 9, color: '#2B4B6F' }}>{levelName}</Text>
            </View>
            {item.isAppointed && item.appointedDept && (() => {
              const rl = save.rankLevel;
              const dk = item.appointedDept;
              const roleText = item.deptPosition === 'head' ? getDeptHeadTitle(dk, rl) : item.deptPosition === 'deputy' ? getDeptDeputyTitle(dk, rl) : '科员';
              const bgColor = item.deptPosition === 'head' ? '#2B4B6F' : item.deptPosition === 'deputy' ? '#2a5a3e' : '#666';
              return (
                <View style={{ backgroundColor: bgColor, paddingHorizontal: 6, paddingVertical: 2 }}>
                  <Text style={{ color: '#fff', fontSize: 9 }}>{roleText}</Text>
                </View>
              );
            })()}
            {isBorrowed && (
              <View style={{ backgroundColor: '#888', paddingHorizontal: 5, paddingVertical: 1 }}>
                <Text style={{ color: '#fff', fontSize: 9 }}>借调至{item.borrowedTo}</Text>
              </View>
            )}
          </View>
        </View>
        <View style={{ alignItems: 'flex-end', gap: 4 }}>
          <Text style={{ fontSize: 9, color: satisfColor }}>满意度 {item.satisfaction}</Text>
          <Text style={{ fontSize: 10, color: '#2B4B6F', fontWeight: '700' }}>能力{item.ability}</Text>
          <Text style={{ fontSize: 10, color: '#7B5E2A' }}>忠诚{item.loyalty}</Text>
        </View>
      </View>

      {/* 四维指标条 */}
      <View style={{ flexDirection: 'row', gap: 10 }}>
        <View style={{ flex: 1 }}><StatBar label="能力" value={item.ability} /><StatBar label="忠诚" value={item.loyalty} /></View>
        <View style={{ flex: 1 }}><StatBar label="廉洁" value={item.integrity} /><StatBar label="经验" value={item.experience} /></View>
      </View>

      {/* 考察进度徽章 */}
      <NominationBadge sub={item} currentDay={save.gameDays} rankLevel={save.rankLevel} onResult={() => {}} />

      {/* 派系冲突警告 */}
      {conflictWarning && (
        <View style={{ backgroundColor: '#fff8e1', borderWidth: 1, borderColor: '#e6a817', padding: 5, marginTop: 6 }}>
          <Text style={{ fontSize: 9, color: '#8B6914' }}>⚠ 派系冲突：{conflictWarning}</Text>
        </View>
      )}

      {/* 展开详情 */}
      {isExpanded && !isBorrowed && (
        <View style={{ marginTop: 10, borderTopWidth: 1, borderTopColor: '#EEE', paddingTop: 10, gap: 8 }}>

          {/* 干部档案信息 */}
          <View style={{ backgroundColor: '#F8F6F0', padding: 8, gap: 3 }}>
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
              <Text style={{ fontSize: 10, color: '#555' }}>年龄：{age}岁</Text>
              <Text style={{ fontSize: 10, color: '#555' }}>职级：{levelName}（{item.subLevel}级）</Text>
              <Text style={{ fontSize: 10, color: '#555' }}>满意度：<Text style={{ color: satisfColor, fontWeight: '700' }}>{item.satisfaction}</Text></Text>
            </View>
            {item.lastReviewScores && (() => {
              try {
                const s = JSON.parse(item.lastReviewScores);
                return (
                  <Text style={{ fontSize: 9, color: '#888' }}>
                    最近考核（{s.grade}）— 德{s.de} 能{s.neng} 勤{s.qin} 绩{s.ji} 廉{s.lian}
                  </Text>
                );
              } catch { return null; }
            })()}
          </View>

          {/* 职级操作行 */}
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
            <Text style={{ fontSize: 10, color: '#555', flex: 1 }}>职级：{levelName}（上限{Math.min(12, (save?.rankLevel ?? 13) - 1)}级）</Text>
            <Pressable onPress={() => void onDemote(item)} disabled={promotingId === item.id || item.subLevel <= 1}
              style={{ paddingHorizontal: 10, paddingVertical: 5, backgroundColor: item.subLevel <= 1 ? '#CCC' : '#7a1a1a' }}>
              <Text style={{ color: '#fff', fontSize: 10 }}>▼ 降级</Text>
            </Pressable>
            <Pressable onPress={() => void onPromote(item)} disabled={promotingId === item.id || item.subLevel >= Math.min(12, (save?.rankLevel ?? 13) - 1)}
              style={{ paddingHorizontal: 10, paddingVertical: 5, backgroundColor: item.subLevel >= Math.min(12, (save?.rankLevel ?? 13) - 1) ? '#CCC' : '#1a4a2e' }}>
              <Text style={{ color: '#fff', fontSize: 10 }}>▲ 晋升</Text>
            </Pressable>
          </View>

          {/* 操作按钮行 */}
          <View style={{ flexDirection: 'row', gap: 6, flexWrap: 'wrap' }}>
            {/* 后备干部 */}
            <Pressable onPress={() => void onToggleReserve(item)}
              style={{ paddingHorizontal: 10, paddingVertical: 7, backgroundColor: item.isReserve ? '#7B5E00' : '#444', flexDirection: 'row', alignItems: 'center', gap: 4 }}>
              <Text style={{ fontSize: 11, color: '#fff' }}>{item.isReserve ? '⭐ 移出后备库' : '⭐ 加入后备库'}</Text>
            </Pressable>
            {/* 履历 */}
            <Pressable onPress={() => void onViewResume(item)}
              style={{ paddingHorizontal: 10, paddingVertical: 7, backgroundColor: '#2a2a4a' }}>
              <Text style={{ fontSize: 11, color: '#fff' }}>📁 履历</Text>
            </Pressable>
            {/* 分配工作 */}
            <Pressable onPress={() => setWorkPanelId(workPanelId === item.id ? null : item.id)}
              style={{ paddingHorizontal: 10, paddingVertical: 7, backgroundColor: workPanelId === item.id ? '#0e2240' : '#2B4B6F' }}>
              <Text style={{ fontSize: 11, color: '#fff' }}>📋 分配工作</Text>
            </Pressable>
            {/* 五维考核 */}
            <Pressable onPress={() => setReviewPanelId(reviewPanelId === item.id ? null : item.id)}
              style={{ paddingHorizontal: 10, paddingVertical: 7, backgroundColor: reviewPanelId === item.id ? '#7a1010' : '#C82829' }}>
              <Text style={{ fontSize: 11, color: '#fff' }}>🏆 五维考核</Text>
            </Pressable>
            {/* 解除职务 */}
            {item.isAppointed && (
              <Pressable onPress={() => void onRemove(item)}
                style={{ paddingHorizontal: 10, paddingVertical: 7, borderWidth: 1, borderColor: '#CCC' }}>
                <Text style={{ fontSize: 11, color: '#666' }}>解除职务</Text>
              </Pressable>
            )}
            {/* 调任 */}
            <Pressable onPress={onTransfer}
              style={{ paddingHorizontal: 10, paddingVertical: 7, borderWidth: 1, borderColor: '#666', backgroundColor: '#444' }}>
              <Text style={{ fontSize: 11, color: '#fff' }}>调任</Text>
            </Pressable>
            {/* 提拔至领导班子 */}
            {item.isAppointed && item.deptPosition === 'head' && (
              <Pressable onPress={onPromoteToLeadership} style={{ paddingHorizontal: 10, paddingVertical: 7, backgroundColor: '#7A5C00', flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                <Text style={{ fontSize: 11, color: '#fff', fontWeight: '700' }}>⭐ 提拔至领导班子</Text>
              </Pressable>
            )}
          </View>

          {/* ── 任命提名面板 ── */}
          {item.nominationStatus === 'idle' && (
            <View>
              <Pressable onPress={() => setNominatePanelId(nominatePanelId === item.id ? null : item.id)}
                style={{ backgroundColor: nominatePanelId === item.id ? '#0D1F35' : '#1D3B5E', paddingVertical: 9, paddingHorizontal: 12, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
                <Text style={{ color: '#fff', fontSize: 11, fontWeight: '700' }}>🏛️ 启动组织考察 · 提名任职</Text>
                <Text style={{ color: '#a0b4cc', fontSize: 10 }}>{nominatePanelId === item.id ? '▲ 收起' : '▼ 展开'}</Text>
              </Pressable>
              {nominatePanelId === item.id && (
                <View style={{ backgroundColor: '#F0F4F8', borderWidth: 1, borderColor: '#2B4B6F', padding: 10, gap: 6 }}>
                  <Text style={{ fontSize: 10, color: '#555', marginBottom: 4 }}>
                    ⚠ 正职须经5天考察期 · 副职须经2天 · 考察结果受能力/廉洁影响 · 可随时撤回
                  </Text>
                  <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                    <View style={{ flexDirection: 'row', gap: 6 }}>
                      {(Object.keys(DEPT_CONFIG) as DeptKey[]).map(dk => {
                        const deptName = getDeptNameByRank(dk, save.rankLevel);
                        const headFull = subordinates.filter(s => s.appointedDept === dk && s.deptPosition === 'head' && s.isAppointed).length >= 1;
                        const depFull  = subordinates.filter(s => s.appointedDept === dk && s.deptPosition === 'deputy' && s.isAppointed).length >= 3;
                        const match = getMatchBonus(item.specialty, dk);
                        return (
                          <View key={dk} style={{ alignItems: 'center', gap: 4, minWidth: 68 }}>
                            <Text style={{ fontSize: 9, color: '#333', fontWeight: '600', textAlign: 'center' }} numberOfLines={2}>{deptName}</Text>
                            {match ? <Text style={{ fontSize: 8, color: '#2a7a3b' }}>{match}</Text> : null}
                            <Pressable onPress={() => onNominate(item, dk, 'head')}
                              disabled={headFull}
                              style={{ paddingHorizontal: 8, paddingVertical: 5, backgroundColor: headFull ? '#CCC' : '#2B4B6F', width: 56, alignItems: 'center' }}>
                              <Text style={{ color: '#fff', fontSize: 9, fontWeight: '700' }}>{headFull ? '正满' : '提名正职'}</Text>
                            </Pressable>
                            <Pressable onPress={() => onNominate(item, dk, 'deputy')}
                              disabled={depFull}
                              style={{ paddingHorizontal: 8, paddingVertical: 5, backgroundColor: depFull ? '#CCC' : '#2a5a3e', width: 56, alignItems: 'center' }}>
                              <Text style={{ color: '#fff', fontSize: 9, fontWeight: '700' }}>{depFull ? '副满' : '提名副职'}</Text>
                            </Pressable>
                          </View>
                        );
                      })}
                    </View>
                  </ScrollView>
                </View>
              )}
            </View>
          )}

          {/* 撤回考察按钮 */}
          {item.nominationStatus === 'reviewing' && (
            <Pressable onPress={() => void onCancelNomination(item)}
              style={{ backgroundColor: '#7a1a1a', paddingVertical: 8, alignItems: 'center' }}>
              <Text style={{ color: '#fff', fontSize: 11 }}>撤回考察提名</Text>
            </Pressable>
          )}
          {item.nominationStatus === 'rejected' && (
            <Pressable onPress={() => void resetNominationRejected(item.id).then(() => setNominatePanelId(null))}
              style={{ backgroundColor: '#555', paddingVertical: 8, alignItems: 'center' }}>
              <Text style={{ color: '#fff', fontSize: 11 }}>重新提名</Text>
            </Pressable>
          )}

          {/* ── 分配工作面板 ── */}
          {workPanelId === item.id && (
            <View style={{ backgroundColor: '#F0F4F8', borderWidth: 1, borderColor: '#2B4B6F', padding: 10, gap: 6 }}>
              <Text style={{ fontSize: 10, color: '#2B4B6F', fontWeight: '700', letterSpacing: 1, marginBottom: 4 }}>📋 选择工作任务</Text>
              {WORK_TASKS.map(task => (
                <Pressable key={task.label} onPress={() => void onAssignWork(item, task)}
                  style={{ flexDirection: 'row', alignItems: 'center', backgroundColor: '#fff', borderWidth: 1, borderColor: '#D1D1D1', padding: 8, gap: 8 }}>
                  <View style={{ flex: 1 }}>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                      <Text style={{ fontSize: 12, fontWeight: '700', color: '#222' }}>{task.label}</Text>
                      <View style={{ backgroundColor: '#2B4B6F', paddingHorizontal: 4, paddingVertical: 1 }}>
                        <Text style={{ color: '#fff', fontSize: 8 }}>{task.tag}</Text>
                      </View>
                      <Text style={{ fontSize: 10, color: '#2a7a3b', fontWeight: '600' }}>政绩+{task.meritReward}</Text>
                    </View>
                    <Text style={{ fontSize: 10, color: '#888', marginTop: 2 }}>{task.desc}</Text>
                  </View>
                  <View style={{ backgroundColor: '#2a7a3b', paddingHorizontal: 8, paddingVertical: 4 }}>
                    <Text style={{ color: '#fff', fontSize: 10, fontWeight: '700' }}>分配</Text>
                  </View>
                </Pressable>
              ))}
            </View>
          )}

          {/* ── 五维考核面板 ── */}
          {reviewPanelId === item.id && (
            <View style={{ backgroundColor: '#FFF5F5', borderWidth: 1, borderColor: '#C82829', padding: 10, gap: 6 }}>
              <Text style={{ fontSize: 10, color: '#C82829', fontWeight: '700', letterSpacing: 1, marginBottom: 2 }}>🏆 年度五维考核（德·能·勤·绩·廉）</Text>
              <Text style={{ fontSize: 9, color: '#888', marginBottom: 6 }}>考核将产生随机分值波动，综合影响干部各项指标</Text>
              {reviewingId === item.id ? (
                <ActivityIndicator size="small" color="#C82829" />
              ) : (
                REVIEW_GRADES.map(grade => (
                  <Pressable key={grade.label} onPress={() => void onReview(item, grade.label as ReviewGrade)}
                    style={{ flexDirection: 'row', alignItems: 'center', backgroundColor: '#fff', borderWidth: 1, borderColor: grade.color + '66', padding: 8, gap: 8 }}>
                    <View style={{ backgroundColor: grade.color, paddingHorizontal: 8, paddingVertical: 3, minWidth: 56, alignItems: 'center' }}>
                      <Text style={{ color: '#fff', fontSize: 11, fontWeight: '700' }}>{grade.label}</Text>
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={{ fontSize: 10, color: '#555' }}>{grade.desc}</Text>
                      {grade.meritGain > 0 && <Text style={{ fontSize: 9, color: '#2a7a3b', marginTop: 2 }}>政绩+{grade.meritGain}</Text>}
                    </View>
                  </Pressable>
                ))
              )}
            </View>
          )}
        </View>
      )}
    </Pressable>
  );
}

// ── 按部门组织架构视图 ────────────────────────────────────────────
function DeptOrgView({ subordinates, save }: { subordinates: Subordinate[]; save: PlayerSave }) {
  const insets = useSafeAreaInsets();
  const rl = save.rankLevel;
  const DEPT_KEYS: DeptKey[] = ['police', 'ndrc', 'finance', 'urban', 'education', 'health', 'ecology', 'market', 'agriculture', 'personnel', 'invest', 'tax'];

  const concurrentByDept: Record<string, string> = {};
  Object.entries(LEADERSHIP_CONCURRENT).forEach(([_roleKey, { deptKey, label }]) => {
    if (!concurrentByDept[deptKey]) concurrentByDept[deptKey] = label;
  });

  return (
    <ScrollView contentContainerStyle={{ padding: 14, paddingBottom: insets.bottom + 24, gap: 12 }}>
      <View style={{ backgroundColor: '#EEF4FF', borderWidth: 1, borderColor: '#B8CCF0', padding: 8, marginBottom: 4 }}>
        <Text style={{ fontSize: 11, color: '#2B4B6F', fontWeight: '600' }}>🏢 职能部门编制 · {save.rankName}</Text>
        <Text style={{ fontSize: 10, color: '#5577AA', marginTop: 2 }}>
          正职经5天组织考察 · 副职经2天考察 · 🎯标识专长匹配岗位
        </Text>
      </View>
      {DEPT_KEYS.map(dk => {
        const cfg = DEPT_CONFIG[dk];
        const deptName   = getDeptNameByRank(dk, rl);
        const headTitle  = getDeptHeadTitle(dk, rl);
        const deputyTitle = getDeptDeputyTitle(dk, rl);
        const heads    = subordinates.filter(s => s.appointedDept === dk && s.deptPosition === 'head' && s.isAppointed);
        const deputies = subordinates.filter(s => s.appointedDept === dk && s.deptPosition === 'deputy' && s.isAppointed);
        const reviewing = subordinates.filter(s => s.nominationDept === dk && s.nominationStatus === 'reviewing');
        const conflict = detectFactionConflict(subordinates, dk);
        const isEmpty = heads.length === 0;

        return (
          <View key={dk} style={{ backgroundColor: '#fff', borderWidth: 1, borderColor: conflict ? '#e67e22' : '#DDD', overflow: 'hidden' }}>
            <View style={{ backgroundColor: '#2B4B6F', paddingHorizontal: 12, paddingVertical: 8, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                <Text style={{ fontSize: 14 }}>{cfg.icon ?? '🏛️'}</Text>
                <Text style={{ color: '#fff', fontWeight: '700', fontSize: 13 }}>{deptName}</Text>
              </View>
              <View style={{ flexDirection: 'row', gap: 5 }}>
                {reviewing.length > 0 && (
                  <View style={{ backgroundColor: '#e6a817', paddingHorizontal: 6, paddingVertical: 2 }}>
                    <Text style={{ color: '#fff', fontSize: 9 }}>考察中{reviewing.length}人</Text>
                  </View>
                )}
                {isEmpty && (
                  <View style={{ backgroundColor: '#C82829', paddingHorizontal: 6, paddingVertical: 2 }}>
                    <Text style={{ color: '#fff', fontSize: 9 }}>虚位待任</Text>
                  </View>
                )}
              </View>
            </View>
            {conflict && (
              <View style={{ backgroundColor: '#FFF8E1', padding: 6, borderBottomWidth: 1, borderBottomColor: '#FFE082' }}>
                <Text style={{ fontSize: 9, color: '#8B6914' }}>⚠ {conflict}</Text>
              </View>
            )}
            {concurrentByDept[dk] && (
              <View style={{ backgroundColor: '#FFFDE7', borderBottomWidth: 1, borderBottomColor: '#FFF9C4', paddingHorizontal: 12, paddingVertical: 4 }}>
                <Text style={{ fontSize: 9, color: '#8B6914' }}>⚡ 惯例：领导班子成员通常{concurrentByDept[dk]}</Text>
              </View>
            )}
            {/* 正职 */}
            <View style={{ paddingHorizontal: 12, paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: '#F5F5F5' }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 4 }}>
                <View style={{ backgroundColor: '#C82829', paddingHorizontal: 5, paddingVertical: 1 }}>
                  <Text style={{ color: '#fff', fontSize: 9, fontWeight: '700' }}>正职</Text>
                </View>
                <Text style={{ fontSize: 11, color: '#555' }}>{headTitle}（{SUB_LEVEL_NAMES[getDeptPositionSubLevel(dk, rl, 'head')]}级）</Text>
              </View>
              {heads.length > 0 ? heads.map(s => (
                <View key={s.id} style={{ flexDirection: 'row', alignItems: 'center', gap: 8, paddingVertical: 3 }}>
                  <Text style={{ fontSize: 13 }}>{getSubAvatarEmoji(s.avatarId ?? 0, s.gender ?? '男')}</Text>
                  <Text style={{ fontSize: 13, fontWeight: '600', color: '#1a1a1a' }}>{s.name}</Text>
                  <View style={{ backgroundColor: CADRE_SPECIALTY_COLOR[s.specialty] + '22', borderWidth: 1, borderColor: CADRE_SPECIALTY_COLOR[s.specialty], paddingHorizontal: 4, paddingVertical: 1 }}>
                    <Text style={{ fontSize: 8, color: CADRE_SPECIALTY_COLOR[s.specialty] }}>{CADRE_SPECIALTY_LABEL[s.specialty]}</Text>
                  </View>
                  <Text style={{ fontSize: 10, color: '#888', flex: 1 }}>能力{s.ability} · 廉{s.integrity}</Text>
                </View>
              )) : (
                <Text style={{ fontSize: 11, color: '#C82829' }}>⚠ 正职空缺，需发起组织考察</Text>
              )}
            </View>
            {/* 副职 */}
            <View style={{ paddingHorizontal: 12, paddingVertical: 8 }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 4 }}>
                <View style={{ backgroundColor: '#2a5a3e', paddingHorizontal: 5, paddingVertical: 1 }}>
                  <Text style={{ color: '#fff', fontSize: 9, fontWeight: '700' }}>副职</Text>
                </View>
                <Text style={{ fontSize: 11, color: '#555' }}>{deputyTitle}（最多3名）</Text>
              </View>
              {deputies.length > 0 ? deputies.map(s => (
                <View key={s.id} style={{ flexDirection: 'row', alignItems: 'center', gap: 8, paddingVertical: 2 }}>
                  <Text style={{ fontSize: 12 }}>{getSubAvatarEmoji(s.avatarId ?? 0, s.gender ?? '男')}</Text>
                  <Text style={{ fontSize: 12, fontWeight: '500', color: '#333' }}>{s.name}</Text>
                  <Text style={{ fontSize: 10, color: '#888' }}>能力{s.ability}</Text>
                </View>
              )) : (
                <Text style={{ fontSize: 11, color: '#aaa' }}>暂无副职</Text>
              )}
            </View>
          </View>
        );
      })}
      <View style={{ height: 20 }} />
    </ScrollView>
  );
}
```

<a id="srcappapptaskstsx"></a>
## `src/app/(app)/tasks.tsx`

```tsx
// 上司关系与任务页面（双Tab合并版）
// 所有数值、阈值、概率、档位均从统一配置表读取，禁止硬编码。
import { useCallback, useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { useRouter, useFocusEffect } from 'expo-router';
import { useGame } from '@/ctx/GameContext';
import { getRankTheme } from '@/lib/rankTheme';
import { RANK_CONFIG } from '@/types/game';
import {
  getBossTasks, completeTask, postponeTask, addNewTask,
  getBossInteractions, performBossAction, getPlayerHealth, consumeEnergy,
} from '@/db/gameApi';
import { getBossFavorMultiplier, hashNameToFaction } from '@/lib/factionSystem';
import type { BossTask } from '@/types/game';
import type { BossInteraction } from '@/db/gameApi';
import {
  BOSS_LEVELS, BOSS_ACTIONS, BOSS_CONSTRAINTS,
  FAVOR_HINTS, URGENCY, TASK_CONSTRAINTS,
  getBossStyle, getBossInfo, getFavorLevel, getTaskProgress,
  isTaskComplete, progressColor, computeFavorDelta,
  type ActionType,
} from '@/config/bossTaskConfig';

export default function TasksScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { save, updateGameSave } = useGame();
  const theme = getRankTheme(save?.rankLevel ?? 1);
  const [activeTab, setActiveTab] = useState<'relation' | 'tasks'>('relation');
  const [tasks, setTasks] = useState<BossTask[]>([]);
  const [interactions, setInteractions] = useState<BossInteraction[]>([]);
  const [energy, setEnergy] = useState(100);
  const [loading, setLoading] = useState(true);
  const [feedback, setFeedback] = useState('');

  const loadData = useCallback(async () => {
    if (!save) return;
    const [t, i, h] = await Promise.all([
      getBossTasks(save.id),
      getBossInteractions(save.id),
      getPlayerHealth(save.id),
    ]);
    setTasks(t);
    setInteractions(i);
    setEnergy(h?.energy ?? 100);
    setLoading(false);
  }, [save]);

  useFocusEffect(useCallback(() => { loadData(); }, [loadData]));

  const showFeedback = (msg: string) => {
    setFeedback(msg);
    setTimeout(() => setFeedback(''), 3000);
  };

  if (!save) return null;
  const gameDays = save.gameDays ?? 0;

  // 执行上司关系操作
  const handleBossAction = async (level: number, actionType: ActionType) => {
    const info = getBossInfo(level, save);
    const name = save[info.nameField];
    const action = BOSS_ACTIONS.find(a => a.key === actionType);
    if (!action) return;
    if (energy < action.energyCost) {
      showFeedback('精力不足，无法执行该操作');
      return;
    }
    const delta = await performBossAction(save.id, level, name, actionType, gameDays, interactions);
    if (delta === 0) {
      showFeedback('该操作冷却中，请稍后再试');
      return;
    }
    // §4.4 上司好感倍率：同派×1.3 / 对立派×0.6 / isFlagged 再×0.7
    const mult = getBossFavorMultiplier(
      (save.primaryFaction || null) as import('@/types/game').FactionId | null,
      hashNameToFaction(name),
      save.isFlagged ?? false,
    );
    const adjDelta = Math.round(delta * mult);
    const cur = save[info.favorField];
    const next = Math.min(BOSS_CONSTRAINTS.favorCap, cur + adjDelta);
    await consumeEnergy(save.id, action.energyCost, 0, gameDays);
    await updateGameSave({ [info.favorField]: next });
    setEnergy(e => Math.max(0, e - action.energyCost));
    showFeedback(`✓ ${action.label}：好感 ${adjDelta >= 0 ? '+' : ''}${adjDelta}${mult !== 1 ? `（派系倍率×${mult.toFixed(2)}）` : ''}`);
    loadData();
  };

  // 交付任务
  const handleComplete = async (task: BossTask) => {
    const ok = isTaskComplete(task.taskType, task.title, task.targetValue, save);
    if (!ok) { showFeedback('任务进度尚未达标，无法交付'); return; }
    await completeTask(task.id);
    const info = getBossInfo(task.bossLevel, save);
    // §4.4 上司好感倍率同样作用于任务交付
    const mult = getBossFavorMultiplier(
      (save.primaryFaction || null) as import('@/types/game').FactionId | null,
      hashNameToFaction(save[info.nameField]),
      save.isFlagged ?? false,
    );
    const cur = save[info.favorField];
    await updateGameSave({
      meritPoints: Math.min(9999, (save.meritPoints ?? 0) + task.rewardMerit),
      [info.favorField]: Math.min(BOSS_CONSTRAINTS.favorCap, cur + Math.round(task.rewardFavor * mult)),
    });
    showFeedback(`✓ 任务完成：政绩 +${task.rewardMerit}，好感 +${task.rewardFavor}`);
    loadData();
  };

  // 申请减负
  const handlePostpone = async (task: BossTask) => {
    if (task.isPostponed) { showFeedback('该任务已申请过减负'); return; }
    if ((save.meritPoints ?? 0) < TASK_CONSTRAINTS.postponeMeritCost) {
      showFeedback(`政绩不足，减负需消耗 ${TASK_CONSTRAINTS.postponeMeritCost} 政绩`);
      return;
    }
    await postponeTask(task.id);
    await updateGameSave({
      meritPoints: Math.max(0, (save.meritPoints ?? 0) - TASK_CONSTRAINTS.postponeMeritCost),
    });
    showFeedback(`✓ 已申请减负，期限延长 ${TASK_CONSTRAINTS.postponeDays} 天`);
    loadData();
  };

  // 申请新任务
  const handleAddTask = async () => {
    const activeCount = tasks.filter(t => t.status === 'active').length;
    if (activeCount >= TASK_CONSTRAINTS.activeLimit) {
      showFeedback('当前任务过多，请先完成现有任务');
      return;
    }
    const ok = await addNewTask(save.id, save.userId, gameDays);
    if (!ok) { showFeedback('当前任务过多，请先完成现有任务'); return; }
    showFeedback('✓ 已向上司申请新任务');
    loadData();
  };

  // 冷却剩余天数
  const cooldownRemain = (level: number, actionType: ActionType): number => {
    const last = interactions
      .filter(i => i.bossLevel === level && i.actionType === actionType)
      .sort((a, b) => b.gameDay - a.gameDay)[0];
    if (!last) return 0;
    return Math.max(0, BOSS_CONSTRAINTS.cooldownDays - (gameDays - last.gameDay));
  };

  // 好感提示
  const favorHint = (favor: number): string => {
    if (favor >= FAVOR_HINTS.recommendActive) return '🔑 晋升推荐加成已激活';
    if (favor >= FAVOR_HINTS.assessFavor) return '📋 年度考核评优有利';
    if (favor < FAVOR_HINTS.worsenWarn) return '⚠️ 关系恶化可能影响晋升';
    return '维护好感，有助于年底评定';
  };

  const activeTasks = tasks.filter(t => t.status === 'active');

  if (loading) {
    return (
      <View style={{ flex: 1, backgroundColor: theme.pageBg, alignItems: 'center', justifyContent: 'center' }}>
        <ActivityIndicator color={theme.primary} />
      </View>
    );
  }

  return (
    <View style={{ flex: 1, backgroundColor: theme.pageBg }}>
      <StatusBar style={theme.statusBarStyle} backgroundColor={theme.headerBg} />

      {/* 头部 */}
      <View style={{ backgroundColor: theme.headerBg, paddingTop: insets.top + 8, paddingHorizontal: 16 }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
          <Pressable onPress={() => router.back()}>
            <Text style={{ color: theme.headerText, fontSize: 22 }}>←</Text>
          </Pressable>
          <Text style={{ color: theme.headerText, fontSize: 16, fontWeight: '700' }}>上司关系与任务</Text>
        </View>
        <View style={{ height: theme.decorLineHeight, backgroundColor: theme.decorLine, marginTop: 10 }} />
      </View>

      {/* Tab 切换 */}
      <View style={{ flexDirection: 'row', backgroundColor: theme.headerBg }}>
        {(['relation', 'tasks'] as const).map(tab => (
          <Pressable
            key={tab}
            onPress={() => setActiveTab(tab)}
            style={{ flex: 1, paddingVertical: 10, alignItems: 'center', borderBottomWidth: 2, borderBottomColor: activeTab === tab ? theme.accent : 'transparent' }}
          >
            <Text style={{ color: activeTab === tab ? theme.accent : theme.headerSub, fontSize: 13, fontWeight: activeTab === tab ? '700' : '400' }}>
              {tab === 'relation' ? '上司关系' : '上司任务'}
            </Text>
          </Pressable>
        ))}
      </View>

      {/* feedback */}
      {feedback ? (
        <View style={{ backgroundColor: theme.accentBg, paddingHorizontal: 16, paddingVertical: 8 }}>
          <Text style={{ color: theme.accent, fontSize: 12, fontWeight: '600' }}>{feedback}</Text>
        </View>
      ) : null}

      <ScrollView contentContainerStyle={{ padding: 12, paddingBottom: insets.bottom + 24 }}>
        {activeTab === 'relation' ? (
          <View style={{ gap: 12 }}>
            <Text style={{ color: theme.mutedText, fontSize: 11, lineHeight: 18 }}>
              体制内生存法则：主动维护上司关系，是晋升的隐性前提。不同上司有不同偏好，选择正确的方式事半功倍。每种操作每{BOSS_CONSTRAINTS.cooldownDays}天只能使用一次。
            </Text>
            {BOSS_LEVELS.map(bl => {
              const name = save[bl.nameField] || RANK_CONFIG[save.rankLevel]?.[bl.level === 1 ? 'bossTitle' : bl.level === 2 ? 'bossTitle2' : 'bossTitle3'] || bl.rankHint;
              const favor = save[bl.favorField] ?? 50;
              const style = getBossStyle(name);
              const level = getFavorLevel(favor);
              return (
                <View key={bl.level} style={{ backgroundColor: theme.cardBg, borderWidth: 1, borderColor: theme.cardBorder, borderTopWidth: theme.decorLineHeight, borderTopColor: style.color, padding: 12 }}>
                  {/* 上司信息 */}
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 8 }}>
                    <View style={{ width: 36, height: 36, backgroundColor: style.color, alignItems: 'center', justifyContent: 'center' }}>
                      <Text style={{ fontSize: 18 }}>👔</Text>
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={{ fontSize: 9, color: theme.mutedText, letterSpacing: 1 }}>{bl.rankHint}</Text>
                      <Text style={{ fontSize: 14, fontWeight: '700', color: theme.valueText, marginTop: 2 }}>{name}</Text>
                    </View>
                    <View style={{ alignItems: 'flex-end' }}>
                      <Text style={{ fontSize: 9, color: style.color, fontWeight: '700' }}>{style.label}</Text>
                      <Text style={{ fontSize: 20, fontWeight: '700', color: level.color, marginTop: 2 }}>{favor}</Text>
                    </View>
                  </View>
                  {/* 风格提示 */}
                  <Text style={{ fontSize: 10, color: theme.mutedText, marginBottom: 4 }}>{style.desc} · {style.tip}</Text>
                  {/* 好感等级条 */}
                  <View style={{ height: 6, backgroundColor: theme.progressBg, marginBottom: 4 }}>
                    <View style={{ height: 6, width: `${favor}%`, backgroundColor: level.color }} />
                  </View>
                  <Text style={{ fontSize: 10, color: level.color, fontWeight: '600', marginBottom: 8 }}>{level.label} · {favorHint(favor)}</Text>
                  {/* 操作按钮 */}
                  <View style={{ flexDirection: 'row', gap: 6 }}>
                    {BOSS_ACTIONS.map(act => {
                      const cd = cooldownRemain(bl.level, act.key);
                      const disabled = cd > 0 || energy < act.energyCost;
                      const preview = computeFavorDelta(style.key, act.key, act.baseFavor);
                      return (
                        <Pressable
                          key={act.key}
                          onPress={() => handleBossAction(bl.level, act.key)}
                          style={{ flex: 1, borderWidth: 1, borderColor: disabled ? theme.cardBorder : style.color, padding: 8, alignItems: 'center', opacity: disabled ? 0.5 : 1 }}
                        >
                          <Text style={{ fontSize: 11, fontWeight: '600', color: theme.valueText }}>{act.label}</Text>
                          <Text style={{ fontSize: 9, color: theme.mutedText, marginTop: 2 }}>精力{act.energyCost} · +{preview}</Text>
                          {cd > 0 ? <Text style={{ fontSize: 9, color: theme.statLow, marginTop: 2 }}>冷却{cd}天</Text> : null}
                        </Pressable>
                      );
                    })}
                  </View>
                </View>
              );
            })}
          </View>
        ) : (
          <View style={{ gap: 12 }}>
            <Text style={{ color: theme.mutedText, fontSize: 11, lineHeight: 18 }}>
              上司下达的任务是体制内隐性考核的重要组成部分。任务超时未完成，将扣除政绩与上司好感，影响年底评优与晋升。
            </Text>
            {/* 申请新任务 */}
            <Pressable onPress={handleAddTask} style={{ backgroundColor: theme.primary, paddingVertical: 10, alignItems: 'center' }}>
              <Text style={{ color: theme.primaryText, fontSize: 13, fontWeight: '700' }}>向上司申请新任务</Text>
            </Pressable>
            {activeTasks.map(task => {
              const info = getBossInfo(task.bossLevel, save);
              const progress = getTaskProgress(task.taskType, task.title, task.targetValue, save);
              const complete = isTaskComplete(task.taskType, task.title, task.targetValue, save);
              const remainDays = task.deadlineDays - gameDays;
              const urgent = remainDays < TASK_CONSTRAINTS.warningDays;
              const pColor = progressColor(progress, task.targetValue);
              return (
                <View key={task.id} style={{ backgroundColor: theme.cardBg, borderWidth: 1, borderColor: theme.cardBorder, borderTopWidth: theme.decorLineHeight, borderTopColor: URGENCY[task.urgency].color, padding: 12 }}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 4 }}>
                    <Text style={{ fontSize: 13, fontWeight: '700', color: theme.valueText, flex: 1 }}>{task.title}</Text>
                    <View style={{ backgroundColor: URGENCY[task.urgency].color, paddingHorizontal: 6, paddingVertical: 2 }}>
                      <Text style={{ color: '#fff', fontSize: 9, fontWeight: '700' }}>{URGENCY[task.urgency].label}</Text>
                    </View>
                  </View>
                  <Text style={{ fontSize: 10, color: theme.mutedText, lineHeight: 16, marginBottom: 6 }}>{task.description}</Text>
                  {/* 进度条 */}
                  <View style={{ height: 8, backgroundColor: theme.progressBg, marginBottom: 4 }}>
                    <View style={{ height: 8, width: `${Math.min(100, (progress / task.targetValue) * 100)}%`, backgroundColor: pColor }} />
                  </View>
                  <Text style={{ fontSize: 10, color: theme.mutedText, marginBottom: 8 }}>进度 {Math.round(progress)}/{task.targetValue} · 剩余 {remainDays} 天 · 来自{info.rankHint}</Text>
                  {/* 奖励与惩罚 */}
                  <View style={{ flexDirection: 'row', gap: 8, marginBottom: 8 }}>
                    <View style={{ flex: 1, backgroundColor: theme.accentBg, padding: 6 }}>
                      <Text style={{ fontSize: 9, color: theme.mutedText }}>完成奖励</Text>
                      <Text style={{ fontSize: 11, color: theme.statHigh, fontWeight: '600' }}>政绩+{task.rewardMerit} 好感+{task.rewardFavor}</Text>
                    </View>
                    <View style={{ flex: 1, backgroundColor: urgent ? theme.alertBg : theme.accentBg, padding: 6 }}>
                      <Text style={{ fontSize: 9, color: theme.mutedText }}>{urgent ? '即将超时惩罚' : '超时惩罚'}</Text>
                      <Text style={{ fontSize: 11, color: urgent ? theme.statLow : theme.valueText, fontWeight: '600' }}>政绩-{task.penaltyMerit} 好感-{task.penaltyFavor}</Text>
                    </View>
                  </View>
                  {/* 操作 */}
                  <View style={{ flexDirection: 'row', gap: 6 }}>
                    <Pressable
                      onPress={() => handleComplete(task)}
                      disabled={!complete}
                      style={{ flex: 1, backgroundColor: complete ? theme.primary : theme.progressBg, paddingVertical: 9, alignItems: 'center', opacity: complete ? 1 : 0.5 }}
                    >
                      <Text style={{ color: complete ? theme.primaryText : theme.mutedText, fontSize: 12, fontWeight: '700' }}>{complete ? '交付领取' : '进度未达标'}</Text>
                    </Pressable>
                    <Pressable
                      onPress={() => handlePostpone(task)}
                      disabled={task.isPostponed}
                      style={{ flex: 1, borderWidth: 1, borderColor: task.isPostponed ? theme.cardBorder : theme.accentSub, paddingVertical: 9, alignItems: 'center', opacity: task.isPostponed ? 0.5 : 1 }}
                    >
                      <Text style={{ color: task.isPostponed ? theme.mutedText : theme.accentSub, fontSize: 12, fontWeight: '600' }}>
                        {task.isPostponed ? '已减负' : `减负(政绩-${TASK_CONSTRAINTS.postponeMeritCost})`}
                      </Text>
                    </Pressable>
                  </View>
                </View>
              );
            })}
            {activeTasks.length === 0 ? (
              <View style={{ padding: 24, alignItems: 'center' }}>
                <Text style={{ fontSize: 28, marginBottom: 8 }}>📋</Text>
                <Text style={{ color: theme.mutedText, fontSize: 12 }}>暂无进行中的任务，点击上方按钮申请新任务</Text>
              </View>
            ) : null}
          </View>
        )}
      </ScrollView>
    </View>
  );
}
```

<a id="srcappappvicepremiertsx"></a>
## `src/app/(app)/vice-premier.tsx`

```tsx
import { useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, Text, View } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useGame } from '@/ctx/GameContext';
import { formatFund } from '@/types/game';

// 军委事务行动
const MILITARY_ACTIONS = [
  { id: 'm1', label: '推进国防信息化建设', cost: 120, desc: '强化军队指挥信息系统，提升联合作战能力', securityBonus: 8, meritReward: 15 },
  { id: 'm2', label: '军事演习联合指挥', cost: 80, desc: '组织跨战区联合演习，检验战备状态', securityBonus: 5, meritReward: 10 },
  { id: 'm3', label: '军民融合深度发展', cost: 90, desc: '推动军民两用技术转化，强化国防工业', securityBonus: 4, gdpBonus: 2, meritReward: 10 },
  { id: 'm4', label: '海外利益保护机制', cost: 100, desc: '建立海外公民撤离与资产保护体系', securityBonus: 3, meritReward: 8 },
  { id: 'm5', label: '战略核力量现代化', cost: 150, desc: '升级战略威慑体系，维护战略稳定', securityBonus: 12, meritReward: 20 },
];

// 外交事务行动
const DIPLOMACY_ACTIONS = [
  { id: 'd1', label: '主持大国峰会', cost: 100, desc: '与主要大国领导人举行峰会，推进战略互信', gdpBonus: 2, businessBonus: 3, meritReward: 12 },
  { id: 'd2', label: '推进"一带一路"合作', cost: 120, desc: '深化共建国家互联互通，拓展经济合作', gdpBonus: 4, businessBonus: 2, meritReward: 15 },
  { id: 'd3', label: '参与联合国改革', cost: 80, desc: '推动国际秩序改革，提升发展中国家话语权', businessBonus: 3, meritReward: 10 },
  { id: 'd4', label: '双边自贸协定谈判', cost: 90, desc: '与战略伙伴签署自贸协定，消除贸易壁垒', gdpBonus: 3, businessBonus: 2, meritReward: 10 },
  { id: 'd5', label: '人文交流与软实力', cost: 60, desc: '扩大文化输出，提升国家形象与软实力', businessBonus: 2, meritReward: 6 },
  { id: 'd6', label: '主导全球治理议题', cost: 100, desc: '在气候、卫生等全球议题上发挥领导力', gdpBonus: 1, businessBonus: 3, meritReward: 10 },
];

type Tab = 'military' | 'diplomacy' | 'overview';

export default function VicePremierScreen() {
  const insets = useSafeAreaInsets();
  const { save, isLoading, updateGameSave } = useGame();
  const [tab, setTab] = useState<Tab>('overview');
  const [acting, setActing] = useState(false);
  const [result, setResult] = useState('');

  if (isLoading || !save) {
    return <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}><ActivityIndicator size="large" color="#C82829" /></View>;
  }
  if (save.rankLevel < 13) {
    return (
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', padding: 24 }}>
        <Text style={{ fontSize: 15, color: '#888', textAlign: 'center' }}>晋升至国政院副院理级（级别13）后解锁此页面</Text>
      </View>
    );
  }

  const handleMilitaryAction = async (action: typeof MILITARY_ACTIONS[0]) => {
    if (acting || save.fundBalance < action.cost) return;
    setActing(true);
    await updateGameSave({
      fundBalance: save.fundBalance - action.cost,
      meritPoints: save.meritPoints + action.meritReward,
      securityIndex: Math.min(100, save.securityIndex + action.securityBonus),
      cityGdp: action.gdpBonus ? Math.min(100, save.cityGdp + action.gdpBonus) : save.cityGdp,
    });
    setResult(`✅ 已下达指示：${action.label}，政绩 +${action.meritReward}`);
    setActing(false);
    setTimeout(() => setResult(''), 3000);
  };

  const handleDiplomacyAction = async (action: typeof DIPLOMACY_ACTIONS[0]) => {
    if (acting || save.fundBalance < action.cost) return;
    setActing(true);
    await updateGameSave({
      fundBalance: save.fundBalance - action.cost,
      meritPoints: save.meritPoints + action.meritReward,
      cityGdp: action.gdpBonus ? Math.min(100, save.cityGdp + action.gdpBonus) : save.cityGdp,
      cityBusiness: action.businessBonus ? Math.min(100, save.cityBusiness + action.businessBonus) : save.cityBusiness,
    });
    setResult(`✅ 外交成果：${action.label}，政绩 +${action.meritReward}`);
    setActing(false);
    setTimeout(() => setResult(''), 3000);
  };

  return (
    <View style={{ flex: 1, backgroundColor: '#F4F4F0' }}>
      <StatusBar style="light" backgroundColor="#0D1F35" />
      {/* 页眉 */}
      <View style={{ backgroundColor: '#0D1F35', padding: 18, paddingTop: insets.top + 8 }}>
        <Text style={{ color: 'rgba(255,255,255,0.5)', fontSize: 10, letterSpacing: 3 }}>国政院 · 副院理治国</Text>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, marginTop: 6 }}>
          <Text style={{ fontSize: 32 }}>🏛️</Text>
          <View>
            <Text style={{ color: '#fff', fontWeight: '700', fontSize: 20 }}>国政院副院理</Text>
            <Text style={{ color: '#a0b4cc', fontSize: 12, marginTop: 2 }}>
              {save.playerName}  ·  分管：军委 + 外交 + 经济
            </Text>
          </View>
        </View>
      </View>

      {/* 资源栏 */}
      <View style={{ flexDirection: 'row', backgroundColor: '#2B4B6F', paddingVertical: 10, paddingHorizontal: 14, gap: 16 }}>
        <View style={{ alignItems: 'center', flex: 1 }}>
          <Text style={{ color: '#a0b4cc', fontSize: 9 }}>专项经费</Text>
          <Text style={{ color: '#FFD700', fontWeight: '700', fontSize: 14 }}>{formatFund(save.fundBalance)}</Text>
        </View>
        <View style={{ width: 1, backgroundColor: 'rgba(255,255,255,0.15)' }} />
        <View style={{ alignItems: 'center', flex: 1 }}>
          <Text style={{ color: '#a0b4cc', fontSize: 9 }}>政绩积累</Text>
          <Text style={{ color: '#fff', fontWeight: '700', fontSize: 14 }}>{save.meritPoints}</Text>
        </View>
        <View style={{ width: 1, backgroundColor: 'rgba(255,255,255,0.15)' }} />
        <View style={{ alignItems: 'center', flex: 1 }}>
          <Text style={{ color: '#a0b4cc', fontSize: 9 }}>安全指数</Text>
          <Text style={{ color: '#ff8a65', fontWeight: '700', fontSize: 14 }}>{save.securityIndex.toFixed(1)}</Text>
        </View>
      </View>

      {/* 标签栏 */}
      <View style={{ flexDirection: 'row', backgroundColor: '#fff', borderBottomWidth: 1, borderBottomColor: '#E0E0E0' }}>
        {([['overview', '📊 总览'], ['military', '⚔️ 军委'], ['diplomacy', '🌐 外交']] as [Tab, string][]).map(([key, label]) => (
          <Pressable
            key={key}
            onPress={() => setTab(key)}
            style={{ flex: 1, paddingVertical: 12, alignItems: 'center', borderBottomWidth: 2, borderBottomColor: tab === key ? '#C82829' : 'transparent' }}
          >
            <Text style={{ fontSize: 12, fontWeight: tab === key ? '700' : '400', color: tab === key ? '#C82829' : '#888' }}>{label}</Text>
          </Pressable>
        ))}
      </View>

      <ScrollView style={{ flex: 1 }} contentInsetAdjustmentBehavior="automatic">
        {/* 总览 */}
        {tab === 'overview' && (
          <View style={{ padding: 14, gap: 12 }}>
            <Text style={{ fontSize: 11, color: '#888', letterSpacing: 2, fontWeight: '700' }}>国家综合治理指标</Text>
            {[
              { label: 'GDP增速', value: save.cityGdp, color: '#2B4B6F' },
              { label: '民生保障', value: save.cityLivelihood, color: '#2a7a3b' },
              { label: '生态文明', value: save.cityEcology, color: '#1a6b3a' },
              { label: '营商环境', value: save.cityBusiness, color: '#7B5E2A' },
              { label: '社会治安', value: save.securityIndex, color: '#7a1a1a' },
            ].map(item => (
              <View key={item.label}>
                <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 3 }}>
                  <Text style={{ fontSize: 12, color: '#333', fontWeight: '600' }}>{item.label}</Text>
                  <Text style={{ fontSize: 12, color: item.color, fontWeight: '700' }}>{item.value.toFixed(1)}</Text>
                </View>
                <View style={{ height: 6, backgroundColor: '#E0E0E0', borderRadius: 3 }}>
                  <View style={{ width: `${item.value}%`, height: 6, backgroundColor: item.color, borderRadius: 3 }} />
                </View>
              </View>
            ))}

            <View style={{ height: 1, backgroundColor: '#E0E0E0', marginVertical: 4 }} />
            <Text style={{ fontSize: 11, color: '#888', letterSpacing: 2, fontWeight: '700' }}>分管职责说明</Text>
            <View style={{ gap: 8 }}>
              {[
                { icon: '⚔️', title: '军委板块', desc: '主持国防建设、军事现代化及战略安全工作，向国政院院理负责。' },
                { icon: '🌐', title: '外交板块', desc: '统筹多边外交、经济外交及人文交流，维护国家战略利益。' },
                { icon: '📋', title: '经济协调', desc: '协调重大经济政策出台，统筹发展与安全两件大事。' },
              ].map(item => (
                <View key={item.title} style={{ flexDirection: 'row', gap: 10, backgroundColor: '#fff', padding: 12, borderWidth: 1, borderColor: '#E0E0E0' }}>
                  <Text style={{ fontSize: 22, width: 28, textAlign: 'center' }}>{item.icon}</Text>
                  <View style={{ flex: 1 }}>
                    <Text style={{ fontSize: 13, fontWeight: '700', color: '#2B4B6F', marginBottom: 3 }}>{item.title}</Text>
                    <Text style={{ fontSize: 11, color: '#666', lineHeight: 17 }}>{item.desc}</Text>
                  </View>
                </View>
              ))}
            </View>
          </View>
        )}

        {/* 军委板块 */}
        {tab === 'military' && (
          <View style={{ padding: 14, gap: 10 }}>
            <View style={{ backgroundColor: '#1a1a2e', padding: 12, marginBottom: 4 }}>
              <Text style={{ color: 'rgba(255,255,255,0.6)', fontSize: 10, letterSpacing: 2 }}>中枢军事委员会</Text>
              <Text style={{ color: '#fff', fontWeight: '700', fontSize: 14, marginTop: 2 }}>⚔️ 国防与军队建设</Text>
              <Text style={{ color: '#a0a0b0', fontSize: 11, marginTop: 4, lineHeight: 16 }}>
                统筹国家军事战略，推进国防现代化。每项举措均直接影响全国安全指数。
              </Text>
            </View>
            {MILITARY_ACTIONS.map(action => {
              const canAct = save.fundBalance >= action.cost;
              return (
                <View key={action.id} style={{ backgroundColor: '#fff', borderWidth: 1, borderColor: '#D0D0D0' }}>
                  <View style={{ padding: 12, gap: 4 }}>
                    <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                      <Text style={{ fontSize: 13, fontWeight: '700', color: '#1D2D44', flex: 1 }}>{action.label}</Text>
                      <View style={{ backgroundColor: '#fff5f5', paddingHorizontal: 6, paddingVertical: 2, marginLeft: 8 }}>
                        <Text style={{ fontSize: 9, color: '#C82829', fontWeight: '600' }}>政绩 +{action.meritReward}</Text>
                      </View>
                    </View>
                    <Text style={{ fontSize: 11, color: '#777', lineHeight: 16 }}>{action.desc}</Text>
                    <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginTop: 4 }}>
                      <View style={{ backgroundColor: '#fff0f0', paddingHorizontal: 6, paddingVertical: 2 }}>
                        <Text style={{ fontSize: 9, color: '#7a1a1a' }}>安全指数 +{action.securityBonus}</Text>
                      </View>
                      {action.gdpBonus && (
                        <View style={{ backgroundColor: '#F0F4F8', paddingHorizontal: 6, paddingVertical: 2 }}>
                          <Text style={{ fontSize: 9, color: '#2B4B6F' }}>GDP +{action.gdpBonus}</Text>
                        </View>
                      )}
                    </View>
                  </View>
                  <Pressable
                    onPress={() => handleMilitaryAction(action)}
                    disabled={!canAct || acting}
                    style={{ backgroundColor: canAct ? '#1a1a2e' : '#ccc', paddingVertical: 10, alignItems: 'center' }}
                  >
                    <Text style={{ color: '#fff', fontWeight: '700', fontSize: 12 }}>
                      {acting ? '执行中…' : `下达指示（¥${action.cost}）`}
                    </Text>
                  </Pressable>
                </View>
              );
            })}
          </View>
        )}

        {/* 外交板块 */}
        {tab === 'diplomacy' && (
          <View style={{ padding: 14, gap: 10 }}>
            <View style={{ backgroundColor: '#003366', padding: 12, marginBottom: 4 }}>
              <Text style={{ color: 'rgba(255,255,255,0.6)', fontSize: 10, letterSpacing: 2 }}>外交事务</Text>
              <Text style={{ color: '#fff', fontWeight: '700', fontSize: 14, marginTop: 2 }}>🌐 大国外交与国际合作</Text>
              <Text style={{ color: '#a0b4cc', fontSize: 11, marginTop: 4, lineHeight: 16 }}>
                主导多边外交框架，拓展战略伙伴关系，提升国际话语权与经济合作广度。
              </Text>
            </View>
            {DIPLOMACY_ACTIONS.map(action => {
              const canAct = save.fundBalance >= action.cost;
              return (
                <View key={action.id} style={{ backgroundColor: '#fff', borderWidth: 1, borderColor: '#D0D0D0' }}>
                  <View style={{ padding: 12, gap: 4 }}>
                    <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                      <Text style={{ fontSize: 13, fontWeight: '700', color: '#1D2D44', flex: 1 }}>{action.label}</Text>
                      <View style={{ backgroundColor: '#FFF9E6', paddingHorizontal: 6, paddingVertical: 2, marginLeft: 8 }}>
                        <Text style={{ fontSize: 9, color: '#7B5E2A', fontWeight: '600' }}>政绩 +{action.meritReward}</Text>
                      </View>
                    </View>
                    <Text style={{ fontSize: 11, color: '#777', lineHeight: 16 }}>{action.desc}</Text>
                    <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginTop: 4 }}>
                      {action.gdpBonus && (
                        <View style={{ backgroundColor: '#F0F4F8', paddingHorizontal: 6, paddingVertical: 2 }}>
                          <Text style={{ fontSize: 9, color: '#2B4B6F' }}>GDP +{action.gdpBonus}</Text>
                        </View>
                      )}
                      {action.businessBonus && (
                        <View style={{ backgroundColor: '#FFF9E6', paddingHorizontal: 6, paddingVertical: 2 }}>
                          <Text style={{ fontSize: 9, color: '#7B5E2A' }}>营商 +{action.businessBonus}</Text>
                        </View>
                      )}
                    </View>
                  </View>
                  <Pressable
                    onPress={() => handleDiplomacyAction(action)}
                    disabled={!canAct || acting}
                    style={{ backgroundColor: canAct ? '#003366' : '#ccc', paddingVertical: 10, alignItems: 'center' }}
                  >
                    <Text style={{ color: '#fff', fontWeight: '700', fontSize: 12 }}>
                      {acting ? '推进中…' : `开展外交（¥${action.cost}）`}
                    </Text>
                  </Pressable>
                </View>
              );
            })}
            <View style={{ height: 24 }} />
          </View>
        )}
      </ScrollView>

      {/* 操作结果 */}
      {!!result && (
        <View style={{ position: 'absolute', bottom: 24, left: 16, right: 16, backgroundColor: '#2a7a3b', padding: 12, alignItems: 'center' }}>
          <Text style={{ color: '#fff', fontWeight: '700', fontSize: 13 }}>{result}</Text>
        </View>
      )}
    </View>
  );
}
```
