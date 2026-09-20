// 月度工作报告 + 年度KPI设定与考核 + 述职报告（关联职位职能动态化）
import { useCallback, useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, Text, TextInput, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { useRouter, useFocusEffect } from 'expo-router';
import { useGame } from '@/ctx/GameContext';
import { getAllReports, markReportsRead } from '@/db/gameApi';
import type { MonthlyReport } from '@/types/game';
import { RANK_CONFIG } from '@/types/game';

type Tab = 'reports' | 'kpi' | 'debrief';

const DEPT_LABELS: Record<string, string> = {
  police: '公安局', ndrc: '发改委', finance: '财政局',
  urban: '住建局', education: '教育局', health: '卫健委',
  ecology: '生态局', market: '市监局', agriculture: '农业局',
};

// ── 述职报告：根据职位职能动态生成内容结构 ──────────────────────
interface DebriefSection {
  title: string;
  items: string[];
  icon: string;
  color: string;
}

function getDebriefSections(rankLevel: number, rankName: string, cityName: string, save: {
  cityGdp: number; cityLivelihood: number; cityEcology: number; cityBusiness: number;
  meritPoints: number; gameDays: number; tenureYears?: number;
}): DebriefSection[] {
  const year = Math.floor(save.gameDays / 365);
  const tenureYrs = save.tenureYears ?? year;

  // 低级别（乡镇/县级）
  if (rankLevel <= 3) {
    return [
      {
        icon: '📋', color: '#2B4B6F', title: '基本情况',
        items: [
          `本人担任${rankName}以来，已任职满${tenureYrs}年`,
          `负责辖区${cityName}基层治理、党建工作及为民服务`,
          `在上级党委政府正确领导下，圆满完成各项目标任务`,
        ],
      },
      {
        icon: '🏗️', color: '#2a7a3b', title: '主要工作完成情况',
        items: [
          `扎实推进乡村振兴，辖区农业基础设施进一步完善`,
          `开展矛盾纠纷调解工作，有效化解基层信访问题`,
          `完成上级下达的各项社会治安综合治理任务`,
          `切实推进"放管服"改革，提升基层服务群众效能`,
        ],
      },
      {
        icon: '📊', color: '#7B5E2A', title: '主要指标完成情况',
        items: [
          `GDP贡献指数：${save.cityGdp.toFixed(1)}（${save.cityGdp >= 60 ? '达标' : '需加强'}）`,
          `民生满意度：${save.cityLivelihood.toFixed(1)}（${save.cityLivelihood >= 65 ? '群众满意' : '有待提升'}）`,
          `信访诉求处结率：95%以上`,
        ],
      },
      {
        icon: '🔍', color: '#C82829', title: '存在问题与不足',
        items: [
          '基层治理资源有限，部分项目推进进度有待加快',
          '干部队伍建设需进一步强化，个别同志能力尚显不足',
        ],
      },
      {
        icon: '🎯', color: '#2B4B6F', title: '下一步工作打算',
        items: [
          '持续聚焦基层减负，优化行政流程，提高办事效率',
          '强化党建引领，带动辖区经济社会高质量发展',
        ],
      },
    ];
  }

  // 县级干部（rank 4-6）
  if (rankLevel <= 6) {
    return [
      {
        icon: '📋', color: '#2B4B6F', title: '个人基本情况',
        items: [
          `现任${rankName}，在${cityName}任职`,
          `累计任职年限：${tenureYrs}年，工作勤勉、恪尽职守`,
          `政绩分值：${save.meritPoints} 点，综合表现良好`,
        ],
      },
      {
        icon: '💰', color: '#2a7a3b', title: '经济发展成效',
        items: [
          `辖区GDP指数：${save.cityGdp.toFixed(1)}，同比稳中有升`,
          `成功引进重点项目${Math.floor(save.meritPoints / 80)}个，推动县域经济提质增效`,
          `营商环境指数：${save.cityBusiness.toFixed(1)}，持续优化政务服务`,
        ],
      },
      {
        icon: '❤️', color: '#C82829', title: '民生保障工作',
        items: [
          `民生满意度达：${save.cityLivelihood.toFixed(1)}，基本民生得到有效保障`,
          `持续推进教育、医疗、住房等社会事业发展`,
          `切实解决群众急难愁盼问题，信访工作平稳有序`,
        ],
      },
      {
        icon: '🌿', color: '#2a7a3b', title: '生态文明建设',
        items: [
          `生态环境指数：${save.cityEcology.toFixed(1)}，持续改善人居环境`,
          `完成年度节能减排和环境保护目标任务`,
        ],
      },
      {
        icon: '🎯', color: '#7B5E2A', title: '下步工作重点',
        items: [
          '坚持党的全面领导，深入贯彻新发展理念',
          '以高质量发展为主线，推动县域综合实力持续提升',
          '着力保障改善民生，不断增强群众获得感幸福感',
        ],
      },
    ];
  }

  // 市级干部（rank 7-9）
  if (rankLevel <= 9) {
    return [
      {
        icon: '📋', color: '#2B4B6F', title: '任职基本情况',
        items: [
          `现任${rankName}，主政${cityName}`,
          `履职以来，全面统筹经济社会发展各项工作`,
          `政绩积分：${save.meritPoints} 点，综合施政效果显著`,
        ],
      },
      {
        icon: '📈', color: '#2a7a3b', title: '经济发展主要成效',
        items: [
          `全市GDP综合指数：${save.cityGdp.toFixed(1)}，经济保持平稳增长`,
          `招商引资项目${Math.floor(save.meritPoints / 60)}个，实际到位资金持续增长`,
          `营商环境指数：${save.cityBusiness.toFixed(1)}，政务服务效能持续提升`,
          `推进重大基础设施项目建设，城市综合承载力明显增强`,
        ],
      },
      {
        icon: '🏛️', color: '#C82829', title: '社会治理工作',
        items: [
          `民生满意度综合评价：${save.cityLivelihood.toFixed(1)}`,
          '深化"放管服"改革，持续优化营商环境',
          '健全基层治理体系，维护社会大局稳定',
          `信访积案化解率：${Math.min(100, Math.floor(save.cityLivelihood))}%`,
        ],
      },
      {
        icon: '🌿', color: '#2a7a3b', title: '生态环保成效',
        items: [
          `生态环境指数：${save.cityEcology.toFixed(1)}`,
          '统筹推进山水林田湖草一体化保护治理',
          '全面落实河长制、林长制，生态质量持续向好',
        ],
      },
      {
        icon: '⚠️', color: '#7B5E2A', title: '存在问题与下步举措',
        items: [
          '部分领域发展不平衡不充分问题仍较突出',
          '将聚焦重点难点，持续发力补短板强弱项',
          '以高质量发展统领全局，奋力开创新局面',
        ],
      },
    ];
  }

  // 省级干部（rank 10-11）
  if (rankLevel <= 11) {
    return [
      {
        icon: '📋', color: '#2B4B6F', title: '履职情况综述',
        items: [
          `现任${rankName}，主政${cityName}`,
          `全面贯彻党中央决策部署，统筹全省（区）发展大局`,
          `政绩积分：${save.meritPoints} 点`,
        ],
      },
      {
        icon: '📈', color: '#2a7a3b', title: '经济社会发展成效',
        items: [
          `全省GDP综合指数：${save.cityGdp.toFixed(1)}，位次持续提升`,
          `实施重大战略项目${Math.floor(save.meritPoints / 50)}项`,
          `营商环境指数：${save.cityBusiness.toFixed(1)}，跻身全国前列`,
          `新兴产业集群加速壮大，创新驱动态势明显`,
        ],
      },
      {
        icon: '🤝', color: '#C82829', title: '政治生态与党建工作',
        items: [
          '坚定不移推进全面从严治党，风清气正的政治生态加快形成',
          '深化干部队伍建设，选拔任用政治过硬、能力突出的干部',
          '持续推进省级机构改革，推动行政效能进一步提升',
        ],
      },
      {
        icon: '🌿', color: '#2a7a3b', title: '绿色发展与民生保障',
        items: [
          `生态指数：${save.cityEcology.toFixed(1)}，绿色转型步伐加快`,
          `民生满意度：${save.cityLivelihood.toFixed(1)}，群众幸福感持续增强`,
          '教育、医疗、养老等民生事业全面加强',
        ],
      },
      {
        icon: '🎯', color: '#2B4B6F', title: '下步工作思路',
        items: [
          '深入落实党中央战略部署，以改革创新推动高质量发展',
          '加快构建现代化产业体系，提升区域竞争力',
          '全面推进共同富裕，让发展成果更多惠及人民群众',
        ],
      },
    ];
  }

  // 国家级（rank 12-14）
  if (rankLevel === 13) {
    // 国政院副院理
    return [
      {
        icon: '🏛️', color: '#7B0026', title: '履职情况报告',
        items: [
          `现任国政院副院理，分管${cityName}方向重点工作`,
          '协助总理处理日常行政事务，统筹分管领域政策执行',
          `政绩积分：${save.meritPoints} 点，任职以来各项工作稳步推进`,
        ],
      },
      {
        icon: '📈', color: '#2a7a3b', title: '分管领域执行情况',
        items: [
          `统筹推进分管经济领域，综合指数：${save.cityGdp.toFixed(1)}`,
          `主导召开联席协调会议 ${Math.floor(save.meritPoints / 60)} 次，推进政策落实`,
          '加强与各部委沟通衔接，推动重大项目按期落地',
          `营商环境指数：${save.cityBusiness.toFixed(1)}，持续优化政务服务`,
        ],
      },
      {
        icon: '⚖️', color: '#2B4B6F', title: '政治建设情况',
        items: [
          '坚决执行党中央和国政院决策部署，确保政令畅通',
          '扎实开展调研工作，掌握分管领域真实情况',
          '推进干部队伍建设，选用廉洁高效的领导班子',
        ],
      },
      {
        icon: '🌿', color: '#1a5c2e', title: '民生与社会工作',
        items: [
          `民生满意度：${save.cityLivelihood.toFixed(1)}，惠民政策持续加力`,
          `生态指数：${save.cityEcology.toFixed(1)}，绿色发展稳步推进`,
          '关注重点群体，推进基本公共服务均等化',
        ],
      },
      {
        icon: '🎯', color: '#7B0026', title: '下一阶段工作安排',
        items: [
          '持续深化分管领域改革，破除制度性障碍',
          '强化部际协调联动，形成政策合力',
          '做好重大决策风险评估，确保政策平稳实施',
        ],
      },
    ];
  }
  if (rankLevel >= 14) {
    // 国政院院理
    return [
      {
        icon: '🏛️', color: '#C82829', title: '国政院院理工作报告',
        items: [
          '本人主持国政院全面工作，统领行政系统运转',
          '党中央重大决策部署得到有力执行，国家治理效能持续提升',
          `综合政绩积分：${save.meritPoints} 点，各项工作总体达到预期目标`,
        ],
      },
      {
        icon: '📈', color: '#2a7a3b', title: '宏观经济与发展战略',
        items: [
          `全国GDP综合指数：${save.cityGdp.toFixed(1)}，经济运行保持稳中向好态势`,
          `主持推进重大国家战略 ${Math.floor(save.meritPoints / 40)} 项，新发展格局加快构建`,
          '深化供给侧结构性改革，产业结构持续优化升级',
          `营商环境指数：${save.cityBusiness.toFixed(1)}，高水平对外开放格局深入推进`,
        ],
      },
      {
        icon: '🤝', color: '#2B4B6F', title: '政府职能转变与施政',
        items: [
          '推进国政院机构改革，行政效能和服务水平大幅提升',
          `主持召开国政院常务会议 ${Math.floor(save.gameDays / 14)} 次，研究部署重大事项`,
          '持续推进"放管服"改革，市场准入壁垒有效降低',
          '加强预算管理，财政资金使用效率明显提高',
        ],
      },
      {
        icon: '🌿', color: '#1a5c2e', title: '民生保障与社会治理',
        items: [
          `全国民生满意度：${save.cityLivelihood.toFixed(1)}，共同富裕取得积极进展`,
          `生态文明建设指数：${save.cityEcology.toFixed(1)}，美丽中国建设稳步推进`,
          '教育、医疗、养老、住房等民生领域投入持续加大',
          '社会治理体系和治理能力现代化水平全面提升',
        ],
      },
      {
        icon: '🌐', color: '#7B5E2A', title: '国际经济合作与外交配合',
        items: [
          '积极参与全球治理，推动构建开放型世界经济',
          '深化"一带一路"务实合作，国际经济联系更加紧密',
          '妥善应对国际经济环境变化，维护国家发展利益',
        ],
      },
      {
        icon: '🎯', color: '#C82829', title: '下一步施政重点',
        items: [
          '坚持以中国式现代化全面推进强国建设、民族复兴伟业',
          '持续深化重点领域改革，破除高质量发展体制机制障碍',
          '加强政府自身建设，打造廉洁高效的人民政府',
          '统筹发展与安全，确保国家各项事业沿正确方向前进',
        ],
      },
    ];
  }
  // 国政院部长/委主任（rank 12）
  return [
    {
      icon: '🏛️', color: '#2B4B6F', title: '履职情况报告',
      items: [
        `现任${rankName}，全面负责本部委工作`,
        `全面贯彻执行党中央重大决策部署`,
        `政绩积分：${save.meritPoints} 点，履职尽责，成效显著`,
      ],
    },
    {
      icon: '📈', color: '#2a7a3b', title: '国家战略执行情况',
      items: [
        `统筹全国经济社会发展大局，GDP综合指数：${save.cityGdp.toFixed(1)}`,
        `牵头推进重大国家战略${Math.floor(save.meritPoints / 40)}项`,
        `统筹推进高质量发展、高水平安全，新发展格局加快构建`,
        `深化供给侧结构性改革，国家综合实力持续增强`,
      ],
    },
    {
      icon: '⚖️', color: '#C82829', title: '治国理政主要成果',
      items: [
        '持续深化党和国家机构改革，治理效能全面提升',
        `民生满意度：${save.cityLivelihood.toFixed(1)}，共同富裕取得积极进展`,
        `生态文明建设指数：${save.cityEcology.toFixed(1)}，美丽中国建设稳步推进`,
        '依法治国全面推进，社会主义法治体系不断完善',
      ],
    },
    {
      icon: '🌐', color: '#7B5E2A', title: '国际形势应对',
      items: [
        '坚定维护国家主权、安全和发展利益',
        '统筹国内国际两个大局，推动构建人类命运共同体',
        `营商环境指数：${save.cityBusiness.toFixed(1)}，高水平对外开放纵深推进`,
      ],
    },
    {
      icon: '🎯', color: '#2B4B6F', title: '新时期工作展望',
      items: [
        '坚持以中国式现代化全面推进强国建设、民族复兴',
        '持续深化改革，破除制约高质量发展的体制机制障碍',
        '加强党的建设，推动党在新时代新征程上赢得更大胜利',
      ],
    },
  ];
}

export default function MonthlyReportScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { save, updateGameSave } = useGame();
  const [tab, setTab] = useState<Tab>('reports');
  const [reports, setReports] = useState<MonthlyReport[]>([]);
  const [loading, setLoading] = useState(true);

  // KPI编辑
  const [kpiGdp, setKpiGdp] = useState('');
  const [kpiLivelihood, setKpiLivelihood] = useState('');
  const [kpiEcology, setKpiEcology] = useState('');
  const [kpiBusiness, setKpiBusiness] = useState('');
  const [kpiSaved, setKpiSaved] = useState(false);
  // 述职报告打印态
  const [debriefPrinted, setDebriefPrinted] = useState(false);

  useFocusEffect(
    useCallback(() => {
      if (!save) return;
      setLoading(true);
      // 初始化KPI表单
      setKpiGdp(String(save.kpiGdpTarget || Math.round(save.cityGdp + 5)));
      setKpiLivelihood(String(save.kpiLivelihoodTarget || Math.round(save.cityLivelihood + 5)));
      setKpiEcology(String(save.kpiEcologyTarget || Math.round(save.cityEcology + 5)));
      setKpiBusiness(String(save.kpiBusinessTarget || Math.round(save.cityBusiness + 5)));
      setDebriefPrinted(false);

      getAllReports(save.id).then(data => {
        setReports(data);
        // 标记当月已读
        const monthKey = Math.floor(save.gameDays / 30);
        markReportsRead(save.id, monthKey);
        setLoading(false);
      });
    }, [save])
  );

  const handleSaveKpi = async () => {
    if (!save) return;
    const yr = Math.floor(save.gameDays / 365);
    await updateGameSave({
      kpiGdpTarget: Number(kpiGdp) || 0,
      kpiLivelihoodTarget: Number(kpiLivelihood) || 0,
      kpiEcologyTarget: Number(kpiEcology) || 0,
      kpiBusinessTarget: Number(kpiBusiness) || 0,
      kpiYear: yr,
    });
    setKpiSaved(true);
    setTimeout(() => setKpiSaved(false), 2500);
  };

  if (!save) return null;

  const currentYear = Math.floor(save.gameDays / 365);
  const kpiYear = save.kpiYear ?? 0;
  const kpiSet = kpiYear === currentYear && save.kpiGdpTarget > 0;

  // KPI完成情况
  const kpiResults = [
    { label: 'GDP指数', current: save.cityGdp, target: save.kpiGdpTarget, icon: '📈' },
    { label: '民生满意度', current: save.cityLivelihood, target: save.kpiLivelihoodTarget, icon: '❤️' },
    { label: '生态环境', current: save.cityEcology, target: save.kpiEcologyTarget, icon: '🌿' },
    { label: '营商环境', current: save.cityBusiness, target: save.kpiBusinessTarget, icon: '⚖️' },
  ];

  // 述职报告动态内容
  const rankCfg = RANK_CONFIG[save.rankLevel];
  const debriefSections = getDebriefSections(save.rankLevel, save.rankName, save.cityName, {
    cityGdp: save.cityGdp,
    cityLivelihood: save.cityLivelihood,
    cityEcology: save.cityEcology,
    cityBusiness: save.cityBusiness,
    meritPoints: save.meritPoints,
    gameDays: save.gameDays,
  });
  const debriefTitle = `${save.rankName}述职报告`;
  const debriefSubtitle = `${rankCfg?.department ?? '人民政府'} · ${save.cityName}`;

  return (
    <View style={{ flex: 1, backgroundColor: '#F5F4F1' }}>
      <StatusBar style="light" backgroundColor="#1D3B5E" />

      {/* 顶栏 */}
      <View style={{ backgroundColor: '#2B4B6F', paddingTop: insets.top + 8, paddingBottom: 14, paddingHorizontal: 16 }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 10 }}>
          <Pressable onPress={() => router.back()} style={{ marginRight: 4 }}>
            <Text style={{ color: '#ccc', fontSize: 22 }}>‹</Text>
          </Pressable>
          <View style={{ flex: 1 }}>
            <Text style={{ color: '#a0b4cc', fontSize: 10, letterSpacing: 2 }}>第 {currentYear} 年</Text>
            <Text style={{ color: '#fff', fontSize: 16, fontWeight: '700', letterSpacing: 1 }}>工作报告与述职</Text>
          </View>
          <View style={{ alignItems: 'flex-end' }}>
            <Text style={{ color: '#a0b4cc', fontSize: 10 }}>{save.rankName}</Text>
            <Text style={{ color: '#fff', fontSize: 11, fontWeight: '600', marginTop: 1 }}>{save.cityName}</Text>
          </View>
        </View>
        {/* Tab */}
        <View style={{ flexDirection: 'row', borderWidth: 1, borderColor: 'rgba(255,255,255,0.2)', overflow: 'hidden' }}>
          {([
            ['reports', '月度报告'],
            ['kpi',     '年度KPI'],
            ['debrief', '述职报告'],
          ] as [Tab, string][]).map(([key, label]) => (
            <Pressable
              key={key}
              onPress={() => setTab(key)}
              style={{ flex: 1, paddingVertical: 8, alignItems: 'center', backgroundColor: tab === key ? '#C82829' : 'transparent' }}
            >
              <Text style={{ color: '#fff', fontSize: 11, fontWeight: tab === key ? '700' : '400' }}>{label}</Text>
            </Pressable>
          ))}
        </View>
      </View>

      {loading ? (
        <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
          <ActivityIndicator size="large" color="#1D3B5E" />
        </View>
      ) : (
        <ScrollView contentInsetAdjustmentBehavior="automatic" contentContainerStyle={{ padding: 14, gap: 12 }}>

          {/* ============ 月度工作报告 ============ */}
          {tab === 'reports' && (
            <>
              {reports.length === 0 ? (
                <View style={{ alignItems: 'center', padding: 40 }}>
                  <Text style={{ fontSize: 32, marginBottom: 12 }}>📋</Text>
                  <Text style={{ fontSize: 14, color: '#888', textAlign: 'center' }}>暂无工作报告</Text>
                  <Text style={{ fontSize: 12, color: '#aaa', marginTop: 6, textAlign: 'center' }}>每月推进时间后，各职能部门将自动提交月度报告</Text>
                </View>
              ) : reports.map(r => {
                const deptLabel = DEPT_LABELS[r.deptKey] ?? r.deptKey;
                const hasEffect = r.gdpChange > 0 || r.livelihoodChange > 0 || r.ecologyChange > 0 || r.businessChange > 0;
                return (
                  <View key={r.id} style={{ backgroundColor: '#fff', borderWidth: 1, borderColor: r.isRead ? '#E0E0E0' : '#2196F3', padding: 14 }}>
                    {!r.isRead && (
                      <View style={{ position: 'absolute', top: 10, right: 10, backgroundColor: '#C82829', paddingHorizontal: 6, paddingVertical: 2 }}>
                        <Text style={{ color: '#fff', fontSize: 9, fontWeight: '700' }}>新</Text>
                      </View>
                    )}
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 6 }}>
                      <View style={{ backgroundColor: '#F0F4F8', paddingHorizontal: 8, paddingVertical: 3, borderWidth: 1, borderColor: '#D1D1D1' }}>
                        <Text style={{ fontSize: 10, color: '#2B4B6F', fontWeight: '600' }}>{deptLabel}</Text>
                      </View>
                      <Text style={{ fontSize: 10, color: '#aaa' }}>第{r.monthKey}个月</Text>
                    </View>
                    <Text style={{ fontSize: 13, fontWeight: '700', color: '#2B4B6F', marginBottom: 6 }}>{r.title}</Text>
                    <Text style={{ fontSize: 12, color: '#555', lineHeight: 18, marginBottom: 8 }}>{r.content}</Text>
                    {hasEffect && (
                      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6 }}>
                        {r.gdpChange > 0 && <View style={{ backgroundColor: '#e8f5e9', paddingHorizontal: 8, paddingVertical: 3 }}><Text style={{ fontSize: 10, color: '#2a7a3b' }}>GDP +{r.gdpChange.toFixed(1)}</Text></View>}
                        {r.livelihoodChange > 0 && <View style={{ backgroundColor: '#e8f5e9', paddingHorizontal: 8, paddingVertical: 3 }}><Text style={{ fontSize: 10, color: '#2a7a3b' }}>民生 +{r.livelihoodChange.toFixed(1)}</Text></View>}
                        {r.ecologyChange > 0 && <View style={{ backgroundColor: '#e8f5e9', paddingHorizontal: 8, paddingVertical: 3 }}><Text style={{ fontSize: 10, color: '#2a7a3b' }}>生态 +{r.ecologyChange.toFixed(1)}</Text></View>}
                        {r.businessChange > 0 && <View style={{ backgroundColor: '#e8f5e9', paddingHorizontal: 8, paddingVertical: 3 }}><Text style={{ fontSize: 10, color: '#2a7a3b' }}>营商 +{r.businessChange.toFixed(1)}</Text></View>}
                        <View style={{ backgroundColor: '#FFF9E6', paddingHorizontal: 8, paddingVertical: 3 }}><Text style={{ fontSize: 10, color: '#7A5C00' }}>政绩 +{r.meritReward}</Text></View>
                      </View>
                    )}
                  </View>
                );
              })}
            </>
          )}

          {/* ============ 年度KPI ============ */}
          {tab === 'kpi' && (
            <>
              <View style={{ backgroundColor: '#fff', borderWidth: 1, borderColor: '#D1D1D1', padding: 14 }}>
                <Text style={{ fontSize: 11, color: '#2B4B6F', fontWeight: '700', letterSpacing: 2, marginBottom: 12 }}>
                  {currentYear > 0 ? `第 ${currentYear} 年度KPI目标设定` : '年度KPI目标设定'}
                </Text>
                {kpiSaved && (
                  <View style={{ backgroundColor: '#e8f5e9', borderWidth: 1, borderColor: '#c8e6c9', padding: 8, marginBottom: 10 }}>
                    <Text style={{ fontSize: 12, color: '#2a7a3b', fontWeight: '600' }}>✓ KPI目标已保存</Text>
                  </View>
                )}
                {([
                  ['GDP指数目标', kpiGdp, setKpiGdp, save.cityGdp],
                  ['民生满意度目标', kpiLivelihood, setKpiLivelihood, save.cityLivelihood],
                  ['生态环境目标', kpiEcology, setKpiEcology, save.cityEcology],
                  ['营商环境目标', kpiBusiness, setKpiBusiness, save.cityBusiness],
                ] as [string, string, (v: string) => void, number][]).map(([label, val, setter, current]) => (
                  <View key={label} style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 10, gap: 10 }}>
                    <Text style={{ fontSize: 12, color: '#444', flex: 1 }}>{label}</Text>
                    <Text style={{ fontSize: 11, color: '#888', width: 60 }}>当前 {current.toFixed(1)}</Text>
                    <TextInput
                      value={val}
                      onChangeText={setter}
                      keyboardType="number-pad"
                      style={{ borderWidth: 1, borderColor: '#CCC', paddingHorizontal: 10, paddingVertical: 6, width: 70, fontSize: 14, color: '#222', textAlign: 'center' }}
                    />
                  </View>
                ))}
                <Pressable
                  onPress={handleSaveKpi}
                  style={{ backgroundColor: '#2B4B6F', paddingVertical: 11, alignItems: 'center', marginTop: 4 }}
                >
                  <Text style={{ color: '#fff', fontSize: 13, fontWeight: '700', letterSpacing: 1 }}>保存KPI目标</Text>
                </Pressable>
              </View>

              {kpiSet && (
                <View style={{ backgroundColor: '#fff', borderWidth: 1, borderColor: '#D1D1D1', padding: 14 }}>
                  <Text style={{ fontSize: 11, color: '#2B4B6F', fontWeight: '700', letterSpacing: 2, marginBottom: 12 }}>当前完成情况</Text>
                  {kpiResults.map(item => {
                    const pct = item.target > 0 ? Math.min(100, (item.current / item.target) * 100) : 0;
                    const done = item.current >= item.target;
                    return (
                      <View key={item.label} style={{ marginBottom: 12 }}>
                        <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 4 }}>
                          <Text style={{ fontSize: 12, color: '#333' }}>{item.icon} {item.label}</Text>
                          <Text style={{ fontSize: 12, color: done ? '#2a7a3b' : '#C82829', fontWeight: '700' }}>
                            {item.current.toFixed(1)} / {item.target}
                            {done ? ' ✓达标' : ` 差${(item.target - item.current).toFixed(1)}`}
                          </Text>
                        </View>
                        <View style={{ backgroundColor: '#F0F0F0', height: 8 }}>
                          <View style={{ backgroundColor: done ? '#2a7a3b' : '#2B4B6F', width: `${pct}%`, height: 8 }} />
                        </View>
                      </View>
                    );
                  })}
                  <View style={{ marginTop: 6, backgroundColor: '#F5F4F1', padding: 10 }}>
                    <Text style={{ fontSize: 11, color: '#555', lineHeight: 18 }}>
                      年度综合评分：{kpiResults.filter(r => r.current >= r.target).length}/{kpiResults.length} 项达标
                      {kpiResults.filter(r => r.current >= r.target).length === kpiResults.length
                        ? '　🏆 全项达标，年度优秀！'
                        : kpiResults.filter(r => r.current >= r.target).length >= 2
                        ? '　📊 部分达标，继续努力'
                        : '　⚠️ 多项未达标，需加大力度'}
                    </Text>
                  </View>
                </View>
              )}
              {!kpiSet && (
                <View style={{ backgroundColor: '#FFF9E6', borderWidth: 1, borderColor: '#F0C050', padding: 14 }}>
                  <Text style={{ fontSize: 12, color: '#7A5C00', lineHeight: 20 }}>
                    📌 请设定本年度KPI目标后，即可在此查看各项指数与目标的完成进度。{'\n'}
                    建议每年初设定合理目标，年末进行考核。
                  </Text>
                </View>
              )}
            </>
          )}

          {/* ============ 述职报告（动态关联职位职能） ============ */}
          {tab === 'debrief' && (
            <>
              {/* 报告头部 */}
              <View style={{ backgroundColor: '#2B4B6F', padding: 16, alignItems: 'center' }}>
                <View style={{ borderWidth: 1, borderColor: 'rgba(255,215,0,0.5)', paddingHorizontal: 14, paddingVertical: 6, marginBottom: 10 }}>
                  <Text style={{ color: '#FFD700', fontSize: 10, letterSpacing: 3, fontWeight: '700' }}>OFFICIAL DOCUMENT</Text>
                </View>
                <Text style={{ color: '#fff', fontSize: 17, fontWeight: '700', letterSpacing: 2, marginBottom: 4 }}>{debriefTitle}</Text>
                <Text style={{ color: '#a0b4cc', fontSize: 11, letterSpacing: 1 }}>{debriefSubtitle}</Text>
                <Text style={{ color: '#a0b4cc', fontSize: 10, marginTop: 4 }}>
                  第{currentYear}年 · 第{Math.floor(save.gameDays / 30)}个工作月
                </Text>
              </View>

              {/* 关键数据总览 */}
              <View style={{ backgroundColor: '#fff', borderWidth: 1, borderColor: '#D1D1D1', padding: 12 }}>
                <Text style={{ fontSize: 10, color: '#2B4B6F', fontWeight: '700', letterSpacing: 2, marginBottom: 8 }}>核心指标总览</Text>
                <View style={{ flexDirection: 'row', gap: 8 }}>
                  {[
                    { label: 'GDP指数', value: save.cityGdp.toFixed(1), icon: '📈', color: '#2B4B6F' },
                    { label: '民生', value: save.cityLivelihood.toFixed(1), icon: '❤️', color: '#C82829' },
                    { label: '生态', value: save.cityEcology.toFixed(1), icon: '🌿', color: '#2a7a3b' },
                    { label: '营商', value: save.cityBusiness.toFixed(1), icon: '⚖️', color: '#7B5E2A' },
                  ].map(item => (
                    <View key={item.label} style={{ flex: 1, backgroundColor: '#F5F4F1', padding: 8, alignItems: 'center', borderWidth: 1, borderColor: '#E5E5E5' }}>
                      <Text style={{ fontSize: 14 }}>{item.icon}</Text>
                      <Text style={{ fontSize: 14, fontWeight: '700', color: item.color, marginTop: 2 }}>{item.value}</Text>
                      <Text style={{ fontSize: 9, color: '#888', marginTop: 1 }}>{item.label}</Text>
                    </View>
                  ))}
                </View>
                <View style={{ flexDirection: 'row', gap: 8, marginTop: 8 }}>
                  <View style={{ flex: 1, backgroundColor: '#FFF9E6', padding: 8, borderWidth: 1, borderColor: '#F0C050' }}>
                    <Text style={{ fontSize: 10, color: '#7A5C00' }}>累计政绩分值</Text>
                    <Text style={{ fontSize: 16, fontWeight: '700', color: '#7A5C00' }}>{save.meritPoints} 分</Text>
                  </View>
                  <View style={{ flex: 1, backgroundColor: '#F0F4F8', padding: 8, borderWidth: 1, borderColor: '#D1D1D1' }}>
                    <Text style={{ fontSize: 10, color: '#2B4B6F' }}>担任现职</Text>
                    <Text style={{ fontSize: 16, fontWeight: '700', color: '#2B4B6F' }}>{currentYear} 年</Text>
                  </View>
                </View>
              </View>

              {/* 述职正文各章节（动态按职位生成） */}
              {debriefSections.map((section, idx) => (
                <View key={idx} style={{ backgroundColor: '#fff', borderWidth: 1, borderColor: '#D1D1D1', overflow: 'hidden' }}>
                  {/* 章节标题 */}
                  <View style={{ backgroundColor: section.color, paddingHorizontal: 14, paddingVertical: 8, flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                    <Text style={{ fontSize: 14 }}>{section.icon}</Text>
                    <Text style={{ fontSize: 12, color: '#fff', fontWeight: '700', letterSpacing: 1 }}>{section.title}</Text>
                  </View>
                  {/* 章节内容 */}
                  <View style={{ padding: 12, gap: 6 }}>
                    {section.items.map((item, ii) => (
                      <View key={ii} style={{ flexDirection: 'row', gap: 8, alignItems: 'flex-start' }}>
                        <Text style={{ fontSize: 11, color: section.color, fontWeight: '700', marginTop: 1 }}>•</Text>
                        <Text style={{ flex: 1, fontSize: 12, color: '#333', lineHeight: 19 }}>{item}</Text>
                      </View>
                    ))}
                  </View>
                </View>
              ))}

              {/* 关联月度工作报告（最多20份） */}
              <View style={{ backgroundColor: '#fff', borderWidth: 1, borderColor: '#D1D1D1', overflow: 'hidden' }}>
                <View style={{ backgroundColor: '#2B4B6F', paddingHorizontal: 14, paddingVertical: 8, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                  <Text style={{ fontSize: 12, color: '#fff', fontWeight: '700', letterSpacing: 1 }}>📎 关联月度工作报告</Text>
                  <View style={{ backgroundColor: 'rgba(255,255,255,0.15)', paddingHorizontal: 6, paddingVertical: 2 }}>
                    <Text style={{ fontSize: 9, color: '#fff' }}>共 {Math.min(reports.length, 20)} / 20 份</Text>
                  </View>
                </View>
                {reports.length === 0 ? (
                  <View style={{ padding: 16, alignItems: 'center' }}>
                    <Text style={{ fontSize: 12, color: '#aaa' }}>暂无月度报告可关联</Text>
                  </View>
                ) : (
                  reports.slice(0, 20).map((r, idx) => {
                    const deptLabel = DEPT_LABELS[r.deptKey] ?? r.deptKey;
                    return (
                      <View key={r.id} style={{ flexDirection: 'row', alignItems: 'center', padding: 10, borderBottomWidth: idx < Math.min(reports.length, 20) - 1 ? 1 : 0, borderBottomColor: '#F5F5F5', backgroundColor: idx % 2 === 0 ? '#FAFAFA' : '#fff', gap: 8 }}>
                        <View style={{ width: 22, height: 22, backgroundColor: '#2B4B6F', alignItems: 'center', justifyContent: 'center' }}>
                          <Text style={{ color: '#fff', fontSize: 10, fontWeight: '700' }}>{idx + 1}</Text>
                        </View>
                        <View style={{ flex: 1 }}>
                          <Text style={{ fontSize: 12, fontWeight: '600', color: '#1D2D44' }} numberOfLines={1}>{r.title}</Text>
                          <Text style={{ fontSize: 9, color: '#888', marginTop: 1 }}>{deptLabel} · 第{r.monthKey}月</Text>
                        </View>
                        <View style={{ backgroundColor: r.isRead ? '#F0F4F8' : '#FFF0F0', paddingHorizontal: 5, paddingVertical: 2 }}>
                          <Text style={{ fontSize: 8, color: r.isRead ? '#2B4B6F' : '#C82829', fontWeight: '600' }}>{r.isRead ? '已阅' : '未读'}</Text>
                        </View>
                      </View>
                    );
                  })
                )}
                {reports.length > 20 && (
                  <View style={{ padding: 10, backgroundColor: '#F5F4F1', alignItems: 'center' }}>
                    <Text style={{ fontSize: 10, color: '#888' }}>仅展示最近20份，共{reports.length}份报告</Text>
                  </View>
                )}
              </View>

              {/* 述职签发 */}
              <View style={{ backgroundColor: '#fff', borderWidth: 1, borderColor: '#D1D1D1', padding: 14 }}>
                <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
                  <Text style={{ fontSize: 11, color: '#888' }}>本报告已据实填报，如有不实，本人负责。</Text>
                </View>
                <View style={{ flexDirection: 'row', justifyContent: 'flex-end', gap: 16 }}>
                  <View style={{ alignItems: 'center' }}>
                    <Text style={{ fontSize: 10, color: '#888', marginBottom: 4 }}>述职人</Text>
                    <Text style={{ fontSize: 13, fontWeight: '700', color: '#2B4B6F' }}>{save.playerName || save.rankName}</Text>
                  </View>
                  <View style={{ alignItems: 'center' }}>
                    <Text style={{ fontSize: 10, color: '#888', marginBottom: 4 }}>呈报部门</Text>
                    <Text style={{ fontSize: 13, fontWeight: '700', color: '#2B4B6F' }}>{rankCfg?.bossTitle3 ?? '上级组织部'}</Text>
                  </View>
                </View>
                <Pressable
                  onPress={() => setDebriefPrinted(true)}
                  style={{ marginTop: 12, backgroundColor: debriefPrinted ? '#2a7a3b' : '#2B4B6F', paddingVertical: 10, alignItems: 'center' }}
                >
                  <Text style={{ color: '#fff', fontSize: 13, fontWeight: '700' }}>
                    {debriefPrinted ? '✅ 述职报告已提交' : '📤 提交述职报告'}
                  </Text>
                </Pressable>
              </View>

              <View style={{ height: 10 }} />
            </>
          )}

          <View style={{ height: 20 }} />
        </ScrollView>
      )}
    </View>
  );
}
