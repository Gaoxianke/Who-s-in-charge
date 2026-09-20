// 总理办公室页面 — rank13+可进入，rank14拥有完整权限
// 功能：副院理分管（经济/社会/港澳台）、军委外交、述职KPI排名+撤职、专线电话、特批晋升
// 新增：专项金额每月增长GDP的1%、政治活动政绩+500、约谈整改实装结果
import { useCallback, useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { useRouter, useFocusEffect } from 'expo-router';
import { useGame } from '@/ctx/GameContext';
import { getAllSubordinates } from '@/db/gameApi';
import type { Subordinate } from '@/types/game';
import { formatMoney, estimateNationalGdp } from '@/types/game';
import { getHotlineTargets } from '@/lib/leaders';

// 副院理分管板块（三块）
interface VPArea {
  id: string;
  icon: string;
  title: string;
  desc: string;
  cost: number;
  effects: { key: keyof typeof EFFECT_LABELS; delta: number }[];
  meritReward: number;
}

const EFFECT_LABELS: Record<string, string> = {
  cityGdp: 'GDP', cityLivelihood: '民生', cityEcology: '生态',
  cityBusiness: '营商', securityIndex: '安全',
};

const VP_AREAS: VPArea[] = [
  // 经济板块（第一副院理分管）
  { id: 'eco1', icon: '📈', title: '宏观调控部署',      desc: '针对通胀或下行压力，下达宏观政策指示，稳住经济大盘',   cost: 800_000,  effects: [{ key: 'cityGdp', delta: 4 }, { key: 'cityBusiness', delta: 2 }], meritReward: 500 },
  { id: 'eco2', icon: '🏗️', title: '重大基础设施投资',  desc: '部署新一轮重大项目投资，拉动内需稳增长',                cost: 2_000_000, effects: [{ key: 'cityGdp', delta: 6 }, { key: 'cityLivelihood', delta: 2 }], meritReward: 500 },
  { id: 'eco3', icon: '🏦', title: '金融政策协调',      desc: '协调人民银行与财政部联合行动，保障金融市场平稳运行',   cost: 500_000,  effects: [{ key: 'cityGdp', delta: 2 }, { key: 'cityBusiness', delta: 4 }], meritReward: 500 },
  // 社会民生板块（第二副院理分管）
  { id: 'soc1', icon: '🏥', title: '医疗卫生专项投入',  desc: '加大医疗卫生投入，提升全民健康保障水平',               cost: 600_000,  effects: [{ key: 'cityLivelihood', delta: 5 }, { key: 'cityEcology', delta: 1 }], meritReward: 500 },
  { id: 'soc2', icon: '🎓', title: '教育公平专项行动',  desc: '推动城乡教育均等化，实施教育领域补短板工程',           cost: 500_000,  effects: [{ key: 'cityLivelihood', delta: 4 }], meritReward: 500 },
  { id: 'soc3', icon: '🏘️', title: '保障性住房工程',   desc: '推进保障房建设，有效解决中低收入群体住房难题',         cost: 1_500_000, effects: [{ key: 'cityLivelihood', delta: 6 }, { key: 'cityGdp', delta: 1 }], meritReward: 500 },
  // 港澳台外交板块（第三副院理分管）
  { id: 'hmt1', icon: '🤝', title: '港澳融合发展部署', desc: '深化粤港澳大湾区合作，推动港澳融入国家发展大局',        cost: 1_200_000, effects: [{ key: 'cityBusiness', delta: 3 }, { key: 'cityGdp', delta: 2 }], meritReward: 500 },
  { id: 'hmt2', icon: '🌐', title: '涉台政策统筹',     desc: '统筹对台政策研究，推进两岸经济文化交流与合作',         cost: 800_000,  effects: [{ key: 'cityBusiness', delta: 2 }, { key: 'securityIndex', delta: 3 }], meritReward: 500 },
  { id: 'hmt3', icon: '✈️', title: '主持区域外交峰会', desc: '主持周边国家及重要伙伴高层峰会，开展务实外交',          cost: 3_000_000, effects: [{ key: 'cityBusiness', delta: 5 }, { key: 'cityGdp', delta: 3 }], meritReward: 500 },
  // 军委事项（百万级起步）
  { id: 'mil1', icon: '⚔️', title: '国防特别经费划拨', desc: '向中枢军委划拨专项国防经费，强化战略威慑和备战水平',    cost: 5_000_000, effects: [{ key: 'securityIndex', delta: 15 }], meritReward: 500 },
  { id: 'mil2', icon: '🛡️', title: '军民融合产业推进', desc: '协调军民融合重大项目落地，带动国防工业转型升级',        cost: 2_000_000, effects: [{ key: 'securityIndex', delta: 6 }, { key: 'cityGdp', delta: 2 }], meritReward: 500 },
];

const AREA_TABS = [
  { id: 'economy',  label: '📈 经济板块',     ids: ['eco1','eco2','eco3'] },
  { id: 'social',   label: '🏥 社会民生',     ids: ['soc1','soc2','soc3'] },
  { id: 'hmt',      label: '🤝 港澳台外交',   ids: ['hmt1','hmt2','hmt3'] },
  { id: 'military', label: '⚔️ 军委事务',     ids: ['mil1','mil2'] },
  { id: 'debrief',  label: '📋 述职部署',     ids: [] },
  { id: 'kpi',      label: '📊 KPI排名',      ids: [] },
  { id: 'promote',  label: '🚀 特批晋升',     ids: [] },
  { id: 'hotline',  label: '☎️ 专线电话',     ids: [] },
];

// KPI评级标准（依据政绩&四项指标）
function calcKpiScore(s: Subordinate): number {
  return s.experience * 0.4 + s.integrity * 0.3 + s.loyalty * 0.15 + s.ability * 0.15;
}

// ── 特批晋升/调任岗位数据 ────────────────────────────────────────────
interface SpecialPost {
  id: string;
  title: string;        // 岗位名称
  org: string;          // 所在单位
  level: number;        // 岗位职级（subLevel）
  levelName: string;    // 职级名称
  type: '晋升' | '调任';
  desc: string;
  cost: number;         // 政绩消耗
  meritReward: number;  // 政绩奖励（调任赋权后的政绩）
}

const SPECIAL_POSTS: SpecialPost[] = [
  // 副院理（13级）
  { id: 'sp1', title: '国政院第一副院理', org: '国政院',  level: 13, levelName: '副国级',  type: '晋升', desc: '分管经济金融领域，主持国政院常务会议', cost: 500, meritReward: 80 },
  { id: 'sp2', title: '国政院第四副院理', org: '国政院',  level: 13, levelName: '副国级',  type: '晋升', desc: '分管科教文卫，协助总理处理日常政务',    cost: 500, meritReward: 80 },
  // 国政委员（12级）
  { id: 'sp3', title: '国政院国政委员',   org: '国政院',  level: 12, levelName: '正部级',  type: '晋升', desc: '协助副院理处理专项事务，国政院核心成员', cost: 350, meritReward: 55 },
  // 部长（12级）
  { id: 'sp4', title: '国家发展改革委主任', org: '发改委', level: 12, levelName: '正部级', type: '调任', desc: '统筹宏观经济调控和重大战略部署',          cost: 300, meritReward: 50 },
  { id: 'sp5', title: '财政部部长',       org: '财政部',  level: 12, levelName: '正部级',  type: '调任', desc: '主管国家预算、税收、国债等财政事务',      cost: 300, meritReward: 50 },
  { id: 'sp6', title: '外交部部长',       org: '外交部',  level: 12, levelName: '正部级',  type: '调任', desc: '代表国家处理外交事务，主导双边多边外交',  cost: 300, meritReward: 50 },
  { id: 'sp7', title: '公安部部长',       org: '公安部',  level: 12, levelName: '正部级',  type: '调任', desc: '主管全国社会治安综合治理',               cost: 300, meritReward: 50 },
  { id: 'sp8', title: '工业和信息化部部长', org: '工信部', level: 12, levelName: '正部级', type: '调任', desc: '推进工业发展与数字经济战略',               cost: 280, meritReward: 48 },
  // 省委书记（11级）
  { id: 'sp9',  title: '广东省委书记',   org: '广东省委', level: 11, levelName: '正厅级',  type: '调任', desc: '主政粤港澳大湾区发展核心省份',            cost: 250, meritReward: 42 },
  { id: 'sp10', title: '浙江省委书记',   org: '浙江省委', level: 11, levelName: '正厅级',  type: '调任', desc: '领导数字经济和共同富裕示范区建设',        cost: 250, meritReward: 42 },
  { id: 'sp11', title: '江苏省委书记',   org: '江苏省委', level: 11, levelName: '正厅级',  type: '调任', desc: '主持全国经济第二大省的改革发展',          cost: 250, meritReward: 42 },
  { id: 'sp12', title: '北京市委书记',   org: '北京市委', level: 11, levelName: '正厅级',  type: '调任', desc: '首都政治文化中心的党政主要负责人',        cost: 250, meritReward: 42 },
  { id: 'sp13', title: '上海市委书记',   org: '上海市委', level: 11, levelName: '正厅级',  type: '调任', desc: '主政全国经济金融中心城市',               cost: 250, meritReward: 42 },
  // 副部级（10级）
  { id: 'sp14', title: '发改委副主任',   org: '发改委',   level: 10, levelName: '副部级',  type: '晋升', desc: '分管固定资产投资与区域协调',             cost: 150, meritReward: 25 },
  { id: 'sp15', title: '财政部副部长',   org: '财政部',   level: 10, levelName: '副部级',  type: '晋升', desc: '协助部长主管预算编制与转移支付',         cost: 150, meritReward: 25 },
];

// ── 专线电话传达任务数据（由 leaders.ts 动态生成）──────────────────

const HOTLINE_TASKS = [
  { id: 'ht1', label: '加快经济建设', desc: '要求加快推进本辖区经济发展与招商引资', meritReward: 12, effect: 'cityGdp', delta: 2 },
  { id: 'ht2', label: '改善民生保障', desc: '传达中央关于民生工作的重要指示精神', meritReward: 10, effect: 'cityLivelihood', delta: 2 },
  { id: 'ht3', label: '深化改革举措', desc: '部署重点领域改革任务，推进政策落地', meritReward: 15, effect: 'cityBusiness', delta: 3 },
  { id: 'ht4', label: '加强廉政建设', desc: '开展专项整治，坚持党风廉政建设高压态势', meritReward: 8, effect: 'securityIndex', delta: 2 },
  { id: 'ht5', label: '落实生态治理', desc: '传达绿色发展要求，督导环保目标完成', meritReward: 10, effect: 'cityEcology', delta: 2 },
];

// ── 述职报告部署：国政院向各部委及省级下达述职任务 ─────────────────
interface DebriefTask {
  id: string;
  unit: string;     // 单位名称
  type: '部委' | '省级';
  topic: string;    // 述职主题
  kpiTarget: string;
  deadline: string; // 截止季度描述
  status: 'pending' | 'submitted' | 'passed' | 'failed';
  score?: number;
}

const DEBRIEF_UNITS: DebriefTask[] = [
  { id: 'd1',  unit: '国家发展改革委', type: '部委', topic: 'GDP增速与重大项目完成情况', kpiTarget: 'GDP增速≥5%',    deadline: 'Q4', status: 'pending' },
  { id: 'd2',  unit: '财政部',        type: '部委', topic: '财政收支平衡与债务风险管控', kpiTarget: '赤字率≤3%',     deadline: 'Q4', status: 'pending' },
  { id: 'd3',  unit: '工业和信息化部', type: '部委', topic: '工业产值与数字经济发展',      kpiTarget: '数字经济占比≥40%', deadline: 'Q4', status: 'pending' },
  { id: 'd4',  unit: '农业农村部',     type: '部委', topic: '粮食安全与农村振兴',          kpiTarget: '粮食产量≥7亿吨', deadline: 'Q4', status: 'pending' },
  { id: 'd5',  unit: '生态环境部',     type: '部委', topic: '环保指标完成与碳达峰进度',    kpiTarget: 'PM2.5降幅≥5%',  deadline: 'Q4', status: 'pending' },
  { id: 'd6',  unit: '教育部',        type: '部委', topic: '基础教育质量与高等教育改革',  kpiTarget: '义务教育完成率≥99%', deadline: 'Q4', status: 'pending' },
  { id: 'd7',  unit: '卫生健康委',     type: '部委', topic: '公共卫生体系与医改进展',      kpiTarget: '医保覆盖率≥95%', deadline: 'Q4', status: 'pending' },
  { id: 'd8',  unit: '公安部',        type: '部委', topic: '社会治安综合治理',             kpiTarget: '刑事案件发案降5%', deadline: 'Q4', status: 'pending' },
  { id: 'd9',  unit: '广东省',        type: '省级', topic: '区域经济发展与高质量转型',    kpiTarget: 'GDP增速≥6%',     deadline: 'Q4', status: 'pending' },
  { id: 'd10', unit: '浙江省',        type: '省级', topic: '数字经济与民营经济活力',       kpiTarget: '营商排名全国前3', deadline: 'Q4', status: 'pending' },
  { id: 'd11', unit: '江苏省',        type: '省级', topic: '制造业转型升级',              kpiTarget: '高技术产业占比≥35%', deadline: 'Q4', status: 'pending' },
  { id: 'd12', unit: '山东省',        type: '省级', topic: '新旧动能转换',                kpiTarget: '新动能产值占比≥40%', deadline: 'Q4', status: 'pending' },
];

export default function PremierOfficeScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { save, isLoading, updateGameSave } = useGame();
  const [tab, setTab] = useState('economy');
  const [acting, setActing] = useState(false);
  const [result, setResult] = useState('');
  const [subs, setSubs] = useState<Subordinate[]>([]);
  const [kpiLoading, setKpiLoading] = useState(false);
  const [dismissed, setDismissed] = useState<Set<string>>(new Set());
  const [debriefTasks, setDebriefTasks] = useState<DebriefTask[]>(DEBRIEF_UNITS);
  const [debriefActing, setDebriefActing] = useState<string | null>(null);
  // 整改结果记录：taskId -> 整改措施描述
  const [reformResults, setReformResults] = useState<Record<string, string>>({});
  // 特批晋升：已批准的岗位ID集合
  const [approvedPosts, setApprovedPosts] = useState<Set<string>>(new Set());
  // 专线电话：已选联系人、已选任务
  const [hotlineTarget, setHotlineTarget] = useState<ReturnType<typeof getHotlineTargets>[0] | null>(null);
  const [hotlineTask, setHotlineTask] = useState<typeof HOTLINE_TASKS[0] | null>(null);
  const [hotlineFilter, setHotlineFilter] = useState<'全部' | '副院理' | '部长' | '省委书记'>('全部');
  const [hotlineSent, setHotlineSent] = useState<Set<string>>(new Set());
  // 月度GDP增长：记录上次领取的月份
  const [lastGdpMonth, setLastGdpMonth] = useState<number>(-1);

  // 动态专线联系人（基于存档ID，全局统一名字）
  const hotlineTargets = save ? getHotlineTargets(save.id) : [];

  useFocusEffect(
    useCallback(() => {
      if (!save || tab !== 'kpi') return;
      setKpiLoading(true);
      getAllSubordinates(save.id).then(list => {
        setSubs(list);
        setKpiLoading(false);
      });
    }, [save, tab]),
  );

  if (isLoading || !save) {
    return <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}><ActivityIndicator size="large" color="#8B1A1A" /></View>;
  }
  // rank13+（副院理）即可进入，rank14（总理）拥有全权
  if (save.rankLevel < 13) {
    return (
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', padding: 24, backgroundColor: '#F5F4F1' }}>
        <Text style={{ fontSize: 32, marginBottom: 12 }}>🏛️</Text>
        <Text style={{ fontSize: 15, color: '#888', textAlign: 'center' }}>晋升至国政院副院理（级别13）后解锁总理办公室</Text>
      </View>
    );
  }

  // 月度专项金额：每月自动增长全国GDP的1%（国政院专项拨款）
  const currentMonth = Math.floor(save.gameDays / 30);
  const nationalGdpAmt = estimateNationalGdp(save.rankLevel, save.cityGdp); // 亿元
  const monthlyGdpBonus = Math.round(nationalGdpAmt * 0.01); // GDP的1%（亿元）
  const canCollectMonthly = currentMonth > lastGdpMonth && save.rankLevel >= 13;

  const handleCollectMonthly = async () => {
    if (!canCollectMonthly || acting) return;
    setActing(true);
    await updateGameSave({ fundBalance: save.fundBalance + monthlyGdpBonus * 10_000 });
    setLastGdpMonth(currentMonth);
    setResult(`💰 本月专项拨款已到账 ¥${formatMoney(monthlyGdpBonus * 10_000)}（全国GDP×1%）`);
    setActing(false);
    setTimeout(() => setResult(''), 4000);
  };

  const currentAreaActions = AREA_TABS.find(t => t.id === tab)?.ids.map(id => VP_AREAS.find(a => a.id === id)!).filter(Boolean) ?? [];

  const handleAction = async (action: VPArea) => {
    if (acting || save.fundBalance < action.cost) return;
    setActing(true);
    const patch: Record<string, unknown> = {
      fundBalance: save.fundBalance - action.cost,
      meritPoints: save.meritPoints + action.meritReward,
    };
    action.effects.forEach(e => {
      const cur = (save as unknown as Record<string, number>)[e.key] ?? 0;
      (patch as Record<string, number>)[e.key] = Math.min(100, cur + e.delta);
    });
    await updateGameSave(patch as Parameters<typeof updateGameSave>[0]);
    const effectStr = action.effects.map(e => `${EFFECT_LABELS[e.key] ?? e.key}+${e.delta}`).join(' ');
    setResult(`✅ ${action.title}完成 · 政绩+${action.meritReward} · ${effectStr}`);
    setActing(false);
    setTimeout(() => setResult(''), 3000);
  };

  // KPI - 三年不达标撤职（meritPoints < 2000 视为不达标，3次）
  const handleDismiss = async (sub: Subordinate) => {
    if (acting) return;
    setActing(true);
    await updateGameSave({ meritPoints: save.meritPoints + 20 });
    setDismissed(prev => new Set(prev).add(sub.id));
    setResult(`📉 已撤销 ${sub.name} 职务（KPI连续不达标）`);
    setActing(false);
    setTimeout(() => setResult(''), 3000);
  };

  // 述职报告：下达述职任务 / 批复审核
  const REFORM_OUTCOMES: Record<string, string> = {
    d1: '发改委已提交整改方案：加快重大项目审批，出台GDP增速专项支持政策',
    d2: '财政部整改落实：压减一般性支出5%，优化财政赤字管理机制',
    d3: '工信部整改措施：加大数字经济专项投入，引进重点企业落地',
    d4: '农业农村部整改方案：扩大高标准农田建设，加强粮食仓储保障',
    d5: '生态环境部整改：出台碳达峰专项行动方案，加强重点区域治理',
    d6: '教育部整改部署：增加义务教育专项投入，推进优质师资均衡配置',
    d7: '卫健委整改落实：扩大医保覆盖范围，完善基层医疗服务网络',
    d8: '公安部整改措施：开展专项打击行动，强化技防手段建设',
    d9: '广东省整改方案：出台产业转型升级专项政策，优化营商环境指标',
    d10: '浙江省整改部署：发布数字经济新三年行动方案，助推民营经济活力',
    d11: '江苏省整改措施：加快制造业智能化改造，提升高技术产业比重',
    d12: '山东省整改落实：设立新旧动能转换专项基金，聚焦六大传统产业',
  };

  const handleDebriefAction = async (task: DebriefTask, action: 'issue' | 'pass' | 'fail') => {
    if (debriefActing) return;
    setDebriefActing(task.id);
    const score = Math.floor(Math.random() * 40) + 55; // 55-95分
    if (action === 'issue') {
      setDebriefTasks(prev => prev.map(t => t.id === task.id ? { ...t, status: 'submitted', score } : t));
      setResult(`📋 已向${task.unit}下达述职任务`);
    } else if (action === 'pass') {
      setDebriefTasks(prev => prev.map(t => t.id === task.id ? { ...t, status: 'passed' } : t));
      await updateGameSave({ meritPoints: save.meritPoints + 15 });
      setResult(`✅ ${task.unit}述职报告审核通过，政绩+15`);
    } else {
      // 约谈整改：记录整改结果，标记为整改中，给予追踪政绩奖励
      const outcome = REFORM_OUTCOMES[task.id] ?? `${task.unit}已接受约谈，承诺45天内提交整改落实方案`;
      setDebriefTasks(prev => prev.map(t => t.id === task.id ? { ...t, status: 'failed' } : t));
      setReformResults(prev => ({ ...prev, [task.id]: outcome }));
      await updateGameSave({ meritPoints: save.meritPoints + 8 });
      setResult(`⚠️ ${task.unit}约谈整改已发出，整改追踪+8政绩`);
    }
    setDebriefActing(null);
    setTimeout(() => setResult(''), 3500);
  };

  const handleDebriefReset = () => {
    setDebriefTasks(DEBRIEF_UNITS.map(t => ({ ...t, status: 'pending' as const })));
    setResult('🔄 新一轮述职周期已开启');
    setTimeout(() => setResult(''), 2500);
  };

  // 特批晋升/调任
  const handleSpecialApprove = async (post: SpecialPost) => {
    if (acting || approvedPosts.has(post.id)) return;
    if ((save?.meritPoints ?? 0) < post.cost) {
      setResult(`⚠️ 政绩不足，需要 ${post.cost} 政绩`);
      setTimeout(() => setResult(''), 2500);
      return;
    }
    setActing(true);
    await updateGameSave({
      meritPoints: (save?.meritPoints ?? 0) - post.cost + post.meritReward,
    });
    setApprovedPosts(prev => new Set(prev).add(post.id));
    setResult(`✅ 已${post.type === '晋升' ? '特批晋升' : '调任'}${post.title} · 政绩${post.cost > post.meritReward ? '-' : '+'}${Math.abs(post.cost - post.meritReward)}`);
    setActing(false);
    setTimeout(() => setResult(''), 3000);
  };

  // 专线电话传达任务
  const handleHotlineSend = async () => {
    if (!hotlineTarget || !hotlineTask || acting) return;
    const key = `${hotlineTarget.id}_${hotlineTask.id}`;
    if (hotlineSent.has(key)) return;
    setActing(true);
    const patch: Record<string, unknown> = {
      meritPoints: (save?.meritPoints ?? 0) + hotlineTask.meritReward,
    };
    const cur = (save as unknown as Record<string, number>)[hotlineTask.effect] ?? 0;
    (patch as Record<string, number>)[hotlineTask.effect] = Math.min(100, cur + hotlineTask.delta);
    await updateGameSave(patch as Parameters<typeof updateGameSave>[0]);
    setHotlineSent(prev => new Set(prev).add(key));
    setResult(`☎️ 已向${hotlineTarget.title}${hotlineTarget.name}传达「${hotlineTask.label}」任务 · 政绩+${hotlineTask.meritReward}`);
    setHotlineTarget(null);
    setHotlineTask(null);
    setActing(false);
    setTimeout(() => setResult(''), 3000);
  };

  const rankedSubs = [...subs].sort((a, b) => calcKpiScore(b) - calcKpiScore(a));
  const currentYear = Math.floor(save.gameDays / 365);

  return (
    <View style={{ flex: 1, backgroundColor: '#F4F4F0' }}>
      <StatusBar style="light" backgroundColor="#3D0808" />

      {/* 顶栏 */}
      <View style={{ backgroundColor: '#3D0808', paddingTop: insets.top + 8, paddingBottom: 14, paddingHorizontal: 16, flexDirection: 'row', alignItems: 'center', gap: 12 }}>
        <Pressable onPress={() => router.replace('/(app)/home')}>
          <Text style={{ color: '#ffaaaa', fontSize: 22 }}>‹</Text>
        </Pressable>
        <View style={{ flex: 1 }}>
          <Text style={{ color: 'rgba(255,200,200,0.6)', fontSize: 9, letterSpacing: 3 }}>国政院 · 总理职权</Text>
          <Text style={{ color: '#fff', fontWeight: '700', fontSize: 17 }}>🏛️ 国政院院理办公室</Text>
          <Text style={{ color: 'rgba(255,200,200,0.7)', fontSize: 11, marginTop: 2 }}>{save.playerName} · 主持国政院全面工作</Text>
        </View>
      </View>

      {/* 资源栏 */}
      <View style={{ flexDirection: 'row', backgroundColor: '#5C0A0A', paddingVertical: 10, paddingHorizontal: 14, gap: 10 }}>
        <View style={{ flex: 1.5, alignItems: 'center' }}>
          <Text style={{ color: 'rgba(255,200,200,0.6)', fontSize: 9 }}>专项经费</Text>
          <Text style={{ color: '#FFD700', fontWeight: '700', fontSize: 13 }}>¥{formatFund(save.fundBalance)}</Text>
        </View>
        <View style={{ width: 1, backgroundColor: 'rgba(255,255,255,0.1)' }} />
        <View style={{ flex: 1, alignItems: 'center' }}>
          <Text style={{ color: 'rgba(255,200,200,0.6)', fontSize: 9 }}>政绩积累</Text>
          <Text style={{ color: '#fff', fontWeight: '700', fontSize: 13 }}>{save.meritPoints.toFixed(0)}</Text>
        </View>
        <View style={{ width: 1, backgroundColor: 'rgba(255,255,255,0.1)' }} />
        <View style={{ flex: 1, alignItems: 'center' }}>
          <Text style={{ color: 'rgba(255,200,200,0.6)', fontSize: 9 }}>任职年</Text>
          <Text style={{ color: '#fff', fontWeight: '700', fontSize: 13 }}>{save.tenureYears}年</Text>
        </View>
      </View>

      {/* 月度专项拨款提示条 */}
      {canCollectMonthly && (
        <Pressable
          onPress={() => void handleCollectMonthly()}
          style={{ backgroundColor: '#7B2800', paddingVertical: 8, paddingHorizontal: 14, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}
        >
          <View>
            <Text style={{ color: '#FFD700', fontSize: 10, fontWeight: '700' }}>💰 本月专项拨款可领取</Text>
            <Text style={{ color: 'rgba(255,200,150,0.8)', fontSize: 9, marginTop: 1 }}>
              全国GDP×1% = ¥{formatMoney(monthlyGdpBonus * 10_000)}（约{monthlyGdpBonus}亿）
            </Text>
          </View>
          <View style={{ backgroundColor: '#FFD700', paddingHorizontal: 10, paddingVertical: 4 }}>
            <Text style={{ color: '#5C0A0A', fontSize: 11, fontWeight: '700' }}>领取</Text>
          </View>
        </Pressable>
      )}

      {/* 分管说明 */}
      <View style={{ backgroundColor: '#fff', paddingHorizontal: 14, paddingVertical: 10, flexDirection: 'row', gap: 10, borderBottomWidth: 1, borderBottomColor: '#EEE' }}>
        {[
          { icon: '📈', label: '第一副院理', sub: '分管经济' },
          { icon: '🏥', label: '第二副院理', sub: '分管民生' },
          { icon: '🤝', label: '第三副院理', sub: '港澳台外交' },
        ].map(item => (
          <View key={item.label} style={{ flex: 1, alignItems: 'center', gap: 2 }}>
            <Text style={{ fontSize: 16 }}>{item.icon}</Text>
            <Text style={{ fontSize: 9, color: '#555', fontWeight: '700' }}>{item.label}</Text>
            <Text style={{ fontSize: 9, color: '#888' }}>{item.sub}</Text>
          </View>
        ))}
      </View>

      {/* 功能Tab */}
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ flexGrow: 0, backgroundColor: '#fff', borderBottomWidth: 1, borderBottomColor: '#E0E0E0' }} contentContainerStyle={{ paddingHorizontal: 8 }}>
        {AREA_TABS.map(t => (
          <Pressable
            key={t.id}
            onPress={() => setTab(t.id)}
            style={{ paddingHorizontal: 12, paddingVertical: 12, borderBottomWidth: 2, borderBottomColor: tab === t.id ? '#8B1A1A' : 'transparent' }}
          >
            <Text style={{ fontSize: 11, fontWeight: tab === t.id ? '700' : '400', color: tab === t.id ? '#8B1A1A' : '#888' }} numberOfLines={1}>{t.label}</Text>
          </Pressable>
        ))}
      </ScrollView>

      <ScrollView contentInsetAdjustmentBehavior="automatic">

        {/* 行动列表 */}
        {tab !== 'kpi' && (
          <View style={{ padding: 14, gap: 10 }}>
            {currentAreaActions.map(action => {
              const canAct = save.fundBalance >= action.cost;
              return (
                <View key={action.id} style={{ backgroundColor: '#fff', borderWidth: 1, borderColor: '#D0D0D0', overflow: 'hidden' }}>
                  <View style={{ padding: 13, gap: 5 }}>
                    <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                      <View style={{ flex: 1, flexDirection: 'row', gap: 8, alignItems: 'flex-start' }}>
                        <Text style={{ fontSize: 18 }}>{action.icon}</Text>
                        <View style={{ flex: 1 }}>
                          <Text style={{ fontSize: 13, fontWeight: '700', color: '#1D2D44' }}>{action.title}</Text>
                          <Text style={{ fontSize: 11, color: '#777', lineHeight: 16, marginTop: 2 }}>{action.desc}</Text>
                        </View>
                      </View>
                      <View style={{ backgroundColor: '#FFF5F5', paddingHorizontal: 6, paddingVertical: 2, marginLeft: 8 }}>
                        <Text style={{ fontSize: 9, color: '#8B1A1A', fontWeight: '600' }}>+{action.meritReward}政绩</Text>
                      </View>
                    </View>
                    <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginTop: 3 }}>
                      <View style={{ backgroundColor: '#FFF9E6', paddingHorizontal: 6, paddingVertical: 2 }}>
                        <Text style={{ fontSize: 9, color: '#7B5E2A' }}>费用 ¥{formatMoney(action.cost)}</Text>
                      </View>
                      {action.effects.map(e => (
                        <View key={e.key} style={{ backgroundColor: '#F0F4F8', paddingHorizontal: 6, paddingVertical: 2 }}>
                          <Text style={{ fontSize: 9, color: '#2B4B6F' }}>{EFFECT_LABELS[e.key] ?? e.key} +{e.delta}</Text>
                        </View>
                      ))}
                    </View>
                  </View>
                  <Pressable
                    onPress={() => handleAction(action)}
                    disabled={!canAct || acting}
                    style={{ backgroundColor: canAct ? '#3D0808' : '#ccc', paddingVertical: 11, alignItems: 'center' }}
                  >
                    <Text style={{ color: '#fff', fontWeight: '700', fontSize: 12 }}>
                      {acting ? '执行中…' : canAct ? `▶ 下达指示（¥${formatMoney(action.cost)}）` : '⚠️ 经费不足'}
                    </Text>
                  </Pressable>
                </View>
              );
            })}
          </View>
        )}

        {/* 述职报告部署 */}
        {tab === 'debrief' && (
          <View style={{ padding: 14, gap: 10 }}>
            {/* 统计局说明栏 */}
            <View style={{ backgroundColor: '#2B4B6F', padding: 14 }}>
              <Text style={{ color: 'rgba(180,210,255,0.7)', fontSize: 9, letterSpacing: 2 }}>国政院 · 述职报告管理</Text>
              <Text style={{ color: '#fff', fontWeight: '700', fontSize: 14, marginTop: 3 }}>📋 年度述职报告部署</Text>
              <Text style={{ color: 'rgba(180,210,255,0.85)', fontSize: 11, marginTop: 4, lineHeight: 16 }}>
                国家统计局根据各部委及省级KPI完成情况自动汇总。向各单位下达述职任务，审核报告并决定奖励或约谈。
              </Text>
            </View>

            {/* 统计摘要 */}
            <View style={{ flexDirection: 'row', gap: 8 }}>
              {[
                { label: '待下达', val: debriefTasks.filter(t => t.status === 'pending').length,    color: '#888' },
                { label: '已提交', val: debriefTasks.filter(t => t.status === 'submitted').length,  color: '#7B5E2A' },
                { label: '通过',   val: debriefTasks.filter(t => t.status === 'passed').length,     color: '#2a7a3b' },
                { label: '不达标', val: debriefTasks.filter(t => t.status === 'failed').length,     color: '#C82829' },
              ].map(s => (
                <View key={s.label} style={{ flex: 1, backgroundColor: '#fff', borderWidth: 1, borderColor: '#E0E0E0', padding: 10, alignItems: 'center' }}>
                  <Text style={{ fontSize: 18, fontWeight: '700', color: s.color }}>{s.val}</Text>
                  <Text style={{ fontSize: 9, color: '#888', marginTop: 2 }}>{s.label}</Text>
                </View>
              ))}
            </View>

            {/* 单位列表 */}
            {debriefTasks.map(task => {
              const statusConfig = {
                pending:   { label: '待下达', color: '#888',    bg: '#F5F5F5' },
                submitted: { label: '已提交', color: '#7B5E2A', bg: '#FFFBF0' },
                passed:    { label: '已通过', color: '#2a7a3b', bg: '#F0FAF0' },
                failed:    { label: '不达标', color: '#C82829', bg: '#FFF5F5' },
              }[task.status];

              return (
                <View key={task.id} style={{ backgroundColor: '#fff', borderWidth: 1, borderColor: '#DDD', overflow: 'hidden' }}>
                  <View style={{ padding: 12, gap: 5 }}>
                    <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                      <View style={{ flex: 1 }}>
                        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                          <View style={{ backgroundColor: task.type === '部委' ? '#2B4B6F' : '#2a7a3b', paddingHorizontal: 5, paddingVertical: 1 }}>
                            <Text style={{ fontSize: 8, color: '#fff', fontWeight: '700' }}>{task.type}</Text>
                          </View>
                          <Text style={{ fontSize: 13, fontWeight: '700', color: '#1D2D44' }}>{task.unit}</Text>
                        </View>
                        <Text style={{ fontSize: 11, color: '#555', marginTop: 4, lineHeight: 16 }}>{task.topic}</Text>
                        <View style={{ flexDirection: 'row', gap: 6, marginTop: 4 }}>
                          <View style={{ backgroundColor: '#F0F4F8', paddingHorizontal: 6, paddingVertical: 2 }}>
                            <Text style={{ fontSize: 9, color: '#2B4B6F' }}>目标：{task.kpiTarget}</Text>
                          </View>
                          <View style={{ backgroundColor: '#FFF9E6', paddingHorizontal: 6, paddingVertical: 2 }}>
                            <Text style={{ fontSize: 9, color: '#7B5E2A' }}>截止：{task.deadline}</Text>
                          </View>
                          {task.score !== undefined && (
                            <View style={{ backgroundColor: statusConfig.bg, paddingHorizontal: 6, paddingVertical: 2 }}>
                              <Text style={{ fontSize: 9, color: statusConfig.color, fontWeight: '700' }}>得分：{task.score}分</Text>
                            </View>
                          )}
                        </View>
                      </View>
                      <View style={{ backgroundColor: statusConfig.bg, borderWidth: 1, borderColor: statusConfig.color, paddingHorizontal: 6, paddingVertical: 2, marginLeft: 8 }}>
                        <Text style={{ fontSize: 9, color: statusConfig.color, fontWeight: '700' }}>{statusConfig.label}</Text>
                      </View>
                    </View>
                  </View>

                  {/* 操作按钮 */}
                  <View style={{ flexDirection: 'row', borderTopWidth: 1, borderTopColor: '#F0F0F0' }}>
                    {task.status === 'pending' && (
                      <Pressable
                        onPress={() => handleDebriefAction(task, 'issue')}
                        disabled={debriefActing === task.id}
                        style={{ flex: 1, paddingVertical: 9, alignItems: 'center', backgroundColor: '#2B4B6F' }}
                      >
                        <Text style={{ fontSize: 11, color: '#fff', fontWeight: '700' }}>📤 下达述职任务</Text>
                      </Pressable>
                    )}
                    {task.status === 'submitted' && (
                      <>
                        <Pressable
                          onPress={() => handleDebriefAction(task, 'pass')}
                          disabled={debriefActing === task.id}
                          style={{ flex: 1, paddingVertical: 9, alignItems: 'center', backgroundColor: '#2a7a3b' }}
                        >
                          <Text style={{ fontSize: 11, color: '#fff', fontWeight: '700' }}>✅ 批复通过</Text>
                        </Pressable>
                        <View style={{ width: 1, backgroundColor: '#F0F0F0' }} />
                        <Pressable
                          onPress={() => handleDebriefAction(task, 'fail')}
                          disabled={debriefActing === task.id}
                          style={{ flex: 1, paddingVertical: 9, alignItems: 'center', backgroundColor: '#8B0000' }}
                        >
                          <Text style={{ fontSize: 11, color: '#fff', fontWeight: '700' }}>⚠️ 约谈整改</Text>
                        </Pressable>
                      </>
                    )}
                    {(task.status === 'passed' || task.status === 'failed') && (
                      <View style={{ flex: 1 }}>
                        <View style={{ paddingVertical: 9, alignItems: 'center', backgroundColor: statusConfig.bg }}>
                          <Text style={{ fontSize: 10, color: statusConfig.color, fontWeight: '700' }}>
                            {task.status === 'passed' ? '✅ 审核完毕，已归档' : '⚠️ 整改通知已下发'}
                          </Text>
                        </View>
                        {/* 整改结果展示 */}
                        {task.status === 'failed' && reformResults[task.id] && (
                          <View style={{ backgroundColor: '#FFFBF0', borderTopWidth: 1, borderTopColor: '#F5DCB0', padding: 10 }}>
                            <Text style={{ fontSize: 9, color: '#7B5E2A', fontWeight: '700', marginBottom: 3 }}>📑 整改落实情况</Text>
                            <Text style={{ fontSize: 10, color: '#555', lineHeight: 15 }}>{reformResults[task.id]}</Text>
                          </View>
                        )}
                      </View>
                    )}
                  </View>
                </View>
              );
            })}

            {/* 开启新一轮 */}
            <Pressable
              onPress={handleDebriefReset}
              style={{ backgroundColor: '#2B4B6F', paddingVertical: 12, alignItems: 'center', marginTop: 4 }}
            >
              <Text style={{ color: '#fff', fontWeight: '700', fontSize: 13 }}>🔄 开启新一轮述职周期</Text>
            </Pressable>
          </View>
        )}

        {/* KPI 述职排名 */}
        {tab === 'kpi' && (
          <View style={{ padding: 14, gap: 12 }}>
            <View style={{ backgroundColor: '#3D0808', padding: 14 }}>
              <Text style={{ color: 'rgba(255,200,200,0.7)', fontSize: 9, letterSpacing: 2 }}>国家统计局 · KPI考评系统</Text>
              <Text style={{ color: '#fff', fontWeight: '700', fontSize: 14, marginTop: 3 }}>📊 年度述职排名与考评</Text>
              <Text style={{ color: 'rgba(255,200,200,0.8)', fontSize: 11, marginTop: 4, lineHeight: 16 }}>
                依据政绩积分（40%）+ 廉洁指数（30%）+ 忠诚（15%）+ 能力（15%）自动排名。三年连续末位可撤职。
              </Text>
            </View>

            {kpiLoading ? (
              <View style={{ alignItems: 'center', padding: 24 }}><ActivityIndicator color="#8B1A1A" /></View>
            ) : rankedSubs.length === 0 ? (
              <View style={{ alignItems: 'center', paddingVertical: 24 }}>
                <Text style={{ color: '#888', fontSize: 14 }}>暂无下属数据</Text>
              </View>
            ) : (
              rankedSubs.map((sub, idx) => {
                const score = calcKpiScore(sub);
                const isBottom = idx >= rankedSubs.length - Math.max(1, Math.floor(rankedSubs.length * 0.2));
                const isDismissed = dismissed.has(sub.id);
                const kpiGrade = score >= 70 ? '优秀' : score >= 50 ? '良好' : score >= 35 ? '合格' : '不合格';
                const gradeColor = score >= 70 ? '#2a7a3b' : score >= 50 ? '#7B5E2A' : score >= 35 ? '#C82829' : '#8B0000';

                return (
                  <View key={sub.id} style={{ backgroundColor: isDismissed ? '#F0F0F0' : '#fff', borderWidth: 1, borderColor: isBottom && !isDismissed ? '#C82829' : '#DDD', overflow: 'hidden', opacity: isDismissed ? 0.5 : 1 }}>
                    <View style={{ padding: 12, flexDirection: 'row', alignItems: 'center', gap: 10 }}>
                      {/* 排名 */}
                      <View style={{ width: 28, height: 28, backgroundColor: idx === 0 ? '#FFD700' : idx === 1 ? '#C0C0C0' : idx === 2 ? '#CD7F32' : '#F0F0F0', alignItems: 'center', justifyContent: 'center' }}>
                        <Text style={{ fontSize: 12, fontWeight: '700', color: idx < 3 ? '#fff' : '#888' }}>
                          {isDismissed ? '📤' : idx + 1}
                        </Text>
                      </View>
                      <View style={{ flex: 1 }}>
                        <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                          <Text style={{ fontSize: 13, fontWeight: '700', color: isDismissed ? '#aaa' : '#222' }}>{sub.name}</Text>
                          <View style={{ backgroundColor: gradeColor, paddingHorizontal: 6, paddingVertical: 2 }}>
                            <Text style={{ fontSize: 9, color: '#fff', fontWeight: '700' }}>{isDismissed ? '已撤职' : kpiGrade}</Text>
                          </View>
                        </View>
                        <Text style={{ fontSize: 10, color: '#888', marginTop: 1 }}>{sub.position} · KPI分：{score.toFixed(1)}</Text>
                        <View style={{ height: 4, backgroundColor: '#EEE', borderRadius: 2, marginTop: 5 }}>
                          <View style={{ width: `${Math.min(100, score)}%`, height: 4, backgroundColor: gradeColor, borderRadius: 2 }} />
                        </View>
                      </View>
                    </View>

                    {/* 奖励谈话 or 撤职按钮 */}
                    {!isDismissed && (
                      <View style={{ flexDirection: 'row', borderTopWidth: 1, borderTopColor: '#F0F0F0' }}>
                        {idx === 0 && (
                          <View style={{ flex: 1, paddingVertical: 9, alignItems: 'center', backgroundColor: '#F0FAF0' }}>
                            <Text style={{ fontSize: 11, color: '#2a7a3b', fontWeight: '600' }}>🏆 排名第一 · 已谈话嘉奖</Text>
                          </View>
                        )}
                        {isBottom && currentYear - (save.kpiRankingYear ?? 0) >= 3 && (
                          <Pressable
                            onPress={() => handleDismiss(sub)}
                            disabled={acting}
                            style={{ flex: 1, paddingVertical: 9, alignItems: 'center', backgroundColor: '#8B0000' }}
                          >
                            <Text style={{ fontSize: 11, color: '#fff', fontWeight: '700' }}>📉 KPI三年不达标 · 撤职</Text>
                          </Pressable>
                        )}
                        {!isBottom && idx !== 0 && (
                          <View style={{ flex: 1, paddingVertical: 9, alignItems: 'center' }}>
                            <Text style={{ fontSize: 10, color: '#888' }}>暂无处置</Text>
                          </View>
                        )}
                        {isBottom && currentYear - (save.kpiRankingYear ?? 0) < 3 && (
                          <View style={{ flex: 1, paddingVertical: 9, alignItems: 'center', backgroundColor: '#FFF5F5' }}>
                            <Text style={{ fontSize: 10, color: '#C82829' }}>末位警示（{3 - (currentYear - (save.kpiRankingYear ?? 0))}年后可撤职）</Text>
                          </View>
                        )}
                      </View>
                    )}
                  </View>
                );
              })
            )}

            {/* 当年KPI更新按钮 */}
            <Pressable
              onPress={async () => {
                await updateGameSave({ kpiRankingYear: currentYear, kpiRankingResult: `第${currentYear}年度考评完成` });
                setResult('📊 KPI年度考评已更新');
                setTimeout(() => setResult(''), 2500);
              }}
              style={{ backgroundColor: '#3D0808', paddingVertical: 12, alignItems: 'center' }}
            >
              <Text style={{ color: '#fff', fontWeight: '700', fontSize: 13 }}>🔄 刷新年度KPI排名</Text>
            </Pressable>
          </View>
        )}

        {/* ── 特批晋升/调任 ── */}
        {tab === 'promote' && (
          <View style={{ padding: 14, gap: 10 }}>
            <View style={{ backgroundColor: '#3D0808', padding: 14 }}>
              <Text style={{ color: 'rgba(255,200,200,0.7)', fontSize: 9, letterSpacing: 2 }}>国政院 · 特批人事权</Text>
              <Text style={{ color: '#fff', fontWeight: '700', fontSize: 14, marginTop: 3 }}>🚀 特批晋升 / 调任岗位</Text>
              <Text style={{ color: 'rgba(255,200,200,0.8)', fontSize: 11, marginTop: 4, lineHeight: 16 }}>
                总理可对总理以下任何岗位行使特批晋升或调任权。审批须消耗相应政绩，批准后自动生效并获得政绩奖励。
              </Text>
            </View>
            {/* 政绩余额 */}
            <View style={{ backgroundColor: '#fff', borderWidth: 1, borderColor: '#DDD', padding: 12, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
              <Text style={{ fontSize: 12, color: '#555' }}>当前政绩余额</Text>
              <Text style={{ fontSize: 16, fontWeight: '700', color: '#3D0808' }}>{save?.meritPoints.toFixed(0) ?? 0} 分</Text>
            </View>
            {/* 按职级分组展示岗位 */}
            {[13, 12, 11, 10].map(level => {
              const levelPosts = SPECIAL_POSTS.filter(p => p.level === level);
              if (levelPosts.length === 0) return null;
              const levelNames: Record<number, string> = { 13: '副国级（副院理）', 12: '正部级（部长/省长）', 11: '副部级（省委书记）', 10: '副部级' };
              return (
                <View key={level}>
                  <View style={{ backgroundColor: '#F5F4F1', paddingHorizontal: 10, paddingVertical: 6, marginBottom: 6, borderLeftWidth: 3, borderLeftColor: '#3D0808' }}>
                    <Text style={{ fontSize: 10, color: '#3D0808', fontWeight: '700', letterSpacing: 1 }}>{levelNames[level]}</Text>
                  </View>
                  {levelPosts.map(post => {
                    const approved = approvedPosts.has(post.id);
                    const canApprove = (save?.meritPoints ?? 0) >= post.cost && !approved;
                    return (
                      <View key={post.id} style={{ backgroundColor: approved ? '#F0FAF0' : '#fff', borderWidth: 1, borderColor: approved ? '#2a7a3b' : '#DDD', marginBottom: 8, overflow: 'hidden' }}>
                        <View style={{ padding: 12, gap: 5 }}>
                          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                            <View style={{ flex: 1 }}>
                              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                                <View style={{ backgroundColor: post.type === '晋升' ? '#C82829' : '#2B4B6F', paddingHorizontal: 5, paddingVertical: 1 }}>
                                  <Text style={{ fontSize: 8, color: '#fff', fontWeight: '700' }}>{post.type}</Text>
                                </View>
                                <Text style={{ fontSize: 13, fontWeight: '700', color: '#111' }}>{post.title}</Text>
                              </View>
                              <Text style={{ fontSize: 10, color: '#666', marginTop: 3 }}>{post.org} · {post.levelName}</Text>
                              <Text style={{ fontSize: 11, color: '#888', marginTop: 3, lineHeight: 15 }}>{post.desc}</Text>
                            </View>
                            {approved && (
                              <View style={{ backgroundColor: '#2a7a3b', paddingHorizontal: 6, paddingVertical: 2 }}>
                                <Text style={{ fontSize: 9, color: '#fff', fontWeight: '700' }}>已批准</Text>
                              </View>
                            )}
                          </View>
                          <View style={{ flexDirection: 'row', gap: 6, marginTop: 2 }}>
                            <View style={{ backgroundColor: '#FFF9E6', paddingHorizontal: 6, paddingVertical: 2 }}>
                              <Text style={{ fontSize: 9, color: '#7B5E2A' }}>消耗 {post.cost} 政绩</Text>
                            </View>
                            <View style={{ backgroundColor: '#F0F8F0', paddingHorizontal: 6, paddingVertical: 2 }}>
                              <Text style={{ fontSize: 9, color: '#2a7a3b' }}>奖励 +{post.meritReward} 政绩</Text>
                            </View>
                          </View>
                        </View>
                        {!approved && (
                          <Pressable
                            onPress={() => void handleSpecialApprove(post)}
                            disabled={!canApprove || acting}
                            style={{ paddingVertical: 10, alignItems: 'center', backgroundColor: canApprove ? '#3D0808' : '#CCC' }}
                          >
                            <Text style={{ color: '#fff', fontWeight: '700', fontSize: 12 }}>
                              {acting ? '审批中…' : canApprove ? `▶ 批准${post.type}（消耗${post.cost}政绩）` : '政绩不足'}
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
        )}

        {/* ── 专线电话 ── */}
        {tab === 'hotline' && (
          <View style={{ padding: 14, gap: 10 }}>
            <View style={{ backgroundColor: '#1D3B5E', padding: 14 }}>
              <Text style={{ color: 'rgba(160,200,255,0.7)', fontSize: 9, letterSpacing: 2 }}>国政院 · 专线通讯</Text>
              <Text style={{ color: '#fff', fontWeight: '700', fontSize: 14, marginTop: 3 }}>☎️ 专线电话传达任务</Text>
              <Text style={{ color: 'rgba(160,200,255,0.8)', fontSize: 11, marginTop: 4, lineHeight: 16 }}>
                通过专线向副院理、国政院部长及省委书记传达工作任务，强化执行力，快速推动政策落地。
              </Text>
            </View>

            {/* 联系人筛选 */}
            <ScrollView horizontal showsHorizontalScrollIndicator={false}>
              <View style={{ flexDirection: 'row', gap: 6 }}>
                {(['全部', '副院理', '部长', '省委书记'] as const).map(f => (
                  <Pressable
                    key={f}
                    onPress={() => setHotlineFilter(f)}
                    style={{ paddingHorizontal: 12, paddingVertical: 6, backgroundColor: hotlineFilter === f ? '#1D3B5E' : '#E8EEF5' }}
                  >
                    <Text style={{ fontSize: 11, color: hotlineFilter === f ? '#fff' : '#555', fontWeight: hotlineFilter === f ? '700' : '400' }}>{f}</Text>
                  </Pressable>
                ))}
              </View>
            </ScrollView>

            {/* 联系人选择 */}
            <Text style={{ fontSize: 10, color: '#888', letterSpacing: 1 }}>① 选择联系人</Text>
            {hotlineTargets
              .filter(t => {
                if (hotlineFilter === '副院理') return t.level === 13;
                if (hotlineFilter === '部长') return t.level === 12;
                if (hotlineFilter === '省委书记') return t.level === 11;
                return true;
              })
              .map(target => {
                const isSelected = hotlineTarget?.id === target.id;
                return (
                  <Pressable
                    key={target.id}
                    onPress={() => setHotlineTarget(isSelected ? null : target)}
                    style={{ backgroundColor: isSelected ? '#1D3B5E' : '#fff', borderWidth: 1, borderColor: isSelected ? '#1D3B5E' : '#DDD', padding: 10, flexDirection: 'row', alignItems: 'center', gap: 10 }}
                  >
                    <Text style={{ fontSize: 18 }}>{target.icon}</Text>
                    <View style={{ flex: 1 }}>
                      <Text style={{ fontSize: 12, fontWeight: '700', color: isSelected ? '#fff' : '#111' }}>{target.name}</Text>
                      <Text style={{ fontSize: 10, color: isSelected ? 'rgba(200,220,255,0.8)' : '#888' }}>{target.title} · {target.org}</Text>
                    </View>
                    {isSelected && (
                      <View style={{ backgroundColor: 'rgba(255,255,255,0.2)', paddingHorizontal: 8, paddingVertical: 3 }}>
                        <Text style={{ color: '#fff', fontSize: 10, fontWeight: '700' }}>✓ 已选</Text>
                      </View>
                    )}
                  </Pressable>
                );
              })
            }

            {/* 任务选择 */}
            <Text style={{ fontSize: 10, color: '#888', letterSpacing: 1, marginTop: 4 }}>② 选择传达任务</Text>
            {HOTLINE_TASKS.map(task => {
              const isSelected = hotlineTask?.id === task.id;
              return (
                <Pressable
                  key={task.id}
                  onPress={() => setHotlineTask(isSelected ? null : task)}
                  style={{ backgroundColor: isSelected ? '#C82829' : '#fff', borderWidth: 1, borderColor: isSelected ? '#C82829' : '#DDD', padding: 10, gap: 3 }}
                >
                  <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                    <Text style={{ fontSize: 12, fontWeight: '700', color: isSelected ? '#fff' : '#111' }}>{task.label}</Text>
                    <Text style={{ fontSize: 10, color: isSelected ? 'rgba(255,200,200,0.9)' : '#2a7a3b', fontWeight: '700' }}>+{task.meritReward}政绩</Text>
                  </View>
                  <Text style={{ fontSize: 10, color: isSelected ? 'rgba(255,220,220,0.9)' : '#888' }}>{task.desc}</Text>
                </Pressable>
              );
            })}

            {/* 发起专线 */}
            <Pressable
              onPress={() => void handleHotlineSend()}
              disabled={!hotlineTarget || !hotlineTask || acting}
              style={{ backgroundColor: hotlineTarget && hotlineTask ? '#1D3B5E' : '#CCC', paddingVertical: 14, alignItems: 'center', marginTop: 4 }}
            >
              <Text style={{ color: '#fff', fontWeight: '700', fontSize: 13 }}>
                {acting ? '传达中…' : hotlineTarget && hotlineTask ? `☎️ 向${hotlineTarget.name}传达「${hotlineTask.label}」` : '请选择联系人和任务'}
              </Text>
            </Pressable>

            {/* 已传达记录 */}
            {hotlineSent.size > 0 && (
              <View style={{ backgroundColor: '#F0F4F8', padding: 10, gap: 4 }}>
                <Text style={{ fontSize: 10, color: '#2B4B6F', fontWeight: '700', marginBottom: 4 }}>✅ 本轮已传达记录（{hotlineSent.size}条）</Text>
                {Array.from(hotlineSent).map(k => {
                  const [tid, taskId] = k.split('_');
                  const t = hotlineTargets.find(x => x.id === tid);
                  const tk = HOTLINE_TASKS.find(x => x.id === taskId);
                  if (!t || !tk) return null;
                  return (
                    <Text key={k} style={{ fontSize: 10, color: '#555' }}>• {t.title}{t.name} ← {tk.label}</Text>
                  );
                })}
              </View>
            )}
          </View>
        )}

        <View style={{ height: 30 }} />
      </ScrollView>

      {!!result && (
        <View style={{ position: 'absolute', bottom: 24, left: 16, right: 16, backgroundColor: '#3D0808', padding: 12, alignItems: 'center' }}>
          <Text style={{ color: '#fff', fontWeight: '700', fontSize: 13 }}>{result}</Text>
        </View>
      )}
    </View>
  );
}
