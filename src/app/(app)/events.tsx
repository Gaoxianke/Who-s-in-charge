// 突发事件页面
import { useCallback, useState } from 'react';
import { Pressable, ScrollView, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { useRouter, useFocusEffect } from 'expo-router';
import { useGame } from '@/ctx/GameContext';
import { getRankTheme } from '@/lib/rankTheme';
import { saveEventRecord } from '@/db/gameApi';
import { getRandomEvent } from '@/lib/eventTemplates';
import LeadershipMeetingModal from '@/components/LeadershipMeetingModal';
import type { EventTemplate, EventChoice } from '@/types/game';

const EVENT_TYPE_LABEL: Record<string, string> = {
  disaster: '自然灾害',
  corruption: '廉洁风险',
  opinion: '舆情危机',
  economic: '经济事件',
  security: '治安事件',
};

const EVENT_TYPE_COLOR: Record<string, string> = {
  disaster: '#C82829',
  corruption: '#6a1a6a',
  opinion: '#8B4513',
  economic: '#2a7a3b',
  security: '#1D2D44',
};

function ChangeTag({ value, label }: { value: number; label: string }) {
  if (value === 0) return null;
  const color = value > 0 ? '#2a7a3b' : '#C82829';
  return (
    <View style={{ borderWidth: 1, borderColor: color, paddingHorizontal: 5, paddingVertical: 1 }}>
      <Text style={{ fontSize: 10, color, fontVariant: ['tabular-nums'] }}>
        {label}{value > 0 ? `+${value}` : value}
      </Text>
    </View>
  );
}

export default function EventsScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { save, updateGameSave } = useGame();
  const [currentEvent, setCurrentEvent] = useState<EventTemplate | null>(null);
  const [resolvedChoice, setResolvedChoice] = useState<EventChoice | null>(null);
  const [resolved, setResolved] = useState(false);
  const [showMeeting, setShowMeeting] = useState(false);

  const rankLevel = save?.rankLevel ?? 1;
  const theme = getRankTheme(rankLevel);

  useFocusEffect(
    useCallback(() => {
      if (save?.isEventPending) {
        setCurrentEvent(getRandomEvent(rankLevel));
        setResolved(false);
        setResolvedChoice(null);
        setShowMeeting(false);
      }
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [save?.isEventPending])
  );

  const handleGenerateEvent = () => {
    setCurrentEvent(getRandomEvent(rankLevel));
    setResolved(false);
    setResolvedChoice(null);
    setShowMeeting(false);
  };

  const handleChoice = async (choice: EventChoice, choiceIndex: number) => {
    if (!save || !currentEvent) return;

    // 判定本次选择是否为"不作为/失败"：政绩和民心都不正向，且对城市指标有负面影响
    const isFail = choice.meritChange <= 0 && choice.moralChange <= 0 &&
      (choice.gdpChange < 0 || choice.livelihoodChange < 0 || choice.ecologyChange < 0);
    const newConsecutiveFail = isFail
      ? (save.consecutiveFailEvents ?? 0) + 1
      : 0; // 做了正确选择即重置计数

    // 先更新存档，清除事件待处理标记
    await updateGameSave({
      meritPoints: save.meritPoints + choice.meritChange,
      moralValue: Math.max(0, Math.min(100, save.moralValue + choice.moralChange)),
      cityGdp: Math.max(0, Math.min(100, save.cityGdp + choice.gdpChange)),
      cityLivelihood: Math.max(0, Math.min(100, save.cityLivelihood + choice.livelihoodChange)),
      cityEcology: Math.max(0, Math.min(100, save.cityEcology + choice.ecologyChange)),
      cityBusiness: Math.max(0, Math.min(100, save.cityBusiness + choice.businessChange)),
      isEventPending: false,
      consecutiveFailEvents: newConsecutiveFail,
    });

    // 无论记录是否成功，都显示处置结果（不阻塞返回）
    setResolvedChoice(choice);
    setResolved(true);

    // 后台记录事件（失败不影响游戏流程）
    try {
      const { supabase } = await import('@/client/supabase');
      const { data: userData } = await supabase.auth.getUser();
      await saveEventRecord({
        saveId: save.id,
        userId: userData?.user?.id ?? '',
        eventType: currentEvent.type,
        title: currentEvent.title,
        description: currentEvent.description,
        choiceIndex,
        choiceText: choice.text,
        meritChange: choice.meritChange,
        moralChange: choice.moralChange,
        gdpChange: choice.gdpChange,
        livelihoodChange: choice.livelihoodChange,
        ecologyChange: choice.ecologyChange,
        businessChange: choice.businessChange,
        gameDay: save.gameDays,
      });
    } catch (_) {
      // 记录失败不影响主流程
    }
  };

  return (
    <View style={{ flex: 1, backgroundColor: theme.pageBg }}>
      <StatusBar style={theme.statusBarStyle} backgroundColor={theme.headerBg} />

      <View style={{
        backgroundColor: theme.headerBg,
        paddingTop: insets.top + 8,
        paddingBottom: 12,
        paddingHorizontal: 16,
        flexDirection: 'row',
        alignItems: 'center',
      }}>
        <Pressable onPress={() => router.back()} style={{ marginRight: 12 }}>
          <Text style={{ color: theme.headerSub, fontSize: 22 }}>‹</Text>
        </Pressable>
        <View style={{ flex: 1 }}>
          <Text style={{ color: theme.headerSub, fontSize: 10, letterSpacing: 2 }}>EVENTS</Text>
          <Text style={{ color: theme.headerText, fontSize: 16, fontWeight: '700', letterSpacing: 1 }}>突发事件处置</Text>
        </View>
        <View style={{ alignItems: 'flex-end' }}>
          <Text style={{ color: theme.headerSub, fontSize: 10 }}>{save?.rankName}</Text>
          <Text style={{ color: theme.headerText, fontSize: 11, fontWeight: '600', marginTop: 1 }}>{save?.cityName}</Text>
        </View>
      </View>

      <ScrollView contentContainerStyle={{ padding: 16 }} showsVerticalScrollIndicator={false}>
        {!currentEvent && (
          <View style={{ alignItems: 'center', marginTop: 80 }}>
            <Text style={{ fontSize: 16, color: theme.labelText, marginBottom: 8 }}>当前无待处置事件</Text>
            <Text style={{ fontSize: 12, color: theme.mutedText, marginBottom: 24, textAlign: 'center' }}>
              推进时间后可能触发突发事件{'\n'}也可手动模拟一个突发事件
            </Text>
            <Pressable
              onPress={handleGenerateEvent}
              style={{ backgroundColor: theme.headerBg, paddingHorizontal: 24, paddingVertical: 12 }}
            >
              <Text style={{ color: theme.headerText, fontWeight: '700', fontSize: 14, letterSpacing: 1 }}>模拟突发事件</Text>
            </Pressable>
          </View>
        )}

        {currentEvent && !resolved && (
          <View>
            {/* 事件卡片 */}
            <View style={{
              backgroundColor: theme.cardBg,
              borderWidth: 1,
              borderColor: EVENT_TYPE_COLOR[currentEvent.type] ?? theme.cardBorder,
              borderTopWidth: 3,
              padding: 16,
              marginBottom: 16,
            }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 8 }}>
                <View style={{
                  borderWidth: 1,
                  borderColor: EVENT_TYPE_COLOR[currentEvent.type] ?? '#DDD',
                  paddingHorizontal: 8,
                  paddingVertical: 2,
                }}>
                  <Text style={{ fontSize: 10, color: EVENT_TYPE_COLOR[currentEvent.type], fontWeight: '600' }}>
                    {EVENT_TYPE_LABEL[currentEvent.type] ?? currentEvent.type}
                  </Text>
                </View>
                {currentEvent.isMajor ? (
                  <View style={{ borderWidth: 1, borderColor: '#C8161D', paddingHorizontal: 8, paddingVertical: 2 }}>
                    <Text style={{ fontSize: 10, color: '#C8161D', fontWeight: '700', letterSpacing: 1 }}>重大事件</Text>
                  </View>
                ) : (
                  <Text style={{ fontSize: 11, color: '#888' }}>紧急事件</Text>
                )}
              </View>

              <Text style={{ fontSize: 16, fontWeight: '700', color: theme.valueText, marginBottom: 10, letterSpacing: 0.5 }}>
                {currentEvent.title}
              </Text>
              <Text style={{ fontSize: 13, color: theme.labelText, lineHeight: 20 }}>
                {currentEvent.description}
              </Text>
            </View>

            {/* 重大事件 → 召开领导班子会议 */}
            {currentEvent.isMajor ? (
              <View>
                <View style={{ borderWidth: 1, borderColor: theme.primary, backgroundColor: theme.alertBg, padding: 12, marginBottom: 14 }}>
                  <Text style={{ color: theme.primary, fontSize: 12, fontWeight: 'bold', marginBottom: 4 }}>
                    ■ 重大事项须经领导班子集体决策
                  </Text>
                  <Text style={{ color: theme.labelText, fontSize: 12, lineHeight: 18 }}>
                    本事件影响重大，需召集领导班子成员共同商议，采取投票表决方式形成决议后执行。
                  </Text>
                </View>
                <Pressable
                  onPress={() => setShowMeeting(true)}
                  style={{ backgroundColor: theme.headerBg, paddingVertical: 14, alignItems: 'center' }}
                  android_ripple={{ color: 'rgba(255,255,255,0.15)' }}
                >
                  <Text style={{ color: theme.headerText, fontWeight: '700', fontSize: 14, letterSpacing: 2 }}>召开领导班子会议 ›</Text>
                </Pressable>
              </View>
            ) : (
              <>
                {/* 普通事件 → 直接选择方案 */}
                <Text style={{ fontSize: 12, color: theme.primary, fontWeight: '700', letterSpacing: 2, marginBottom: 10 }}>
                  请选择处置方案
                </Text>

                {currentEvent.choices.map((choice, idx) => (
                  <Pressable
                    key={idx}
                    onPress={() => handleChoice(choice, idx)}
                    style={{ backgroundColor: theme.cardBg, borderWidth: 1, borderColor: theme.cardBorder, padding: 14, marginBottom: 10 }}
                    android_ripple={{ color: 'rgba(29,45,68,0.1)' }}
                  >
                    <Text style={{ fontSize: 14, fontWeight: '600', color: theme.valueText, marginBottom: 8, lineHeight: 20 }}>
                      {String.fromCharCode(65 + idx)}. {choice.text}
                    </Text>
                    <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6 }}>
                      <ChangeTag value={choice.meritChange} label="政绩" />
                      <ChangeTag value={choice.moralChange} label="民心" />
                      <ChangeTag value={choice.gdpChange} label="GDP" />
                      <ChangeTag value={choice.livelihoodChange} label="民生" />
                      <ChangeTag value={choice.ecologyChange} label="生态" />
                      <ChangeTag value={choice.businessChange} label="营商" />
                    </View>
                  </Pressable>
                ))}
              </>
            )}
          </View>
        )}

        {currentEvent && resolved && resolvedChoice && (
          <View>
            {/* 事件标题 */}
            <View style={{ backgroundColor: theme.cardBg, borderWidth: 1, borderColor: theme.cardBorder, padding: 14, marginBottom: 12 }}>
              <Text style={{ fontSize: 13, color: theme.mutedText, marginBottom: 4 }}>事件：{currentEvent.title}</Text>
              <Text style={{ fontSize: 14, fontWeight: '700', color: theme.valueText }}>
                方案：{resolvedChoice.text}
              </Text>
            </View>

            {/* 结果展示 */}
            <View style={{
              backgroundColor: theme.cardBg,
              borderWidth: 1,
              borderColor: theme.statHigh,
              borderTopWidth: 3,
              borderTopColor: theme.statHigh,
              padding: 16,
              marginBottom: 16,
            }}>
              <Text style={{ fontSize: 14, fontWeight: '700', color: theme.statHigh, marginBottom: 10, letterSpacing: 1 }}>
                处置结果
              </Text>
              <Text style={{ fontSize: 13, color: theme.labelText, lineHeight: 20, marginBottom: 12 }}>
                {resolvedChoice.description}
              </Text>
              <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
                <ChangeTag value={resolvedChoice.meritChange} label="政绩" />
                <ChangeTag value={resolvedChoice.moralChange} label="民心" />
                <ChangeTag value={resolvedChoice.gdpChange} label="GDP" />
                <ChangeTag value={resolvedChoice.livelihoodChange} label="民生" />
                <ChangeTag value={resolvedChoice.ecologyChange} label="生态" />
                <ChangeTag value={resolvedChoice.businessChange} label="营商" />
              </View>
            </View>

            {/* 处置完成 - 返回主界面 */}
            <Pressable
              onPress={() => {
                if (router.canGoBack()) {
                  router.back();
                } else {
                  router.replace('/(app)/home');
                }
              }}
              style={{ paddingVertical: 14, alignItems: 'center', backgroundColor: theme.headerBg }}
            >
              <Text style={{ color: theme.headerText, fontWeight: '700', fontSize: 15, letterSpacing: 2 }}>收到，继续工作</Text>
            </Pressable>
          </View>
        )}
      </ScrollView>

      {/* 领导班子会议弹窗（重大事件触发） */}
      {showMeeting && currentEvent && save && (
        <LeadershipMeetingModal
          event={currentEvent}
          rankLevel={rankLevel}
          playerName={save.playerName}
          playerPosition={save.playerPosition || save.rankName}
          onConfirm={(finalChoice) => {
            setShowMeeting(false);
            handleChoice(finalChoice, -1);
          }}
        />
      )}
    </View>
  );
}
