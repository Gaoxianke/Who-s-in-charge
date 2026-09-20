# supabase/functions

共 5 个文件。
<a id="supabasefunctionsexecute_gameplay_actionindexts"></a>
## `supabase/functions/execute_gameplay_action/index.ts`

```typescript
// 统一玩法动作执行接口（所有玩法动作只走这一个接口）
// 流程：解锁校验 → 冷却校验 → 按成功率掷骰 → 成功则更新存款/风险/道德，失败则加线索与风险 → 写涉案流水
// 前端永不直接改数值，逻辑不散落
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface ActionParams {
  gainMin?: number;
  gainMax?: number;
  risk?: number;
  moral?: number;
  successRate?: number;
  cooldown?: number;
  clueGain?: number;
  counterIntel?: number;
  safety?: number;
  recoveryRate?: number;
  clueValue?: number;
  suppressCost?: string;
  stageThreshold?: number;
  desc?: string;
}

interface Config {
  category: string;
  id: string;
  name: string;
  icon: string;
  unlockRank: number;
  params: ActionParams;
  sort: number;
  enabled: boolean;
}

// 玩法一·权钱交易：受贿渠道（严格按设计文档参数表）
const BRIBERY_CHANNELS: Config[] = [
  { category: 'bribery_channel', id: 'gift', name: '收受礼品礼金', icon: '🎁', unlockRank: 3, sort: 1, enabled: true, params: { gainMin: 2000, gainMax: 8000, risk: 2, moral: 1, successRate: 0.95, cooldown: 15, desc: '逢年过节收受管理对象的礼品礼金。' } },
  { category: 'bribery_channel', id: 'banquet', name: '宴请与消费卡', icon: '🍽️', unlockRank: 4, sort: 2, enabled: true, params: { gainMin: 5000, gainMax: 20000, risk: 3, moral: 2, successRate: 0.90, cooldown: 20, desc: '接受企业宴请并收受消费卡。' } },
  { category: 'bribery_channel', id: 'redpacket', name: '企业红包', icon: '🧧', unlockRank: 5, sort: 3, enabled: true, params: { gainMin: 10000, gainMax: 50000, risk: 4, moral: 3, successRate: 0.85, cooldown: 30, desc: '收受企业以红包名义输送的利益。' } },
  { category: 'bribery_channel', id: 'kickback', name: '工程回扣', icon: '🏗️', unlockRank: 7, sort: 4, enabled: true, params: { gainMin: 50000, gainMax: 300000, risk: 8, moral: 5, successRate: 0.75, cooldown: 60, desc: '在工程项目中收取回扣。' } },
  { category: 'bribery_channel', id: 'finance_fee', name: '融资中介费', icon: '🏦', unlockRank: 8, sort: 5, enabled: true, params: { gainMin: 100000, gainMax: 500000, risk: 9, moral: 5, successRate: 0.70, cooldown: 60, desc: '为融资项目牵线并收取中介费。' } },
  { category: 'bribery_channel', id: 'land_rent', name: '土地指标寻租', icon: '🏞️', unlockRank: 8, sort: 6, enabled: true, params: { gainMin: 200000, gainMax: 800000, risk: 12, moral: 6, successRate: 0.65, cooldown: 90, desc: '利用土地审批权进行寻租。' } },
  { category: 'bribery_channel', id: 'personnel', name: '人事晋升交易', icon: '🎖️', unlockRank: 9, sort: 7, enabled: true, params: { gainMin: 300000, gainMax: 1000000, risk: 12, moral: 7, successRate: 0.60, cooldown: 90, desc: '在干部选拔中收钱卖官。' } },
  { category: 'bribery_channel', id: 'special_fund', name: '专项资金截留', icon: '📋', unlockRank: 10, sort: 8, enabled: true, params: { gainMin: 500000, gainMax: 2000000, risk: 15, moral: 8, successRate: 0.55, cooldown: 120, desc: '截留挪用专项资金中饱私囊。' } },
  { category: 'bribery_channel', id: 'overseas_share', name: '境外公司股份', icon: '🌐', unlockRank: 12, sort: 9, enabled: true, params: { gainMin: 1000000, gainMax: 5000000, risk: 18, moral: 9, successRate: 0.45, cooldown: 180, desc: '通过境外公司代持股份获取利益。' } },
  { category: 'bribery_channel', id: 'trust', name: '巨额信托洗钱', icon: '🏛️', unlockRank: 14, sort: 10, enabled: true, params: { gainMin: 5000000, gainMax: 20000000, risk: 25, moral: 12, successRate: 0.35, cooldown: 365, desc: '通过信托产品清洗巨额非法资金。' } },
];

const POWER_RENTS: Config[] = [
  { category: 'power_rent', id: 'project_bid', name: '工程发包权', icon: '🏗️', unlockRank: 7, sort: 1, enabled: true, params: { gainMin: 30000, gainMax: 300000, risk: 10, moral: 5, successRate: 0.70, cooldown: 45, desc: '指定关系户中标工程，收取标的额提成。' } },
  { category: 'power_rent', id: 'bid_leak', name: '招投标干预', icon: '📑', unlockRank: 7, sort: 2, enabled: true, params: { gainMin: 50000, gainMax: 200000, risk: 8, moral: 4, successRate: 0.75, cooldown: 45, desc: '泄露标底为关系户谋利。' } },
  { category: 'power_rent', id: 'land_sale', name: '土地出让', icon: '🏞️', unlockRank: 8, sort: 3, enabled: true, params: { gainMin: 200000, gainMax: 1000000, risk: 12, moral: 6, successRate: 0.65, cooldown: 90, desc: '定向低价出让土地。' } },
  { category: 'power_rent', id: 'gov_purchase', name: '政府采购', icon: '🏪', unlockRank: 7, sort: 4, enabled: true, params: { gainMin: 20000, gainMax: 100000, risk: 6, moral: 3, successRate: 0.80, cooldown: 30, desc: '指定供应商获取采购回扣。' } },
  { category: 'power_rent', id: 'cadre_appoint', name: '干部任命', icon: '🎖️', unlockRank: 9, sort: 5, enabled: true, params: { gainMin: 300000, gainMax: 1000000, risk: 12, moral: 7, successRate: 0.60, cooldown: 90, desc: '卖官鬻爵，收钱提拔。' } },
  { category: 'power_rent', id: 'resource_approval', name: '资源审批', icon: '♻️', unlockRank: 8, sort: 6, enabled: true, params: { gainMin: 50000, gainMax: 300000, risk: 8, moral: 4, successRate: 0.72, cooldown: 60, desc: '环评放水、审批寻租。' } },
  { category: 'power_rent', id: 'finance_license', name: '金融牌照', icon: '🏦', unlockRank: 12, sort: 7, enabled: true, params: { gainMin: 500000, gainMax: 3000000, risk: 15, moral: 8, successRate: 0.55, cooldown: 180, desc: '审批金融牌照进行寻租。' } },
];

const EMBEZZLEMENTS: Config[] = [
  { category: 'embezzlement', id: 'fake_travel', name: '虚报差旅费', icon: '🧾', unlockRank: 3, sort: 1, enabled: true, params: { gainMin: 1000, gainMax: 3000, risk: 2, moral: 2, successRate: 0.90, cooldown: 20, desc: '虚报差旅费用报销套现。' } },
  { category: 'embezzlement', id: 'fake_invoice', name: '假发票报销', icon: '🧾', unlockRank: 4, sort: 2, enabled: true, params: { gainMin: 3000, gainMax: 10000, risk: 4, moral: 3, successRate: 0.85, cooldown: 25, desc: '使用虚假发票报销套取公款。' } },
  { category: 'embezzlement', id: 'agri_fund', name: '截留惠农资金', icon: '🌾', unlockRank: 5, sort: 3, enabled: true, params: { gainMin: 10000, gainMax: 50000, risk: 6, moral: 5, successRate: 0.78, cooldown: 40, desc: '截留挪用惠农补贴资金。' } },
  { category: 'embezzlement', id: 'slush_fund', name: '私设小金库', icon: '💰', unlockRank: 6, sort: 4, enabled: true, params: { gainMin: 20000, gainMax: 100000, risk: 7, moral: 5, successRate: 0.72, cooldown: 50, desc: '私设小金库截留单位资金。' } },
  { category: 'embezzlement', id: 'special_embezzle', name: '挪用专项资金', icon: '📋', unlockRank: 8, sort: 5, enabled: true, params: { gainMin: 100000, gainMax: 500000, risk: 10, moral: 7, successRate: 0.65, cooldown: 70, desc: '挪用专项资金用于个人用途。' } },
  { category: 'embezzlement', id: 'poverty_fund', name: '骗取扶贫资金', icon: '🤝', unlockRank: 9, sort: 6, enabled: true, params: { gainMin: 200000, gainMax: 800000, risk: 12, moral: 9, successRate: 0.58, cooldown: 90, desc: '骗取扶贫专项资金。' } },
  { category: 'embezzlement', id: 'social_fund', name: '社保基金挪用', icon: '🏥', unlockRank: 10, sort: 7, enabled: true, params: { gainMin: 500000, gainMax: 2000000, risk: 15, moral: 10, successRate: 0.50, cooldown: 120, desc: '挪用社保基金，风险极高。' } },
];

const ASSET_HIDINGS: Config[] = [
  { category: 'asset_hiding', id: 'cash', name: '现金藏匿（保险柜）', icon: '🗄️', unlockRank: 3, sort: 1, enabled: true, params: { safety: 2, recoveryRate: 0.60, risk: 2, moral: 0, desc: '将现金藏于家中保险柜，安全性中等。' } },
  { category: 'asset_hiding', id: 'relative', name: '亲属代持', icon: '👨‍👩‍👧', unlockRank: 5, sort: 2, enabled: true, params: { safety: 2, recoveryRate: 0.55, risk: 3, moral: 1, desc: '由亲属代持资产，牵连家人风险。' } },
  { category: 'asset_hiding', id: 'antique', name: '古董字画', icon: '🖼️', unlockRank: 6, sort: 3, enabled: true, params: { safety: 3, recoveryRate: 0.35, risk: 2, moral: 1, desc: '购置古董字画藏匿资金。' } },
  { category: 'asset_hiding', id: 'overseas_account', name: '境外账户', icon: '🌍', unlockRank: 8, sort: 4, enabled: true, params: { safety: 3, recoveryRate: 0.25, risk: 4, moral: 2, desc: '在境外开设账户转移资金。' } },
  { category: 'asset_hiding', id: 'shell_company', name: '空壳公司', icon: '🏢', unlockRank: 9, sort: 5, enabled: true, params: { safety: 3, recoveryRate: 0.40, risk: 3, moral: 2, desc: '通过空壳公司洗白资金。' } },
  { category: 'asset_hiding', id: 'crypto', name: '加密货币', icon: '🪙', unlockRank: 10, sort: 6, enabled: true, params: { safety: 4, recoveryRate: 0.15, risk: 4, moral: 2, desc: '兑换加密货币藏匿资金，追缴极难。' } },
  { category: 'asset_hiding', id: 'overseas_trust', name: '境外信托', icon: '🏛️', unlockRank: 14, sort: 7, enabled: true, params: { safety: 4, recoveryRate: 0.10, risk: 5, moral: 3, desc: '设立境外信托，追缴率极低。' } },
];

const ASSET_TRANSFERS: Config[] = [
  { category: 'asset_transfer', id: 'cash_transfer', name: '现金转移', icon: '💵', unlockRank: 8, sort: 1, enabled: true, params: { recoveryRate: 0.10, risk: 3, moral: 1, successRate: 0.85, cooldown: 30, desc: '转移现金至亲友处，追缴率-10%。' } },
  { category: 'asset_transfer', id: 'overseas_property', name: '购买海外房产', icon: '🏠', unlockRank: 8, sort: 2, enabled: true, params: { recoveryRate: 0.15, risk: 4, moral: 2, successRate: 0.80, cooldown: 45, desc: '购置海外房产转移资金，追缴率-15%。' } },
  { category: 'asset_transfer', id: 'hard_currency', name: '兑换硬通货', icon: '🥇', unlockRank: 8, sort: 3, enabled: true, params: { recoveryRate: 0.10, risk: 3, moral: 1, successRate: 0.88, cooldown: 30, desc: '兑换黄金/外币，追缴率-10%。' } },
  { category: 'asset_transfer', id: 'gift_relative', name: '转赠亲属', icon: '👨‍👩‍👧', unlockRank: 8, sort: 4, enabled: true, params: { recoveryRate: 0.05, risk: 2, moral: 2, successRate: 0.90, cooldown: 30, desc: '家庭内部转移，牵连家属。' } },
  { category: 'asset_transfer', id: 'destroy_evidence', name: '销毁证据', icon: '🔥', unlockRank: 8, sort: 5, enabled: true, params: { clueGain: -10, risk: 5, moral: 2, successRate: 0.70, cooldown: 60, desc: '烧毁账本票据，线索完整度-10。' } },
];

const ALL_CONFIGS: Config[] = [...BRIBERY_CHANNELS, ...POWER_RENTS, ...EMBEZZLEMENTS, ...ASSET_HIDINGS, ...ASSET_TRANSFERS];

function getConfig(id: string): Config | undefined {
  return ALL_CONFIGS.find((c) => c.id === id);
}

function clamp(v: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, v));
}

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: CORS });
  }

  const json = (body: unknown, status = 200) =>
    new Response(JSON.stringify(body), { status, headers: { ...CORS, 'Content-Type': 'application/json' } });

  try {
    const authHeader = req.headers.get('Authorization') ?? '';
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // 鉴权：从 JWT 获取用户
    const userClient = createClient(supabaseUrl, Deno.env.get('SUPABASE_ANON_KEY')!, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: { user } } = await userClient.auth.getUser();
    if (!user) return json({ error: '未登录' }, 401);

    const body = await req.json();
    const saveId: string = body.saveId;
    const configId: string = body.configId;
    const amount: number | undefined = body.amount;

    if (!saveId || !configId) return json({ error: '参数缺失' }, 400);

    const config = getConfig(configId);
    if (!config || !config.enabled) return json({ error: '玩法不存在或已禁用' }, 400);

    // 读取存档
    const { data: save, error: saveErr } = await supabase
      .from('player_saves')
      .select('id, user_id, rank_level, personal_savings, moral_value, risk_value, clue_level, illegal_wealth, illicit_log, transfer_log, asset_hiding, game_days')
      .eq('id', saveId)
      .maybeSingle();
    if (saveErr) return json({ error: saveErr.message }, 500);
    if (!save) return json({ error: '存档不存在' }, 404);
    if (save.user_id !== user.id) return json({ error: '无权操作此存档' }, 403);

    // ① 解锁校验
    if (config.unlockRank > 0 && save.rank_level < config.unlockRank) {
      return json({ error: `职级不足，需 ${config.unlockRank} 级解锁` }, 400);
    }

    // ② 冷却校验（基于 illicit_log/transfer_log 中最近一次同 id 记录）
    if (config.params.cooldown && config.params.cooldown > 0) {
      const logs: Array<{ id: string; day: number }> = save.illicit_log ?? [];
      const last = [...logs].reverse().find((l) => l.id === configId);
      if (last) {
        const since = save.game_days - last.day;
        if (since < config.params.cooldown) {
          return json({ error: `冷却中，还需 ${config.params.cooldown - since} 天` }, 400);
        }
      }
    }

    const p = config.params;
    const gameDays: number = save.game_days;

    // ③ 按成功率掷骰
    const roll = Math.random() * 100;
    const success = p.successRate !== undefined ? roll < p.successRate * 100 : true;

    const updates: Record<string, unknown> = {};
    const resultMsg: string[] = [];
    let gain = 0;

    if (success) {
      // 成功：更新存款、风险、道德
      if (p.gainMin !== undefined && p.gainMax !== undefined) {
        gain = Math.round(p.gainMin + Math.random() * (p.gainMax - p.gainMin));
        updates.personal_savings = (save.personal_savings ?? 0) + gain;
        updates.illegal_wealth = (Number(save.illegal_wealth ?? 0)) + gain;
      }
      if (p.risk !== undefined) {
        updates.risk_value = clamp((save.risk_value ?? 0) + p.risk, 0, 100);
      }
      if (p.moral !== undefined) {
        updates.moral_value = clamp((save.moral_value ?? 0) - p.moral, 0, 100);
      }
      if (p.clueGain !== undefined) {
        updates.clue_level = clamp((save.clue_level ?? 0) + p.clueGain, 0, 100);
      }
      if (p.counterIntel !== undefined) {
        updates.counter_intel = clamp((save.counter_intel ?? 0) + p.counterIntel, 0, 100);
      }
      resultMsg.push(`成功！${gain > 0 ? `获得 ${gain.toLocaleString()} 元` : ''}`);
    } else {
      // 失败：加线索与风险
      updates.clue_level = clamp((save.clue_level ?? 0) + 10, 0, 100);
      if (p.risk !== undefined) {
        updates.risk_value = clamp((save.risk_value ?? 0) + p.risk + 8, 0, 100);
      } else {
        updates.risk_value = clamp((save.risk_value ?? 0) + 8, 0, 100);
      }
      if (p.moral !== undefined) {
        updates.moral_value = clamp((save.moral_value ?? 0) - Math.ceil(p.moral / 2), 0, 100);
      }
      resultMsg.push('失败！消息走漏，线索完整度 +10，风险大幅上升');
    }

    // ④ 写涉案流水
    const illicitLog: Array<{ id: string; channel: string; amount: number; day: number; success: boolean }> = save.illicit_log ?? [];
    illicitLog.push({ id: configId, channel: config.name, amount: gain, day: gameDays, success });
    if (illicitLog.length > 200) illicitLog.splice(0, illicitLog.length - 200);
    updates.illicit_log = illicitLog;

    // 资产转移：写 transfer_log
    if (config.category === 'asset_transfer' && amount && amount > 0) {
      const transferLog: Array<{ id: string; method: string; amount: number; day: number }> = save.transfer_log ?? [];
      transferLog.push({ id: configId, method: config.name, amount, day: gameDays });
      if (transferLog.length > 200) transferLog.splice(0, transferLog.length - 200);
      updates.transfer_log = transferLog;
    }

    // 藏匿方式：写 asset_hiding
    if (config.category === 'asset_hiding' && amount && amount > 0) {
      const hiding: Array<{ methodKey: string; amount: number }> = save.asset_hiding ?? [];
      const existing = hiding.find((h) => h.methodKey === configId);
      if (existing) existing.amount += amount;
      else hiding.push({ methodKey: configId, amount });
      updates.asset_hiding = hiding;
    }

    // ⑤ Game Over 检测：道德归零 → 落马
    let gameOver: string | null = null;
    const newMoral = typeof updates.moral_value === 'number' ? updates.moral_value : save.moral_value;
    if (newMoral <= 0) {
      gameOver = 'corruption';
      updates.game_over_type = 'corruption';
    }

    const { error: updateErr } = await supabase.from('player_saves').update(updates).eq('id', saveId);
    if (updateErr) return json({ error: updateErr.message }, 500);

    return json({
      success,
      message: resultMsg.join(' '),
      roll: Math.round(roll),
      gain,
      gameOver,
    });
  } catch (e) {
    return json({ error: e instanceof Error ? e.message : '服务器错误' }, 500);
  }
});
```

<a id="supabasefunctionsexecute_popular_actionindexts"></a>
## `supabase/functions/execute_popular_action/index.ts`

```typescript
// 民心修行动作执行接口
// 流程：鉴权 → 解锁校验 → 冷却校验 → 应用民心增减+附加效果 → 更新冷却 → 写民心日志
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface PopularParams {
  popularGain?: number;
  cooldown?: number;
  livelihoodGain?: number;
  opinionReduction?: number;
  meritGain?: number;
  riskReduction?: number;
  teamIntegrityGain?: number;
  desc?: string;
}

interface PopularConfig {
  category: string;
  id: string;
  name: string;
  icon: string;
  unlockRank: number;
  params: PopularParams;
  sort: number;
  enabled: boolean;
}

// 与前端 gameplayConfig.ts 完全一致的 17 条配置（后端单一来源）
const POPULAR_SUPPORT_ACTIONS: PopularConfig[] = [
  // Tab 二：亲民为民
  { category: 'popularity', id: 'popular_visit_poor', name: '走访困难群众', icon: '🏠', unlockRank: 1, sort: 1, enabled: true,
    params: { popularGain: 2, cooldown: 45, livelihoodGain: 2 } },
  { category: 'popularity', id: 'popular_grassroot_survey', name: '基层调研', icon: '📋', unlockRank: 2, sort: 2, enabled: true,
    params: { popularGain: 2, cooldown: 45 } },
  { category: 'popularity', id: 'popular_reception_day', name: '群众接待日', icon: '🤝', unlockRank: 3, sort: 3, enabled: true,
    params: { popularGain: 3, cooldown: 60, opinionReduction: 10 } },
  { category: 'popularity', id: 'popular_paired_aid', name: '结对帮扶', icon: '👥', unlockRank: 4, sort: 4, enabled: true,
    params: { popularGain: 3, cooldown: 90 } },
  { category: 'popularity', id: 'popular_village_stay', name: '驻村蹲点', icon: '🌾', unlockRank: 5, sort: 5, enabled: true,
    params: { popularGain: 4, cooldown: 120 } },
  { category: 'popularity', id: 'popular_open_review', name: '开门搞评议', icon: '🗣️', unlockRank: 7, sort: 6, enabled: true,
    params: { popularGain: 4, cooldown: 180, opinionReduction: 5 } },
  // Tab 三：民生实事
  { category: 'popularity', id: 'popular_resolve_legacy', name: '化解历史遗留问题', icon: '🔧', unlockRank: 6, sort: 7, enabled: true,
    params: { popularGain: 5, cooldown: 180, opinionReduction: 10 } },
  { category: 'popularity', id: 'popular_welfare_project', name: '推动惠民工程', icon: '🏗️', unlockRank: 8, sort: 8, enabled: true,
    params: { popularGain: 5, cooldown: 180, livelihoodGain: 5 } },
  { category: 'popularity', id: 'popular_promote_jobs', name: '促进就业增收', icon: '💼', unlockRank: 8, sort: 9, enabled: true,
    params: { popularGain: 3, cooldown: 120, livelihoodGain: 3 } },
  { category: 'popularity', id: 'popular_edu_health', name: '提升教育医疗', icon: '🏫', unlockRank: 9, sort: 10, enabled: true,
    params: { popularGain: 4, cooldown: 180, livelihoodGain: 4 } },
  { category: 'popularity', id: 'popular_gov_transparency', name: '政务公开透明', icon: '📢', unlockRank: 10, sort: 11, enabled: true,
    params: { popularGain: 4, cooldown: 365, riskReduction: 5 } },
  { category: 'popularity', id: 'popular_major_promise', name: '重大民生承诺兑现', icon: '🏅', unlockRank: 12, sort: 12, enabled: true,
    params: { popularGain: 6, cooldown: 365, livelihoodGain: 8 } },
  // Tab 四：顺应民意
  { category: 'popularity', id: 'popular_rectify_local', name: '整治群众身边不正之风', icon: '⚖️', unlockRank: 5, sort: 13, enabled: true,
    params: { popularGain: 4, cooldown: 90, teamIntegrityGain: 3 } },
  { category: 'popularity', id: 'popular_respond_opinion', name: '回应舆情关切', icon: '📡', unlockRank: 6, sort: 14, enabled: true,
    params: { popularGain: 3, cooldown: 60 } },
  { category: 'popularity', id: 'popular_special_inspect', name: '专项督查整改', icon: '🔍', unlockRank: 8, sort: 15, enabled: true,
    params: { popularGain: 5, cooldown: 180 } },
  { category: 'popularity', id: 'popular_lead_discipline', name: '带头正风肃纪行动', icon: '🎯', unlockRank: 10, sort: 16, enabled: true,
    params: { popularGain: 6, cooldown: 180, meritGain: 15 } },
  { category: 'popularity', id: 'popular_mass_discipline', name: '正风肃纪专项行动', icon: '🚩', unlockRank: 12, sort: 17, enabled: true,
    params: { popularGain: 8, cooldown: 365, meritGain: 30 } },
];

function clamp(v: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, v));
}

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: CORS });
  }

  const json = (body: unknown, status = 200) =>
    new Response(JSON.stringify(body), { status, headers: { ...CORS, 'Content-Type': 'application/json' } });

  try {
    const authHeader = req.headers.get('Authorization') ?? '';
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // 鉴权
    const userClient = createClient(supabaseUrl, Deno.env.get('SUPABASE_ANON_KEY')!, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: { user } } = await userClient.auth.getUser();
    if (!user) return json({ error: '未登录' }, 401);

    const body = await req.json();
    const saveId: string = body.saveId;
    const actionId: string = body.actionId;

    if (!saveId || !actionId) return json({ error: '参数缺失' }, 400);

    const config = POPULAR_SUPPORT_ACTIONS.find((c) => c.id === actionId);
    if (!config || !config.enabled) return json({ error: '动作不存在或已禁用' }, 400);

    // 读取存档（精确选取所需字段）
    const { data: save, error: saveErr } = await supabase
      .from('player_saves')
      .select('id, user_id, rank_level, game_days, popular_support, popular_log, popular_action_cooldowns, city_livelihood, merit_points, risk_value')
      .eq('id', saveId)
      .maybeSingle();
    if (saveErr) return json({ error: saveErr.message }, 500);
    if (!save) return json({ error: '存档不存在' }, 404);
    if (save.user_id !== user.id) return json({ error: '无权操作此存档' }, 403);

    const rankLevel: number = save.rank_level ?? 1;
    const gameDays: number = save.game_days ?? 0;
    const p = config.params;

    // ① 解锁校验
    if (rankLevel < config.unlockRank) {
      return json({ error: `职级不足，需 ${config.unlockRank} 级解锁` }, 400);
    }

    // ② 冷却校验（popular_action_cooldowns: { [actionId]: endGameDay }）
    const cooldowns: Record<string, number> = (save.popular_action_cooldowns as Record<string, number>) ?? {};
    const cooldownEnd = cooldowns[actionId];
    if (cooldownEnd !== undefined && gameDays < cooldownEnd) {
      const remaining = cooldownEnd - gameDays;
      return json({ error: `冷却中，还需 ${remaining} 天` }, 400);
    }

    // ③ 应用民心增减与附加效果
    const popularGain = p.popularGain ?? 0;
    const newPopularSupport = clamp((save.popular_support as number ?? 50) + popularGain, 0, 100);
    const updates: Record<string, unknown> = {};
    const sideEffects: string[] = [];

    updates.popular_support = newPopularSupport;

    if (p.livelihoodGain && p.livelihoodGain > 0) {
      updates.city_livelihood = clamp((save.city_livelihood as number ?? 50) + p.livelihoodGain, 0, 100);
      sideEffects.push(`民生+${p.livelihoodGain}`);
    }
    if (p.meritGain && p.meritGain > 0) {
      updates.merit_points = (save.merit_points as number ?? 0) + p.meritGain;
      sideEffects.push(`功绩+${p.meritGain}`);
    }
    if (p.riskReduction && p.riskReduction > 0) {
      updates.risk_value = clamp((save.risk_value as number ?? 0) - p.riskReduction, 0, 100);
      sideEffects.push(`廉政风险-${p.riskReduction}`);
    }
    if (p.opinionReduction && p.opinionReduction > 0) {
      // 舆情/诉求压力减少记录到日志（无独立字段，影响民生体验感知）
      sideEffects.push(`舆情-${p.opinionReduction}`);
    }
    if (p.teamIntegrityGain && p.teamIntegrityGain > 0) {
      // 团队廉洁：小幅提升班子成员 integrity（批量 +teamIntegrityGain，上限100）
      const { data: bandRows } = await supabase
        .from('npc_band')
        .select('id, integrity')
        .eq('save_id', saveId)
        .gt('age', 0); // 跳过玩家自身（age=0）
      if (bandRows && bandRows.length > 0) {
        for (const m of bandRows) {
          const newIntegrity = clamp((m.integrity as number ?? 60) + p.teamIntegrityGain, 0, 100);
          await supabase.from('npc_band').update({ integrity: newIntegrity }).eq('id', m.id);
        }
      }
      sideEffects.push(`团队廉洁+${p.teamIntegrityGain}`);
    }

    // ④ 更新冷却截止天数
    const newCooldowns = { ...cooldowns, [actionId]: gameDays + (p.cooldown ?? 0) };
    updates.popular_action_cooldowns = newCooldowns;

    // ⑤ 写民心日志（保留最近 200 条）
    const log: Array<{ gameDay: number; actionId: string; actionName: string; popularChange: number; sideEffects?: string[] }> =
      (save.popular_log as typeof log) ?? [];
    log.push({ gameDay: gameDays, actionId, actionName: config.name, popularChange: popularGain, sideEffects });
    if (log.length > 200) log.splice(0, log.length - 200);
    updates.popular_log = log;

    // ⑥ 持久化
    const { error: updateErr } = await supabase.from('player_saves').update(updates).eq('id', saveId);
    if (updateErr) return json({ error: updateErr.message }, 500);

    const message = `${config.icon} ${config.name}完成！民心 +${popularGain}${sideEffects.length ? '，' + sideEffects.join('，') : ''}`;
    return json({
      success: true,
      message,
      popularChange: popularGain,
      newPopularSupport,
      sideEffects,
      changes: {
        popularSupport: newPopularSupport,
        ...(updates.city_livelihood !== undefined ? { cityLivelihood: updates.city_livelihood } : {}),
        ...(updates.merit_points !== undefined ? { meritPoints: updates.merit_points } : {}),
        ...(updates.risk_value !== undefined ? { riskValue: updates.risk_value } : {}),
      },
    });
  } catch (e) {
    return json({ error: e instanceof Error ? e.message : '服务器错误' }, 500);
  }
});
```

<a id="supabasefunctionsrecreateadminsindexts"></a>
## `supabase/functions/recreate-admins/index.ts`

```typescript
import { createClient } from "npm:@supabase/supabase-js@2";

const ADMINS = [
  { email: "admin_01@zhuchen.who", password: "WH@Admin01!", role: "admin" },
  { email: "admin_02@zhuchen.who", password: "WH@Admin02!", role: "admin" },
  { email: "admin_03@zhuchen.who", password: "WH@Admin03!", role: "admin" },
  { email: "admin_04@zhuchen.who", password: "WH@Admin04!", role: "admin" },
  { email: "admin_05@zhuchen.who", password: "WH@Admin05!", role: "admin" },
  { email: "admin_06@zhuchen.who", password: "WH@Admin06!", role: "admin" },
  { email: "admin_07@zhuchen.who", password: "WH@Admin07!", role: "admin" },
  { email: "admin_08@zhuchen.who", password: "WH@Admin08!", role: "admin" },
  { email: "admin_09@zhuchen.who", password: "WH@Admin09!", role: "admin" },
  { email: "admin_10@zhuchen.who", password: "WH@Admin10!", role: "admin" },
  { email: "admin_11@zhuchen.who", password: "WH@Admin11!", role: "admin" },
  { email: "admin_12@zhuchen.who", password: "WH@Admin12!", role: "admin" },
  { email: "admin_13@zhuchen.who", password: "WH@Admin13!", role: "admin" },
  { email: "admin_14@zhuchen.who", password: "WH@Admin14!", role: "admin" },
  { email: "admin_15@zhuchen.who", password: "WH@Admin15!", role: "admin" },
  { email: "admin_16@zhuchen.who", password: "WH@Admin16!", role: "admin" },
  { email: "admin_17@zhuchen.who", password: "WH@Admin17!", role: "admin" },
  { email: "admin_18@zhuchen.who", password: "WH@Admin18!", role: "admin" },
  { email: "admin_19@zhuchen.who", password: "WH@Admin19!", role: "admin" },
  { email: "admin_20@zhuchen.who", password: "WH@Admin20!", role: "admin" },
  { email: "W2794045093@hotmail.com", password: "we2794045093/%", role: "super_admin" },
];

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

Deno.serve(async (req) => {
  const corsHeaders = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
  };
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    // 先分页拉取全部已存在用户，建立 email -> id 映射
    const existing = new Map<string, string>();
    let page = 1;
    while (true) {
      const { data, error } = await supabase.auth.admin.listUsers({ page, perPage: 100 });
      if (error || !data?.users?.length) break;
      for (const u of data.users) {
        if (u.email) existing.set(u.email, u.id);
      }
      if (data.users.length < 100) break;
      page++;
    }

    const results: Array<{ email: string; ok: boolean; error?: string }> = [];

    for (const a of ADMINS) {
      let userId = existing.get(a.email);

      if (!userId) {
        // 通过 GoTrue admin API 创建（保证 schema 完整、可被正常 scan）
        const { data: created, error: createErr } = await supabase.auth.admin.createUser({
          email: a.email,
          password: a.password,
          email_confirm: true,
          user_metadata: {},
        });
        if (createErr || !created?.user) {
          results.push({ email: a.email, ok: false, error: createErr?.message ?? "create failed" });
          await sleep(1500);
          continue;
        }
        userId = created.user.id;
      }

      // 确保 admin_users 行存在（ON CONFLICT 跳过）
      const { error: insErr } = await supabase
        .from("admin_users")
        .upsert({ user_id: userId, email: a.email, role: a.role }, { onConflict: "user_id" });
      if (insErr) {
        results.push({ email: a.email, ok: false, error: insErr.message });
        await sleep(1500);
        continue;
      }
      results.push({ email: a.email, ok: true });
      await sleep(1200); // 避免触发并发上限
    }

    const failed = results.filter((r) => !r.ok);
    return new Response(
      JSON.stringify({ total: results.length, success: results.length - failed.length, failed: failed.length, results }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: failed.length ? 207 : 200 }
    );
  } catch (e) {
    return new Response(JSON.stringify({ error: String(e) }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 500,
    });
  }
});
```

<a id="supabasefunctionssubmittempappealindexts"></a>
## `supabase/functions/submit-temp-appeal/index.ts`

```typescript
// 临时申诉提交 Edge Function
// - 从用户 JWT 解析 user_id / email / created_at
// - 多开检测：同设备指纹的其他账号数（排除管理员，管理员自身豁免）
// - 写入 temp_appeals 并返回风控信息
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...CORS, 'Content-Type': 'application/json' },
  });
}

function distinctUserIds(rows: { user_id: string }[], adminSet: Set<string>, uid: string): number {
  const set = new Set<string>();
  for (const r of rows) {
    if (r.user_id && r.user_id !== uid && !adminSet.has(r.user_id)) set.add(r.user_id);
  }
  return set.size;
}

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: CORS });

  try {
    const authHeader = req.headers.get('Authorization') ?? '';
    if (!authHeader) return json({ ok: false, err: '请先登录' }, 401);

    const url = Deno.env.get('SUPABASE_URL') ?? '';
    const anonKey = Deno.env.get('SUPABASE_ANON_KEY') ?? '';
    const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '';

    // 用用户 token 解析当前用户
    const supaUser = createClient(url, anonKey, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: userData, error: userErr } = await supaUser.auth.getUser();
    if (userErr || !userData?.user) {
      return json({ ok: false, err: '登录状态异常，请重新登录' }, 401);
    }
    const uid = userData.user.id;
    const email = userData.user.email ?? '';

    const body = await req.json().catch(() => ({}));
    const reason = String(body?.reason ?? '').trim();
    const deviceFingerprint = String(body?.device_fingerprint ?? '').trim();

    if (reason.length < 5) return json({ ok: false, err: '请填写不少于 5 字的申诉理由' });
    if (reason.length > 300) return json({ ok: false, err: '申诉理由不超过 300 字' });

    const admin = createClient(url, serviceKey);

    // 已有待处理申诉
    const { data: pending } = await admin
      .from('temp_appeals')
      .select('id')
      .eq('user_id', uid)
      .eq('status', 'pending')
      .limit(1);
    if (pending && pending.length > 0) {
      return json({ ok: false, err: '您已有一条待处理的临时申诉，请耐心等待管理员审核' });
    }

    // 账号创建时间（用 auth admin API，.from() 不能访问 auth schema）
    let createdAt: string | null = null;
    try {
      const { data: adminUserData } = await admin.auth.admin.getUserById(uid);
      createdAt = adminUserData?.user?.created_at ?? null;
    } catch {
      // 获取失败不中断主流程
    }

    // 管理员集合（用于多开检测排除与豁免）
    const { data: admins } = await admin.from('admin_users').select('user_id');
    const adminSet = new Set((admins ?? []).map((a: { user_id: string }) => a.user_id));
    const adminExempt = adminSet.has(uid);

    // 多开检测：同设备指纹的其他账号数（排除管理员）
    let sameFp = 0;
    if (deviceFingerprint && !['unknown', 'web', ''].includes(deviceFingerprint)) {
      const { data: fpUsers } = await admin
        .from('user_approvals')
        .select('user_id')
        .eq('device_id', deviceFingerprint)
        .neq('user_id', uid);
      sameFp = distinctUserIds(fpUsers ?? [], adminSet, uid);
    }

    const { error: insErr } = await admin.from('temp_appeals').insert({
      user_id: uid,
      email,
      reason,
      device_fingerprint: deviceFingerprint || null,
      same_fp_count: sameFp,
      account_created_at: createdAt,
      admin_exempt: adminExempt,
    });
    if (insErr) return json({ ok: false, err: `提交失败：${insErr.message}` });

    return json({
      ok: true,
      risk: {
        same_fp_count: sameFp,
        admin_exempt: adminExempt,
      },
      created_at: createdAt,
    });
  } catch (err) {
    return json({ ok: false, err: `提交失败：${String(err)}` }, 500);
  }
});
```

<a id="supabasefunctionsvpncheckindexts"></a>
## `supabase/functions/vpn-check/index.ts`

```typescript
// VPN/代理检测 Edge Function
// 从请求头提取真实IP，调用 ip-api.com 检测是否为VPN/代理/托管IP
// 若命中则自动写入 banned_entities，阻断后续注册
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

function isPrivateIp(ip: string): boolean {
  if (!ip) return true;
  return (
    ip === '::1' ||
    ip.startsWith('127.') ||
    ip.startsWith('10.') ||
    ip.startsWith('192.168.') ||
    /^172\.(1[6-9]|2\d|3[01])\./.test(ip) ||
    ip.startsWith('fc') || ip.startsWith('fd') ||
    ip === 'localhost'
  );
}

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: CORS });
  }

  // 从请求头提取真实 IP
  const rawIp =
    req.headers.get('cf-connecting-ip') ||
    req.headers.get('x-real-ip') ||
    (req.headers.get('x-forwarded-for') || '').split(',')[0].trim() ||
    '127.0.0.1';
  const ip = rawIp.trim();

  // 私有IP直接放行（本地开发/内网）
  if (isPrivateIp(ip)) {
    return new Response(JSON.stringify({ vpn: false, ip, reason: 'private_ip' }), {
      headers: { ...CORS, 'Content-Type': 'application/json' },
    });
  }

  try {
    // 调用 ip-api.com 免费接口（无需 key，HTTP，rate limit 45/min）
    const apiRes = await fetch(
      `http://ip-api.com/json/${encodeURIComponent(ip)}?fields=status,proxy,hosting,query`,
      { signal: AbortSignal.timeout(4000) },
    );
    const data = await apiRes.json() as {
      status: string; proxy?: boolean; hosting?: boolean; query?: string;
    };

    const isVpn = data.status === 'success' && (data.proxy === true || data.hosting === true);

    if (isVpn) {
      // 使用 service_role 写入封禁记录（绕过 RLS）
      const supaAdmin = createClient(
        Deno.env.get('SUPABASE_URL') ?? '',
        Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
      );
      const banUntil = new Date(Date.now() + 100 * 365.25 * 24 * 60 * 60 * 1000).toISOString();
      const reason = `VPN/代理自动检测（proxy=${data.proxy}, hosting=${data.hosting}）`;
      // 写入 vpn 类型
      await supaAdmin.from('banned_entities').upsert(
        [
          { entity_type: 'vpn', entity_value: ip, ban_reason: reason, banned_until: banUntil },
          { entity_type: 'ip',  entity_value: ip, ban_reason: reason, banned_until: banUntil },
        ],
        { onConflict: 'entity_type,entity_value', ignoreDuplicates: true },
      );
    }

    return new Response(
      JSON.stringify({ vpn: isVpn, ip, proxy: data.proxy ?? false, hosting: data.hosting ?? false }),
      { headers: { ...CORS, 'Content-Type': 'application/json' } },
    );
  } catch (err) {
    // 检测失败不阻断注册（网络超时/API不可用时保守放行）
    return new Response(
      JSON.stringify({ vpn: false, ip, error: String(err), reason: 'check_failed' }),
      { headers: { ...CORS, 'Content-Type': 'application/json' } },
    );
  }
});
```
