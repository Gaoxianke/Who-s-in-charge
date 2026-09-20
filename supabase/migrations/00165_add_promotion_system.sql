-- ============ player_saves 晋升系统字段 ============
ALTER TABLE player_saves
  ADD COLUMN IF NOT EXISTS promotion_frozen boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS break_rule_used smallint NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS break_rule_observe_days smallint NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS promotion_window_locked boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS watched_post text,
  ADD COLUMN IF NOT EXISTS pending_promotion boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS competition_id text,
  ADD COLUMN IF NOT EXISTS lost_priority boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS appointment_doc_no text,
  ADD COLUMN IF NOT EXISTS last_promotion_day integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS prestige_flag boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS clique_flag boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS base_tenure_years smallint NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS leader_obstruct boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS patron_id text,
  ADD COLUMN IF NOT EXISTS patron_favor smallint NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS patron_expire_day integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS bribe_log jsonb NOT NULL DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS bribe_count smallint NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS last_bribe_day integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS patronage boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS illicit_funds numeric NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS illicit_source_log jsonb NOT NULL DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS laundering_log jsonb NOT NULL DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS funds_hiding text,
  ADD COLUMN IF NOT EXISTS promo_log jsonb NOT NULL DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS next_priority_bonus smallint NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS observation_days smallint NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS rooting_days smallint NOT NULL DEFAULT 0;

-- ============ 岗位编制表（NPC 站位机制）============
CREATE TABLE npc_posts (
  post_key text PRIMARY KEY,
  save_id uuid NOT NULL REFERENCES player_saves(id) ON DELETE CASCADE,
  tier smallint NOT NULL,
  post_name text NOT NULL,
  occupant_name text,
  occupant_age smallint,
  tenure_end_day integer,
  integrity smallint,
  status text NOT NULL DEFAULT 'occupied',
  vacancy_start_day integer,
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE npc_posts ENABLE ROW LEVEL SECURITY;
CREATE POLICY "npc_posts_owner" ON npc_posts FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM player_saves WHERE id = npc_posts.save_id AND user_id = auth.uid()))
  WITH CHECK (EXISTS (SELECT 1 FROM player_saves WHERE id = npc_posts.save_id AND user_id = auth.uid()));

-- ============ NPC 候选池表 ============
CREATE TABLE npc_candidates (
  candidate_key text PRIMARY KEY,
  save_id uuid NOT NULL REFERENCES player_saves(id) ON DELETE CASCADE,
  tier smallint NOT NULL,
  name text NOT NULL,
  merit_score smallint NOT NULL DEFAULT 50,
  popularity_score smallint NOT NULL DEFAULT 50,
  assess_score smallint NOT NULL DEFAULT 50,
  favor_score smallint NOT NULL DEFAULT 50,
  age smallint NOT NULL DEFAULT 40,
  tenure_years smallint NOT NULL DEFAULT 3,
  integrity smallint NOT NULL DEFAULT 70,
  in_competition boolean NOT NULL DEFAULT false,
  status text NOT NULL DEFAULT 'standby',
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE npc_candidates ENABLE ROW LEVEL SECURITY;
CREATE POLICY "npc_candidates_owner" ON npc_candidates FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM player_saves WHERE id = npc_candidates.save_id AND user_id = auth.uid()))
  WITH CHECK (EXISTS (SELECT 1 FROM player_saves WHERE id = npc_candidates.save_id AND user_id = auth.uid()));

-- ============ 统一配置表：晋升规则（复用 game_config）============
INSERT INTO game_config (key, value, description) VALUES
  -- 职级段适龄区间（tier: 1=基层1-3, 2=区县级4-6, 3=市级7-9, 4=省级10-11, 5=高层12-15）
  ('promo_age_tier1', '{"ageMin":22,"ageMax":35,"bestMin":26,"bestMax":30,"retireAge":55}', '基层(1-3级)适龄区间'),
  ('promo_age_tier2', '{"ageMin":30,"ageMax":45,"bestMin":34,"bestMax":40,"retireAge":58}', '区县级(4-6级)适龄区间'),
  ('promo_age_tier3', '{"ageMin":38,"ageMax":52,"bestMin":42,"bestMax":48,"retireAge":60}', '市级(7-9级)适龄区间'),
  ('promo_age_tier4', '{"ageMin":45,"ageMax":58,"bestMin":48,"bestMax":53,"retireAge":62}', '省级(10-11级)适龄区间'),
  ('promo_age_tier5', '{"ageMin":50,"ageMax":65,"bestMin":55,"bestMax":60,"retireAge":65}', '高层(12-15级)适龄区间'),
  -- 年龄红利
  ('promo_age_bonus', '{"bestBonus":5,"lowAgeBonus":10,"overAgeGraceYears":5}', '年龄红利与超龄规则'),
  -- 民心门槛（按tier）
  ('promo_popular_threshold', '{"tier1":30,"tier2":35,"tier3":40,"tier4":45,"tier5":50}', '各职级段民心门槛'),
  -- 上级认可度门槛
  ('promo_favor_threshold', '{"min":50,"breakMin":70,"closeFlag":85,"obstructMax":40}', '上级认可度门槛'),
  -- 竞争权重
  ('promo_competition_weights', '{"merit":0.4,"popular":0.3,"assess":0.2,"favor":0.1}', '竞争综合评分权重'),
  -- 基层任期系数
  ('promo_base_tenure', '{"requireYears":5,"factorLt5":0.8,"factorLt3":0.9}', '基层任期要求与系数'),
  -- 破格规则
  ('promo_break_rule', '{"meritMultiple":1.5,"minYears":1,"observeDays":90,"extendObserveDays":180,"favorMin":70,"lowPopularThreshold":40,"lowPopularPenalty":10,"publicOpinion":20,"maxUsePerTier":1}', '破格提升规则'),
  -- 考评加速
  ('promo_assess_accel', '{"excellent":0.10,"excellent2":0.125,"special":0.13,"special2":0.15}', '考评加速减免比例'),
  -- 晋升冻结
  ('promo_freeze', '{"popularFreeze":30,"popularEnd":0,"frozenDays":180,"rootingDays":90,"rootingExtendDays":180,"rootingExtendThreshold":30,"promotePopularCost":5}', '晋升冻结与扎根期'),
  -- 岗位编制
  ('promo_post_quota', '{"tier1":6,"tier2":5,"tier3":4,"tier4":3,"tier5":42}', '各级别岗位编制数'),
  ('promo_post_composition', '{"tier1":["基层职员","基层职员","基层副职","基层副职","基层正职","专项岗"],"tier2":["副职","副职","正职","正职","专项岗"],"tier3":["副职","副职","正职","正职"],"tier4":["副职","副职","正职"],"tier5":["核心岗位","核心岗位","核心岗位","核心岗位","核心岗位","核心岗位","核心岗位","核心岗位","核心岗位","核心岗位","核心岗位","核心岗位","核心岗位","核心岗位","核心岗位","部级岗位","部级岗位","部级岗位","部级岗位","部级岗位","部级岗位","部级岗位","部级岗位","部级岗位","部级岗位","部级岗位","部级岗位","部级岗位","部级岗位","部级岗位","部级岗位","部级岗位","部级岗位","部级岗位","部级岗位","部级岗位","部级岗位","部级岗位","部级岗位","委员岗位","委员岗位","委员岗位"]}', '岗位构成'),
  -- 公示期
  ('promo_publicity', '{"days":30,"democraticMin":60,"publicityDays":7,"extendDays":7}', '公示期与民主推荐'),
  -- 洗白方式
  ('promo_laundering', '{"methods":[{"id":"card","name":"消费卡套现","unlockRank":5,"fee":0.15,"days":15,"risk":"low","baseProb":3},{"id":"relative","name":"亲属代持","unlockRank":4,"fee":0.10,"days":30,"risk":"mid","baseProb":8},{"id":"invest","name":"投资理财","unlockRank":9,"fee":0.10,"days":90,"risk":"mid","baseProb":8},{"id":"shell","name":"空壳公司","unlockRank":8,"fee":0.20,"days":60,"risk":"mid","baseProb":8},{"id":"overseas","name":"境外账户","unlockRank":10,"fee":0.25,"days":120,"risk":"high","baseProb":15},{"id":"antique","name":"古董字画","unlockRank":13,"fee":0.30,"days":180,"risk":"low","baseProb":3},{"id":"crypto","name":"加密货币","unlockRank":12,"fee":0.05,"days":7,"risk":"extreme","baseProb":25}],"riskDivisor":10,"recoveryRange":[10,50]}', '洗白七种方式'),
  -- 藏匿方式
  ('promo_hiding', '{"methods":[{"id":"cash","name":"现金藏匿","recoveryRate":0.70},{"id":"safe","name":"保险柜","recoveryRate":0.50},{"id":"relative","name":"亲属保管","recoveryRate":0.30}],"extraRecovery":0.10}', '赃款藏匿方式'),
  -- 非正式资源协调
  ('promo_coordination', '{"tiers":[{"id":"small","name":"小额·礼品礼金","amountMin":10000,"amountMax":50000,"favorGain":5,"scoreGain":3},{"id":"medium","name":"中额·消费卡/安排家属","amountMin":100000,"amountMax":500000,"favorGain":12,"scoreGain":8},{"id":"large","name":"大额·干股/项目分成","amountMin":1000000,"amountMax":5000000,"favorGain":20,"scoreGain":12},{"id":"huge","name":"巨额·境外账户/房产","amountMin":10000000,"amountMax":99999999,"favorGain":30,"scoreGain":15}],"baseProb":5,"largeBonus":10,"hugeBonus":20,"integrityHighBonus":10,"freqBonus":3,"riskPer10":2,"illicitExtraProb":5,"patronageTiers":["large","huge"]}', '非正式资源协调分档与风险'),
  -- 功高盖主
  ('promo_prestige', '{"popularMin":90,"consecutiveYears":2,"meritMultiple":1.5,"favorMonthlyDecay":2,"scorePenalty":10,"patronHalveDecay":1,"mitigateLowkey":{"popular":-5,"favor":10},"mitigateReport":{"favor":5},"mitigateShare":{"merit":-100,"favor":8}}', '功高盖主规则'),
  -- 非正式关系密切
  ('promo_clique', '{"favorThreshold":85,"meritPenalty":200,"popularPenalty":10,"freezeDays":180,"cutFavor":-15,"cooperateMerit":-50,"investigateMerit":-50}', '非正式关系密切规则'),
  -- 领导干扰
  ('promo_leader_obstruct', '{"favorBelow":40,"competitorBonus":10,"playerPenalty":10,"counterMerit":500,"counterFund":50,"counterProb":0.30,"counterCompensation":100}', '领导干扰晋升规则'),
  -- 越级赏识
  ('promo_patron', '{"meritMultiple":1.2,"popularMin":80,"baseProb":5,"probGrowth":1,"probCap":20,"scoreBonus":8,"favorGain":10,"meritGain":30,"meritPraise":20,"popularPraise":5,"meritBorrow":50,"borrowDays":90,"favorPenalty":10,"disappointFavor":-20,"lowPopularEnd":50,"consecutiveFailYears":2,"extraBreakChance":1}', '越级赏识规则'),
  -- NPC 成长与衰减
  ('promo_npc_growth', '{"monthlyGrowthMin":0.2,"monthlyGrowthMax":0.5,"ageDecayMonthly":0.5,"integrityLow":40,"retireCheckAge":55,"fallIntegrity":30,"fallProb":0.05}', 'NPC成长衰减规则'),
  -- 五步流程
  ('promo_flow', '{"interviewOptions":[{"key":"fact","label":"谈成绩、摆事实","score":3},{"key":"plan","label":"谈打算、表决心","score":2},{"key":"humble","label":"表谦虚、求指导","score":1}],"democraticMin":60,"publicityDays":7,"extendDays":7,"popularCost":5,"rootingDays":90}', '晋升五步流程参数')
ON CONFLICT (key) DO NOTHING;