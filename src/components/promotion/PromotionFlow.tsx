// 晋升五步流程：考察谈话 → 民主推荐 → 任职公示 → 任命文件 → 交接赴任
// v4：民主推荐率为软输入参考；个人职位战（10%派系+90%个人）走「职位争夺」独立通道
import { useState } from 'react';
import { Pressable, Text, View } from 'react-native';
import { OfficialDocumentModal } from '@/components/OfficialDocumentModal';
import { INTERVIEW_OPTIONS } from '@/lib/promotionConfig';
import { generateDocNo } from '@/lib/promotionEngine';
import { CONTEST_BLEND, CONTEST_COSTS } from '@/lib/provinceSeatSystem';
import type { PlayerSave } from '@/types/game';
import { RANK_CONFIG, getRandomCityForRank } from '@/types/game';

type Step = 'interview' | 'recommend' | 'publicity' | 'appointment' | 'done';

interface Props {
  visible: boolean;
  save: PlayerSave;
  postName: string;
  toRank: number;
  onClose: () => void;
  onComplete: (payload: {
    docNo: string; toRank: number; cityName: string; postName: string;
  }) => void;
}

export function PromotionFlow({ visible, save, postName, toRank, onClose, onComplete }: Props) {
  const [step, setStep] = useState<Step>('interview');
  const [impression, setImpression] = useState(0);
  const [recommendRate, setRecommendRate] = useState(0);
  const [docNo] = useState(() => generateDocNo(save.gameDays));
  const [chosenCity] = useState(() => getRandomCityForRank(toRank > 0 ? toRank : 1));

  const favorAvg = Math.round((save.bossFavor + save.boss2Favor + save.boss3Favor) / 3);

  const handleInterview = (score: number) => {
    setImpression(score);
    const rate = Math.min(95, 40 + score * 8 + favorAvg * 0.3);
    setRecommendRate(Math.round(rate));
    setStep('recommend');
  };

  const handleRecommend = () => {
    if (recommendRate < 60) {
      onComplete({ docNo, toRank: save.rankLevel, cityName: save.cityName, postName: '' });
      return;
    }
    setStep('publicity');
  };

  const handlePublicity = () => setStep('appointment');
  const handleAccept = () => {
    setStep('done');
    onComplete({ docNo, toRank, cityName: chosenCity, postName });
  };

  const close = () => { setStep('interview'); onClose(); };

  return (
    <OfficialDocumentModal
      visible={visible}
      header="组织人事部门"
      title={step === 'interview' ? '组织考察谈话通知'
        : step === 'recommend' ? '民主推荐结果'
        : step === 'publicity' ? '任职公示'
        : step === 'appointment' ? '任职通知'
        : '赴任提示'}
      docNo={step === 'appointment' ? docNo : undefined}
      sealText={step === 'appointment' ? '组织人事部门\n专用章' : undefined}
      dismissable={step === 'done'}
      onClose={close}
      primaryAction={step === 'done' ? { label: '完成赴任', onPress: close } : undefined}
    >
      {step === 'interview' ? (
        <View style={{ gap: 10 }}>
          <Text style={bodyStyle}>经组织研究，拟安排 {save.playerName} 同志进行考察谈话。请结合自身工作实际，选择谈话重点：</Text>
          {INTERVIEW_OPTIONS.map(opt => (
            <Pressable key={opt.key} onPress={() => handleInterview(opt.score)} style={{ borderWidth: 1, borderColor: '#D9D9D9', padding: 12, backgroundColor: '#FFFCF5' }}>
              <Text style={{ fontSize: 13, color: '#1A1A1A', fontWeight: '600' }}>{opt.label}</Text>
              <Text style={{ fontSize: 10, color: '#999', marginTop: 2 }}>印象分 +{opt.score}</Text>
            </Pressable>
          ))}
        </View>
      ) : null}

      {step === 'recommend' ? (
        <View style={{ gap: 10 }}>
          <Text style={bodyStyle}>经民主推荐统计，{save.playerName} 同志的推荐率为：</Text>
          <View style={{ alignItems: 'center', paddingVertical: 12 }}>
            <Text style={{ fontSize: 36, fontWeight: '900', color: recommendRate >= 60 ? '#2a7a3b' : '#C82829' }}>{recommendRate}%</Text>
            <Text style={{ fontSize: 11, color: '#999', marginTop: 4 }}>通过线 60%（软输入参考 · 不再一票否决）</Text>
          </View>
          {recommendRate < 60 ? (
            <Text style={{ fontSize: 12, color: '#B8860B', lineHeight: 18 }}>
              推荐率不足 60%（软输入）。本次组织流程中止，但个人职位战通道不受影响——可前往「晋升评审 · 职位争夺」发起个人职位战（派系 {CONTEST_BLEND.faction * 100}% + 个人 {CONTEST_BLEND.personal * 100}%，花费 {CONTEST_COSTS.personalContest.merit} 功绩）。
            </Text>
          ) : null}
          <Pressable onPress={handleRecommend} style={{ backgroundColor: '#C82829', paddingVertical: 12, alignItems: 'center', marginTop: 6 }}>
            <Text style={{ color: '#fff', fontSize: 13, fontWeight: '700' }}>{recommendRate >= 60 ? '进入任职公示' : '确认中止'}</Text>
          </Pressable>
        </View>
      ) : null}

      {step === 'publicity' ? (
        <View style={{ gap: 10 }}>
          <Text style={bodyStyle}>现将拟任人选公示如下：</Text>
          <View style={{ backgroundColor: '#F5F0E0', padding: 12, gap: 4 }}>
            <Text style={{ fontSize: 13, fontWeight: '700', color: '#1A1A1A' }}>拟任职务：{postName}</Text>
            <Text style={{ fontSize: 11, color: '#666' }}>拟任人选：{save.playerName} 同志</Text>
            <Text style={{ fontSize: 11, color: '#666' }}>公示期：7 个工作日</Text>
            <Text style={{ fontSize: 11, color: '#666' }}>监督电话：12380</Text>
          </View>
          <Pressable onPress={handlePublicity} style={{ backgroundColor: '#C82829', paddingVertical: 12, alignItems: 'center', marginTop: 6 }}>
            <Text style={{ color: '#fff', fontSize: 13, fontWeight: '700' }}>公示无异议，进入任命</Text>
          </Pressable>
        </View>
      ) : null}

      {step === 'appointment' ? (
        <View style={{ gap: 10 }}>
          <Text style={bodyStyle}>经组织研究决定：</Text>
          <Text style={{ fontSize: 13, color: '#1A1A1A', lineHeight: 22 }}>
            任命 {save.playerName} 同志为 {postName}（第 {toRank} 级），任职时间自即日起计算。
          </Text>
          <Text style={{ fontSize: 11, color: '#999', marginTop: 6 }}>请点击「接受任命」完成职位变更。</Text>
          <Pressable onPress={handleAccept} style={{ backgroundColor: '#C82829', paddingVertical: 12, alignItems: 'center', marginTop: 6 }}>
            <Text style={{ color: '#fff', fontSize: 13, fontWeight: '700' }}>接受任命</Text>
          </Pressable>
        </View>
      ) : null}

      {step === 'done' ? (
        <View style={{ gap: 8 }}>
          <Text style={{ fontSize: 13, fontWeight: '700', color: '#2a7a3b' }}>🎉 赴任成功</Text>
          <Text style={bodyStyle}>你已正式就任 {postName}，赴 {chosenCity} 履新。</Text>
          <Text style={{ fontSize: 11, color: '#999' }}>新职级：第 {toRank} 级 · {RANK_CONFIG[toRank]?.name ?? ''}</Text>
          <Text style={{ fontSize: 11, color: '#e67e22' }}>初来乍到，民心值 -5，进入 90 天扎根期。</Text>
        </View>
      ) : null}
    </OfficialDocumentModal>
  );
}

const bodyStyle = { fontSize: 13, color: '#333', lineHeight: 22 } as const;