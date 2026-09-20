// 省管干部任免页 — rank10（副省级）及以上
// 规则：省委常委会5人逐一表决，省委书记享有一锤定音权，NPC委员可发起提案
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

interface ProvCadre {
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

// 省委常委会5人职位
const PROV_TITLES = [
  '省委书记', '省长', '专职省委副书记', '省委组织部长', '省纪委书记',
];

// 省管干部池（市级职位）
const PROV_CADRE_POOL = [
  { post: '市委书记', orgs: ['某市'] },
  { post: '市长', orgs: ['某市'] },
  { post: '市委副书记', orgs: ['某市'] },
  { post: '常务副市长', orgs: ['某市'] },
  { post: '市委组织部长', orgs: ['某市'] },
  { post: '市委宣传部长', orgs: ['某市'] },
  { post: '市纪委书记', orgs: ['某市'] },
  { post: '市委政法委书记', orgs: ['某市'] },
];
const POST_OPTIONS = PROV_CADRE_POOL.map(p => p.post);

const CITY_NAMES = [
  '春江市', '汉阳市', '晋州市', '渭南市', '洛泉市',
  '定远市', '涪陵市', '龙川市', '通明市', '岳麓市',
];

// NPC提案模板
const NPC_TMPL = [
  { post: '市委书记', org: '春江市', type: '调任' as const },
  { post: '常务副市长', org: '汉阳市', type: '任命' as const },
];

// ── 哈希工具 ──────────────────────────────────────────────────────────
function hashStr(s: string): number {
  let h = 0;
  for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) & 0xffff;
  return h;
}

// ── 构建省管干部候选人列表 ─────────────────────────────────────────
function buildProvCadres(saveId: string): ProvCadre[] {
  const surnames = ['张', '王', '李', '赵', '陈', '刘', '杨', '黄', '周', '吴', '徐', '孙'];
  const given = ['文博', '建国', '志远', '晓明', '宏伟', '峰', '勇', '磊', '洁', '青'];
  return Array.from({ length: 14 }, (_, i) => {
    const h = hashStr(saveId + 'prov_cadre' + i);
    const name = (surnames[h % surnames.length] ?? '王') + (given[(h >> 4) % given.length] ?? '博');
    const postIdx = h % PROV_CADRE_POOL.length;
    const cityIdx = (h >> 2) % CITY_NAMES.length;
    return {
      id: `pc${i}`,
      name,
      currentPost: PROV_CADRE_POOL[postIdx]?.post ?? '副市长',
      currentOrg: CITY_NAMES[cityIdx] ?? '某市',
      age: 40 + (h % 15),
      faction: FACTIONS[h % FACTIONS.length] ?? '务实派',
      ability: 65 + (h % 30),
    };
  });
}

// ── 构建省委常委会5人 ────────────────────────────────────────────────
function buildProvCommittee(saveId: string): CommitteeMember[] {
  const surnames2 = ['钱', '孙', '周', '吴', '郑', '王', '冯', '陈'];
  const given2 = ['强', '明', '勇', '志', '海', '浩', '峰', '博'];
  return PROV_TITLES.map((title, i) => {
    const h = hashStr(saveId + title + i + 'prov');
    const name = (surnames2[h % surnames2.length] ?? '钱') + (given2[(h >> 4) % given2.length] ?? '明');
    const faction = FACTIONS[h % FACTIONS.length] ?? '务实派';
    return { id: `pcm_${i}`, name, title, faction, stance: '弃权', revealed: false };
  });
}

// ── 确定性投票立场 ────────────────────────────────────────────────────
function calcStance(memberId: string, memberFaction: string, candidateFaction: string, saveId: string): VoteStance {
  const h = hashStr(memberId + saveId + candidateFaction + 'prov');
  let fScore: number;
  if (memberFaction === candidateFaction) fScore = 80 + (h % 18);
  else if ((FACTION_OPPOSE[memberFaction] ?? []).includes(candidateFaction)) fScore = 10 + (h % 18);
  else fScore = 42 + (h % 28);
  const relScore = 32 + (hashStr(saveId + memberId + 'rel') % 55);
  const combined = Math.round(fScore * 0.6 + relScore * 0.4);
  if (combined >= 62) return '赞成';
  if (combined >= 40) return '弃权';
  return '反对';
}

// ── 生成NPC提案 ───────────────────────────────────────────────────────
function buildNpcProposals(saveId: string, gameDays: number, existCount: number): AppointProposal[] {
  if (existCount > 0) return [];
  const cadres = buildProvCadres(saveId);
  return NPC_TMPL.slice(0, 2).map((tmpl, i) => {
    const cadre = cadres[i] ?? cadres[0]!;
    const committee = buildProvCommittee(saveId).map(m => ({
      ...m,
      stance: calcStance(m.id, m.faction, cadre.faction, saveId),
    }));
    return {
      id: `npc_p_${gameDays}_${i}`,
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
      proposedBy: committee[1]?.name ?? '省长',
      isTopOverride: false,
    };
  });
}

// ═══════════════════════════════════════════════════════════════════════
export default function ProvinceAppointmentScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { save, updateGameSave } = useGame();
  const [tab, setTab] = useState<'cadres' | 'propose' | 'vote'>('cadres');
  const [proposals, setProposals] = useState<AppointProposal[]>([]);
  const [feedback, setFeedback] = useState('');
  const [feedbackOk, setFeedbackOk] = useState(true);
  const [selectedCadre, setSelectedCadre] = useState<ProvCadre | null>(null);
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
        showFeedback(`📩 省委常委发来${props.length}份干部任免提案`);
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
  if (save.rankLevel < 10) {
    return (
      <View style={{ flex: 1, backgroundColor: '#F5F4F1', alignItems: 'center', justifyContent: 'center', padding: 32 }}>
        <StatusBar style="light" backgroundColor="#7B0026" />
        <Text style={{ fontSize: 30, marginBottom: 16 }}>🔒</Text>
        <Text style={{ fontSize: 15, fontWeight: '700', color: '#7B0026', marginBottom: 8 }}>权限不足</Text>
        <Text style={{ fontSize: 13, color: '#888', textAlign: 'center', lineHeight: 20 }}>省管干部任免权限仅开放给副省级（10级）及以上职位</Text>
        <Pressable onPress={() => router.back()} style={{ marginTop: 24, paddingHorizontal: 24, paddingVertical: 10, backgroundColor: '#7B0026' }}>
          <Text style={{ color: '#fff', fontWeight: '700' }}>返回</Text>
        </Pressable>
      </View>
    );
  }

  const cadres = buildProvCadres(save.id);
  const isProvSecretary = save.rankLevel >= 11;  // 省委书记享有一锤定音权

  const handleSubmitProposal = () => {
    if (!selectedCadre) { showFeedback('请先选择被任免干部', false); return; }
    if (!propPost.trim()) { showFeedback('请填写拟任职务', false); return; }
    const committee = buildProvCommittee(save.id).map(m => ({
      ...m,
      stance: calcStance(m.id, m.faction, selectedCadre.faction, save.id),
    }));
    const newProp: AppointProposal = {
      id: `pp_${Date.now()}`,
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
    showFeedback('✅ 提案已提交，请在表决页召开省委常委会');
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
      const quorum = Math.floor(p.members.length / 2) + 1; // 3/5
      return { ...p, voteFor, voteAgainst, voteAbstain, voteStatus: voteFor >= quorum ? 'approved' : 'rejected' };
    }));
    const prop = proposals.find(p => p.id === propId);
    if (!prop) return;
    const voteFor = prop.members.filter(m => m.stance === '赞成').length;
    if (voteFor >= 3) {
      await updateGameSave({ meritPoints: (save.meritPoints ?? 0) + 20 });
      showFeedback(`✅ 省委常委会${voteFor}:${prop.members.length - voteFor}通过，政绩+20`);
    } else {
      showFeedback(`❌ 省委常委会未通过（${voteFor}票赞成），建议改善与常委的关系`, false);
    }
  };

  const handleTopOverride = async (propId: string, forceApprove: boolean) => {
    if (revealTimer.current) clearInterval(revealTimer.current);
    setDeliberatingId(null);
    setProposals(prev => prev.map(p =>
      p.id === propId ? { ...p, voteStatus: forceApprove ? 'approved' : 'rejected', isTopOverride: true } : p,
    ));
    if (forceApprove) {
      await updateGameSave({ meritPoints: (save.meritPoints ?? 0) + 28 });
      showFeedback('⚡ 省委书记行使一锤定音权，任命强制通过，政绩+28');
    } else {
      showFeedback('⚡ 省委书记行使否决权，提案驳回');
    }
  };

  const pendingProps  = proposals.filter(p => p.voteStatus === 'pending');
  const activeProps   = proposals.filter(p => p.voteStatus === 'deliberating');
  const decidedProps  = proposals.filter(p => p.voteStatus === 'approved' || p.voteStatus === 'rejected');

  return (
    <View style={{ flex: 1, backgroundColor: '#0E100C' }}>
      <StatusBar style="light" backgroundColor="#1C2A14" />

      {/* 顶栏 */}
      <View style={{ backgroundColor: '#1C2A14', paddingTop: insets.top + 8, paddingBottom: 14, paddingHorizontal: 16 }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 10 }}>
          <Pressable onPress={() => router.back()}>
            <Text style={{ color: '#7AAA5A', fontSize: 22 }}>‹</Text>
          </Pressable>
          <View style={{ flex: 1 }}>
            <Text style={{ color: '#7AAA5A', fontSize: 9, letterSpacing: 3 }}>省委组织部 · 省管干部</Text>
            <Text style={{ color: '#D0F0B0', fontSize: 16, fontWeight: '700' }}>🏛️ 省管干部任免</Text>
            <Text style={{ color: '#7AAA5A', fontSize: 10 }}>
              {isProvSecretary ? '省委书记 · 一锤定音权' : '省级领导 · 提名建议权'} · 省委常委会（5人表决）
            </Text>
          </View>
          {isProvSecretary && (
            <View style={{ backgroundColor: '#1A3A0A', borderWidth: 1, borderColor: '#4A8A2A', paddingHorizontal: 8, paddingVertical: 4 }}>
              <Text style={{ color: '#88DD88', fontSize: 9, fontWeight: '700' }}>⚡ 一锤定音</Text>
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
              style={{ flex: 1, paddingVertical: 7, alignItems: 'center', backgroundColor: tab === t.key ? '#2A4A1A' : 'rgba(255,255,255,0.08)' }}
            >
              <Text style={{ color: tab === t.key ? '#D0F0B0' : '#7AAA5A', fontSize: 9, fontWeight: tab === t.key ? '700' : '400' }}>{t.label}</Text>
            </Pressable>
          ))}
        </View>
      </View>

      {/* 反馈条 */}
      {feedback ? (
        <View style={{ backgroundColor: feedbackOk ? '#0D2A0D' : '#2A0D0D', padding: 10 }}>
          <Text style={{ color: feedbackOk ? '#5AE87A' : '#FF6666', fontSize: 12, fontWeight: '600' }}>{feedback}</Text>
        </View>
      ) : null}

      {/* ══ 干部候选 ══ */}
      {tab === 'cadres' && (
        <FlatList
          data={cadres}
          keyExtractor={item => item.id}
          contentContainerStyle={{ padding: 12, gap: 8 }}
          ListHeaderComponent={
            <View style={{ backgroundColor: '#1C2A14', borderWidth: 1, borderColor: '#2A4A1A', padding: 10, marginBottom: 4 }}>
              <Text style={{ fontSize: 10, color: '#A0D080', fontWeight: '700' }}>
                省管干部候选池：{cadres.length}人 · 含各市主要领导及候补干部
              </Text>
            </View>
          }
          renderItem={({ item }) => {
            const fColor = FACTION_COLORS[item.faction] ?? '#888';
            return (
              <Pressable
                onPress={() => { setSelectedCadre(item); setTab('propose'); }}
                style={{ backgroundColor: '#141E0E', borderWidth: 1, borderColor: '#2A3A20', padding: 12 }}
              >
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
                  <View style={{ width: 44, height: 44, backgroundColor: '#1A2A14', alignItems: 'center', justifyContent: 'center', borderWidth: 2, borderColor: '#3A6A2A' }}>
                    <Text style={{ fontSize: 22 }}>🏛️</Text>
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={{ fontSize: 14, fontWeight: '700', color: '#D0F0B0' }}>{item.name}</Text>
                    <Text style={{ fontSize: 11, color: '#8AAA6A', marginTop: 1 }}>{item.currentPost} · {item.currentOrg}</Text>
                    <View style={{ flexDirection: 'row', gap: 6, marginTop: 2 }}>
                      <View style={{ backgroundColor: fColor + '22', borderWidth: 1, borderColor: fColor, paddingHorizontal: 5, paddingVertical: 1 }}>
                        <Text style={{ fontSize: 9, color: fColor }}>{item.faction}</Text>
                      </View>
                      <Text style={{ fontSize: 9, color: '#8AAA6A' }}>{item.age}岁 · 能力{item.ability}</Text>
                    </View>
                  </View>
                  <Text style={{ color: '#5AAA3A', fontSize: 12 }}>提名 ›</Text>
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
          <View style={{ backgroundColor: '#141E0E', borderWidth: 1, borderColor: '#2A4A1A', padding: 14 }}>
            <Text style={{ fontSize: 11, color: '#5AAA3A', fontWeight: '700', letterSpacing: 2, marginBottom: 10 }}>被任免干部</Text>
            {selectedCadre ? (
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
                <View style={{ width: 48, height: 48, backgroundColor: '#1A2A14', alignItems: 'center', justifyContent: 'center', borderWidth: 2, borderColor: '#3A6A2A' }}>
                  <Text style={{ fontSize: 24 }}>🏛️</Text>
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={{ fontSize: 14, fontWeight: '700', color: '#D0F0B0' }}>{selectedCadre.name}</Text>
                  <Text style={{ fontSize: 11, color: '#8AAA6A' }}>{selectedCadre.currentPost} · {selectedCadre.currentOrg}</Text>
                  <Text style={{ fontSize: 10, color: '#5AAA3A' }}>{selectedCadre.faction} · {selectedCadre.age}岁 · 能力{selectedCadre.ability}</Text>
                </View>
                <Pressable onPress={() => { setSelectedCadre(null); setTab('cadres'); }}>
                  <Text style={{ color: '#CC5555', fontSize: 12 }}>重选</Text>
                </Pressable>
              </View>
            ) : (
              <Pressable onPress={() => setTab('cadres')} style={{ padding: 14, borderWidth: 1, borderColor: '#2A4A1A', alignItems: 'center', backgroundColor: '#0E1A08' }}>
                <Text style={{ color: '#5AAA3A', fontSize: 12, fontWeight: '600' }}>+ 从省管干部候选池选择</Text>
              </Pressable>
            )}
          </View>

          {/* 任免类型 */}
          <View style={{ backgroundColor: '#141E0E', borderWidth: 1, borderColor: '#2A4A1A', padding: 14 }}>
            <Text style={{ fontSize: 11, color: '#5AAA3A', fontWeight: '700', letterSpacing: 2, marginBottom: 10 }}>任免类型</Text>
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
              {(['任命', '免职', '调任', '晋升'] as const).map(t => (
                <Pressable key={t} onPress={() => setPropType(t)}
                  style={{ paddingHorizontal: 16, paddingVertical: 8, borderWidth: 2, borderColor: propType === t ? '#5AAA3A' : '#2A3A20', backgroundColor: propType === t ? '#1A3A0A' : '#0E1A08' }}
                >
                  <Text style={{ color: propType === t ? '#D0F0B0' : '#5A7A3A', fontWeight: propType === t ? '700' : '400', fontSize: 12 }}>{t}</Text>
                </Pressable>
              ))}
            </View>
          </View>

          {/* 拟任职务 */}
          <View style={{ backgroundColor: '#141E0E', borderWidth: 1, borderColor: '#2A4A1A', padding: 14 }}>
            <Text style={{ fontSize: 11, color: '#5AAA3A', fontWeight: '700', letterSpacing: 2, marginBottom: 8 }}>拟任职务</Text>
            <TextInput value={propPost} onChangeText={setPropPost} placeholder="请填写拟任职务…" placeholderTextColor="#3A5A2A"
              style={{ borderWidth: 1, borderColor: '#2A4A1A', padding: 10, fontSize: 13, color: '#D0F0B0', marginBottom: 8, backgroundColor: '#0E1A08' }}
            />
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 6 }}>
              {POST_OPTIONS.map(p => (
                <Pressable key={p} onPress={() => setPropPost(p)} style={{ backgroundColor: '#1A2A14', paddingHorizontal: 8, paddingVertical: 4, borderWidth: 1, borderColor: '#3A5A2A' }}>
                  <Text style={{ fontSize: 10, color: '#A0D080' }}>{p}</Text>
                </Pressable>
              ))}
            </ScrollView>
          </View>

          {/* 拟任单位 */}
          <View style={{ backgroundColor: '#141E0E', borderWidth: 1, borderColor: '#2A4A1A', padding: 14 }}>
            <Text style={{ fontSize: 11, color: '#5AAA3A', fontWeight: '700', letterSpacing: 2, marginBottom: 8 }}>拟任单位（可选）</Text>
            <TextInput value={propOrg} onChangeText={setPropOrg} placeholder="留空则保留原单位" placeholderTextColor="#3A5A2A"
              style={{ borderWidth: 1, borderColor: '#2A4A1A', padding: 10, fontSize: 13, color: '#D0F0B0', backgroundColor: '#0E1A08' }}
            />
          </View>

          <Pressable onPress={handleSubmitProposal}
            style={{ backgroundColor: selectedCadre && propPost.trim() ? '#2A4A1A' : '#1A2A10', paddingVertical: 14, alignItems: 'center', borderWidth: 1, borderColor: selectedCadre && propPost.trim() ? '#5AAA3A' : '#2A3A20' }}
          >
            <Text style={{ color: selectedCadre && propPost.trim() ? '#D0F0B0' : '#3A5A2A', fontWeight: '700', fontSize: 14 }}>
              📋 提交提案，提交省委常委会表决
            </Text>
          </Pressable>
          <View style={{ height: 20 }} />
        </ScrollView>
      )}

      {/* ══ 省委常委会表决 ══ */}
      {tab === 'vote' && (
        <ScrollView contentContainerStyle={{ padding: 14, gap: 12 }}>
          {[...pendingProps, ...activeProps].map(p => {
            const isDeliberating = deliberatingId === p.id;
            return (
              <View key={p.id} style={{ backgroundColor: '#141E0E', borderWidth: 1, borderColor: '#3A6A2A', padding: 14 }}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 8 }}>
                  <View style={{ backgroundColor: p.proposedBy !== 'player' ? '#1A2A14' : '#141E0E', borderWidth: 1, borderColor: p.proposedBy !== 'player' ? '#5AAA3A' : '#3A6A2A', paddingHorizontal: 7, paddingVertical: 2 }}>
                    <Text style={{ color: p.proposedBy !== 'player' ? '#A0D080' : '#7AAA5A', fontSize: 9, fontWeight: '700' }}>
                      {p.proposedBy !== 'player' ? `📩 ${p.proposedBy}发起` : '✍️ 您发起'}
                    </Text>
                  </View>
                  <Text style={{ fontSize: 13, fontWeight: '700', color: '#D0F0B0', flex: 1 }}>{p.cadreName}</Text>
                  <Text style={{ fontSize: 9, color: '#5A7A3A' }}>第{p.createdDay}天</Text>
                </View>
                <View style={{ backgroundColor: '#0E1A08', padding: 8, marginBottom: 8 }}>
                  <Text style={{ fontSize: 10, color: '#8AAA6A' }}>
                    {p.type}拟任：<Text style={{ color: '#A0D080', fontWeight: '600' }}>{p.proposedPost}</Text> · {p.proposedOrg}
                  </Text>
                </View>

                {/* 逐票揭示 */}
                {(isDeliberating || p.voteStatus === 'deliberating') && (
                  <View style={{ marginBottom: 10, gap: 4 }}>
                    <Text style={{ fontSize: 10, color: '#5AAA3A', fontWeight: '700', letterSpacing: 1, marginBottom: 4 }}>🗳️ 省委常委逐一表决（共5票，需3票通过）</Text>
                    {p.members.map((m, idx) => {
                      const sc = m.stance === '赞成' ? '#3A7A3A' : m.stance === '反对' ? '#7A3A3A' : '#4A4A4A';
                      const sb = m.stance === '赞成' ? '#0D2A0D' : m.stance === '反对' ? '#2A0D0D' : '#1A1A1A';
                      const fC = FACTION_COLORS[m.faction] ?? '#888';
                      return (
                        <View key={m.id} style={{ flexDirection: 'row', alignItems: 'center', gap: 8, opacity: m.revealed ? 1 : 0.3, backgroundColor: sb, padding: 7, borderWidth: 1, borderColor: sc }}>
                          <Text style={{ width: 14, color: '#5A7A3A', fontSize: 9 }}>{idx + 1}</Text>
                          <Text style={{ flex: 1, color: '#D0F0B0', fontSize: 11, fontWeight: '700' }}>{m.name}</Text>
                          <Text style={{ color: fC, fontSize: 9 }}>{m.faction}</Text>
                          <Text style={{ fontSize: 9, color: '#6A8A5A' }}>{m.title}</Text>
                          {m.revealed ? (
                            <View style={{ backgroundColor: sc + '33', borderWidth: 1, borderColor: sc, paddingHorizontal: 8, paddingVertical: 2, minWidth: 36, alignItems: 'center' }}>
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

                {p.voteStatus === 'pending' && (
                  <View style={{ gap: 8 }}>
                    <Pressable onPress={() => startDeliberate(p.id)}
                      style={{ backgroundColor: '#2A4A1A', paddingVertical: 12, alignItems: 'center', borderWidth: 1, borderColor: '#5AAA3A' }}
                    >
                      <Text style={{ color: '#D0F0B0', fontWeight: '700', fontSize: 13 }}>🗳️ 召开省委常委会·逐一表决</Text>
                    </Pressable>
                    {isProvSecretary && (
                      <View style={{ flexDirection: 'row', gap: 8 }}>
                        <Pressable onPress={() => void handleTopOverride(p.id, true)}
                          style={{ flex: 1, backgroundColor: '#1A3A1A', paddingVertical: 10, alignItems: 'center', borderWidth: 1, borderColor: '#3A9A3A' }}
                        >
                          <Text style={{ color: '#88EE88', fontWeight: '700', fontSize: 11 }}>⚡ 书记一锤定音</Text>
                        </Pressable>
                        <Pressable onPress={() => void handleTopOverride(p.id, false)}
                          style={{ flex: 1, backgroundColor: '#3A1A1A', paddingVertical: 10, alignItems: 'center', borderWidth: 1, borderColor: '#8A3A3A' }}
                        >
                          <Text style={{ color: '#EE8888', fontWeight: '700', fontSize: 11 }}>⚡ 书记一票否决</Text>
                        </Pressable>
                      </View>
                    )}
                  </View>
                )}
                {p.voteStatus === 'deliberating' && !isDeliberating && (
                  <View style={{ backgroundColor: '#0E1A08', padding: 8, alignItems: 'center' }}>
                    <Text style={{ color: '#5AAA3A', fontSize: 11 }}>⏳ 表决进行中…</Text>
                  </View>
                )}
              </View>
            );
          })}

          {/* 历史 */}
          {decidedProps.length > 0 && (
            <>
              <View style={{ borderBottomWidth: 1, borderBottomColor: '#2A4A1A', paddingBottom: 4 }}>
                <Text style={{ fontSize: 10, color: '#5A7A3A', fontWeight: '700', letterSpacing: 2 }}>历史表决记录</Text>
              </View>
              {decidedProps.map(p => {
                const ok = p.voteStatus === 'approved';
                return (
                  <View key={p.id} style={{ backgroundColor: '#141E0E', borderWidth: 1, borderColor: ok ? '#1A5C1A' : '#5C1A1A', padding: 12 }}>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 6 }}>
                      <Text style={{ fontSize: 15 }}>{p.isTopOverride ? '⚡' : ok ? '✅' : '❌'}</Text>
                      <Text style={{ fontSize: 13, fontWeight: '700', color: '#D0F0B0', flex: 1 }}>{p.cadreName}</Text>
                      <View style={{ backgroundColor: ok ? '#1A5C1A' : '#5C1A1A', paddingHorizontal: 6, paddingVertical: 1 }}>
                        <Text style={{ fontSize: 9, color: ok ? '#5AE87A' : '#FF6666', fontWeight: '700' }}>
                          {p.isTopOverride ? (ok ? '书记一锤定音' : '书记否决') : (ok ? '通过' : '否决')}
                        </Text>
                      </View>
                    </View>
                    <Text style={{ fontSize: 11, color: '#8AAA6A' }}>{p.type}：{p.proposedPost} · {p.proposedOrg}</Text>
                    {!p.isTopOverride && (
                      <Text style={{ fontSize: 10, color: '#5A7A3A', marginTop: 4 }}>
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
              <Text style={{ fontSize: 40, marginBottom: 12 }}>🏛️</Text>
              <Text style={{ fontSize: 14, color: '#5A7A3A', textAlign: 'center' }}>暂无省管干部任免提案</Text>
              <Text style={{ fontSize: 11, color: '#3A5A2A', marginTop: 4 }}>在「发起提案」页提交，或等待省委委员发起</Text>
            </View>
          )}
          <View style={{ height: 20 }} />
        </ScrollView>
      )}
    </View>
  );
}
