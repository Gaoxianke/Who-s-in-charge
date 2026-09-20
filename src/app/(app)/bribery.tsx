// 权钱交易页面（复用通用玩法模板 + 非正式资源协调）
import { useCallback, useState } from 'react';
import { ScrollView, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { useRouter } from 'expo-router';
import { useGame } from '@/ctx/GameContext';
import { GameplayCardList } from '@/components/GameplayCardList';
import { CoordinationTab } from '@/components/CoordinationTab';
import { executeGameplayAction } from '@/lib/gameplayApi';
import type { GameplayConfig, GameplayCategory } from '@/types/game';

const TABS: { key: GameplayCategory; label: string }[] = [
  { key: 'bribery_channel', label: '受贿渠道' },
  { key: 'power_rent', label: '权力寻租' },
  { key: 'embezzlement', label: '贪污挪用' },
  { key: 'asset_hiding', label: '涉案账户' },
];

type TopTab = 'gameplay' | 'coordination';

export default function BriberyScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { save, updateGameSave, refreshSave } = useGame();
  const [topTab, setTopTab] = useState<TopTab>('gameplay');

  const onAction = useCallback(async (config: GameplayConfig) => {
    if (!save) return { ok: false, message: '存档未加载' };
    const res = await executeGameplayAction(save.id, config);
    if (res.gameOver) {
      await updateGameSave({ gameOverType: res.gameOver });
    }
    await refreshSave();
    return { ok: res.success, message: res.message };
  }, [save, updateGameSave, refreshSave]);

  return (
    <View style={{ flex: 1, backgroundColor: '#F5F4F1' }}>
      <StatusBar style="light" backgroundColor="#1D3B5E" />
      <View style={{ backgroundColor: '#1D3B5E', paddingTop: insets.top + 8, paddingBottom: 12, paddingHorizontal: 16 }}>
        <View style={{ flexDirection: 'row', alignItems: 'center' }}>
          <Text onPress={() => router.back()} style={{ color: '#ccc', fontSize: 22, marginRight: 12 }}>‹</Text>
          <Text style={{ color: '#fff', fontSize: 16, fontWeight: '700', letterSpacing: 2 }}>💰 权钱交易</Text>
        </View>
      </View>
      {/* 顶部切换 */}
      <View style={{ flexDirection: 'row', backgroundColor: '#fff', borderBottomWidth: 1, borderBottomColor: '#E5E5E5' }}>
        {([['gameplay', '涉案操作'], ['coordination', '非正式协调']] as const).map(([key, label]) => (
          <Text
            key={key}
            onPress={() => setTopTab(key)}
            style={{ flex: 1, textAlign: 'center', paddingVertical: 12, fontSize: 12, fontWeight: topTab === key ? '700' : '400', color: topTab === key ? '#C82829' : '#888', borderBottomWidth: 2, borderBottomColor: topTab === key ? '#C82829' : 'transparent' }}
          >
            {label}
          </Text>
        ))}
      </View>

      {topTab === 'gameplay' ? (
        <GameplayCardList title="权钱交易" subtitle="每一次伸手都会留下痕迹，风险与收益并存" tabs={TABS} onAction={onAction} />
      ) : (
        <ScrollView contentInsetAdjustmentBehavior="automatic">
          <CoordinationTab />
        </ScrollView>
      )}
    </View>
  );
}