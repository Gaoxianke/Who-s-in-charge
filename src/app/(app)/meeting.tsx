// 月度工作会议页面 — 按职级差异化会议名称/内容，全层级开放，强制月度召开
// 流程：学习传达 → 工作通报 → 议题审议 → 任务分派 → 形成纪要
import React, { useCallback, useState } from 'react';
import { View, Text, ScrollView, Pressable, ActivityIndicator, TextInput } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useFocusEffect, useRouter } from 'expo-router';
import { useGame } from '@/ctx/GameContext';
import { getSubordinates, getMeetingByMonth, createMeeting, getRecentMeetings, getLeadershipBand } from '@/db/gameApi';
import type { Subordinate, MonthlyMeeting, MeetingTask, KpiType, LeadershipMember } from '@/types/game';
import { KPI_LABELS, gameDaysToDate, DEPT_CONFIG } from '@/types/game';
import type { DeptKey } from '@/types/game';
import { getDeptNameByRank } from '@/types/game';

// ── 会议名称体系（参照现实各层级党政会议制度） ─────────────────────────
function getMeetingInfo(rankLevel: number): { title: string; subtitle: string; headerColor: string; convener: string } {
  if (rankLevel >= 14) return { title: '中枢决策常委会', subtitle: '中共中枢决策常委会会议', headerColor: '#1a0a3e', convener: '总执书记主持' };
  if (rankLevel >= 13) return { title: '中枢政治局会议', subtitle: '中共中枢政治局会议', headerColor: '#2C1A5E', convener: '政治局常委主持' };
  if (rankLevel >= 12) return { title: '国政院常务会议', subtitle: '国政院常务委员会会议', headerColor: '#2C1A5E', convener: '总理主持召开' };
  if (rankLevel >= 11) return { title: '省委常委会', subtitle: '中共省委常务委员会会议', headerColor: '#1D2D44', convener: '省委书记主持' };
  if (rankLevel >= 10) return { title: '省政府常务会', subtitle: '省人民政府常务委员会会议', headerColor: '#1D3B5E', convener: '省长主持召开' };
  if (rankLevel >= 9)  return { title: '市委常委会', subtitle: '中共市委常务委员会会议', headerColor: '#1D2D44', convener: '市委书记主持' };
  if (rankLevel >= 8)  return { title: '市政府常务会', subtitle: '市人民政府常务委员会会议', headerColor: '#1D3B5E', convener: '市长主持召开' };
  if (rankLevel >= 7)  return { title: '市委扩大会议', subtitle: '市委常委会扩大会议', headerColor: '#2B4B6F', convener: '主要领导主持' };
  if (rankLevel >= 6)  return { title: '县委常委会', subtitle: '中共县委常务委员会会议', headerColor: '#1D2D44', convener: '县委书记主持' };
  if (rankLevel >= 5)  return { title: '县政府常务会', subtitle: '县人民政府常务委员会会议', headerColor: '#1D3B5E', convener: '县长主持召开' };
  if (rankLevel >= 4)  return { title: '县委扩大会议', subtitle: '县委常委会扩大会议', headerColor: '#2B4B6F', convener: '主要领导主持' };
  if (rankLevel >= 3)  return { title: '镇政府办公会', subtitle: '乡镇人民政府办公会议', headerColor: '#2B4B6F', convener: '镇长主持召开' };
  if (rankLevel >= 2)  return { title: '党政联席会', subtitle: '乡镇党政联席会议', headerColor: '#2B4B6F', convener: '党委书记主持' };
  return { title: '支部会议', subtitle: '党支部工作会议', headerColor: '#555', convener: '支部书记主持' };
}

// ── 学习传达内容库（按层级不同） ────────────────────────────────────
function getStudyItems(rankLevel: number): { title: string; content: string }[] {
  if (rankLevel >= 12) return [
    { title: '学习习近平总执书记重要讲话精神', content: '传达总执书记最新重要讲话和批示精神，深刻领会核心要义，切实抓好贯彻落实。' },
    { title: '传达中央全会重要决议', content: '传达中央全会精神，结合本单位实际研究贯彻落实措施。' },
    { title: '学习国政院最新政策部署', content: '学习贯彻国政院最新政策措施，确保政令畅通，推动各项决策部署落地见效。' },
  ];
  if (rankLevel >= 9) return [
    { title: '传达中央省委重要指示精神', content: '传达中央和省委最新指示要求，研究部署贯彻落实工作，确保政令畅通到底。' },
    { title: '学习党中央重要决定', content: '组织学习党中央关于全面从严治党、经济工作等重要决定，深入领会精神实质。' },
    { title: '传达省委重要工作部署', content: '传达省委书记最新讲话精神和重要批示，对照检视本地工作差距，明确整改措施。' },
  ];
  if (rankLevel >= 6) return [
    { title: '传达上级重要文件精神', content: '认真学习传达上级党委政府最新文件要求，研究具体贯彻落实措施。' },
    { title: '学习廉洁自律相关规定', content: '组织学习《党纪处分条例》和廉洁从政相关规定，强化党员领导干部廉洁意识。' },
    { title: '传达市委市政府工作要求', content: '传达市委市政府月度工作重点部署，结合本地实际制定落实方案。' },
  ];
  return [
    { title: '传达上级党委重要精神', content: '传达县委县政府最新工作要求，部署安排近期重点工作任务。' },
    { title: '学习基层党建相关文件', content: '组织全体党员学习最新党建文件，强化基层党组织建设。' },
    { title: '学习农村基层治理政策', content: '学习农村基层治理相关政策，提升基层干部治理能力和为民服务水平。' },
  ];
}

// ── 工作通报内容（按层级生成） ─────────────────────────────────────
function getWorkReports(rankLevel: number, cityName: string): { dept: string; content: string; rating: '优' | '良' | '一般' | '差' }[] {
  const rand4 = (): '优' | '良' | '一般' | '差' => {
    const r = Math.random();
    return r < 0.2 ? '优' : r < 0.5 ? '良' : r < 0.8 ? '一般' : '差';
  };
  if (rankLevel >= 12) return [
    { dept: '国家发改委', content: `本月全国GDP增速完成情况：预计${(4.8 + Math.random()).toFixed(1)}%，整体运行平稳`, rating: rand4() },
    { dept: '财政部', content: `本月财政收入同比${Math.random() > 0.5 ? '增长' : '下降'}${(Math.random() * 5).toFixed(1)}%，财政形势总体稳定`, rating: rand4() },
    { dept: '公安部', content: `全国治安形势总体稳定，重大案件同比下降${(Math.random() * 15).toFixed(0)}%`, rating: rand4() },
    { dept: '生态环境部', content: `重点区域空气质量同比改善，PM2.5浓度继续下降`, rating: rand4() },
  ];
  if (rankLevel >= 9) return [
    { dept: '发展改革委', content: `${cityName}本月GDP增速预估${(4 + Math.random() * 3).toFixed(1)}%，重大项目推进顺利`, rating: rand4() },
    { dept: '财政局', content: `本月税收完成计划的${(85 + Math.random() * 20).toFixed(0)}%，财政运行总体平稳`, rating: rand4() },
    { dept: '公安局', content: `社会治安形势稳定，刑事案件发案率同比下降${(Math.random() * 12).toFixed(0)}%`, rating: rand4() },
    { dept: '住建局', content: `重点工程项目推进进度${(60 + Math.random() * 35).toFixed(0)}%，工程质量总体受控`, rating: rand4() },
  ];
  return [
    { dept: '经发部门', content: `${cityName}本月经济运行总体平稳，规上企业产值完成月度计划的${(80 + Math.random() * 25).toFixed(0)}%`, rating: rand4() },
    { dept: '民政部门', content: `民生保障工作稳步推进，困难群众帮扶救助及时到位`, rating: rand4() },
    { dept: '维稳部门', content: `社会治安总体稳定，信访工作有序推进，存量案件持续化解`, rating: rand4() },
    { dept: '生态环保', content: `生态环境整治持续推进，违规排放问题得到有效管控`, rating: rand4() },
  ];
}

const KPI_OPTIONS: { type: KpiType; target: number; label: string }[] = [
  { type: 'gdp',        target: 5,  label: 'GDP +5' },
  { type: 'livelihood', target: 5,  label: '民生 +5' },
  { type: 'ecology',    target: 5,  label: '生态 +5' },
  { type: 'business',   target: 5,  label: '营商 +5' },
];
const NATIONAL_KPI_OPTIONS: { type: KpiType; target: number; label: string }[] = [
  { type: 'gdp',        target: 8,  label: '经济发展 +8' },
  { type: 'livelihood', target: 8,  label: '民生改善 +8' },
  { type: 'ecology',    target: 8,  label: '生态治理 +8' },
  { type: 'business',   target: 8,  label: '营商优化 +8' },
];

// ── 临时议题资料库（按层级分组） ───────────────────────────────────────
type AgendaVote = 'yes' | 'no' | null;
interface TempAgenda {
  id: string; dept: DeptKey; issue: string; detail: string;
  vote: AgendaVote; yesCount: number; noCount: number; passed: boolean | null;
}

// 乡镇议题池
const TOWN_AGENDA_POOL: { dept: DeptKey; issue: string; detail: string }[] = [
  { dept: 'agriculture', issue: '关于推进高标准农田建设的议案', detail: '结合农业补贴政策，推动辖区高标准农田整治改造，提升粮食生产能力，惠及种植农户约200户。' },
  { dept: 'ecology',     issue: '关于开展农村生活污水治理的议案', detail: '针对辖区部分村庄生活污水直排现象，建设小型污水处理设施，改善农村人居环境。' },
  { dept: 'petition',    issue: '关于化解历史土地纠纷积案的议案', detail: '辖区存在3件多年未解决的土地权属纠纷，建议成立专项调解小组，依法依规推进化解。' },
  { dept: 'education',   issue: '关于改善村小学基础设施的议案', detail: '辖区某村小学校舍老旧，建议申请专项资金完成修缮改造，改善学生学习环境。' },
  { dept: 'health',      issue: '关于加强村级卫生室建设的议案', detail: '部分村卫生室药品短缺、设备陈旧，建议申请配备资金，提升基层医疗服务能力。' },
  { dept: 'market',      issue: '关于整治农贸市场环境卫生的议案', detail: '辖区农贸市场存在占道经营、卫生条件差等问题，建议开展专项整治，提升市场管理水平。' },
];

// 县级议题池
const COUNTY_AGENDA_POOL: { dept: DeptKey; issue: string; detail: string }[] = [
  { dept: 'police',      issue: '关于加强城区夜间巡逻力度的议案', detail: '近期辖区夜间治安事件有所上升，公安部门提请增派警力，延长巡逻时段至凌晨2时。' },
  { dept: 'ndrc',        issue: '关于引进新能源产业园项目的议案', detail: '发改部门汇报，有企业意向在本辖区投资建设新能源产业园，预计带动就业500人，请审议立项。' },
  { dept: 'finance',     issue: '关于追加民生补贴预算的紧急议案', detail: '财政部门反映部分低收入群体生活困难，建议本月追加专项补贴资金200万元。' },
  { dept: 'urban',       issue: '关于老旧小区改造工程立项的议案', detail: '住建部门申请对辖区三个老旧小区进行外立面及管网改造，改善居民居住条件。' },
  { dept: 'education',   issue: '关于新建小学招生扩容的议案', detail: '教育部门称现有小学学位紧张，建议新建一所小学或扩建现有学校，以满足适龄儿童入学需求。' },
  { dept: 'ecology',     issue: '关于河道污染整治专项行动的议案', detail: '生态环保部门汇报，辖区主要河道水质下降，建议启动为期三个月的专项整治行动。' },
  { dept: 'personnel',   issue: '关于开展干部能力素质培训的议案', detail: '人事部门申请组织科级干部赴省委党校开展为期一周的能力素质提升专题培训班。' },
  { dept: 'petition',    issue: '关于化解历史遗留信访积案的议案', detail: '信访局汇报辖区存在5件三年以上积案，建议成立专项工作组，争取本季度内实现化解清零。' },
];

// 市级议题池
const CITY_AGENDA_POOL: { dept: DeptKey; issue: string; detail: string }[] = [
  { dept: 'ndrc',        issue: '关于全市重大项目年度投资计划调整的议案', detail: '受政策环境变化影响，部分重大项目需调整投资计划，发改委提请审议优化方案，确保年度目标完成。' },
  { dept: 'finance',     issue: '关于市级专项资金统筹安排方案的议案', detail: '市财政局提出本年度专项资金统筹安排方案，重点保障基础设施、民生工程、生态环保等领域投入。' },
  { dept: 'urban',       issue: '关于城市轨道交通规划研究方案的议案', detail: '住建部门汇报城市轨道交通规划研究成果，建议启动规划编制工作，为未来发展预留空间。' },
  { dept: 'market',      issue: '关于优化营商环境创新举措方案的议案', detail: '市场监管局提出营商环境优化创新举措，包括审批提速、减证便民、惠企政策落地等系列改革。' },
  { dept: 'invest',      issue: '关于本月重点招商引资项目审议', detail: '市投促局汇报3个意向落地项目情况，总投资约30亿元，提请常委会审议明确扶持政策和工作机制。' },
  { dept: 'ecology',     issue: '关于"无废城市"建设工作方案的议案', detail: '生态环境局提请审议"无废城市"建设三年行动计划，统筹推进固废减量化、资源化、无害化。' },
  { dept: 'organization','issue': '关于后备干部队伍建设规划方案的议案', detail: '组织部汇报后备干部队伍结构分析，建议调整充实后备人选，优化年龄学历结构，加强培养锻炼。' },
  { dept: 'health',      issue: '关于全市医疗资源优化布局方案的议案', detail: '市卫健委提出医疗资源优化布局方案，重点补强基层医疗短板，探索县域医共体建设新模式。' },
];

// 省级议题池
const PROVINCE_AGENDA_POOL: { dept: DeptKey; issue: string; detail: string }[] = [
  { dept: 'ndrc',        issue: '关于全省高质量发展综合绩效考核方案的议案', detail: '省发改委提请审议新一轮高质量发展综合绩效考核指标体系，强化对各市州经济发展质量的考核导向。' },
  { dept: 'finance',     issue: '关于省级财政转移支付制度改革方案的议案', detail: '省财政厅提出转移支付制度改革方案，优化一般性转移支付和专项转移支付结构，提高资金使用效益。' },
  { dept: 'ecology',     issue: '关于深化生态补偿制度改革的议案', detail: '生态环境厅提请审议流域横向生态补偿扩面工作方案，推动更多重要流域建立上下游横向补偿机制。' },
  { dept: 'organization','issue': '关于县(市区)党政领导班子动态考察方案', detail: '组织部汇报拟开展年度县(市区)党政领导班子动态考察工作，请审议考察方案和时间安排。' },
  { dept: 'invest',      issue: '关于省重大引资项目特殊政策审议', detail: '省投促局汇报一批重点招商引资项目谈判进展，涉及多项特殊支持政策，提请常委会研究确定。' },
  { dept: 'education',   issue: '关于省属高等院校学科布局调整方案', detail: '省教育厅提出省属高校学科专业调整优化方案，重点增强理工农医类专业供给，提升服务经济发展能力。' },
  { dept: 'market',      issue: '关于全省市场准入负面清单动态管理办法', detail: '省市场监管局提请审议市场准入负面清单动态管理实施细则，进一步优化营商环境，激发市场活力。' },
  { dept: 'police',      issue: '关于跨市重大刑事案件协同侦办机制的议案', detail: '省公安厅提请建立跨市重大刑事案件协同侦办机制，解决跨区域案件协调难、移送慢等突出问题。' },
];

// 国家级议题池
const NATIONAL_AGENDA_POOL: { dept: DeptKey; issue: string; detail: string }[] = [
  { dept: 'ndrc',        issue: '关于全国年度GDP目标执行情况的专项报告', detail: '国家发改委汇报本年度GDP增速完成情况及下半年调控重点，提请审议确定宏观调控措施。' },
  { dept: 'finance',     issue: '关于国家财政赤字率调整方案的议案', detail: '财政部提出适度扩大赤字率，支持基础设施建设和民生保障，预计释放财政资金万亿量级，请审议。' },
  { dept: 'ecology',     issue: '关于碳达峰碳中和路线图优化调整的报告', detail: '生态环境部就"双碳"时间表进行阶段性评估，建议调整重点行业节奏，报请审定。' },
  { dept: 'health',      issue: '关于深化医药卫生体制改革综合方案', detail: '国家卫健委提出新一轮医改方案，重点优化分级诊疗和医保支付制度，预计惠及全国群众10亿人次。' },
  { dept: 'police',      issue: '关于打击跨境电信网络诈骗专项行动方案', detail: '公安部汇报跨境电信诈骗高发态势，申请启动跨部门联合打击专项行动，重点攻克境外诈骗窝点。' },
  { dept: 'organization','issue': '关于深化改革重点任务年度推进方案', detail: '中央改革办汇报改革推进情况，提请审议下年度重点改革任务清单和责任分工安排。' },
  { dept: 'agriculture', issue: '关于粮食安全战略性储备能力提升方案', detail: '农业农村部汇报全国粮食储备现状，建议启动新一轮粮食安全保障工程，确保口粮绝对安全。' },
  { dept: 'invest',      issue: '关于进一步扩大高水平对外开放综合方案', detail: '商务部提请审议扩大外资准入、优化营商环境的系列措施，重点深化自贸区先行先试改革。' },
];

function getAgendaPool(rankLevel: number) {
  if (rankLevel >= 12) return NATIONAL_AGENDA_POOL;
  if (rankLevel >= 9)  return PROVINCE_AGENDA_POOL;
  if (rankLevel >= 6)  return CITY_AGENDA_POOL;
  if (rankLevel >= 3)  return COUNTY_AGENDA_POOL;
  return TOWN_AGENDA_POOL;
}

// ── 国家级参会人员 ──────────────────────────────────────────────────
interface NationalAttendee {
  id: string; name: string; title: string; dept: string; isCore: boolean; kpiDomain: KpiType;
}
function generateNationalAttendees(rankLevel: number): NationalAttendee[] {
  if (rankLevel === 12) return [
    { id: 'n1', name: '李副院理', title: '国政院第一副院理', dept: '国政院', isCore: true, kpiDomain: 'gdp' },
    { id: 'n2', name: '王副院理', title: '主管经济的副院理', dept: '国政院', isCore: true, kpiDomain: 'business' },
    { id: 'n3', name: '张副院理', title: '主管民生的副院理', dept: '国政院', isCore: true, kpiDomain: 'livelihood' },
    { id: 'n4', name: '刘副院理', title: '主管生态的副院理', dept: '国政院', isCore: true, kpiDomain: 'ecology' },
    { id: 'n5', name: '陈国政委员', title: '国政委员（经济）', dept: '国政院', isCore: false, kpiDomain: 'gdp' },
    { id: 'n6', name: '赵国政委员', title: '国政委员（外交）', dept: '国政院', isCore: false, kpiDomain: 'business' },
    { id: 'n7', name: '孙秘书长', title: '国政院秘书长', dept: '国政院办公厅', isCore: false, kpiDomain: 'livelihood' },
  ];
  if (rankLevel === 13) return [
    { id: 'n1', name: '王常委', title: '政治局常委（议政院议政委员长）', dept: '全国议政院', isCore: true, kpiDomain: 'gdp' },
    { id: 'n2', name: '张常委', title: '政治局常委（国政院院理）', dept: '国政院', isCore: true, kpiDomain: 'business' },
    { id: 'n3', name: '刘常委', title: '政治局常委（参政主席）', dept: '全国参政院', isCore: true, kpiDomain: 'livelihood' },
    { id: 'n4', name: '李常委', title: '政治局常委（中枢纪委书记）', dept: '中枢纪委', isCore: false, kpiDomain: 'ecology' },
    { id: 'n5', name: '陈部长', title: '中枢组织部部长', dept: '中枢组织部', isCore: false, kpiDomain: 'gdp' },
  ];
  return [
    { id: 'n1', name: '李常委', title: '政治局常委（国政院院理）', dept: '国政院', isCore: true, kpiDomain: 'gdp' },
    { id: 'n2', name: '王常委', title: '政治局常委（议政院议政委员长）', dept: '全国议政院', isCore: true, kpiDomain: 'livelihood' },
    { id: 'n3', name: '张常委', title: '政治局常委（参政主席）', dept: '全国参政院', isCore: true, kpiDomain: 'business' },
    { id: 'n4', name: '刘常委', title: '政治局常委（中枢纪委书记）', dept: '中枢纪委', isCore: true, kpiDomain: 'ecology' },
    { id: 'n5', name: '陈常委', title: '政治局常委（中枢宣部长）', dept: '中枢宣部', isCore: true, kpiDomain: 'gdp' },
  ];
}

function generateTempAgendas(rankLevel: number, attendeeCount: number): TempAgenda[] {
  const pool = getAgendaPool(rankLevel);
  const shuffled = [...pool].sort(() => Math.random() - 0.5);
  const count = Math.floor(Math.random() * 3) + 2;
  return shuffled.slice(0, count).map((item, i) => {
    const yesBase = Math.max(1, Math.floor(attendeeCount * 0.5));
    const yesCount = yesBase + Math.floor(Math.random() * Math.floor(attendeeCount * 0.3));
    const noCount = Math.max(0, attendeeCount - yesCount - 1);
    return { id: `agenda_${i}_${Date.now()}`, dept: item.dept, issue: item.issue, detail: item.detail, vote: null, yesCount, noCount, passed: null };
  });
}

const KPI_CYCLE: KpiType[] = ['gdp', 'livelihood', 'ecology', 'business'];
const STATUS_COLOR: Record<string, string> = { pending: '#888', done: '#2a7a3b', failed: '#C82829' };
const STATUS_LABEL: Record<string, string> = { pending: '进行中', done: '已完成', failed: '未达标' };
const RATING_COLOR: Record<string, string> = { '优': '#2a7a3b', '良': '#1D3B5E', '一般': '#888', '差': '#C82829' };

function ProgressBar({ value, total, color = '#2a7a3b' }: { value: number; total: number; color?: string }) {
  const pct = total === 0 ? 0 : Math.round((value / total) * 100);
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
      <View style={{ flex: 1, height: 5, backgroundColor: '#E0E0E0' }}>
        <View style={{ height: 5, width: `${pct}%`, backgroundColor: color }} />
      </View>
      <Text style={{ fontSize: 10, color, fontVariant: ['tabular-nums'], width: 34, textAlign: 'right' }}>{value}/{total}</Text>
    </View>
  );
}

function AttendeeRow({ sub, deptLabel, isLeader = false }: { sub: Subordinate; deptLabel: string; isLeader?: boolean }) {
  let posTag = '班子'; let tagColor = '#7B5E2A';
  if (sub.deptPosition === 'head')   { posTag = '正职'; tagColor = '#C82829'; }
  else if (sub.deptPosition === 'deputy') { posTag = '副职'; tagColor = '#1D2D44'; }
  else if (isLeader) { posTag = '班子'; tagColor = '#7B5E2A'; }
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, paddingVertical: 4 }}>
      <View style={{ backgroundColor: tagColor, paddingHorizontal: 5, paddingVertical: 2 }}>
        <Text style={{ color: '#fff', fontSize: 9, fontWeight: '700' }}>{posTag}</Text>
      </View>
      <Text style={{ fontSize: 12, color: '#222', fontWeight: '600', flex: 1 }}>{sub.name}</Text>
      <Text style={{ fontSize: 10, color: '#888' }}>{deptLabel}</Text>
    </View>
  );
}

type MeetingStep = 'study' | 'report' | 'agenda' | 'kpi' | 'summary';

export default function MeetingPage() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { save } = useGame();
  const [subordinates, setSubordinates] = useState<Subordinate[]>([]);
  const [band, setBand] = useState<LeadershipMember[]>([]);
  const [currentMeeting, setCurrentMeeting] = useState<MonthlyMeeting | null>(null);
  const [recentMeetings, setRecentMeetings] = useState<MonthlyMeeting[]>([]);
  const [loading, setLoading] = useState(true);
  const [isHolding, setIsHolding] = useState(false);
  const [meetingStep, setMeetingStep] = useState<MeetingStep>('study');
  const [studySelected, setStudySelected] = useState<number | null>(null);
  const [assignments, setAssignments] = useState<Record<string, KpiType>>({});
  const [submitting, setSubmitting] = useState(false);
  const [msg, setMsg] = useState('');
  const [showAttendees, setShowAttendees] = useState(false);
  const [tempAgendas, setTempAgendas] = useState<TempAgenda[]>([]);
  const [customIssue, setCustomIssue] = useState('');

  const monthKey = save ? String(Math.floor(save.gameDays / 30)) : '0';

  const load = useCallback(async () => {
    if (!save) return;
    setLoading(true);
    const [subs, meeting, recent, b] = await Promise.all([
      getSubordinates(save.id),
      getMeetingByMonth(save.id, monthKey),
      getRecentMeetings(save.id, 6),
      getLeadershipBand(save.id),
    ]);
    setSubordinates(subs);
    setCurrentMeeting(meeting);
    setRecentMeetings(recent.filter(m => m.monthKey !== monthKey));
    setBand(b);
    setLoading(false);
  }, [save, monthKey]);

  useFocusEffect(useCallback(() => { void load(); }, [load]));

  if (!save) return null;

  const isNational = save.rankLevel >= 12;
  const meetingInfo = getMeetingInfo(save.rankLevel);
  const nationalAttendees = isNational ? generateNationalAttendees(save.rankLevel) : [];
  const activeKpiOptions = isNational ? NATIONAL_KPI_OPTIONS : KPI_OPTIONS;
  const studyItems = getStudyItems(save.rankLevel);
  const workReports = getWorkReports(save.rankLevel, save.cityName);

  const headDeputy = subordinates.filter(s => s.isAppointed && (s.deptPosition === 'head' || s.deptPosition === 'deputy'));
  const bandSubIds = new Set(band.map(m => m.subId));
  const bandSubs   = subordinates.filter(s => bandSubIds.has(s.id) && !headDeputy.find(h => h.id === s.id));
  const attendees  = isNational ? [] : [...headDeputy, ...bandSubs];
  const totalAttendeeCount = isNational ? nationalAttendees.length : attendees.length;

  // 历史完成率
  const totalHistTasks = recentMeetings.reduce((s, m) => s + m.tasks.length, 0);
  const doneHistTasks  = recentMeetings.reduce((s, m) => s + m.tasks.filter(t => t.status === 'done').length, 0);
  const histRate = totalHistTasks > 0 ? Math.round((doneHistTasks / totalHistTasks) * 100) : null;

  const handleHoldMeeting = () => {
    setIsHolding(true);
    setMeetingStep('study');
    setStudySelected(null);
    setAssignments({});
    setMsg('');
    setCustomIssue('');
    setTempAgendas(generateTempAgendas(save.rankLevel, totalAttendeeCount));
  };

  const handleVote = (id: string, vote: 'yes' | 'no') => {
    setTempAgendas(prev => prev.map(a => {
      if (a.id !== id) return a;
      const totalYes = vote === 'yes' ? a.yesCount + 1 : a.yesCount;
      const totalVotes = a.yesCount + a.noCount + 1;
      return { ...a, vote, passed: totalYes > totalVotes / 2 };
    }));
  };

  const handleAddCustomAgenda = () => {
    const issue = customIssue.trim();
    if (!issue) return;
    setTempAgendas(prev => [...prev, {
      id: `custom_${Date.now()}`, dept: 'organization', issue,
      detail: '（领导提出的临时议题，由与会人员讨论表决）',
      vote: null,
      yesCount: Math.max(1, Math.floor(totalAttendeeCount * 0.6)),
      noCount:  Math.max(0, Math.floor(totalAttendeeCount * 0.2)),
      passed: null,
    }]);
    setCustomIssue('');
  };

  const handleAutoAssign = () => {
    const auto: Record<string, KpiType> = {};
    if (isNational) {
      nationalAttendees.forEach((a, i) => { auto[a.id] = KPI_CYCLE[i % KPI_CYCLE.length]; });
    } else {
      attendees.forEach((s, i) => { auto[s.id] = KPI_CYCLE[i % KPI_CYCLE.length]; });
    }
    setAssignments(auto);
    setMsg(`✓ 已向全部 ${totalAttendeeCount} 名参会人员自动分派指标，可手动调整`);
  };

  const handleSubmit = async () => {
    if (!save) return;
    const keys = Object.keys(assignments);
    if (keys.length === 0) { setMsg('请至少为一名下属分派任务'); return; }
    setSubmitting(true);
    const targetVal = isNational ? 8 : 5;
    const tasks: MeetingTask[] = keys.map(subId => {
      const kpiType = assignments[subId];
      let personName = '未知';
      if (isNational) {
        personName = nationalAttendees.find(a => a.id === subId)?.name ?? subId;
      } else {
        personName = subordinates.find(s => s.id === subId)?.name ?? '未知';
      }
      return { subordinateId: subId, subordinateName: personName, kpiType, targetValue: targetVal, deadlineDay: save.gameDays + 30, status: 'pending', completedDay: null };
    });
    const result = await createMeeting(save.id, save.userId, monthKey, save.gameDays, tasks);
    setSubmitting(false);
    if (result) { setCurrentMeeting(result); setIsHolding(false); setMsg(''); }
    else { setMsg('发起失败，请重试'); }
  };

  // ── 步骤进度组件 ──
  const STEPS: { key: MeetingStep; label: string }[] = [
    { key: 'study',   label: '学习传达' },
    { key: 'report',  label: '工作通报' },
    { key: 'agenda',  label: '议题审议' },
    { key: 'kpi',     label: '任务分派' },
    { key: 'summary', label: '形成纪要' },
  ];
  const stepIdx = STEPS.findIndex(s => s.key === meetingStep);

  return (
    <View style={{ flex: 1, backgroundColor: '#F5F4F1' }}>
      {/* 顶栏 */}
      <View style={{ backgroundColor: meetingInfo.headerColor, paddingTop: insets.top + 8, paddingBottom: 14, paddingHorizontal: 16, flexDirection: 'row', alignItems: 'center' }}>
        <Pressable onPress={() => router.back()} style={{ marginRight: 12 }}>
          <Text style={{ color: '#ccc', fontSize: 22 }}>‹</Text>
        </Pressable>
        <View style={{ flex: 1 }}>
          <Text style={{ color: '#a0b4cc', fontSize: 10, letterSpacing: 1 }}>{save?.rankName} · {save?.cityName}</Text>
          <Text style={{ color: '#fff', fontSize: 16, fontWeight: '700', letterSpacing: 1 }}>{meetingInfo.title}</Text>
          <Text style={{ color: '#a0b4cc', fontSize: 10, marginTop: 1 }}>{meetingInfo.subtitle} · {meetingInfo.convener}</Text>
        </View>
        <View style={{ backgroundColor: 'rgba(255,255,255,0.12)', paddingHorizontal: 10, paddingVertical: 4 }}>
          <Text style={{ color: '#fff', fontSize: 10 }}>参会 {totalAttendeeCount}人</Text>
        </View>
      </View>

      {loading ? (
        <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
          <ActivityIndicator size="large" color={meetingInfo.headerColor} />
        </View>
      ) : (
        <ScrollView contentInsetAdjustmentBehavior="automatic" contentContainerStyle={{ padding: 16, gap: 14 }}>

          {/* ── 强制月度召开警告横幅 ── */}
          {!currentMeeting && (
            <View style={{ backgroundColor: '#C82829', padding: 12, flexDirection: 'row', alignItems: 'center', gap: 10 }}>
              <Text style={{ fontSize: 22 }}>⚠️</Text>
              <View style={{ flex: 1 }}>
                <Text style={{ color: '#fff', fontWeight: '700', fontSize: 13 }}>本月{meetingInfo.title}尚未召开</Text>
                <Text style={{ color: 'rgba(255,255,255,0.85)', fontSize: 11, marginTop: 2 }}>
                  依据党政会议制度，{meetingInfo.title}每月至少召开一次。未按时召开将影响工作推进，产生政绩扣减风险。
                </Text>
              </View>
            </View>
          )}

          {/* ── 参会人员名单 ── */}
          <View style={{ backgroundColor: '#fff', borderWidth: 1, borderColor: isNational ? '#4a2c8a' : '#D1D1CF', padding: 14 }}>
            <Pressable onPress={() => setShowAttendees(v => !v)} style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
              <Text style={{ fontSize: 11, color: isNational ? '#4a2c8a' : '#888', letterSpacing: 2, fontWeight: isNational ? '700' : '400' }}>
                {isNational ? '与会领导' : '参会人员'}
              </Text>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                {isNational ? (
                  <>
                    <View style={{ backgroundColor: '#4a2c8a', paddingHorizontal: 6, paddingVertical: 1 }}>
                      <Text style={{ color: '#fff', fontSize: 9 }}>常委 {nationalAttendees.filter(a => a.isCore).length}</Text>
                    </View>
                    <View style={{ backgroundColor: '#7B5E2A', paddingHorizontal: 6, paddingVertical: 1 }}>
                      <Text style={{ color: '#fff', fontSize: 9 }}>委员 {nationalAttendees.filter(a => !a.isCore).length}</Text>
                    </View>
                  </>
                ) : (
                  <>
                    <View style={{ backgroundColor: '#C82829', paddingHorizontal: 6, paddingVertical: 1 }}>
                      <Text style={{ color: '#fff', fontSize: 9 }}>正 {headDeputy.filter(s => s.deptPosition === 'head').length}</Text>
                    </View>
                    <View style={{ backgroundColor: '#1D2D44', paddingHorizontal: 6, paddingVertical: 1 }}>
                      <Text style={{ color: '#fff', fontSize: 9 }}>副 {headDeputy.filter(s => s.deptPosition === 'deputy').length}</Text>
                    </View>
                    <View style={{ backgroundColor: '#7B5E2A', paddingHorizontal: 6, paddingVertical: 1 }}>
                      <Text style={{ color: '#fff', fontSize: 9 }}>班 {bandSubs.length}</Text>
                    </View>
                  </>
                )}
                <Text style={{ color: '#888', fontSize: 14 }}>{showAttendees ? '▲' : '▼'}</Text>
              </View>
            </Pressable>
            {showAttendees && (
              <View style={{ marginTop: 10, gap: 4 }}>
                {isNational ? nationalAttendees.map(a => (
                  <View key={a.id} style={{ flexDirection: 'row', alignItems: 'center', gap: 8, paddingVertical: 4, borderBottomWidth: 1, borderBottomColor: '#F5F5F5' }}>
                    <View style={{ backgroundColor: a.isCore ? '#4a2c8a' : '#7B5E2A', paddingHorizontal: 5, paddingVertical: 2 }}>
                      <Text style={{ color: '#fff', fontSize: 9, fontWeight: '700' }}>{a.isCore ? '常委' : '委员'}</Text>
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={{ fontSize: 12, color: '#222', fontWeight: '600' }}>{a.name}</Text>
                      <Text style={{ fontSize: 10, color: '#888' }}>{a.title} · {a.dept}</Text>
                    </View>
                  </View>
                )) : attendees.length === 0 ? (
                  <Text style={{ fontSize: 12, color: '#aaa', fontStyle: 'italic' }}>暂无在岗领导班子成员</Text>
                ) : (
                  attendees.map(s => (
                    <AttendeeRow key={s.id} sub={s} deptLabel={s.appointedRole ?? s.appointedDept ?? ''} isLeader={bandSubIds.has(s.id)} />
                  ))
                )}
              </View>
            )}
          </View>

          {/* ── 本月状态 ── */}
          <View style={{ backgroundColor: '#fff', borderWidth: 1, borderColor: '#D1D1CF', padding: 14 }}>
            <Text style={{ fontSize: 11, color: '#888', letterSpacing: 2, marginBottom: 6 }}>本月会议状态</Text>
            <Text style={{ fontSize: 12, color: '#555', marginBottom: 10 }}>
              {gameDaysToDate(save.gameDays)}　第 {monthKey} 月
            </Text>

            {currentMeeting ? (
              <>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 10 }}>
                  <View style={{ backgroundColor: '#2a7a3b', paddingHorizontal: 10, paddingVertical: 3 }}>
                    <Text style={{ color: '#fff', fontSize: 11, fontWeight: '700' }}>✓ 已召开</Text>
                  </View>
                  <Text style={{ fontSize: 11, color: '#888' }}>分派任务 {currentMeeting.tasks.length} 项</Text>
                  <View style={{ flex: 1 }}>
                    <ProgressBar
                      value={currentMeeting.tasks.filter(t => t.status === 'done').length}
                      total={currentMeeting.tasks.length}
                    />
                  </View>
                </View>
                {currentMeeting.tasks.map((t, i) => (
                  <View key={i} style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: 8, borderTopWidth: 1, borderColor: '#f0f0f0' }}>
                    <View style={{ flex: 1 }}>
                      <Text style={{ fontSize: 13, color: '#222', fontWeight: '600' }}>{t.subordinateName}</Text>
                      <Text style={{ fontSize: 11, color: '#888' }}>
                        {KPI_LABELS[t.kpiType]} +{t.targetValue}点　截止{gameDaysToDate(t.deadlineDay)}
                      </Text>
                    </View>
                    <View style={{ borderWidth: 1, borderColor: STATUS_COLOR[t.status], paddingHorizontal: 8, paddingVertical: 3, marginLeft: 8 }}>
                      <Text style={{ fontSize: 11, color: STATUS_COLOR[t.status], fontWeight: '600' }}>{STATUS_LABEL[t.status]}</Text>
                    </View>
                  </View>
                ))}
              </>
            ) : isHolding ? (
              <View style={{ gap: 10 }}>
                {/* 步骤进度条 */}
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 0, marginBottom: 6 }}>
                  {STEPS.map((s, i) => (
                    <View key={s.key} style={{ flex: 1, alignItems: 'center' }}>
                      <View style={{ width: 20, height: 20, borderRadius: 10, backgroundColor: i <= stepIdx ? meetingInfo.headerColor : '#D1D1CF', alignItems: 'center', justifyContent: 'center', marginBottom: 3 }}>
                        <Text style={{ color: '#fff', fontSize: 9, fontWeight: '700' }}>{i + 1}</Text>
                      </View>
                      <Text style={{ fontSize: 8, color: i === stepIdx ? meetingInfo.headerColor : '#aaa', fontWeight: i === stepIdx ? '700' : '400', textAlign: 'center' }}>{s.label}</Text>
                    </View>
                  ))}
                </View>

                {/* 第一步：学习传达 */}
                {meetingStep === 'study' && (
                  <View style={{ gap: 8 }}>
                    <View style={{ backgroundColor: meetingInfo.headerColor, paddingHorizontal: 12, paddingVertical: 8 }}>
                      <Text style={{ color: '#fff', fontSize: 13, fontWeight: '700', letterSpacing: 1 }}>📖 第一项：学习传达</Text>
                      <Text style={{ color: '#a0b4cc', fontSize: 10, marginTop: 2 }}>学习传达上级重要精神，统一思想认识</Text>
                    </View>
                    {studyItems.map((item, i) => (
                      <Pressable
                        key={i}
                        onPress={() => setStudySelected(i)}
                        style={{ borderWidth: 1.5, borderColor: studySelected === i ? '#C82829' : '#D1D1CF', backgroundColor: studySelected === i ? '#fff5f5' : '#fafafa', padding: 12 }}
                      >
                        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                          <View style={{ width: 16, height: 16, borderRadius: 8, borderWidth: 2, borderColor: studySelected === i ? '#C82829' : '#ccc', backgroundColor: studySelected === i ? '#C82829' : '#fff', alignItems: 'center', justifyContent: 'center' }}>
                            {studySelected === i && <View style={{ width: 6, height: 6, borderRadius: 3, backgroundColor: '#fff' }} />}
                          </View>
                          <Text style={{ fontSize: 13, fontWeight: '600', color: studySelected === i ? '#C82829' : '#222', flex: 1 }}>{item.title}</Text>
                        </View>
                        <Text style={{ fontSize: 11, color: '#666', lineHeight: 17, paddingLeft: 24 }}>{item.content}</Text>
                      </Pressable>
                    ))}
                    <Pressable
                      onPress={() => studySelected !== null && setMeetingStep('report')}
                      disabled={studySelected === null}
                      style={{ backgroundColor: studySelected !== null ? meetingInfo.headerColor : '#ccc', paddingVertical: 12, alignItems: 'center' }}
                    >
                      <Text style={{ color: '#fff', fontWeight: '700', fontSize: 13 }}>学习传达完毕 → 工作通报</Text>
                    </Pressable>
                    <Pressable onPress={() => setIsHolding(false)} style={{ paddingVertical: 8, alignItems: 'center' }}>
                      <Text style={{ color: '#888', fontSize: 12 }}>取消会议</Text>
                    </Pressable>
                  </View>
                )}

                {/* 第二步：工作通报 */}
                {meetingStep === 'report' && (
                  <View style={{ gap: 8 }}>
                    <View style={{ backgroundColor: meetingInfo.headerColor, paddingHorizontal: 12, paddingVertical: 8 }}>
                      <Text style={{ color: '#fff', fontSize: 13, fontWeight: '700', letterSpacing: 1 }}>📊 第二项：工作通报</Text>
                      <Text style={{ color: '#a0b4cc', fontSize: 10, marginTop: 2 }}>各部门负责人通报近期工作情况</Text>
                    </View>
                    {workReports.map((r, i) => (
                      <View key={i} style={{ backgroundColor: '#fff', borderWidth: 1, borderColor: '#E0E0E0', padding: 12, flexDirection: 'row', alignItems: 'flex-start', gap: 10 }}>
                        <View style={{ backgroundColor: RATING_COLOR[r.rating], paddingHorizontal: 6, paddingVertical: 3, minWidth: 24, alignItems: 'center' }}>
                          <Text style={{ color: '#fff', fontSize: 10, fontWeight: '700' }}>{r.rating}</Text>
                        </View>
                        <View style={{ flex: 1 }}>
                          <Text style={{ fontSize: 11, color: '#888', marginBottom: 3 }}>{r.dept}</Text>
                          <Text style={{ fontSize: 12, color: '#333', lineHeight: 18 }}>{r.content}</Text>
                        </View>
                      </View>
                    ))}
                    <Pressable onPress={() => setMeetingStep('agenda')} style={{ backgroundColor: meetingInfo.headerColor, paddingVertical: 12, alignItems: 'center' }}>
                      <Text style={{ color: '#fff', fontWeight: '700', fontSize: 13 }}>通报完毕 → 议题审议</Text>
                    </Pressable>
                    <Pressable onPress={() => setMeetingStep('study')} style={{ paddingVertical: 8, alignItems: 'center' }}>
                      <Text style={{ color: '#888', fontSize: 12 }}>← 返回上一步</Text>
                    </Pressable>
                  </View>
                )}

                {/* 第三步：议题审议 */}
                {meetingStep === 'agenda' && (
                  <View style={{ gap: 8 }}>
                    <View style={{ backgroundColor: meetingInfo.headerColor, paddingHorizontal: 12, paddingVertical: 8 }}>
                      <Text style={{ color: '#fff', fontSize: 13, fontWeight: '700', letterSpacing: 1 }}>📋 第三项：议题审议</Text>
                      <Text style={{ color: '#a0b4cc', fontSize: 10, marginTop: 2 }}>各职能部门提报议题，逐一讨论表决</Text>
                    </View>
                    {tempAgendas.map((agenda) => {
                      const deptName = getDeptNameByRank(agenda.dept, save.rankLevel);
                      const totalVotes = agenda.yesCount + agenda.noCount + (agenda.vote ? 1 : 0);
                      return (
                        <View key={agenda.id} style={{ borderWidth: 1, borderColor: agenda.passed === true ? '#2a7a3b' : agenda.passed === false ? '#C82829' : '#D1D1CF', backgroundColor: agenda.passed === true ? '#f0faf2' : agenda.passed === false ? '#fff5f5' : '#fff', padding: 12 }}>
                          <View style={{ flexDirection: 'row', alignItems: 'flex-start', gap: 8, marginBottom: 6 }}>
                            <View style={{ backgroundColor: meetingInfo.headerColor, paddingHorizontal: 6, paddingVertical: 2, marginTop: 1 }}>
                              <Text style={{ color: '#fff', fontSize: 9 }}>{deptName}</Text>
                            </View>
                            <Text style={{ fontSize: 12, fontWeight: '700', color: '#222', flex: 1, lineHeight: 18 }}>{agenda.issue}</Text>
                          </View>
                          <Text style={{ fontSize: 11, color: '#666', lineHeight: 17, marginBottom: 8, paddingLeft: 4, borderLeftWidth: 2, borderLeftColor: '#D1D1CF' }}>{agenda.detail}</Text>
                          <View style={{ flexDirection: 'row', gap: 8, marginBottom: 8 }}>
                            <Text style={{ fontSize: 10, color: '#888' }}>🙋 班子赞成 {agenda.yesCount} 票</Text>
                            <Text style={{ fontSize: 10, color: '#888' }}>✋ 反对 {agenda.noCount} 票</Text>
                          </View>
                          {agenda.vote === null ? (
                            <View style={{ flexDirection: 'row', gap: 8 }}>
                              <Pressable onPress={() => handleVote(agenda.id, 'yes')} style={{ flex: 1, backgroundColor: '#2a7a3b', paddingVertical: 8, alignItems: 'center' }}>
                                <Text style={{ color: '#fff', fontSize: 12, fontWeight: '700' }}>✅ 举手赞成</Text>
                              </Pressable>
                              <Pressable onPress={() => handleVote(agenda.id, 'no')} style={{ flex: 1, backgroundColor: '#C82829', paddingVertical: 8, alignItems: 'center' }}>
                                <Text style={{ color: '#fff', fontSize: 12, fontWeight: '700' }}>❌ 投票反对</Text>
                              </Pressable>
                            </View>
                          ) : (
                            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                              <View style={{ backgroundColor: agenda.passed ? '#2a7a3b' : '#C82829', paddingHorizontal: 10, paddingVertical: 4 }}>
                                <Text style={{ color: '#fff', fontSize: 11, fontWeight: '700' }}>{agenda.passed ? '✅ 决议通过' : '❌ 决议否决'}</Text>
                              </View>
                              <Text style={{ fontSize: 10, color: '#888' }}>赞成{agenda.vote === 'yes' ? agenda.yesCount + 1 : agenda.yesCount}/{totalVotes}票</Text>
                            </View>
                          )}
                        </View>
                      );
                    })}
                    {/* 自定义议题 */}
                    <View style={{ borderWidth: 1, borderColor: '#D1D1CF', borderStyle: 'dashed', padding: 10, gap: 8 }}>
                      <Text style={{ fontSize: 11, color: '#888', letterSpacing: 1 }}>➕ 提出临时议题</Text>
                      <TextInput
                        value={customIssue}
                        onChangeText={setCustomIssue}
                        placeholder="输入议题标题（如：关于…的议案）"
                        placeholderTextColor="#bbb"
                        style={{ borderWidth: 1, borderColor: '#D1D1CF', padding: 8, fontSize: 12, color: '#222' }}
                      />
                      <Pressable onPress={handleAddCustomAgenda} style={{ backgroundColor: '#4a3a1e', paddingVertical: 8, alignItems: 'center' }}>
                        <Text style={{ color: '#fff', fontSize: 11, fontWeight: '700' }}>提交至会议议程</Text>
                      </Pressable>
                    </View>
                    <Pressable onPress={() => setMeetingStep('kpi')} style={{ backgroundColor: meetingInfo.headerColor, paddingVertical: 12, alignItems: 'center' }}>
                      <Text style={{ color: '#fff', fontSize: 13, fontWeight: '700', letterSpacing: 1 }}>议题审议完毕 → 分派工作任务</Text>
                    </Pressable>
                    <Pressable onPress={() => setMeetingStep('report')} style={{ paddingVertical: 8, alignItems: 'center' }}>
                      <Text style={{ color: '#888', fontSize: 12 }}>← 返回上一步</Text>
                    </Pressable>
                  </View>
                )}

                {/* 第四步：任务分派 */}
                {meetingStep === 'kpi' && (
                  <View style={{ gap: 10 }}>
                    <View style={{ backgroundColor: meetingInfo.headerColor, paddingHorizontal: 12, paddingVertical: 8 }}>
                      <Text style={{ color: '#fff', fontSize: 13, fontWeight: '700', letterSpacing: 1 }}>📌 第四项：工作部署</Text>
                      <Text style={{ color: '#a0b4cc', fontSize: 10, marginTop: 2 }}>向与会人员下达本月工作任务指标</Text>
                    </View>
                    <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
                      <Text style={{ fontSize: 12, color: meetingInfo.headerColor, fontWeight: '700' }}>
                        {isNational ? '向与会领导下达任务' : '为下属分派KPI指标'}
                      </Text>
                      <Pressable onPress={handleAutoAssign} style={{ backgroundColor: meetingInfo.headerColor, paddingHorizontal: 12, paddingVertical: 6 }} android_ripple={{ color: 'rgba(255,255,255,0.2)' }}>
                        <Text style={{ color: '#fff', fontSize: 11, fontWeight: '700' }}>⚡ 一键分配</Text>
                      </Pressable>
                    </View>
                    {isNational ? nationalAttendees.map(person => (
                      <View key={person.id} style={{ borderWidth: 1, borderColor: assignments[person.id] ? '#4a2c8a' : '#D1D1CF', padding: 10, backgroundColor: assignments[person.id] ? '#f4f0fa' : '#fff' }}>
                        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 6 }}>
                          <View style={{ backgroundColor: person.isCore ? '#4a2c8a' : '#7B5E2A', paddingHorizontal: 5, paddingVertical: 2 }}>
                            <Text style={{ color: '#fff', fontSize: 9 }}>{person.isCore ? '常委' : '委员'}</Text>
                          </View>
                          <View style={{ flex: 1 }}>
                            <Text style={{ fontSize: 13, fontWeight: '600', color: '#222' }}>{person.name}</Text>
                            <Text style={{ fontSize: 10, color: '#888' }}>{person.title}</Text>
                          </View>
                          {assignments[person.id] && <View style={{ backgroundColor: '#4a2c8a', paddingHorizontal: 6, paddingVertical: 2 }}><Text style={{ color: '#fff', fontSize: 9 }}>已分配</Text></View>}
                        </View>
                        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6 }}>
                          {activeKpiOptions.map(opt => (
                            <Pressable key={opt.type} onPress={() => setAssignments(prev => ({ ...prev, [person.id]: opt.type }))}
                              style={{ borderWidth: 1, borderColor: assignments[person.id] === opt.type ? '#4a2c8a' : '#ccc', backgroundColor: assignments[person.id] === opt.type ? '#4a2c8a' : '#fff', paddingHorizontal: 8, paddingVertical: 4 }}>
                              <Text style={{ fontSize: 11, color: assignments[person.id] === opt.type ? '#fff' : '#555' }}>{opt.label}</Text>
                            </Pressable>
                          ))}
                        </View>
                      </View>
                    )) : attendees.length === 0 ? (
                      <Text style={{ fontSize: 12, color: '#aaa', fontStyle: 'italic' }}>暂无在岗人员，请先任命部门正职</Text>
                    ) : attendees.map(sub => {
                      const isBandMember = bandSubIds.has(sub.id) && sub.deptPosition !== 'head' && sub.deptPosition !== 'deputy';
                      const posLabel = sub.deptPosition === 'head' ? '正职' : sub.deptPosition === 'deputy' ? '副职' : '班子';
                      const posColor = sub.deptPosition === 'head' ? '#C82829' : sub.deptPosition === 'deputy' ? '#1D2D44' : '#7B5E2A';
                      return (
                        <View key={sub.id} style={{ borderWidth: 1, borderColor: assignments[sub.id] ? meetingInfo.headerColor : '#D1D1CF', padding: 10, backgroundColor: assignments[sub.id] ? '#f0f4fa' : '#fff' }}>
                          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 6 }}>
                            <View style={{ backgroundColor: posColor, paddingHorizontal: 5, paddingVertical: 2 }}>
                              <Text style={{ color: '#fff', fontSize: 9 }}>{posLabel}</Text>
                            </View>
                            <Text style={{ fontSize: 13, fontWeight: '600', color: '#222' }}>{sub.name}</Text>
                            <Text style={{ fontSize: 10, color: '#888', flex: 1 }}>{isBandMember ? '领导班子' : sub.appointedRole ?? sub.appointedDept ?? ''}</Text>
                            {assignments[sub.id] && <View style={{ backgroundColor: meetingInfo.headerColor, paddingHorizontal: 6, paddingVertical: 2 }}><Text style={{ color: '#fff', fontSize: 9 }}>已分配</Text></View>}
                          </View>
                          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6 }}>
                            {activeKpiOptions.map(opt => (
                              <Pressable key={opt.type} onPress={() => setAssignments(prev => ({ ...prev, [sub.id]: opt.type }))}
                                style={{ borderWidth: 1, borderColor: assignments[sub.id] === opt.type ? '#C82829' : '#ccc', backgroundColor: assignments[sub.id] === opt.type ? '#C82829' : '#fff', paddingHorizontal: 8, paddingVertical: 4 }}>
                                <Text style={{ fontSize: 11, color: assignments[sub.id] === opt.type ? '#fff' : '#555' }}>{opt.label}</Text>
                              </Pressable>
                            ))}
                          </View>
                        </View>
                      );
                    })}
                    {msg ? <Text style={{ fontSize: 12, color: msg.startsWith('✓') ? '#2a7a3b' : '#C82829' }}>{msg}</Text> : null}
                    <Pressable onPress={() => setMeetingStep('summary')} disabled={Object.keys(assignments).length === 0} style={{ backgroundColor: Object.keys(assignments).length > 0 ? meetingInfo.headerColor : '#ccc', paddingVertical: 12, alignItems: 'center' }}>
                      <Text style={{ color: '#fff', fontWeight: '700', fontSize: 13 }}>任务布置完毕 → 形成纪要</Text>
                    </Pressable>
                    <Pressable onPress={() => setMeetingStep('agenda')} style={{ paddingVertical: 8, alignItems: 'center' }}>
                      <Text style={{ color: '#888', fontSize: 12 }}>← 返回上一步</Text>
                    </Pressable>
                  </View>
                )}

                {/* 第五步：形成纪要 */}
                {meetingStep === 'summary' && (
                  <View style={{ gap: 10 }}>
                    <View style={{ backgroundColor: meetingInfo.headerColor, paddingHorizontal: 12, paddingVertical: 8 }}>
                      <Text style={{ color: '#fff', fontSize: 13, fontWeight: '700', letterSpacing: 1 }}>📝 第五项：形成纪要</Text>
                      <Text style={{ color: '#a0b4cc', fontSize: 10, marginTop: 2 }}>确认本次会议内容，形成会议纪要</Text>
                    </View>
                    {/* 纪要预览 */}
                    <View style={{ backgroundColor: '#FAFAF8', borderWidth: 1, borderColor: '#D1D1CF', padding: 14, gap: 8 }}>
                      <Text style={{ fontSize: 13, fontWeight: '700', color: '#222', textAlign: 'center', marginBottom: 4 }}>
                        {meetingInfo.subtitle}纪要
                      </Text>
                      <Text style={{ fontSize: 11, color: '#555' }}>时间：{gameDaysToDate(save.gameDays)}</Text>
                      <Text style={{ fontSize: 11, color: '#555' }}>主持：{meetingInfo.convener}</Text>
                      <Text style={{ fontSize: 11, color: '#555' }}>参会人数：{totalAttendeeCount}人</Text>
                      <View style={{ borderTopWidth: 1, borderTopColor: '#E0E0E0', paddingTop: 8, marginTop: 4 }}>
                        <Text style={{ fontSize: 11, color: '#555', fontWeight: '600' }}>一、学习传达事项</Text>
                        <Text style={{ fontSize: 11, color: '#888', marginTop: 3 }}>
                          {studySelected !== null ? studyItems[studySelected].title : ''}
                        </Text>
                      </View>
                      <View style={{ borderTopWidth: 1, borderTopColor: '#E0E0E0', paddingTop: 8 }}>
                        <Text style={{ fontSize: 11, color: '#555', fontWeight: '600' }}>二、议题审议结果</Text>
                        {tempAgendas.map((a, i) => (
                          <Text key={a.id} style={{ fontSize: 11, color: '#888', marginTop: 3 }}>
                            {i + 1}. {a.issue}——{a.passed === true ? '✅通过' : a.passed === false ? '❌否决' : '⏳待定'}
                          </Text>
                        ))}
                      </View>
                      <View style={{ borderTopWidth: 1, borderTopColor: '#E0E0E0', paddingTop: 8 }}>
                        <Text style={{ fontSize: 11, color: '#555', fontWeight: '600' }}>三、工作部署任务</Text>
                        <Text style={{ fontSize: 11, color: '#888', marginTop: 3 }}>共向 {Object.keys(assignments).length} 名与会人员下达KPI工作任务，30天内完成。</Text>
                      </View>
                    </View>
                    <Pressable onPress={handleSubmit} disabled={submitting} style={{ backgroundColor: '#2a7a3b', paddingVertical: 14, alignItems: 'center' }}>
                      <Text style={{ color: '#fff', fontWeight: '700', fontSize: 14 }}>{submitting ? '提交中…' : '✅ 确认纪要，会议结束'}</Text>
                    </Pressable>
                    <Pressable onPress={() => setMeetingStep('kpi')} style={{ paddingVertical: 8, alignItems: 'center' }}>
                      <Text style={{ color: '#888', fontSize: 12 }}>← 返回上一步</Text>
                    </Pressable>
                  </View>
                )}
              </View>
            ) : (
              <>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 14 }}>
                  <View style={{ borderWidth: 1, borderColor: '#888', paddingHorizontal: 10, paddingVertical: 3 }}>
                    <Text style={{ color: '#888', fontSize: 11 }}>未召开</Text>
                  </View>
                </View>
                <Pressable onPress={handleHoldMeeting} style={{ backgroundColor: meetingInfo.headerColor, padding: 13, alignItems: 'center' }}>
                  <Text style={{ color: '#fff', fontWeight: '700', fontSize: 13, letterSpacing: 1 }}>召开{meetingInfo.title}</Text>
                </Pressable>
              </>
            )}
          </View>

          {/* ── 往期记录 ── */}
          {recentMeetings.length > 0 && (
            <View style={{ backgroundColor: '#fff', borderWidth: 1, borderColor: '#D1D1CF', padding: 14 }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
                <Text style={{ fontSize: 11, color: '#888', letterSpacing: 2 }}>往期会议记录</Text>
                {histRate !== null && (
                  <View style={{ backgroundColor: histRate >= 70 ? '#2a7a3b' : histRate >= 40 ? '#e07a00' : '#C82829', paddingHorizontal: 8, paddingVertical: 2 }}>
                    <Text style={{ color: '#fff', fontSize: 10, fontWeight: '700' }}>完成率 {histRate}%</Text>
                  </View>
                )}
              </View>
              {recentMeetings.map(m => {
                const done  = m.tasks.filter(t => t.status === 'done').length;
                const total = m.tasks.length;
                const rateColor = done === total ? '#2a7a3b' : done > 0 ? '#e07a00' : '#C82829';
                return (
                  <View key={m.id} style={{ paddingVertical: 8, borderTopWidth: 1, borderColor: '#f0f0f0' }}>
                    <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 }}>
                      <View>
                        <Text style={{ fontSize: 12, color: '#333' }}>第 {m.monthKey} 月 {meetingInfo.title}</Text>
                        <Text style={{ fontSize: 11, color: '#888' }}>{gameDaysToDate(m.heldDay)}</Text>
                      </View>
                      <Text style={{ fontSize: 12, color: rateColor, fontWeight: '600' }}>{done}/{total} 完成</Text>
                    </View>
                    <ProgressBar value={done} total={total} color={rateColor} />
                  </View>
                );
              })}
            </View>
          )}

          {/* ── 规则说明 ── */}
          <View style={{ backgroundColor: '#fff', borderWidth: 1, borderColor: '#D1D1CF', padding: 14 }}>
            <Text style={{ fontSize: 11, color: '#888', letterSpacing: 2, marginBottom: 8 }}>会议制度说明</Text>
            <Text style={{ fontSize: 12, color: '#555', lineHeight: 20 }}>
              · 依据党政会议制度，{meetingInfo.title}每月至少召开一次{'\n'}
              · 未按时召开将产生政绩扣减并增加工作风险{'\n'}
              · 会议流程：学习传达→工作通报→议题审议→任务分派→形成纪要{'\n'}
              · 各职能部门议题须逐一表决，形成党委/政府决议{'\n'}
              · 任务分派后30天内系统自动结算，完成任务获政绩奖励{'\n'}
              · 「一键分配」将四类KPI轮转分配给各参会人员
            </Text>
          </View>
        </ScrollView>
      )}
    </View>
  );
}
