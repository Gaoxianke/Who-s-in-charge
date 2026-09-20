// 省级席位地图（v4 派系玩法：全国棋盘）
// 风格：体制内机密档案 · 战略指挥中心（硬边网格分割，无圆角无渐变）
import { useMemo, useState } from 'react';
import { Modal, Pressable, ScrollView, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import {
  RANK_CONFIG,
  getRandomCityForRank,
  FACTION_LABEL,
  FACTION_SHORT,
  FACTION_COLOR,
  ALL_FACTIONS,
  type FactionId,
  type PlayerSave,
} from '@/types/game';
import {
  VICTORY_THRESHOLD,
  CONTEST_BLEND,
  CONTEST_COSTS,
  getNationalControl,
  getDomainTypeOfProvince,
  describeFactionDomainBonuses,
  DOMAIN_TYPE_LABEL,
  calcFactionPower,
  calcPersonalPower,
} from '@/lib/provinceSeatSystem';
import { nanoid } from '@/lib/nanoid';

interface Props {
  visible: boolean;
  onClose: () => void;
  save: PlayerSave;
  /** 班子派系（个人职位战竞争派系来源） */
  bandFactions: FactionId[];
  /** 个人职位战结算回调（win 才晋升落档） */
  onLaunchPersonalContest: (
    positionKey: string,
    positionTitle: string,
    toRank: number,
    targetCity: string,
  ) => Promise<void>;
}

// 档案风格色板（框架色，业务数据色全部走 FACTION_COLOR 配置）
const INK = '#121212';        // 深砚灰背景
const INK2 = '#1E1E1E';       // 模块底
const LINE = '#333333';       // 硬边分割线
const SEAL = '#8A1515';       // 印泥红（阈值线/警示）
const GOLD = '#D4AF37';       // 档案金（玩家目标/核心数据）
const PAPER = '#E8E4D8';      // 纸面文字
const MUTED = '#9A948A';      // 次要文字

export function ProvinceSeatMap({ visible, onClose, save, bandFactions, onLaunchPersonalContest }: Props) {
  const insets = useSafeAreaInsets();
  const [submitting, setSubmitting] = useState(false);
  const [selectedProvince, setSelectedProvince] = useState<string | null>(null);
  const [feedback, setFeedback] = useState('');

  const primary = (save.primaryFaction || 'reform') as FactionId;

  // 全国控制统计（从存档 provinceSeatControl 派生，未分配时按当前关系预估）
  const { control, seats } = useMemo(() => getNationalControl(save), [save]);
  const myRatio = control.controlRatios[primary] ?? 0;
  const mySeats = control.factionSeats[primary] ?? 0;

  // 个人战力分解（预估展示）
  const factionPower = useMemo(() => calcFactionPower(save, primary), [save, primary]);
  const personalPower = useMemo(() => calcPersonalPower(save), [save]);
  const factionShareScore = Math.round(CONTEST_BLEND.faction * factionPower * 10) / 10;
  const personalShareScore = Math.round(CONTEST_BLEND.personal * personalPower * 10) / 10;
  const estSYou = Math.round((factionShareScore + personalShareScore) * 10) / 10;

  // 冷却/门槛状态
  const cooldownRemaining = Math.max(0, (save.personalContestCooldownUntil ?? 0) - save.gameDays);
  const inCooldown = cooldownRemaining > 0;
  const meritEnough = (save.meritPoints ?? 0) >= CONTEST_COSTS.personalContest.merit;

  // 目标职位（下一职级）
  const toRank = save.rankLevel + 1;
  const targetPosition = RANK_CONFIG[toRank]?.name ?? '拟任职务';

  const showFeedback = (msg: string) => {
    setFeedback(msg);
    setTimeout(() => setFeedback(''), 4000);
  };

  /** 发起个人职位战 */
  const handleLaunch = async () => {
    if (submitting) return;
    if (inCooldown) {
      showFeedback(`冷却时间未到，请等待 ${cooldownRemaining} 天后再试`);
      return;
    }
    if (!meritEnough) {
      showFeedback(`功绩点数不足，需要 ${CONTEST_COSTS.personalContest.merit} 点功绩`);
      return;
    }
    setSubmitting(true);
    try {
      const targetCity = getRandomCityForRank(toRank);
      await onLaunchPersonalContest(`rank_${toRank}`, targetPosition, toRank, targetCity);
    } finally {
      setSubmitting(false);
    }
  };

  // 加成说明
  const domainBonusList = useMemo(() => describeFactionDomainBonuses(), []);

  return (
    <Modal visible={visible} animationType="fade" transparent={false} onRequestClose={onClose}>
      <View style={{ flex: 1, backgroundColor: INK, paddingTop: insets.top }}>
        {/* 顶栏 */}
        <View style={{ borderBottomWidth: 1, borderColor: LINE, paddingHorizontal: 14, paddingVertical: 12, flexDirection: 'row', alignItems: 'center' }}>
          <View style={{ flex: 1 }}>
            <Text style={{ color: PAPER, fontSize: 15, fontWeight: '700', letterSpacing: 3 }}>省级席位 · 全国棋盘</Text>
            <Text style={{ color: MUTED, fontSize: 9, marginTop: 2, letterSpacing: 1 }}>
              {FACTION_LABEL[primary]} · 双轨制：席位战(80%) + 个人战(10%+90%)
            </Text>
          </View>
          <Pressable onPress={onClose} style={{ borderWidth: 1, borderColor: LINE, paddingHorizontal: 10, paddingVertical: 5 }}>
            <Text style={{ color: MUTED, fontSize: 11 }}>关闭 ✕</Text>
          </Pressable>
        </View>

        <ScrollView contentContainerStyle={{ padding: 12, paddingBottom: insets.bottom + 32 }} showsVerticalScrollIndicator={false}>
          {/* 反馈条 */}
          {!!feedback && (
            <View style={{ borderWidth: 1, borderColor: SEAL, backgroundColor: '#2A1010', padding: 8, marginBottom: 8 }}>
              <Text style={{ color: '#E8B4B4', fontSize: 11 }}>{feedback}</Text>
            </View>
          )}

          {/* ══ 全国控制度进度条 + 阈值线 ══ */}
          <View style={{ borderWidth: 1, borderColor: LINE, backgroundColor: INK2, padding: 12 }}>
            <Text style={{ color: MUTED, fontSize: 10, letterSpacing: 2, marginBottom: 8 }}>全国席位控制度</Text>
            <View style={{ height: 22, borderWidth: 1, borderColor: LINE, flexDirection: 'row' }}>
              {ALL_FACTIONS.map(f => {
                const w = (control.controlRatios[f] ?? 0) * 100;
                if (w <= 0) return null;
                return (
                  <View key={f} style={{ width: `${w}%`, backgroundColor: FACTION_COLOR[f], justifyContent: 'center', alignItems: 'center' }}>
                    {w >= 12 ? <Text style={{ color: '#fff', fontSize: 9, fontWeight: '700' }}>{Math.round(w)}%</Text> : null}
                  </View>
                );
              })}
            </View>
            {/* 80% 阈值线 */}
            <View style={{ position: 'absolute', left: 12 + (VICTORY_THRESHOLD * 100 * (320 - 24) / 100) + 12, top: 34, bottom: 12, width: 2, backgroundColor: SEAL }} />
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 8 }}>
              <View style={{ width: 10, height: 10, backgroundColor: SEAL }} />
              <Text style={{ color: SEAL, fontSize: 10, fontWeight: '700' }}>
                获胜阈值 {Math.round(VICTORY_THRESHOLD * 100)}%（本派当前 {Math.round(myRatio * 100)}% · {mySeats}/{control.totalSeats} 席）
              </Text>
            </View>
            <Text style={{ color: MUTED, fontSize: 9, marginTop: 6, lineHeight: 14 }}>
              {myRatio >= VICTORY_THRESHOLD
                ? '✓ 本派已达获胜阈值，本轮斗争提前收官'
                : `距获胜阈值还差 ${Math.max(0, Math.round((VICTORY_THRESHOLD - myRatio) * 100))}%，到周期边界仍未达标则本轮争夺过期`}
            </Text>
          </View>

          {/* ══ 五派席位分布 ══ */}
          <View style={{ borderWidth: 1, borderColor: LINE, backgroundColor: INK2, padding: 12, marginTop: 8 }}>
            <Text style={{ color: MUTED, fontSize: 10, letterSpacing: 2, marginBottom: 8 }}>五派席位分布</Text>
            {[...ALL_FACTIONS].sort((a, b) => (control.factionSeats[b] ?? 0) - (control.factionSeats[a] ?? 0)).map(f => {
              const cnt = control.factionSeats[f] ?? 0;
              const ratio = control.controlRatios[f] ?? 0;
              const isMine = f === primary;
              return (
                <View key={f} style={{ flexDirection: 'row', alignItems: 'center', gap: 8, paddingVertical: 4 }}>
                  <View style={{ width: 10, height: 10, backgroundColor: FACTION_COLOR[f] }} />
                  <Text style={{ width: 88, color: isMine ? GOLD : PAPER, fontSize: 11, fontWeight: isMine ? '700' : '400' }}>
                    {FACTION_LABEL[f]}{isMine ? ' ★' : ''}
                  </Text>
                  <View style={{ flex: 1, height: 8, backgroundColor: '#2A2A2A', flexDirection: 'row' }}>
                    <View style={{ width: `${ratio * 100}%`, backgroundColor: FACTION_COLOR[f] }} />
                  </View>
                  <Text style={{ width: 70, color: MUTED, fontSize: 10, textAlign: 'right' }}>
                    {cnt} 席 · {Math.round(ratio * 100)}%
                  </Text>
                </View>
              );
            })}
          </View>

          {/* ══ 各省列表 ══ */}
          <View style={{ borderWidth: 1, borderColor: LINE, backgroundColor: INK2, padding: 12, marginTop: 8 }}>
            <Text style={{ color: MUTED, fontSize: 10, letterSpacing: 2, marginBottom: 8 }}>
              各省席位（席位 = round(地级市数 × 1.8)，clamp [3,18]）
            </Text>
            {seats.map(s => {
              const holder = s.holderFaction;
              const domainType = getDomainTypeOfProvince(s.province);
              const isMine = holder === primary;
              const isSelected = selectedProvince === s.province;
              const playerHere = save.cityName.includes(s.province.replace(/省|市|自治区|壮族自治区|回族自治区|维吾尔自治区/g, ''));
              return (
                <Pressable
                  key={s.province}
                  onPress={() => setSelectedProvince(isSelected ? null : s.province)}
                  style={{ flexDirection: 'row', alignItems: 'center', gap: 8, paddingVertical: 6, borderBottomWidth: 1, borderBottomColor: '#2A2A2A' }}
                >
                  <View style={{ width: 3, height: 18, backgroundColor: holder ? FACTION_COLOR[holder] : '#555' }} />
                  <Text style={{ width: 92, color: PAPER, fontSize: 11 }}>{s.province}</Text>
                  <View style={{ width: 58, borderWidth: 1, borderColor: holder ? FACTION_COLOR[holder] : LINE, alignItems: 'center', paddingVertical: 2 }}>
                    <Text style={{ color: holder ? FACTION_COLOR[holder] : MUTED, fontSize: 9, fontWeight: '700' }}>
                      {holder ? FACTION_SHORT[holder] : '无主'}
                    </Text>
                  </View>
                  <Text style={{ width: 40, color: MUTED, fontSize: 10, textAlign: 'center' }}>{s.seatCount} 席</Text>
                  <Text style={{ width: 60, color: '#666', fontSize: 8, flex: 1 }} numberOfLines={1}>
                    {DOMAIN_TYPE_LABEL[domainType]}
                  </Text>
                  {isMine ? <Text style={{ color: GOLD, fontSize: 10 }}>★</Text> : null}
                  {playerHere ? <Text style={{ color: GOLD, fontSize: 9 }}>任职地</Text> : null}
                </Pressable>
              );
            })}
          </View>

          {/* ══ 个人职位战面板 ══ */}
          <View style={{ borderWidth: 1, borderColor: GOLD, backgroundColor: INK2, padding: 12, marginTop: 8 }}>
            <Text style={{ color: GOLD, fontSize: 11, fontWeight: '700', letterSpacing: 2, marginBottom: 6 }}>个人职位战（独立赛道）</Text>
            <Text style={{ color: MUTED, fontSize: 9, marginBottom: 8, lineHeight: 14 }}>
              目标职位：{targetPosition}（第 {toRank} 级）· 花费 {CONTEST_COSTS.personalContest.merit} 功绩 · 冷却 {CONTEST_COSTS.personalContest.cooldownDays} 天
            </Text>

            {/* 战力预估分解条：派系10% + 个人90% */}
            <Text style={{ color: MUTED, fontSize: 9, marginBottom: 4 }}>战力预估（S_you ≈ {estSYou}）</Text>
            <View style={{ height: 14, flexDirection: 'row', borderWidth: 1, borderColor: LINE }}>
              <View style={{ width: `${CONTEST_BLEND.faction * 100}%`, backgroundColor: FACTION_COLOR[primary], justifyContent: 'center', alignItems: 'center' }}>
                <Text style={{ color: '#fff', fontSize: 8 }}>派系 {factionShareScore}</Text>
              </View>
              <View style={{ flex: 1, backgroundColor: GOLD, justifyContent: 'center', alignItems: 'center' }}>
                <Text style={{ color: INK, fontSize: 8, fontWeight: '700' }}>个人 {personalShareScore}（90%）</Text>
              </View>
            </View>
            <Text style={{ color: MUTED, fontSize: 8, marginTop: 4 }}>
              派系实力 {factionPower}（关系/影响力/功绩/情报/经费池加权）· 个人战力 {personalPower}（七维加权）
            </Text>

            {/* 花费/冷却状态 */}
            <View style={{ flexDirection: 'row', gap: 8, marginTop: 8 }}>
              <View style={{ flex: 1, borderWidth: 1, borderColor: meritEnough ? '#2E6B3E' : SEAL, padding: 6 }}>
                <Text style={{ color: meritEnough ? '#7CBF8E' : '#E8B4B4', fontSize: 9 }}>
                  功绩 {Math.round(save.meritPoints ?? 0)} / {CONTEST_COSTS.personalContest.merit} {meritEnough ? '✓' : '✗'}
                </Text>
              </View>
              <View style={{ flex: 1, borderWidth: 1, borderColor: inCooldown ? SEAL : '#2E6B3E', padding: 6 }}>
                <Text style={{ color: inCooldown ? '#E8B4B4' : '#7CBF8E', fontSize: 9 }}>
                  {inCooldown ? `冷却中 ${cooldownRemaining} 天` : '冷却已结束 ✓'}
                </Text>
              </View>
            </View>

            <Pressable
              onPress={handleLaunch}
              disabled={submitting}
              style={{ backgroundColor: submitting ? '#3A3A3A' : GOLD, paddingVertical: 11, alignItems: 'center', marginTop: 10 }}
            >
              <Text style={{ color: submitting ? MUTED : INK, fontSize: 12, fontWeight: '700', letterSpacing: 2 }}>
                {submitting ? '结算中…' : `发起个人职位战（-${CONTEST_COSTS.personalContest.merit} 功绩）`}
              </Text>
            </Pressable>
            <Text style={{ color: MUTED, fontSize: 8, marginTop: 6, lineHeight: 12 }}>
              仅胜利才落档晋升；个人战胜利不影响派系斗争回合。四宫格：派系胜+个人胜(最佳) / 派系胜+个人负(无妨) / 派系负+个人胜(仍受罚) / 派系负+个人负(最糟)。
            </Text>
          </View>

          {/* ══ 个人职位战历史 ══ */}
          {(save.personalContestHistory ?? []).length > 0 && (
            <View style={{ borderWidth: 1, borderColor: LINE, backgroundColor: INK2, padding: 12, marginTop: 8 }}>
              <Text style={{ color: MUTED, fontSize: 10, letterSpacing: 2, marginBottom: 8 }}>个人职位战历史</Text>
              {(save.personalContestHistory ?? []).slice(-6).reverse().map((h, i) => (
                <View key={i} style={{ flexDirection: 'row', alignItems: 'center', gap: 8, paddingVertical: 4, borderBottomWidth: 1, borderBottomColor: '#2A2A2A' }}>
                  <View style={{ width: 28, height: 16, backgroundColor: h.win ? '#1E3A24' : '#2A1010', alignItems: 'center', justifyContent: 'center' }}>
                    <Text style={{ color: h.win ? '#7CBF8E' : '#E8B4B4', fontSize: 9, fontWeight: '700' }}>{h.win ? '胜' : '败'}</Text>
                  </View>
                  <Text style={{ flex: 1, color: PAPER, fontSize: 10 }}>
                    S:{h.sYou} vs {h.sOpp}（派系 {Math.round(h.factionShare * 100)}% + 个人 {Math.round(h.personalShare * 100)}%）
                  </Text>
                </View>
              ))}
            </View>
          )}

          {/* ══ 竞争派系加成说明 ══ */}
          <View style={{ borderWidth: 1, borderColor: LINE, backgroundColor: INK2, padding: 12, marginTop: 8 }}>
            <Text style={{ color: MUTED, fontSize: 10, letterSpacing: 2, marginBottom: 8 }}>竞争派系地域加成</Text>
            {domainBonusList.map(d => (
              <View key={d.faction} style={{ flexDirection: 'row', alignItems: 'flex-start', gap: 8, paddingVertical: 4 }}>
                <View style={{ width: 10, height: 10, backgroundColor: FACTION_COLOR[d.faction], marginTop: 3 }} />
                <Text style={{ width: 88, color: PAPER, fontSize: 10 }}>{d.label}</Text>
                <Text style={{ flex: 1, color: MUTED, fontSize: 10, lineHeight: 15 }}>
                  {d.lines.length > 0 ? d.lines.join(' · ') : '无地域加成'}
                </Text>
              </View>
            ))}
          </View>
        </ScrollView>
      </View>
    </Modal>
  );
}
