// 管辖区域页面 - 含汇总面板、排行榜、全区普查、发展等级标签、冷却时间、特色发展
import { useState, useCallback } from 'react';
import { ActivityIndicator, Pressable, ScrollView, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { useRouter, useFocusEffect } from 'expo-router';
import { useGame } from '@/ctx/GameContext';
import { getGoverningAreas, initGoverningAreas, investArea, visitArea } from '@/db/gameApi';
import { generateAreas, AREA_TYPE_LABEL } from '@/types/game';
import type { GoverningArea } from '@/types/game';

function getAreaTier(rankLevel: number): GoverningArea['areaType'] {
  if (rankLevel <= 3) return 'village';
  if (rankLevel <= 6) return 'town';
  if (rankLevel <= 9) return 'district';
  return 'city_level';
}

function getDevLevelLabel(devIndex: number): { label: string; color: string; bg: string } {
  if (devIndex >= 80) return { label: '先进', color: '#fff', bg: '#2a7a3b' };
  if (devIndex >= 60) return { label: '良好', color: '#fff', bg: '#2B4B6F' };
  if (devIndex >= 40) return { label: '一般', color: '#fff', bg: '#e67e22' };
  return { label: '落后', color: '#fff', bg: '#C82829' };
}

/** 冷却剩余天数（30天冷却） */
function cooldownLeft(lastDay: number, currentDay: number, cd = 30): number {
  return Math.max(0, cd - (currentDay - lastDay));
}

function IndexBar({ label, value, color = '#1D2D44' }: { label: string; value: number; color?: string }) {
  return (
    <View style={{ marginBottom: 6 }}>
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 3 }}>
        <Text style={{ fontSize: 10, color: '#666' }}>{label}</Text>
        <Text style={{ fontSize: 10, color, fontVariant: ['tabular-nums'], fontWeight: '600' }}>{value}</Text>
      </View>
      <View style={{ height: 3, backgroundColor: '#E8E8E5' }}>
        <View style={{ height: 3, width: `${value}%`, backgroundColor: color }} />
      </View>
    </View>
  );
}

function AreaCard({
  area, rank, gameDays, onInvest, onVisit, onInspect, onSpecial, loading,
}: {
  area: GoverningArea; rank: number; gameDays: number;
  onInvest: (id: string) => void;
  onVisit: (id: string) => void;
  onInspect: (id: string) => void;
  onSpecial: (id: string) => void;
  loading: string | null;
}) {
  const isLoading = loading === area.id;
  const devLevel = getDevLevelLabel(area.devIndex);
  const rankBadgeColor = rank === 1 ? '#C82829' : rank === 2 ? '#7a5c2a' : rank === 3 ? '#2B4B6F' : '#888';

  const investCd = cooldownLeft(area.lastInvestedDay, gameDays);
  const visitCd = cooldownLeft(area.lastVisitedDay, gameDays);
  const isLagging = area.devIndex < 40;

  return (
    <View style={{ backgroundColor: '#fff', borderWidth: 1, borderColor: isLagging ? '#ffcdd2' : '#D1D1D1', marginBottom: 10, padding: 14 }}>
      {/* 落后标记 */}
      {isLagging && (
        <View style={{ backgroundColor: '#ffebee', paddingHorizontal: 10, paddingVertical: 4, marginBottom: 8 }}>
          <Text style={{ fontSize: 10, color: '#C82829', fontWeight: '700' }}>⚠️ 落后辖区 — 建议优先投资扶持</Text>
        </View>
      )}
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 10 }}>
        <View style={{ flex: 1 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 4 }}>
            <View style={{ width: 20, height: 20, backgroundColor: rankBadgeColor, alignItems: 'center', justifyContent: 'center' }}>
              <Text style={{ color: '#fff', fontSize: 10, fontWeight: '700' }}>{rank}</Text>
            </View>
            <Text style={{ fontSize: 15, fontWeight: '700', color: '#1A1A1A' }}>{area.areaName}</Text>
            <View style={{ backgroundColor: devLevel.bg, paddingHorizontal: 6, paddingVertical: 2 }}>
              <Text style={{ color: devLevel.color, fontSize: 9, fontWeight: '700' }}>{devLevel.label}</Text>
            </View>
          </View>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
            <View style={{ borderWidth: 1, borderColor: '#D1D1D1', paddingHorizontal: 5, paddingVertical: 1 }}>
              <Text style={{ color: '#888', fontSize: 9 }}>{AREA_TYPE_LABEL[area.areaType]}</Text>
            </View>
            <Text style={{ fontSize: 9, color: '#aaa' }}>好感{area.favorIndex}</Text>
          </View>
        </View>
        <View style={{ alignItems: 'flex-end' }}>
          <Text style={{ fontSize: 10, color: '#888' }}>综合发展</Text>
          <Text style={{ fontSize: 22, fontWeight: '700', color: devLevel.bg, fontVariant: ['tabular-nums'] }}>
            {area.devIndex}
          </Text>
        </View>
      </View>

      <IndexBar label="发展指数" value={area.devIndex} color="#1D2D44" />
      <IndexBar label="群众好感" value={area.favorIndex} color="#2a7a3b" />

      {isLoading ? (
        <ActivityIndicator size="small" color="#1D2D44" style={{ marginTop: 10 }} />
      ) : (
        <View style={{ gap: 6, marginTop: 10 }}>
          <View style={{ flexDirection: 'row', gap: 8 }}>
            {/* 投资拨款 */}
            <Pressable
              onPress={() => onInvest(area.id)}
              disabled={investCd > 0}
              style={{ flex: 1, paddingVertical: 8, alignItems: 'center', backgroundColor: investCd > 0 ? '#E8E8E5' : '#1D2D44' }}
            >
              <Text style={{ color: investCd > 0 ? '#aaa' : '#fff', fontSize: 11, fontWeight: '700' }}>
                {investCd > 0 ? `投资（冷却${investCd}天）` : '投资拨款'}
              </Text>
              <Text style={{ color: investCd > 0 ? '#bbb' : '#aac0d8', fontSize: 9, marginTop: 2 }}>
                {investCd > 0 ? '— 冷却中 —' : '消耗20政绩 · 发展+8'}
              </Text>
            </Pressable>
            {/* 实地走访 */}
            <Pressable
              onPress={() => onVisit(area.id)}
              disabled={visitCd > 0}
              style={{ flex: 1, paddingVertical: 8, alignItems: 'center', borderWidth: 1, borderColor: visitCd > 0 ? '#ccc' : '#2a7a3b', backgroundColor: '#fff' }}
            >
              <Text style={{ color: visitCd > 0 ? '#aaa' : '#2a7a3b', fontSize: 11, fontWeight: '700' }}>
                {visitCd > 0 ? `走访（冷却${visitCd}天）` : '实地走访'}
              </Text>
              <Text style={{ color: '#888', fontSize: 9, marginTop: 2 }}>
                {visitCd > 0 ? '— 冷却中 —' : '好感+12 · +8政绩'}
              </Text>
            </Pressable>
          </View>
          <View style={{ flexDirection: 'row', gap: 8 }}>
            {/* 视察检查 */}
            <Pressable
              onPress={() => onInspect(area.id)}
              style={{ flex: 1, paddingVertical: 8, alignItems: 'center', borderWidth: 1, borderColor: '#C82829', backgroundColor: '#fff' }}
            >
              <Text style={{ color: '#C82829', fontSize: 11, fontWeight: '700' }}>视察检查</Text>
              <Text style={{ color: '#888', fontSize: 9, marginTop: 2 }}>发现问题+15政绩</Text>
            </Pressable>
            {/* 特色发展（落后辖区额外增益）*/}
            <Pressable
              onPress={() => onSpecial(area.id)}
              style={{ flex: 1, paddingVertical: 8, alignItems: 'center', backgroundColor: isLagging ? '#C82829' : '#7B5E2A' }}
            >
              <Text style={{ color: '#fff', fontSize: 11, fontWeight: '700' }}>
                {isLagging ? '精准帮扶' : '特色发展'}
              </Text>
              <Text style={{ color: 'rgba(255,255,255,0.7)', fontSize: 9, marginTop: 2 }}>
                {isLagging ? '消耗30政绩 · 发展+15' : '消耗25政绩 · 好感+15'}
              </Text>
            </Pressable>
          </View>
        </View>
      )}
    </View>
  );
}

export default function GoverningAreasScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { save, updateGameSave } = useGame();
  const [areas, setAreas] = useState<GoverningArea[]>([]);
  const [pageLoading, setPageLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [feedback, setFeedback] = useState('');
  const [feedbackOk, setFeedbackOk] = useState(true);
  const [surveying, setSurveying] = useState(false);
  const [sortMode, setSortMode] = useState<'rank' | 'lagging'>('rank');

  const rankLevel = save?.rankLevel ?? 1;
  const currentTier = getAreaTier(rankLevel);
  const gameDays = save?.gameDays ?? 0;

  const showFeedback = (msg: string, ok = true) => {
    setFeedback(msg);
    setFeedbackOk(ok);
    setTimeout(() => setFeedback(''), 3500);
  };

  useFocusEffect(
    useCallback(() => {
      if (!save) return;
      setPageLoading(true);
      getGoverningAreas(save.id).then(async list => {
        const needReinit = list.length === 0 || (list.length > 0 && list[0].areaType !== currentTier);
        if (needReinit) {
          const generated = generateAreas(rankLevel, save.cityName);
          await initGoverningAreas(save.id, save.userId, generated);
          const fresh = await getGoverningAreas(save.id);
          setAreas(fresh);
        } else {
          setAreas(list);
        }
        setPageLoading(false);
      });
    }, [save, rankLevel, currentTier])
  );

  const handleInvest = async (areaId: string) => {
    if (!save) return;
    const area = areas.find(a => a.id === areaId);
    if (!area) return;
    if (cooldownLeft(area.lastInvestedDay, gameDays) > 0) { showFeedback('投资冷却中，请等待30天', false); return; }
    if (save.meritPoints < 20) { showFeedback('政绩值不足（需20）', false); return; }
    setActionLoading(areaId);
    await investArea(areaId, 8);
    await updateGameSave({ meritPoints: save.meritPoints - 20 });
    const fresh = await getGoverningAreas(save.id);
    setAreas(fresh);
    setActionLoading(null);
    showFeedback(`✓ 向${area.areaName}拨款，发展指数+8`, true);
  };

  const handleVisit = async (areaId: string) => {
    if (!save) return;
    const area = areas.find(a => a.id === areaId);
    if (!area) return;
    if (cooldownLeft(area.lastVisitedDay, gameDays) > 0) { showFeedback('走访冷却中，请等待30天', false); return; }
    setActionLoading(areaId);
    await visitArea(areaId, gameDays, 12);
    await updateGameSave({ meritPoints: save.meritPoints + 8 });
    const fresh = await getGoverningAreas(save.id);
    setAreas(fresh);
    setActionLoading(null);
    showFeedback(`✓ 走访${area.areaName}完成，好感+12，获8政绩`, true);
  };

  const handleInspect = async (areaId: string) => {
    if (!save) return;
    const area = areas.find(a => a.id === areaId);
    const foundIssue = Math.random() < 0.5;
    setActionLoading(areaId);
    if (foundIssue) {
      // 视察发现问题：发展指数略降但政绩+好感大增
      await investArea(areaId, -3);
      await updateGameSave({ meritPoints: save.meritPoints + 15, bossFavor: Math.min(100, (save.bossFavor ?? 50) + 3) });
      showFeedback(`⚠️ 在${area?.areaName ?? '辖区'}发现违规问题，启动整改，政绩+15，上司好感+3`, true);
    } else {
      await updateGameSave({ meritPoints: save.meritPoints + 5 });
      showFeedback(`✓ ${area?.areaName ?? '辖区'}工作正常有序，获5政绩`, true);
    }
    const fresh = await getGoverningAreas(save.id);
    setAreas(fresh);
    setActionLoading(null);
  };

  /** 精准帮扶（落后辖区）/ 特色发展 */
  const handleSpecial = async (areaId: string) => {
    if (!save) return;
    const area = areas.find(a => a.id === areaId);
    if (!area) return;
    const isLagging = area.devIndex < 40;
    const cost = isLagging ? 30 : 25;
    if (save.meritPoints < cost) { showFeedback(`政绩不足（需${cost}）`, false); return; }
    setActionLoading(areaId);
    if (isLagging) {
      await investArea(areaId, 15);
      await updateGameSave({ meritPoints: save.meritPoints - cost });
      showFeedback(`✓ 精准帮扶${area.areaName}，发展指数+15`, true);
    } else {
      await visitArea(areaId, gameDays, 15);
      await updateGameSave({ meritPoints: save.meritPoints - cost });
      showFeedback(`✓ ${area.areaName}特色发展启动，好感+15`, true);
    }
    const fresh = await getGoverningAreas(save.id);
    setAreas(fresh);
    setActionLoading(null);
  };

  // 全区普查（消耗50政绩，全辖区发展+3，好感+5）
  const handleSurvey = async () => {
    if (!save) return;
    if (save.meritPoints < 50) { showFeedback('全区普查需50政绩（当前不足）', false); return; }
    setSurveying(true);
    // 并行处理所有辖区，减少等待时间
    await Promise.all(areas.flatMap(area => [
      investArea(area.id, 3),
      visitArea(area.id, gameDays, 5),
    ]));
    await updateGameSave({ meritPoints: save.meritPoints - 50 });
    const fresh = await getGoverningAreas(save.id);
    setAreas(fresh);
    setSurveying(false);
    showFeedback(`✓ 全区普查完成，全辖区发展+3，好感+5，消耗50政绩`, true);
  };

  // 汇总统计
  const avgDevIndex = areas.length > 0 ? Math.round(areas.reduce((s, a) => s + a.devIndex, 0) / areas.length) : 0;
  const avgFavor = areas.length > 0 ? Math.round(areas.reduce((s, a) => s + a.favorIndex, 0) / areas.length) : 0;
  const advancedCount = areas.filter(a => a.devIndex >= 80).length;
  const laggingCount = areas.filter(a => a.devIndex < 40).length;

  const rankedAreas = [...areas].sort((a, b) => b.devIndex - a.devIndex);
  const displayAreas = sortMode === 'lagging'
    ? [...areas].sort((a, b) => a.devIndex - b.devIndex)
    : rankedAreas;

  const tierDesc: Record<GoverningArea['areaType'], string> = {
    village: '村级管理：深入基层，走访群众，推动乡村振兴。',
    town: '乡镇管理：统筹乡镇发展，协调各村工作，推进项目落地。',
    district: '区县管理：推动城乡统筹，优化产业布局，提升整体竞争力。',
    city_level: '地级市管理：全面统筹辖区经济社会发展，做大做强城市影响力。',
  };

  return (
    <View style={{ flex: 1, backgroundColor: '#F5F4F1' }}>
      <StatusBar style="light" backgroundColor="#1D2D44" />

      {/* 顶栏 */}
      <View style={{ backgroundColor: '#1D2D44', paddingTop: insets.top + 8, paddingBottom: 14, paddingHorizontal: 16 }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 4 }}>
          <Pressable onPress={() => router.back()} style={{ marginRight: 12 }}>
            <Text style={{ color: '#ccc', fontSize: 22 }}>‹</Text>
          </Pressable>
          <View style={{ flex: 1 }}>
            <Text style={{ color: '#a0b4cc', fontSize: 10, letterSpacing: 2 }}>GOVERNING AREAS</Text>
            <Text style={{ color: '#fff', fontSize: 16, fontWeight: '700', letterSpacing: 1 }}>管辖区域</Text>
          </View>
          <Pressable
            onPress={() => void handleSurvey()}
            disabled={surveying}
            style={{ borderWidth: 1, borderColor: '#a0b4cc', paddingHorizontal: 10, paddingVertical: 5 }}
          >
            <Text style={{ color: '#a0b4cc', fontSize: 11, fontWeight: '700' }}>
              {surveying ? '普查中...' : '全区普查-50政'}
            </Text>
          </Pressable>
        </View>
        <Text style={{ color: '#a0b4cc', fontSize: 10 }}>
          {save?.rankName} · {save?.cityName} · {AREA_TYPE_LABEL[currentTier]} · 政绩余额 {save?.meritPoints ?? 0}
        </Text>
      </View>

      {feedback ? (
        <View style={{ backgroundColor: feedbackOk ? '#e8f5e9' : '#ffebee', borderBottomWidth: 1, borderBottomColor: feedbackOk ? '#c8e6c9' : '#ffcdd2', padding: 10 }}>
          <Text style={{ color: feedbackOk ? '#2a7a3b' : '#C82829', fontSize: 12, fontWeight: '600' }}>{feedback}</Text>
        </View>
      ) : null}

      {pageLoading ? (
        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
          <ActivityIndicator size="large" color="#1D2D44" />
          <Text style={{ color: '#888', marginTop: 12, fontSize: 13 }}>加载辖区数据...</Text>
        </View>
      ) : (
        <ScrollView contentContainerStyle={{ padding: 14, gap: 10 }} showsVerticalScrollIndicator={false}>

          {/* 汇总面板 */}
          <View style={{ backgroundColor: '#1D2D44', padding: 14 }}>
            <Text style={{ color: '#a0b4cc', fontSize: 10, letterSpacing: 2, marginBottom: 10 }}>辖区汇总</Text>
            <View style={{ flexDirection: 'row', gap: 0 }}>
              {[
                { label: '平均发展指数', value: avgDevIndex, color: avgDevIndex >= 60 ? '#81c784' : '#ef9a9a' },
                { label: '平均群众好感', value: avgFavor, color: '#90caf9' },
                { label: '辖区总数', value: areas.length, color: '#fff' },
              ].map((item, i) => (
                <View key={i} style={{ flex: 1, alignItems: 'center', borderRightWidth: i < 2 ? 1 : 0, borderRightColor: 'rgba(255,255,255,0.1)' }}>
                  <Text style={{ fontSize: 22, fontWeight: '700', color: item.color, fontVariant: ['tabular-nums'] }}>{item.value}</Text>
                  <Text style={{ fontSize: 9, color: '#a0b4cc', marginTop: 2, textAlign: 'center' }}>{item.label}</Text>
                </View>
              ))}
            </View>
            <View style={{ flexDirection: 'row', gap: 10, marginTop: 10 }}>
              <View style={{ flex: 1, backgroundColor: 'rgba(42,122,59,0.25)', padding: 8, alignItems: 'center' }}>
                <Text style={{ color: '#81c784', fontSize: 16, fontWeight: '700' }}>{advancedCount}</Text>
                <Text style={{ color: '#a0b4cc', fontSize: 9 }}>先进辖区(≥80)</Text>
              </View>
              <View style={{ flex: 1, backgroundColor: 'rgba(200,40,41,0.25)', padding: 8, alignItems: 'center' }}>
                <Text style={{ color: '#ef9a9a', fontSize: 16, fontWeight: '700' }}>{laggingCount}</Text>
                <Text style={{ color: '#a0b4cc', fontSize: 9 }}>落后辖区(&lt;40)</Text>
              </View>
              <Pressable
                onPress={() => setSortMode(m => m === 'rank' ? 'lagging' : 'rank')}
                style={{ flex: 1, backgroundColor: 'rgba(255,255,255,0.08)', padding: 8, alignItems: 'center', justifyContent: 'center' }}
              >
                <Text style={{ color: '#fff', fontSize: 11, fontWeight: '700' }}>
                  {sortMode === 'rank' ? '📉 看落后' : '📈 看排行'}
                </Text>
                <Text style={{ color: '#a0b4cc', fontSize: 9, marginTop: 2 }}>切换排序</Text>
              </Pressable>
            </View>
          </View>

          {/* 排行榜（前3）*/}
          <View style={{ backgroundColor: '#fff', borderWidth: 1, borderColor: '#D1D1D1', padding: 14 }}>
            <Text style={{ fontSize: 11, color: '#2B4B6F', fontWeight: '700', letterSpacing: 2, marginBottom: 10 }}>发展排行榜 TOP 3</Text>
            {rankedAreas.slice(0, 3).map((area, i) => {
              const devLevel = getDevLevelLabel(area.devIndex);
              const medalColors = ['#C82829', '#7a5c2a', '#2B4B6F'];
              return (
                <View key={area.id} style={{ flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 8, borderBottomWidth: i < 2 ? 1 : 0, borderBottomColor: '#F0EEEA' }}>
                  <View style={{ width: 24, height: 24, backgroundColor: medalColors[i], alignItems: 'center', justifyContent: 'center' }}>
                    <Text style={{ color: '#fff', fontSize: 11, fontWeight: '700' }}>{i + 1}</Text>
                  </View>
                  <Text style={{ flex: 1, fontSize: 13, color: '#222', fontWeight: '600' }}>{area.areaName}</Text>
                  <View style={{ backgroundColor: devLevel.bg, paddingHorizontal: 6, paddingVertical: 2 }}>
                    <Text style={{ color: '#fff', fontSize: 9, fontWeight: '700' }}>{devLevel.label}</Text>
                  </View>
                  <Text style={{ fontSize: 14, fontWeight: '700', color: devLevel.bg, fontVariant: ['tabular-nums'], minWidth: 30, textAlign: 'right' }}>
                    {area.devIndex}
                  </Text>
                </View>
              );
            })}
          </View>

          {/* 辖区描述 */}
          <View style={{ backgroundColor: '#EEF2F7', borderWidth: 1, borderColor: '#D0DCE8', padding: 12 }}>
            <Text style={{ fontSize: 11, color: '#1D2D44', lineHeight: 18 }}>
              {tierDesc[currentTier]}共{areas.length}个{AREA_TYPE_LABEL[currentTier]}。
              投资/走访有30天冷却，视察随机触发整改，精准帮扶可加速落后辖区发展。
            </Text>
          </View>

          {/* 辖区列表 */}
          {displayAreas.map((area, idx) => (
            <AreaCard
              key={area.id}
              area={area}
              rank={sortMode === 'rank' ? idx + 1 : rankedAreas.findIndex(a => a.id === area.id) + 1}
              gameDays={gameDays}
              onInvest={handleInvest}
              onVisit={handleVisit}
              onInspect={handleInspect}
              onSpecial={handleSpecial}
              loading={actionLoading}
            />
          ))}

          <View style={{ height: 20 }} />
        </ScrollView>
      )}
    </View>
  );
}
