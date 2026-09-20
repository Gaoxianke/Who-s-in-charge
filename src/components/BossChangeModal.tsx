// 上司换届通知弹窗（组织人事调整公文风格）
import { Modal, Pressable, Text, View } from 'react-native';
import type { BossChangeEvent } from '@/ctx/GameContext';

interface Props {
  event: BossChangeEvent;
  onConfirm: () => void;
}

const BOSS_NUM_LABEL: Record<number, string> = {
  1: '直属上级',
  2: '二级上级',
  3: '三级上级',
};

export function BossChangeModal({ event, onConfirm }: Props) {
  const docNum = `组干字〔${new Date().getFullYear()}〕第 ${Math.floor(Math.random() * 90 + 10)} 号`;
  const favorDesc = event.newFavor >= 50
    ? `初步了解（好感 ${event.newFavor}），需主动维护关系`
    : `尚不熟悉（好感 ${event.newFavor}），需尽快建立信任`;

  return (
    <Modal transparent animationType="fade" visible>
      <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.65)', alignItems: 'center', justifyContent: 'center', padding: 24 }}>
        <View style={{ width: '100%', maxWidth: 440, backgroundColor: '#F5F4F1', borderWidth: 1, borderColor: '#1D3557' }}>
          {/* 蓝色公文头 */}
          <View style={{ backgroundColor: '#1D3557', paddingVertical: 14, paddingHorizontal: 20, alignItems: 'center' }}>
            <Text style={{ color: '#fff', fontSize: 11, letterSpacing: 5, marginBottom: 4, opacity: 0.80 }}>
              中共  组织部  干部人事局
            </Text>
            <Text style={{ color: '#A8D0F5', fontSize: 18, fontWeight: 'bold', letterSpacing: 3, fontFamily: 'serif' }}>
              干部职务调整通知
            </Text>
          </View>

          {/* 金色装饰线 */}
          <View style={{ height: 2, backgroundColor: '#C8A84B' }} />

          {/* 文号 */}
          <View style={{ backgroundColor: '#EEF3F8', paddingHorizontal: 20, paddingVertical: 7, borderBottomWidth: 1, borderBottomColor: '#D0DCE8' }}>
            <Text style={{ fontSize: 11, color: '#888', textAlign: 'right', fontFamily: 'serif' }}>{docNum}</Text>
          </View>

          {/* 正文 */}
          <View style={{ paddingHorizontal: 20, paddingTop: 18, paddingBottom: 12 }}>
            <Text style={{ fontSize: 13, color: '#1D3557', fontWeight: '700', marginBottom: 14, fontFamily: 'serif' }}>
              {BOSS_NUM_LABEL[event.bossNum]} 职务变动：
            </Text>

            {/* 离任卡 */}
            <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 10, padding: 12, backgroundColor: '#F0EDE8', borderWidth: 1, borderColor: '#D0C8B8' }}>
              <View style={{ width: 36, height: 36, borderRadius: 18, backgroundColor: '#CCC', alignItems: 'center', justifyContent: 'center', marginRight: 12 }}>
                <Text style={{ fontSize: 16 }}>👤</Text>
              </View>
              <View style={{ flex: 1 }}>
                <Text style={{ fontSize: 13, color: '#555', fontFamily: 'serif' }}>
                  <Text style={{ fontWeight: '700', color: '#333' }}>{event.oldBossName}</Text> 同志
                </Text>
                <Text style={{ fontSize: 11, color: '#888', marginTop: 2 }}>
                  职务：{event.position}  ·  任期届满，荣休
                </Text>
              </View>
              <View style={{ backgroundColor: '#888', paddingHorizontal: 8, paddingVertical: 3 }}>
                <Text style={{ fontSize: 10, color: '#fff', fontWeight: '700' }}>离任</Text>
              </View>
            </View>

            {/* 箭头 */}
            <Text style={{ textAlign: 'center', color: '#1D3557', fontSize: 18, marginVertical: 4 }}>↓</Text>

            {/* 接任卡 */}
            <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 16, padding: 12, backgroundColor: '#EEF3F8', borderWidth: 1, borderColor: '#1D3557' }}>
              <View style={{ width: 36, height: 36, borderRadius: 18, backgroundColor: '#1D3557', alignItems: 'center', justifyContent: 'center', marginRight: 12 }}>
                <Text style={{ fontSize: 16 }}>🧑‍💼</Text>
              </View>
              <View style={{ flex: 1 }}>
                <Text style={{ fontSize: 13, color: '#1D3557', fontFamily: 'serif' }}>
                  <Text style={{ fontWeight: '700' }}>{event.newBossName}</Text> 同志
                </Text>
                <Text style={{ fontSize: 11, color: '#555', marginTop: 2 }}>
                  职务：{event.position}  ·  正式履职
                </Text>
              </View>
              <View style={{ backgroundColor: '#1D3557', paddingHorizontal: 8, paddingVertical: 3 }}>
                <Text style={{ fontSize: 10, color: '#fff', fontWeight: '700' }}>接任</Text>
              </View>
            </View>

            {/* 关系提示 */}
            <View style={{ backgroundColor: '#FFF9E6', borderLeftWidth: 3, borderLeftColor: '#C8A84B', paddingVertical: 8, paddingHorizontal: 12 }}>
              <Text style={{ fontSize: 11, color: '#7B5E2A', lineHeight: 18 }}>
                📌 与新上级的关系：{favorDesc}
              </Text>
              <Text style={{ fontSize: 11, color: '#999', marginTop: 4, lineHeight: 16 }}>
                提示：及时汇报工作、拜访联络，有助于尽快建立信任，保持晋升通道畅通。
              </Text>
            </View>

            {/* 落款 */}
            <View style={{ alignItems: 'flex-end', marginTop: 14 }}>
              <Text style={{ fontSize: 11, color: '#888', fontFamily: 'serif' }}>
                中共中枢组织部  干部一局
              </Text>
            </View>
          </View>

          <View style={{ height: 1, backgroundColor: '#DDD', marginHorizontal: 20 }} />

          <View style={{ padding: 16 }}>
            <Pressable
              onPress={onConfirm}
              style={{ backgroundColor: '#1D3557', paddingVertical: 12, alignItems: 'center' }}
            >
              <Text style={{ color: '#fff', fontSize: 14, fontWeight: 'bold', letterSpacing: 2 }}>悉知，继续工作</Text>
            </Pressable>
          </View>
        </View>
      </View>
    </Modal>
  );
}
