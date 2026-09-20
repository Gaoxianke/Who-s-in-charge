// 私属门客页面（R4）—— 幕僚/门客/亲信，独立于体制编制
import { useCallback, useState } from 'react';
import { ActivityIndicator, FlatList, Modal, Pressable, ScrollView, Text, View } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter, useFocusEffect } from 'expo-router';
import { useGame } from '@/ctx/GameContext';
import { getRetainers, recruitRetainer, rewardRetainer, getSubordinatesByRank, setMentor, recommendIntoService, getOrCreateRecruitCandidates } from '@/db/gameApi';
import type { Retainer, RetainerType, Subordinate, RecruitCandidate } from '@/types/game';
import { RETAINER_CONFIG, getSubAvatarEmoji, getAvatarBgColor } from '@/types/game';

const RETAINER_TYPES: RetainerType[] = ['advisor', 'spy', 'guard'];

function loyaltyColor(v: number) {
  if (v < 10) return '#C8161D';
  if (v < 20) return '#E08600';
  if (v < 50) return '#B8860B';
  return '#2a7a3b';
}

export default function RetainersScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { save, refreshSave } = useGame();
  const [list, setList] = useState<Retainer[]>([]);
  const [subs, setSubs] = useState<Subordinate[]>([]);
  const [candidates, setCandidates] = useState<RecruitCandidate[]>([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState('');
  const [tab, setTab] = useState<'retainers' | 'mentor' | 'recommend'>('retainers');

  const load = useCallback(async () => {
    if (!save) return;
    setLoading(true);
    const [r, s, c] = await Promise.all([
      getRetainers(save.id),
      getSubordinatesByRank(save.id, save.rankLevel),
      getOrCreateRecruitCandidates(save.id, save.userId, Math.floor(save.gameDays / 365) + 1),
    ]);
    setList(r);
    setSubs(s);
    setCandidates(c.filter(x => x.status === 'pending'));
    setLoading(false);
  }, [save]);

  useFocusEffect(useCallback(() => { void load(); }, [load]));

  const handleRecruit = async (type: RetainerType) => {
    if (!save) return;
    setBusy(true);
    setMsg('');
    const res = await recruitRetainer(save.id, save.userId, type);
    setMsg(res.msg);
    setBusy(false);
    if (res.success) { await refreshSave(); await load(); }
  };

  const handleReward = async (id: string) => {
    if (!save) return;
    setBusy(true);
    setMsg('');
    const res = await rewardRetainer(save.id, id);
    setMsg(res.msg);
    setBusy(false);
    if (res.success) { await refreshSave(); await load(); }
  };

  // 师徒制
  const [mentorPick, setMentorPick] = useState<Subordinate | null>(null);
  const [apprentice, setApprentice] = useState<Subordinate | null>(null);
  const handleSetMentor = async () => {
    if (!mentorPick || !apprentice) return;
    setBusy(true);
    setMsg('');
    const res = await setMentor(mentorPick.id, apprentice.id);
    setMsg(res.msg);
    setBusy(false);
    if (res.success) { setMentorPick(null); setApprentice(null); await load(); }
  };

  // 举荐入仕
  const handleRecommend = async (id: string) => {
    if (!save) return;
    setBusy(true);
    setMsg('');
    const res = await recommendIntoService(save.id, id);
    setMsg(res.msg);
    setBusy(false);
    if (res.success) { await refreshSave(); await load(); }
  };

  const mentors = subs.filter(s => s.ability >= 60);
  const apprentices = subs.filter(s => s.ability < 40 && !s.mentorId);

  return (
    <View style={{ flex: 1, backgroundColor: '#F4F2EC' }}>
      <StatusBar style="light" />
      <View style={{ backgroundColor: '#1B3A6B', paddingTop: insets.top + 8, paddingBottom: 12, paddingHorizontal: 16 }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
          <Pressable onPress={() => router.back()} hitSlop={8}>
            <Text style={{ color: '#fff', fontSize: 18 }}>‹</Text>
          </Pressable>
          <Text style={{ color: '#fff', fontSize: 17, fontWeight: '700' }}>🧩 私属门客</Text>
        </View>
        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 4 }}>
          <Text style={{ color: '#a9bdd6', fontSize: 11 }}>
            个人资金 {Math.round(save?.silver ?? 0)} · 人脉 {Math.round(save?.connections ?? 0)} · 派系贡献 {save?.factionContribution ?? 0}
          </Text>
          <Pressable onPress={() => router.push('/(app)/personal-wealth' as never)} style={{ backgroundColor: 'rgba(255,255,255,0.15)', paddingHorizontal: 6, paddingVertical: 2, borderRadius: 2 }}>
            <Text style={{ color: '#fff', fontSize: 10 }}>💰 调拨资金 ›</Text>
          </Pressable>
        </View>
      </View>

      {/* Tab */}
      <View style={{ flexDirection: 'row', backgroundColor: '#fff', borderBottomWidth: 1, borderBottomColor: '#E5E2DC' }}>
        {[{ k: 'retainers', t: '私属门客' }, { k: 'mentor', t: '师徒制' }, { k: 'recommend', t: '举荐入仕' }].map(x => (
          <Pressable key={x.k} onPress={() => { setTab(x.k as typeof tab); setMsg(''); }}
            style={{ flex: 1, paddingVertical: 12, alignItems: 'center', borderBottomWidth: 2, borderBottomColor: tab === x.k ? '#C8161D' : 'transparent' }}>
            <Text style={{ fontSize: 12, fontWeight: tab === x.k ? '700' : '400', color: tab === x.k ? '#1B3A6B' : '#888' }}>{x.t}</Text>
          </Pressable>
        ))}
      </View>

      {loading ? (
        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}><ActivityIndicator /></View>
      ) : tab === 'retainers' ? (
        <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: insets.bottom + 24 }}>
          {/* 招募 */}
          <Text style={{ fontSize: 13, fontWeight: '700', color: '#1B3A6B', marginBottom: 8 }}>招募私属（不占编制）</Text>
          {RETAINER_TYPES.map(type => {
            const cfg = RETAINER_CONFIG[type];
            const silverOk = !cfg.req.silver || (save?.silver ?? 0) >= cfg.req.silver;
            const connOk = !cfg.req.connections || (save?.connections ?? 0) >= cfg.req.connections;
            const ok = silverOk && connOk;
            return (
              <Pressable key={type} onPress={() => void handleRecruit(type)} disabled={busy || !ok}
                style={{ borderWidth: 1, borderColor: ok ? '#1B3A6B' : '#DDD', backgroundColor: ok ? '#F0F4FA' : '#F5F5F5', padding: 12, marginBottom: 10, opacity: ok ? 1 : 0.6 }}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                  <Text style={{ fontSize: 20 }}>{cfg.icon}</Text>
                  <Text style={{ fontSize: 14, fontWeight: '700', color: '#1B3A6B', flex: 1 }}>{cfg.label}</Text>
                  {!ok && <Text style={{ fontSize: 10, color: '#C8161D' }}>资源不足</Text>}
                </View>
                <Text style={{ fontSize: 11, color: '#555', marginTop: 4 }}>{cfg.desc}</Text>
                <Text style={{ fontSize: 10, color: '#7A5C00', marginTop: 2 }}>效果：{cfg.effect} · 需{cfg.req.silver ? `个人资金${cfg.req.silver}` : ''}{cfg.req.silver && cfg.req.connections ? ' ' : ''}{cfg.req.connections ? `人脉${cfg.req.connections}` : ''}</Text>
              </Pressable>
            );
          })}

          {/* 已招募 */}
          <Text style={{ fontSize: 13, fontWeight: '700', color: '#1B3A6B', marginTop: 12, marginBottom: 8 }}>已招募（{list.length}）</Text>
          {list.length === 0 ? (
            <Text style={{ fontSize: 11, color: '#999' }}>尚未招募任何私属</Text>
          ) : (
            list.map(r => (
              <View key={r.id} style={{ backgroundColor: '#fff', borderWidth: 1, borderColor: '#D1D1D1', padding: 10, marginBottom: 8 }}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                  <View style={{ width: 36, height: 36, borderRadius: 18, backgroundColor: getAvatarBgColor(r.avatarId, 'neutral'), alignItems: 'center', justifyContent: 'center' }}>
                    <Text style={{ fontSize: 18 }}>{getSubAvatarEmoji(r.avatarId, '男')}</Text>
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={{ fontSize: 13, fontWeight: '700', color: '#222' }}>{r.name}</Text>
                    <Text style={{ fontSize: 10, color: '#7A5C00' }}>{RETAINER_CONFIG[r.type].label} · {r.bonus}</Text>
                  </View>
                  <Text style={{ fontSize: 11, color: loyaltyColor(r.loyalty), fontWeight: '700' }}>忠诚{Math.round(r.loyalty)}</Text>
                </View>
                <View style={{ height: 5, backgroundColor: '#E5E2DC', marginTop: 6, overflow: 'hidden' }}>
                  <View style={{ height: 5, width: `${Math.max(0, Math.min(100, r.loyalty))}%`, backgroundColor: loyaltyColor(r.loyalty) }} />
                </View>
                <Pressable onPress={() => void handleReward(r.id)} disabled={busy || (save?.silver ?? 0) < 50}
                  style={{ marginTop: 8, paddingHorizontal: 10, paddingVertical: 6, backgroundColor: (save?.silver ?? 0) < 50 ? '#CCC' : '#7A5C00', alignSelf: 'flex-start' }}>
                  <Text style={{ fontSize: 11, color: '#fff' }}>💰 赏个人资金(50)</Text>
                </Pressable>
              </View>
            ))
          )}
          {busy && <ActivityIndicator style={{ marginTop: 8 }} />}
          {msg ? <Text style={{ fontSize: 11, color: '#C8161D', marginTop: 8 }}>{msg}</Text> : null}
        </ScrollView>
      ) : tab === 'mentor' ? (
        <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: insets.bottom + 24 }}>
          <Text style={{ fontSize: 12, color: '#555', marginBottom: 12 }}>师徒制：高阶下属（能力≥60）带新人（能力&lt;40），徒弟能力成长 +20%。</Text>
          <Text style={{ fontSize: 13, fontWeight: '700', color: '#1B3A6B', marginBottom: 8 }}>选择师傅（能力≥60）</Text>
          {mentors.length === 0 ? <Text style={{ fontSize: 11, color: '#999' }}>暂无能力≥60的下属可担任师傅</Text> : mentors.map(s => (
            <Pressable key={s.id} onPress={() => { setMentorPick(s); setApprentice(null); setMsg(''); }}
              style={{ borderWidth: 1, borderColor: mentorPick?.id === s.id ? '#C8161D' : '#D1D1D1', backgroundColor: mentorPick?.id === s.id ? '#fff0f0' : '#fff', padding: 10, marginBottom: 8 }}>
              <Text style={{ fontSize: 12, fontWeight: '700', color: '#222' }}>{s.name} · 能力{s.ability}</Text>
            </Pressable>
          ))}
          {mentorPick && (
            <>
              <Text style={{ fontSize: 13, fontWeight: '700', color: '#1B3A6B', marginTop: 8, marginBottom: 8 }}>选择徒弟（能力&lt;40，无师傅）</Text>
              {apprentices.length === 0 ? <Text style={{ fontSize: 11, color: '#999' }}>暂无符合条件的徒弟</Text> : apprentices.map(s => (
                <Pressable key={s.id} onPress={() => { setApprentice(s); setMsg(''); }}
                  style={{ borderWidth: 1, borderColor: apprentice?.id === s.id ? '#C8161D' : '#D1D1D1', backgroundColor: apprentice?.id === s.id ? '#fff0f0' : '#fff', padding: 10, marginBottom: 8 }}>
                  <Text style={{ fontSize: 12, fontWeight: '700', color: '#222' }}>{s.name} · 能力{s.ability}</Text>
                </Pressable>
              ))}
              {apprentice && (
                <Pressable onPress={() => void handleSetMentor()} disabled={busy}
                  style={{ backgroundColor: '#1B3A6B', paddingVertical: 12, alignItems: 'center', marginTop: 8 }}>
                  <Text style={{ color: '#fff', fontSize: 13, fontWeight: '700' }}>建立师徒关系</Text>
                </Pressable>
              )}
            </>
          )}
          {busy && <ActivityIndicator style={{ marginTop: 8 }} />}
          {msg ? <Text style={{ fontSize: 11, color: '#2a7a3b', marginTop: 8 }}>{msg}</Text> : null}
        </ScrollView>
      ) : (
        <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: insets.bottom + 24 }}>
          <Text style={{ fontSize: 12, color: '#555', marginBottom: 12 }}>举荐入仕：须过 年龄≥18 + 编制&lt;145 + 派系贡献≥50 全套校验，不豁免。</Text>
          {candidates.length === 0 ? (
            <Text style={{ fontSize: 11, color: '#999' }}>暂无可举荐的候选人（需先在组织部招募候选人）</Text>
          ) : candidates.map(c => (
            <View key={c.id} style={{ backgroundColor: '#fff', borderWidth: 1, borderColor: '#D1D1D1', padding: 10, marginBottom: 8 }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                <Text style={{ fontSize: 13, fontWeight: '700', color: '#222', flex: 1 }}>{c.name}</Text>
                <Text style={{ fontSize: 10, color: '#888' }}>能力{c.ability}</Text>
              </View>
              <Pressable onPress={() => void handleRecommend(c.id)} disabled={busy}
                style={{ marginTop: 8, paddingHorizontal: 10, paddingVertical: 7, backgroundColor: '#C8161D', alignSelf: 'flex-start' }}>
                <Text style={{ color: '#fff', fontSize: 11 }}>🏛️ 举荐入仕（消耗100贡献）</Text>
              </Pressable>
            </View>
          ))}
          {busy && <ActivityIndicator style={{ marginTop: 8 }} />}
          {msg ? <Text style={{ fontSize: 11, color: '#C8161D', marginTop: 8 }}>{msg}</Text> : null}
        </ScrollView>
      )}
    </View>
  );
}