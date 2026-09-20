// 红头公文弹窗组件（考察谈话/任职公示/任职通知/组织谈话 统一公文风格）
import { Modal, Pressable, ScrollView, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

interface OfficialDocumentModalProps {
  visible: boolean;
  header: string;        // 发文机关（红色大字）
  title: string;         // 文件标题
  docNo?: string;        // 文号
  sealText?: string;     // 印章文字
  children: React.ReactNode;
  onClose?: () => void;
  primaryAction?: { label: string; onPress: () => void };
  secondaryAction?: { label: string; onPress: () => void };
  dismissable?: boolean; // 是否允许点遮罩关闭
}

export function OfficialDocumentModal({
  visible, header, title, docNo, sealText, children,
  onClose, primaryAction, secondaryAction, dismissable = true,
}: OfficialDocumentModalProps) {
  const insets = useSafeAreaInsets();
  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={() => dismissable && onClose?.()}>
      <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.55)', justifyContent: 'center', padding: 24 }}>
        <View style={{
          backgroundColor: '#FFFCF5', borderWidth: 2, borderColor: '#C82829', maxHeight: '85%',
        }}>
          {/* 红头 */}
          <View style={{ borderBottomWidth: 2, borderBottomColor: '#C82829', paddingVertical: 14, alignItems: 'center' }}>
            <Text style={{ color: '#C82829', fontSize: 18, fontWeight: '900', letterSpacing: 4 }}>{header}</Text>
            {docNo ? <Text style={{ color: '#C82829', fontSize: 11, marginTop: 4 }}>{docNo}</Text> : null}
          </View>
          {/* 标题 */}
          <View style={{ paddingVertical: 12, alignItems: 'center', borderBottomWidth: 1, borderBottomColor: '#E8D9B5' }}>
            <Text style={{ color: '#1A1A1A', fontSize: 15, fontWeight: '700', letterSpacing: 2 }}>{title}</Text>
          </View>
          {/* 正文 */}
          <ScrollView style={{ maxHeight: 360 }} contentContainerStyle={{ padding: 18 }}>
            {children}
          </ScrollView>
          {/* 印章 */}
          {sealText ? (
            <View style={{ alignItems: 'flex-end', paddingRight: 24, paddingBottom: 4 }}>
              <View style={{
                width: 72, height: 72, borderRadius: 36, borderWidth: 2.5, borderColor: '#C82829',
                alignItems: 'center', justifyContent: 'center', transform: [{ rotate: '-8deg' }],
              }}>
                <Text style={{ color: '#C82829', fontSize: 10, fontWeight: '800', textAlign: 'center' }}>{sealText}</Text>
              </View>
            </View>
          ) : null}
          {/* 操作按钮 */}
          <View style={{ flexDirection: 'row', gap: 10, padding: 14, borderTopWidth: 1, borderTopColor: '#E8D9B5' }}>
            {secondaryAction ? (
              <Pressable
                onPress={secondaryAction.onPress}
                style={{ flex: 1, borderWidth: 1, borderColor: '#999', paddingVertical: 11, alignItems: 'center' }}
              >
                <Text style={{ color: '#555', fontSize: 13, fontWeight: '600' }}>{secondaryAction.label}</Text>
              </Pressable>
            ) : null}
            {primaryAction ? (
              <Pressable
                onPress={primaryAction.onPress}
                style={{ flex: 1, backgroundColor: '#C82829', paddingVertical: 11, alignItems: 'center' }}
                android_ripple={{ color: 'rgba(255,255,255,0.2)' }}
              >
                <Text style={{ color: '#fff', fontSize: 13, fontWeight: '700' }}>{primaryAction.label}</Text>
              </Pressable>
            ) : null}
            {!primaryAction && !secondaryAction ? (
              <Pressable
                onPress={() => onClose?.()}
                style={{ flex: 1, backgroundColor: '#1D3B5E', paddingVertical: 11, alignItems: 'center' }}
              >
                <Text style={{ color: '#fff', fontSize: 13, fontWeight: '700' }}>关闭</Text>
              </Pressable>
            ) : null}
          </View>
          <View style={{ height: insets.bottom }} />
        </View>
      </View>
    </Modal>
  );
}