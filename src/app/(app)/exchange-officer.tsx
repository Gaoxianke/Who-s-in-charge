// 干部交流任职页面 — 每180天触发，可接收或婉拒外城干部
import { useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { useRouter } from 'expo-router';
import { useGame } from '@/ctx/GameContext';
import { acceptExchangeOfficer } from '@/db/gameApi';
import { FACTION_LABEL, FACTION_COLOR, SUB_LEVEL_NAMES, getSubAvatarEmoji } from '@/types/game';
import { StatBar } from '@/components/StatBar';

export default function ExchangeOfficerScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { save, exchangeOfficer, clearExchangeOfficer } = useGame();
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState<'accepted' | 'declined' | null>(null);

  const handleAccept = async () => {
    if (!save || !exchangeOfficer) return;
    setLoading(true);
    const ok = await acceptExchangeOfficer(save.id, save.userId, exchangeOfficer);
    setLoading(false);
    if (ok) {
      clearExchangeOfficer();
      setDone('accepted');
    }
  };

  const handleDecline = () => {
    clearExchangeOfficer();
    setDone('declined');
  };

  const officer = exchangeOfficer;
  const factionColor = officer ? (FACTION_COLOR[officer.faction] ?? '#888') : '#888';
  const factionLabel = officer ? (FACTION_LABEL[officer.faction] ?? '无') : '';
  const levelName = officer ? (SUB_LEVEL_NAMES[officer.subLevel] ?? '待定') : '';
  const avatar = officer ? getSubAvatarEmoji(officer.avatarId, officer.gender) : '👤';

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
            <Text style={{ color: '#a0b4cc', fontSize: 10, letterSpacing: 2 }}>OFFICER EXCHANGE</Text>
            <Text style={{ color: '#fff', fontSize: 16, fontWeight: '700', letterSpacing: 1 }}>干部交流任职</Text>
          </View>
          <View style={{ alignItems: 'flex-end' }}>
            <Text style={{ color: '#a0b4cc', fontSize: 10 }}>{save?.rankName}</Text>
            <Text style={{ color: '#fff', fontSize: 11, fontWeight: '600', marginTop: 1 }}>{save?.cityName}</Text>
          </View>
        </View>
        <Text style={{ color: '#a0b4cc', fontSize: 11, marginLeft: 34 }}>每180天自动触发一次交流任职申请</Text>
      </View>

      <ScrollView contentContainerStyle={{ padding: 16, gap: 14 }} showsVerticalScrollIndicator={false}>

        {/* 结果反馈 */}
        {done === 'accepted' && (
          <View style={{ backgroundColor: '#e8f5e9', borderWidth: 1, borderColor: '#2a7a3b', padding: 16, alignItems: 'center', gap: 6 }}>
            <Text style={{ fontSize: 28 }}>✅</Text>
            <Text style={{ fontSize: 15, fontWeight: '700', color: '#2a7a3b' }}>已接收交流干部</Text>
            <Text style={{ fontSize: 12, color: '#555', textAlign: 'center' }}>
              该干部已加入您的下属团队，可在「下属管理」中查看并分配岗位。
            </Text>
            <Pressable
              onPress={() => router.replace('/(app)/subordinates')}
              style={{ backgroundColor: '#2a7a3b', paddingHorizontal: 24, paddingVertical: 10, marginTop: 4 }}
            >
              <Text style={{ color: '#fff', fontWeight: '700', fontSize: 13 }}>前往下属管理 ›</Text>
            </Pressable>
          </View>
        )}

        {done === 'declined' && (
          <View style={{ backgroundColor: '#fff8e1', borderWidth: 1, borderColor: '#f9a825', padding: 16, alignItems: 'center', gap: 6 }}>
            <Text style={{ fontSize: 28 }}>🤝</Text>
            <Text style={{ fontSize: 15, fontWeight: '700', color: '#e65100' }}>已婉拒交流申请</Text>
            <Text style={{ fontSize: 12, color: '#555', textAlign: 'center' }}>
              已礼貌回复组织部，该干部将另行安排。下次交流任职将于180天后再次触发。
            </Text>
            <Pressable
              onPress={() => router.back()}
              style={{ backgroundColor: '#e65100', paddingHorizontal: 24, paddingVertical: 10, marginTop: 4 }}
            >
              <Text style={{ color: '#fff', fontWeight: '700', fontSize: 13 }}>返回首页</Text>
            </Pressable>
          </View>
        )}

        {!done && !officer && (
          <View style={{ backgroundColor: '#fff', borderWidth: 1, borderColor: '#D1D1D1', padding: 24, alignItems: 'center', gap: 8 }}>
            <Text style={{ fontSize: 36 }}>📭</Text>
            <Text style={{ fontSize: 14, color: '#888', textAlign: 'center' }}>当前无待处理的干部交流申请</Text>
            <Text style={{ fontSize: 11, color: '#aaa', textAlign: 'center' }}>每180天将自动触发一次交流任职通知</Text>
          </View>
        )}

        {!done && officer && (
          <>
            {/* 组织部通知函 */}
            <View style={{ backgroundColor: '#fff', borderWidth: 1, borderColor: '#D1D1D1', padding: 14 }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 12 }}>
                <View style={{ backgroundColor: '#1D2D44', paddingHorizontal: 8, paddingVertical: 4 }}>
                  <Text style={{ color: '#fff', fontSize: 10, fontWeight: '700', letterSpacing: 1 }}>组织部 · 交流函</Text>
                </View>
                <Text style={{ color: '#888', fontSize: 10 }}>第{Math.floor((save?.gameDays ?? 0) / 30)}月</Text>
              </View>
              <Text style={{ fontSize: 12, color: '#333', lineHeight: 20 }}>
                根据组织部关于促进干部交流任职的相关规定，{officer.fromCity}现有一名干部
                <Text style={{ fontWeight: '700', color: '#1D2D44' }}>「{officer.name}」</Text>
                申请来贵处交流挂职。请结合工作实际予以审核接收或婉拒。
              </Text>
            </View>

            {/* 干部档案 */}
            <View style={{ backgroundColor: '#fff', borderWidth: 1, borderColor: '#D1D1D1', padding: 14 }}>
              <Text style={{ fontSize: 11, color: '#888', letterSpacing: 2, marginBottom: 12 }}>来访干部档案</Text>

              <View style={{ flexDirection: 'row', gap: 14, marginBottom: 14 }}>
                {/* 头像 */}
                <View style={{ width: 64, height: 64, backgroundColor: '#F0F4F8', alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: '#D1D1D1' }}>
                  <Text style={{ fontSize: 36 }}>{avatar}</Text>
                </View>
                {/* 基本信息 */}
                <View style={{ flex: 1, gap: 4 }}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
                    <Text style={{ fontSize: 17, fontWeight: '700', color: '#1A1A1A' }}>{officer.name}</Text>
                    <Text style={{ fontSize: 11, color: '#888' }}>{officer.gender}</Text>
                    <View style={{ backgroundColor: factionColor + '22', borderWidth: 1, borderColor: factionColor, paddingHorizontal: 5, paddingVertical: 2 }}>
                      <Text style={{ color: factionColor, fontSize: 9, fontWeight: '700' }}>{factionLabel}派</Text>
                    </View>
                  </View>
                  <Text style={{ fontSize: 12, color: '#555' }}>{officer.position}</Text>
                  <View style={{ flexDirection: 'row', gap: 6, flexWrap: 'wrap', marginTop: 2 }}>
                    <View style={{ backgroundColor: '#EEF2F7', paddingHorizontal: 6, paddingVertical: 2 }}>
                      <Text style={{ fontSize: 10, color: '#1D2D44' }}>来自：{officer.fromCity}</Text>
                    </View>
                    <View style={{ backgroundColor: '#E8F0F8', paddingHorizontal: 6, paddingVertical: 2 }}>
                      <Text style={{ fontSize: 10, color: '#1D2D44' }}>职级：{levelName}（{officer.subLevel}级）</Text>
                    </View>
                  </View>
                </View>
              </View>

              {/* 能力数值 */}
              <View style={{ gap: 4 }}>
                <View style={{ flexDirection: 'row', gap: 12 }}>
                  <View style={{ flex: 1 }}>
                    <StatBar label="能力" value={officer.ability} />
                    <StatBar label="忠诚" value={officer.loyalty} />
                  </View>
                  <View style={{ flex: 1 }}>
                    <StatBar label="廉洁" value={officer.integrity} />
                    <StatBar label="经验" value={officer.experience} />
                  </View>
                </View>
              </View>

              {/* 综合评级 */}
              {(() => {
                const avg = Math.floor((officer.ability + officer.loyalty + officer.integrity + officer.experience) / 4);
                const grade = avg >= 75 ? { label: '优秀干部', color: '#2a7a3b', bg: '#e8f5e9' }
                  : avg >= 55 ? { label: '称职干部', color: '#1D2D44', bg: '#EEF2F7' }
                  : { label: '一般干部', color: '#888', bg: '#F5F5F5' };
                return (
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, marginTop: 12, backgroundColor: grade.bg, padding: 10 }}>
                    <Text style={{ fontSize: 12, color: grade.color, fontWeight: '700' }}>综合评级：{grade.label}</Text>
                    <Text style={{ fontSize: 11, color: '#666' }}>综合均值 {avg}/100</Text>
                  </View>
                );
              })()}
            </View>

            {/* 接收/婉拒 操作区 */}
            <View style={{ backgroundColor: '#fff', borderWidth: 1, borderColor: '#D1D1D1', padding: 14, gap: 10 }}>
              <Text style={{ fontSize: 11, color: '#888', letterSpacing: 2, marginBottom: 4 }}>请作出决定</Text>

              {loading ? (
                <ActivityIndicator size="large" color="#1D2D44" />
              ) : (
                <>
                  <Pressable
                    onPress={() => void handleAccept()}
                    style={{ backgroundColor: '#1D2D44', padding: 14, alignItems: 'center' }}
                    android_ripple={{ color: 'rgba(255,255,255,0.15)' }}
                  >
                    <Text style={{ color: '#fff', fontWeight: '700', fontSize: 14 }}>✅ 接收交流干部</Text>
                    <Text style={{ color: '#a0b4cc', fontSize: 11, marginTop: 3 }}>
                      该干部将加入您的下属团队，可分配岗位
                    </Text>
                  </Pressable>

                  <Pressable
                    onPress={handleDecline}
                    style={{ backgroundColor: '#fff', borderWidth: 1, borderColor: '#C82829', padding: 14, alignItems: 'center' }}
                    android_ripple={{ color: 'rgba(200,40,41,0.1)' }}
                  >
                    <Text style={{ color: '#C82829', fontWeight: '700', fontSize: 14 }}>🤝 婉拒申请</Text>
                    <Text style={{ color: '#888', fontSize: 11, marginTop: 3 }}>
                      礼貌回绝，不影响与组织部关系
                    </Text>
                  </Pressable>
                </>
              )}
            </View>

            {/* 说明 */}
            <View style={{ backgroundColor: '#EEF2F7', borderWidth: 1, borderColor: '#D0DCE8', padding: 12 }}>
              <Text style={{ fontSize: 11, color: '#1D2D44', lineHeight: 18 }}>
                💡 干部交流任职是组织部促进干部队伍建设的重要举措。接收外城优秀干部可充实本地管理力量，婉拒不会产生负面影响。下次交流申请将于180天后再次触发。
              </Text>
            </View>
          </>
        )}

        <View style={{ height: 20 }} />
      </ScrollView>
    </View>
  );
}
