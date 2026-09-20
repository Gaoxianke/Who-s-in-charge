// 非正式资源协调 Tab：四档协调（小额/中额/大额/巨额），合法或赃款输送
import { useState } from 'react';
import { Modal, Pressable, ScrollView, Text, TextInput, View } from 'react-native';
import { useGame } from '@/ctx/GameContext';
import { COORD_TIERS, COORD_RISK, PATRONAGE_TIERS } from '@/lib/promotionConfig';
import { computeCoordProb, hasPatronage } from '@/lib/promotionEngine';
import type { CoordTier } from '@/lib/promotionConfig';

function fmt(yuan: number): string {
  if (yuan >= 100000000) return `${(yuan / 100000000).toFixed(2)} 亿`;
  if (yuan >= 10000) return `${(yuan / 10000).toFixed(1)} 万`;
  return `${yuan.toLocaleString()} 元`;
}

export function CoordinationTab() {
  const { save, updateGameSave } = useGame();
  const [tier, setTier] = useState<CoordTier | null>(null);
  const [amount, setAmount] = useState('');
  const [source, setSource] = useState<'legal' | 'illicit'>('legal');
  const [feedback, setFeedback] = useState('');

  if (!save) return null;
  const favors = [save.bossFavor, save.boss2Favor, save.boss3Favor];
  const minFavor = Math.min(...favors);

  const handleConfirm = async () => {
    if (!tier) return;
    const amt = Math.floor(Number(amount) || 0);
    if (amt < tier.amountMin || amt > tier.amountMax) {
      setFeedback(`金额需在 ${fmt(tier.amountMin)} ~ ${fmt(tier.amountMax)} 之间`);
      return;
    }
    if (source === 'legal' && amt > save.personalSavings) {
      setFeedback('合法存款不足');
      return;
    }
    if (source === 'illicit' && amt > save.illicit_funds) {
      setFeedback('赃款余额不足');
      return;
    }
    const prob = computeCoordProb(tier.id, minFavor, save.bribe_count, save.riskValue, source);
    const gain = tier.favorGain;
    const updates: Parameters<typeof updateGameSave>[0] = {
      bribe_count: save.bribe_count + 1,
      last_bribe_day: save.gameDays,
      bribe_log: [...(save.bribe_log ?? []), {
        gameDay: save.gameDays, target: '上级', tier: tier.id, amount: amt, source,
      }],
      bossFavor: Math.min(100, save.bossFavor + gain),
      boss2Favor: Math.min(100, save.boss2Favor + gain),
      boss3Favor: Math.min(100, save.boss3Favor + gain),
    };
    if (source === 'legal') updates.personalSavings = save.personalSavings - amt;
    else updates.illicit_funds = save.illicit_funds - amt;
    if (hasPatronage(tier.id)) updates.patronage = true;
    await updateGameSave(updates);
    setFeedback(`已向协调对象输送 ${fmt(amt)}（${source === 'legal' ? '合法存款' : '赃款'}），认可度 +${tier.favorGain}，查获概率 ${prob}%`);
    setTier(null);
    setAmount('');
  };

  return (
    <View style={{ padding: 14, gap: 12 }}>
      {feedback ? (
        <View style={{ backgroundColor: '#fff3e0', borderWidth: 1, borderColor: '#ffe0b2', padding: 10 }}>
          <Text style={{ color: '#e65100', fontSize: 11, fontWeight: '600' }}>{feedback}</Text>
        </View>
      ) : null}

      <View style={{ backgroundColor: '#7C3AED', padding: 14 }}>
        <Text style={{ color: '#fff', fontSize: 13, fontWeight: '700', letterSpacing: 2 }}>🤝 非正式资源协调</Text>
        <Text style={{ color: 'rgba(255,255,255,0.8)', fontSize: 11, marginTop: 6, lineHeight: 16 }}>
          向上级输送资源以换取认可度与晋升评分加分。大额/巨额协调可形成「庇护」状态。查获将触发纪检风险。
        </Text>
      </View>

      <View style={{ gap: 8 }}>
        {COORD_TIERS.map(t => {
          const prob = computeCoordProb(t.id, minFavor, save.bribe_count, save.riskValue, source);
          return (
            <Pressable key={t.id} onPress={() => setTier(t)} style={{ backgroundColor: '#fff', borderWidth: 1, borderColor: '#D9D9D9', padding: 12 }}>
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                <Text style={{ fontSize: 12, fontWeight: '700', color: '#1A1A1A' }}>{t.name}</Text>
                {PATRONAGE_TIERS.includes(t.id) ? <Text style={{ fontSize: 9, color: '#7C3AED', fontWeight: '700' }}>可形成庇护</Text> : null}
              </View>
              <Text style={{ fontSize: 10, color: '#999', marginTop: 4 }}>金额区间 {fmt(t.amountMin)} ~ {fmt(t.amountMax)}</Text>
              <Text style={{ fontSize: 10, color: '#999', marginTop: 2 }}>认可度 +{t.favorGain} · 评分 +{t.scoreGain} · 当前查获概率 {prob}%</Text>
            </Pressable>
          );
        })}
      </View>

      <Modal visible={!!tier} transparent animationType="fade" onRequestClose={() => setTier(null)}>
        <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.55)', justifyContent: 'center', padding: 24 }}>
          <View style={{ backgroundColor: '#fff', padding: 18 }}>
            <Text style={{ fontSize: 14, fontWeight: '700', color: '#1A1A1A', marginBottom: 8 }}>{tier?.name}</Text>
            <Text style={{ fontSize: 11, color: '#999', marginBottom: 10 }}>金额区间 {tier ? fmt(tier.amountMin) : ''} ~ {tier ? fmt(tier.amountMax) : ''}</Text>
            <TextInput
              value={amount}
              onChangeText={setAmount}
              keyboardType="numeric"
              placeholder="输入输送金额"
              placeholderTextColor="#bbb"
              style={{ borderWidth: 1, borderColor: '#D9D9D9', padding: 10, fontSize: 13, fontFamily: 'monospace' }}
            />
            <View style={{ flexDirection: 'row', gap: 10, marginTop: 12 }}>
              <Pressable onPress={() => setSource('legal')} style={{ flex: 1, borderWidth: 1, borderColor: source === 'legal' ? '#2a7a3b' : '#D9D9D9', paddingVertical: 10, alignItems: 'center', backgroundColor: source === 'legal' ? '#E8F5E9' : '#fff' }}>
                <Text style={{ fontSize: 12, color: source === 'legal' ? '#2a7a3b' : '#888', fontWeight: '600' }}>合法存款</Text>
              </Pressable>
              <Pressable onPress={() => setSource('illicit')} style={{ flex: 1, borderWidth: 1, borderColor: source === 'illicit' ? '#C82829' : '#D9D9D9', paddingVertical: 10, alignItems: 'center', backgroundColor: source === 'illicit' ? '#FFF3F3' : '#fff' }}>
                <Text style={{ fontSize: 12, color: source === 'illicit' ? '#C82829' : '#888', fontWeight: '600' }}>赃款</Text>
              </Pressable>
            </View>
            <View style={{ flexDirection: 'row', gap: 10, marginTop: 14 }}>
              <Pressable onPress={() => setTier(null)} style={{ flex: 1, borderWidth: 1, borderColor: '#999', paddingVertical: 11, alignItems: 'center' }}>
                <Text style={{ color: '#555', fontSize: 13 }}>取消</Text>
              </Pressable>
              <Pressable onPress={handleConfirm} style={{ flex: 1, backgroundColor: '#C82829', paddingVertical: 11, alignItems: 'center' }}>
                <Text style={{ color: '#fff', fontSize: 13, fontWeight: '700' }}>确认输送</Text>
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}