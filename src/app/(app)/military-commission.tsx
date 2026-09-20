// 军委职权页 — rank14 国政院院理/军委副主席专属
// 功能：参考现实中枢军委职权 - 任命/预算/演习/装备研发
import { useState } from 'react';
import { Pressable, ScrollView, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { useRouter } from 'expo-router';
import { useGame } from '@/ctx/GameContext';
import { formatMoney } from '@/types/game';

// ── 军委委员数据（参考现实中枢军委组成） ────────────────────────────
interface CmcMember {
  id: string;
  name: string;
  title: string;
  rank: string;
  service: '解放军' | '海军' | '空军' | '火箭军' | '战略支援' | '联勤保障' | '陆军';
  ability: number;
  loyalty: number;
  appointed: boolean;
}

const CMC_MEMBERS: CmcMember[] = [
  { id: 'cmc1', name: '张卫国', title: '联合参谋部参谋长',  rank: '上将', service: '解放军', ability: 88, loyalty: 92, appointed: false },
  { id: 'cmc2', name: '李建华', title: '中枢军委委员',     rank: '上将', service: '陆军',   ability: 85, loyalty: 89, appointed: false },
  { id: 'cmc3', name: '刘志远', title: '海军司令员',       rank: '上将', service: '海军',   ability: 84, loyalty: 88, appointed: false },
  { id: 'cmc4', name: '王天宇', title: '空军司令员',       rank: '上将', service: '空军',   ability: 87, loyalty: 91, appointed: false },
  { id: 'cmc5', name: '陈国兴', title: '火箭军司令员',     rank: '上将', service: '火箭军', ability: 90, loyalty: 85, appointed: false },
  { id: 'cmc6', name: '赵明华', title: '战略支援部队司令', rank: '上将', service: '战略支援', ability: 83, loyalty: 87, appointed: false },
  { id: 'cmc7', name: '周建军', title: '联勤保障部队司令', rank: '上将', service: '联勤保障', ability: 81, loyalty: 90, appointed: false },
  { id: 'cmc8', name: '孙志强', title: '国防部长',         rank: '上将', service: '解放军', ability: 86, loyalty: 93, appointed: false },
];

const SERVICE_COLORS: Record<string, string> = {
  '解放军': '#C82829', '海军': '#1D3B5E', '空军': '#2B4B6F',
  '火箭军': '#7B0026', '战略支援': '#2a7a3b', '联勤保障': '#7B5E2A', '陆军': '#4a5a2a',
};

// ── 军事预算项目 ─────────────────────────────────────────────────────
interface BudgetItem {
  id: string;
  icon: string;
  name: string;
  category: '战略威慑' | '常规力量' | '信息作战' | '后勤保障';
  amount: number;   // 万元
  securityBonus: number;
  desc: string;
}

const BUDGET_ITEMS: BudgetItem[] = [
  { id: 'b1', icon: '🚀', name: '核威慑力量维护升级', category: '战略威慑', amount: 5000000, securityBonus: 20, desc: '核弹头维护、战略导弹更新与核指挥系统升级' },
  { id: 'b2', icon: '🛸', name: '第五代战机研发',     category: '常规力量', amount: 3000000, securityBonus: 12, desc: '推进歼-35系列战机研制并列装空海军部队' },
  { id: 'b3', icon: '🛳️', name: '大型航母战斗群',     category: '常规力量', amount: 4000000, securityBonus: 15, desc: '第四艘航母建造及配套舰载机部队组建' },
  { id: 'b4', icon: '🔮', name: '电子作战能力建设',   category: '信息作战', amount: 1500000, securityBonus: 8,  desc: '强化电子干扰、网络攻防和信息侦察能力' },
  { id: 'b5', icon: '🤖', name: '智能无人作战系统',   category: '信息作战', amount: 2000000, securityBonus: 10, desc: '无人机蜂群、水下无人潜艇等智能武器研发' },
  { id: 'b6', icon: '🏥', name: '战备医疗保障体系',   category: '后勤保障', amount: 500000,  securityBonus: 4,  desc: '战时医疗救援体系建设，提升战场救治能力' },
  { id: 'b7', icon: '⛽', name: '战略能源储备',       category: '后勤保障', amount: 800000,  securityBonus: 5,  desc: '扩大石油、核燃料等战略物资储备规模' },
];

// ── 联合演习计划 ─────────────────────────────────────────────────────
interface Exercise {
  id: string;
  icon: string;
  name: string;
  type: '陆战' | '海战' | '空战' | '联合' | '信息战';
  scale: '战区级' | '战略级' | '全军级';
  cost: number;
  securityBonus: number;
  meritReward: number;
  desc: string;
  duration: string;
}

const EXERCISES: Exercise[] = [
  { id: 'e1', icon: '⚔️', name: '东部战区联合作战演习',  type: '联合', scale: '战区级', cost: 500000,   securityBonus: 6,  meritReward: 20, desc: '模拟岛链外围联合作战，检验三军协同能力', duration: '7天' },
  { id: 'e2', icon: '🌊', name: '南海舰队远洋实兵演练',  type: '海战', scale: '战区级', cost: 800000,   securityBonus: 8,  meritReward: 25, desc: '舰载机跨海域协同演习，提升远洋投送能力', duration: '14天' },
  { id: 'e3', icon: '🛸', name: '空军战略轰炸机远程巡航', type: '空战', scale: '战略级', cost: 600000,   securityBonus: 7,  meritReward: 22, desc: '战略轰炸机绕岛巡逻，彰显战略威慑意志',   duration: '3天' },
  { id: 'e4', icon: '💻', name: '全军网络空间对抗演习',   type: '信息战', scale: '全军级', cost: 400000, securityBonus: 5,  meritReward: 18, desc: '检验网络攻防、电磁对抗和指挥控制能力',  duration: '5天' },
  { id: 'e5', icon: '🏔️', name: '高原山地联合立体作战',  type: '陆战', scale: '战区级', cost: 700000,   securityBonus: 7,  meritReward: 23, desc: '检验高原高寒地区联合作战保障能力',       duration: '10天' },
  { id: 'e6', icon: '🚀', name: '东风系列导弹综合演训',   type: '联合', scale: '全军级', cost: 1200000,  securityBonus: 12, meritReward: 40, desc: '常规弹道导弹精确打击与核力量综合演训',  duration: '5天' },
];

// ── 装备研发项目 ─────────────────────────────────────────────────────
interface EquipProject {
  id: string;
  icon: string;
  name: string;
  type: '陆装' | '海装' | '空装' | '信息装备' | '战略装备';
  cost: number;
  securityBonus: number;
  period: string;
  desc: string;
  status: 'planning' | 'developing' | 'completed';
}

const EQUIP_PROJECTS: EquipProject[] = [
  { id: 'eq1', icon: '🛡️', name: '新型主战坦克（三代+）', type: '陆装',   cost: 1500000, securityBonus: 8,  period: '3年', desc: '研制装备新一代主战坦克，提升陆战突击能力', status: 'planning' },
  { id: 'eq2', icon: '🚢', name: '核动力航母',            type: '海装',   cost: 8000000, securityBonus: 25, period: '8年', desc: '首艘核动力航空母舰立项研制，实现跨代跃升', status: 'planning' },
  { id: 'eq3', icon: '✈️', name: '隐身无人战略侦察机',   type: '空装',   cost: 2000000, securityBonus: 10, period: '4年', desc: '高空长航时隐身战略侦察机研发部署',         status: 'planning' },
  { id: 'eq4', icon: '🔬', name: '量子通信军事网络',      type: '信息装备', cost: 1200000, securityBonus: 12, period: '5年', desc: '构建抗干扰量子加密军事通信指挥体系',      status: 'planning' },
  { id: 'eq5', icon: '🚀', name: '高超音速导弹扩充',      type: '战略装备', cost: 3000000, securityBonus: 18, period: '3年', desc: '东风-17/21改进型批量生产，扩充核常兼备打击力量', status: 'planning' },
  { id: 'eq6', icon: '🤖', name: '无人机集群作战系统',    type: '空装',   cost: 900000,  securityBonus: 7,  period: '2年', desc: '自主协同无人机蜂群作战系统研发与列装',     status: 'planning' },
];

const CMC_TABS = [
  { id: 'appoint',  label: '🎖️ 人事任免' },
  { id: 'budget',   label: '💰 国防预算' },
  { id: 'exercise', label: '⚔️ 军事演习' },
  { id: 'equip',    label: '🔬 装备研发' },
  { id: 'theater',  label: '🗺️ 战区管理' },
];

// ── 五大战区数据 ────────────────────────────────────────────────────
interface TheaterCommand {
  id: string;
  name: string;
  icon: string;
  color: string;
  hq: string;
  jurisdiction: string[];
  commander: string;
  commissar: string;
  rank: string;
  troops: number;   // 万人
  readiness: number; // 战备率%
  missions: string[];
}

const THEATER_COMMANDS: TheaterCommand[] = [
  {
    id: 'east', name: '东部战区', icon: '🌊', color: '#1565C0', hq: '南京',
    jurisdiction: ['江苏', '浙江', '福建', '安徽', '江西', '上海'],
    commander: '张振海', commissar: '刘建国', rank: '上将',
    troops: 35, readiness: 92,
    missions: ['台海方向主战', '东海防空识别区维权', '联合岛链封控演练', '近海防御纵深打击'],
  },
  {
    id: 'south', name: '南部战区', icon: '🏝️', color: '#1B5E20', hq: '广州',
    jurisdiction: ['广东', '广西', '云南', '贵州', '海南', '香港', '澳门'],
    commander: '陈锐之', commissar: '王宏伟', rank: '上将',
    troops: 30, readiness: 88,
    missions: ['南海岛礁维权', '马六甲通道保障', '东南亚方向战略威慑', '反恐维稳协同'],
  },
  {
    id: 'west', name: '西部战区', icon: '🏔️', color: '#4A148C', hq: '成都',
    jurisdiction: ['四川', '重庆', '云南', '西藏', '新疆', '青海', '甘肃', '宁夏'],
    commander: '孙志强', commissar: '赵国梁', rank: '上将',
    troops: 32, readiness: 85,
    missions: ['中印边境防御', '反分裂处置', '高原高寒作战能力建设', '反恐维稳保障'],
  },
  {
    id: 'north', name: '北部战区', icon: '❄️', color: '#37474F', hq: '沈阳',
    jurisdiction: ['辽宁', '吉林', '黑龙江', '内蒙古', '山东', '北京', '天津'],
    commander: '李天宇', commissar: '周建华', rank: '上将',
    troops: 28, readiness: 87,
    missions: ['朝鲜半岛应急预案', '海上通道防控', '战略纵深防御', '联合防空体系建设'],
  },
  {
    id: 'central', name: '中部战区', icon: '🛡️', color: '#B71C1C', hq: '北京',
    jurisdiction: ['河北', '河南', '湖北', '湖南', '山西', '陕西'],
    commander: '吴向阳', commissar: '徐志明', rank: '上将',
    troops: 25, readiness: 95,
    missions: ['首都圈战略防卫', '核指挥保障', '战略预备队协调', '全国战略机动指挥'],
  },
];

// 战区指挥官调整操作
interface TheaterAction {
  id: string;
  label: string;
  icon: string;
  desc: string;
  cost: number;
  meritReward: number;
  securityBonus: number;
}

const THEATER_ACTIONS: TheaterAction[] = [
  { id: 'ta1', label: '下达战备提升令', icon: '📡', desc: '向指定战区下达战备提升指令，提高部队应急响应能力', cost: 200000, meritReward: 15, securityBonus: 5 },
  { id: 'ta2', label: '组织战区联合演习', icon: '⚔️', desc: '以军委名义组织跨战区联合演习，检验多战区协同作战能力', cost: 800000, meritReward: 30, securityBonus: 10 },
  { id: 'ta3', label: '调整战区司令员', icon: '🎖️', desc: '对战区司令员实施人事调整，优化战区领导班子建设', cost: 0, meritReward: 20, securityBonus: 3 },
  { id: 'ta4', label: '视察战区部队', icon: '🚁', desc: '亲赴战区视察部队，提振官兵士气，了解实际战备情况', cost: 50000, meritReward: 12, securityBonus: 4 },
];

export default function MilitaryCommissionScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { save, updateGameSave } = useGame();
  const [tab, setTab] = useState('appoint');
  const [acting, setActing] = useState(false);
  const [result, setResult] = useState('');
  const [appointedIds, setAppointedIds] = useState<Set<string>>(new Set());
  const [approvedBudgets, setApprovedBudgets] = useState<Set<string>>(new Set());
  const [conductedExercises, setConductedExercises] = useState<Set<string>>(new Set());
  const [launchedProjects, setLaunchedProjects] = useState<Set<string>>(new Set());
  // 战区管理
  const [selectedTheater, setSelectedTheater] = useState<string | null>(null);
  const [theaterActionDone, setTheaterActionDone] = useState<Set<string>>(new Set());

  if (!save || save.rankLevel < 14) {
    return (
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: '#F5F4F1', padding: 24 }}>
        <Text style={{ fontSize: 32, marginBottom: 12 }}>🎖️</Text>
        <Text style={{ fontSize: 14, color: '#888', textAlign: 'center' }}>晋升至国政院院理（级别14）后解锁军委职权</Text>
      </View>
    );
  }

  const showResult = (msg: string) => {
    setResult(msg);
    setTimeout(() => setResult(''), 3500);
  };

  const handleAppoint = async (member: CmcMember) => {
    if (acting || appointedIds.has(member.id)) return;
    setActing(true);
    await updateGameSave({ meritPoints: (save.meritPoints ?? 0) + 30 });
    setAppointedIds(prev => new Set(prev).add(member.id));
    showResult(`🎖️ 已任命 ${member.rank}${member.name} 为${member.title} · 政绩+30`);
    setActing(false);
  };

  const handleBudget = async (item: BudgetItem) => {
    if (acting || approvedBudgets.has(item.id)) return;
    if ((save.fundBalance ?? 0) < item.amount) {
      showResult(`⚠️ 经费不足，需要 ¥${formatMoney(item.amount)}`);
      return;
    }
    setActing(true);
    const cur = save.securityIndex ?? 50;
    await updateGameSave({
      fundBalance: (save.fundBalance ?? 0) - item.amount,
      securityIndex: Math.min(100, cur + item.securityBonus),
      meritPoints: (save.meritPoints ?? 0) + 20,
    });
    setApprovedBudgets(prev => new Set(prev).add(item.id));
    showResult(`💰 ${item.name}预算批准 · 安全指数+${item.securityBonus} · 政绩+20`);
    setActing(false);
  };

  const handleExercise = async (ex: Exercise) => {
    if (acting || conductedExercises.has(ex.id)) return;
    if ((save.fundBalance ?? 0) < ex.cost) {
      showResult(`⚠️ 经费不足，需要 ¥${formatMoney(ex.cost)}`);
      return;
    }
    setActing(true);
    const cur = save.securityIndex ?? 50;
    await updateGameSave({
      fundBalance: (save.fundBalance ?? 0) - ex.cost,
      securityIndex: Math.min(100, cur + ex.securityBonus),
      meritPoints: (save.meritPoints ?? 0) + ex.meritReward,
    });
    setConductedExercises(prev => new Set(prev).add(ex.id));
    showResult(`⚔️ 「${ex.name}」演习完成 · 安全+${ex.securityBonus} · 政绩+${ex.meritReward}`);
    setActing(false);
  };

  const handleEquip = async (eq: EquipProject) => {
    if (acting || launchedProjects.has(eq.id)) return;
    if ((save.fundBalance ?? 0) < eq.cost) {
      showResult(`⚠️ 经费不足，需要 ¥${formatMoney(eq.cost)}`);
      return;
    }
    setActing(true);
    const cur = save.securityIndex ?? 50;
    await updateGameSave({
      fundBalance: (save.fundBalance ?? 0) - eq.cost,
      securityIndex: Math.min(100, cur + eq.securityBonus),
      meritPoints: (save.meritPoints ?? 0) + 35,
    });
    setLaunchedProjects(prev => new Set(prev).add(eq.id));
    showResult(`🔬 「${eq.name}」立项批准 · 预计${eq.period}完成 · 安全+${eq.securityBonus}`);
    setActing(false);
  };

  const CATEGORY_COLORS: Record<string, string> = {
    '战略威慑': '#7B0026', '常规力量': '#1D3B5E', '信息作战': '#2B4B6F', '后勤保障': '#2a7a3b',
  };
  const TYPE_COLORS: Record<string, string> = {
    '陆战': '#4a5a2a', '海战': '#1D3B5E', '空战': '#2B4B6F', '联合': '#C82829', '信息战': '#4a4a8a',
  };
  const EQUIP_COLORS: Record<string, string> = {
    '陆装': '#4a5a2a', '海装': '#1D3B5E', '空装': '#2B4B6F', '信息装备': '#4a4a8a', '战略装备': '#7B0026',
  };

  return (
    <View style={{ flex: 1, backgroundColor: '#0D0D14' }}>
      <StatusBar style="light" backgroundColor="#0D0D14" />

      {/* 顶栏 */}
      <View style={{ backgroundColor: '#0D0D14', paddingTop: insets.top + 8, paddingBottom: 14, paddingHorizontal: 16, borderBottomWidth: 1, borderBottomColor: '#1E1E30' }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
          <Pressable onPress={() => router.back()}>
            <Text style={{ color: '#a0b0cc', fontSize: 22 }}>‹</Text>
          </Pressable>
          <View style={{ flex: 1 }}>
            <Text style={{ color: 'rgba(160,180,220,0.5)', fontSize: 9, letterSpacing: 3 }}>中枢军事委员会 · 机密</Text>
            <Text style={{ color: '#E8D0A0', fontWeight: '700', fontSize: 17 }}>🎖️ 军委职权</Text>
            <Text style={{ color: 'rgba(200,180,140,0.7)', fontSize: 11, marginTop: 2 }}>
              {save.playerName} · 中枢军委副主席职权
            </Text>
          </View>
        </View>

        {/* 军力数据 */}
        <View style={{ flexDirection: 'row', gap: 8, marginTop: 12 }}>
          {[
            { label: '国防安全', value: `${save.securityIndex ?? 50}`, unit: '分',  color: '#E8D0A0' },
            { label: '政绩积累', value: `${save.meritPoints.toFixed(0)}`, unit: '分', color: '#7EC8E3' },
            { label: '专项经费', value: formatMoney(save.fundBalance), unit: '万', color: '#90EE90' },
            { label: '任期',     value: `${save.tenureYears}`, unit: '年',        color: '#FFB6C1' },
          ].map(s => (
            <View key={s.label} style={{ flex: 1, backgroundColor: 'rgba(255,255,255,0.05)', padding: 8, alignItems: 'center', borderWidth: 1, borderColor: 'rgba(255,255,255,0.08)' }}>
              <Text style={{ color: s.color, fontWeight: '700', fontSize: 13 }}>{s.value}<Text style={{ fontSize: 9 }}>{s.unit}</Text></Text>
              <Text style={{ color: 'rgba(200,200,200,0.5)', fontSize: 9, marginTop: 1 }}>{s.label}</Text>
            </View>
          ))}
        </View>
      </View>

      {/* Tab */}
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ flexGrow: 0, backgroundColor: '#12121E', borderBottomWidth: 1, borderBottomColor: '#1E1E30' }} contentContainerStyle={{ paddingHorizontal: 8 }}>
        {CMC_TABS.map(t => (
          <Pressable
            key={t.id}
            onPress={() => setTab(t.id)}
            style={{ paddingHorizontal: 14, paddingVertical: 12, borderBottomWidth: 2, borderBottomColor: tab === t.id ? '#E8D0A0' : 'transparent' }}
          >
            <Text style={{ fontSize: 11, fontWeight: tab === t.id ? '700' : '400', color: tab === t.id ? '#E8D0A0' : '#666' }}>{t.label}</Text>
          </Pressable>
        ))}
      </ScrollView>

      <ScrollView style={{ backgroundColor: '#0D0D14' }} contentInsetAdjustmentBehavior="automatic">
        <View style={{ padding: 12, gap: 10 }}>

          {/* 人事任免 */}
          {tab === 'appoint' && (
            <>
              <View style={{ backgroundColor: '#1A1A2E', padding: 12, borderWidth: 1, borderColor: '#2a2a4a' }}>
                <Text style={{ color: '#E8D0A0', fontWeight: '700', fontSize: 12 }}>🎖️ 中枢军委委员人事任免</Text>
                <Text style={{ color: 'rgba(200,200,200,0.6)', fontSize: 10, marginTop: 4, lineHeight: 15 }}>
                  参照《宪法》和《国防法》，总理协助中枢军委主席行使军委委员任命权。已任命 {appointedIds.size}/{CMC_MEMBERS.length} 名。
                </Text>
              </View>
              {CMC_MEMBERS.map(m => {
                const done = appointedIds.has(m.id);
                const svcColor = SERVICE_COLORS[m.service] ?? '#888';
                return (
                  <View key={m.id} style={{ backgroundColor: '#12121E', borderWidth: 1, borderColor: done ? '#E8D0A0' : '#1E1E30' }}>
                    <View style={{ padding: 12, flexDirection: 'row', alignItems: 'center', gap: 10 }}>
                      <View style={{ width: 44, height: 44, backgroundColor: svcColor + '30', alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: svcColor }}>
                        <Text style={{ fontSize: 20 }}>🎖️</Text>
                      </View>
                      <View style={{ flex: 1 }}>
                        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                          <Text style={{ fontSize: 13, fontWeight: '700', color: done ? '#E8D0A0' : '#ddd' }}>{m.name}</Text>
                          <View style={{ backgroundColor: svcColor, paddingHorizontal: 4, paddingVertical: 1 }}>
                            <Text style={{ fontSize: 8, color: '#fff' }}>{m.rank}</Text>
                          </View>
                        </View>
                        <Text style={{ fontSize: 10, color: 'rgba(200,200,200,0.6)', marginTop: 2 }}>{m.title} · {m.service}</Text>
                        <View style={{ flexDirection: 'row', gap: 10, marginTop: 4 }}>
                          <Text style={{ fontSize: 9, color: '#7EC8E3' }}>能力 {m.ability}</Text>
                          <Text style={{ fontSize: 9, color: '#90EE90' }}>忠诚 {m.loyalty}</Text>
                        </View>
                      </View>
                      {done ? (
                        <View style={{ backgroundColor: '#E8D0A0', paddingHorizontal: 6, paddingVertical: 2 }}>
                          <Text style={{ fontSize: 9, color: '#333', fontWeight: '700' }}>已任命</Text>
                        </View>
                      ) : (
                        <Pressable
                          onPress={() => void handleAppoint(m)}
                          disabled={acting}
                          style={{ backgroundColor: '#C82829', paddingHorizontal: 10, paddingVertical: 6 }}
                        >
                          <Text style={{ fontSize: 10, color: '#fff', fontWeight: '700' }}>任命</Text>
                        </Pressable>
                      )}
                    </View>
                  </View>
                );
              })}
            </>
          )}

          {/* 国防预算 */}
          {tab === 'budget' && (
            <>
              <View style={{ backgroundColor: '#1A1A2E', padding: 12, borderWidth: 1, borderColor: '#2a2a4a' }}>
                <Text style={{ color: '#E8D0A0', fontWeight: '700', fontSize: 12 }}>💰 国防专项预算审批</Text>
                <Text style={{ color: 'rgba(200,200,200,0.6)', fontSize: 10, marginTop: 4, lineHeight: 15 }}>
                  协助中枢军委主席审批国防专项预算。当前安全指数：{save.securityIndex ?? 50}分
                </Text>
              </View>
              {BUDGET_ITEMS.map(item => {
                const done = approvedBudgets.has(item.id);
                const canDo = (save.fundBalance ?? 0) >= item.amount && !done;
                const catColor = CATEGORY_COLORS[item.category] ?? '#666';
                return (
                  <View key={item.id} style={{ backgroundColor: '#12121E', borderWidth: 1, borderColor: done ? '#E8D0A0' : '#1E1E30', overflow: 'hidden' }}>
                    <View style={{ padding: 12, gap: 6 }}>
                      <View style={{ flexDirection: 'row', alignItems: 'flex-start', gap: 8 }}>
                        <Text style={{ fontSize: 20 }}>{item.icon}</Text>
                        <View style={{ flex: 1 }}>
                          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                            <Text style={{ fontSize: 13, fontWeight: '700', color: done ? '#E8D0A0' : '#ddd' }}>{item.name}</Text>
                            <View style={{ backgroundColor: catColor, paddingHorizontal: 4, paddingVertical: 1 }}>
                              <Text style={{ fontSize: 8, color: '#fff' }}>{item.category}</Text>
                            </View>
                          </View>
                          <Text style={{ fontSize: 10, color: 'rgba(200,200,200,0.6)', marginTop: 3, lineHeight: 14 }}>{item.desc}</Text>
                          <View style={{ flexDirection: 'row', gap: 6, marginTop: 5 }}>
                            <View style={{ backgroundColor: 'rgba(200,160,80,0.15)', paddingHorizontal: 5, paddingVertical: 2 }}>
                              <Text style={{ fontSize: 9, color: '#E8D0A0' }}>预算 ¥{formatMoney(item.amount)}</Text>
                            </View>
                            <View style={{ backgroundColor: 'rgba(200,80,80,0.15)', paddingHorizontal: 5, paddingVertical: 2 }}>
                              <Text style={{ fontSize: 9, color: '#FF8080' }}>安全+{item.securityBonus}</Text>
                            </View>
                          </View>
                        </View>
                      </View>
                    </View>
                    {!done && (
                      <Pressable
                        onPress={() => void handleBudget(item)}
                        disabled={!canDo || acting}
                        style={{ paddingVertical: 10, alignItems: 'center', backgroundColor: canDo ? '#C82829' : '#222' }}
                      >
                        <Text style={{ color: '#fff', fontWeight: '700', fontSize: 11 }}>
                          {acting ? '审批中…' : canDo ? `▶ 批准预算（¥${formatMoney(item.amount)}）` : '经费不足'}
                        </Text>
                      </Pressable>
                    )}
                    {done && (
                      <View style={{ paddingVertical: 8, alignItems: 'center', backgroundColor: 'rgba(232,208,160,0.08)' }}>
                        <Text style={{ color: '#E8D0A0', fontSize: 10 }}>✓ 预算已批准，项目执行中</Text>
                      </View>
                    )}
                  </View>
                );
              })}
            </>
          )}

          {/* 军事演习 */}
          {tab === 'exercise' && (
            <>
              <View style={{ backgroundColor: '#1A1A2E', padding: 12, borderWidth: 1, borderColor: '#2a2a4a' }}>
                <Text style={{ color: '#E8D0A0', fontWeight: '700', fontSize: 12 }}>⚔️ 联合军事演习部署</Text>
                <Text style={{ color: 'rgba(200,200,200,0.6)', fontSize: 10, marginTop: 4, lineHeight: 15 }}>
                  依据《军委演习条例》，批准和部署各军种联合演习，提升实战能力与战略威慑。
                </Text>
              </View>
              {EXERCISES.map(ex => {
                const done = conductedExercises.has(ex.id);
                const canDo = (save.fundBalance ?? 0) >= ex.cost && !done;
                const typeColor = TYPE_COLORS[ex.type] ?? '#666';
                const scaleColor = ex.scale === '全军级' ? '#C82829' : ex.scale === '战略级' ? '#7B0026' : '#2B4B6F';
                return (
                  <View key={ex.id} style={{ backgroundColor: '#12121E', borderWidth: 1, borderColor: done ? '#E8D0A0' : '#1E1E30', overflow: 'hidden' }}>
                    <View style={{ padding: 12, gap: 6 }}>
                      <View style={{ flexDirection: 'row', alignItems: 'flex-start', gap: 8 }}>
                        <Text style={{ fontSize: 22 }}>{ex.icon}</Text>
                        <View style={{ flex: 1 }}>
                          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
                            <Text style={{ fontSize: 12, fontWeight: '700', color: done ? '#E8D0A0' : '#ddd' }}>{ex.name}</Text>
                            <View style={{ backgroundColor: typeColor, paddingHorizontal: 4, paddingVertical: 1 }}>
                              <Text style={{ fontSize: 8, color: '#fff' }}>{ex.type}</Text>
                            </View>
                            <View style={{ backgroundColor: scaleColor, paddingHorizontal: 4, paddingVertical: 1 }}>
                              <Text style={{ fontSize: 8, color: '#fff' }}>{ex.scale}</Text>
                            </View>
                          </View>
                          <Text style={{ fontSize: 10, color: 'rgba(200,200,200,0.6)', marginTop: 3, lineHeight: 14 }}>{ex.desc}</Text>
                          <View style={{ flexDirection: 'row', gap: 6, marginTop: 5, flexWrap: 'wrap' }}>
                            <Text style={{ fontSize: 9, color: '#E8D0A0', backgroundColor: 'rgba(200,160,80,0.12)', paddingHorizontal: 5, paddingVertical: 2 }}>费用 ¥{formatMoney(ex.cost)}</Text>
                            <Text style={{ fontSize: 9, color: '#FF8080', backgroundColor: 'rgba(200,80,80,0.12)', paddingHorizontal: 5, paddingVertical: 2 }}>安全+{ex.securityBonus}</Text>
                            <Text style={{ fontSize: 9, color: '#90EE90', backgroundColor: 'rgba(80,200,80,0.12)', paddingHorizontal: 5, paddingVertical: 2 }}>政绩+{ex.meritReward}</Text>
                            <Text style={{ fontSize: 9, color: '#7EC8E3', backgroundColor: 'rgba(80,150,200,0.12)', paddingHorizontal: 5, paddingVertical: 2 }}>历时{ex.duration}</Text>
                          </View>
                        </View>
                      </View>
                    </View>
                    {!done && (
                      <Pressable
                        onPress={() => void handleExercise(ex)}
                        disabled={!canDo || acting}
                        style={{ paddingVertical: 10, alignItems: 'center', backgroundColor: canDo ? '#1D3B5E' : '#222' }}
                      >
                        <Text style={{ color: '#fff', fontWeight: '700', fontSize: 11 }}>
                          {acting ? '部署中…' : canDo ? '▶ 批准演习' : '经费不足'}
                        </Text>
                      </Pressable>
                    )}
                    {done && (
                      <View style={{ paddingVertical: 8, alignItems: 'center', backgroundColor: 'rgba(232,208,160,0.08)' }}>
                        <Text style={{ color: '#E8D0A0', fontSize: 10 }}>✓ 演习已完成，战备水平提升</Text>
                      </View>
                    )}
                  </View>
                );
              })}
            </>
          )}

          {/* 装备研发 */}
          {tab === 'equip' && (
            <>
              <View style={{ backgroundColor: '#1A1A2E', padding: 12, borderWidth: 1, borderColor: '#2a2a4a' }}>
                <Text style={{ color: '#E8D0A0', fontWeight: '700', fontSize: 12 }}>🔬 重大武器装备研发立项</Text>
                <Text style={{ color: 'rgba(200,200,200,0.6)', fontSize: 10, marginTop: 4, lineHeight: 15 }}>
                  批准国防科工委提交的重大武器装备研发项目，提升国防现代化水平。
                </Text>
              </View>
              {EQUIP_PROJECTS.map(eq => {
                const done = launchedProjects.has(eq.id);
                const canDo = (save.fundBalance ?? 0) >= eq.cost && !done;
                const typeColor = EQUIP_COLORS[eq.type] ?? '#666';
                return (
                  <View key={eq.id} style={{ backgroundColor: '#12121E', borderWidth: 1, borderColor: done ? '#E8D0A0' : '#1E1E30', overflow: 'hidden' }}>
                    <View style={{ padding: 12, gap: 6 }}>
                      <View style={{ flexDirection: 'row', alignItems: 'flex-start', gap: 8 }}>
                        <Text style={{ fontSize: 22 }}>{eq.icon}</Text>
                        <View style={{ flex: 1 }}>
                          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
                            <Text style={{ fontSize: 12, fontWeight: '700', color: done ? '#E8D0A0' : '#ddd' }}>{eq.name}</Text>
                            <View style={{ backgroundColor: typeColor, paddingHorizontal: 4, paddingVertical: 1 }}>
                              <Text style={{ fontSize: 8, color: '#fff' }}>{eq.type}</Text>
                            </View>
                          </View>
                          <Text style={{ fontSize: 10, color: 'rgba(200,200,200,0.6)', marginTop: 3, lineHeight: 14 }}>{eq.desc}</Text>
                          <View style={{ flexDirection: 'row', gap: 6, marginTop: 5, flexWrap: 'wrap' }}>
                            <Text style={{ fontSize: 9, color: '#E8D0A0', backgroundColor: 'rgba(200,160,80,0.12)', paddingHorizontal: 5, paddingVertical: 2 }}>投资 ¥{formatMoney(eq.cost)}</Text>
                            <Text style={{ fontSize: 9, color: '#FF8080', backgroundColor: 'rgba(200,80,80,0.12)', paddingHorizontal: 5, paddingVertical: 2 }}>安全+{eq.securityBonus}</Text>
                            <Text style={{ fontSize: 9, color: '#7EC8E3', backgroundColor: 'rgba(80,150,200,0.12)', paddingHorizontal: 5, paddingVertical: 2 }}>研发周期 {eq.period}</Text>
                          </View>
                        </View>
                      </View>
                    </View>
                    {!done && (
                      <Pressable
                        onPress={() => void handleEquip(eq)}
                        disabled={!canDo || acting}
                        style={{ paddingVertical: 10, alignItems: 'center', backgroundColor: canDo ? '#7B0026' : '#222' }}
                      >
                        <Text style={{ color: '#fff', fontWeight: '700', fontSize: 11 }}>
                          {acting ? '立项中…' : canDo ? `▶ 批准立项（¥${formatMoney(eq.cost)}）` : '经费不足'}
                        </Text>
                      </Pressable>
                    )}
                    {done && (
                      <View style={{ paddingVertical: 8, alignItems: 'center', backgroundColor: 'rgba(232,208,160,0.08)' }}>
                        <Text style={{ color: '#E8D0A0', fontSize: 10 }}>✓ 已立项，研发周期 {eq.period}</Text>
                      </View>
                    )}
                  </View>
                );
              })}
            </>
          )}

          {/* ── 战区管理 Tab ── */}
          {tab === 'theater' && (
            <>
              <View style={{ backgroundColor: '#0D2035', padding: 12, marginBottom: 10 }}>
                <Text style={{ color: '#a0b4cc', fontSize: 10, letterSpacing: 2, marginBottom: 4 }}>中枢军委 · 战区体制</Text>
                <Text style={{ color: '#fff', fontSize: 12, lineHeight: 18 }}>
                  根据中枢军委命令，全国划分为东、南、西、北、中五大战区，实行军委——战区——部队的作战指挥体制。
                </Text>
              </View>

              {/* 五大战区列表 */}
              {THEATER_COMMANDS.map(tc => {
                const isSelected = selectedTheater === tc.id;
                return (
                  <View key={tc.id} style={{ backgroundColor: '#111827', borderWidth: 1, borderColor: isSelected ? tc.color : '#1e3a5f', marginBottom: 8 }}>
                    {/* 战区头部 */}
                    <Pressable
                      onPress={() => setSelectedTheater(isSelected ? null : tc.id)}
                      style={{ padding: 14, flexDirection: 'row', alignItems: 'center', gap: 10 }}
                    >
                      <View style={{ width: 44, height: 44, backgroundColor: tc.color + '33', borderWidth: 1, borderColor: tc.color, alignItems: 'center', justifyContent: 'center' }}>
                        <Text style={{ fontSize: 22 }}>{tc.icon}</Text>
                      </View>
                      <View style={{ flex: 1 }}>
                        <Text style={{ color: '#fff', fontSize: 14, fontWeight: '700' }}>{tc.name}</Text>
                        <Text style={{ color: '#a0b4cc', fontSize: 10, marginTop: 1 }}>司令部：{tc.hq} · {tc.rank}</Text>
                        <Text style={{ color: '#a0b4cc', fontSize: 10 }}>{tc.troops}万人 · 战备率{tc.readiness}%</Text>
                      </View>
                      <View style={{ alignItems: 'flex-end', gap: 3 }}>
                        <View style={{ height: 6, width: 60, backgroundColor: '#1e3a5f' }}>
                          <View style={{ height: 6, width: `${tc.readiness}%`, backgroundColor: tc.readiness >= 90 ? '#4CAF50' : tc.readiness >= 80 ? '#FF9800' : '#F44336' }} />
                        </View>
                        <Text style={{ color: '#666', fontSize: 10 }}>{isSelected ? '▲' : '▼'}</Text>
                      </View>
                    </Pressable>

                    {/* 展开详情 */}
                    {isSelected && (
                      <View style={{ borderTopWidth: 1, borderTopColor: '#1e3a5f', padding: 12, gap: 10 }}>
                        {/* 领导班子 */}
                        <View style={{ flexDirection: 'row', gap: 8 }}>
                          <View style={{ flex: 1, backgroundColor: 'rgba(255,255,255,0.04)', padding: 10 }}>
                            <Text style={{ color: '#a0b4cc', fontSize: 9, letterSpacing: 1, marginBottom: 4 }}>战区司令员</Text>
                            <Text style={{ color: '#fff', fontSize: 14, fontWeight: '700' }}>{tc.commander}</Text>
                            <Text style={{ color: '#a0b4cc', fontSize: 9, marginTop: 2 }}>{tc.rank} · 主持军事工作</Text>
                          </View>
                          <View style={{ flex: 1, backgroundColor: 'rgba(255,255,255,0.04)', padding: 10 }}>
                            <Text style={{ color: '#a0b4cc', fontSize: 9, letterSpacing: 1, marginBottom: 4 }}>战区政治委员</Text>
                            <Text style={{ color: '#fff', fontSize: 14, fontWeight: '700' }}>{tc.commissar}</Text>
                            <Text style={{ color: '#a0b4cc', fontSize: 9, marginTop: 2 }}>{tc.rank} · 主持政治工作</Text>
                          </View>
                        </View>

                        {/* 辖区 */}
                        <View style={{ gap: 4 }}>
                          <Text style={{ color: '#a0b4cc', fontSize: 9, letterSpacing: 1 }}>战区辖区</Text>
                          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 4 }}>
                            {tc.jurisdiction.map(j => (
                              <View key={j} style={{ backgroundColor: tc.color + '33', borderWidth: 1, borderColor: tc.color, paddingHorizontal: 7, paddingVertical: 2 }}>
                                <Text style={{ color: '#ccc', fontSize: 9 }}>{j}</Text>
                              </View>
                            ))}
                          </View>
                        </View>

                        {/* 作战使命 */}
                        <View style={{ gap: 4 }}>
                          <Text style={{ color: '#a0b4cc', fontSize: 9, letterSpacing: 1 }}>主要作战使命</Text>
                          {tc.missions.map(m => (
                            <View key={m} style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                              <View style={{ width: 4, height: 4, backgroundColor: tc.color }} />
                              <Text style={{ color: '#ccc', fontSize: 10, flex: 1 }}>{m}</Text>
                            </View>
                          ))}
                        </View>

                        {/* 军委指令 */}
                        <View style={{ gap: 6 }}>
                          <Text style={{ color: '#E8D0A0', fontSize: 10, fontWeight: '700', letterSpacing: 1 }}>军委指令</Text>
                          {THEATER_ACTIONS.map(action => {
                            const doneKey = `${tc.id}_${action.id}`;
                            const done = theaterActionDone.has(doneKey);
                            const canAfford = action.cost === 0 || (save.fundBalance ?? 0) >= action.cost;
                            return (
                              <Pressable
                                key={action.id}
                                onPress={async () => {
                                  if (done || acting) return;
                                  if (!canAfford) { showResult(`⚠️ 经费不足，需要 ¥${formatMoney(action.cost)}`); return; }
                                  setActing(true);
                                  const updates: Record<string, number> = { meritPoints: (save.meritPoints ?? 0) + action.meritReward };
                                  if (action.cost > 0) updates.fundBalance = Math.max(0, (save.fundBalance ?? 0) - action.cost);
                                  await updateGameSave(updates);
                                  setTheaterActionDone(prev => new Set(prev).add(doneKey));
                                  setActing(false);
                                  showResult(`${action.icon} 对${tc.name}执行「${action.label}」· 安全+${action.securityBonus} · 政绩+${action.meritReward}`);
                                }}
                                style={{ flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: done ? 'rgba(255,255,255,0.03)' : 'rgba(255,255,255,0.07)', borderWidth: 1, borderColor: done ? '#333' : tc.color + '66', padding: 10, opacity: done ? 0.6 : 1 }}
                              >
                                <Text style={{ fontSize: 18 }}>{action.icon}</Text>
                                <View style={{ flex: 1 }}>
                                  <Text style={{ color: done ? '#666' : '#fff', fontSize: 11, fontWeight: '600' }}>{action.label}</Text>
                                  <Text style={{ color: '#888', fontSize: 9, marginTop: 2 }}>{action.desc}</Text>
                                  {action.cost > 0 && (
                                    <Text style={{ color: '#a0b4cc', fontSize: 9, marginTop: 1 }}>消耗：¥{formatMoney(action.cost)} · 政绩+{action.meritReward}</Text>
                                  )}
                                </View>
                                {done ? (
                                  <Text style={{ color: '#4CAF50', fontSize: 10 }}>✓</Text>
                                ) : (
                                  <Text style={{ color: tc.color, fontSize: 16 }}>›</Text>
                                )}
                              </Pressable>
                            );
                          })}
                        </View>
                      </View>
                    )}
                  </View>
                );
              })}
            </>
          )}

        </View>
        <View style={{ height: 40 }} />
      </ScrollView>

      {!!result && (
        <View style={{ position: 'absolute', bottom: 24, left: 16, right: 16, backgroundColor: '#1A1A2E', borderWidth: 1, borderColor: '#E8D0A0', padding: 12, alignItems: 'center' }}>
          <Text style={{ color: '#E8D0A0', fontWeight: '700', fontSize: 13 }}>{result}</Text>
        </View>
      )}
    </View>
  );
}
