// 官职体系查阅页 — 县级 / 市级 / 省级 / 副省级城市 / 国家级
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { useRouter } from 'expo-router';
import { useState, useCallback } from 'react';
import {
  View, Text, Pressable, ScrollView,
} from 'react-native';
import {
  COUNTY_OFFICIAL_POSITIONS,
  CITY_OFFICIAL_POSITIONS,
  PROVINCE_OFFICIAL_POSITIONS,
  SUB_PROVINCE_CITY_POSITIONS,
  NATIONAL_ORGAN_ORDER,
  NATIONAL_TIER_COLOR,
  NATIONAL_TIER_LABEL,
  getNationalByOrgan,
  type CountyPosition,
  type CityPosition,
  type ProvincePosition,
  type SubProvincePosition,
  type NationalPosition,
  type NationalOrgan,
} from '@/types/game';

// ── 类型联合 ──────────────────────────────────────────────────
type AnyPosition =
  | (CountyPosition & { _level: 'county' })
  | (CityPosition & { _level: 'city' })
  | (ProvincePosition & { _level: 'province' })
  | (SubProvincePosition & { _level: 'sub' });

// ── Tab 配置 ──────────────────────────────────────────────────
type TabKey = 'county' | 'city' | 'province' | 'sub' | 'national';
const TABS: { key: TabKey; label: string; subtitle: string }[] = [
  { key: 'county',   label: '县级',   subtitle: '正处／副处／正科' },
  { key: 'city',     label: '市级',   subtitle: '正厅／副厅／正处' },
  { key: 'province', label: '省级',   subtitle: '正部／副部／正厅' },
  { key: 'sub',      label: '副省级', subtitle: '副部／正厅／副厅' },
  { key: 'national', label: '国家级', subtitle: '常委/政治局/国政院' },
];

// ── 级别色系 ─────────────────────────────────────────────────
const TIER_COLOR: Record<string, string> = {
  // 县级
  '正处级': '#C82829',
  '副处级': '#A04020',
  '正科级': '#2B4B6F',
  '副科级': '#5A7A9F',
  // 市级
  '正厅级': '#7B0E0E',
  '副厅级': '#C82829',
  // 省级
  '正部级': '#4A0000',
  '副部级': '#7B0E0E',
  // 副省级城市
  '副部级_spc': '#7B0E0E',
};

function getTierColor(tier: string): string {
  return TIER_COLOR[tier] ?? '#2B4B6F';
}

// ── 器官(所属机关)背景色 ──────────────────────────────────────
const ORGAN_BG: Record<string, string> = {
  // 县级
  县委: '#F0EAE0', 县政府: '#EAF0F8', 县议政院: '#F8F0EA', 县参政院: '#EAF8F0',
  县纪委: '#F8EAEA', 政法: '#F5F0E8', 职能局: '#EDF5F8', 乡镇: '#F0F8ED',
  团委: '#FFF5E6', 人武部: '#EEF0E8',
  // 市级
  市委: '#F0EAE0', 市政府: '#EAF0F8', 市议政院: '#F8F0EA', 市参政院: '#EAF8F0',
  市纪委: '#F8EAEA', 市直属局: '#EDF5F8', '区（县）': '#F0F8ED',
  军分区: '#E8EDE8', 市武警: '#ECEDE8',
  // 省级
  省委: '#F0EAE0', 省政府: '#EAF0F8', 省议政院: '#F8F0EA', 省参政院: '#EAF8F0',
  省纪委: '#F8EAEA', 省直属厅: '#EDF5F8', 地市: '#F0F8ED',
  省军区: '#E8EDE8', 武警: '#ECEDE8',
  // 副省级城市
  区委: '#F0EAE0', 区政府: '#EAF0F8', 街道: '#F5F5E8', 市直属局副省: '#EDF5F8',
};

// ── 行项组件 ─────────────────────────────────────────────────
interface PositionRowProps {
  title: string;
  tier: string;
  organ: string;
  desc: string;
  isHighProfile?: boolean;
  highProfileNote?: string;
}
function PositionRow({ title, tier, organ, desc, isHighProfile, highProfileNote }: PositionRowProps) {
  const [open, setOpen] = useState(false);
  const tierColor = getTierColor(tier);
  const organBg = ORGAN_BG[organ] ?? '#F5F4F1';

  return (
    <Pressable
      onPress={() => setOpen(v => !v)}
      style={{ borderBottomWidth: 1, borderBottomColor: '#E8E5DC' }}
    >
      <View style={{ flexDirection: 'row', alignItems: 'center', paddingVertical: 9, paddingHorizontal: 12, gap: 8 }}>
        {/* 级别色标 */}
        <View style={{ width: 4, height: 36, backgroundColor: tierColor }} />
        {/* 主内容 */}
        <View style={{ flex: 1, gap: 3 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
            <Text style={{ fontSize: 13, fontWeight: '700', color: '#1A1A1A', letterSpacing: 0.3 }}>{title}</Text>
            {isHighProfile && (
              <View style={{ backgroundColor: '#FFF3CD', borderWidth: 1, borderColor: '#F0C050', paddingHorizontal: 5, paddingVertical: 1 }}>
                <Text style={{ fontSize: 9, color: '#7A5C00', fontWeight: '700' }}>⭐高配</Text>
              </View>
            )}
          </View>
          <View style={{ flexDirection: 'row', gap: 6, alignItems: 'center' }}>
            <View style={{ backgroundColor: tierColor, paddingHorizontal: 5, paddingVertical: 1 }}>
              <Text style={{ fontSize: 9, color: '#fff', fontWeight: '700' }}>{tier}</Text>
            </View>
            <View style={{ backgroundColor: organBg, borderWidth: 1, borderColor: tierColor + '44', paddingHorizontal: 5, paddingVertical: 1 }}>
              <Text style={{ fontSize: 9, color: tierColor }}>{organ}</Text>
            </View>
          </View>
        </View>
        {/* 展开箭头 */}
        <Text style={{ color: '#999', fontSize: 14 }}>{open ? '▲' : '▼'}</Text>
      </View>

      {/* 展开内容 */}
      {open && (
        <View style={{ backgroundColor: '#FAFAF7', borderTopWidth: 1, borderTopColor: '#E8E5DC', paddingHorizontal: 16, paddingVertical: 8, gap: 4 }}>
          <Text style={{ fontSize: 12, color: '#444', lineHeight: 18 }}>{desc}</Text>
          {isHighProfile && highProfileNote && (
            <View style={{ flexDirection: 'row', alignItems: 'flex-start', gap: 4, marginTop: 4, backgroundColor: '#FFF9E6', borderWidth: 1, borderColor: '#F0C050', padding: 7 }}>
              <Text style={{ fontSize: 9, color: '#7A5C00', fontWeight: '700', marginTop: 1 }}>高配说明：</Text>
              <Text style={{ fontSize: 11, color: '#7A5C00', flex: 1, lineHeight: 16 }}>{highProfileNote}</Text>
            </View>
          )}
        </View>
      )}
    </Pressable>
  );
}

// ── 分区标题 ─────────────────────────────────────────────────
function SectionHeader({ tier, color }: { tier: string; color: string }) {
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', backgroundColor: color + '18', borderLeftWidth: 4, borderLeftColor: color, paddingHorizontal: 12, paddingVertical: 6 }}>
      <Text style={{ fontSize: 11, fontWeight: '700', color, letterSpacing: 1.5 }}>— {tier} —</Text>
    </View>
  );
}

// ── 国家级：机构标题 ──────────────────────────────────────────
const NATIONAL_ORGAN_STYLE: Record<NationalOrgan, { bg: string; accent: string; icon: string }> = {
  '中枢决策常委会':       { bg: '#1C0808', accent: '#E05050', icon: '★' },
  '中枢政治局':             { bg: '#1A0A18', accent: '#C060A0', icon: '🏛️' },
  '中枢书记处':             { bg: '#150D20', accent: '#9070D0', icon: '📋' },
  '中枢纪律督察委员会':     { bg: '#12101C', accent: '#7080C0', icon: '⚖️' },
  '全国议政院常委会': { bg: '#0D1610', accent: '#508060', icon: '📜' },
  '华夏参政院':   { bg: '#101610', accent: '#608050', icon: '🤝' },
  '中枢军事委员会':         { bg: '#0D1018', accent: '#506080', icon: '🎖️' },
  '国政院':                 { bg: '#0D1520', accent: '#4A8AAA', icon: '🏢' },
  '中枢宣传部':             { bg: '#1A1008', accent: '#D08030', icon: '📢' },
  '中枢统战部':             { bg: '#0E1818', accent: '#40A080', icon: '🤝' },
  '中央政法委':             { bg: '#140C10', accent: '#A04060', icon: '🚔' },
  '中枢社会工作部':         { bg: '#0E1014', accent: '#4880A0', icon: '🏘️' },
  '中央党校':               { bg: '#141008', accent: '#A08030', icon: '🏫' },
  '中央网信委办公室':       { bg: '#0C1418', accent: '#3090B0', icon: '🌐' },
  '青年联合总团':             { bg: '#12100A', accent: '#B0802A', icon: '◆' },
};

function NationalOrganHeader({ organ }: { organ: NationalOrgan }) {
  const s = NATIONAL_ORGAN_STYLE[organ];
  return (
    <View style={{ backgroundColor: s.bg, borderLeftWidth: 4, borderLeftColor: s.accent, paddingHorizontal: 14, paddingVertical: 10, marginTop: 2 }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
        <Text style={{ fontSize: 14 }}>{s.icon}</Text>
        <Text style={{ fontSize: 13, fontWeight: '800', color: s.accent, letterSpacing: 1.5 }}>{organ}</Text>
      </View>
    </View>
  );
}

// ── 国家级：职位行 ────────────────────────────────────────────
function NationalPositionRow({ pos }: { pos: NationalPosition }) {
  const [open, setOpen] = useState(false);
  const tierColor = NATIONAL_TIER_COLOR[pos.tier];
  const tierLabel = NATIONAL_TIER_LABEL[pos.tier];
  const organStyle = NATIONAL_ORGAN_STYLE[pos.organ];

  return (
    <Pressable
      onPress={() => setOpen(v => !v)}
      style={{ borderBottomWidth: 1, borderBottomColor: organStyle.bg + 'CC' }}
    >
      <View style={{ flexDirection: 'row', alignItems: 'center', paddingVertical: 10, paddingHorizontal: 12, gap: 8, backgroundColor: '#141414' }}>
        {/* 层级色标 */}
        <View style={{ width: 4, height: 38, backgroundColor: tierColor }} />
        {/* 主内容 */}
        <View style={{ flex: 1, gap: 4 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
            <Text style={{ fontSize: 13, fontWeight: '700', color: '#F0E8D8', letterSpacing: 0.3 }}>{pos.title}</Text>
            {pos.isPSC && (
              <View style={{ backgroundColor: '#8B0000', paddingHorizontal: 5, paddingVertical: 1 }}>
                <Text style={{ fontSize: 9, color: '#FFD0A0', fontWeight: '700' }}>★ 常委</Text>
              </View>
            )}
          </View>
          <View style={{ flexDirection: 'row', gap: 5, alignItems: 'center' }}>
            <View style={{ backgroundColor: tierColor + 'CC', paddingHorizontal: 5, paddingVertical: 1 }}>
              <Text style={{ fontSize: 9, color: '#fff', fontWeight: '700' }}>{tierLabel}</Text>
            </View>
          </View>
        </View>
        <Text style={{ color: '#556', fontSize: 13 }}>{open ? '▲' : '▼'}</Text>
      </View>

      {/* 展开内容 */}
      {open && (
        <View style={{ backgroundColor: '#1A1A1A', borderTopWidth: 1, borderTopColor: '#2A2A2A', paddingHorizontal: 16, paddingVertical: 10, gap: 6 }}>
          <Text style={{ fontSize: 12, color: '#C8C0B0', lineHeight: 18 }}>{pos.desc}</Text>
          {pos.concurrentNote && (
            <View style={{ flexDirection: 'row', alignItems: 'flex-start', gap: 4, backgroundColor: organStyle.bg, borderWidth: 1, borderColor: organStyle.accent + '55', padding: 8, marginTop: 2 }}>
              <Text style={{ fontSize: 9, color: organStyle.accent, fontWeight: '700', marginTop: 1 }}>兼任说明：</Text>
              <Text style={{ fontSize: 11, color: organStyle.accent + 'DD', flex: 1, lineHeight: 16 }}>{pos.concurrentNote}</Text>
            </View>
          )}
        </View>
      )}
    </Pressable>
  );
}

// ── 渲染列表 ─────────────────────────────────────────────────
function buildCounty(): AnyPosition[] {
  return COUNTY_OFFICIAL_POSITIONS.map(p => ({ ...p, _level: 'county' as const }));
}
function buildCity(): AnyPosition[] {
  return CITY_OFFICIAL_POSITIONS.map(p => ({ ...p, _level: 'city' as const }));
}
function buildProvince(): AnyPosition[] {
  return PROVINCE_OFFICIAL_POSITIONS.map(p => ({ ...p, _level: 'province' as const }));
}
function buildSub(): AnyPosition[] {
  return SUB_PROVINCE_CITY_POSITIONS.map(p => ({ ...p, _level: 'sub' as const }));
}

// 不同级别的分区顺序
const COUNTY_TIERS   = ['正处级', '副处级', '正科级', '副科级'];
const CITY_TIERS     = ['正厅级', '副厅级', '正处级', '副处级'];
const PROVINCE_TIERS = ['正部级', '副部级', '正厅级', '副厅级'];
const SUB_TIERS      = ['副部级', '正厅级', '副厅级', '正处级'];

function getTierOrder(tab: TabKey): string[] {
  if (tab === 'county')   return COUNTY_TIERS;
  if (tab === 'city')     return CITY_TIERS;
  if (tab === 'province') return PROVINCE_TIERS;
  return SUB_TIERS;
}

function getData(tab: TabKey): AnyPosition[] {
  if (tab === 'county')   return buildCounty();
  if (tab === 'city')     return buildCity();
  if (tab === 'province') return buildProvince();
  if (tab === 'national') return [];
  return buildSub();
}

// ── 主页 ─────────────────────────────────────────────────────
export default function OfficialHierarchyScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<TabKey>('county');

  const data = getData(activeTab);
  const tiers = getTierOrder(activeTab);

  // 普通 tab 渲染（按级别分组）
  const renderContent = useCallback(() => {
    if (activeTab === 'national') return null;
    return tiers.map(tier => {
      const items = data.filter(p => p.tier === tier);
      if (items.length === 0) return null;
      return (
        <View key={tier}>
          <SectionHeader tier={tier} color={getTierColor(tier)} />
          {items.map(item => (
            <PositionRow
              key={item.key}
              title={item.title}
              tier={item.tier}
              organ={item.organ}
              desc={item.desc}
              isHighProfile={item.isHighProfile}
              highProfileNote={item.highProfileNote}
            />
          ))}
        </View>
      );
    });
  }, [activeTab, data, tiers]);

  // 国家级 tab 渲染（按机构分组，深色主题）
  const renderNational = useCallback(() => {
    if (activeTab !== 'national') return null;
    return NATIONAL_ORGAN_ORDER.map(organ => {
      const positions = getNationalByOrgan(organ as NationalOrgan);
      if (positions.length === 0) return null;
      return (
        <View key={organ}>
          <NationalOrganHeader organ={organ as NationalOrgan} />
          {positions.map(pos => (
            <NationalPositionRow key={pos.key} pos={pos} />
          ))}
        </View>
      );
    });
  }, [activeTab]);

  const isNational = activeTab === 'national';
  const currentTab = TABS.find(t => t.key === activeTab)!;
  const highProfileCount = isNational ? 7 : data.filter(p => p.isHighProfile).length;
  const leagueCount = isNational ? 0 : data.filter(p => p.organ === '团委').length;
  const totalCount = isNational
    ? NATIONAL_ORGAN_ORDER.reduce((n, o) => n + getNationalByOrgan(o as NationalOrgan).length, 0)
    : data.length;

  return (
    <View style={{ flex: 1, backgroundColor: isNational ? '#0D0D0D' : '#F5F4F1' }}>
      <StatusBar style="light" backgroundColor={isNational ? '#100808' : '#1D3B5E'} />

      {/* 顶栏 */}
      <View style={{ backgroundColor: isNational ? '#140A0A' : '#2B4B6F', paddingTop: insets.top + 8, paddingBottom: 12, paddingHorizontal: 16 }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 10 }}>
          <Pressable onPress={() => router.back()}>
            <Text style={{ color: isNational ? '#AA6666' : '#a0b4cc', fontSize: 22 }}>‹</Text>
          </Pressable>
          <View style={{ flex: 1 }}>
            <Text style={{ color: isNational ? '#AA6666' : '#a0b4cc', fontSize: 10, letterSpacing: 1 }}>人事制度 · 职位体系</Text>
            <Text style={{ color: '#fff', fontSize: 16, fontWeight: '700', letterSpacing: 1 }}>官职体系</Text>
          </View>
          <View style={{ alignItems: 'flex-end', gap: 2 }}>
            <Text style={{ color: isNational ? '#AA6666' : '#a0b4cc', fontSize: 10 }}>{currentTab.label} · {totalCount}个职位</Text>
            {isNational && (
              <Text style={{ color: '#E08060', fontSize: 10 }}>
                ★ 7名政治局常委 · 9大机构
              </Text>
            )}
            {!isNational && highProfileCount > 0 && (
              <Text style={{ color: '#F0C050', fontSize: 10 }}>
                ⭐ {highProfileCount}个高配{leagueCount > 0 ? ` · ◆ ${leagueCount}个团委` : ''}
              </Text>
            )}
          </View>
        </View>

        {/* Tab栏 */}
        <View style={{ flexDirection: 'row', gap: 0 }}>
          {TABS.map(tab => {
            const isActive = activeTab === tab.key;
            const isNatTab = tab.key === 'national';
            return (
              <Pressable
                key={tab.key}
                onPress={() => setActiveTab(tab.key)}
                style={{
                  flex: 1, alignItems: 'center', paddingVertical: 7,
                  backgroundColor: isActive
                    ? (isNatTab ? '#8B0000' : '#C82829')
                    : 'rgba(255,255,255,0.08)',
                  borderWidth: 1,
                  borderColor: isActive
                    ? (isNatTab ? '#8B0000' : '#C82829')
                    : 'rgba(255,255,255,0.15)',
                  marginHorizontal: 2,
                }}
              >
                <Text style={{ fontSize: 11, color: '#fff', fontWeight: isActive ? '700' : '400' }}>{tab.label}</Text>
                <Text style={{ fontSize: 8, color: isActive ? (isNatTab ? '#FFB090' : '#FFD0A0') : '#a0b4cc', marginTop: 1 }}>{tab.subtitle}</Text>
              </Pressable>
            );
          })}
        </View>
      </View>

      {/* 说明条 */}
      {!isNational && (
        <View style={{ backgroundColor: '#FFF9E6', borderBottomWidth: 1, borderBottomColor: '#F0C050', paddingHorizontal: 14, paddingVertical: 8 }}>
          <Text style={{ fontSize: 11, color: '#7A5C00', lineHeight: 16 }}>
            点击职位可展开详细说明。⭐高配职位为非常规升格安排，实际级别高于标注等级。<Text style={{ color: '#B07000', fontWeight: '700' }}>◆团委</Text> 职位为团派路线专属通道。
          </Text>
        </View>
      )}
      {isNational && (
        <View style={{ backgroundColor: '#1C0A0A', borderBottomWidth: 1, borderBottomColor: '#8B0000', paddingHorizontal: 14, paddingVertical: 8 }}>
          <Text style={{ fontSize: 11, color: '#CC8060', lineHeight: 16 }}>
            ★ 点击职位可展开职权说明。政治局常委会7名常委为最高决策核心；国政院统筹国家行政；青年联合总团为团派路线核心晋升通道。
          </Text>
        </View>
      )}

      {/* 退休年龄规则说明条 */}
      {!isNational && (
        <View style={{ backgroundColor: '#F0EEF8', borderBottomWidth: 1, borderBottomColor: '#C0B0E0', paddingHorizontal: 14, paddingVertical: 8 }}>
          {activeTab === 'county' && (
            <Text style={{ fontSize: 11, color: '#3A2A6A', lineHeight: 17 }}>
              🕐 <Text style={{ fontWeight: '700' }}>退休规则：</Text>
              科员至正处级（rank 1–6），基准退休年龄均为 <Text style={{ fontWeight: '700' }}>90岁</Text>，经批准可延迟最长 <Text style={{ fontWeight: '700' }}>5年</Text>（最晚95岁）。
              团委书记为团派路线起点，届满可平级转任乡镇或县委系统实职。
            </Text>
          )}
          {activeTab === 'city' && (
            <Text style={{ fontSize: 11, color: '#3A2A6A', lineHeight: 17 }}>
              🕐 <Text style={{ fontWeight: '700' }}>退休规则：</Text>
              副厅级（rank 7–8）、正厅级（rank 7–8正职）基准退休年龄 <Text style={{ fontWeight: '700' }}>90岁</Text>，经批准可延迟最长 <Text style={{ fontWeight: '700' }}>5年</Text>（最晚95岁）；
              副部级（rank 9–10）基准 <Text style={{ fontWeight: '700' }}>90岁</Text>，经批准可延迟最长 <Text style={{ fontWeight: '700' }}>5年</Text>（最晚95岁）。
              团市委书记届满后多转任政府实职副厅级岗位。
            </Text>
          )}
          {activeTab === 'province' && (
            <Text style={{ fontSize: 11, color: '#3A2A6A', lineHeight: 17 }}>
              🕐 <Text style={{ fontWeight: '700' }}>退休规则：</Text>
              正部级（rank 11–12）基准 <Text style={{ fontWeight: '700' }}>90岁</Text>，经批准可延迟最长 <Text style={{ fontWeight: '700' }}>5年</Text>（最晚95岁）；
              副国家级（rank 13）基准 <Text style={{ fontWeight: '700' }}>90岁</Text>，最多延迟5年（最晚95岁）；
              正国家级（rank 14–15）<Text style={{ fontWeight: '700' }}>不设强制退休年龄</Text>，90岁可自主退休。
              团省委书记（省委常委兼任）届满后多转任副省长，是团派路线进入副部级实职的核心通道。
            </Text>
          )}
          {activeTab === 'sub' && (
            <Text style={{ fontSize: 11, color: '#3A2A6A', lineHeight: 17 }}>
              🕐 <Text style={{ fontWeight: '700' }}>退休规则：</Text>
              副省级城市正职为副部级（rank 9–10），基准退休年龄 <Text style={{ fontWeight: '700' }}>90岁</Text>，
              经组织批准可延迟最长 <Text style={{ fontWeight: '700' }}>5年</Text>（最晚95岁）。
            </Text>
          )}
        </View>
      )}
      {isNational && (
        <View style={{ backgroundColor: '#120808', borderBottomWidth: 1, borderBottomColor: '#3A1818', paddingHorizontal: 14, paddingVertical: 8 }}>
          <Text style={{ fontSize: 11, color: '#906060', lineHeight: 17 }}>
            🕐 <Text style={{ fontWeight: '700', color: '#C08060' }}>退休规则：</Text>
            正国家级（rank 14–15）<Text style={{ fontWeight: '700', color: '#E09060' }}>不设强制退休年龄</Text>，90周岁时可自主选择退休。每届任期5年，届满后经全国执政党代表大会/议政院投票决定是否续任；国政院院理依宪法连任不超过两届，总执书记·华夏主席任期由党代会决定，无届次上限。
          </Text>
        </View>
      )}

      {/* 内容区 */}
      <ScrollView
        contentContainerStyle={{ paddingBottom: 40 }}
        contentInsetAdjustmentBehavior="automatic"
        showsVerticalScrollIndicator={false}
        style={{ backgroundColor: isNational ? '#0D0D0D' : '#F5F4F1' }}
      >
        {renderContent()}
        {renderNational()}
      </ScrollView>
    </View>
  );
}
