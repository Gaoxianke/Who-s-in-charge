// 晋升页·晋升条件 Tab（软输入参考 + v5 硬门控）
// v5：移除旧 pending_promotion 申请按钮与 ensureNpcPosts 旧岗位系统；接入 checkPromotionGate 硬门控
import { useCallback, useState } from 'react';
import { ActivityIndicator, ScrollView, Text, View } from 'react-native';
import { useFocusEffect } from 'expo-router';
import { useGame } from '@/ctx/GameContext';
import { getNpcBand } from '@/db/gameApi';
import { isPromotionFrozen, isWindowLocked, getTierOf, getFreezeReason } from '@/lib/promotionEngine';
import { resolveContest } from '@/lib/promotionFaction';
import type { PromotionGateResult } from '@/lib/promotionFaction';
import { CONTEST_BLEND, CONTEST_COSTS, calcFactionPower, calcPersonalPower, getNationalControl } from '@/lib/provinceSeatSystem';
import { RANK_CONFIG, getLegalTitle, FACTION_COLOR, FACTION_LABEL, type FactionId } from '@/types/game';

export function ConditionsTab({ gate }: { gate: PromotionGateResult }) {
  const { save } = useGame();
  const [bandFactions, setBandFactions] = useState<FactionId[]>([]);

  useFocusEffect(useCallback(() => {
    if (!save) return;
    (async () => {
      const band = await getNpcBand(save.id);
      const bf: FactionId[] = [];
      for (const m of band) { if (m.faction) bf.push(m.faction); }
      setBandFactions(bf);
    })();
  }, [save]));

  if (!save) return <ActivityIndicator color="#C82829" style={{ padding: 40 }} />;

  const frozen = isPromotionFrozen(save);
  const windowLocked = isWindowLocked(save);
  const freezeReason = getFreezeReason(save);

  // v5 硬门控（由父组件传入，避免重复计算）

  // 当前争夺力预估（软输入折算展示）
  const { sYou, sOpp } = resolveContest(save, bandFactions);
  const contest = save.promotionContest;
  const contestWinning = contest && contest.status === 'active' && contest.sYou >= contest.sOpp;

  return (
    <ScrollView contentContainerStyle={{ padding: 14, gap: 12 }}>

      {/* 当前 → 目标职级卡（从 RANK_CONFIG 读取，配置驱动） */}
      {save.rankLevel < 15 && (() => {
        const cur = RANK_CONFIG[save.rankLevel];
        const nxt = RANK_CONFIG[save.rankLevel + 1];
        if (!cur || !nxt) return null;
        const sameGrade = cur.rankGrade === nxt.rankGrade;
        return (
          <View style={{ backgroundColor: '#fff', borderWidth: 1, borderColor: '#D9D9D9', padding: 12 }}>
            <Text style={{ fontSize: 11, fontWeight: '700', color: '#1D3B5E', letterSpacing: 1, marginBottom: 10 }}>职级晋升概览</Text>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 0 }}>
              {/* 当前职级 */}
              <View style={{ flex: 1, backgroundColor: '#F5F4F1', borderWidth: 1, borderColor: '#D9D9D9', padding: 10, alignItems: 'center', gap: 3 }}>
                <Text style={{ fontSize: 9, color: '#888', letterSpacing: 0.5 }}>当前职级</Text>
                <Text style={{ fontSize: 12, fontWeight: '700', color: '#1D3B5E' }}>{cur.name}</Text>
                <View style={{ backgroundColor: '#E8EDF5', borderWidth: 1, borderColor: '#AAB8CC', paddingHorizontal: 6, paddingVertical: 2, marginTop: 2 }}>
                  <Text style={{ fontSize: 10, color: '#1D3B5E', fontWeight: '600' }}>{cur.rankGrade}</Text>
                </View>
                <Text style={{ fontSize: 9, color: '#999', marginTop: 2, textAlign: 'center' }}>{getLegalTitle(save.rankLevel)}</Text>
              </View>
              {/* 箭头 */}
              <View style={{ paddingHorizontal: 8, alignItems: 'center', gap: 2 }}>
                <Text style={{ fontSize: 18, color: '#C82829' }}>→</Text>
                {!sameGrade && (
                  <Text style={{ fontSize: 8, color: '#C82829', fontWeight: '600', letterSpacing: 0.3 }}>升级</Text>
                )}
              </View>
              {/* 目标职级 */}
              <View style={{ flex: 1, backgroundColor: '#FFF8F8', borderWidth: 1, borderColor: '#C82829', padding: 10, alignItems: 'center', gap: 3 }}>
                <Text style={{ fontSize: 9, color: '#C82829', letterSpacing: 0.5 }}>目标职级</Text>
                <Text style={{ fontSize: 12, fontWeight: '700', color: '#C82829' }}>{nxt.name}</Text>
                <View style={{ backgroundColor: !sameGrade ? '#FDE8E8' : '#F5F4F1', borderWidth: 1, borderColor: !sameGrade ? '#C82829' : '#D9D9D9', paddingHorizontal: 6, paddingVertical: 2, marginTop: 2 }}>
                  <Text style={{ fontSize: 10, color: !sameGrade ? '#C82829' : '#1D3B5E', fontWeight: '700' }}>{nxt.rankGrade}</Text>
                </View>
                <Text style={{ fontSize: 9, color: '#999', marginTop: 2, textAlign: 'center' }}>{getLegalTitle(save.rankLevel + 1)}</Text>
              </View>
            </View>
          </View>
        );
      })()}

      {/* v5 晋升硬门控卡 */}
      <View style={{ backgroundColor: gate.allowed ? '#F0FAF0' : '#FFF5F5', borderWidth: 1, borderColor: gate.allowed ? '#A5D6A7' : '#F0B4B4', padding: 12 }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
          <Text style={{ fontSize: 12, fontWeight: '700', color: gate.allowed ? '#2E7D32' : '#C62828', letterSpacing: 1 }}>🛂 v5 晋升硬门控</Text>
          <Text style={{ fontSize: 11, fontWeight: '700', color: gate.allowed ? '#2E7D32' : '#C62828' }}>
            {gate.allowed ? '✅ 可晋升' : '⛔ 未通过'}
          </Text>
        </View>
        {gate.blockReason ? (
          <Text style={{ fontSize: 11, color: '#8A2B2B', lineHeight: 17, marginBottom: 8 }}>{gate.blockReason}</Text>
        ) : null}
        {gate.details.length > 0 ? (
          <View style={{ gap: 8 }}>
            {gate.details.map(d => (
              <View key={d.key} style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                  <Text style={{ fontSize: 14 }}>{d.pass ? '✅' : '⚠️'}</Text>
                  <Text style={{ fontSize: 12, fontWeight: '600', color: d.pass ? '#2a7a3b' : '#B8860B' }}>{d.label}</Text>
                </View>
                <Text style={{ fontSize: 11, color: d.pass ? '#2a7a3b' : '#C62828' }}>
                  {String(d.current)} / {String(d.required)}
                </Text>
              </View>
            ))}
          </View>
        ) : null}
      </View>

      {/* v4 双轨战力卡：个人职位战（10%派系+90%个人）+ 省级席位控制度 */}
      {(() => {
        const primary = (save.primaryFaction || 'reform') as FactionId;
        const factionPower = calcFactionPower(save, primary);
        const personalPower = calcPersonalPower(save);
        const estSYou = Math.round((CONTEST_BLEND.faction * factionPower + CONTEST_BLEND.personal * personalPower) * 10) / 10;
        const { control } = getNationalControl(save);
        const myRatio = control.controlRatios[primary] ?? 0;
        const cooldownRemaining = Math.max(0, (save.personalContestCooldownUntil ?? 0) - save.gameDays);
        const meritEnough = (save.meritPoints ?? 0) >= CONTEST_COSTS.personalContest.merit;
        return (
          <View style={{ backgroundColor: '#FFFCF0', borderWidth: 1, borderColor: '#B8860B', padding: 12 }}>
            <Text style={{ fontSize: 11, fontWeight: '700', color: '#8A6D1A', marginBottom: 8 }}>⚔ v4 双轨战力预估</Text>
            {/* 个人职位战分解条 */}
            <Text style={{ fontSize: 10, color: '#666', marginBottom: 4 }}>个人职位战 S_you ≈ {estSYou}（派系 {CONTEST_BLEND.faction * 100}% + 个人 {CONTEST_BLEND.personal * 100}%）</Text>
            <View style={{ height: 14, flexDirection: 'row', borderWidth: 1, borderColor: '#D9CFA3' }}>
              <View style={{ width: `${CONTEST_BLEND.faction * 100}%`, backgroundColor: FACTION_COLOR[primary], justifyContent: 'center', alignItems: 'center' }}>
                <Text style={{ color: '#fff', fontSize: 8 }}>{Math.round(CONTEST_BLEND.faction * factionPower)}</Text>
              </View>
              <View style={{ flex: 1, backgroundColor: '#B8860B', justifyContent: 'center', alignItems: 'center' }}>
                <Text style={{ color: '#fff', fontSize: 8, fontWeight: '700' }}>{Math.round(CONTEST_BLEND.personal * personalPower)}（90%）</Text>
              </View>
            </View>
            <Text style={{ fontSize: 9, color: '#999', marginTop: 4, marginBottom: 6 }}>
              派系实力 {factionPower} · 个人战力 {personalPower} · 花费 {CONTEST_COSTS.personalContest.merit} 功绩{cooldownRemaining > 0 ? ` · 冷却中剩 ${cooldownRemaining} 天` : meritEnough ? ' · 可发起' : ' · 功绩不足'}
            </Text>
            {/* 省级席位控制度 */}
            <View style={{ borderTopWidth: 1, borderTopColor: '#E8DCC0', paddingTop: 6 }}>
              <Text style={{ fontSize: 10, color: '#666', marginBottom: 4 }}>
                省级席位战：{FACTION_LABEL[primary]} 控制 {Math.round(myRatio * 100)}%（{control.factionSeats[primary] ?? 0}/{control.totalSeats} 席）· 获胜阈值 80%
              </Text>
              <View style={{ height: 10, backgroundColor: '#F0EBDD', borderWidth: 1, borderColor: '#D9CFA3', flexDirection: 'row' }}>
                <View style={{ width: `${myRatio * 100}%`, backgroundColor: FACTION_COLOR[primary] }} />
                <View style={{ position: 'absolute', left: `${80}%`, top: -2, bottom: -2, width: 2, backgroundColor: '#8A1515' }} />
              </View>
              <Text style={{ fontSize: 9, color: '#999', marginTop: 4 }}>
                双轨独立：席位战 ≥80% 提前收官 · 个人战仅凭 S_you ≥ S_opp 晋升，互不干扰。
              </Text>
            </View>
          </View>
        );
      })()}

      {/* v6 说明横幅：职位争夺制（P2–P7） */}
      <View style={{ backgroundColor: '#F0F4FA', borderWidth: 1, borderColor: '#B4C6E0', padding: 10 }}>
        <Text style={{ fontSize: 11, fontWeight: '700', color: '#1D3B5E', marginBottom: 4 }}>📌 门槛规则（职位争夺制 · P2–P7）</Text>
        <Text style={{ fontSize: 11, color: '#44608A', lineHeight: 17 }}>
          晋升须先在「个人争夺战」赢下目标职位，再通过统一门控：年龄≥18、任满 3 年、政绩≥（200+目标级×100）、派系贡献≥（150+目标级×75）、民心/主派关系/无立案/无失势冻结、且目标职位有编制空缺（配额 = 派系等级×2 + 1）。{'\n'}
          普通晋升每斗争周期仅一次；破格、举荐均走同一入口校验，不得豁免。降职冷却期内不可晋升。
        </Text>
      </View>

      {/* 争夺力实时预估 */}
      <View style={{ backgroundColor: '#fff', borderWidth: 1, borderColor: '#D9D9D9', padding: 14 }}>
        <Text style={{ fontSize: 12, fontWeight: '700', color: '#1D3B5E', letterSpacing: 2, marginBottom: 10 }}>争夺力预估（S_you vs S_opp）</Text>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
          <View style={{ flex: 1, alignItems: 'center', backgroundColor: '#E8EDF5', padding: 10 }}>
            <Text style={{ fontSize: 20, fontWeight: '900', color: '#1565C0' }}>{sYou}</Text>
            <Text style={{ fontSize: 9, color: '#666' }}>我方 S_you</Text>
          </View>
          <Text style={{ fontSize: 13, color: '#999', fontWeight: '700' }}>vs</Text>
          <View style={{ flex: 1, alignItems: 'center', backgroundColor: '#FFEBEE', padding: 10 }}>
            <Text style={{ fontSize: 20, fontWeight: '900', color: '#C62828' }}>{sOpp}</Text>
            <Text style={{ fontSize: 9, color: '#666' }}>对立派 S_opp</Text>
          </View>
        </View>
        {contest ? (
          <Text style={{ fontSize: 10, color: contestWinning ? '#2E7D32' : '#C62828', marginTop: 8, fontWeight: '600' }}>
            {contest.status === 'active'
              ? contestWinning ? '✅ 当前争夺占优' : '❌ 当前争夺处于劣势'
              : `当前争夺状态：${contest.status}`}
          </Text>
        ) : (
          <Text style={{ fontSize: 10, color: '#999', marginTop: 8 }}>暂无进行中争夺 · 到「个人争夺战」页发起</Text>
        )}
      </View>

      {/* 状态横幅 */}
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6 }}>
        {frozen ? <StatusChip text="⚠ 晋升冻结" color="#C82829" /> : null}
        {windowLocked ? <StatusChip text="⏳ 已超晋升窗口" color="#e67e22" /> : null}
        {!frozen && !windowLocked ? <StatusChip text="✅ 评审通道开放" color="#2a7a3b" /> : null}
      </View>
      {/* 冻结具体原因 */}
      {freezeReason ? (
        <View style={{ backgroundColor: '#FDECEC', borderWidth: 1, borderColor: '#E8B4B4', padding: 10, gap: 4 }}>
          <Text style={{ fontSize: 11, fontWeight: '700', color: '#B33A3A', letterSpacing: 0.5 }}>冻结原因</Text>
          <Text style={{ fontSize: 12, color: '#8A2B2B', lineHeight: 18 }}>{freezeReason}</Text>
        </View>
      ) : null}
    </ScrollView>
  );
}

function StatusChip({ text, color }: { text: string; color: string }) {
  return (
    <View style={{ backgroundColor: color + '18', borderWidth: 1, borderColor: color + '55', paddingHorizontal: 8, paddingVertical: 3 }}>
      <Text style={{ color, fontSize: 11, fontWeight: '600' }}>{text}</Text>
    </View>
  );
}