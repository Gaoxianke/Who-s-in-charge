// 排行榜页面 —— 日榜(当日增量) / 最高榜(永久累计) × 4维度 × 3口径
import { useCallback, useState } from 'react';
import { ActivityIndicator, Modal, Pressable, ScrollView, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { useRouter } from 'expo-router';
import { useFocusEffect } from 'expo-router';
import { Trophy, Medal, Crown, User, RefreshCw, ArrowRightLeft, Info } from 'lucide-react-native';
import { useGame } from '@/ctx/GameContext';
import {
  getLeaderboard,
  setLeaderboardSave,
  getPlayerProfile,
  claimMilestone,
} from '@/db/gameApi';
import type {
  LeaderboardMetric,
  LeaderboardBoard,
  LeaderboardScope,
  LeaderboardMilestone,
  LeaderboardEntry,
  PlayerProfile,
} from '@/types/game';
import { FACTION_LABEL, type FactionId } from '@/types/game';

const METRICS: { key: LeaderboardMetric; label: string }[] = [
  { key: 'merit', label: '政绩' },
  { key: 'contribution', label: '贡献' },
  { key: 'rank', label: '官职' },
  { key: 'power', label: '综合' },
];
const SCOPES: { key: LeaderboardScope; label: string }[] = [
  { key: 'region', label: '大区' },
  { key: 'server', label: '全服' },
  { key: 'faction', label: '派系' },
];
const BOARDS: { key: LeaderboardBoard; label: string }[] = [
  { key: 'daily', label: '日榜' },
  { key: 'alltime', label: '最高榜' },
];

const PODIUM_COLORS = ['#C8A84B', '#B8B8B8', '#A06A3A'];

export default function RankingScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { save } = useGame();

  const [board, setBoard] = useState<LeaderboardBoard>('daily');
  const [metric, setMetric] = useState<LeaderboardMetric>('power');
  const [scope, setScope] = useState<LeaderboardScope>('region');

  const [result, setResult] = useState<{ entries: LeaderboardEntry[]; myRank: number | null; myScore: number; prevGap: number | null; total: number } | null>(null);
  const [loading, setLoading] = useState(false);
  const [profile, setProfile] = useState<PlayerProfile | null>(null);

  const [detailEntry, setDetailEntry] = useState<LeaderboardEntry | null>(null);
  const [switchMsg, setSwitchMsg] = useState<{ msg: string; ok: boolean } | null>(null);
  const [switchBusy, setSwitchBusy] = useState(false);
  const [milestoneMsg, setMilestoneMsg] = useState<{ msg: string; ok: boolean } | null>(null);
  const [milestoneBusy, setMilestoneBusy] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!save) return;
    setLoading(true);
    const [lb, pf] = await Promise.all([
      getLeaderboard({ board, metric, scope }),
      getPlayerProfile(save.userId),
    ]);
    setResult(lb);
    setProfile(pf);
    setLoading(false);
  }, [save, board, metric, scope]);

  useFocusEffect(
    useCallback(() => {
      void load();
    }, [load]),
  );

  const handleSwitchSave = async () => {
    if (!save || switchBusy) return;
    setSwitchBusy(true);
    const res = await setLeaderboardSave(save.id);
    if (res.success) {
      setSwitchMsg({ msg: '✅ 已将当前存档设为上榜存档', ok: true });
      await load();
    } else {
      setSwitchMsg({ msg: `⚠️ ${res.error ?? '更换失败'}`, ok: false });
    }
    setSwitchBusy(false);
    setTimeout(() => setSwitchMsg(null), 3000);
  };

  const handleClaim = async (m: LeaderboardMilestone) => {
    if (milestoneBusy) return;
    setMilestoneBusy(m);
    const res = await claimMilestone(m);
    if (res.success) {
      const extra = res.extra ? `（${res.extra}）` : '';
      setMilestoneMsg({ msg: `🎉 领取成功：声望+${res.influence} 个人资金+${res.silver}${extra}`, ok: true });
      await load();
    } else if (res.alreadyClaimed) {
      setMilestoneMsg({ msg: '⚠️ 该里程碑奖励已领取', ok: false });
    } else {
      setMilestoneMsg({ msg: `⚠️ ${res.error ?? '领取失败'}`, ok: false });
    }
    setMilestoneBusy(null);
    setTimeout(() => setMilestoneMsg(null), 3500);
  };

  const entries = result?.entries ?? [];
  const podium = entries.slice(0, 3);
  const rest = entries.slice(3);
  const myRank = result?.myRank ?? null;

  return (
    <View style={{ flex: 1, backgroundColor: '#F4F2EC' }}>
      <StatusBar style="light" backgroundColor="#0D1B2A" />
      {/* 顶部标题栏 */}
      <View style={{ backgroundColor: '#0D1B2A', paddingTop: insets.top + 8, paddingBottom: 10, paddingHorizontal: 12 }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
            <Trophy size={20} color="#C8A84B" />
            <Text style={{ color: '#F5E6C8', fontSize: 18, fontWeight: '800', letterSpacing: 2 }}>排行榜</Text>
          </View>
          <Pressable onPress={() => void load()} style={{ flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: 'rgba(255,255,255,0.1)', paddingHorizontal: 8, paddingVertical: 4 }}>
            <RefreshCw size={12} color="#C8A84B" />
            <Text style={{ color: '#C8A84B', fontSize: 11 }}>刷新</Text>
          </Pressable>
        </View>
      </View>

      {/* 榜单类型切换 */}
      <View style={{ flexDirection: 'row', backgroundColor: '#16314F' }}>
        {BOARDS.map((b) => (
          <Pressable
            key={b.key}
            onPress={() => setBoard(b.key)}
            style={{ flex: 1, paddingVertical: 8, alignItems: 'center', borderBottomWidth: board === b.key ? 2 : 0, borderBottomColor: '#C8A84B' }}
          >
            <Text style={{ color: board === b.key ? '#F5E6C8' : '#7E97AE', fontSize: 13, fontWeight: board === b.key ? '700' : '400' }}>
              {b.label}
            </Text>
          </Pressable>
        ))}
      </View>

      {/* 维度 + 口径切换 */}
      <View style={{ backgroundColor: '#fff', paddingHorizontal: 10, paddingVertical: 8, gap: 8 }}>
        <View style={{ flexDirection: 'row', gap: 6 }}>
          {METRICS.map((m) => (
            <Pressable
              key={m.key}
              onPress={() => setMetric(m.key)}
              style={{
                flex: 1, alignItems: 'center', paddingVertical: 6,
                backgroundColor: metric === m.key ? '#0D1B2A' : '#EEEBE3',
                borderRadius: 2,
              }}
            >
              <Text style={{ color: metric === m.key ? '#F5E6C8' : '#555', fontSize: 12, fontWeight: '600' }}>{m.label}</Text>
            </Pressable>
          ))}
        </View>
        <View style={{ flexDirection: 'row', gap: 6 }}>
          {SCOPES.map((s) => (
            <Pressable
              key={s.key}
              onPress={() => setScope(s.key)}
              style={{
                flex: 1, alignItems: 'center', paddingVertical: 5,
                backgroundColor: scope === s.key ? '#C8A84B' : '#EEEBE3',
                borderRadius: 2,
              }}
            >
              <Text style={{ color: scope === s.key ? '#3A2A00' : '#555', fontSize: 11, fontWeight: '600' }}>{s.label}</Text>
            </Pressable>
          ))}
        </View>
      </View>

      {/* 上榜存档状态条 */}
      <View style={{ backgroundColor: '#FCF9F2', borderBottomWidth: 1, borderBottomColor: '#E8DFD0', paddingHorizontal: 12, paddingVertical: 8, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
        <View style={{ flex: 1 }}>
          <Text style={{ fontSize: 10, color: '#7A5C00' }}>
            上榜存档：{profile?.leaderboardSaveId === save?.id ? '当前存档 ✅' : profile?.leaderboardSaveId ? '其他存档' : '未设置'}
          </Text>
          <Text style={{ fontSize: 9, color: '#8A6E20', marginTop: 1 }}>每5年周期仅可更换一次上榜存档</Text>
        </View>
        <Pressable
          onPress={handleSwitchSave}
          disabled={switchBusy}
          style={{ flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: '#7A5C00', paddingHorizontal: 10, paddingVertical: 6, borderRadius: 2 }}
        >
          <ArrowRightLeft size={12} color="#fff" />
          <Text style={{ color: '#fff', fontSize: 11, fontWeight: '700' }}>设为上榜存档</Text>
        </Pressable>
      </View>

      {switchMsg && (
        <View style={{ backgroundColor: switchMsg.ok ? '#EAF7EC' : '#FDECEC', paddingHorizontal: 12, paddingVertical: 6 }}>
          <Text style={{ fontSize: 11, color: switchMsg.ok ? '#2a7a3b' : '#C82829' }}>{switchMsg.msg}</Text>
        </View>
      )}
      {milestoneMsg && (
        <View style={{ backgroundColor: milestoneMsg.ok ? '#EAF7EC' : '#FDECEC', paddingHorizontal: 12, paddingVertical: 6 }}>
          <Text style={{ fontSize: 11, color: milestoneMsg.ok ? '#2a7a3b' : '#C82829' }}>{milestoneMsg.msg}</Text>
        </View>
      )}

      {/* 列表 */}
      {loading ? (
        <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
          <ActivityIndicator color="#0D1B2A" />
        </View>
      ) : (
        <ScrollView contentContainerStyle={{ paddingBottom: insets.bottom + 24, paddingTop: 8 }}>
          {/* 领奖台 */}
          {podium.length > 0 && (
            <View style={{ flexDirection: 'row', alignItems: 'flex-end', justifyContent: 'center', gap: 8, paddingHorizontal: 12, marginBottom: 12 }}>
              {[1, 0, 2].map((idx) => {
                const e = podium[idx];
                if (!e) return <View key={idx} style={{ flex: 1 }} />;
                const isTop1 = e.rank === 1;
                const height = isTop1 ? 92 : 70;
                const Icon = e.rank === 1 ? Crown : e.rank === 2 ? Medal : Trophy;
                return (
                  <Pressable key={e.saveId} onPress={() => setDetailEntry(e)} style={{ flex: 1 }}>
                    <View style={{ alignItems: 'center' }}>
                      <View style={{ width: 44, height: 44, borderRadius: 22, backgroundColor: PODIUM_COLORS[e.rank - 1], justifyContent: 'center', alignItems: 'center', marginBottom: 4 }}>
                        <Icon size={20} color="#fff" />
                      </View>
                      <Text numberOfLines={1} style={{ fontSize: 11, fontWeight: '700', color: e.isMe ? '#0D5C2E' : '#222' }}>{e.playerName}</Text>
                      <Text style={{ fontSize: 10, color: PODIUM_COLORS[e.rank - 1], fontWeight: '700' }}>{fmtScore(e.score)}</Text>
                    </View>
                    <View style={{ height, backgroundColor: PODIUM_COLORS[e.rank - 1], marginTop: 6, justifyContent: 'center', alignItems: 'center', borderRadius: 2 }}>
                      <Text style={{ color: '#fff', fontSize: 20, fontWeight: '900' }}>{e.rank}</Text>
                    </View>
                  </Pressable>
                );
              })}
            </View>
          )}

          {/* 其余列表 */}
          {rest.map((e) => (
            <Pressable
              key={e.saveId}
              onPress={() => setDetailEntry(e)}
              style={{
                flexDirection: 'row', alignItems: 'center', marginHorizontal: 10, marginBottom: 4, padding: 10,
                backgroundColor: e.isMe ? '#FFF7E0' : '#fff',
                borderLeftWidth: e.isMe ? 3 : 0, borderLeftColor: '#C8A84B',
                borderWidth: 1, borderColor: '#E5E1D8',
              }}
            >
              <Text style={{ width: 34, textAlign: 'center', fontSize: 13, fontWeight: '700', color: '#888' }}>{e.rank}</Text>
              <View style={{ flex: 1 }}>
                <Text numberOfLines={1} style={{ fontSize: 13, fontWeight: '700', color: e.isMe ? '#0D5C2E' : '#222' }}>
                  {e.playerName}{e.isMe ? '（我）' : ''}
                </Text>
                <Text style={{ fontSize: 10, color: '#888' }}>{e.rankName} · {FACTION_LABEL[e.faction as FactionId] ?? '中立'}</Text>
              </View>
              <Text style={{ fontSize: 14, fontWeight: '800', color: '#0D1B2A', fontFamily: 'monospace' }}>{fmtScore(e.score)}</Text>
            </Pressable>
          ))}

          {/* 本人名次（若不在榜单内） */}
          {myRank && myRank > entries.length && (
            <View style={{ marginHorizontal: 10, marginTop: 8, padding: 10, backgroundColor: '#FFF7E0', borderWidth: 1, borderColor: '#C8A84B', flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
              <Text style={{ fontSize: 12, fontWeight: '700', color: '#7A5C00' }}>我的名次 第 {myRank} 名</Text>
              <Text style={{ fontSize: 12, fontWeight: '700', color: '#0D1B2A', fontFamily: 'monospace' }}>{fmtScore(result?.myScore ?? 0)}</Text>
            </View>
          )}

          {/* 与上一名差距 */}
          {result?.prevGap != null && result.prevGap > 0 && (
            <View style={{ marginHorizontal: 10, marginTop: 6, padding: 8, backgroundColor: '#F0F4F8', borderWidth: 1, borderColor: '#C9D6E2' }}>
              <Text style={{ fontSize: 11, color: '#3A5A78' }}>距上一名还差 <Text style={{ fontWeight: '700' }}>{fmtScore(result.prevGap)}</Text> 分</Text>
            </View>
          )}

          {/* 最高榜里程碑奖励 */}
          {board === 'alltime' && (
            <View style={{ marginHorizontal: 10, marginTop: 14, padding: 12, backgroundColor: '#0D1B2A', borderWidth: 1, borderColor: '#C8A84B' }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 8 }}>
                <Info size={14} color="#C8A84B" />
                <Text style={{ fontSize: 12, fontWeight: '700', color: '#F5E6C8' }}>最高榜里程碑奖励（达成即领，一次性）</Text>
              </View>
              {([
                { key: 'top10' as LeaderboardMilestone, label: '首次进前10', reward: '声望+20 / 个人资金+300', need: 10 },
                { key: 'top3' as LeaderboardMilestone, label: '首次进前3', reward: '声望+40 / 个人资金+800', need: 3 },
                { key: 'top1' as LeaderboardMilestone, label: '登顶第1', reward: '声望+80 / 个人资金+2000 + 破格加权', need: 1 },
              ]).map((m) => {
                const reached = myRank != null && myRank <= m.need;
                return (
                  <View key={m.key} style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: 6, borderTopWidth: 1, borderTopColor: 'rgba(255,255,255,0.1)' }}>
                    <View style={{ flex: 1 }}>
                      <Text style={{ fontSize: 11, color: reached ? '#F5E6C8' : '#7E97AE', fontWeight: '600' }}>{m.label}</Text>
                      <Text style={{ fontSize: 9, color: '#7E97AE' }}>{m.reward}</Text>
                    </View>
                    <Pressable
                      onPress={() => void handleClaim(m.key)}
                      disabled={!reached || milestoneBusy === m.key}
                      style={{ paddingHorizontal: 10, paddingVertical: 5, backgroundColor: reached ? '#C8A84B' : '#3A4A5A', borderRadius: 2 }}
                    >
                      <Text style={{ fontSize: 10, fontWeight: '700', color: reached ? '#3A2A00' : '#9FB0C0' }}>
                        {milestoneBusy === m.key ? '领取中' : reached ? '领取' : '未达成'}
                      </Text>
                    </Pressable>
                  </View>
                );
              })}
            </View>
          )}

          {entries.length === 0 && (
            <View style={{ alignItems: 'center', paddingVertical: 60 }}>
              <Trophy size={40} color="#C9C4B8" />
              <Text style={{ fontSize: 13, color: '#999', marginTop: 8 }}>暂无上榜数据，推进游戏获取政绩/贡献即可上榜</Text>
            </View>
          )}
        </ScrollView>
      )}

      {/* 对手简档弹窗 */}
      <Modal visible={!!detailEntry} transparent animationType="fade" onRequestClose={() => setDetailEntry(null)}>
        <Pressable style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', padding: 24 }} onPress={() => setDetailEntry(null)}>
          {detailEntry && (
            <View style={{ backgroundColor: '#fff', borderRadius: 4, padding: 16, borderWidth: 1, borderColor: '#C8A84B' }} onStartShouldSetResponder={() => true}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 12 }}>
                <View style={{ width: 40, height: 40, borderRadius: 20, backgroundColor: '#0D1B2A', justifyContent: 'center', alignItems: 'center' }}>
                  <User size={20} color="#C8A84B" />
                </View>
                <View>
                  <Text style={{ fontSize: 16, fontWeight: '800', color: '#222' }}>{detailEntry.playerName}</Text>
                  <Text style={{ fontSize: 11, color: '#888' }}>{detailEntry.rankName}</Text>
                </View>
              </View>
              <View style={{ flexDirection: 'row', gap: 12 }}>
                {[
                  { label: '排名', value: `第${detailEntry.rank}名` },
                  { label: '政绩', value: fmtScore(detailEntry.merit) },
                  { label: '贡献', value: fmtScore(detailEntry.contribution) },
                  { label: '门生', value: String(detailEntry.students) },
                ].map((it) => (
                  <View key={it.label} style={{ flex: 1 }}>
                    <Text style={{ fontSize: 9, color: '#aaa' }}>{it.label}</Text>
                    <Text style={{ fontSize: 13, fontWeight: '700', color: '#0D1B2A' }}>{it.value}</Text>
                  </View>
                ))}
              </View>
              <Text style={{ fontSize: 10, color: '#888', marginTop: 10 }}>
                派系：{FACTION_LABEL[detailEntry.faction as FactionId] ?? '中立'} · 声望 {detailEntry.factionInfluence}
              </Text>
              <Pressable onPress={() => setDetailEntry(null)} style={{ marginTop: 14, paddingVertical: 8, backgroundColor: '#0D1B2A', alignItems: 'center', borderRadius: 2 }}>
                <Text style={{ color: '#F5E6C8', fontSize: 12, fontWeight: '700' }}>关闭</Text>
              </Pressable>
            </View>
          )}
        </Pressable>
      </Modal>
    </View>
  );
}

function fmtScore(n: number): string {
  if (n >= 10000) return `${(n / 10000).toFixed(1)}w`;
  if (n >= 1000) return `${(n / 1000).toFixed(1)}k`;
  return String(Math.round(n));
}