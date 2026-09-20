// faction-map.tsx — 派系势力地图（§3.25 / §10.6）
// 主页独立分页：把五派从抽象关系投影成省级势力地图
import { useState, useCallback } from 'react';
import { Pressable, ScrollView, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { useRouter, useFocusEffect } from 'expo-router';
import { useGame } from '@/ctx/GameContext';
import { getSubordinates } from '@/db/gameApi';
import {
  FACTION_LABEL,
  FACTION_SHORT,
  FACTION_COLOR,
  ALL_FACTIONS,
  type FactionId,
  type Subordinate,
} from '@/types/game';
import { getDominantFaction, getLosingFaction, isCooldownActive, setCooldown } from '@/lib/factionSystem';

// §2.1 势力锚点：每个省的基础归属派系
interface ProvinceDef {
  id: string;
  name: string;
  base: FactionId;
  hub?: boolean; // 枢纽省（首都/经济中心/资源省）
}

const PROVINCES: ProvinceDef[] = [
  { id: 'bj',  name: '北京',   base: 'pragmatic', hub: true },
  { id: 'sh',  name: '上海',   base: 'reform',    hub: true },
  { id: 'gd',  name: '广东',   base: 'reform',    hub: true },
  { id: 'zj',  name: '浙江',   base: 'reform' },
  { id: 'fj',  name: '福建',   base: 'reform' },
  { id: 'js',  name: '江苏',   base: 'reform' },
  { id: 'sd',  name: '山东',   base: 'local',     hub: true },
  { id: 'sc',  name: '四川',   base: 'local' },
  { id: 'hb',  name: '湖北',   base: 'local' },
  { id: 'hn',  name: '河南',   base: 'local' },
  { id: 'ah',  name: '安徽',   base: 'local' },
  { id: 'jx',  name: '江西',   base: 'cyl' },
  { id: 'gx',  name: '广西',   base: 'cyl' },
  { id: 'gz',  name: '贵州',   base: 'cyl' },
  { id: 'yn',  name: '云南',   base: 'cyl' },
  { id: 'sc2', name: '陕西',   base: 'local' },
  { id: 'gs',  name: '甘肃',   base: 'cyl' },
  { id: 'nx',  name: '宁夏',   base: 'cyl' },
  { id: 'qh',  name: '青海',   base: 'cyl' },
  { id: 'xj',  name: '新疆',   base: 'local' },
  { id: 'xz',  name: '西藏',   base: 'local' },
  { id: 'nm',  name: '内蒙古', base: 'local' },
  { id: 'hlj', name: '黑龙江', base: 'pragmatic' },
  { id: 'jl',  name: '吉林',   base: 'pragmatic' },
  { id: 'ln',  name: '辽宁',   base: 'pragmatic' },
  { id: 'tj',  name: '天津',   base: 'pragmatic' },
  { id: 'he',  name: '河北',   base: 'pragmatic' },
  { id: 'cq',  name: '重庆',   base: 'local' },
  { id: 'hun', name: '湖南',   base: 'cyl' },
  { id: 'hub', name: '湖北2',  base: 'local' },
  { id: 'hi',  name: '海南',   base: 'reform' },
  { id: 'sn',  name: '山西',   base: 'local' },
];

const METRIC_HINT: Record<FactionId, string> = {
  reform:    'GDP / 招商引资',
  pragmatic: '稳定 / 治安',
  cyl:       '医疗 / 教育',
  techno:    'GDP / 数字治理',
  local:     '财政 / GDP',
};

const TAB_OPTIONS: Array<{ key: 'map' | 'treasury'; label: string }> = [
  { key: 'map', label: '势力地图' },
  { key: 'treasury', label: '经费池' },
];

const CITY_NAMES = ['中心城区', '东郊新区', '西部县域'];
const COUNTY_NAMES = ['一区', '二区', '三区'];

const clamp = (v: number, lo = 0, hi = 100) => Math.max(lo, Math.min(hi, v));

const vary = (base: Record<FactionId, number>, seed: number, amp: number): Record<FactionId, number> => {
  const out = {} as Record<FactionId, number>;
  for (const f of ALL_FACTIONS) {
    const v = base[f] + Math.round(((seed * 7 + f.length * 3) % (amp * 2 + 1)) - amp);
    out[f] = clamp(v);
  }
  return out;
};

export default function FactionMapScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { save, updateGameSave } = useGame();
  const [selected, setSelected] = useState<string | null>(null);
  const [drillCity, setDrillCity] = useState<number | null>(null);
  const [tab, setTab] = useState<'map' | 'treasury'>('map');
  const [subs, setSubs] = useState<Subordinate[]>([]);
  useFocusEffect(useCallback(() => {
    let active = true;
    if (!save) return () => { active = false; };
    (async () => {
      const list = await getSubordinates(save.id);
      if (active) setSubs(list);
    })();
    return () => { active = false; };
  }, [save?.id]));

  if (!save) return null;

  const primary = save.primaryFaction as FactionId | '';
  const wind = save.politicalWind ?? 'balanced';
  const dominant = save.dominantFaction as FactionId | null;
  const losing = getLosingFaction(wind);
  const regionControl = (save.regionControl ?? {}) as Record<string, Record<FactionId, number>>;
  const treasury = (save.factionTreasury ?? {}) as Record<FactionId, number>;
  const cd = save.factionCooldowns ?? {};

  const controlOf = (pid: string): Record<FactionId, number> => {
    if (regionControl[pid]) return regionControl[pid];
    // 默认：基础派 control 75，其余派 15
    const p = PROVINCES.find(x => x.id === pid);
    const base = p?.base ?? 'local';
    const map = {} as Record<FactionId, number>;
    for (const f of ALL_FACTIONS) map[f] = f === base ? 75 : 15;
    return map;
  };

  const ownerFromControl = (c: Record<FactionId, number>): FactionId => {
    let best: FactionId = 'local';
    let max = -1;
    for (const f of ALL_FACTIONS) { if (c[f] > max) { max = c[f]; best = f; } }
    return best;
  };

  const ownerOf = (pid: string): FactionId => ownerFromControl(controlOf(pid));
  const cityControl = (pid: string, ci: number) => vary(controlOf(pid), ci + 1, 12);
  const countyControl = (pid: string, ci: number, ki: number) => vary(cityControl(pid, ci), ci * 3 + ki + 1, 8);

  const sel = selected ? PROVINCES.find(p => p.id === selected) : null;
  const selControl = selected ? controlOf(selected) : null;
  const selOwner = selected ? ownerOf(selected) : null;

  const tOf = (f: FactionId): number => treasury[f] ?? (f === 'reform' ? 1200 : f === 'pragmatic' ? 1000 : f === 'techno' ? 900 : f === 'cyl' ? 700 : 800);

  const bumpProvince = async (pid: string, delta: number, cost: number) => {
    if (!primary || (save.meritPoints ?? 0) < cost) return;
    // v6：深耕操作加冷却，避免无限连点快速堆叠 control
    if (isCooldownActive(cd, `cultivate_${pid}`, save.gameDays)) return;
    const cur = controlOf(pid);
    const next = { ...cur, [primary]: clamp(cur[primary] + delta) };
    await updateGameSave({
      meritPoints: Math.max(0, (save.meritPoints ?? 0) - cost),
      regionControl: { ...regionControl, [pid]: next },
      factionCooldowns: setCooldown(cd, `cultivate_${pid}`, save.gameDays, 30),
    });
  };

  const doCultivate = async (pid: string) => {
    const p = PROVINCES.find(x => x.id === pid)!;
    const isMyProvince = p.base === primary;
    const cost = isMyProvince ? 500 : 1000;
    const delta = isMyProvince ? 10 : 8;
    await bumpProvince(pid, delta, cost);
  };

  const doCultivateCity = async (pid: string) => bumpProvince(pid, 6, 400);
  const doCultivateCounty = async (pid: string) => bumpProvince(pid, 4, 300);

  const doDonate = async () => {
    if (!primary || (save.fundBalance ?? 0) < 100000) return;
    if (isCooldownActive(cd, 'treasury_donate', save.gameDays)) return;
    // v6：账目留痕为概率事件（非每次必中），避免长期玩必落马
    const seed = save.gameDays;
    const rand = ((seed * 1664525 + 1013904223) >>> 0) / 0xffffffff;
    const flagged = rand < 0.4;
    await updateGameSave({
      fundBalance: Math.max(0, (save.fundBalance ?? 0) - 100000),
      factionTreasury: { ...treasury, [primary]: tOf(primary) + 500 },
      factionInfluence: clamp((save.factionInfluence ?? 0) + 3),
      purgeCount: flagged ? (save.purgeCount ?? 0) + 1 : (save.purgeCount ?? 0),
      factionCooldowns: setCooldown(cd, 'treasury_donate', save.gameDays, 30),
    });
  };

  return (
    <View style={{ flex: 1, backgroundColor: '#F4F3F0' }}>
      <StatusBar style="light" backgroundColor="#1D3A5C" />

      {/* 顶栏 */}
      <View style={{ backgroundColor: '#1D3A5C', paddingTop: insets.top + 6, paddingHorizontal: 14, paddingBottom: 10 }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
          <Pressable onPress={() => router.back()}><Text style={{ color: '#8eb4d8', fontSize: 22 }}>‹</Text></Pressable>
          <View style={{ flex: 1 }}>
            <Text style={{ color: '#8eb4d8', fontSize: 9, letterSpacing: 2 }}>FACTION POWER MAP</Text>
            <Text style={{ color: '#fff', fontSize: 15, fontWeight: '700' }}>派系势力地图</Text>
          </View>
          <Pressable onPress={() => router.push('/(app)/factions')} style={{ borderWidth: 1, borderColor: '#8eb4d8', paddingHorizontal: 8, paddingVertical: 4 }}>
            <Text style={{ color: '#8eb4d8', fontSize: 9 }}>派系总览 ›</Text>
          </Pressable>
        </View>
        {/* 风向横幅 */}
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 8 }}>
          <Text style={{ color: '#8eb4d8', fontSize: 10 }}>当前主流派：</Text>
          {dominant ? (
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
              <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: FACTION_COLOR[dominant] }} />
              <Text style={{ color: '#FFD700', fontSize: 11, fontWeight: '700' }}>{FACTION_LABEL[dominant]}</Text>
            </View>
          ) : <Text style={{ color: '#8eb4d8', fontSize: 11 }}>均势</Text>}
          {losing && <Text style={{ color: '#8eb4d8', fontSize: 10 }}>· 失势：{FACTION_LABEL[losing]}</Text>}
        </View>
      </View>

      {/* 分段切换 */}
      <View style={{ flexDirection: 'row', backgroundColor: '#fff', borderBottomWidth: 1, borderColor: '#E5E5E5' }}>
        {TAB_OPTIONS.map(t => (
          <Pressable key={t.key} onPress={() => { setTab(t.key); setDrillCity(null); }}
            style={{ flex: 1, paddingVertical: 11, alignItems: 'center', borderBottomWidth: tab === t.key ? 2 : 0, borderColor: '#1D3A5C' }}>
            <Text style={{ color: tab === t.key ? '#1D3A5C' : '#999', fontSize: 11, fontWeight: tab === t.key ? '700' : '400' }}>{t.label}</Text>
          </Pressable>
        ))}
      </View>

      {tab === 'map' && (
        <ScrollView contentContainerStyle={{ padding: 12, paddingBottom: insets.bottom + 24 }} showsVerticalScrollIndicator={false}>
          {/* 图例 */}
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginBottom: 12 }}>
            {ALL_FACTIONS.map(f => (
              <View key={f} style={{ flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: '#fff', paddingHorizontal: 6, paddingVertical: 3 }}>
                <View style={{ width: 8, height: 8, backgroundColor: FACTION_COLOR[f] }} />
                <Text style={{ color: '#555', fontSize: 9 }}>{FACTION_SHORT[f]}</Text>
              </View>
            ))}
          </View>

          {/* 省份网格 */}
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6 }}>
            {PROVINCES.map(p => {
              const owner = ownerOf(p.id);
              const isSel = selected === p.id;
              return (
                <Pressable key={p.id} onPress={() => { setSelected(isSel ? null : p.id); setDrillCity(null); }}
                  style={{ width: '30%', backgroundColor: FACTION_COLOR[owner], padding: 8, borderWidth: isSel ? 2 : 0, borderColor: '#FFD700', minHeight: 52, justifyContent: 'space-between' }}>
                  <Text style={{ color: '#fff', fontSize: 11, fontWeight: '700' }}>{p.name}{p.hub ? ' ★' : ''}</Text>
                  <Text style={{ color: 'rgba(255,255,255,0.7)', fontSize: 8 }}>{FACTION_SHORT[owner]}</Text>
                </Pressable>
              );
            })}
          </View>

          {/* 省份详情卡 */}
          {sel && selControl && selOwner && (
            <View style={{ backgroundColor: '#fff', borderTopWidth: 3, borderTopColor: FACTION_COLOR[selOwner], borderWidth: 1, borderColor: '#E5E5E5', marginTop: 14, padding: 12 }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
                <Text style={{ color: '#222', fontSize: 14, fontWeight: '700' }}>{sel.name}{sel.hub ? ' ★ 枢纽省' : ''}</Text>
                <View style={{ backgroundColor: FACTION_COLOR[selOwner], paddingHorizontal: 6, paddingVertical: 2 }}>
                  <Text style={{ color: '#fff', fontSize: 9, fontWeight: '700' }}>{FACTION_SHORT[selOwner]}</Text>
                </View>
              </View>
              <Text style={{ color: '#666', fontSize: 10, marginBottom: 8 }}>
                基础归属：{FACTION_LABEL[sel.base]} · 城市指标偏置：{METRIC_HINT[sel.base]}
              </Text>
              {ALL_FACTIONS.map(f => (
                <View key={f} style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 4 }}>
                  <Text style={{ color: '#555', fontSize: 9, width: 28 }}>{FACTION_SHORT[f]}</Text>
                  <View style={{ flex: 1, height: 6, backgroundColor: '#E5E5E5', borderRadius: 3, overflow: 'hidden' }}>
                    <View style={{ height: 6, width: `${selControl[f]}%`, backgroundColor: FACTION_COLOR[f], borderRadius: 3 }} />
                  </View>
                  <Text style={{ color: '#555', fontSize: 9, width: 24, textAlign: 'right' }}>{selControl[f]}</Text>
                </View>
              ))}
              <View style={{ marginTop: 10, gap: 6 }}>
                <Pressable
                  disabled={!primary || (save.meritPoints ?? 0) < (sel.base === primary ? 500 : 1000)}
                  onPress={() => doCultivate(sel.id)}
                  style={{ backgroundColor: !primary ? '#ccc' : (sel.base === primary ? '#2E7D32' : '#C62828'), padding: 10, alignItems: 'center' }}>
                  <Text style={{ color: '#fff', fontSize: 11, fontWeight: '700' }}>
                    {primary ? `根据地深耕（−${sel.base === primary ? 500 : 1000} 政绩）` : '请先加入派系'}
                  </Text>
                </Pressable>
                <Text style={{ color: '#888', fontSize: 9, lineHeight: 14, textAlign: 'center' }}>
                  本派省 500 政绩深耕（control+10）· 他派省 1000（高危，control+8）{'\n'}
                  枢纽省 control 高者在派系斗争 S_you 额外加权（§3.25）
                </Text>
              </View>

              {/* 三级下钻：城市 → 区县（§3.25） */}
              <View style={{ marginTop: 12, borderTopWidth: 1, borderTopColor: '#F0F0F0', paddingTop: 10 }}>
                <Text style={{ color: '#888', fontSize: 9, fontWeight: '700', marginBottom: 6 }}>下钻：城市 / 区县（§3.25）</Text>
                {CITY_NAMES.map((cn, ci) => {
                  const cCtrl = cityControl(sel.id, ci);
                  const cOwner = ownerFromControl(cCtrl);
                  const isDrill = drillCity === ci;
                  return (
                    <View key={ci} style={{ marginBottom: 8 }}>
                      <Pressable onPress={() => setDrillCity(isDrill ? null : ci)} style={{ flexDirection: 'row', alignItems: 'center', gap: 6, paddingVertical: 4 }}>
                        <View style={{ width: 8, height: 8, backgroundColor: FACTION_COLOR[cOwner] }} />
                        <Text style={{ flex: 1, color: '#333', fontSize: 11 }}>{sel.name}{cn}</Text>
                        <Text style={{ color: '#888', fontSize: 9 }}>{FACTION_SHORT[cOwner]}</Text>
                        <Text style={{ color: '#888', fontSize: 9 }}>{isDrill ? '▲' : '▼'}</Text>
                      </Pressable>
                      {isDrill && (
                        <View style={{ paddingLeft: 14, gap: 4 }}>
                          {COUNTY_NAMES.map((kn, ki) => {
                            const kCtrl = countyControl(sel.id, ci, ki);
                            const kOwner = ownerFromControl(kCtrl);
                            return (
                              <View key={ki} style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                                <View style={{ width: 6, height: 6, backgroundColor: FACTION_COLOR[kOwner] }} />
                                <Text style={{ flex: 1, color: '#555', fontSize: 10 }}>{kn}</Text>
                                <Text style={{ color: '#888', fontSize: 9 }}>{FACTION_SHORT[kOwner]}</Text>
                                <Pressable disabled={!primary || (save.meritPoints ?? 0) < 300} onPress={() => doCultivateCounty(sel.id)} style={{ backgroundColor: !primary ? '#ccc' : '#4527A0', paddingHorizontal: 8, paddingVertical: 3 }}>
                                  <Text style={{ color: '#fff', fontSize: 9 }}>深耕−300</Text>
                                </Pressable>
                              </View>
                            );
                          })}
                        </View>
                      )}
                      <Pressable disabled={!primary || (save.meritPoints ?? 0) < 400} onPress={() => doCultivateCity(sel.id)} style={{ backgroundColor: !primary ? '#ccc' : '#1565C0', paddingHorizontal: 8, paddingVertical: 4, alignItems: 'center', marginTop: 2 }}>
                        <Text style={{ color: '#fff', fontSize: 9 }}>城市深耕（−400 政绩，control+6）</Text>
                      </Pressable>
                    </View>
                  );
                })}
              </View>
            </View>
          )}

          <View style={{ backgroundColor: '#1D3A5C', padding: 12, marginTop: 14 }}>
            <Text style={{ color: '#8eb4d8', fontSize: 9, lineHeight: 16 }}>
              地盘即政治资本（§4.8）。省份归属随派系操作、城市指标、斗争结果漂移；{'\n'}
              争夺省（control 差 {'<'}15）可发动阵地争夺；巡视他派省（1000 政绩）触发其"被约谈"（§3.10）。
            </Text>
          </View>
        </ScrollView>
      )}

      {tab === 'treasury' && (
        <ScrollView contentContainerStyle={{ padding: 12, paddingBottom: insets.bottom + 24 }} showsVerticalScrollIndicator={false}>
          <View style={{ backgroundColor: '#fff', borderTopWidth: 3, borderTopColor: '#C62828', borderWidth: 1, borderColor: '#E5E5E5', padding: 12 }}>
            <Text style={{ color: '#C62828', fontSize: 12, fontWeight: '700' }}>💰 派系经费池（§3.26）</Text>
            <Text style={{ color: '#888', fontSize: 9, marginTop: 4, lineHeight: 14 }}>
              各派经费池随派系操作、地盘、斗争结果增减。向主派输送经费可提升影响力，但账目留痕、累积落马风险。
            </Text>
            {ALL_FACTIONS.map(f => {
              const v = tOf(f);
              return (
                <View key={f} style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 8 }}>
                  <Text style={{ color: '#555', fontSize: 9, width: 28 }}>{FACTION_SHORT[f]}</Text>
                  <View style={{ flex: 1, height: 8, backgroundColor: '#E5E5E5', borderRadius: 4, overflow: 'hidden' }}>
                    <View style={{ height: 8, width: `${Math.min(100, v / 20)}%`, backgroundColor: FACTION_COLOR[f], borderRadius: 4 }} />
                  </View>
                  <Text style={{ color: '#555', fontSize: 9, width: 40, textAlign: 'right' }}>{v}</Text>
                </View>
              );
            })}
            <View style={{ marginTop: 14 }}>
              <Pressable
                disabled={!primary || (save.fundBalance ?? 0) < 100000 || isCooldownActive(cd, 'treasury_donate', save.gameDays)}
                onPress={doDonate}
                style={{ backgroundColor: (!primary || (save.fundBalance ?? 0) < 100000) ? '#ccc' : '#C62828', padding: 10, alignItems: 'center' }}>
                <Text style={{ color: '#fff', fontSize: 11, fontWeight: '700' }}>
                  {primary ? '输送经费（−10万资金 → 经费+500，影响力+3）' : '请先加入派系'}
                </Text>
              </Pressable>
              <Text style={{ color: '#888', fontSize: 9, lineHeight: 14, textAlign: 'center', marginTop: 6 }}>
                ⚠ 账目留痕：落马风险 +1（purgeCount）· 冷却 30 天{'\n'}
                经费池高者在派系斗争 S_you 额外加权（§3.26 / §4.8）
              </Text>
            </View>
          </View>
        </ScrollView>
      )}

    </View>
  );
}