// 游戏结局页面 —— 落马 / 重大事故 / 政治清洗
// 通过路由参数 type 区分：corruption / accident / purge
import { useCallback, useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { useRouter, useLocalSearchParams, useFocusEffect } from 'expo-router';
import { supabase } from '@/client/supabase';
import { useGame } from '@/ctx/GameContext';
import { deleteSave } from '@/db/gameApi';
import { RANK_CONFIG, gameDaysToDate, getAvatarEmoji, getAvatarBgColor, formatMoney } from '@/types/game';

type GameOverType = 'corruption' | 'accident' | 'purge' | 'fugitive' | 'dismissed';

// 结局配置
const GAME_OVER_CONFIG: Record<GameOverType, {
  headline: string;
  subhead: string;
  headerBg: string;
  accentColor: string;
  badge: string;
  verdictTitle: string;
  verdictLines: string[];
  historyRating: (rankLevel: number, meritPoints: number, moralValue: number) => string;
}> = {
  corruption: {
    headline: '落马',
    subhead: '因涉嫌严重违纪违法，中枢纪律督察委员会对你立案审查',
    headerBg: '#1A0000',
    accentColor: '#C82829',
    badge: '⚖️',
    verdictTitle: '组织处分决定',
    verdictLines: [
      '经查，你严重违反廉洁纪律，利用职务便利谋取私利',
      '违反中央八项规定精神，长期民心失范，不守底线',
      '依据《中国共产党纪律处分条例》，开除党籍、撤销公职',
      '涉嫌犯罪问题移送司法机关依法处理',
    ],
    historyRating: (rank, merit, moral) => {
      if (merit > 5000) return '政绩可观，却因一己之私毁于一旦。权力是把双刃剑，此路引以为戒。';
      if (moral < 10) return '廉洁防线早已崩溃，终难逃法网。历史将以此为警示。';
      return '本可有所作为，奈何走入歧途。望后来者引以为鉴。';
    },
  },
  accident: {
    headline: '引咎辞职',
    subhead: '辖区发生重大安全事故，你对处置失当负有主要领导责任',
    headerBg: '#1A1200',
    accentColor: '#C87820',
    badge: '📋',
    verdictTitle: '责任追究决定',
    verdictLines: [
      '经调查，辖区安全生产管理严重失职失责',
      '对多起突发事件处置不当，酿成重大事故',
      '根据问责条例，给予引咎辞职处分',
      '相关行政和刑事责任将依法追究',
    ],
    historyRating: (rank, merit, _moral) => {
      if (rank >= 8) return '曾执掌一方，却在危机时刻失守岗位职责。能力与担当，缺一不可。';
      return '安全底线不可逾越，事故背后是无数家庭的悲剧。敬畏生命，方能为官。';
    },
  },
  purge: {
    headline: '政治出局',
    subhead: '派系斗争失利，被强势政治力量边缘化，强制调任虚职',
    headerBg: '#0D0D1A',
    accentColor: '#4A2C8A',
    badge: '🏛️',
    verdictTitle: '组织调整决定',
    verdictLines: [
      '经组织研究，你所在派系影响力已严重削弱',
      '政治生态发生重大变化，现有职位已难以为继',
      '经党组研究决定，调任虚职，不再参与实际政务',
      '任满后依规定办理退休手续',
    ],
    historyRating: (_rank, merit, _moral) => {
      if (merit > 8000) return '政绩颇丰，却在政治博弈中落败。宦海沉浮，非一己之力所能掌控。';
      return '派系倾轧是官场永恒的暗流，唯有实力与人脉兼备，方能立于不败之地。';
    },
  },
  fugitive: {
    headline: '潜逃境外',
    subhead: '在留置前仓皇出逃，红色通缉令已发布，国际追逃追赃启动',
    headerBg: '#0A1A0A',
    accentColor: '#2a7a3b',
    badge: '🌍',
    verdictTitle: '国际追逃决定',
    verdictLines: [
      '经查，你涉嫌巨额贪腐，在组织审查前畏罪潜逃境外',
      '中央反腐败协调小组已发布红色通缉令',
      '依据《国际刑事司法协助法》，启动国际追逃追赃',
      '天网恢恢，疏而不漏，归案只是时间问题',
    ],
    historyRating: (_rank, merit, _moral) => {
      if (merit > 8000) return '曾位高权重，却选择了一条不归路。异国他乡，终是漂泊无依。';
      return '贪念蒙蔽双眼，一念之差，从此亡命天涯。前车之覆，后车之鉴。';
    },
  },
  dismissed: {
    headline: '双开',
    subhead: '立案审查后证据坐实，被开除党籍、开除公职',
    headerBg: '#1A0A0A',
    accentColor: '#8B0000',
    badge: '🚫',
    verdictTitle: '党纪政务处分决定',
    verdictLines: [
      '经立案审查，你的违纪违法事实证据确凿',
      '严重违反政治纪律、组织纪律、廉洁纪律',
      '依据党纪处分条例，给予开除党籍处分',
      '依据政务处分法，给予开除公职处分',
    ],
    historyRating: (_rank, merit, _moral) => {
      if (merit > 5000) return '本有锦绣前程，却因贪腐身败名裂。双开之下，一切归零。';
      return '党纪国法面前，无人能心存侥幸。双开处分，是对贪腐者的应有惩戒。';
    },
  },
};

function StatRow({ label, value, color }: { label: string; value: string; color?: string }) {
  return (
    <View style={{ flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 7,
      borderBottomWidth: 1, borderBottomColor: '#E8E4E0' }}>
      <Text style={{ fontSize: 12, color: '#888' }}>{label}</Text>
      <Text style={{ fontSize: 13, color: color ?? '#1D3557', fontWeight: '600' }}>{value}</Text>
    </View>
  );
}

export default function GameOverScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const params = useLocalSearchParams<{ type: GameOverType }>();
  const type: GameOverType = (params.type as GameOverType) || 'corruption';
  const cfg = GAME_OVER_CONFIG[type];
  const { save, setIsRunning, clearGameOverTrigger } = useGame();
  const [deleting, setDeleting] = useState(false);
  const [showDelete, setShowDelete] = useState(false);

  // 停止时间推进
  useFocusEffect(useCallback(() => {
    setIsRunning(false);
  }, [setIsRunning]));

  const handleRestart = async () => {
    if (!save) return;
    setDeleting(true);
    await deleteSave(save.id);
    clearGameOverTrigger();
    setIsRunning(false);
    await supabase.auth.signOut();
    router.replace('/(auth)/sign-in');
  };

  if (!save) {
    return (
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: '#1A0000' }}>
        <ActivityIndicator color="#C82829" />
      </View>
    );
  }

  const rankConfig = RANK_CONFIG[save.rankLevel];
  const careerYears = Math.floor(save.gameDays / 365);
  const startDate = gameDaysToDate(0);
  const endDate = gameDaysToDate(save.gameDays);
  const avatarEmoji = getAvatarEmoji(save.avatarId, save.playerGender);
  const avatarBg = getAvatarBgColor(save.avatarId, save.reformFaction >= save.pragmaticFaction ? 'reform' : 'pragmatic');
  const historyRating = cfg.historyRating(save.rankLevel, save.meritPoints, save.moralValue);

  return (
    <View style={{ flex: 1, backgroundColor: cfg.headerBg }}>
      <StatusBar style="light" backgroundColor={cfg.headerBg} />
      <ScrollView contentInsetAdjustmentBehavior="automatic">
        {/* 全屏结局横幅 */}
        <View style={{ paddingTop: insets.top + 8, paddingBottom: 36, paddingHorizontal: 24, alignItems: 'center' }}>
          <Text style={{ fontSize: 56, marginBottom: 12 }}>{cfg.badge}</Text>
          <Text style={{ color: cfg.accentColor, fontSize: 38, fontWeight: 'bold', letterSpacing: 8,
            fontFamily: 'serif', marginBottom: 8 }}>
            {cfg.headline}
          </Text>
          <View style={{ height: 2, width: 80, backgroundColor: cfg.accentColor, marginBottom: 16 }} />
          <Text style={{ color: 'rgba(255,255,255,0.75)', fontSize: 13, textAlign: 'center',
            lineHeight: 22, maxWidth: 340 }}>
            {cfg.subhead}
          </Text>
        </View>

        {/* 档案卡 */}
        <View style={{ backgroundColor: '#F5F4F1', marginHorizontal: 16, borderWidth: 1,
          borderColor: cfg.accentColor, marginBottom: 16 }}>
          {/* 档案头 */}
          <View style={{ backgroundColor: cfg.accentColor, paddingVertical: 10, paddingHorizontal: 16,
            flexDirection: 'row', alignItems: 'center' }}>
            <Text style={{ color: '#fff', fontSize: 13, fontWeight: 'bold', letterSpacing: 2, flex: 1,
              fontFamily: 'serif' }}>干部仕途档案  ·  终止记录</Text>
          </View>

          <View style={{ padding: 16 }}>
            {/* 头像+姓名 */}
            <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 16,
              paddingBottom: 14, borderBottomWidth: 2, borderBottomColor: cfg.accentColor }}>
              <View style={{ width: 56, height: 56, borderRadius: 28, backgroundColor: avatarBg,
                alignItems: 'center', justifyContent: 'center', marginRight: 14,
                borderWidth: 2, borderColor: cfg.accentColor }}>
                <Text style={{ fontSize: 28 }}>{avatarEmoji}</Text>
              </View>
              <View style={{ flex: 1 }}>
                <Text style={{ fontSize: 18, fontWeight: 'bold', color: '#1A1A1A', fontFamily: 'serif' }}>
                  {save.playerName} 同志
                </Text>
                <Text style={{ fontSize: 12, color: '#666', marginTop: 2 }}>
                  {save.playerGender} · {save.playerAge} 岁 · {save.school}
                </Text>
              </View>
              <View style={{ backgroundColor: cfg.accentColor, paddingHorizontal: 10, paddingVertical: 4 }}>
                <Text style={{ color: '#fff', fontSize: 11, fontWeight: '700' }}>{cfg.headline}</Text>
              </View>
            </View>

            {/* 仕途数据 */}
            <StatRow label="最终职级" value={rankConfig.name} color={cfg.accentColor} />
            <StatRow label="最终职位" value={save.playerPosition || rankConfig.name} />
            <StatRow label="任职城市" value={save.cityName} />
            <StatRow label="仕途年数" value={`${careerYears} 年`} />
            <StatRow label="政绩积分" value={`${Math.round(save.meritPoints).toLocaleString()} 分`} />
            <StatRow label="民心指数" value={`${save.moralValue} / 100`}
              color={save.moralValue < 20 ? '#C82829' : save.moralValue < 40 ? '#C87820' : '#2a7a3b'} />
            <StatRow label="在职时间" value={`${startDate} — ${endDate}`} />
            <StatRow label="个人存款" value={`¥ ${formatMoney(save.personalSavings)}`} />
            {(type === 'corruption' || type === 'fugitive' || type === 'dismissed') && (
              <StatRow label="涉案金额" value={`¥ ${formatMoney(Number(save.illegalWealth ?? 0))}`} color="#C82829" />
            )}
          </View>
        </View>

        {/* 组织处分决定 */}
        <View style={{ backgroundColor: '#F5F4F1', marginHorizontal: 16, borderWidth: 1,
          borderColor: '#D0C8B8', marginBottom: 16 }}>
          <View style={{ backgroundColor: '#2C2C2C', paddingVertical: 10, paddingHorizontal: 16 }}>
            <Text style={{ color: '#FFD700', fontSize: 12, fontWeight: 'bold', letterSpacing: 2,
              fontFamily: 'serif' }}>{cfg.verdictTitle}</Text>
          </View>
          <View style={{ padding: 16 }}>
            {cfg.verdictLines.map((line, i) => (
              <View key={i} style={{ flexDirection: 'row', marginBottom: 8 }}>
                <Text style={{ color: cfg.accentColor, fontWeight: '700', marginRight: 8, fontSize: 13 }}>
                  {i + 1}.
                </Text>
                <Text style={{ flex: 1, fontSize: 13, color: '#333', lineHeight: 20 }}>{line}</Text>
              </View>
            ))}
          </View>
        </View>

        {/* 历史评价 */}
        <View style={{ backgroundColor: '#F5F4F1', marginHorizontal: 16, marginBottom: 28,
          borderWidth: 1, borderColor: '#D0C8B8' }}>
          <View style={{ backgroundColor: '#3C3228', paddingVertical: 10, paddingHorizontal: 16 }}>
            <Text style={{ color: '#D4B896', fontSize: 12, fontWeight: 'bold', letterSpacing: 2,
              fontFamily: 'serif' }}>历史评价</Text>
          </View>
          <View style={{ padding: 16 }}>
            <Text style={{ fontSize: 14, color: '#444', lineHeight: 24, fontStyle: 'italic',
              fontFamily: 'serif', textAlign: 'center' }}>
              「{historyRating}」
            </Text>
          </View>
        </View>

        {/* 操作按钮 */}
        <View style={{ marginHorizontal: 16, marginBottom: 48, gap: 12 }}>
          {!showDelete ? (
            <Pressable
              onPress={() => setShowDelete(true)}
              style={{ backgroundColor: cfg.accentColor, paddingVertical: 16, alignItems: 'center' }}
            >
              <Text style={{ color: '#fff', fontSize: 16, fontWeight: 'bold', letterSpacing: 3 }}>
                重新开始仕途
              </Text>
            </Pressable>
          ) : (
            <View style={{ borderWidth: 1, borderColor: cfg.accentColor, padding: 16 }}>
              <Text style={{ color: '#333', fontSize: 13, textAlign: 'center', marginBottom: 12, lineHeight: 20 }}>
                确认将删除本档存档并返回登录页，此操作不可撤销。
              </Text>
              <View style={{ flexDirection: 'row', gap: 12 }}>
                <Pressable
                  onPress={() => setShowDelete(false)}
                  style={{ flex: 1, borderWidth: 1, borderColor: '#999', paddingVertical: 12, alignItems: 'center' }}
                >
                  <Text style={{ color: '#666', fontSize: 14 }}>取消</Text>
                </Pressable>
                <Pressable
                  onPress={handleRestart}
                  disabled={deleting}
                  style={{ flex: 2, backgroundColor: cfg.accentColor, paddingVertical: 12, alignItems: 'center' }}
                >
                  {deleting
                    ? <ActivityIndicator color="#fff" size="small" />
                    : <Text style={{ color: '#fff', fontSize: 14, fontWeight: 'bold' }}>确认，重新开始</Text>
                  }
                </Pressable>
              </View>
            </View>
          )}
        </View>
      </ScrollView>
    </View>
  );
}
