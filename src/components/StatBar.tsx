// 数值进度条组件 —— 随职级主题动态切换风格
import { Text, View } from 'react-native';
import type { RankTheme } from '@/lib/rankTheme';

interface StatBarProps {
  label: string;
  value: number;
  color?: string;
  showValue?: boolean;
  theme?: RankTheme;
}

export function StatBar({ label, value, color, showValue = true, theme }: StatBarProps) {
  const clampedValue = Math.max(0, Math.min(100, value));
  const high = theme?.statHigh  ?? '#2a7a3b';
  const mid  = theme?.statMid   ?? (color ?? '#2B4B6F');
  const low  = theme?.statLow   ?? '#C82829';
  const barColor = clampedValue >= 70 ? high : clampedValue >= 40 ? mid : low;
  const trackBg  = theme?.progressBg ?? '#E5E2DC';
  const labelClr = theme?.labelText  ?? '#555';

  return (
    <View style={{ marginBottom: 8 }}>
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 3 }}>
        <Text style={{ fontSize: 11, color: labelClr, letterSpacing: 0.5 }}>{label}</Text>
        {showValue && (
          <Text style={{ fontSize: 11, color: barColor, fontVariant: ['tabular-nums'], fontWeight: '600' }}>
            {clampedValue.toFixed(1)}
          </Text>
        )}
      </View>
      <View style={{ height: 5, backgroundColor: trackBg, overflow: 'hidden' }}>
        <View style={{ height: 5, width: `${clampedValue}%`, backgroundColor: barColor }} />
      </View>
    </View>
  );
}
