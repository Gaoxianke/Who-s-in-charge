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