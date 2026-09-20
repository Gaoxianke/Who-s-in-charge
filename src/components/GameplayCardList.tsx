// 通用玩法页面模板：读配置表 → 按职级过滤 → 循环渲染卡片 → Tab分页 → 点卡片弹统一确认面板
import { useMemo, useState } from 'react';
import { ActivityIndicator, Modal, Pressable, ScrollView, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { useRouter } from 'expo-router';
import { useGame } from '@/ctx/GameContext';
import { getRankTheme } from '@/lib/rankTheme';
import { isGameplayUnlocked, getConfigsByCategory } from '@/lib/gameplayConfig';
import type { GameplayConfig, GameplayCategory } from '@/types/game';

interface GameplayCardListProps {
  title: string;
  subtitle?: string;
  tabs: { key: GameplayCategory; label: string }[];
  // 执行动作：返回 { ok, message }；返回 undefined 表示该卡片无动作（如展示型）
  onAction?: (config: GameplayConfig) => Promise<{ ok: boolean; message: string } | undefined>;
  // 是否显示该卡片（除了解锁外额外条件，如审查阶段）
  canShow?: (config: GameplayConfig) => boolean;
  // 自定义卡片右侧额外信息
  renderExtra?: (config: GameplayConfig) => React.ReactNode;
  loading?: boolean;
}

export function GameplayCardList({ title, subtitle, tabs, onAction, canShow, renderExtra, loading }: GameplayCardListProps) {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { save } = useGame();
  const theme = getRankTheme(save?.rankLevel ?? 1);
  const [activeTab, setActiveTab] = useState<GameplayCategory>(tabs[0].key);
  const [selected, setSelected] = useState<GameplayConfig | null>(null);
  const [result, setResult] = useState<{ ok: boolean; message: string } | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const configs = useMemo(() => {
    const list = getConfigsByCategory(activeTab);
    return canShow ? list.filter(canShow) : list;
  }, [activeTab, canShow]);

  const rankLevel = save?.rankLevel ?? 1;

  const handleConfirm = async () => {
    if (!selected || !onAction) return;
    setSubmitting(true);
    try {
      const res = await onAction(selected);
      setResult(res ?? { ok: true, message: '操作完成' });
    } catch (e: unknown) {
      setResult({ ok: false, message: e instanceof Error ? e.message : '操作失败' });
    } finally {
      setSubmitting(false);
    }
  };

  const closeModal = () => {
    setSelected(null);
    setResult(null);
  };

  return (
    <View style={{ flex: 1, backgroundColor: theme.pageBg }}>
      <StatusBar style="light" />
      {/* 顶部标题栏 */}
      <View style={{ backgroundColor: theme.headerBg, paddingTop: insets.top, paddingHorizontal: 14, paddingBottom: 10, borderBottomWidth: 2, borderBottomColor: theme.accentSub }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
          <Pressable cssInterop={false} onPress={() => router.back()} hitSlop={8}>
            <Text style={{ color: theme.headerText, fontSize: 22 }}>←</Text>
          </Pressable>
          <Text style={{ color: theme.headerText, fontSize: 16, fontWeight: '700', letterSpacing: 2 }}>{title}</Text>
        </View>
        {subtitle ? <Text style={{ color: theme.headerSub, fontSize: 11, marginTop: 4 }}>{subtitle}</Text> : null}
      </View>

      {/* Tab 分页 */}
      <View style={{ flexDirection: 'row', backgroundColor: theme.sectionHeaderBg, borderBottomWidth: 1, borderBottomColor: theme.cardBorder }}>
        {tabs.map((t) => {
          const on = t.key === activeTab;
          return (
            <Pressable key={t.key} cssInterop={false} onPress={() => setActiveTab(t.key)} style={{ flex: 1, paddingVertical: 9, alignItems: 'center', borderBottomWidth: 2, borderBottomColor: on ? theme.accent : 'transparent', backgroundColor: on ? theme.accentBg : 'transparent' }}>
              <Text style={{ color: on ? theme.accent : theme.mutedText, fontSize: 11, fontWeight: on ? '700' : '400' }}>{t.label}</Text>
            </Pressable>
          );
        })}
      </View>

      {loading ? (
        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
          <ActivityIndicator size="large" color={theme.accent} />
        </View>
      ) : (
        <ScrollView contentContainerStyle={{ padding: 12, gap: 10, paddingBottom: 40 }} showsVerticalScrollIndicator={false}>
          {configs.length === 0 ? (
            <View style={{ paddingVertical: 40, alignItems: 'center' }}>
              <Text style={{ fontSize: 30, marginBottom: 8 }}>📭</Text>
              <Text style={{ color: theme.mutedText, fontSize: 12 }}>暂无可操作内容</Text>
            </View>
          ) : (
            configs.map((c) => {
              const unlocked = isGameplayUnlocked(c.unlockRank, rankLevel);
              return (
                <Pressable
                  key={c.id}
                  cssInterop={false}
                  disabled={!unlocked}
                  onPress={() => { setSelected(c); setResult(null); }}
                  style={{
                    backgroundColor: theme.cardBg,
                    borderWidth: 1,
                    borderColor: unlocked ? theme.cardBorder : theme.mutedText,
                    borderStyle: unlocked ? 'solid' : 'dashed',
                    opacity: unlocked ? 1 : 0.5,
                    padding: 12,
                    borderCurve: 'continuous',
                  }}
                >
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
                    <Text style={{ fontSize: 24 }}>{c.icon}</Text>
                    <View style={{ flex: 1 }}>
                      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                        <Text style={{ color: theme.valueText, fontSize: 13, fontWeight: '700' }}>{c.name}</Text>
                        {!unlocked && (
                          <View style={{ borderWidth: 1, borderColor: theme.mutedText, paddingHorizontal: 4 }}>
                            <Text style={{ color: theme.mutedText, fontSize: 9 }}>🔒 {c.unlockRank}级</Text>
                          </View>
                        )}
                      </View>
                      <Text style={{ color: theme.mutedText, fontSize: 10, marginTop: 2 }} numberOfLines={1}>{c.params.desc}</Text>
                    </View>
                    {renderExtra ? renderExtra(c) : null}
                  </View>
                  {/* 参数标签 */}
                  <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 4, marginTop: 8 }}>
                    <ParamTag label="收益" value={c.params.gainMin !== undefined ? `${formatMoney(c.params.gainMin)}~${formatMoney(c.params.gainMax ?? c.params.gainMin)}` : undefined} theme={theme} />
                    <ParamTag label="风险" value={c.params.risk !== undefined ? `+${c.params.risk}` : undefined} theme={theme} danger />
                    <ParamTag label="民心" value={c.params.moral !== undefined ? `-${c.params.moral}` : undefined} theme={theme} danger />
                    <ParamTag label="成功率" value={c.params.successRate !== undefined ? `${Math.round(c.params.successRate * 100)}%` : undefined} theme={theme} />
                    <ParamTag label="冷却" value={c.params.cooldown !== undefined ? `${c.params.cooldown}天` : undefined} theme={theme} />
                    <ParamTag label="线索" value={c.params.clueValue !== undefined ? `+${c.params.clueValue}` : undefined} theme={theme} danger />
                  </View>
                </Pressable>
              );
            })
          )}
        </ScrollView>
      )}

      {/* 统一确认面板 */}
      <Modal visible={!!selected} transparent animationType="fade" onRequestClose={closeModal}>
        <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.6)', justifyContent: 'center', paddingHorizontal: 24 }}>
          <View style={{ backgroundColor: theme.cardBg, borderWidth: 1, borderColor: theme.accent, borderCurve: 'continuous' }}>
            <View style={{ backgroundColor: theme.headerBg, padding: 12, flexDirection: 'row', alignItems: 'center', gap: 8 }}>
              <Text style={{ fontSize: 22 }}>{selected?.icon}</Text>
              <Text style={{ color: theme.headerText, fontSize: 14, fontWeight: '700' }}>{selected?.name}</Text>
            </View>
            <View style={{ padding: 14, gap: 8 }}>
              <Text style={{ color: theme.mutedText, fontSize: 11 }}>{selected?.params.desc}</Text>
              {result ? (
                <View style={{ borderWidth: 1, borderColor: result.ok ? theme.statHigh : theme.accent, padding: 8, backgroundColor: result.ok ? 'rgba(42,122,59,0.08)' : 'rgba(200,40,41,0.08)' }}>
                  <Text style={{ color: result.ok ? theme.statHigh : theme.accent, fontSize: 11 }}>{result.message}</Text>
                </View>
              ) : (
                <View style={{ gap: 4 }}>
                  {selected?.params.gainMin !== undefined && <ConfirmRow label="预计收益" value={`${formatMoney(selected.params.gainMin)} ~ ${formatMoney(selected.params.gainMax ?? selected.params.gainMin)}`} theme={theme} />}
                  {selected?.params.risk !== undefined && <ConfirmRow label="风险增幅" value={`+${selected.params.risk}`} theme={theme} danger />}
                  {selected?.params.moral !== undefined && <ConfirmRow label="民心损耗" value={`-${selected.params.moral}`} theme={theme} danger />}
                  {selected?.params.successRate !== undefined && <ConfirmRow label="成功率" value={`${Math.round(selected.params.successRate * 100)}%`} theme={theme} />}
                </View>
              )}
              <View style={{ flexDirection: 'row', gap: 8, marginTop: 4 }}>
                <Pressable cssInterop={false} onPress={closeModal} style={{ flex: 1, borderWidth: 1, borderColor: theme.cardBorder, paddingVertical: 10, alignItems: 'center' }}>
                  <Text style={{ color: theme.mutedText, fontSize: 12 }}>{result ? '关闭' : '取消'}</Text>
                </Pressable>
                {!result && (
                  <Pressable cssInterop={false} disabled={submitting} onPress={handleConfirm} style={{ flex: 1, backgroundColor: theme.accent, paddingVertical: 10, alignItems: 'center', opacity: submitting ? 0.6 : 1 }}>
                    <Text style={{ color: '#fff', fontSize: 12, fontWeight: '700' }}>{submitting ? '处理中...' : '确认执行'}</Text>
                  </Pressable>
                )}
              </View>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}

function ParamTag({ label, value, theme, danger }: { label: string; value?: string; theme: ReturnType<typeof getRankTheme>; danger?: boolean }) {
  if (value === undefined) return null;
  const color = danger ? theme.accent : theme.mutedText;
  return (
    <View style={{ borderWidth: 1, borderColor: color, paddingHorizontal: 5, paddingVertical: 1 }}>
      <Text style={{ fontSize: 9, color }}>{label}{value}</Text>
    </View>
  );
}

function ConfirmRow({ label, value, theme, danger }: { label: string; value: string; theme: ReturnType<typeof getRankTheme>; danger?: boolean }) {
  return (
    <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
      <Text style={{ color: theme.mutedText, fontSize: 11 }}>{label}</Text>
      <Text style={{ color: danger ? theme.accent : theme.valueText, fontSize: 11, fontWeight: '600' }}>{value}</Text>
    </View>
  );
}

function formatMoney(n: number): string {
  if (n >= 10000) return `${(n / 10000).toFixed(n % 10000 === 0 ? 0 : 1)}万`;
  return `${n.toLocaleString()}元`;
}