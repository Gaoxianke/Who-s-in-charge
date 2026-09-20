// v5 派系攻夺战地图：全国席位控制度总览 + 各省攻夺进度 + 攻夺按钮
// 所有数字均来自配置对象（PROVINCE_ATTACK_COST / VICTORY_THRESHOLD 等），禁止硬编码
import { Pressable, ScrollView, Text, View } from 'react-native';
import { useGame } from '@/ctx/GameContext';
import {
  PROVINCE_ATTACK_COST,
  VICTORY_THRESHOLD,
  getNationalControl,
  getProvinceAttackProgressOf,
  canLaunchProvinceAttack,
  launchProvinceAttack,
} from '@/lib/provinceSeatSystem';
import { ALL_FACTIONS, FACTION_COLOR, FACTION_LABEL, type FactionId } from '@/types/game';

export function FactionAttackMap() {
  const { save, updateGameSave, refreshSave } = useGame();
  if (!save) return null;

  const primary = (save.primaryFaction || 'reform') as FactionId;
  const { control, seats } = getNationalControl(save);
  const day = save.gameDays;
  const cost = PROVINCE_ATTACK_COST;

  const handleAttack = async (province: string) => {
    const check = canLaunchProvinceAttack(save, province, day);
    if (!check.ok) return;
    const updates = launchProvinceAttack(save, province, day);
    await updateGameSave(updates);
    await refreshSave();
  };

  const myRatio = control.controlRatios[primary] ?? 0;
  const seatCountOf = (province: string) =>
    seats.find(s => s.province === province)?.seatCount ?? 0;

  return (
    <ScrollView contentContainerStyle={{ padding: 12, paddingBottom: 40, gap: 12 }} showsVerticalScrollIndicator={false}>
      {/* 全国席位控制度总览 */}
      <View style={{ backgroundColor: '#fff', borderWidth: 1, borderColor: '#D9D9D9', padding: 12 }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
          <Text style={{ fontSize: 12, fontWeight: '700', color: '#1D3B5E', letterSpacing: 1 }}>🗺 全国席位控制度</Text>
          <Text style={{ fontSize: 10, color: '#999' }}>共 {control.totalSeats} 席</Text>
        </View>
        {/* 各派按比例着色条 */}
        <View style={{ height: 22, flexDirection: 'row', borderWidth: 1, borderColor: '#D9D9D9' }}>
          {ALL_FACTIONS.map(f => {
            const ratio = control.controlRatios[f] ?? 0;
            if (ratio <= 0) return null;
            return (
              <View
                key={f}
                style={{ width: `${ratio * 100}%`, backgroundColor: FACTION_COLOR[f], justifyContent: 'center', alignItems: 'center' }}
              >
                {ratio >= 0.08 ? (
                  <Text style={{ color: '#fff', fontSize: 8, fontWeight: '700' }}>{Math.round(ratio * 100)}%</Text>
                ) : null}
              </View>
            );
          })}
        </View>
        {/* 80% 胜线说明 */}
        <View style={{ position: 'relative', height: 14, marginTop: 4 }}>
          <View style={{ position: 'absolute', left: `${VICTORY_THRESHOLD * 100}%`, top: 0, bottom: 0, width: 2, backgroundColor: '#8A1515' }} />
          <Text style={{ fontSize: 9, color: '#999' }}>
            本派 {FACTION_LABEL[primary]} 控制 {Math.round(myRatio * 100)}%（{control.factionSeats[primary] ?? 0} 席）· 达 {Math.round(VICTORY_THRESHOLD * 100)}% 提前收官
          </Text>
        </View>
        {/* 五派分布 */}
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginTop: 8 }}>
          {ALL_FACTIONS.map(f => (
            <View key={f} style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
              <View style={{ width: 8, height: 8, backgroundColor: FACTION_COLOR[f] }} />
              <Text style={{ fontSize: 9, color: '#666' }}>
                {FACTION_LABEL[f]} {Math.round((control.controlRatios[f] ?? 0) * 100)}%
              </Text>
            </View>
          ))}
        </View>
      </View>

      {/* 攻夺花费说明 */}
      <View style={{ backgroundColor: '#FFFCF0', borderWidth: 1, borderColor: '#B8860B', padding: 10 }}>
        <Text style={{ fontSize: 11, fontWeight: '700', color: '#8A6D1A', marginBottom: 4 }}>⚔ 派系攻夺战</Text>
        <Text style={{ fontSize: 10, color: '#666', lineHeight: 16 }}>
          每次攻夺消耗 {cost.meritCost} 功绩 · 进度 +{cost.progressPerAttack}（上限 {cost.maxProgress}）· 冷却 {cost.cooldownDays} 天。{'\n'}
          攻夺进度累积可提升本派对各省席位的争夺实力，助力省级席位控制度。
        </Text>
      </View>

      {/* 各省列表 */}
      <Text style={{ fontSize: 12, fontWeight: '700', color: '#1D3B5E', letterSpacing: 1 }}>各省攻夺进度</Text>
      {seats.map(seat => {
        const progress = getProvinceAttackProgressOf(save, seat.province);
        const check = canLaunchProvinceAttack(save, seat.province, day);
        const isFull = progress >= cost.maxProgress;
        const cooldownUntil = save.factionCooldowns?.[`provinceAttack_${seat.province}`] ?? 0;
        const cooldownRemaining = Math.max(0, cooldownUntil - day);
        const disabled = !check.ok;
        return (
          <View key={seat.province} style={{ backgroundColor: '#fff', borderWidth: 1, borderColor: '#D9D9D9', padding: 10 }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 }}>
              <View style={{ flex: 1 }}>
                <Text style={{ fontSize: 13, fontWeight: '700', color: '#1A1A1A' }}>{seat.province}</Text>
                <Text style={{ fontSize: 10, color: '#999', marginTop: 1 }}>
                  {seatCountOf(seat.province)} 席 · 当前控制：{seat.holderFaction ? FACTION_LABEL[seat.holderFaction] : '无'}
                </Text>
              </View>
              <View style={{ backgroundColor: '#E8EDF5', paddingHorizontal: 8, paddingVertical: 3 }}>
                <Text style={{ fontSize: 11, fontWeight: '700', color: '#1565C0' }}>{progress}/{cost.maxProgress}</Text>
              </View>
            </View>
            {/* 进度条 */}
            <View style={{ height: 10, backgroundColor: '#F0F0F0', borderWidth: 1, borderColor: '#E0E0E0', marginBottom: 8 }}>
              <View style={{ width: `${(progress / cost.maxProgress) * 100}%`, height: '100%', backgroundColor: isFull ? '#2E7D32' : '#1565C0' }} />
            </View>
            <Pressable
              onPress={() => handleAttack(seat.province)}
              disabled={disabled}
              style={{ backgroundColor: disabled ? '#ccc' : '#1565C0', paddingVertical: 10, alignItems: 'center' }}
              android_ripple={{ color: 'rgba(255,255,255,0.2)' }}
            >
              <Text style={{ color: '#fff', fontSize: 12, fontWeight: '700' }}>
                {isFull
                  ? '已满控制'
                  : cooldownRemaining > 0
                    ? `冷却中（剩 ${cooldownRemaining} 天）`
                    : `发起攻夺（-${cost.meritCost} 功绩）`}
              </Text>
            </Pressable>
          </View>
        );
      })}
    </ScrollView>
  );
}