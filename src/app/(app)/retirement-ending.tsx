// 退休结局页——功成身退
import { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { useRouter } from 'expo-router';
import { useFocusEffect } from 'expo-router';
import { supabase } from '@/client/supabase';
import { useGame } from '@/ctx/GameContext';
import { getSubordinates, deleteSave } from '@/db/gameApi';
import { evaluateFactionEnding } from '@/lib/factionSystem';
import { gameDaysToDate, RANK_CONFIG, getAvatarEmoji, getAvatarBgColor, formatMoney, getRetirementConfig } from '@/types/game';

/** 计算仕途年数 */
function calcCareerYears(gameDays: number): number {
  return Math.floor(gameDays / 365);
}

/** 获取退休后待遇描述 */
function getRetirementBenefits(rankLevel: number): string[] {
  if (rankLevel >= 14) {
    return [
      '保留最高政治待遇，享受国家领导人礼遇',
      '可受邀出席国家重大典礼与外交活动',
      '参与国家重大战略决策咨询',
      '宏观政策建言渠道畅通，影响深远',
      '国家为您保障专职医疗保健与安保团队',
    ];
  }
  if (rankLevel >= 13) {
    return [
      '享受副国家级政治待遇与相应生活保障',
      '可受邀参与重大政策咨询',
      '在重要节假日出席党和国家领导层活动',
      '专职医疗保健与生活服务',
    ];
  }
  if (rankLevel >= 11) {
    return [
      '享受正部级或副部级退休待遇',
      '退休工资为在职工资的90%',
      '相应级别的医疗保健服务',
      '参与相关领域顾问与咨询工作',
    ];
  }
  return [
    '享受相应职级退休工资待遇',
    '基本医疗保险与社会保障',
    '地方组织优秀退休干部表彰',
  ];
}

/** 民心评价 */
function getMoralLabel(moralValue: number): { label: string; color: string } {
  if (moralValue >= 80) return { label: '廉洁奉公', color: '#2a7a3b' };
  if (moralValue >= 60) return { label: '清廉勤政', color: '#4a7c59' };
  if (moralValue >= 40) return { label: '中规中矩', color: '#888' };
  if (moralValue >= 20) return { label: '瑕不掩瑜', color: '#C87820' };
  return { label: '留有污点', color: '#C82829' };
}

/** 政绩评价 */
function getMeritLabel(meritPoints: number, rankLevel: number): { label: string; color: string } {
  const required = RANK_CONFIG[rankLevel]?.requiredMerit ?? 100;
  const ratio = meritPoints / required;
  if (ratio >= 3) return { label: '建树卓著', color: '#2a7a3b' };
  if (ratio >= 2) return { label: '政绩斐然', color: '#4a7c59' };
  if (ratio >= 1) return { label: '政绩扎实', color: '#2B4B6F' };
  return { label: '政绩平淡', color: '#888' };
}

/** 家庭幸福评价 */
function getFamilyLabel(familyHappiness: number): { label: string; color: string } {
  if (familyHappiness >= 80) return { label: '家庭美满', color: '#2a7a3b' };
  if (familyHappiness >= 60) return { label: '家庭和睦', color: '#4a7c59' };
  if (familyHappiness >= 40) return { label: '家庭尚可', color: '#888' };
  return { label: '聚少离多', color: '#C87820' };
}

export default function RetirementEndingScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { save, isLoading, setIsRunning } = useGame();
  const [subCount, setSubCount] = useState(0);
  const [promotedCount, setPromotedCount] = useState(0);
  const [isDeleting, setIsDeleting] = useState(false);

  useFocusEffect(
    useCallback(() => {
      // 确保时间暂停
      setIsRunning(false);
    }, [setIsRunning])
  );

  useEffect(() => {
    if (!save) return;
    getSubordinates(save.id).then(subs => {
      setSubCount(subs.length);
      // 晋升过的下属：subLevel >= 2（初始为1，被提拔后 >=2）
      setPromotedCount(subs.filter(s => s.subLevel >= 2).length);
    });
  }, [save]);

  const handleRestart = async () => {
    if (!save) return;
    setIsDeleting(true);
    await deleteSave(save.id);
    setIsRunning(false);
    await supabase.auth.signOut();
    router.replace('/(auth)/sign-in');
  };

  if (isLoading || !save) {
    return (
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: '#1a2740' }}>
        <ActivityIndicator size="large" color="#C8A84B" />
      </View>
    );
  }

  const careerYears = calcCareerYears(save.gameDays);
  const retireDate = gameDaysToDate(save.gameDays);
  const retireCfg = getRetirementConfig(save.rankLevel);
  const benefits = getRetirementBenefits(save.rankLevel);
  const moralEval = getMoralLabel(save.moralValue);
  const meritEval = getMeritLabel(save.meritPoints, save.rankLevel);
  const familyEval = getFamilyLabel(save.familyHappiness ?? 0);
  const avatarEmoji = getAvatarEmoji(save.avatarId, save.playerGender);
  const avatarBg = getAvatarBgColor(save.avatarId, 'pragmatic');
  // §4.8 派系结局判定
  const factionEnding = evaluateFactionEnding(
    save.factionInfluence ?? 0,
    save.purgeCount ?? 0,
    !!save.primaryFaction,
  );

  return (
    <View style={{ flex: 1, backgroundColor: '#0E1B2D' }}>
      <StatusBar style="light" />
      <ScrollView
        contentContainerStyle={{ paddingBottom: 60 }}
        contentInsetAdjustmentBehavior="automatic"
      >
        {/* 顶部英雄区 */}
        <View style={{
          backgroundColor: '#162338',
          paddingTop: insets.top + 8, paddingBottom: 32,
          paddingHorizontal: 24,
          alignItems: 'center',
          gap: 14,
          borderBottomWidth: 1,
          borderBottomColor: '#C8A84B44',
        }}>
          {/* 头像 */}
          <View style={{
            width: 80, height: 80, borderRadius: 40,
            backgroundColor: avatarBg,
            alignItems: 'center', justifyContent: 'center',
            borderWidth: 3, borderColor: '#C8A84B',
          }}>
            <Text style={{ fontSize: 40 }}>{avatarEmoji}</Text>
          </View>

          {/* 名称与职务 */}
          <View style={{ alignItems: 'center', gap: 6 }}>
            <Text style={{ fontSize: 22, fontWeight: '700', color: '#F0E8D0', letterSpacing: 2 }}>
              {save.playerName}
            </Text>
            <Text style={{ fontSize: 13, color: '#C8A84B', letterSpacing: 1 }}>
              {save.rankName}  ·  {save.playerGender}  ·  {save.playerAge}岁
            </Text>
            <Text style={{ fontSize: 11, color: '#8899AA', marginTop: 2 }}>
              📅 退休日期：{retireDate}
            </Text>
          </View>

          {/* 功成身退横幅 */}
          <View style={{
            backgroundColor: '#C8A84B22', borderRadius: 2,
            borderWidth: 1, borderColor: '#C8A84B66',
            paddingVertical: 8, paddingHorizontal: 20,
            marginTop: 4,
          }}>
            <Text style={{ fontSize: 15, color: '#C8A84B', fontWeight: '700', letterSpacing: 3 }}>
              ✦  功成身退  ·  垂范后世  ✦
            </Text>
          </View>
        </View>

        <View style={{ paddingHorizontal: 20, paddingTop: 20, gap: 16 }}>
          {/* 仕途概览 */}
          <View style={{
            backgroundColor: '#1C2E45', borderRadius: 4,
            borderWidth: 1, borderColor: '#2D4A6B',
            overflow: 'hidden',
          }}>
            <View style={{ backgroundColor: '#2B4B6F', paddingVertical: 10, paddingHorizontal: 16 }}>
              <Text style={{ fontSize: 13, fontWeight: '700', color: '#C8E0F4', letterSpacing: 1 }}>
                ◆ 仕途历程总览
              </Text>
            </View>
            <View style={{ padding: 16, gap: 10 }}>
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', flexWrap: 'wrap', gap: 8 }}>
                <SummaryItem label="仕途年数" value={`${careerYears} 年`} color="#C8A84B" />
                <SummaryItem label="最终职级" value={retireCfg.tier} color="#C8E0F4" />
                <SummaryItem label="最终职务" value={save.rankName} color="#C8E0F4" />
                <SummaryItem label="末任城市" value={save.cityName} color="#88BBDD" />
              </View>
            </View>
          </View>

          {/* 政绩与民心 */}
          <View style={{
            backgroundColor: '#1C2E45', borderRadius: 4,
            borderWidth: 1, borderColor: '#2D4A6B',
            overflow: 'hidden',
          }}>
            <View style={{ backgroundColor: '#2B4B6F', paddingVertical: 10, paddingHorizontal: 16 }}>
              <Text style={{ fontSize: 13, fontWeight: '700', color: '#C8E0F4', letterSpacing: 1 }}>
                ◆ 为政评鉴
              </Text>
            </View>
            <View style={{ padding: 16, gap: 12 }}>
              <EvalRow
                label="累计政绩"
                value={`${Math.floor(save.meritPoints)} 分`}
                evalLabel={meritEval.label}
                evalColor={meritEval.color}
              />
              <EvalRow
                label="民心操守"
                value={`${save.moralValue} / 100`}
                evalLabel={moralEval.label}
                evalColor={moralEval.color}
              />
              <EvalRow
                label="家庭生活"
                value={`幸福度 ${save.familyHappiness ?? 0}`}
                evalLabel={familyEval.label}
                evalColor={familyEval.color}
              />
              <EvalRow
                label="个人积蓄"
                value={formatMoney(save.personalSavings ?? 0)}
                evalLabel="从政所得"
                evalColor="#888"
              />
            </View>
          </View>

          {/* 干部培养 */}
          <View style={{
            backgroundColor: '#1C2E45', borderRadius: 4,
            borderWidth: 1, borderColor: '#2D4A6B',
            overflow: 'hidden',
          }}>
            <View style={{ backgroundColor: '#2B4B6F', paddingVertical: 10, paddingHorizontal: 16 }}>
              <Text style={{ fontSize: 13, fontWeight: '700', color: '#C8E0F4', letterSpacing: 1 }}>
                ◆ 干部培养成果
              </Text>
            </View>
            <View style={{ padding: 16, gap: 10 }}>
              <View style={{ flexDirection: 'row', gap: 16, flexWrap: 'wrap' }}>
                <SummaryItem label="管辖下属" value={`${subCount} 人`} color="#88BBDD" />
                <SummaryItem label="提拔晋升" value={`${promotedCount} 人`} color="#2a7a3b" />
              </View>
              <Text style={{ fontSize: 11, color: '#6688AA', lineHeight: 18, marginTop: 4 }}>
                您培养的干部将继续为党和国家事业服务，薪火相传，政治遗产长存。
              </Text>
            </View>
          </View>

          {/* 派系终局（§4.8） */}
          <View style={{
            backgroundColor: '#1C2E45', borderRadius: 4,
            borderWidth: 1, borderColor: factionEnding.color + '66',
            overflow: 'hidden',
          }}>
            <View style={{ backgroundColor: factionEnding.color + '33', paddingVertical: 10, paddingHorizontal: 16 }}>
              <Text style={{ fontSize: 13, fontWeight: '700', color: factionEnding.color, letterSpacing: 1 }}>
                ◆ 派系终局
              </Text>
            </View>
            <View style={{ padding: 16, gap: 8 }}>
              <Text style={{ fontSize: 15, fontWeight: '700', color: factionEnding.color }}>{factionEnding.title}</Text>
              <Text style={{ fontSize: 12, color: '#AABDD0', lineHeight: 20 }}>{factionEnding.desc}</Text>
              <Text style={{ fontSize: 11, color: '#6688AA', lineHeight: 18 }}>
                派系影响力 {save.factionInfluence ?? 0} · 账目留痕 {save.purgeCount ?? 0} 次
              </Text>
            </View>
          </View>

          {/* 退休待遇 */}
          <View style={{
            backgroundColor: '#1C2E45', borderRadius: 4,
            borderWidth: 1, borderColor: '#C8A84B44',
            overflow: 'hidden',
          }}>
            <View style={{ backgroundColor: '#3A3010', paddingVertical: 10, paddingHorizontal: 16 }}>
              <Text style={{ fontSize: 13, fontWeight: '700', color: '#C8A84B', letterSpacing: 1 }}>
                ◆ 退休后政治待遇
              </Text>
            </View>
            <View style={{ padding: 16, gap: 8 }}>
              {benefits.map((b, i) => (
                <View key={i} style={{ flexDirection: 'row', gap: 8, alignItems: 'flex-start' }}>
                  <Text style={{ color: '#C8A84B', fontSize: 12, marginTop: 1 }}>✦</Text>
                  <Text style={{ fontSize: 12, color: '#AABDD0', lineHeight: 20, flex: 1 }}>{b}</Text>
                </View>
              ))}
            </View>
          </View>

          {/* 结语 */}
          <View style={{
            backgroundColor: '#12202F', borderRadius: 4,
            borderWidth: 1, borderColor: '#C8A84B33',
            padding: 20, alignItems: 'center', gap: 8,
          }}>
            <Text style={{ fontSize: 14, color: '#C8A84B', letterSpacing: 2, fontWeight: '700' }}>
              「居庙堂之高则忧其民，处江湖之远则忧其君」
            </Text>
            <Text style={{ fontSize: 11, color: '#5A7A99', textAlign: 'center', lineHeight: 18 }}>
              {save.playerName}同志，您以{careerYears}年如一日的奉献精神，{'\n'}
              书写了属于自己的政途传奇。
            </Text>
          </View>

          {/* 操作按钮 */}
          <View style={{ gap: 10, marginTop: 8 }}>
            <RestartBtn onPress={handleRestart} isDeleting={isDeleting} />
            <SignOutBtn onPress={async () => {
              await supabase.auth.signOut();
              router.replace('/(auth)/sign-in');
            }} />
          </View>
        </View>
      </ScrollView>
    </View>
  );
}

/** 概览数据项 */
function SummaryItem({ label, value, color }: { label: string; value: string; color: string }) {
  return (
    <View style={{ alignItems: 'center', minWidth: 80 }}>
      <Text style={{ fontSize: 10, color: '#6688AA', marginBottom: 2 }}>{label}</Text>
      <Text style={{ fontSize: 15, fontWeight: '700', color }}>{value}</Text>
    </View>
  );
}

/** 评鉴行 */
function EvalRow({
  label, value, evalLabel, evalColor,
}: {
  label: string; value: string; evalLabel: string; evalColor: string;
}) {
  return (
    <View style={{
      flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
      paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: '#1E3050',
    }}>
      <Text style={{ fontSize: 12, color: '#7799BB' }}>{label}</Text>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
        <Text style={{ fontSize: 13, color: '#C8E0F4', fontVariant: ['tabular-nums'] }}>{value}</Text>
        <View style={{
          backgroundColor: evalColor + '22', borderRadius: 2,
          paddingHorizontal: 6, paddingVertical: 2,
          borderWidth: 1, borderColor: evalColor + '55',
        }}>
          <Text style={{ fontSize: 10, color: evalColor, fontWeight: '700' }}>{evalLabel}</Text>
        </View>
      </View>
    </View>
  );
}

/** 重新开始按钮 */
function RestartBtn({ onPress, isDeleting }: { onPress: () => void; isDeleting: boolean }) {
  const [pressed, setPressed] = useState(false);
  return (
    <Pressable
      onPress={onPress}
      disabled={isDeleting}
      onPressIn={() => setPressed(true)}
      onPressOut={() => setPressed(false)}
      style={{
        backgroundColor: pressed ? '#8A1418' : '#7A1B1E',
        paddingVertical: 14, alignItems: 'center', borderRadius: 4,
        opacity: isDeleting ? 0.6 : 1,
      }}
    >
      {isDeleting ? (
        <ActivityIndicator size="small" color="#fff" />
      ) : (
        <Text style={{ color: '#fff', fontSize: 15, fontWeight: '700', letterSpacing: 1 }}>
          🔄  重新开始仕途
        </Text>
      )}
    </Pressable>
  );
}

/** 退出游戏按钮 */
function SignOutBtn({ onPress }: { onPress: () => void }) {
  const [pressed, setPressed] = useState(false);
  return (
    <Pressable
      onPress={onPress}
      onPressIn={() => setPressed(true)}
      onPressOut={() => setPressed(false)}
      style={{
        backgroundColor: pressed ? '#0E1B2D' : 'transparent',
        paddingVertical: 14, alignItems: 'center', borderRadius: 4,
        borderWidth: 1, borderColor: '#2D4A6B',
      }}
    >
      <Text style={{ color: '#6688AA', fontSize: 14, letterSpacing: 1 }}>
        退出游戏
      </Text>
    </Pressable>
  );
}
