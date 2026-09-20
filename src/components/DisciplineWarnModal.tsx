// 纪委约谈 / 立案审查 弹窗组件（公文红头文件风格）
import { useState } from 'react';
import { ActivityIndicator, Modal, Pressable, Text, View } from 'react-native';
import type { DisciplineWarnEvent } from '@/ctx/GameContext';

interface Props {
  event: DisciplineWarnEvent;
  onConfirm: () => void; // 确认后由 home.tsx 执行扣分逻辑
}

export function DisciplineWarnModal({ event, onConfirm }: Props) {
  const [confirming, setConfirming] = useState(false);
  const isInvestigation = event.type === 'investigation';

  const headerBg    = isInvestigation ? '#7B0000' : '#9E2A2B';
  const titleText   = isInvestigation ? '立案审查通知书' : '纪委约谈通知';
  const docNum      = isInvestigation
    ? `纪审函〔${new Date().getFullYear()}〕第 ${Math.floor(Math.random() * 90 + 10)} 号`
    : `纪谈字〔${new Date().getFullYear()}〕第 ${Math.floor(Math.random() * 90 + 10)} 号`;
  const btnLabel    = isInvestigation ? '知悉，接受审查' : '知悉，接受约谈';
  const penaltyText = isInvestigation
    ? `政绩扣除 ${event.meritPenalty} 分，民心下降 ${Math.abs(event.moralChange)} 点`
    : `政绩扣除 ${event.meritPenalty} 分，民心回升 ${event.moralChange} 点（警示效果）`;

  const handleConfirm = async () => {
    setConfirming(true);
    onConfirm();
  };

  return (
    <Modal transparent animationType="fade" visible>
      {/* 遮罩 */}
      <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.70)', alignItems: 'center', justifyContent: 'center', padding: 24 }}>
        {/* 文件卡片 */}
        <View style={{ width: '100%', maxWidth: 440, backgroundColor: '#F5F4F1', borderWidth: 1, borderColor: '#8B1A1A' }}>
          {/* 红头区域 */}
          <View style={{ backgroundColor: headerBg, paddingVertical: 14, paddingHorizontal: 20, alignItems: 'center' }}>
            <Text style={{ color: '#fff', fontSize: 11, letterSpacing: 6, marginBottom: 4, opacity: 0.85 }}>
              华夏人民共和国  纪检监察委员会
            </Text>
            <Text style={{ color: '#FFD700', fontSize: 20, fontWeight: 'bold', letterSpacing: 4, fontFamily: 'serif' }}>
              {titleText}
            </Text>
          </View>

          {/* 红线 */}
          <View style={{ height: 3, backgroundColor: '#C82829' }} />

          {/* 文号区 */}
          <View style={{ backgroundColor: '#FFF8F0', paddingHorizontal: 20, paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: '#E0D0C0' }}>
            <Text style={{ fontSize: 11, color: '#888', textAlign: 'right', fontFamily: 'serif' }}>{docNum}</Text>
          </View>

          {/* 正文 */}
          <View style={{ paddingHorizontal: 20, paddingTop: 18, paddingBottom: 12 }}>
            {/* 称谓 */}
            <Text style={{ fontSize: 14, color: '#1D3557', fontWeight: '700', marginBottom: 10, fontFamily: 'serif' }}>
              同志：
            </Text>
            {/* 正文内容 */}
            <Text style={{ fontSize: 13, color: '#2C2C2C', lineHeight: 22, textAlign: 'justify', fontFamily: 'serif' }}>
              {event.content}
            </Text>

            {/* 警示框 */}
            <View style={{
              marginTop: 16, borderLeftWidth: 4, borderLeftColor: headerBg,
              backgroundColor: isInvestigation ? '#FFF0F0' : '#FFF8E1',
              paddingVertical: 10, paddingHorizontal: 14,
            }}>
              <Text style={{ fontSize: 12, color: headerBg, fontWeight: '700', marginBottom: 3 }}>
                {isInvestigation ? '⚠️ 组织处理' : '📋 提醒处理'}
              </Text>
              <Text style={{ fontSize: 11, color: '#555', lineHeight: 18 }}>{penaltyText}</Text>
              {isInvestigation && (
                <Text style={{ fontSize: 11, color: '#C82829', marginTop: 4, fontWeight: '600' }}>
                  警告：若民心降至 0，将被立案查处，仕途终结。
                </Text>
              )}
            </View>

            {/* 落款 */}
            <View style={{ alignItems: 'flex-end', marginTop: 16 }}>
              <Text style={{ fontSize: 11, color: '#888', fontFamily: 'serif' }}>
                经办：{event.officerName}
              </Text>
              <Text style={{ fontSize: 11, color: '#888', fontFamily: 'serif', marginTop: 2 }}>
                {new Date().getFullYear()} 年  组织部
              </Text>
            </View>
          </View>

          {/* 分割线 */}
          <View style={{ height: 1, backgroundColor: '#DDD', marginHorizontal: 20 }} />

          {/* 按钮区 */}
          <View style={{ padding: 16, alignItems: 'center' }}>
            <Pressable
              onPress={handleConfirm}
              disabled={confirming}
              style={{
                backgroundColor: confirming ? '#aaa' : headerBg,
                paddingVertical: 12, paddingHorizontal: 40,
                width: '100%', alignItems: 'center',
              }}
            >
              {confirming
                ? <ActivityIndicator color="#fff" size="small" />
                : <Text style={{ color: '#fff', fontSize: 14, fontWeight: 'bold', letterSpacing: 2 }}>{btnLabel}</Text>
              }
            </Pressable>
          </View>
        </View>
      </View>
    </Modal>
  );
}
