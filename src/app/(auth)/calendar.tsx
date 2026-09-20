// 政务日历：真实完整日历（实时年月/当月网格/今天高亮/上下月切换/农历）
// 唯一特殊点：点击每月「6」号 → 政务蓝加载动画(2.5s) → 按登录状态分流
import { useEffect, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  Text,
  View,
} from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import {
  CalendarDays,
  ChevronLeft,
  ChevronRight,
  ShieldCheck,
} from 'lucide-react-native';
import { supabase } from '@/client/supabase';
import { listSaves } from '@/db/gameApi';
import { getLunarDayText } from '@/lib/lunarUtils';

// 政务配色
const C = {
  govBlue: '#1B3A6B',
  govBlueDeep: '#14305A',
  govBlueLight: '#2A5298',
  govBlueBg: '#F0F4FA',
  chinaRed: '#C8161D',
  ink: '#1F2937',
  muted: '#6B7280',
  border: '#E5E7EB',
  gold: '#C8A84B',
};

const WEEK_LABELS = ['一', '二', '三', '四', '五', '六', '日'];
const GATE_DAY = 6;

interface CalendarCell {
  year: number;
  month: number;
  day: number;
  lunar: string;
  isCurrentMonth: boolean;
  isToday: boolean;
  isGate: boolean;
  isHoliday: boolean;
}

export default function CalendarGateScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();

  const today = useMemo(() => new Date(), []);
  const todayYear = today.getFullYear();
  const todayMonth = today.getMonth() + 1;
  const todayDate = today.getDate();

  const [currentYear, setCurrentYear] = useState(todayYear);
  const [currentMonth, setCurrentMonth] = useState(todayMonth);
  const [selectedDay, setSelectedDay] = useState<number | null>(todayDate);

  // 政务加载动画状态
  const [isLoadingTransition, setIsLoadingTransition] = useState(false);
  const [loadingProgress, setLoadingProgress] = useState(0);
  const [loadingStepText, setLoadingStepText] = useState('正在建立政务专网加密信道...');
  const progressTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    return () => {
      if (progressTimerRef.current) clearInterval(progressTimerRef.current);
    };
  }, []);

  const isViewingCurrentMonth = currentYear === todayYear && currentMonth === todayMonth;

  const prevMonth = () => {
    if (currentMonth === 1) {
      setCurrentYear((y) => y - 1);
      setCurrentMonth(12);
    } else {
      setCurrentMonth((m) => m - 1);
    }
    setSelectedDay(null);
  };

  const nextMonth = () => {
    if (currentMonth === 12) {
      setCurrentYear((y) => y + 1);
      setCurrentMonth(1);
    } else {
      setCurrentMonth((m) => m + 1);
    }
    setSelectedDay(null);
  };

  const goToday = () => {
    setCurrentYear(todayYear);
    setCurrentMonth(todayMonth);
    setSelectedDay(todayDate);
  };

  // 动态生成当月日历网格
  const calendarCells = useMemo(() => {
    const cells: CalendarCell[] = [];
    const firstDayObj = new Date(currentYear, currentMonth - 1, 1);
    const firstDayOfWeek = (firstDayObj.getDay() + 6) % 7;
    const daysInCurrentMonth = new Date(currentYear, currentMonth, 0).getDate();
    const prevMonthDays = new Date(currentYear, currentMonth - 1, 0).getDate();
    const prevMonthYear = currentMonth === 1 ? currentYear - 1 : currentYear;
    const prevMonthNum = currentMonth === 1 ? 12 : currentMonth - 1;

    for (let i = firstDayOfWeek - 1; i >= 0; i--) {
      const d = prevMonthDays - i;
      const lunarInfo = getLunarDayText(prevMonthYear, prevMonthNum, d);
      cells.push({
        year: prevMonthYear, month: prevMonthNum, day: d, lunar: lunarInfo.text,
        isCurrentMonth: false,
        isToday: prevMonthYear === todayYear && prevMonthNum === todayMonth && d === todayDate,
        isGate: d === GATE_DAY, isHoliday: lunarInfo.isHoliday,
      });
    }

    for (let d = 1; d <= daysInCurrentMonth; d++) {
      const lunarInfo = getLunarDayText(currentYear, currentMonth, d);
      cells.push({
        year: currentYear, month: currentMonth, day: d, lunar: lunarInfo.text,
        isCurrentMonth: true,
        isToday: currentYear === todayYear && currentMonth === todayMonth && d === todayDate,
        isGate: d === GATE_DAY, isHoliday: lunarInfo.isHoliday,
      });
    }

    const nextMonthYear = currentMonth === 12 ? currentYear + 1 : currentYear;
    const nextMonthNum = currentMonth === 12 ? 1 : currentMonth + 1;
    const totalCells = cells.length > 35 ? 42 : 35;
    const remaining = totalCells - cells.length;
    for (let d = 1; d <= remaining; d++) {
      const lunarInfo = getLunarDayText(nextMonthYear, nextMonthNum, d);
      cells.push({
        year: nextMonthYear, month: nextMonthNum, day: d, lunar: lunarInfo.text,
        isCurrentMonth: false,
        isToday: nextMonthYear === todayYear && nextMonthNum === todayMonth && d === todayDate,
        isGate: d === GATE_DAY, isHoliday: lunarInfo.isHoliday,
      });
    }
    return cells;
  }, [currentYear, currentMonth, todayYear, todayMonth, todayDate]);

  const todayLunarText = useMemo(() => {
    return getLunarDayText(todayYear, todayMonth, todayDate).full;
  }, [todayYear, todayMonth, todayDate]);

  // 点击 6 号：政务蓝 2.5 秒加载动画 → 状态分流
  const handleDayPress = (cell: CalendarCell) => {
    if (isLoadingTransition) return;

    // 普通日期：仅更新选中态，不跳转
    if (!cell.isGate) {
      if (cell.isCurrentMonth) setSelectedDay(cell.day);
      return;
    }

    // 6 号：启动政务加载动画
    setSelectedDay(cell.day);
    setIsLoadingTransition(true);
    setLoadingProgress(0);
    setLoadingStepText('正在建立政务专网加密信道...');

    const startTime = Date.now();
    const duration = 2500;

    progressTimerRef.current = setInterval(() => {
      const elapsed = Date.now() - startTime;
      const pct = Math.min(Math.floor((elapsed / duration) * 100), 100);
      setLoadingProgress(pct);

      if (pct < 35) setLoadingStepText('正在建立政务专网加密信道...');
      else if (pct < 70) setLoadingStepText('正在检索干部履历与施政档案库...');
      else if (pct < 95) setLoadingStepText('正在核验机要权限与密钥签名...');
      else setLoadingStepText('安全校验通过，正在进入施政系统...');

      if (elapsed >= duration) {
        if (progressTimerRef.current) clearInterval(progressTimerRef.current);
        (async () => {
          try {
            const { data: sessionData } = await supabase.auth.getSession();
            const uid = sessionData.session?.user?.id;
            if (uid) {
              const saves = await listSaves();
              if (saves.length > 1) {
                router.replace('/(app)/save-select' as never);
                return;
              }
              if (saves.length === 1) {
                router.replace('/(app)/home');
                return;
              }
            }
          } catch {
            // 降级走登录
          }
          router.replace('/(auth)/sign-in');
        })();
      }
    }, 40);
  };

  return (
    <View style={{ flex: 1, backgroundColor: '#FFFFFF' }}>
      <StatusBar style="light" backgroundColor={C.govBlue} />

      {/* 政务蓝顶栏 */}
      <View style={{ backgroundColor: C.govBlue, paddingTop: insets.top + 8 }}>
        {/* 标题行 */}
        <View className="flex-row items-center justify-between px-5 pb-3">
          <View className="flex-row items-center gap-2">
            <View
              className="w-8 h-8 rounded-lg bg-white/15 items-center justify-center"
              style={{ borderCurve: 'continuous' }}
            >
              <CalendarDays size={18} color="#FFFFFF" />
            </View>
            <Text className="text-white text-lg font-bold tracking-wide">政务日历</Text>
          </View>
          {!isViewingCurrentMonth && (
            <Pressable
              onPress={goToday}
              className="px-3 py-1.5 rounded-full bg-white/15 active:opacity-70"
            >
              <Text className="text-white text-xs font-medium">回到今天</Text>
            </Pressable>
          )}
        </View>

        {/* 年月与切换 */}
        <View className="flex-row items-center justify-between px-5 pb-4">
          <Pressable
            onPress={prevMonth}
            hitSlop={8}
            className="w-9 h-9 rounded-full items-center justify-center active:bg-white/15"
          >
            <ChevronLeft size={22} color="#FFFFFF" />
          </Pressable>

          <View className="items-center">
            <Text className="text-white text-2xl font-bold tracking-tight">
              {currentYear}年{currentMonth}月
            </Text>
            <Text className="text-white/70 text-xs mt-0.5 font-medium">
              {isViewingCurrentMonth ? `今天 ${todayLunarText}` : '查看历史月份'}
            </Text>
          </View>

          <Pressable
            onPress={nextMonth}
            hitSlop={8}
            className="w-9 h-9 rounded-full items-center justify-center active:bg-white/15"
          >
            <ChevronRight size={22} color="#FFFFFF" />
          </Pressable>
        </View>
      </View>

      {/* 日历主体 */}
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingVertical: 16, paddingHorizontal: 12 }}
      >
        {/* 星期表头 */}
        <View className="flex-row mb-2 px-1">
          {WEEK_LABELS.map((w, idx) => {
            const isWeekend = idx >= 5;
            return (
              <View key={w} style={{ width: '14.2857%' }} className="items-center py-1.5">
                <Text
                  className={`text-xs font-semibold ${
                    isWeekend ? 'text-[#C8161D]/80' : 'text-[#1B3A6B]'
                  }`}
                >
                  {w}
                </Text>
              </View>
            );
          })}
        </View>

        {/* 日期网格 */}
        <View className="flex-row flex-wrap">
          {calendarCells.map((cell, idx) => {
            const isGray = !cell.isCurrentMonth;
            const isToday = cell.isToday;
            const isSelected = cell.isCurrentMonth && selectedDay === cell.day && !isToday;

            return (
              <View key={idx} style={{ width: '14.2857%' }} className="items-center py-1.5">
                <Pressable
                  onPress={() => handleDayPress(cell)}
                  className="w-12 h-14 items-center justify-center rounded-xl"
                  style={{
                    borderCurve: 'continuous',
                    backgroundColor: isToday
                      ? C.chinaRed
                      : isSelected
                        ? C.govBlueBg
                        : 'transparent',
                  }}
                >
                  <Text
                    className={`text-base font-semibold leading-none ${
                      isToday
                        ? 'text-white'
                        : isGray
                          ? 'text-gray-300'
                          : 'text-[#1F2937]'
                    }`}
                  >
                    {cell.day}
                  </Text>
                  <Text
                    numberOfLines={1}
                    className={`text-[10px] mt-1 leading-none ${
                      isToday
                        ? 'text-white/95'
                        : cell.isHoliday && cell.isCurrentMonth
                          ? 'text-[#C8161D] font-medium'
                          : isGray
                            ? 'text-gray-300'
                            : 'text-[#9CA3AF]'
                    }`}
                  >
                    {cell.lunar}
                  </Text>
                </Pressable>
              </View>
            );
          })}
        </View>

        {/* 今日信息卡 */}
        <View
          className="mt-4 mx-1 rounded-2xl p-4 border border-[#E5E7EB]"
          style={{ backgroundColor: C.govBlueBg, borderCurve: 'continuous' }}
        >
          <View className="flex-row items-center justify-between">
            <View>
              <Text className="text-xs text-[#1B3A6B] font-semibold tracking-wide mb-1">
                今日 · {todayLunarText}
              </Text>
              <Text className="text-base text-[#1F2937] font-bold">
                {todayYear}年{todayMonth}月{todayDate}日
              </Text>
            </View>
            <View
              className="px-2.5 py-1 rounded-full"
              style={{ backgroundColor: C.chinaRed }}
            >
              <Text className="text-white text-[11px] font-semibold">今日</Text>
            </View>
          </View>
        </View>
      </ScrollView>

      {/* 政务蓝加载转场蒙层 (2.5s) */}
      {isLoadingTransition && (
        <View
          style={{
            position: 'absolute',
            top: 0, left: 0, right: 0, bottom: 0,
            backgroundColor: C.govBlue,
            alignItems: 'center',
            justifyContent: 'center',
            paddingHorizontal: 32,
          }}
        >
          {/* 金色安全盾徽 */}
          <View
            className="w-20 h-20 rounded-3xl items-center justify-center mb-6"
            style={{
              backgroundColor: 'rgba(200,168,75,0.14)',
              borderWidth: 1,
              borderColor: 'rgba(200,168,75,0.45)',
              borderCurve: 'continuous',
            }}
          >
            <ShieldCheck size={40} color={C.gold} />
          </View>

          <Text className="text-white text-xl font-bold tracking-widest mb-1.5">
            机关政务专网接入
          </Text>
          <Text className="text-white/60 text-xs mb-8 font-mono tracking-wider">
            GOVERNMENT INTRANET SECURITY GATEWAY
          </Text>

          {/* 进度条 */}
          <View
            className="w-full max-w-xs h-2 rounded-full overflow-hidden mb-4"
            style={{ backgroundColor: 'rgba(255,255,255,0.15)' }}
          >
            <View
              style={{
                width: `${loadingProgress}%`,
                height: '100%',
                backgroundColor: '#FFFFFF',
              }}
            />
          </View>

          <View className="flex-row items-center justify-between w-full max-w-xs mb-3">
            <View className="flex-row items-center gap-1.5">
              <ActivityIndicator size="small" color="#FFFFFF" />
              <Text className="text-white text-xs font-medium">{loadingStepText}</Text>
            </View>
            <Text className="text-white text-xs font-mono font-bold">{loadingProgress}%</Text>
          </View>
        </View>
      )}
    </View>
  );
}