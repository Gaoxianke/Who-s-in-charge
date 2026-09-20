// 部门子页面 - 通用模板，支持十四大部门（含信访办+组织部）
import { useState, useCallback } from 'react';
import { ActivityIndicator, Modal, Pressable, ScrollView, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { useLocalSearchParams, useRouter, useFocusEffect } from 'expo-router';
import { useGame } from '@/ctx/GameContext';
import { getSubordinates, getEnterprises, getPersonnelCandidates, promoteSubordinate, getPetitionEvents, processPetitionEvent, inspectEnterprise, regulateEnterprise, optimizeBusinessService, generateImmediateEnterprises, fillDeptStaff, batchAssessSubordinates, getSubResumes } from '@/db/gameApi';
import { DEPT_CONFIG, SUB_LEVEL_NAMES, getDeptNameByRank, getDeptStaffQuota, gameDaysToDate } from '@/types/game';
import type { DeptKey, Subordinate, Enterprise, PetitionEvent, SubResume } from '@/types/game';
import { getSubAvatarEmoji } from '@/types/game';
import { StatBar } from '@/components/StatBar';

// 每个部门可执行的施政行动
type PolicyAction = {
  id: string;
  title: string;
  desc: string;
  cost: number; // 政绩消耗
  effect: Partial<{
    cityGdp: number;
    cityLivelihood: number;
    cityEcology: number;
    cityBusiness: number;
    policeForce: number;
    securityIndex: number;
    moralValue: number;
    meritPoints: number;
    bossFavor: number;
    fundBalance: number; // 城市资金变化（万元，正=增收，负=支出）
    taxRevenue: number;  // 税收变化
  }>;
  cooldownDays: number; // 冷却天数（游戏内）
  tag?: string; // 行动标签（如"自动""月度"）
};

const DEPT_POLICIES: Record<DeptKey, PolicyAction[]> = {
  police: [
    {
      id: 'p1', title: '🚔 扫黄打非专项行动',
      desc: '集中警力开展扫黄打非行动，严厉打击黄赌毒，净化社会风气',
      cost: 15, cooldownDays: 60,
      effect: { securityIndex: 10, cityLivelihood: 5, meritPoints: 18, bossFavor: 2 },
      tag: '月度可开展',
    },
    {
      id: 'p2', title: '🔫 治安集中整治',
      desc: '部署警力开展治安专项整治，震慑违法犯罪活动',
      cost: 20, cooldownDays: 90,
      effect: { securityIndex: 8, cityLivelihood: 3, meritPoints: 15 },
    },
    {
      id: 'p3', title: '🏠 社区警务站建设',
      desc: '在居民小区设立警务工作站，方便群众就近报警求助',
      cost: 25, cooldownDays: 180,
      effect: { cityLivelihood: 7, securityIndex: 4, meritPoints: 12, bossFavor: 1 },
    },
    {
      id: 'p4', title: '🛡 增购警用装备',
      desc: '申请专项经费采购先进警用装备，提升综合警力',
      cost: 30, cooldownDays: 180,
      effect: { policeForce: 20, securityIndex: 5, fundBalance: -30 },
    },
  ],
  ndrc: [
    {
      id: 'n1', title: '🏗 招商引资大会',
      desc: '主办招商引资推介会，吸引外部资本入驻，增加城市税收来源',
      cost: 25, cooldownDays: 90,
      effect: { cityGdp: 6, cityBusiness: 6, meritPoints: 20, taxRevenue: 5, fundBalance: 50 },
      tag: '增加税收',
    },
    {
      id: 'n2', title: '🏢 引进重点企业',
      desc: '定向谈判引进行业龙头企业落地投资',
      cost: 35, cooldownDays: 180,
      effect: { cityGdp: 12, cityBusiness: 8, meritPoints: 25, bossFavor: 3, taxRevenue: 10, fundBalance: 120 },
      tag: '高效益',
    },
    {
      id: 'n3', title: '🔄 产业结构调整',
      desc: '推动传统产业转型升级，发展高新技术产业',
      cost: 40, cooldownDays: 200,
      effect: { cityGdp: 8, cityBusiness: 10, meritPoints: 18 },
    },
  ],
  finance: [
    {
      id: 'f1', title: '📊 优化财政支出',
      desc: '精简行政开支，压缩"三公经费"，资金向民生倾斜',
      cost: 20, cooldownDays: 90,
      effect: { cityLivelihood: 5, meritPoints: 12, fundBalance: 30 },
    },
    {
      id: 'f2', title: '📜 发行专项债券',
      desc: '发行政府专项债为基础设施筹资，撬动社会投资',
      cost: 35, cooldownDays: 180,
      effect: { cityGdp: 8, cityBusiness: 4, meritPoints: 18, fundBalance: 200 },
    },
    {
      id: 'f3', title: '💸 减税降费措施',
      desc: '出台一揽子减税降费政策，降低企业经营负担',
      cost: 28, cooldownDays: 150,
      effect: { cityBusiness: 10, cityGdp: 4, meritPoints: 15, bossFavor: 2, fundBalance: -20 },
    },
  ],
  urban: [
    {
      id: 'u1', title: '🏘 老旧小区改造',
      desc: '推进老旧小区整体改造提升，改善居民居住条件',
      cost: 30, cooldownDays: 180,
      effect: { cityLivelihood: 8, cityGdp: 4, meritPoints: 18, fundBalance: -80 },
    },
    {
      id: 'u2', title: '🚧 市政道路升级',
      desc: '对主干道路进行修缮拓宽，提升城市通行能力',
      cost: 35, cooldownDays: 200,
      effect: { cityGdp: 6, cityBusiness: 6, meritPoints: 15, fundBalance: -100 },
    },
    {
      id: 'u3', title: '🏠 保障性住房开工',
      desc: '启动经济适用房和廉租房建设，解决居民住房难题',
      cost: 40, cooldownDays: 240,
      effect: { cityLivelihood: 10, meritPoints: 20, bossFavor: 3, fundBalance: -120 },
    },
  ],
  education: [
    {
      id: 'e1', title: '👨‍🏫 优质教师引进',
      desc: '面向全国发布引才政策，吸引高水平师资来任教',
      cost: 25, cooldownDays: 120,
      effect: { cityLivelihood: 7, meritPoints: 15, bossFavor: 2, fundBalance: -40 },
    },
    {
      id: 'e2', title: '🏫 新建中小学校',
      desc: '补充义务教育阶段学位供给，缓解入学压力',
      cost: 40, cooldownDays: 240,
      effect: { cityLivelihood: 10, meritPoints: 22, fundBalance: -150 },
    },
    {
      id: 'e3', title: '🛠 职业技能培训',
      desc: '组织开展农村劳动力职业技能提升培训班',
      cost: 15, cooldownDays: 90,
      effect: { cityGdp: 4, cityLivelihood: 4, meritPoints: 10 },
      tag: '促就业',
    },
  ],
  health: [
    {
      id: 'h1', title: '🏥 基层卫生所建设',
      desc: '在镇村投资建设标准化卫生所，夯实基层医疗',
      cost: 28, cooldownDays: 150,
      effect: { cityLivelihood: 8, meritPoints: 16, fundBalance: -60 },
    },
    {
      id: 'h2', title: '💊 医疗设备购置',
      desc: '为县医院购置先进诊疗仪器，提升医疗服务水平',
      cost: 35, cooldownDays: 180,
      effect: { cityLivelihood: 6, meritPoints: 14, bossFavor: 2, fundBalance: -80 },
    },
    {
      id: 'h3', title: '🩺 全民健康体检',
      desc: '为辖区居民提供一年一次免费健康体检',
      cost: 22, cooldownDays: 365,
      effect: { cityLivelihood: 5, meritPoints: 12, bossFavor: 1, fundBalance: -30 },
    },
  ],
  ecology: [
    {
      id: 'ec1', title: '🏭 环保专项罚款整治',
      desc: '开展环保专项执法，对违规排污企业依法处以罚款',
      cost: 20, cooldownDays: 60,
      effect: { cityEcology: 10, meritPoints: 18, bossFavor: 2, fundBalance: 80 },
      tag: '增加罚款收入',
    },
    {
      id: 'ec2', title: '🔒 关停污染企业',
      desc: '坚决关停长期不达标的高污染、高耗能企业',
      cost: 30, cooldownDays: 180,
      effect: { cityEcology: 12, meritPoints: 15, cityGdp: -3, cityBusiness: -2 },
    },
    {
      id: 'ec3', title: '🌳 绿化造林工程',
      desc: '启动城乡大规模植树造林和生态修复工程',
      cost: 25, cooldownDays: 150,
      effect: { cityEcology: 8, meritPoints: 14, bossFavor: 2, fundBalance: -50 },
    },
    {
      id: 'ec4', title: '☀️ 清洁能源推广',
      desc: '补贴居民和企业安装太阳能、风能等清洁能源',
      cost: 35, cooldownDays: 200,
      effect: { cityEcology: 6, cityGdp: 3, meritPoints: 16, fundBalance: -60 },
    },
  ],
  market: [
    {
      id: 'm1', title: '📋 食品安全大检查',
      desc: '开展食品安全专项整治，守护群众"舌尖上的安全"',
      cost: 18, cooldownDays: 90,
      effect: { cityLivelihood: 5, meritPoints: 10, bossFavor: 1 },
    },
    {
      id: 'm2', title: '⚡ 优化营业执照审批',
      desc: '推行"一窗通办"改革，压缩营业执照审批时限',
      cost: 22, cooldownDays: 120,
      effect: { cityBusiness: 8, meritPoints: 14 },
    },
    {
      id: 'm3', title: '🚫 打假打劣专项行动',
      desc: '开展打击假冒伪劣商品专项执法，净化市场秩序',
      cost: 20, cooldownDays: 120,
      effect: { cityBusiness: 6, cityLivelihood: 4, meritPoints: 12 },
    },
  ],
  agriculture: [
    {
      id: 'ag1', title: '🌾 高标准农田改造',
      desc: '推进农田水利设施建设和土地平整改良工程',
      cost: 35, cooldownDays: 200,
      effect: { cityGdp: 6, cityLivelihood: 5, meritPoints: 18, fundBalance: -90 },
    },
    {
      id: 'ag2', title: '💰 农业补贴发放',
      desc: '向种粮大户和农业合作社发放政府专项补贴',
      cost: 25, cooldownDays: 365,
      effect: { cityLivelihood: 7, meritPoints: 13, bossFavor: 2, fundBalance: -60 },
    },
    {
      id: 'ag3', title: '📦 农村电商扶持',
      desc: '建设农村电商服务中心，打通农产品上行销售渠道',
      cost: 20, cooldownDays: 150,
      effect: { cityGdp: 5, cityBusiness: 5, meritPoints: 12, taxRevenue: 2, fundBalance: 20 },
    },
  ],
  personnel: [
    {
      id: 'per1', title: '🎓 干部素质培训班',
      desc: '组织在职干部参加党校学习和能力培训，提升整体素质',
      cost: 20, cooldownDays: 90,
      effect: { meritPoints: 15, bossFavor: 2 },
      tag: '全员培训',
    },
    {
      id: 'per2', title: '📊 年度绩效考核',
      desc: '对各部门干部开展系统绩效考核，奖优罚劣',
      cost: 15, cooldownDays: 365,
      effect: { meritPoints: 20, bossFavor: 3 },
      tag: '年度一次',
    },
    {
      id: 'per3', title: '🌟 选拔优秀年轻干部',
      desc: '面向基层选拔优秀年轻干部，充实干部队伍',
      cost: 25, cooldownDays: 180,
      effect: { meritPoints: 18, cityGdp: 2, bossFavor: 2 },
    },
  ],
  invest: [
    {
      id: 'inv1', title: '🏭 工业园区招商推介',
      desc: '举办招商推介会，向全国500强企业发出入驻邀请',
      cost: 25, cooldownDays: 90,
      effect: { cityGdp: 8, cityBusiness: 8, meritPoints: 20, taxRevenue: 5, fundBalance: 80 },
      tag: '季度可开展',
    },
    {
      id: 'inv2', title: '🌿 生态旅游开发洽谈',
      desc: '引进文旅企业开发绿色生态旅游资源，促进旅游收入',
      cost: 20, cooldownDays: 120,
      effect: { cityEcology: 4, cityBusiness: 5, meritPoints: 15, taxRevenue: 3, fundBalance: 50 },
    },
    {
      id: 'inv3', title: '💡 高新技术企业引进',
      desc: '面向头部科技企业开展精准招商，引进高技术产业项目',
      cost: 35, cooldownDays: 180,
      effect: { cityGdp: 12, cityBusiness: 10, meritPoints: 28, taxRevenue: 10, fundBalance: 200 },
      tag: '高收益',
    },
    {
      id: 'inv4', title: '🤝 外资企业洽谈',
      desc: '赴境外参加经贸交流活动，吸引外资企业落地',
      cost: 40, cooldownDays: 240,
      effect: { cityGdp: 15, cityBusiness: 12, meritPoints: 35, taxRevenue: 15, fundBalance: 300 },
      tag: '外资引进',
    },
  ],
  tax: [
    {
      id: 'tax1', title: '🧾 重点企业税收专项清缴',
      desc: '对辖区重点企业开展税务稽查，清缴欠税',
      cost: 15, cooldownDays: 90,
      effect: { meritPoints: 12, fundBalance: 100, taxRevenue: 8 },
      tag: '增收',
    },
    {
      id: 'tax2', title: '📋 纳税服务优化',
      desc: '推进税务服务数字化，简化申报流程，吸引更多企业纳税',
      cost: 20, cooldownDays: 180,
      effect: { cityBusiness: 5, meritPoints: 15, fundBalance: 60 },
    },
    {
      id: 'tax3', title: '🔍 税务稽查专项行动',
      desc: '集中开展税务稽查行动，打击偷逃税行为，维护税收秩序',
      cost: 25, cooldownDays: 120,
      effect: { meritPoints: 18, fundBalance: 150, taxRevenue: 12 },
      tag: '专项执法',
    },
  ],
  petition: [
    {
      id: 'pet1', title: '📮 集中信访化解专项行动',
      desc: '集中力量化解一批长期未解决的信访积案，维护社会稳定',
      cost: 20, cooldownDays: 90,
      effect: { meritPoints: 18, bossFavor: 2, cityLivelihood: 3 },
      tag: '维稳',
    },
    {
      id: 'pet2', title: '🤝 矛盾纠纷调解月',
      desc: '开展矛盾纠纷调解专项活动，将矛盾化解在基层，防止激化上访',
      cost: 15, cooldownDays: 120,
      effect: { meritPoints: 12, bossFavor: 1, cityLivelihood: 4 },
    },
    {
      id: 'pet3', title: '📞 畅通信访渠道建设',
      desc: '完善网上信访、电话信访、领导接访等多元信访渠道，提升群众满意度',
      cost: 18, cooldownDays: 180,
      effect: { cityLivelihood: 5, meritPoints: 14, bossFavor: 2 },
      tag: '服务提升',
    },
    {
      id: 'pet4', title: '🛡 重点人员排摸管控',
      desc: '对有反复上访倾向的重点人员开展走访和关怀，从源头化解信访隐患',
      cost: 22, cooldownDays: 150,
      effect: { meritPoints: 16, bossFavor: 3, cityLivelihood: 2 },
      tag: '基层治理',
    },
  ],
  organization: [
    {
      id: 'org1', title: '🏛️ 干部年度考评',
      desc: '组织开展干部年度综合考核，以考促改，促进干部队伍建设',
      cost: 15, cooldownDays: 365,
      effect: { meritPoints: 20, bossFavor: 3 },
      tag: '年度考核',
    },
    {
      id: 'org2', title: '📋 后备干部名单遴选',
      desc: '从各部门科级干部中遴选优秀人才，充实干部队伍',
      cost: 18, cooldownDays: 180,
      effect: { meritPoints: 15, bossFavor: 2 },
      tag: '人才培养',
    },
    {
      id: 'org3', title: '🎓 党性教育专题培训',
      desc: '组织科处级干部参加党性教育专题培训班，筑牢理想信念',
      cost: 12, cooldownDays: 120,
      effect: { meritPoints: 12, bossFavor: 2, cityLivelihood: 2 },
      tag: '培训',
    },
    {
      id: 'org4', title: '⭐ 优秀干部表彰大会',
      desc: '召开表彰大会，对年度考核优秀干部进行表彰奖励，激发干事活力',
      cost: 20, cooldownDays: 365,
      effect: { meritPoints: 18, bossFavor: 4, cityLivelihood: 3 },
      tag: '表彰激励',
    },
  ],
};

// 人事局特有行动（替换market里的人事相关）
const PERSONNEL_EXTRA: PolicyAction[] = [
  {
    id: 'hr1', title: '📝 公务员招录考试',
    desc: '组织年度公务员招录考试，为机关单位补充新鲜血液',
    cost: 20, cooldownDays: 365,
    effect: { cityGdp: 2, cityLivelihood: 3, meritPoints: 15, bossFavor: 1 },
    tag: '年度',
  },
  {
    id: 'hr2', title: '🎓 在职干部培训',
    desc: '组织科级以上干部参加专题培训班，提升施政能力',
    cost: 18, cooldownDays: 180,
    effect: { meritPoints: 12, bossFavor: 2 },
    tag: '提升能力',
  },
  {
    id: 'hr3', title: '⭐ 干部职级评定',
    desc: '开展年度干部考核与职级晋升评定工作',
    cost: 15, cooldownDays: 365,
    effect: { meritPoints: 20, bossFavor: 3 },
    tag: '年度考核',
  },
];

function EffectTag({ label, value }: { label: string; value: number }) {
  const color = value > 0 ? '#2a7a3b' : '#C82829';
  const prefix = value > 0 ? '+' : '';
  return (
    <View style={{ backgroundColor: value > 0 ? '#e8f5e9' : '#ffebee', paddingHorizontal: 8, paddingVertical: 3, marginRight: 5, marginBottom: 4 }}>
      <Text style={{ fontSize: 10, color, fontWeight: '600' }}>{label}{prefix}{value}</Text>
    </View>
  );
}

export default function DepartmentScreen() {
  const insets = useSafeAreaInsets();
  const { type } = useLocalSearchParams<{ type: string }>();
  const router = useRouter();
  const { save, updateGameSave } = useGame();
  const [subordinates, setSubordinates] = useState<Subordinate[]>([]);
  const [enterprises, setEnterprises] = useState<Enterprise[]>([]);
  const [personnelCandidates, setPersonnelCandidates] = useState<Subordinate[]>([]);
  const [petitionEvents, setPetitionEvents] = useState<PetitionEvent[]>([]);
  const [feedback, setFeedback] = useState('');
  const [promotingId, setPromotingId] = useState<string | null>(null);
  const [marketActionLoading, setMarketActionLoading] = useState<string | null>(null);
  const [onekeyLoading, setOnekeyLoading] = useState(false);
  // 个人档案弹窗
  const [profileSub, setProfileSub] = useState<Subordinate | null>(null);
  const [profileResumes, setProfileResumes] = useState<SubResume[]>([]);
  const [profileLoading, setProfileLoading] = useState(false);

  const deptKey = type as DeptKey;
  const cfg = DEPT_CONFIG[deptKey];
  const rankLevel = save?.rankLevel ?? 1;
  const deptDisplayName = getDeptNameByRank(deptKey, rankLevel);
  const staffQuota = getDeptStaffQuota(rankLevel);
  // 人事局额外追加人事考试/培训行动（已迁移到 personnel 部门）
  const policies = DEPT_POLICIES[deptKey] ?? [];

  // 县长（5级）以上可以任命，以下为申请配合模式
  const canAppoint = (save?.rankLevel ?? 0) >= 5;

  useFocusEffect(
    useCallback(() => {
      if (!save) return;
      getSubordinates(save.id).then(allSubs => {
        const deptSubs = allSubs.filter(s => s.appointedDept === deptKey);
        setSubordinates(deptSubs);

        // 若该部门有正职但科员不足2人，自动补充
        const hasHead = deptSubs.some(s => s.deptPosition === 'head');
        const staffCount = deptSubs.filter(s => s.deptPosition === 'staff').length;
        if (hasHead && staffCount < 2) {
          fillDeptStaff(save.id, save.userId, deptKey).then(added => {
            if (added > 0) {
              getSubordinates(save.id).then(fresh => {
                setSubordinates(fresh.filter(s => s.appointedDept === deptKey));
              });
            }
          });
        }
      });
      if (deptKey === 'invest' || deptKey === 'market') {
        getEnterprises(save.id).then(setEnterprises);
      }
      if (deptKey === 'personnel') {
        getPersonnelCandidates(save.id).then(setPersonnelCandidates);
      }
      if (deptKey === 'petition') {
        getPetitionEvents(save.id).then(setPetitionEvents);
      }
    }, [save, deptKey])
  );

  const handleExecutePolicy = async (action: PolicyAction) => {
    if (!save) return;
    // 以 deptKey_actionId 为 key 查冷却截止天
    const cooldownKey = `${deptKey}_${action.id}`;
    const cooldownEndDay = save.deptPolicyCooldowns[cooldownKey] ?? 0;
    if (save.gameDays < cooldownEndDay) {
      setFeedback(`本次操作冷却中，还需 ${cooldownEndDay - save.gameDays} 天`);
      setTimeout(() => setFeedback(''), 2000);
      return;
    }

    // 执行效果
    const updates: Parameters<typeof updateGameSave>[0] = {};
    const fx = action.effect;
    if (fx.cityGdp) updates.cityGdp = Math.max(0, Math.min(100, save.cityGdp + fx.cityGdp));
    if (fx.cityLivelihood) updates.cityLivelihood = Math.max(0, Math.min(100, save.cityLivelihood + fx.cityLivelihood));
    if (fx.cityEcology) updates.cityEcology = Math.max(0, Math.min(100, save.cityEcology + fx.cityEcology));
    if (fx.cityBusiness) updates.cityBusiness = Math.max(0, Math.min(100, save.cityBusiness + fx.cityBusiness));
    if (fx.securityIndex) updates.securityIndex = Math.max(0, Math.min(100, save.securityIndex + fx.securityIndex));
    if (fx.policeForce) updates.policeForce = Math.max(0, save.policeForce + fx.policeForce);
    if (fx.meritPoints) updates.meritPoints = save.meritPoints + (fx.meritPoints ?? 0);
    if (fx.bossFavor) updates.bossFavor = Math.max(0, Math.min(100, save.bossFavor + (fx.bossFavor ?? 0)));
    if (fx.moralValue) updates.moralValue = Math.max(0, Math.min(100, save.moralValue + (fx.moralValue ?? 0)));
    // 资金与税收变化
    if (fx.fundBalance) updates.fundBalance = Math.max(0, (save.fundBalance ?? 0) + fx.fundBalance);
    if (fx.taxRevenue) updates.taxRevenue = Math.max(0, (save.taxRevenue ?? 0) + fx.taxRevenue);

    // 持久化冷却：写入截止游戏天（即使 cooldownDays=0 也写入，防止重复执行）
    updates.deptPolicyCooldowns = {
      ...save.deptPolicyCooldowns,
      [cooldownKey]: save.gameDays + Math.max(action.cooldownDays, 1),
    };

    const isFundIncrease = (fx.fundBalance ?? 0) > 0;
    const isFundDecrease = (fx.fundBalance ?? 0) < 0;
    const fundMsg = isFundIncrease ? `  💰 资金+${fx.fundBalance}万` : isFundDecrease ? `  💸 支出${Math.abs(fx.fundBalance!)}万` : '';

    await updateGameSave(updates);
    setFeedback(`✓ 【${action.title}】执行成功，相关指数已更新${fundMsg}`);

    // 招商局行动：立即生成企业入驻（inv1/inv2 属于招商推介行动）
    if (deptKey === 'invest' && (action.id === 'inv1' || action.id === 'inv2' || action.id === 'inv3')) {
      const headAbility = deptChief?.ability ?? 50;
      const newEnts = await generateImmediateEnterprises(save.id, save.userId, save.gameDays, headAbility, 1);
      if (newEnts.length > 0) {
        setEnterprises(prev => [...newEnts, ...prev]);
        const names = newEnts.map(e => e.name).join('、');
        setFeedback(`✓ 【${action.title}】执行成功！🎉 ${names} 等 ${newEnts.length} 家企业成功入驻，每月税收 +${newEnts.reduce((s, e) => s + e.taxContribution, 0)}万`);
      }
    }

    setTimeout(() => setFeedback(''), 4000);
  };

  // 一键实施推荐行动：执行第一个未冷却的施政行动
  const handleOnekeyAction = async () => {
    if (!save || onekeyLoading) return;
    const gameDays = save.gameDays;
    const available = policies.find(a => {
      const endDay = save.deptPolicyCooldowns[`${deptKey}_${a.id}`] ?? 0;
      return gameDays >= endDay;
    });
    if (!available) {
      setFeedback('所有行动本轮已执行，请等待冷却');
      setTimeout(() => setFeedback(''), 2500);
      return;
    }
    setOnekeyLoading(true);
    await handleExecutePolicy(available);
    setOnekeyLoading(false);
  };

  // 组织部：一键考评所有在岗下属
  const handleOrgBatchAssess = async () => {
    if (!save || onekeyLoading) return;
    setOnekeyLoading(true);
    const count = await batchAssessSubordinates(save.id, save.gameDays);
    setOnekeyLoading(false);
    setFeedback(count > 0 ? `✅ 一键考评完成，共考评 ${count} 名在岗人员，政绩+${count * 2}` : '暂无在岗下属可考评');
    setTimeout(() => setFeedback(''), 4000);
  };

  // 打开个人档案弹窗
  const openProfile = async (sub: Subordinate) => {
    setProfileSub(sub);
    setProfileLoading(true);
    const resumes = await getSubResumes(sub.id);
    setProfileResumes(resumes);
    setProfileLoading(false);
  };

  const handlePromote = async (sub: Subordinate) => {
    if (!save) return;
    const maxSubLevel = Math.min(12, save.rankLevel);
    if (sub.subLevel >= maxSubLevel) {
      setFeedback(`⚠️ ${sub.name} 级别已达主角级别上限，无法继续晋升`);
      setTimeout(() => setFeedback(''), 3000);
      return;
    }
    setPromotingId(sub.id);
    const deptName = DEPT_CONFIG[sub.appointedDept ?? 'personnel']?.name ?? '人事局';
    await promoteSubordinate(save.id, sub.id, sub.subLevel, save.gameDays, sub.position, deptName);
    setPersonnelCandidates(prev => prev.map(s => s.id === sub.id ? { ...s, subLevel: Math.min(12, s.subLevel + 1) } : s));
    setFeedback(`✓ ${sub.name} 晋升为 ${SUB_LEVEL_NAMES[Math.min(12, sub.subLevel + 1)]}，履历已更新`);
    setTimeout(() => setFeedback(''), 3000);
    setPromotingId(null);
  };

  if (!save || !cfg) {
    return (
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: '#F7F7F5' }}>
        <Text style={{ color: '#888' }}>{!cfg ? '部门不存在' : '加载中…'}</Text>
      </View>
    );
  }

  // 该部门指定的下属（正职/副职/科员）
  const deptChief  = subordinates.find(s => s.isAppointed && s.deptPosition === 'head');
  const deptDeputy = subordinates.find(s => s.isAppointed && s.deptPosition === 'deputy');
  const deptStaff  = subordinates.filter(s => s.isAppointed && s.deptPosition === 'staff');

  return (
    <View style={{ flex: 1, backgroundColor: '#F7F7F5' }}>
      <StatusBar style="light" backgroundColor="#1D3B5E" />

      {/* ── 个人档案弹窗 ── */}
      <Modal visible={!!profileSub} transparent animationType="slide" onRequestClose={() => setProfileSub(null)}>
        <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.6)', justifyContent: 'flex-end' }}>
          <View style={{ backgroundColor: '#0D1520', maxHeight: '85%', borderTopWidth: 2, borderTopColor: '#2D4A6B' }}>
            {/* 弹窗头部 */}
            <View style={{ backgroundColor: '#1D2D44', padding: 16, flexDirection: 'row', alignItems: 'center', gap: 12 }}>
              <View style={{ width: 52, height: 52, backgroundColor: '#0D1520', alignItems: 'center', justifyContent: 'center', borderWidth: 2, borderColor: '#2D5A8E' }}>
                <Text style={{ fontSize: 28 }}>{profileSub ? getSubAvatarEmoji(profileSub.avatarId ?? 0, profileSub.gender ?? '男') : '👤'}</Text>
              </View>
              <View style={{ flex: 1 }}>
                <Text style={{ color: '#F0E8C8', fontSize: 16, fontWeight: '700' }}>{profileSub?.name ?? ''}</Text>
                <Text style={{ color: '#8AAAC8', fontSize: 11, marginTop: 2 }}>
                  {profileSub?.position ?? ''} · {profileSub?.gender ?? ''} · {SUB_LEVEL_NAMES[profileSub?.subLevel ?? 1]}
                </Text>
              </View>
              <Pressable onPress={() => setProfileSub(null)} style={{ padding: 6 }}>
                <Text style={{ color: '#8AAAC8', fontSize: 22 }}>✕</Text>
              </Pressable>
            </View>

            <ScrollView contentContainerStyle={{ padding: 14, gap: 10 }}>
              {/* 基本信息卡 */}
              <View style={{ backgroundColor: '#1A2535', borderWidth: 1, borderColor: '#2D3A50', padding: 12, gap: 6 }}>
                <Text style={{ color: '#C8A832', fontSize: 11, fontWeight: '700', letterSpacing: 2, marginBottom: 4 }}>📋 基本信息</Text>
                {[
                  { label: '出生年份', value: profileSub?.birthYear ? `${profileSub.birthYear}年` : '—' },
                  { label: '籍　　贯', value: profileSub?.hometown ?? '—' },
                  { label: '毕业院校', value: profileSub?.university ?? '—' },
                  { label: '所学专业', value: profileSub?.major ?? '—' },
                  { label: '当前职级', value: SUB_LEVEL_NAMES[profileSub?.subLevel ?? 1] },
                  { label: '能力指数', value: String(profileSub?.ability ?? 0) },
                  { label: '忠诚指数', value: String(profileSub?.loyalty ?? 0) },
                  { label: '廉洁指数', value: String(profileSub?.integrity ?? 0) },
                ].map(row => (
                  <View key={row.label} style={{ flexDirection: 'row', gap: 8, paddingVertical: 3, borderBottomWidth: 1, borderBottomColor: '#1E2D3D' }}>
                    <Text style={{ color: '#6A8AAA', fontSize: 11, width: 72 }}>{row.label}</Text>
                    <Text style={{ color: '#D0D8E8', fontSize: 11, flex: 1 }}>{row.value}</Text>
                  </View>
                ))}
              </View>

              {/* 仕途历程 */}
              <View style={{ backgroundColor: '#1A2535', borderWidth: 1, borderColor: '#2D3A50', padding: 12 }}>
                <Text style={{ color: '#C8A832', fontSize: 11, fontWeight: '700', letterSpacing: 2, marginBottom: 10 }}>🗂️ 仕途历程</Text>
                {profileLoading ? (
                  <ActivityIndicator color="#5588CC" style={{ marginVertical: 16 }} />
                ) : profileResumes.length === 0 ? (
                  <View style={{ alignItems: 'center', paddingVertical: 16 }}>
                    <Text style={{ color: '#5A7A9A', fontSize: 12 }}>暂无仕途记录</Text>
                  </View>
                ) : (
                  <View style={{ gap: 0 }}>
                    {profileResumes.map((r, idx) => (
                      <View key={r.id} style={{ flexDirection: 'row', gap: 10 }}>
                        {/* 时间轴线 */}
                        <View style={{ alignItems: 'center', width: 20 }}>
                          <View style={{ width: 10, height: 10, borderRadius: 5, backgroundColor: idx === 0 ? '#C8A832' : '#3A5A7A', marginTop: 3 }} />
                          {idx < profileResumes.length - 1 && <View style={{ width: 2, flex: 1, backgroundColor: '#2D3A50', marginTop: 2 }} />}
                        </View>
                        {/* 内容 */}
                        <View style={{ flex: 1, paddingBottom: 12 }}>
                          <Text style={{ color: '#F0E8C8', fontSize: 12, fontWeight: '600' }}>{r.position}</Text>
                          <Text style={{ color: '#6A8AAA', fontSize: 10, marginTop: 2 }}>{r.deptName}</Text>
                          <Text style={{ color: '#4A6A8A', fontSize: 9, marginTop: 1 }}>
                            {gameDaysToDate(r.startDay)}{r.endDay ? ` — ${gameDaysToDate(r.endDay)}` : ' — 至今'}
                            {r.note ? `  · ${r.note}` : ''}
                          </Text>
                        </View>
                      </View>
                    ))}
                  </View>
                )}
              </View>
              <View style={{ height: 16 }} />
            </ScrollView>
          </View>
        </View>
      </Modal>

      {/* 顶栏 */}
      <View style={{ backgroundColor: '#1D3B5E', paddingTop: insets.top + 8, paddingBottom: 14, paddingHorizontal: 16 }}>
        <View style={{ flexDirection: 'row', alignItems: 'center' }}>
          <Pressable onPress={() => router.back()} style={{ marginRight: 12 }}>
            <Text style={{ color: '#ccc', fontSize: 22 }}>‹</Text>
          </Pressable>
          <Text style={{ fontSize: 24, marginRight: 8 }}>{cfg.icon}</Text>
          <View>
            <Text style={{ color: '#a0b4cc', fontSize: 10, letterSpacing: 2 }}>{cfg.fullName}</Text>
            <Text style={{ color: '#fff', fontSize: 16, fontWeight: '700', letterSpacing: 1 }}>{deptDisplayName}</Text>
          </View>
        </View>
      </View>

      {feedback ? (
        <View style={{ backgroundColor: '#e8f5e9', borderBottomWidth: 1, borderBottomColor: '#c8e6c9', padding: 10 }}>
          <Text style={{ color: '#2a7a3b', fontSize: 12, fontWeight: '600' }}>{feedback}</Text>
        </View>
      ) : null}

      <ScrollView contentInsetAdjustmentBehavior="automatic" contentContainerStyle={{ padding: 14, gap: 10 }} showsVerticalScrollIndicator={false}>

        {/* 部门简介 */}
        <View style={{ backgroundColor: '#fff', borderWidth: 1, borderColor: '#D1D1D1', padding: 14 }}>
          <Text style={{ fontSize: 11, color: '#1D3B5E', fontWeight: '700', letterSpacing: 2, marginBottom: 8 }}>部门职能</Text>
          <Text style={{ fontSize: 13, color: '#444', lineHeight: 20, marginBottom: 10 }}>{cfg.desc}</Text>
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6 }}>
            {cfg.functions.map((f, i) => (
              <View key={i} style={{ backgroundColor: '#F0F4F8', borderWidth: 1, borderColor: '#D1D1D1', paddingHorizontal: 10, paddingVertical: 4 }}>
                <Text style={{ fontSize: 11, color: '#1D3B5E' }}>{f}</Text>
              </View>
            ))}
          </View>
        </View>

        {/* 当前负责人 / 申请配合 */}
        <View style={{ backgroundColor: '#fff', borderWidth: 1, borderColor: '#D1D1D1', padding: 14 }}>
          <Text style={{ fontSize: 11, color: '#1D3B5E', fontWeight: '700', letterSpacing: 2, marginBottom: 10 }}>
            {canAppoint ? '部门负责人' : '协作关系'}
          </Text>

          {canAppoint ? (
            // 县长及以上：显示已任命负责人或提示任命
            deptChief ? (
              <View style={{ gap: 8 }}>
                <Pressable
                  onPress={() => void openProfile(deptChief)}
                  android_ripple={{ color: 'rgba(29,59,94,0.08)' }}
                  style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}
                >
                  <View style={{ width: 44, height: 44, backgroundColor: '#F0F4F8', alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: '#D1D1D1' }}>
                    <Text style={{ fontSize: 24 }}>{getSubAvatarEmoji(deptChief.avatarId ?? 0, deptChief.gender ?? '男')}</Text>
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={{ fontSize: 14, fontWeight: '700', color: '#222' }}>{deptChief.name}</Text>
                    <Text style={{ fontSize: 11, color: '#888', marginTop: 2 }}>{cfg.headTitle} · {deptChief.gender}</Text>
                    <Text style={{ fontSize: 10, color: '#1D3B5E', marginTop: 1 }}>点击查看档案 →</Text>
                  </View>
                  <View style={{ gap: 4 }}>
                    <Text style={{ fontSize: 10, color: '#555' }}>能力 {deptChief.ability}</Text>
                    <Text style={{ fontSize: 10, color: '#555' }}>廉洁 {deptChief.integrity}</Text>
                  </View>
                </Pressable>
                {/* 自动行动提示 */}
                <View style={{ backgroundColor: '#F0F7E8', borderWidth: 1, borderColor: '#C8E6C9', padding: 8, flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                  <Text style={{ fontSize: 11 }}>⚙️</Text>
                  <Text style={{ fontSize: 11, color: '#2a7a3b', flex: 1 }}>
                    每月自动执行【{cfg.autoActionName}】，效果随能力提升
                  </Text>
                </View>
              </View>
            ) : (
              <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
                <Text style={{ fontSize: 13, color: '#C82829' }}>⚠️ 当前{cfg.headTitle}职位空缺</Text>
                <Pressable onPress={() => router.push('/(app)/subordinates')} style={{ paddingHorizontal: 12, paddingVertical: 6, backgroundColor: '#1D3B5E' }}>
                  <Text style={{ color: '#fff', fontSize: 11 }}>前往任命</Text>
                </Pressable>
              </View>
            )
          ) : (
            // 县长以下：申请配合模式
            <View style={{ gap: 10 }}>
              <View style={{ backgroundColor: '#FFF9E6', borderWidth: 1, borderColor: '#F0C050', padding: 10 }}>
                <Text style={{ fontSize: 11, color: '#7A5C00', lineHeight: 18 }}>
                  您当前级别不具备直接任命{cfg.headTitle}的权力。{'\n'}
                  可通过【申请配合】方式请求该部门给予工作协助，获得相关指数加成。
                </Text>
              </View>
              <Pressable
                onPress={async () => {
                  if (!save) return;
                  const bonus = 4 + (save.rankLevel * 1);
                  await updateGameSave({
                    meritPoints: save.meritPoints + 8,
                    cityGdp: Math.min(100, save.cityGdp + (deptKey === 'ndrc' || deptKey === 'finance' || deptKey === 'agriculture' ? bonus * 0.5 : 0)),
                    cityLivelihood: Math.min(100, save.cityLivelihood + (deptKey === 'education' || deptKey === 'health' || deptKey === 'police' ? bonus * 0.6 : 0)),
                    cityEcology: Math.min(100, save.cityEcology + (deptKey === 'ecology' ? bonus : 0)),
                    cityBusiness: Math.min(100, save.cityBusiness + (deptKey === 'market' ? bonus : 0)),
                    securityIndex: Math.min(100, save.securityIndex + (deptKey === 'police' ? bonus * 0.5 : 0)),
                  });
                  setFeedback(`✓ 已向${deptDisplayName}申请配合，获得协助加成`);
                  setTimeout(() => setFeedback(''), 3000);
                }}
                style={{ backgroundColor: '#1D3B5E', paddingVertical: 10, alignItems: 'center' }}
                android_ripple={{ color: 'rgba(255,255,255,0.15)' }}
              >
                <Text style={{ color: '#fff', fontWeight: '700', fontSize: 13, letterSpacing: 1 }}>
                  申请配合
                </Text>
              </Pressable>
            </View>
          )}
        </View>

        {/* 部门班子成员（副职+科员） */}
        {canAppoint && (deptDeputy || deptStaff.length > 0) && (
          <View style={{ backgroundColor: '#fff', borderWidth: 1, borderColor: '#D1D1D1', padding: 14 }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
              <Text style={{ fontSize: 11, color: '#1D3B5E', fontWeight: '700', letterSpacing: 2 }}>部门班子成员</Text>
              <Text style={{ fontSize: 10, color: '#888' }}>在编 {subordinates.filter(s => s.isAppointed).length}/{staffQuota} 人</Text>
            </View>
            {/* 副职 */}
            {deptDeputy && (
              <Pressable
                onPress={() => void openProfile(deptDeputy)}
                android_ripple={{ color: 'rgba(29,59,94,0.06)' }}
                style={{ flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 6, borderBottomWidth: 1, borderBottomColor: '#F0F0F0' }}
              >
                <View style={{ width: 36, height: 36, backgroundColor: '#F0F4F8', alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: '#D1D1D1' }}>
                  <Text style={{ fontSize: 20 }}>{getSubAvatarEmoji(deptDeputy.avatarId ?? 0, deptDeputy.gender ?? '男')}</Text>
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={{ fontSize: 13, fontWeight: '600', color: '#333' }}>{deptDeputy.name}</Text>
                  <Text style={{ fontSize: 10, color: '#888', marginTop: 1 }}>{cfg.deputyTitle} · {deptDeputy.gender}</Text>
                  <Text style={{ fontSize: 9, color: '#1D3B5E', marginTop: 1 }}>查看档案 →</Text>
                </View>
                <View style={{ alignItems: 'flex-end', gap: 2 }}>
                  <Text style={{ fontSize: 10, color: '#555' }}>能力 {deptDeputy.ability}</Text>
                  <Text style={{ fontSize: 10, color: '#555' }}>廉洁 {deptDeputy.integrity}</Text>
                </View>
              </Pressable>
            )}
            {/* 科员列表 */}
            {deptStaff.map((s, idx) => (
              <Pressable
                key={s.id}
                onPress={() => void openProfile(s)}
                android_ripple={{ color: 'rgba(29,59,94,0.06)' }}
                style={{
                  flexDirection: 'row', alignItems: 'center', gap: 10,
                  paddingVertical: 6,
                  borderBottomWidth: idx < deptStaff.length - 1 ? 1 : 0,
                  borderBottomColor: '#F0F0F0',
                }}
              >
                <View style={{ width: 32, height: 32, backgroundColor: '#F7F7F5', alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: '#E0E0E0' }}>
                  <Text style={{ fontSize: 18 }}>{getSubAvatarEmoji(s.avatarId ?? 0, s.gender ?? '男')}</Text>
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={{ fontSize: 12, fontWeight: '600', color: '#444' }}>{s.name}</Text>
                  <Text style={{ fontSize: 10, color: '#aaa', marginTop: 1 }}>{s.position} · {s.gender}</Text>
                </View>
                <Text style={{ fontSize: 10, color: '#888' }}>能力 {s.ability}</Text>
              </Pressable>
            ))}
            <Pressable
              onPress={() => router.push('/(app)/subordinates')}
              style={{ marginTop: 8, paddingVertical: 7, alignItems: 'center', borderWidth: 1, borderColor: '#1D3B5E' }}
            >
              <Text style={{ fontSize: 11, color: '#1D3B5E', fontWeight: '600' }}>管理人员 →</Text>
            </Pressable>
          </View>
        )}

        {/* 当前影响 */}
        {save && (
          <View style={{ backgroundColor: '#fff', borderWidth: 1, borderColor: '#D1D1D1', padding: 14 }}>
            <Text style={{ fontSize: 11, color: '#1D3B5E', fontWeight: '700', letterSpacing: 2, marginBottom: 10 }}>关联指数</Text>
            {deptKey === 'police' && (
              <>
                <StatBar label="警力储备" value={Math.min(100, save.policeForce)} color="#1D3B5E" />
                <StatBar label="治安指数" value={save.securityIndex} color="#1D3B5E" />
              </>
            )}
            {(deptKey === 'ndrc' || deptKey === 'finance' || deptKey === 'urban' || deptKey === 'agriculture') && (
              <>
                <StatBar label="经济发展" value={save.cityGdp} color="#1D3B5E" />
                <StatBar label="民生满意" value={save.cityLivelihood} color="#1D3B5E" />
              </>
            )}
            {(deptKey === 'education' || deptKey === 'health') && (
              <StatBar label="民生满意度" value={save.cityLivelihood} color="#1D3B5E" />
            )}
            {deptKey === 'ecology' && (
              <StatBar label="生态环境" value={save.cityEcology} color="#2a7a3b" />
            )}
            {deptKey === 'market' && (
              <>
                <StatBar label="营商环境" value={save.cityBusiness} color="#1D3B5E" />
                <StatBar label="民生满意" value={save.cityLivelihood} color="#1D3B5E" />
              </>
            )}
            {deptKey === 'petition' && (
              <>
                <StatBar label="上司满意度" value={save.bossFavor} color="#1D3B5E" />
                <StatBar label="民生满意" value={save.cityLivelihood} color="#1D3B5E" />
              </>
            )}
          </View>
        )}

        {/* 施政行动 */}
        <View style={{ backgroundColor: '#fff', borderWidth: 1, borderColor: '#D1D1D1', padding: 14 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
            <Text style={{ fontSize: 11, color: '#1D3B5E', fontWeight: '700', letterSpacing: 2 }}>施政行动</Text>
            <Pressable
              onPress={() => void handleOnekeyAction()}
              disabled={onekeyLoading || policies.every(a => save.gameDays < (save.deptPolicyCooldowns[`${deptKey}_${a.id}`] ?? 0))}
              style={{ backgroundColor: (onekeyLoading || policies.every(a => save.gameDays < (save.deptPolicyCooldowns[`${deptKey}_${a.id}`] ?? 0))) ? '#ccc' : '#1D2D44', paddingHorizontal: 12, paddingVertical: 6 }}
              android_ripple={{ color: 'rgba(255,255,255,0.15)' }}
            >
              <Text style={{ color: '#fff', fontSize: 11, fontWeight: '700' }}>
                {onekeyLoading ? '执行中…' : '⚡ 一键实施推荐行动'}
              </Text>
            </Pressable>
          </View>
          <View style={{ gap: 10 }}>
            {policies.map(action => {
              const cooldownEndDay = save.deptPolicyCooldowns[`${deptKey}_${action.id}`] ?? 0;
              const done = save.gameDays < cooldownEndDay;
              const remainDays = done ? cooldownEndDay - save.gameDays : 0;
              const fundChange = action.effect.fundBalance ?? 0;
              const taxChange = action.effect.taxRevenue ?? 0;
              return (
                <View key={action.id} style={{ borderWidth: 1, borderColor: done ? '#E0E0E0' : '#D1D1D1', padding: 12, backgroundColor: done ? '#FAFAFA' : '#fff' }}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 }}>
                    <View style={{ flex: 1, flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap', gap: 6 }}>
                      <Text style={{ fontSize: 13, fontWeight: '700', color: done ? '#999' : '#222' }}>{action.title}</Text>
                      {action.tag && (
                        <View style={{ backgroundColor: '#E8F0F8', paddingHorizontal: 6, paddingVertical: 2 }}>
                          <Text style={{ fontSize: 9, color: '#1D3B5E', fontWeight: '600' }}>{action.tag}</Text>
                        </View>
                      )}
                    </View>
                    <Pressable
                      onPress={() => handleExecutePolicy(action)}
                      disabled={done}
                      style={{ paddingHorizontal: 14, paddingVertical: 6, backgroundColor: done ? '#E0E0E0' : '#1D3B5E', marginLeft: 8 }}
                    >
                      <Text style={{ fontSize: 11, color: done ? '#aaa' : '#fff', fontWeight: '700' }}>
                        {done ? `冷却${remainDays}天` : '执行'}
                      </Text>
                    </Pressable>
                  </View>
                  <Text style={{ fontSize: 11, color: '#666', lineHeight: 16, marginBottom: 8 }}>{action.desc}</Text>
                  <View style={{ flexDirection: 'row', flexWrap: 'wrap' }}>
                    {action.effect.cityGdp !== undefined && <EffectTag label="GDP " value={action.effect.cityGdp} />}
                    {action.effect.cityLivelihood !== undefined && <EffectTag label="民生 " value={action.effect.cityLivelihood} />}
                    {action.effect.cityEcology !== undefined && <EffectTag label="生态 " value={action.effect.cityEcology} />}
                    {action.effect.cityBusiness !== undefined && <EffectTag label="营商 " value={action.effect.cityBusiness} />}
                    {action.effect.securityIndex !== undefined && <EffectTag label="治安 " value={action.effect.securityIndex} />}
                    {action.effect.policeForce !== undefined && <EffectTag label="警力 " value={action.effect.policeForce} />}
                    {action.effect.meritPoints !== undefined && <EffectTag label="政绩 " value={action.effect.meritPoints} />}
                    {action.effect.bossFavor !== undefined && <EffectTag label="上司好感 " value={action.effect.bossFavor} />}
                    {fundChange !== 0 && (
                      <View style={{ backgroundColor: fundChange > 0 ? '#e8f5e9' : '#fff3e0', paddingHorizontal: 7, paddingVertical: 2, marginRight: 5, marginBottom: 4 }}>
                        <Text style={{ fontSize: 10, color: fundChange > 0 ? '#2a7a3b' : '#e65100', fontWeight: '600' }}>
                          {fundChange > 0 ? `💰+${fundChange}万` : `💸${fundChange}万`}
                        </Text>
                      </View>
                    )}
                    {taxChange > 0 && (
                      <View style={{ backgroundColor: '#e8f5e9', paddingHorizontal: 7, paddingVertical: 2, marginRight: 5, marginBottom: 4 }}>
                        <Text style={{ fontSize: 10, color: '#2a7a3b', fontWeight: '600' }}>税收+{taxChange}</Text>
                      </View>
                    )}
                  </View>
                </View>
              );
            })}
          </View>
        </View>
        <View style={{ height: 16 }} />

        {/* ===== 人事局：晋升评审面板 ===== */}
        {deptKey === 'personnel' && (
          <View style={{ backgroundColor: '#fff', borderWidth: 1, borderColor: '#D1D1D1', padding: 14 }}>
            <Text style={{ fontSize: 11, color: '#1D3B5E', fontWeight: '700', letterSpacing: 2, marginBottom: 12 }}>年度晋升评审</Text>
            {personnelCandidates.length === 0 ? (
              <View style={{ paddingVertical: 20, alignItems: 'center' }}>
                <Text style={{ fontSize: 28, marginBottom: 8 }}>📋</Text>
                <Text style={{ fontSize: 13, color: '#888' }}>暂无符合晋升条件的干部</Text>
                <Text style={{ fontSize: 11, color: '#aaa', marginTop: 4 }}>条件：能力≥60，经验≥50，未达最高职级</Text>
              </View>
            ) : (
              personnelCandidates.map(sub => (
                <View key={sub.id} style={{ flexDirection: 'row', alignItems: 'center', paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: '#F0F0F0', gap: 10 }}>
                  <View style={{ width: 40, height: 40, backgroundColor: '#F0F4F8', alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: '#D1D1D1' }}>
                    <Text style={{ fontSize: 22 }}>{getSubAvatarEmoji(sub.avatarId ?? 0, sub.gender ?? '男')}</Text>
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={{ fontSize: 13, fontWeight: '700', color: '#222' }}>{sub.name}</Text>
                    <View style={{ flexDirection: 'row', gap: 6, marginTop: 3 }}>
                      <View style={{ backgroundColor: '#e8f0ff', paddingHorizontal: 6, paddingVertical: 2 }}>
                        <Text style={{ fontSize: 10, color: '#1D3B5E' }}>
                          {SUB_LEVEL_NAMES[sub.subLevel]} → {SUB_LEVEL_NAMES[Math.min(12, sub.subLevel + 1)]}
                        </Text>
                      </View>
                      <View style={{ backgroundColor: '#F0F4F8', paddingHorizontal: 6, paddingVertical: 2 }}>
                        <Text style={{ fontSize: 10, color: '#666' }}>能力 {sub.ability}</Text>
                      </View>
                    </View>
                  </View>
                  <Pressable
                    onPress={() => void handlePromote(sub)}
                    disabled={promotingId === sub.id || sub.subLevel >= Math.min(12, save?.rankLevel ?? 12)}
                    style={{ backgroundColor: sub.subLevel >= Math.min(12, save?.rankLevel ?? 12) ? '#ccc' : '#1D3B5E', paddingHorizontal: 14, paddingVertical: 8 }}
                  >
                    <Text style={{ color: '#fff', fontSize: 12, fontWeight: '700' }}>
                      {promotingId === sub.id ? '处理中…' : sub.subLevel >= Math.min(12, save?.rankLevel ?? 12) ? '已达上限' : '批准晋升'}
                    </Text>
                  </Pressable>
                </View>
              ))
            )}
          </View>
        )}

        {/* ===== 招商局：企业名单入口 ===== */}
        {deptKey === 'invest' && (
          <View style={{ backgroundColor: '#fff', borderWidth: 1, borderColor: '#D1D1D1', padding: 14 }}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
              <Text style={{ fontSize: 11, color: '#1D3B5E', fontWeight: '700', letterSpacing: 2 }}>已引进企业</Text>
              <Pressable
                onPress={() => router.push('/(app)/enterprise-list')}
                style={{ backgroundColor: '#1D3B5E', paddingHorizontal: 12, paddingVertical: 6 }}
              >
                <Text style={{ color: '#fff', fontSize: 11 }}>查看全部 ›</Text>
              </Pressable>
            </View>
            {enterprises.length === 0 ? (
              <View style={{ paddingVertical: 20, alignItems: 'center' }}>
                <Text style={{ fontSize: 28, marginBottom: 8 }}>🏢</Text>
                <Text style={{ fontSize: 13, color: '#888' }}>尚未引进任何企业</Text>
                <Text style={{ fontSize: 11, color: '#aaa', marginTop: 4 }}>通过招商行动立即引进企业入驻</Text>
              </View>
            ) : (
              <>
                <View style={{ flexDirection: 'row', backgroundColor: '#F0F4F8', padding: 8, marginBottom: 6 }}>
                  <Text style={{ flex: 2, fontSize: 11, color: '#1D3B5E', fontWeight: '700' }}>企业名称</Text>
                  <Text style={{ flex: 1, fontSize: 11, color: '#1D3B5E', fontWeight: '700', textAlign: 'center' }}>行业</Text>
                  <Text style={{ flex: 1, fontSize: 11, color: '#2a7a3b', fontWeight: '700', textAlign: 'right' }}>月税收</Text>
                </View>
                {enterprises.slice(0, 5).map(ent => (
                  <View key={ent.id} style={{ flexDirection: 'row', paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: '#F5F5F5' }}>
                    <Text style={{ flex: 2, fontSize: 12, color: '#222' }} numberOfLines={1}>{ent.name}</Text>
                    <Text style={{ flex: 1, fontSize: 11, color: '#666', textAlign: 'center' }}>{ent.industry}</Text>
                    <Text style={{ flex: 1, fontSize: 12, color: '#2a7a3b', fontWeight: '600', textAlign: 'right' }}>{ent.taxContribution}万</Text>
                  </View>
                ))}
                {enterprises.length > 5 && (
                  <Text style={{ fontSize: 11, color: '#999', textAlign: 'center', marginTop: 8 }}>共 {enterprises.length} 家企业，点击查看全部</Text>
                )}
                <View style={{ flexDirection: 'row', backgroundColor: '#FFF8E1', padding: 10, marginTop: 10 }}>
                  <Text style={{ flex: 1, fontSize: 12, color: '#7a5c00' }}>月度总税收（所有企业）</Text>
                  <Text style={{ fontSize: 13, color: '#7a5c00', fontWeight: '700' }}>
                    {enterprises.filter(e => e.status === 'operating').reduce((s, e) => s + e.taxContribution, 0)}万元
                  </Text>
                </View>
              </>
            )}
          </View>
        )}

        {/* ===== 税务局：税收概览 ===== */}
        {deptKey === 'tax' && save && (
          <View style={{ backgroundColor: '#fff', borderWidth: 1, borderColor: '#D1D1D1', padding: 14 }}>
            <Text style={{ fontSize: 11, color: '#1D3B5E', fontWeight: '700', letterSpacing: 2, marginBottom: 12 }}>税收情况概览</Text>
            <View style={{ gap: 8 }}>
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: '#F0F0F0' }}>
                <Text style={{ fontSize: 13, color: '#555' }}>当前资金余额</Text>
                <Text style={{ fontSize: 14, color: '#1D3B5E', fontWeight: '700' }}>{save.fundBalance.toFixed(0)} 万元</Text>
              </View>
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: '#F0F0F0' }}>
                <Text style={{ fontSize: 13, color: '#555' }}>城市税率</Text>
                <Text style={{ fontSize: 14, color: '#444', fontWeight: '600' }}>{((save.cityTaxRate ?? 0.12) * 100).toFixed(1)}%</Text>
              </View>
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: '#F0F0F0' }}>
                <Text style={{ fontSize: 13, color: '#555' }}>本年累计税收</Text>
                <Text style={{ fontSize: 14, color: '#2a7a3b', fontWeight: '700' }}>{save.taxRevenue.toFixed(0)} 万元</Text>
              </View>
              <View style={{ backgroundColor: '#F0F8FF', padding: 10, marginTop: 4 }}>
                <Text style={{ fontSize: 11, color: '#1D3B5E', lineHeight: 18 }}>
                  💡 招商局引进更多企业可提高每月税收入账，税收自动计入城市资金余额。
                </Text>
              </View>
            </View>
          </View>
        )}

        {/* ===== 工商局：企业管理面板 ===== */}
        {deptKey === 'market' && save && (
          <View style={{ backgroundColor: '#fff', borderWidth: 1, borderColor: '#D1D1D1', padding: 14 }}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
              <Text style={{ fontSize: 11, color: '#1D3B5E', fontWeight: '700', letterSpacing: 2 }}>企业监管管理</Text>
              <Pressable
                onPress={() => router.push('/(app)/enterprise-list')}
                style={{ backgroundColor: '#1D3B5E', paddingHorizontal: 10, paddingVertical: 5 }}
              >
                <Text style={{ color: '#fff', fontSize: 11 }}>企业名录 ›</Text>
              </Pressable>
            </View>

            {/* 一键优化营商服务 */}
            <View style={{ backgroundColor: '#F0F8F0', borderWidth: 1, borderColor: '#B8DDB8', padding: 12, marginBottom: 12 }}>
              <Text style={{ fontSize: 13, fontWeight: '700', color: '#1a5c2a', marginBottom: 4 }}>🌱 优化营商服务环境</Text>
              <Text style={{ fontSize: 11, color: '#3a7a4a', lineHeight: 16, marginBottom: 8 }}>
                为全市所有运营企业提供政策扶持与服务优化，批量提升企业税收贡献 5~10%。
              </Text>
              <Pressable
                onPress={async () => {
                  if (!save || marketActionLoading) return;
                  setMarketActionLoading('optimize');
                  const pct = await optimizeBusinessService(save.id);
                  if (pct > 0) {
                    getEnterprises(save.id).then(setEnterprises);
                    setFeedback(`✓ 营商服务优化完成！全市企业税收贡献提升 ${pct}%`);
                  } else {
                    setFeedback('暂无可优化的运营企业');
                  }
                  setMarketActionLoading(null);
                  setTimeout(() => setFeedback(''), 3000);
                }}
                disabled={!!marketActionLoading}
                style={{ backgroundColor: marketActionLoading === 'optimize' ? '#aaa' : '#2a7a3b', paddingHorizontal: 16, paddingVertical: 8, alignSelf: 'flex-start' }}
              >
                <Text style={{ color: '#fff', fontSize: 12, fontWeight: '700' }}>
                  {marketActionLoading === 'optimize' ? '处理中…' : '批量优化服务'}
                </Text>
              </Pressable>
            </View>

            {/* 逐企业操作 */}
            {enterprises.length === 0 ? (
              <View style={{ paddingVertical: 16, alignItems: 'center' }}>
                <Text style={{ fontSize: 26, marginBottom: 6 }}>🏢</Text>
                <Text style={{ fontSize: 13, color: '#888' }}>暂无企业数据</Text>
                <Text style={{ fontSize: 11, color: '#aaa', marginTop: 4 }}>由招商局引进企业后可在此管理</Text>
              </View>
            ) : (
              <>
                <Text style={{ fontSize: 11, color: '#666', marginBottom: 8 }}>
                  逐企业操作（共 {enterprises.filter(e => e.status === 'operating').length} 家运营中）
                </Text>
                {enterprises.filter(e => e.status === 'operating').slice(0, 8).map(ent => (
                  <View key={ent.id} style={{ flexDirection: 'row', alignItems: 'center', paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: '#F5F5F5', gap: 8 }}>
                    <View style={{ flex: 1 }}>
                      <Text style={{ fontSize: 12, fontWeight: '700', color: '#222' }} numberOfLines={1}>{ent.name}</Text>
                      <Text style={{ fontSize: 10, color: '#888', marginTop: 2 }}>{ent.industry} · {ent.scale === 'large' ? '大型' : ent.scale === 'medium' ? '中型' : '小型'} · 月税 {ent.taxContribution}万</Text>
                    </View>
                    {/* 专项检查 */}
                    <Pressable
                      onPress={async () => {
                        if (marketActionLoading) return;
                        setMarketActionLoading(`inspect_${ent.id}`);
                        const result = await inspectEnterprise(ent.id);
                        if (result) {
                          getEnterprises(save.id).then(setEnterprises);
                          const sign = result.delta >= 0 ? '+' : '';
                          setFeedback(`📋 ${ent.name} 专项检查完成，税收变化 ${sign}${result.delta}万`);
                        }
                        setMarketActionLoading(null);
                        setTimeout(() => setFeedback(''), 3000);
                      }}
                      disabled={!!marketActionLoading}
                      style={{ backgroundColor: '#1D3B5E', paddingHorizontal: 8, paddingVertical: 5 }}
                    >
                      <Text style={{ color: '#fff', fontSize: 10, fontWeight: '700' }}>检查</Text>
                    </Pressable>
                    {/* 违规整改 */}
                    <Pressable
                      onPress={async () => {
                        if (marketActionLoading) return;
                        setMarketActionLoading(`regulate_${ent.id}`);
                        await regulateEnterprise(ent.id);
                        getEnterprises(save.id).then(setEnterprises);
                        setFeedback(`⚠️ ${ent.name} 已责令整改关停`);
                        setMarketActionLoading(null);
                        setTimeout(() => setFeedback(''), 3000);
                      }}
                      disabled={!!marketActionLoading}
                      style={{ backgroundColor: '#c0392b', paddingHorizontal: 8, paddingVertical: 5 }}
                    >
                      <Text style={{ color: '#fff', fontSize: 10, fontWeight: '700' }}>整改</Text>
                    </Pressable>
                  </View>
                ))}
                {enterprises.filter(e => e.status === 'operating').length > 8 && (
                  <Pressable onPress={() => router.push('/(app)/enterprise-list')}>
                    <Text style={{ fontSize: 11, color: '#1D3B5E', textAlign: 'center', marginTop: 8 }}>查看全部企业 ›</Text>
                  </Pressable>
                )}
              </>
            )}
          </View>
        )}

        {/* ===== 信访办：信访事件面板 ===== */}
        {deptKey === 'petition' && save && (
          <View style={{ backgroundColor: '#fff', borderWidth: 1, borderColor: '#D1D1D1', padding: 14 }}>
            <Text style={{ fontSize: 11, color: '#1D3B5E', fontWeight: '700', letterSpacing: 2, marginBottom: 12 }}>
              📮 信访事件处理
            </Text>

            {/* 统计概览 */}
            <View style={{ flexDirection: 'row', gap: 8, marginBottom: 12 }}>
              <View style={{ flex: 1, backgroundColor: '#FFF3F3', borderWidth: 1, borderColor: '#FFCCCC', padding: 10, alignItems: 'center' }}>
                <Text style={{ fontSize: 20, fontWeight: '700', color: '#c0392b' }}>
                  {petitionEvents.filter(e => e.eventType === 'complaint' && !e.isProcessed).length}
                </Text>
                <Text style={{ fontSize: 10, color: '#888', marginTop: 2 }}>待处理投诉</Text>
              </View>
              <View style={{ flex: 1, backgroundColor: '#F0FFF0', borderWidth: 1, borderColor: '#B8DDB8', padding: 10, alignItems: 'center' }}>
                <Text style={{ fontSize: 20, fontWeight: '700', color: '#2a7a3b' }}>
                  {petitionEvents.filter(e => e.eventType === 'praise' && !e.isProcessed).length}
                </Text>
                <Text style={{ fontSize: 10, color: '#888', marginTop: 2 }}>待阅示好评</Text>
              </View>
              <View style={{ flex: 1, backgroundColor: '#F0F4F8', borderWidth: 1, borderColor: '#D1D1D1', padding: 10, alignItems: 'center' }}>
                <Text style={{ fontSize: 20, fontWeight: '700', color: '#1D3B5E' }}>
                  {petitionEvents.filter(e => e.isProcessed).length}
                </Text>
                <Text style={{ fontSize: 10, color: '#888', marginTop: 2 }}>已处理</Text>
              </View>
            </View>

            {petitionEvents.length === 0 ? (
              <View style={{ paddingVertical: 24, alignItems: 'center' }}>
                <Text style={{ fontSize: 32, marginBottom: 8 }}>📬</Text>
                <Text style={{ fontSize: 13, color: '#888' }}>暂无信访事件</Text>
                <Text style={{ fontSize: 11, color: '#aaa', marginTop: 4 }}>每月约有30%概率产生信访事件</Text>
              </View>
            ) : (
              <View style={{ gap: 10 }}>
                {petitionEvents.map(event => {
                  const isComplaint = event.eventType === 'complaint';
                  const processed = event.isProcessed;
                  return (
                    <View
                      key={event.id}
                      style={{
                        borderWidth: 1,
                        borderColor: processed ? '#E0E0E0' : isComplaint ? '#FFCCCC' : '#B8DDB8',
                        backgroundColor: processed ? '#FAFAFA' : isComplaint ? '#FFF8F8' : '#F8FFF8',
                        padding: 12,
                      }}
                    >
                      <View style={{ flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between', gap: 8 }}>
                        <View style={{ flex: 1 }}>
                          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 4 }}>
                            <View style={{
                              paddingHorizontal: 6, paddingVertical: 2,
                              backgroundColor: isComplaint ? '#c0392b' : '#2a7a3b',
                            }}>
                              <Text style={{ fontSize: 9, color: '#fff', fontWeight: '700' }}>
                                {isComplaint ? '投诉' : '表扬'}
                              </Text>
                            </View>
                            <Text style={{ fontSize: 12, fontWeight: '700', color: processed ? '#999' : '#222' }} numberOfLines={1}>
                              {event.title}
                            </Text>
                          </View>
                          <Text style={{ fontSize: 11, color: '#666', lineHeight: 16 }} numberOfLines={3}>
                            {event.content}
                          </Text>
                          <View style={{ flexDirection: 'row', gap: 10, marginTop: 6 }}>
                            <Text style={{ fontSize: 10, color: isComplaint ? '#c0392b' : '#2a7a3b' }}>
                              上司好感 {event.bosFavorDelta > 0 ? '+' : ''}{event.bosFavorDelta}
                            </Text>
                            <Text style={{ fontSize: 10, color: isComplaint ? '#c0392b' : '#2a7a3b' }}>
                              政绩 {event.meritDelta > 0 ? '+' : ''}{event.meritDelta}
                            </Text>
                          </View>
                        </View>
                        {!processed && (
                          <Pressable
                            onPress={async () => {
                              const result = await processPetitionEvent(event.id);
                              if (result && save) {
                                setPetitionEvents(prev => prev.map(e => e.id === event.id ? { ...e, isProcessed: true } : e));
                                const updates: Parameters<typeof updateGameSave>[0] = {
                                  bossFavor: Math.max(0, Math.min(100, save.bossFavor + result.bosFavorDelta)),
                                  meritPoints: save.meritPoints + result.meritDelta,
                                };
                                await updateGameSave(updates);
                                const sign = result.meritDelta >= 0 ? '+' : '';
                                setFeedback(`✓ 已处理 "${event.title}"，政绩 ${sign}${result.meritDelta}，上司好感 ${result.bosFavorDelta > 0 ? '+' : ''}${result.bosFavorDelta}`);
                                setTimeout(() => setFeedback(''), 3500);
                              }
                            }}
                            style={{ backgroundColor: '#1D3B5E', paddingHorizontal: 12, paddingVertical: 8, justifyContent: 'center' }}
                          >
                            <Text style={{ color: '#fff', fontSize: 11, fontWeight: '700' }}>
                              {isComplaint ? '处理' : '阅示'}
                            </Text>
                          </Pressable>
                        )}
                        {processed && (
                          <View style={{ backgroundColor: '#E0E0E0', paddingHorizontal: 10, paddingVertical: 8, justifyContent: 'center' }}>
                            <Text style={{ color: '#aaa', fontSize: 11 }}>已完成</Text>
                          </View>
                        )}
                      </View>
                    </View>
                  );
                })}
              </View>
            )}

            <View style={{ backgroundColor: '#FFF8E1', padding: 10, marginTop: 12 }}>
              <Text style={{ fontSize: 11, color: '#7a5c00', lineHeight: 17 }}>
                💡 信访事件每月约30%概率自动产生。及时处理可获政绩加成，投诉若不处理将持续消耗上司满意度。
              </Text>
            </View>
          </View>
        )}

        {/* ===== 组织部：一键考评 + 正职任命面板 ===== */}
        {deptKey === 'organization' && save && (
          <View style={{ backgroundColor: '#fff', borderWidth: 1, borderColor: '#D1D1D1', padding: 14 }}>
            <Text style={{ fontSize: 11, color: '#1D3B5E', fontWeight: '700', letterSpacing: 2, marginBottom: 12 }}>干部考评与任命</Text>

            {/* 一键考评按钮 */}
            <Pressable
              onPress={() => void handleOrgBatchAssess()}
              disabled={onekeyLoading}
              style={{ backgroundColor: onekeyLoading ? '#ccc' : '#C82829', padding: 13, alignItems: 'center', marginBottom: 14 }}
              android_ripple={{ color: 'rgba(255,255,255,0.2)' }}
            >
              <Text style={{ color: '#fff', fontWeight: '700', fontSize: 13 }}>
                {onekeyLoading ? '考评中…' : '📋 一键考评所有在岗干部'}
              </Text>
              <Text style={{ color: '#ffcdd2', fontSize: 10, marginTop: 3 }}>
                对所有在岗下属实施综合考核，能力/忠诚/经验随机浮动
              </Text>
            </Pressable>

            {/* 部门正职任命状态 */}
            <Text style={{ fontSize: 11, color: '#888', marginBottom: 8 }}>本部门任职情况</Text>
            {subordinates.length === 0 ? (
              <View style={{ paddingVertical: 16, alignItems: 'center' }}>
                <Text style={{ fontSize: 28, marginBottom: 6 }}>🏛️</Text>
                <Text style={{ fontSize: 13, color: '#888' }}>暂无人员任职组织部</Text>
                <Text style={{ fontSize: 11, color: '#aaa', marginTop: 4 }}>请在下属管理中任命组织部正职</Text>
              </View>
            ) : (
              subordinates.map(sub => {
                const posLabel = sub.deptPosition === 'head' ? '部长（正职）' : sub.deptPosition === 'deputy' ? '副部长（副职）' : '科员';
                const tagColor = sub.deptPosition === 'head' ? '#C82829' : sub.deptPosition === 'deputy' ? '#1D2D44' : '#888';
                return (
                  <View key={sub.id} style={{ flexDirection: 'row', alignItems: 'center', paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: '#F0F0F0', gap: 10 }}>
                    <View style={{ width: 40, height: 40, backgroundColor: '#F0F4F8', alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: '#D1D1D1' }}>
                      <Text style={{ fontSize: 22 }}>{getSubAvatarEmoji(sub.avatarId ?? 0, sub.gender ?? '男')}</Text>
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={{ fontSize: 13, fontWeight: '700', color: '#222' }}>{sub.name}</Text>
                      <View style={{ flexDirection: 'row', gap: 6, marginTop: 3 }}>
                        <View style={{ backgroundColor: tagColor + '22', borderWidth: 1, borderColor: tagColor, paddingHorizontal: 6, paddingVertical: 2 }}>
                          <Text style={{ fontSize: 9, color: tagColor, fontWeight: '700' }}>{posLabel}</Text>
                        </View>
                        <View style={{ backgroundColor: '#F0F4F8', paddingHorizontal: 6, paddingVertical: 2 }}>
                          <Text style={{ fontSize: 10, color: '#666' }}>能力 {sub.ability}</Text>
                        </View>
                        <View style={{ backgroundColor: '#F0F4F8', paddingHorizontal: 6, paddingVertical: 2 }}>
                          <Text style={{ fontSize: 10, color: '#666' }}>忠诚 {sub.loyalty}</Text>
                        </View>
                      </View>
                    </View>
                  </View>
                );
              })
            )}

            <View style={{ backgroundColor: '#EEF2F7', padding: 10, marginTop: 12 }}>
              <Text style={{ fontSize: 11, color: '#1D2D44', lineHeight: 17 }}>
                💡 组织部负责全市干部考评与任用工作。一键考评将对所有在岗下属进行综合测评，影响其能力、忠诚与经验值。正职任命请在「下属管理」页面操作。
              </Text>
            </View>
          </View>
        )}

        <View style={{ height: 32 }} />
      </ScrollView>
    </View>
  );
}
