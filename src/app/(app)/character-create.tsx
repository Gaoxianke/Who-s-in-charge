// 角色创建页面 — 干部履历登记表（重设计版）
import { useState, useMemo, useCallback } from 'react';
import { View, Text, TextInput, Pressable, ScrollView, KeyboardAvoidingView, ActivityIndicator } from 'react-native';
import { useRouter } from 'expo-router';
import { useFocusEffect } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { supabase } from '@/client/supabase';
import { resolveGateTarget, gateTargetHref } from '@/lib/approvalGate';
import type { RelativePathString } from 'expo-router';
import { completeCharacterCreation, createSave, getSave } from '@/db/gameApi';
import { useGame } from '@/ctx/GameContext';
import { checkCreateSaveName, debounceCheckName } from '@/lib/sensitiveFilter';
import {
  MALE_AVATARS, FEMALE_AVATARS, SCHOOL_BONUS,
  canApplyZhongXuanDiao, getZhongXuanDiaoMinAge,
  PROVINCE_LIST, PROVINCE_CITY_MAP,
  UNIVERSITY_985, UNIVERSITY_211, UNIVERSITY_NORMAL,
  UNIVERSITY_ZHUANKE_SUFFIXES, pickUniversityName,
} from '@/types/game';
import type { DegreeType } from '@/types/game';

/* ─────────── 配色 ─────────── */
const C = {
  bg:           '#F2EFEA',   // 档案纸米黄
  headerBg:     '#8B1A1A',   // 红头横幅
  headerText:   '#FFFFFF',
  headerSub:    'rgba(255,255,255,0.72)',
  navy:         '#1A2B3C',   // 深蓝正文
  red:          '#C82829',   // 印章红
  redLight:     '#FFF0F0',
  blue:         '#1D3B5E',   // 组织蓝
  blueLight:    '#EDF3FA',
  gold:         '#C8A84B',
  cardBg:       '#FEFCF8',   // 卡片白
  cardBorder:   '#D8D0C0',
  sectionBg:    '#F0EDE6',   // 分区背景
  label:        '#5A4E3C',
  muted:        '#9A8E7E',
  faint:        '#C8C0B0',
  inputBg:      '#FDFBF8',
  inputBorder:  '#C8C0B0',
  divider:      '#E0D8CC',
  successBg:    '#F0FAF0',
  warningBg:    '#FFF8EC',
};

type SchoolTier = '985院校' | '211院校' | '普通本科' | '大专院校';
const SCHOOL_TIERS: SchoolTier[] = ['985院校', '211院校', '普通本科', '大专院校'];
const SCHOOL_DESC: Record<SchoolTier, string> = {
  '985院校': '名校精英，初始能力 +10',
  '211院校': '重点高校，初始能力 +5',
  '普通本科': '扎实基础，均衡发展',
  '大专院校': '基层起步，初始能力 -5',
};
const SCHOOL_ICON: Record<SchoolTier, string> = {
  '985院校': '🏛️',
  '211院校': '🎓',
  '普通本科': '📚',
  '大专院校': '📖',
};
const DEGREES: DegreeType[] = ['本科', '硕士', '博士'];
const DEGREE_DESC: Record<DegreeType, string> = {
  '本科': '基础学历',
  '硕士': '可报选调，副科起步',
  '博士': '可报选调，正科起步',
};
const AGES = Array.from({ length: 11 }, (_, i) => 18 + i);

function getUniversityList(tier: SchoolTier, province?: string): string[] {
  if (tier === '985院校') return UNIVERSITY_985;
  if (tier === '211院校') return UNIVERSITY_211;
  if (tier === '普通本科') return UNIVERSITY_NORMAL;
  const cities = province ? (PROVINCE_CITY_MAP[province] ?? []) : [];
  const generated = new Set<string>();
  while (generated.size < 10) {
    const prefix = cities.length > 0
      ? cities[Math.floor(Math.random() * cities.length)].replace(/市|区|县/, '')
      : ['江南', '淮海', '云岭', '南湖', '桂江', '平原', '滨海'][Math.floor(Math.random() * 7)];
    const suffix = UNIVERSITY_ZHUANKE_SUFFIXES[Math.floor(Math.random() * UNIVERSITY_ZHUANKE_SUFFIXES.length)];
    generated.add(prefix + suffix);
  }
  return [...generated];
}

/* ─── 分区标题 ─── */
function SectionHeader({ no, title, subtitle }: { no: string; title: string; subtitle?: string }) {
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 14, gap: 10 }}>
      {/* 序号框 */}
      <View style={{ width: 26, height: 26, backgroundColor: C.red, alignItems: 'center', justifyContent: 'center' }}>
        <Text style={{ color: '#fff', fontWeight: '900', fontSize: 12 }}>{no}</Text>
      </View>
      <View style={{ flex: 1 }}>
        <Text style={{ fontSize: 13, fontWeight: '700', color: C.navy, letterSpacing: 2 }}>{title}</Text>
        {subtitle && <Text style={{ fontSize: 10, color: C.muted, marginTop: 1 }}>{subtitle}</Text>}
      </View>
      <View style={{ width: 40, height: 1, backgroundColor: C.divider }} />
    </View>
  );
}

/* ─── 分区容器 ─── */
function Section({ children }: { children: React.ReactNode }) {
  return (
    <View style={{
      backgroundColor: C.cardBg,
      borderWidth: 1,
      borderColor: C.cardBorder,
      padding: 16,
      marginBottom: 12,
    }}>
      {children}
    </View>
  );
}

/* ─── 字段标签 ─── */
function FieldLabel({ label, hint }: { label: string; hint?: string }) {
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 7 }}>
      <View style={{ width: 2, height: 12, backgroundColor: C.red }} />
      <Text style={{ fontSize: 11, color: C.label, fontWeight: '700', letterSpacing: 1.5 }}>{label}</Text>
      {hint && <Text style={{ fontSize: 10, color: C.muted }}>{hint}</Text>}
    </View>
  );
}

export default function CharacterCreateScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { save, refreshSave } = useGame();

  const [name, setName] = useState('');
  const [gender, setGender] = useState<'男' | '女'>('男');
  const [age, setAge] = useState(22);
  const [avatarIdx, setAvatarIdx] = useState(0);
  const [birthProvince, setBirthProvince] = useState(PROVINCE_LIST[0]);
  const [birthCity, setBirthCity] = useState(PROVINCE_CITY_MAP[PROVINCE_LIST[0]]![0]);
  const [showProvinceList, setShowProvinceList] = useState(false);
  const [showCityList, setShowCityList] = useState(false);
  const [schoolTier, setSchoolTier] = useState<SchoolTier>('普通本科');
  const [degree, setDegree] = useState<DegreeType>('本科');
  const [isZhongXuanDiao, setIsZhongXuanDiao] = useState(false);
  const [universityName, setUniversityName] = useState<string>('');
  const [showUniversityList, setShowUniversityList] = useState(false);
  const universityList = useMemo(
    () => getUniversityList(schoolTier, birthProvince),
    [schoolTier, birthProvince],
  );
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [nameWarn, setNameWarn] = useState(''); // 机制①：实时客户端检测
  const [submitPressed, setSubmitPressed] = useState(false);
  // 门禁：未通过审批前不展示创建表单
  const [gateChecked, setGateChecked] = useState(false);

  useFocusEffect(
    useCallback(() => {
      let active = true;
      (async () => {
        // 管理员检查：失败时降级为普通用户，绝不能阻塞 gateChecked
        let isAdminUser = false;
        try {
          const { data: adminData } = await supabase.rpc('is_current_admin');
          isAdminUser = Boolean(adminData);
        } catch (e) {
          console.error('[character-create] 管理员检查失败:', e);
          isAdminUser = false;
        }
        if (isAdminUser) {
          if (active) setGateChecked(true);
          return;
        }
        // 门禁检查：失败时静默放行，避免阻塞页面渲染
        try {
          const target = await resolveGateTarget(true);
          if (target === 'character-create') {
            if (active) setGateChecked(true);
          } else {
            router.replace(gateTargetHref(target) as RelativePathString);
          }
        } catch (e) {
          console.error('[character-create] 门禁检查失败:', e);
          // 门禁失败时静默放行，避免网络异常导致白屏
          if (active) setGateChecked(true);
        }
      })();
      return () => {
        active = false;
      };
    }, [router]),
  );

  if (!gateChecked) {
    return (
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: C.bg }}>
        <StatusBar style="light" />
        <ActivityIndicator size="large" color={C.red} />
        <Text style={{ marginTop: 12, fontSize: 12, color: C.muted, letterSpacing: 1 }}>正在验证档案资格...</Text>
      </View>
    );
  }

  const avatarPool = gender === '女' ? FEMALE_AVATARS : MALE_AVATARS;
  const zhongXuanUnlocked = canApplyZhongXuanDiao(
    schoolTier === '985院校' ? '985院校' : schoolTier, degree,
  );
  const minAge = isZhongXuanDiao ? getZhongXuanDiaoMinAge(degree) : 18;
  const birthYear = 2025 - age;
  const studyYears = degree === '博士' ? 9 : degree === '硕士' ? 6 : 4;
  const gradYear = birthYear + 18 + studyYears;
  const displayUniversity = universityName || (universityList[0] ?? '（请选择院校）');
  const previewSchool = isZhongXuanDiao
    ? `${displayUniversity} · ${degree}（选调生）`
    : `${displayUniversity} · ${schoolTier === '大专院校' ? '专科' : degree}`;

  const handleSchoolTierChange = (s: SchoolTier) => {
    setSchoolTier(s);
    setUniversityName('');
    if (!canApplyZhongXuanDiao(s === '985院校' ? '985院校' : s, degree)) setIsZhongXuanDiao(false);
  };
  const handleDegreeChange = (d: DegreeType) => {
    setDegree(d);
    if (!canApplyZhongXuanDiao(schoolTier === '985院校' ? '985院校' : schoolTier, d)) setIsZhongXuanDiao(false);
    const newMin = getZhongXuanDiaoMinAge(d);
    if (isZhongXuanDiao && age < newMin) setAge(newMin);
  };
  const handleZhongXuanToggle = () => {
    const next = !isZhongXuanDiao;
    setIsZhongXuanDiao(next);
    if (next) {
      const newMin = getZhongXuanDiaoMinAge(degree);
      if (age < newMin) setAge(newMin);
    }
  };
  const handleProvinceSelect = (p: string) => {
    setBirthProvince(p);
    const cities = PROVINCE_CITY_MAP[p] ?? [];
    setBirthCity(cities[0] ?? '');
    setShowProvinceList(false);
    setUniversityName('');
  };

  const handleCreate = async () => {
    if (!name.trim()) { setError('请填写姓名'); return; }
    if (isZhongXuanDiao && age < minAge) {
      setError(`选调${degree}生最低入职年龄为 ${minAge} 岁`);
      return;
    }
    setLoading(true);
    setError('');
    // 机制②：提交前客户端二次校验
    const nameCheck = await checkCreateSaveName(name.trim());
    if (!nameCheck.ok) {
      setError(nameCheck.message);
      setNameWarn(nameCheck.message);
      setLoading(false);
      return;
    }
    // 无存档时先创建占位档（拆分后建档职责下放到角色创建页）
    // 提交前先从数据库重新拉取一次存档，确保重试场景能复用上一次创建的占位档（context 里的 save 可能滞后）
    let saveId = save?.id;
    if (!saveId) {
      const latest = await getSave();
      saveId = latest?.id;
    }
    if (!saveId) {
      const created = await createSave();
      if (!created) {
        setError('建档失败，请检查网络后重试；若多次失败请重新登录后再试');
        setLoading(false);
        return;
      }
      saveId = created.id;
    }
    const finalUniversity = universityName || displayUniversity;
    const degreeStr = schoolTier === '大专院校' ? '专科' : degree;
    const result = await completeCharacterCreation(saveId, {
      playerName:    name.trim(),
      playerGender:  gender,
      playerAge:     age,
      avatarId:      avatarIdx,
      school:        schoolTier,
      isZhongXuanDiao,
      degree,
      birthYear,
      birthProvince,
      birthCity,
      universityName: `${finalUniversity}（${degreeStr}）`,
    });
    if (!result) {
      setError('建档失败，请重试');
      setLoading(false);
      return;
    }
    await refreshSave();
    router.replace('/(app)/home');
  };

  /* ─── 下拉选择框 ─── */
  function DropdownPicker({
    value, onPress, placeholder,
  }: { value: string; onPress: () => void; placeholder: string }) {
    const [pressed, setPressed] = useState(false);
    return (
      <Pressable
        onPress={onPress}
        cssInterop={false}
        onPressIn={() => setPressed(true)}
        onPressOut={() => setPressed(false)}
        style={{
          borderWidth: 1,
          borderColor: pressed ? C.red : C.inputBorder,
          backgroundColor: C.inputBg,
          paddingHorizontal: 12,
          paddingVertical: 11,
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'space-between',
        }}
      >
        <Text style={{ fontSize: 13, color: value ? C.navy : C.faint, flex: 1 }} numberOfLines={1}>
          {value || placeholder}
        </Text>
        <Text style={{ color: C.muted, fontSize: 10, marginLeft: 6 }}>▾</Text>
      </Pressable>
    );
  }

  function DropdownList({
    items, selected, onSelect,
  }: { items: string[]; selected: string; onSelect: (v: string) => void }) {
    return (
      <View style={{ borderWidth: 1, borderColor: C.inputBorder, borderTopWidth: 0, backgroundColor: '#fff', maxHeight: 180, zIndex: 20 }}>
        <ScrollView nestedScrollEnabled showsVerticalScrollIndicator={false}>
          {items.map(item => (
            <Pressable
              key={item}
              onPress={() => onSelect(item)}
              style={{ paddingHorizontal: 12, paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: C.divider,
                backgroundColor: selected === item ? C.redLight : '#fff' }}
            >
              <Text style={{ fontSize: 13, color: selected === item ? C.red : C.navy, fontWeight: selected === item ? '700' : '400' }}>
                {item}
              </Text>
            </Pressable>
          ))}
        </ScrollView>
      </View>
    );
  }

  return (
    <KeyboardAvoidingView
      behavior={process.env.EXPO_OS === 'ios' ? 'padding' : 'height'}
      style={{ flex: 1, backgroundColor: C.bg }}
    >
      <StatusBar style="light" backgroundColor={C.headerBg} />
      <ScrollView
        contentContainerStyle={{ flexGrow: 1 }}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        {/* ━━━━━━━━━━━━━━━━━ 红头横幅 ━━━━━━━━━━━━━━━━━ */}
        <View style={{ backgroundColor: C.headerBg, paddingTop: insets.top + 14, paddingBottom: 18, paddingHorizontal: 20 }}>
          {/* 顶部编号 */}
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 10 }}>
            <Text style={{ fontSize: 10, color: C.headerSub, letterSpacing: 2 }}>
              华夏人民共和国 · 中枢组织部
            </Text>
            <Text style={{ fontSize: 10, color: C.headerSub, letterSpacing: 1 }}>
              组干字〔2025〕001号
            </Text>
          </View>

          {/* 红线 */}
          <View style={{ height: 2, backgroundColor: C.gold, marginBottom: 12 }} />

          {/* 主标题 */}
          <Text style={{ fontSize: 22, fontWeight: '900', color: '#fff', letterSpacing: 4, textAlign: 'center', marginBottom: 4 }}>
            干  部  履  历  登  记  表
          </Text>
          <Text style={{ fontSize: 11, color: C.headerSub, textAlign: 'center', letterSpacing: 2 }}>
            请如实填写，组织严格保密 · 一经提交不可修改
          </Text>

          {/* 底部金线 */}
          <View style={{ height: 1, backgroundColor: C.gold, marginTop: 12, opacity: 0.5 }} />
        </View>

        {/* ━━━━━━━━━━━━━━━━━ 表格内容 ━━━━━━━━━━━━━━━━━ */}
        <View style={{ padding: 14 }}>

          {/* ─── 第一节：基本信息 ─── */}
          <Section>
            <SectionHeader no="一" title="基本信息" subtitle="姓名、性别及头像" />

            {/* 姓名行 */}
            <View style={{ flexDirection: 'row', gap: 12, marginBottom: 14 }}>
              <View style={{ flex: 1 }}>
                <FieldLabel label="姓名" hint="（限6字）" />
                <TextInput
                  style={{
                    borderWidth: 1, borderColor: C.inputBorder,
                    backgroundColor: C.inputBg,
                    paddingHorizontal: 12, paddingVertical: 11,
                    fontSize: 15, color: C.navy, letterSpacing: 1,
                  }}
                  placeholder="请输入真实姓名"
                  placeholderTextColor={C.faint}
                  value={name}
                  onChangeText={(v) => {
                    setName(v);
                    setNameWarn('');
                    // 机制①：防抖实时检测
                    debounceCheckName(v.trim(), (hit) => {
                      setNameWarn(hit ? '⚠️ 当前名字已违规，请重新整改' : '');
                    });
                  }}
                  maxLength={6}
                />
                {/* 机制①：实时违规提示 */}
                {!!nameWarn && (
                  <View style={{ backgroundColor: '#FFF3CD', borderLeftWidth: 2, borderLeftColor: '#FFC107',
                    paddingHorizontal: 10, paddingVertical: 6, marginTop: 4 }}>
                    <Text style={{ fontSize: 11, color: '#856404' }}>{nameWarn}</Text>
                  </View>
                )}
              </View>
              <View style={{ width: 80 }}>
                <FieldLabel label="性别" />
                <View style={{ flexDirection: 'row', gap: 6 }}>
                  {(['男', '女'] as const).map(g => (
                    <Pressable
                      key={g}
                      onPress={() => { setGender(g); setAvatarIdx(0); }}
                      style={{ flex: 1, paddingVertical: 11, alignItems: 'center',
                        backgroundColor: gender === g ? C.red : C.inputBg,
                        borderWidth: 1,
                        borderColor: gender === g ? C.red : C.inputBorder,
                      }}
                    >
                      <Text style={{ fontWeight: '700', fontSize: 13, color: gender === g ? '#fff' : C.navy }}>
                        {g}
                      </Text>
                    </Pressable>
                  ))}
                </View>
              </View>
            </View>

            {/* 头像 */}
            <FieldLabel label="证件头像" hint="（点击选择）" />
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
              {avatarPool.map((emoji, idx) => (
                <Pressable
                  key={idx}
                  onPress={() => setAvatarIdx(idx)}
                  style={{
                    width: 52, height: 52,
                    alignItems: 'center', justifyContent: 'center',
                    borderWidth: avatarIdx === idx ? 2 : 1,
                    borderColor: avatarIdx === idx ? C.red : C.inputBorder,
                    backgroundColor: avatarIdx === idx ? C.redLight : C.inputBg,
                  }}
                >
                  <Text style={{ fontSize: 28 }}>{emoji}</Text>
                </Pressable>
              ))}
            </View>
          </Section>

          {/* ─── 第二节：出生地 ─── */}
          <Section>
            <SectionHeader no="二" title="出生地信息" subtitle="户籍省份及城市" />

            <View style={{ flexDirection: 'row', gap: 10 }}>
              {/* 省份 */}
              <View style={{ flex: 1 }}>
                <FieldLabel label="省份" />
                <DropdownPicker
                  value={birthProvince}
                  placeholder="选择省份"
                  onPress={() => { setShowProvinceList(!showProvinceList); setShowCityList(false); }}
                />
                {showProvinceList && (
                  <DropdownList
                    items={PROVINCE_LIST}
                    selected={birthProvince}
                    onSelect={handleProvinceSelect}
                  />
                )}
              </View>
              {/* 城市 */}
              <View style={{ flex: 1 }}>
                <FieldLabel label="城市" />
                <DropdownPicker
                  value={birthCity}
                  placeholder="选择城市"
                  onPress={() => { setShowCityList(!showCityList); setShowProvinceList(false); }}
                />
                {showCityList && (
                  <DropdownList
                    items={PROVINCE_CITY_MAP[birthProvince] ?? []}
                    selected={birthCity}
                    onSelect={(c) => { setBirthCity(c); setShowCityList(false); }}
                  />
                )}
              </View>
            </View>
            <Text style={{ fontSize: 10, color: C.muted, marginTop: 8 }}>
              📅 出生年份将自动推算为 {birthYear} 年
            </Text>
          </Section>

          {/* ─── 第三节：学历信息 ─── */}
          <Section>
            <SectionHeader no="三" title="学历背景" subtitle="院校层次、就读院校及最高学历" />

            {/* 院校层次 */}
            <FieldLabel label="院校层次" />
            <View style={{ gap: 6, marginBottom: 14 }}>
              {SCHOOL_TIERS.map(s => {
                const bonus = SCHOOL_BONUS[s] ?? 0;
                const isSelected = schoolTier === s;
                return (
                  <Pressable
                    key={s}
                    onPress={() => handleSchoolTierChange(s)}
                    style={{
                      flexDirection: 'row', alignItems: 'center',
                      paddingHorizontal: 12, paddingVertical: 11,
                      borderWidth: 1,
                      borderColor: isSelected ? C.blue : C.inputBorder,
                      backgroundColor: isSelected ? C.blue : C.inputBg,
                      gap: 10,
                    }}
                  >
                    <Text style={{ fontSize: 18 }}>{SCHOOL_ICON[s]}</Text>
                    <View style={{ flex: 1 }}>
                      <Text style={{ fontSize: 13, fontWeight: '700', color: isSelected ? '#fff' : C.navy }}>
                        {s}
                      </Text>
                      <Text style={{ fontSize: 10, marginTop: 1, color: isSelected ? 'rgba(255,255,255,0.7)' : C.muted }}>
                        {SCHOOL_DESC[s]}
                      </Text>
                    </View>
                    <View style={{
                      paddingHorizontal: 8, paddingVertical: 3,
                      backgroundColor: isSelected ? 'rgba(255,255,255,0.18)' : C.sectionBg,
                      borderWidth: 1, borderColor: isSelected ? 'rgba(255,255,255,0.3)' : C.divider,
                    }}>
                      <Text style={{ fontSize: 12, fontWeight: '700', color: isSelected ? '#FFD066' : (bonus >= 0 ? C.blue : C.red) }}>
                        {bonus >= 0 ? `+${bonus}` : `${bonus}`}
                      </Text>
                    </View>
                  </Pressable>
                );
              })}
            </View>

            {/* 就读院校 */}
            <FieldLabel label="就读院校" />
            <DropdownPicker
              value={displayUniversity}
              placeholder="请选择院校"
              onPress={() => setShowUniversityList(!showUniversityList)}
            />
            {showUniversityList && (
              <DropdownList
                items={universityList}
                selected={universityName}
                onSelect={(u) => { setUniversityName(u); setShowUniversityList(false); }}
              />
            )}
            <Text style={{ fontSize: 10, color: C.muted, marginTop: 6, marginBottom: 14 }}>
              📅 预计毕业年份：{gradYear} 年
            </Text>

            {/* 最高学历（专科隐藏） */}
            {schoolTier !== '大专院校' && (
              <>
                <FieldLabel label="最高学历" />
                <View style={{ flexDirection: 'row', gap: 8 }}>
                  {DEGREES.map(d => {
                    const isSelected = degree === d;
                    return (
                      <Pressable
                        key={d}
                        onPress={() => handleDegreeChange(d)}
                        style={{
                          flex: 1, paddingVertical: 10, alignItems: 'center',
                          borderWidth: 1,
                          borderColor: isSelected ? C.blue : C.inputBorder,
                          backgroundColor: isSelected ? C.blue : C.inputBg,
                        }}
                      >
                        <Text style={{ fontSize: 13, fontWeight: '700', color: isSelected ? '#fff' : C.navy }}>
                          {d}
                        </Text>
                        <Text style={{ fontSize: 9, marginTop: 2, color: isSelected ? 'rgba(255,255,255,0.65)' : C.muted }}>
                          {DEGREE_DESC[d]}
                        </Text>
                      </Pressable>
                    );
                  })}
                </View>
              </>
            )}
          </Section>

          {/* ─── 第四节：入职年龄 ─── */}
          <Section>
            <SectionHeader no="四" title="入职信息" subtitle="首次参加公务员工作的年龄" />
            <FieldLabel label="入职年龄" hint={isZhongXuanDiao ? `（选调${degree}生 ≥ ${minAge}岁）` : undefined} />
            <ScrollView horizontal showsHorizontalScrollIndicator={false}>
              <View style={{ flexDirection: 'row', gap: 6 }}>
                {AGES.map(a => {
                  const disabled = a < minAge;
                  const isSelected = age === a;
                  return (
                    <Pressable
                      key={a}
                      onPress={() => !disabled && setAge(a)}
                      disabled={disabled}
                      style={{
                        paddingHorizontal: 14, paddingVertical: 10,
                        borderWidth: 1,
                        borderColor: isSelected ? C.blue : disabled ? C.divider : C.inputBorder,
                        backgroundColor: isSelected ? C.blue : disabled ? '#F4F2EE' : C.inputBg,
                      }}
                    >
                      <Text style={{
                        fontWeight: '700', fontSize: 13,
                        color: isSelected ? '#fff' : disabled ? C.faint : C.navy,
                      }}>
                        {a}岁
                      </Text>
                    </Pressable>
                  );
                })}
              </View>
            </ScrollView>
          </Section>

          {/* ─── 第五节：选调生 ─── */}
          {zhongXuanUnlocked && (
            <Pressable
              onPress={handleZhongXuanToggle}
              style={{
                marginBottom: 12,
                borderWidth: isZhongXuanDiao ? 2 : 1,
                borderColor: isZhongXuanDiao ? C.red : C.cardBorder,
                overflow: 'hidden',
              }}
            >
              {/* 选调生标头 */}
              <View style={{
                flexDirection: 'row', alignItems: 'center',
                padding: 14, gap: 12,
                backgroundColor: isZhongXuanDiao ? C.red : C.cardBg,
              }}>
                <View style={{
                  width: 40, height: 40, borderRadius: 20,
                  backgroundColor: isZhongXuanDiao ? 'rgba(255,255,255,0.2)' : C.redLight,
                  alignItems: 'center', justifyContent: 'center',
                }}>
                  <Text style={{ fontSize: 20 }}>🏅</Text>
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={{ fontSize: 14, fontWeight: '700', letterSpacing: 1,
                    color: isZhongXuanDiao ? '#fff' : C.red }}>
                    中央选调生通道
                  </Text>
                  <Text style={{ fontSize: 10, marginTop: 2,
                    color: isZhongXuanDiao ? 'rgba(255,255,255,0.75)' : C.muted }}>
                    985院校 · {degree}学历 · 专属加速通道
                  </Text>
                </View>
                {/* 勾选框 */}
                <View style={{
                  width: 24, height: 24, borderRadius: 12,
                  borderWidth: 2,
                  borderColor: isZhongXuanDiao ? '#fff' : C.inputBorder,
                  backgroundColor: isZhongXuanDiao ? '#fff' : 'transparent',
                  alignItems: 'center', justifyContent: 'center',
                }}>
                  {isZhongXuanDiao && (
                    <Text style={{ color: C.red, fontSize: 12, fontWeight: '900' }}>✓</Text>
                  )}
                </View>
              </View>

              {/* 加成详情 */}
              <View style={{ backgroundColor: '#FFF8F0', padding: 12, gap: 6 }}>
                <Text style={{ fontSize: 11, color: C.navy, fontWeight: '700', marginBottom: 4, letterSpacing: 1 }}>
                  选调生专属加成：
                </Text>
                <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6 }}>
                  <View style={{ backgroundColor: '#FFE8E8', paddingHorizontal: 8, paddingVertical: 4, borderLeftWidth: 2, borderLeftColor: C.red }}>
                    <Text style={{ fontSize: 11, color: C.red }}>
                      {degree === '博士' ? '⭐ 乡镇长起步（正科级）' : '⭐ 副乡镇长起步（副科级）'}
                    </Text>
                  </View>
                  <View style={{ backgroundColor: '#E8F0FF', paddingHorizontal: 8, paddingVertical: 4, borderLeftWidth: 2, borderLeftColor: C.blue }}>
                    <Text style={{ fontSize: 11, color: C.blue }}>📈 初始能力 +20</Text>
                  </View>
                  <View style={{ backgroundColor: '#E8FFE8', paddingHorizontal: 8, paddingVertical: 4, borderLeftWidth: 2, borderLeftColor: '#28A845' }}>
                    <Text style={{ fontSize: 11, color: '#28A845' }}>
                      {degree === '博士' ? '🏆 初始政绩 +50' : '🏆 初始政绩 +30'}
                    </Text>
                  </View>
                </View>
                <Text style={{ fontSize: 10, color: C.muted, marginTop: 2 }}>
                  📅 最低入职年龄：{degree === '博士' ? '25' : '23'}岁
                </Text>
              </View>
            </Pressable>
          )}

          {/* ─── 档案预览卡 ─── */}
          <View style={{
            backgroundColor: C.cardBg,
            borderWidth: 1,
            borderColor: C.gold,
            marginBottom: 14,
            overflow: 'hidden',
          }}>
            {/* 标题栏 */}
            <View style={{ backgroundColor: '#1A2B3C', paddingHorizontal: 14, paddingVertical: 8, flexDirection: 'row', alignItems: 'center', gap: 8 }}>
              <View style={{ width: 3, height: 14, backgroundColor: C.gold }} />
              <Text style={{ fontSize: 11, color: C.gold, letterSpacing: 2, fontWeight: '700' }}>档案预览</Text>
            </View>
            <View style={{ padding: 14, flexDirection: 'row', alignItems: 'flex-start', gap: 14 }}>
              {/* 头像框 */}
              <View style={{ width: 64, height: 80, backgroundColor: C.blueLight, alignItems: 'center', justifyContent: 'center',
                borderWidth: 1, borderColor: C.inputBorder }}>
                <Text style={{ fontSize: 40 }}>{avatarPool[avatarIdx]}</Text>
              </View>
              {/* 信息 */}
              <View style={{ flex: 1, gap: 4 }}>
                <Text style={{ fontSize: 18, fontWeight: '900', color: C.navy, letterSpacing: 1 }}>
                  {name || '（未填写）'}
                </Text>
                <Text style={{ fontSize: 12, color: '#555' }}>
                  {gender} · {birthYear}年 · {birthProvince}{birthCity}
                </Text>
                <Text style={{ fontSize: 11, color: C.muted }}>{gradYear}年毕业于{previewSchool}</Text>
                <View style={{ marginTop: 4, backgroundColor: isZhongXuanDiao ? C.redLight : C.blueLight,
                  paddingHorizontal: 8, paddingVertical: 4, alignSelf: 'flex-start',
                  borderLeftWidth: 2, borderLeftColor: isZhongXuanDiao ? C.red : C.blue }}>
                  <Text style={{ fontSize: 11, fontWeight: '700', color: isZhongXuanDiao ? C.red : C.blue }}>
                    {isZhongXuanDiao
                      ? (degree === '博士' ? '乡镇长 · 选调生（正科起步）' : '副乡镇长 · 选调生（副科起步）')
                      : '乡镇科员（起步）'}
                  </Text>
                </View>
              </View>
            </View>
          </View>

          {/* 错误提示 */}
          {error ? (
            <View style={{ backgroundColor: '#FFF0F0', borderLeftWidth: 3, borderLeftColor: C.red,
              paddingHorizontal: 12, paddingVertical: 8, marginBottom: 10 }}>
              <Text style={{ fontSize: 12, color: C.red }}>{error}</Text>
            </View>
          ) : null}

          {/* 提交按钮 */}
          <Pressable
            onPress={handleCreate}
            disabled={loading}
            cssInterop={false}
            onPressIn={() => setSubmitPressed(true)}
            onPressOut={() => setSubmitPressed(false)}
            style={{
              backgroundColor: submitPressed ? '#9E1C1D' : C.red,
              paddingVertical: 16,
              alignItems: 'center',
              opacity: loading ? 0.65 : 1,
              marginBottom: 6,
            }}
          >
            {loading
              ? <ActivityIndicator color="#fff" />
              : (
                <View style={{ alignItems: 'center', gap: 2 }}>
                  <Text style={{ color: '#fff', fontWeight: '900', fontSize: 16, letterSpacing: 4 }}>
                    确认建档，开始仕途
                  </Text>
                  <Text style={{ color: 'rgba(255,255,255,0.65)', fontSize: 10, letterSpacing: 2 }}>
                    青云路 · 从科员到国家领导人
                  </Text>
                </View>
              )
            }
          </Pressable>
          <Text style={{ textAlign: 'center', fontSize: 10, color: C.muted, marginBottom: 20 }}>
            提交后游戏正式开始，数据不可修改
          </Text>

          <View style={{ height: insets.bottom + 8 }} />
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}
