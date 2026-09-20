// 申请已驳回页 — 可凭新码重新申请
import { useCallback, useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, Text, View } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { useFocusEffect } from 'expo-router';
import { supabase } from '@/client/supabase';

const C = {
  bg: '#07111E',
  bgCard: '#0F2235',
  gold: '#C8A84B',
  goldLight: '#E8D08A',
  goldDim: '#7A6428',
  goldBg: 'rgba(200,168,75,0.08)',
  red: '#C82829',
  redBg: 'rgba(200,40,41,0.12)',
  textPrimary: '#EDE8DC',
  textSecond: '#A09070',
  textHint: '#5A5040',
  divider: '#162840',
  dividerGold: 'rgba(200,168,75,0.25)',
  successBorder: '#2a7a3b',
  successBg: 'rgba(40,120,60,0.12)',
  successText: '#7FE0A0',
};

export default function RejectedNoticeScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const [reason, setReason] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useFocusEffect(
    useCallback(() => {
      let active = true;
      (async () => {
        const { data } = await supabase.rpc('get_my_test_code_status');
        const d = (data as { approval_status?: string; test_code?: string | null } | null) ?? {};
        if (active) {
          setReason(null);
          setLoading(false);
        }
      })();
      return () => {
        active = false;
      };
    }, []),
  );

  const handleReapply = () => {
    router.replace('/(app)/enter-code');
  };

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    router.replace('/(auth)/sign-in');
  };

  return (
    <View style={{ flex: 1, backgroundColor: C.bg }}>
      <StatusBar style="light" />
      <View style={{ height: 3, backgroundColor: C.gold, position: 'absolute', top: 0, left: 0, right: 0 }} />

      <ScrollView
        contentContainerStyle={{
          flexGrow: 1,
          justifyContent: 'center',
          alignItems: 'center',
          paddingTop: insets.top + 32,
          paddingBottom: insets.bottom + 32,
          paddingHorizontal: 20,
        }}
        showsVerticalScrollIndicator={false}
      >
        <View style={{ alignItems: 'center', marginBottom: 24 }}>
          <Text style={{ fontSize: 40 }}>⛔</Text>
          <Text style={{ fontSize: 26, fontWeight: '900', color: C.red, letterSpacing: 4, marginTop: 12 }}>申请已驳回</Text>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 12 }}>
            <View style={{ width: 32, height: 1, backgroundColor: C.goldDim }} />
            <View style={{ width: 6, height: 6, backgroundColor: C.gold, transform: [{ rotate: '45deg' }] }} />
            <View style={{ width: 32, height: 1, backgroundColor: C.goldDim }} />
          </View>
        </View>

        <View style={{ width: '100%', maxWidth: 400, backgroundColor: C.bgCard, borderWidth: 1, borderColor: C.dividerGold }}>
          <View style={{ height: 2, backgroundColor: C.gold }} />
          <View style={{ padding: 20, gap: 14 }}>
            <Text style={{ fontSize: 13, color: C.textPrimary, lineHeight: 22 }}>
              您的档案申请未通过审核。{'\n'}如有疑问请联系管理员。您可凭新的测试码重新提交申请。
            </Text>

            {loading ? (
              <ActivityIndicator color={C.gold} />
            ) : reason ? (
              <View style={{ backgroundColor: C.redBg, borderLeftWidth: 2, borderLeftColor: C.red, paddingHorizontal: 12, paddingVertical: 8 }}>
                <Text style={{ fontSize: 10, color: C.textSecond, letterSpacing: 2 }}>驳回原因</Text>
                <Text style={{ fontSize: 12, color: '#FF9A9A', marginTop: 4 }}>{reason}</Text>
              </View>
            ) : null}

            {/* 免费声明框 */}
            <View style={{ borderWidth: 1, borderColor: C.successBorder, backgroundColor: C.successBg, paddingHorizontal: 12, paddingVertical: 10 }}>
              <Text style={{ fontSize: 11, color: C.successText, lineHeight: 18 }}>
                ⚠️ 重要声明 · 请务必阅读：本游戏测试码为绝对免费（包括游戏链接也是）。{'\n'}如有任何自称管理员的人向您索要费用，请立即联系频道主高仙。
              </Text>
            </View>

            <Pressable
              onPress={handleReapply}
              cssInterop={false}
              style={{ backgroundColor: C.gold, paddingVertical: 14, alignItems: 'center', marginTop: 4 }}
            >
              <Text style={{ color: '#1A1208', fontWeight: '700', fontSize: 14, letterSpacing: 2 }}>凭新码重新申请</Text>
            </Pressable>
          </View>
          <View style={{ height: 1, backgroundColor: C.dividerGold }} />
        </View>

        <Pressable onPress={handleSignOut} style={{ marginTop: 24 }}>
          <Text style={{ fontSize: 12, color: C.textSecond, letterSpacing: 1 }}>退出登录</Text>
        </Pressable>
      </ScrollView>
    </View>
  );
}