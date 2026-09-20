// 接受组织审查页面：调查阶段状态 + 审查进展 + 供述选择
import { useState } from 'react';
import { Pressable, ScrollView, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { useRouter } from 'expo-router';
import { useGame } from '@/ctx/GameContext';
import { getRankTheme } from '@/lib/rankTheme';
import { updateSave } from '@/db/gameApi';
import type { InvestState } from '@/types/game';

const STAGE_LABEL: Record<InvestState, string> = {
  none: '暂无调查',
  fuhan: '谈话函询',
  chushi: '初步核实',
  liangan: '立案审查',
  liuzhi: '留置调查',
};

const STAGE_DESC: Record<InvestState, string> = {
  none: '当前未进入组织审查程序，请保持廉洁自律。',
  fuhan: '纪检监察委员会已对你展开谈话函询，请配合说明问题。',
  chushi: '调查组已进驻单位进行初步核实，核实进度持续推进。',
  liangan: '已进入立案审查（双规）阶段，需在规定时间地点交代问题。',
  liuzhi: '已移送监察机关留置，剥夺行动自由，只能靠自身应对。',
};

// 供述选择（文档第七章 6 选 1，缺失数值合理推算）
const STRATEGIES = [
  { id: 'deny', name: '咬死不承认', icon: '🤐', desc: '本轮供述压力≤70时60%扛过；>70触发从重。' },
  { id: 'minimize', name: '避重就轻', icon: '🎭', desc: '承认小问题否认大问题，供述压力-15，线索+5。' },
  { id: 'confess', name: '全盘托出', icon: '🤝', desc: '坦白从宽：供述压力清零，量刑降档。' },
  { id: 'divert', name: '转移话题', icon: '🗣️', desc: '谈政绩谈苦劳，供述压力-5，消耗1次机会。' },
  { id: 'confront', name: '强硬对抗', icon: '😤', desc: '供述压力-20但触发纪律惩戒（政绩-30，民心-5）。' },
  { id: 'report', name: '举报立功', icon: '🎖️', desc: '供出更大老虎，换取大幅减刑/保护。' },
];

export default function InterrogationScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { save, updateGameSave, refreshSave } = useGame();
  const theme = getRankTheme(save?.rankLevel ?? 1);
  const [feedback, setFeedback] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const state: InvestState = save?.investState ?? 'none';
  const risk = save?.riskValue ?? 0;
  const clue = save?.clueLevel ?? 0;
  const counter = save?.counterIntel ?? 10;
  const testimony = save?.testimonyChain ?? 0;
  const custody = save?.custodyDays ?? 0;

  // 供述压力公式（文档第七章）
  const pressure = Math.round(clue * 0.5 + testimony * 0.3 + 2 - counter * 0.3);

  const handleStrategy = async (sid: string) => {
    if (!save || state === 'none' || busy) return;
    setBusy(true);
    setFeedback(null);
    try {
      const updates: Record<string, number | string> = {};
      let msg = '';
      if (sid === 'deny') {
        const roll = Math.random() * 100;
        const pass = pressure <= 70 && roll < 60;
        if (pass) {
          updates.risk_value = Math.max(0, risk - 5);
          msg = '本轮成功扛过，审查继续。';
        } else {
          updates.clue_level = Math.min(100, clue + 15);
          updates.risk_value = Math.min(100, risk + 10);
          msg = pressure > 70 ? '供述压力过高，触发从重情节！' : '未能扛过，线索+15，风险上升。';
        }
      } else if (sid === 'minimize') {
        updates.clue_level = Math.min(100, clue + 5);
        msg = '避重就轻，线索+5。';
      } else if (sid === 'confess') {
        updates.risk_value = Math.max(0, risk - 30);
        updates.testimony_chain = Math.min(100, testimony + 20);
        msg = '全盘托出，风险-30，但供述链上升。';
      } else if (sid === 'divert') {
        msg = '转移话题拖延时间。';
      } else if (sid === 'confront') {
        updates.moral_value = Math.max(0, (save.moralValue ?? 0) - 5);
        updates.merit_points = Math.max(0, (save.meritPoints ?? 0) - 30);
        msg = '强硬对抗：政绩-30，民心-5。';
      } else if (sid === 'report') {
        updates.risk_value = Math.max(0, risk - 40);
        updates.testimony_chain = Math.min(100, testimony + 30);
        msg = '举报立功，风险-40，供述链上升。';
      }
      await updateSave(save.id, updates as Parameters<typeof updateSave>[1]);
      await updateGameSave(updates as Parameters<typeof updateSave>[1]);
      await refreshSave();
      setFeedback(msg);
    } finally {
      setBusy(false);
    }
  };

  return (
    <View style={{ flex: 1, backgroundColor: theme.pageBg }}>
      <StatusBar style="light" />
      <View style={{ backgroundColor: theme.headerBg, paddingTop: insets.top, paddingHorizontal: 14, paddingBottom: 10, borderBottomWidth: 2, borderBottomColor: theme.accentSub }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
          <Pressable cssInterop={false} onPress={() => router.back()} hitSlop={8}>
            <Text style={{ color: theme.headerText, fontSize: 22 }}>←</Text>
          </Pressable>
          <Text style={{ color: theme.headerText, fontSize: 16, fontWeight: '700', letterSpacing: 2 }}>接受审查</Text>
        </View>
        <Text style={{ color: theme.headerSub, fontSize: 11, marginTop: 4 }}>谈话函询 · 初步核实 · 立案审查 · 留置</Text>
      </View>

      <ScrollView contentContainerStyle={{ padding: 12, gap: 10, paddingBottom: 40 }} showsVerticalScrollIndicator={false}>
        {/* 当前阶段 */}
        <View style={{ backgroundColor: theme.cardBg, borderWidth: 1, borderColor: theme.accent, padding: 14, borderCurve: 'continuous' }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
            <Text style={{ fontSize: 22 }}>{state === 'none' ? '🛡️' : state === 'liuzhi' ? '🔒' : '⚖️'}</Text>
            <Text style={{ color: theme.accent, fontSize: 14, fontWeight: '700' }}>{STAGE_LABEL[state]}</Text>
          </View>
          <Text style={{ color: theme.mutedText, fontSize: 11, marginTop: 6 }}>{STAGE_DESC[state]}</Text>
        </View>

        {/* 审查数据 */}
        <View style={{ backgroundColor: theme.cardBg, borderWidth: 1, borderColor: theme.cardBorder, padding: 12, borderCurve: 'continuous' }}>
          <Text style={{ color: theme.mutedText, fontSize: 10, marginBottom: 6 }}>审查数据</Text>
          <View style={{ flexDirection: 'row', gap: 12 }}>
            <DataItem label="供述压力" value={`${Math.max(0, pressure)}`} theme={theme} />
            <DataItem label="线索完整度" value={`${clue}`} theme={theme} />
            <DataItem label="供述链" value={`${testimony}`} theme={theme} />
          </View>
          {state === 'liuzhi' && <Text style={{ color: theme.accent, fontSize: 10, marginTop: 6 }}>留置剩余天数：{custody} 天</Text>}
        </View>

        {feedback && (
          <View style={{ borderWidth: 1, borderColor: theme.accent, padding: 8, backgroundColor: theme.accentBg }}>
            <Text style={{ color: theme.accent, fontSize: 11 }}>{feedback}</Text>
          </View>
        )}

        {/* 供述选择 */}
        <Text style={{ color: theme.mutedText, fontSize: 11, marginTop: 4 }}>供述选择（每轮讯问 6 选 1）</Text>
        {STRATEGIES.map((s) => (
          <Pressable
            key={s.id}
            cssInterop={false}
            disabled={state === 'none' || busy}
            onPress={() => handleStrategy(s.id)}
            style={{ backgroundColor: theme.cardBg, borderWidth: 1, borderColor: theme.cardBorder, padding: 12, borderCurve: 'continuous', opacity: state === 'none' ? 0.5 : 1 }}
          >
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
              <Text style={{ fontSize: 18 }}>{s.icon}</Text>
              <Text style={{ color: theme.valueText, fontSize: 12, fontWeight: '700' }}>{s.name}</Text>
            </View>
            <Text style={{ color: theme.mutedText, fontSize: 10, marginTop: 4 }}>{s.desc}</Text>
          </Pressable>
        ))}
        {state === 'none' && (
          <Text style={{ color: theme.mutedText, fontSize: 10, textAlign: 'center', marginTop: 4 }}>当前未进入审查程序，供述选择不可用</Text>
        )}
      </ScrollView>
    </View>
  );
}

function DataItem({ label, value, theme }: { label: string; value: string; theme: ReturnType<typeof getRankTheme> }) {
  return (
    <View style={{ flex: 1 }}>
      <Text style={{ color: theme.mutedText, fontSize: 9 }}>{label}</Text>
      <Text style={{ color: theme.valueText, fontSize: 14, fontWeight: '700', fontVariant: ['tabular-nums'] }}>{value}</Text>
    </View>
  );
}