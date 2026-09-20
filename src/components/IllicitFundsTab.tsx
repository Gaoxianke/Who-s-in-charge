// 赃款账户 Tab：赃款总额、来源明细、洗白七方式、藏匿方式
import { useState } from 'react';
import { Modal, Pressable, ScrollView, Text, TextInput, View } from 'react-native';
import { useGame } from '@/ctx/GameContext';
import {
  LAUNDER_METHODS, HIDING_METHODS, LAUNDER_RISK_DIVISOR, HIDING_EXTRA_RECOVERY,
} from '@/lib/promotionConfig';
import { computeLaunderProb } from '@/lib/promotionEngine';
import type { LaunderMethod } from '@/lib/promotionConfig';

function fmt(yuan: number): string {
  if (yuan >= 100000000) return `${(yuan / 100000000).toFixed(2)} 亿`;
  if (yuan >= 10000) return `${(yuan / 10000).toFixed(1)} 万`;
  return `${yuan.toLocaleString()} 元`;
}

const RISK_LABEL: Record<string, string> = { low: '低', mid: '中', high: '高', extreme: '极高' };

export function IllicitFundsTab() {
  const { save, updateGameSave } = useGame();
  const [launderMethod, setLaunderMethod] = useState<LaunderMethod | null>(null);
  const [amount, setAmount] = useState('');
  const [feedback, setFeedback] = useState('');

  if (!save) return null;
  const funds = save.illicit_funds ?? 0;
  const sources = save.illicit_source_log ?? [];
  const laundering = save.laundering_log ?? [];

  const handleLaunder = async () => {
    if (!launderMethod) return;
    const amt = Math.floor(Number(amount) || 0);
    if (amt <= 0 || amt > funds) { setFeedback('请输入合法金额且不超过赃款余额'); return; }
    const fee = launderMethod.fee;
    const net = Math.round(amt * (1 - fee));
    const entry = {
      gameDay: save.gameDays,
      methodId: launderMethod.id,
      methodName: launderMethod.name,
      amount: amt,
      fee,
      netAmount: net,
      days: launderMethod.days,
      endDay: save.gameDays + launderMethod.days,
      status: 'processing' as const,
    };
    const prob = computeLaunderProb(launderMethod.baseProb, save.riskValue);
    await updateGameSave({
      illicit_funds: funds - amt,
      laundering_log: [...laundering, entry],
    });
    setFeedback(`已发起「${launderMethod.name}」洗白，金额 ${fmt(amt)}，手续费 ${(fee * 100).toFixed(0)}%，周期 ${launderMethod.days} 天，查获概率 ${prob}%`);
    setLaunderMethod(null);
    setAmount('');
  };

  const handleHiding = async (id: string, name: string) => {
    await updateGameSave({ funds_hiding: id });
    setFeedback(`已选择「${name}」藏匿方式，查获时可追缴比例将降低`);
  };

  return (
    <View style={{ padding: 14, gap: 12 }}>
      {feedback ? (
        <View style={{ backgroundColor: '#fff3e0', borderWidth: 1, borderColor: '#ffe0b2', padding: 10 }}>
          <Text style={{ color: '#e65100', fontSize: 11, fontWeight: '600' }}>{feedback}</Text>
        </View>
      ) : null}

      {/* 赃款总额 */}
      <View style={{ backgroundColor: '#1A1A1A', padding: 16 }}>
        <Text style={{ color: '#aaa', fontSize: 10, letterSpacing: 2 }}>赃款账户余额</Text>
        <Text style={{ color: '#FFD700', fontSize: 26, fontWeight: '800', fontFamily: 'monospace', marginTop: 4 }}>{fmt(funds)}</Text>
        <Text style={{ color: '#888', fontSize: 10, marginTop: 6 }}>
          藏匿方式：{save.funds_hiding ? HIDING_METHODS.find(h => h.id === save.funds_hiding)?.name ?? '未设置' : '未设置'}
        </Text>
      </View>

      {/* 来源明细 */}
      <View style={{ backgroundColor: '#fff', borderWidth: 1, borderColor: '#D9D9D9', padding: 14 }}>
        <Text style={{ fontSize: 12, fontWeight: '700', color: '#1D3B5E', letterSpacing: 2, marginBottom: 8 }}>来源明细</Text>
        {sources.length === 0 ? (
          <Text style={{ fontSize: 11, color: '#aaa', textAlign: 'center', paddingVertical: 12 }}>暂无赃款来源记录</Text>
        ) : sources.slice(-6).reverse().map((s, i) => (
          <View key={i} style={{ flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 5, borderBottomWidth: 1, borderBottomColor: '#F0F0F0' }}>
            <Text style={{ fontSize: 11, color: '#666' }}>{s.channel}</Text>
            <Text style={{ fontSize: 11, fontWeight: '700', color: '#C82829', fontFamily: 'monospace' }}>+{fmt(s.amount)}</Text>
          </View>
        ))}
      </View>

      {/* 洗白方式 */}
      <View style={{ backgroundColor: '#fff', borderWidth: 1, borderColor: '#D9D9D9', padding: 14 }}>
        <Text style={{ fontSize: 12, fontWeight: '700', color: '#1D3B5E', letterSpacing: 2, marginBottom: 8 }}>洗白方式（扣除手续费后转为合法存款）</Text>
        <View style={{ gap: 8 }}>
          {LAUNDER_METHODS.map(m => {
            const unlocked = save.rankLevel >= m.unlockRank;
            const prob = computeLaunderProb(m.baseProb, save.riskValue);
            return (
              <Pressable
                key={m.id}
                onPress={() => unlocked && setLaunderMethod(m)}
                disabled={!unlocked}
                style={{ borderWidth: 1, borderColor: unlocked ? '#D9D9D9' : '#EEE', padding: 10, backgroundColor: unlocked ? '#FFFCF5' : '#F7F7F7' }}
              >
                <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                  <Text style={{ fontSize: 12, fontWeight: '600', color: unlocked ? '#1A1A1A' : '#bbb' }}>{m.name}</Text>
                  <Text style={{ fontSize: 10, color: unlocked ? '#999' : '#ccc' }}>{unlocked ? `手续费 ${(m.fee * 100).toFixed(0)}%` : `${m.unlockRank}级解锁`}</Text>
                </View>
                <Text style={{ fontSize: 10, color: '#999', marginTop: 3 }}>周期 {m.days} 天 · 查获风险{RISK_LABEL[m.risk]} · 基础查获概率 {m.baseProb}%（当前 {prob}%）</Text>
              </Pressable>
            );
          })}
        </View>
      </View>

      {/* 藏匿方式 */}
      <View style={{ backgroundColor: '#fff', borderWidth: 1, borderColor: '#D9D9D9', padding: 14 }}>
        <Text style={{ fontSize: 12, fontWeight: '700', color: '#1D3B5E', letterSpacing: 2, marginBottom: 8 }}>赃款藏匿方式</Text>
        <View style={{ gap: 8 }}>
          {HIDING_METHODS.map(h => (
            <Pressable
              key={h.id}
              onPress={() => handleHiding(h.id, h.name)}
              style={{ borderWidth: 1, borderColor: save.funds_hiding === h.id ? '#C82829' : '#D9D9D9', padding: 10, backgroundColor: save.funds_hiding === h.id ? '#FFF3F3' : '#FFFCF5' }}
            >
              <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                <Text style={{ fontSize: 12, fontWeight: '600', color: '#1A1A1A' }}>{h.name}</Text>
                <Text style={{ fontSize: 10, color: '#999' }}>可追缴 {(h.recoveryRate * 100).toFixed(0)}%</Text>
              </View>
            </Pressable>
          ))}
        </View>
        <Text style={{ fontSize: 10, color: '#999', marginTop: 8 }}>藏匿被查获时，额外增加 {(HIDING_EXTRA_RECOVERY * 100).toFixed(0)}% 涉案金额认定（加重情节）</Text>
      </View>

      {/* 洗白确认弹窗 */}
      <Modal visible={!!launderMethod} transparent animationType="fade" onRequestClose={() => setLaunderMethod(null)}>
        <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.55)', justifyContent: 'center', padding: 24 }}>
          <View style={{ backgroundColor: '#fff', padding: 18 }}>
            <Text style={{ fontSize: 14, fontWeight: '700', color: '#1A1A1A', marginBottom: 4 }}>{launderMethod?.name}</Text>
            <Text style={{ fontSize: 11, color: '#999', marginBottom: 12 }}>手续费 {(launderMethod ? launderMethod.fee * 100 : 0).toFixed(0)}% · 周期 {launderMethod?.days} 天</Text>
            <TextInput
              value={amount}
              onChangeText={setAmount}
              keyboardType="numeric"
              placeholder={`输入洗白金额（最多 ${fmt(funds)}）`}
              placeholderTextColor="#bbb"
              style={{ borderWidth: 1, borderColor: '#D9D9D9', padding: 10, fontSize: 13, fontFamily: 'monospace' }}
            />
            <View style={{ flexDirection: 'row', gap: 10, marginTop: 14 }}>
              <Pressable onPress={() => setLaunderMethod(null)} style={{ flex: 1, borderWidth: 1, borderColor: '#999', paddingVertical: 11, alignItems: 'center' }}>
                <Text style={{ color: '#555', fontSize: 13 }}>取消</Text>
              </Pressable>
              <Pressable onPress={handleLaunder} style={{ flex: 1, backgroundColor: '#C82829', paddingVertical: 11, alignItems: 'center' }}>
                <Text style={{ color: '#fff', fontSize: 13, fontWeight: '700' }}>确认洗白</Text>
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}