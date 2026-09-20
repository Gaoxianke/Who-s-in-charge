// 健康精力管理 + 党校培训 Tab
import { useCallback, useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { useRouter, useFocusEffect } from 'expo-router';
import { useGame } from '@/ctx/GameContext';
import {
  getPlayerHealth, restoreHealth, ensurePlayerHealth,
  trainAtPartySchool, getPartySchoolRecords, getPartySchoolQuota,
} from '@/db/gameApi';
import {
  PARTY_SCHOOL_CONFIG,
  RANK_MONTHLY_HEALTH_REGEN,
  RANK_DAILY_ENERGY_BONUS,
  RANK_MEDICAL_TIER,
  ASSET_HEALTH_BONUS,
} from '@/types/game';
import type { PlayerHealth, PartySchoolRecord, PartySchoolLevel } from '@/types/game';

type Tab = 'health' | 'train';

// ── 进度条组件 ─────────────────────────────────────────────────
function GaugeBar({
  value, max = 100, color, label, sublabel,
}: { value: number; max?: number; color: string; label: string; sublabel?: string }) {
  const pct = Math.max(0, Math.min(100, Math.round((value / max) * 100)));
  const statusColor = pct >= 70 ? '#2a5a3e' : pct >= 40 ? '#C05521' : '#C82829';
  const statusText = pct >= 70 ? '良好' : pct >= 40 ? '偏低' : '危险';
  return (
    <View style={{ gap: 6 }}>
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'baseline' }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
          <Text style={{ fontSize: 12, fontWeight: '700', color: '#1A1A1A' }}>{label}</Text>
          {sublabel ? <Text style={{ fontSize: 9, color: '#888' }}>{sublabel}</Text> : null}
        </View>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
          <View style={{ backgroundColor: statusColor + '22', paddingHorizontal: 5, paddingVertical: 1, borderRadius: 2 }}>
            <Text style={{ fontSize: 9, color: statusColor, fontWeight: '700' }}>{statusText}</Text>
          </View>
          <Text style={{ fontSize: 16, fontWeight: '800', color, fontFamily: 'monospace' }}>{value}</Text>
          <Text style={{ fontSize: 10, color: '#aaa' }}>/{max}</Text>
        </View>
      </View>
      <View style={{ height: 8, backgroundColor: '#F0EDE8', borderRadius: 4, overflow: 'hidden' }}>
        <View style={{ height: 8, width: `${pct}%`, backgroundColor: color, borderRadius: 4 }} />
      </View>
    </View>
  );
}

// ── 信息卡 ──────────────────────────────────────────────────
function InfoCard({ headerColor, title, emoji, children }: { headerColor: string; title: string; emoji: string; children: React.ReactNode }) {
  return (
    <View style={{ backgroundColor: '#fff', borderWidth: 1, borderColor: '#D9D9D9', borderRadius: 2, overflow: 'hidden' }}>
      <View style={{ backgroundColor: headerColor, paddingHorizontal: 14, paddingVertical: 9 }}>
        <Text style={{ color: '#fff', fontSize: 11, fontWeight: '700', letterSpacing: 1.5 }}>{emoji} {title}</Text>
      </View>
      <View style={{ padding: 14 }}>{children}</View>
    </View>
  );
}

// ── 分割线 ───────────────────────────────────────────────────
function Divider() {
  return <View style={{ height: 1, backgroundColor: '#F0EDE8', marginVertical: 6 }} />;
}

// ── 明细行 ───────────────────────────────────────────────────
function DetailRow({ label, value, color = '#1A1A1A', sign }: { label: string; value: string | number; color?: string; sign?: '+' | '-' }) {
  return (
    <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 3 }}>
      <Text style={{ fontSize: 10, color: '#666' }}>{label}</Text>
      <Text style={{ fontSize: 11, fontWeight: '600', color, fontFamily: 'monospace' }}>
        {sign}{value}
      </Text>
    </View>
  );
}

const LEVEL_ORDER: PartySchoolLevel[] = ['county', 'city', 'basic', 'middle', 'advanced', 'national'];

export default function HealthScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { save } = useGame();
  const [tab, setTab] = useState<Tab>('health');
  const [health, setHealth] = useState<PlayerHealth | null>(null);
  const [records, setRecords] = useState<PartySchoolRecord[]>([]);
  const [quota, setQuota] = useState<{ usedCount: number; quotaLimit: number } | null>(null);
  const [loading, setLoading] = useState(true);
  const [actionFeedback, setActionFeedback] = useState('');
  const [trainFeedback, setTrainFeedback] = useState('');
  const [confirmTrain, setConfirmTrain] = useState<PartySchoolLevel | null>(null);
  const [confirmRestore, setConfirmRestore] = useState<'rest' | 'exercise' | 'sanatorium' | null>(null);

  const gameYear = save ? Math.floor(save.gameDays / 365) + 1 : 1;
  const rankLevel = save?.rankLevel ?? 1;
  const playerAge = save?.playerAge ?? 30;
  const assets = save?.personalAssets ?? [];

  useFocusEffect(useCallback(() => {
    if (!save) return;
    void (async () => {
      setLoading(true);
      const [h, rec, q] = await Promise.all([
        ensurePlayerHealth(save.id),
        getPartySchoolRecords(save.id),
        getPartySchoolQuota(save.id, gameYear, save.rankLevel),
      ]);
      setHealth(h);
      setRecords(rec);
      setQuota(q);
      setLoading(false);
    })();
  }, [save]));

  const handleRestore = async (type: 'rest' | 'exercise' | 'sanatorium') => {
    if (!save || !health) return;
    setConfirmRestore(null);
    const ok = await restoreHealth(save.id, type, save.gameDays);
    if (ok) {
      const h = await getPlayerHealth(save.id);
      if (h) setHealth(h);
      const msgs: Record<typeof type, string> = {
        rest:       '✅ 休假完成，健康+10，精力+30',
        exercise:   '✅ 锻炼完成，健康+5，精力+10',
        sanatorium: '✅ 疗养完成，健康+25，精力+50',
      };
      setActionFeedback(msgs[type]);
      setTimeout(() => setActionFeedback(''), 3500);
    }
  };

  const handleTrain = async (level: PartySchoolLevel) => {
    if (!save || !quota) return;
    const result = await trainAtPartySchool(
      save.id, level, 'player', null, save.playerName,
      save.gameDays, gameYear, save.rankLevel, save.meritPoints,
    );
    setTrainFeedback(result.success ? `✅ ${result.msg}` : `❌ ${result.msg}`);
    if (result.success) {
      const [rec, q] = await Promise.all([
        getPartySchoolRecords(save.id),
        getPartySchoolQuota(save.id, gameYear, save.rankLevel),
      ]);
      setRecords(rec);
      setQuota(q);
    }
    setConfirmTrain(null);
    setTimeout(() => setTrainFeedback(''), 4000);
  };

  if (!save) return null;

  // ── 月度健康加成明细计算（与 gameApi monthlyHealthRegen 保持一致，仅展示用）──
  const rankHealthBase = RANK_MONTHLY_HEALTH_REGEN[rankLevel] ?? 1;
  const assetHealthBonus = assets.reduce((acc, key) => acc + (ASSET_HEALTH_BONUS[key]?.healthBonus ?? 0), 0);
  const agePenalty = Math.max(0, Math.floor((playerAge - 50) / 5));
  const fatiguePenalty = health && health.energy < 30 ? 3 : health && health.energy < 60 ? 1 : 0;
  const totalMonthlyHealthDelta = rankHealthBase + assetHealthBonus - agePenalty - fatiguePenalty;

  const rankEnergyBonus = RANK_DAILY_ENERGY_BONUS[rankLevel] ?? 0;
  const assetEnergyBonus = assets.reduce((acc, key) => acc + (ASSET_HEALTH_BONUS[key]?.energyBonusDaily ?? 0), 0);
  const totalDailyEnergy = 5 + rankEnergyBonus + Math.round(assetEnergyBonus);

  const medicalTier = RANK_MEDICAL_TIER[rankLevel];

  // ── 已完成培训证书列表 ──
  const completedRecords = records.filter(r => r.isComplete && r.targetType === 'player');

  return (
    <View style={{ flex: 1, backgroundColor: '#F5F4F1' }}>
      <StatusBar style="light" />

      {/* ── 标题栏 ── */}
      <View style={{
        backgroundColor: '#1D3B6C', paddingTop: insets.top + 8, paddingBottom: 14,
        paddingHorizontal: 16, flexDirection: 'row', alignItems: 'center', gap: 10,
      }}>
        <Pressable onPress={() => router.back()} style={{ padding: 4 }}>
          <Text style={{ color: '#B8C8E0', fontSize: 18 }}>‹</Text>
        </Pressable>
        <View style={{ flex: 1 }}>
          <Text style={{ color: '#B8C8E0', fontSize: 10, letterSpacing: 1.5 }}>HEALTH & TRAINING</Text>
          <Text style={{ color: '#fff', fontSize: 16, fontWeight: '700' }}>健康管理 · 党校培训</Text>
        </View>
        {health?.isOnLeave && (
          <View style={{ backgroundColor: '#C82829', paddingHorizontal: 8, paddingVertical: 4 }}>
            <Text style={{ color: '#fff', fontSize: 9, fontWeight: '700' }}>因病休假中</Text>
          </View>
        )}
      </View>

      {/* ── Tab ── */}
      <View style={{ flexDirection: 'row', backgroundColor: '#fff', borderBottomWidth: 1, borderBottomColor: '#DDD' }}>
        {([['health', '🏥 健康精力'], ['train', '🏛️ 党校培训']] as [Tab, string][]).map(([t, label]) => (
          <Pressable key={t} onPress={() => setTab(t)}
            style={{ flex: 1, paddingVertical: 11, alignItems: 'center', borderBottomWidth: 2, borderBottomColor: tab === t ? '#1D3B6C' : 'transparent' }}>
            <Text style={{ fontSize: 12, color: tab === t ? '#1D3B6C' : '#888', fontWeight: tab === t ? '700' : '400' }}>{label}</Text>
          </Pressable>
        ))}
      </View>

      {loading ? (
        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
          <ActivityIndicator size="large" color="#1D3B6C" />
        </View>
      ) : (
        <ScrollView contentInsetAdjustmentBehavior="automatic" showsVerticalScrollIndicator={false}>
          <View style={{ padding: 14, gap: 12 }}>

            {/* ════════════════ 健康精力 Tab ════════════════ */}
            {tab === 'health' && (
              <>
                {/* 反馈提示 */}
                {!!actionFeedback && (
                  <View style={{ backgroundColor: '#F0FFF4', borderWidth: 1, borderColor: '#7BAD7E', padding: 12, borderRadius: 2 }}>
                    <Text style={{ fontSize: 12, color: '#2a5a3e', textAlign: 'center', fontWeight: '600' }}>{actionFeedback}</Text>
                  </View>
                )}

                {/* 状态面板 */}
                {health && (
                  <InfoCard headerColor="#1D3B6C" title="当前身体状况" emoji="💊">
                    <View style={{ gap: 14 }}>
                      <GaugeBar
                        value={health.health} color="#C82829" label="健康值"
                        sublabel={`月度净变化 ${totalMonthlyHealthDelta >= 0 ? '+' : ''}${totalMonthlyHealthDelta}/月`}
                      />
                      <GaugeBar
                        value={health.energy} color="#1D3B6C" label="精力值"
                        sublabel={`每日恢复 +${totalDailyEnergy}`}
                      />
                    </View>

                    {health.isOnLeave && (
                      <View style={{ backgroundColor: '#FFF0F0', borderWidth: 1, borderColor: '#F5B7B1', padding: 10, marginTop: 12, borderRadius: 2 }}>
                        <Text style={{ fontSize: 12, color: '#C82829', textAlign: 'center', fontWeight: '600' }}>
                          ⚕️ 因病休假中，无法处理公务
                          {health.leaveEndDay ? `（第 ${health.leaveEndDay} 天结束）` : ''}
                        </Text>
                      </View>
                    )}
                    {health.health < 30 && !health.isOnLeave && (
                      <View style={{ backgroundColor: '#FFF8EE', borderWidth: 1, borderColor: '#F5B041', padding: 10, marginTop: 10, borderRadius: 2 }}>
                        <Text style={{ fontSize: 11, color: '#875A12', lineHeight: 16 }}>
                          ⚠️ 健康值过低！工作效率下降20%。继续高强度工作将触发强制休假（7天）。
                        </Text>
                      </View>
                    )}
                    {health.energy < 30 && (
                      <View style={{ backgroundColor: '#FFFBF0', borderWidth: 1, borderColor: '#F5B041', padding: 10, marginTop: 10, borderRadius: 2 }}>
                        <Text style={{ fontSize: 11, color: '#875A12', lineHeight: 16 }}>
                          😴 精力严重不足！处理事件将额外消耗健康值，建议尽快休假恢复。
                        </Text>
                      </View>
                    )}
                  </InfoCard>
                )}

                {/* 月度健康加成明细 */}
                <InfoCard headerColor="#2a5a3e" title="月度健康变化明细" emoji="📊">
                  <Text style={{ fontSize: 10, color: '#888', marginBottom: 8 }}>每推进一个游戏月，健康值自动结算一次</Text>
                  <DetailRow label={`${medicalTier?.emoji ?? '🏥'} 医疗保健基础（${medicalTier?.tier ?? ''}）`} value={rankHealthBase} sign="+" color="#2a5a3e" />
                  {assetHealthBonus > 0 && (
                    <DetailRow label="资产环境加成（住房/健检/健身）" value={assetHealthBonus} sign="+" color="#1D3B6C" />
                  )}
                  {agePenalty > 0 && (
                    <DetailRow label={`年龄衰减（${playerAge}岁，每超50岁+5年 -1）`} value={agePenalty} sign="-" color="#C05521" />
                  )}
                  {fatiguePenalty > 0 && (
                    <DetailRow label="疲劳惩罚（精力过低）" value={fatiguePenalty} sign="-" color="#C82829" />
                  )}
                  <Divider />
                  <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', backgroundColor: totalMonthlyHealthDelta >= 0 ? '#F0F8F4' : '#FFF5F5', padding: 8, borderRadius: 2 }}>
                    <Text style={{ fontSize: 11, fontWeight: '700', color: '#1A1A1A' }}>月净变化</Text>
                    <Text style={{ fontSize: 15, fontWeight: '800', color: totalMonthlyHealthDelta >= 0 ? '#2a5a3e' : '#C82829', fontFamily: 'monospace' }}>
                      {totalMonthlyHealthDelta >= 0 ? '+' : ''}{totalMonthlyHealthDelta}
                    </Text>
                  </View>
                </InfoCard>

                {/* 精力恢复明细 */}
                <InfoCard headerColor="#2B4B6F" title="每日精力恢复明细" emoji="⚡">
                  <DetailRow label="基础自然恢复" value={5} sign="+" color="#2B4B6F" />
                  {rankEnergyBonus > 0 && (
                    <DetailRow label={`职级待遇加成（${save.rankLevel}级）`} value={rankEnergyBonus} sign="+" color="#1D3B6C" />
                  )}
                  {Math.round(assetEnergyBonus) > 0 && (
                    <DetailRow label="资产生活质量加成" value={Math.round(assetEnergyBonus)} sign="+" color="#7C3AED" />
                  )}
                  <Divider />
                  <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', backgroundColor: '#F0F4F8', padding: 8, borderRadius: 2 }}>
                    <Text style={{ fontSize: 11, fontWeight: '700', color: '#1A1A1A' }}>日恢复量</Text>
                    <Text style={{ fontSize: 15, fontWeight: '800', color: '#2B4B6F', fontFamily: 'monospace' }}>+{totalDailyEnergy}/天</Text>
                  </View>
                </InfoCard>

                {/* 医疗级别卡 */}
                {medicalTier && (
                  <InfoCard headerColor="#7C3AED" title="专属医疗保健配置" emoji={medicalTier.emoji}>
                    <View style={{ flexDirection: 'row', alignItems: 'flex-start', gap: 12 }}>
                      <Text style={{ fontSize: 32 }}>{medicalTier.emoji}</Text>
                      <View style={{ flex: 1, gap: 4 }}>
                        <Text style={{ fontSize: 13, fontWeight: '800', color: '#7C3AED' }}>{medicalTier.tier}</Text>
                        <Text style={{ fontSize: 10, color: '#555', lineHeight: 16 }}>{medicalTier.desc}</Text>
                      </View>
                    </View>
                    {rankLevel < 7 && (
                      <View style={{ backgroundColor: '#F5F0FF', padding: 8, borderRadius: 2, marginTop: 10 }}>
                        <Text style={{ fontSize: 10, color: '#7C3AED', lineHeight: 15 }}>
                          💡 晋升至副厅级（Rank 7）可享有市级专属保健医生，月度健康恢复+6
                        </Text>
                      </View>
                    )}
                  </InfoCard>
                )}

                {/* 恢复操作 */}
                <InfoCard headerColor="#1A1A1A" title="主动恢复操作" emoji="🔋">
                  <View style={{ gap: 10 }}>
                    {/* 休假 */}
                    <Pressable
                      onPress={() => !health?.isOnLeave && setConfirmRestore('rest')}
                      style={{
                        borderWidth: 1, borderColor: '#2a5a3e', borderRadius: 2, padding: 12,
                        flexDirection: 'row', alignItems: 'center', gap: 12,
                        opacity: health?.isOnLeave ? 0.45 : 1,
                        backgroundColor: health?.isOnLeave ? '#F5F4F1' : '#F8FFF8',
                      }}
                      android_ripple={{ color: 'rgba(42,90,62,0.1)' }}>
                      <Text style={{ fontSize: 28 }}>🛌</Text>
                      <View style={{ flex: 1 }}>
                        <Text style={{ fontSize: 12, fontWeight: '700', color: '#2a5a3e' }}>居家休假</Text>
                        <Text style={{ fontSize: 9, color: '#888', marginTop: 2 }}>消耗 3 游戏天 · 健康 +10 · 精力 +30</Text>
                      </View>
                      <View style={{ backgroundColor: '#2a5a3e', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 2 }}>
                        <Text style={{ fontSize: 10, color: '#fff', fontWeight: '700' }}>立即休息</Text>
                      </View>
                    </Pressable>

                    {/* 锻炼 */}
                    <Pressable
                      onPress={() => !health?.isOnLeave && setConfirmRestore('exercise')}
                      style={{
                        borderWidth: 1, borderColor: '#1D3B6C', borderRadius: 2, padding: 12,
                        flexDirection: 'row', alignItems: 'center', gap: 12,
                        opacity: health?.isOnLeave ? 0.45 : 1,
                        backgroundColor: health?.isOnLeave ? '#F5F4F1' : '#F0F4FF',
                      }}
                      android_ripple={{ color: 'rgba(29,59,108,0.1)' }}>
                      <Text style={{ fontSize: 28 }}>🏃</Text>
                      <View style={{ flex: 1 }}>
                        <Text style={{ fontSize: 12, fontWeight: '700', color: '#1D3B6C' }}>坚持锻炼</Text>
                        <Text style={{ fontSize: 9, color: '#888', marginTop: 2 }}>消耗 1 游戏天 · 健康 +5 · 精力 +10</Text>
                      </View>
                      <View style={{ backgroundColor: '#1D3B6C', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 2 }}>
                        <Text style={{ fontSize: 10, color: '#fff', fontWeight: '700' }}>去锻炼</Text>
                      </View>
                    </Pressable>

                    {/* 疗养（厅级及以上） */}
                    {rankLevel >= 7 ? (
                      <Pressable
                        onPress={() => !health?.isOnLeave && setConfirmRestore('sanatorium')}
                        style={{
                          borderWidth: 1, borderColor: '#7B3F00', borderRadius: 2, padding: 12,
                          flexDirection: 'row', alignItems: 'center', gap: 12,
                          opacity: health?.isOnLeave ? 0.45 : 1,
                          backgroundColor: health?.isOnLeave ? '#F5F4F1' : '#FFF8F0',
                        }}
                        android_ripple={{ color: 'rgba(123,63,0,0.1)' }}>
                        <Text style={{ fontSize: 28 }}>🏖️</Text>
                        <View style={{ flex: 1 }}>
                          <Text style={{ fontSize: 12, fontWeight: '700', color: '#7B3F00' }}>干部疗养</Text>
                          <Text style={{ fontSize: 9, color: '#888', marginTop: 2 }}>消耗 7 游戏天 · 健康 +25 · 精力 +50</Text>
                          <Text style={{ fontSize: 9, color: '#7B3F00', marginTop: 1 }}>仅厅级及以上干部享有</Text>
                        </View>
                        <View style={{ backgroundColor: '#7B3F00', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 2 }}>
                          <Text style={{ fontSize: 10, color: '#fff', fontWeight: '700' }}>预约疗养</Text>
                        </View>
                      </Pressable>
                    ) : (
                      <View style={{ borderWidth: 1, borderColor: '#E8E5E0', borderStyle: 'dashed', borderRadius: 2, padding: 12, flexDirection: 'row', alignItems: 'center', gap: 10 }}>
                        <Text style={{ fontSize: 24, opacity: 0.4 }}>🏖️</Text>
                        <View style={{ flex: 1 }}>
                          <Text style={{ fontSize: 11, color: '#bbb', fontWeight: '600' }}>干部疗养（锁定）</Text>
                          <Text style={{ fontSize: 9, color: '#ccc', marginTop: 2 }}>晋升至副厅级（Rank 7）解锁，健康+25 精力+50</Text>
                        </View>
                      </View>
                    )}
                  </View>
                </InfoCard>

                {/* 健康系统说明 */}
                <InfoCard headerColor="#555" title="健康系统说明" emoji="📖">
                  <View style={{ gap: 4 }}>
                    {[
                      '精力每天自然恢复（基础5点 + 职级加成），处理事件/开会消耗精力',
                      '精力耗尽后，继续工作将额外消耗健康值',
                      '每推进一个月，按职级医疗保健等级自动恢复健康',
                      '健康值低于30时，所有工作效率降低20%',
                      '健康值降至20以下，强制触发7天「因病休假」，休假期间健康自动恢复至50',
                      '年龄超过50岁后，月度健康衰减加速（每增5岁多衰减1点）',
                      '购置健身房会员、高档住宅、定期体检等资产可提升月度健康恢复量',
                    ].map((tip, i) => (
                      <Text key={i} style={{ fontSize: 10, color: '#888', lineHeight: 16 }}>
                        • {tip}
                      </Text>
                    ))}
                  </View>
                </InfoCard>
              </>
            )}

            {/* ════════════════ 党校培训 Tab ════════════════ */}
            {tab === 'train' && (
              <>
                {/* 名额状态 */}
                {quota && (
                  <View style={{
                    backgroundColor: '#EEF4FF', borderWidth: 1, borderColor: '#B8CCF0', padding: 12, borderRadius: 2,
                    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
                  }}>
                    <View>
                      <Text style={{ fontSize: 11, color: '#2B4B6F', fontWeight: '700' }}>本年度培训名额</Text>
                      <Text style={{ fontSize: 10, color: '#5577AA', marginTop: 2 }}>
                        第 {gameYear} 年 · 已用 {quota.usedCount}/{quota.quotaLimit}
                      </Text>
                    </View>
                    <View style={{ flexDirection: 'row', gap: 5 }}>
                      {Array.from({ length: quota.quotaLimit }).map((_, i) => (
                        <View key={i} style={{
                          width: 18, height: 18, borderRadius: 9,
                          backgroundColor: i < quota.usedCount ? '#C82829' : '#1D3B6C',
                          alignItems: 'center', justifyContent: 'center',
                        }}>
                          <Text style={{ fontSize: 8, color: '#fff', fontWeight: '700' }}>{i < quota.usedCount ? '✓' : String(i + 1)}</Text>
                        </View>
                      ))}
                    </View>
                  </View>
                )}

                {/* 反馈 */}
                {!!trainFeedback && (
                  <View style={{
                    backgroundColor: trainFeedback.startsWith('✅') ? '#F0FFF0' : '#FFF0F0',
                    borderWidth: 1, borderColor: trainFeedback.startsWith('✅') ? '#7BAD7E' : '#F5B7B1',
                    padding: 12, borderRadius: 2,
                  }}>
                    <Text style={{ fontSize: 12, color: trainFeedback.startsWith('✅') ? '#2a5a3e' : '#C82829', textAlign: 'center' }}>
                      {trainFeedback}
                    </Text>
                  </View>
                )}

                {/* 培训课程卡 */}
                {LEVEL_ORDER.map(level => {
                  const cfg = PARTY_SCHOOL_CONFIG[level];
                  const canApply = (save.rankLevel >= cfg.minRank) && (quota ? quota.usedCount < quota.quotaLimit : false);
                  const activeRecord = records.find(r => r.trainLevel === level && !r.isComplete);
                  const doneRecord = completedRecords.find(r => r.trainLevel === level);
                  const locked = save.rankLevel < cfg.minRank;
                  return (
                    <View key={level} style={{
                      backgroundColor: '#fff', borderWidth: 1, borderColor: locked ? '#E8E5E0' : '#D9D9D9',
                      borderRadius: 2, overflow: 'hidden',
                      opacity: locked ? 0.65 : 1,
                    }}>
                      {/* 卡头 */}
                      <View style={{ backgroundColor: locked ? '#888' : cfg.color, padding: 11, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                        <View style={{ flex: 1, gap: 2 }}>
                          <Text style={{ color: '#fff', fontSize: 13, fontWeight: '800' }}>
                            {cfg.label} · {cfg.schoolName}
                          </Text>
                          <Text style={{ color: 'rgba(255,255,255,0.75)', fontSize: 9 }}>{cfg.fullName}</Text>
                          <Text style={{ color: 'rgba(255,255,255,0.65)', fontSize: 9, marginTop: 1 }}>
                            最低 Rank {cfg.minRank} · 培训 {cfg.durationDays} 天 · 消耗 {cfg.costResource} 政治资源
                          </Text>
                        </View>
                        <View style={{ gap: 3, alignItems: 'flex-end' }}>
                          {activeRecord && (
                            <View style={{ backgroundColor: 'rgba(255,255,255,0.25)', paddingHorizontal: 7, paddingVertical: 3, borderRadius: 2 }}>
                              <Text style={{ color: '#fff', fontSize: 9, fontWeight: '700' }}>培训中</Text>
                            </View>
                          )}
                          {doneRecord && (
                            <View style={{ backgroundColor: 'rgba(255,255,255,0.2)', paddingHorizontal: 7, paddingVertical: 3, borderRadius: 2 }}>
                              <Text style={{ color: '#fff', fontSize: 9 }}>✓ 已完成</Text>
                            </View>
                          )}
                        </View>
                      </View>

                      {/* 卡体 */}
                      <View style={{ padding: 12, gap: 10 }}>
                        <Text style={{ fontSize: 10, color: '#555', lineHeight: 15 }}>{cfg.desc}</Text>

                        {/* 效果标签 */}
                        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 5 }}>
                          <View style={{ backgroundColor: '#F0FFF0', paddingHorizontal: 7, paddingVertical: 3, borderWidth: 1, borderColor: '#7BAD7E', borderRadius: 2 }}>
                            <Text style={{ fontSize: 9, color: '#2a5a3e', fontWeight: '600' }}>能力 +{cfg.abilityBonus}</Text>
                          </View>
                          <View style={{ backgroundColor: '#F0F4FF', paddingHorizontal: 7, paddingVertical: 3, borderWidth: 1, borderColor: '#B8CCF0', borderRadius: 2 }}>
                            <Text style={{ fontSize: 9, color: '#1D3B6C', fontWeight: '600' }}>忠诚 +{cfg.loyaltyBonus}</Text>
                          </View>
                          {cfg.promoteBonus > 0 && (
                            <View style={{ backgroundColor: '#FFF8EE', paddingHorizontal: 7, paddingVertical: 3, borderWidth: 1, borderColor: '#F5B041', borderRadius: 2 }}>
                              <Text style={{ fontSize: 9, color: '#875A12', fontWeight: '600' }}>晋升分 +{cfg.promoteBonus}</Text>
                            </View>
                          )}
                          {cfg.networkBonus > 0 && (
                            <View style={{ backgroundColor: '#FFF0F8', paddingHorizontal: 7, paddingVertical: 3, borderWidth: 1, borderColor: '#F5B7E0', borderRadius: 2 }}>
                              <Text style={{ fontSize: 9, color: '#8B1A5E', fontWeight: '600' }}>上司好感 +{cfg.networkBonus}</Text>
                            </View>
                          )}
                          <View style={{ backgroundColor: '#F8F8F8', paddingHorizontal: 7, paddingVertical: 3, borderWidth: 1, borderColor: '#DDD', borderRadius: 2 }}>
                            <Text style={{ fontSize: 9, color: '#555' }}>📜 {cfg.certName}</Text>
                          </View>
                        </View>

                        {/* 按钮区 */}
                        {confirmTrain === level ? (
                          <View style={{ flexDirection: 'row', gap: 8 }}>
                            <Pressable onPress={() => setConfirmTrain(null)}
                              style={{ flex: 1, borderWidth: 1, borderColor: '#DDD', padding: 10, alignItems: 'center', borderRadius: 2 }}>
                              <Text style={{ fontSize: 12, color: '#888' }}>取消</Text>
                            </Pressable>
                            <Pressable onPress={() => void handleTrain(level)}
                              style={{ flex: 2, backgroundColor: cfg.color, padding: 10, alignItems: 'center', borderRadius: 2 }}>
                              <Text style={{ fontSize: 12, color: '#fff', fontWeight: '700' }}>
                                确认报名（扣 {cfg.costResource} 资源）
                              </Text>
                            </Pressable>
                          </View>
                        ) : (
                          <Pressable
                            onPress={() => canApply && !activeRecord ? setConfirmTrain(level) : undefined}
                            style={{
                              backgroundColor: canApply && !activeRecord ? cfg.color : '#E8E5E0',
                              padding: 10, alignItems: 'center', borderRadius: 2,
                            }}
                            android_ripple={{ color: 'rgba(0,0,0,0.12)' }}>
                            <Text style={{ fontSize: 12, color: canApply && !activeRecord ? '#fff' : '#AAA', fontWeight: '600' }}>
                              {activeRecord
                                ? `培训进行中（${activeRecord.startGameDay} → ${activeRecord.endGameDay} 天）`
                                : locked
                                  ? `🔒 需达到 Rank ${cfg.minRank}`
                                  : !canApply ? '今年名额已用完'
                                  : '申报参加培训'}
                            </Text>
                          </Pressable>
                        )}
                      </View>
                    </View>
                  );
                })}

                {/* 结业证书墙 */}
                {completedRecords.length > 0 && (
                  <InfoCard headerColor="#7B3F00" title={`结业证书（${completedRecords.length} 枚）`} emoji="🏅">
                    <View style={{ gap: 8 }}>
                      {completedRecords.map(r => {
                        const cfg = PARTY_SCHOOL_CONFIG[r.trainLevel];
                        return (
                          <View key={r.id} style={{
                            flexDirection: 'row', alignItems: 'center', gap: 10,
                            backgroundColor: '#FFFBF4', padding: 10, borderRadius: 2,
                            borderLeftWidth: 3, borderLeftColor: cfg?.color ?? '#7B3F00',
                          }}>
                            <Text style={{ fontSize: 22 }}>📜</Text>
                            <View style={{ flex: 1 }}>
                              <Text style={{ fontSize: 11, fontWeight: '700', color: '#1A1A1A' }}>{r.certName}</Text>
                              <Text style={{ fontSize: 9, color: '#888', marginTop: 2 }}>
                                第 {Math.floor(r.endGameDay / 365) + 1} 年结业 · 能力+{r.abilityBonus} 忠诚+{r.loyaltyBonus}
                                {r.promoteBonus > 0 ? ` 晋升分+${r.promoteBonus}` : ''}
                                {r.networkBonus > 0 ? ` 人脉+${r.networkBonus}` : ''}
                              </Text>
                            </View>
                            <View style={{ backgroundColor: cfg?.color ?? '#7B3F00', paddingHorizontal: 5, paddingVertical: 2, borderRadius: 2 }}>
                              <Text style={{ fontSize: 8, color: '#fff', fontWeight: '700' }}>{cfg?.label ?? ''}</Text>
                            </View>
                          </View>
                        );
                      })}
                    </View>
                  </InfoCard>
                )}

                {/* 培训说明 */}
                <InfoCard headerColor="#555" title="党校培训制度说明" emoji="📖">
                  <View style={{ gap: 4 }}>
                    {[
                      '党校培训是干部晋升的重要资质，完成后直接提升能力、忠诚度与晋升评分',
                      '高级班（省委党校、中央党校）可建立跨地区干部人脉，提升上司好感度',
                      '每年培训名额有限，职级越高名额越多（科级2个/县级3个/厅级4个/部级5个）',
                      '县委党校科级班就近参加，耗时短；中央党校高级班耗时长但效果显著',
                      '中央党校（国家行政学院）研修班为正部级及以上最高培训规格，仅限极少数干部',
                      '培训期间计入游戏天数，请合理规划；在职培训不影响日常工作推进',
                    ].map((tip, i) => (
                      <Text key={i} style={{ fontSize: 10, color: '#888', lineHeight: 16 }}>• {tip}</Text>
                    ))}
                  </View>
                </InfoCard>
              </>
            )}

            <View style={{ height: 32 }} />
          </View>
        </ScrollView>
      )}

      {/* ── 操作确认弹窗 ── */}
      {confirmRestore && (
        <View style={{
          position: 'absolute', top: 0, left: 0, right: 0, bottom: 0,
          backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', alignItems: 'center',
          paddingHorizontal: 24,
        }}>
          <View style={{ backgroundColor: '#fff', borderRadius: 2, overflow: 'hidden', width: '100%', maxWidth: 380 }}>
            <View style={{ backgroundColor: '#1A1A1A', paddingHorizontal: 16, paddingVertical: 12 }}>
              <Text style={{ color: '#fff', fontSize: 13, fontWeight: '700', letterSpacing: 2 }}>确认操作</Text>
            </View>
            <View style={{ padding: 16 }}>
              {confirmRestore === 'rest' && (
                <>
                  <Text style={{ fontSize: 14, fontWeight: '700', color: '#1A1A1A', marginBottom: 6 }}>🛌 居家休假</Text>
                  <Text style={{ fontSize: 12, color: '#555', lineHeight: 18 }}>
                    休假 3 个游戏天，健康 +10，精力 +30。{'\n'}休假期间不推进工作日程，请确认。
                  </Text>
                </>
              )}
              {confirmRestore === 'exercise' && (
                <>
                  <Text style={{ fontSize: 14, fontWeight: '700', color: '#1A1A1A', marginBottom: 6 }}>🏃 坚持锻炼</Text>
                  <Text style={{ fontSize: 12, color: '#555', lineHeight: 18 }}>
                    消耗 1 个游戏天，健康 +5，精力 +10。{'\n'}养成锻炼习惯有助于长期健康管理。
                  </Text>
                </>
              )}
              {confirmRestore === 'sanatorium' && (
                <>
                  <Text style={{ fontSize: 14, fontWeight: '700', color: '#1A1A1A', marginBottom: 6 }}>🏖️ 干部疗养</Text>
                  <Text style={{ fontSize: 12, color: '#555', lineHeight: 18 }}>
                    疗养 7 个游戏天，健康 +25，精力 +50。{'\n'}仅厅级及以上干部享有此待遇，效果显著。
                  </Text>
                </>
              )}
            </View>
            <View style={{ flexDirection: 'row', borderTopWidth: 1, borderTopColor: '#F0EDE8' }}>
              <Pressable
                onPress={() => setConfirmRestore(null)}
                style={{ flex: 1, paddingVertical: 13, alignItems: 'center', borderRightWidth: 1, borderRightColor: '#F0EDE8' }}
                android_ripple={{ color: 'rgba(0,0,0,0.08)' }}>
                <Text style={{ fontSize: 13, color: '#888' }}>取消</Text>
              </Pressable>
              <Pressable
                onPress={() => void handleRestore(confirmRestore)}
                style={{ flex: 1, paddingVertical: 13, alignItems: 'center', backgroundColor: '#1D3B6C' }}
                android_ripple={{ color: 'rgba(255,255,255,0.2)' }}>
                <Text style={{ fontSize: 13, fontWeight: '700', color: '#fff' }}>确认执行</Text>
              </Pressable>
            </View>
          </View>
        </View>
      )}
    </View>
  );
}

