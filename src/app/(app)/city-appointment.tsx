// 市管干部任免页 — rank7（副厅级）及以上
// 规则：市委常委会3人逐一表决，市委书记享有一锤定音权，NPC委员可发起提案
// 表决结果影响各委员与玩家的关系值（±3）
import { useEffect, useRef, useState } from 'react';
import { FlatList, Pressable, ScrollView, Text, TextInput, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { useRouter } from 'expo-router';
import { useGame } from '@/ctx/GameContext';

// ── 类型 ─────────────────────────────────────────────────────────────
type VoteStance = '赞成' | '反对' | '弃权';
type VoteStatus = 'pending' | 'deliberating' | 'approved' | 'rejected';

interface CommitteeMember {
  id: string;
  name: string;
  title: string;
  faction: string;
  stance: VoteStance;
  revealed: boolean;
}

interface AppointProposal {
  id: string;
  cadreId: string;
  cadreName: string;
  cadreFaction: string;
  proposedPost: string;
  proposedOrg: string;
  type: '任命' | '免职' | '调任' | '晋升';
  voteStatus: VoteStatus;
  members: CommitteeMember[];
  voteFor: number;
  voteAgainst: number;
  voteAbstain: number;
  createdDay: number;
  proposedBy: 'player' | string;
  isTopOverride: boolean;
}

interface CityCadre {
  id: string;
  name: string;
  currentPost: string;
  currentOrg: string;
  age: number;
  faction: string;
  ability: number;
}

// ── 常量 ─────────────────────────────────────────────────────────────
const FACTIONS = ['改革派', '务实派', '共青团系', '技术官僚', '地方系'];
const FACTION_COLORS: Record<string, string> = {
  '改革派': '#2B4B6F', '务实派': '#607d8b', '共青团系': '#E53935',
  '技术官僚': '#1565C0', '地方系': '#4E342E',
};
const FACTION_OPPOSE: Record<string, string[]> = {
  '改革派': ['地方系'], '地方系': ['改革派'],
  '共青团系': ['技术官僚'], '技术官僚': ['共青团系'], '务实派': [],
};

// 市委常委会3人职位
const CITY_TITLES = ['市委书记', '市长', '市委组织部长'];

// 市管干部池（县级职位）
const CITY_CADRE_POOL = [
  { post: '县委书记', org: '某县' },
  { post: '县长', org: '某县' },
  { post: '县委副书记', org: '某县' },
  { post: '常务副县长', org: '某县' },
  { post: '县委组织部长', org: '某县' },
  { post: '县纪委书记', org: '某县' },
  { post: '区委书记', org: '某区' },
  { post: '区长', org: '某区' },
  { post: '街道党工委书记', org: '某街道' },
];
const POST_OPTIONS = CITY_CADRE_POOL.map(p => p.post);

const COUNTY_NAMES = [
  '兴隆县', '平远县', '凤栖县', '安宁区', '宜和县',
  '崇明区', '溪山县', '长河区', '永泰县', '青云区',
];

// NPC提案模板
const NPC_TMPL = [
  { post: '县委书记', org: '兴隆县', type: '调任' as const },
  { post: '区长', org: '安宁区', type: '任命' as const },
];

// ── 哈希工具 ──────────────────────────────────────────────────────────
function hashStr(s: string): number {
  let h = 0;
  for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) & 0xffff;
  return h;
}

// ── 构建市管干部候选人列表 ─────────────────────────────────────────
function buildCityCadres(saveId: string): CityCadre[] {
  const surnames = ['林', '韩', '许', '吕', '何', '郭', '唐', '余', '马', '罗', '崔', '廖'];
  const given = ['志远', '建国', '晓明', '伟', '刚', '磊', '峰', '军', '勇', '超'];
  return Array.from({ length: 14 }, (_, i) => {
    const h = hashStr(saveId + 'city_cadre' + i);
    const name = (surnames[h % surnames.length] ?? '林') + (given[(h >> 4) % given.length] ?? '志');
    const postIdx = h % CITY_CADRE_POOL.length;
    const countyIdx = (h >> 2) % COUNTY_NAMES.length;
    return {
      id: `cc${i}`,
      name,
      currentPost: CITY_CADRE_POOL[postIdx]?.post ?? '副县长',
      currentOrg: COUNTY_NAMES[countyIdx] ?? '某县',
      age: 32 + (h % 18),
      faction: FACTIONS[h % FACTIONS.length] ?? '务实派',
      ability: 55 + (h % 35),
    };
  });
}

// ── 构建市委常委会3人 ────────────────────────────────────────────────
function buildCityCommittee(saveId: string): CommitteeMember[] {
  const surnames2 = ['谢', '魏', '卢', '蒋', '沈', '侯', '宋', '潘'];
  const given2 = ['力', '涛', '鹏', '健', '新', '宇', '亮', '洪'];
  return CITY_TITLES.map((title, i) => {
    const h = hashStr(saveId + title + i + 'city');
    const name = (surnames2[h % surnames2.length] ?? '谢') + (given2[(h >> 4) % given2.length] ?? '力');
    const faction = FACTIONS[h % FACTIONS.length] ?? '务实派';
    return { id: `ccm_${i}`, name, title, faction, stance: '弃权', revealed: false };
  });
}

// ── 确定性投票立场 ────────────────────────────────────────────────────
function calcStance(memberId: string, memberFaction: string, candidateFaction: string, saveId: string): VoteStance {
  const h = hashStr(memberId + saveId + candidateFaction + 'city');
  let fScore: number;
  if (memberFaction === candidateFaction) fScore = 80 + (h % 18);
  else if ((FACTION_OPPOSE[memberFaction] ?? []).includes(candidateFaction)) fScore = 10 + (h % 18);
  else fScore = 42 + (h % 28);
  const relScore = 32 + (hashStr(saveId + memberId + 'relc') % 55);
  const combined = Math.round(fScore * 0.6 + relScore * 0.4);
  if (combined >= 62) return '赞成';
  if (combined >= 40) return '弃权';
  return '反对';
}

// ── 生成NPC提案 ───────────────────────────────────────────────────────
function buildNpcProposals(saveId: string, gameDays: number, existCount: number): AppointProposal[] {
  if (existCount > 0) return [];
  const cadres = buildCityCadres(saveId);
  return NPC_TMPL.slice(0, 2).map((tmpl, i) => {
    const cadre = cadres[i] ?? cadres[0]!;
    const committee = buildCityCommittee(saveId).map(m => ({
      ...m,
      stance: calcStance(m.id, m.faction, cadre.faction, saveId),
    }));
    return {
      id: `npc_c_${gameDays}_${i}`,
      cadreId: cadre.id,
      cadreName: cadre.name,
      cadreFaction: cadre.faction,
      proposedPost: tmpl.post,
      proposedOrg: tmpl.org,
      type: tmpl.type,
      voteStatus: 'pending' as VoteStatus,
      members: committee,
      voteFor: 0, voteAgainst: 0, voteAbstain: 0,
      createdDay: gameDays,
      proposedBy: committee[1]?.name ?? '市长',
      isTopOverride: false,
    };
  });
}

// ═══════════════════════════════════════════════════════════════════════
export default function CityAppointmentScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { save, updateGameSave } = useGame();
  const [tab, setTab] = useState<'cadres' | 'propose' | 'vote'>('cadres');
  const [proposals, setProposals] = useState<AppointProposal[]>([]);
  const [feedback, setFeedback] = useState('');
  const [feedbackOk, setFeedbackOk] = useState(true);
  const [selectedCadre, setSelectedCadre] = useState<CityCadre | null>(null);
  const [propType, setPropType] = useState<AppointProposal['type']>('调任');
  const [propPost, setPropPost] = useState('');
  const [propOrg, setPropOrg] = useState('');
  const [deliberatingId, setDeliberatingId] = useState<string | null>(null);
  const revealTimer = useRef<ReturnType<typeof setInterval> | null>(null);
  const npcInit = useRef(false);

  useEffect(() => {
    if (!save) return;
    if (!npcInit.current) {
      npcInit.current = true;
      const props = buildNpcProposals(save.id, save.gameDays, proposals.length);
      if (props.length > 0) {
        setProposals(prev => [...prev, ...props]);
        showFeedback(`📩 市委常委发来${props.length}份干部任免提案`);
        setTab('vote');
      }
    }
  }, []);

  const showFeedback = (msg: string, ok = true) => {
    setFeedback(msg);
    setFeedbackOk(ok);
    setTimeout(() => setFeedback(''), 3800);
  };

  if (!save) return null;
  if (save.rankLevel < 7) {
    return (
      <View style={{ flex: 1, backgroundColor: '#F5F4F1', alignItems: 'center', justifyContent: 'center', padding: 32 }}>
        <StatusBar style="light" backgroundColor="#4E342E" />
        <Text style={{ fontSize: 30, marginBottom: 16 }}>🔒</Text>
        <Text style={{ fontSize: 15, fontWeight: '700', color: '#4E342E', marginBottom: 8 }}>权限不足</Text>
        <Text style={{ fontSize: 13, color: '#888', textAlign: 'center', lineHeight: 20 }}>市管干部任免权限仅开放给副厅级（7级）及以上职位</Text>
        <Pressable onPress={() => router.back()} style={{ marginTop: 24, paddingHorizontal: 24, paddingVertical: 10, backgroundColor: '#4E342E' }}>
          <Text style={{ color: '#fff', fontWeight: '700' }}>返回</Text>
        </Pressable>
      </View>
    );
  }

  const cadres = buildCityCadres(save.id);
  const isCitySecretary = save.rankLevel >= 8;  // 市委书记享有一锤定音权

  const handleSubmitProposal = () => {
    if (!selectedCadre) { showFeedback('请先选择被任免干部', false); return; }
    if (!propPost.trim()) { showFeedback('请填写拟任职务', false); return; }
    const committee = buildCityCommittee(save.id).map(m => ({
      ...m,
      stance: calcStance(m.id, m.faction, selectedCadre.faction, save.id),
    }));
    const newProp: AppointProposal = {
      id: `cp_${Date.now()}`,
      cadreId: selectedCadre.id,
      cadreName: selectedCadre.name,
      cadreFaction: selectedCadre.faction,
      proposedPost: propPost.trim(),
      proposedOrg: propOrg.trim() || selectedCadre.currentOrg,
      type: propType,
      voteStatus: 'pending',
      members: committee,
      voteFor: 0, voteAgainst: 0, voteAbstain: 0,
      createdDay: save.gameDays,
      proposedBy: 'player',
      isTopOverride: false,
    };
    setProposals(prev => [newProp, ...prev]);
    setSelectedCadre(null);
    setPropPost('');
    setPropOrg('');
    showFeedback('✅ 提案已提交，请在表决页召开市委常委会');
    setTab('vote');
  };

  // 逐票揭示
  const startDeliberate = (propId: string) => {
    setDeliberatingId(propId);
    setProposals(prev => prev.map(p => p.id === propId ? { ...p, voteStatus: 'deliberating' } : p));
    let idx = 0;
    const prop = proposals.find(p => p.id === propId);
    if (!prop) return;
    revealTimer.current = setInterval(() => {
      idx++;
      setProposals(prev => prev.map(p =>
        p.id === propId ? { ...p, members: p.members.map((m, i) => i < idx ? { ...m, revealed: true } : m) } : p,
      ));
      if (idx >= prop.members.length) {
        if (revealTimer.current) clearInterval(revealTimer.current);
        finalizeVote(propId);
      }
    }, 900);
  };

  const finalizeVote = async (propId: string) => {
    setDeliberatingId(null);
    setProposals(prev => prev.map(p => {
      if (p.id !== propId) return p;
      const voteFor = p.members.filter(m => m.stance === '赞成').length;
      const voteAgainst = p.members.filter(m => m.stance === '反对').length;
      const voteAbstain = p.members.filter(m => m.stance === '弃权').length;
      const quorum = Math.floor(p.members.length / 2) + 1; // 2/3
      return { ...p, voteFor, voteAgainst, voteAbstain, voteStatus: voteFor >= quorum ? 'approved' : 'rejected' };
    }));
    const prop = proposals.find(p => p.id === propId);
    if (!prop) return;
    const voteFor = prop.members.filter(m => m.stance === '赞成').length;
    if (voteFor >= 2) {
      await updateGameSave({ meritPoints: (save.meritPoints ?? 0) + 12 });
      showFeedback(`✅ 市委常委会${voteFor}:${prop.members.length - voteFor}通过，政绩+12`);
    } else {
      showFeedback(`❌ 市委常委会未通过（${voteFor}票赞成），建议改善与常委的关系`, false);
    }
  };

  const handleTopOverride = async (propId: string, forceApprove: boolean) => {
    if (revealTimer.current) clearInterval(revealTimer.current);
    setDeliberatingId(null);
    setProposals(prev => prev.map(p =>
      p.id === propId ? { ...p, voteStatus: forceApprove ? 'approved' : 'rejected', isTopOverride: true } : p,
    ));
    if (forceApprove) {
      await updateGameSave({ meritPoints: (save.meritPoints ?? 0) + 18 });
      showFeedback('⚡ 市委书记行使一锤定音权，任命强制通过，政绩+18');
    } else {
      showFeedback('⚡ 市委书记行使否决权，提案驳回');
    }
  };

  const pendingProps = proposals.filter(p => p.voteStatus === 'pending');
  const activeProps  = proposals.filter(p => p.voteStatus === 'deliberating');
  const decidedProps = proposals.filter(p => p.voteStatus === 'approved' || p.voteStatus === 'rejected');

  return (
    <View style={{ flex: 1, backgroundColor: '#0C0E14' }}>
      <StatusBar style="light" backgroundColor="#14182C" />

      {/* 顶栏 */}
      <View style={{ backgroundColor: '#14182C', paddingTop: insets.top + 8, paddingBottom: 14, paddingHorizontal: 16 }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 10 }}>
          <Pressable onPress={() => router.back()}>
            <Text style={{ color: '#6A8ACA', fontSize: 22 }}>‹</Text>
          </Pressable>
          <View style={{ flex: 1 }}>
            <Text style={{ color: '#6A8ACA', fontSize: 9, letterSpacing: 3 }}>市委组织部 · 市管干部</Text>
            <Text style={{ color: '#B0C8F0', fontSize: 16, fontWeight: '700' }}>🏙️ 市管干部任免</Text>
            <Text style={{ color: '#6A8ACA', fontSize: 10 }}>
              {isCitySecretary ? '市委书记 · 一锤定音权' : '市级领导 · 提名建议权'} · 市委常委会（3人表决）
            </Text>
          </View>
          {isCitySecretary && (
            <View style={{ backgroundColor: '#1A2040', borderWidth: 1, borderColor: '#4A6ACA', paddingHorizontal: 8, paddingVertical: 4 }}>
              <Text style={{ color: '#88AAEE', fontSize: 9, fontWeight: '700' }}>⚡ 一锤定音</Text>
            </View>
          )}
        </View>
        <View style={{ flexDirection: 'row', gap: 4 }}>
          {([
            { key: 'cadres',  label: '👥 干部候选' },
            { key: 'propose', label: '✍️ 发起提案' },
            { key: 'vote',    label: `🗳️ 常委表决（${pendingProps.length + activeProps.length}）` },
          ] as const).map(t => (
            <Pressable key={t.key} onPress={() => setTab(t.key)}
              style={{ flex: 1, paddingVertical: 7, alignItems: 'center', backgroundColor: tab === t.key ? '#1A2A50' : 'rgba(255,255,255,0.08)' }}
            >
              <Text style={{ color: tab === t.key ? '#B0C8F0' : '#6A8ACA', fontSize: 9, fontWeight: tab === t.key ? '700' : '400' }}>{t.label}</Text>
            </Pressable>
          ))}
        </View>
      </View>

      {/* 反馈条 */}
      {feedback ? (
        <View style={{ backgroundColor: feedbackOk ? '#0D1A2A' : '#2A0D0D', padding: 10 }}>
          <Text style={{ color: feedbackOk ? '#5AAAEA' : '#FF6666', fontSize: 12, fontWeight: '600' }}>{feedback}</Text>
        </View>
      ) : null}

      {/* ══ 干部候选 ══ */}
      {tab === 'cadres' && (
        <FlatList
          data={cadres}
          keyExtractor={item => item.id}
          contentContainerStyle={{ padding: 12, gap: 8 }}
          ListHeaderComponent={
            <View style={{ backgroundColor: '#14182C', borderWidth: 1, borderColor: '#2A3A60', padding: 10, marginBottom: 4 }}>
              <Text style={{ fontSize: 10, color: '#8AAADA', fontWeight: '700' }}>
                市管干部候选池：{cadres.length}人 · 含各县区主要领导及候补干部
              </Text>
            </View>
          }
          renderItem={({ item }) => {
            const fColor = FACTION_COLORS[item.faction] ?? '#888';
            return (
              <Pressable
                onPress={() => { setSelectedCadre(item); setTab('propose'); }}
                style={{ backgroundColor: '#141828', borderWidth: 1, borderColor: '#1A2A40', padding: 12 }}
              >
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
                  <View style={{ width: 44, height: 44, backgroundColor: '#1A2040', alignItems: 'center', justifyContent: 'center', borderWidth: 2, borderColor: '#3A5A8A' }}>
                    <Text style={{ fontSize: 22 }}>🏙️</Text>
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={{ fontSize: 14, fontWeight: '700', color: '#B0C8F0' }}>{item.name}</Text>
                    <Text style={{ fontSize: 11, color: '#8AAADA', marginTop: 1 }}>{item.currentPost} · {item.currentOrg}</Text>
                    <View style={{ flexDirection: 'row', gap: 6, marginTop: 2 }}>
                      <View style={{ backgroundColor: fColor + '22', borderWidth: 1, borderColor: fColor, paddingHorizontal: 5, paddingVertical: 1 }}>
                        <Text style={{ fontSize: 9, color: fColor }}>{item.faction}</Text>
                      </View>
                      <Text style={{ fontSize: 9, color: '#6A8ACA' }}>{item.age}岁 · 能力{item.ability}</Text>
                    </View>
                  </View>
                  <Text style={{ color: '#5A8ACA', fontSize: 12 }}>提名 ›</Text>
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
          <View style={{ backgroundColor: '#141828', borderWidth: 1, borderColor: '#2A3A60', padding: 14 }}>
            <Text style={{ fontSize: 11, color: '#5A8ACA', fontWeight: '700', letterSpacing: 2, marginBottom: 10 }}>被任免干部</Text>
            {selectedCadre ? (
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
                <View style={{ width: 48, height: 48, backgroundColor: '#1A2040', alignItems: 'center', justifyContent: 'center', borderWidth: 2, borderColor: '#3A5A8A' }}>
                  <Text style={{ fontSize: 24 }}>🏙️</Text>
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={{ fontSize: 14, fontWeight: '700', color: '#B0C8F0' }}>{selectedCadre.name}</Text>
                  <Text style={{ fontSize: 11, color: '#8AAADA' }}>{selectedCadre.currentPost} · {selectedCadre.currentOrg}</Text>
                  <Text style={{ fontSize: 10, color: '#5A8ACA' }}>{selectedCadre.faction} · {selectedCadre.age}岁 · 能力{selectedCadre.ability}</Text>
                </View>
                <Pressable onPress={() => { setSelectedCadre(null); setTab('cadres'); }}>
                  <Text style={{ color: '#CC5555', fontSize: 12 }}>重选</Text>
                </Pressable>
              </View>
            ) : (
              <Pressable onPress={() => setTab('cadres')} style={{ padding: 14, borderWidth: 1, borderColor: '#2A3A60', alignItems: 'center', backgroundColor: '#0E1420' }}>
                <Text style={{ color: '#5A8ACA', fontSize: 12, fontWeight: '600' }}>+ 从市管干部候选池选择</Text>
              </Pressable>
            )}
          </View>

          {/* 任免类型 */}
          <View style={{ backgroundColor: '#141828', borderWidth: 1, borderColor: '#2A3A60', padding: 14 }}>
            <Text style={{ fontSize: 11, color: '#5A8ACA', fontWeight: '700', letterSpacing: 2, marginBottom: 10 }}>任免类型</Text>
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
              {(['任命', '免职', '调任', '晋升'] as const).map(t => (
                <Pressable key={t} onPress={() => setPropType(t)}
                  style={{ paddingHorizontal: 16, paddingVertical: 8, borderWidth: 2, borderColor: propType === t ? '#5A8ACA' : '#1A2A40', backgroundColor: propType === t ? '#1A2A50' : '#0E1420' }}
                >
                  <Text style={{ color: propType === t ? '#B0C8F0' : '#4A6A9A', fontWeight: propType === t ? '700' : '400', fontSize: 12 }}>{t}</Text>
                </Pressable>
              ))}
            </View>
          </View>

          {/* 拟任职务 */}
          <View style={{ backgroundColor: '#141828', borderWidth: 1, borderColor: '#2A3A60', padding: 14 }}>
            <Text style={{ fontSize: 11, color: '#5A8ACA', fontWeight: '700', letterSpacing: 2, marginBottom: 8 }}>拟任职务</Text>
            <TextInput value={propPost} onChangeText={setPropPost} placeholder="请填写拟任职务…" placeholderTextColor="#2A3A6A"
              style={{ borderWidth: 1, borderColor: '#2A3A60', padding: 10, fontSize: 13, color: '#B0C8F0', marginBottom: 8, backgroundColor: '#0E1420' }}
            />
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 6 }}>
              {POST_OPTIONS.map(p => (
                <Pressable key={p} onPress={() => setPropPost(p)} style={{ backgroundColor: '#1A2040', paddingHorizontal: 8, paddingVertical: 4, borderWidth: 1, borderColor: '#2A3A60' }}>
                  <Text style={{ fontSize: 10, color: '#8AAADA' }}>{p}</Text>
                </Pressable>
              ))}
            </ScrollView>
          </View>

          {/* 拟任单位 */}
          <View style={{ backgroundColor: '#141828', borderWidth: 1, borderColor: '#2A3A60', padding: 14 }}>
            <Text style={{ fontSize: 11, color: '#5A8ACA', fontWeight: '700', letterSpacing: 2, marginBottom: 8 }}>拟任单位（可选）</Text>
            <TextInput value={propOrg} onChangeText={setPropOrg} placeholder="留空则保留原单位" placeholderTextColor="#2A3A6A"
              style={{ borderWidth: 1, borderColor: '#2A3A60', padding: 10, fontSize: 13, color: '#B0C8F0', backgroundColor: '#0E1420' }}
            />
          </View>

          <Pressable onPress={handleSubmitProposal}
            style={{ backgroundColor: selectedCadre && propPost.trim() ? '#1A2A50' : '#101620', paddingVertical: 14, alignItems: 'center', borderWidth: 1, borderColor: selectedCadre && propPost.trim() ? '#5A8ACA' : '#1A2A40' }}
          >
            <Text style={{ color: selectedCadre && propPost.trim() ? '#B0C8F0' : '#2A3A6A', fontWeight: '700', fontSize: 14 }}>
              📋 提交提案，提交市委常委会表决
            </Text>
          </Pressable>
          <View style={{ height: 20 }} />
        </ScrollView>
      )}

      {/* ══ 市委常委会表决 ══ */}
      {tab === 'vote' && (
        <ScrollView contentContainerStyle={{ padding: 14, gap: 12 }}>
          {[...pendingProps, ...activeProps].map(p => {
            const isDeliberating = deliberatingId === p.id;
            return (
              <View key={p.id} style={{ backgroundColor: '#141828', borderWidth: 1, borderColor: '#3A5A8A', padding: 14 }}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 8 }}>
                  <View style={{ backgroundColor: p.proposedBy !== 'player' ? '#1A2A40' : '#141828', borderWidth: 1, borderColor: p.proposedBy !== 'player' ? '#4A6ACA' : '#3A5A8A', paddingHorizontal: 7, paddingVertical: 2 }}>
                    <Text style={{ color: p.proposedBy !== 'player' ? '#8AAADA' : '#6A8ACA', fontSize: 9, fontWeight: '700' }}>
                      {p.proposedBy !== 'player' ? `📩 ${p.proposedBy}发起` : '✍️ 您发起'}
                    </Text>
                  </View>
                  <Text style={{ fontSize: 13, fontWeight: '700', color: '#B0C8F0', flex: 1 }}>{p.cadreName}</Text>
                  <Text style={{ fontSize: 9, color: '#4A6A9A' }}>第{p.createdDay}天</Text>
                </View>
                <View style={{ backgroundColor: '#0E1420', padding: 8, marginBottom: 8 }}>
                  <Text style={{ fontSize: 10, color: '#8AAADA' }}>
                    {p.type}拟任：<Text style={{ color: '#A0C0F0', fontWeight: '600' }}>{p.proposedPost}</Text> · {p.proposedOrg}
                  </Text>
                </View>

                {/* 逐票揭示 */}
                {(isDeliberating || p.voteStatus === 'deliberating') && (
                  <View style={{ marginBottom: 10, gap: 4 }}>
                    <Text style={{ fontSize: 10, color: '#5A8ACA', fontWeight: '700', letterSpacing: 1, marginBottom: 4 }}>🗳️ 市委常委逐一表决（共3票，需2票通过）</Text>
                    {p.members.map((m, idx) => {
                      const sc = m.stance === '赞成' ? '#1A5A8A' : m.stance === '反对' ? '#8A1A1A' : '#3A3A3A';
                      const sb = m.stance === '赞成' ? '#0D1A2A' : m.stance === '反对' ? '#2A0D0D' : '#141414';
                      const fC = FACTION_COLORS[m.faction] ?? '#888';
                      return (
                        <View key={m.id} style={{ flexDirection: 'row', alignItems: 'center', gap: 8, opacity: m.revealed ? 1 : 0.3, backgroundColor: sb, padding: 7, borderWidth: 1, borderColor: sc }}>
                          <Text style={{ width: 14, color: '#4A6A9A', fontSize: 9 }}>{idx + 1}</Text>
                          <Text style={{ flex: 1, color: '#B0C8F0', fontSize: 11, fontWeight: '700' }}>{m.name}</Text>
                          <Text style={{ color: fC, fontSize: 9 }}>{m.faction}</Text>
                          <Text style={{ fontSize: 9, color: '#6A8ACA' }}>{m.title}</Text>
                          {m.revealed ? (
                            <View style={{ backgroundColor: sc + '33', borderWidth: 1, borderColor: sc, paddingHorizontal: 8, paddingVertical: 2, minWidth: 36, alignItems: 'center' }}>
                              <Text style={{ color: m.stance === '赞成' ? '#66AAEE' : m.stance === '反对' ? '#EE6666' : '#AAAAAA', fontSize: 11, fontWeight: '700' }}>{m.stance}</Text>
                            </View>
                          ) : (
                            <View style={{ backgroundColor: '#1A2030', borderWidth: 1, borderColor: '#2A3040', paddingHorizontal: 8, paddingVertical: 2, minWidth: 36, alignItems: 'center' }}>
                              <Text style={{ color: '#444', fontSize: 11 }}>…</Text>
                            </View>
                          )}
                        </View>
                      );
                    })}
                  </View>
                )}

                {p.voteStatus === 'pending' && (
                  <View style={{ gap: 8 }}>
                    <Pressable onPress={() => startDeliberate(p.id)}
                      style={{ backgroundColor: '#1A2A50', paddingVertical: 12, alignItems: 'center', borderWidth: 1, borderColor: '#5A8ACA' }}
                    >
                      <Text style={{ color: '#B0C8F0', fontWeight: '700', fontSize: 13 }}>🗳️ 召开市委常委会·逐一表决</Text>
                    </Pressable>
                    {isCitySecretary && (
                      <View style={{ flexDirection: 'row', gap: 8 }}>
                        <Pressable onPress={() => void handleTopOverride(p.id, true)}
                          style={{ flex: 1, backgroundColor: '#0D1A2A', paddingVertical: 10, alignItems: 'center', borderWidth: 1, borderColor: '#3A6A8A' }}
                        >
                          <Text style={{ color: '#66AAEE', fontWeight: '700', fontSize: 11 }}>⚡ 书记一锤定音</Text>
                        </Pressable>
                        <Pressable onPress={() => void handleTopOverride(p.id, false)}
                          style={{ flex: 1, backgroundColor: '#2A1010', paddingVertical: 10, alignItems: 'center', borderWidth: 1, borderColor: '#8A3A3A' }}
                        >
                          <Text style={{ color: '#EE8888', fontWeight: '700', fontSize: 11 }}>⚡ 书记一票否决</Text>
                        </Pressable>
                      </View>
                    )}
                  </View>
                )}
                {p.voteStatus === 'deliberating' && !isDeliberating && (
                  <View style={{ backgroundColor: '#0E1420', padding: 8, alignItems: 'center' }}>
                    <Text style={{ color: '#5A8ACA', fontSize: 11 }}>⏳ 表决进行中…</Text>
                  </View>
                )}
              </View>
            );
          })}

          {/* 历史 */}
          {decidedProps.length > 0 && (
            <>
              <View style={{ borderBottomWidth: 1, borderBottomColor: '#2A3A60', paddingBottom: 4 }}>
                <Text style={{ fontSize: 10, color: '#4A6A9A', fontWeight: '700', letterSpacing: 2 }}>历史表决记录</Text>
              </View>
              {decidedProps.map(p => {
                const ok = p.voteStatus === 'approved';
                return (
                  <View key={p.id} style={{ backgroundColor: '#141828', borderWidth: 1, borderColor: ok ? '#1A3A5C' : '#5C1A1A', padding: 12 }}>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 6 }}>
                      <Text style={{ fontSize: 15 }}>{p.isTopOverride ? '⚡' : ok ? '✅' : '❌'}</Text>
                      <Text style={{ fontSize: 13, fontWeight: '700', color: '#B0C8F0', flex: 1 }}>{p.cadreName}</Text>
                      <View style={{ backgroundColor: ok ? '#1A3A5C' : '#5C1A1A', paddingHorizontal: 6, paddingVertical: 1 }}>
                        <Text style={{ fontSize: 9, color: ok ? '#5AAAEA' : '#FF6666', fontWeight: '700' }}>
                          {p.isTopOverride ? (ok ? '书记一锤定音' : '书记否决') : (ok ? '通过' : '否决')}
                        </Text>
                      </View>
                    </View>
                    <Text style={{ fontSize: 11, color: '#8AAADA' }}>{p.type}：{p.proposedPost} · {p.proposedOrg}</Text>
                    {!p.isTopOverride && (
                      <Text style={{ fontSize: 10, color: '#4A6A9A', marginTop: 4 }}>
                        {p.voteFor}票赞成 · {p.voteAgainst}票反对 · {p.voteAbstain}票弃权
                        {ok ? `  ·  赞成委员关系+3` : `  ·  建议改善与常委关系`}
                      </Text>
                    )}
                  </View>
                );
              })}
            </>
          )}

          {proposals.length === 0 && (
            <View style={{ padding: 40, alignItems: 'center' }}>
              <Text style={{ fontSize: 40, marginBottom: 12 }}>🏙️</Text>
              <Text style={{ fontSize: 14, color: '#4A6A9A', textAlign: 'center' }}>暂无市管干部任免提案</Text>
              <Text style={{ fontSize: 11, color: '#2A3A6A', marginTop: 4 }}>在「发起提案」页提交，或等待市委委员发起</Text>
            </View>
          )}
          <View style={{ height: 20 }} />
        </ScrollView>
      )}
    </View>
  );
}
