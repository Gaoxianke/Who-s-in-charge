// 位置棋盘组件（派系晋升联动 §一.3）
// 席位网格按 holderFaction 着色、枢纽席位★、玩家目标席位虚线环、
// 顶部派系控制度进度条 + 两种获证方法状态、底部四宫格结局实时提示
import { useMemo, useState } from 'react';
import { Modal, Pressable, ScrollView, Text, View } from 'react-native';
import {
  ALL_FACTIONS,
  FACTION_COLOR,
  FACTION_LABEL,
  FACTION_SHORT,
  type FactionId,
  type PlayerSave,
  type PositionSeat,
} from '@/types/game';
import { computeFactionControl, countFactionSeats, controlsHub, getHubSeats } from '@/lib/positionBoard';

interface Props {
  visible: boolean;
  onClose: () => void;
  save: PlayerSave;
  /** 玩家当前发起争夺的目标席位 key（若有） */
  targetSeatKey?: string | null;
}

const WIN_THRESHOLD = 0.5;

export function PositionBoard({ visible, onClose, save, targetSeatKey }: Props) {
  const [expandedTier, setExpandedTier] = useState<string | null>(null);
  const primary = save.primaryFaction as FactionId | '';
  const seats: PositionSeat[] = save.boardSeats ?? [];

  // 席位统计（useMemo 避免重复计算）
  const stats = useMemo(() => {
    const counts = countFactionSeats(seats);
    const total = seats.length;
    const controls: Record<string, number> = {};
    for (const f of ALL_FACTIONS) {
      controls[f] = computeFactionControl(seats, f);
    }
    return { counts, total, controls };
  }, [seats]);

  const myControl     = primary ? stats.controls[primary] ?? 0 : 0;
  const myHub         = primary ? controlsHub(seats, primary as FactionId) : false;
  const hubSeats      = getHubSeats(seats);

  // 玩家个人职务胜负状态
  const contest = save.promotionContest;
  const playerWin = contest ? contest.sYou >= contest.sOpp : false;

  // 派系整体胜（过半 OR 攻克枢纽）
  const factionWin = myControl >= WIN_THRESHOLD || myHub;

  // 按 tier 分组席位
  const grouped = useMemo(() => {
    const map = new Map<string, PositionSeat[]>();
    for (const s of seats) {
      const arr = map.get(s.tier) ?? [];
      arr.push(s);
      map.set(s.tier, arr);
    }
    return Array.from(map.entries()).sort((a, b) => b[1].length - a[1].length);
  }, [seats]);

  if (!visible) return null;

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.4)' }}>
        <View style={{ flex: 1, backgroundColor: '#F4F3F0', marginTop: 50, borderTopLeftRadius: 12, borderTopRightRadius: 12, overflow: 'hidden' }}>

          {/* 标题栏 */}
          <View style={{ backgroundColor: '#1D3A5C', padding: 14, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
            <View>
              <Text style={{ color: '#8eb4d8', fontSize: 9, letterSpacing: 2 }}>POSITION BOARD · 位置棋盘</Text>
              <Text style={{ color: '#fff', fontSize: 16, fontWeight: '700' }}>派系席位控制图</Text>
            </View>
            <Pressable onPress={onClose} style={{ padding: 6 }}>
              <Text style={{ color: '#8eb4d8', fontSize: 20 }}>✕</Text>
            </Pressable>
          </View>

          <ScrollView contentContainerStyle={{ padding: 12, paddingBottom: 40 }} showsVerticalScrollIndicator={false}>

            {/* ── 顶部：派系控制度进度条 ───────────────────── */}
            <View style={{ backgroundColor: '#fff', borderWidth: 1, borderColor: '#D9D9D9', padding: 12, marginBottom: 10 }}>
              <Text style={{ fontSize: 11, fontWeight: '700', color: '#1D3B5E', letterSpacing: 1, marginBottom: 10 }}>
                本派控制度（{primary ? FACTION_SHORT[primary as FactionId] : '无主派'}）
              </Text>
              <View style={{ height: 14, backgroundColor: '#E5E5E5', borderRadius: 7, overflow: 'hidden' }}>
                <View style={{ height: 14, width: `${Math.min(100, myControl * 100)}%`, backgroundColor: primary ? FACTION_COLOR[primary as FactionId] : '#888' }} />
              </View>
              <Text style={{ fontSize: 10, color: '#666', marginTop: 6 }}>
                {(myControl * 100).toFixed(1)}% · 过半线 50% · 枢纽席位 {myHub ? '✅ 已攻克' : '❌ 未攻克'}
              </Text>

              {/* 两种获证方法状态 */}
              <View style={{ flexDirection: 'row', gap: 8, marginTop: 8 }}>
                <View style={{ flex: 1, backgroundColor: myControl >= WIN_THRESHOLD ? '#E8F5E9' : '#F8F8F8', borderWidth: 1, borderColor: myControl >= WIN_THRESHOLD ? '#A5D6A7' : '#DDD', padding: 8 }}>
                  <Text style={{ fontSize: 10, fontWeight: '700', color: myControl >= WIN_THRESHOLD ? '#2E7D32' : '#888' }}>
                    {myControl >= WIN_THRESHOLD ? '✅ 方法一：控制度过半' : '⬜ 方法一：控制度过半'}
                  </Text>
                  <Text style={{ fontSize: 9, color: '#999', marginTop: 2 }}>席位控制率 ≥ 50%</Text>
                </View>
                <View style={{ flex: 1, backgroundColor: myHub ? '#E8F5E9' : '#F8F8F8', borderWidth: 1, borderColor: myHub ? '#A5D6A7' : '#DDD', padding: 8 }}>
                  <Text style={{ fontSize: 10, fontWeight: '700', color: myHub ? '#2E7D32' : '#888' }}>
                    {myHub ? '✅ 方法二：攻克枢纽' : '⬜ 方法二：攻克枢纽'}
                  </Text>
                  <Text style={{ fontSize: 9, color: '#999', marginTop: 2 }}>拿下最高 tier 枢纽席位</Text>
                </View>
              </View>
            </View>

            {/* ── 各派系控制度一览 ───────────────────────── */}
            <View style={{ backgroundColor: '#fff', borderWidth: 1, borderColor: '#D9D9D9', padding: 12, marginBottom: 10 }}>
              <Text style={{ fontSize: 11, fontWeight: '700', color: '#1D3B5E', letterSpacing: 1, marginBottom: 8 }}>
                五派席位分布（总 {stats.total} 席）
              </Text>
              {ALL_FACTIONS.map(f => {
                const ctrl = stats.controls[f] ?? 0;
                const isPrimary = f === primary;
                return (
                  <View key={f} style={{ flexDirection: 'row', alignItems: 'center', gap: 8, paddingVertical: 4 }}>
                    <View style={{ width: 10, height: 10, borderRadius: 5, backgroundColor: FACTION_COLOR[f] }} />
                    <Text style={{ flex: 1, fontSize: 11, color: '#333' }}>
                      {FACTION_LABEL[f]}{isPrimary ? '（主派）' : ''}
                    </Text>
                    <Text style={{ fontSize: 10, color: '#666', width: 36 }}>{stats.counts[f]} 席</Text>
                    <View style={{ width: 80, height: 6, backgroundColor: '#E5E5E5', borderRadius: 3, overflow: 'hidden' }}>
                      <View style={{ height: 6, width: `${ctrl * 100}%`, backgroundColor: FACTION_COLOR[f] }} />
                    </View>
                    <Text style={{ fontSize: 9, color: '#999', width: 32, textAlign: 'right' }}>{(ctrl * 100).toFixed(0)}%</Text>
                  </View>
                );
              })}
            </View>

            {/* ── 枢纽席位列表 ───────────────────────────── */}
            {hubSeats.length > 0 && (
              <View style={{ backgroundColor: '#FFFBF0', borderWidth: 1, borderColor: '#E8D9B0', padding: 12, marginBottom: 10 }}>
                <Text style={{ fontSize: 11, fontWeight: '700', color: '#B8860B', letterSpacing: 1, marginBottom: 6 }}>★ 枢纽席位（最高 tier）</Text>
                {hubSeats.slice(0, 6).map(s => (
                  <View key={s.key} style={{ flexDirection: 'row', alignItems: 'center', gap: 6, paddingVertical: 3 }}>
                    <Text style={{ color: '#B8860B', fontSize: 12 }}>★</Text>
                    <Text style={{ flex: 1, fontSize: 11, color: '#333' }}>{s.title}</Text>
                    <Text style={{ fontSize: 9, color: s.holderFaction ? FACTION_COLOR[s.holderFaction] : '#999', fontWeight: '600' }}>
                      {s.holderFaction ? FACTION_SHORT[s.holderFaction] : '空缺'}
                    </Text>
                  </View>
                ))}
              </View>
            )}

            {/* ── 席位网格（按 tier 折叠展开）────────────── */}
            {grouped.map(([tier, tierSeats]) => {
              const expanded = expandedTier === tier;
              const shown = expanded ? tierSeats : tierSeats.slice(0, 4);
              return (
                <View key={tier} style={{ backgroundColor: '#fff', borderWidth: 1, borderColor: '#D9D9D9', padding: 12, marginBottom: 10 }}>
                  <Pressable onPress={() => setExpandedTier(expanded ? null : tier)} style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                    <Text style={{ fontSize: 11, fontWeight: '700', color: '#1D3B5E' }}>
                      {tier}（{tierSeats.length} 席）
                    </Text>
                    <Text style={{ fontSize: 10, color: '#888' }}>{expanded ? '收起 ▲' : `展开 ▼`}</Text>
                  </Pressable>
                  <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6 }}>
                    {shown.map(s => renderSeatCell(s, targetSeatKey, primary))}
                  </View>
                </View>
              );
            })}

            {/* ── 底部四宫格结局提示 ─────────────────────── */}
            <View style={{ backgroundColor: '#fff', borderWidth: 1, borderColor: '#D9D9D9', padding: 12, marginBottom: 10 }}>
              <Text style={{ fontSize: 11, fontWeight: '700', color: '#1D3B5E', letterSpacing: 1, marginBottom: 10 }}>
                四宫格结局实时提示（派系胜负 × 玩家职务胜负）
              </Text>
              <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
                {renderOutcomeCell({
                  title: '双胜',
                  desc: '派系胜 × 玩家胜',
                  detail: '最优结局：职位到手，派系也主导风口',
                  active: factionWin && playerWin,
                  color: '#2E7D32', bg: '#E8F5E9', border: '#A5D6A7',
                })}
                {renderOutcomeCell({
                  title: '派胜·职负',
                  desc: '派系胜 × 玩家负',
                  detail: '"那没事"：派系整体得势，个人职位之争失利无碍大局',
                  active: factionWin && !playerWin,
                  color: '#1565C0', bg: '#E3F2FD', border: '#90CAF9',
                })}
                {renderOutcomeCell({
                  title: '派负·职胜',
                  desc: '派系负 × 玩家胜',
                  detail: '"仍受罚"：个人虽赢得职位，但派系整体败仍要接受惩罚',
                  active: !factionWin && playerWin,
                  color: '#E65100', bg: '#FFF3E0', border: '#FFCC80',
                })}
                {renderOutcomeCell({
                  title: '双负',
                  desc: '派系负 × 玩家负',
                  detail: '"最糟"：职位与派系双双失利，受失势惩罚',
                  active: !factionWin && !playerWin,
                  color: '#C62828', bg: '#FFEBEE', border: '#EF9A9A',
                })}
              </View>
            </View>

          </ScrollView>
        </View>
      </View>
    </Modal>
  );
}

/** 渲染单个席位格子 */
function renderSeatCell(
  seat: PositionSeat,
  targetSeatKey: string | null | undefined,
  primary: FactionId | '',
): React.ReactNode {
  const isTarget = seat.key === targetSeatKey;
  const holderColor = seat.holderFaction ? FACTION_COLOR[seat.holderFaction] : '#999';
  const isMine = seat.holderFaction && seat.holderFaction === primary;

  return (
    <View
      key={seat.key}
      style={{
        width: '31%',
        backgroundColor: seat.holderFaction ? `${holderColor}18` : '#F8F8F8',
        borderWidth: isTarget ? 2 : 1,
        borderColor: isTarget ? '#C82829' : seat.holderFaction ? `${holderColor}80` : '#DDD',
        borderStyle: isTarget ? 'dashed' : 'solid',
        borderRadius: 4,
        padding: 6,
        minHeight: 44,
        justifyContent: 'center',
      }}
    >
      <Text style={{ fontSize: 9, color: '#999', lineHeight: 12 }}>{seat.organ}</Text>
      <Text style={{ fontSize: 10, fontWeight: '700', color: '#333', lineHeight: 13 }} numberOfLines={1}>
        {seat.isHub ? '★ ' : ''}{seat.title}
      </Text>
      <Text style={{ fontSize: 9, color: holderColor, fontWeight: '600', marginTop: 2 }}>
        {seat.holderFaction ? FACTION_SHORT[seat.holderFaction] : '空缺'}{isMine ? '·本派' : ''}
      </Text>
    </View>
  );
}

/** 渲染四宫格结局单元 */
function renderOutcomeCell(props: {
  title: string; desc: string; detail: string;
  active: boolean; color: string; bg: string; border: string;
}): React.ReactNode {
  return (
    <View
      style={{
        width: '48%',
        backgroundColor: props.active ? props.bg : '#F8F8F8',
        borderWidth: props.active ? 2 : 1,
        borderColor: props.active ? props.border : '#DDD',
        borderRadius: 4,
        padding: 10,
        minHeight: 80,
      }}
    >
      <Text style={{ fontSize: 11, fontWeight: '700', color: props.active ? props.color : '#888' }}>
        {props.active ? '▶ ' : ''}{props.title}
      </Text>
      <Text style={{ fontSize: 9, color: '#999', marginTop: 2 }}>{props.desc}</Text>
      <Text style={{ fontSize: 9, color: props.active ? props.color : '#AAA', marginTop: 4, lineHeight: 13 }}>
        {props.detail}
      </Text>
    </View>
  );
}
