// 风险监控 Tab：设备/IP 集群检测已关闭，展示简要说明
import { ScrollView, Text, View } from 'react-native';
import { A, Card } from './shared';

export function RiskTab({ role: _role }: { role: string }) {
  return (
    <ScrollView contentContainerStyle={{ padding: 16, gap: 12 }} showsVerticalScrollIndicator={false}>
      <Card title="🚨 风险监控" accent={A.gold}>
        <View style={{ gap: 10 }}>
          <View style={{ backgroundColor: A.greenBg, borderLeftWidth: 2, borderLeftColor: A.green, paddingHorizontal: 12, paddingVertical: 10 }}>
            <Text style={{ color: '#7FE0A0', fontSize: 12, fontWeight: '700', marginBottom: 4 }}>✅ 检测机制已精简</Text>
            <Text style={{ color: A.textSecond, fontSize: 11, lineHeight: 18 }}>
              设备指纹检测、多设备登录检测、IP 集群检测均已关闭。{'\n'}
              测试码注册流程仅进行码有效性验证，不再对设备/IP 做限制。
            </Text>
          </View>
          <View style={{ gap: 6 }}>
            <Text style={{ color: A.textHint, fontSize: 10, fontWeight: '700', letterSpacing: 2 }}>当前生效的审核逻辑</Text>
            {[
              '✔ 测试码一码一用（状态流转：unused → used）',
              '✔ 自动审批模式：开启后提交码即直接 approved',
              '✔ 手动审批模式：提交码后状态为 pending，等待管理员审核',
              '✔ 已审批账号重新提交码：直接返回 ALREADY_APPROVED',
              '✔ 封禁账号：通过申诉流程由超级管理员处理',
            ].map((item, i) => (
              <Text key={i} style={{ color: A.textSecond, fontSize: 11, lineHeight: 18 }}>{item}</Text>
            ))}
          </View>
          <View style={{ backgroundColor: A.bgInput, borderWidth: 1, borderColor: A.border, padding: 10 }}>
            <Text style={{ color: A.textHint, fontSize: 10, lineHeight: 16 }}>
              如需查看账号分布情况，请使用「账号」或「统计」Tab。{'\n'}
              如需处理违规账号，请使用「删除账号」或「封禁记录」Tab。
            </Text>
          </View>
        </View>
      </Card>
    </ScrollView>
  );
}

