import { useCallback, useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, Text, View } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useFocusEffect, useRouter } from 'expo-router';
import { useGame } from '@/ctx/GameContext';
import { MINISTRY_POOL, gameDaysToDate, formatMoney, formatFund } from '@/types/game';
import type { PlayerSave } from '@/types/game';

// 国家级指标策略行动池
const NATIONAL_POLICIES: Record<string, { id: string; label: string; cost: number; desc: string; effect: Partial<Record<'gdp' | 'livelihood' | 'ecology' | 'business' | 'security', number>>; meritReward: number }[]> = {
  'GDP经济': [
    { id: 'n1', label: '推进供给侧结构性改革', cost: 50, desc: '优化产业结构，提升全要素生产率', effect: { gdp: 3 }, meritReward: 8 },
    { id: 'n2', label: '发布营商环境改善方案', cost: 40, desc: '降低市场准入门槛，激发市场活力', effect: { gdp: 2, business: 2 }, meritReward: 6 },
    { id: 'n3', label: '出台稳增长一揽子政策', cost: 80, desc: '财政政策+货币政策协同发力', effect: { gdp: 5 }, meritReward: 12 },
  ],
  '民生保障': [
    { id: 'n4', label: '全国就业优先政策', cost: 60, desc: '扩大就业容量，提升居民收入', effect: { livelihood: 4 }, meritReward: 10 },
    { id: 'n5', label: '推进基本公共服务均等化', cost: 70, desc: '缩小城乡差距，保障基本民生', effect: { livelihood: 3 }, meritReward: 8 },
    { id: 'n6', label: '健全社会保障体系', cost: 50, desc: '完善养老、医疗保险制度', effect: { livelihood: 2 }, meritReward: 6 },
  ],
  '生态文明': [
    { id: 'n7', label: '碳达峰碳中和行动方案', cost: 80, desc: '推动绿色低碳转型，完成双碳目标', effect: { ecology: 5 }, meritReward: 12 },
    { id: 'n8', label: '全国生态保护红线划定', cost: 60, desc: '保护生物多样性，守住生态底线', effect: { ecology: 3 }, meritReward: 8 },
    { id: 'n9', label: '污染防治攻坚战', cost: 70, desc: '系统治理大气、水、土壤污染', effect: { ecology: 4 }, meritReward: 10 },
  ],
  '营商环境': [
    { id: 'n10', label: '清理不合理政商壁垒', cost: 50, desc: '打破地方保护主义，统一大市场', effect: { business: 4 }, meritReward: 10 },
    { id: 'n11', label: '数字政务改革', cost: 40, desc: '提升行政效能，实现"一网通办"', effect: { business: 3 }, meritReward: 7 },
    { id: 'n12', label: '知识产权强国建设', cost: 60, desc: '完善知识产权保护体系，激励创新', effect: { business: 3, gdp: 1 }, meritReward: 8 },
  ],
  '社会治安': [
    { id: 'n13', label: '扫黑除恶专项整治', cost: 60, desc: '打击有组织犯罪，维护社会稳定', effect: { security: 5 }, meritReward: 12 },
    { id: 'n14', label: '完善公共安全应急体系', cost: 50, desc: '提升重大突发事件应对能力', effect: { security: 3 }, meritReward: 8 },
    { id: 'n15', label: '加强网络安全综合治理', cost: 40, desc: '防范网络违法犯罪，保护数据安全', effect: { security: 2 }, meritReward: 5 },
  ],
  '外交事务': [
    { id: 'n16', label: '推进多边贸易合作', cost: 60, desc: '主导区域合作框架，扩大朋友圈', effect: { gdp: 2, business: 2 }, meritReward: 8 },
    { id: 'n17', label: '构建人类命运共同体倡议', cost: 80, desc: '深化南南合作，提升国际影响力', effect: { business: 3 }, meritReward: 10 },
    { id: 'n18', label: '主办国际重要论坛', cost: 50, desc: '展示大国形象，争取国际话语权', effect: { gdp: 1, livelihood: 1 }, meritReward: 6 },
  ],
  '国家安全': [
    { id: 'n19', label: '国防科技创新工程', cost: 80, desc: '推进自主创新，提升战略威慑力', effect: { security: 5 }, meritReward: 15 },
    { id: 'n20', label: '维权护权专项行动', cost: 60, desc: '坚决捍卫国家主权和领土完整', effect: { security: 4 }, meritReward: 12 },
  ],
};

// 各部委下设办公室模板 + 独立编制人员（与玩家下属体系完全独立）
type MinistryStaff = { name: string; title: string; level: 'head' | 'deputy' | 'staff' };
type MinistryOffice = { name: string; headTitle: string; duty: string; staff: MinistryStaff[] };

const MINISTRY_OFFICES: Record<string, MinistryOffice[]> = {
  'GDP经济': [
    { name: '综合发展司', headTitle: '司长', duty: '统筹全国经济发展规划',
      staff: [{ name: '张宏远', title: '司长', level: 'head' }, { name: '李思成', title: '副司长', level: 'deputy' }, { name: '王立群', title: '副司长', level: 'deputy' }] },
    { name: '产业政策司', headTitle: '司长', duty: '推进产业结构调整升级',
      staff: [{ name: '陈博文', title: '司长', level: 'head' }, { name: '刘晓燕', title: '副司长', level: 'deputy' }] },
    { name: '数字经济司', headTitle: '司长', duty: '引导数字经济与实体经济融合',
      staff: [{ name: '孙志远', title: '司长', level: 'head' }, { name: '周磊', title: '副司长', level: 'deputy' }] },
    { name: '财务与预算处', headTitle: '处长', duty: '负责部委年度预算编制',
      staff: [{ name: '吴建国', title: '处长', level: 'head' }, { name: '赵晓梅', title: '副处长', level: 'deputy' }] },
  ],
  '民生保障': [
    { name: '社会保障司', headTitle: '司长', duty: '统筹城乡社会保障政策',
      staff: [{ name: '林德义', title: '司长', level: 'head' }, { name: '杨春梅', title: '副司长', level: 'deputy' }, { name: '黄志强', title: '副司长', level: 'deputy' }] },
    { name: '就业促进司', headTitle: '司长', duty: '推动就业政策落地见效',
      staff: [{ name: '马国华', title: '司长', level: 'head' }, { name: '钱思远', title: '副司长', level: 'deputy' }] },
    { name: '基层民生处', headTitle: '处长', duty: '直接对接基层群众诉求',
      staff: [{ name: '朱明辉', title: '处长', level: 'head' }, { name: '许丽华', title: '副处长', level: 'deputy' }] },
    { name: '政策法规处', headTitle: '处长', duty: '负责民生相关法规研制',
      staff: [{ name: '何昌盛', title: '处长', level: 'head' }, { name: '郑思华', title: '副处长', level: 'deputy' }] },
  ],
  '生态文明': [
    { name: '生态保护司', headTitle: '司长', duty: '推进自然保护区建设管理',
      staff: [{ name: '宋建民', title: '司长', level: 'head' }, { name: '冯志远', title: '副司长', level: 'deputy' }] },
    { name: '大气环境司', headTitle: '司长', duty: '统筹大气污染防治攻坚',
      staff: [{ name: '韩世杰', title: '司长', level: 'head' }, { name: '蒋玉清', title: '副司长', level: 'deputy' }] },
    { name: '资源节约处', headTitle: '处长', duty: '推动能源节约与循环利用',
      staff: [{ name: '唐建华', title: '处长', level: 'head' }, { name: '曾志强', title: '副处长', level: 'deputy' }] },
    { name: '环境监测处', headTitle: '处长', duty: '全国环境质量数据汇总分析',
      staff: [{ name: '彭国梁', title: '处长', level: 'head' }, { name: '邓思远', title: '副处长', level: 'deputy' }] },
  ],
  '营商环境': [
    { name: '市场准入司', headTitle: '司长', duty: '降低市场准入壁垒',
      staff: [{ name: '卢建中', title: '司长', level: 'head' }, { name: '苏明远', title: '副司长', level: 'deputy' }] },
    { name: '公平竞争司', headTitle: '司长', duty: '维护市场公平竞争秩序',
      staff: [{ name: '廖国建', title: '司长', level: 'head' }, { name: '姜思成', title: '副司长', level: 'deputy' }] },
    { name: '政务服务处', headTitle: '处长', duty: '推进"一网通办"改革',
      staff: [{ name: '谭志华', title: '处长', level: 'head' }, { name: '崔晓东', title: '副处长', level: 'deputy' }] },
    { name: '中小企业处', headTitle: '处长', duty: '扶持中小企业发展',
      staff: [{ name: '侯建国', title: '处长', level: 'head' }, { name: '史思远', title: '副处长', level: 'deputy' }] },
  ],
  '社会治安': [
    { name: '治安管理司', headTitle: '司长', duty: '统筹全国治安防控体系',
      staff: [{ name: '龙世明', title: '司长', level: 'head' }, { name: '贺国栋', title: '副司长', level: 'deputy' }] },
    { name: '应急管理司', headTitle: '司长', duty: '重大突发事件协调处置',
      staff: [{ name: '尹建军', title: '司长', level: 'head' }, { name: '潘志远', title: '副司长', level: 'deputy' }] },
    { name: '反诈中心处', headTitle: '处长', duty: '打击电信网络诈骗',
      staff: [{ name: '邹国华', title: '处长', level: 'head' }, { name: '石思思', title: '副处长', level: 'deputy' }] },
    { name: '网络安全处', headTitle: '处长', duty: '维护国家网络安全',
      staff: [{ name: '熊建明', title: '处长', level: 'head' }, { name: '雷志远', title: '副处长', level: 'deputy' }] },
  ],
  '外交事务': [
    { name: '亚洲事务司', headTitle: '司长', duty: '主管周边国家外交事务',
      staff: [{ name: '秦国华', title: '司长', level: 'head' }, { name: '武志成', title: '副司长', level: 'deputy' }] },
    { name: '多边合作司', headTitle: '司长', duty: '参与国际多边机制谈判',
      staff: [{ name: '孟建华', title: '司长', level: 'head' }, { name: '江思远', title: '副司长', level: 'deputy' }] },
    { name: '礼宾处', headTitle: '处长', duty: '承办国际外交接待礼仪',
      staff: [{ name: '叶国明', title: '处长', level: 'head' }, { name: '魏志华', title: '副处长', level: 'deputy' }] },
    { name: '信息资讯处', headTitle: '处长', duty: '对外新闻发布与信息管理',
      staff: [{ name: '丁建中', title: '处长', level: 'head' }, { name: '沈思远', title: '副处长', level: 'deputy' }] },
  ],
  '国家安全': [
    { name: '战略规划司', headTitle: '司长', duty: '统筹国家安全战略规划',
      staff: [{ name: '付国强', title: '司长', level: 'head' }, { name: '范志远', title: '副司长', level: 'deputy' }, { name: '康建华', title: '副司长', level: 'deputy' }] },
    { name: '科技装备司', headTitle: '司长', duty: '推进国防科技自主创新',
      staff: [{ name: '任世杰', title: '司长', level: 'head' }, { name: '袁志成', title: '副司长', level: 'deputy' }] },
    { name: '综合协调处', headTitle: '处长', duty: '协调各系统安全事务',
      staff: [{ name: '方建国', title: '处长', level: 'head' }, { name: '汪思远', title: '副处长', level: 'deputy' }] },
    { name: '保密管理处', headTitle: '处长', duty: '国家机密保护与管理',
      staff: [{ name: '柳志华', title: '处长', level: 'head' }, { name: '严国栋', title: '副处长', level: 'deputy' }] },
  ],
};

// 全局指标颜色
const INDEX_COLOR = { gdp: '#2B4B6F', livelihood: '#2a7a3b', ecology: '#1a6b3a', business: '#7B5E2A', security: '#7a1a1a' };
const INDEX_LABEL = { gdp: 'GDP增速', livelihood: '民生保障', ecology: '生态文明', business: '营商环境', security: '社会治安' };

type MinTab = 'policy' | 'building' | 'staff' | 'events' | 'scitech' | 'discipline';

// 重要工作事项配置
const MINISTRY_EVENTS = [
  {
    key: 'state_council_meeting',
    icon: '🏛️',
    title: '国政院常务会议',
    subtitle: '国政院 · 每季度定期召开',
    desc: '主持国政院常务会议，汇报分管领域工作进展，审议重要政策文件，协调跨部门重大事项。',
    cooldownDays: 90,
    cost: 0,
    meritReward: 300,
    favorReward: 8,
    effects: { gdp: 2 },
    badge: '核心会议',
    badgeColor: '#B71C1C',
  },
  {
    key: 'press_conference',
    icon: '🎙️',
    title: '部长记者会',
    subtitle: '新闻中心 · 两会期间举行',
    desc: '出席全国两会部长通道记者会，就国内外媒体关注的政策热点问题作权威解答，展示施政成果。',
    cooldownDays: 60,
    cost: 0,
    meritReward: 150,
    favorReward: 5,
    effects: { livelihood: 2, business: 1 },
    badge: '媒体曝光',
    badgeColor: '#E65100',
  },
  {
    key: 'national_work_conf',
    icon: '📋',
    title: '全国工作会议',
    subtitle: '部委主办 · 全国省市代表参加',
    desc: '召开全国系统工作会议，部署本年度重点工作任务，传达中央指示精神，推动政策落地执行。',
    cooldownDays: 120,
    cost: 20,
    meritReward: 250,
    favorReward: 5,
    effects: { gdp: 1, livelihood: 1, ecology: 1, business: 1, security: 1 },
    badge: '全国部署',
    badgeColor: '#1565C0',
  },
  {
    key: 'special_inspection',
    icon: '🔍',
    title: '专项督察行动',
    subtitle: '派驻督察组 · 下沉地方督导',
    desc: '组织专项督察组赴重点省市，对重大政策落实情况实施全面督导检查，形成督察整改闭环。',
    cooldownDays: 60,
    cost: 30,
    meritReward: 180,
    favorReward: 3,
    effects: { security: 3, livelihood: 1 },
    badge: '监督落实',
    badgeColor: '#212121',
  },
  {
    key: 'legislative_review',
    icon: '⚖️',
    title: '立法审查工作',
    subtitle: '与议政院联动 · 部门规章制定',
    desc: '推进本部门职责范围内的立法和规章修订工作，提交全国议政院常委会审议，完善法规制度体系。',
    cooldownDays: 90,
    cost: 20,
    meritReward: 200,
    favorReward: 5,
    effects: { business: 2 },
    badge: '制度建设',
    badgeColor: '#4527A0',
  },
  {
    key: 'budget_meeting',
    icon: '💰',
    title: '年度预算分配会议',
    subtitle: '财政部协同 · 全国预算分配',
    desc: '与财政部协商年度专项预算资金分配方案，向各省市下达政策资金，推动重大项目资金到位。',
    cooldownDays: 120,
    cost: 0,
    meritReward: 180,
    favorReward: 4,
    effects: { gdp: 2 },
    badge: '资金调配',
    badgeColor: '#1B5E20',
  },
  {
    key: 'national_survey',
    icon: '🚌',
    title: '全国调研视察',
    subtitle: '深入基层 · 掌握第一手情况',
    desc: '赴典型省市开展专项调研，走访基层单位和群众，收集一线政策执行反馈，形成高质量调研报告。',
    cooldownDays: 30,
    cost: 10,
    meritReward: 80,
    favorReward: 3,
    effects: { livelihood: 1 },
    badge: '基层视察',
    badgeColor: '#2E7D32',
  },
  {
    key: 'intl_cooperation',
    icon: '🌐',
    title: '对外合作与交流',
    subtitle: '外交协同 · 国际组织参与',
    desc: '参加相关领域国际会议或双多边会谈，推动签署合作协议，拓展对外合作空间，提升国际影响力。',
    cooldownDays: 60,
    cost: 20,
    meritReward: 150,
    favorReward: 4,
    effects: { business: 2, gdp: 1 },
    badge: '对外开放',
    badgeColor: '#006064',
  },
] as const;
type EventKey = typeof MINISTRY_EVENTS[number]['key'];

// ── 副院理以上：只读部委年度工作总览 ──────────────────────────────
// 参照现实政府考核维度：GDP、民生、生态、营商、安全 对应5类关注焦点
const FOCUS_SCORE_MAP: Record<string, { label: string; color: string }> = {
  'GDP经济':  { label: 'GDP增速', color: '#2B4B6F' },
  '民生保障': { label: '民生改善', color: '#2a7a3b' },
  '生态文明': { label: '生态达标', color: '#5a8a3b' },
  '营商环境': { label: '营商评分', color: '#7B5E2A' },
  '社会治安': { label: '治安指数', color: '#8B1A1A' },
  '外交事务': { label: '外交评分', color: '#4B3B8C' },
  '国家安全': { label: '安全指数', color: '#8B1A1A' },
};

function buildAnnualRecord(
  m: typeof MINISTRY_POOL[number],
  save: PlayerSave,
  idx: number,
) {
  // 用各指标和部委焦点确定性地生成"完成率"
  const focusValue = (() => {
    const f = m.focus;
    if (f === 'GDP经济')  return save.cityGdp;
    if (f === '民生保障') return save.cityLivelihood;
    if (f === '生态文明') return save.cityEcology;
    if (f === '营商环境') return save.cityBusiness;
    return save.securityIndex;
  })();
  // 加上稳定扰动（deterministic by idx）
  const noise = ((idx * 13 + 7) % 15) - 7;          // ±7
  const completionRate = Math.min(100, Math.max(30, Math.round(focusValue * 0.7 + noise + 25)));
  const staffFillRate  = Math.min(100, Math.max(70, 88 + ((idx * 7) % 12)));
  const grade = completionRate >= 85 ? '优秀' : completionRate >= 70 ? '良好' : completionRate >= 55 ? '合格' : '待改善';
  const gradeColor = completionRate >= 85 ? '#2a7a3b' : completionRate >= 70 ? '#7B5E2A' : completionRate >= 55 ? '#2B4B6F' : '#C82829';
  return { completionRate, staffFillRate, grade, gradeColor };
}

function MinistryReadonlyView({
  save,
  router,
}: { save: PlayerSave; router: ReturnType<typeof useRouter> }) {
  const insets = useSafeAreaInsets();
  const [focusFilter, setFocusFilter] = useState('全部');
  const [expanded, setExpanded]       = useState<string | null>(null);

  const focusList = ['全部', ...Array.from(new Set(MINISTRY_POOL.map(m => m.focus)))];
  const filtered  = focusFilter === '全部'
    ? MINISTRY_POOL
    : MINISTRY_POOL.filter(m => m.focus === focusFilter);

  const currentYear = Math.floor(save.gameDays / 365) + 1;

  // 汇总统计
  const allRecords = MINISTRY_POOL.map((m, i) => buildAnnualRecord(m, save, i));
  const avgCompletion = Math.round(allRecords.reduce((s, r) => s + r.completionRate, 0) / allRecords.length);
  const excellentCount = allRecords.filter(r => r.grade === '优秀').length;
  const poorCount      = allRecords.filter(r => r.grade === '待改善').length;

  return (
    <View style={{ flex: 1, backgroundColor: '#F4F4F0' }}>
      {/* 顶栏 */}
      <View style={{ backgroundColor: '#0D1F35', paddingTop: insets.top + 8, paddingBottom: 14, paddingHorizontal: 16 }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
          <Pressable onPress={() => router.back()}>
            <Text style={{ color: '#a0b4cc', fontSize: 22 }}>‹</Text>
          </Pressable>
          <View style={{ flex: 1 }}>
            <Text style={{ color: 'rgba(160,180,204,0.6)', fontSize: 9, letterSpacing: 3 }}>国政院 · 部委治国</Text>
            <Text style={{ color: '#fff', fontWeight: '700', fontSize: 16 }}>🏛️ 部委年度工作总览</Text>
            <Text style={{ color: '#a0b4cc', fontSize: 10, marginTop: 2 }}>第 {currentYear} 年度 · {save.rankName} · 只读模式</Text>
          </View>
        </View>
        {/* 汇总条 */}
        <View style={{ flexDirection: 'row', marginTop: 12, gap: 8 }}>
          {[
            { label: '平均完成率', value: `${avgCompletion}%`, color: '#FFD700' },
            { label: '优秀部委',   value: `${excellentCount}个`, color: '#90EE90' },
            { label: '待改善',     value: `${poorCount}个`,     color: '#FF8888' },
            { label: '部委总数',   value: `${MINISTRY_POOL.length}个`, color: '#a0b4cc' },
          ].map(item => (
            <View key={item.label} style={{ flex: 1, alignItems: 'center', backgroundColor: 'rgba(255,255,255,0.06)', paddingVertical: 8 }}>
              <Text style={{ color: item.color, fontWeight: '700', fontSize: 13 }}>{item.value}</Text>
              <Text style={{ color: 'rgba(160,180,204,0.7)', fontSize: 8, marginTop: 2 }}>{item.label}</Text>
            </View>
          ))}
        </View>
      </View>

      {/* 领域筛选 */}
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ flexGrow: 0, backgroundColor: '#fff', borderBottomWidth: 1, borderBottomColor: '#E0E0E0' }} contentContainerStyle={{ paddingHorizontal: 6 }}>
        {focusList.map(f => (
          <Pressable
            key={f}
            onPress={() => setFocusFilter(f)}
            style={{ paddingHorizontal: 10, paddingVertical: 10, borderBottomWidth: 2, borderBottomColor: focusFilter === f ? '#0D1F35' : 'transparent' }}
          >
            <Text style={{ fontSize: 11, fontWeight: focusFilter === f ? '700' : '400', color: focusFilter === f ? '#0D1F35' : '#888' }}>
              {f}
            </Text>
          </Pressable>
        ))}
      </ScrollView>

      <ScrollView contentInsetAdjustmentBehavior="automatic" contentContainerStyle={{ padding: 12, gap: 8 }}>
        {filtered.map((m, rawIdx) => {
          // 找到在原数组的idx以确保扰动一致
          const idx = MINISTRY_POOL.findIndex(x => x.name === m.name);
          const rec = buildAnnualRecord(m, save, idx);
          const isOpen = expanded === m.name;
          const focusMeta = FOCUS_SCORE_MAP[m.focus] ?? { label: m.focus, color: '#555' };

          return (
            <Pressable
              key={m.name}
              onPress={() => setExpanded(isOpen ? null : m.name)}
              style={{ backgroundColor: '#fff', borderWidth: 1, borderColor: isOpen ? '#0D1F35' : '#D8D8D8' }}
            >
              {/* 卡片头 */}
              <View style={{ flexDirection: 'row', alignItems: 'center', padding: 12, gap: 10 }}>
                <Text style={{ fontSize: 22 }}>{m.emoji}</Text>
                <View style={{ flex: 1 }}>
                  <Text style={{ fontSize: 12, fontWeight: '700', color: '#1D2D44' }}>{m.name}</Text>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 2 }}>
                    <View style={{ backgroundColor: focusMeta.color + '22', paddingHorizontal: 5, paddingVertical: 1 }}>
                      <Text style={{ fontSize: 9, color: focusMeta.color, fontWeight: '600' }}>{focusMeta.label}</Text>
                    </View>
                    <View style={{ backgroundColor: rec.gradeColor + '22', paddingHorizontal: 5, paddingVertical: 1 }}>
                      <Text style={{ fontSize: 9, color: rec.gradeColor, fontWeight: '700' }}>{rec.grade}</Text>
                    </View>
                  </View>
                </View>
                {/* 完成率数字 */}
                <View style={{ alignItems: 'flex-end' }}>
                  <Text style={{ fontSize: 16, fontWeight: '700', color: rec.gradeColor }}>{rec.completionRate}%</Text>
                  <Text style={{ fontSize: 8, color: '#aaa' }}>年度完成率</Text>
                </View>
              </View>

              {/* 进度条（始终显示） */}
              <View style={{ height: 4, backgroundColor: '#F0F0F0' }}>
                <View style={{ width: `${rec.completionRate}%`, height: 4, backgroundColor: rec.gradeColor }} />
              </View>

              {/* 展开详情 */}
              {isOpen && (
                <View style={{ padding: 12, gap: 10 }}>
                  {/* 人员情况 */}
                  <View style={{ gap: 4 }}>
                    <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                      <Text style={{ fontSize: 10, color: '#555', fontWeight: '600' }}>人员编制到位率</Text>
                      <Text style={{ fontSize: 10, color: rec.staffFillRate >= 95 ? '#2a7a3b' : '#E08030' }}>
                        {rec.staffFillRate}%{rec.staffFillRate < 95 ? '（补员中）' : '（满编）'}
                      </Text>
                    </View>
                    <View style={{ height: 4, backgroundColor: '#EEE', borderRadius: 2 }}>
                      <View style={{ width: `${rec.staffFillRate}%`, height: 4, backgroundColor: rec.staffFillRate >= 95 ? '#2a7a3b' : '#E08030', borderRadius: 2 }} />
                    </View>
                  </View>

                  {/* 年度工作完成情况 */}
                  <View style={{ backgroundColor: '#F5F4F1', padding: 10, gap: 6 }}>
                    <Text style={{ fontSize: 10, color: '#555', fontWeight: '600' }}>第 {currentYear} 年度工作报告摘要</Text>
                    <Text style={{ fontSize: 10, color: '#666', lineHeight: 16 }}>
                      {rec.completionRate >= 85
                        ? `${m.name}本年度超额完成各项工作指标，在${focusMeta.label}方面表现突出，获国政院年度通报表扬。`
                        : rec.completionRate >= 70
                        ? `${m.name}本年度基本完成工作任务，${focusMeta.label}指标稳中有升，整体运行有序。`
                        : rec.completionRate >= 55
                        ? `${m.name}本年度完成主要指标，但${focusMeta.label}方面仍有提升空间，需加强工作部署。`
                        : `${m.name}本年度部分核心指标未达预期，在${focusMeta.label}上存在明显短板，国政院已要求整改。`
                      }
                    </Text>
                  </View>

                  {/* 提示：只读 */}
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                    <Text style={{ fontSize: 9, color: '#aaa' }}>ℹ️ 副院理以上级别不直接兼管部委，如需干预请通过总理办公室下达指示</Text>
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

// ── 科技委内嵌数据 ─────────────────────────────────────────────────────
const SCITECH_DIRS = [
  { id: 'ai',      icon: '🤖', name: '人工智能与大数据',   cost: 500,  merit: 20, gdpD: 3, bizD: 4, ecoD: 0 },
  { id: 'space',   icon: '🚀', name: '航天与深空探测',     cost: 800,  merit: 30, gdpD: 2, bizD: 2, ecoD: 0 },
  { id: 'bio',     icon: '🧬', name: '生物医药与生命科学', cost: 400,  merit: 18, gdpD: 1, bizD: 2, ecoD: 2 },
  { id: 'energy',  icon: '⚡', name: '新能源与氢能技术',   cost: 350,  merit: 16, gdpD: 2, bizD: 1, ecoD: 5 },
  { id: 'chip',    icon: '💻', name: '芯片与集成电路',     cost: 600,  merit: 25, gdpD: 4, bizD: 3, ecoD: 0 },
  { id: 'quantum', icon: '⚛️', name: '量子科技',           cost: 700,  merit: 28, gdpD: 2, bizD: 2, ecoD: 0 },
];

const CORRUPT_CHARGES = [
  '涉嫌违规收受礼品', '滥用职权干预工程项目', '违规使用公款消费',
  '在下属企业违规持股', '利用职权为亲属谋利', '收受贿赂批准违规项目',
  '私设"小金库"挪用公款', '违规插手干预司法案件',
];

export default function MinistryScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { save, isLoading, updateGameSave } = useGame();
  const [acting, setActing] = useState(false);
  const [result, setResult] = useState<string>('');
  const [daysLeft, setDaysLeft] = useState(0);
  const [activeTab, setActiveTab] = useState<MinTab>('policy');
  const [expandedOffice, setExpandedOffice] = useState<string | null>(null);
  // 重要工作事项冷却追踪（key -> 最近执行游戏天）
  const [eventLastDays, setEventLastDays] = useState<Record<EventKey, number>>({} as Record<EventKey, number>);
  const [actingEvent, setActingEvent] = useState<EventKey | null>(null);

  useFocusEffect(useCallback(() => {
    if (!save) return;
    const rotateDay = save.lastMinistryRotateDay ?? 0;
    const remaining = Math.max(0, 365 - (save.gameDays - rotateDay));
    setDaysLeft(remaining);
  }, [save]));

  if (isLoading || !save) {
    return <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}><ActivityIndicator size="large" color="#C82829" /></View>;
  }
  if (save.rankLevel < 12) {
    return (
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', padding: 24 }}>
        <Text style={{ fontSize: 15, color: '#888', textAlign: 'center' }}>晋升至国政院部长级（级别12）后解锁此页面</Text>
      </View>
    );
  }

  // ── rank13+（副院理以上）：只读查看各部委年度工作情况 ──
  if (save.rankLevel >= 13) {
    return <MinistryReadonlyView save={save} router={router} />;
  }

  const ministryName = save.cityName || '国政院部委';
  const foundMinistry = MINISTRY_POOL.find(m => m.name === ministryName);
  const ministryInfo = foundMinistry ?? { name: ministryName, focus: 'GDP经济' as 'GDP经济', emoji: '🏛️' as '🏛️' };
  const policiesForMinistry = NATIONAL_POLICIES[ministryInfo.focus] ?? NATIONAL_POLICIES['GDP经济'];
  const officesForMinistry = MINISTRY_OFFICES[ministryInfo.focus] ?? MINISTRY_OFFICES['GDP经济'];

  // 国家级五大指标（复用城市指标字段）
  const nationalIndices = [
    { key: 'gdp', value: save.cityGdp },
    { key: 'livelihood', value: save.cityLivelihood },
    { key: 'ecology', value: save.cityEcology },
    { key: 'business', value: save.cityBusiness },
    { key: 'security', value: save.securityIndex },
  ] as { key: keyof typeof INDEX_LABEL; value: number }[];

  const handleExecutePolicy = async (policy: typeof policiesForMinistry[0]) => {
    if (acting || save.fundBalance < policy.cost) return;
    setActing(true);
    // 每次实施政策固定奖励政绩 200
    const MERIT_REWARD = 200;
    const updates: Partial<Parameters<typeof updateGameSave>[0]> = {
      fundBalance: save.fundBalance - policy.cost,
      meritPoints: save.meritPoints + MERIT_REWARD,
    };
    if (policy.effect.gdp) updates.cityGdp = Math.min(100, save.cityGdp + policy.effect.gdp);
    if (policy.effect.livelihood) updates.cityLivelihood = Math.min(100, save.cityLivelihood + policy.effect.livelihood);
    if (policy.effect.ecology) updates.cityEcology = Math.min(100, save.cityEcology + policy.effect.ecology);
    if (policy.effect.business) updates.cityBusiness = Math.min(100, save.cityBusiness + policy.effect.business);
    if (policy.effect.security) updates.securityIndex = Math.min(100, save.securityIndex + policy.effect.security);
    await updateGameSave(updates);
    setResult(`✅ 已颁布《${policy.label}》，获政绩 +${MERIT_REWARD}`);
    setActing(false);
    setTimeout(() => setResult(''), 3000);
  };

  const handleExecuteEvent = async (ev: typeof MINISTRY_EVENTS[number]) => {
    if (!save || actingEvent) return;
    const lastDay = eventLastDays[ev.key] ?? 0;
    const remaining = ev.cooldownDays - (save.gameDays - lastDay);
    if (remaining > 0 && lastDay > 0) {
      setResult(`⏳ 冷却中，还需 ${remaining} 天`);
      setTimeout(() => setResult(''), 2500);
      return;
    }
    if (ev.cost > 0 && save.fundBalance < ev.cost) {
      setResult('⚠️ 专项经费不足');
      setTimeout(() => setResult(''), 2500);
      return;
    }
    setActingEvent(ev.key);
    const updates: Partial<Parameters<typeof updateGameSave>[0]> = {
      meritPoints: save.meritPoints + ev.meritReward,
      bossFavor: Math.min(100, save.bossFavor + ev.favorReward),
    };
    if (ev.cost > 0) updates.fundBalance = save.fundBalance - ev.cost;
    if ('gdp' in ev.effects && ev.effects.gdp) updates.cityGdp = Math.min(100, save.cityGdp + ev.effects.gdp);
    if ('livelihood' in ev.effects && ev.effects.livelihood) updates.cityLivelihood = Math.min(100, save.cityLivelihood + ev.effects.livelihood);
    if ('ecology' in ev.effects && ev.effects.ecology) updates.cityEcology = Math.min(100, save.cityEcology + ev.effects.ecology);
    if ('business' in ev.effects && ev.effects.business) updates.cityBusiness = Math.min(100, save.cityBusiness + ev.effects.business);
    if ('security' in ev.effects && ev.effects.security) updates.securityIndex = Math.min(100, save.securityIndex + ev.effects.security);
    await updateGameSave(updates);
    setEventLastDays(prev => ({ ...prev, [ev.key]: save.gameDays }));
    setActingEvent(null);
    const costText = ev.cost > 0 ? ` · 经费-${ev.cost}万` : '';
    setResult(`✅ 完成【${ev.title}】，政绩+${ev.meritReward}，上司好感+${ev.favorReward}${costText}`);
    setTimeout(() => setResult(''), 4000);
  };
  const allMinistryStaff = officesForMinistry.flatMap(o => o.staff);
  const headCount   = allMinistryStaff.filter(s => s.level === 'head').length;
  const deputyCount = allMinistryStaff.filter(s => s.level === 'deputy').length;
  const staffCount  = allMinistryStaff.filter(s => s.level === 'staff').length;

  return (
    <ScrollView style={{ flex: 1, backgroundColor: '#F4F4F0' }} contentInsetAdjustmentBehavior="automatic">
      <StatusBar style="light" backgroundColor="#0D1F35" />
      {/* 页眉 */}
      <View style={{ backgroundColor: '#0D1F35', padding: 18, paddingTop: insets.top + 8 }}>
        <Text style={{ color: 'rgba(255,255,255,0.5)', fontSize: 10, letterSpacing: 3 }}>国政院 · 部委治国</Text>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, marginTop: 6 }}>
          <Text style={{ fontSize: 32 }}>{ministryInfo.emoji}</Text>
          <View style={{ flex: 1 }}>
            <Text style={{ color: '#fff', fontWeight: '700', fontSize: 20 }}>{ministryName}</Text>
            <Text style={{ color: '#a0b4cc', fontSize: 12, marginTop: 2 }}>
              {save.playerName}  ·  {ministryName}部长  ·  任期第 {save.tenureYears} 年
            </Text>
          </View>
          {/* 返回主页 */}
          <Pressable
            onPress={() => router.replace('/(app)/home')}
            style={{ backgroundColor: 'rgba(255,255,255,0.12)', paddingHorizontal: 12, paddingVertical: 8, borderWidth: 1, borderColor: 'rgba(255,255,255,0.2)' }}
          >
            <Text style={{ color: '#fff', fontSize: 11, fontWeight: '700' }}>🏠 主页</Text>
          </Pressable>
        </View>
        {/* 部委轮换倒计时 */}
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 12, backgroundColor: 'rgba(255,255,255,0.08)', padding: 10 }}>
          <Text style={{ color: '#ffcc80', fontSize: 12 }}>🔄 部委轮换倒计时：</Text>
          <Text style={{ color: '#fff', fontWeight: '700', fontSize: 13 }}>{daysLeft} 天</Text>
          <Text style={{ color: '#a0b4cc', fontSize: 10, marginLeft: 'auto' }}>轮换后继续积累政绩</Text>
        </View>
      </View>

      {/* 资金余额 */}
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', padding: 14, backgroundColor: '#2B4B6F', borderBottomWidth: 3, borderBottomColor: '#C82829' }}>
        <View style={{ alignItems: 'center' }}>
          <Text style={{ color: '#a0b4cc', fontSize: 10 }}>专项经费余额</Text>
          <Text style={{ color: '#FFD700', fontWeight: '700', fontSize: 16, marginTop: 2 }}>
            {formatFund(save.fundBalance)}
          </Text>
        </View>
        <View style={{ alignItems: 'center' }}>
          <Text style={{ color: '#a0b4cc', fontSize: 10 }}>本届政绩积累</Text>
          <Text style={{ color: '#fff', fontWeight: '700', fontSize: 18, marginTop: 2 }}>{save.meritPoints}</Text>
        </View>
        <View style={{ alignItems: 'center' }}>
          <Text style={{ color: '#a0b4cc', fontSize: 10 }}>晋升所需</Text>
          <Text style={{ color: '#FF8A65', fontWeight: '700', fontSize: 18, marginTop: 2 }}>{save.requiredMerit}</Text>
        </View>
      </View>

      {/* 全国五大指标 */}
      <View style={{ padding: 14, gap: 8 }}>
        <Text style={{ fontSize: 11, color: '#888', letterSpacing: 2, fontWeight: '700', marginBottom: 2 }}>全国发展指标</Text>
        {nationalIndices.map(({ key, value }) => (
          <View key={key}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 3 }}>
              <Text style={{ fontSize: 12, color: '#333', fontWeight: '600' }}>{INDEX_LABEL[key]}</Text>
              <Text style={{ fontSize: 12, color: INDEX_COLOR[key], fontWeight: '700' }}>{value.toFixed(1)}</Text>
            </View>
            <View style={{ height: 6, backgroundColor: '#E0E0E0', borderRadius: 3 }}>
              <View style={{ width: `${value}%`, height: 6, backgroundColor: INDEX_COLOR[key], borderRadius: 3 }} />
            </View>
          </View>
        ))}
      </View>

      {/* 分割线 */}
      <View style={{ height: 1, backgroundColor: '#D0D0C8', marginHorizontal: 14 }} />

      {/* 标签切换 */}
      <View style={{ flexDirection: 'row', borderBottomWidth: 2, borderBottomColor: '#D0D0C8', marginHorizontal: 14, marginTop: 10 }}>
        {([
          { key: 'policy',     label: '施政命令' },
          { key: 'events',     label: '重要工作' },
          { key: 'building',   label: '部委大楼' },
          { key: 'staff',      label: '部委人员' },
          { key: 'scitech',    label: '🔬 科技委' },
          { key: 'discipline', label: '⚖️ 纪检委' },
        ] as { key: MinTab; label: string }[]).map(tab => (
          <Pressable
            key={tab.key}
            onPress={() => setActiveTab(tab.key)}
            style={{
              flex: 1, paddingVertical: 10, alignItems: 'center',
              borderBottomWidth: activeTab === tab.key ? 2 : 0,
              borderBottomColor: '#C82829',
              marginBottom: -2,
            }}
          >
            <Text style={{ fontSize: 13, fontWeight: activeTab === tab.key ? '700' : '400', color: activeTab === tab.key ? '#C82829' : '#777' }}>
              {tab.label}
            </Text>
          </Pressable>
        ))}
      </View>

      {/* ── 施政命令 ── */}
      {activeTab === 'policy' && (
        <View style={{ padding: 14, gap: 10 }}>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
            <Text style={{ fontSize: 11, color: '#888', letterSpacing: 2, fontWeight: '700' }}>施政重点：{ministryInfo.focus}</Text>
            <View style={{ backgroundColor: '#0D1F35', paddingHorizontal: 8, paddingVertical: 3 }}>
              <Text style={{ color: '#fff', fontSize: 9 }}>共 {policiesForMinistry.length} 项政策</Text>
            </View>
          </View>
          {policiesForMinistry.map(policy => {
            const canAct = save.fundBalance >= policy.cost;
            return (
              <View key={policy.id} style={{ borderWidth: 1, borderColor: '#D1D1CF', backgroundColor: '#fff' }}>
                <View style={{ padding: 12, gap: 4 }}>
                  <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                    <Text style={{ fontSize: 13, fontWeight: '700', color: '#1D2D44', flex: 1 }}>{policy.label}</Text>
                    <View style={{ backgroundColor: '#FFF9E6', paddingHorizontal: 6, paddingVertical: 2, marginLeft: 8 }}>
                      <Text style={{ fontSize: 9, color: '#7B5E2A', fontWeight: '600' }}>政绩 +200</Text>
                    </View>
                  </View>
                  <Text style={{ fontSize: 11, color: '#777', lineHeight: 16 }}>{policy.desc}</Text>
                  <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginTop: 4 }}>
                    {Object.entries(policy.effect).map(([k, v]) => (
                      <View key={k} style={{ backgroundColor: '#F0F4F8', paddingHorizontal: 6, paddingVertical: 2 }}>
                        <Text style={{ fontSize: 9, color: '#2B4B6F' }}>{INDEX_LABEL[k as keyof typeof INDEX_LABEL]} +{v}</Text>
                      </View>
                    ))}
                  </View>
                </View>
                <Pressable
                  onPress={() => handleExecutePolicy(policy)}
                  disabled={!canAct || acting}
                  style={{ backgroundColor: canAct ? '#C82829' : '#ccc', paddingVertical: 10, alignItems: 'center', flexDirection: 'row', justifyContent: 'center', gap: 6 }}
                >
                  <Text style={{ color: '#fff', fontWeight: '700', fontSize: 12 }}>
                    {acting ? '颁布中…' : `颁布政令（${policy.cost} 万元）`}
                  </Text>
                  {!canAct && <Text style={{ color: 'rgba(255,255,255,0.7)', fontSize: 10 }}>经费不足</Text>}
                </Pressable>
              </View>
            );
          })}
        </View>
      )}

      {/* ── 部委大楼 ── */}
      {activeTab === 'building' && (
        <View style={{ padding: 14, gap: 10 }}>
          {/* 大楼概况 */}
          <View style={{ backgroundColor: '#0D1F35', padding: 14 }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 8 }}>
              <Text style={{ fontSize: 28 }}>🏛️</Text>
              <View>
                <Text style={{ color: '#fff', fontWeight: '700', fontSize: 16 }}>{ministryName}办公大楼</Text>
                <Text style={{ color: '#a0b4cc', fontSize: 11 }}>北京市西城区 · 国政院部委区</Text>
              </View>
            </View>
            <View style={{ flexDirection: 'row', gap: 8 }}>
              {[
                { label: '建筑面积', value: '3.2万㎡' },
                { label: '楼层', value: '18层' },
                { label: '启用年份', value: '2003年' },
              ].map(item => (
                <View key={item.label} style={{ flex: 1, backgroundColor: 'rgba(255,255,255,0.08)', padding: 8, alignItems: 'center' }}>
                  <Text style={{ color: '#a0b4cc', fontSize: 9 }}>{item.label}</Text>
                  <Text style={{ color: '#fff', fontWeight: '700', fontSize: 13, marginTop: 2 }}>{item.value}</Text>
                </View>
              ))}
            </View>
          </View>

          {/* 下设办公室 */}
          <Text style={{ fontSize: 11, color: '#888', letterSpacing: 2, fontWeight: '700', marginTop: 4 }}>下设机构</Text>
          {officesForMinistry.map((office, i) => (
            <View key={i} style={{ backgroundColor: '#fff', borderWidth: 1, borderColor: '#D1D1CF', padding: 12 }}>
              <View style={{ flexDirection: 'row', alignItems: 'flex-start', gap: 8 }}>
                <View style={{ backgroundColor: '#0D1F35', paddingHorizontal: 6, paddingVertical: 3, marginTop: 1 }}>
                  <Text style={{ color: '#fff', fontSize: 9 }}>{office.headTitle}</Text>
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={{ fontSize: 13, fontWeight: '700', color: '#1D2D44' }}>{office.name}</Text>
                  <Text style={{ fontSize: 11, color: '#777', marginTop: 3, lineHeight: 16 }}>{office.duty}</Text>
                </View>
                {/* 机构人数（随机模拟编制规模）*/}
                <View style={{ alignItems: 'flex-end' }}>
                  <Text style={{ fontSize: 11, color: '#C82829', fontWeight: '700' }}>{20 + i * 8}人</Text>
                  <Text style={{ fontSize: 9, color: '#aaa' }}>编制</Text>
                </View>
              </View>
            </View>
          ))}

          {/* 配套设施 */}
          <Text style={{ fontSize: 11, color: '#888', letterSpacing: 2, fontWeight: '700', marginTop: 4 }}>配套设施</Text>
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
            {['🏟️ 大会议室', '📚 资料室', '🖥️ 信息中心', '🍽️ 食堂', '🚗 公务车队', '🏋️ 职工活动室'].map(item => (
              <View key={item} style={{ backgroundColor: '#fff', borderWidth: 1, borderColor: '#D1D1CF', paddingHorizontal: 12, paddingVertical: 8 }}>
                <Text style={{ fontSize: 12, color: '#555' }}>{item}</Text>
              </View>
            ))}
          </View>

          {/* 当前任命档案 */}
          <View style={{ borderWidth: 1, borderColor: '#D1D1CF', backgroundColor: '#fff', padding: 12, gap: 6, marginTop: 4 }}>
            <Text style={{ fontSize: 11, color: '#888', letterSpacing: 2, fontWeight: '700', marginBottom: 4 }}>当前任命档案</Text>
            <Text style={{ fontSize: 12, color: '#333' }}>任命部委：<Text style={{ fontWeight: '700', color: '#2B4B6F' }}>{ministryName}</Text></Text>
            <Text style={{ fontSize: 12, color: '#333' }}>任命日期：<Text style={{ color: '#555' }}>{gameDaysToDate(save.lastMinistryRotateDay || save.lastRankDay)}</Text></Text>
            <Text style={{ fontSize: 12, color: '#333' }}>施政重点：<Text style={{ color: '#555' }}>{ministryInfo.focus}</Text></Text>
            <Text style={{ fontSize: 12, color: '#C82829' }}>距下次轮换：<Text style={{ fontWeight: '700' }}>{daysLeft} 天</Text></Text>
          </View>
        </View>
      )}

      {/* ── 重要工作 ── */}
      {activeTab === 'events' && (
        <View style={{ padding: 14, gap: 10 }}>
          <View style={{ backgroundColor: '#E8EAF6', borderWidth: 1, borderColor: '#9FA8DA', padding: 10, marginBottom: 4 }}>
            <Text style={{ fontSize: 11, color: '#283593', fontWeight: '700', marginBottom: 2 }}>📌 部长级重要工作事项</Text>
            <Text style={{ fontSize: 11, color: '#333', lineHeight: 17 }}>
              以下为部长级核心职务工作，每项有独立冷却周期。完成后获得政绩、上司好感及指标加成，是区别于施政命令的高层次活动。
            </Text>
          </View>

          {MINISTRY_EVENTS.map(ev => {
            const lastDay = eventLastDays[ev.key] ?? 0;
            const cooldownRemaining = lastDay > 0 ? Math.max(0, ev.cooldownDays - (save.gameDays - lastDay)) : 0;
            const isReady = cooldownRemaining === 0;
            const canAfford = ev.cost === 0 || save.fundBalance >= ev.cost;
            const isActing = actingEvent === ev.key;

            return (
              <View key={ev.key} style={{ backgroundColor: '#fff', borderWidth: 1, borderColor: isReady ? '#9FA8DA' : '#DDD', overflow: 'hidden' }}>
                {/* 头部 */}
                <View style={{ backgroundColor: isReady ? '#E8EAF6' : '#F5F5F5', padding: 12, gap: 4 }}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                    <Text style={{ fontSize: 22 }}>{ev.icon}</Text>
                    <View style={{ flex: 1 }}>
                      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
                        <Text style={{ fontSize: 13, fontWeight: '700', color: '#1D2D44' }}>{ev.title}</Text>
                        <View style={{ backgroundColor: ev.badgeColor + '22', borderWidth: 1, borderColor: ev.badgeColor, paddingHorizontal: 5, paddingVertical: 1 }}>
                          <Text style={{ fontSize: 9, color: ev.badgeColor, fontWeight: '700' }}>{ev.badge}</Text>
                        </View>
                      </View>
                      <Text style={{ fontSize: 10, color: '#888', marginTop: 2 }}>{ev.subtitle}</Text>
                    </View>
                    {/* 奖励信息 */}
                    <View style={{ alignItems: 'flex-end', gap: 2 }}>
                      <Text style={{ fontSize: 12, color: '#7B5E2A', fontWeight: '700' }}>政绩 +{ev.meritReward}</Text>
                      <Text style={{ fontSize: 10, color: '#2a7a3b' }}>好感 +{ev.favorReward}</Text>
                      {ev.cost > 0 && <Text style={{ fontSize: 10, color: '#C82829' }}>费用 -{ev.cost}万</Text>}
                    </View>
                  </View>

                  <Text style={{ fontSize: 11, color: '#666', lineHeight: 17, marginTop: 4 }}>{ev.desc}</Text>

                  {/* 指标效果 */}
                  <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 5, marginTop: 2 }}>
                    {Object.entries(ev.effects).map(([k, v]) => v ? (
                      <View key={k} style={{ backgroundColor: '#F0F4F8', paddingHorizontal: 6, paddingVertical: 2 }}>
                        <Text style={{ fontSize: 9, color: INDEX_COLOR[k as keyof typeof INDEX_COLOR] ?? '#555' }}>
                          {INDEX_LABEL[k as keyof typeof INDEX_LABEL] ?? k} +{v}
                        </Text>
                      </View>
                    ) : null)}
                  </View>

                  {/* 冷却状态 */}
                  {!isReady && (
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 4 }}>
                      <View style={{ flex: 1, height: 4, backgroundColor: '#E0E0E0' }}>
                        <View style={{
                          height: 4,
                          backgroundColor: '#7986CB',
                          width: `${((ev.cooldownDays - cooldownRemaining) / ev.cooldownDays) * 100}%`,
                        }} />
                      </View>
                      <Text style={{ fontSize: 10, color: '#888' }}>冷却剩余 {cooldownRemaining} 天</Text>
                    </View>
                  )}
                </View>

                {/* 执行按钮 */}
                <Pressable
                  onPress={() => void handleExecuteEvent(ev)}
                  disabled={!isReady || !canAfford || !!actingEvent}
                  style={{ backgroundColor: !isReady ? '#9E9E9E' : !canAfford ? '#E57373' : '#3949AB', paddingVertical: 10, alignItems: 'center' }}
                  android_ripple={{ color: 'rgba(255,255,255,0.2)' }}
                >
                  {isActing
                    ? <ActivityIndicator size="small" color="#FFF" />
                    : <Text style={{ color: '#FFF', fontWeight: '700', fontSize: 12 }}>
                        {!isReady ? `⏳ 冷却中（${cooldownRemaining}天）` : !canAfford ? '经费不足' : `▶ 执行此项工作`}
                      </Text>
                  }
                </Pressable>
              </View>
            );
          })}
        </View>
      )}

      {/* ── 部委人员 ── */}
      {activeTab === 'staff' && (
        <View style={{ padding: 14, gap: 10 }}>
          {/* 人员统计 */}
          <View style={{ flexDirection: 'row', gap: 8 }}>
            {[
              { label: '司/处级正职', count: headCount, color: '#C82829' },
              { label: '司/处级副职', count: deputyCount, color: '#2B4B6F' },
              { label: '科员及以下', count: staffCount, color: '#7B5E2A' },
            ].map(item => (
              <View key={item.label} style={{ flex: 1, backgroundColor: '#fff', borderWidth: 1, borderColor: '#D1D1CF', padding: 10, alignItems: 'center' }}>
                <Text style={{ fontSize: 18, fontWeight: '700', color: item.color }}>{item.count}</Text>
                <Text style={{ fontSize: 9, color: '#888', marginTop: 2, textAlign: 'center' }}>{item.label}</Text>
              </View>
            ))}
          </View>

          <Text style={{ fontSize: 11, color: '#888', letterSpacing: 2, fontWeight: '700' }}>各机构在岗人员</Text>

          {/* 各办公室展开列表 */}
          {officesForMinistry.map((office) => {
            const isExpanded = expandedOffice === office.name;
            return (
              <View key={office.name} style={{ borderWidth: 1, borderColor: '#D1D1CF', backgroundColor: '#fff' }}>
                {/* 机构行（可点击展开） */}
                <Pressable
                  onPress={() => setExpandedOffice(isExpanded ? null : office.name)}
                  style={{ flexDirection: 'row', alignItems: 'center', padding: 12, gap: 8 }}
                >
                  <View style={{ backgroundColor: '#0D1F35', paddingHorizontal: 6, paddingVertical: 3 }}>
                    <Text style={{ color: '#fff', fontSize: 9 }}>{office.headTitle}</Text>
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={{ fontSize: 13, fontWeight: '700', color: '#1D2D44' }}>{office.name}</Text>
                    <Text style={{ fontSize: 10, color: '#aaa', marginTop: 1 }}>{office.duty}</Text>
                  </View>
                  <View style={{ alignItems: 'flex-end', gap: 2 }}>
                    <Text style={{ fontSize: 11, color: '#C82829', fontWeight: '700' }}>{office.staff.length} 人</Text>
                    <Text style={{ fontSize: 10, color: '#aaa' }}>{isExpanded ? '▲ 收起' : '▼ 展开'}</Text>
                  </View>
                </Pressable>

                {/* 展开：人员明细 */}
                {isExpanded && (
                  <View style={{ borderTopWidth: 1, borderTopColor: '#F0EEEA' }}>
                    {office.staff.map((s, si) => {
                      const levelColor = s.level === 'head' ? '#C82829' : s.level === 'deputy' ? '#2B4B6F' : '#7B5E2A';
                      const levelLabel = s.level === 'head' ? '正职' : s.level === 'deputy' ? '副职' : '科员';
                      return (
                        <View key={si} style={{
                          flexDirection: 'row', alignItems: 'center', paddingVertical: 8, paddingHorizontal: 12, gap: 8,
                          borderBottomWidth: si < office.staff.length - 1 ? 1 : 0, borderBottomColor: '#F5F5F5',
                          backgroundColor: si % 2 === 0 ? '#FAFAFA' : '#fff',
                        }}>
                          <View style={{ backgroundColor: levelColor, paddingHorizontal: 5, paddingVertical: 2, minWidth: 30, alignItems: 'center' }}>
                            <Text style={{ color: '#fff', fontSize: 8, fontWeight: '700' }}>{levelLabel}</Text>
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
          })}

          <Text style={{ fontSize: 11, color: '#aaa', textAlign: 'center', marginTop: 4, lineHeight: 17 }}>
            以上人员为部委独立编制，由组织部统一调配，独立于您的个人班底
          </Text>
        </View>
      )}

      {/* ── 科技委 Tab ── */}
      {activeTab === 'scitech' && (
        <View style={{ padding: 14, gap: 10 }}>
          <View style={{ backgroundColor: '#2B4B6F', padding: 14 }}>
            <Text style={{ color: 'rgba(180,210,255,0.6)', fontSize: 9, letterSpacing: 2 }}>国家科学技术委员会</Text>
            <Text style={{ color: '#fff', fontWeight: '700', fontSize: 14, marginTop: 3 }}>🔬 科技战略投入</Text>
            <Text style={{ color: 'rgba(180,210,255,0.85)', fontSize: 11, marginTop: 4, lineHeight: 16 }}>
              确定科研方向，拨付专项科研经费，推动核心技术攻关与成果转化。
            </Text>
          </View>
          <View style={{ flexDirection: 'row', backgroundColor: '#fff', borderWidth: 1, borderColor: '#D0D0D0', padding: 12, gap: 10 }}>
            <View style={{ flex: 1, alignItems: 'center' }}>
              <Text style={{ color: '#888', fontSize: 9 }}>科技投入总额</Text>
              <Text style={{ color: '#2B4B6F', fontWeight: '700', fontSize: 14 }}>¥{formatMoney(save.sciTechInvestTotal ?? 0)}</Text>
            </View>
            <View style={{ width: 1, backgroundColor: '#EEE' }} />
            <View style={{ flex: 1, alignItems: 'center' }}>
              <Text style={{ color: '#888', fontSize: 9 }}>专项经费</Text>
              <Text style={{ color: '#C82829', fontWeight: '700', fontSize: 14 }}>¥{formatMoney(save.fundBalance)}</Text>
            </View>
          </View>
          {SCITECH_DIRS.map(dir => {
            const canAct = !acting && save.fundBalance >= dir.cost;
            return (
              <View key={dir.id} style={{ backgroundColor: '#fff', borderWidth: 1, borderColor: '#D0D0D0', overflow: 'hidden' }}>
                <View style={{ padding: 12, flexDirection: 'row', gap: 10, alignItems: 'flex-start' }}>
                  <Text style={{ fontSize: 22 }}>{dir.icon}</Text>
                  <View style={{ flex: 1 }}>
                    <Text style={{ fontSize: 13, fontWeight: '700', color: '#1D2D44' }}>{dir.name}</Text>
                    <View style={{ flexDirection: 'row', gap: 6, marginTop: 5, flexWrap: 'wrap' }}>
                      <View style={{ backgroundColor: '#F0F4F8', paddingHorizontal: 6, paddingVertical: 2 }}>
                        <Text style={{ fontSize: 9, color: '#2B4B6F' }}>经费 ¥{formatMoney(dir.cost)}</Text>
                      </View>
                      <View style={{ backgroundColor: '#F0FAF0', paddingHorizontal: 6, paddingVertical: 2 }}>
                        <Text style={{ fontSize: 9, color: '#2a7a3b' }}>政绩+{dir.merit}</Text>
                      </View>
                      {dir.gdpD > 0 && <View style={{ backgroundColor: '#FFF9E6', paddingHorizontal: 6, paddingVertical: 2 }}><Text style={{ fontSize: 9, color: '#7B5E2A' }}>GDP+{dir.gdpD}</Text></View>}
                      {dir.bizD > 0 && <View style={{ backgroundColor: '#F0F8FF', paddingHorizontal: 6, paddingVertical: 2 }}><Text style={{ fontSize: 9, color: '#1565C0' }}>营商+{dir.bizD}</Text></View>}
                      {dir.ecoD > 0 && <View style={{ backgroundColor: '#F0FAF0', paddingHorizontal: 6, paddingVertical: 2 }}><Text style={{ fontSize: 9, color: '#2a7a3b' }}>生态+{dir.ecoD}</Text></View>}
                    </View>
                  </View>
                </View>
                <Pressable
                  disabled={!canAct}
                  onPress={async () => {
                    if (!canAct) return;
                    setActing(true);
                    await updateGameSave({
                      fundBalance: save.fundBalance - dir.cost,
                      meritPoints: save.meritPoints + dir.merit,
                      cityGdp: Math.min(100, (save.cityGdp ?? 0) + dir.gdpD),
                      cityBusiness: Math.min(100, (save.cityBusiness ?? 0) + dir.bizD),
                      cityEcology: Math.min(100, (save.cityEcology ?? 0) + dir.ecoD),
                      sciTechInvestTotal: (save.sciTechInvestTotal ?? 0) + dir.cost,
                    });
                    setResult(`✅ 已投入${dir.name}研究，政绩+${dir.merit}`);
                    setActing(false);
                    setTimeout(() => setResult(''), 2500);
                  }}
                  style={{ backgroundColor: canAct ? '#2B4B6F' : '#ccc', paddingVertical: 10, alignItems: 'center' }}
                >
                  <Text style={{ color: '#fff', fontSize: 12, fontWeight: '700' }}>
                    {canAct ? `▶ 拨付科研经费 ¥${formatMoney(dir.cost)}` : '⚠️ 经费不足'}
                  </Text>
                </Pressable>
              </View>
            );
          })}
        </View>
      )}

      {/* ── 纪检委 Tab ── */}
      {activeTab === 'discipline' && (
        <View style={{ padding: 14, gap: 10 }}>
          <View style={{ backgroundColor: '#2D1A00', padding: 14 }}>
            <Text style={{ color: 'rgba(255,210,150,0.6)', fontSize: 9, letterSpacing: 2 }}>中枢纪律督察委员会</Text>
            <Text style={{ color: '#fff', fontWeight: '700', fontSize: 14, marginTop: 3 }}>⚖️ 反腐纠风行动</Text>
            <Text style={{ color: 'rgba(255,210,150,0.85)', fontSize: 11, marginTop: 4, lineHeight: 16 }}>
              对廉洁指数低的干部立案调查，维护党纪国法，筑牢廉政防线。
            </Text>
          </View>
          {(() => {
            const suspects = (save as unknown as Record<string,unknown>);
            // 模拟5个典型案例（基于save.gameDays种子）
            const cases = CORRUPT_CHARGES.slice(0, 5).map((charge, i) => {
              const seed = (save.gameDays + i * 37) % 100;
              const severity = seed < 20 ? '严重违纪' : seed < 50 ? '一般违纪' : '违规问题';
              const severityColor = seed < 20 ? '#8B0000' : seed < 50 ? '#C82829' : '#7B5E2A';
              const names = ['张某某','李某某','王某某','刘某某','陈某某'];
              const positions = ['省级干部','地厅级','县处级','市委常委','省委委员'];
              return { id: `case-${i}`, name: names[i], position: positions[i], charge, severity, severityColor, seed };
            });
            return cases.map(c => (
              <View key={c.id} style={{ backgroundColor: '#fff', borderWidth: 1, borderColor: '#D0D0D0', overflow: 'hidden' }}>
                <View style={{ padding: 12, gap: 6 }}>
                  <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                    <Text style={{ fontSize: 13, fontWeight: '700', color: '#222' }}>{c.name} · {c.position}</Text>
                    <View style={{ backgroundColor: c.severityColor, paddingHorizontal: 6, paddingVertical: 2 }}>
                      <Text style={{ fontSize: 9, color: '#fff', fontWeight: '700' }}>{c.severity}</Text>
                    </View>
                  </View>
                  <Text style={{ fontSize: 11, color: '#555' }}>问题线索：{c.charge}</Text>
                </View>
                <View style={{ flexDirection: 'row', borderTopWidth: 1, borderTopColor: '#F0F0F0' }}>
                  <Pressable
                    disabled={acting}
                    onPress={async () => {
                      setActing(true);
                      await updateGameSave({ meritPoints: save.meritPoints + 25, moralValue: Math.min(100, save.moralValue + 3) });
                      setResult(`✅ 已对${c.name}立案调查，政绩+25，廉洁+3`);
                      setActing(false);
                      setTimeout(() => setResult(''), 2500);
                    }}
                    style={{ flex: 1, paddingVertical: 9, alignItems: 'center', backgroundColor: '#2D1A00' }}
                  >
                    <Text style={{ fontSize: 11, color: '#fff', fontWeight: '700' }}>🔍 立案调查</Text>
                  </Pressable>
                  <View style={{ width: 1, backgroundColor: '#F0F0F0' }} />
                  <Pressable
                    disabled={acting}
                    onPress={async () => {
                      setActing(true);
                      await updateGameSave({ meritPoints: save.meritPoints + 10 });
                      setResult(`📋 已对${c.name}予以诫勉谈话，政绩+10`);
                      setActing(false);
                      setTimeout(() => setResult(''), 2500);
                    }}
                    style={{ flex: 1, paddingVertical: 9, alignItems: 'center', backgroundColor: '#7B5E2A' }}
                  >
                    <Text style={{ fontSize: 11, color: '#fff', fontWeight: '700' }}>📋 诫勉谈话</Text>
                  </Pressable>
                </View>
              </View>
            ));
          })()}
        </View>
      )}

      {/* 操作结果提示 */}
      {!!result && (
        <View style={{ position: 'absolute', bottom: 24, left: 16, right: 16, backgroundColor: '#2a7a3b', padding: 12, alignItems: 'center' }}>
          <Text style={{ color: '#fff', fontWeight: '700', fontSize: 13 }}>{result}</Text>
        </View>
      )}
    </ScrollView>
  );
}
