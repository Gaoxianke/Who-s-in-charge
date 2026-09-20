// 赞助支持作者页面
import { Image } from 'expo-image';
import { Pressable, ScrollView, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { useRouter } from 'expo-router';

const QR_URL = 'https://miaoda-conversation-file.cdn.bcebos.com/user-chghfrv91n28/app-du8r0a7ctszl/20260817/md_20260817_060437_1.png';

const COMMITMENTS = [
  '赞助凭自愿，并非任何强制',
  '赞助将全部投入游戏运营',
  '每月将抽出一定额数的赞助进行慈善捐款，以谁主沉浮全体赞助玩家名义',
  '在此承诺游戏内容不管本体还是激活码永久免费，没有任何收费项目可能',
  '一天或两天统一公开当天所赞助的所有赞助额，以确保公开',
];

export default function SponsorScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();

  return (
    <View style={{ flex: 1, backgroundColor: '#0D0A04' }}>
      <StatusBar style="light" backgroundColor="#1A1200" />

      {/* 头部 */}
      <View style={{ backgroundColor: '#1A1200', paddingTop: insets.top + 8, paddingHorizontal: 16, paddingBottom: 12, borderBottomWidth: 2, borderBottomColor: '#C8A84B' }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
          <Pressable onPress={() => router.back()}>
            <Text style={{ color: '#E8D08A', fontSize: 22 }}>←</Text>
          </Pressable>
          <Text style={{ color: '#E8D08A', fontSize: 16, fontWeight: '700', letterSpacing: 1 }}>❤️ 赞助支持作者</Text>
        </View>
      </View>

      <ScrollView contentContainerStyle={{ padding: 20, paddingBottom: insets.bottom + 32 }}>
        {/* 说明文字区域 */}
        <View style={{ backgroundColor: '#1A1200', borderWidth: 1, borderColor: '#7A6428', padding: 16, marginBottom: 20 }}>
          {/* 顶部标题 */}
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 14 }}>
            <View style={{ width: 3, height: 16, backgroundColor: '#C8A84B' }} />
            <Text style={{ color: '#E8D08A', fontSize: 13, fontWeight: '700', letterSpacing: 1 }}>作者寄语</Text>
          </View>

          {/* 引言 */}
          <Text style={{ color: '#C8B87A', fontSize: 12, lineHeight: 20, marginBottom: 16 }}>
            由于作者更新花费个人实在承担不住，在此开通赞助：
          </Text>

          {/* 承诺列表 */}
          {COMMITMENTS.map((text, i) => (
            <View key={i} style={{ flexDirection: 'row', alignItems: 'flex-start', gap: 10, marginBottom: i < COMMITMENTS.length - 1 ? 12 : 0 }}>
              {/* 序号圆标 */}
              <View style={{ width: 20, height: 20, backgroundColor: '#C8A84B', alignItems: 'center', justifyContent: 'center', marginTop: 1 }}>
                <Text style={{ color: '#1A1200', fontSize: 10, fontWeight: '900' }}>{i + 1}</Text>
              </View>
              <Text style={{ flex: 1, color: '#EDE8DC', fontSize: 12, lineHeight: 20 }}>{text}</Text>
            </View>
          ))}
        </View>

        {/* 分隔间距 */}
        <View style={{ height: 20 }} />

        {/* 赞赏码图片区域 */}
        <View style={{ alignItems: 'center' }}>
          <Image
            source={{ uri: QR_URL }}
            style={{ width: 280, height: 320 }}
            contentFit="contain"
          />
        </View>
      </ScrollView>
    </View>
  );
}
