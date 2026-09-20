// 档案审核中页 — 等待审批（含免费声明 + 已提交测试码显示 + 临时申诉入口）
import { useCallback, useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, Text, View } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { useFocusEffect } from 'expo-router';
import { supabase } from '@/client/supabase';
import { TempAppealModal } from '@/components/TempAppealModal';

const C = {
  bg: '#07111E',
  bgCard: '#0F2235',
  gold: '#C8A84B',
  goldLight: '#E8D08A',
  goldDim: '#7A6428',
  goldBg: 'rgba(200,168,75,0.08)',
  red: '#C82829',
  textPrimary: '#EDE8DC',
  textSecond: '#A09070',
  textHint: '#5A5040',
  divider: '#162840',
  dividerGold: 'rgba(200,168,75,0.25)',
  successBorder: '#2a7a3b',
  successBg: 'rgba(40,120,60,0.12)',
  successText: '#7FE0A0',
};

export default function PendingApprovalScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const [testCode, setTestCode] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  // 临时申诉弹窗
  const [appealOpen, setAppealOpen] = useState(false);

  useFocusEffect(
    useCallback(() => {
      let active = true;
      const check = async () => {
        const { data } = await supabase.rpc('get_my_test_code_status');
        const d = (data as { approval_status?: string; test_code?: string | null } | null) ?? {};
        if (active) {
          setTestCode(d.test_code ?? null);
          setLoading(false);
        }
        // 已通过的临时申诉：通过 gate 重新路由（正确处理角色创建分支）
        const { data: approved } = await supabase.rpc('has_approved_temp_appeal');
        if (active && Boolean(approved)) {
          router.replace('/');
        }
      };
      check();
      // 轮询：管理员同意后自动跳转，无需手动刷新
      const timer = setInterval(check, 3000);
      return () => {
        active = false;
        clearInterval(timer);
      };
    }, [router]),
  );

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
          <Text style={{ fontSize: 40 }}>⏳</Text>
          <Text style={{ fontSize: 26, fontWeight: '900', color: C.goldLight, letterSpacing: 4, marginTop: 12 }}>档案审核中</Text>
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
              您的档案已提交，正在等待管理员审核。{'\n'}审核通过后即可进入游戏，请耐心等待。
            </Text>

            {/* 等待超时提示 */}
            <View style={{ backgroundColor: 'rgba(200,168,75,0.08)', borderLeftWidth: 2, borderLeftColor: C.goldDim, paddingHorizontal: 12, paddingVertical: 10 }}>
              <Text style={{ fontSize: 11, color: C.textSecond, lineHeight: 19 }}>
                💡 如长时间未获得审批，请退出后重新打开链接进入，多试几次。{'\n'}若仍无效，请联系管理员。
              </Text>
            </View>

            {loading ? (
              <ActivityIndicator color={C.gold} />
            ) : testCode ? (
              <View style={{ backgroundColor: C.goldBg, borderLeftWidth: 2, borderLeftColor: C.gold, paddingHorizontal: 12, paddingVertical: 8 }}>
                <Text style={{ fontSize: 10, color: C.textSecond, letterSpacing: 2 }}>已提交的测试码</Text>
                <Text style={{ fontSize: 16, color: C.goldLight, fontWeight: '700', letterSpacing: 2, marginTop: 4 }}>{testCode}</Text>
              </View>
            ) : null}

            {/* 临时申诉入口 */}
            <Pressable onPress={() => setAppealOpen(true)}
              style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, marginTop: 4,
                borderWidth: 1, borderColor: C.dividerGold, backgroundColor: C.goldBg, paddingHorizontal: 16, paddingVertical: 10 }}>
              <Text style={{ fontSize: 12, color: C.goldLight, fontWeight: '600' }}>📝 存档丢失？提交临时申诉</Text>
            </Pressable>

            {/* 免费声明框 */}
            <View style={{ borderWidth: 1, borderColor: C.successBorder, backgroundColor: C.successBg, paddingHorizontal: 12, paddingVertical: 10 }}>
              <Text style={{ fontSize: 11, color: C.successText, lineHeight: 18 }}>
                ⚠️ 重要声明 · 请务必阅读：本游戏测试码为绝对免费（包括游戏链接也是）。{'\n'}如有任何自称管理员的人向您索要费用，请立即联系频道主高仙。
              </Text>
            </View>
          </View>
          <View style={{ height: 1, backgroundColor: C.dividerGold }} />
        </View>

        <Pressable onPress={handleSignOut} style={{ marginTop: 24 }}>
          <Text style={{ fontSize: 12, color: C.textSecond, letterSpacing: 1 }}>退出登录</Text>
        </Pressable>
      </ScrollView>

      {/* 临时申诉弹窗 */}
      <TempAppealModal visible={appealOpen} onClose={() => setAppealOpen(false)} />
    </View>
  );
}