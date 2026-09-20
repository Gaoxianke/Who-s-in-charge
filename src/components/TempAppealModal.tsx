// 临时申诉弹窗（复用组件）
// 提交时调用 submit-temp-appeal Edge Function：
//   - 捕获设备指纹 / IP
//   - 多开检测（同设备 / 同 IP 其他账号数，排除管理员）
//   - 返回账号创建时间
//   - 管理员账号自动豁免
import { useState } from 'react';
import { KeyboardAvoidingView, Modal, Pressable, Text, TextInput, View } from 'react-native';
import { supabase } from '@/client/supabase';
import { getDeviceId } from '@/lib/device';

const C = {
  bgCard: '#0F2235',
  gold: '#C8A84B',
  goldLight: '#E8D08A',
  goldBg: 'rgba(200,168,75,0.08)',
  red: '#C82829',
  redBg: 'rgba(200,40,41,0.12)',
  green: '#2a7a3b',
  greenBg: 'rgba(40,120,60,0.12)',
  textPrimary: '#EDE8DC',
  textSecond: '#A09070',
  textHint: '#5A5040',
  inputBg: '#0A1928',
  inputBorder: '#1E3A5A',
  divider: '#162840',
};

export interface TempAppealRisk {
  same_fp_count: number;
  same_ip_count: number;
  admin_exempt: boolean;
  created_at: string | null;
}

export function TempAppealModal({ visible, onClose }: { visible: boolean; onClose: () => void }) {
  const [reason, setReason] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const [risk, setRisk] = useState<TempAppealRisk | null>(null);

  const reset = () => {
    setReason('');
    setMsg(null);
    setRisk(null);
  };

  const submit = async () => {
    const r = reason.trim();
    if (r.length < 5) {
      setMsg({ ok: false, text: '请填写不少于 5 字的申诉理由' });
      return;
    }
    setSubmitting(true);
    setMsg(null);
    setRisk(null);
    try {
      const deviceId = await getDeviceId();
      const { data, error } = await supabase.functions.invoke('submit-temp-appeal', {
        body: { reason: r, device_fingerprint: deviceId },
      });
      if (error) {
        setMsg({ ok: false, text: `提交失败：${error.message}` });
      } else {
        const res = data as { ok?: boolean; err?: string; risk?: Omit<TempAppealRisk, 'created_at'>; created_at?: string };
        if (res?.ok) {
          setMsg({ ok: true, text: '✓ 临时申诉已提交，请耐心等待管理员审核' });
          setReason('');
          setRisk({
            same_fp_count: res.risk?.same_fp_count ?? 0,
            same_ip_count: res.risk?.same_ip_count ?? 0,
            admin_exempt: res.risk?.admin_exempt ?? false,
            created_at: res.created_at ?? null,
          });
        } else {
          setMsg({ ok: false, text: res?.err ?? '提交失败，请稍后重试' });
        }
      }
    } catch (e) {
      setMsg({ ok: false, text: `提交失败：${e instanceof Error ? e.message : String(e)}` });
    }
    setSubmitting(false);
  };

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <KeyboardAvoidingView behavior={process.env.EXPO_OS === 'ios' ? 'padding' : undefined} style={{ flex: 1 }}>
        <Pressable style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.7)', justifyContent: 'center', paddingHorizontal: 24 }} onPress={() => { reset(); onClose(); }}>
          <Pressable style={{ backgroundColor: C.bgCard, borderWidth: 1, borderColor: C.gold, padding: 18, gap: 12 }} onPress={() => {}}>
            <Text style={{ color: C.goldLight, fontSize: 15, fontWeight: '700' }}>📝 临时申诉</Text>
            <Text style={{ color: C.textSecond, fontSize: 11, lineHeight: 18 }}>
              若后台显示您的账号已有存档，但您在此处看不到存档（可能是后台显示错误），请填写申诉理由，管理员将尽快核实处理。
            </Text>
            <TextInput
              value={reason}
              onChangeText={setReason}
              placeholder="请详细描述您遇到的问题（不少于 5 字）"
              placeholderTextColor={C.textHint}
              multiline
              maxLength={300}
              style={{ backgroundColor: C.inputBg, borderWidth: 1, borderColor: C.inputBorder, paddingHorizontal: 10, paddingVertical: 8, color: C.textPrimary, fontSize: 12, minHeight: 80, textAlignVertical: 'top' }}
            />

            {risk ? (
              <View style={{ backgroundColor: C.goldBg, borderWidth: 1, borderColor: C.gold, paddingHorizontal: 10, paddingVertical: 8, gap: 4 }}>
                <Text style={{ color: C.goldLight, fontSize: 11, fontWeight: '700' }}>系统风控信息</Text>
                <Text style={{ color: C.textSecond, fontSize: 11, lineHeight: 18 }}>
                  账号创建时间：{risk.created_at ? new Date(risk.created_at).toLocaleString('zh-CN') : '未知'}
                </Text>
                <Text style={{ color: risk.same_fp_count > 0 ? '#FF7070' : C.textSecond, fontSize: 11, lineHeight: 18 }}>
                  同设备其他账号：{risk.same_fp_count} 个{risk.same_fp_count > 0 ? '（疑似多开）' : ''}
                </Text>
                <Text style={{ color: risk.same_ip_count > 0 ? '#FF7070' : C.textSecond, fontSize: 11, lineHeight: 18 }}>
                  同网络IP其他账号：{risk.same_ip_count} 个{risk.same_ip_count > 0 ? '（疑似多开）' : ''}
                </Text>
                {risk.admin_exempt ? (
                  <Text style={{ color: '#7FE0A0', fontSize: 11, fontWeight: '700' }}>🛡 管理员账号，已自动豁免多开审查</Text>
                ) : null}
              </View>
            ) : null}

            {msg ? (
              <View style={{ backgroundColor: msg.ok ? C.greenBg : C.redBg, borderLeftWidth: 2, borderLeftColor: msg.ok ? C.green : C.red, paddingHorizontal: 10, paddingVertical: 6 }}>
                <Text style={{ color: msg.ok ? '#7FE0A0' : '#FF7070', fontSize: 11, lineHeight: 16 }}>{msg.text}</Text>
              </View>
            ) : null}

            <View style={{ flexDirection: 'row', gap: 8 }}>
              <Pressable onPress={() => { reset(); onClose(); }} style={{ flex: 1, paddingVertical: 10, alignItems: 'center', borderWidth: 1, borderColor: C.divider }}>
                <Text style={{ color: C.textSecond, fontSize: 13 }}>关闭</Text>
              </Pressable>
              <Pressable onPress={submit} disabled={submitting} style={{ flex: 1, paddingVertical: 10, alignItems: 'center', backgroundColor: C.gold, opacity: submitting ? 0.6 : 1 }}>
                <Text style={{ color: '#1a1a1a', fontSize: 13, fontWeight: '700' }}>{submitting ? '提交中...' : '提交申诉'}</Text>
              </Pressable>
            </View>
          </Pressable>
        </Pressable>
      </KeyboardAvoidingView>
    </Modal>
  );
}