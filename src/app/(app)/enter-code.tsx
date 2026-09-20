// 输入测试码页 — 强制门禁（深色政务风，配色参照 register.tsx）
import { useEffect, useState } from 'react';
import { KeyboardAvoidingView, Pressable, ScrollView, Text, TextInput, View } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { supabase } from '@/client/supabase';
import { getTestCodeSchedule, type ActiveSchedule } from '@/lib/adminApi';
import { getDeviceId } from '@/lib/device';
import { TempAppealModal } from '@/components/TempAppealModal';

const C = {
  bg: '#07111E',
  bgMid: '#0D1B2A',
  bgCard: '#0F2235',
  gold: '#C8A84B',
  goldLight: '#E8D08A',
  goldDim: '#7A6428',
  goldBg: 'rgba(200,168,75,0.08)',
  red: '#C82829',
  redDeep: '#9E1C1D',
  redBg: 'rgba(200,40,41,0.12)',
  textPrimary: '#EDE8DC',
  textSecond: '#A09070',
  textHint: '#5A5040',
  inputBg: '#0A1928',
  inputBorder: '#1E3A5A',
  inputFocus: '#C8A84B',
  divider: '#162840',
  dividerGold: 'rgba(200,168,75,0.25)',
  successBg: 'rgba(40,120,60,0.12)',
  successBorder: '#2a7a3b',
  successText: '#7FE0A0',
};

const ERROR_MAP: Record<string, string> = {
  CODE_NOT_FOUND:     '测试码不存在，请检查后重试',
  CODE_ALREADY_USED:  '该测试码已被使用',
  CODE_DISABLED:      '该测试码已被禁用',
  CODE_EXPIRED:       '该测试码已过期',
  ALREADY_REGISTERED: '您已提交过测试码',
  ALREADY_PENDING:    '您的申请正在审核中，请耐心等待',
  ALREADY_APPROVED:   '您已通过审核，可直接进入游戏',
  SAVE_EXISTS:        '🚫 该账号已有存档，禁止入内。如判断失误，请点击下方「临时申诉」',
  NOT_AUTHENTICATED:  '登录状态异常，请重新登录',
};

export default function EnterCodeScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const [code, setCode] = useState('');
  const [codeFocus, setCodeFocus] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [btnPressed, setBtnPressed] = useState(false);
  const [deviceId, setDeviceId] = useState('');
  // 账号已有存档：展示临时申诉入口
  const [saveExists, setSaveExists] = useState(false);
  const [appealOpen, setAppealOpen] = useState(false);
  // 时间窗口
  const [schedule, setSchedule] = useState<ActiveSchedule | null | undefined>(undefined); // undefined=加载中
  const [scheduleBlocked, setScheduleBlocked] = useState(false);
  const [scheduleHint, setScheduleHint] = useState('');
  // 公告
  const [announcement, setAnnouncement] = useState<{ title: string; content: string } | null>(null);

  useEffect(() => {
    getDeviceId().then((id) => setDeviceId(id));
    // 公告
    supabase.rpc('get_announcement', { p_page_key: 'enter_code' }).then(({ data }) => {
      if (data && Array.isArray(data) && data.length > 0) {
        const r = data[0] as Record<string, unknown>;
        const t = String(r.title ?? '').trim();
        const c = String(r.content ?? '').trim();
        if (t || c) setAnnouncement({ title: t, content: c });
      }
    });
    getTestCodeSchedule().then((sch) => {
      setSchedule(sch);
      if (!sch) { setScheduleBlocked(false); setScheduleHint(''); return; }
      if (!sch.enabled) { setScheduleBlocked(true); setScheduleHint('申请通道当前已关闭，请稍后再试'); return; }
      // 判断当前时间是否在窗口内
      const now = new Date();
      const pad = (n: number) => n.toString().padStart(2, '0');
      const nowStr = `${pad(now.getHours())}:${pad(now.getMinutes())}`;
      if (nowStr < sch.open_time || nowStr > sch.close_time) {
        setScheduleBlocked(true);
        setScheduleHint(`申请通道当前关闭，开放时间：${sch.open_time} — ${sch.close_time}`);
      } else {
        setScheduleBlocked(false);
        setScheduleHint(`开放时段：${sch.open_time} — ${sch.close_time}`);
      }
    }).catch(() => { setSchedule(null); });
  }, []);

  const handleSubmit = async () => {
    const trimmed = code.trim().toUpperCase();
    if (!trimmed) {
      setError('请输入测试码');
      return;
    }
    setLoading(true);
    setError('');
    setSaveExists(false);
    try {
    const { data, error: rpcError } = await supabase.rpc('register_with_test_code', {
        p_test_code: trimmed,
        p_device_id: deviceId || 'unknown',
      });
      if (rpcError) {
        // 服务器错误：显示具体原因（绝不误报 SAVE_EXISTS）
        const msg = rpcError.message ?? '';
        if (msg.includes('ambiguous') || msg.includes('overload')) {
          setError('⚠️ 服务器函数冲突，请联系管理员修复');
        } else if (msg.includes('network') || msg.includes('fetch') || msg.includes('timeout')) {
          setError('⚠️ 网络异常，请检查网络后重试');
        } else if (msg.length > 0) {
          setError(`⚠️ 服务器错误：${msg.slice(0, 60)}`);
        } else {
          setError('⚠️ 因服务器问题提交失败，请稍后重试');
        }
        setLoading(false);
        return;
      }
      // 去除可能的尾随空白/不可见字符，确保与 ERROR_MAP 的 key 精确匹配
      const result = String(data ?? '').trim();
      if (result === 'OK') {
        router.replace('/(app)/pending-approval');
        return;
      }
      if (result === 'AUTO_APPROVED') {
        // 自动审批已通过，直接进入游戏
        router.replace('/(app)/home');
        return;
      }
      if (result === 'SAVE_EXISTS') {
        setSaveExists(true);
      }
      setError(ERROR_MAP[result] ?? `⚠️ 因服务器问题提交失败（${result}），请稍后重试`);
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      if (msg.includes('network') || msg.includes('fetch')) {
        setError('⚠️ 网络连接失败，请检查网络后重试');
      } else {
        setError('⚠️ 因服务器问题提交失败，请稍后重试');
      }
    }
    setLoading(false);
  };

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    router.replace('/(auth)/sign-in');
  };

  return (
    <View style={{ flex: 1, backgroundColor: C.bg }}>
      <StatusBar style="light" />
      <View style={{ height: 3, backgroundColor: C.gold, position: 'absolute', top: 0, left: 0, right: 0 }} />

      <KeyboardAvoidingView behavior={process.env.EXPO_OS === 'ios' ? 'padding' : 'height'} style={{ flex: 1 }}>
        <ScrollView
          contentContainerStyle={{
            flexGrow: 1,
            justifyContent: 'center',
            alignItems: 'center',
            paddingTop: insets.top + 32,
            paddingBottom: insets.bottom + 32,
            paddingHorizontal: 20,
          }}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          <View style={{ alignItems: 'center', marginBottom: 24 }}>
            {/* 公告横幅 */}
            {announcement ? (
              <View style={{ width: '100%', borderWidth: 1, borderColor: C.gold, borderLeftWidth: 3, backgroundColor: C.goldBg, paddingHorizontal: 14, paddingVertical: 10, gap: 4, marginBottom: 16, alignSelf: 'stretch' }}>
                {announcement.title ? (
                  <Text style={{ color: C.goldLight, fontSize: 13, fontWeight: '700' }}>{announcement.title}</Text>
                ) : null}
                {announcement.content ? (
                  <Text style={{ color: C.textPrimary, fontSize: 12, lineHeight: 20 }}>{announcement.content}</Text>
                ) : null}
              </View>
            ) : null}
            <Text style={{ fontSize: 28, fontWeight: '900', color: C.goldLight, letterSpacing: 4 }}>输入测试码</Text>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 12 }}>
              <View style={{ width: 32, height: 1, backgroundColor: C.goldDim }} />
              <View style={{ width: 6, height: 6, backgroundColor: C.gold, transform: [{ rotate: '45deg' }] }} />
              <View style={{ width: 32, height: 1, backgroundColor: C.goldDim }} />
            </View>
            <Text style={{ fontSize: 12, color: C.textSecond, letterSpacing: 1, marginTop: 10, textAlign: 'center' }}>
              测试码格式 TEST-XXXXXX，每码仅可使用一次
            </Text>
            {/* 时间窗口提示条 */}
            {schedule !== undefined && (
              <View style={{ marginTop: 10, backgroundColor: scheduleBlocked ? C.redBg : C.successBg, borderWidth: 1, borderColor: scheduleBlocked ? C.red : C.successBorder, paddingHorizontal: 14, paddingVertical: 7, alignItems: 'center' }}>
                <Text style={{ color: scheduleBlocked ? '#FF7070' : C.successText, fontSize: 11, fontWeight: '600' }}>
                  {scheduleBlocked ? `🔒 ${scheduleHint}` : (scheduleHint ? `🟢 ${scheduleHint}` : '🟢 申请通道开放中')}
                </Text>
              </View>
            )}
          </View>

          <View style={{ width: '100%', maxWidth: 400, backgroundColor: C.bgCard, borderWidth: 1, borderColor: C.dividerGold }}>
            <View style={{ height: 2, backgroundColor: C.gold }} />
            <View style={{ flexDirection: 'row', alignItems: 'center', paddingHorizontal: 20, paddingVertical: 14, borderBottomWidth: 1, borderBottomColor: C.divider, gap: 10 }}>
              <View style={{ width: 3, height: 14, backgroundColor: C.red }} />
              <Text style={{ fontSize: 13, color: C.textPrimary, fontWeight: '700', letterSpacing: 2, flex: 1 }}>档案准入 · 测试码核验</Text>
            </View>

            <View style={{ padding: 20, gap: 14 }}>
              <View>
                <Text style={{ fontSize: 10, color: C.textSecond, letterSpacing: 2, marginBottom: 6 }}>测试码</Text>
                <TextInput
                  style={{
                    borderWidth: 1,
                    borderColor: codeFocus ? C.inputFocus : C.inputBorder,
                    backgroundColor: C.inputBg,
                    paddingHorizontal: 14,
                    paddingVertical: 12,
                    fontSize: 16,
                    color: C.textPrimary,
                    letterSpacing: 2,
                    borderRadius: 0,
                  }}
                  placeholder="TEST-XXXXXX"
                  placeholderTextColor={C.textHint}
                  value={code}
                  onChangeText={(t) => setCode(t.toUpperCase())}
                  onFocus={() => setCodeFocus(true)}
                  onBlur={() => setCodeFocus(false)}
                  autoCapitalize="characters"
                  autoCorrect={false}
                  returnKeyType="done"
                  onSubmitEditing={handleSubmit}
                />
              </View>

              {error ? (
                <View style={{ backgroundColor: C.redBg, borderLeftWidth: 2, borderLeftColor: C.red, paddingHorizontal: 10, paddingVertical: 6 }}>
                  <Text style={{ fontSize: 12, color: '#FF7070', letterSpacing: 0.5 }}>{error}</Text>
                </View>
              ) : null}

              {saveExists ? (
                <Pressable onPress={() => setAppealOpen(true)}
                  style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, marginTop: 2,
                    borderWidth: 1, borderColor: C.dividerGold, backgroundColor: C.goldBg, paddingHorizontal: 16, paddingVertical: 10 }}>
                  <Text style={{ fontSize: 12, color: C.goldLight, fontWeight: '600' }}>📝 判断失误？提交临时申诉</Text>
                </Pressable>
              ) : null}

              <Pressable
                onPress={handleSubmit}
                disabled={loading || scheduleBlocked}
                cssInterop={false}
                onPressIn={() => setBtnPressed(true)}
                onPressOut={() => setBtnPressed(false)}
                style={{ backgroundColor: scheduleBlocked ? C.redDeep : (btnPressed ? C.redDeep : C.red), paddingVertical: 14, alignItems: 'center', opacity: (loading || scheduleBlocked) ? 0.55 : 1, marginTop: 4 }}
              >
                <Text style={{ color: '#fff', fontWeight: '700', fontSize: 14, letterSpacing: 4 }}>
                  {loading ? '核验中...' : (scheduleBlocked ? '通道已关闭' : '提  交')}
                </Text>
              </Pressable>

              {/* 免费声明框 */}
              <View style={{ borderWidth: 1, borderColor: C.successBorder, backgroundColor: C.successBg, paddingHorizontal: 12, paddingVertical: 10, marginTop: 4 }}>
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
      </KeyboardAvoidingView>

      <TempAppealModal visible={appealOpen} onClose={() => setAppealOpen(false)} />
    </View>
  );
}