// 城市建设页面 — 城市财政驱动（万元），项目唯一制，分级差异化
import { useState, useCallback } from 'react';
import { ActivityIndicator, Pressable, ScrollView, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { useRouter, useFocusEffect } from 'expo-router';
import { useGame } from '@/ctx/GameContext';
import { getBuildProjects, startBuildProject } from '@/db/gameApi';
import { getAvailableProjects, formatMoney, formatFund } from '@/types/game';
import type { BuildProject, BuildProjectTemplate } from '@/types/game';
import { gameDaysToDate } from '@/types/game';

const EFFECT_LABEL: Record<string, string> = {
  gdp: 'GDP',
  livelihood: '民生',
  ecology: '生态',
  business: '营商',
};
const EFFECT_COLOR: Record<string, string> = {
  gdp: '#1D2D44',
  livelihood: '#2a7a3b',
  ecology: '#0d6e6e',
  business: '#7a5c2a',
};
const EFFECT_BG: Record<string, string> = {
  gdp: '#EEF2F7',
  livelihood: '#e8f5e9',
  ecology: '#e0f4f4',
  business: '#fff8ee',
};

// 效益类型筛选选项
type EffectFilter = 'all' | 'gdp' | 'livelihood' | 'ecology' | 'business';
const FILTER_OPTIONS: { key: EffectFilter; label: string }[] = [
  { key: 'all',       label: '全部' },
  { key: 'gdp',       label: 'GDP' },
  { key: 'livelihood',label: '民生' },
  { key: 'ecology',   label: '生态' },
  { key: 'business',  label: '营商' },
];

function ProgressBar({ value, total }: { value: number; total: number }) {
  const pct = Math.min(100, (value / total) * 100);
  return (
    <View style={{ height: 4, backgroundColor: '#E8E8E5', marginTop: 4 }}>
      <View style={{ height: 4, width: `${pct}%`, backgroundColor: '#2a7a3b' }} />
    </View>
  );
}

// 财政投入规模标签
function FundScale({ fund }: { fund: number }) {
  let label = '小型';
  let color = '#2a7a3b';
  if (fund >= 100000000)      { label = '超大型'; color = '#C82829'; }
  else if (fund >= 10000000)  { label = '大型';   color = '#b35900'; }
  else if (fund >= 1000000)   { label = '中型';   color = '#2B4B6F'; }
  return (
    <View style={{ backgroundColor: color + '18', borderWidth: 1, borderColor: color + '55', paddingHorizontal: 5, paddingVertical: 1 }}>
      <Text style={{ fontSize: 9, color, fontWeight: '700' }}>{label}</Text>
    </View>
  );
}

function ProjectCard({ tpl, onBuild, canAfford, loading, alreadyBuilt }: {
  tpl: BuildProjectTemplate;
  onBuild: (tpl: BuildProjectTemplate) => void;
  canAfford: boolean;
  loading: boolean;
  alreadyBuilt: boolean;
}) {
  const effectColor = EFFECT_COLOR[tpl.effectType] ?? '#1D2D44';
  const effectBg    = EFFECT_BG[tpl.effectType]    ?? '#EEF2F7';

  if (alreadyBuilt) {
    return (
      <View style={{ backgroundColor: '#F9F9F9', borderWidth: 1, borderColor: '#D1D1D1', padding: 12, marginBottom: 8, opacity: 0.6 }}>
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
          <Text style={{ fontSize: 13, color: '#999', fontWeight: '600', flex: 1 }}>{tpl.name}</Text>
          <View style={{ backgroundColor: '#E0E0E0', paddingHorizontal: 10, paddingVertical: 4 }}>
            <Text style={{ fontSize: 11, color: '#888' }}>已完工</Text>
          </View>
        </View>
      </View>
    );
  }

  return (
    <View style={{ backgroundColor: '#fff', borderWidth: 1, borderColor: '#D1D1D1', padding: 14, marginBottom: 10 }}>
      {/* 标题行 */}
      <View style={{ flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 8 }}>
        <View style={{ flex: 1, marginRight: 10 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 5, marginBottom: 5, flexWrap: 'wrap' }}>
            {/* 效益类型标签 */}
            <View style={{ backgroundColor: effectBg, borderWidth: 1, borderColor: effectColor + '55', paddingHorizontal: 6, paddingVertical: 2 }}>
              <Text style={{ fontSize: 9, color: effectColor, fontWeight: '700' }}>{EFFECT_LABEL[tpl.effectType]}</Text>
            </View>
            <FundScale fund={tpl.costFund} />
            <Text style={{ fontSize: 14, fontWeight: '700', color: '#1A1A1A' }}>{tpl.name}</Text>
          </View>
          <Text style={{ fontSize: 11, color: '#666', lineHeight: 17, marginBottom: 10 }}>{tpl.desc}</Text>

          {/* 消耗 & 收益信息条 */}
          <View style={{ backgroundColor: '#F8F7F5', borderWidth: 1, borderColor: '#E8E6E2', padding: 8, gap: 5 }}>
            {/* 财政投入 */}
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
              <Text style={{ fontSize: 10, color: '#888', width: 52 }}>财政投入</Text>
              <Text style={{ fontSize: 12, color: '#C82829', fontWeight: '700', flex: 1 }}>
                {tpl.costFund >= 10000
                  ? `${(tpl.costFund / 10000).toFixed(tpl.costFund % 10000 === 0 ? 0 : 1)}亿元`
                  : tpl.costFund >= 1
                    ? `${tpl.costFund}万元`
                    : `${formatMoney(tpl.costFund * 10000)}元`}
              </Text>
            </View>
            {/* 工期 */}
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
              <Text style={{ fontSize: 10, color: '#888', width: 52 }}>建设工期</Text>
              <Text style={{ fontSize: 12, color: '#1D2D44', fontWeight: '600', flex: 1 }}>
                {tpl.durationDays >= 365
                  ? `约${(tpl.durationDays / 365).toFixed(1)}年（${tpl.durationDays}天）`
                  : `${tpl.durationDays}天`}
              </Text>
            </View>
            {/* 竣工效益 */}
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
              <Text style={{ fontSize: 10, color: '#888', width: 52 }}>竣工效益</Text>
              <Text style={{ fontSize: 12, color: effectColor, fontWeight: '700', flex: 1 }}>
                {EFFECT_LABEL[tpl.effectType]} +{tpl.effectValue}
                <Text style={{ fontSize: 10, color: '#888', fontWeight: '400' }}> · 奖励 +{tpl.meritReward}政绩</Text>
              </Text>
            </View>
          </View>
        </View>

        {/* 开工按钮 */}
        <Pressable
          onPress={() => onBuild(tpl)}
          disabled={!canAfford || loading}
          style={{
            paddingHorizontal: 14, paddingVertical: 12,
            backgroundColor: !canAfford ? '#E0E0E0' : '#1D2D44',
            alignItems: 'center', minWidth: 62, alignSelf: 'flex-start',
          }}
        >
          {loading ? (
            <ActivityIndicator size="small" color="#fff" />
          ) : (
            <>
              <Text style={{ color: canAfford ? '#fff' : '#999', fontSize: 13, fontWeight: '700' }}>
                {canAfford ? '开工' : '资金\n不足'}
              </Text>
            </>
          )}
        </Pressable>
      </View>
    </View>
  );
}

function BuildingCard({ proj, gameDays }: { proj: BuildProject; gameDays: number }) {
  const elapsed    = Math.max(0, gameDays - proj.startDay);
  const remainDays = Math.max(0, proj.finishDay - gameDays);
  const effectColor = EFFECT_COLOR[proj.effectType] ?? '#2a7a3b';
  const pct = Math.min(100, Math.round((elapsed / proj.durationDays) * 100));
  return (
    <View style={{ backgroundColor: '#fff', borderWidth: 1, borderColor: '#2a7a3b', borderLeftWidth: 3, padding: 14, marginBottom: 10 }}>
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 6 }}>
        <Text style={{ fontSize: 14, fontWeight: '700', color: '#1A1A1A', flex: 1, marginRight: 6 }}>{proj.name}</Text>
        <View style={{ backgroundColor: '#e8f5e9', paddingHorizontal: 8, paddingVertical: 3 }}>
          <Text style={{ fontSize: 10, color: '#2a7a3b', fontWeight: '600' }}>建设中 {pct}%</Text>
        </View>
      </View>
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 6, flexWrap: 'wrap', gap: 4 }}>
        <Text style={{ fontSize: 11, color: '#666' }}>
          竣工：{gameDaysToDate(proj.finishDay)}（剩 <Text style={{ fontWeight: '700', color: remainDays <= 30 ? '#C82829' : '#333' }}>{remainDays}</Text> 天）
        </Text>
        <Text style={{ fontSize: 11, color: effectColor, fontWeight: '600' }}>
          {EFFECT_LABEL[proj.effectType]} +{proj.effectValue} · 奖励+{proj.meritReward}政绩
        </Text>
      </View>
      <ProgressBar value={elapsed} total={proj.durationDays} />
      <Text style={{ fontSize: 10, color: '#888', marginTop: 4 }}>
        财政投入：{formatMoney(proj.costFund)} 元 · 开工：{gameDaysToDate(proj.startDay)}
      </Text>
    </View>
  );
}

function CompletedCard({ proj }: { proj: BuildProject }) {
  const effectColor = EFFECT_COLOR[proj.effectType] ?? '#555';
  return (
    <View style={{ backgroundColor: '#F9F9F9', borderWidth: 1, borderColor: '#D1D1D1', padding: 12, marginBottom: 8 }}>
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
        <View style={{ flex: 1 }}>
          <Text style={{ fontSize: 12, fontWeight: '600', color: '#555' }}>{proj.name}</Text>
          <Text style={{ fontSize: 10, color: '#888', marginTop: 3 }}>
            竣工：{gameDaysToDate(proj.finishDay)} · 投入 {formatMoney(proj.costFund)} 元
          </Text>
        </View>
        <View style={{ alignItems: 'flex-end', gap: 2 }}>
          <View style={{ backgroundColor: '#E0E0E0', paddingHorizontal: 6, paddingVertical: 2 }}>
            <Text style={{ fontSize: 9, color: '#777', fontWeight: '600' }}>已竣工</Text>
          </View>
          <Text style={{ fontSize: 10, color: effectColor, fontWeight: '600' }}>
            {EFFECT_LABEL[proj.effectType]} +{proj.effectValue}
          </Text>
        </View>
      </View>
    </View>
  );
}

export default function ConstructionScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { save, updateGameSave } = useGame();
  const [projects, setProjects] = useState<BuildProject[]>([]);
  const [buildingTpl, setBuildingTpl] = useState<string | null>(null);
  const [feedback, setFeedback] = useState('');
  const [feedbackOk, setFeedbackOk] = useState(true);
  const [effectFilter, setEffectFilter] = useState<EffectFilter>('all');
  const [showCompleted, setShowCompleted] = useState(false);

  const rankLevel = save?.rankLevel ?? 1;
  const availableTemplates = getAvailableProjects(rankLevel);

  const showFeedback = (msg: string, ok = true) => {
    setFeedback(msg);
    setFeedbackOk(ok);
    setTimeout(() => setFeedback(''), 4000);
  };

  useFocusEffect(
    useCallback(() => {
      if (!save) return;
      getBuildProjects(save.id).then(setProjects);
    }, [save])
  );

  // costFund 单位：万元；save.fundBalance 单位：万元 → 直接比较
  const handleBuild = async (tpl: BuildProjectTemplate) => {
    if (!save) return;
    const fundWan = save.fundBalance;
    if (fundWan < tpl.costFund) {
      const need = tpl.costFund >= 10000
        ? `${(tpl.costFund / 10000).toFixed(1)}亿`
        : `${tpl.costFund}万`;
      const cur = fundWan >= 10000
        ? `${(fundWan / 10000).toFixed(1)}亿`
        : `${fundWan}万`;
      showFeedback(`财政余额不足，需 ${need} 元（当前 ${cur} 元）`, false);
      return;
    }
    setBuildingTpl(tpl.name);
    const proj = await startBuildProject(save.id, save.userId, save.gameDays, tpl);
    if (proj) {
      // 扣减财政余额：通过 updateGameSave 更新 player_saves，同步刷新 context
      await updateGameSave({ fundBalance: Math.max(0, save.fundBalance - tpl.costFund) });
      const fresh = await getBuildProjects(save.id);
      setProjects(fresh);
      const costLabel = tpl.costFund >= 10000
        ? `${(tpl.costFund / 10000).toFixed(1)}亿元`
        : `${tpl.costFund}万元`;
      showFeedback(`✓ 【${tpl.name}】已开工 · 投入 ${costLabel} · 预计 ${tpl.durationDays} 天竣工`, true);
    } else {
      showFeedback('开工失败，请重试', false);
    }
    setBuildingTpl(null);
  };

  const buildingProjects  = projects.filter(p => p.status === 'building');
  const completedProjects = projects.filter(p => p.status === 'done');

  // 已建造（在建+已竣工）的项目名称集合 → 屏蔽"只能建一次"
  const builtNames = new Set(projects.map(p => p.name));

  // 筛选可建项目（排除已建/在建）
  let filteredTemplates = availableTemplates.filter(t => !builtNames.has(t.name));
  if (effectFilter !== 'all') filteredTemplates = filteredTemplates.filter(t => t.effectType === effectFilter);

  // 已完工屏蔽项（已建但未在上述filteredTemplates中）
  const builtTemplates = availableTemplates.filter(t => builtNames.has(t.name));

  // 在建项目按剩余天数排序（最快完工在前）
  const sortedBuilding = [...buildingProjects].sort((a, b) => a.finishDay - b.finishDay);

  // 效益汇总
  const effectSummary: Record<string, number> = { gdp: 0, livelihood: 0, ecology: 0, business: 0 };
  completedProjects.forEach(p => { effectSummary[p.effectType] = (effectSummary[p.effectType] ?? 0) + p.effectValue; });
  const totalFundInvested = completedProjects.reduce((s, p) => s + (p.costFund ?? 0), 0);
  const totalMeritRewarded = completedProjects.reduce((s, p) => s + (p.meritReward ?? 0), 0);

  const buildGroupLabel =
    rankLevel <= 3  ? '乡镇建设项目' :
    rankLevel <= 6  ? '县级重点工程' :
    rankLevel <= 11 ? '市级重大项目' : '省级基础设施工程';

  // 财政余额直接从 save.fundBalance 读取（player_saves 是月度结算的唯一权威来源）
  const fundBalanceWan = save?.fundBalance ?? 0;

  return (
    <View style={{ flex: 1, backgroundColor: '#F5F4F1' }}>
      <StatusBar style="light" backgroundColor="#1D2D44" />

      {/* 顶栏 */}
      <View style={{ backgroundColor: '#1D2D44', paddingTop: insets.top + 8, paddingBottom: 14, paddingHorizontal: 16 }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 8 }}>
          <Pressable onPress={() => router.back()} style={{ marginRight: 12 }}>
            <Text style={{ color: '#ccc', fontSize: 22 }}>‹</Text>
          </Pressable>
          <View style={{ flex: 1 }}>
            <Text style={{ color: '#a0b4cc', fontSize: 10, letterSpacing: 2 }}>CONSTRUCTION</Text>
            <Text style={{ color: '#fff', fontSize: 16, fontWeight: '700', letterSpacing: 1 }}>城市建设</Text>
          </View>
          <View style={{ alignItems: 'flex-end' }}>
            <Text style={{ color: '#a0b4cc', fontSize: 10 }}>财政余额</Text>
            <Text style={{ color: fundBalanceWan >= 100 ? '#81c784' : '#ef9a9a', fontSize: 13, fontWeight: '700' }}>
              {formatFund(fundBalanceWan)}
            </Text>
          </View>
        </View>
        {/* 进度摘要 */}
        <View style={{ flexDirection: 'row', gap: 14 }}>
          <Text style={{ color: '#a0b4cc', fontSize: 11 }}>
            在建 <Text style={{ color: '#fff', fontWeight: '700' }}>{buildingProjects.length}</Text> 个
          </Text>
          <Text style={{ color: '#a0b4cc', fontSize: 11 }}>
            已竣工 <Text style={{ color: '#81c784', fontWeight: '700' }}>{completedProjects.length}</Text>/{availableTemplates.length}
          </Text>
          <Text style={{ color: '#a0b4cc', fontSize: 11 }}>
            待规划 <Text style={{ color: '#fff', fontWeight: '700' }}>{filteredTemplates.length}</Text> 个
          </Text>
        </View>
      </View>

      {/* 反馈条 */}
      {feedback ? (
        <View style={{ backgroundColor: feedbackOk ? '#e8f5e9' : '#ffebee', borderBottomWidth: 1, borderBottomColor: feedbackOk ? '#c8e6c9' : '#ffcdd2', padding: 10 }}>
          <Text style={{ color: feedbackOk ? '#2a7a3b' : '#C82829', fontSize: 12, fontWeight: '600' }}>{feedback}</Text>
        </View>
      ) : null}

      <ScrollView contentContainerStyle={{ padding: 14, gap: 12 }} showsVerticalScrollIndicator={false}>

        {/* ── 累计效益汇总 ── */}
        {completedProjects.length > 0 && (
          <View style={{ backgroundColor: '#1D2D44', padding: 14 }}>
            <Text style={{ color: '#a0b4cc', fontSize: 10, letterSpacing: 2, marginBottom: 10 }}>已竣工项目累计效益</Text>
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 10 }}>
              {Object.entries(effectSummary).filter(([, v]) => v > 0).map(([k, v]) => (
                <View key={k} style={{ backgroundColor: 'rgba(255,255,255,0.1)', paddingHorizontal: 14, paddingVertical: 8, alignItems: 'center', minWidth: 72 }}>
                  <Text style={{ color: '#fff', fontSize: 18, fontWeight: '700', fontVariant: ['tabular-nums'] }}>+{v}</Text>
                  <Text style={{ color: '#a0b4cc', fontSize: 9, marginTop: 2 }}>{EFFECT_LABEL[k]}</Text>
                </View>
              ))}
            </View>
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 12 }}>
              <Text style={{ color: '#a0b4cc', fontSize: 10 }}>总投入：<Text style={{ color: '#ef9a9a', fontWeight: '700' }}>{totalFundInvested >= 10000 ? `${(totalFundInvested / 10000).toFixed(1)}亿` : `${totalFundInvested}万`} 元</Text></Text>
              <Text style={{ color: '#a0b4cc', fontSize: 10 }}>竣工奖励：<Text style={{ color: '#81c784', fontWeight: '700' }}>+{totalMeritRewarded} 政绩</Text></Text>
            </View>
          </View>
        )}

        {/* ── 在建项目 ── */}
        {sortedBuilding.length > 0 && (
          <View>
            <Text style={{ fontSize: 11, color: '#1D2D44', fontWeight: '700', letterSpacing: 2, marginBottom: 8 }}>
              在建项目（{buildingProjects.length}）
            </Text>
            {sortedBuilding.map(p => (
              <BuildingCard key={p.id} proj={p} gameDays={save?.gameDays ?? 0} />
            ))}
          </View>
        )}

        {/* ── 可规划项目 ── */}
        {rankLevel >= 2 && (
          <View>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
              <Text style={{ fontSize: 11, color: '#1D2D44', fontWeight: '700', letterSpacing: 2 }}>
                {buildGroupLabel}
              </Text>
              <Text style={{ fontSize: 10, color: '#888' }}>
                {filteredTemplates.length} 个可建
              </Text>
            </View>

            {/* 效益类型筛选条 */}
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 12 }}>
              <View style={{ flexDirection: 'row', gap: 6 }}>
                {FILTER_OPTIONS.map(opt => (
                  <Pressable
                    key={opt.key}
                    onPress={() => setEffectFilter(opt.key)}
                    style={{
                      paddingHorizontal: 12, paddingVertical: 6,
                      backgroundColor: effectFilter === opt.key ? '#1D2D44' : '#fff',
                      borderWidth: 1, borderColor: effectFilter === opt.key ? '#1D2D44' : '#D1D1D1',
                    }}
                  >
                    <Text style={{ fontSize: 11, color: effectFilter === opt.key ? '#fff' : '#555', fontWeight: effectFilter === opt.key ? '700' : '400' }}>
                      {opt.label}
                    </Text>
                  </Pressable>
                ))}
              </View>
            </ScrollView>

            {/* 资金不足提示 */}
            {fundBalanceWan < 10 && (
              <View style={{ backgroundColor: '#fff8ee', borderWidth: 1, borderColor: '#F0C050', padding: 10, marginBottom: 10 }}>
                <Text style={{ fontSize: 11, color: '#7A5C00' }}>
                  ⚠ 财政余额偏低，建议通过招商引资、贷款融资等渠道补充城市建设资金
                </Text>
              </View>
            )}

            {filteredTemplates.length === 0 && builtTemplates.length === 0 ? (
              <View style={{ backgroundColor: '#EEF2F7', borderWidth: 1, borderColor: '#D0DCE8', padding: 14, alignItems: 'center' }}>
                <Text style={{ fontSize: 12, color: '#1D2D44' }}>
                  {effectFilter !== 'all' ? `暂无可建的${EFFECT_LABEL[effectFilter]}类项目` : '所有项目均已开工或竣工'}
                </Text>
              </View>
            ) : (
              <>
                {filteredTemplates.map(tpl => (
                  <ProjectCard
                    key={tpl.name}
                    tpl={tpl}
                    onBuild={handleBuild}
                    canAfford={fundBalanceWan >= tpl.costFund}
                    loading={buildingTpl === tpl.name}
                    alreadyBuilt={false}
                  />
                ))}
                {/* 已完工项目（灰化展示，仍在列表末尾） */}
                {builtTemplates
                  .filter(t => effectFilter === 'all' || t.effectType === effectFilter)
                  .map(tpl => (
                    <ProjectCard
                      key={tpl.name}
                      tpl={tpl}
                      onBuild={handleBuild}
                      canAfford={false}
                      loading={false}
                      alreadyBuilt
                    />
                  ))}
              </>
            )}
          </View>
        )}

        {rankLevel < 2 && (
          <View style={{ backgroundColor: '#FFF9E6', borderWidth: 1, borderColor: '#F0C050', padding: 14, alignItems: 'center' }}>
            <Text style={{ fontSize: 13, color: '#7A5C00', fontWeight: '600', marginBottom: 4 }}>功能尚未解锁</Text>
            <Text style={{ fontSize: 11, color: '#888', textAlign: 'center' }}>晋升至副乡镇长（2级）后即可开启城市建设功能</Text>
          </View>
        )}

        {/* ── 已竣工项目历史 ── */}
        {completedProjects.length > 0 && (
          <View>
            <Pressable
              onPress={() => setShowCompleted(v => !v)}
              style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: showCompleted ? 8 : 0 }}
            >
              <Text style={{ fontSize: 11, color: '#888', fontWeight: '700', letterSpacing: 2 }}>
                已竣工项目（{completedProjects.length}）
              </Text>
              <Text style={{ fontSize: 11, color: '#2B4B6F', fontWeight: '600' }}>
                {showCompleted ? '收起 ▲' : '展开 ▼'}
              </Text>
            </Pressable>
            {showCompleted && completedProjects.map(p => <CompletedCard key={p.id} proj={p} />)}
          </View>
        )}

        {/* ── 建设说明 ── */}
        <View style={{ backgroundColor: '#EEF2F7', borderWidth: 1, borderColor: '#D0DCE8', padding: 12 }}>
          <Text style={{ fontSize: 10, color: '#2B4B6F', fontWeight: '700', marginBottom: 6, letterSpacing: 1 }}>建设规则说明</Text>
          <Text style={{ fontSize: 10, color: '#555', lineHeight: 17 }}>
            · 每个项目全局唯一，竣工后不可重复建设{'\n'}
            · 建设消耗城市财政资金，不消耗政绩值{'\n'}
            · 竣工奖励政绩值，同时永久提升城市指数{'\n'}
            · 在建数量无限制，可同时推进多个项目{'\n'}
            · 建设指数提升在竣工时一次性生效
          </Text>
        </View>

        <View style={{ height: 20 }} />
      </ScrollView>
    </View>
  );
}
