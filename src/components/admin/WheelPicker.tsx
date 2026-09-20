// 滚轮选择器：垂直滚动选择数值，iOS/Android/Web 均可用
import { useCallback, useRef } from 'react';
import { FlatList, Text, View } from 'react-native';

const ITEM_H = 44; // 每项高度
const VISIBLE = 3; // 可见项数（奇数，中间为选中项）

interface WheelPickerProps {
  values: number[];
  selected: number;
  onChange: (v: number) => void;
  unit?: string; // 可选单位，显示在滚轮右侧
}

export function WheelPicker({ values, selected, onChange, unit }: WheelPickerProps) {
  const ref = useRef<FlatList>(null);
  const selIdx = values.indexOf(selected);

  // 挂载后滚到选中位置
  const onLayout = useCallback(() => {
    const idx = values.indexOf(selected);
    if (idx >= 0) {
      ref.current?.scrollToOffset({ offset: idx * ITEM_H, animated: false });
    }
  }, [selected, values]);

  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
      <View style={{ height: ITEM_H * VISIBLE, width: 80, overflow: 'hidden', position: 'relative' }}>
        {/* 选中项高亮背景 */}
        <View
          pointerEvents="none"
          style={{
            position: 'absolute', top: ITEM_H, left: 0, right: 0, height: ITEM_H,
            backgroundColor: 'rgba(212,175,55,0.12)',
            borderTopWidth: 1, borderBottomWidth: 1,
            borderColor: 'rgba(212,175,55,0.45)',
            zIndex: 2,
          }}
        />
        <FlatList
          ref={ref}
          data={values}
          keyExtractor={(v) => String(v)}
          snapToInterval={ITEM_H}
          decelerationRate="fast"
          showsVerticalScrollIndicator={false}
          onLayout={onLayout}
          contentContainerStyle={{ paddingTop: ITEM_H, paddingBottom: ITEM_H }}
          onMomentumScrollEnd={(e) => {
            const raw = Math.round(e.nativeEvent.contentOffset.y / ITEM_H);
            const clamped = Math.max(0, Math.min(raw, values.length - 1));
            if (values[clamped] !== selected) onChange(values[clamped]);
          }}
          // 慢速滑动也需捕获
          onScrollEndDrag={(e) => {
            const raw = Math.round(e.nativeEvent.contentOffset.y / ITEM_H);
            const clamped = Math.max(0, Math.min(raw, values.length - 1));
            if (values[clamped] !== selected) onChange(values[clamped]);
          }}
          renderItem={({ item }) => {
            const isSelected = item === selected;
            return (
              <View style={{ height: ITEM_H, justifyContent: 'center', alignItems: 'center' }}>
                <Text
                  style={{
                    color: isSelected ? '#D4AF37' : 'rgba(255,255,255,0.35)',
                    fontSize: isSelected ? 22 : 15,
                    fontWeight: isSelected ? '700' : '400',
                  }}
                >
                  {item}
                </Text>
              </View>
            );
          }}
        />
      </View>
      {unit ? (
        <Text style={{ color: 'rgba(255,255,255,0.55)', fontSize: 13 }}>{unit}</Text>
      ) : null}
      {/* 选中值大字提示 */}
      <View style={{ flex: 1, alignItems: 'flex-end' }}>
        <Text style={{ color: '#D4AF37', fontSize: 11, fontWeight: '600', opacity: selIdx >= 0 ? 1 : 0 }}>
          已选 {selected} 天
        </Text>
      </View>
    </View>
  );
}
