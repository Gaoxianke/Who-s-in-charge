// 下属忠诚条 + 赏赐 + 派遣 控件（政务风，可复用）
import { useState } from 'react';
import { Pressable, Text, View, ActivityIndicator } from 'react-native';
import { useRouter } from 'expo-router';
import { rewardSubordinate } from '@/db/gameApi';
import { useGame } from '@/ctx/GameContext';
import type { Subordinate } from '@/types/game';

interface Props {
  sub: Subordinate;
  onDone?: () => void;
}

function loyaltyColor(v: number) {
  if (v < 10) return '#C8161D';
  if (v < 20) return '#E08600';
  if (v < 50) return '#B8860B';
  return '#2a7a3b';
}

export function SubLoyaltyControls({ sub, onDone }: Props) {
  const router = useRouter();
  const { save, refreshSave } = useGame();
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState('');
  const silver = save?.silver ?? 0;
  const merit = save?.meritPoints ?? 0;
  const loyalty = Math.round(sub.loyalty);

  const handleReward = async (mode: 'silver' | 'merit') => {
    if (!save) return;
    setBusy(true);
    setMsg('');
    const res = await rewardSubordinate(save.id, sub.id, mode);
    setMsg(res.msg);
    setBusy(false);
    if (res.success) {
      await refreshSave();
      onDone?.();
    }
  };

  return (
    <View style={{ gap: 8 }}>
      {/* 忠诚条 */}
      <View>
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 3 }}>
          <Text style={{ fontSize: 11, color: '#555', letterSpacing: 0.5 }}>忠诚度</Text>
          <Text style={{ fontSize: 11, color: loyaltyColor(loyalty), fontWeight: '700' }}>{loyalty}</Text>
        </View>
        <View style={{ height: 6, backgroundColor: '#E5E2DC', overflow: 'hidden' }}>
          <View style={{ height: 6, width: `${Math.max(0, Math.min(100, loyalty))}%`, backgroundColor: loyaltyColor(loyalty) }} />
        </View>
        {loyalty < 20 && (
          <Text style={{ fontSize: 9, color: '#C8161D', marginTop: 2 }}>
            {loyalty < 10 ? '🗡️ 忠诚极低，存在反水风险！' : '⚠️ 忠诚偏低，有离职风险'}
          </Text>
        )}
      </View>

      {/* 赏赐 + 派遣 */}
      <View style={{ flexDirection: 'row', gap: 6, flexWrap: 'wrap' }}>
        <Pressable
          onPress={() => void handleReward('silver')}
          disabled={busy || silver < 50}
          style={{ paddingHorizontal: 10, paddingVertical: 7, backgroundColor: silver < 50 ? '#CCC' : '#7A5C00', flexDirection: 'row', alignItems: 'center', gap: 4 }}
        >
          <Text style={{ fontSize: 11, color: '#fff' }}>💰 赏个人资金(50)</Text>
        </Pressable>
        {silver < 50 && (
          <Pressable
            onPress={() => router.push('/(app)/personal-wealth' as never)}
            style={{ paddingHorizontal: 6, paddingVertical: 7, backgroundColor: '#FFFBEA', borderWidth: 1, borderColor: '#F2E3A0' }}
          >
            <Text style={{ fontSize: 10, color: '#7A5C00', fontWeight: '700' }}>[划拨资金]</Text>
          </Pressable>
        )}
        <Pressable
          onPress={() => void handleReward('merit')}
          disabled={busy || merit < 10}
          style={{ paddingHorizontal: 10, paddingVertical: 7, backgroundColor: merit < 10 ? '#CCC' : '#C8161D', flexDirection: 'row', alignItems: 'center', gap: 4 }}
        >
          <Text style={{ fontSize: 11, color: '#fff' }}>🎖️ 赏政绩(10)</Text>
        </Pressable>
        <Pressable
          onPress={() => router.push('/(app)/dispatch' as never)}
          disabled={sub.isDispatched}
          style={{ paddingHorizontal: 10, paddingVertical: 7, backgroundColor: sub.isDispatched ? '#999' : '#1B3A6B', flexDirection: 'row', alignItems: 'center', gap: 4 }}
        >
          <Text style={{ fontSize: 11, color: '#fff' }}>{sub.isDispatched ? '🚫 派遣中' : '📤 派遣任务'}</Text>
        </Pressable>
      </View>

      {busy && <ActivityIndicator size="small" />}
      {msg ? <Text style={{ fontSize: 10, color: '#2a7a3b' }}>{msg}</Text> : null}
    </View>
  );
}