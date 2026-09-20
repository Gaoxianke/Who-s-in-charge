// 下属管理页面 v2 - 现实化干部人事管理
// 核心机制：组织考察流程 / 五维考核 / 干部随机事件 / 派系冲突提示
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
  getSubsWithEvents, handleSubEvent,
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
import { SubLoyaltyControls } from '@/components/SubLoyaltyControls';


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
  const reqDays = sub.nominationPosition === 'head' ? 5 : sub.nominationPosition === 'deputy' ? 2 : 1;
  const elapsed = currentDay - (sub.nominationStartDay ?? currentDay);
  const pct = Math.min(100, Math.round((elapsed / reqDays) * 100));
  const deptName = sub.nominationDept ? getDeptNameByRank(sub.nominationDept, rankLevel) : '待定';
  const posLabel = sub.nominationPosition === 'head' ? '正职' : sub.nominationPosition === 'deputy' ? '副职' : '科员';
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

type MainTab = 'active' | 'reviewing' | 'standby' | 'events';

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
  const [tab, setTab] = useState<MainTab>('active');
  const [showTransferModal, setShowTransferModal] = useState(false);
  const [transferCity, setTransferCity] = useState('');
  const [transferDept, setTransferDept] = useState<DeptKey | null>(null);
  const [transferPos, setTransferPos] = useState<'head' | 'deputy' | 'staff'>('deputy');
  const [resumeModal, setResumeModal] = useState<{ sub: Subordinate; resumes: SubResume[] } | null>(null);
  const [promotingId, setPromotingId] = useState<string | null>(null);
  const [batchLoading, setBatchLoading] = useState(false);
  const [workSub, setWorkSub] = useState<Subordinate | null>(null);
  const [reviewSub, setReviewSub] = useState<Subordinate | null>(null);
  const [nominateSub, setNominateSub] = useState<Subordinate | null>(null);
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
  const handleStartNomination = async (sub: Subordinate, deptKey: DeptKey, position: 'head' | 'deputy' | 'staff') => {
    if (!save) return;
    // 检查是否满足基本资格（科员无门槛）
    const minAbility = position === 'head' ? 45 : position === 'deputy' ? 35 : 0;
    if (sub.ability < minAbility) {
      showFeedback(`⚠ ${sub.name} 能力值 ${sub.ability} 不达标（正职需≥45，副职需≥35），建议先培养`);
      return;
    }
    if (position !== 'staff' && sub.integrity < 30) {
      showFeedback(`⚠ ${sub.name} 廉洁值 ${sub.integrity} 过低（需≥30），有被组织部否决风险`);
    }
    // 检查正职名额
    if (position === 'head') {
      const existHead = subordinates.filter(s => s.appointedDept === deptKey && s.deptPosition === 'head' && s.isAppointed);
      if (existHead.length >= 1) {
        showFeedback(`${getDeptNameByRank(deptKey, save.rankLevel)}正职已有人选，须先解除现任`);
        return;
      }
    } else if (position === 'deputy') {
      const existDep = subordinates.filter(s => s.appointedDept === deptKey && s.deptPosition === 'deputy' && s.isAppointed);
      if (existDep.length >= 3) {
        showFeedback(`${getDeptNameByRank(deptKey, save.rankLevel)}副职已满（最多3名）`);
        return;
      }
    }
    await startNomination(sub.id, deptKey, position, save.gameDays);
    const reqDays = position === 'head' ? 5 : position === 'deputy' ? 2 : 0;
    showFeedback(reqDays > 0
      ? `📋 已启动 ${sub.name} 的组织考察，需经 ${reqDays} 天考察期后方可正式任命`
      : `📋 已启动 ${sub.name} 的科员任命程序，将即时通过`);
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
    if (!save || !selectedSub || !transferDept) return;
    const minAbility = transferPos === 'head' ? 45 : transferPos === 'deputy' ? 35 : 0;
    if (selectedSub.ability < minAbility) {
      showFeedback(`⚠ ${selectedSub.name} 能力值 ${selectedSub.ability} 不达标（正职需≥45，副职需≥35）`);
      return;
    }
    await transferSubordinate(selectedSub.id, transferDept, transferPos, transferCity.trim(), save.rankLevel);
    const deptName = getDeptNameByRank(transferDept, save.rankLevel);
    const posLabel = transferPos === 'head' ? '正职' : transferPos === 'deputy' ? '副职' : '科员';
    showFeedback(transferCity.trim()
      ? `已将 ${selectedSub.name} 调任至${transferCity.trim()}·${deptName}（${posLabel}）`
      : `已将 ${selectedSub.name} 调整至${deptName}（${posLabel}）`);
    setShowTransferModal(false);
    setTransferCity('');
    setTransferDept(null);
    setSelectedSub(null);
    void reload();
  };

  // ── 分配工作任务 ─────────────────────────────────────────────
  const handleAssignWork = async (sub: Subordinate, task: typeof WORK_TASKS[0]) => {
    if (!save) return;
    await conductFiveDimReview(sub.id, save.gameDays, '称职');
    await updateGameSave({ meritPoints: save.meritPoints + task.meritReward });
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
  const activeCount    = subordinates.filter(s => s.isAppointed && !s.transferredCity).length;
  const standbyCount   = subordinates.filter(s => !s.isAppointed && !s.transferredCity).length;
  const reviewingCount = subordinates.filter(s => s.nominationStatus === 'reviewing').length;
  const eventCount     = pendingEvents.length;

  const filteredSubs = (() => {
    const sortFn = (a: Subordinate, b: Subordinate) => b.subLevel !== a.subLevel ? b.subLevel - a.subLevel : b.ability - a.ability;
    switch (tab) {
      case 'events':    return [...pendingEvents].sort(sortFn);
      case 'reviewing': return [...subordinates.filter(s => s.nominationStatus !== 'idle')].sort(sortFn);
      case 'standby':   return [...subordinates.filter(s => (!s.isAppointed && !s.transferredCity) || !!s.transferredCity)].sort(sortFn);
      // 在任：已任命且未调任
      default:          return [...subordinates.filter(s => s.isAppointed && !s.transferredCity)].sort(sortFn);
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
    { key: 'events',    label: '事件待办', badge: eventCount },
    { key: 'active',    label: '在任',     badge: activeCount },
    { key: 'reviewing', label: '考察中',   badge: reviewingCount },
    { key: 'standby',   label: '待命/离任', badge: standbyCount },
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
            <Text style={{ color: '#a0b4cc', fontSize: 10 }}>在职{totalCount}/145 · 在任{activeCount}</Text>
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
                <View style={{ backgroundColor: t.key === 'events' ? '#C82829' : '#2B4B6F', borderRadius: 8, paddingHorizontal: 5, paddingVertical: 1 }}>
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
      ) : (
        <FlatList
          data={filteredSubs}
          keyExtractor={item => item.id}
          contentContainerStyle={{ padding: 14, paddingBottom: insets.bottom + 24 }}
          ListEmptyComponent={
            <View style={{ alignItems: 'center', marginTop: 60, gap: 8 }}>
              <Text style={{ color: '#888', fontSize: 14 }}>
                {tab === 'events' ? '暂无待处理事件' : tab === 'reviewing' ? '无进行中的考察程序' : tab === 'standby' ? '暂无待命或离任人员' : '暂无在任人员'}
              </Text>
              {tab === 'events' && <Text style={{ color: '#aaa', fontSize: 11 }}>推进时间后可能触发干部随机事件</Text>}
            </View>
          }
          ListHeaderComponent={
            tab === 'active' && save ? (
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
              onOpenWork={setWorkSub}
              onOpenReview={setReviewSub}
              onOpenNominate={setNominateSub}
              promotingId={promotingId}
              reviewingId={reviewingId}
              onNominate={handleStartNomination}
              onCancelNomination={handleCancelNomination}
              onRemove={handleRemove}
              onReview={handleFiveDimReview}
              onPromote={handlePromote}
              onDemote={handleDemote}
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
      {showTransferModal && selectedSub && save && (
        <View style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end', zIndex: 99 }}>
          <View style={{ backgroundColor: '#fff', maxHeight: '82%' }}>
            <View style={{ backgroundColor: '#1D3B5E', padding: 14, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
              <Text style={{ color: '#fff', fontSize: 14, fontWeight: '700' }}>🔄 {selectedSub.name} · 部门调任</Text>
              <Pressable onPress={() => { setShowTransferModal(false); setTransferCity(''); setTransferDept(null); }}><Text style={{ color: '#a0b4cc', fontSize: 22 }}>×</Text></Pressable>
            </View>
            <ScrollView contentContainerStyle={{ padding: 12, gap: 10 }}>
              <Text style={{ fontSize: 10, color: '#555' }}>选择目标职能部门与岗位角色；填写目标城市可跨城市调动（留空则在本市内调整部门）。</Text>
              <Text style={{ fontSize: 11, color: '#2B4B6F', fontWeight: '700' }}>目标部门</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                <View style={{ flexDirection: 'row', gap: 6 }}>
                  {(Object.keys(DEPT_CONFIG) as DeptKey[]).map(dk => {
                    const active = transferDept === dk;
                    return (
                      <Pressable key={dk} onPress={() => setTransferDept(dk)}
                        style={{ paddingHorizontal: 10, paddingVertical: 7, backgroundColor: active ? '#2B4B6F' : '#F0EFEA', borderWidth: 1, borderColor: active ? '#2B4B6F' : '#D1D1CF' }}>
                        <Text style={{ color: active ? '#fff' : '#444', fontSize: 11, fontWeight: active ? '700' : '400' }}>{getDeptNameByRank(dk, save.rankLevel)}</Text>
                      </Pressable>
                    );
                  })}
                </View>
              </ScrollView>
              <Text style={{ fontSize: 11, color: '#2B4B6F', fontWeight: '700' }}>岗位角色</Text>
              <View style={{ flexDirection: 'row', gap: 8 }}>
                {([['head', '正职'], ['deputy', '副职'], ['staff', '科员']] as const).map(([pos, label]) => {
                  const active = transferPos === pos;
                  return (
                    <Pressable key={pos} onPress={() => setTransferPos(pos)}
                      style={{ flex: 1, paddingVertical: 9, backgroundColor: active ? '#2a5a3e' : '#F0EFEA', borderWidth: 1, borderColor: active ? '#2a5a3e' : '#D1D1CF', alignItems: 'center' }}>
                      <Text style={{ color: active ? '#fff' : '#444', fontSize: 12, fontWeight: active ? '700' : '400' }}>{label}</Text>
                    </Pressable>
                  );
                })}
              </View>
              <Text style={{ fontSize: 11, color: '#2B4B6F', fontWeight: '700' }}>目标城市（可选，跨城市调动）</Text>
              <TextInput value={transferCity} onChangeText={setTransferCity} placeholder="留空则在本市内调整部门"
                style={{ borderWidth: 1, borderColor: '#CCC', paddingHorizontal: 12, paddingVertical: 8, fontSize: 14 }} />
              <View style={{ flexDirection: 'row', gap: 10 }}>
                <Pressable onPress={() => { setShowTransferModal(false); setTransferCity(''); setTransferDept(null); }}
                  style={{ flex: 1, paddingVertical: 10, borderWidth: 1, borderColor: '#CCC', alignItems: 'center' }}>
                  <Text style={{ color: '#666', fontSize: 13 }}>取消</Text>
                </Pressable>
                <Pressable onPress={() => void handleTransfer()} disabled={!transferDept}
                  style={{ flex: 1, paddingVertical: 10, backgroundColor: transferDept ? '#2B4B6F' : '#CCC', alignItems: 'center' }}>
                  <Text style={{ color: '#fff', fontSize: 13, fontWeight: '700' }}>确认调任</Text>
                </Pressable>
              </View>
            </ScrollView>
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

      {/* 分配工作弹层 */}
      {workSub && (
        <View style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end', zIndex: 99 }}>
          <View style={{ backgroundColor: '#fff', maxHeight: '70%' }}>
            <View style={{ backgroundColor: '#2B4B6F', padding: 14, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
              <View>
                <Text style={{ color: '#a0b4cc', fontSize: 10, letterSpacing: 1 }}>工作任务分配</Text>
                <Text style={{ color: '#fff', fontSize: 14, fontWeight: '700' }}>📋 {workSub.name} · 分配工作</Text>
              </View>
              <Pressable onPress={() => setWorkSub(null)}><Text style={{ color: '#a0b4cc', fontSize: 22 }}>×</Text></Pressable>
            </View>
            <ScrollView contentContainerStyle={{ padding: 12, gap: 8 }}>
              {WORK_TASKS.map(task => (
                <Pressable key={task.label} onPress={() => { void handleAssignWork(workSub, task); setWorkSub(null); }}
                  style={{ flexDirection: 'row', alignItems: 'center', backgroundColor: '#F8FAFC', borderWidth: 1, borderColor: '#D1D1D1', padding: 10, gap: 8 }}>
                  <View style={{ flex: 1 }}>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
                      <Text style={{ fontSize: 13, fontWeight: '700', color: '#222' }}>{task.label}</Text>
                      <View style={{ backgroundColor: '#2B4B6F', paddingHorizontal: 5, paddingVertical: 1 }}>
                        <Text style={{ color: '#fff', fontSize: 9 }}>{task.tag}</Text>
                      </View>
                      <Text style={{ fontSize: 10, color: '#2a7a3b', fontWeight: '600' }}>政绩+{task.meritReward}</Text>
                    </View>
                    <Text style={{ fontSize: 10, color: '#888', marginTop: 2 }}>{task.desc}</Text>
                  </View>
                  <View style={{ backgroundColor: '#2a7a3b', paddingHorizontal: 10, paddingVertical: 5 }}>
                    <Text style={{ color: '#fff', fontSize: 11, fontWeight: '700' }}>分配</Text>
                  </View>
                </Pressable>
              ))}
            </ScrollView>
          </View>
        </View>
      )}

      {/* 五维考核弹层 */}
      {reviewSub && (
        <View style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end', zIndex: 99 }}>
          <View style={{ backgroundColor: '#fff', maxHeight: '70%' }}>
            <View style={{ backgroundColor: '#C82829', padding: 14, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
              <View>
                <Text style={{ color: 'rgba(255,255,255,0.7)', fontSize: 10, letterSpacing: 1 }}>年度五维考核</Text>
                <Text style={{ color: '#fff', fontSize: 14, fontWeight: '700' }}>🏆 {reviewSub.name} · 德能勤绩廉</Text>
              </View>
              <Pressable onPress={() => setReviewSub(null)}><Text style={{ color: 'rgba(255,255,255,0.8)', fontSize: 22 }}>×</Text></Pressable>
            </View>
            <ScrollView contentContainerStyle={{ padding: 12, gap: 8 }}>
              <Text style={{ fontSize: 10, color: '#888' }}>考核将产生随机分值波动，综合影响干部各项指标</Text>
              {reviewingId === reviewSub.id ? (
                <View style={{ paddingVertical: 20, alignItems: 'center' }}><ActivityIndicator size="small" color="#C82829" /></View>
              ) : (
                REVIEW_GRADES.map(grade => (
                  <Pressable key={grade.label} onPress={() => { void handleFiveDimReview(reviewSub, grade.label as ReviewGrade); setReviewSub(null); }}
                    style={{ flexDirection: 'row', alignItems: 'center', backgroundColor: '#FFF8F8', borderWidth: 1, borderColor: grade.color + '66', padding: 10, gap: 10 }}>
                    <View style={{ backgroundColor: grade.color, paddingHorizontal: 10, paddingVertical: 4, minWidth: 60, alignItems: 'center' }}>
                      <Text style={{ color: '#fff', fontSize: 12, fontWeight: '700' }}>{grade.label}</Text>
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={{ fontSize: 11, color: '#555' }}>{grade.desc}</Text>
                      {grade.meritGain > 0 && <Text style={{ fontSize: 10, color: '#2a7a3b', marginTop: 2 }}>政绩+{grade.meritGain}</Text>}
                    </View>
                  </Pressable>
                ))
              )}
            </ScrollView>
          </View>
        </View>
      )}

      {/* 任命提名弹层 */}
      {nominateSub && save && (
        <View style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end', zIndex: 99 }}>
          <View style={{ backgroundColor: '#fff', maxHeight: '72%' }}>
            <View style={{ backgroundColor: '#1D3B5E', padding: 14, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
              <View>
                <Text style={{ color: '#a0b4cc', fontSize: 10, letterSpacing: 1 }}>启动组织考察</Text>
                <Text style={{ color: '#fff', fontSize: 14, fontWeight: '700' }}>🏛️ {nominateSub.name} · 提名任职</Text>
              </View>
              <Pressable onPress={() => setNominateSub(null)}><Text style={{ color: '#a0b4cc', fontSize: 22 }}>×</Text></Pressable>
            </View>
            <ScrollView contentContainerStyle={{ padding: 12, gap: 10 }}>
              <Text style={{ fontSize: 10, color: '#555' }}>⚠ 正职须经5天考察期 · 副职须经2天 · 科员即时通过 · 考察结果受能力/廉洁影响 · 可随时撤回</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                <View style={{ flexDirection: 'row', gap: 8 }}>
                  {(Object.keys(DEPT_CONFIG) as DeptKey[]).map(dk => {
                    const deptName = getDeptNameByRank(dk, save.rankLevel);
                    const headFull = subordinates.filter(s => s.appointedDept === dk && s.deptPosition === 'head' && s.isAppointed).length >= 1;
                    const depFull  = subordinates.filter(s => s.appointedDept === dk && s.deptPosition === 'deputy' && s.isAppointed).length >= 3;
                    const match = getMatchBonus(nominateSub.specialty, dk);
                    return (
                      <View key={dk} style={{ alignItems: 'center', gap: 4, minWidth: 72 }}>
                        <Text style={{ fontSize: 10, color: '#333', fontWeight: '600', textAlign: 'center' }} numberOfLines={2}>{deptName}</Text>
                        {match ? <Text style={{ fontSize: 9, color: '#2a7a3b' }}>{match}</Text> : null}
                        <Pressable onPress={() => { handleStartNomination(nominateSub, dk, 'head'); setNominateSub(null); }}
                          disabled={headFull}
                          style={{ paddingHorizontal: 8, paddingVertical: 6, backgroundColor: headFull ? '#CCC' : '#2B4B6F', width: 60, alignItems: 'center' }}>
                          <Text style={{ color: '#fff', fontSize: 10, fontWeight: '700' }}>{headFull ? '正满' : '提名正职'}</Text>
                        </Pressable>
                        <Pressable onPress={() => { handleStartNomination(nominateSub, dk, 'deputy'); setNominateSub(null); }}
                          disabled={depFull}
                          style={{ paddingHorizontal: 8, paddingVertical: 6, backgroundColor: depFull ? '#CCC' : '#2a5a3e', width: 60, alignItems: 'center' }}>
                          <Text style={{ color: '#fff', fontSize: 10, fontWeight: '700' }}>{depFull ? '副满' : '提名副职'}</Text>
                        </Pressable>
                        <Pressable onPress={() => { handleStartNomination(nominateSub, dk, 'staff'); setNominateSub(null); }}
                          style={{ paddingHorizontal: 8, paddingVertical: 6, backgroundColor: '#7a6a2a', width: 60, alignItems: 'center' }}>
                          <Text style={{ color: '#fff', fontSize: 10, fontWeight: '700' }}>提名科员</Text>
                        </Pressable>
                      </View>
                    );
                  })}
                </View>
              </ScrollView>
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
  onOpenWork: (sub: Subordinate) => void;
  onOpenReview: (sub: Subordinate) => void;
  onOpenNominate: (sub: Subordinate) => void;
  promotingId: string | null;
  reviewingId: string | null;
  onNominate: (sub: Subordinate, dept: DeptKey, position: 'head' | 'deputy') => void;
  onCancelNomination: (sub: Subordinate) => void;
  onRemove: (sub: Subordinate) => void;
  onReview: (sub: Subordinate, grade: ReviewGrade) => void;
  onPromote: (sub: Subordinate) => void;
  onDemote: (sub: Subordinate) => void;
  onAssignWork: (sub: Subordinate, task: typeof WORK_TASKS[0]) => void;
  onTransfer: () => void;
  onViewResume: (sub: Subordinate) => void;
  onEventTap: () => void;
  onPromoteToLeadership: () => void;
};

function SubCard({ item, save, subordinates, selectedSub, setSelectedSub,
  onOpenWork, onOpenReview, onOpenNominate,
  promotingId, reviewingId,
  onNominate, onCancelNomination, onRemove, onReview, onPromote, onDemote,
  onAssignWork, onTransfer, onViewResume, onEventTap, onPromoteToLeadership,
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
        <View style={{ width: 44, height: 44, borderRadius: 22, backgroundColor: avatarBg, alignItems: 'center', justifyContent: 'center', borderWidth: 2, borderColor: 'rgba(255,255,255,0.25)' }}>
          <Text style={{ fontSize: 22 }}>{avatarEmoji}</Text>
        </View>
        <View style={{ flex: 1 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 5, flexWrap: 'wrap' }}>
            <Text style={{ fontSize: 14, fontWeight: '700', color: '#222' }}>{item.name}</Text>
            <Text style={{ fontSize: 10, color: '#888' }}>{item.gender} · {age}岁</Text>
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

          {/* 忠诚条 + 赏赐 + 派遣 */}
          <SubLoyaltyControls sub={item} onDone={() => {}} />

          {/* 操作按钮行 */}
          <View style={{ flexDirection: 'row', gap: 6, flexWrap: 'wrap' }}>
            {/* 履历 */}
            <Pressable onPress={() => void onViewResume(item)}
              style={{ paddingHorizontal: 10, paddingVertical: 7, backgroundColor: '#2a2a4a' }}>
              <Text style={{ fontSize: 11, color: '#fff' }}>📁 履历</Text>
            </Pressable>
            {/* 分配工作 */}
            <Pressable onPress={() => onOpenWork(item)}
              style={{ paddingHorizontal: 10, paddingVertical: 7, backgroundColor: '#2B4B6F' }}>
              <Text style={{ fontSize: 11, color: '#fff' }}>📋 分配工作</Text>
            </Pressable>
            {/* 五维考核 */}
            <Pressable onPress={() => onOpenReview(item)}
              style={{ paddingHorizontal: 10, paddingVertical: 7, backgroundColor: '#C82829' }}>
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

          {/* ── 启动组织考察（独立弹层）── */}
          {item.nominationStatus === 'idle' && (
            <Pressable onPress={() => onOpenNominate(item)}
              style={{ backgroundColor: '#1D3B5E', paddingVertical: 9, paddingHorizontal: 12, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
              <Text style={{ color: '#fff', fontSize: 11, fontWeight: '700' }}>🏛️ 启动组织考察 · 提名任职</Text>
              <Text style={{ color: '#a0b4cc', fontSize: 10 }}>›</Text>
            </Pressable>
          )}

          {/* 撤回考察按钮 */}
          {item.nominationStatus === 'reviewing' && (
            <Pressable onPress={() => void onCancelNomination(item)}
              style={{ backgroundColor: '#7a1a1a', paddingVertical: 8, alignItems: 'center' }}>
              <Text style={{ color: '#fff', fontSize: 11 }}>撤回考察提名</Text>
            </Pressable>
          )}
          {item.nominationStatus === 'rejected' && (
            <Pressable onPress={() => void resetNominationRejected(item.id)}
              style={{ backgroundColor: '#555', paddingVertical: 8, alignItems: 'center' }}>
              <Text style={{ color: '#fff', fontSize: 11 }}>重新提名</Text>
            </Pressable>
          )}
        </View>
      )}
    </Pressable>
  );
}

