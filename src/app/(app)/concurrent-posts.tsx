// 职务兼职管理页面 - 查看/担任/行使兼职职务，获取政绩与好感加成
import { useCallback, useState } from 'react';
import { FlatList, Pressable, ScrollView, Text, View, ActivityIndicator } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { useRouter, useFocusEffect } from 'expo-router';
import { useGame } from '@/ctx/GameContext';
import { getAvailableConcurrentPosts, CONCURRENT_POST_CONFIG } from '@/types/game';
import type { ConcurrentPost } from '@/types/game';

export default function ConcurrentPostsScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { save, updateGameSave } = useGame();
  const [feedback, setFeedback] = useState('');
  const [actingKey, setActingKey] = useState<string | null>(null);
  const [selectedPost, setSelectedPost] = useState<ConcurrentPost | null>(null);
  const [lastActDays, setLastActDays] = useState<Record<string, number>>({});

  useFocusEffect(
    useCallback(() => {
      // 无需额外加载，从save.concurrentPosts读取
    }, [save])
  );

  if (!save) return null;

  const currentPosts = save.concurrentPosts ?? [];
  const available = getAvailableConcurrentPosts(save.rankLevel);

  const showFeedback = (msg: string) => {
    setFeedback(msg);
    setTimeout(() => setFeedback(''), 3000);
  };

  // 担任兼职职务
  const handleTake = async (post: ConcurrentPost) => {
    if (currentPosts.includes(post.key)) {
      showFeedback('已担任该职务');
      return;
    }
    if (currentPosts.length >= 3) {
      showFeedback('⚠️ 最多同时担任3个兼职职务，请先退出一个');
      return;
    }
    const newPosts = [...currentPosts, post.key];
    await updateGameSave({ concurrentPosts: newPosts, meritPoints: save.meritPoints + 20 });
    showFeedback(`✅ 已担任【${post.label}】，获政绩+20`);
    setSelectedPost(null);
  };

  // 退出兼职职务
  const handleResign = async (postKey: string) => {
    const newPosts = currentPosts.filter(k => k !== postKey);
    await updateGameSave({ concurrentPosts: newPosts });
    const post = CONCURRENT_POST_CONFIG.find(p => p.key === postKey);
    showFeedback(`已退出【${post?.label ?? postKey}】`);
    setSelectedPost(null);
  };

  // 行使兼职职务（参加会议/活动）
  const handleAct = async (post: ConcurrentPost) => {
    const lastDay = lastActDays[post.key] ?? 0;
    const cooldown = 90; // 90天冷却
    if (save.gameDays - lastDay < cooldown && lastDay > 0) {
      const remaining = cooldown - (save.gameDays - lastDay);
      showFeedback(`⏳ 冷却中，还需 ${remaining} 天后可再次参与`);
      return;
    }
    setActingKey(post.key);
    const meritGain = post.meritBonus;
    const favorGain = post.favorBonus;
    const newMerit = save.meritPoints + meritGain;
    const newFavor = Math.min(100, save.bossFavor + (favorGain > 0 ? favorGain : 0));
    await updateGameSave({ meritPoints: newMerit, bossFavor: newFavor });
    setLastActDays(prev => ({ ...prev, [post.key]: save.gameDays }));
    setActingKey(null);
    const favorText = favorGain > 0 ? `，上司好感+${favorGain}` : favorGain < 0 ? `，注意：上司好感${favorGain}` : '';
    showFeedback(`✅ 参与【${post.label}】活动完成，政绩+${meritGain}${favorText}`);
  };

  const myPosts = CONCURRENT_POST_CONFIG.filter(p => currentPosts.includes(p.key));
  const categoryColors: Record<string, string> = {
    '全国议政院': '#1565C0',
    '全国参政院': '#E65100',
    '党委': '#B71C1C',
    '地方议政院': '#4527A0',
    '地方参政院': '#6D4C41',
    '纪检': '#212121',
    '专项': '#1B5E20',
  };

  const renderPost = ({ item }: { item: ConcurrentPost }) => {
    const isHeld = currentPosts.includes(item.key);
    const categoryColor = categoryColors[item.category] ?? '#555';
    const isSelected = selectedPost?.key === item.key;
    const cooldown = 90;
    const lastDay = lastActDays[item.key] ?? 0;
    const canAct = isHeld && (save.gameDays - lastDay >= cooldown || lastDay === 0);

    return (
      <Pressable
        onPress={() => setSelectedPost(isSelected ? null : item)}
        style={{
          backgroundColor: isHeld ? '#F0F7FF' : '#FFF',
          borderWidth: 1,
          borderColor: isSelected ? categoryColor : (isHeld ? '#90CAF9' : '#DDD'),
          padding: 14, marginBottom: 8,
        }}
      >
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 6 }}>
          <Text style={{ fontSize: 26 }}>{item.icon}</Text>
          <View style={{ flex: 1 }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
              <Text style={{ fontSize: 14, fontWeight: '700', color: '#222' }}>{item.label}</Text>
              <View style={{ backgroundColor: categoryColor + '22', borderWidth: 1, borderColor: categoryColor, paddingHorizontal: 5, paddingVertical: 1 }}>
                <Text style={{ fontSize: 9, color: categoryColor, fontWeight: '700' }}>{item.category}</Text>
              </View>
              {isHeld && (
                <View style={{ backgroundColor: '#2E7D32', paddingHorizontal: 6, paddingVertical: 1 }}>
                  <Text style={{ fontSize: 9, color: '#FFF', fontWeight: '700' }}>在职</Text>
                </View>
              )}
            </View>
            <Text style={{ fontSize: 10, color: '#666', marginTop: 2 }}>
              所需职级: {item.minRank}级{item.maxRank !== -1 ? `~${item.maxRank}级` : '以上'} · 政绩+{item.meritBonus}/次{item.favorBonus > 0 ? ` · 好感+${item.favorBonus}` : item.favorBonus < 0 ? ` · 好感${item.favorBonus}` : ''}
            </Text>
          </View>
        </View>

        {isSelected && (
          <View style={{ borderTopWidth: 1, borderTopColor: '#EEE', paddingTop: 10, gap: 8 }}>
            <Text style={{ fontSize: 12, color: '#444', lineHeight: 18 }}>{item.desc}</Text>
            <View style={{ flexDirection: 'row', gap: 8, flexWrap: 'wrap' }}>
              {!isHeld ? (
                <Pressable
                  onPress={() => void handleTake(item)}
                  style={{ backgroundColor: '#1976D2', paddingHorizontal: 16, paddingVertical: 8 }} android_ripple={{ color: 'rgba(0,0,0,0.15)' }}
                >
                  <Text style={{ color: '#FFF', fontSize: 12, fontWeight: '700' }}>担任此职务</Text>
                </Pressable>
              ) : (
                <>
                  <Pressable
                    onPress={() => void handleAct(item)}
                    disabled={!canAct || actingKey === item.key}
                    style={{ backgroundColor: canAct ? '#2E7D32' : '#9E9E9E', paddingHorizontal: 16, paddingVertical: 8 }}
                    android_ripple={{ color: 'rgba(255,255,255,0.2)' }}
                  >
                    {actingKey === item.key
                      ? <ActivityIndicator size="small" color="#FFF" />
                      : <Text style={{ color: '#FFF', fontSize: 12, fontWeight: '700' }}>
                          {canAct ? '参加活动' : '冷却中'}
                        </Text>
                    }
                  </Pressable>
                  <Pressable
                    onPress={() => void handleResign(item.key)}
                    style={{ backgroundColor: '#B71C1C', paddingHorizontal: 16, paddingVertical: 8 }} android_ripple={{ color: 'rgba(255,255,255,0.2)' }}
                  >
                    <Text style={{ color: '#FFF', fontSize: 12, fontWeight: '700' }}>退出职务</Text>
                  </Pressable>
                </>
              )}
            </View>
          </View>
        )}
      </Pressable>
    );
  };

  return (
    <View style={{ flex: 1, backgroundColor: '#F0F4F8' }}>
      <StatusBar style="light" />
      {/* 顶栏 */}
      <View style={{ backgroundColor: '#1D3B5E', padding: 16, paddingTop: insets.top + 8, gap: 8 }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
          <Pressable onPress={() => router.back()}>
            <Text style={{ color: '#ccc', fontSize: 22 }}>‹</Text>
          </Pressable>
          <View style={{ flex: 1 }}>
            <Text style={{ color: '#a0b4cc', fontSize: 10, letterSpacing: 1 }}>{save.rankName} · {save.playerName}</Text>
            <Text style={{ color: '#fff', fontSize: 16, fontWeight: '700' }}>职务兼职</Text>
          </View>
          <Text style={{ color: '#a0b4cc', fontSize: 11 }}>在职{currentPosts.length}/3个</Text>
        </View>
        {/* 当前兼职摘要 */}
        {myPosts.length > 0 && (
          <View style={{ backgroundColor: '#243F5C', padding: 10, gap: 6 }}>
            <Text style={{ color: '#90CAF9', fontSize: 11, fontWeight: '700', marginBottom: 2 }}>🎖️ 当前兼职职务</Text>
            {myPosts.map(p => (
              <View key={p.key} style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                <Text style={{ fontSize: 14 }}>{p.icon}</Text>
                <Text style={{ color: '#FFF', fontSize: 12, fontWeight: '600' }}>{p.label}</Text>
                <Text style={{ color: '#90CAF9', fontSize: 10 }}>政绩+{p.meritBonus}/次</Text>
              </View>
            ))}
          </View>
        )}
      </View>

      {/* 反馈条 */}
      {feedback ? (
        <View style={{ backgroundColor: '#E8F5E9', borderBottomWidth: 1, borderBottomColor: '#C8E6C9', padding: 10 }}>
          <Text style={{ color: '#2A7A3B', fontSize: 12, fontWeight: '600' }}>{feedback}</Text>
        </View>
      ) : null}

      <FlatList
        data={available}
        renderItem={renderPost}
        keyExtractor={item => item.key}
        contentContainerStyle={{ padding: 14 }}
        contentInsetAdjustmentBehavior="automatic"
        ListHeaderComponent={
          <View style={{ marginBottom: 10, gap: 6 }}>
            <View style={{ backgroundColor: '#E3F2FD', borderWidth: 1, borderColor: '#90CAF9', padding: 10 }}>
              <Text style={{ fontSize: 12, color: '#1565C0', fontWeight: '700', marginBottom: 4 }}>📌 职务兼职说明</Text>
              <Text style={{ fontSize: 11, color: '#333', lineHeight: 17 }}>
                根据当前职级，您可担任以下兼职职务。最多同时在职3个。每个职务每90天可参加一次活动，获取政绩与好感加成。担任更高级别的兼职需要更多政绩积累。
              </Text>
            </View>
          </View>
        }
        ListEmptyComponent={
          <View style={{ alignItems: 'center', marginTop: 60 }}>
            <Text style={{ fontSize: 28, marginBottom: 8 }}>🔒</Text>
            <Text style={{ color: '#888', fontSize: 14 }}>当前职级暂无可担任的兼职职务</Text>
            <Text style={{ color: '#aaa', fontSize: 11, marginTop: 4 }}>晋升后可解锁更多职务</Text>
          </View>
        }
      />
    </View>
  );
}
