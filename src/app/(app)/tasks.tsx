// 上司关系与任务页面（双Tab合并版）
// 所有数值、阈值、概率、档位均从统一配置表读取，禁止硬编码。
import { useCallback, useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { useRouter, useFocusEffect } from 'expo-router';
import { useGame } from '@/ctx/GameContext';
import { getRankTheme } from '@/lib/rankTheme';
import { RANK_CONFIG } from '@/types/game';
import {
  getBossTasks, completeTask, postponeTask, addNewTask,
  getBossInteractions, performBossAction, getPlayerHealth, consumeEnergy,
} from '@/db/gameApi';
import { getBossFavorMultiplier, hashNameToFaction } from '@/lib/factionSystem';
import type { BossTask } from '@/types/game';
import type { BossInteraction } from '@/db/gameApi';
import {
  BOSS_LEVELS, BOSS_ACTIONS, BOSS_CONSTRAINTS,
  FAVOR_HINTS, URGENCY, TASK_CONSTRAINTS,
  getBossStyle, getBossInfo, getFavorLevel, getTaskProgress,
  isTaskComplete, progressColor, computeFavorDelta,
  type ActionType,
} from '@/config/bossTaskConfig';

export default function TasksScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { save, updateGameSave } = useGame();
  const theme = getRankTheme(save?.rankLevel ?? 1);
  const [activeTab, setActiveTab] = useState<'relation' | 'tasks'>('relation');
  const [tasks, setTasks] = useState<BossTask[]>([]);
  const [interactions, setInteractions] = useState<BossInteraction[]>([]);
  const [energy, setEnergy] = useState(100);
  const [loading, setLoading] = useState(true);
  const [feedback, setFeedback] = useState('');

  const loadData = useCallback(async () => {
    if (!save) return;
    const [t, i, h] = await Promise.all([
      getBossTasks(save.id),
      getBossInteractions(save.id),
      getPlayerHealth(save.id),
    ]);
    setTasks(t);
    setInteractions(i);
    setEnergy(h?.energy ?? 100);
    setLoading(false);
  }, [save]);

  useFocusEffect(useCallback(() => { loadData(); }, [loadData]));

  const showFeedback = (msg: string) => {
    setFeedback(msg);
    setTimeout(() => setFeedback(''), 3000);
  };

  if (!save) return null;
  const gameDays = save.gameDays ?? 0;

  // 执行上司关系操作
  const handleBossAction = async (level: number, actionType: ActionType) => {
    const info = getBossInfo(level, save);
    const name = save[info.nameField];
    const action = BOSS_ACTIONS.find(a => a.key === actionType);
    if (!action) return;
    if (energy < action.energyCost) {
      showFeedback('精力不足，无法执行该操作');
      return;
    }
    const delta = await performBossAction(save.id, level, name, actionType, gameDays, interactions);
    if (delta === 0) {
      showFeedback('该操作冷却中，请稍后再试');
      return;
    }
    // §4.4 上司好感倍率：同派×1.3 / 对立派×0.6 / isFlagged 再×0.7
    const mult = getBossFavorMultiplier(
      (save.primaryFaction || null) as import('@/types/game').FactionId | null,
      hashNameToFaction(name),
      save.isFlagged ?? false,
    );
    const adjDelta = Math.round(delta * mult);
    const cur = save[info.favorField];
    const next = Math.min(BOSS_CONSTRAINTS.favorCap, cur + adjDelta);
    await consumeEnergy(save.id, action.energyCost, 0, gameDays);
    await updateGameSave({ [info.favorField]: next });
    setEnergy(e => Math.max(0, e - action.energyCost));
    showFeedback(`✓ ${action.label}：好感 ${adjDelta >= 0 ? '+' : ''}${adjDelta}${mult !== 1 ? `（派系倍率×${mult.toFixed(2)}）` : ''}`);
    loadData();
  };

  // 交付任务
  const handleComplete = async (task: BossTask) => {
    const ok = isTaskComplete(task.taskType, task.title, task.targetValue, save);
    if (!ok) { showFeedback('任务进度尚未达标，无法交付'); return; }
    await completeTask(task.id);
    const info = getBossInfo(task.bossLevel, save);
    // §4.4 上司好感倍率同样作用于任务交付
    const mult = getBossFavorMultiplier(
      (save.primaryFaction || null) as import('@/types/game').FactionId | null,
      hashNameToFaction(save[info.nameField]),
      save.isFlagged ?? false,
    );
    const cur = save[info.favorField];
    await updateGameSave({
      meritPoints: Math.min(9999, (save.meritPoints ?? 0) + task.rewardMerit),
      [info.favorField]: Math.min(BOSS_CONSTRAINTS.favorCap, cur + Math.round(task.rewardFavor * mult)),
    });
    showFeedback(`✓ 任务完成：政绩 +${task.rewardMerit}，好感 +${task.rewardFavor}`);
    loadData();
  };

  // 申请减负
  const handlePostpone = async (task: BossTask) => {
    if (task.isPostponed) { showFeedback('该任务已申请过减负'); return; }
    if ((save.meritPoints ?? 0) < TASK_CONSTRAINTS.postponeMeritCost) {
      showFeedback(`政绩不足，减负需消耗 ${TASK_CONSTRAINTS.postponeMeritCost} 政绩`);
      return;
    }
    await postponeTask(task.id);
    await updateGameSave({
      meritPoints: Math.max(0, (save.meritPoints ?? 0) - TASK_CONSTRAINTS.postponeMeritCost),
    });
    showFeedback(`✓ 已申请减负，期限延长 ${TASK_CONSTRAINTS.postponeDays} 天`);
    loadData();
  };

  // 申请新任务
  const handleAddTask = async () => {
    const activeCount = tasks.filter(t => t.status === 'active').length;
    if (activeCount >= TASK_CONSTRAINTS.activeLimit) {
      showFeedback('当前任务过多，请先完成现有任务');
      return;
    }
    const ok = await addNewTask(save.id, save.userId, gameDays);
    if (!ok) { showFeedback('当前任务过多，请先完成现有任务'); return; }
    showFeedback('✓ 已向上司申请新任务');
    loadData();
  };

  // 冷却剩余天数
  const cooldownRemain = (level: number, actionType: ActionType): number => {
    const last = interactions
      .filter(i => i.bossLevel === level && i.actionType === actionType)
      .sort((a, b) => b.gameDay - a.gameDay)[0];
    if (!last) return 0;
    return Math.max(0, BOSS_CONSTRAINTS.cooldownDays - (gameDays - last.gameDay));
  };

  // 好感提示
  const favorHint = (favor: number): string => {
    if (favor >= FAVOR_HINTS.recommendActive) return '🔑 晋升推荐加成已激活';
    if (favor >= FAVOR_HINTS.assessFavor) return '📋 年度考核评优有利';
    if (favor < FAVOR_HINTS.worsenWarn) return '⚠️ 关系恶化可能影响晋升';
    return '维护好感，有助于年底评定';
  };

  const activeTasks = tasks.filter(t => t.status === 'active');

  if (loading) {
    return (
      <View style={{ flex: 1, backgroundColor: theme.pageBg, alignItems: 'center', justifyContent: 'center' }}>
        <ActivityIndicator color={theme.primary} />
      </View>
    );
  }

  return (
    <View style={{ flex: 1, backgroundColor: theme.pageBg }}>
      <StatusBar style={theme.statusBarStyle} backgroundColor={theme.headerBg} />

      {/* 头部 */}
      <View style={{ backgroundColor: theme.headerBg, paddingTop: insets.top + 8, paddingHorizontal: 16 }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
          <Pressable onPress={() => router.back()}>
            <Text style={{ color: theme.headerText, fontSize: 22 }}>←</Text>
          </Pressable>
          <Text style={{ color: theme.headerText, fontSize: 16, fontWeight: '700' }}>上司关系与任务</Text>
        </View>
        <View style={{ height: theme.decorLineHeight, backgroundColor: theme.decorLine, marginTop: 10 }} />
      </View>

      {/* Tab 切换 */}
      <View style={{ flexDirection: 'row', backgroundColor: theme.headerBg }}>
        {(['relation', 'tasks'] as const).map(tab => (
          <Pressable
            key={tab}
            onPress={() => setActiveTab(tab)}
            style={{ flex: 1, paddingVertical: 10, alignItems: 'center', borderBottomWidth: 2, borderBottomColor: activeTab === tab ? theme.accent : 'transparent' }}
          >
            <Text style={{ color: activeTab === tab ? theme.accent : theme.headerSub, fontSize: 13, fontWeight: activeTab === tab ? '700' : '400' }}>
              {tab === 'relation' ? '上司关系' : '上司任务'}
            </Text>
          </Pressable>
        ))}
      </View>

      {/* feedback */}
      {feedback ? (
        <View style={{ backgroundColor: theme.accentBg, paddingHorizontal: 16, paddingVertical: 8 }}>
          <Text style={{ color: theme.accent, fontSize: 12, fontWeight: '600' }}>{feedback}</Text>
        </View>
      ) : null}

      <ScrollView contentContainerStyle={{ padding: 12, paddingBottom: insets.bottom + 24 }}>
        {activeTab === 'relation' ? (
          <View style={{ gap: 12 }}>
            <Text style={{ color: theme.mutedText, fontSize: 11, lineHeight: 18 }}>
              体制内生存法则：主动维护上司关系，是晋升的隐性前提。不同上司有不同偏好，选择正确的方式事半功倍。每种操作每{BOSS_CONSTRAINTS.cooldownDays}天只能使用一次。
            </Text>
            {BOSS_LEVELS.map(bl => {
              const name = save[bl.nameField] || RANK_CONFIG[save.rankLevel]?.[bl.level === 1 ? 'bossTitle' : bl.level === 2 ? 'bossTitle2' : 'bossTitle3'] || bl.rankHint;
              const favor = save[bl.favorField] ?? 50;
              const style = getBossStyle(name);
              const level = getFavorLevel(favor);
              return (
                <View key={bl.level} style={{ backgroundColor: theme.cardBg, borderWidth: 1, borderColor: theme.cardBorder, borderTopWidth: theme.decorLineHeight, borderTopColor: style.color, padding: 12 }}>
                  {/* 上司信息 */}
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 8 }}>
                    <View style={{ width: 36, height: 36, backgroundColor: style.color, alignItems: 'center', justifyContent: 'center' }}>
                      <Text style={{ fontSize: 18 }}>👔</Text>
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={{ fontSize: 9, color: theme.mutedText, letterSpacing: 1 }}>{bl.rankHint}</Text>
                      <Text style={{ fontSize: 14, fontWeight: '700', color: theme.valueText, marginTop: 2 }}>{name}</Text>
                    </View>
                    <View style={{ alignItems: 'flex-end' }}>
                      <Text style={{ fontSize: 9, color: style.color, fontWeight: '700' }}>{style.label}</Text>
                      <Text style={{ fontSize: 20, fontWeight: '700', color: level.color, marginTop: 2 }}>{favor}</Text>
                    </View>
                  </View>
                  {/* 风格提示 */}
                  <Text style={{ fontSize: 10, color: theme.mutedText, marginBottom: 4 }}>{style.desc} · {style.tip}</Text>
                  {/* 好感等级条 */}
                  <View style={{ height: 6, backgroundColor: theme.progressBg, marginBottom: 4 }}>
                    <View style={{ height: 6, width: `${favor}%`, backgroundColor: level.color }} />
                  </View>
                  <Text style={{ fontSize: 10, color: level.color, fontWeight: '600', marginBottom: 8 }}>{level.label} · {favorHint(favor)}</Text>
                  {/* 操作按钮 */}
                  <View style={{ flexDirection: 'row', gap: 6 }}>
                    {BOSS_ACTIONS.map(act => {
                      const cd = cooldownRemain(bl.level, act.key);
                      const disabled = cd > 0 || energy < act.energyCost;
                      const preview = computeFavorDelta(style.key, act.key, act.baseFavor);
                      return (
                        <Pressable
                          key={act.key}
                          onPress={() => handleBossAction(bl.level, act.key)}
                          style={{ flex: 1, borderWidth: 1, borderColor: disabled ? theme.cardBorder : style.color, padding: 8, alignItems: 'center', opacity: disabled ? 0.5 : 1 }}
                        >
                          <Text style={{ fontSize: 11, fontWeight: '600', color: theme.valueText }}>{act.label}</Text>
                          <Text style={{ fontSize: 9, color: theme.mutedText, marginTop: 2 }}>精力{act.energyCost} · +{preview}</Text>
                          {cd > 0 ? <Text style={{ fontSize: 9, color: theme.statLow, marginTop: 2 }}>冷却{cd}天</Text> : null}
                        </Pressable>
                      );
                    })}
                  </View>
                </View>
              );
            })}
          </View>
        ) : (
          <View style={{ gap: 12 }}>
            <Text style={{ color: theme.mutedText, fontSize: 11, lineHeight: 18 }}>
              上司下达的任务是体制内隐性考核的重要组成部分。任务超时未完成，将扣除政绩与上司好感，影响年底评优与晋升。
            </Text>
            {/* 申请新任务 */}
            <Pressable onPress={handleAddTask} style={{ backgroundColor: theme.primary, paddingVertical: 10, alignItems: 'center' }}>
              <Text style={{ color: theme.primaryText, fontSize: 13, fontWeight: '700' }}>向上司申请新任务</Text>
            </Pressable>
            {activeTasks.map(task => {
              const info = getBossInfo(task.bossLevel, save);
              const progress = getTaskProgress(task.taskType, task.title, task.targetValue, save);
              const complete = isTaskComplete(task.taskType, task.title, task.targetValue, save);
              const remainDays = task.deadlineDays - gameDays;
              const urgent = remainDays < TASK_CONSTRAINTS.warningDays;
              const pColor = progressColor(progress, task.targetValue);
              return (
                <View key={task.id} style={{ backgroundColor: theme.cardBg, borderWidth: 1, borderColor: theme.cardBorder, borderTopWidth: theme.decorLineHeight, borderTopColor: URGENCY[task.urgency].color, padding: 12 }}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 4 }}>
                    <Text style={{ fontSize: 13, fontWeight: '700', color: theme.valueText, flex: 1 }}>{task.title}</Text>
                    <View style={{ backgroundColor: URGENCY[task.urgency].color, paddingHorizontal: 6, paddingVertical: 2 }}>
                      <Text style={{ color: '#fff', fontSize: 9, fontWeight: '700' }}>{URGENCY[task.urgency].label}</Text>
                    </View>
                  </View>
                  <Text style={{ fontSize: 10, color: theme.mutedText, lineHeight: 16, marginBottom: 6 }}>{task.description}</Text>
                  {/* 进度条 */}
                  <View style={{ height: 8, backgroundColor: theme.progressBg, marginBottom: 4 }}>
                    <View style={{ height: 8, width: `${Math.min(100, (progress / task.targetValue) * 100)}%`, backgroundColor: pColor }} />
                  </View>
                  <Text style={{ fontSize: 10, color: theme.mutedText, marginBottom: 8 }}>进度 {Math.round(progress)}/{task.targetValue} · 剩余 {remainDays} 天 · 来自{info.rankHint}</Text>
                  {/* 奖励与惩罚 */}
                  <View style={{ flexDirection: 'row', gap: 8, marginBottom: 8 }}>
                    <View style={{ flex: 1, backgroundColor: theme.accentBg, padding: 6 }}>
                      <Text style={{ fontSize: 9, color: theme.mutedText }}>完成奖励</Text>
                      <Text style={{ fontSize: 11, color: theme.statHigh, fontWeight: '600' }}>政绩+{task.rewardMerit} 好感+{task.rewardFavor}</Text>
                    </View>
                    <View style={{ flex: 1, backgroundColor: urgent ? theme.alertBg : theme.accentBg, padding: 6 }}>
                      <Text style={{ fontSize: 9, color: theme.mutedText }}>{urgent ? '即将超时惩罚' : '超时惩罚'}</Text>
                      <Text style={{ fontSize: 11, color: urgent ? theme.statLow : theme.valueText, fontWeight: '600' }}>政绩-{task.penaltyMerit} 好感-{task.penaltyFavor}</Text>
                    </View>
                  </View>
                  {/* 操作 */}
                  <View style={{ flexDirection: 'row', gap: 6 }}>
                    <Pressable
                      onPress={() => handleComplete(task)}
                      disabled={!complete}
                      style={{ flex: 1, backgroundColor: complete ? theme.primary : theme.progressBg, paddingVertical: 9, alignItems: 'center', opacity: complete ? 1 : 0.5 }}
                    >
                      <Text style={{ color: complete ? theme.primaryText : theme.mutedText, fontSize: 12, fontWeight: '700' }}>{complete ? '交付领取' : '进度未达标'}</Text>
                    </Pressable>
                    <Pressable
                      onPress={() => handlePostpone(task)}
                      disabled={task.isPostponed}
                      style={{ flex: 1, borderWidth: 1, borderColor: task.isPostponed ? theme.cardBorder : theme.accentSub, paddingVertical: 9, alignItems: 'center', opacity: task.isPostponed ? 0.5 : 1 }}
                    >
                      <Text style={{ color: task.isPostponed ? theme.mutedText : theme.accentSub, fontSize: 12, fontWeight: '600' }}>
                        {task.isPostponed ? '已减负' : `减负(政绩-${TASK_CONSTRAINTS.postponeMeritCost})`}
                      </Text>
                    </Pressable>
                  </View>
                </View>
              );
            })}
            {activeTasks.length === 0 ? (
              <View style={{ padding: 24, alignItems: 'center' }}>
                <Text style={{ fontSize: 28, marginBottom: 8 }}>📋</Text>
                <Text style={{ color: theme.mutedText, fontSize: 12 }}>暂无进行中的任务，点击上方按钮申请新任务</Text>
              </View>
            ) : null}
          </View>
        )}
      </ScrollView>
    </View>
  );
}