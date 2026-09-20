import { useEffect, useRef, useState } from 'react';
import {
  KeyboardAvoidingView,
  Modal,
  Pressable,
  ScrollView,
  Text,
  TextInput,
  View,
} from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { HelpCircle } from 'lucide-react-native';
import { supabase } from '@/client/supabase';
import { secureStorage } from '@/client/storage';
import { listGameDatabases, setSelectedDatabaseCode as persistSelectedDbCode, type GameDatabaseInfo } from '@/lib/gameDatabase';
import { submitBanAppeal } from '@/lib/adminApi';

/* ─── 配色 ─── */
const C = {
  // 全屏深背景：深墨蓝，仿政务室夜色
  bg:          '#07111E',
  bgMid:       '#0D1B2A',
  bgCard:      '#0F2235',
  // 金色体系：文件金边、印章边框
  gold:        '#C8A84B',
  goldLight:   '#E8D08A',
  goldDim:     '#7A6428',
  goldBg:      'rgba(200,168,75,0.08)',
  // 印章红
  red:         '#C82829',
  redDeep:     '#9E1C1D',
  redBg:       'rgba(200,40,41,0.12)',
  // 文字
  textPrimary: '#EDE8DC',
  textSecond:  '#A09070',
  textHint:    '#5A5040',
  // 表单
  inputBg:     '#0A1928',
  inputBorder: '#1E3A5A',
  inputFocus:  '#C8A84B',
  // 分割
  divider:     '#162840',
  dividerGold: 'rgba(200,168,75,0.25)',
};

/* ─── 装饰：竖向暗纹线 ─── */
function BgLines() {
  return (
    <View style={{ position: 'absolute', inset: 0, opacity: 0.03 }} pointerEvents="none">
      {Array.from({ length: 18 }).map((_, i) => (
        <View key={i} style={{ height: 1, backgroundColor: C.gold, marginTop: 32 }} />
      ))}
    </View>
  );
}

/* ─── 印章组件 ─── */
function Seal() {
  return (
    <View style={{ alignItems: 'center', marginBottom: 24 }}>
      {/* 外圆 */}
      <View style={{
        width: 96, height: 96, borderRadius: 48,
        borderWidth: 2.5, borderColor: C.red,
        alignItems: 'center', justifyContent: 'center',
      }}>
        {/* 内圆 */}
        <View style={{
          width: 78, height: 78, borderRadius: 39,
          borderWidth: 1, borderColor: C.red,
          alignItems: 'center', justifyContent: 'center',
          backgroundColor: C.redBg,
        }}>
          {/* 五角星 */}
          <Text style={{ fontSize: 20, color: C.red, lineHeight: 24 }}>★</Text>
          {/* 竖排文字 */}
          <Text style={{ fontSize: 11, color: C.red, fontWeight: '700', letterSpacing: 2, marginTop: 2 }}>
            青云路
          </Text>
          {/* 底部弧形文字用横排模拟 */}
          <Text style={{ fontSize: 8, color: C.red, letterSpacing: 1, marginTop: 2, opacity: 0.8 }}>
            · 组织部 ·
          </Text>
        </View>
      </View>
    </View>
  );
}

export default function SignIn() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isRegister, setIsRegister] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [emailFocus, setEmailFocus] = useState(false);
  const [pwFocus, setPwFocus] = useState(false);
  const [btnPressed, setBtnPressed] = useState(false);
  // 公告
  const [announcement, setAnnouncement] = useState<{ title: string; content: string } | null>(null);
  // 封禁申诉
  const [showAppeal, setShowAppeal] = useState(false);
  const [appealEmail, setAppealEmail] = useState('');
  const [appealReason, setAppealReason] = useState('');
  const [appealSubmitting, setAppealSubmitting] = useState(false);
  const [appealResult, setAppealResult] = useState<{ ok: boolean; text: string } | null>(null);
  // 忘记密码
  const [showForgotPw, setShowForgotPw] = useState(false);
  const [fpEmail, setFpEmail] = useState('');
  const [fpLoading, setFpLoading] = useState(false);
  const [fpResult, setFpResult] = useState<{ ok: boolean; text: string } | null>(null);

  useEffect(() => {
    (async () => {
      const { data } = await supabase.rpc('get_announcement', { p_page_key: 'login' });
      if (data && Array.isArray(data) && data.length > 0) {
        const r = data[0] as Record<string, unknown>;
        const t = String(r.title ?? '').trim();
        const c = String(r.content ?? '').trim();
        if (t || c) setAnnouncement({ title: t, content: c });
      }
    })();
  }, []);
  // 协议同意
  const [agreedToTerms, setAgreedToTerms] = useState(false);
  const [readAgreement, setReadAgreement] = useState(false);
  const [readPrivacy, setReadPrivacy] = useState(false);
  const [readDisclaimer, setReadDisclaimer] = useState(false);
  const [showAgreement, setShowAgreement] = useState(false);
  const [showPrivacy, setShowPrivacy] = useState(false);
  const [showDisclaimer, setShowDisclaimer] = useState(false);
  // 协议阅读倒计时（每个协议需看完 3 秒才能同意）
  const [agreeCountdown, setAgreeCountdown] = useState(0);
  const [privacyCountdown, setPrivacyCountdown] = useState(0);
  const [disclaimerCountdown, setDisclaimerCountdown] = useState(0);

  // 协议弹窗打开时启动 3 秒倒计时，关闭时重置
  useEffect(() => {
    if (!showAgreement) { setAgreeCountdown(0); return; }
    setAgreeCountdown(3);
    const timer = setInterval(() => {
      setAgreeCountdown((c) => (c <= 1 ? 0 : c - 1));
    }, 1000);
    return () => clearInterval(timer);
  }, [showAgreement]);
  useEffect(() => {
    if (!showPrivacy) { setPrivacyCountdown(0); return; }
    setPrivacyCountdown(3);
    const timer = setInterval(() => {
      setPrivacyCountdown((c) => (c <= 1 ? 0 : c - 1));
    }, 1000);
    return () => clearInterval(timer);
  }, [showPrivacy]);
  useEffect(() => {
    if (!showDisclaimer) { setDisclaimerCountdown(0); return; }
    setDisclaimerCountdown(3);
    const timer = setInterval(() => {
      setDisclaimerCountdown((c) => (c <= 1 ? 0 : c - 1));
    }, 1000);
    return () => clearInterval(timer);
  }, [showDisclaimer]);
  // 多数据库（政务大区）选择
  const [databases, setDatabases] = useState<GameDatabaseInfo[]>([]);
  const [selectedDb, setSelectedDb] = useState('');
  const [dbLoading, setDbLoading] = useState(false);

  // 三个协议是否均已完整阅读（各看完 3 秒）
  const readCount = (readAgreement ? 1 : 0) + (readPrivacy ? 1 : 0) + (readDisclaimer ? 1 : 0);
  const allRead = readCount === 3;

  useEffect(() => {
    if (!isRegister || databases.length > 0) return;
    setDbLoading(true);
    listGameDatabases().then(async (list) => {
      setDatabases(list);
      // 默认推荐玩家数最少的大区
      const recommended = [...list].sort((a, b) => a.player_count - b.player_count)[0];
      if (recommended) {
        setSelectedDb(recommended.code);
        await persistSelectedDbCode(recommended.code);
      }
      setDbLoading(false);
    });
  }, [isRegister, databases.length]);

  const pickDb = async (code: string) => {
    setSelectedDb(code);
    await persistSelectedDbCode(code);
  };

  /** 登录/注册后统一走此函数完成路由熔断：管理员账号直通后台，不经过游戏首页 */
  const routeAfterLogin = async () => {
    try {
      const { data: isAdmin } = await supabase.rpc('is_current_admin');
      if (isAdmin) {
        router.replace('/(app)/admin-panel' as never);
      } else {
        router.replace('/(app)/home');
      }
    } catch {
      // 降级：兜底走游戏首页，home.tsx 自己还有二次检测
      router.replace('/(app)/home');
    }
  };

  const handleAuth = async () => {
    if (!agreedToTerms) {
      setError('请先阅读并同意用户协议与隐私政策');
      return;
    }
    if (!email.trim() || !password.trim()) {
      setError('请输入账号和密码');
      return;
    }
    setLoading(true);
    setError('');
    if (isRegister) {
      const { error: signUpError } = await supabase.auth.signUp({ email, password });
      if (signUpError) {
        const msg = signUpError.message ?? '';
        if (msg.includes('already registered') || msg.includes('already exists')) {
          setError('该账号已注册，请直接登录');
        } else if (msg.includes('invalid') || msg.includes('Invalid')) {
          setError('邮箱格式无效，请检查后重试');
        } else {
          setError(msg || '注册失败，请稍后重试');
        }
        setLoading(false);
        return;
      }
      const { error: signInError } = await supabase.auth.signInWithPassword({ email, password });
      if (signInError) {
        setError('注册成功，请重新登录');
        setIsRegister(false);
        setLoading(false);
        return;
      }
      await routeAfterLogin();
    } else {
      const { error: signInError } = await supabase.auth.signInWithPassword({ email, password });
      if (signInError) {
        const msg = signInError.message ?? '';
        if (msg.toLowerCase().includes('banned') || msg.toLowerCase().includes('user is banned')) {
          // 账号被封禁：显示友好提示 + 申诉入口
          setError('🚫 您的账号已被系统封禁（可能原因：违规操作、重复注册或设备异常）。如需申诉，请点击下方"申请申诉"。');
          setAppealEmail(email.trim());
        } else if (msg.includes('Email not confirmed')) {
          setError('邮箱尚未验证，请联系管理员或稍后重试');
        } else if (msg.includes('Invalid login') || msg.includes('Invalid credentials') || msg.includes('invalid')) {
          setError('账号或密码错误，请重试');
        } else if (msg.includes('rate limit') || msg.includes('too many')) {
          setError('登录请求过于频繁，请稍后再试');
        } else if (msg.length > 0) {
          setError(`登录失败：${msg.slice(0, 60)}`);
        } else {
          setError('登录失败，请稍后重试');
        }
        setLoading(false);
        return;
      }
      await routeAfterLogin();
    }
    setLoading(false);
  };

  // 提交忘记密码（发送重置邮件）
  const handleForgotPassword = async () => {
    const trimmed = fpEmail.trim();
    if (!trimmed) { setFpResult({ ok: false, text: '请输入您的注册邮箱' }); return; }
    setFpLoading(true);
    setFpResult(null);
    const { error } = await supabase.auth.resetPasswordForEmail(trimmed);
    setFpLoading(false);
    if (error) {
      setFpResult({ ok: false, text: `发送失败：${error.message.slice(0, 50)}` });
    } else {
      setFpResult({ ok: true, text: '重置邮件已发送，请检查收件箱（含垃圾箱）并按邮件提示操作。' });
    }
  };

  // 提交封禁申诉
  const handleSubmitAppeal = async () => {
    if (!appealEmail.trim() || appealReason.trim().length < 5) {
      setAppealResult({ ok: false, text: '请填写账号邮箱和不少于5字的申诉理由' });
      return;
    }
    setAppealSubmitting(true);
    setAppealResult(null);
    const res = await submitBanAppeal(appealEmail.trim(), appealReason.trim());
    setAppealSubmitting(false);
    if (res.ok) {
      setAppealResult({ ok: true, text: '申诉已提交，请耐心等待管理员审核。审核通过后将自动解封。' });
      setAppealReason('');
    } else {
      setAppealResult({ ok: false, text: res.err ?? '申诉提交失败，请稍后重试' });
    }
  };

  return (
    <View style={{ flex: 1, backgroundColor: C.bg }}>
      <StatusBar style="light" />
      <BgLines />

      {/* 顶部金色装饰横条 */}
      <View style={{ height: 3, backgroundColor: C.gold, position: 'absolute', top: 0, left: 0, right: 0 }} />

      {/* 右上角伪装入口：点击无效果 */}
      <Pressable
        onPress={() => {}}
        hitSlop={12}
        style={{
          position: 'absolute',
          top: insets.top + 12,
          right: 16,
          width: 36,
          height: 36,
          borderRadius: 18,
          alignItems: 'center',
          justifyContent: 'center',
          backgroundColor: 'rgba(200,168,75,0.12)',
        }}
      >
        <HelpCircle size={20} color={C.gold} />
      </Pressable>

      <KeyboardAvoidingView
        behavior={process.env.EXPO_OS === 'ios' ? 'padding' : 'height'}
        style={{ flex: 1 }}
      >
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
          {/* ── 游戏主标题区 ── */}
          <View style={{ alignItems: 'center', marginBottom: 32 }}>
            {/* 分类标签 */}
            <View style={{ borderWidth: 1, borderColor: C.goldDim, paddingHorizontal: 16, paddingVertical: 4, marginBottom: 16, backgroundColor: C.goldBg }}>
              <Text style={{ fontSize: 10, color: C.textSecond, letterSpacing: 4 }}>
                华夏人民共和国  ·  干部晋升模拟系统
              </Text>
            </View>

            {/* 主标题 */}
            <Text style={{ fontSize: 42, fontWeight: '900', color: C.goldLight, letterSpacing: 8, marginBottom: 6 }}>
              青云路
            </Text>

            {/* 金色装饰线 */}
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 10 }}>
              <View style={{ width: 40, height: 1, backgroundColor: C.goldDim }} />
              <View style={{ width: 6, height: 6, backgroundColor: C.gold, transform: [{ rotate: '45deg' }] }} />
              <View style={{ width: 40, height: 1, backgroundColor: C.goldDim }} />
            </View>

            <Text style={{ fontSize: 12, color: C.textSecond, letterSpacing: 2 }}>
              从科员到国家领导人
            </Text>
          </View>

          {/* ── 印章 ── */}
          <Seal />

          {/* ── 公告横幅（管理员后台发布） ── */}
          {announcement ? (
            <View style={{ width: '100%', maxWidth: 400, borderWidth: 1, borderColor: C.gold, borderLeftWidth: 3, backgroundColor: C.goldBg, paddingHorizontal: 14, paddingVertical: 10, gap: 4, marginBottom: 8 }}>
              {announcement.title ? (
                <Text style={{ color: C.goldLight, fontSize: 13, fontWeight: '700' }}>{announcement.title}</Text>
              ) : null}
              {announcement.content ? (
                <Text style={{ color: C.textPrimary, fontSize: 12, lineHeight: 20 }}>{announcement.content}</Text>
              ) : null}
            </View>
          ) : null}

          {/* ── 登录卡片 ── */}
          <View style={{
            width: '100%',
            maxWidth: 400,
            backgroundColor: C.bgCard,
            borderWidth: 1,
            borderColor: C.dividerGold,
          }}>
            {/* 卡片顶部金条 */}
            <View style={{ height: 2, backgroundColor: C.gold }} />

            {/* 卡片标题 */}
            <View style={{
              flexDirection: 'row', alignItems: 'center',
              paddingHorizontal: 20, paddingVertical: 14,
              borderBottomWidth: 1, borderBottomColor: C.divider,
              gap: 10,
            }}>
              <View style={{ width: 3, height: 14, backgroundColor: C.red }} />
              <Text style={{ fontSize: 13, color: C.textPrimary, fontWeight: '700', letterSpacing: 2, flex: 1 }}>
                {isRegister ? '新建档案 · 初次登记' : '档案登录 · 身份核验'}
              </Text>
              <View style={{ borderWidth: 1, borderColor: C.dividerGold, paddingHorizontal: 6, paddingVertical: 2 }}>
                <Text style={{ fontSize: 9, color: C.textSecond, letterSpacing: 1 }}>内部系统</Text>
              </View>
            </View>

            {/* 表单 */}
            <View style={{ padding: 20, gap: 14 }}>
              {/* 邮箱 */}
              <View>
                <Text style={{ fontSize: 10, color: C.textSecond, letterSpacing: 2, marginBottom: 6 }}>
                  账号（邮箱）
                </Text>
                <TextInput
                  style={{
                    borderWidth: 1,
                    borderColor: emailFocus ? C.inputFocus : C.inputBorder,
                    backgroundColor: C.inputBg,
                    paddingHorizontal: 14,
                    paddingVertical: 12,
                    fontSize: 14,
                    color: C.textPrimary,
                    borderRadius: 0,
                  }}
                  placeholder="请输入邮箱地址"
                  placeholderTextColor={C.textHint}
                  value={email}
                  onChangeText={setEmail}
                  onFocus={() => setEmailFocus(true)}
                  onBlur={() => setEmailFocus(false)}
                  keyboardType="email-address"
                  autoCapitalize="none"
                  autoCorrect={false}
                />
              </View>

              {/* 密码 */}
              <View>
                <Text style={{ fontSize: 10, color: C.textSecond, letterSpacing: 2, marginBottom: 6 }}>
                  密码
                </Text>
                <TextInput
                  style={{
                    borderWidth: 1,
                    borderColor: pwFocus ? C.inputFocus : C.inputBorder,
                    backgroundColor: C.inputBg,
                    paddingHorizontal: 14,
                    paddingVertical: 12,
                    fontSize: 14,
                    color: C.textPrimary,
                    borderRadius: 0,
                  }}
                  placeholder="请输入密码（至少6位）"
                  placeholderTextColor={C.textHint}
                  value={password}
                  onChangeText={setPassword}
                  onFocus={() => setPwFocus(true)}
                  onBlur={() => setPwFocus(false)}
                  secureTextEntry
                  returnKeyType="done"
                  onSubmitEditing={handleAuth}
                />
              </View>

              {/* 选择政务大区（仅注册时） */}
              {isRegister && (
                <View>
                  <Text style={{ fontSize: 10, color: C.textSecond, letterSpacing: 2, marginBottom: 6 }}>
                    选择政务大区（数据库）
                  </Text>
                  {dbLoading ? (
                    <Text style={{ fontSize: 12, color: C.textHint }}>加载大区列表中...</Text>
                  ) : databases.length === 0 ? (
                    <Text style={{ fontSize: 12, color: C.textHint }}>暂无可用大区</Text>
                  ) : (
                    <View style={{ gap: 8 }}>
                      {databases.map((db) => {
                        const ratio = db.capacity_limit > 0 ? Math.min(1, db.player_count / db.capacity_limit) : 0;
                        const full = db.is_full || ratio >= 1;
                        const selected = selectedDb === db.code;
                        return (
                          <Pressable
                            key={db.code}
                            cssInterop={false}
                            disabled={full}
                            onPress={() => pickDb(db.code)}
                            style={{
                              borderWidth: 1,
                              borderColor: selected ? C.gold : full ? C.divider : C.inputBorder,
                              backgroundColor: selected ? C.goldBg : C.inputBg,
                              paddingHorizontal: 12,
                              paddingVertical: 10,
                              opacity: full ? 0.5 : 1,
                            }}
                          >
                            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                              <Text style={{ fontSize: 12, color: full ? C.textHint : C.textPrimary, fontWeight: selected ? '700' : '400' }}>
                                {db.name}
                              </Text>
                              <Text style={{ fontSize: 9, color: full ? C.red : C.textSecond }}>
                                {full ? '已满' : `${db.player_count}/${db.capacity_limit}`}
                              </Text>
                            </View>
                            <View style={{ height: 3, backgroundColor: C.divider, marginTop: 6 }}>
                              <View style={{ height: 3, width: `${Math.round(ratio * 100)}%`, backgroundColor: full ? C.red : C.gold }} />
                            </View>
                          </Pressable>
                        );
                      })}
                    </View>
                  )}
                  <Text style={{ fontSize: 9, color: C.textHint, marginTop: 6, letterSpacing: 0.5 }}>
                    大区满后系统自动开启下一个数据库；存档归属选定库且不可更改
                  </Text>
                </View>
              )}

              {/* 错误提示 */}
              {error ? (
                <View style={{ backgroundColor: C.redBg, borderLeftWidth: 2, borderLeftColor: C.red, paddingHorizontal: 10, paddingVertical: 6 }}>
                  <Text style={{ fontSize: 12, color: '#FF7070', letterSpacing: 0.5 }}>{error}</Text>
                </View>
              ) : null}

              {/* 封禁申诉入口（登录失败且提示含封禁时显示） */}
              {!isRegister && error && error.includes('已被系统封禁') ? (
                <Pressable
                  onPress={() => { setShowAppeal(true); setAppealResult(null); }}
                  cssInterop={false}
                  style={{ borderWidth: 1, borderColor: C.gold, backgroundColor: C.goldBg, paddingVertical: 10, alignItems: 'center' }}
                >
                  <Text style={{ color: C.goldLight, fontSize: 12, fontWeight: '700', letterSpacing: 2 }}>📨 申请申诉解封</Text>
                </Pressable>
              ) : null}

              {/* 主按钮 */}
              <Pressable
                onPress={handleAuth}
                disabled={loading}
                cssInterop={false}
                onPressIn={() => setBtnPressed(true)}
                onPressOut={() => setBtnPressed(false)}
                style={{
                  backgroundColor: btnPressed ? C.redDeep : C.red,
                  paddingVertical: 14,
                  alignItems: 'center',
                  opacity: loading ? 0.65 : 1,
                  marginTop: 4,
                }}
              >
                <Text style={{ color: '#fff', fontWeight: '700', fontSize: 14, letterSpacing: 4 }}>
                  {loading ? '核验中...' : isRegister ? '建  档' : '登  录'}
                </Text>
              </Pressable>

              {/* 免费声明框（注册时展示）*/}
              {isRegister ? (
                <View style={{ borderWidth: 1, borderColor: '#2a7a3b', backgroundColor: 'rgba(40,120,60,0.12)', paddingHorizontal: 12, paddingVertical: 10, marginTop: 4 }}>
                  <Text style={{ fontSize: 11, color: '#7FE0A0', lineHeight: 18 }}>
                    ⚠️ 重要声明 · 请务必阅读：本游戏测试码为绝对免费（包括游戏链接也是）。{'\n'}如有任何自称管理员的人向您索要费用，请立即联系频道主高仙。
                  </Text>
                </View>
              ) : null}

              {/* 切换登录/注册 */}
              <Pressable onPress={() => { setIsRegister(!isRegister); setError(''); }}>
                <Text style={{ textAlign: 'center', fontSize: 12, color: C.textSecond, letterSpacing: 1 }}>
                  {isRegister ? '已有档案？点此登录' : '尚无档案？点此注册'}
                </Text>
              </Pressable>

              {/* 忘记密码入口（仅登录模式） */}
              {!isRegister ? (
                <Pressable
                  onPress={() => { setShowForgotPw(true); setFpEmail(email.trim()); setFpResult(null); }}
                  style={{ alignSelf: 'center', paddingVertical: 4 }}
                >
                  <Text style={{ color: C.goldDim, fontSize: 11, letterSpacing: 0.5, textDecorationLine: 'underline' }}>
                    忘记密码？发送重置邮件
                  </Text>
                </Pressable>
              ) : null}

              {/* 清除本地登录数据（解决 token 损坏 / 设备异常无法登录） */}
              <Pressable
                onPress={async () => {
                  try {
                    await supabase.auth.signOut();
                  } catch { /* 忽略登出异常 */ }
                  // 清除本地持久化的会话与大区选择
                  await secureStorage.removeItem('selected_game_database_code');
                  if (process.env.EXPO_OS === 'web') {
                    setError('已清除本地登录数据，正在刷新页面...');
                    setTimeout(() => window.location.reload(), 600);
                  } else {
                    setError('✓ 已清除本地登录数据，请重新登录');
                  }
                }}
                style={{ alignSelf: 'center', marginTop: 8, paddingHorizontal: 12, paddingVertical: 6, borderWidth: 1, borderColor: C.dividerGold }}
              >
                <Text style={{ color: C.textHint, fontSize: 10, letterSpacing: 0.5 }}>
                  🗑 清除本地登录数据
                </Text>
              </Pressable>
            </View>

            {/* 注册提示 */}
            <View style={{ paddingHorizontal: 20, paddingBottom: 20, alignItems: 'center' }}>
              <Text style={{ textAlign: 'center', fontSize: 11, color: C.goldLight, lineHeight: 18, letterSpacing: 0.5 }}>
                📖 请先完整阅读以上三个协议，方可注册账号
              </Text>
            </View>

            {/* 底部金色条 */}
            <View style={{ height: 1, backgroundColor: C.dividerGold }} />
            {/* 协议同意区 */}
            <View style={{ paddingVertical: 12, paddingHorizontal: 16, backgroundColor: 'rgba(200,168,75,0.04)', gap: 8 }}>
              {/* 复选框行 */}
              <Pressable
                onPress={() => { if (allRead) setAgreedToTerms((v) => !v); }}
                style={{ flexDirection: 'row', alignItems: 'center', gap: 8, opacity: allRead ? 1 : 0.7 }}
              >
                <View style={{
                  width: 18, height: 18,
                  borderWidth: 1.5,
                  borderColor: agreedToTerms ? C.gold : (allRead ? C.goldDim : C.divider),
                  backgroundColor: agreedToTerms ? C.goldBg : 'transparent',
                  alignItems: 'center', justifyContent: 'center',
                }}>
                  {agreedToTerms && <Text style={{ color: C.gold, fontSize: 12, fontWeight: '700', lineHeight: 14 }}>✓</Text>}
                </View>
                <Text style={{ fontSize: 11, color: C.textSecond, flex: 1, lineHeight: 16 }}>
                  我已阅读并同意以下协议，方可进入档案系统
                </Text>
              </Pressable>
              {!allRead && (
                <Text style={{ fontSize: 10, color: C.red, paddingLeft: 26, lineHeight: 14 }}>
                  ⚠️ 请先完整阅读三个协议（已读 {readCount}/3）后才能勾选同意
                </Text>
              )}
              {/* 协议链接行 */}
              <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 4, paddingLeft: 26 }}>
                <Pressable onPress={() => setShowAgreement(true)}>
                  <Text style={{ fontSize: 11, color: C.gold, textDecorationLine: 'underline' }}>《用户协议》</Text>
                </Pressable>
                <Text style={{ fontSize: 11, color: C.textHint }}>及</Text>
                <Pressable onPress={() => setShowPrivacy(true)}>
                  <Text style={{ fontSize: 11, color: C.gold, textDecorationLine: 'underline' }}>《隐私政策》</Text>
                </Pressable>
                <Text style={{ fontSize: 11, color: C.textHint }}>及</Text>
                <Pressable onPress={() => setShowDisclaimer(true)}>
                  <Text style={{ fontSize: 11, color: C.goldLight, textDecorationLine: 'underline' }}>《免责声明》</Text>
                </Pressable>
              </View>
              {!agreedToTerms && (
                <Text style={{ fontSize: 10, color: C.red, paddingLeft: 26, lineHeight: 14 }}>
                  ⚠️ 请勾选同意后方可登录或注册
                </Text>
              )}
            </View>
          </View>

          {/* 底部版本号 */}
          <Text style={{ marginTop: 24, fontSize: 10, color: C.textHint, letterSpacing: 2 }}>
            青云路 · v3.5  ──  严禁泄露账户信息
          </Text>
        </ScrollView>
      </KeyboardAvoidingView>

      {/* ── 忘记密码弹窗 ── */}
      <Modal visible={showForgotPw} transparent animationType="fade" onRequestClose={() => setShowForgotPw(false)}>
        <Pressable style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.75)', justifyContent: 'center', paddingHorizontal: 24 }} onPress={() => setShowForgotPw(false)}>
          <Pressable style={{ backgroundColor: C.bgCard, borderWidth: 1, borderColor: C.dividerGold, padding: 18, gap: 10 }} onPress={() => {}}>
            <View style={{ height: 2, backgroundColor: C.gold, marginBottom: 4 }} />
            <Text style={{ color: C.goldLight, fontSize: 15, fontWeight: '700', letterSpacing: 1 }}>🔑 忘记密码</Text>
            <Text style={{ color: C.textSecond, fontSize: 11, lineHeight: 18 }}>
              输入注册邮箱，系统将发送密码重置链接。请检查收件箱（含垃圾邮件箱）。
            </Text>
            <Text style={{ color: C.textSecond, fontSize: 10, marginTop: 2 }}>注册邮箱</Text>
            <TextInput
              style={{ borderWidth: 1, borderColor: C.inputBorder, backgroundColor: C.inputBg, paddingHorizontal: 12, paddingVertical: 10, color: C.textPrimary, fontSize: 13 }}
              placeholder="请输入您的注册邮箱"
              placeholderTextColor={C.textHint}
              value={fpEmail}
              onChangeText={setFpEmail}
              autoCapitalize="none"
              autoCorrect={false}
              keyboardType="email-address"
            />
            {fpResult ? (
              <View style={{ backgroundColor: fpResult.ok ? 'rgba(42,122,59,0.15)' : C.redBg, borderLeftWidth: 2, borderLeftColor: fpResult.ok ? '#2a7a3b' : C.red, paddingHorizontal: 10, paddingVertical: 8 }}>
                <Text style={{ color: fpResult.ok ? '#7FE0A0' : '#FF7070', fontSize: 11, lineHeight: 17 }}>{fpResult.text}</Text>
              </View>
            ) : null}
            <Pressable
              onPress={handleForgotPassword}
              disabled={fpLoading}
              cssInterop={false}
              style={{ backgroundColor: fpLoading ? C.goldDim : C.gold, paddingVertical: 12, alignItems: 'center', opacity: fpLoading ? 0.6 : 1 }}
            >
              <Text style={{ color: '#07111E', fontWeight: '700', fontSize: 13, letterSpacing: 2 }}>{fpLoading ? '发送中...' : '发送重置邮件'}</Text>
            </Pressable>
            <Pressable onPress={() => { setShowForgotPw(false); setFpResult(null); }} style={{ alignItems: 'center', paddingVertical: 6 }}>
              <Text style={{ color: C.textHint, fontSize: 11 }}>关闭</Text>
            </Pressable>
          </Pressable>
        </Pressable>
      </Modal>

      {/* ── 用户协议弹窗 ── */}
      <Modal visible={showAgreement} transparent animationType="fade" onRequestClose={() => setShowAgreement(false)}>
        <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.75)', justifyContent: 'center', padding: 20 }}>
          <View style={{ backgroundColor: C.bgCard, borderWidth: 1, borderColor: C.dividerGold, maxHeight: '80%' }}>
            <View style={{ height: 2, backgroundColor: C.gold }} />
            <View style={{ padding: 16, borderBottomWidth: 1, borderBottomColor: C.divider, flexDirection: 'row', alignItems: 'center', gap: 8 }}>
              <View style={{ width: 3, height: 14, backgroundColor: C.red }} />
              <Text style={{ color: C.goldLight, fontSize: 14, fontWeight: '700', letterSpacing: 2, flex: 1 }}>用户协议</Text>
            </View>
            <ScrollView style={{ padding: 16 }} showsVerticalScrollIndicator={false}>
              <Text style={{ color: C.textPrimary, fontSize: 12, lineHeight: 22 }}>
                {"《青云路》用户协议\n\n一、服务说明\n《青云路》是一款模拟从政生涯的策略文字游戏，由独立开发者制作，免费提供给玩家体验。\n\n二、账号规范\n1. 每位玩家仅可注册一个正式账号；\n2. 账号数据绑定服务器，请妥善保管您的登录信息；\n3. 禁止将账号转让、出售或共享给他人；\n4. 每台设备仅允许绑定一个账号。\n\n三、行为规范\n1. 禁止利用漏洞或外挂破坏游戏平衡；\n2. 禁止在游戏社区发布违法、违规内容；\n3. 违反规定者，开发者有权封禁账号，不另行通知。\n\n四、服务变更\n开发者保留随时修改、中断或终止服务的权利，恕不另行通知。\n\n五、协议修改\n本协议可能随时更新，继续使用即视为同意最新版本。\n\n更新日期：2026年"}
              </Text>
            </ScrollView>
            <View style={{ padding: 16, borderTopWidth: 1, borderTopColor: C.divider }}>
              <Pressable
                disabled={agreeCountdown > 0}
                onPress={() => { setReadAgreement(true); setShowAgreement(false); }}
                style={{ backgroundColor: agreeCountdown > 0 ? C.goldDim : C.red, paddingVertical: 12, alignItems: 'center', opacity: agreeCountdown > 0 ? 0.6 : 1 }}
              >
                <Text style={{ color: '#fff', fontWeight: '700', fontSize: 13, letterSpacing: 2 }}>{agreeCountdown > 0 ? `请阅读（${agreeCountdown}s）` : '已阅读，同意协议'}</Text>
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>

      {/* ── 隐私政策弹窗 ── */}
      <Modal visible={showPrivacy} transparent animationType="fade" onRequestClose={() => setShowPrivacy(false)}>
        <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.75)', justifyContent: 'center', padding: 20 }}>
          <View style={{ backgroundColor: C.bgCard, borderWidth: 1, borderColor: C.dividerGold, maxHeight: '80%' }}>
            <View style={{ height: 2, backgroundColor: C.gold }} />
            <View style={{ padding: 16, borderBottomWidth: 1, borderBottomColor: C.divider, flexDirection: 'row', alignItems: 'center', gap: 8 }}>
              <View style={{ width: 3, height: 14, backgroundColor: C.red }} />
              <Text style={{ color: C.goldLight, fontSize: 14, fontWeight: '700', letterSpacing: 2, flex: 1 }}>隐私政策</Text>
            </View>
            <ScrollView style={{ padding: 16 }} showsVerticalScrollIndicator={false}>
              <Text style={{ color: C.textPrimary, fontSize: 12, lineHeight: 22 }}>
                {"《青云路》隐私政策\n\n一、信息收集\n本游戏仅收集以下必要信息：\n1. 注册邮箱（用于账号验证与找回）；\n2. 游戏存档数据（存储于云端服务器）；\n3. 设备标识符（用于防止同设备重复注册，保障公平性）。\n\n二、信息使用\n收集的信息仅用于：\n1. 提供正常游戏服务；\n2. 防范恶意注册和账号滥用；\n3. 统计在线数据，改善游戏体验。\n\n三、信息保护\n我们采用加密技术保护您的数据，不会将您的个人信息出售或提供给第三方。\n\n四、信息删除\n您可随时联系管理员申请注销账号，账号注销后相关数据将被永久删除。\n\n五、第三方服务\n本游戏使用 Supabase 提供数据库与认证服务，详情请参阅 Supabase 隐私政策。\n\n六、联系方式\n如有隐私相关问题，请通过游戏内官方渠道联系管理员。\n\n更新日期：2026年"}
              </Text>
            </ScrollView>
            <View style={{ padding: 16, borderTopWidth: 1, borderTopColor: C.divider }}>
              <Pressable
                disabled={privacyCountdown > 0}
                onPress={() => { setReadPrivacy(true); setShowPrivacy(false); }}
                style={{ backgroundColor: privacyCountdown > 0 ? C.goldDim : C.red, paddingVertical: 12, alignItems: 'center', opacity: privacyCountdown > 0 ? 0.6 : 1 }}
              >
                <Text style={{ color: '#fff', fontWeight: '700', fontSize: 13, letterSpacing: 2 }}>{privacyCountdown > 0 ? `请阅读（${privacyCountdown}s）` : '已阅读，同意协议'}</Text>
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>

      {/* ── 免责声明弹窗 ── */}
      <Modal visible={showDisclaimer} transparent animationType="fade" onRequestClose={() => setShowDisclaimer(false)}>
        <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.75)', justifyContent: 'center', padding: 20 }}>
          <View style={{ backgroundColor: C.bgCard, borderWidth: 1, borderColor: C.dividerGold, maxHeight: '80%' }}>
            <View style={{ height: 2, backgroundColor: C.gold }} />
            <View style={{ padding: 16, borderBottomWidth: 1, borderBottomColor: C.divider, flexDirection: 'row', alignItems: 'center', gap: 8 }}>
              <View style={{ width: 3, height: 14, backgroundColor: C.goldLight }} />
              <Text style={{ color: C.goldLight, fontSize: 14, fontWeight: '700', letterSpacing: 2, flex: 1 }}>免责声明</Text>
            </View>
            <ScrollView style={{ padding: 16 }} showsVerticalScrollIndicator={false}>
              <View style={{ borderWidth: 1, borderColor: '#2a7a3b', backgroundColor: 'rgba(40,120,60,0.12)', padding: 12, marginBottom: 14 }}>
                <Text style={{ color: '#7FE0A0', fontSize: 13, fontWeight: '700', lineHeight: 22, letterSpacing: 0.5 }}>
                  ✅ 本游戏《青云路》永久免费{'\n'}✅ 所有激活码（测试码）永久免费{'\n'}✅ 绝无任何付费项目
                </Text>
              </View>
              <Text style={{ color: C.textPrimary, fontSize: 12, lineHeight: 22 }}>
                {"一、内容声明\n本游戏内容纯属虚构，所有人物、事件、机构、地名均为创作设定，不代表任何真实情况、组织或政治立场，仅供休闲娱乐。\n\n二、费用声明\n游戏本体及测试码（激活码）均完全免费，开发者不会以任何名义收取费用。如有人自称【管理员】或【内部人员】向您索取费用，请勿轻信，并立即向官方频道主高仙举报。\n\n三、服务免责\n因服务器维护、版本更新等原因导致的游戏中断或数据异常，开发者不承担赔偿责任。开发者保留随时调整游戏内容、规则及终止服务的权利。\n\n四、风险提示\n沉迷游戏有害身心健康，请合理安排游戏时间。\n\n更新日期：2026年"}
              </Text>
            </ScrollView>
            <View style={{ padding: 16, borderTopWidth: 1, borderTopColor: C.divider }}>
              <Pressable
                disabled={disclaimerCountdown > 0}
                onPress={() => { setReadDisclaimer(true); setShowDisclaimer(false); }}
                style={{ backgroundColor: disclaimerCountdown > 0 ? C.goldDim : C.gold, paddingVertical: 12, alignItems: 'center', opacity: disclaimerCountdown > 0 ? 0.6 : 1 }}
              >
                <Text style={{ color: C.goldLight, fontWeight: '700', fontSize: 13, letterSpacing: 2 }}>{disclaimerCountdown > 0 ? `请阅读（${disclaimerCountdown}s）` : '已知晓'}</Text>
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>

      {/* 封禁申诉弹窗 */}
      <Modal visible={showAppeal} transparent animationType="fade" onRequestClose={() => setShowAppeal(false)}>
        <Pressable style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.75)', justifyContent: 'center', paddingHorizontal: 24 }} onPress={() => setShowAppeal(false)}>
          <Pressable style={{ backgroundColor: C.bgCard, borderWidth: 1, borderColor: C.gold, padding: 18, gap: 10 }} onPress={() => {}}>
            <Text style={{ color: C.goldLight, fontSize: 15, fontWeight: '700', letterSpacing: 1 }}>📨 封禁申诉</Text>
            <Text style={{ color: C.textSecond, fontSize: 11, lineHeight: 18 }}>
              请填写被封禁的账号邮箱与申诉理由，提交后由超级管理员审核。审核通过将自动解封。
            </Text>
            <Text style={{ color: C.textSecond, fontSize: 10, marginTop: 2 }}>账号邮箱</Text>
            <TextInput
              style={{ borderWidth: 1, borderColor: C.inputBorder, backgroundColor: C.inputBg, paddingHorizontal: 12, paddingVertical: 10, color: C.textPrimary, fontSize: 13 }}
              placeholder="请输入被封禁的账号邮箱"
              placeholderTextColor={C.textHint}
              value={appealEmail}
              onChangeText={setAppealEmail}
              autoCapitalize="none"
              autoCorrect={false}
              keyboardType="email-address"
            />
            <Text style={{ color: C.textSecond, fontSize: 10 }}>申诉理由（不少于5字）</Text>
            <TextInput
              style={{ borderWidth: 1, borderColor: C.inputBorder, backgroundColor: C.inputBg, paddingHorizontal: 12, paddingVertical: 10, color: C.textPrimary, fontSize: 13, minHeight: 80 }}
              placeholder="请说明情况，如：非本人多开、误判等"
              placeholderTextColor={C.textHint}
              value={appealReason}
              onChangeText={setAppealReason}
              multiline
              textAlignVertical="top"
            />
            {appealResult ? (
              <View style={{ backgroundColor: appealResult.ok ? 'rgba(42,122,59,0.15)' : C.redBg, borderLeftWidth: 2, borderLeftColor: appealResult.ok ? '#2a7a3b' : C.red, paddingHorizontal: 10, paddingVertical: 6 }}>
                <Text style={{ color: appealResult.ok ? '#7FE0A0' : '#FF7070', fontSize: 11 }}>{appealResult.text}</Text>
              </View>
            ) : null}
            <Pressable
              onPress={handleSubmitAppeal}
              disabled={appealSubmitting}
              cssInterop={false}
              style={{ backgroundColor: appealSubmitting ? C.goldDim : C.gold, paddingVertical: 12, alignItems: 'center', opacity: appealSubmitting ? 0.6 : 1 }}
            >
              <Text style={{ color: '#07111E', fontWeight: '700', fontSize: 13, letterSpacing: 2 }}>{appealSubmitting ? '提交中...' : '提交申诉'}</Text>
            </Pressable>
            <Pressable onPress={() => setShowAppeal(false)} style={{ alignItems: 'center', paddingVertical: 6 }}>
              <Text style={{ color: C.textHint, fontSize: 11 }}>关闭</Text>
            </Pressable>
          </Pressable>
        </Pressable>
      </Modal>
    </View>
  );
}
