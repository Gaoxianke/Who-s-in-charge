// 民心修行 - 主页面
// 路由：/(app)/popular-support
// 四个分页：民心总览 / 亲民为民 / 民生实事 / 顺应民意
import { useState, useCallback } from 'react';
import {
  View, Text, ScrollView, Pressable, ActivityIndicator,
  RefreshControl,
} from 'react-native';
import { useFocusEffect, useRouter } from 'expo-router';
import type { RelativePathString } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { useGame } from '@/ctx/GameContext';
import { getRankTheme } from '@/lib/rankTheme';
import { getConfigsByCategory } from '@/lib/gameplayConfig';
import { executePopularAction } from '@/lib/gameplayApi';
import type { GameplayConfig, PopularLogEntry } from '@/types/game';

// ── 民心评级档位（严格按文档：5档）──
function getRating(v: number): { label: string; color: string; desc: string } {
  if (v >= 80) return { label: '甲等', color: '#16a34a', desc: '民心所向' };
  if (v >= 60) return { label: '乙等', color: '#2563eb', desc: '深得民心' };
  if (v >= 40) return { label: '丙等', color: '#d97706', desc: '民意尚可' };
  if (v >= 20) return { label: '丁等', color: '#dc2626', desc: '民心涣散' };
  return { label: '戊等', color: '#7f1d1d', desc: '失去民心' };
}

// 续任/晋升投票加成说明（文档规定）
function getVoteBonus(v: number): { text: string; color: string } {
  if (v >= 80) return { text: '续任投票 +5', color: '#16a34a' };
  if (v >= 60) return { text: '续任投票 +3', color: '#2563eb' };
  if (v >= 40) return { text: '续任投票 +1', color: '#d97706' };
  return { text: '续任投票 -2 ⚠️', color: '#dc2626' };
}

// ── 4个分页配置 ──
const TABS = [
  { key: 'overview', label: '民心总览' },
  { key: 'tab2', label: '亲民为民' },
  { key: 'tab3', label: '民生实事' },
  { key: 'tab4', label: '顺应民意' },
] as const;

// 按 Tab 分配 17 个动作（sort 字段对应文档顺序）
const TAB_SORT: Record<string, number[]> = {
  tab2: [1, 2, 3, 4, 5, 6],
  tab3: [7, 8, 9, 10, 11, 12],
  tab4: [13, 14, 15, 16, 17],
};

// ── 单个动作卡片 ──
interface ActionCardProps {
  config: GameplayConfig;
  rankLevel: number;
  gameDays: number;
  cooldowns: Record<string, number>;
  onExecute: (actionId: string) => void;
  executing: string | null;
  theme: ReturnType<typeof getRankTheme>;
}

function ActionCard({ config, rankLevel, gameDays, cooldowns, onExecute, executing, theme }: ActionCardProps) {
  const isUnlocked = rankLevel >= config.unlockRank;
  const cooldownEnd = cooldowns[config.id] ?? 0;
  const remainDays = Math.max(0, cooldownEnd - gameDays);
  const isOnCooldown = remainDays > 0;
  const canExecute = isUnlocked && !isOnCooldown && executing !== config.id;
  const p = config.params;

  // 构建副效果标签
  const effects: string[] = [];
  if (p.livelihoodGain) effects.push(`民生+${p.livelihoodGain}`);
  if (p.meritGain) effects.push(`功绩+${p.meritGain}`);
  if (p.riskReduction) effects.push(`廉政风险-${p.riskReduction}`);
  if (p.opinionReduction) effects.push(`舆情-${p.opinionReduction}`);
  if (p.teamIntegrityGain) effects.push(`班子廉洁+${p.teamIntegrityGain}`);

  return (
    <View style={{
      backgroundColor: theme.cardBg,
      borderWidth: 1,
      borderColor: isUnlocked ? theme.cardBorder : theme.cardBorder + '55',
      borderRadius: 8,
      marginBottom: 10,
      opacity: isUnlocked ? 1 : 0.55,
      overflow: 'hidden',
    }}>
      {/* 顶栏 */}
      <View style={{ flexDirection: 'row', alignItems: 'center', padding: 10, paddingBottom: 6, gap: 8 }}>
        <Text style={{ fontSize: 22 }}>{config.icon}</Text>
        <View style={{ flex: 1 }}>
          <Text style={{ fontSize: 14, fontWeight: '700', color: theme.headerText }}>{config.name}</Text>
          <Text style={{ fontSize: 11, color: theme.mutedText, marginTop: 1 }}>{p.desc}</Text>
        </View>
        {/* 解锁等级徽章 */}
        <View style={{
          backgroundColor: isUnlocked ? theme.primary + '22' : theme.cardBorder + '44',
          borderRadius: 4, paddingHorizontal: 6, paddingVertical: 2,
        }}>
          <Text style={{ fontSize: 10, color: isUnlocked ? theme.primary : theme.mutedText, fontWeight: '600' }}>
            {isUnlocked ? `已解锁` : `${config.unlockRank}级解锁`}
          </Text>
        </View>
      </View>

      {/* 数值区 */}
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6, paddingHorizontal: 10, paddingBottom: 8 }}>
        <View style={{ backgroundColor: '#16a34a22', borderRadius: 4, paddingHorizontal: 8, paddingVertical: 3 }}>
          <Text style={{ fontSize: 12, color: '#16a34a', fontWeight: '700' }}>民心 +{p.popularGain}</Text>
        </View>
        {effects.map((e) => (
          <View key={e} style={{ backgroundColor: theme.primary + '18', borderRadius: 4, paddingHorizontal: 8, paddingVertical: 3 }}>
            <Text style={{ fontSize: 12, color: theme.primary, fontWeight: '600' }}>{e}</Text>
          </View>
        ))}
        <View style={{ backgroundColor: theme.cardBorder + '44', borderRadius: 4, paddingHorizontal: 8, paddingVertical: 3 }}>
          <Text style={{ fontSize: 11, color: theme.mutedText }}>冷却 {p.cooldown}天</Text>
        </View>
      </View>

      {/* 按钮区 */}
      <View style={{ borderTopWidth: 1, borderTopColor: theme.cardBorder, paddingHorizontal: 10, paddingVertical: 8, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
        {isOnCooldown ? (
          <Text style={{ fontSize: 12, color: theme.mutedText }}>⏳ 冷却中，还需 <Text style={{ color: theme.primary, fontWeight: '700' }}>{remainDays}</Text> 天</Text>
        ) : !isUnlocked ? (
          <Text style={{ fontSize: 12, color: theme.mutedText }}>🔒 需要达到 {config.unlockRank} 级</Text>
        ) : (
          <Text style={{ fontSize: 12, color: '#16a34a' }}>✓ 可执行</Text>
        )}
        <Pressable
          onPress={() => canExecute && onExecute(config.id)}
          style={{
            backgroundColor: canExecute ? theme.primary : theme.cardBorder,
            borderRadius: 6,
            paddingHorizontal: 14,
            paddingVertical: 6,
            opacity: canExecute ? 1 : 0.5,
          }}
        >
          {executing === config.id ? (
            <ActivityIndicator size="small" color="#fff" />
          ) : (
            <Text style={{ color: '#fff', fontSize: 12, fontWeight: '700' }}>
              {!isUnlocked ? '未解锁' : isOnCooldown ? '冷却中' : '执行'}
            </Text>
          )}
        </Pressable>
      </View>
    </View>
  );
}

// ── Tab 一：民心总览 ──
interface OverviewTabProps {
  popularSupport: number;
  moralValue: number;
  popularLog: PopularLogEntry[];
  rankLevel: number;
  gameDays: number;
  cooldowns: Record<string, number>;
  theme: ReturnType<typeof getRankTheme>;
}

function OverviewTab({ popularSupport, moralValue, popularLog, rankLevel, gameDays, cooldowns, theme }: OverviewTabProps) {
  const rating = getRating(popularSupport);
  const vote = getVoteBonus(popularSupport);
  const promotionOk = popularSupport >= 40;
  const allActions = getConfigsByCategory('popularity');

  // 统计可执行动作数（未锁定且不在冷却中）
  const availableCount = allActions.filter((a) => {
    if (rankLevel < a.unlockRank) return false;
    const end = cooldowns[a.id] ?? 0;
    return gameDays >= end;
  }).length;

  // 已解锁动作总数
  const unlockedCount = allActions.filter((a) => rankLevel >= a.unlockRank).length;

  // 最近10条记录
  const recentLog = [...popularLog].reverse().slice(0, 10);

  return (
    <View>
      {/* 民心值仪表 */}
      <View style={{
        backgroundColor: theme.cardBg, borderWidth: 1, borderColor: theme.cardBorder,
        borderTopWidth: 3, borderTopColor: rating.color,
        borderRadius: 8, padding: 16, marginBottom: 12,
      }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
          <Text style={{ fontSize: 14, fontWeight: '700', color: theme.headerText }}>当前民心值</Text>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
            <View style={{ backgroundColor: rating.color + '22', borderRadius: 4, paddingHorizontal: 8, paddingVertical: 3 }}>
              <Text style={{ color: rating.color, fontSize: 12, fontWeight: '700' }}>{rating.label} · {rating.desc}</Text>
            </View>
          </View>
        </View>
        {/* 进度条 */}
        <View style={{ height: 12, backgroundColor: theme.cardBorder + '66', borderRadius: 6, overflow: 'hidden', marginBottom: 8 }}>
          <View style={{ width: `${popularSupport}%`, height: '100%', backgroundColor: rating.color, borderRadius: 6 }} />
        </View>
        <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
          <Text style={{ fontSize: 22, fontWeight: '800', color: rating.color }}>{popularSupport}</Text>
          <Text style={{ fontSize: 11, color: theme.mutedText }}>满分 100</Text>
        </View>
      </View>

      {/* 民心操守（道德值）—— 接入民心修行体系 */}
      {(() => {
        const mColor = moralValue >= 60 ? '#2a7a3b' : moralValue >= 30 ? '#d97706' : '#dc2626';
        const mLabel = moralValue >= 80 ? '廉洁奉公' : moralValue >= 60 ? '清廉勤政' : moralValue >= 40 ? '中规中矩' : moralValue >= 20 ? '瑕不掩瑜' : '失德失范';
        return (
          <View style={{
            backgroundColor: theme.cardBg, borderWidth: 1, borderColor: theme.cardBorder,
            borderTopWidth: 3, borderTopColor: mColor,
            borderRadius: 8, padding: 16, marginBottom: 12,
          }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
              <Text style={{ fontSize: 14, fontWeight: '700', color: theme.headerText }}>民心操守</Text>
              <View style={{ backgroundColor: mColor + '22', borderRadius: 4, paddingHorizontal: 8, paddingVertical: 3 }}>
                <Text style={{ color: mColor, fontSize: 12, fontWeight: '700' }}>{mLabel}</Text>
              </View>
            </View>
            <View style={{ height: 12, backgroundColor: theme.cardBorder + '66', borderRadius: 6, overflow: 'hidden', marginBottom: 8 }}>
              <View style={{ width: `${moralValue}%`, height: '100%', backgroundColor: mColor, borderRadius: 6 }} />
            </View>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
              <Text style={{ fontSize: 22, fontWeight: '800', color: mColor }}>{moralValue}</Text>
              <Text style={{ fontSize: 11, color: theme.mutedText }}>满分 100</Text>
            </View>
            <Text style={{ fontSize: 11, color: theme.mutedText, marginTop: 8, lineHeight: 16 }}>
              民心操守反映为政清廉与群众口碑，低于 0 将被立案查处、仕途终结。为民施政、廉政自律可提升民心操守。
            </Text>
          </View>
        );
      })()}

      {/* 效果说明 */}
      <View style={{ flexDirection: 'row', gap: 8, marginBottom: 12 }}>
        {/* 晋升资格 */}
        <View style={{
          flex: 1, backgroundColor: theme.cardBg, borderWidth: 1,
          borderColor: promotionOk ? '#16a34a55' : '#dc262655',
          borderRadius: 8, padding: 12,
        }}>
          <Text style={{ fontSize: 11, color: theme.mutedText, marginBottom: 4 }}>晋升必要条件</Text>
          <Text style={{ fontSize: 13, fontWeight: '700', color: promotionOk ? '#16a34a' : '#dc2626' }}>
            {promotionOk ? '✓ 已满足 (≥40)' : `✗ 未满足 (${popularSupport}/40)`}
          </Text>
        </View>
        {/* 续任投票加成 */}
        <View style={{
          flex: 1, backgroundColor: theme.cardBg, borderWidth: 1, borderColor: theme.cardBorder,
          borderRadius: 8, padding: 12,
        }}>
          <Text style={{ fontSize: 11, color: theme.mutedText, marginBottom: 4 }}>续任投票影响</Text>
          <Text style={{ fontSize: 13, fontWeight: '700', color: vote.color }}>{vote.text}</Text>
        </View>
      </View>

      {/* 动作统计 */}
      <View style={{
        backgroundColor: theme.cardBg, borderWidth: 1, borderColor: theme.cardBorder,
        borderRadius: 8, padding: 12, marginBottom: 12,
        flexDirection: 'row', justifyContent: 'space-around',
      }}>
        <View style={{ alignItems: 'center' }}>
          <Text style={{ fontSize: 20, fontWeight: '800', color: theme.primary }}>{availableCount}</Text>
          <Text style={{ fontSize: 11, color: theme.mutedText, marginTop: 2 }}>可执行动作</Text>
        </View>
        <View style={{ width: 1, backgroundColor: theme.cardBorder }} />
        <View style={{ alignItems: 'center' }}>
          <Text style={{ fontSize: 20, fontWeight: '800', color: theme.headerText }}>{unlockedCount}</Text>
          <Text style={{ fontSize: 11, color: theme.mutedText, marginTop: 2 }}>已解锁动作</Text>
        </View>
        <View style={{ width: 1, backgroundColor: theme.cardBorder }} />
        <View style={{ alignItems: 'center' }}>
          <Text style={{ fontSize: 20, fontWeight: '800', color: theme.mutedText }}>17</Text>
          <Text style={{ fontSize: 11, color: theme.mutedText, marginTop: 2 }}>动作总数</Text>
        </View>
      </View>

      {/* 评级档位说明 */}
      <View style={{ backgroundColor: theme.cardBg, borderWidth: 1, borderColor: theme.cardBorder, borderRadius: 8, padding: 12, marginBottom: 12 }}>
        <Text style={{ fontSize: 12, fontWeight: '700', color: theme.headerText, marginBottom: 8 }}>评级档位说明</Text>
        {[
          { range: '≥80', label: '甲等', desc: '民心所向', color: '#16a34a' },
          { range: '60-79', label: '乙等', desc: '深得民心', color: '#2563eb' },
          { range: '40-59', label: '丙等', desc: '民意尚可', color: '#d97706' },
          { range: '20-39', label: '丁等', desc: '民心涣散', color: '#dc2626' },
          { range: '<20', label: '戊等', desc: '失去民心', color: '#7f1d1d' },
        ].map((item) => (
          <View key={item.label} style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 4 }}>
            <View style={{ width: 36, alignItems: 'center' }}>
              <Text style={{ fontSize: 11, color: item.color, fontWeight: '700' }}>{item.label}</Text>
            </View>
            <Text style={{ fontSize: 11, color: theme.mutedText, width: 60 }}>{item.range}</Text>
            <Text style={{ fontSize: 11, color: theme.mutedText }}>{item.desc}</Text>
            {popularSupport >= parseInt(item.range === '<20' ? '0' : item.range.split('-')[0].replace('≥', '')) &&
              (item.range === '<20' ? popularSupport < 20 :
               item.range.includes('-') ? popularSupport <= parseInt(item.range.split('-')[1]) :
               true) && (
              <Text style={{ fontSize: 10, color: item.color, marginLeft: 'auto' }}>← 当前</Text>
            )}
          </View>
        ))}
      </View>

      {/* 最近活动记录 */}
      {recentLog.length > 0 && (
        <View style={{ backgroundColor: theme.cardBg, borderWidth: 1, borderColor: theme.cardBorder, borderRadius: 8, padding: 12 }}>
          <Text style={{ fontSize: 12, fontWeight: '700', color: theme.headerText, marginBottom: 8 }}>最近民心记录</Text>
          {recentLog.map((entry, idx) => (
            <View key={idx} style={{
              flexDirection: 'row', alignItems: 'flex-start',
              paddingVertical: 5, borderBottomWidth: idx < recentLog.length - 1 ? 1 : 0,
              borderBottomColor: theme.cardBorder + '55',
            }}>
              <Text style={{ fontSize: 11, color: theme.mutedText, width: 60 }}>第{entry.gameDay}天</Text>
              <View style={{ flex: 1 }}>
                <Text style={{ fontSize: 12, color: theme.headerText }}>{entry.actionName}</Text>
                {entry.sideEffects && entry.sideEffects.length > 0 && (
                  <Text style={{ fontSize: 11, color: theme.mutedText, marginTop: 1 }}>{entry.sideEffects.join(' · ')}</Text>
                )}
              </View>
              <Text style={{ fontSize: 13, fontWeight: '700', color: '#16a34a' }}>+{entry.popularChange}</Text>
            </View>
          ))}
        </View>
      )}
    </View>
  );
}

// ── 主页面 ──
export default function PopularSupportScreen() {
  const { save, refreshSave } = useGame();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const [activeTab, setActiveTab] = useState<typeof TABS[number]['key']>('overview');
  const [executing, setExecuting] = useState<string | null>(null);
  const [toast, setToast] = useState<{ msg: string; ok: boolean } | null>(null);
  const [refreshing, setRefreshing] = useState(false);

  useFocusEffect(useCallback(() => {
    (async () => { await refreshSave(); })();
  }, [refreshSave]));

  const handleRefresh = useCallback(async () => {
    setRefreshing(true);
    await refreshSave();
    setRefreshing(false);
  }, [refreshSave]);

  const showToast = useCallback((msg: string, ok: boolean) => {
    setToast({ msg, ok });
    setTimeout(() => setToast(null), 3000);
  }, []);

  const handleExecute = useCallback(async (actionId: string) => {
    if (!save) return;
    setExecuting(actionId);
    try {
      const res = await executePopularAction(save.id, actionId);
      if (res.success) {
        await refreshSave();
        showToast(res.message, true);
      } else {
        showToast(res.message, false);
      }
    } catch {
      showToast('操作失败，请重试', false);
    } finally {
      setExecuting(null);
    }
  }, [save, refreshSave, showToast]);

  if (!save) {
    return (
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
        <ActivityIndicator />
      </View>
    );
  }

  const theme = getRankTheme(save.rankLevel);
  const allActions = getConfigsByCategory('popularity');
  const popularSupport = save.popularSupport ?? 50;
  const popularLog: PopularLogEntry[] = save.popularLog ?? [];
  const cooldowns: Record<string, number> = save.popularActionCooldowns ?? {};

  // 红点：是否有可立即执行的动作
  const hasAvailable = allActions.some((a) => {
    if (save.rankLevel < a.unlockRank) return false;
    const end = cooldowns[a.id] ?? 0;
    return save.gameDays >= end;
  });

  // 按当前 Tab 筛选动作
  const getTabActions = (tabKey: string): GameplayConfig[] => {
    const sorts = TAB_SORT[tabKey] ?? [];
    return allActions
      .filter((a) => sorts.includes(a.sort ?? 0))
      .sort((a, b) => (a.sort ?? 0) - (b.sort ?? 0));
  };

  return (
    <View style={{ flex: 1, backgroundColor: theme.pageBg }}>
      <StatusBar style="light" backgroundColor={theme.primary} />

      {/* ── 顶栏：返回 + 民心值快显 ── */}
      <View style={{
        backgroundColor: theme.cardBg,
        paddingTop: insets.top + 4,
        borderBottomWidth: 1,
        borderBottomColor: theme.cardBorder,
        paddingHorizontal: 16, paddingBottom: 10,
      }}>
        {/* 返回行 */}
        <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 8 }}>
          <Pressable onPress={() => router.back()} style={{ marginRight: 10, padding: 4 }}>
            <Text style={{ color: theme.mutedText, fontSize: 22, lineHeight: 24 }}>‹</Text>
          </Pressable>
          <Text style={{ fontSize: 15, fontWeight: '700', color: theme.headerText, letterSpacing: 1 }}>民心修行</Text>
        </View>
        {/* 民心值快显 */}
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
          <View style={{ flex: 1 }}>
            <Text style={{ fontSize: 11, color: theme.mutedText }}>民心值</Text>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 3 }}>
              <View style={{ flex: 1, height: 6, backgroundColor: theme.cardBorder + '66', borderRadius: 3, overflow: 'hidden' }}>
                <View style={{ width: `${popularSupport}%`, height: '100%', backgroundColor: getRating(popularSupport).color, borderRadius: 3 }} />
              </View>
              <Text style={{ fontSize: 13, fontWeight: '800', color: getRating(popularSupport).color }}>{popularSupport}</Text>
            </View>
          </View>
          <View style={{ alignItems: 'flex-end' }}>
            <Text style={{ fontSize: 12, fontWeight: '700', color: getRating(popularSupport).color }}>
              {getRating(popularSupport).label}
            </Text>
            <Text style={{ fontSize: 10, color: theme.mutedText }}>{getRating(popularSupport).desc}</Text>
          </View>
          {hasAvailable && (
            <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: '#16a34a' }} />
          )}
        </View>
      </View>

      {/* Tab 导航 */}
      <View style={{
        flexDirection: 'row',
        backgroundColor: theme.cardBg,
        borderBottomWidth: 1,
        borderBottomColor: theme.cardBorder,
      }}>
        {TABS.map((tab) => (
          <Pressable
            key={tab.key}
            onPress={() => setActiveTab(tab.key)}
            style={{
              flex: 1, paddingVertical: 10, alignItems: 'center',
              borderBottomWidth: 2,
              borderBottomColor: activeTab === tab.key ? theme.primary : 'transparent',
            }}
          >
            <Text style={{
              fontSize: 12, fontWeight: activeTab === tab.key ? '700' : '400',
              color: activeTab === tab.key ? theme.primary : theme.mutedText,
            }}>
              {tab.label}
            </Text>
          </Pressable>
        ))}
      </View>

      {/* 内容区 */}
      <ScrollView
        contentContainerStyle={{ padding: 12, paddingBottom: 40 }}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />}
      >
        {activeTab === 'overview' && (
          <OverviewTab
            popularSupport={popularSupport}
            moralValue={save.moralValue ?? 80}
            popularLog={popularLog}
            rankLevel={save.rankLevel}
            gameDays={save.gameDays}
            cooldowns={cooldowns}
            theme={theme}
          />
        )}
        {activeTab !== 'overview' && getTabActions(activeTab).map((config) => (
          <ActionCard
            key={config.id}
            config={config}
            rankLevel={save.rankLevel}
            gameDays={save.gameDays}
            cooldowns={cooldowns}
            onExecute={handleExecute}
            executing={executing}
            theme={theme}
          />
        ))}
      </ScrollView>

      {/* Toast 提示 */}
      {toast && (
        <View style={{
          position: 'absolute', bottom: 30, left: 20, right: 20,
          backgroundColor: toast.ok ? '#16a34a' : '#dc2626',
          borderRadius: 8, padding: 12,
          shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.25, shadowRadius: 4,
          elevation: 5,
        }}>
          <Text style={{ color: '#fff', fontSize: 13, fontWeight: '600', textAlign: 'center' }}>{toast.msg}</Text>
        </View>
      )}
    </View>
  );
}
