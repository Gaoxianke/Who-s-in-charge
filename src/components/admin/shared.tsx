// 管理员后台共享 UI 组件与配色（深色政务风，与登录页一致）
import { ReactNode } from 'react';
import { Pressable, Text, TextInput, View } from 'react-native';

export const A = {
  bg: '#07111E', bgCard: '#0F2235', bgMid: '#0D1B2A', bgInput: '#0A1A2A',
  gold: '#C8A84B', goldLight: '#E8D08A', goldDim: '#7A6428', goldBg: 'rgba(200,168,75,0.08)',
  red: '#C82829', redBg: '#3a1414', green: '#2a7a3b', greenBg: '#123a1c',
  blue: '#2B4B6F', orange: '#B5651D',
  textPrimary: '#EDE8DC', textSecond: '#A09070', textHint: '#5A5040',
  divider: '#162840', border: '#1E3A5A',
};

export function Card({ children, title, accent = A.gold, style }: { children: ReactNode; title?: string; accent?: string; style?: object }) {
  return (
    <View style={{ backgroundColor: A.bgCard, borderWidth: 1, borderColor: A.divider, borderTopWidth: 2, borderTopColor: accent, padding: 14, borderRadius: 4, ...style }}>
      {title ? (
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 10 }}>
          <View style={{ width: 3, height: 13, backgroundColor: accent }} />
          <Text style={{ fontSize: 13, color: A.goldLight, fontWeight: '700', letterSpacing: 1 }}>{title}</Text>
        </View>
      ) : null}
      {children}
    </View>
  );
}

export function Row({ label, value, valueColor }: { label: string; value: ReactNode; valueColor?: string }) {
  return (
    <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 6, borderBottomWidth: 1, borderBottomColor: A.divider }}>
      <Text style={{ color: A.textSecond, fontSize: 12 }}>{label}</Text>
      <Text style={{ color: valueColor ?? A.textPrimary, fontSize: 12, fontWeight: '600' }}>{value}</Text>
    </View>
  );
}

export function Btn({ label, onPress, variant = 'gold', disabled, small, style }: { label: string; onPress: () => void; variant?: 'gold' | 'red' | 'green' | 'ghost' | 'blue'; disabled?: boolean; small?: boolean; style?: object }) {
  const colors: Record<string, string> = { gold: A.gold, red: A.red, green: A.green, blue: A.blue, ghost: 'transparent' };
  const bg = disabled ? A.goldDim : colors[variant];
  return (
    <Pressable
      cssInterop={false}
      disabled={disabled}
      onPress={onPress}
      style={{ backgroundColor: bg, paddingVertical: small ? 8 : 12, paddingHorizontal: small ? 10 : 16, alignItems: 'center', borderWidth: variant === 'ghost' ? 1 : 0, borderColor: A.goldDim, opacity: disabled ? 0.6 : 1, ...(style as object) }}
    >
      <Text style={{ color: variant === 'ghost' ? A.gold : '#fff', fontWeight: '700', fontSize: small ? 11 : 13, letterSpacing: 1 }}>{label}</Text>
    </Pressable>
  );
}

export function Badge({ text, color = A.gold }: { text: string; color?: string }) {
  return (
    <View style={{ backgroundColor: color, paddingHorizontal: 8, paddingVertical: 3 }}>
      <Text style={{ color: '#fff', fontSize: 10, fontWeight: '600' }}>{text}</Text>
    </View>
  );
}

export function Empty({ text = '暂无数据' }: { text?: string }) {
  return <Text style={{ color: A.textHint, fontSize: 12, textAlign: 'center', paddingVertical: 16 }}>{text}</Text>;
}

export function LabeledInput({ label, value, onChange, placeholder, keyboardType, multiline }: { label: string; value: string; onChange: (v: string) => void; placeholder?: string; keyboardType?: 'default' | 'numeric' | 'number-pad'; multiline?: boolean }) {
  return (
    <View style={{ gap: 4 }}>
      <Text style={{ color: A.textSecond, fontSize: 11 }}>{label}</Text>
      <TextInput
        value={value}
        onChangeText={onChange}
        placeholder={placeholder}
        placeholderTextColor={A.textHint}
        keyboardType={keyboardType}
        multiline={multiline}
        style={{ backgroundColor: A.bgInput, borderWidth: 1, borderColor: A.border, color: A.textPrimary, paddingHorizontal: 10, paddingVertical: 8, fontSize: 13, minHeight: multiline ? 72 : 0, textAlignVertical: 'top' }}
      />
    </View>
  );
}
