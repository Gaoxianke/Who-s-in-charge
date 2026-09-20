// 纪检风云页面：风险档案仪表盘 + 举报线索 + 纪检动态 + 案发档案
import { useMemo, useState } from 'react';
import { Pressable, ScrollView, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { useRouter } from 'expo-router';
import { useGame } from '@/ctx/GameContext';
import { getRankTheme } from '@/lib/rankTheme';
import { getConfigsByCategory } from '@/lib/gameplayConfig';
import type { GameplayCategory } from '@/types/game';

const TABS: { key: GameplayCategory; label: string }[] = [
  { key: 'clue_source', label: '举报线索' },
  { key: 'investigation_stage', label: '调查阶段' },
];

function riskLevel(risk: number): { label: string; color: string } {
  if (risk >= 85) return { label: '红色', color: '#C82829' };
  if (risk >= 70) return { label: '高危', color: '#D2691E' };
  if (risk >= 50) return { label: '预警', color: '#E8920C' };
  if (risk >= 30) return { label: '关注', color: '#C9A227' };
  return { label: '安全', color: '#2a7a3b' };
}

export default function DisciplineRiskScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { save } = useGame();
  const theme = getRankTheme(save?.rankLevel ?? 1);
  const [activeTab, setActiveTab] = useState<GameplayCategory>('clue_source');

  const risk = save?.riskValue ?? 0;
  const clue = save?.clueLevel ?? 0;
  const counter = save?.counterIntel ?? 10;
  const illegal = save?.illegalWealth ?? 0;
  const rl = riskLevel(risk);

  const configs = useMemo(() => getConfigsByCategory(activeTab), [activeTab]);

  return (
    <View style={{ flex: 1, backgroundColor: theme.pageBg }}>
      <StatusBar style="light" />
      <View style={{ backgroundColor: theme.headerBg, paddingTop: insets.top, paddingHorizontal: 14, paddingBottom: 10, borderBottomWidth: 2, borderBottomColor: theme.accentSub }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
          <Pressable cssInterop={false} onPress={() => router.back()} hitSlop={8}>
            <Text style={{ color: theme.headerText, fontSize: 22 }}>←</Text>
          </Pressable>
          <Text style={{ color: theme.headerText, fontSize: 16, fontWeight: '700', letterSpacing: 2 }}>纪检风云</Text>
        </View>
        <Text style={{ color: theme.headerSub, fontSize: 11, marginTop: 4 }}>风险档案 · 举报线索 · 调查阶段</Text>
      </View>

      {/* 风险仪表盘 */}
      <View style={{ backgroundColor: theme.cardBg, margin: 12, padding: 14, borderWidth: 1, borderColor: theme.cardBorder, borderCurve: 'continuous' }}>
        <View style={{ flexDirection: 'row', alignItems: 'flex-end', gap: 8 }}>
          <Text style={{ color: rl.color, fontSize: 40, fontWeight: '800', fontVariant: ['tabular-nums'] }}>{risk}</Text>
          <View style={{ marginBottom: 6 }}>
            <Text style={{ color: theme.mutedText, fontSize: 10 }}>贪腐风险值</Text>
            <View style={{ borderWidth: 1, borderColor: rl.color, paddingHorizontal: 6, marginTop: 2 }}>
              <Text style={{ color: rl.color, fontSize: 10, fontWeight: '700' }}>{rl.label}</Text>
            </View>
          </View>
        </View>
        {/* 风险进度条 */}
        <View style={{ height: 6, backgroundColor: theme.progressBg, marginTop: 8 }}>
          <View style={{ height: 6, width: `${Math.min(100, risk)}%`, backgroundColor: rl.color }} />
        </View>
        <View style={{ flexDirection: 'row', gap: 12, marginTop: 10 }}>
          <Stat label="线索完整度" value={`${clue}`} theme={theme} />
          <Stat label="反侦察力" value={`${counter}`} theme={theme} />
          <Stat label="涉案金额" value={formatMoney(illegal)} theme={theme} />
        </View>
      </View>

      {/* Tab 分页 */}
      <View style={{ flexDirection: 'row', backgroundColor: theme.sectionHeaderBg, borderBottomWidth: 1, borderBottomColor: theme.cardBorder }}>
        {TABS.map((t) => {
          const on = t.key === activeTab;
          return (
            <Pressable key={t.key} cssInterop={false} onPress={() => setActiveTab(t.key)} style={{ flex: 1, paddingVertical: 9, alignItems: 'center', borderBottomWidth: 2, borderBottomColor: on ? theme.accent : 'transparent', backgroundColor: on ? theme.accentBg : 'transparent' }}>
              <Text style={{ color: on ? theme.accent : theme.mutedText, fontSize: 11, fontWeight: on ? '700' : '400' }}>{t.label}</Text>
            </Pressable>
          );
        })}
      </View>

      <ScrollView contentContainerStyle={{ padding: 12, gap: 10, paddingBottom: 40 }} showsVerticalScrollIndicator={false}>
        {configs.map((c) => (
          <View key={c.id} style={{ backgroundColor: theme.cardBg, borderWidth: 1, borderColor: theme.cardBorder, padding: 12, borderCurve: 'continuous' }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
              <Text style={{ fontSize: 20 }}>{c.icon}</Text>
              <Text style={{ color: theme.valueText, fontSize: 13, fontWeight: '700' }}>{c.name}</Text>
            </View>
            <Text style={{ color: theme.mutedText, fontSize: 10, marginTop: 4 }}>{c.params.desc}</Text>
            <View style={{ flexDirection: 'row', gap: 6, marginTop: 6 }}>
              {c.params.clueValue !== undefined && <Tag label="线索贡献" value={`+${c.params.clueValue}`} theme={theme} danger />}
              {c.params.suppressCost && <Tag label="压盖代价" value={c.params.suppressCost} theme={theme} />}
              {c.params.stageThreshold !== undefined && c.params.stageThreshold > 0 && <Tag label="触发阈值" value={`风险≥${c.params.stageThreshold}`} theme={theme} />}
            </View>
          </View>
        ))}
      </ScrollView>
    </View>
  );
}

function Stat({ label, value, theme }: { label: string; value: string; theme: ReturnType<typeof getRankTheme> }) {
  return (
    <View style={{ flex: 1 }}>
      <Text style={{ color: theme.mutedText, fontSize: 9 }}>{label}</Text>
      <Text style={{ color: theme.valueText, fontSize: 12, fontWeight: '700', fontVariant: ['tabular-nums'] }}>{value}</Text>
    </View>
  );
}

function Tag({ label, value, theme, danger }: { label: string; value: string; theme: ReturnType<typeof getRankTheme>; danger?: boolean }) {
  const color = danger ? theme.accent : theme.mutedText;
  return (
    <View style={{ borderWidth: 1, borderColor: color, paddingHorizontal: 5, paddingVertical: 1 }}>
      <Text style={{ fontSize: 9, color }}>{label} {value}</Text>
    </View>
  );
}

function formatMoney(n: number): string {
  if (n >= 10000) return `${(n / 10000).toFixed(n % 10000 === 0 ? 0 : 1)}万`;
  return `${n.toLocaleString()}元`;
}