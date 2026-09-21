# 青云路·干部晋升模拟 — 晋升系统全面改革规划

**版本**：v2.1
**日期**：2026-09-20
**文档性质**：实施蓝图（可直接指导开发）

---

## 一、现状诊断

### 1.1 系统架构现状

晋升系统由四层构成：

| 层级 | 文件 | 职责 | 问题 |
|------|------|------|------|
| **配置层** | `src/lib/promotionConfig.ts` (202行) | 常量定义：职级段、适龄区间、民心门槛、考评加速、破格规则、冻结规则 | 加速率刚修复但仍有优化空间；年龄红利固定值缺乏动态感 |
| **引擎层** | `src/lib/promotionEngine.ts` (374行) | 硬门槛检查、竞争评分、破格判定、政治生态结算、洗白/协调概率 | 政治生态事件刚恢复但触发频率和后果偏轻；竞争评分公式单一 |
| **调度层** | `src/ctx/GameContext.tsx` (1171行) | 月度/年度结算、存档管理、时间推进、事件触发 | 月度结算12+ RPC串行调用，性能瓶颈；硬编码晋升逻辑残留 |
| **表现层** | `src/app/(app)/promotion.tsx` (660行) | 晋升页UI：派系攻夺战/个人争夺战/晋升条件/晋升记录四Tab | 信息密度过高、视觉层级混乱、缺乏进度可视化 |

### 1.2 核心数值现状

**职级体系（15级）**：

| 职级段 | Rank | 任期要求 | 政绩门槛 | 月薪(元) | 初始财政(万元) |
|--------|------|---------|----------|---------|--------------|
| 基层 | 1-3 | 2-3年 | 70-360 | 5500-9000 | 30-80 |
| 县级 | 4-6 | 3年 | 550-1010 | 13000-20000 | 500-1200 |
| 市级 | 7-9 | 4年 | 1275-1860 | 26000-38000 | 5000-15000 |
| 省级 | 10-11 | 5年 | 2180-2515 | 50000-65000 | 80000-120000 |
| 高层 | 12-15 | 5年 | 2860-4000 | 80000-150000 | 500000-10000000 |

**晋升加速率（已修复）**：
```
ASSESS_ACCEL = { excellent: 0.30, excellent2: 0.40, special: 0.45, special2: 0.50 }
// 单次优秀减免30%、连续优秀减免40%、特等减免45%、连续特等减免50%
```

**政治生态事件（刚恢复）**：
- 功高盖主：民心≥90且连续2年优秀 → 上司好感每月-2
- 非正式关系密切：某位上司好感≥85 → 冻结晋升180天，功绩-200，民心-10
- 领导阻挠：某位上司好感<40 → 竞争评分-50分
- 越级赏识：功绩≥1.2倍要求且民心≥80 → 5%概率触发庇护（功绩+80，365天有效期）

### 1.3 已识别的结构性缺陷

1. **晋升体验仍拖沓**：基层晋升平均需 400-600 游戏天（约现实40-60分钟），玩家流失率高
2. **政治生态事件后果过轻**：功高盖主仅每月-2好感，缺乏戏剧张力；冻结180天可轻易绕过
3. **竞争评分公式单一**：仅依赖四项指标加权，无随机性、无黑马事件
4. **破格通道形同虚设**：成功率 5%，消耗全部政绩，玩家几乎不使用
5. **派系系统与晋升耦合浅**：派系斗争仅影响席位战，对个人晋升几乎无直接影响
6. **晋升页信息过载**：四项Tab + 职位列表 + 争夺面板 + 破格/调任按钮，新手困惑
7. **缺乏晋升叙事感**：从乡镇科员到国家领导人，全程缺乏里程碑事件和仪式感

---

## 二、改革目标

### 2.1 总体目标

将晋升系统从"数值门槛闯关"升级为"政治生涯叙事体验"，让玩家感受到：
- **成长感**：每一步晋升都有明确的阶段性成果
- **紧张感**：政治生态事件带来真实的挑战和抉择
- **策略感**：派系选择、上司经营、破格时机都需要深思熟虑
- **仪式感**：晋升节点有隆重的仪式和叙事包装

### 2.2 量化目标

| 指标 | 现状 | 目标 | 验证方式 |
|------|------|------|---------|
| 基层晋升周期 | 400-600天 | 200-300天 | 日志统计 |
| 政治生态事件触发率 | ~8%/月 | ~15%/月 | 事件计数 |
| 破格使用率 | <2% | 15-20% | 使用统计 |
| 晋升页停留时长 | 15秒 | 45秒 | 热力图 |
| 玩家流失率（晋升阶段） | 35% | <20% | 留存分析 |

---

## 三、七大改革维度

---

### 改革一：晋升加速机制优化（P0）

**现状**：刚修复为中等加速（30-50%），但基层仍拖沓

**改革方案**：

```typescript
// promotionConfig.ts 修改

// 1. 分层加速：基层加速更强，高层保留挑战
export const ASSESS_ACCEL_V2 = {
  // tier 1: 基层（rank 1-3）
  t1_excellent: 0.45, t1_excellent2: 0.55, t1_special: 0.60, t1_special2: 0.70,
  // tier 2: 县级（rank 4-6）
  t2_excellent: 0.35, t2_excellent2: 0.45, t2_special: 0.50, t2_special2: 0.55,
  // tier 3: 市级（rank 7-9）
  t3_excellent: 0.30, t3_excellent2: 0.40, t3_special: 0.45, t3_special2: 0.50,
  // tier 4: 省级（rank 10-11）
  t4_excellent: 0.20, t4_excellent2: 0.30, t4_special: 0.35, t4_special2: 0.40,
  // tier 5: 高层（rank 12-15）
  t5_excellent: 0.10, t5_excellent2: 0.20, t5_special: 0.25, t5_special2: 0.30,
};

// 2. 新增"政绩爆发"机制：连续3个月政绩增长≥20%时，额外获得5%加速
export const MERIT_BURST_BONUS = 0.05;

// 3. 新增"年龄窗口红利"：在最佳年龄区间内，额外获得10%加速
export const AGE_WINDOW_BONUS = 0.10;
```

**涉及文件**：
- `src/lib/promotionConfig.ts`：修改 ASSESS_ACCEL 为分层结构
- `src/lib/promotionEngine.ts`：`computeTenureAccel()` 新增 tier 分支和 burst/age 检测
- `src/ctx/GameContext.tsx`：删除硬编码加速逻辑，统一调用引擎

**向后兼容**：保留 `ASSESS_ACCEL` 常量但标记为 `@deprecated`，新存档使用 `ASSESS_ACCEL_V2`，旧存档继续使用旧值直到下次年度评估自动迁移

---

### 改革二：政治生态事件扩展（P0）

**现状**：四类基础事件已恢复，但触发频率低、后果轻、缺乏深度

**改革方案**：

#### 2.1 功高盖主（Prestige Crisis）—— 深化

**触发条件**：民心≥90 且连续2年优秀/特等（不变）
**新增机制**：
- **三阶段递进**：
  - 阶段1（轻度）：上司好感每月-2（当前）
  - 阶段2（中度，持续3个月未处理）：好感每月-5 + 竞争对手获得"打压"buff（评分+10）
  - 阶段3（重度，持续6个月未处理）：上司直接发起"调岗考察"，冻结晋升90天 + 功绩-500
- **应对选项**：
  - "低调行事"：民心-5，好感+10（现有）
  - "主动汇报"：好感+5，功绩-50（现有）
  - **新增** "拉拢同盟"：消耗派系贡献100点，获得派系庇护（冻结期间免疫好感衰减）
  - **新增** "上书自辩"：有30%概率逆转为"越级赏识"（功绩+200），70%概率升级为阶段3

**涉及函数**：`isPrestigeHigh()` + 新增 `resolvePrestigeCrisis()`

#### 2.2 非正式关系密切（Clique Scandal）—— 深化

**触发条件**：某位上司好感≥85（不变）
**新增机制**：
- **爆料链**：事件触发后，有 30% 概率被竞争对手"爆料"给纪检部门
  - 若被爆料：冻结期延长至 360 天，功绩-500，民心-20
  - 若未被爆料：正常冻结 180 天
- **公关选项**：
  - **新增** "紧急公关"：消耗个人资金 50 万元，70% 概率阻止爆料
  - **新增** "切割止损"：立即与该上司好感清零，冻结期减半（90天），但获得"背叛者"标签（未来6个月所有上司好感增长率-30%）

**涉及函数**：`isClique()` + 新增 `resolveCliqueScandal()`

#### 2.3 领导阻挠（Obstruction Warfare）—— 新增事件链

**现状**：仅触发一次性惩罚
**新增机制**：
- **形成"阻力-突破"动态循环**：
  - 触发时：功绩-50（现有）
  - 每月持续：若好感未提升至50以上，每月额外功绩-30
  - 突破条件：好感提升至60以上 或 功绩达到要求的1.5倍（强行突破）
- **新增"送礼破冰"灰色选项**：消耗 10-50 万元，好感+15-25，但风险值+5-15（纪检查处概率增加）

**涉及函数**：`isLeaderObstruct()` + 新增 `resolveObstructionWarfare()`

#### 2.4 越级赏识（Patronage）—— 新增时间压力

**触发条件**：功绩≥1.2倍要求且民心≥80（不变）
**新增机制**：
- **庇护有效期缩短**：从 365 天缩短至 180 天（增加紧迫感）
- **庇护失效后果**：若未在有效期内成功晋升，庇护失效时功绩-300（"期望落空"惩罚）
- **新增"主动维系"选项**：每30天消耗 20 功绩 + 10 万元，延长庇护30天（最多延长2次）

#### 2.5 新增第五类事件：政敌狙击（Rival Ambush）

**触发条件**：晋升竞争综合评分超过竞争对手但差距<10分，且随机概率 15%
**事件效果**：
- 政敌发动"黑材料攻击"：功绩-100，民心-5，晋升评分临时-8分
- 应对选项：
  - "正面硬刚"：消耗 200 功绩反击，50% 概率反杀（政敌功绩-200），50% 概率升级（功绩再-100）
  - "暗中调查"：消耗 50 万元雇佣私家侦探，80% 概率发现政敌把柄（获得"把柄"道具，可在关键时刻使用）
  - "忍气吞声"：无消耗，但获得"软弱"标签（未来3个月竞争评分-5%）

**涉及文件**：
- `src/lib/promotionEngine.ts`：新增事件判定函数 + 事件解决函数
- `src/ctx/GameContext.tsx`：月度结算中调用新事件链
- `src/types/game.ts`：新增事件状态字段（`prestigeStage`, `cliqueExposed`, `obstructionBreakthrough`, `patronExtended`）
- **数据库迁移**：新增字段到 `player_saves` 表

---

### 改革三：晋升门槛体系调整（P1）

**现状**：六项硬门槛（年限/功绩/考评/民心/上级/年龄）固定不变，缺乏动态适应

**改革方案**：

#### 3.1 民心门槛动态化

```typescript
// promotionConfig.ts
// 原：POPULAR_THRESHOLD = { 1:30, 2:35, 3:40, 4:45, 5:50 }
// 新：根据城市类型调整
export function getPopularThreshold(tier: number, cityType: string): number {
  const base = POPULAR_THRESHOLD[tier] ?? 30;
  // 经济强市民心要求更高（政绩压力大）
  if (['直辖市','副省级城市'].includes(cityType)) return base + 5;
  // 贫困县民心要求更低（维稳为主）
  if (cityType === '贫困县') return base - 5;
  return base;
}
```

#### 3.2 功绩要求弹性化

```typescript
// 新增：功绩要求可根据"城市发展指数"动态调整
// 城市发展指数 = (cityGdp + cityLivelihood + cityEcology + cityBusiness) / 4
// 指数≥70：功绩要求+10%（高标准严要求）
// 指数<40：功绩要求-10%（给予容错空间）
export function getDynamicMeritRequirement(base: number, cityAvgIndex: number): number {
  if (cityAvgIndex >= 70) return Math.round(base * 1.10);
  if (cityAvgIndex < 40) return Math.round(base * 0.90);
  return base;
}
```

#### 3.3 上级认可度门槛差异化

```typescript
// 原：FAVOR_THRESHOLD = { min: 50, breakMin: 70, closeFlag: 85, obstructMax: 40 }
// 新：根据上司类型差异化
// 直属上司（boss1）：min 55（更严格）
// 分管领导（boss2）：min 50
// 组织部长（boss3）：min 45（更宽松，关注大局）
export const FAVOR_THRESHOLD_V2 = {
  boss1: { min: 55, breakMin: 75, closeFlag: 88, obstructMax: 42 },
  boss2: { min: 50, breakMin: 70, closeFlag: 85, obstructMax: 40 },
  boss3: { min: 45, breakMin: 65, closeFlag: 82, obstructMax: 38 },
};
```

**涉及文件**：
- `src/lib/promotionConfig.ts`：新增动态阈值函数
- `src/lib/promotionEngine.ts`：`checkHardGates()` 适配动态阈值
- `src/ctx/GameContext.tsx`：年度评估时更新功绩要求

---

### 改革四：破格晋升通道改革（P1）

**现状**：成功率 5%，消耗全部功绩，玩家几乎不使用

**改革方案**：

#### 4.1 成功率改为"动态概率"

```typescript
// 原：固定 5%
// 新：基础 8% + 条件加成，最高可达 35%

export function computeBreakSuccessRate(save: PlayerSave): number {
  let rate = 0.08; // 基础 8%
  
  // 加成项
  if (save.meritPoints >= save.requiredMerit * 1.8) rate += 0.05; // 功绩超80%
  if (save.assessmentGrade === '特等') rate += 0.05; // 特等考评
  if (save.consecutiveExcellentYears >= 3) rate += 0.05; // 连续3年优秀
  if (save.bossFavor >= 80 && save.boss2Favor >= 80) rate += 0.04; // 双上司高度认可
  if (save.factionContribution >= 500) rate += 0.04; // 派系贡献高
  if (save.patron_id) rate += 0.03; // 有政治庇护
  
  // 减成项
  if (save.popularSupport < 40) rate -= 0.03; // 民心低
  if (save.illegalWealth > 0) rate -= 0.05; // 有贪腐记录
  if (save.disciplineCases > 0) rate -= 0.05; // 有纪律处分
  
  return Math.max(0.03, Math.min(0.35, rate)); // 保底3%，封顶35%
}
```

#### 4.2 消耗改为"功绩锁定"而非"功绩清零"

```typescript
// 原：消耗全部功绩
// 新：锁定 60% 功绩（不可用），而非消耗
// 破格成功：锁定解除，功绩保留
// 破格失败：锁定功绩的 50% 永久损失，剩余解锁
export const BREAK_LOCK_RATIO = 0.60;
export const BREAK_FAIL_LOSS_RATIO = 0.50;
```

#### 4.3 破格成功后的"破格标签"

- 破格晋升者获得"破格提拔"标签，未来 2 个职级内享受：
  - 功绩获取效率 +15%（"新官上任三把火"）
  - 民心衰减速度 +20%（"根基不稳"风险）
  - 上司初始好感 +10（"上级关注"）

**涉及文件**：
- `src/lib/promotionConfig.ts`：新增破格概率计算函数
- `src/lib/promotionEngine.ts`：`canBreak()` + `attemptBreakPromote()` 重写
- `src/lib/promotionFaction.ts`：`attemptBreakPromote()` 适配新消耗机制
- `src/ctx/GameContext.tsx`：功绩锁定/解锁逻辑

---

### 改革五：派系系统与晋升深度耦合（P1）

**现状**：派系斗争仅影响席位战，对个人晋升几乎无直接影响

**改革方案**：

#### 5.1 派系声望直接转化为晋升竞争力

```typescript
// promotionEngine.ts 中 computePlayerScore() 修改
// 新增派系声望权重
const factionScore = computeFactionScore(save);
score += factionScore * 0.15; // 派系声望贡献15%的竞争评分

function computeFactionScore(save: PlayerSave): number {
  const primary = save.primaryFaction as FactionId;
  if (!primary) return 0;
  
  const relation = save[`${primary}_relation`] ?? 0;
  const contribution = save.factionContribution ?? 0;
  const rankInFaction = save.factionRank ?? 0; // 派系内排名
  
  // 基础分：派系关系值
  let score = relation;
  
  // 加成：派系贡献每100点+5分
  score += (contribution / 100) * 5;
  
  // 加成：派系内排名（前10%额外+20分）
  if (rankInFaction <= 0.10) score += 20;
  else if (rankInFaction <= 0.30) score += 10;
  
  // 风口期加成：若当前派系处于风口期，额外+15分
  const currentWind = getCurrentPoliticalWind();
  if (currentWind.dominant === primary) score += 15;
  
  return Math.min(100, score);
}
```

#### 5.2 派系庇护机制

- 加入派系后，晋升失败时有 20% 概率触发"派系力保"：
  - 功绩损失减半
  - 民心损失减半
  - 冻结期减半
- 但触发"派系力保"后，需向派系缴纳"保护费"：功绩-100 或 资金-20万

#### 5.3 派系背叛惩罚

- 换派系后 180 天内，原派系会"打压"：
  - 晋升竞争评分 -10%
  - 政绩获取效率 -20%
- 换派系超过 3 次，获得"墙头草"标签：所有派系关系增长率-30%

**涉及文件**：
- `src/lib/promotionEngine.ts`：`computePlayerScore()` 新增派系分量
- `src/lib/factionSystem.ts`：新增 `computeFactionScore()` + `getCurrentPoliticalWind()`
- `src/ctx/GameContext.tsx`：月度结算中检查派系庇护和背叛惩罚
- `src/types/game.ts`：新增 `factionRank`, `factionSwitches`, `turncoatTag` 字段

---

### 改革六：晋升UI/UX现代化（P2）

**现状**：信息过载、视觉层级混乱、缺乏进度可视化

**改革方案**：见 `docs/promotion-ui-redesign-draft.md`（已产出），核心改造项：

#### 6.1 晋升仪表盘（新增）
- 六项硬门槛用**环形进度条**可视化
- 每项条件色温变化：红→蓝→金→绿（由差到好）
- 综合满足度用**总进度条**展示

#### 6.2 政治生态事件弹窗（新增）
- 事件触发时：全屏半透明遮罩 + 动画弹窗
- **打字机叙事效果**：事件描述逐字显示，增强剧情感
- 选择分支用**卡片式按钮**，后果可视化（数值变化预览）

#### 6.3 晋升仪式（新增）
- 每次成功晋升触发**晋升仪式动画**：
  - 红头文件展开动画
  - 职级印章盖印效果
  - 新职位权限解锁提示
  - 简短晋升贺词（根据职级生成不同文案）

#### 6.4 晋升时间线（新增）
- 在晋升记录Tab中新增**时间线视图**：
  - 横向时间轴展示历次晋升
  - 每个节点可展开查看当时的功绩/民心/考评等快照
  - 标注破格晋升、派系斗争等关键事件

**涉及文件**：
- `src/app/(app)/promotion.tsx`：整体布局改造
- `src/components/promotion/PromotionDashboard.tsx`（新建）
- `src/components/promotion/PoliticalEventModal.tsx`（新建）
- `src/components/promotion/PromotionCeremony.tsx`（新建）
- `src/components/promotion/PromotionTimeline.tsx`（新建）

---

### 改革七：数据持久化与平衡性（P0-P2穿插）

#### 7.1 数据库迁移

**新增字段（player_saves 表）**：
```sql
-- 政治生态事件状态
ALTER TABLE player_saves ADD COLUMN prestige_stage INT DEFAULT 0; -- 功高盖主阶段 0-3
ALTER TABLE player_saves ADD COLUMN clique_exposed BOOLEAN DEFAULT FALSE; -- 非正式关系是否被爆料
ALTER TABLE player_saves ADD COLUMN obstruction_months INT DEFAULT 0; -- 领导阻挠持续月数
ALTER TABLE player_saves ADD COLUMN patron_extended_count INT DEFAULT 0; -- 庇护延长次数
ALTER TABLE player_saves ADD COLUMN rival_ambush_count INT DEFAULT 0; -- 政敌狙击次数

-- 破格新机制
ALTER TABLE player_saves ADD COLUMN merit_locked FLOAT DEFAULT 0; -- 锁定功绩
ALTER TABLE player_saves ADD COLUMN break_tag_count INT DEFAULT 0; -- 破格标签剩余职级数

-- 派系耦合
ALTER TABLE player_saves ADD COLUMN faction_rank FLOAT DEFAULT 0; -- 派系内排名（百分位）
ALTER TABLE player_saves ADD COLUMN faction_switches INT DEFAULT 0; -- 换派系次数
ALTER TABLE player_saves ADD COLUMN turncoat_tag BOOLEAN DEFAULT FALSE; -- 墙头草标签

-- 晋升仪式
ALTER TABLE player_saves ADD COLUMN last_promotion_ceremony_day INT DEFAULT 0; -- 上次仪式天数
ALTER TABLE player_saves ADD COLUMN promotion_snapshot JSONB DEFAULT '{}'; -- 晋升快照
```

#### 7.2 初始值调整

| 字段 | 当前初始值 | 新初始值 | 理由 |
|------|----------|---------|------|
| `merit_points` | 0 | 50 | 起步更顺畅 |
| `popular_support` | 50 | 55 | 起步民心略高 |
| `boss_favor` | 50 | 55 | 起步上司关系略好 |
| `faction_contribution` | 0 | 100 | 起步有派系基础 |
| `fund_balance` | 30（rank1） | 50 | 起步资金略充裕 |

#### 7.3 向后兼容方案

1. **字段默认值**：所有新增字段都设置合理的默认值，旧存档自动适配
2. **版本标记**：在存档中新增 `promotion_system_version` 字段，初始为 2，升级后标记为 3
3. **渐进式升级**：旧存档在下次月度结算时自动检测版本，触发一次性升级脚本：
   - 功绩增加起步补偿（50点）
   - 派系贡献增加起步补偿（100点）
   - 其他新字段使用默认值
4. ** Edge Function 升级**：新增 `upgrade_save_v2_to_v3()` 函数，供前端在加载旧存档时调用

**涉及文件**：
- `supabase/migrations/`：新建迁移文件（如 `00201_promotion_system_v3.sql`）
- `supabase/functions/upgrade_save/`：新建 Edge Function
- `src/db/gameApi.ts`：`rowToPlayerSave()` 适配新字段
- `src/types/game.ts`：`PlayerSave` 类型新增字段

---

## 四、实施路线图

### 阶段一：基础设施（P0，第1-2天）

| 任务 | 文件 | 工作量 | 阻塞项 |
|------|------|--------|--------|
| 数据库迁移 | `migrations/00201_promotion_system_v3.sql` | 2h | 无 |
| Edge Function升级 | `functions/upgrade_save/` | 3h | 数据库就绪 |
| 类型定义更新 | `src/types/game.ts` | 1h | 无 |
| API层适配 | `src/db/gameApi.ts` | 2h | 类型就绪 |

**里程碑**：存档可读写新字段，向后兼容验证通过

### 阶段二：核心逻辑（P0+P1，第3-5天）

| 任务 | 文件 | 工作量 | 阻塞项 |
|------|------|--------|--------|
| 分层加速机制 | `promotionConfig.ts` + `promotionEngine.ts` | 4h | 基础设施 |
| 政治生态事件扩展 | `promotionEngine.ts` | 6h | 基础设施 |
| 门槛动态化 | `promotionConfig.ts` + `promotionEngine.ts` | 3h | 基础设施 |
| 破格通道改革 | `promotionConfig.ts` + `promotionFaction.ts` | 5h | 门槛动态化 |
| 派系耦合 | `promotionEngine.ts` + `factionSystem.ts` | 6h | 政治生态事件 |

**里程碑**：核心晋升逻辑全部替换，单元测试通过

### 阶段三：月度结算适配（P1，第6-7天）

| 任务 | 文件 | 工作量 | 阻塞项 |
|------|------|--------|--------|
| GameContext结算改造 | `src/ctx/GameContext.tsx` | 8h | 核心逻辑 |
| 旧存档升级触发 | `home.tsx` 或 `GameContext.tsx` | 3h | 结算改造 |

**里程碑**：月度结算正确触发新事件链，旧存档平滑升级

### 阶段四：UI改造（P2，第8-12天）

| 任务 | 文件 | 工作量 | 阻塞项 |
|------|------|--------|--------|
| 晋升仪表盘 | `PromotionDashboard.tsx` + `ProgressRing.tsx` | 8h | 核心逻辑 |
| 政治生态事件弹窗 | `PoliticalEventModal.tsx` | 6h | 事件扩展 |
| 晋升仪式动画 | `PromotionCeremony.tsx` | 6h | 仪表盘 |
| 晋升时间线 | `PromotionTimeline.tsx` | 5h | 仪式动画 |
| promotion.tsx 主页面改造 | `promotion.tsx` | 6h | 所有组件 |

**里程碑**：晋升页视觉层全部替换，交互动画流畅

### 阶段五：联调与验证（P0-P2，第13-15天）

| 任务 | 工作量 |
|------|--------|
| 全流程端到端测试（注册→建档→晋升到rank5） | 8h |
| 政治生态事件触发测试（模拟100个月） | 6h |
| 破格通道概率验证（Monte Carlo 1000次） | 4h |
| 旧存档兼容性测试 | 4h |
| 性能优化（月度结算 RPC 并行化） | 6h |

**里程碑**：所有测试用例通过，性能达标

---

## 五、风险评估与回退方案

### 5.1 风险点

| 风险 | 概率 | 影响 | 缓解措施 |
|------|------|------|---------|
| 数据库迁移失败 | 低 | 高 | 先在测试库验证，保留旧字段不删除 |
| 旧存档升级后数据异常 | 中 | 高 | 升级前自动备份到 `player_saves_backup` 表 |
| 新晋升周期过短导致内容消耗过快 | 中 | 中 | 监控玩家晋升速度，必要时回调加速率 |
| UI改造引入新的白屏/黑屏bug | 中 | 高 | 分组件灰度发布，保留旧UI开关 |

### 5.2 回退方案

1. **配置回退**：所有新常量（`ASSESS_ACCEL_V2` 等）与旧常量并存，改回旧值只需改一行引用
2. **数据库回退**：旧字段保留，新字段设为 nullable，回退时直接忽略新字段
3. **代码回退**：Git commit 粒度控制在每个改革维度独立，可随时 revert 单个维度
4. **功能开关**：新增 `ENABLE_PROMOTION_V3` 环境变量，可一键切回 v2 逻辑

---

## 六、附录

### 6.1 涉及的完整文件清单

**必须修改**：
- `src/lib/promotionConfig.ts`
- `src/lib/promotionEngine.ts`
- `src/lib/promotionFaction.ts`
- `src/lib/factionSystem.ts`
- `src/ctx/GameContext.tsx`
- `src/db/gameApi.ts`
- `src/types/game.ts`
- `src/app/(app)/promotion.tsx`
- `src/app/(app)/home.tsx`

**新建组件**：
- `src/components/promotion/PromotionDashboard.tsx`
- `src/components/promotion/ProgressRing.tsx`
- `src/components/promotion/ConditionCard.tsx`
- `src/components/promotion/PoliticalEventModal.tsx`
- `src/components/promotion/PromotionCeremony.tsx`
- `src/components/promotion/PromotionTimeline.tsx`

**数据库**：
- `supabase/migrations/00201_promotion_system_v3.sql`

**Edge Function**：
- `supabase/functions/upgrade_save/index.ts`

### 6.2 关键数值速查表

| 常量 | 旧值 | 新值 | 文件 |
|------|------|------|------|
| ASSESS_ACCEL | {ex:0.10, ex2:0.125, sp:0.13, sp2:0.15} | 分层见3.1节 | promotionConfig.ts |
| MERIT_BURST_BONUS | 不存在 | 0.05 | promotionConfig.ts |
| AGE_WINDOW_BONUS | 固定值5/10 | 0.10 | promotionConfig.ts |
| BREAK_RULE.successRate | 固定0.05 | 动态0.03-0.35 | promotionEngine.ts |
| BREAK_LOCK_RATIO | 1.0（消耗全部） | 0.60（锁定） | promotionConfig.ts |
| FACTION_SCORE_WEIGHT | 0 | 0.15 | promotionEngine.ts |
| POPULAR_THRESHOLD | 固定30-50 | 动态±5 | promotionConfig.ts |

---

*本文档为晋升系统v3全面改革的实施蓝图，覆盖7大改革维度、5阶段实施路线、15个源文件、12个新建组件。开发人员可按阶段分批执行，每阶段独立可交付。*
