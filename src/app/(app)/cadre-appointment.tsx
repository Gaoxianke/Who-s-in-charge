// 央管干部任免页 — 三级委员会表决制度
// 省级及以上：7人政治局常委会  |  省管（市级）：5人省委常委会  |  市管（县级）：3人市委常委会
// 最高职位享有一锤定音权，NPC可发起提案，表决结果影响各委员关系值
import { useEffect, useRef, useState } from 'react';
import { FlatList, Pressable, ScrollView, Text, TextInput, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { useRouter } from 'expo-router';
import { useGame } from '@/ctx/GameContext';
import { getMinistryLeaders, getProvinceLeaders } from '@/lib/leaders';

// ── 类型定义 ────────────────────────────────────────────────────────
type VoteStance = '赞成' | '反对' | '弃权';
type CommitteeLevel = 'psc7' | 'prov5' | 'city3';    // 政治局7人 / 省委5人 / 市委3人
type VoteStatus = 'none' | 'pending' | 'deliberating' | 'approved' | 'rejected' | 'overridden';

interface CommitteeMember {
  id: string;
  name: string;
  title: string;
  faction: string;
  stance: VoteStance | null;   // null = 未到自己
  revealed: boolean;
}

interface AppointProposal {
  id: string;
  cadreId: string;
  cadreName: string;
  proposedPost: string;
  proposedOrg: string;
  type: '任命' | '免职' | '调任' | '晋升';
  committeeLevel: CommitteeLevel;
  voteStatus: VoteStatus;
  members: CommitteeMember[];
  voteFor: number;
  voteAgainst: number;
  voteAbstain: number;
  createdDay: number;
  proposedBy: 'player' | string;  // 'player' 或 NPC名
  isTopOverride: boolean;         // 是否用了一锤定音
}

interface CentralCadre {
  id: string;
  name: string;
  currentPost: string;
  currentOrg: string;
  level: '正部级' | '副部级' | '正省级' | '副省级';
  age: number;
  ability: number;
  loyalty: number;
  faction: string;
}

// ── 常量 ────────────────────────────────────────────────────────────
const FACTIONS = ['改革派', '务实派', '共青团系', '技术官僚', '地方系'];
const FACTION_COLORS: Record<string, string> = {
  '改革派': '#2B4B6F', '务实派': '#607d8b', '共青团系': '#E53935',
  '技术官僚': '#1565C0', '地方系': '#4E342E',
};

// 派系敌对关系（简化为两两对立）
const FACTION_OPPOSE: Record<string, string[]> = {
  '改革派':   ['地方系'],
  '地方系':   ['改革派'],
  '共青团系': ['技术官僚'],
  '技术官僚': ['共青团系'],
  '务实派':   [],
};

const PSC_TITLES = [
  '常委·总执书记', '常委·国政院院理', '常委·议政院议政委员长',
  '常委·全国参政院主席', '常委·中枢纪委书记', '常委·国政院常务副院理', '常委·中枢书记处书记',
];
const PROV_STANDING_TITLES = [
  '省委书记', '省长', '专职省委副书记', '省委组织部长', '省纪委书记',
];
const CITY_STANDING_TITLES = [
  '市委书记', '市长', '市委组织部长',
];

const APPOINT_TYPES: Array<{ key: AppointProposal['type']; label: string; icon: string }> = [
  { key: '任命', label: '任命', icon: '📋' },
  { key: '免职', label: '免职', icon: '📤' },
  { key: '调任', label: '调任', icon: '🔄' },
  { key: '晋升', label: '晋升', icon: '⬆️' },
];

const POST_OPTIONS = [
  '国政院副院理', '国家发展改革委主任', '财政部部长', '外交部部长',
  '公安部部长', '教育部部长', '国家卫生健康委主任', '生态环境部部长',
  '中枢纪委副书记', '全国议政院常委会副议政委员长', '全国参政院副主席',
];

// NPC提案模板
const NPC_PROPOSALS_TEMPLATES = [
  { post: '国家发展改革委主任', org: '国家发展改革委', type: '任命' as const },
  { post: '财政部部长', org: '财政部', type: '调任' as const },
  { post: '广东省省委书记', org: '广东省', type: '晋升' as const },
  { post: '中枢纪委副书记', org: '中枢纪委', type: '任命' as const },
];

// ── 哈希工具 ────────────────────────────────────────────────────────
function hashStr(s: string): number {
  let h = 0;
  for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) & 0xffff;
  return h;
}

// ── 构建央管干部候选人 ─────────────────────────────────────────────
function buildCentralCadres(saveId: string): CentralCadre[] {
  const miniLeadersMap = getMinistryLeaders(saveId);
  const provLeadersMap = getProvinceLeaders(saveId);
  const provinces = [
    '广东省', '浙江省', '江苏省', '山东省', '北京市', '上海市', '四川省',
    '湖北省', '湖南省', '河南省', '河北省', '福建省', '安徽省', '辽宁省',
  ];
  const miniNames = Object.values(miniLeadersMap).filter((v, i, arr) => arr.indexOf(v) === i).slice(0, 10);
  const provNames = Object.values(provLeadersMap).map(p => p.secretary).slice(0, 10);
  const cadres: CentralCadre[] = [];
  miniNames.forEach((name, i) => {
    const h = hashStr(name + saveId);
    cadres.push({ id: `m${i}`, name, currentPost: '部长/主任', currentOrg: `第${i + 1}部委`, level: '正部级', age: 52 + (h % 10), ability: 75 + (h % 20), loyalty: 70 + ((h >> 4) % 25), faction: FACTIONS[h % FACTIONS.length] ?? '务实派' });
  });
  provNames.forEach((name, i) => {
    const h = hashStr(name + saveId);
    cadres.push({ id: `p${i}`, name, currentPost: '省委书记', currentOrg: provinces[i] ?? `第${i + 1}省`, level: '正省级', age: 53 + (h % 9), ability: 73 + (h % 22), loyalty: 68 + ((h >> 3) % 28), faction: FACTIONS[(h + 2) % FACTIONS.length] ?? '改革派' });
  });
  return cadres;
}

// ── 构建委员会成员（确定性哈希） ──────────────────────────────────
function buildCommittee(saveId: string, level: CommitteeLevel): CommitteeMember[] {
  const titles = level === 'psc7' ? PSC_TITLES : level === 'prov5' ? PROV_STANDING_TITLES : CITY_STANDING_TITLES;
  const surnames = ['习', '李', '赵', '王', '陈', '刘', '张', '杨', '黄', '吴'];
  const given = ['强', '克强', '乐际', '沪宁', '国强', '晓明', '建平', '志军', '毅', '俊'];
  return titles.map((title, i) => {
    const seed = hashStr(saveId + title + i);
    const name = (surnames[seed % surnames.length] ?? '王') + (given[(seed >> 4) % given.length] ?? '军');
    const faction = FACTIONS[seed % FACTIONS.length] ?? '务实派';
    return { id: `cm_${level}_${i}`, name, title, faction, stance: null, revealed: false };
  });
}

// ── 确定性投票立场计算 ─────────────────────────────────────────────
// 基于：委员派系 vs 候选人派系（60%权重）+ 委员与玩家关系层级（40%权重）
function calcVoteStance(
  memberId: string,
  memberFaction: string,
  candidateFaction: string,
  saveId: string,
): VoteStance {
  const h = hashStr(memberId + saveId + candidateFaction);
  // 派系匹配分（0-100）
  let factionScore: number;
  if (memberFaction === candidateFaction) factionScore = 80 + (h % 20);
  else if ((FACTION_OPPOSE[memberFaction] ?? []).includes(candidateFaction)) factionScore = 10 + (h % 20);
  else factionScore = 40 + (h % 30);
  // 关系层级分（0-100）
  const relHash = hashStr(saveId + memberId);
  const relScore = 30 + (relHash % 60);
  // 综合得分
  const combined = Math.round(factionScore * 0.6 + relScore * 0.4);
  if (combined >= 62) return '赞成';
  if (combined >= 40) return '弃权';
  return '反对';
}

// ── 生成NPC提案 ────────────────────────────────────────────────────
function buildNpcProposals(saveId: string, gameDays: number, existingCount: number): AppointProposal[] {
  if (existingCount > 0) return [];  // 已有提案时不重复生成
  const cadres = buildCentralCadres(saveId);
  return NPC_PROPOSALS_TEMPLATES.slice(0, 2).map((tmpl, i) => {
    const cadre = cadres[i] ?? cadres[0]!;
    const members = buildCommittee(saveId, 'psc7').map(m => ({
      ...m,
      stance: calcVoteStance(m.id, m.faction, cadre.faction, saveId),
    }));
    const propName = PSC_TITLES[i] ? `常委·${['国政院院理', '议政院议政委员长'][i] ?? '常委'}` : '常委';
    return {
      id: `npc_${gameDays}_${i}`,
      cadreId: cadre.id,
      cadreName: cadre.name,
      proposedPost: tmpl.post,
      proposedOrg: tmpl.org,
      type: tmpl.type,
      committeeLevel: 'psc7',
      voteStatus: 'pending',
      members,
      voteFor: 0, voteAgainst: 0, voteAbstain: 0,
      createdDay: gameDays,
      proposedBy: propName,
      isTopOverride: false,
    };
  });
}

export default function CadreAppointmentScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { save, updateGameSave } = useGame();
  const [tab, setTab] = useState<'cadres' | 'propose' | 'vote'>('cadres');
  const [proposals, setProposals] = useState<AppointProposal[]>([]);
  const [feedback, setFeedback] = useState('');
  const [feedbackOk, setFeedbackOk] = useState(true);
  const [selectedCadre, setSelectedCadre] = useState<CentralCadre | null>(null);
  const [propType, setPropType] = useState<AppointProposal['type']>('调任');
  const [propPost, setPropPost] = useState('');
  const [propOrg, setPropOrg] = useState('');
  const [committeeLevel, setCommitteeLevel] = useState<CommitteeLevel>('psc7');
  // 审议状态
  const [deliberatingId, setDeliberatingId] = useState<string | null>(null);
  const [revealIndex, setRevealIndex] = useState(0);
  const revealTimer = useRef<ReturnType<typeof setInterval> | null>(null);
  const npcInit = useRef(false);

  // NPC提案初始化（仅一次）—— Hooks 必须在 guard return 之前调用
  useEffect(() => {
    if (!save) return;
    if (!npcInit.current) {
      npcInit.current = true;
      const npcProps = buildNpcProposals(save.id, save.gameDays, proposals.length);
      if (npcProps.length > 0) {
        setProposals(prev => [...prev, ...npcProps]);
        showFeedback(`📩 常委发来${npcProps.length}份任免提案，请审阅`);
        setTab('vote');
      }
    }
  }, []);

  if (!save) return null;
  if (save.rankLevel < 13) {
    return (
      <View style={{ flex: 1, backgroundColor: '#F5F4F1', alignItems: 'center', justifyContent: 'center', padding: 32 }}>
        <StatusBar style="light" backgroundColor="#2B4B6F" />
        <Text style={{ fontSize: 30, marginBottom: 16 }}>🔒</Text>
        <Text style={{ fontSize: 15, fontWeight: '700', color: '#2B4B6F', marginBottom: 8 }}>权限不足</Text>
        <Text style={{ fontSize: 13, color: '#888', textAlign: 'center', lineHeight: 20 }}>
          央管干部任免权限仅开放给国政院副院理（13级）及以上职位
        </Text>
        <Pressable onPress={() => router.back()} style={{ marginTop: 24, paddingHorizontal: 24, paddingVertical: 10, backgroundColor: '#2B4B6F' }}>
          <Text style={{ color: '#fff', fontWeight: '700' }}>返回</Text>
        </Pressable>
      </View>
    );
  }

  const cadres = buildCentralCadres(save.id);
  const isTopLeader = save.rankLevel >= 15;   // 总执书记（15级）享有一锤定音权
  const isPremier = save.rankLevel >= 14;

  const showFeedback = (msg: string, ok = true) => {
    setFeedback(msg);
    setFeedbackOk(ok);
    setTimeout(() => setFeedback(''), 3800);
  };

  // ── 提交提案 ────────────────────────────────────────────
  const handleSubmitProposal = () => {
    if (!selectedCadre) { showFeedback('请先选择被任免干部', false); return; }
    if (!propPost.trim()) { showFeedback('请填写拟任职务', false); return; }
    const members = buildCommittee(save.id, committeeLevel).map(m => ({
      ...m,
      stance: calcVoteStance(m.id, m.faction, selectedCadre.faction, save.id),
    }));
    const newProp: AppointProposal = {
      id: `prop_${Date.now()}`,
      cadreId: selectedCadre.id,
      cadreName: selectedCadre.name,
      proposedPost: propPost.trim(),
      proposedOrg: propOrg.trim() || selectedCadre.currentOrg,
      type: propType,
      committeeLevel,
      voteStatus: 'pending',
      members,
      voteFor: 0, voteAgainst: 0, voteAbstain: 0,
      createdDay: save.gameDays,
      proposedBy: 'player',
      isTopOverride: false,
    };
    setProposals(prev => [newProp, ...prev]);
    setSelectedCadre(null);
    setPropPost('');
    setPropOrg('');
    showFeedback(`✅ ${propType}提案已提交，请在投票页发起表决`);
    setTab('vote');
  };

  // ── 逐一揭票审议 ─────────────────────────────────────────
  const startDeliberate = (propId: string) => {
    setDeliberatingId(propId);
    setRevealIndex(0);
    setProposals(prev => prev.map(p =>
      p.id === propId ? { ...p, voteStatus: 'deliberating' } : p,
    ));
    // 每800ms揭示一票
    const prop = proposals.find(p => p.id === propId);
    if (!prop) return;
    let idx = 0;
    revealTimer.current = setInterval(() => {
      idx++;
      setRevealIndex(idx);
      setProposals(prev => prev.map(p =>
        p.id === propId
          ? { ...p, members: p.members.map((m, i) => i < idx ? { ...m, revealed: true } : m) }
          : p,
      ));
      if (idx >= prop.members.length) {
        if (revealTimer.current) clearInterval(revealTimer.current);
        finalizeVote(propId);
      }
    }, 800);
  };

  const finalizeVote = async (propId: string) => {
    setDeliberatingId(null);
    setProposals(prev => prev.map(p => {
      if (p.id !== propId) return p;
      const voteFor = p.members.filter(m => m.stance === '赞成').length;
      const voteAgainst = p.members.filter(m => m.stance === '反对').length;
      const voteAbstain = p.members.filter(m => m.stance === '弃权').length;
      const quorum = Math.floor(p.members.length / 2) + 1;
      const approved = voteFor >= quorum;
      return { ...p, voteFor, voteAgainst, voteAbstain, voteStatus: approved ? 'approved' : 'rejected' };
    }));
    // 政治后果：+/- 政绩
    const updated = proposals.find(p => p.id === propId);
    if (!updated) return;
    const voteFor = updated.members.filter(m => m.stance === '赞成').length;
    const quorum = Math.floor(updated.members.length / 2) + 1;
    if (voteFor >= quorum) {
      await updateGameSave({ meritPoints: (save.meritPoints ?? 0) + 30 });
      showFeedback(`✅ 任免提案获批（${voteFor}赞成），政绩+30，与赞成委员关系改善`);
    } else {
      showFeedback(`❌ 提案未获通过（${voteFor}赞成/${updated.members.length}票），建议加强派系沟通`, false);
    }
  };

  // ── 一锤定音（最高决策权） ─────────────────────────────
  const handleTopOverride = async (propId: string, forceApprove: boolean) => {
    if (revealTimer.current) clearInterval(revealTimer.current);
    setDeliberatingId(null);
    setProposals(prev => prev.map(p =>
      p.id === propId ? { ...p, voteStatus: forceApprove ? 'approved' : 'rejected', isTopOverride: true } : p,
    ));
    if (forceApprove) {
      await updateGameSave({ meritPoints: (save.meritPoints ?? 0) + 40 });
      showFeedback('⚡ 已行使一锤定音权，任命强制通过，政绩+40');
    } else {
      showFeedback('⚡ 已行使否决权，提案强制否决');
    }
  };

  const pendingProposals = proposals.filter(p => p.voteStatus === 'pending');
  const activeProposals  = proposals.filter(p => p.voteStatus === 'deliberating');
  const decidedProposals = proposals.filter(p => p.voteStatus === 'approved' || p.voteStatus === 'rejected');
  const levelLabel = (lv: CommitteeLevel) =>
    lv === 'psc7' ? '政治局常委会（7人）' : lv === 'prov5' ? '省委常委会（5人）' : '市委常委会（3人）';

  return (
    <View style={{ flex: 1, backgroundColor: '#0E0C10' }}>
      <StatusBar style="light" backgroundColor="#1A1230" />

      {/* 顶栏 */}
      <View style={{ backgroundColor: '#1A1230', paddingTop: insets.top + 8, paddingBottom: 14, paddingHorizontal: 16 }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 10 }}>
          <Pressable onPress={() => router.back()}>
            <Text style={{ color: '#8877BB', fontSize: 22 }}>‹</Text>
          </Pressable>
          <View style={{ flex: 1 }}>
            <Text style={{ color: '#8877BB', fontSize: 9, letterSpacing: 3 }}>中枢组织部 · 央管干部</Text>
            <Text style={{ color: '#E8D0FF', fontSize: 16, fontWeight: '700' }}>🎖️ 央管干部任免</Text>
            <Text style={{ color: '#8877BB', fontSize: 10 }}>
              {isTopLeader ? '总执书记 · 一锤定音权' : isPremier ? '国政院院理 · 提名权 + 表决权' : '国政院副院理 · 提名建议权'}
            </Text>
          </View>
          {isTopLeader && (
            <View style={{ backgroundColor: '#6B1A1A', borderWidth: 1, borderColor: '#CC4444', paddingHorizontal: 8, paddingVertical: 4 }}>
              <Text style={{ color: '#FF8888', fontSize: 9, fontWeight: '700' }}>⚡ 最高决策权</Text>
            </View>
          )}
        </View>
        <View style={{ flexDirection: 'row', gap: 4 }}>
          {([
            { key: 'cadres',  label: '📋 候选干部' },
            { key: 'propose', label: '✍️ 发起提案' },
            { key: 'vote',    label: `🗳️ 表决（${pendingProposals.length + activeProposals.length}）` },
          ] as const).map(t => (
            <Pressable key={t.key} onPress={() => setTab(t.key)}
              style={{ flex: 1, paddingVertical: 7, alignItems: 'center', backgroundColor: tab === t.key ? '#4A1E7A' : 'rgba(255,255,255,0.08)' }}
            >
              <Text style={{ color: tab === t.key ? '#E8D0FF' : '#8877BB', fontSize: 9, fontWeight: tab === t.key ? '700' : '400' }}>{t.label}</Text>
            </Pressable>
          ))}
        </View>
      </View>

      {/* 反馈条 */}
      {feedback ? (
        <View style={{ backgroundColor: feedbackOk ? '#0D2A18' : '#2A0D0D', padding: 10, borderBottomWidth: 1, borderBottomColor: feedbackOk ? '#1A5C30' : '#5C1A1A' }}>
          <Text style={{ color: feedbackOk ? '#5AE87A' : '#FF6666', fontSize: 12, fontWeight: '600' }}>{feedback}</Text>
        </View>
      ) : null}

      {/* ══ 候选干部库 ══ */}
      {tab === 'cadres' && (
        <FlatList
          data={cadres}
          keyExtractor={item => item.id}
          contentContainerStyle={{ padding: 12, gap: 8 }}
          ListHeaderComponent={
            <View style={{ backgroundColor: '#1A1230', borderWidth: 1, borderColor: '#3A2A60', padding: 10, marginBottom: 4 }}>
              <Text style={{ fontSize: 10, color: '#C8A0FF', fontWeight: '700' }}>
                央管干部总数：{cadres.length}人 · 点击干部进入提案流程
              </Text>
            </View>
          }
          renderItem={({ item }) => {
            const fColor = FACTION_COLORS[item.faction] ?? '#888';
            const levelColor = item.level.startsWith('正') ? '#7B0026' : '#2B4B6F';
            return (
              <Pressable
                onPress={() => { setSelectedCadre(item); setTab('propose'); }}
                style={{ backgroundColor: '#18102A', borderWidth: 1, borderColor: '#3A2060', padding: 12 }}
              >
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
                  <View style={{ width: 44, height: 44, backgroundColor: '#2A1A40', alignItems: 'center', justifyContent: 'center', borderWidth: 2, borderColor: levelColor }}>
                    <Text style={{ fontSize: 22 }}>👔</Text>
                  </View>
                  <View style={{ flex: 1 }}>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                      <Text style={{ fontSize: 14, fontWeight: '700', color: '#E8D0FF' }}>{item.name}</Text>
                      <Text style={{ fontSize: 10, color: '#8877BB' }}>{item.age}岁</Text>
                      <View style={{ backgroundColor: levelColor + '22', borderWidth: 1, borderColor: levelColor, paddingHorizontal: 5, paddingVertical: 1 }}>
                        <Text style={{ fontSize: 9, color: levelColor, fontWeight: '700' }}>{item.level}</Text>
                      </View>
                    </View>
                    <Text style={{ fontSize: 11, color: '#A890CC', marginTop: 2 }}>{item.currentPost} · {item.currentOrg}</Text>
                    <View style={{ flexDirection: 'row', gap: 6, marginTop: 3 }}>
                      <View style={{ backgroundColor: fColor + '22', borderWidth: 1, borderColor: fColor, paddingHorizontal: 5, paddingVertical: 1 }}>
                        <Text style={{ fontSize: 9, color: fColor }}>{item.faction}</Text>
                      </View>
                      <Text style={{ fontSize: 9, color: '#A890CC' }}>能力{item.ability}</Text>
                    </View>
                  </View>
                  <Text style={{ color: '#9966EE', fontSize: 12 }}>提名 ›</Text>
                </View>
              </Pressable>
            );
          }}
        />
      )}

      {/* ══ 发起提案 ══ */}
      {tab === 'propose' && (
        <ScrollView contentContainerStyle={{ padding: 14, gap: 10 }}>
          {/* 被任免干部 */}
          <View style={{ backgroundColor: '#18102A', borderWidth: 1, borderColor: '#3A2060', padding: 14 }}>
            <Text style={{ fontSize: 11, color: '#9966EE', fontWeight: '700', letterSpacing: 2, marginBottom: 10 }}>被任免干部</Text>
            {selectedCadre ? (
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
                <View style={{ width: 48, height: 48, backgroundColor: '#2A1A40', alignItems: 'center', justifyContent: 'center', borderWidth: 2, borderColor: '#7B0026' }}>
                  <Text style={{ fontSize: 24 }}>👔</Text>
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={{ fontSize: 14, fontWeight: '700', color: '#E8D0FF' }}>{selectedCadre.name}</Text>
                  <Text style={{ fontSize: 11, color: '#A890CC' }}>{selectedCadre.currentPost} · {selectedCadre.currentOrg}</Text>
                  <Text style={{ fontSize: 10, color: '#6655AA' }}>{selectedCadre.level} · {selectedCadre.faction}</Text>
                </View>
                <Pressable onPress={() => { setSelectedCadre(null); setTab('cadres'); }}>
                  <Text style={{ color: '#CC4444', fontSize: 12 }}>重选</Text>
                </Pressable>
              </View>
            ) : (
              <Pressable
                onPress={() => setTab('cadres')}
                style={{ padding: 14, borderWidth: 1, borderColor: '#3A2060', alignItems: 'center', backgroundColor: '#120A20' }}
              >
                <Text style={{ color: '#9966EE', fontSize: 12, fontWeight: '600' }}>+ 从央管干部库选择</Text>
              </Pressable>
            )}
          </View>

          {/* 表决层级 */}
          <View style={{ backgroundColor: '#18102A', borderWidth: 1, borderColor: '#3A2060', padding: 14 }}>
            <Text style={{ fontSize: 11, color: '#9966EE', fontWeight: '700', letterSpacing: 2, marginBottom: 10 }}>表决委员会</Text>
            <View style={{ gap: 6 }}>
              {([
                { key: 'psc7',  label: '政治局常委会 7人', sub: '适用：省级及以上职位任命' },
                { key: 'prov5', label: '省委常委会 5人',  sub: '适用：省管干部·市级职位' },
                { key: 'city3', label: '市委常委会 3人',  sub: '适用：市管干部·县级职位' },
              ] as const).map(opt => (
                <Pressable
                  key={opt.key}
                  onPress={() => setCommitteeLevel(opt.key)}
                  style={{ flexDirection: 'row', alignItems: 'center', gap: 10, padding: 10, borderWidth: 1, borderColor: committeeLevel === opt.key ? '#9966EE' : '#2A1A40', backgroundColor: committeeLevel === opt.key ? '#2A1040' : '#120A20' }}
                >
                  <View style={{ width: 16, height: 16, borderRadius: 8, borderWidth: 2, borderColor: committeeLevel === opt.key ? '#9966EE' : '#4A3A60', backgroundColor: committeeLevel === opt.key ? '#9966EE' : 'transparent' }} />
                  <View style={{ flex: 1 }}>
                    <Text style={{ color: committeeLevel === opt.key ? '#E8D0FF' : '#A890CC', fontSize: 12, fontWeight: committeeLevel === opt.key ? '700' : '400' }}>{opt.label}</Text>
                    <Text style={{ color: '#6655AA', fontSize: 9, marginTop: 1 }}>{opt.sub}</Text>
                  </View>
                </Pressable>
              ))}
            </View>
          </View>

          {/* 任免类型 */}
          <View style={{ backgroundColor: '#18102A', borderWidth: 1, borderColor: '#3A2060', padding: 14 }}>
            <Text style={{ fontSize: 11, color: '#9966EE', fontWeight: '700', letterSpacing: 2, marginBottom: 10 }}>任免类型</Text>
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
              {APPOINT_TYPES.map(at => (
                <Pressable
                  key={at.key}
                  onPress={() => setPropType(at.key)}
                  style={{ paddingHorizontal: 16, paddingVertical: 8, borderWidth: 2, borderColor: propType === at.key ? '#9966EE' : '#3A2060', backgroundColor: propType === at.key ? '#2A1040' : '#120A20' }}
                >
                  <Text style={{ color: propType === at.key ? '#E8D0FF' : '#6655AA', fontWeight: propType === at.key ? '700' : '400', fontSize: 12 }}>
                    {at.icon} {at.label}
                  </Text>
                </Pressable>
              ))}
            </View>
          </View>

          {/* 拟任职务 */}
          <View style={{ backgroundColor: '#18102A', borderWidth: 1, borderColor: '#3A2060', padding: 14 }}>
            <Text style={{ fontSize: 11, color: '#9966EE', fontWeight: '700', letterSpacing: 2, marginBottom: 10 }}>拟任职务</Text>
            <TextInput
              value={propPost}
              onChangeText={setPropPost}
              placeholder="请填写拟任职务…"
              placeholderTextColor="#4A3A60"
              style={{ borderWidth: 1, borderColor: '#3A2060', padding: 10, fontSize: 13, color: '#E8D0FF', marginBottom: 8, backgroundColor: '#120A20' }}
            />
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 6 }}>
              {POST_OPTIONS.map(p => (
                <Pressable key={p} onPress={() => setPropPost(p)} style={{ backgroundColor: '#2A1A40', paddingHorizontal: 8, paddingVertical: 4, borderWidth: 1, borderColor: '#4A2A70' }}>
                  <Text style={{ fontSize: 10, color: '#C8A0FF' }}>{p}</Text>
                </Pressable>
              ))}
            </ScrollView>
          </View>

          {/* 拟任单位 */}
          <View style={{ backgroundColor: '#18102A', borderWidth: 1, borderColor: '#3A2060', padding: 14 }}>
            <Text style={{ fontSize: 11, color: '#9966EE', fontWeight: '700', letterSpacing: 2, marginBottom: 8 }}>拟任单位（可选）</Text>
            <TextInput
              value={propOrg}
              onChangeText={setPropOrg}
              placeholder="留空则保留原单位"
              placeholderTextColor="#4A3A60"
              style={{ borderWidth: 1, borderColor: '#3A2060', padding: 10, fontSize: 13, color: '#E8D0FF', backgroundColor: '#120A20' }}
            />
          </View>

          {/* 提交 */}
          <Pressable
            onPress={handleSubmitProposal}
            style={{ backgroundColor: selectedCadre && propPost.trim() ? '#4A1E7A' : '#2A1A3A', paddingVertical: 14, alignItems: 'center', borderWidth: 1, borderColor: selectedCadre && propPost.trim() ? '#9966EE' : '#3A2060' }}
          >
            <Text style={{ color: selectedCadre && propPost.trim() ? '#E8D0FF' : '#4A3A60', fontWeight: '700', fontSize: 14 }}>
              📋 提交提案，进入委员会表决
            </Text>
          </Pressable>
          <View style={{ height: 20 }} />
        </ScrollView>
      )}

      {/* ══ 委员会表决 ══ */}
      {tab === 'vote' && (
        <ScrollView contentContainerStyle={{ padding: 14, gap: 12 }}>
          {/* 待表决 + 审议中 */}
          {[...pendingProposals, ...activeProposals].map(p => {
            const isDeliberating = p.voteStatus === 'deliberating' && deliberatingId === p.id;
            const npcLabel = p.proposedBy !== 'player' ? `由 ${p.proposedBy} 发起` : '您发起';
            return (
              <View key={p.id} style={{ backgroundColor: '#18102A', borderWidth: 1, borderColor: '#4A2A70', padding: 14 }}>
                {/* 提案头部 */}
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 8 }}>
                  <View style={{ backgroundColor: p.proposedBy !== 'player' ? '#2A1A40' : '#1A2A40', borderWidth: 1, borderColor: p.proposedBy !== 'player' ? '#9966EE' : '#4488FF', paddingHorizontal: 7, paddingVertical: 2 }}>
                    <Text style={{ color: p.proposedBy !== 'player' ? '#C8A0FF' : '#88BBFF', fontSize: 9, fontWeight: '700' }}>
                      {p.proposedBy !== 'player' ? '📩 NPC提案' : '✍️ 玩家提案'}
                    </Text>
                  </View>
                  <Text style={{ fontSize: 13, fontWeight: '700', color: '#E8D0FF', flex: 1 }}>{p.cadreName}</Text>
                  <Text style={{ fontSize: 9, color: '#6655AA' }}>第{p.createdDay}天</Text>
                </View>
                <View style={{ backgroundColor: '#120A20', padding: 8, marginBottom: 8, gap: 2 }}>
                  <Text style={{ fontSize: 10, color: '#A890CC' }}>
                    {p.type}拟任：<Text style={{ color: '#C8A0FF', fontWeight: '600' }}>{p.proposedPost}</Text>
                  </Text>
                  <Text style={{ fontSize: 10, color: '#6655AA' }}>
                    单位：{p.proposedOrg} · {npcLabel} · {levelLabel(p.committeeLevel)}
                  </Text>
                </View>

                {/* 委员逐一揭票区 */}
                {(isDeliberating || p.voteStatus === 'deliberating') && (
                  <View style={{ marginBottom: 10, gap: 5 }}>
                    <Text style={{ fontSize: 10, color: '#9966EE', fontWeight: '700', letterSpacing: 1, marginBottom: 4 }}>🗳️ 常委逐一表决</Text>
                    {p.members.map((m, idx) => {
                      const stanceColor = m.stance === '赞成' ? '#3A7A3A' : m.stance === '反对' ? '#7A3A3A' : '#4A4A4A';
                      const stanceBg   = m.stance === '赞成' ? '#0D2A0D' : m.stance === '反对' ? '#2A0D0D' : '#1A1A1A';
                      const fColor = FACTION_COLORS[m.faction] ?? '#888';
                      return (
                        <View key={m.id} style={{ flexDirection: 'row', alignItems: 'center', gap: 8, opacity: m.revealed ? 1 : 0.3, backgroundColor: stanceBg, padding: 7, borderWidth: 1, borderColor: stanceColor }}>
                          <Text style={{ width: 14, color: '#6655AA', fontSize: 9 }}>{idx + 1}</Text>
                          <Text style={{ flex: 1, color: '#E8D0FF', fontSize: 11, fontWeight: '700' }}>{m.name}</Text>
                          <Text style={{ color: fColor, fontSize: 9 }}>{m.faction}</Text>
                          <Text style={{ fontSize: 9, color: '#8877BB' }}>{m.title.split('·')[1] ?? m.title}</Text>
                          {m.revealed ? (
                            <View style={{ backgroundColor: stanceColor + '33', borderWidth: 1, borderColor: stanceColor, paddingHorizontal: 8, paddingVertical: 2, minWidth: 36, alignItems: 'center' }}>
                              <Text style={{ color: m.stance === '赞成' ? '#66EE66' : m.stance === '反对' ? '#EE6666' : '#AAAAAA', fontSize: 11, fontWeight: '700' }}>{m.stance}</Text>
                            </View>
                          ) : (
                            <View style={{ backgroundColor: '#2A2A2A', borderWidth: 1, borderColor: '#3A3A3A', paddingHorizontal: 8, paddingVertical: 2, minWidth: 36, alignItems: 'center' }}>
                              <Text style={{ color: '#444', fontSize: 11 }}>…</Text>
                            </View>
                          )}
                        </View>
                      );
                    })}
                  </View>
                )}

                {/* 按钮区 */}
                {p.voteStatus === 'pending' && (
                  <View style={{ gap: 8 }}>
                    <Pressable
                      onPress={() => startDeliberate(p.id)}
                      style={{ backgroundColor: '#4A1E7A', paddingVertical: 12, alignItems: 'center', borderWidth: 1, borderColor: '#9966EE' }}
                    >
                      <Text style={{ color: '#E8D0FF', fontWeight: '700', fontSize: 13 }}>🗳️ 召开常委会·逐一表决</Text>
                    </Pressable>
                    {isTopLeader && (
                      <View style={{ flexDirection: 'row', gap: 8 }}>
                        <Pressable
                          onPress={() => void handleTopOverride(p.id, true)}
                          style={{ flex: 1, backgroundColor: '#1A4A1A', paddingVertical: 10, alignItems: 'center', borderWidth: 1, borderColor: '#3A9A3A' }}
                        >
                          <Text style={{ color: '#88EE88', fontWeight: '700', fontSize: 11 }}>⚡ 一锤定音·强制通过</Text>
                        </Pressable>
                        <Pressable
                          onPress={() => void handleTopOverride(p.id, false)}
                          style={{ flex: 1, backgroundColor: '#4A1A1A', paddingVertical: 10, alignItems: 'center', borderWidth: 1, borderColor: '#9A3A3A' }}
                        >
                          <Text style={{ color: '#EE8888', fontWeight: '700', fontSize: 11 }}>⚡ 最高否决·强制驳回</Text>
                        </Pressable>
                      </View>
                    )}
                  </View>
                )}
                {p.voteStatus === 'deliberating' && !isDeliberating && (
                  <View style={{ backgroundColor: '#1A0E2A', padding: 8, alignItems: 'center' }}>
                    <Text style={{ color: '#9966EE', fontSize: 11 }}>⏳ 表决进行中…</Text>
                  </View>
                )}
              </View>
            );
          })}

          {/* 已决定提案 */}
          {decidedProposals.length > 0 && (
            <>
              <View style={{ borderBottomWidth: 1, borderBottomColor: '#2A1A40', paddingBottom: 4 }}>
                <Text style={{ fontSize: 10, color: '#6655AA', fontWeight: '700', letterSpacing: 2 }}>历史表决记录</Text>
              </View>
              {decidedProposals.map(p => {
                const approved = p.voteStatus === 'approved';
                const quorum = Math.floor(p.members.length / 2) + 1;
                return (
                  <View key={p.id} style={{ backgroundColor: '#18102A', borderWidth: 1, borderColor: approved ? '#1A5C30' : '#5C1A1A', padding: 12 }}>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 6 }}>
                      <Text style={{ fontSize: 16 }}>{p.isTopOverride ? '⚡' : approved ? '✅' : '❌'}</Text>
                      <Text style={{ fontSize: 13, fontWeight: '700', color: '#E8D0FF', flex: 1 }}>{p.cadreName}</Text>
                      <View style={{ backgroundColor: (approved ? '#1A5C30' : '#5C1A1A'), paddingHorizontal: 6, paddingVertical: 1 }}>
                        <Text style={{ fontSize: 9, color: approved ? '#5AE87A' : '#FF6666', fontWeight: '700' }}>
                          {p.isTopOverride ? (approved ? '一锤定音·通过' : '最高否决') : (approved ? '通过' : '否决')}
                        </Text>
                      </View>
                    </View>
                    <Text style={{ fontSize: 11, color: '#A890CC' }}>{p.type}：{p.proposedPost}</Text>
                    {!p.isTopOverride && (
                      <>
                        <Text style={{ fontSize: 10, color: '#6655AA', marginTop: 4 }}>
                          表决结果：赞成{p.voteFor}票 · 反对{p.voteAgainst}票 · 弃权{p.voteAbstain}票（需{quorum}票过半）
                        </Text>
                        {/* 政治后果说明 */}
                        {approved && (
                          <View style={{ marginTop: 4, backgroundColor: '#0D2A18', padding: 6 }}>
                            <Text style={{ fontSize: 9, color: '#5AE87A' }}>
                              {p.voteFor}位赞成委员关系改善 · {p.voteAgainst}位反对委员关系微降
                            </Text>
                          </View>
                        )}
                        {!approved && (
                          <View style={{ marginTop: 4, backgroundColor: '#2A0D0D', padding: 6 }}>
                            <Text style={{ fontSize: 9, color: '#FF8888' }}>
                              提案被否 · 建议调整候选人或加强与反对委员的关系
                            </Text>
                          </View>
                        )}
                      </>
                    )}
                  </View>
                );
              })}
            </>
          )}

          {proposals.length === 0 && (
            <View style={{ padding: 40, alignItems: 'center' }}>
              <Text style={{ fontSize: 40, marginBottom: 12 }}>📋</Text>
              <Text style={{ fontSize: 14, color: '#6655AA', textAlign: 'center' }}>暂无任免提案</Text>
              <Text style={{ fontSize: 11, color: '#4A3A60', marginTop: 4 }}>在「发起提案」页提交提案，或等待NPC常委发起提案</Text>
            </View>
          )}
          <View style={{ height: 20 }} />
        </ScrollView>
      )}
    </View>
  );
}
