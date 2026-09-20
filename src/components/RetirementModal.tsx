// 退休弹窗组件
// 触发条件：正国家级90岁（自主选择）/ 各级基准退休年龄（强制）
import { useState } from 'react';
import { Modal, Pressable, ScrollView, Text, View } from 'react-native';
import { useRouter } from 'expo-router';
import { useGame } from '@/ctx/GameContext';
import { getRetirementConfig, checkRetirementStatus } from '@/types/game';

interface RetirementModalProps {
  visible: boolean;
  triggerType: 'voluntary' | 'mandatory';
  onClose: () => void;
}

// 带 pressed 反馈的按钮组件（避免函数式 style）
function ActionBtn({
  onPress,
  bg,
  bgPressed,
  border,
  children,
}: {
  onPress: () => void;
  bg: string;
  bgPressed: string;
  border?: { width: number; color: string };
  children: React.ReactNode;
}) {
  const [pressed, setPressed] = useState(false);
  return (
    <Pressable
      onPress={onPress}
      onPressIn={() => setPressed(true)}
      onPressOut={() => setPressed(false)}
      style={{
        backgroundColor: pressed ? bgPressed : bg,
        paddingVertical: 12, alignItems: 'center', borderRadius: 2,
        ...(border ? { borderWidth: border.width, borderColor: border.color } : {}),
      }}
    >
      {children}
    </Pressable>
  );
}

interface RetirementModalProps {
  visible: boolean;
  triggerType: 'voluntary' | 'mandatory';
  onClose: () => void;
}

export function RetirementModal({ visible, triggerType, onClose }: RetirementModalProps) {
  const router = useRouter();
  const { save, updateGameSave, clearRetirementTrigger } = useGame();

  if (!save) return null;

  const cfg = getRetirementConfig(save.rankLevel);
  const retireStatus = checkRetirementStatus(save.rankLevel, save.playerAge, save.retirementDelayYears);
  const canDelay = cfg.maxDelayYears > 0 && save.retirementDelayYears < cfg.maxDelayYears;
  const delayUsed = save.retirementDelayYears;
  const delayMax = cfg.maxDelayYears;
  const delayRemaining = delayMax - delayUsed;

  // 强制退休（延迟次数已用尽或不可延迟）
  const isForcedRetire = triggerType === 'mandatory' && !canDelay;

  const handleRetireNow = async () => {
    // 标记已退休，跳转结局页
    await updateGameSave({ isRetired: true });
    clearRetirementTrigger();
    onClose();
    router.push('/(app)/retirement-ending');
  };

  const handleDelayRetire = async () => {
    if (!canDelay) return;
    // 消耗政绩申请延迟退休
    const cost = cfg.costPerDelay;
    await updateGameSave({
      retirementDelayYears: save.retirementDelayYears + 1,
      meritPoints: Math.max(0, save.meritPoints - cost),
    });
    clearRetirementTrigger();
    onClose();
  };

  const handleContinue = () => {
    // 正国家级自主：选择继续执政
    clearRetirementTrigger();
    onClose();
  };

  return (
    <Modal visible={visible} transparent animationType="fade" statusBarTranslucent>
      <View style={{
        flex: 1, backgroundColor: 'rgba(0,0,0,0.65)',
        alignItems: 'center', justifyContent: 'center',
        paddingHorizontal: 20,
      }}>
        <View style={{
          backgroundColor: '#FBF9F6',
          borderRadius: 4,
          borderWidth: 1,
          borderColor: '#C8B89A',
          width: '100%',
          maxWidth: 400,
          overflow: 'hidden',
        }}>
          {/* 顶部标题栏 */}
          <View style={{
            backgroundColor: triggerType === 'voluntary' ? '#2B4B6F' : '#7A1B1E',
            paddingVertical: 14, paddingHorizontal: 20,
            flexDirection: 'row', alignItems: 'center', gap: 8,
          }}>
            <Text style={{ fontSize: 16, color: '#fff' }}>
              {triggerType === 'voluntary' ? '🎖️' : '📋'}
            </Text>
            <Text style={{ fontSize: 15, fontWeight: '700', color: '#fff', letterSpacing: 1 }}>
              {triggerType === 'voluntary' ? '功成身退·自主选择' : '届龄退休·组织通知'}
            </Text>
          </View>

          <ScrollView style={{ maxHeight: 420 }} contentContainerStyle={{ padding: 20, gap: 14 }}>
            {/* 职级与退休规则说明 */}
            <View style={{
              backgroundColor: '#F0ECE4', borderRadius: 2,
              padding: 12, gap: 6,
            }}>
              <Text style={{ fontSize: 11, color: '#888', letterSpacing: 1 }}>当前职级</Text>
              <Text style={{ fontSize: 16, fontWeight: '700', color: '#2B4B6F' }}>
                {cfg.tier}  ·  {save.rankName}
              </Text>
              <Text style={{ fontSize: 12, color: '#666', lineHeight: 18, marginTop: 2 }}>
                {cfg.delayNote}
              </Text>
            </View>

            {/* 主要内容区 */}
            {triggerType === 'voluntary' ? (
              // 正国家级——自主退休内容
              <View style={{ gap: 10 }}>
                <View style={{
                  backgroundColor: '#EFF5EB', borderLeftWidth: 3, borderLeftColor: '#2a7a3b',
                  padding: 12,
                }}>
                  <Text style={{ fontSize: 13, color: '#2a7a3b', fontWeight: '700', marginBottom: 4 }}>
                    ✦ 自主退休选项
                  </Text>
                  <Text style={{ fontSize: 12, color: '#444', lineHeight: 20 }}>
                    您已年届 {save.playerAge} 岁，达到可自主选择退休的年龄。{'\n'}
                    退休后将保留最高政治待遇，仍可受邀参与国家重大战略决策与宏观政策咨询。
                  </Text>
                </View>
                <View style={{
                  backgroundColor: '#EEF2F8', borderLeftWidth: 3, borderLeftColor: '#2B4B6F',
                  padding: 12,
                }}>
                  <Text style={{ fontSize: 13, color: '#2B4B6F', fontWeight: '700', marginBottom: 4 }}>
                    ✦ 继续执政选项
                  </Text>
                  <Text style={{ fontSize: 12, color: '#444', lineHeight: 20 }}>
                    正国家级不设法定强制退休年龄，您可根据个人意愿与身体状况决定继续履职。
                  </Text>
                </View>
              </View>
            ) : (
              // 强制退休 / 延迟退休内容
              <View style={{ gap: 10 }}>
                <View style={{
                  backgroundColor: '#FDF3F3', borderLeftWidth: 3, borderLeftColor: '#C82829',
                  padding: 12,
                }}>
                  <Text style={{ fontSize: 13, color: '#C82829', fontWeight: '700', marginBottom: 4 }}>
                    📋 届龄退休通知
                  </Text>
                  <Text style={{ fontSize: 12, color: '#444', lineHeight: 20 }}>
                    您已年届 {save.playerAge} 岁，达到{cfg.tier}基准退休年龄，
                    {delayUsed > 0 ? `此前已申请 ${delayUsed} 年延迟退休，` : ''}
                    组织部要求按规定办理退休手续。
                  </Text>
                </View>
                {canDelay && (
                  <View style={{
                    backgroundColor: '#FFF8EC', borderLeftWidth: 3, borderLeftColor: '#D4A017',
                    padding: 12, gap: 4,
                  }}>
                    <Text style={{ fontSize: 13, color: '#8B6A00', fontWeight: '700' }}>
                      ⏳ 申请弹性延迟退休
                    </Text>
                    <Text style={{ fontSize: 12, color: '#555', lineHeight: 20 }}>
                      {cfg.tier}可申请弹性延迟退休，经组织批准后可延迟1年继续任职。{'\n'}
                      尚可申请：{delayRemaining} 次（已申请 {delayUsed}/{delayMax} 年）{'\n'}
                      本次申请政绩消耗：<Text style={{ color: '#C82829', fontWeight: '700' }}>-{cfg.costPerDelay} 政绩</Text>
                      {save.meritPoints < cfg.costPerDelay && (
                        <Text style={{ color: '#C82829' }}>（⚠️ 政绩不足，无法申请）</Text>
                      )}
                    </Text>
                  </View>
                )}
                {isForcedRetire && (
                  <View style={{
                    backgroundColor: '#F5F0E8', borderRadius: 2, padding: 10,
                  }}>
                    <Text style={{ fontSize: 11, color: '#888', lineHeight: 18 }}>
                      延迟退休名额已用尽或本职级不支持延迟，须正式办理退休手续。{'\n'}
                      退休后保留相应政治待遇，您的仕途奋斗将载入史册。
                    </Text>
                  </View>
                )}
              </View>
            )}
          </ScrollView>

          {/* 操作按钮区 */}
          <View style={{
            borderTopWidth: 1, borderTopColor: '#E8E2D8',
            padding: 16, gap: 10,
          }}>
            {triggerType === 'voluntary' ? (
              <>
                <ActionBtn
                  onPress={handleRetireNow}
                  bg="#2B4B6F" bgPressed="#1a3a5c"
                >
                  <Text style={{ color: '#fff', fontSize: 14, fontWeight: '700' }}>
                    🎖️  功成身退，安享晚年
                  </Text>
                </ActionBtn>
                <ActionBtn
                  onPress={handleContinue}
                  bg="#F5F2EC" bgPressed="#EDE8E0"
                  border={{ width: 1, color: '#C8B89A' }}
                >
                  <Text style={{ color: '#2B4B6F', fontSize: 14, fontWeight: '600' }}>
                    继续履职，报效国家
                  </Text>
                </ActionBtn>
              </>
            ) : (
              <>
                {canDelay && save.meritPoints >= cfg.costPerDelay && (
                  <ActionBtn
                    onPress={handleDelayRetire}
                    bg="#D4A017" bgPressed="#C89800"
                  >
                    <Text style={{ color: '#fff', fontSize: 14, fontWeight: '700' }}>
                      ⏳  申请延迟退休（消耗 {cfg.costPerDelay} 政绩）
                    </Text>
                  </ActionBtn>
                )}
                <ActionBtn
                  onPress={handleRetireNow}
                  bg="#7A1B1E" bgPressed="#8A1418"
                >
                  <Text style={{ color: '#fff', fontSize: 14, fontWeight: '700' }}>
                    📋  办理退休手续，功成身退
                  </Text>
                </ActionBtn>
              </>
            )}
          </View>
        </View>
      </View>
    </Modal>
  );
}
