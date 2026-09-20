// 功能入口按钮卡片 —— 随职级主题动态切换风格
import { Pressable, Text, View } from 'react-native';
import type { RankTheme } from '@/lib/rankTheme';

interface NavCardProps {
  label: string;
  icon: string;
  badge?: number;
  onPress: () => void;
  accent?: boolean;   // 强调样式（重要功能）
  locked?: boolean;   // 未解锁状态
  unlockLevel?: number;
  theme?: RankTheme;  // 职级主题（可选，未传则使用默认县处级风格）
}

export function NavCard({ label, icon, badge, onPress, accent = false, locked = false, unlockLevel, theme }: NavCardProps) {
  const bg         = theme?.navCardBg          ?? '#FFFFFF';
  const border     = theme?.navCardBorder       ?? '#D8D4CE';
  const bottom     = theme?.navCardBottomBorder ?? '#2B4B6F';
  const accentBg   = theme?.navCardAccentBg     ?? '#C82829';
  const accentBd   = theme?.navCardAccentBorder ?? '#C82829';
  const accentBot  = theme?.navCardAccentBottom ?? '#9E1E1E';
  const accentBar  = theme?.cardAccentBar       ?? '#2B4B6F';
  const cardBg     = accent ? accentBg  : bg;
  const cardBorder = accent ? accentBd  : border;
  const cardBottom = accent ? accentBot : bottom;

  if (locked) {
    return (
      <View style={{
        flex: 1, minHeight: 74, alignItems: 'center', justifyContent: 'center',
        borderWidth: 1, borderColor: border, borderStyle: 'dashed',
        backgroundColor: bg, opacity: 0.45, padding: 10,
      }}>
        <Text style={{ fontSize: 20, marginBottom: 3 }}>{icon}</Text>
        <Text style={{ fontSize: 10, color: theme?.mutedText ?? '#AEAAA4', fontWeight: '600' }}>{label}</Text>
        {unlockLevel !== undefined && (
          <Text style={{ fontSize: 8, color: theme?.mutedText ?? '#C8C5BE', marginTop: 2 }}>🔒 {unlockLevel}级解锁</Text>
        )}
      </View>
    );
  }

  return (
    <Pressable
      cssInterop={false}
      onPress={onPress}
      style={{
        flex: 1,
        minHeight: 74,
        backgroundColor: cardBg,
        borderWidth: 1,
        borderColor: cardBorder,
        borderBottomWidth: 3,
        borderBottomColor: cardBottom,
        padding: 10,
        alignItems: 'center',
        justifyContent: 'center',
        position: 'relative',
      }}
      android_ripple={{ color: accent ? 'rgba(255,255,255,0.2)' : 'rgba(0,0,0,0.08)' }}
    >
      {/* 左侧竖条 */}
      <View style={{
        position: 'absolute', top: 0, left: 0,
        width: 3, height: '100%',
        backgroundColor: accent ? (theme?.primaryText === '#FFE08A' ? '#FFDE00' : 'rgba(255,255,255,0.4)') : accentBar,
      }} />
      <Text style={{ fontSize: 22, marginBottom: 3 }}>{icon}</Text>
      <Text style={{
        fontSize: 11, fontWeight: '700', letterSpacing: 0.5,
        color: accent ? (theme?.primaryText ?? '#fff') : (theme?.valueText ?? '#1A2B3C'),
      }}>{label}</Text>
      {badge !== undefined && badge > 0 && (
        <View style={{
          position: 'absolute', top: 5, right: 5,
          backgroundColor: accent ? '#fff' : (theme?.badgeBg ?? '#C82829'),
          minWidth: 17, height: 17,
          alignItems: 'center', justifyContent: 'center',
          paddingHorizontal: 3,
        }}>
          <Text style={{
            color: accent ? (theme?.accent ?? '#C82829') : (theme?.badgeText ?? '#fff'),
            fontSize: 9, fontWeight: '700',
          }}>{badge}</Text>
        </View>
      )}
    </Pressable>
  );
}
