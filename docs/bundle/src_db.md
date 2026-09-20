# src/db

共 2 个文件。
<a id="srcdbgameapits"></a>
## `src/db/gameApi.ts`

```typescript
// 游戏数据库操作API
import { supabase } from '@/client/supabase';
import { ensureNpcNamePoolLoaded, pickNpcName, pickGivenName } from '@/lib/npcNamePool';
import { getSelectedDatabaseCode, setSelectedDatabaseCode } from '@/lib/gameDatabase';
import type { PlayerSave, Subordinate, BossTask, EventRecord, PoliceCase, FamilyMember, DeptKey, MonthlyMeeting, MeetingTask, Secretary, CityFinance, LoanRecord, InvestmentRecord, RecruitCandidate, MonthlyReport, LeadershipMember, PetitionEvent, LeadershipBand, PlayerHealth, PartySchoolRecord, PartySchoolLevel, NationalPolicy, CityMetrics, CareerEntry } from '@/types/game';
import {
  TASK_TEMPLATES, INIT_TASKS, TASK_CONSTRAINTS, BOSS_CONSTRAINTS,
  BOSS_ACTIONS, getBossStyle, computeFavorDelta, type ActionType,
} from '@/config/bossTaskConfig';
import { RANK_CONFIG, DEFAULT_CITY_BY_LEVEL, SUB_TRAITS, DEPT_CONFIG, getDeptHeadTitle, getDeptDeputyTitle, getDeptNameByRank, getDeptPositionSubLevel, getDeptStaffRange, getZhongXuanDiaoStartRank, BAND_POSITIONS, GOVT_POSITIONS, NDA_POSITIONS, NPC_AGE_RANGE, RETIREMENT_AGE_MAP, PARTY_SCHOOL_CONFIG, NATIONAL_POLICY_POOL, randBirthPlace, pickUniversityName, npcSchoolTier, npcDegreeLabel, PROVINCE_LIST, PROVINCE_CITY_MAP, randRealStartTown, randRealStartTownByProvCity, RANK_INITIAL_FUND, RANK_MONTHLY_HEALTH_REGEN, RANK_DAILY_ENERGY_BONUS, ASSET_HEALTH_BONUS } from '@/types/game';

// 转换数据库行到PlayerSave
function rowToPlayerSave(row: Record<string, unknown>): PlayerSave {
  return {
    id: row.id as string,
    userId: row.user_id as string,
    playerName: row.player_name as string,
    playerGender: (row.player_gender as string) ?? '男',
    playerAge: (row.player_age as number) ?? 22,
    playerBirthDay: (row.player_birth_day as number) ?? 0,
    avatarId: (row.avatar_id as number) ?? 0,
    school: (row.school as string) ?? '普通本科',
    needsCharacterCreation: (row.needs_character_creation as boolean) ?? true,
    // 个人档案
    birthYear:        (row.birth_year as number) ?? 0,
    birthProvince:    (row.birth_province as string) ?? '',
    birthCity:        (row.birth_city as string) ?? '',
    universityName:   (row.university_name as string) ?? '',
    rankLevel: row.rank_level as number,
    rankName: row.rank_name as string,
    meritPoints: row.merit_points as number,
    moralValue: row.moral_value as number,
    assessmentGrade: row.assessment_grade as PlayerSave['assessmentGrade'],
    tenureYears: row.tenure_years as number,
    tenureDays: row.tenure_days as number,
    maxTenureYears: row.max_tenure_years as number,
    gameDays: row.game_days as number,
    cityName: row.city_name as string,
    cityGdp: row.city_gdp as number,
    cityLivelihood: row.city_livelihood as number,
    cityEcology: row.city_ecology as number,
    cityBusiness: row.city_business as number,
    policeForce: row.police_force as number,
    securityIndex: row.security_index as number,
    policeChiefName: row.police_chief_name as string | null,
    reformFaction: row.reform_faction as number,
    pragmaticFaction: row.pragmatic_faction as number,
    cylRelation: (row.cyl_relation as number) ?? 30,
    technoRelation: (row.techno_relation as number) ?? 30,
    localRelation: (row.local_relation as number) ?? 30,
    primaryFaction: (row.primary_faction as string) ?? '',
    // ── 派系系统 v2 新字段（§6）──────────────────────────────
    factionInfluence: (row.faction_influence as number) ?? 0,
    politicalWind: ((row.political_wind as string) ?? 'balanced') as import('@/types/game').PoliticalWind,
    dominantFaction: (row.dominant_faction as string ?? null) as import('@/types/game').FactionId | null,
    lastWindCycleDay: (row.last_wind_cycle_day as number) ?? 0,
    factionIntelligence: (row.faction_intelligence as number) ?? 0,
    factionCooldowns: (row.faction_cooldowns as Record<string, number>) ?? {},
    coalitions: (row.coalitions as import('@/types/game').FactionCoalition[]) ?? [],
    purgeCount: (row.purge_count as number) ?? 0,
    factionJoinedDay: (row.faction_joined_day as number) ?? 0,
    isFlagged: Boolean(row.is_flagged),
    contactAttempts: (row.contact_attempts as number) ?? 0,
    factionlessLocked: Boolean(row.factionless_locked),
    factionPromotionLocked: Boolean(row.faction_promotion_locked),
    strugglePhase: ((row.struggle_phase as string) ?? 'idle') as import('@/types/game').StrugglePhase,
    struggleHistory: (row.struggle_history as import('@/types/game').FactionStruggle[]) ?? [],
    factionEchoLog: (row.faction_echo_log as import('@/types/game').FactionEcho[]) ?? [],
    regionControl: (row.region_control as Record<string, Record<import('@/types/game').FactionId, number>>) ?? {},
    factionTreasury: (row.faction_treasury as Record<import('@/types/game').FactionId, number>) ?? {} as Record<import('@/types/game').FactionId, number>,
    cultivateTier: (row.cultivate_tier as Record<string, '门生' | '骨干' | '心腹'>) ?? {},
    cultivateBinding: (row.cultivate_binding as Record<string, string>) ?? {},
    strugglePrep: (row.struggle_prep as import('@/types/game').StrugglePrep) ?? { proxy: 0, media: 0, discord: 0, preempt: 0, successor: 0 },
  // ── 派系晋升联动新增字段（双轨胜利 / 位置棋盘 / 委托 / 密谋）──
  boardSeats: (row.board_seats as import('@/types/game').PositionSeat[]) ?? [],
  promotionContest: (row.promotion_contest as import('@/types/game').PromotionContest) ?? null,
  contestHistory: (row.contest_history as import('@/types/game').ContestRecord[]) ?? [],
  factionMandates: (row.faction_mandates as import('@/types/game').FactionMandate[]) ?? [],
  covertExposedCount: (row.covert_exposed_count as number) ?? 0,
  defectCooldownUntilDay: (row.defect_cooldown_until_day as number) ?? 0,
  factionSetbackUntilDay: (row.faction_setback_until_day as number) ?? 0,
  mandateRejectCooldownUntilDay: (row.mandate_reject_cooldown_until_day as number) ?? 0,
  lastMandateYear: (row.last_mandate_year as number) ?? -1,
  // ── v4 派系玩法：省级席位 + 个人职位战 ──
  provinceSeatControl: (row.province_seat_control as Record<string, import('@/types/game').FactionId | null>) ?? {},
  personalContestCooldownUntil: (row.personal_contest_cooldown_until as number) ?? 0,
  personalContestHistory: (row.personal_contest_history as import('@/types/game').ContestDetail[]) ?? [],
  // ── v5 新增字段读取 ──
  provinceAttackProgress: (row.province_attack_progress as Record<string, number>) ?? {},
  contestMode: ((row.contest_mode as string) ?? 'direct') as import('@/types/game').ContestMode,
  lastPromotionCycleId: (row.last_promotion_cycle_id as number) ?? 0,
  // ── v6 扩展玩法字段读取 ──
  cycleContestWins: (row.cycle_contest_wins as number) ?? 0,
  cycleContribution: (row.cycle_contribution as number) ?? 0,
  setbackImmunity: (row.setback_immunity as number) ?? 0,
    bossName: row.boss_name as string,
    bossFavor: row.boss_favor as number,
    requiredMerit: row.required_merit as number,
    requiredTenureYears: row.required_tenure_years as number,
    isPromotionAvailable: row.is_promotion_available as boolean,
    isEventPending: row.is_event_pending as boolean,
    familyHappiness: (row.family_happiness as number) ?? 50,
    marriageStatus: (row.marriage_status as PlayerSave['marriageStatus']) ?? 'single',
    eventsThisYear: (row.events_this_year as number) ?? 0,
    lastRankDay: (row.last_rank_day as number) ?? 0,
    annualRankPct: (row.annual_rank_pct as number) ?? 50,
    isExcellentRank: (row.is_excellent_rank as boolean) ?? false,
    cityPopulation: (row.city_population as number) ?? 50000,
    residentIncome: (row.resident_income as number) ?? 50,
    eduLevel: (row.edu_level as number) ?? 50,
    healthcareRate: (row.healthcare_rate as number) ?? 50,
    housingRate: (row.housing_rate as number) ?? 50,
    fundBalance: (row.fund_balance as number) ?? 0,
    boss2Name: (row.boss2_name as string) ?? '',
    boss2Favor: (row.boss2_favor as number) ?? 50,
    boss3Name: (row.boss3_name as string) ?? '',
    boss3Favor: (row.boss3_favor as number) ?? 50,
    lastRecruitYear: (row.last_recruit_year as number) ?? 0,
    lastRecruitQuarter: (row.last_recruit_quarter as number) ?? 0,
    cityTaxRate: (row.city_tax_rate as number) ?? 0.12,
    cityTaxIncome: (row.city_tax_income as number) ?? 0,
    taxRevenue: (row.tax_revenue as number) ?? 0,
    lastMonthDay: (row.last_month_day as number) ?? 0,
    kpiGdpTarget: (row.kpi_gdp_target as number) ?? 0,
    kpiLivelihoodTarget: (row.kpi_livelihood_target as number) ?? 0,
    kpiEcologyTarget: (row.kpi_ecology_target as number) ?? 0,
    kpiBusinessTarget: (row.kpi_business_target as number) ?? 0,
    kpiYear: (row.kpi_year as number) ?? 0,
    subVisitPending: (row.sub_visit_pending as boolean) ?? false,
    subVisitSubId: (row.sub_visit_sub_id as string) ?? null,
    subVisitSubName: (row.sub_visit_sub_name as string) ?? null,
    lastPersonnelYear: (row.last_personnel_year as number) ?? 0,
    deptReportDay: (row.dept_report_day as number) ?? 0,
    lastExchangeDay: (row.last_exchange_day as number) ?? 0,
    lastMinistryRotateDay: (row.last_ministry_rotate_day as number) ?? 0,
    spouseRelationValue: (row.spouse_relation_value as number) ?? 50,
    marriageDay: (row.marriage_day as number) ?? 0,
    playerPosition: (row.player_position as string) ?? (row.rank_name as string) ?? '',
    concurrentPosts: (row.concurrent_posts as string[]) ?? [],
    voteSupport: (row.vote_support as number) ?? 0,
    lastVoteDay: (row.last_vote_day as number) ?? 0,
    partyCongressVote: (row.party_congress_vote as number) ?? 0,
    lastPartyCongressDay: (row.last_party_congress_day as number) ?? 0,
    nationalTermsServed: (row.national_terms_served as number) ?? 0,
    careerPath: (row.career_path as string) ?? '',
    nationalGdp: (row.national_gdp as number) ?? 1200000,
    sciTechInvestTotal: (row.sci_tech_invest_total as number) ?? 0,
    sciTechResearchDir: (row.sci_tech_research_dir as string) ?? '',
    sciTechProgress: (row.sci_tech_progress as number) ?? 0,
    sciTechLastActDay: (row.sci_tech_last_act_day as number) ?? 0,
    disciplineLastActDay: (row.discipline_last_act_day as number) ?? 0,
    kpiRankingYear: (row.kpi_ranking_year as number) ?? 0,
    kpiRankingResult: (row.kpi_ranking_result as string) ?? '',
    lastAnnualPromoteYear: (row.last_annual_promote_year as number) ?? 0,
    personalSavings: (row.personal_savings as number) ?? 0,
    personalAssets: (row.personal_assets as string[]) ?? [],
    lastSalaryDay: (row.last_salary_day as number) ?? 0,
    providentFundBalance: (row.provident_fund_balance as number) ?? 0,
    lastAnnualBonusDay: (row.last_annual_bonus_day as number) ?? 0,
    retirementDelayYears: (row.retirement_delay_years as number) ?? 0,
    isRetired: (row.is_retired as boolean) ?? false,
    // 上司生命周期
    bossTenureStart: (row.boss_tenure_start as number) ?? 0,
    bossTenureDuration: (row.boss_tenure_duration as number) ?? 1460,
    boss2TenureStart: (row.boss2_tenure_start as number) ?? 0,
    boss2TenureDuration: (row.boss2_tenure_duration as number) ?? 1460,
    boss3TenureStart: (row.boss3_tenure_start as number) ?? 0,
    boss3TenureDuration: (row.boss3_tenure_duration as number) ?? 1460,
    // 纪委风险追踪
    lastDisciplineWarnDay: (row.last_discipline_warn_day as number) ?? 0,
    lastCaseCheckDay: (row.last_case_check_day as number) ?? 0,
    // 重大事故风险
    consecutiveFailEvents: (row.consecutive_fail_events as number) ?? 0,
    consecutiveExcellentYears: (row.consecutive_excellent_years as number) ?? 0,
    // 贪腐玩法系统
    riskValue: (row.risk_value as number) ?? 0,
    clueLevel: (row.clue_level as number) ?? 0,
    counterIntel: (row.counter_intel as number) ?? 10,
    illegalWealth: (Number(row.illegal_wealth as number) ?? 0),
    testimonyChain: (row.testimony_chain as number) ?? 0,
    caseHistory: (row.case_history as number) ?? 0,
    custodyDays: (row.custody_days as number) ?? 0,
    illicitLog: (row.illicit_log as PlayerSave['illicitLog']) ?? [],
    transferLog: (row.transfer_log as PlayerSave['transferLog']) ?? [],
    assetHiding: (row.asset_hiding as PlayerSave['assetHiding']) ?? [],
    investState: (row.invest_state as PlayerSave['investState']) ?? 'none',
    lastInterrogationDay: (row.last_interrogation_day as number) ?? 0,
    caseStartDay: (row.case_start_day as number) ?? 0,
    // 民心修行系统
    popularSupport: (row.popular_support as number) ?? 50,
    popularLog: (row.popular_log as PlayerSave['popularLog']) ?? [],
    popularActionCooldowns: (row.popular_action_cooldowns as PlayerSave['popularActionCooldowns']) ?? {},
    deptPolicyCooldowns: (row.dept_policy_cooldowns as PlayerSave['deptPolicyCooldowns']) ?? {},
    // 晋升系统 v2
    promotion_frozen: Boolean(row.promotion_frozen),
    break_rule_used: Number(row.break_rule_used) ?? 0,
    break_rule_observe_days: Number(row.break_rule_observe_days) ?? 0,
    promotion_window_locked: Boolean(row.promotion_window_locked),
    watched_post: (row.watched_post as string) ?? null,
    pending_promotion: Boolean(row.pending_promotion),
    competition_id: (row.competition_id as string) ?? null,
    lost_priority: Boolean(row.lost_priority),
    appointment_doc_no: (row.appointment_doc_no as string) ?? null,
    last_promotion_day: Number(row.last_promotion_day) ?? 0,
    prestige_flag: Boolean(row.prestige_flag),
    clique_flag: Boolean(row.clique_flag),
    base_tenure_years: Number(row.base_tenure_years) ?? 0,
    leader_obstruct: Boolean(row.leader_obstruct),
    patron_id: (row.patron_id as string) ?? null,
    patron_favor: Number(row.patron_favor) ?? 0,
    patron_expire_day: Number(row.patron_expire_day) ?? 0,
    bribe_log: (row.bribe_log as PlayerSave['bribe_log']) ?? [],
    bribe_count: Number(row.bribe_count) ?? 0,
    last_bribe_day: Number(row.last_bribe_day) ?? 0,
    patronage: Boolean(row.patronage),
    illicit_funds: Number(row.illicit_funds) ?? 0,
    illicit_source_log: (row.illicit_source_log as PlayerSave['illicit_source_log']) ?? [],
    laundering_log: (row.laundering_log as PlayerSave['laundering_log']) ?? [],
    funds_hiding: (row.funds_hiding as string) ?? null,
    promo_log: (row.promo_log as PlayerSave['promo_log']) ?? [],
    next_priority_bonus: Number(row.next_priority_bonus) ?? 0,
    observation_days: Number(row.observation_days) ?? 0,
    rooting_days: Number(row.rooting_days) ?? 0,
    promo_freeze_until_day: Number(row.promo_freeze_until_day) ?? 0,
    patron_fail_months: Number(row.patron_fail_months) ?? 0,
    // Game Over
    gameOverType: (row.game_over_type as PlayerSave['gameOverType']) ?? null,
    createdAt: row.created_at as string,
    updatedAt: row.updated_at as string,
  };
}

function rowToSubordinate(row: Record<string, unknown>): Subordinate {
  // 从名字哈希推算特长（如未入库则动态派生）
  const derivedSpecialty = (() => {
    const name = (row.name as string) ?? '';
    let hash = 0;
    for (let i = 0; i < name.length; i++) hash = (hash * 31 + name.charCodeAt(i)) & 0xffff;
    const pool: import('@/types/game').CadreSpecialty[] = ['economy','social','legal','agriculture','tech','party','finance','military'];
    return pool[hash % pool.length];
  })();
  return {
    id: row.id as string,
    saveId: row.save_id as string,
    userId: row.user_id as string,
    name: row.name as string,
    position: row.position as string,
    role: row.role as string,
    avatarId: (row.avatar_id as number) ?? 0,
    gender: (row.gender as string) ?? '男',
    ability: row.ability as number,
    loyalty: row.loyalty as number,
    integrity: row.integrity as number,
    experience: row.experience as number,
    faction: ((row.faction as string) ?? 'reform') as import('@/types/game').Faction,
    subLevel: (row.sub_level as number) ?? 1,
    isAppointed: row.is_appointed as boolean,
    appointedRole: row.appointed_role as string | null,
    appointedDept: row.appointed_dept as DeptKey | null,
    deptPosition: ((row.dept_position as string) ?? 'head') as 'head' | 'deputy',
    transferredCity: (row.transferred_city as string) ?? null,
    lastAssessedDay: (row.last_assessed_day as number) ?? 0,
    createdAt: row.created_at as string,
    // ── 新增字段 ────────────────────────────────────────────────────────────
    specialty: ((row.specialty as string) ?? derivedSpecialty) as import('@/types/game').CadreSpecialty,
    isReserve: (row.is_reserve as boolean) ?? false,
    nominationStatus: ((row.nomination_status as string) ?? 'idle') as import('@/types/game').NominationStatus,
    nominationDept: (row.nomination_dept as DeptKey) ?? null,
    nominationPosition: (row.nomination_position as 'head' | 'deputy') ?? null,
    nominationStartDay: (row.nomination_start_day as number) ?? null,
    eventType: (row.event_type as import('@/types/game').SubEventType) ?? null,
    eventDay: (row.event_day as number) ?? null,
    eventHandled: (row.event_handled as boolean) ?? true,
    satisfaction: (row.satisfaction as number) ?? 60,
    lastReviewScores: (row.last_review_scores as string) ?? null,
    cadreAge: (row.cadre_age as number) ?? null,
    borrowedTo: (row.borrowed_to as string) ?? null,
    // ── 个人档案 ────────────────────────────────────────────────────────────
    birthYear: (row.birth_year as number) ?? null,
    university: (row.university as string) ?? null,
    major: (row.major as string) ?? null,
    hometown: (row.hometown as string) ?? null,
    newRecruit: (row.new_recruit as boolean) ?? false,
  };
}

function rowToPoliceCase(row: Record<string, unknown>): PoliceCase {
  return {
    id: row.id as string,
    saveId: row.save_id as string,
    userId: row.user_id as string,
    title: row.title as string,
    description: row.description as string,
    caseType: row.case_type as PoliceCase['caseType'],
    difficulty: row.difficulty as number,
    requiredPolice: row.required_police as number,
    rewardMerit: row.reward_merit as number,
    securityChange: row.security_change as number,
    status: row.status as PoliceCase['status'],
    createdDay: row.created_day as number,
    solvedDay: row.solved_day as number | null,
    createdAt: row.created_at as string,
  };
}

// ============ 存档操作 ============

export async function getSave(): Promise<PlayerSave | null> {
  const { data: user } = await supabase.auth.getUser();
  if (!user.user) return null;

  const { data, error } = await supabase
    .from('player_saves')
    .select('*')
    .eq('user_id', user.user.id)
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error) return null;
  if (data) return rowToPlayerSave(data as Record<string, unknown>);
  return null;
}

// 列出当前用户的全部存档（按创建时间倒序）
export async function listSaves(): Promise<PlayerSave[]> {
  const { data: user } = await supabase.auth.getUser();
  if (!user.user) return [];
  const { data, error } = await supabase
    .from('player_saves')
    .select('*')
    .eq('user_id', user.user.id)
    .order('created_at', { ascending: false });
  if (error || !data) return [];
  return (data as Record<string, unknown>[]).map((r) => rowToPlayerSave(r));
}

// 按 id 读取单个存档
export async function getSaveById(saveId: string): Promise<PlayerSave | null> {
  const { data, error } = await supabase
    .from('player_saves')
    .select('*')
    .eq('id', saveId)
    .maybeSingle();
  if (error || !data) return null;
  return rowToPlayerSave(data as Record<string, unknown>);
}

// 当前偏好档：设备级存储（避免改表），Web 端 localStorage，原生端 try/catch 安全降级
const ACTIVE_SAVE_KEY = 'zhuangtu_active_save_id';
export function setActiveSaveLocal(saveId: string): void {
  try { localStorage.setItem(ACTIVE_SAVE_KEY, saveId); } catch { /* ignore */ }
}
export function getActiveSaveLocal(): string | null {
  try { return localStorage.getItem(ACTIVE_SAVE_KEY); } catch { return null; }
}
export function clearActiveSaveLocal(): void {
  try { localStorage.removeItem(ACTIVE_SAVE_KEY); } catch { /* ignore */ }
}

export async function createSave(): Promise<PlayerSave | null> {
  const { data: user } = await supabase.auth.getUser();
  if (!user.user) return null;

  // 创建新存档（needsCharacterCreation = true，等待角色创建）
  const config = RANK_CONFIG[1];
  const cityName = randRealStartTown();
  // 分配数据库槽位：玩家选择 → 自动选最少玩家库 → 全满则自动开启下一个库
  const selectedDbCode = await getSelectedDatabaseCode();
  const { data: claimedDbId } = await supabase.rpc('claim_database_slot', {
    selected_code: selectedDbCode,
  });
  const { data: newSave, error: createError } = await supabase
    .from('player_saves')
    .insert({
      database_id: (claimedDbId as string) ?? null,
      user_id: user.user.id,
      player_name: '新官员',
      player_gender: '男',
      player_age: 22,
      player_birth_day: 0,
      avatar_id: 0,
      school: '普通本科',
      needs_character_creation: true,
      rank_level: 1,
      rank_name: config.name,
      player_position: config.name,
      merit_points: 0,
      moral_value: 80,
      assessment_grade: '合格',
      tenure_years: 0,
      tenure_days: 0,
      max_tenure_years: config.maxTenureYears,
      game_days: 0,
      city_name: cityName,
      city_gdp: 50,
      city_livelihood: 50,
      city_ecology: 50,
      city_business: 50,
      police_force: 100,
      security_index: 50,
      police_chief_name: null,
      reform_faction: 50,
      pragmatic_faction: 50,
      cyl_relation: 30,
      techno_relation: 30,
      local_relation: 30,
      primary_faction: '',
      // 派系 v2 初始值
      faction_influence: 0,
      political_wind: 'balanced',
      dominant_faction: null,
      last_wind_cycle_day: 0,
      faction_intelligence: 0,
      faction_cooldowns: {},
      coalitions: [],
      struggle_prep: { proxy: 0, media: 0, discord: 0, preempt: 0, successor: 0 },
      cultivate_binding: {},
      // 派系晋升联动初始值
      board_seats: [],
      promotion_contest: null,
      contest_history: [],
      faction_mandates: [],
      covert_exposed_count: 0,
      defect_cooldown_until_day: 0,
      faction_setback_until_day: 0,
      mandate_reject_cooldown_until_day: 0,
      last_mandate_year: -1,
      // v4 派系玩法初始值（省级席位 + 个人职位战）
      province_seat_control: {},
      personal_contest_cooldown_until: 0,
      personal_contest_history: [],
      province_attack_progress: {},
      contest_mode: 'direct',
      last_promotion_cycle_id: 0,
      // v6 扩展玩法初始值
      cycle_contest_wins: 0,
      cycle_contribution: 0,
      setback_immunity: 0,
      purge_count: 0,
      faction_joined_day: 0,
      is_flagged: false,
      contact_attempts: 0,
      factionless_locked: false,
      faction_promotion_locked: false,
      struggle_phase: 'idle',
      struggle_history: [],
      faction_echo_log: [],
      region_control: {},
      faction_treasury: {},
      cultivate_tier: {},
      boss_name: config.bossTitle,
      boss_favor: 50,
      boss2_name: config.bossTitle2,
      boss2_favor: 50,
      boss3_name: config.bossTitle3,
      boss3_favor: 50,
      required_merit: config.requiredMerit,
      required_tenure_years: config.requiredTenureYears,
      is_promotion_available: false,
      is_event_pending: false,
      family_happiness: 50,
      marriage_status: 'single',
      fund_balance: RANK_INITIAL_FUND[1] ?? 30,
      city_tax_rate: 0.12,
      city_tax_income: 0,
    })
    .select('*')
    .single();

  if (createError || !newSave) return null;
  // 存档创建成功，清除已使用的大区选择
  await setSelectedDatabaseCode(null);

  // 初始化下属（传入起始职级，生成匹配层级的称谓和职级）
  await initSubordinates(newSave.id, user.user.id, (newSave as Record<string, unknown>).rank_level as number ?? 1);
  // 初始化上司任务
  await initBossTasks(newSave.id, user.user.id);
  // 初始化案件
  await initPoliceCases(newSave.id, user.user.id, 0);
  // 初始化城市财政（记录初始值，月度结算以 player_saves.fund_balance 为准）
  await supabase.from('city_finance').insert({
    save_id: newSave.id, user_id: user.user.id,
    fund_balance: RANK_INITIAL_FUND[1] ?? 30, debt_total: 0, loans: [], investments: [],
  });

  return rowToPlayerSave(newSave as Record<string, unknown>);
}

export async function completeCharacterCreation(saveId: string, opts: {
  playerName: string;
  playerGender: string;
  playerAge: number;
  avatarId: number;
  school: string;
  isZhongXuanDiao?: boolean;
  degree?: string;
  birthYear?: number;
  birthProvince?: string;
  birthCity?: string;
  universityName?: string;
}): Promise<PlayerSave | null> {
  const isZhongXuan = opts.isZhongXuanDiao === true || opts.school === '985院校（选调生）';
  const schoolValue = isZhongXuan ? '985院校（选调生）' : opts.school;
  const abilityBonus = isZhongXuan ? 20 : schoolValue === '985院校' ? 10 : schoolValue === '211院校' ? 5 : schoolValue === '大专院校' ? -5 : 0;

  // 中央选调生：硕士→副乡镇长(rank2/副科)，博士→乡镇长(rank3/正科)
  const degreeVal = (opts.degree as '本科' | '硕士' | '博士') ?? '本科';
  const startRank = isZhongXuan ? getZhongXuanDiaoStartRank(degreeVal) : 1;
  const rankCfg = RANK_CONFIG[startRank];

  const updatePayload: Record<string, unknown> = {
    player_name:    opts.playerName,
    player_gender:  opts.playerGender,
    player_age:     opts.playerAge,
    player_birth_day: 0,
    avatar_id:      opts.avatarId,
    school:         schoolValue,
    needs_character_creation: false,
    moral_value:    Math.min(100, 80 + Math.floor(abilityBonus / 2)),
    updated_at:     new Date().toISOString(),
    // 个人档案
    birth_year:       opts.birthYear ?? 0,
    birth_province:   opts.birthProvince ?? '',
    birth_city:       opts.birthCity ?? '',
    university_name:  opts.universityName ?? '',
    // 开局城市与籍贯同省同市（确保 NPC 仕途地点和玩家所在地一致）
    city_name: (opts.birthProvince && opts.birthCity)
      ? randRealStartTownByProvCity(opts.birthProvince, opts.birthCity)
      : randRealStartTown(),
  };

  if (isZhongXuan) {
    // 博士选调：正科/乡镇长，政绩+50；硕士选调：副科/副乡镇长，政绩+30
    const isMaster = degreeVal === '硕士';
    updatePayload.rank_level = startRank;
    updatePayload.rank_name = rankCfg.name;
    updatePayload.player_position = rankCfg.name;
    updatePayload.merit_points = isMaster ? 30 : 50;   // 博士起点积累更多
    updatePayload.boss_favor = isMaster ? 65 : 70;      // 博士受到更多关注
    updatePayload.boss_name = rankCfg.bossTitle;
    updatePayload.boss2_name = rankCfg.bossTitle2;
    updatePayload.boss3_name = rankCfg.bossTitle3;
    updatePayload.required_merit = rankCfg.requiredMerit;
    updatePayload.required_tenure_years = rankCfg.requiredTenureYears;
    updatePayload.max_tenure_years = rankCfg.maxTenureYears;
  }

  const { data, error } = await supabase
    .from('player_saves')
    .update(updatePayload)
    .eq('id', saveId)
    .select('*')
    .single();
  if (error || !data) return null;
  return rowToPlayerSave(data as Record<string, unknown>);
}

export async function updateSave(saveId: string, updates: Partial<{
  meritPoints: number;
  moralValue: number;
  assessmentGrade: string;
  tenureYears: number;
  tenureDays: number;
  gameDays: number;
  cityGdp: number;
  cityLivelihood: number;
  cityEcology: number;
  cityBusiness: number;
  policeForce: number;
  securityIndex: number;
  policeChiefName: string | null;
  reformFaction: number;
  pragmaticFaction: number;
  cylRelation: number;
  technoRelation: number;
  localRelation: number;
  primaryFaction: string;
  bossFavor: number;
  isPromotionAvailable: boolean;
  isEventPending: boolean;
  rankLevel: number;
  rankName: string;
  cityName: string;
  maxTenureYears: number;
  requiredMerit: number;
  requiredTenureYears: number;
  bossName: string;
  playerName: string;
  familyHappiness: number;
  marriageStatus: string;
  playerAge: number;
  eventsThisYear: number;
  lastRankDay: number;
  annualRankPct: number;
  isExcellentRank: boolean;
  cityPopulation: number;
  residentIncome: number;
  eduLevel: number;
  healthcareRate: number;
  housingRate: number;
  fundBalance: number;
  boss2Name: string;
  boss2Favor: number;
  boss3Name: string;
  boss3Favor: number;
  lastRecruitYear: number;
  lastRecruitQuarter: number;
  cityTaxRate: number;
  cityTaxIncome: number;
  taxRevenue: number;
  lastMonthDay: number;
  kpiGdpTarget: number;
  kpiLivelihoodTarget: number;
  kpiEcologyTarget: number;
  kpiBusinessTarget: number;
  kpiYear: number;
  subVisitPending: boolean;
  subVisitSubId: string | null;
  subVisitSubName: string | null;
  lastPersonnelYear: number;
  deptReportDay: number;
  lastExchangeDay: number;
  lastMinistryRotateDay: number;
  spouseRelationValue: number;
  marriageDay: number;
  playerPosition: string;
  concurrentPosts: string[];
  voteSupport: number;
  lastVoteDay: number;
  partyCongressVote: number;
  lastPartyCongressDay: number;
  nationalTermsServed: number;
  careerPath: string;
  nationalGdp: number;
  sciTechInvestTotal: number;
  sciTechResearchDir: string;
  sciTechProgress: number;
  sciTechLastActDay: number;
  disciplineLastActDay: number;
  kpiRankingYear: number;
  kpiRankingResult: string;
  lastAnnualPromoteYear: number;
  personalSavings: number;
  personalAssets: string[];
  lastSalaryDay: number;
  providentFundBalance: number;
  lastAnnualBonusDay: number;
  retirementDelayYears: number;
  isRetired: boolean;
  // 上司生命周期
  bossTenureStart: number;
  bossTenureDuration: number;
  boss2TenureStart: number;
  boss2TenureDuration: number;
  boss3TenureStart: number;
  boss3TenureDuration: number;
  // 纪委风险追踪
  lastDisciplineWarnDay: number;
  lastCaseCheckDay: number;
  // 重大事故风险
  consecutiveFailEvents: number;
  // 连续优秀/特等加速晋升
  consecutiveExcellentYears: number;
  // 贪腐玩法系统
  riskValue: number;
  clueLevel: number;
  counterIntel: number;
  illegalWealth: number;
  testimonyChain: number;
  caseHistory: number;
  custodyDays: number;
  illicitLog: PlayerSave['illicitLog'];
  transferLog: PlayerSave['transferLog'];
  assetHiding: PlayerSave['assetHiding'];
  investState: PlayerSave['investState'];
  lastInterrogationDay: number;
  caseStartDay: number;
  // 民心修行系统
  popularSupport: number;
  popularLog: PlayerSave['popularLog'];
  popularActionCooldowns: PlayerSave['popularActionCooldowns'];
  deptPolicyCooldowns: PlayerSave['deptPolicyCooldowns'];
  promotion_frozen: boolean;
  break_rule_used: number;
  break_rule_observe_days: number;
  promotion_window_locked: boolean;
  watched_post: string | null;
  pending_promotion: boolean;
  competition_id: string | null;
  lost_priority: boolean;
  appointment_doc_no: string | null;
  last_promotion_day: number;
  prestige_flag: boolean;
  clique_flag: boolean;
  base_tenure_years: number;
  leader_obstruct: boolean;
  patron_id: string | null;
  patron_favor: number;
  patron_expire_day: number;
  bribe_log: PlayerSave['bribe_log'];
  bribe_count: number;
  last_bribe_day: number;
  patronage: boolean;
  illicit_funds: number;
  illicit_source_log: PlayerSave['illicit_source_log'];
  laundering_log: PlayerSave['laundering_log'];
  funds_hiding: string | null;
  promo_log: PlayerSave['promo_log'];
  next_priority_bonus: number;
  observation_days: number;
  rooting_days: number;
  promo_freeze_until_day: number;
  patron_fail_months: number;
  // Game Over
  gameOverType: 'corruption' | 'accident' | 'purge' | 'fugitive' | 'dismissed' | null;
  // 派系系统 v2 新字段（§6）
  factionInfluence: number;
  politicalWind: import('@/types/game').PoliticalWind;
  dominantFaction: import('@/types/game').FactionId | null;
  lastWindCycleDay: number;
  factionIntelligence: number;
  factionCooldowns: Record<string, number>;
  coalitions: import('@/types/game').FactionCoalition[];
  purgeCount: number;
  factionJoinedDay: number;
  isFlagged: boolean;
  contactAttempts: number;
  factionlessLocked: boolean;
  factionPromotionLocked: boolean;
  strugglePhase: import('@/types/game').StrugglePhase;
  struggleHistory: import('@/types/game').FactionStruggle[];
  factionEchoLog: import('@/types/game').FactionEcho[];
  regionControl: Record<string, Record<import('@/types/game').FactionId, number>>;
  factionTreasury: Record<import('@/types/game').FactionId, number>;
  cultivateTier: Record<string, '门生' | '骨干' | '心腹'>;
  cultivateBinding: Record<string, string>;
  strugglePrep: import('@/types/game').StrugglePrep;
  // ── 派系晋升联动新增字段 ──
  boardSeats: import('@/types/game').PositionSeat[];
  promotionContest: import('@/types/game').PromotionContest | null;
  contestHistory: import('@/types/game').ContestRecord[];
  factionMandates: import('@/types/game').FactionMandate[];
  covertExposedCount: number;
  defectCooldownUntilDay: number;
  factionSetbackUntilDay: number;
  mandateRejectCooldownUntilDay: number;
  lastMandateYear: number;
  // ── v4 派系玩法：省级席位 + 个人职位战 ──
  provinceSeatControl: Record<string, import('@/types/game').FactionId | null>;
  personalContestCooldownUntil: number;
  personalContestHistory: import('@/types/game').ContestDetail[];
  // ── v5 派系玩法：省级攻夺进度 + 争夺模式 ──
  provinceAttackProgress: Record<string, number>;
  contestMode: import('@/types/game').ContestMode;
  lastPromotionCycleId: number;
  // ── v6 扩展玩法 ──
  cycleContestWins?: number;
  cycleContribution?: number;
  setbackImmunity?: number;
}>): Promise<PlayerSave | null> {
  const dbUpdates: Record<string, unknown> = { updated_at: new Date().toISOString() };

  if (updates.meritPoints !== undefined) dbUpdates.merit_points = Math.round(updates.meritPoints);
  if (updates.moralValue !== undefined) dbUpdates.moral_value = Math.round(updates.moralValue);
  if (updates.assessmentGrade !== undefined) dbUpdates.assessment_grade = updates.assessmentGrade;
  if (updates.tenureYears !== undefined) dbUpdates.tenure_years = Math.round(updates.tenureYears);
  if (updates.tenureDays !== undefined) dbUpdates.tenure_days = Math.round(updates.tenureDays);
  if (updates.gameDays !== undefined) dbUpdates.game_days = Math.round(updates.gameDays);
  if (updates.cityGdp !== undefined) dbUpdates.city_gdp = Math.round(updates.cityGdp);
  if (updates.cityLivelihood !== undefined) dbUpdates.city_livelihood = Math.round(updates.cityLivelihood);
  if (updates.cityEcology !== undefined) dbUpdates.city_ecology = Math.round(updates.cityEcology);
  if (updates.cityBusiness !== undefined) dbUpdates.city_business = Math.round(updates.cityBusiness);
  if (updates.policeForce !== undefined) dbUpdates.police_force = Math.round(updates.policeForce);
  if (updates.securityIndex !== undefined) dbUpdates.security_index = Math.round(updates.securityIndex);
  if (updates.policeChiefName !== undefined) dbUpdates.police_chief_name = updates.policeChiefName;
  if (updates.reformFaction !== undefined) dbUpdates.reform_faction = Math.round(updates.reformFaction);
  if (updates.pragmaticFaction !== undefined) dbUpdates.pragmatic_faction = Math.round(updates.pragmaticFaction);
  if (updates.cylRelation !== undefined) dbUpdates.cyl_relation = Math.round(updates.cylRelation);
  if (updates.technoRelation !== undefined) dbUpdates.techno_relation = Math.round(updates.technoRelation);
  if (updates.localRelation !== undefined) dbUpdates.local_relation = Math.round(updates.localRelation);
  if (updates.primaryFaction !== undefined) dbUpdates.primary_faction = updates.primaryFaction;
  // ── 派系系统 v2 写入映射（§6）──────────────────────────────
  if (updates.factionInfluence !== undefined) dbUpdates.faction_influence = Math.round(updates.factionInfluence);
  if (updates.politicalWind !== undefined) dbUpdates.political_wind = updates.politicalWind;
  if (updates.dominantFaction !== undefined) dbUpdates.dominant_faction = updates.dominantFaction;
  if (updates.lastWindCycleDay !== undefined) dbUpdates.last_wind_cycle_day = Math.round(updates.lastWindCycleDay);
  if (updates.factionIntelligence !== undefined) dbUpdates.faction_intelligence = Math.round(updates.factionIntelligence);
  if (updates.factionCooldowns !== undefined) dbUpdates.faction_cooldowns = updates.factionCooldowns;
  if (updates.coalitions !== undefined) dbUpdates.coalitions = updates.coalitions;
  if (updates.purgeCount !== undefined) dbUpdates.purge_count = Math.round(updates.purgeCount);
  if (updates.factionJoinedDay !== undefined) dbUpdates.faction_joined_day = Math.round(updates.factionJoinedDay);
  if (updates.isFlagged !== undefined) dbUpdates.is_flagged = updates.isFlagged;
  if (updates.contactAttempts !== undefined) dbUpdates.contact_attempts = Math.round(updates.contactAttempts);
  if (updates.factionlessLocked !== undefined) dbUpdates.factionless_locked = updates.factionlessLocked;
  if (updates.factionPromotionLocked !== undefined) dbUpdates.faction_promotion_locked = updates.factionPromotionLocked;
  if (updates.strugglePhase !== undefined) dbUpdates.struggle_phase = updates.strugglePhase;
  if (updates.struggleHistory !== undefined) dbUpdates.struggle_history = updates.struggleHistory;
  if (updates.factionEchoLog !== undefined) dbUpdates.faction_echo_log = updates.factionEchoLog;
  if (updates.regionControl !== undefined) dbUpdates.region_control = updates.regionControl;
  if (updates.factionTreasury !== undefined) dbUpdates.faction_treasury = updates.factionTreasury;
  if (updates.cultivateTier !== undefined) dbUpdates.cultivate_tier = updates.cultivateTier;
  if (updates.cultivateBinding !== undefined) dbUpdates.cultivate_binding = updates.cultivateBinding;
  if (updates.strugglePrep !== undefined) dbUpdates.struggle_prep = updates.strugglePrep;
  // ── 派系晋升联动新增字段写入映射 ──
  if (updates.boardSeats !== undefined) dbUpdates.board_seats = updates.boardSeats;
  if (updates.promotionContest !== undefined) dbUpdates.promotion_contest = updates.promotionContest;
  if (updates.contestHistory !== undefined) dbUpdates.contest_history = updates.contestHistory;
  if (updates.factionMandates !== undefined) dbUpdates.faction_mandates = updates.factionMandates;
  if (updates.covertExposedCount !== undefined) dbUpdates.covert_exposed_count = Math.round(updates.covertExposedCount);
  if (updates.defectCooldownUntilDay !== undefined) dbUpdates.defect_cooldown_until_day = Math.round(updates.defectCooldownUntilDay);
  if (updates.factionSetbackUntilDay !== undefined) dbUpdates.faction_setback_until_day = Math.round(updates.factionSetbackUntilDay);
  if (updates.mandateRejectCooldownUntilDay !== undefined) dbUpdates.mandate_reject_cooldown_until_day = Math.round(updates.mandateRejectCooldownUntilDay);
  if (updates.lastMandateYear !== undefined) dbUpdates.last_mandate_year = Math.round(updates.lastMandateYear);
  // ── v4 派系玩法：省级席位 + 个人职位战 写入映射 ──
  if (updates.provinceSeatControl !== undefined) dbUpdates.province_seat_control = updates.provinceSeatControl;
  if (updates.personalContestCooldownUntil !== undefined) dbUpdates.personal_contest_cooldown_until = Math.round(updates.personalContestCooldownUntil);
  if (updates.personalContestHistory !== undefined) dbUpdates.personal_contest_history = updates.personalContestHistory;
  if (updates.provinceAttackProgress !== undefined) dbUpdates.province_attack_progress = updates.provinceAttackProgress;
  if (updates.contestMode !== undefined) dbUpdates.contest_mode = updates.contestMode;
  // ── v5 新增字段映射 ──
  if (updates.lastPromotionCycleId !== undefined) dbUpdates.last_promotion_cycle_id = Math.round(updates.lastPromotionCycleId);
  // ── v6 扩展玩法字段映射 ──
  if (updates.cycleContestWins !== undefined) dbUpdates.cycle_contest_wins = Math.round(updates.cycleContestWins);
  if (updates.cycleContribution !== undefined) dbUpdates.cycle_contribution = Math.round(updates.cycleContribution);
  if (updates.setbackImmunity !== undefined) dbUpdates.setback_immunity = Math.round(updates.setbackImmunity);
  if (updates.bossFavor !== undefined) dbUpdates.boss_favor = Math.round(updates.bossFavor);
  if (updates.isPromotionAvailable !== undefined) dbUpdates.is_promotion_available = updates.isPromotionAvailable;
  if (updates.isEventPending !== undefined) dbUpdates.is_event_pending = updates.isEventPending;
  if (updates.rankLevel !== undefined) dbUpdates.rank_level = updates.rankLevel;
  if (updates.rankName !== undefined) dbUpdates.rank_name = updates.rankName;
  if (updates.cityName !== undefined) dbUpdates.city_name = updates.cityName;
  if (updates.maxTenureYears !== undefined) dbUpdates.max_tenure_years = updates.maxTenureYears;
  if (updates.requiredMerit !== undefined) dbUpdates.required_merit = updates.requiredMerit;
  if (updates.requiredTenureYears !== undefined) dbUpdates.required_tenure_years = updates.requiredTenureYears;
  if (updates.bossName !== undefined) dbUpdates.boss_name = updates.bossName;
  if (updates.playerName !== undefined) dbUpdates.player_name = updates.playerName;
  if (updates.familyHappiness !== undefined) dbUpdates.family_happiness = updates.familyHappiness;
  if (updates.marriageStatus !== undefined) dbUpdates.marriage_status = updates.marriageStatus;
  if (updates.playerAge !== undefined) dbUpdates.player_age = updates.playerAge;
  if (updates.eventsThisYear !== undefined) dbUpdates.events_this_year = updates.eventsThisYear;
  if (updates.lastRankDay !== undefined) dbUpdates.last_rank_day = updates.lastRankDay;
  if (updates.annualRankPct !== undefined) dbUpdates.annual_rank_pct = updates.annualRankPct;
  if (updates.isExcellentRank !== undefined) dbUpdates.is_excellent_rank = updates.isExcellentRank;
  if (updates.cityPopulation !== undefined) dbUpdates.city_population = updates.cityPopulation;
  if (updates.residentIncome !== undefined) dbUpdates.resident_income = updates.residentIncome;
  if (updates.eduLevel !== undefined) dbUpdates.edu_level = updates.eduLevel;
  if (updates.healthcareRate !== undefined) dbUpdates.healthcare_rate = updates.healthcareRate;
  if (updates.housingRate !== undefined) dbUpdates.housing_rate = updates.housingRate;
  if (updates.fundBalance !== undefined) dbUpdates.fund_balance = updates.fundBalance;
  if (updates.boss2Name !== undefined) dbUpdates.boss2_name = updates.boss2Name;
  if (updates.boss2Favor !== undefined) dbUpdates.boss2_favor = Math.round(updates.boss2Favor);
  if (updates.boss3Name !== undefined) dbUpdates.boss3_name = updates.boss3Name;
  if (updates.boss3Favor !== undefined) dbUpdates.boss3_favor = Math.round(updates.boss3Favor);
  if (updates.lastRecruitYear !== undefined) dbUpdates.last_recruit_year = updates.lastRecruitYear;
  if (updates.lastRecruitQuarter !== undefined) dbUpdates.last_recruit_quarter = updates.lastRecruitQuarter;
  if (updates.cityTaxRate !== undefined) dbUpdates.city_tax_rate = updates.cityTaxRate;
  if (updates.cityTaxIncome !== undefined) dbUpdates.city_tax_income = updates.cityTaxIncome;
  if (updates.taxRevenue !== undefined) dbUpdates.tax_revenue = updates.taxRevenue;
  if (updates.lastMonthDay !== undefined) dbUpdates.last_month_day = updates.lastMonthDay;
  if (updates.kpiGdpTarget !== undefined) dbUpdates.kpi_gdp_target = updates.kpiGdpTarget;
  if (updates.kpiLivelihoodTarget !== undefined) dbUpdates.kpi_livelihood_target = updates.kpiLivelihoodTarget;
  if (updates.kpiEcologyTarget !== undefined) dbUpdates.kpi_ecology_target = updates.kpiEcologyTarget;
  if (updates.kpiBusinessTarget !== undefined) dbUpdates.kpi_business_target = updates.kpiBusinessTarget;
  if (updates.kpiYear !== undefined) dbUpdates.kpi_year = updates.kpiYear;
  if (updates.subVisitPending !== undefined) dbUpdates.sub_visit_pending = updates.subVisitPending;
  if (updates.subVisitSubId !== undefined) dbUpdates.sub_visit_sub_id = updates.subVisitSubId;
  if (updates.subVisitSubName !== undefined) dbUpdates.sub_visit_sub_name = updates.subVisitSubName;
  if (updates.lastPersonnelYear !== undefined) dbUpdates.last_personnel_year = updates.lastPersonnelYear;
  if (updates.deptReportDay !== undefined) dbUpdates.dept_report_day = updates.deptReportDay;
  if (updates.lastExchangeDay !== undefined) dbUpdates.last_exchange_day = updates.lastExchangeDay;
  if (updates.lastMinistryRotateDay !== undefined) dbUpdates.last_ministry_rotate_day = updates.lastMinistryRotateDay;
  if (updates.spouseRelationValue !== undefined) dbUpdates.spouse_relation_value = updates.spouseRelationValue;
  if (updates.marriageDay !== undefined) dbUpdates.marriage_day = updates.marriageDay;
  if (updates.playerPosition !== undefined) dbUpdates.player_position = updates.playerPosition;
  if (updates.concurrentPosts !== undefined) dbUpdates.concurrent_posts = updates.concurrentPosts;
  if (updates.voteSupport !== undefined) dbUpdates.vote_support = Math.round(updates.voteSupport);
  if (updates.lastVoteDay !== undefined) dbUpdates.last_vote_day = updates.lastVoteDay;
  if (updates.partyCongressVote !== undefined) dbUpdates.party_congress_vote = Math.round(updates.partyCongressVote);
  if (updates.lastPartyCongressDay !== undefined) dbUpdates.last_party_congress_day = updates.lastPartyCongressDay;
  if (updates.nationalTermsServed !== undefined) dbUpdates.national_terms_served = updates.nationalTermsServed;
  if (updates.careerPath !== undefined) dbUpdates.career_path = updates.careerPath;
  if (updates.nationalGdp !== undefined) dbUpdates.national_gdp = Math.round(updates.nationalGdp);
  if (updates.sciTechInvestTotal !== undefined) dbUpdates.sci_tech_invest_total = Math.round(updates.sciTechInvestTotal);
  if (updates.sciTechResearchDir !== undefined) dbUpdates.sci_tech_research_dir = updates.sciTechResearchDir;
  if (updates.sciTechProgress !== undefined) dbUpdates.sci_tech_progress = Math.round(updates.sciTechProgress);
  if (updates.sciTechLastActDay !== undefined) dbUpdates.sci_tech_last_act_day = updates.sciTechLastActDay;
  if (updates.disciplineLastActDay !== undefined) dbUpdates.discipline_last_act_day = updates.disciplineLastActDay;
  if (updates.kpiRankingYear !== undefined) dbUpdates.kpi_ranking_year = updates.kpiRankingYear;
  if (updates.kpiRankingResult !== undefined) dbUpdates.kpi_ranking_result = updates.kpiRankingResult;
  if (updates.lastAnnualPromoteYear !== undefined) dbUpdates.last_annual_promote_year = updates.lastAnnualPromoteYear;
  if (updates.personalSavings !== undefined) dbUpdates.personal_savings = Math.round(updates.personalSavings);
  if (updates.personalAssets !== undefined) dbUpdates.personal_assets = updates.personalAssets;
  if (updates.lastSalaryDay !== undefined) dbUpdates.last_salary_day = updates.lastSalaryDay;
  if (updates.providentFundBalance !== undefined) dbUpdates.provident_fund_balance = Math.round(updates.providentFundBalance);
  if (updates.lastAnnualBonusDay !== undefined) dbUpdates.last_annual_bonus_day = updates.lastAnnualBonusDay;
  if (updates.retirementDelayYears !== undefined) dbUpdates.retirement_delay_years = updates.retirementDelayYears;
  if (updates.isRetired !== undefined) dbUpdates.is_retired = updates.isRetired;
  // 上司生命周期
  if (updates.bossTenureStart !== undefined) dbUpdates.boss_tenure_start = updates.bossTenureStart;
  if (updates.bossTenureDuration !== undefined) dbUpdates.boss_tenure_duration = updates.bossTenureDuration;
  if (updates.boss2TenureStart !== undefined) dbUpdates.boss2_tenure_start = updates.boss2TenureStart;
  if (updates.boss2TenureDuration !== undefined) dbUpdates.boss2_tenure_duration = updates.boss2TenureDuration;
  if (updates.boss3TenureStart !== undefined) dbUpdates.boss3_tenure_start = updates.boss3TenureStart;
  if (updates.boss3TenureDuration !== undefined) dbUpdates.boss3_tenure_duration = updates.boss3TenureDuration;
  // 纪委风险
  if (updates.lastDisciplineWarnDay !== undefined) dbUpdates.last_discipline_warn_day = updates.lastDisciplineWarnDay;
  if (updates.lastCaseCheckDay !== undefined) dbUpdates.last_case_check_day = updates.lastCaseCheckDay;
  // 重大事故风险
  if (updates.consecutiveFailEvents !== undefined) dbUpdates.consecutive_fail_events = updates.consecutiveFailEvents;
  if (updates.consecutiveExcellentYears !== undefined) dbUpdates.consecutive_excellent_years = updates.consecutiveExcellentYears;
  // Game Over
  if (updates.gameOverType !== undefined) dbUpdates.game_over_type = updates.gameOverType;
  // 贪腐玩法系统
  if (updates.riskValue !== undefined) dbUpdates.risk_value = Math.round(updates.riskValue);
  if (updates.clueLevel !== undefined) dbUpdates.clue_level = Math.round(updates.clueLevel);
  if (updates.counterIntel !== undefined) dbUpdates.counter_intel = Math.round(updates.counterIntel);
  if (updates.illegalWealth !== undefined) dbUpdates.illegal_wealth = updates.illegalWealth;
  if (updates.testimonyChain !== undefined) dbUpdates.testimony_chain = Math.round(updates.testimonyChain);
  if (updates.caseHistory !== undefined) dbUpdates.case_history = Math.round(updates.caseHistory);
  if (updates.custodyDays !== undefined) dbUpdates.custody_days = Math.round(updates.custodyDays);
  if (updates.illicitLog !== undefined) dbUpdates.illicit_log = updates.illicitLog;
  if (updates.transferLog !== undefined) dbUpdates.transfer_log = updates.transferLog;
  if (updates.assetHiding !== undefined) dbUpdates.asset_hiding = updates.assetHiding;
  if (updates.investState !== undefined) dbUpdates.invest_state = updates.investState;
  if (updates.lastInterrogationDay !== undefined) dbUpdates.last_interrogation_day = updates.lastInterrogationDay;
  if (updates.caseStartDay !== undefined) dbUpdates.case_start_day = updates.caseStartDay;
  // 民心修行系统
  if (updates.popularSupport !== undefined) dbUpdates.popular_support = Math.max(0, Math.min(100, Math.round(updates.popularSupport)));
  if (updates.popularLog !== undefined) dbUpdates.popular_log = updates.popularLog;
  if (updates.popularActionCooldowns !== undefined) dbUpdates.popular_action_cooldowns = updates.popularActionCooldowns;
  if (updates.deptPolicyCooldowns !== undefined) dbUpdates.dept_policy_cooldowns = updates.deptPolicyCooldowns;
  if (updates.promotion_frozen !== undefined) dbUpdates.promotion_frozen = updates.promotion_frozen;
  if (updates.break_rule_used !== undefined) dbUpdates.break_rule_used = updates.break_rule_used;
  if (updates.break_rule_observe_days !== undefined) dbUpdates.break_rule_observe_days = updates.break_rule_observe_days;
  if (updates.promotion_window_locked !== undefined) dbUpdates.promotion_window_locked = updates.promotion_window_locked;
  if (updates.watched_post !== undefined) dbUpdates.watched_post = updates.watched_post;
  if (updates.pending_promotion !== undefined) dbUpdates.pending_promotion = updates.pending_promotion;
  if (updates.competition_id !== undefined) dbUpdates.competition_id = updates.competition_id;
  if (updates.lost_priority !== undefined) dbUpdates.lost_priority = updates.lost_priority;
  if (updates.appointment_doc_no !== undefined) dbUpdates.appointment_doc_no = updates.appointment_doc_no;
  if (updates.last_promotion_day !== undefined) dbUpdates.last_promotion_day = updates.last_promotion_day;
  if (updates.prestige_flag !== undefined) dbUpdates.prestige_flag = updates.prestige_flag;
  if (updates.clique_flag !== undefined) dbUpdates.clique_flag = updates.clique_flag;
  if (updates.base_tenure_years !== undefined) dbUpdates.base_tenure_years = updates.base_tenure_years;
  if (updates.leader_obstruct !== undefined) dbUpdates.leader_obstruct = updates.leader_obstruct;
  if (updates.patron_id !== undefined) dbUpdates.patron_id = updates.patron_id;
  if (updates.patron_favor !== undefined) dbUpdates.patron_favor = updates.patron_favor;
  if (updates.patron_expire_day !== undefined) dbUpdates.patron_expire_day = updates.patron_expire_day;
  if (updates.bribe_log !== undefined) dbUpdates.bribe_log = updates.bribe_log;
  if (updates.bribe_count !== undefined) dbUpdates.bribe_count = updates.bribe_count;
  if (updates.last_bribe_day !== undefined) dbUpdates.last_bribe_day = updates.last_bribe_day;
  if (updates.patronage !== undefined) dbUpdates.patronage = updates.patronage;
  if (updates.illicit_funds !== undefined) dbUpdates.illicit_funds = updates.illicit_funds;
  if (updates.illicit_source_log !== undefined) dbUpdates.illicit_source_log = updates.illicit_source_log;
  if (updates.laundering_log !== undefined) dbUpdates.laundering_log = updates.laundering_log;
  if (updates.funds_hiding !== undefined) dbUpdates.funds_hiding = updates.funds_hiding;
  if (updates.promo_log !== undefined) dbUpdates.promo_log = updates.promo_log;
  if (updates.next_priority_bonus !== undefined) dbUpdates.next_priority_bonus = updates.next_priority_bonus;
  if (updates.observation_days !== undefined) dbUpdates.observation_days = updates.observation_days;
  if (updates.rooting_days !== undefined) dbUpdates.rooting_days = updates.rooting_days;
  if (updates.promo_freeze_until_day !== undefined) dbUpdates.promo_freeze_until_day = updates.promo_freeze_until_day;
  if (updates.patron_fail_months !== undefined) dbUpdates.patron_fail_months = updates.patron_fail_months;

  const { data, error } = await supabase
    .from('player_saves')
    .update(dbUpdates)
    .eq('id', saveId)
    .select('*')
    .single();

  if (error || !data) return null;
  return rowToPlayerSave(data as Record<string, unknown>);
}

// ============ 下属操作 ============

const POSITIONS = ['副科长', '科员', '主任科员', '副主任', '主任', '办公室主任', '专员'];

export async function initSubordinates(saveId: string, userId: string, rankLevel = 3) {
  // 12个部门每个分配正职+副职，共24人 + 2名待命下属
  // 正副职 sub_level 按现实职级体系计算（公安等强力部门高配）

  const DEPT_KEYS: DeptKey[] = ['police', 'ndrc', 'finance', 'urban', 'education', 'health', 'ecology', 'market', 'agriculture', 'personnel', 'invest', 'tax'];
  const FACTIONS: import('@/types/game').FactionId[] = ['reform', 'pragmatic', 'cyl', 'techno', 'local'];
  const subs = [];

  const makeSub = (deptKey: DeptKey | null, isAppointed: boolean, deptPosition: 'head' | 'deputy') => {
    const isFemale = Math.random() < 0.35;
    const gender = isFemale ? '女' : '男';
    const name = pickNpcName();
    // 动态生成职务称谓（随rankLevel适配乡镇/县/市/省/国层级）
    const roleLabel = deptKey
      ? (deptPosition === 'head' ? getDeptHeadTitle(deptKey, rankLevel) : getDeptDeputyTitle(deptKey, rankLevel))
      : null;
    // 按现实职级体系计算 sub_level（公安/税务/组织等高配部门正职高一级）
    const subLevel = deptKey
      ? getDeptPositionSubLevel(deptKey, rankLevel, deptPosition)
      : Math.max(1, rankLevel - 2);
    const faction = FACTIONS[Math.floor(Math.random() * FACTIONS.length)];
    // position 字段显示实际职务（与 roleLabel 一致）
    const position = roleLabel ?? (deptPosition === 'head' ? '负责人' : '工作人员');
    return {
      save_id: saveId,
      user_id: userId,
      name,
      gender,
      position,
      role: 'regular',
      avatar_id: Math.floor(Math.random() * 8),
      ability: 45 + Math.floor(Math.random() * 30),
      loyalty: 50 + Math.floor(Math.random() * 30),
      integrity: 50 + Math.floor(Math.random() * 30),
      experience: 30 + Math.floor(Math.random() * 30),
      faction,
      sub_level: subLevel,
      is_appointed: isAppointed,
      appointed_role: roleLabel,
      appointed_dept: deptKey,
      dept_position: deptPosition,
      transferred_city: null,
      last_assessed_day: 0,
    };
  };

  // 12 正职
  for (const dk of DEPT_KEYS) subs.push(makeSub(dk, true, 'head'));
  // 12 副职
  for (const dk of DEPT_KEYS) subs.push(makeSub(dk, true, 'deputy'));
  // 额外2名待命下属
  subs.push(makeSub(null, false, 'head'));
  subs.push(makeSub(null, false, 'head'));

  await supabase.from('subordinates').insert(subs);
}

export async function getSubordinates(saveId: string): Promise<Subordinate[]> {
  const { data, error } = await supabase
    .from('subordinates')
    .select('*')
    .eq('save_id', saveId)
    .order('created_at', { ascending: true });

  if (error || !data) return [];
  return (data as Record<string, unknown>[]).map(rowToSubordinate);
}

// 获取新录用（待提醒）的干部
export async function getNewRecruits(saveId: string): Promise<Subordinate[]> {
  const { data, error } = await supabase
    .from('subordinates')
    .select('*')
    .eq('save_id', saveId)
    .eq('new_recruit', true)
    .order('created_at', { ascending: false });

  if (error || !data) return [];
  return (data as Record<string, unknown>[]).map(rowToSubordinate);
}

// 清除新录用提醒标记（用户已查看）
export async function clearNewRecruitFlag(saveId: string): Promise<void> {
  await supabase
    .from('subordinates')
    .update({ new_recruit: false })
    .eq('save_id', saveId)
    .eq('new_recruit', true);
}

/**
 * 按玩家当前职级过滤下属：
 * rankLevel R 的玩家只能管理 subLevel 在 [R-3, R-1] 范围内的直属下属
 * （例如国政院部长12级只看9-11级下属，省委书记11级只看8-10级）
 */
export async function getSubordinatesByRank(saveId: string, rankLevel: number): Promise<Subordinate[]> {
  // 总理（rank14+）：展示所有部级委员/省委书记及以上（subLevel 9+，涵盖国政院部长/副部/省委书记/副书记等）
  // 副院理（rank13）：展示省级及以上人员（subLevel >= 9）
  // 其他高层：根据 rankLevel 计算范围
  const minSub = rankLevel >= 13 ? 9 : Math.max(1, rankLevel - 3);
  const maxSub = rankLevel >= 14 ? 13 : Math.max(1, rankLevel - 1);
  const { data, error } = await supabase
    .from('subordinates')
    .select('*')
    .eq('save_id', saveId)
    .gte('sub_level', minSub)
    .lte('sub_level', maxSub)
    .order('sub_level', { ascending: false });

  if (error || !data) return [];
  return (data as Record<string, unknown>[]).map(rowToSubordinate);
}

/** 获取某存档下所有下属（不过滤职级，供KPI排名等全量场景使用） */
export async function getAllSubordinates(saveId: string): Promise<Subordinate[]> {
  const { data, error } = await supabase
    .from('subordinates')
    .select('*')
    .eq('save_id', saveId)
    .is('transferred_city', null)
    .order('sub_level', { ascending: false })
    .limit(200);
  if (error || !data) return [];
  return (data as Record<string, unknown>[]).map(rowToSubordinate);
}

export async function appointSubordinate(
  subId: string,
  role: string | null,
  roleLabel: string | null,
  deptKey: DeptKey | null,
  deptPosition: 'head' | 'deputy' | 'staff' = 'head',
  rankLevel = 3,
): Promise<boolean> {
  // 写入时同步更新 sub_level（按职级体系）和 position（显示实际职务名称）
  const subLevel = deptKey
    ? getDeptPositionSubLevel(deptKey, rankLevel, deptPosition === 'staff' ? 'deputy' : deptPosition)
    : undefined;
  const { error } = await supabase
    .from('subordinates')
    .update({
      is_appointed: !!role,
      appointed_role: roleLabel,
      appointed_dept: deptKey,
      dept_position: deptPosition,
      ...(subLevel !== undefined ? { sub_level: subLevel } : {}),
      ...(roleLabel ? { position: roleLabel } : {}),
    })
    .eq('id', subId);
  return !error;
}

export async function transferSubordinate(subId: string, targetCity: string): Promise<boolean> {
  const { error } = await supabase
    .from('subordinates')
    .update({ transferred_city: targetCity, is_appointed: false, appointed_role: null, appointed_dept: null })
    .eq('id', subId);
  return !error;
}

/** 获取所有已调任的历史下属 */
export async function getTransferredSubordinates(saveId: string): Promise<Subordinate[]> {
  const { data, error } = await supabase
    .from('subordinates')
    .select('*')
    .eq('save_id', saveId)
    .not('transferred_city', 'is', null)
    .order('sub_level', { ascending: false });
  if (error || !data) return [];
  return (data as Record<string, unknown>[]).map(rowToSubordinate);
}

/** 召回历史调任下属到当前队伍（清除 transferred_city） */
export async function recallSubordinate(subId: string): Promise<boolean> {
  const { error } = await supabase
    .from('subordinates')
    .update({ transferred_city: null, is_appointed: false, appointed_role: null, appointed_dept: null })
    .eq('id', subId);
  return !error;
}

export async function assessSubordinate(subId: string, currentDay: number, abilityDelta: number, loyaltyDelta: number, integrityDelta: number, expDelta: number): Promise<boolean> {
  const { data } = await supabase.from('subordinates').select('ability, loyalty, integrity, experience').eq('id', subId).single();
  if (!data) return false;
  const row = data as Record<string, unknown>;
  const { error } = await supabase.from('subordinates').update({
    ability: Math.max(0, Math.min(100, (row.ability as number) + abilityDelta)),
    loyalty: Math.max(0, Math.min(100, (row.loyalty as number) + loyaltyDelta)),
    integrity: Math.max(0, Math.min(100, (row.integrity as number) + integrityDelta)),
    experience: Math.max(0, Math.min(100, (row.experience as number) + expDelta)),
    last_assessed_day: currentDay,
  }).eq('id', subId);
  return !error;
}

// ============ 任务操作 ============

// ============ 上司任务操作 ============

function rowToBossTask(row: Record<string, unknown>): BossTask {
  return {
    id: row.id as string,
    saveId: row.save_id as string,
    userId: row.user_id as string,
    title: row.title as string,
    description: row.description as string,
    taskType: row.task_type as string,
    targetValue: row.target_value as number,
    currentValue: row.current_value as number,
    rewardMerit: row.reward_merit as number,
    rewardFavor: row.reward_favor as number,
    status: row.status as BossTask['status'],
    deadlineDays: row.deadline_days as number,
    createdDay: row.created_day as number,
    bossLevel: (row.boss_level as number) ?? 1,
    isPostponed: (row.is_postponed as boolean) ?? false,
    createdAt: row.created_at as string,
    urgency: (row.urgency as BossTask['urgency']) ?? 'normal',
    penaltyMerit: (row.penalty_merit as number) ?? 0,
    penaltyFavor: (row.penalty_favor as number) ?? 0,
  };
}

export async function initBossTasks(saveId: string, userId: string) {
  const tasks = INIT_TASKS.map((it) => {
    const t = TASK_TEMPLATES[it.templateIndex];
    return {
      save_id: saveId, user_id: userId,
      title: t.title, description: t.description, task_type: t.taskType,
      target_value: t.targetValue, current_value: 0,
      reward_merit: t.rewardMerit, reward_favor: t.rewardFavor,
      penalty_merit: t.penaltyMerit, penalty_favor: t.penaltyFavor,
      status: 'active', deadline_days: t.deadlineDays, created_day: 0,
      boss_level: it.bossLevel, is_postponed: false, urgency: t.urgency,
    };
  });
  await supabase.from('boss_tasks').insert(tasks);
}

export async function getBossTasks(saveId: string): Promise<BossTask[]> {
  const { data, error } = await supabase
    .from('boss_tasks')
    .select('*')
    .eq('save_id', saveId)
    .order('created_at', { ascending: true });
  if (error || !data) return [];
  return (data as Record<string, unknown>[]).map(rowToBossTask);
}

export async function completeTask(taskId: string): Promise<boolean> {
  const { error } = await supabase.from('boss_tasks').update({ status: 'completed' }).eq('id', taskId);
  return !error;
}

// 申请减负：延期（天数与政绩消耗均读配置）
export async function postponeTask(taskId: string): Promise<boolean> {
  const { data: row } = await supabase.from('boss_tasks').select('deadline_days').eq('id', taskId).single();
  if (!row) return false;
  const newDeadline = (row.deadline_days as number) + TASK_CONSTRAINTS.postponeDays;
  const { error } = await supabase.from('boss_tasks').update({
    deadline_days: newDeadline,
    is_postponed: true,
  }).eq('id', taskId);
  return !error;
}

export async function addNewTask(saveId: string, userId: string, gameDays: number): Promise<boolean> {
  const { data: active } = await supabase.from('boss_tasks').select('id').eq('save_id', saveId).eq('status', 'active');
  if ((active?.length ?? 0) >= TASK_CONSTRAINTS.activeLimit) return false;
  const tpl = TASK_TEMPLATES[Math.floor(Math.random() * TASK_TEMPLATES.length)];
  const bossLevel = Math.ceil(Math.random() * 3);
  const { error } = await supabase.from('boss_tasks').insert({
    save_id: saveId, user_id: userId,
    title: tpl.title, description: tpl.description, task_type: tpl.taskType,
    target_value: tpl.targetValue, current_value: 0,
    reward_merit: tpl.rewardMerit, reward_favor: tpl.rewardFavor,
    penalty_merit: tpl.penaltyMerit, penalty_favor: tpl.penaltyFavor,
    status: 'active', deadline_days: gameDays + tpl.deadlineDays, created_day: gameDays,
    boss_level: bossLevel, is_postponed: false, urgency: tpl.urgency,
  });
  if (error) {
    console.error('addNewTask failed:', error);
    return false;
  }
  return true;
}

// ============ 上司关系互动 ============

export interface BossInteraction {
  id: string;
  saveId: string;
  bossLevel: number;
  actionType: string; // 'report'|'consult'|'greet'
  gameDay: number;
  favorDelta: number;
  createdAt: string;
}

/** 获取指定存档的上司互动记录（最近100条） */
export async function getBossInteractions(saveId: string): Promise<BossInteraction[]> {
  const { data, error } = await supabase
    .from('boss_interactions')
    .select('*')
    .eq('save_id', saveId)
    .order('game_day', { ascending: false })
    .limit(100);
  if (error || !data) return [];
  return (data as Record<string, unknown>[]).map(r => ({
    id: r.id as string,
    saveId: r.save_id as string,
    bossLevel: r.boss_level as number,
    actionType: r.action_type as string,
    gameDay: r.game_day as number,
    favorDelta: r.favor_delta as number,
    createdAt: r.created_at as string,
  }));
}

/** 执行上司关系操作，返回实际好感度增量（0表示冷却中） */
export async function performBossAction(
  saveId: string,
  bossLevel: number,
  bossName: string,
  actionType: ActionType,
  currentGameDay: number,
  interactions: BossInteraction[],
): Promise<number> {
  const lastSame = interactions
    .filter(i => i.bossLevel === bossLevel && i.actionType === actionType)
    .sort((a, b) => b.gameDay - a.gameDay)[0];
  if (lastSame && currentGameDay - lastSame.gameDay < BOSS_CONSTRAINTS.cooldownDays) return 0;

  const action = BOSS_ACTIONS.find(a => a.key === actionType);
  if (!action) return 0;
  const style = getBossStyle(bossName);
  const delta = computeFavorDelta(style.key, actionType, action.baseFavor);

  await supabase.from('boss_interactions').insert({
    save_id: saveId,
    boss_level: bossLevel,
    action_type: actionType,
    game_day: currentGameDay,
    favor_delta: delta,
  });
  return delta;
}

// ============ 案件操作 ============

const CASE_TEMPLATES = [
  { title: '连环入室盗窃案', description: '城区多处居民楼发生入室盗窃，嫌疑人惯用相同手法，有组织作案迹象。居民恐慌，媒体关注。', caseType: 'criminal' as const, difficulty: 40, requiredPolice: 15, rewardMerit: 12, securityChange: 8 },
  { title: '涉黄赌场端掉', description: '线报显示辖区某地下室长期经营赌场，参与人员众多，涉案金额较大。', caseType: 'criminal' as const, difficulty: 50, requiredPolice: 20, rewardMerit: 15, securityChange: 10 },
  { title: '官员腐败举报查处', description: '纪委转来群众举报，某科级干部涉嫌收受贿赂，需配合调查。', caseType: 'corruption' as const, difficulty: 60, requiredPolice: 10, rewardMerit: 20, securityChange: 5 },
  { title: '贩毒团伙打击', description: '情报部门掌握一处中转毒品的窝点线索，需要组织精干力量实施抓捕。', caseType: 'drug' as const, difficulty: 70, requiredPolice: 30, rewardMerit: 25, securityChange: 15 },
  { title: '电信诈骗团伙侦破', description: '多名群众报案称遭受网络电信诈骗，受骗金额巨大，犯罪团伙藏匿于辖区。', caseType: 'fraud' as const, difficulty: 55, requiredPolice: 20, rewardMerit: 18, securityChange: 12 },
  { title: '寻衅滋事团伙处置', description: '辖区内一帮社会闲散人员多次寻衅滋事，严重影响社会秩序。', caseType: 'criminal' as const, difficulty: 35, requiredPolice: 12, rewardMerit: 10, securityChange: 7 },
];

export async function initPoliceCases(saveId: string, userId: string, gameDays: number) {
  const cases = CASE_TEMPLATES.slice(0, 4).map(c => ({
    save_id: saveId,
    user_id: userId,
    title: c.title,
    description: c.description,
    case_type: c.caseType,
    difficulty: c.difficulty,
    required_police: c.requiredPolice,
    reward_merit: c.rewardMerit,
    security_change: c.securityChange,
    status: 'pending',
    created_day: gameDays,
  }));
  await supabase.from('police_cases').insert(cases);
}

export async function getPoliceCases(saveId: string): Promise<PoliceCase[]> {
  const { data, error } = await supabase
    .from('police_cases')
    .select('*')
    .eq('save_id', saveId)
    .order('created_at', { ascending: false })
    .limit(10);

  if (error || !data) return [];
  return (data as Record<string, unknown>[]).map(rowToPoliceCase);
}

export async function solveCase(caseId: string, gameDays: number): Promise<boolean> {
  const { error } = await supabase
    .from('police_cases')
    .update({ status: 'solved', solved_day: gameDays })
    .eq('id', caseId);
  return !error;
}

export async function addNewCases(saveId: string, userId: string, gameDays: number): Promise<void> {
  const indices = Array.from({ length: CASE_TEMPLATES.length }, (_, i) => i)
    .sort(() => Math.random() - 0.5)
    .slice(0, 2);

  const cases = indices.map(i => ({
    save_id: saveId,
    user_id: userId,
    title: CASE_TEMPLATES[i].title,
    description: CASE_TEMPLATES[i].description,
    case_type: CASE_TEMPLATES[i].caseType,
    difficulty: CASE_TEMPLATES[i].difficulty,
    required_police: CASE_TEMPLATES[i].requiredPolice,
    reward_merit: CASE_TEMPLATES[i].rewardMerit,
    security_change: CASE_TEMPLATES[i].securityChange,
    status: 'pending',
    created_day: gameDays,
  }));
  await supabase.from('police_cases').insert(cases);
}

// ============ 事件记录 ============

export async function saveEventRecord(record: Omit<EventRecord, 'id' | 'createdAt'>): Promise<boolean> {
  const { error } = await supabase.from('event_records').insert({
    save_id: record.saveId,
    user_id: record.userId,
    event_type: record.eventType,
    title: record.title,
    description: record.description,
    choice_index: record.choiceIndex,
    choice_text: record.choiceText,
    merit_change: record.meritChange,
    moral_change: record.moralChange,
    gdp_change: record.gdpChange,
    livelihood_change: record.livelihoodChange,
    ecology_change: record.ecologyChange,
    business_change: record.businessChange,
    game_day: record.gameDay,
  });
  return !error;
}

// ============ 家庭成员操作 ============

function rowToFamilyMember(row: Record<string, unknown>): FamilyMember {
  return {
    id: row.id as string,
    saveId: row.save_id as string,
    userId: row.user_id as string,
    memberType: row.member_type as FamilyMember['memberType'],
    name: row.name as string,
    gender: (row.gender as string) ?? '男',
    birthDay: (row.birth_day as number) ?? 0,
    personality: (row.personality as string) ?? '温和',
    job: (row.job as string) ?? '教师',
    studyScore: (row.study_score as number) ?? 50,
    healthScore: (row.health_score as number) ?? 80,
    moralScore: (row.moral_score as number) ?? 80,
    isAdult: (row.is_adult as boolean) ?? false,
    adultPath: row.adult_path as string | null,
    createdAt: row.created_at as string,
  };
}

export async function getFamilyMembers(saveId: string): Promise<FamilyMember[]> {
  const { data, error } = await supabase
    .from('family_members')
    .select('*')
    .eq('save_id', saveId)
    .order('created_at', { ascending: true });
  if (error || !data) return [];
  return (data as Record<string, unknown>[]).map(rowToFamilyMember);
}

const SPOUSE_PERSONALITIES = ['温和', '贤惠', '开朗', '理性', '独立', '体贴', '直爽', '睿智'];
const SPOUSE_JOBS_FEMALE = ['教师', '医生', '工程师', '公务员', '企业职员', '律师', '会计师', '护士'];
const SPOUSE_JOBS_MALE = ['教师', '医生', '工程师', '公务员', '企业管理', '律师', '警察', '教授'];

export async function addSpouse(saveId: string, userId: string, name: string, gender: string, gameDays: number): Promise<FamilyMember | null> {
  const personality = SPOUSE_PERSONALITIES[Math.floor(Math.random() * SPOUSE_PERSONALITIES.length)];
  const jobPool = gender === '女' ? SPOUSE_JOBS_FEMALE : SPOUSE_JOBS_MALE;
  const job = jobPool[Math.floor(Math.random() * jobPool.length)];
  const { data, error } = await supabase
    .from('family_members')
    .insert({
      save_id: saveId,
      user_id: userId,
      member_type: 'spouse',
      name,
      gender,
      birth_day: gameDays - 365 * (20 + Math.floor(Math.random() * 8)),
      personality,
      job,
      study_score: 50,
      health_score: 85,
      moral_score: 80,
      is_adult: true,
    })
    .select('*')
    .single();
  if (error || !data) return null;
  return rowToFamilyMember(data as Record<string, unknown>);
}

export async function addChild(saveId: string, userId: string, gender: string, gameDays: number, familyName: string): Promise<FamilyMember | null> {
  await ensureNpcNamePoolLoaded();
  const childName = familyName + pickGivenName();
  const { data, error } = await supabase
    .from('family_members')
    .insert({
      save_id: saveId,
      user_id: userId,
      member_type: 'child',
      name: childName,
      gender,
      birth_day: gameDays,
      personality: SPOUSE_PERSONALITIES[Math.floor(Math.random() * SPOUSE_PERSONALITIES.length)],
      job: '学生',
      study_score: 50,
      health_score: 90,
      moral_score: 80,
      is_adult: false,
    })
    .select('*')
    .single();
  if (error || !data) return null;
  return rowToFamilyMember(data as Record<string, unknown>);
}

export async function updateFamilyMember(memberId: string, updates: Partial<{
  studyScore: number;
  healthScore: number;
  moralScore: number;
  isAdult: boolean;
  adultPath: string;
  job: string;
}>): Promise<boolean> {
  const dbUp: Record<string, unknown> = {};
  if (updates.studyScore !== undefined) dbUp.study_score = updates.studyScore;
  if (updates.healthScore !== undefined) dbUp.health_score = updates.healthScore;
  if (updates.moralScore !== undefined) dbUp.moral_score = updates.moralScore;
  if (updates.isAdult !== undefined) dbUp.is_adult = updates.isAdult;
  if (updates.adultPath !== undefined) dbUp.adult_path = updates.adultPath;
  if (updates.job !== undefined) dbUp.job = updates.job;
  const { error } = await supabase.from('family_members').update(dbUp).eq('id', memberId);
  return !error;
}

// ============ 建设项目 ============
function rowToBuildProject(row: Record<string, unknown>): import('@/types/game').BuildProject {
  return {
    id: row.id as string,
    saveId: row.save_id as string,
    userId: row.user_id as string,
    name: row.name as string,
    category: row.category as import('@/types/game').BuildCategory,
    costMerit: (row.cost_merit as number) ?? 0,
    costFund: (row.cost_fund as number) ?? 0,
    durationDays: row.duration_days as number,
    startDay: row.start_day as number,
    finishDay: row.finish_day as number,
    status: row.status as 'building' | 'done',
    effectType: row.effect_type as import('@/types/game').EffectType,
    effectValue: row.effect_value as number,
    meritReward: row.merit_reward as number,
    createdAt: row.created_at as string,
  };
}

export async function getBuildProjects(saveId: string): Promise<import('@/types/game').BuildProject[]> {
  const { data, error } = await supabase
    .from('construction_projects')
    .select('*')
    .eq('save_id', saveId)
    .order('created_at', { ascending: false });
  if (error || !data) return [];
  return (data as Record<string, unknown>[]).map(rowToBuildProject);
}

export async function startBuildProject(
  saveId: string, userId: string, gameDays: number,
  tpl: import('@/types/game').BuildProjectTemplate
): Promise<import('@/types/game').BuildProject | null> {
  const { data, error } = await supabase
    .from('construction_projects')
    .insert({
      save_id: saveId,
      user_id: userId,
      name: tpl.name,
      category: tpl.category,
      cost_merit: 0,
      cost_fund: tpl.costFund,
      duration_days: tpl.durationDays,
      start_day: gameDays,
      finish_day: gameDays + tpl.durationDays,
      status: 'building',
      effect_type: tpl.effectType,
      effect_value: tpl.effectValue,
      merit_reward: tpl.meritReward,
    })
    .select('*')
    .single();
  if (error || !data) return null;
  return rowToBuildProject(data as Record<string, unknown>);
}

export async function completeBuildProjects(saveId: string, gameDays: number): Promise<import('@/types/game').BuildProject[]> {
  // 查找到期项目
  const { data, error } = await supabase
    .from('construction_projects')
    .select('*')
    .eq('save_id', saveId)
    .eq('status', 'building')
    .lte('finish_day', gameDays);
  if (error || !data || data.length === 0) return [];
  const projects = (data as Record<string, unknown>[]).map(rowToBuildProject);
  const ids = projects.map(p => p.id);
  await supabase.from('construction_projects').update({ status: 'done' }).in('id', ids);
  return projects;
}

// ============ 管辖区域 ============
function rowToArea(row: Record<string, unknown>): import('@/types/game').GoverningArea {
  return {
    id: row.id as string,
    saveId: row.save_id as string,
    userId: row.user_id as string,
    areaName: row.area_name as string,
    areaType: row.area_type as 'town' | 'district',
    devIndex: row.dev_index as number,
    favorIndex: row.favor_index as number,
    lastVisitedDay: row.last_visited_day as number,
    lastInvestedDay: row.last_invested_day as number,
    createdAt: row.created_at as string,
  };
}

export async function getGoverningAreas(saveId: string): Promise<import('@/types/game').GoverningArea[]> {
  const { data, error } = await supabase
    .from('governing_areas')
    .select('*')
    .eq('save_id', saveId)
    .order('created_at', { ascending: true });
  if (error || !data) return [];
  return (data as Record<string, unknown>[]).map(rowToArea);
}

export async function initGoverningAreas(
  saveId: string, userId: string,
  areas: { name: string; type: 'village' | 'town' | 'district' | 'city_level' }[]
): Promise<boolean> {
  // 先清空旧区域
  await supabase.from('governing_areas').delete().eq('save_id', saveId);
  if (areas.length === 0) return true;
  const rows = areas.map(a => ({
    save_id: saveId,
    user_id: userId,
    area_name: a.name,
    area_type: a.type,
    dev_index: 40 + Math.floor(Math.random() * 30),
    favor_index: 40 + Math.floor(Math.random() * 30),
    last_visited_day: 0,
    last_invested_day: 0,
  }));
  const { error } = await supabase.from('governing_areas').insert(rows);
  return !error;
}

export async function investArea(areaId: string, devDelta: number): Promise<boolean> {
  const { data } = await supabase.from('governing_areas').select('dev_index').eq('id', areaId).single();
  if (!data) return false;
  const newVal = Math.min(100, (data as Record<string, number>).dev_index + devDelta);
  const { error } = await supabase.from('governing_areas').update({ dev_index: newVal, last_invested_day: 0 }).eq('id', areaId);
  return !error;
}

export async function visitArea(areaId: string, visitDay: number, favorDelta: number): Promise<boolean> {
  const { data } = await supabase.from('governing_areas').select('favor_index').eq('id', areaId).single();
  if (!data) return false;
  const newFavor = Math.min(100, (data as Record<string, number>).favor_index + favorDelta);
  const { error } = await supabase.from('governing_areas').update({ favor_index: newFavor, last_visited_day: visitDay }).eq('id', areaId);
  return !error;
}

export async function updateAreaDevIndex(areaId: string, gameDays: number): Promise<void> {
  await supabase.from('governing_areas').update({ last_invested_day: gameDays }).eq('id', areaId);
}

// ============ 补充下属至职级上限 ============
export async function supplementSubordinates(
  saveId: string, userId: string, rankLevel: number, currentCount: number
): Promise<number> {
  await ensureNpcNamePoolLoaded();
  const { SUBORDINATE_LIMIT } = await import('@/types/game');
  const limit = SUBORDINATE_LIMIT[rankLevel] ?? 5;
  const needed = limit - currentCount;
  if (needed <= 0) return 0;

  const POSITIONS = ['副科长', '科员', '主任科员', '副主任', '主任', '办公室主任', '专员', '副处长', '处长'];

  // 按玩家职级生成现实合理的下属初始职级：以 rankLevel-2 为基础，分布到 [rankLevel-3, rankLevel-1]
  // 例如玩家 rank6（县委书记）→ 下属主要在 3-5 级（正科～正处）
  const subLevelBase = Math.max(1, rankLevel - 2);
  const genSubLevel = () => {
    const r = Math.random();
    if (r < 0.5) return subLevelBase;                          // 50% 中间层
    if (r < 0.80) return Math.max(1, subLevelBase - 1);       // 30% 低一级
    return Math.min(12, subLevelBase + 1);                     // 20% 高一级
  };

  const rows = Array.from({ length: needed }, () => {
    const isMale = Math.random() > 0.45;
    const name = pickNpcName();
    return {
      save_id: saveId,
      user_id: userId,
      name,
      position: POSITIONS[Math.floor(Math.random() * POSITIONS.length)],
      role: '普通干部',
      avatar_id: Math.floor(Math.random() * 6),
      gender: isMale ? '男' : '女',
      ability: 40 + Math.floor(Math.random() * 30),
      loyalty: 40 + Math.floor(Math.random() * 30),
      integrity: 50 + Math.floor(Math.random() * 30),
      experience: 10 + Math.floor(Math.random() * 30),
      sub_level: genSubLevel(),  // ← 按玩家职级生成现实职级
      is_appointed: false,
      appointed_role: null,
      appointed_dept: null,
      dept_position: 'head',
      transferred_city: null,
      last_assessed_day: 0,
    };
  });

  await supabase.from('subordinates').insert(rows);
  return needed;
}

// ============ 招募候选人 ============
function rowToRecruit(row: Record<string, unknown>): RecruitCandidate {
  return {
    id: row.id as string,
    saveId: row.save_id as string,
    userId: row.user_id as string,
    yearKey: row.year_key as number,
    name: row.name as string,
    gender: (row.gender as string) ?? '男',
    avatarId: (row.avatar_id as number) ?? 0,
    ability: row.ability as number,
    loyalty: row.loyalty as number,
    integrity: row.integrity as number,
    experience: row.experience as number,
    trait: (row.trait as string) ?? '',
    rankOrder: (row.rank_order as number) ?? null,
    status: (row.status as RecruitCandidate['status']) ?? 'pending',
    createdAt: row.created_at as string,
    // ── 个人档案 ──────────────────────────────────────────────────
    birthYear: (row.birth_year as number) ?? null,
    university: (row.university as string) ?? null,
    major: (row.major as string) ?? null,
    hometown: (row.hometown as string) ?? null,
    score: (row.score as number) ?? null,
  };
}

export async function getOrCreateRecruitCandidates(
  saveId: string, userId: string, yearKey: number
): Promise<RecruitCandidate[]> {
  await ensureNpcNamePoolLoaded();
  // 查询当年候选人
  const { data: existing } = await supabase
    .from('recruit_candidates')
    .select('*')
    .eq('save_id', saveId)
    .eq('year_key', yearKey)
    .order('created_at', { ascending: true });
  if (existing && existing.length > 0) return (existing as Record<string, unknown>[]).map(rowToRecruit);

  // 生成10名候选人
  const rows = Array.from({ length: 10 }, () => {
    const isMale = Math.random() > 0.4;
    const name = pickNpcName();
    const trait = SUB_TRAITS[Math.floor(Math.random() * SUB_TRAITS.length)];
    return {
      save_id: saveId,
      user_id: userId,
      year_key: yearKey,
      name,
      gender: isMale ? '男' : '女',
      avatar_id: Math.floor(Math.random() * 8),
      ability: 45 + Math.floor(Math.random() * 40),
      loyalty: 50 + Math.floor(Math.random() * 35),
      integrity: 50 + Math.floor(Math.random() * 35),
      experience: 15 + Math.floor(Math.random() * 35),
      trait,
      rank_order: null,
      status: 'pending',
    };
  });
  const { data: created } = await supabase.from('recruit_candidates').insert(rows).select('*');
  if (!created) return [];
  return (created as Record<string, unknown>[]).map(rowToRecruit);
}

export async function selectRecruit(candidateId: string, rankOrder: number): Promise<boolean> {
  const { error } = await supabase
    .from('recruit_candidates')
    .update({ status: 'selected', rank_order: rankOrder })
    .eq('id', candidateId);
  return !error;
}

export async function dismissRecruit(candidateId: string): Promise<boolean> {
  const { error } = await supabase
    .from('recruit_candidates')
    .update({ status: 'dismissed', rank_order: null })
    .eq('id', candidateId);
  return !error;
}

// 确认招募：将选中的候选人加入下属列表，最多3名，自动分配到编制空缺部门
export async function confirmRecruits(
  saveId: string, userId: string, yearKey: number
): Promise<{ count: number; assignments: { name: string; dept: string; position: string }[] }> {
  const { data } = await supabase
    .from('recruit_candidates')
    .select('*')
    .eq('save_id', saveId)
    .eq('year_key', yearKey)
    .eq('status', 'selected')
    .order('rank_order', { ascending: true })
    .limit(3);
  if (!data || data.length === 0) return { count: 0, assignments: [] };

  const rows = (data as Record<string, unknown>[]).map(r => ({
    save_id: saveId,
    user_id: userId,
    name: r.name,
    position: '待分配',
    role: '新录用干部',
    avatar_id: r.avatar_id,
    gender: r.gender,
    ability: r.ability,
    loyalty: r.loyalty,
    integrity: r.integrity,
    experience: r.experience,
    sub_level: 1, // 新录用公务员从科员级(1)起步
    is_appointed: false,
    appointed_role: null,
    appointed_dept: null,
    dept_position: 'deputy',
    transferred_city: null,
    last_assessed_day: 0,
    new_recruit: true,
  }));

  const { data: inserted } = await supabase.from('subordinates').insert(rows).select('id');
  const newIds = (inserted ?? []).map((r: Record<string, unknown>) => r.id as string);

  // 自动分配到编制最空缺的部门
  const assignments = await autoAssignNewRecruits(saveId, newIds);

  // 标记本批次已完成招募
  await supabase
    .from('recruit_candidates')
    .update({ status: 'dismissed' })
    .eq('save_id', saveId)
    .eq('year_key', yearKey);
  // 更新 player_saves.last_recruit_quarter
  await supabase
    .from('player_saves')
    .update({ last_recruit_quarter: yearKey })
    .eq('id', saveId);
  return { count: rows.length, assignments };
}

// ============ 下属拜访 ============
// 随机触发：选一个高忠诚度下属拜访
export async function triggerSubVisit(saveId: string): Promise<{ subId: string; subName: string } | null> {
  const { data } = await supabase
    .from('subordinates')
    .select('id, name, loyalty')
    .eq('save_id', saveId)
    .gte('loyalty', 60)
    .order('loyalty', { ascending: false })
    .limit(10);
  if (!data || data.length === 0) return null;
  const pool = data as { id: string; name: string; loyalty: number }[];
  const picked = pool[Math.floor(Math.random() * Math.min(pool.length, 5))];
  return { subId: picked.id, subName: picked.name };
}

// 响应拜访：增加忠诚度+好感度
export async function resolveSubVisit(
  saveId: string, subId: string, accept: boolean
): Promise<void> {
  if (accept) {
    const { data } = await supabase.from('subordinates').select('loyalty').eq('id', subId).maybeSingle();
    if (data) {
      const row = data as { loyalty: number };
      await supabase.from('subordinates').update({
        loyalty: Math.min(100, row.loyalty + 8),
      }).eq('id', subId);
    }
  }
  await supabase.from('player_saves').update({
    sub_visit_pending: false,
    sub_visit_sub_id: null,
    sub_visit_sub_name: null,
  }).eq('id', saveId);
}

// ============ 年度考核（按能力高低分级不合格率）============
// 能力<70 → 20%不合格；能力>=70 → 5%不合格；调任下属不参与
export async function runAnnualSubAssessment(saveId: string, currentDay: number): Promise<{
  failed: string[]; passed: string[];
}> {
  const { data } = await supabase
    .from('subordinates')
    .select('id, name, ability, integrity, experience')
    .eq('save_id', saveId)
    .is('transferred_city', null);
  if (!data) return { failed: [], passed: [] };

  const rows = data as { id: string; name: string; ability: number; integrity: number; experience: number }[];
  const failed: string[] = [];
  const passed: string[] = [];

  for (const sub of rows) {
    // 不合格概率：能力低70% → 20%；能力高 → 5%
    const failRate = sub.ability < 70 ? 0.20 : 0.05;
    const isFail = Math.random() < failRate;
    if (isFail) {
      failed.push(sub.name);
      // 不合格：能力-5，经验-3
      await supabase.from('subordinates').update({
        ability: Math.max(0, sub.ability - 5),
        experience: Math.max(0, sub.experience - 3),
        last_assessed_day: currentDay,
      }).eq('id', sub.id);
    } else {
      passed.push(sub.name);
      // 合格：经验+3
      await supabase.from('subordinates').update({
        experience: Math.min(100, sub.experience + 3),
        last_assessed_day: currentDay,
      }).eq('id', sub.id);
    }
  }
  return { failed, passed };
}

// ============ 删除存档 ============
export async function deleteSave(saveId: string): Promise<boolean> {
  // 按依赖顺序删除关联数据
  await supabase.from('recruit_candidates').delete().eq('save_id', saveId);
  await supabase.from('welfare_actions').delete().eq('save_id', saveId);
  await supabase.from('city_finance').delete().eq('save_id', saveId);
  await supabase.from('secretary').delete().eq('save_id', saveId);
  await supabase.from('monthly_meetings').delete().eq('save_id', saveId);
  await supabase.from('governing_areas').delete().eq('save_id', saveId);
  await supabase.from('build_projects').delete().eq('save_id', saveId);
  await supabase.from('family_members').delete().eq('save_id', saveId);
  await supabase.from('police_cases').delete().eq('save_id', saveId);
  await supabase.from('events').delete().eq('save_id', saveId);
  await supabase.from('boss_tasks').delete().eq('save_id', saveId);
  await supabase.from('boss_interactions').delete().eq('save_id', saveId);
  await supabase.from('subordinates').delete().eq('save_id', saveId);
  const { error } = await supabase.from('player_saves').delete().eq('id', saveId);
  return !error;
}
function rowToMeeting(row: Record<string, unknown>): MonthlyMeeting {
  return {
    id: row.id as string,
    saveId: row.save_id as string,
    userId: row.user_id as string,
    monthKey: row.month_key as string,
    heldDay: row.held_day as number,
    tasks: (row.tasks as MeetingTask[]) ?? [],
    createdAt: row.created_at as string,
  };
}

export async function getMeetingByMonth(saveId: string, monthKey: string): Promise<MonthlyMeeting | null> {
  const { data } = await supabase
    .from('monthly_meetings')
    .select('*')
    .eq('save_id', saveId)
    .eq('month_key', monthKey)
    .maybeSingle();
  if (!data) return null;
  return rowToMeeting(data as Record<string, unknown>);
}

export async function createMeeting(saveId: string, userId: string, monthKey: string, heldDay: number, tasks: MeetingTask[]): Promise<MonthlyMeeting | null> {
  const { data, error } = await supabase
    .from('monthly_meetings')
    .insert({ save_id: saveId, user_id: userId, month_key: monthKey, held_day: heldDay, tasks })
    .select('*')
    .single();
  if (error || !data) return null;
  return rowToMeeting(data as Record<string, unknown>);
}

export async function getRecentMeetings(saveId: string, limit = 6): Promise<MonthlyMeeting[]> {
  const { data } = await supabase
    .from('monthly_meetings')
    .select('*')
    .eq('save_id', saveId)
    .order('held_day', { ascending: false })
    .limit(limit);
  if (!data) return [];
  return (data as Record<string, unknown>[]).map(rowToMeeting);
}

// 检查会议KPI任务完成情况（推进时间时调用）
export async function resolveMeetingTasks(saveId: string, gameDays: number): Promise<{ meritBonus: number; failedSubIds: string[] }> {
  const { data } = await supabase
    .from('monthly_meetings')
    .select('*')
    .eq('save_id', saveId);
  if (!data || data.length === 0) return { meritBonus: 0, failedSubIds: [] };

  let meritBonus = 0;
  const failedSubIds: string[] = [];

  for (const row of data as Record<string, unknown>[]) {
    const meeting = rowToMeeting(row);
    let changed = false;
    const updatedTasks = meeting.tasks.map(t => {
      if (t.status !== 'pending') return t;
      if (gameDays >= t.deadlineDay) {
        // 简单模拟：60%概率完成
        const done = Math.random() < 0.6;
        changed = true;
        if (done) {
          meritBonus += t.targetValue * 2;
          return { ...t, status: 'done' as const, completedDay: gameDays };
        } else {
          failedSubIds.push(t.subordinateId);
          return { ...t, status: 'failed' as const, completedDay: null };
        }
      }
      return t;
    });
    if (changed) {
      await supabase.from('monthly_meetings').update({ tasks: updatedTasks }).eq('id', meeting.id);
    }
  }
  return { meritBonus, failedSubIds };
}

// ============ 秘书 ============
function rowToSecretary(row: Record<string, unknown>): Secretary {
  return {
    id: row.id as string,
    saveId: row.save_id as string,
    userId: row.user_id as string,
    name: row.name as string,
    avatarId: (row.avatar_id as number) ?? 1,
    ability: (row.ability as number) ?? 60,
    lastDocworkDay: (row.last_docwork_day as number) ?? 0,
    dailySchedule: row.daily_schedule as string | null,
    createdAt: row.created_at as string,
    subId: (row.sub_id as string) ?? null,
    isAppointed: (row.is_appointed as boolean) ?? false,
  };
}

export async function getOrCreateSecretary(saveId: string, userId: string): Promise<Secretary | null> {
  const { data: existing } = await supabase
    .from('secretary')
    .select('*')
    .eq('save_id', saveId)
    .maybeSingle();
  if (existing) {
    const sec = rowToSecretary(existing as Record<string, unknown>);
    // 兼容旧存档：迁移前自动生成的 NPC 秘书（ability>0 且非待任命占位）自动升级为已任命
    if (!sec.isAppointed && sec.ability > 0 && sec.name !== '（待任命）') {
      await supabase.from('secretary').update({ is_appointed: true }).eq('id', sec.id);
      sec.isAppointed = true;
    }
    return sec;
  }

  // 未有记录时创建待任命占位
  const { data, error } = await supabase
    .from('secretary')
    .insert({ save_id: saveId, user_id: userId, name: '（待任命）', avatar_id: 1, ability: 0, is_appointed: false })
    .select('*')
    .single();
  if (error || !data) return null;
  return rowToSecretary(data as Record<string, unknown>);
}

/** 任命某下属为专属秘书 */
export async function appointSubAsSecretary(
  saveId: string, sub: { id: string; name: string; avatarId: number; ability: number }
): Promise<boolean> {
  // 先查当前用户，确保 upsert 时带上正确的 user_id（满足 RLS WITH CHECK）
  const { data: u } = await supabase.auth.getUser();
  const userId = u?.user?.id;
  if (!userId) return false;

  // 用 upsert 而非 update：避免存档从未进过秘书页导致无 secretary 行、
  // update 匹配 0 行却不报错（静默失败、返回 true 但实际未更新）的 bug。
  // save_id 为 UNIQUE，onConflict='save_id' 时存在则更新、不存在则插入。
  const { error } = await supabase
    .from('secretary')
    .upsert({
      save_id: saveId,
      user_id: userId,
      sub_id: sub.id,
      name: sub.name,
      avatar_id: sub.avatarId,
      ability: Math.min(sub.ability, 100),
      is_appointed: true,
    }, { onConflict: 'save_id' });
  if (error) return false;

  // 同步更新下属岗位标注
  const { error: subErr } = await supabase
    .from('subordinates')
    .update({ appointed_role: '专属秘书', is_appointed: true })
    .eq('id', sub.id);
  if (subErr) return false;

  // 校验：回查确认任命确实生效
  const { data: verify } = await supabase
    .from('secretary')
    .select('is_appointed, sub_id')
    .eq('save_id', saveId)
    .maybeSingle();
  const v = verify as Record<string, unknown> | null;
  return !!(v && v.is_appointed === true && v.sub_id === sub.id);
}

/** 解除秘书任命（还原为待任命状态）*/
export async function recallSecretary(saveId: string, subId: string): Promise<boolean> {
  const { data: u } = await supabase.auth.getUser();
  const userId = u?.user?.id;
  if (!userId) return false;

  // 同样用 upsert 确保无论 secretary 行是否存在都能还原为待任命占位
  const { error } = await supabase
    .from('secretary')
    .upsert({
      save_id: saveId,
      user_id: userId,
      sub_id: null,
      name: '（待任命）',
      avatar_id: 1,
      ability: 0,
      is_appointed: false,
    }, { onConflict: 'save_id' });
  if (error) return false;

  // 解除下属的秘书岗位标注
  await supabase
    .from('subordinates')
    .update({ appointed_role: null, is_appointed: false })
    .eq('id', subId);
  return true;
}

export async function doDocwork(secretaryId: string, gameDays: number): Promise<{ meritGain: number } | null> {
  const { data } = await supabase.from('secretary').select('ability,last_docwork_day').eq('id', secretaryId).maybeSingle();
  if (!data) return null;
  const row = data as Record<string, unknown>;
  const ability = (row.ability as number) ?? 60;
  if (ability < 20) return null; // 能力不足
  const gain = 5 + Math.floor(ability / 20);
  const newAbility = Math.max(10, ability - 10); // 整理公文消耗能力值
  await supabase.from('secretary').update({ ability: newAbility, last_docwork_day: gameDays }).eq('id', secretaryId);
  return { meritGain: gain };
}

export async function updateSecretarySchedule(secretaryId: string, schedule: string): Promise<boolean> {
  const { error } = await supabase.from('secretary').update({ daily_schedule: schedule }).eq('id', secretaryId);
  return !error;
}

export async function restoreSecretaryAbility(secretaryId: string): Promise<void> {
  const { data } = await supabase.from('secretary').select('ability').eq('id', secretaryId).maybeSingle();
  if (!data) return;
  const ability = (data as Record<string, unknown>).ability as number;
  if (ability < 100) {
    await supabase.from('secretary').update({ ability: Math.min(100, ability + 5) }).eq('id', secretaryId);
  }
}

// ============ 城市金融 ============
function rowToFinance(row: Record<string, unknown>): CityFinance {
  return {
    id: row.id as string,
    saveId: row.save_id as string,
    userId: row.user_id as string,
    fundBalance: (row.fund_balance as number) ?? 0,
    debtTotal: (row.debt_total as number) ?? 0,
    loans: (row.loans as LoanRecord[]) ?? [],
    investments: (row.investments as InvestmentRecord[]) ?? [],
    investGroupEstDay: row.invest_group_est_day as number | null,
    createdAt: row.created_at as string,
    updatedAt: row.updated_at as string,
  };
}

export async function getOrCreateFinance(saveId: string, userId: string): Promise<CityFinance | null> {
  const { data: existing } = await supabase
    .from('city_finance')
    .select('*')
    .eq('save_id', saveId)
    .maybeSingle();
  if (existing) return rowToFinance(existing as Record<string, unknown>);

  const { data, error } = await supabase
    .from('city_finance')
    .insert({ save_id: saveId, user_id: userId, fund_balance: 0, debt_total: 0, loans: [], investments: [] })
    .select('*')
    .single();
  if (error || !data) return null;
  return rowToFinance(data as Record<string, unknown>);
}

/** 直接扣减城市财政余额（万元单位，delta 为负数表示扣减）
 *  player_saves.fund_balance 是月度结算的唯一权威来源，此处直接更新该表。
 */
export async function updateCityFinanceFund(saveId: string, deltaWan: number): Promise<boolean> {
  const { data: row } = await supabase.from('player_saves').select('fund_balance').eq('id', saveId).maybeSingle();
  if (!row) return false;
  const current = (row.fund_balance as number) ?? 0;
  const next = Math.max(0, current + deltaWan);
  const { error } = await supabase.from('player_saves')
    .update({ fund_balance: next, updated_at: new Date().toISOString() })
    .eq('id', saveId);
  return !error;
}

export async function applyLoan(saveId: string, loan: LoanRecord): Promise<boolean> {
  const finance = await getOrCreateFinance(saveId, '');
  if (!finance) return false;
  const { data: row } = await supabase.from('city_finance').select('*').eq('save_id', saveId).maybeSingle();
  if (!row) return false;
  const current = rowToFinance(row as Record<string, unknown>);
  const newLoans = [...current.loans, loan];
  const newBalance = current.fundBalance + loan.amount;
  const newDebt = current.debtTotal + loan.amount;
  const { error } = await supabase.from('city_finance').update({ loans: newLoans, fund_balance: newBalance, debt_total: newDebt, updated_at: new Date().toISOString() }).eq('save_id', saveId);
  return !error;
}

export async function startInvestment(saveId: string, inv: InvestmentRecord): Promise<boolean> {
  // 资金余额以 player_saves.fund_balance 为权威来源（月度税收/财政统一写入此表）
  const { data: saveRow } = await supabase.from('player_saves').select('fund_balance').eq('id', saveId).maybeSingle();
  const balance = (saveRow?.fund_balance as number) ?? 0;
  if (balance < inv.amount) return false;
  const { data: row } = await supabase.from('city_finance').select('*').eq('save_id', saveId).maybeSingle();
  if (!row) return false;
  const current = rowToFinance(row as Record<string, unknown>);
  const newInvs = [...current.investments, inv];
  const newBalance = Math.max(0, balance - inv.amount);
  const { error } = await supabase.from('city_finance').update({ investments: newInvs, fund_balance: newBalance, updated_at: new Date().toISOString() }).eq('save_id', saveId);
  if (error) return false;
  // 同步扣减 player_saves 资金余额（权威来源）
  await supabase.from('player_saves').update({ fund_balance: newBalance }).eq('id', saveId);
  return true;
}

export async function establishInvestGroup(saveId: string, gameDays: number): Promise<boolean> {
  const { error } = await supabase.from('city_finance').update({ invest_group_est_day: gameDays, updated_at: new Date().toISOString() }).eq('save_id', saveId);
  return !error;
}

// 每月处理贷款还款和到期投资（时间推进时调用）
export async function processFinanceMonth(saveId: string, userId: string, gameDays: number): Promise<{ meritBonus: number; gdpBonus: number; bizBonus: number; liveBonus: number; ecoBonus: number; penaltyMerit: number }> {
  const result = { meritBonus: 0, gdpBonus: 0, bizBonus: 0, liveBonus: 0, ecoBonus: 0, penaltyMerit: 0 };
  const { data: row } = await supabase.from('city_finance').select('*').eq('save_id', saveId).maybeSingle();
  if (!row) return result;
  const finance = rowToFinance(row as Record<string, unknown>);

  let newBalance = finance.fundBalance;
  let newDebt = finance.debtTotal;
  const updatedLoans = finance.loans.map(l => {
    if (l.status !== 'active') return l;
    if (gameDays >= l.dueDay) {
      if (newBalance >= l.monthlyPay) {
        newBalance -= l.monthlyPay;
        newDebt = Math.max(0, newDebt - l.monthlyPay);
        return { ...l, status: 'paid' as const };
      } else {
        result.penaltyMerit += 20; // 逾期罚款
        return l;
      }
    }
    // 正常月供
    if (newBalance >= l.monthlyPay) {
      newBalance -= l.monthlyPay;
      newDebt = Math.max(0, newDebt - l.monthlyPay);
    } else {
      result.penaltyMerit += 5;
    }
    return l;
  });

  const updatedInvs = finance.investments.map(inv => {
    if (inv.status !== 'running') return inv;
    if (gameDays >= inv.endDay) {
      result.meritBonus += 30;
      if (inv.effectType === 'gdp') result.gdpBonus += inv.effectValue;
      if (inv.effectType === 'business') result.bizBonus += inv.effectValue;
      if (inv.effectType === 'livelihood') result.liveBonus += inv.effectValue;
      if (inv.effectType === 'ecology') result.ecoBonus += inv.effectValue;
      return { ...inv, status: 'done' as const };
    }
    return inv;
  });

  await supabase.from('city_finance').update({
    fund_balance: newBalance, debt_total: newDebt,
    loans: updatedLoans, investments: updatedInvs,
    updated_at: new Date().toISOString(),
  }).eq('save_id', saveId);
  // 同步player_saves资金余额
  await supabase.from('player_saves').update({ fund_balance: newBalance }).eq('id', saveId);
  return result;
}

// ============ 民生操作 ============
export async function doWelfareAction(
  saveId: string, userId: string,
  actionType: 'welfare' | 'education' | 'healthcare' | 'housing',
  costMerit: number, effectValue: number, gameDays: number,
  costFund = 0
): Promise<boolean> {
  const { error } = await supabase.from('welfare_actions').insert({
    save_id: saveId, user_id: userId,
    action_type: actionType, cost_merit: costMerit,
    effect_value: effectValue, done_day: gameDays,
    cost_fund: costFund,
  });
  return !error;
}

export interface WelfareRecord {
  id: string;
  actionType: string;
  costMerit: number;
  costFund: number;
  effectValue: number;
  doneDay: number;
}

export async function getWelfareHistory(saveId: string, limit = 5): Promise<WelfareRecord[]> {
  const { data, error } = await supabase
    .from('welfare_actions')
    .select('*')
    .eq('save_id', saveId)
    .order('done_day', { ascending: false })
    .limit(limit);
  if (error || !data) return [];
  return (data as Record<string, unknown>[]).map(r => ({
    id: r.id as string,
    actionType: r.action_type as string,
    costMerit: r.cost_merit as number,
    costFund: (r.cost_fund as number) ?? 0,
    effectValue: r.effect_value as number,
    doneDay: r.done_day as number,
  }));
}

// ============ 年度招募（每年2次：春招约第90天/国考批次 & 秋招约第270天/省考批次）============
//
// 现实依据：
//   • 国家公务员考试（国考）：每年10-11月报名笔试，次年春季录用 → 游戏映射为第1批（前半年）
//   • 省级公务员考试（省考）：每年3-4月笔试，5-6月面试录用 → 游戏映射为第2批（后半年）
//   • 主管机构：人力资源和社会保障局（人社局）组织笔试，
//               县/市/省委组织部负责政治考察与录用审批
//   • rank 1-3（乡镇/科员级）：参加省考/国考，录用科员~副科级人员
//   • rank 4-6（县级）：组织部统一分配科员~正科级人员（不再手动选择，改为自动录用并分配）
//   • rank 7+：由上级组织部统筹分配，无需手动招募
//
// yearKey 编码：year * 10 + round（round=0春招, round=1秋招）

/** 计算当前招募批次 key（year * 10 + round），每年2次：前半年0、后半年1 */
export function getCurrentRecruitKey(gameDays: number): number {
  const year = Math.floor(gameDays / 365);
  const dayInYear = gameDays % 365;
  const round = dayInYear < 182 ? 0 : 1; // 0=春招(国考), 1=秋招(省考)
  return year * 10 + round;
}

/** 批次描述 */
export function getRecruitRoundLabel(recruitKey: number): string {
  const round = recruitKey % 10;
  const year = Math.floor(recruitKey / 10);
  return round === 0
    ? `第${year + 1}年 · 春季招录（参照国家公务员考试）`
    : `第${year + 1}年 · 秋季招录（参照省级公务员考试）`;
}

/** 候选人主管机构（按职级） */
export function getRecruitOrg(rankLevel: number): string {
  if (rankLevel <= 3) return '县委组织部 & 人社局';
  if (rankLevel <= 6) return '市委组织部';
  if (rankLevel <= 9) return '省委组织部';
  return '中枢组织部';
}

export async function getOrCreateQuarterCandidates(
  saveId: string, userId: string, recruitKey: number, rankLevel = 3
): Promise<RecruitCandidate[]> {
  await ensureNpcNamePoolLoaded();
  const { data: existing } = await supabase
    .from('recruit_candidates')
    .select('*')
    .eq('save_id', saveId)
    .eq('year_key', recruitKey)
    .order('created_at', { ascending: true });
  if (existing && existing.length > 0) return (existing as Record<string, unknown>[]).map(rowToRecruit);

  // 候选人数：国考批次12人，省考批次8人
  const isNationalExam = recruitKey % 10 === 0;
  const count = isNationalExam ? 12 : 8;
  // 游戏年份（用于推算出生年份）
  const gameYear = Math.floor(recruitKey / 10) + 2000;

  // 院校分层：985/211/普本/大专
  const UNIV_985 = ['北京大学', '清华大学', '复旦大学', '中国人民大学', '武汉大学', '浙江大学', '南京大学', '中山大学', '吉林大学', '四川大学', '华中科技大学', '中南大学'];
  const UNIV_211 = ['郑州大学', '河北大学', '湖南大学', '西南大学', '华南理工大学', '苏州大学', '扬州大学', '安徽大学', '广西大学', '云南大学', '贵州大学', '兰州大学'];
  const UNIV_NORMAL = ['湖南师范大学', '河南工业大学', '广西师范大学', '安徽师范大学', '江西师范大学', '辽宁大学', '西北师范大学', '内蒙古大学', '山西大学', '青海大学'];
  const UNIV_COLLEGE = ['某某职业技术学院', '某省行政管理学院', '某市干部培训学校'];

  // 专业池（公务员常见）
  const MAJORS = ['行政管理', '公共管理', '法学', '经济学', '财政学', '会计学', '金融学', '计算机科学与技术', '土木工程', '农学', '中文（汉语言文学）', '历史学', '社会学'];

  // 籍贯省份
  const HOMETOWNS = ['湖南省', '湖北省', '四川省', '广东省', '浙江省', '江苏省', '河南省', '山东省', '安徽省', '陕西省', '江西省', '重庆市', '辽宁省', '河北省', '福建省', '广西壮族自治区', '云南省', '贵州省'];

  // 教育背景配置
  const EDU_POOL: { label: string; abilityBonus: number; loyaltyBonus: number; univPool: string[]; weight: number }[] = [
    { label: '博士研究生', abilityBonus: 18, loyaltyBonus: 2, univPool: UNIV_985, weight: 5 },
    { label: '硕士研究生', abilityBonus: 10, loyaltyBonus: 3, univPool: [...UNIV_985, ...UNIV_211], weight: 25 },
    { label: '本科（985/211）', abilityBonus: 5, loyaltyBonus: 2, univPool: [...UNIV_985, ...UNIV_211], weight: 30 },
    { label: '本科', abilityBonus: 0, loyaltyBonus: 0, univPool: UNIV_NORMAL, weight: 30 },
    { label: '大专', abilityBonus: -5, loyaltyBonus: 5, univPool: UNIV_COLLEGE, weight: 10 },
  ];

  function pickEdu() {
    const total = EDU_POOL.reduce((s, e) => s + e.weight, 0);
    let r = Math.random() * total;
    for (const e of EDU_POOL) { r -= e.weight; if (r <= 0) return e; }
    return EDU_POOL[2];
  }

  const rows = Array.from({ length: count }, () => {
    const isMale = Math.random() > 0.4;
    const name = pickNpcName();
    const trait = SUB_TRAITS[Math.floor(Math.random() * SUB_TRAITS.length)];
    const edu = pickEdu();
    const univ = edu.univPool[Math.floor(Math.random() * edu.univPool.length)];
    const major = MAJORS[Math.floor(Math.random() * MAJORS.length)];
    const hometown = HOMETOWNS[Math.floor(Math.random() * HOMETOWNS.length)];
    // 入职年龄22-28岁（博士最大到32），出生年份由此推算
    const entryAge = edu.label === '博士研究生' ? 27 + Math.floor(Math.random() * 5)
      : edu.label === '硕士研究生' ? 24 + Math.floor(Math.random() * 4)
      : 22 + Math.floor(Math.random() * 4);
    const birthYear = gameYear - entryAge;

    const baseAbility = rankLevel <= 3
      ? 42 + Math.floor(Math.random() * 35)
      : 50 + Math.floor(Math.random() * 35);
    const ability = Math.min(99, baseAbility + edu.abilityBonus);
    const loyalty = Math.min(99, 45 + Math.floor(Math.random() * 40) + edu.loyaltyBonus);
    const integrity = 50 + Math.floor(Math.random() * 38);
    const experience = rankLevel <= 3 ? 5 + Math.floor(Math.random() * 20) : 15 + Math.floor(Math.random() * 30);
    // 综合评分：能力60% + 廉洁25% + 忠诚15%
    const score = Math.round(ability * 0.6 + integrity * 0.25 + loyalty * 0.15);

    return {
      save_id: saveId,
      user_id: userId,
      year_key: recruitKey,
      name,
      gender: isMale ? '男' : '女',
      avatar_id: Math.floor(Math.random() * 8),
      ability,
      loyalty,
      integrity,
      experience,
      trait,
      rank_order: null,
      status: 'pending',
      birth_year: birthYear,
      university: univ,
      major,
      hometown,
      score,
    };
  });

  const { data: created } = await supabase.from('recruit_candidates').insert(rows).select('*');
  if (!created) return [];
  return (created as Record<string, unknown>[]).map(rowToRecruit);
}

/**
 * 系统自动招募：按综合评分选出前N名直接录用并分配部门。
 * 调用后无需玩家手动确认，直接完成本批次招募。
 */
export async function triggerAutoRecruit(
  saveId: string, userId: string, recruitKey: number, rankLevel: number
): Promise<{ count: number; assignments: { name: string; dept: string; position: string }[]; recruited: RecruitCandidate[]; recruitType: 'national' | 'provincial' }> {
  const isNationalExam = recruitKey % 10 === 0; // true=国考(春季), false=省考(秋季)

  // 1. 生成候选人（如果已存在则直接取）
  const allCandidates = await getOrCreateQuarterCandidates(saveId, userId, recruitKey, rankLevel);

  // 2. 按综合评分排序
  const sorted = [...allCandidates].sort((a, b) => (b.score ?? 0) - (a.score ?? 0));

  // 3. 录取名额差异化：
  //    国考（精英通道）：1-2名，竞争激烈
  //    省考（编制补充）：按空缺填满，最多6名
  let recruitCount: number;
  if (isNationalExam) {
    // 国考：高职级多一名（因为选调生项目更强），但总体名额少
    recruitCount = rankLevel <= 3 ? 1 : 2;
  } else {
    // 省考：查现有编制空缺，按空缺数录用（至少2名，最多6名）
    const { data: currentStaff } = await supabase
      .from('subordinates')
      .select('id')
      .eq('save_id', saveId)
      .eq('is_appointed', true)
      .is('transferred_city', null);
    const currentCount = (currentStaff ?? []).length;
    const quotaBase = rankLevel <= 3 ? 8 : rankLevel <= 6 ? 20 : rankLevel <= 9 ? 50 : 120;
    const vacancy = Math.max(0, quotaBase - currentCount);
    recruitCount = Math.max(2, Math.min(6, vacancy));
  }

  const toRecruit = sorted.slice(0, recruitCount);

  if (toRecruit.length === 0) return { count: 0, assignments: [], recruited: [], recruitType: isNationalExam ? 'national' : 'provincial' };

  // 3. 标记录取状态（selected），其余 dismissed
  for (let i = 0; i < toRecruit.length; i++) {
    await supabase.from('recruit_candidates').update({ status: 'selected', rank_order: i + 1 }).eq('id', toRecruit[i].id);
  }
  await supabase.from('recruit_candidates')
    .update({ status: 'dismissed' })
    .eq('save_id', saveId).eq('year_key', recruitKey).eq('status', 'pending');

  // 4. 将录取人员插入下属表（含完整档案）
  //    国考前1名（或唯一录用者）标记为选调生角色
  const rows = toRecruit.map((r, idx) => {
    const isZhuandiaosheng = isNationalExam && idx === 0 && (r.score ?? 0) >= 80;
    return {
      save_id: saveId,
      user_id: userId,
      name: r.name,
      position: isZhuandiaosheng ? '选调生（重要岗位预备）' : '待分配',
      role: isZhuandiaosheng ? '中央选调生' : '新录用干部',
      avatar_id: r.avatarId,
      gender: r.gender,
      ability: r.ability,
      loyalty: r.loyalty,
      integrity: r.integrity,
      experience: r.experience,
      sub_level: isZhuandiaosheng ? 2 : 1, // 选调生直接定副科级起步
      is_appointed: false,
      appointed_role: null,
      appointed_dept: null,
      dept_position: 'deputy',
      transferred_city: null,
      last_assessed_day: 0,
      birth_year: r.birthYear,
      university: r.university,
      major: r.major,
      hometown: r.hometown,
    };
  });
  const { data: inserted } = await supabase.from('subordinates').insert(rows).select('id');
  const newIds = (inserted ?? []).map((r: Record<string, unknown>) => r.id as string);

  // 5. 自动分配部门
  //    国考：选调生优先分配到重要岗位（ndrc/finance/organization）
  //    省考：按编制最空缺分配
  const assignments = await autoAssignNewRecruits(saveId, newIds, isNationalExam);

  // 6. 更新 last_recruit_quarter，完成本批次
  await supabase.from('player_saves').update({ last_recruit_quarter: recruitKey }).eq('id', saveId);

  return { count: toRecruit.length, assignments, recruited: toRecruit, recruitType: isNationalExam ? 'national' : 'provincial' };
}

/** 招募完成后自动将新录用干部分配到编制最空缺的部门
 *  isNationalExam=true 时：前1名（选调生）优先分配到重要岗位
 */
export async function autoAssignNewRecruits(
  saveId: string,
  newSubIds: string[],
  isNationalExam = false,
): Promise<{ name: string; dept: string; position: string }[]> {
  if (newSubIds.length === 0) return [];

  // 查询各部门已有下属数量（未调任，已任命）
  const { data: appointed } = await supabase
    .from('subordinates')
    .select('appointed_dept')
    .eq('save_id', saveId)
    .eq('is_appointed', true)
    .is('transferred_city', null);

  const deptCount: Record<string, number> = {};
  (appointed ?? []).forEach((r: Record<string, unknown>) => {
    const d = r.appointed_dept as string;
    if (d) deptCount[d] = (deptCount[d] ?? 0) + 1;
  });

  // 按需求量从高到低排序部门（人少的优先）
  const DEPT_KEYS_LIST = ['police', 'ndrc', 'finance', 'urban', 'education', 'health',
    'ecology', 'market', 'agriculture', 'personnel', 'invest', 'tax'] as const;
  const sortedDepts = [...DEPT_KEYS_LIST].sort((a, b) => (deptCount[a] ?? 0) - (deptCount[b] ?? 0));

  // 国考选调生优先岗位（按重要性排序）
  const KEY_DEPTS_NATIONAL: (typeof DEPT_KEYS_LIST[number])[] = ['ndrc', 'finance', 'organization' as never, 'personnel', 'ecology', 'police'];

  // 查新录用干部
  const { data: newSubs } = await supabase
    .from('subordinates')
    .select('*')
    .in('id', newSubIds);
  if (!newSubs || newSubs.length === 0) return [];

  const assignmentLog: { name: string; dept: string; position: string }[] = [];
  const { DEPT_CONFIG: DC } = await import('@/types/game');

  for (let i = 0; i < newSubs.length; i++) {
    const sub = newSubs[i] as Record<string, unknown>;
    // 选调生（国考第1名）分配至重要岗位
    let deptKey: typeof DEPT_KEYS_LIST[number];
    if (isNationalExam && i === 0) {
      // 选最空缺的重要岗位
      const keyAvailable = KEY_DEPTS_NATIONAL.filter(d => DEPT_KEYS_LIST.includes(d as typeof DEPT_KEYS_LIST[number]));
      const keyWithCount = keyAvailable.map(d => ({ d, cnt: deptCount[d] ?? 0 })).sort((a, b) => a.cnt - b.cnt);
      deptKey = (keyWithCount[0]?.d ?? sortedDepts[0]) as typeof DEPT_KEYS_LIST[number];
    } else {
      deptKey = sortedDepts[i % sortedDepts.length];
    }
    const cfg = DC[deptKey];
    if (!cfg) continue;
    const isZhuandiaosheng = (sub.role as string) === '中央选调生';
    const position = isZhuandiaosheng ? `${cfg.name}${cfg.headTitle}助理（选调生）` : `${cfg.name}科员`;
    await supabase
      .from('subordinates')
      .update({
        appointed_dept: deptKey,
        is_appointed: true,
        dept_position: isZhuandiaosheng ? 'deputy' : 'staff',
        position,
        role: isZhuandiaosheng ? `${cfg.name}选调生` : `${cfg.name}工作人员`,
      })
      .eq('id', sub.id as string);
    assignmentLog.push({ name: sub.name as string, dept: cfg.name, position });
    deptCount[deptKey] = (deptCount[deptKey] ?? 0) + 1;
  }
  return assignmentLog;
}

// ============ 月度工作报告 ============
function rowToMonthlyReport(row: Record<string, unknown>): MonthlyReport {
  return {
    id: row.id as string,
    saveId: row.save_id as string,
    monthKey: row.month_key as number,
    yearKey: row.year_key as number,
    deptKey: row.dept_key as string,
    title: row.title as string,
    content: row.content as string,
    gdpChange: (row.gdp_change as number) ?? 0,
    livelihoodChange: (row.livelihood_change as number) ?? 0,
    ecologyChange: (row.ecology_change as number) ?? 0,
    businessChange: (row.business_change as number) ?? 0,
    meritReward: (row.merit_reward as number) ?? 0,
    isRead: (row.is_read as boolean) ?? false,
    createdAt: row.created_at as string,
  };
}

const DEPT_REPORT_TEMPLATES: Record<string, { titles: string[]; contents: string[][] }> = {
  police: {
    titles: ['公安局月度工作报告', '治安专项整治通报', '打击违法犯罪工作简报'],
    contents: [
      ['本月共破获刑事案件{n}起', '治安案件处置{m}起', '开展扫黄打非专项行动，查处违法人员{k}名'],
      ['本月实施街面巡逻{h}次，有效震慑犯罪', '新设社区警务站{s}个', '治安满意度提升{p}个百分点'],
    ],
  },
  ndrc: {
    titles: ['发改委月度工作报告', '招商引资工作简报', '重大项目推进通报'],
    contents: [
      ['本月新签约投资项目{n}个，合同金额{m}亿元', '推进重点项目{k}个，完成投资{h}亿元'],
      ['本月举办招商推介会{s}次，吸引意向投资{p}亿元'],
    ],
  },
  ecology: {
    titles: ['生态环保局月度工作报告', '环保专项整治通报', '生态环境执法简报'],
    contents: [
      ['本月开展企业环保检查{n}次，责令整改{m}家', '处以环保罚款共{k}万元'],
      ['本月关停不达标污染企业{s}家，生态指数提升{p}个百分点'],
    ],
  },
  market: {
    titles: ['市场监管局月度简报', '招商政策落实通报', '营商环境优化工作报告'],
    contents: [
      ['本月新增市场主体{n}家，注销{m}家', '办理营业执照{k}件，平均办理时限{h}个工作日'],
      ['本月开展食品安全检查{s}次，处罚违规商户{p}家'],
    ],
  },
  education: {
    titles: ['教育局月度工作报告', '师资队伍建设通报', '教育质量提升简报'],
    contents: [
      ['本月完成教师培训{n}人次，新引进优秀教师{m}名'],
      ['本月中小学在校生总数{k}人，出勤率达{h}%'],
    ],
  },
  health: {
    titles: ['卫健委月度工作报告', '基层医疗服务通报', '公共卫生工作简报'],
    contents: [
      ['本月完成居民健康档案建档{n}人次，开展义诊活动{m}场'],
      ['本月卫生监督抽检{k}次，无重大食品安全事故'],
    ],
  },
  finance: {
    titles: ['财政局月度工作报告', '预算执行情况通报', '政府债务管理简报'],
    contents: [
      ['本月税收入库{n}万元，财政支出{m}万元，收支结余{k}万元'],
      ['本月完成专项债资金拨付{h}万元'],
    ],
  },
  urban: {
    titles: ['住建局月度工作报告', '城市建设推进通报', '住房保障工作简报'],
    contents: [
      ['本月新开工建设项目{n}个，竣工验收{m}个'],
      ['本月保障性住房申请受理{k}户，完成审核{h}户'],
    ],
  },
  agriculture: {
    titles: ['农业农村局月度工作报告', '乡村振兴工作通报', '农业生产情况简报'],
    contents: [
      ['本月农业生产总值{n}万元，同比增长{m}%'],
      ['本月开展农技培训{k}场次，参训农民{h}人'],
    ],
  },
};

function generateReportContent(deptKey: string): { title: string; content: string; gdpChange: number; livelihoodChange: number; ecologyChange: number; businessChange: number; meritReward: number } {
  const tpl = DEPT_REPORT_TEMPLATES[deptKey] ?? DEPT_REPORT_TEMPLATES['finance'];
  const title = tpl.titles[Math.floor(Math.random() * tpl.titles.length)];
  const block = tpl.contents[Math.floor(Math.random() * tpl.contents.length)];
  const content = block.map(line =>
    line
      .replace('{n}', String(5 + Math.floor(Math.random() * 20)))
      .replace('{m}', String(3 + Math.floor(Math.random() * 15)))
      .replace('{k}', String(2 + Math.floor(Math.random() * 10)))
      .replace('{h}', String(10 + Math.floor(Math.random() * 20)))
      .replace('{s}', String(1 + Math.floor(Math.random() * 5)))
      .replace('{p}', String(1 + Math.floor(Math.random() * 8)))
  ).join('；') + '。';

  const deptEffects: Record<string, Partial<{ gdpChange: number; livelihoodChange: number; ecologyChange: number; businessChange: number }>> = {
    police: { livelihoodChange: 0.5 },
    ndrc: { gdpChange: 0.8 },
    ecology: { ecologyChange: 0.8 },
    market: { businessChange: 0.6 },
    education: { livelihoodChange: 0.5 },
    health: { livelihoodChange: 0.4 },
    finance: { gdpChange: 0.3 },
    urban: { gdpChange: 0.4, livelihoodChange: 0.3 },
    agriculture: { gdpChange: 0.3, livelihoodChange: 0.3 },
  };
  const fx = deptEffects[deptKey] ?? {};
  return {
    title, content,
    gdpChange: fx.gdpChange ?? 0,
    livelihoodChange: fx.livelihoodChange ?? 0,
    ecologyChange: fx.ecologyChange ?? 0,
    businessChange: fx.businessChange ?? 0,
    meritReward: 8 + Math.floor(Math.random() * 12),
  };
}

export async function generateMonthlyReports(
  saveId: string, userId: string, gameDays: number
): Promise<MonthlyReport[]> {
  const monthKey = Math.floor(gameDays / 30);
  const yearKey = Math.floor(gameDays / 365);

  // 获取已任命部门
  const { data: subs } = await supabase
    .from('subordinates')
    .select('appointed_dept, dept_position, is_appointed')
    .eq('save_id', saveId)
    .eq('is_appointed', true);

  const activeDepts = [...new Set((subs ?? []).map(s => s.appointed_dept as string).filter(Boolean))];
  if (activeDepts.length === 0) return [];

  // 查是否已生成本月报告
  const { data: existing } = await supabase
    .from('monthly_reports')
    .select('id')
    .eq('save_id', saveId)
    .eq('month_key', monthKey);
  if (existing && existing.length > 0) return [];

  const rows = activeDepts.map(dk => {
    const gen = generateReportContent(dk);
    return {
      save_id: saveId, user_id: userId,
      month_key: monthKey, year_key: yearKey,
      dept_key: dk, title: gen.title, content: gen.content,
      gdp_change: gen.gdpChange, livelihood_change: gen.livelihoodChange,
      ecology_change: gen.ecologyChange, business_change: gen.businessChange,
      merit_reward: gen.meritReward, is_read: false,
    };
  });

  const { data: created } = await supabase.from('monthly_reports').insert(rows).select('*');
  if (!created) return [];
  return (created as Record<string, unknown>[]).map(rowToMonthlyReport);
}

export async function getUnreadReports(saveId: string): Promise<MonthlyReport[]> {
  const { data } = await supabase
    .from('monthly_reports')
    .select('*')
    .eq('save_id', saveId)
    .eq('is_read', false)
    .order('created_at', { ascending: false })
    .limit(20);
  return (data ?? []).map(r => rowToMonthlyReport(r as Record<string, unknown>));
}

export async function markReportsRead(saveId: string, monthKey: number): Promise<void> {
  await supabase.from('monthly_reports').update({ is_read: true })
    .eq('save_id', saveId).eq('month_key', monthKey);
}

export async function getAllReports(saveId: string): Promise<MonthlyReport[]> {
  const { data } = await supabase
    .from('monthly_reports')
    .select('*')
    .eq('save_id', saveId)
    .order('created_at', { ascending: false })
    .limit(50);
  return (data ?? []).map(r => rowToMonthlyReport(r as Record<string, unknown>));
}

// ============ 领导班子 ============
function rowToLeadership(row: Record<string, unknown>): LeadershipMember {
  return {
    id: row.id as string,
    saveId: row.save_id as string,
    subId: (row.sub_id as string) ?? null,
    roleKey: row.role_key as string,
    roleLabel: row.role_label as string,
    subName: (row.sub_name as string) ?? '',
    subAvatar: (row.sub_avatar as number) ?? 0,
    subGender: (row.sub_gender as string) ?? '男',
    assignedDay: (row.assigned_day as number) ?? 0,
  };
}

export async function getLeadershipBand(saveId: string): Promise<LeadershipMember[]> {
  const { data } = await supabase
    .from('leadership_band')
    .select('*')
    .eq('save_id', saveId)
    .order('created_at', { ascending: true });
  return (data ?? []).map(r => rowToLeadership(r as Record<string, unknown>));
}

/**
 * §3.4 班子合力  —— 从 leadership_band 提取各成员派系列表
 * 派系信息存于关联的 subordinates 表；此处用 sub_id join 一次性批量取回。
 * 返回值供 calcBandSynergy() 使用。
 */
export async function getBandFactionList(saveId: string): Promise<import('@/types/game').FactionId[]> {
  // leadership_band 记录中含 sub_id，join subordinates 获取 faction 字段
  const { data } = await supabase
    .from('leadership_band')
    .select('subordinates(faction)')
    .eq('save_id', saveId);
  if (!data) return [];
  return (data as Array<{ subordinates?: { faction?: string } | null }>)
    .map(r => r.subordinates?.faction ?? '')
    .filter((f): f is import('@/types/game').FactionId => f !== '');
}

export async function assignLeadershipRole(
  saveId: string, userId: string,
  subId: string, roleKey: string, roleLabel: string,
  subName: string, subAvatar: number, subGender: string, gameDays: number
): Promise<boolean> {
  // 先删除该角色已有的任命
  await supabase.from('leadership_band').delete().eq('save_id', saveId).eq('role_key', roleKey);
  const { error } = await supabase.from('leadership_band').insert({
    save_id: saveId, user_id: userId, sub_id: subId,
    role_key: roleKey, role_label: roleLabel,
    sub_name: subName, sub_avatar: subAvatar, sub_gender: subGender,
    assigned_day: gameDays,
  });
  return !error;
}

export async function removeLeadershipRole(saveId: string, roleKey: string): Promise<boolean> {
  const { error } = await supabase.from('leadership_band').delete()
    .eq('save_id', saveId).eq('role_key', roleKey);
  return !error;
}

// ============ 下属履历 ============
import type { SubResume, Enterprise } from '@/types/game';

function rowToSubResume(row: Record<string, unknown>): SubResume {
  return {
    id: row.id as string,
    saveId: row.save_id as string,
    subId: row.sub_id as string,
    position: row.position as string,
    deptName: (row.dept_name as string) ?? '',
    startDay: (row.start_day as number) ?? 0,
    endDay: (row.end_day as number) ?? null,
    note: (row.note as string) ?? '',
    createdAt: row.created_at as string,
  };
}

export async function getSubResumes(subId: string): Promise<SubResume[]> {
  const { data } = await supabase
    .from('subordinate_resumes')
    .select('*')
    .eq('sub_id', subId)
    .order('start_day', { ascending: false });
  if (!data) return [];
  return (data as Record<string, unknown>[]).map(rowToSubResume);
}

export async function addSubResume(
  saveId: string, subId: string, position: string,
  deptName: string, startDay: number, note = ''
): Promise<void> {
  await supabase.from('subordinate_resumes').insert({
    save_id: saveId, sub_id: subId,
    position, dept_name: deptName,
    start_day: startDay, end_day: null, note,
  });
}

export async function closeSubResume(subId: string, endDay: number): Promise<void> {
  // 关闭当前在职履历
  await supabase.from('subordinate_resumes')
    .update({ end_day: endDay })
    .eq('sub_id', subId)
    .is('end_day', null);
}

// ============ 年度晋升候选人查询 ============
/** 每年初查询符合晋升条件的下属，同时遵守金字塔职级人数上限 */
export async function getAnnualPromoEligible(saveId: string, currentDay: number, playerRankLevel: number): Promise<{
  id: string; name: string; subLevel: number; ability: number; experience: number;
  appointedDept: string | null; deptPosition: string; reason: string;
}[]> {
  const { SUB_LEVEL_MAX_COUNT } = await import('@/types/game');

  const { data } = await supabase
    .from('subordinates')
    .select('id, name, sub_level, ability, experience, last_assessed_day, appointed_dept, dept_position')
    .eq('save_id', saveId)
    .is('transferred_city', null);
  if (!data) return [];

  const rows = data as { id: string; name: string; sub_level: number; ability: number; experience: number; last_assessed_day: number; appointed_dept: string | null; dept_position: string }[];

  // 统计当前各职级人数
  const levelCount: Record<number, number> = {};
  for (const s of rows) levelCount[s.sub_level] = (levelCount[s.sub_level] ?? 0) + 1;

  const maxSubLevel = Math.min(12, playerRankLevel - 1); // 下属最多比玩家低一级
  return rows
    .filter(s => s.sub_level < maxSubLevel)
    .map(s => {
      const daysInPost = currentDay - (s.last_assessed_day ?? 0);
      // 越高职级任职年限要求越长
      const yearThreshold = s.sub_level <= 3 ? 365 * 2 : s.sub_level <= 6 ? 365 * 3 : 365 * 4;
      const tenureReached = daysInPost >= yearThreshold;
      // KPI 标准随职级提高而更严格
      const kpiAbility = s.sub_level <= 3 ? 72 : s.sub_level <= 6 ? 76 : 80;
      const kpiExp    = s.sub_level <= 3 ? 55 : s.sub_level <= 6 ? 65 : 75;
      const kpiReached = s.ability >= kpiAbility && s.experience >= kpiExp;
      if (!tenureReached && !kpiReached) return null;

      // 检查目标职级是否已达金字塔上限
      const targetLevel = s.sub_level + 1;
      const cap = SUB_LEVEL_MAX_COUNT[targetLevel] ?? 999;
      const currentAtTarget = levelCount[targetLevel] ?? 0;
      if (currentAtTarget >= cap) return null; // 名额已满，此轮不推荐晋升

      const reason = tenureReached && kpiReached ? '年限到达 + KPI优秀' : tenureReached ? '在职年限已满' : 'KPI考核优秀';
      return { id: s.id, name: s.name, subLevel: s.sub_level, ability: s.ability, experience: s.experience, appointedDept: s.appointed_dept, deptPosition: s.dept_position, reason };
    })
    .filter((s): s is NonNullable<typeof s> => s !== null);
}

// ============ 下属晋升/降级 ============
export async function promoteSubordinate(
  saveId: string, subId: string, currentLevel: number, gameDays: number,
  currentPosition: string, deptName: string
): Promise<boolean> {
  const newLevel = Math.min(12, currentLevel + 1);
  if (newLevel === currentLevel) return false;
  const { error } = await supabase
    .from('subordinates')
    .update({ sub_level: newLevel })
    .eq('id', subId);
  if (!error) {
    await closeSubResume(subId, gameDays);
    await addSubResume(saveId, subId, currentPosition, deptName, gameDays, '晋升');
  }
  return !error;
}

export async function demoteSubordinate(
  saveId: string, subId: string, currentLevel: number, gameDays: number,
  currentPosition: string, deptName: string
): Promise<boolean> {
  const newLevel = Math.max(1, currentLevel - 1);
  if (newLevel === currentLevel) return false;
  const { error } = await supabase
    .from('subordinates')
    .update({ sub_level: newLevel })
    .eq('id', subId);
  if (!error) {
    await closeSubResume(subId, gameDays);
    await addSubResume(saveId, subId, currentPosition, deptName, gameDays, '降级');
  }
  return !error;
}

// ============ 人事局年底晋升评审 ============
// 返回符合晋升条件的下属列表（能力>=60，经验>=50）
export async function getPersonnelCandidates(saveId: string): Promise<Subordinate[]> {
  const { data } = await supabase
    .from('subordinates')
    .select('*')
    .eq('save_id', saveId)
    .gte('ability', 60)
    .gte('experience', 50)
    .lt('sub_level', 12)
    .order('ability', { ascending: false })
    .limit(8);
  if (!data) return [];
  return (data as Record<string, unknown>[]).map(rowToSubordinate);
}

// ============ 招商引资企业 ============
const INDUSTRY_LIST = ['制造业', '信息技术', '新能源', '生物医药', '高端装备', '商贸零售', '农业产业化', '文化旅游', '现代物流', '金融服务'];
const NAME_PREFIXES = ['华盛', '鼎兴', '腾远', '宏达', '聚力', '鑫源', '瑞丰', '卓越', '恒信', '晨阳', '盛世', '创合', '博远', '同兴', '智汇', '龙腾', '福瑞', '康泰', '永业', '嘉和'];
const NAME_SUFFIXES = ['科技有限公司', '实业有限公司', '投资集团', '新材料有限公司', '装备制造有限公司', '生物科技有限公司', '能源科技有限公司', '集团有限公司', '产业有限公司', '发展有限公司'];

function rowToEnterprise(row: Record<string, unknown>): Enterprise {
  return {
    id: row.id as string,
    saveId: row.save_id as string,
    userId: row.user_id as string,
    name: row.name as string,
    industry: (row.industry as string) ?? '制造业',
    scale: ((row.scale as string) ?? 'small') as Enterprise['scale'],
    investAmount: (row.invest_amount as number) ?? 0,
    taxContribution: (row.tax_contribution as number) ?? 0,
    employeeCount: (row.employee_count as number) ?? 0,
    introducedMonth: (row.introduced_month as number) ?? 0,
    status: ((row.status as string) ?? 'operating') as Enterprise['status'],
    foundedDay: (row.founded_day as number) ?? 0,
    createdAt: row.created_at as string,
  };
}

export async function getEnterprises(saveId: string): Promise<Enterprise[]> {
  const { data } = await supabase
    .from('enterprises')
    .select('*')
    .eq('save_id', saveId)
    .order('created_at', { ascending: false });
  if (!data) return [];
  return (data as Record<string, unknown>[]).map(rowToEnterprise);
}

// 月度自动引进1-2家企业（由招商局负责人能力影响）
export async function generateMonthlyEnterprises(
  saveId: string, userId: string, gameDays: number, headAbility: number, rankLevel = 3
): Promise<Enterprise[]> {
  const count = headAbility >= 70 ? 2 : 1;
  const currentMonth = Math.floor(gameDays / 30) + 1;

  // 企业投资规模和税收按职级分层，参照现实（万元）：
  // 乡镇：单企业投资5-50万，月税收0.4-7.5万
  // 县级：50-500万，月税收3-60万
  // 市级：500-5000万，月税收25-500万
  // 省级：5000-50000万，月税收200-4000万
  // 国家级：50000-200000万
  const investRange = rankLevel <= 3  ? [5, 45]
    : rankLevel <= 6  ? [50, 450]
    : rankLevel <= 9  ? [500, 4500]
    : rankLevel <= 11 ? [5000, 45000]
    : [50000, 150000];
  const taxRateLo = rankLevel <= 3 ? 0.08 : rankLevel <= 6 ? 0.06 : rankLevel <= 9 ? 0.05 : 0.04;
  const taxRateHi = rankLevel <= 3 ? 0.15 : rankLevel <= 6 ? 0.12 : rankLevel <= 9 ? 0.10 : 0.08;

  const rows = Array.from({ length: count }, () => {
    const prefix = NAME_PREFIXES[Math.floor(Math.random() * NAME_PREFIXES.length)];
    const suffix = NAME_SUFFIXES[Math.floor(Math.random() * NAME_SUFFIXES.length)];
    const industry = INDUSTRY_LIST[Math.floor(Math.random() * INDUSTRY_LIST.length)];
    const invest = investRange[0] + Math.floor(Math.random() * investRange[1]);
    const tax = Math.round(invest * (taxRateLo + Math.random() * (taxRateHi - taxRateLo)));
    const scaleVal: Enterprise['scale'] = invest >= investRange[0] + investRange[1] * 0.6 ? 'large'
      : invest >= investRange[0] + investRange[1] * 0.25 ? 'medium' : 'small';
    const employees = scaleVal === 'large' ? 200 + Math.floor(Math.random() * 800)
      : scaleVal === 'medium' ? 50 + Math.floor(Math.random() * 150)
      : 10 + Math.floor(Math.random() * 40);
    return {
      save_id: saveId, user_id: userId,
      name: prefix + suffix,
      industry,
      scale: scaleVal,
      invest_amount: invest,
      tax_contribution: tax,
      employee_count: employees,
      introduced_month: currentMonth,
      status: 'operating',
      founded_day: gameDays,
    };
  });
  const { data } = await supabase.from('enterprises').insert(rows).select('*');
  if (!data) return [];
  return (data as Record<string, unknown>[]).map(rowToEnterprise);
}

// 计算企业月度总税收（operating企业累加）
export async function calcMonthlyTax(saveId: string): Promise<number> {
  const { data } = await supabase
    .from('enterprises')
    .select('tax_contribution')
    .eq('save_id', saveId)
    .eq('status', 'operating');
  if (!data) return 0;
  return (data as Record<string, unknown>[]).reduce((sum, r) => sum + ((r.tax_contribution as number) ?? 0), 0);
}

// 关停企业
export async function closeEnterprise(enterpriseId: string): Promise<boolean> {
  const { error } = await supabase
    .from('enterprises')
    .update({ status: 'closed' })
    .eq('id', enterpriseId);
  return !error;
}

// 部门工作汇报：表扬/问责
export async function rewardDeptHead(subId: string, isReward: boolean): Promise<boolean> {
  const loyaltyDelta = isReward ? 8 : -8;
  const abilityDelta = isReward ? 2 : -2;
  const { data: sub } = await supabase
    .from('subordinates').select('loyalty, ability').eq('id', subId).single();
  if (!sub) return false;
  const r = sub as Record<string, unknown>;
  const newLoyalty = Math.max(0, Math.min(100, (r.loyalty as number) + loyaltyDelta));
  const newAbility = Math.max(0, Math.min(100, (r.ability as number) + abilityDelta));
  const { error } = await supabase.from('subordinates')
    .update({ loyalty: newLoyalty, ability: newAbility })
    .eq('id', subId);
  return !error;
}

// 获取各部门人数统计
export async function getDeptStaffCounts(saveId: string): Promise<Record<string, number>> {
  const { data } = await supabase
    .from('subordinates')
    .select('appointed_dept')
    .eq('save_id', saveId)
    .eq('is_appointed', true)
    .not('appointed_dept', 'is', null);
  if (!data) return {};
  const counts: Record<string, number> = {};
  for (const r of data as Record<string, unknown>[]) {
    const dept = r.appointed_dept as string;
    counts[dept] = (counts[dept] ?? 0) + 1;
  }
  return counts;
}

// ============ 财政汇总 ============
export interface FiscalSummary {
  // 主账户余额（player_saves.fund_balance，唯一权威来源）
  mainBalance: number;
  // 月度收入
  monthlyTaxIncome: number;        // 企业税收
  monthlyLoanRepayment: number;    // 贷款月供（支出）
  monthlyAdminExpense: number;     // 行政运营支出（按编制人数估算）
  monthlyNetFlow: number;          // 月净现金流
  // 企业明细
  enterpriseCount: number;
  enterpriseTotalTax: number;
  enterprises: Enterprise[];
  // 贷款明细
  activeLoans: LoanRecord[];
  debtTotal: number;
  // 投资明细
  runningInvestments: InvestmentRecord[];
  // 部门编制
  deptStaffCounts: Record<string, number>;
  totalStaff: number;
  // 累计税收记录
  totalTaxRevenue: number;
  // 城市税率
  cityTaxRate: number;
}

export async function getFiscalSummary(saveId: string, userId: string): Promise<FiscalSummary | null> {
  const [entData, financeData, staffData, saveData] = await Promise.all([
    supabase.from('enterprises').select('*').eq('save_id', saveId).order('created_at', { ascending: false }),
    getOrCreateFinance(saveId, userId),
    supabase.from('subordinates').select('appointed_dept').eq('save_id', saveId).eq('is_appointed', true).not('appointed_dept', 'is', null),
    supabase.from('player_saves').select('fund_balance,tax_revenue,city_tax_rate').eq('id', saveId).maybeSingle(),
  ]);

  const enterprises = (Array.isArray(entData.data) ? entData.data : []).map(r => rowToEnterprise(r as Record<string, unknown>));
  const operating = enterprises.filter(e => e.status === 'operating');
  const monthlyTaxIncome = operating.reduce((s, e) => s + e.taxContribution, 0);

  const activeLoans = financeData?.loans.filter(l => l.status === 'active') ?? [];
  const monthlyLoanRepayment = activeLoans.reduce((s, l) => s + l.monthlyPay, 0);

  const runningInvestments = financeData?.investments.filter(i => i.status === 'running') ?? [];

  // 部门编制人数 → 行政运营成本（每人每月约 2~5 万估算）
  const deptStaffCounts: Record<string, number> = {};
  for (const r of (staffData.data ?? []) as Record<string, unknown>[]) {
    const dept = r.appointed_dept as string;
    deptStaffCounts[dept] = (deptStaffCounts[dept] ?? 0) + 1;
  }
  const totalStaff = Object.values(deptStaffCounts).reduce((s, n) => s + n, 0);
  const monthlyAdminExpense = totalStaff * 3; // 人均 3 万元/月

  const saveRow = saveData.data as Record<string, unknown> | null;
  // mainBalance 统一从 player_saves.fund_balance 读取（万元单位，月度结算唯一写入源）
  const mainBalance = (saveRow?.fund_balance as number) ?? 0;
  const totalTaxRevenue = (saveRow?.tax_revenue as number) ?? 0;
  const cityTaxRate = (saveRow?.city_tax_rate as number) ?? 0.12;

  const monthlyNetFlow = monthlyTaxIncome - monthlyLoanRepayment - monthlyAdminExpense;

  return {
    mainBalance,
    monthlyTaxIncome,
    monthlyLoanRepayment,
    monthlyAdminExpense,
    monthlyNetFlow,
    enterpriseCount: operating.length,
    enterpriseTotalTax: monthlyTaxIncome,
    enterprises,
    activeLoans,
    debtTotal: financeData?.debtTotal ?? 0,
    runningInvestments,
    deptStaffCounts,
    totalStaff,
    totalTaxRevenue,
    cityTaxRate,
  };
}

// ============ 信访事件 ============
const PETITION_COMPLAINTS = [
  { title: '群众反映基础设施差', content: '辖区多名群众联名来信，反映道路破损严重，出行不便，请求政府尽快修缮。' },
  { title: '企业噪音扰民投诉', content: '附近居民投诉新引进企业夜间施工噪音扰民，严重影响居民休息，要求整改。' },
  { title: '行政审批效率低下', content: '多家企业主来信反映营业执照审批周期过长，影响正常经营，要求提高行政效率。' },
  { title: '征地拆迁补偿纠纷', content: '某村民投诉征地补偿款未足额发放，请求政府介入协调解决。' },
  { title: '城区环境卫生问题', content: '市民投诉某街道垃圾清运不及时，堆积严重，影响环境卫生和居民健康。' },
  { title: '教育资源分配不均', content: '家长代表来信，反映优质学校招生名额分配不公，要求公开招生标准。' },
  { title: '医疗服务质量投诉', content: '患者家属投诉某医院服务态度恶劣、看病难问题突出，要求相关部门介入处理。' },
  { title: '政务服务态度问题', content: '群众投诉窗口工作人员服务态度差，推诿扯皮，影响政府形象。' },
];

const PETITION_PRAISES = [
  { title: '群众感谢道路改造工程', content: '辖区居民联名来信，对近期完成的道路改造工程表示感谢，称赞政府为民办实事。' },
  { title: '表扬扶贫工作成效显著', content: '贫困村村民来信，感谢政府精准扶贫政策，村子面貌焕然一新，生活大为改善。' },
  { title: '市民表扬城市环境整治', content: '市民来信表扬近期城市环境整治工作成效，称赞城市变得干净整洁。' },
  { title: '企业肯定营商环境改善', content: '本地企业家协会来函，高度评价近年来营商环境持续优化，表示将加大在本地投资。' },
  { title: '群众感谢民生帮扶政策', content: '困难群众来信，感谢政府发放的生活补贴和帮扶措施，解决了燃眉之急。' },
  { title: '表扬行政审批改革成效', content: '多家企业来函称赞"一窗通办"改革，审批效率大幅提升，为企业节省了大量时间成本。' },
];

function rowToPetitionEvent(row: Record<string, unknown>): PetitionEvent {
  return {
    id: row.id as string,
    saveId: row.save_id as string,
    userId: row.user_id as string,
    eventType: row.event_type as 'complaint' | 'praise',
    title: row.title as string,
    content: row.content as string,
    gameDay: (row.game_day as number) ?? 0,
    monthKey: (row.month_key as number) ?? 0,
    bosFavorDelta: (row.bos_favor_delta as number) ?? 0,
    meritDelta: (row.merit_delta as number) ?? 0,
    isProcessed: (row.is_processed as boolean) ?? false,
    createdAt: row.created_at as string,
  };
}

// 生成月度信访事件（约30%概率，外部决策是否调用）
export async function generatePetitionEvent(
  saveId: string, userId: string, gameDays: number
): Promise<PetitionEvent | null> {
  const monthKey = Math.floor(gameDays / 30);
  // 检查本月是否已生成
  const { data: existing } = await supabase
    .from('petition_events')
    .select('id')
    .eq('save_id', saveId)
    .eq('month_key', monthKey)
    .limit(1);
  if (existing && existing.length > 0) return null;

  const isComplaint = Math.random() < 0.60; // 60%是投诉，40%是表扬
  const pool = isComplaint ? PETITION_COMPLAINTS : PETITION_PRAISES;
  const template = pool[Math.floor(Math.random() * pool.length)];

  const bosFavorDelta = isComplaint
    ? -(1 + Math.floor(Math.random() * 3))
    : (1 + Math.floor(Math.random() * 2));
  const meritDelta = isComplaint
    ? -(5 + Math.floor(Math.random() * 6))
    : (3 + Math.floor(Math.random() * 6));

  const { data } = await supabase.from('petition_events').insert({
    save_id: saveId, user_id: userId,
    event_type: isComplaint ? 'complaint' : 'praise',
    title: template.title, content: template.content,
    game_day: gameDays, month_key: monthKey,
    bos_favor_delta: bosFavorDelta, merit_delta: meritDelta,
    is_processed: false,
  }).select('*').maybeSingle();
  if (!data) return null;
  return rowToPetitionEvent(data as Record<string, unknown>);
}

// 查询信访事件列表
export async function getPetitionEvents(saveId: string, limit = 20): Promise<PetitionEvent[]> {
  const { data } = await supabase
    .from('petition_events')
    .select('*')
    .eq('save_id', saveId)
    .order('game_day', { ascending: false })
    .limit(limit);
  return (data ?? []).map(r => rowToPetitionEvent(r as Record<string, unknown>));
}

// 处理信访事件（标记已处理，并返回受影响的delta值）
export async function processPetitionEvent(
  eventId: string
): Promise<{ bosFavorDelta: number; meritDelta: number } | null> {
  const { data } = await supabase
    .from('petition_events')
    .select('bos_favor_delta, merit_delta, is_processed')
    .eq('id', eventId)
    .maybeSingle();
  if (!data) return null;
  const r = data as Record<string, unknown>;
  if (r.is_processed) return null;
  await supabase.from('petition_events').update({ is_processed: true }).eq('id', eventId);
  return { bosFavorDelta: r.bos_favor_delta as number, meritDelta: r.merit_delta as number };
}

// ============ 招商引资立即入驻 ============
// 招商行政活动执行后立即生成企业（1~3家，按能力加成）
export async function generateImmediateEnterprises(
  saveId: string, userId: string, gameDays: number, headAbility: number, count = 1, rankLevel = 3
): Promise<Enterprise[]> {
  const realCount = Math.min(count + (headAbility >= 70 ? 1 : 0), 3);
  const currentMonth = Math.floor(gameDays / 30) + 1;

  const investRange = rankLevel <= 3  ? [5, 45]
    : rankLevel <= 6  ? [50, 450]
    : rankLevel <= 9  ? [500, 4500]
    : rankLevel <= 11 ? [5000, 45000]
    : [50000, 150000];
  const taxRateLo = rankLevel <= 3 ? 0.08 : rankLevel <= 6 ? 0.06 : rankLevel <= 9 ? 0.05 : 0.04;
  const taxRateHi = rankLevel <= 3 ? 0.15 : rankLevel <= 6 ? 0.12 : rankLevel <= 9 ? 0.10 : 0.08;

  const rows = Array.from({ length: realCount }, () => {
    const prefix = NAME_PREFIXES[Math.floor(Math.random() * NAME_PREFIXES.length)];
    const suffix = NAME_SUFFIXES[Math.floor(Math.random() * NAME_SUFFIXES.length)];
    const industry = INDUSTRY_LIST[Math.floor(Math.random() * INDUSTRY_LIST.length)];
    const invest = investRange[0] + Math.floor(Math.random() * investRange[1]);
    const tax = Math.round(invest * (taxRateLo + Math.random() * (taxRateHi - taxRateLo)));
    const scaleVal: Enterprise['scale'] = invest >= investRange[0] + investRange[1] * 0.6 ? 'large'
      : invest >= investRange[0] + investRange[1] * 0.25 ? 'medium' : 'small';
    const employees = scaleVal === 'large' ? 200 + Math.floor(Math.random() * 800)
      : scaleVal === 'medium' ? 50 + Math.floor(Math.random() * 150)
      : 10 + Math.floor(Math.random() * 40);
    return {
      save_id: saveId, user_id: userId,
      name: prefix + suffix, industry, scale: scaleVal,
      invest_amount: invest, tax_contribution: tax,
      employee_count: employees, introduced_month: currentMonth,
      status: 'operating', founded_day: gameDays,
    };
  });
  const { data } = await supabase.from('enterprises').insert(rows).select('*');
  if (!data) return [];
  return (data as Record<string, unknown>[]).map(rowToEnterprise);
}

// ============ 工商局企业管理功能 ============
// 专项检查：随机增减单家企业的税收贡献
export async function inspectEnterprise(
  enterpriseId: string
): Promise<{ delta: number } | null> {
  const { data: ent } = await supabase
    .from('enterprises').select('tax_contribution').eq('id', enterpriseId).maybeSingle();
  if (!ent) return null;
  const r = ent as Record<string, unknown>;
  const current = r.tax_contribution as number;
  // 检查结果：60%正向（发现良好）10%不变，30%负向（发现问题）
  const roll = Math.random();
  const delta = roll < 0.60
    ? Math.round(current * (0.05 + Math.random() * 0.10))
    : roll < 0.70
    ? 0
    : -Math.round(current * (0.05 + Math.random() * 0.10));
  const newVal = Math.max(1, current + delta);
  await supabase.from('enterprises').update({ tax_contribution: newVal }).eq('id', enterpriseId);
  return { delta };
}

// 违规整改：关停企业
export async function regulateEnterprise(enterpriseId: string): Promise<boolean> {
  return closeEnterprise(enterpriseId);
}

// 优化营商服务：批量提升所有运营企业税收贡献 5~10%
export async function optimizeBusinessService(saveId: string): Promise<number> {
  const { data } = await supabase
    .from('enterprises')
    .select('id, tax_contribution')
    .eq('save_id', saveId)
    .eq('status', 'operating');
  if (!data || data.length === 0) return 0;
  const boostRate = 0.05 + Math.random() * 0.05;
  const updates = (data as Record<string, unknown>[]).map(r => ({
    id: r.id as string,
    tax_contribution: Math.round((r.tax_contribution as number) * (1 + boostRate)),
  }));
  for (const u of updates) {
    await supabase.from('enterprises').update({ tax_contribution: u.tax_contribution }).eq('id', u.id);
  }
  return Math.round(boostRate * 100);
}

// ============ 部门补充科员（任命正/副职后调用）============
// deptPosition='staff' 为科员/科长/办事员，is_appointed=true，随机2~4人
export async function fillDeptStaff(
  saveId: string, userId: string, deptKey: DeptKey
): Promise<number> {
  await ensureNpcNamePoolLoaded();
  // 获取玩家职级以生成正确的称谓
  const { data: saveRow } = await supabase
    .from('player_saves')
    .select('rank_level')
    .eq('id', saveId)
    .maybeSingle();
  const rankLevel = (saveRow as Record<string, unknown> | null)?.rank_level as number ?? 3;

  // 按层级获取现实编制人数范围
  const { min: staffMin, max: staffMax } = getDeptStaffRange(rankLevel);
  const targetTotal = staffMin + Math.floor(Math.random() * (staffMax - staffMin + 1));

  // 检查已有总人数（头/副/科员）
  const { data: existing } = await supabase
    .from('subordinates')
    .select('id')
    .eq('save_id', saveId)
    .eq('appointed_dept', deptKey)
    .eq('is_appointed', true);
  const currentTotal = existing?.length ?? 0;
  if (currentTotal >= targetTotal) return 0;

  const needed = targetTotal - currentTotal;

  // 动态部门名称
  const deptDisplayName = getDeptNameByRank(deptKey, rankLevel);
  const chiefLabel = rankLevel <= 3 ? `${deptDisplayName}负责人` : `${deptDisplayName}科长`;
  const staffLabel  = rankLevel <= 3 ? `${deptDisplayName}工作人员` : `${deptDisplayName}科员`;

  // 生成完整仕途档案
  const buildCareer = (gender: string): CareerEntry[] => {
    const age = 28 + Math.floor(Math.random() * 15);
    return _genNpcCareerHistory(Math.max(1, rankLevel - 2), age, undefined, undefined);
  };
  const { province: npcProv, city: npcCity } = randBirthPlace();
  const tier = npcSchoolTier(Math.max(1, rankLevel - 2));

  const rows = Array.from({ length: needed }, (_, i) => {
    const isMale = Math.random() > 0.4;
    // 每5人中首位为科长（20%），其余为科员（80%）
    const isSectionChief = (currentTotal + i) % 5 === 0;
    const roleLabel = isSectionChief ? chiefLabel : staffLabel;
    const gender = isMale ? '男' : '女';
    const uniName = pickUniversityName(tier, npcProv);
    const degreeLabel = npcDegreeLabel(tier, Math.max(1, rankLevel - 2));
    const studyYears = degreeLabel === '博士' ? 9 : degreeLabel === '硕士' ? 6 : 4;
    const age = 25 + Math.floor(Math.random() * 20);
    const gradYear = (2025 - age) + 18 + studyYears;
    const { province: bp, city: bc } = randBirthPlace();
    return {
      save_id: saveId, user_id: userId,
      name: pickNpcName(),
      position: isSectionChief ? (rankLevel <= 3 ? '负责人' : '科长') : (rankLevel <= 3 ? '工作人员' : '科员'),
      role: roleLabel,
      avatar_id: Math.floor(Math.random() * 6),
      gender,
      ability: 30 + Math.floor(Math.random() * 35),
      loyalty: 40 + Math.floor(Math.random() * 35),
      integrity: 50 + Math.floor(Math.random() * 30),
      experience: 5 + Math.floor(Math.random() * 25),
      is_appointed: true,
      appointed_role: roleLabel,
      appointed_dept: deptKey,
      dept_position: 'staff',
      transferred_city: null,
      last_assessed_day: 0,
      birth_province: bp,
      birth_city: bc,
      graduation_year: gradYear,
      career_history: buildCareer(gender),
    };
  });
  await supabase.from('subordinates').insert(rows);
  return needed;
}

// ============ 年度综合排行报表 ============
export async function generateAnnualRankReport(
  saveId: string, userId: string, gameDays: number,
  stats: {
    cityGdp: number; cityLivelihood: number; cityEcology: number; cityBusiness: number;
    meritPoints: number; taxRevenue: number; enterpriseCount: number; totalStaff: number;
    eventsThisYear: number; annualRankPct: number; isExcellentRank: boolean;
  }
): Promise<MonthlyReport | null> {
  const yearKey = Math.floor(gameDays / 365);
  const monthKey = Math.floor(gameDays / 30);

  // 防重：每年只生成一份
  const { data: existing } = await supabase
    .from('monthly_reports')
    .select('id')
    .eq('save_id', saveId)
    .eq('year_key', yearKey)
    .eq('dept_key', 'annual_rank')
    .limit(1);
  if (existing && existing.length > 0) return null;

  const grade =
    stats.annualRankPct >= 95 ? '特等' :
    stats.annualRankPct >= 80 ? '优秀' :
    stats.annualRankPct >= 60 ? '良好' :
    stats.annualRankPct >= 40 ? '合格' : '待改进';

  const gradeEmoji = { '特等': '🏅', '优秀': '🌟', '良好': '✅', '合格': '📋', '待改进': '⚠️' }[grade];

  const title = `第${yearKey}年度综合政绩排行报表`;
  const content = [
    `【综合排名】全市同级 TOP ${100 - stats.annualRankPct}% · 综合等级：${gradeEmoji}${grade}`,
    ``,
    `【年度指标概览】`,
    `· GDP指数：${stats.cityGdp.toFixed(1)}（排名前 ${Math.max(5, 100 - stats.cityGdp)}%）`,
    `· 民生指数：${stats.cityLivelihood.toFixed(1)}（排名前 ${Math.max(5, 100 - stats.cityLivelihood)}%）`,
    `· 生态指数：${stats.cityEcology.toFixed(1)}（排名前 ${Math.max(5, 100 - stats.cityEcology)}%）`,
    `· 营商环境：${stats.cityBusiness.toFixed(1)}（排名前 ${Math.max(5, 100 - stats.cityBusiness)}%）`,
    ``,
    `【财政与产业】`,
    `· 本年度累计税收：${stats.taxRevenue.toFixed(0)} 万元`,
    `· 引进运营企业：${stats.enterpriseCount} 家`,
    `· 在编行政人员：${stats.totalStaff} 人`,
    `· 累计政绩积分：${stats.meritPoints.toFixed(0)} 分`,
    ``,
    `【年度事件回顾】`,
    `· 本年突发事件：${stats.eventsThisYear} 起`,
    stats.eventsThisYear === 0
      ? '· 全年无重大突发事件，施政平稳'
      : stats.eventsThisYear <= 3
      ? '· 突发事件处置得当，未对城市发展造成重大影响'
      : '· 本年突发事件较多，建议加强风险防控',
    ``,
    `【晋升影响】`,
    stats.isExcellentRank
      ? '· 优秀评定！任期年限要求缩短50%，晋升通道加速开启'
      : '· 综合排名未达优秀，继续努力提升各项指标',
  ].join('\n');

  const { data } = await supabase.from('monthly_reports').insert({
    save_id: saveId, user_id: userId,
    month_key: monthKey, year_key: yearKey,
    dept_key: 'annual_rank', title, content,
    gdp_change: 0, livelihood_change: 0, ecology_change: 0, business_change: 0,
    merit_reward: stats.isExcellentRank ? 30 : 0,
    is_read: false,
  }).select('*').maybeSingle();
  if (!data) return null;

  // 兼容 rowToMonthlyReport 函数（复用现有转换）
  const r = data as Record<string, unknown>;
  return {
    id: r.id as string,
    saveId: r.save_id as string,
    monthKey: r.month_key as number,
    yearKey: r.year_key as number,
    deptKey: r.dept_key as string,
    title: r.title as string,
    content: r.content as string,
    gdpChange: r.gdp_change as number,
    livelihoodChange: r.livelihood_change as number,
    ecologyChange: r.ecology_change as number,
    businessChange: r.business_change as number,
    meritReward: r.merit_reward as number,
    isRead: r.is_read as boolean,
    createdAt: r.created_at as string,
  };
}

// ============ 各部门正职每月自动行动 ============
/**
 * 遍历所有已任命正职的部门，按正职能力系数自动执行月度行动。
 * 能力系数 = ability / 100（范围 0.5~1.0，最低保底 50%）
 * 返回实际叠加到 save 上的增量对象，由调用方写入。
 */
export async function execDeptAutoActions(
  saveId: string,
): Promise<{
  cityGdp: number; cityLivelihood: number; cityEcology: number;
  cityBusiness: number; securityIndex: number; meritPoints: number;
  bossFavor: number; fundBalance: number; taxRevenue: number;
  log: string[];
}> {
  const result = {
    cityGdp: 0, cityLivelihood: 0, cityEcology: 0,
    cityBusiness: 0, securityIndex: 0, meritPoints: 0,
    bossFavor: 0, fundBalance: 0, taxRevenue: 0,
    log: [] as string[],
  };

  // 查询所有正职下属
  const { data } = await supabase
    .from('subordinates')
    .select('appointed_dept, dept_position, ability, name, is_appointed')
    .eq('save_id', saveId)
    .eq('is_appointed', true)
    .eq('dept_position', 'head');

  if (!data || data.length === 0) return result;

  for (const row of data as Record<string, unknown>[]) {
    const deptKey = row.appointed_dept as DeptKey | null;
    if (!deptKey) continue;
    const cfg = DEPT_CONFIG[deptKey];
    if (!cfg?.autoEffect) continue;

    // 能力系数：保底 50%，最高 100%
    const ability = typeof row.ability === 'number' ? row.ability : 50;
    const factor = Math.max(0.5, Math.min(1.0, ability / 100));

    const fx = cfg.autoEffect;
    const apply = (v?: number) => v ? Math.round(v * factor * 10) / 10 : 0;

    result.cityGdp       += apply(fx.cityGdp);
    result.cityLivelihood += apply(fx.cityLivelihood);
    result.cityEcology    += apply(fx.cityEcology);
    result.cityBusiness   += apply(fx.cityBusiness);
    result.securityIndex  += apply(fx.securityIndex);
    result.meritPoints    += apply(fx.meritPoints);
    result.bossFavor      += apply(fx.bossFavor);
    result.fundBalance    += apply(fx.fundBalance);
    result.taxRevenue     += apply(fx.taxRevenue);

    result.log.push(`${cfg.name}[${row.name as string}]执行了【${cfg.autoActionName}】`);
  }

  return result;
}

// ============ 民生人口自然增长 ============
export async function growPopulation(saveId: string): Promise<number> {
  const { data } = await supabase
    .from('player_saves')
    .select('city_population, city_livelihood, city_business, city_gdp')
    .eq('id', saveId)
    .maybeSingle();
  if (!data) return 50000;
  const pop        = (data.city_population as number) ?? 50000;
  const livelihood = (data.city_livelihood as number) ?? 50;
  const business   = (data.city_business as number) ?? 50;
  const gdp        = (data.city_gdp as number) ?? 50;
  const baseRate   = 0.003;
  const bonus      = (livelihood > 60 ? 0.001 : 0) + (business > 60 ? 0.001 : 0) + (gdp > 70 ? 0.001 : 0);
  const newPop     = Math.max(1000, Math.round(pop * (1 + baseRate + bonus)));
  await supabase.from('player_saves').update({ city_population: newPop }).eq('id', saveId);
  return newPop;
}

// ============ 秘书能力每月自动+1 ============
export async function autoGrowSecretaryAbility(saveId: string): Promise<void> {
  const { data } = await supabase.from('secretary').select('id, ability').eq('save_id', saveId).maybeSingle();
  if (!data) return;
  const cur = (data.ability as number) ?? 50;
  if (cur >= 100) return;
  await supabase.from('secretary').update({ ability: Math.min(100, cur + 1) }).eq('id', data.id as string);
}

/**
 * NPC月度能力自然增长（锚定官职职级，不再弹窗晋级）
 * 增长逻辑（参考现实干部成长规律）：
 *  - 科员级(1-2)：在岗实践多，成长快，+2~3点能力/月，上限80
 *  - 副科/正科(3-4)：基层独当一面，+1~2点/月，上限85
 *  - 副处/正处(5-6)：经验丰富，+1点/月，上限88
 *  - 副厅/正厅(7-8)：增长趋缓，+1点/月，上限90（每3月增1次）
 *  - 副部/正部+(9+)：顶峰期，上限95，每6月+1点
 */
export async function autoGrowSubAbility(saveId: string): Promise<void> {
  const { data } = await supabase
    .from('subordinates')
    .select('id, sub_level, ability, experience')
    .eq('save_id', saveId)
    .is('transferred_city', null);
  if (!data || data.length === 0) return;

  const rows = data as { id: string; sub_level: number; ability: number; experience: number }[];
  for (const sub of rows) {
    const level = sub.sub_level ?? 1;
    // 每月随机决定是否增长（按职级控制频率）
    const roll = Math.random();
    // 科员(1-2)：100%概率增长
    // 副科/正科(3-4)：80%
    // 副处/正处(5-6)：60%
    // 副厅/正厅(7-8)：40%
    // 副部+(9+)：20%
    const prob = level <= 2 ? 1.0 : level <= 4 ? 0.80 : level <= 6 ? 0.60 : level <= 8 ? 0.40 : 0.20;
    if (roll > prob) continue;

    // 增长量（职级越高增量越小）
    const gain = level <= 2 ? 2 + Math.floor(Math.random() * 2) : level <= 4 ? 1 + Math.floor(Math.random() * 2) : 1;
    const cap  = level <= 2 ? 80 : level <= 4 ? 85 : level <= 6 ? 88 : level <= 8 ? 90 : 95;
    const expGain = level <= 4 ? 1 : 0; // 低职级顺带积累经验

    if (sub.ability >= cap && sub.experience >= 100) continue;
    await supabase.from('subordinates').update({
      ability:    Math.min(cap, sub.ability + gain),
      experience: Math.min(100, sub.experience + expGain),
    }).eq('id', sub.id);
  }
}

// ============ 一键考评所有在岗下属 ============
export async function batchAssessSubordinates(saveId: string, gameDays: number): Promise<number> {
  const { data } = await supabase
    .from('subordinates')
    .select('id, ability, loyalty, experience')
    .eq('save_id', saveId)
    .eq('is_appointed', true);
  if (!data || data.length === 0) return 0;
  for (const row of data as Record<string, unknown>[]) {
    await supabase.from('subordinates').update({
      ability:           Math.min(100, Math.max(0, (row.ability as number)    + (Math.floor(Math.random() * 5) - 1))),
      loyalty:           Math.min(100, Math.max(0, (row.loyalty as number)    + (Math.floor(Math.random() * 4) - 1))),
      experience:        Math.min(100, (row.experience as number) + 2 + Math.floor(Math.random() * 3)),
      last_assessed_day: gameDays,
    }).eq('id', row.id as string);
  }
  return data.length;
}

// ============ 一键分配岗位 ============
/**
 * 一键分配岗位（智能级联策略）：
 * 1. 优先填充空缺正职（每部门最多1名）
 * 2. 正职全满后，填充空缺副职（每部门最多3名）
 * 3. 副职全满后，将剩余人员分配为科员（就近分配人数不足的部门）
 * 返回总分配人数。
 */
export async function autoAssignSubordinates(saveId: string, userId: string, rankLevel = 7): Promise<number> {
  // 获取全部未在岗下属（is_appointed=false，transferred_city 为 null）
  const { data: unassigned } = await supabase
    .from('subordinates')
    .select('id, ability, faction, sub_level')
    .eq('save_id', saveId)
    .eq('is_appointed', false)
    .is('transferred_city', null);
  if (!unassigned || unassigned.length === 0) return 0;

  // 获取当前已任命情况，统计各部门正职/副职/科员人数
  const { data: appointedAll } = await supabase
    .from('subordinates')
    .select('appointed_dept, dept_position')
    .eq('save_id', saveId)
    .eq('is_appointed', true);

  // 编制上限：1 正职 / 5 副职 / 无限科员（科长占20%，科员占80%）
  const HEAD_LIMIT   = 1;
  const DEPUTY_LIMIT = 5;

  type DeptCounts = { head: number; deputy: number; staff: number };
  const deptCounts: Record<string, DeptCounts> = {};
  const allDepts = Object.keys(DEPT_CONFIG) as DeptKey[];
  for (const d of allDepts) deptCounts[d] = { head: 0, deputy: 0, staff: 0 };
  for (const row of (appointedAll ?? [])) {
    const r = row as Record<string, unknown>;
    const dept = r.appointed_dept as string;
    const pos  = r.dept_position as string;
    if (deptCounts[dept] && (pos === 'head' || pos === 'deputy' || pos === 'staff')) {
      deptCounts[dept][pos as keyof DeptCounts]++;
    }
  }

  // 能力降序排列，清除残留字段
  const pool = [...(unassigned as { id: string; ability: number; faction: string; sub_level: number }[])]
    .sort((a, b) => b.ability - a.ability);
  const unassignedIds = pool.map(s => s.id);
  await supabase.from('subordinates')
    .update({ appointed_dept: null, dept_position: null, appointed_role: null })
    .in('id', unassignedIds);

  let assigned = 0;
  let poolIdx  = 0;

  // ── 阶段 1：填充正职空缺（能力最强者担任正职）──
  const headVacant = allDepts.filter(d => deptCounts[d].head < HEAD_LIMIT);
  for (const dept of headVacant) {
    if (poolIdx >= pool.length) break;
    const sub = pool[poolIdx++];
    await supabase.from('subordinates').update({
      is_appointed: true,
      appointed_role: getDeptHeadTitle(dept, rankLevel),
      appointed_dept: dept,
      dept_position: 'head',
      sub_level: getDeptPositionSubLevel(dept, rankLevel, 'head'),
      position: getDeptHeadTitle(dept, rankLevel),
    }).eq('id', sub.id);
    deptCounts[dept].head++;
    await fillDeptStaff(saveId, userId, dept);
    assigned++;
  }

  // ── 阶段 2：填充副职空缺（每部门最多 5 名副职）──
  if (poolIdx < pool.length) {
    const deputyVacant: DeptKey[] = [];
    for (const d of allDepts) {
      const gap = DEPUTY_LIMIT - deptCounts[d].deputy;
      for (let i = 0; i < gap; i++) deputyVacant.push(d);
    }
    for (const dept of deputyVacant) {
      if (poolIdx >= pool.length) break;
      const sub = pool[poolIdx++];
      await supabase.from('subordinates').update({
        is_appointed: true,
        appointed_role: getDeptDeputyTitle(dept, rankLevel),
        appointed_dept: dept,
        dept_position: 'deputy',
        sub_level: getDeptPositionSubLevel(dept, rankLevel, 'deputy'),
        position: getDeptDeputyTitle(dept, rankLevel),
      }).eq('id', sub.id);
      deptCounts[dept].deputy++;
      assigned++;
    }
  }

  // ── 阶段 3：剩余人员按 20%科长/80%科员 轮询分配到各部门 ──
  // 每满 5 人给 1 名科长（位置 0），其余为科员
  if (poolIdx < pool.length) {
    const deptArr = allDepts.slice().sort((a, b) => deptCounts[a].staff - deptCounts[b].staff);
    // 记录每个部门本次新增科员数，用于控制科长比例
    const newStaffCount: Record<string, number> = {};
    for (const d of allDepts) newStaffCount[d] = 0;
    let deptIdx = 0;

    while (poolIdx < pool.length) {
      // 轮询找下一个可分配的部门（科员上限 30 人/部门）
      let found = false;
      for (let attempt = 0; attempt < deptArr.length; attempt++) {
        const dept = deptArr[(deptIdx + attempt) % deptArr.length];
        if (deptCounts[dept].staff < 30) {
          const sub = pool[poolIdx++];
          // 每 5 人中首位为科长（20%），其余为科员（80%）；乡镇层级用"工作人员/负责人"
          const isSectionChief = newStaffCount[dept] % 5 === 0;
          const deptDisplayName = getDeptNameByRank(dept, rankLevel);
          const role = isSectionChief
            ? (rankLevel <= 3 ? `${deptDisplayName}负责人` : `${deptDisplayName}科长`)
            : (rankLevel <= 3 ? `${deptDisplayName}工作人员` : `${deptDisplayName}科员`);
          await supabase.from('subordinates').update({
            is_appointed: true,
            appointed_role: role,
            appointed_dept: dept,
            dept_position: 'staff',
          }).eq('id', sub.id);
          deptCounts[dept].staff++;
          newStaffCount[dept]++;
          deptIdx = (deptIdx + attempt + 1) % deptArr.length;
          assigned++;
          found = true;
          break;
        }
      }
      if (!found) break;
    }
  }

  return assigned;
}

// ============ 岗位变动时刷新下属队伍（晋升/换城市/换岗位）============
/**
 * 玩家晋升或换岗时调用：
 * 1. 将现有下属随机分配去向（转任/退休），高忠诚者保留在"申请跟随"候选列表
 * 2. 为新岗位生成初始下属并自动填满80%以上编制
 * 返回：申请跟随玩家的下属列表（由 promotion.tsx 弹窗处理）
 */
export async function refreshSubordinatesForNewPost(
  saveId: string,
  userId: string,
  newRankLevel: number,
  newCityName: string,
  keepFollowers: string[] = [],  // 已确认跟随的下属ID（在弹窗确认后调用）
): Promise<void> {
  await ensureNpcNamePoolLoaded();
  // 获取所有在岗下属
  const { data: allSubs } = await supabase
    .from('subordinates')
    .select('id, loyalty, is_appointed')
    .eq('save_id', saveId)
    .is('transferred_city', null);

  if (!allSubs) return;

  const keepSet = new Set(keepFollowers);
  const toDispatch: string[] = [];

  for (const s of allSubs as { id: string; loyalty: number; is_appointed: boolean }[]) {
    if (keepSet.has(s.id)) continue; // 跟随者保留
    toDispatch.push(s.id);
  }

  if (toDispatch.length > 0) {
    // 批量标记为调任其他城市（用固定占位城市，不影响游戏）
    const DISPATCH_CITY = `原任地（${newCityName}前）`;
    await supabase.from('subordinates')
      .update({ is_appointed: false, transferred_city: DISPATCH_CITY, appointed_dept: null, dept_position: null, appointed_role: null })
      .in('id', toDispatch);
  }

  // 为新岗位生成初始下属（数量根据职级）
  const { SUBORDINATE_LIMIT } = await import('@/types/game');
  const targetCount = Math.ceil((SUBORDINATE_LIMIT[newRankLevel] ?? 10) * 0.85);
  const FACTIONS = ['reform', 'pragmatic', 'neutral', 'economy', 'discipline'] as const;
  const DEPT_KEYS_NEW = Object.keys(DEPT_CONFIG) as DeptKey[];

  const newSubs = Array.from({ length: targetCount }, () => {
    const isMale = Math.random() > 0.4;
    const dept = DEPT_KEYS_NEW[Math.floor(Math.random() * DEPT_KEYS_NEW.length)];
    const cfg = DEPT_CONFIG[dept];
    return {
      save_id: saveId,
      user_id: userId,
      name: pickNpcName(),
      position: '科员',
      role: `${cfg.name}科员`,
      avatar_id: Math.floor(Math.random() * 8),
      gender: isMale ? '男' : '女',
      ability: 35 + Math.floor(Math.random() * 40),
      loyalty: 40 + Math.floor(Math.random() * 35),
      integrity: 45 + Math.floor(Math.random() * 35),
      experience: 5 + Math.floor(Math.random() * 30),
      faction: FACTIONS[Math.floor(Math.random() * FACTIONS.length)],
      is_appointed: false,
      sub_level: Math.max(1, newRankLevel - 2),
      transferred_city: null,
      last_assessed_day: 0,
    };
  });

  if (newSubs.length > 0) {
    await supabase.from('subordinates').insert(newSubs);
  }

  // 自动分配编制
  await autoAssignSubordinates(saveId, userId, newRankLevel);
}

/**
 * 获取当前在岗下属中愿意跟随玩家的候选人列表（忠诚度≥70）
 * 供晋升弹窗展示，最多返回3名
 */
export async function getFollowCandidates(saveId: string): Promise<{ id: string; name: string; loyalty: number; appointedRole: string | null }[]> {
  const { data } = await supabase
    .from('subordinates')
    .select('id, name, loyalty, appointed_role')
    .eq('save_id', saveId)
    .is('transferred_city', null)
    .gte('loyalty', 70)
    .order('loyalty', { ascending: false })
    .limit(3);
  return (data ?? []).map(r => ({
    id: r.id as string,
    name: r.name as string,
    loyalty: r.loyalty as number,
    appointedRole: r.appointed_role as string | null,
  }));
}
const EXCHANGE_CITIES = ['广州市', '成都市', '武汉市', '西安市', '南京市', '杭州市', '济南市', '郑州市', '长沙市', '合肥市'];

export interface ExchangeOfficer {
  name: string;
  gender: '男' | '女';
  avatarId: number;
  fromCity: string;
  position: string;
  ability: number;
  loyalty: number;
  integrity: number;
  experience: number;
  faction: import('@/types/game').FactionId;
  subLevel: number;
}

export function generateExchangeOfficer(): ExchangeOfficer {
  const gender: '男' | '女' = Math.random() < 0.6 ? '男' : '女';
  const factions: import('@/types/game').FactionId[] = ['reform', 'pragmatic', 'cyl', 'techno', 'local'];
  return {
    name:       pickNpcName(),
    gender,
    avatarId:   Math.floor(Math.random() * 8),
    fromCity:   EXCHANGE_CITIES[Math.floor(Math.random() * EXCHANGE_CITIES.length)],
    position:   ['县委常委', '市局副局长', '乡镇党委书记', '市直机关科长', '县政府办副主任'][Math.floor(Math.random() * 5)],
    ability:    50 + Math.floor(Math.random() * 30),
    loyalty:    40 + Math.floor(Math.random() * 30),
    integrity:  50 + Math.floor(Math.random() * 30),
    experience: 40 + Math.floor(Math.random() * 40),
    faction:    factions[Math.floor(Math.random() * 3)],
    subLevel:   3 + Math.floor(Math.random() * 4),
  };
}

export async function acceptExchangeOfficer(
  saveId: string, userId: string, officer: ExchangeOfficer
): Promise<boolean> {
  const { error } = await supabase.from('subordinates').insert({
    save_id:           saveId,
    user_id:           userId,
    name:              officer.name,
    position:          officer.position,
    role:              officer.position,
    avatar_id:         officer.avatarId,
    gender:            officer.gender,
    ability:           officer.ability,
    loyalty:           officer.loyalty,
    integrity:         officer.integrity,
    experience:        officer.experience,
    faction:           officer.faction,
    sub_level:         officer.subLevel,
    is_appointed:      false,
    appointed_role:    null,
    appointed_dept:    null,
    dept_position:     'head',
    transferred_city:  null,
    last_assessed_day: 0,
  });
  return !error;
}

// =====================================================================
// ★ 领导班子系统
// =====================================================================

// 真实县级行政区（供仕途历程中随机选取）
const _REAL_COUNTIES: Record<string, string[]> = {
  '北京市':   ['密云区', '延庆区', '怀柔区', '平谷区', '顺义区', '昌平区'],
  '天津市':   ['蓟州区', '宝坻区', '武清区', '静海区', '宁河区', '滨海新区'],
  '河北省':   ['滦南县', '迁安市', '武强县', '饶阳县', '枣强县', '清苑区', '定州市', '任丘市', '雄县', '涿州市'],
  '山西省':   ['祁县', '平遥县', '介休市', '高平市', '长子县', '浮山县', '翼城县', '曲沃县'],
  '内蒙古自治区': ['科尔沁右翼前旗', '察哈尔右翼前旗', '托克托县', '和林格尔县', '清水河县'],
  '辽宁省':   ['海城市', '台安县', '岫岩满族自治县', '凌海市', '北镇市', '庄河市', '瓦房店市'],
  '吉林省':   ['梅河口市', '集安市', '辉南县', '柳河县', '东丰县', '双辽市', '公主岭市'],
  '黑龙江省': ['肇东市', '肇州县', '肇源县', '绥棱县', '明水县', '青冈县', '兰西县', '依安县'],
  '上海市':   ['金山区', '奉贤区', '崇明区', '松江区', '青浦区', '嘉定区'],
  '江苏省':   ['如皋市', '海安市', '启东市', '通州区', '丹阳市', '句容市', '溧阳市', '宜兴市', '金湖县', '盱眙县'],
  '浙江省':   ['桐庐县', '建德市', '淳安县', '慈溪市', '余姚市', '平湖市', '海盐县', '龙游县', '江山市', '温岭市'],
  '安徽省':   ['天长市', '明光市', '全椒县', '来安县', '定远县', '凤阳县', '界首市', '太和县', '颍上县', '阜南县'],
  '福建省':   ['永安市', '沙县区', '尤溪县', '将乐县', '建瓯市', '长汀县', '连城县', '武平县', '南靖县'],
  '江西省':   ['宁都县', '于都县', '兴国县', '赣县区', '信丰县', '大余县', '上犹县', '崇义县', '安远县', '进贤县'],
  '山东省':   ['诸城市', '安丘市', '高密市', '昌邑市', '邹城市', '曲阜市', '泗水县', '微山县', '滕州市', '招远市'],
  '河南省':   ['新郑市', '荥阳市', '巩义市', '新密市', '登封市', '长葛市', '项城市', '沈丘县', '郸城县', '太康县'],
  '湖北省':   ['钟祥市', '京山市', '沙洋县', '公安县', '监利市', '石首市', '赤壁市', '咸安区', '嘉鱼县', '通城县'],
  '湖南省':   ['浏阳市', '宁乡市', '醴陵市', '攸县', '茶陵县', '炎陵县', '汨罗市', '平江县', '岳阳县', '华容县'],
  '广东省':   ['增城区', '从化区', '花都区', '博罗县', '惠东县', '龙门县', '高要区', '四会市', '德庆县', '封开县'],
  '广西壮族自治区': ['横县', '宾阳县', '上林县', '隆安县', '马山县', '武鸣区', '鹿寨县', '融安县', '融水苗族自治县'],
  '海南省':   ['定安县', '屯昌县', '澄迈县', '临高县', '乐东黎族自治县', '东方市', '昌江黎族自治县'],
  '重庆市':   ['江津区', '合川区', '永川区', '南川区', '綦江区', '大足区', '荣昌区', '铜梁区', '潼南区', '梁平区'],
  '四川省':   ['简阳市', '金堂县', '大邑县', '蒲江县', '新津区', '仁寿县', '彭山区', '青神县', '丹棱县', '东坡区'],
  '贵州省':   ['息烽县', '修文县', '开阳县', '清镇市', '遵义县', '桐梓县', '绥阳县', '正安县', '道真仡佬族苗族自治县'],
  '云南省':   ['宜良县', '石林彝族自治县', '嵩明县', '禄劝彝族苗族自治县', '寻甸回族彝族自治县', '安宁市', '呈贡区'],
  '西藏自治区': ['达孜区', '墨竹工卡县', '堆龙德庆区', '曲水县', '尼木县', '当雄县'],
  '陕西省':   ['三原县', '泾阳县', '礼泉县', '乾县', '兴平市', '武功县', '扶风县', '眉县', '岐山县', '凤翔区'],
  '甘肃省':   ['永登县', '皋兰县', '榆中县', '秦州区', '麦积区', '清水县', '秦安县', '甘谷县', '武山县'],
  '青海省':   ['湟中区', '湟源县', '大通回族土族自治县', '平安区', '民和回族土族自治县', '乐都区'],
  '宁夏回族自治区': ['永宁县', '贺兰县', '灵武市', '平罗县', '惠农区', '利通区', '青铜峡市'],
  '新疆维吾尔自治区': ['米东区', '达坂城区', '乌鲁木齐县', '呼图壁县', '玛纳斯县', '沙湾市', '奇台县'],
};

// 随机镇名前缀（符合现实）
const _TOWN_PREFIXES = [
  '清河', '兴华', '龙泉', '南湖', '北溪', '桃源', '柳林', '石桥', '金沙', '铜山',
  '梅岭', '凤凰', '荷花', '莲湖', '白云', '青山', '新兴', '永安', '兴隆', '平原',
  '东风', '红星', '向阳', '太平', '广济', '福安', '长寿', '大同', '永丰', '富民',
  '天马', '玉泉', '惠民', '安平', '通达', '望江', '临江', '泉山', '宝兴', '瑞云',
];

function _randNpcName(_gender: string): string {
  return pickNpcName();
}

/** 随机生成一个镇名（格式：xx镇） */
function _randTownName(): string {
  return _TOWN_PREFIXES[Math.floor(Math.random() * _TOWN_PREFIXES.length)] + '镇';
}

/** 随机取一个真实省份+城市 */
function _randRealProvCity(): { prov: string; city: string } {
  const prov = PROVINCE_LIST[Math.floor(Math.random() * PROVINCE_LIST.length)];
  const cities = PROVINCE_CITY_MAP[prov] ?? [];
  const city = cities.length > 0 ? cities[Math.floor(Math.random() * cities.length)] : '市辖区';
  return { prov, city };
}

/** 随机取一个真实县（或用城市下辖区替代） */
function _randRealCounty(prov: string): string {
  const counties = _REAL_COUNTIES[prov] ?? [];
  if (counties.length > 0) return counties[Math.floor(Math.random() * counties.length)];
  // 兜底：直接用省会城市名
  const cities = PROVINCE_CITY_MAP[prov] ?? [];
  return cities.length > 0 ? cities[Math.floor(Math.random() * cities.length)] : '某县';
}

// 各级科员/办事员起始职位
/**
 * ── 真实职务对照表（按入职层级分类）──
 *
 * 各级单位名称规范：
 *   镇级：综合办公室、党委办公室、经发办、农业农村服务中心、财政所、社事办、规建中心
 *   县级：发改委、财政局、民政局、人社局、农业农村局、自然资源局、住建局、卫健局、教育局、纪委、组织部
 *   市级：发改委、财政局、组织部……（同县，但叫"市发改委"等）
 *
 * 晋升路径（同一机构内先升职再换岗）：
 *   镇：科员 → 副主任/副所长 → 副镇长 → 镇长 → 镇党委书记
 *   县：科员 → 股长/副科长 → 副局长 → 局长 → 县委常委/副县长 → …
 */

// ── 镇级机构（无"局"，只有"办"/"所"/"中心"/"站"）──
const _TOWN_ORGS: Array<{ name: string; internalTitle: string; internalTitleDep: string }> = [
  { name: '镇政府综合办公室',     internalTitle: '副主任',   internalTitleDep: '主任' },
  { name: '镇党委办公室',         internalTitle: '副主任',   internalTitleDep: '主任' },
  { name: '镇经济发展办公室',     internalTitle: '副主任',   internalTitleDep: '主任' },
  { name: '镇社会事务办公室',     internalTitle: '副主任',   internalTitleDep: '主任' },
  { name: '镇农业农村服务中心',   internalTitle: '副主任',   internalTitleDep: '主任' },
  { name: '镇规划建设服务中心',   internalTitle: '副主任',   internalTitleDep: '主任' },
  { name: '镇财政所',             internalTitle: '副所长',   internalTitleDep: '所长' },
  { name: '镇文化站',             internalTitle: '副站长',   internalTitleDep: '站长' },
];

// ── 县级机构（有"局"/"委"/"部"）──
const _COUNTY_ORGS: Array<{ name: string; clerk: string; deputy: string; head: string }> = [
  { name: '县发展和改革委员会', clerk: '科员',   deputy: '副主任科员', head: '主任科员' },
  { name: '县财政局',           clerk: '科员',   deputy: '股长',       head: '副局长'  },
  { name: '县民政局',           clerk: '科员',   deputy: '股长',       head: '副局长'  },
  { name: '县人力资源和社会保障局', clerk: '科员', deputy: '股长',     head: '副局长'  },
  { name: '县农业农村局',       clerk: '科员',   deputy: '股长',       head: '副局长'  },
  { name: '县自然资源局',       clerk: '科员',   deputy: '股长',       head: '副局长'  },
  { name: '县住房和城乡建设局', clerk: '科员',   deputy: '股长',       head: '副局长'  },
  { name: '县卫生健康局',       clerk: '科员',   deputy: '股长',       head: '副局长'  },
  { name: '县教育局',           clerk: '科员',   deputy: '股长',       head: '副局长'  },
  { name: '县委组织部',         clerk: '干事',   deputy: '副主任科员', head: '主任科员' },
];

// ── 市级机构 ──
const _CITY_ORGS: Array<{ name: string; clerk: string; deputy: string; head: string }> = [
  { name: '市发展和改革委员会', clerk: '科员',   deputy: '副主任科员', head: '主任科员' },
  { name: '市财政局',           clerk: '科员',   deputy: '科长',       head: '副局长'  },
  { name: '市人力资源和社会保障局', clerk: '科员', deputy: '科长',     head: '副局长'  },
  { name: '市农业农村局',       clerk: '科员',   deputy: '科长',       head: '副局长'  },
  { name: '市国资委',           clerk: '科员',   deputy: '科长',       head: '副主任'  },
  { name: '市委组织部',         clerk: '干事',   deputy: '副主任科员', head: '主任科员' },
];

/**
 * 生成"科员+机构内晋升"的两条起步记录，并返回最终占用年数
 * startLevel: 'town' | 'county' | 'city'
 */
/**
 * 地理锚点：NPC 职业生涯的籍贯省/市
 * 低级别在本城市内流动，高级别才跨省
 */
interface GeoCtx {
  prov: string;
  city: string;
}

/** 在同省内随机换一个地级市（可排除当前城市） */
function _pickCityInProv(prov: string, excludeCity?: string): string {
  const cities = (PROVINCE_CITY_MAP[prov] ?? []).filter(c => c !== excludeCity);
  if (cities.length > 0) return cities[Math.floor(Math.random() * cities.length)];
  return PROVINCE_CITY_MAP[prov]?.[0] ?? '市辖区';
}

/**
 * 按地理锚点 + 晋升阶梯层级生成地名（真实地理跨度规则）：
 *  town / county (科员→县委书记)：90%同省同城，10%同省换城
 *  city (副市长→市委书记)：      80%同省换城，20%跨省
 *  prov (副省长→省长)：          70%同省，30%跨省
 *  national：国政院
 */
function _buildLocWithCtx(
  locType: 'town' | 'county' | 'city' | 'prov' | 'national',
  geo: GeoCtx,
): string {
  if (locType === 'national') return '国政院';

  if (locType === 'prov') {
    const prov = Math.random() < 0.7 ? geo.prov : _randRealProvCity().prov;
    return prov;
  }

  if (locType === 'city') {
    if (Math.random() < 0.8) {
      // 同省换地级市
      const newCity = _pickCityInProv(geo.prov, geo.city);
      return `${geo.prov}${newCity}`;
    }
    // 跨省（20%）
    const { prov, city } = _randRealProvCity();
    return `${prov}${city}`;
  }

  if (locType === 'county') {
    if (Math.random() < 0.9) {
      // 同省同城换县（90%）
      return `${geo.prov}${geo.city}${_randRealCounty(geo.prov)}`;
    }
    // 同省换城（10%）
    const newCity = _pickCityInProv(geo.prov, geo.city);
    return `${geo.prov}${newCity}${_randRealCounty(geo.prov)}`;
  }

  // town：同省同城内换镇
  return `${geo.prov}${geo.city}${_randTownName()}`;
}

function _buildClerkStart(
  startLevel: 'town' | 'county' | 'city',
  startYear: number,
  geo: GeoCtx,
): { entries: CareerEntry[]; endYear: number } {
  const entries: CareerEntry[] = [];
  let cur = startYear;

  if (startLevel === 'town') {
    const org = _TOWN_ORGS[Math.floor(Math.random() * _TOWN_ORGS.length)];
    const loc = _buildLocWithCtx('town', geo);
    entries.push({ yearStart: cur, yearEnd: cur + 2, position: `${org.name}科员`,           city: loc, rankLevel: 1 });
    cur += 2;
    entries.push({ yearStart: cur, yearEnd: cur + 2, position: `${org.name}${org.internalTitle}`, city: loc, rankLevel: 1 });
    cur += 2;
  } else if (startLevel === 'county') {
    const org  = _COUNTY_ORGS[Math.floor(Math.random() * _COUNTY_ORGS.length)];
    const loc  = _buildLocWithCtx('county', geo);
    entries.push({ yearStart: cur, yearEnd: cur + 2, position: `${org.name}${org.clerk}`, city: loc, rankLevel: 1 });
    cur += 2;
    const t2 = 2 + Math.floor(Math.random() * 2);
    entries.push({ yearStart: cur, yearEnd: cur + t2, position: `${org.name}${org.deputy}`, city: loc, rankLevel: 1 });
    cur += t2;
    if (Math.random() < 0.5) {
      const t3 = 2 + Math.floor(Math.random() * 2);
      entries.push({ yearStart: cur, yearEnd: cur + t3, position: `${org.name}${org.head}`, city: loc, rankLevel: 2 });
      cur += t3;
    }
  } else {
    const org  = _CITY_ORGS[Math.floor(Math.random() * _CITY_ORGS.length)];
    const loc  = _buildLocWithCtx('city', geo);
    entries.push({ yearStart: cur, yearEnd: cur + 2, position: `${org.name}${org.clerk}`, city: loc, rankLevel: 1 });
    cur += 2;
    const t2 = 2 + Math.floor(Math.random() * 2);
    entries.push({ yearStart: cur, yearEnd: cur + t2, position: `${org.name}${org.deputy}`, city: loc, rankLevel: 1 });
    cur += t2;
    if (Math.random() < 0.5) {
      const t3 = 2 + Math.floor(Math.random() * 2);
      entries.push({ yearStart: cur, yearEnd: cur + t3, position: `${org.name}${org.head}`, city: loc, rankLevel: 2 });
      cur += t3;
    }
  }
  return { entries, endYear: cur };
}

/**
 * 真实公务员晋升阶梯（科员/内部晋升之后的领导岗位，严格递增）
 * locType 决定地名层级
 */
const _CAREER_LADDER: Array<{
  positions: string[];
  locType: 'town' | 'county' | 'city' | 'prov' | 'national';
  tenureMin: number;
  tenureMax: number;
}> = [
  // step 0 — 副科级：副镇长（乡镇政府领导班子成员）
  { positions: ['副镇长', '镇党委委员', '镇纪委书记'],                              locType: 'town',     tenureMin: 3, tenureMax: 4 },
  // step 1 — 正科级：镇长/镇党委副书记
  { positions: ['镇长', '镇党委副书记'],                                            locType: 'town',     tenureMin: 3, tenureMax: 5 },
  // step 2 — 正科高配：镇党委书记
  { positions: ['镇党委书记'],                                                      locType: 'town',     tenureMin: 3, tenureMax: 5 },
  // step 3 — 副处初：县委常委/县委办副主任（跨到县级）
  { positions: ['县委常委', '县委办副主任', '县纪委副书记'],                          locType: 'county',   tenureMin: 3, tenureMax: 4 },
  // step 4 — 副处：副县长/县纪委书记
  { positions: ['副县长', '县纪委书记', '县委组织部部长'],                            locType: 'county',   tenureMin: 3, tenureMax: 5 },
  // step 5 — 正处过渡：县委副书记/常务副县长
  { positions: ['县委副书记', '常务副县长'],                                         locType: 'county',   tenureMin: 3, tenureMax: 5 },
  // step 6 — 正处：县委书记/县长
  { positions: ['县委书记', '县长'],                                                 locType: 'county',   tenureMin: 3, tenureMax: 5 },
  // step 7 — 副厅：副市长/市委常委
  { positions: ['副市长', '市委常委', '市纪委书记', '市委组织部部长'],                 locType: 'city',     tenureMin: 3, tenureMax: 5 },
  // step 8 — 副厅高配/正厅过渡：常务副市长/市委副书记
  { positions: ['常务副市长', '市委副书记'],                                         locType: 'city',     tenureMin: 3, tenureMax: 5 },
  // step 9 — 正厅：市长/市委书记
  { positions: ['市长', '市委书记'],                                                 locType: 'city',     tenureMin: 3, tenureMax: 5 },
  // step 10 — 副省：副省长/省委常委
  { positions: ['副省长', '省委常委', '省纪委书记', '省委组织部部长'],                 locType: 'prov',     tenureMin: 3, tenureMax: 5 },
  // step 11 — 省部：省长/省委书记
  { positions: ['省长', '省委书记'],                                                 locType: 'prov',     tenureMin: 3, tenureMax: 5 },
  // step 12 — 副国：国政委员/副院理
  { positions: ['国政委员', '副院理'],                                               locType: 'national', tenureMin: 3, tenureMax: 5 },
];

/**
 * game rankLevel → _CAREER_LADDER 中当前职位对应的索引（history最多到此索引-1）
 * 高rankLevel NPC 从县级起步，低rankLevel从镇级起步
 */
const _RANK_TO_LADDER_STEP: Record<number, number> = {
  1:  0,   // 科员（无领导岗历史）
  2:  0,   // 副科：副镇长（阶梯step0是现职）
  3:  2,   // 正科：镇党委书记（history: step0副镇长, step1镇长）
  4:  3,   // 副处初：县委常委（history含镇级3步）
  5:  4,   // 副处：副县长
  6:  5,   // 正处过渡：县委副书记
  7:  6,   // 正处：县委书记
  8:  7,   // 副厅：副市长
  9:  9,   // 正厅：市长（history含step7-8）
  10: 10,  // 副省：副省长
  11: 11,  // 省部：省长
  12: 12,  // 副国：副院理
};

/** 根据rankLevel判断起步层级 */
function _clerkStartLevel(rankLevel: number): 'town' | 'county' | 'city' {
  if (rankLevel >= 9)  return 'city';
  if (rankLevel >= 5)  return 'county';
  return 'town';
}

/** 根据 locType 返回完整地名（无锚点兼容版，内部调用请优先用 _buildLocWithCtx） */
function _buildLocationByType(locType: 'town' | 'county' | 'city' | 'prov' | 'national'): string {
  if (locType === 'national') return '国政院';
  const { prov, city } = _randRealProvCity();
  return _buildLocWithCtx(locType, { prov, city });
}

/**
 * 根据级别返回完整地名（兼容旧调用）
 */
function _buildLocation(rankLevel: number): string {
  if (rankLevel >= 12) return '国政院';
  const { prov, city } = _randRealProvCity();
  if (rankLevel >= 10) return _buildLocWithCtx('prov',    { prov, city });
  if (rankLevel >= 7)  return _buildLocWithCtx('city',    { prov, city });
  if (rankLevel >= 4)  return _buildLocWithCtx('county',  { prov, city });
  return _buildLocWithCtx('town', { prov, city });
}

/**
 * 从玩家 cityName（如"内蒙古自治区呼和浩特市清河镇"）中解析省/市锚点
 * 依次匹配 PROVINCE_LIST 中的省名前缀，再匹配城市
 */
function _extractGeoFromCityName(cityName: string): GeoCtx {
  for (const prov of PROVINCE_LIST) {
    if (cityName.startsWith(prov)) {
      const rest  = cityName.slice(prov.length);
      const cities = PROVINCE_CITY_MAP[prov] ?? [];
      const city  = cities.find(c => rest.startsWith(c)) ?? cities[0] ?? '';
      return { prov, city };
    }
  }
  return _randRealProvCity();
}

/**
 * 为NPC生成符合现实的仕途历程
 *
 * 地理规则：
 *  - homeGeo（早期）：优先用玩家籍贯省，代表"本省提拔体系"
 *  - 后期（最近2步）：向 playerCityName 所在省市靠拢，确保现职地点衔接自然
 *  - 若玩家未晋升（开局=籍贯地），则 homeGeo = playerGeo，整条仕途都在籍贯省
 *
 * playerCityName: 玩家当前 save.cityName
 * playerBirthGeo: 玩家籍贯省市（{ prov, city }），优先作为 NPC 早期历史锚点
 */
function _genNpcCareerHistory(rankLevel: number, age: number, playerCityName?: string, playerBirthGeo?: GeoCtx): CareerEntry[] {
  const workStartYear = 2025 - age + 22;
  const startLevel = _clerkStartLevel(rankLevel);
  const currentLadderStep = _RANK_TO_LADDER_STEP[rankLevel] ?? Math.min(rankLevel, _CAREER_LADDER.length);

  // 玩家所在地锚点（现职归宿）
  const playerGeo: GeoCtx = playerCityName
    ? _extractGeoFromCityName(playerCityName)
    : (playerBirthGeo ?? _randRealProvCity());

  // NPC 早期历史锚点：优先用玩家籍贯省，次选玩家当前城市，最后随机
  // 这样开局时（cityName = 籍贯镇），NPC 整条仕途都在籍贯省内
  const homeGeo: GeoCtx = playerBirthGeo ?? playerGeo;

  // 科员+内部晋升起步（用籍贯地）
  const { entries, endYear } = _buildClerkStart(startLevel, workStartYear, homeGeo);
  let curYear = endYear;

  // 领导岗历史阶梯
  const ladderHistory = _CAREER_LADDER.slice(0, currentLadderStep);

  // 年龄约束（留3年给现职）
  const availableYears = age - 22 - (curYear - workStartYear) - 3;
  const selectedSteps: typeof ladderHistory = [];
  let usedYears = 0;
  for (const step of ladderHistory) {
    const est = step.tenureMin;
    if (usedYears + est <= availableYears) {
      selectedSteps.push(step);
      usedYears += est + 1;
    }
  }

  // 最多展示最近5步领导岗
  const stepsToShow = selectedSteps.slice(-5);
  const total = stepsToShow.length;

  for (let i = 0; i < total; i++) {
    const step = stepsToShow[i];
    const tenure = step.tenureMin + Math.floor(Math.random() * (step.tenureMax - step.tenureMin + 1));
    const pos    = step.positions[Math.floor(Math.random() * step.positions.length)];

    // 地点策略：
    //   前半段 → 籍贯省（homeGeo）
    //   最近2步 → 玩家当前所在省市（playerGeo），自然过渡到现职
    let geoForStep: GeoCtx;
    if (total <= 2 || i >= total - 2) {
      geoForStep = (step.locType === 'city' || step.locType === 'prov' || step.locType === 'national')
        ? playerGeo
        : { prov: playerGeo.prov, city: playerGeo.city };
    } else {
      geoForStep = homeGeo;
    }

    const loc = _buildLocWithCtx(step.locType, geoForStep);
    entries.push({ yearStart: curYear, yearEnd: curYear + tenure, position: pos, city: loc, rankLevel });
    curYear += tenure;
  }

  return entries;
}

/** 履新时初始化NPC领导班子（清除旧班子，重新生成本层级NPC） */
export async function initLeadershipBand(
  saveId: string,
  rankLevel: number,
  playerName: string,
  playerPosition: string,
  playerBio?: { province: string; city: string; universityName: string },
  playerCityName?: string,
): Promise<void> {
  await ensureNpcNamePoolLoaded();
  // 先清除已有班子（直接删除再重建）
  await supabase.from('npc_band').delete().eq('save_id', saveId);

  const partyPositions = BAND_POSITIONS[rankLevel] ?? BAND_POSITIONS[Math.min(15, Math.max(1, rankLevel))];
  const govPositions   = GOVT_POSITIONS[rankLevel] ?? GOVT_POSITIONS[Math.min(15, Math.max(1, rankLevel))];
  const ndaPositions   = NDA_POSITIONS[rankLevel] ?? NDA_POSITIONS[Math.min(15, Math.max(1, rankLevel))];
  if (!partyPositions) return;

  const [ageMin, ageMax] = NPC_AGE_RANGE[rankLevel] ?? [40, 58];
  const factions: import('@/types/game').FactionId[] = ['reform', 'pragmatic', 'cyl', 'techno', 'local'];
  const playerBirthGeo: GeoCtx | undefined = (playerBio?.province && playerBio?.city)
    ? { prov: playerBio.province, city: playerBio.city }
    : undefined;

  /** 生成一个 NPC 行（含完整档案） */
  const buildNpcRow = (
    pos: { key: string; label: string; isPlayerRole?: boolean },
    group: 'party' | 'gov' | 'nda',
    isPlayer: boolean,
  ) => {
    if (isPlayer) {
      const birthYear = 2025 - 22 - Math.floor(Math.random() * 15); // 粗略
      return {
        save_id:         saveId,
        position_key:    pos.key,
        position_label:  playerPosition || pos.label,
        rank_level:      rankLevel,
        name:            playerName,
        gender:          '男',
        age:             0,
        faction:         'neutral' as const,
        ability:         80,
        loyalty:         100,
        integrity:       80,
        career_history:  [],
        is_retired:      false,
        retire_game_day: null,
        birth_province:  playerBio?.province ?? '',
        birth_city:      playerBio?.city ?? '',
        university_name: playerBio?.universityName ?? '',
        graduation_year: 0,
        birth_year:      birthYear,
        band_group:      group,
      };
    }
    // NPC层级：政府/议政院班子职级略低于党委（现实中党大于政）
    const npcRankAdj = group === 'party' ? rankLevel : Math.max(1, rankLevel - 1);
    const [nm, nx] = NPC_AGE_RANGE[npcRankAdj] ?? [40, 58];
    const gender = Math.random() < 0.25 ? '女' : '男';
    const age = nm + Math.floor(Math.random() * (nx - nm + 1));
    const faction = factions[Math.floor(Math.random() * factions.length)];
    const ability = 45 + Math.floor(Math.random() * 45);
    const careerHistory = _genNpcCareerHistory(npcRankAdj, age, playerCityName, playerBirthGeo);

    const { province: npcProvince, city: npcCity } = randBirthPlace();
    const tier = npcSchoolTier(npcRankAdj);
    const uniName = pickUniversityName(tier, npcProvince);
    const degreeLabel = npcDegreeLabel(tier, npcRankAdj);
    const studyYears = degreeLabel === '博士' ? 9 : degreeLabel === '硕士' ? 6 : 4;
    const birthYear = 2025 - age;
    const gradYear = birthYear + 18 + studyYears;

    let loyaltyBase = 35 + Math.floor(Math.random() * 36);
    if (playerBio) {
      if (npcCity === playerBio.city) loyaltyBase = Math.min(100, loyaltyBase + 12);
      else if (npcProvince === playerBio.province) loyaltyBase = Math.min(100, loyaltyBase + 7);
      if (uniName === playerBio.universityName) loyaltyBase = Math.min(100, loyaltyBase + 10);
    }
    const integrity = 40 + Math.floor(Math.random() * 41);
    return {
      save_id:         saveId,
      position_key:    pos.key,
      position_label:  pos.label,
      rank_level:      npcRankAdj,
      name:            _randNpcName(gender),
      gender,
      age,
      faction,
      ability,
      loyalty:         loyaltyBase,
      integrity,
      career_history:  careerHistory,
      is_retired:      false,
      retire_game_day: null,
      birth_province:  npcProvince,
      birth_city:      npcCity,
      university_name: `${uniName}（${degreeLabel}）`,
      graduation_year: gradYear,
      birth_year:      birthYear,
      band_group:      group,
    };
  };

  const rows = [
    ...partyPositions.map(pos => buildNpcRow(pos, 'party', !!pos.isPlayerRole)),
    ...(govPositions ?? []).map(pos => buildNpcRow(pos, 'gov', !!pos.isPlayerRole)),
    ...(ndaPositions ?? []).map(pos => buildNpcRow(pos, 'nda', !!pos.isPlayerRole)),
  ];

  await supabase.from('npc_band').insert(rows);

  // 同步初始化城市指标（如果还没有）
  const { data: existing } = await supabase.from('city_metrics').select('id').eq('save_id', saveId).maybeSingle();
  if (!existing) {
    await supabase.from('city_metrics').insert({
      save_id: saveId, gdp: 60, finance: 60, ecology: 60,
      stability: 60, education: 60, healthcare: 60,
      invest_bonus: 0, petition_reduction: 0, talent_pool: 0,
    });
  }
  // 同步初始化健康精力
  const { data: hExisting } = await supabase.from('player_health').select('id').eq('save_id', saveId).maybeSingle();
  if (!hExisting) {
    await supabase.from('player_health').insert({ save_id: saveId, health: 80, energy: 100 });
  }
}

/** 获取NPC领导班子成员列表 */
export async function getNpcBand(saveId: string): Promise<LeadershipBand[]> {
  const { data, error } = await supabase
    .from('npc_band')
    .select('*')
    .eq('save_id', saveId)
    .order('rank_level', { ascending: false });
  if (error || !data) return [];
  return data.map(r => ({
    id:            r.id as string,
    saveId:        r.save_id as string,
    positionKey:   r.position_key as string,
    positionLabel: r.position_label as string,
    rankLevel:     r.rank_level as number,
    name:          r.name as string,
    gender:        r.gender as string,
    age:           r.age as number,
    faction:       r.faction as import('@/types/game').FactionId,
    ability:       r.ability as number,
    loyalty:       r.loyalty as number,
    integrity:     r.integrity as number,
    careerHistory: (r.career_history as CareerEntry[]) ?? [],
    isRetired:     r.is_retired as boolean,
    retireGameDay: r.retire_game_day as number | null,
    birthProvince: (r.birth_province as string) ?? '',
    birthCity:     (r.birth_city as string) ?? '',
    universityName:(r.university_name as string) ?? '',
    graduationYear:(r.graduation_year as number) ?? 0,
    birthYear:     (r.birth_year as number) ?? 0,
    bandGroup:     ((r.band_group as string) ?? 'party') as 'party' | 'gov' | 'nda',
  }));
}

/** NPC年龄老化（每游戏年调用一次） */
export async function agingLeadershipBand(saveId: string, currentGameDay: number, rankLevel: number, playerCityName?: string, playerBirthProvince?: string, playerBirthCity?: string): Promise<string[]> {
  await ensureNpcNamePoolLoaded();
  const members = await getNpcBand(saveId);
  const retiredNames: string[] = [];
  for (const m of members) {
    if (m.isRetired || m.age === 0) continue; // 玩家占位跳过
    const newAge = m.age + 1;
    const retireAge = RETIREMENT_AGE_MAP[rankLevel] ?? 60;
    if (newAge >= retireAge) {
      // 触发退休，生成替换NPC
      await supabase.from('npc_band').update({ is_retired: true, retire_game_day: currentGameDay }).eq('id', m.id);
      retiredNames.push(m.name);
      // 生成继任者
      const [ageMin] = NPC_AGE_RANGE[Math.max(1, rankLevel - 1)] ?? [35, 45];
      const gender = Math.random() < 0.25 ? '女' : '男';
      const newAge2 = ageMin + Math.floor(Math.random() * 8);
      const factions: import('@/types/game').FactionId[] = ['reform', 'pragmatic', 'cyl', 'techno', 'local'];
      await supabase.from('npc_band').insert({
        save_id:        saveId,
        position_key:   m.positionKey,
        position_label: m.positionLabel,
        rank_level:     m.rankLevel,
        name:           _randNpcName(gender),
        gender,
        age:            newAge2,
        faction:        factions[Math.floor(Math.random() * factions.length)],
        ability:        50 + Math.floor(Math.random() * 40),
        loyalty:        40 + Math.floor(Math.random() * 31),
        integrity:      40 + Math.floor(Math.random() * 41),
        career_history: _genNpcCareerHistory(rankLevel, newAge2, playerCityName,
          (playerBirthProvince && playerBirthCity) ? { prov: playerBirthProvince, city: playerBirthCity } : undefined),
      });
    } else {
      await supabase.from('npc_band').update({ age: newAge }).eq('id', m.id);
    }
  }
  return retiredNames;
}

/** 记录玩家仕途历史（晋升时调用） */
export async function recordPlayerCareer(saveId: string, position: string, city: string, rankLevel: number, startGameDay: number, endGameDay: number | null, startYear: number, endYear: number | null): Promise<void> {
  await supabase.from('player_career_history').insert({
    save_id: saveId, position, city, rank_level: rankLevel,
    start_game_day: startGameDay, end_game_day: endGameDay,
    start_year: startYear, end_year: endYear,
  });
}

/** 获取玩家仕途历史 */
export async function getPlayerCareerHistory(saveId: string): Promise<{ position: string; city: string; rankLevel: number; startYear: number | null; endYear: number | null }[]> {
  const { data, error } = await supabase
    .from('player_career_history')
    .select('position, city, rank_level, start_year, end_year')
    .eq('save_id', saveId)
    .order('start_game_day');
  if (error || !data) return [];
  return data.map(r => ({
    position:  r.position as string,
    city:      r.city as string,
    rankLevel: r.rank_level as number,
    startYear: r.start_year as number | null,
    endYear:   r.end_year as number | null,
  }));
}

// =====================================================================
// ★ 健康/精力系统
// =====================================================================

export async function getPlayerHealth(saveId: string): Promise<PlayerHealth | null> {
  const { data, error } = await supabase.from('player_health').select('*').eq('save_id', saveId).maybeSingle();
  if (error || !data) return null;
  return {
    id:         data.id as string,
    saveId:     data.save_id as string,
    health:     data.health as number,
    energy:     data.energy as number,
    isOnLeave:  data.is_on_leave as boolean,
    leaveEndDay: data.leave_end_day as number | null,
    lastMonthlyCareDay: (data.last_monthly_care_day as number) ?? 0,
  };
}

export async function ensurePlayerHealth(saveId: string): Promise<PlayerHealth> {
  const existing = await getPlayerHealth(saveId);
  if (existing) return existing;
  await supabase.from('player_health').insert({ save_id: saveId, health: 80, energy: 100, last_monthly_care_day: 0 });
  return { id: '', saveId, health: 80, energy: 100, isOnLeave: false, leaveEndDay: null, lastMonthlyCareDay: 0 };
}

/** 消耗精力（高强度工作调用）。返回是否触发因病休假 */
export async function consumeEnergy(saveId: string, energyCost: number, healthCost: number, currentGameDay: number): Promise<{ forcedLeave: boolean }> {
  const ph = await ensurePlayerHealth(saveId);
  if (ph.isOnLeave) return { forcedLeave: true };

  let newEnergy = Math.max(0, ph.energy - energyCost);
  let newHealth = ph.health;
  // 精力耗尽时额外扣健康
  if (newEnergy === 0 && energyCost > 0) newHealth = Math.max(0, newHealth - healthCost);

  let forcedLeave = false;
  let isOnLeave: boolean = ph.isOnLeave;
  let leaveEndDay = ph.leaveEndDay;

  if (newHealth < 20 && !isOnLeave) {
    // 触发因病休假
    forcedLeave = true;
    isOnLeave = true;
    leaveEndDay = currentGameDay + 7;
    newHealth = 50; // 休假后回复
    newEnergy = 60;
  }

  await supabase.from('player_health').update({
    health: newHealth, energy: newEnergy,
    is_on_leave: isOnLeave, leave_end_day: leaveEndDay,
    updated_at: new Date().toISOString(),
  }).eq('save_id', saveId);

  return { forcedLeave };
}

/** 恢复健康/精力（休假/锻炼/疗养） */
export async function restoreHealth(saveId: string, type: 'rest' | 'exercise' | 'sanatorium', currentGameDay: number): Promise<boolean> {
  const ph = await ensurePlayerHealth(saveId);
  let newHealth = ph.health;
  let newEnergy = ph.energy;

  if (type === 'rest') {
    newHealth = Math.min(100, newHealth + 10);
    newEnergy = Math.min(100, newEnergy + 30);
  } else if (type === 'exercise') {
    newHealth = Math.min(100, newHealth + 5);
    newEnergy = Math.min(100, newEnergy + 10);
  } else if (type === 'sanatorium') {
    // 疗养：7游戏天，大幅恢复（仅厅级及以上可用）
    newHealth = Math.min(100, newHealth + 25);
    newEnergy = Math.min(100, newEnergy + 50);
  }

  // 检查休假是否结束
  let isOnLeave = ph.isOnLeave;
  if (isOnLeave && ph.leaveEndDay && currentGameDay >= ph.leaveEndDay) {
    isOnLeave = false;
  }

  const { error } = await supabase.from('player_health').update({
    health: newHealth, energy: newEnergy, is_on_leave: isOnLeave,
    updated_at: new Date().toISOString(),
  }).eq('save_id', saveId);
  return !error;
}

/** 每日自然恢复精力（每天基础+5，职级额外加成），游戏推进时调用 */
export async function dailyEnergyRegen(saveId: string, currentGameDay: number, rankLevel = 1, personalAssets: string[] = []): Promise<void> {
  const ph = await getPlayerHealth(saveId);
  if (!ph) return;

  // 基础恢复 + 职级加成
  const baseRegen = 5;
  const rankBonus = RANK_DAILY_ENERGY_BONUS[rankLevel] ?? 0;
  // 资产加成（精力/日）
  const assetBonus = personalAssets.reduce((acc, key) => acc + (ASSET_HEALTH_BONUS[key]?.energyBonusDaily ?? 0), 0);
  const totalRegen = baseRegen + rankBonus + Math.round(assetBonus);

  const newEnergy = Math.min(100, ph.energy + totalRegen);
  let isOnLeave = ph.isOnLeave;
  if (isOnLeave && ph.leaveEndDay && currentGameDay >= ph.leaveEndDay) {
    isOnLeave = false;
  }

  await supabase.from('player_health').update({
    energy: newEnergy, is_on_leave: isOnLeave,
    updated_at: new Date().toISOString(),
  }).eq('save_id', saveId);
}

/**
 * 月度医疗保健加成（每月结算一次）
 * 调用时机：月度结算 advanceMonth 中
 * 联动：职级医疗级别 + 已购资产加成 + 年龄衰减
 */
export async function monthlyHealthRegen(
  saveId: string,
  currentGameDay: number,
  rankLevel: number,
  personalAssets: string[],
  playerAge: number,
): Promise<{ healthAdded: number; reason: string }> {
  const ph = await getPlayerHealth(saveId);
  if (!ph) return { healthAdded: 0, reason: '健康数据不存在' };

  // 避免同月重复加成
  if (ph.lastMonthlyCareDay && currentGameDay - ph.lastMonthlyCareDay < 28) {
    return { healthAdded: 0, reason: '本月已结算' };
  }

  // 职级医疗基础加成
  const rankBase = RANK_MONTHLY_HEALTH_REGEN[rankLevel] ?? 1;
  // 资产健康加成
  const assetBonus = personalAssets.reduce((acc, key) => acc + (ASSET_HEALTH_BONUS[key]?.healthBonus ?? 0), 0);
  // 年龄衰减：每超过50岁减少1点/月（模拟随龄健康下滑）
  const agePenalty = Math.max(0, Math.floor((playerAge - 50) / 5));
  // 疲劳惩罚：若精力 < 30，健康额外衰减
  const fatiguePenalty = ph.energy < 30 ? 3 : ph.energy < 60 ? 1 : 0;

  const totalDelta = rankBase + assetBonus - agePenalty - fatiguePenalty;
  const newHealth = Math.max(0, Math.min(100, ph.health + totalDelta));

  await supabase.from('player_health').update({
    health: newHealth,
    last_monthly_care_day: currentGameDay,
    updated_at: new Date().toISOString(),
  }).eq('save_id', saveId);

  const parts: string[] = [];
  if (rankBase > 0) parts.push(`医疗保健+${rankBase}`);
  if (assetBonus > 0) parts.push(`资产加成+${assetBonus}`);
  if (agePenalty > 0) parts.push(`年龄衰减-${agePenalty}`);
  if (fatiguePenalty > 0) parts.push(`疲劳惩罚-${fatiguePenalty}`);
  return { healthAdded: totalDelta, reason: parts.join('，') };
}

// =====================================================================
// ★ 党校培训系统
// =====================================================================

/** 获取/确保本年度培训名额 */
export async function getPartySchoolQuota(saveId: string, gameYear: number, rankLevel: number): Promise<{ usedCount: number; quotaLimit: number }> {
  const quotaByRank = rankLevel <= 3 ? 2 : rankLevel <= 6 ? 3 : rankLevel <= 9 ? 4 : 5;
  const { data } = await supabase.from('party_school_quota')
    .select('used_count, quota_limit')
    .eq('save_id', saveId)
    .eq('game_year', gameYear)
    .maybeSingle();
  if (!data) {
    await supabase.from('party_school_quota').insert({
      save_id: saveId, game_year: gameYear, used_count: 0, quota_limit: quotaByRank,
    });
    return { usedCount: 0, quotaLimit: quotaByRank };
  }
  return { usedCount: data.used_count as number, quotaLimit: data.quota_limit as number };
}

/** 提交党校培训申请 */
export async function trainAtPartySchool(
  saveId: string,
  trainLevel: PartySchoolLevel,
  targetType: 'player' | 'subordinate',
  targetId: string | null,
  targetName: string,
  currentGameDay: number,
  gameYear: number,
  rankLevel: number,
  currentMerit: number,
): Promise<{ success: boolean; msg: string }> {
  const cfg = PARTY_SCHOOL_CONFIG[trainLevel];
  if (rankLevel < cfg.minRank) return { success: false, msg: `当前职级不满足${cfg.label}报名条件（最低${cfg.minRank}级）` };

  const quota = await getPartySchoolQuota(saveId, gameYear, rankLevel);
  if (quota.usedCount >= quota.quotaLimit) return { success: false, msg: `本年度培训名额已用完（${quota.quotaLimit}个），请明年申报` };
  if (currentMerit < cfg.costResource) return { success: false, msg: `政治资源不足（需${cfg.costResource}点，当前${currentMerit}）` };

  const endDay = currentGameDay + cfg.durationDays;
  const { error } = await supabase.from('party_school_records').insert({
    save_id: saveId, target_type: targetType, target_id: targetId,
    target_name: targetName, train_level: trainLevel,
    start_game_day: currentGameDay, end_game_day: endDay, is_complete: false,
    ability_bonus: cfg.abilityBonus, loyalty_bonus: cfg.loyaltyBonus,
    promote_bonus: cfg.promoteBonus,
    network_bonus: cfg.networkBonus,
    cert_name: cfg.certName,
  });
  if (error) return { success: false, msg: '培训申报失败，请重试' };

  // 扣名额
  await supabase.from('party_school_quota')
    .update({ used_count: quota.usedCount + 1 })
    .eq('save_id', saveId)
    .eq('game_year', gameYear);

  return { success: true, msg: `已成功报名${cfg.schoolName}${cfg.label}，培训期${cfg.durationDays}天` };
}

/** 检查并结算已完成的培训 */
export async function checkPartySchoolCompletion(saveId: string, currentGameDay: number): Promise<PartySchoolRecord[]> {
  const { data, error } = await supabase.from('party_school_records')
    .select('*')
    .eq('save_id', saveId)
    .eq('is_complete', false)
    .lte('end_game_day', currentGameDay);
  if (error || !data || data.length === 0) return [];

  const completed: PartySchoolRecord[] = [];
  for (const r of data) {
    await supabase.from('party_school_records').update({ is_complete: true }).eq('id', r.id as string);

    // 应用效果：调用 apply_training_bonus RPC 为下属增加能力/忠诚
    if (r.target_type === 'subordinate' && r.target_id) {
      await supabase.rpc('apply_training_bonus', {
        p_sub_id:  r.target_id as string,
        p_ability: r.ability_bonus as number,
        p_loyalty: r.loyalty_bonus as number,
      });
    }

    completed.push({
      id:           r.id as string,
      saveId:       r.save_id as string,
      targetType:   r.target_type as 'player' | 'subordinate',
      targetId:     r.target_id as string | null,
      targetName:   r.target_name as string,
      trainLevel:   r.train_level as PartySchoolLevel,
      startGameDay: r.start_game_day as number,
      endGameDay:   r.end_game_day as number,
      isComplete:   true,
      abilityBonus: r.ability_bonus as number,
      loyaltyBonus: r.loyalty_bonus as number,
      promoteBonus: r.promote_bonus as number,
      networkBonus: (r.network_bonus as number) ?? 0,
      certName:     (r.cert_name as string) ?? '',
    });
  }
  return completed;
}

/** 获取培训记录 */
export async function getPartySchoolRecords(saveId: string): Promise<PartySchoolRecord[]> {
  const { data, error } = await supabase.from('party_school_records')
    .select('*')
    .eq('save_id', saveId)
    .order('created_at', { ascending: false })
    .limit(20);
  if (error || !data) return [];
  return data.map(r => ({
    id:           r.id as string,
    saveId:       r.save_id as string,
    targetType:   r.target_type as 'player' | 'subordinate',
    targetId:     r.target_id as string | null,
    targetName:   r.target_name as string,
    trainLevel:   r.train_level as PartySchoolLevel,
    startGameDay: r.start_game_day as number,
    endGameDay:   r.end_game_day as number,
    isComplete:   r.is_complete as boolean,
    abilityBonus: r.ability_bonus as number,
    loyaltyBonus: r.loyalty_bonus as number,
    promoteBonus: r.promote_bonus as number,
    networkBonus: (r.network_bonus as number) ?? 0,
    certName:     (r.cert_name as string) ?? '',
  }));
}

// =====================================================================
// ★ 国家重大政策运动
// =====================================================================

/** 随机触发政策运动（每年30%概率）：每年初调用 */
export async function tryTriggerNationalPolicy(saveId: string, currentGameDay: number): Promise<NationalPolicy | null> {
  // 检查是否已有进行中的运动
  const { data: active } = await supabase.from('national_policies')
    .select('id')
    .eq('save_id', saveId)
    .eq('is_active', true)
    .maybeSingle();
  if (active) return null;

  if (Math.random() > 0.30) return null; // 70%不触发

  const def = NATIONAL_POLICY_POOL[Math.floor(Math.random() * NATIONAL_POLICY_POOL.length)];
  const durationDays = def.durationDays + Math.floor(Math.random() * 30) - 15;

  const { data, error } = await supabase.from('national_policies').insert({
    save_id: saveId, policy_key: def.key, policy_name: def.name,
    start_game_day: currentGameDay, duration_days: durationDays,
    is_active: true, responded: false,
  }).select().maybeSingle();

  if (error || !data) return null;
  return {
    id:            data.id as string,
    saveId:        data.save_id as string,
    policyKey:     data.policy_key as string,
    policyName:    data.policy_name as string,
    startGameDay:  data.start_game_day as number,
    durationDays:  data.duration_days as number,
    isActive:      true,
    responded:     false,
  };
}

/** 获取当前进行中的政策运动 */
export async function getActiveNationalPolicy(saveId: string): Promise<NationalPolicy | null> {
  const { data, error } = await supabase.from('national_policies')
    .select('*')
    .eq('save_id', saveId)
    .eq('is_active', true)
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle();
  if (error || !data) return null;
  return {
    id: data.id as string, saveId: data.save_id as string,
    policyKey: data.policy_key as string, policyName: data.policy_name as string,
    startGameDay: data.start_game_day as number, durationDays: data.duration_days as number,
    isActive: data.is_active as boolean, responded: data.responded as boolean,
  };
}

/** 玩家响应政策运动，返回政绩加成（§4.1 接入派系倍率） */
export async function respondToPolicy(saveId: string, policyId: string, currentGameDay: number): Promise<{ meritBonus: number; promoteBonus: number }> {
  const { data: p } = await supabase.from('national_policies').select('policy_key, responded').eq('id', policyId).maybeSingle();
  if (!p || (p.responded as boolean)) return { meritBonus: 0, promoteBonus: 0 };

  const def = NATIONAL_POLICY_POOL.find(d => d.key === (p.policy_key as string));
  if (!def) return { meritBonus: 0, promoteBonus: 0 };

  // §4.1 派系倍率：主派 == favoredFaction → meritBonus ×1.2 且 promoteBonus +2；主派 == disfavoredFaction → ×0.85
  const { data: saveRow } = await supabase.from('saves').select('primary_faction').eq('id', saveId).maybeSingle();
  const primaryFaction = (saveRow?.primary_faction as import('@/types/game').FactionId) ?? null;
  let meritBonus = def.meritBonus;
  let promoteBonus = def.promoteBonus;
  if (primaryFaction) {
    if (primaryFaction === def.favoredFaction) {
      meritBonus = Math.round(meritBonus * 1.2);
      promoteBonus += 2;
    } else if (primaryFaction === def.disfavoredFaction) {
      meritBonus = Math.round(meritBonus * 0.85);
    }
  }

  await supabase.from('national_policies').update({ responded: true }).eq('id', policyId);
  return { meritBonus, promoteBonus };
}

/** 检查并结束已到期的政策运动 */
export async function checkPolicyExpiry(saveId: string, currentGameDay: number): Promise<void> {
  const { data } = await supabase.from('national_policies')
    .select('id, start_game_day, duration_days, responded')
    .eq('save_id', saveId)
    .eq('is_active', true);
  if (!data) return;
  for (const p of data) {
    const endDay = (p.start_game_day as number) + (p.duration_days as number);
    if (currentGameDay >= endDay) {
      await supabase.from('national_policies').update({ is_active: false }).eq('id', p.id as string);
    }
  }
}

// =====================================================================
// ★ 城市指标联动
// =====================================================================

export async function getCityMetrics(saveId: string): Promise<CityMetrics | null> {
  const { data, error } = await supabase.from('city_metrics').select('*').eq('save_id', saveId).maybeSingle();
  if (error || !data) return null;
  return {
    id:                 data.id as string,
    saveId:             data.save_id as string,
    gdp:                data.gdp as number,
    finance:            data.finance as number,
    ecology:            data.ecology as number,
    stability:          data.stability as number,
    education:          data.education as number,
    healthcare:         data.healthcare as number,
    investBonus:        data.invest_bonus as number,
    petitionReduction:  data.petition_reduction as number,
    talentPool:         data.talent_pool as number,
  };
}

/** 更新某项城市指标，并自动重算联动值 */
export async function updateCityMetric(saveId: string, field: 'gdp' | 'finance' | 'ecology' | 'stability' | 'education' | 'healthcare', delta: number): Promise<CityMetrics | null> {
  const cur = await getCityMetrics(saveId);
  if (!cur) {
    await supabase.from('city_metrics').insert({ save_id: saveId, gdp: 60, finance: 60, ecology: 60, stability: 60, education: 60, healthcare: 60 });
    return null;
  }

  const updates: Record<string, number | string> = {};
  updates[field] = Math.max(0, Math.min(100, (cur[field] as number) + delta));

  // GDP→财政联动
  if (field === 'gdp') updates['finance'] = Math.min(100, cur.finance + Math.floor(delta * 0.5));
  // 环境→招商加成
  const newEcology = field === 'ecology' ? (updates['ecology'] as number) : cur.ecology;
  updates['invest_bonus'] = Math.floor(newEcology / 10) * 5;
  // 稳定→信访减少
  const newStability = field === 'stability' ? (updates['stability'] as number) : cur.stability;
  updates['petition_reduction'] = Math.floor(newStability / 10) * 10;
  // 教育→人才积累（缓慢增长）
  const newEdu = field === 'education' ? (updates['education'] as number) : cur.education;
  updates['talent_pool'] = Math.min(200, cur.talentPool + (newEdu > 70 ? 2 : 0));

  updates['updated_at'] = new Date().toISOString();
  const { data, error } = await supabase.from('city_metrics').update(updates).eq('save_id', saveId).select().maybeSingle();
  if (error || !data) return null;
  return {
    id: data.id as string, saveId: data.save_id as string,
    gdp: data.gdp as number, finance: data.finance as number,
    ecology: data.ecology as number, stability: data.stability as number,
    education: data.education as number, healthcare: data.healthcare as number,
    investBonus: data.invest_bonus as number,
    petitionReduction: data.petition_reduction as number,
    talentPool: data.talent_pool as number,
  };
}

// ══════════════════════════════════════════════════════════════════════════════
// 下属管理新机制 API
// ══════════════════════════════════════════════════════════════════════════════

/** 启动干部考察（组织部审查流程），设置 nomination_status = reviewing */
export async function startNomination(
  subId: string,
  deptKey: DeptKey,
  position: 'head' | 'deputy',
  currentDay: number,
): Promise<boolean> {
  const { error } = await supabase
    .from('subordinates')
    .update({
      nomination_status: 'reviewing',
      nomination_dept: deptKey,
      nomination_position: position,
      nomination_start_day: currentDay,
    })
    .eq('id', subId);
  return !error;
}

/** 取消提名（撤回考察程序） */
export async function cancelNomination(subId: string): Promise<boolean> {
  const { error } = await supabase
    .from('subordinates')
    .update({
      nomination_status: 'idle',
      nomination_dept: null,
      nomination_position: null,
      nomination_start_day: null,
    })
    .eq('id', subId);
  return !error;
}

/**
 * 推进所有处于 reviewing 状态的提名：
 * - 正职考察期 5 天，副职 2 天
 * - 通过条件：ability >= 45 && integrity >= 40 && loyalty >= 30（随机扰动±10）
 * - 通过 → approved（调用 appointSubordinate），否则 rejected
 * 返回 { approved, rejected } 两组干部名称列表
 */
export async function processNominations(
  saveId: string,
  userId: string,
  currentDay: number,
  rankLevel: number,
): Promise<{ approved: string[]; rejected: string[] }> {
  const { data } = await supabase
    .from('subordinates')
    .select('*')
    .eq('save_id', saveId)
    .eq('nomination_status', 'reviewing');
  if (!data) return { approved: [], rejected: [] };

  const approved: string[] = [];
  const rejected: string[] = [];

  for (const row of data as Record<string, unknown>[]) {
    const sub = rowToSubordinate(row);
    const waitDays = currentDay - (sub.nominationStartDay ?? currentDay);
    const reqDays = sub.nominationPosition === 'head' ? 5 : 2;
    if (waitDays < reqDays) continue; // 未到期

    // 随机扰动（反映上级态度与派系博弈）
    const noise = Math.floor(Math.random() * 20) - 10;
    const pass = (sub.ability + noise) >= 45 && sub.integrity >= 38 && sub.loyalty >= 28;

    if (pass && sub.nominationDept && sub.nominationPosition) {
      // 正式任命
      await appointSubordinate(
        sub.id,
        `${sub.nominationDept}_${sub.nominationPosition}`,
        sub.nominationPosition === 'head'
          ? getDeptHeadTitle(sub.nominationDept, rankLevel)
          : getDeptDeputyTitle(sub.nominationDept, rankLevel),
        sub.nominationDept,
        sub.nominationPosition,
        rankLevel,
      );
      await supabase.from('subordinates').update({
        nomination_status: 'approved',
        nomination_dept: null,
        nomination_position: null,
        nomination_start_day: null,
        satisfaction: Math.min(100, sub.satisfaction + 10),
      }).eq('id', sub.id);
      // 自动补充科员
      await fillDeptStaff(saveId, userId, sub.nominationDept);
      approved.push(sub.name);
    } else {
      await supabase.from('subordinates').update({
        nomination_status: 'rejected',
        nomination_dept: null,
        nomination_position: null,
        nomination_start_day: null,
        satisfaction: Math.max(0, sub.satisfaction - 15),
      }).eq('id', sub.id);
      rejected.push(sub.name);
    }
  }
  // 将已通知的 rejected 重置为 idle（告知玩家后）
  return { approved, rejected };
}

/** 重置干部的 nominated rejected 状态为 idle */
export async function resetNominationRejected(subId: string): Promise<void> {
  await supabase.from('subordinates').update({ nomination_status: 'idle' }).eq('id', subId);
}

/** 设置/取消后备干部标记 */
export async function setReserveStatus(subId: string, isReserve: boolean): Promise<boolean> {
  const { error } = await supabase
    .from('subordinates')
    .update({ is_reserve: isReserve })
    .eq('id', subId);
  return !error;
}

/** 获取所有待处理事件的下属 */
export async function getSubsWithEvents(saveId: string): Promise<Subordinate[]> {
  const { data } = await supabase
    .from('subordinates')
    .select('*')
    .eq('save_id', saveId)
    .eq('event_handled', false)
    .order('event_day', { ascending: true });
  if (!data) return [];
  return (data as Record<string, unknown>[]).map(rowToSubordinate);
}

/**
 * 处理干部随机事件
 * @param action 'approve'|'reject'|'punish'|'protect'
 */
export async function handleSubEvent(
  subId: string,
  eventType: string,
  action: 'approve' | 'reject' | 'punish' | 'protect',
): Promise<{ abilityDelta: number; loyaltyDelta: number; integrityDelta: number; satisfactionDelta: number; meritDelta: number; feedback: string }> {
  const effectMap: Record<string, Record<string, { a: number; l: number; i: number; s: number; m: number; msg: string }>> = {
    transfer_request: {
      approve: { a: 0, l: 5, i: 0, s: 15, m: 0,  msg: '同意调动申请，干部满意度提升，调出后编制空缺' },
      reject:  { a: 0, l: -10, i: 0, s: -20, m: 0, msg: '驳回调动申请，干部满意度下降，有离心风险' },
    },
    corruption_risk: {
      punish:  { a: 0, l: -5, i: 10, s: -10, m: 5,  msg: '果断处置，廉洁风气好转，获得政绩加成' },
      protect: { a: 0, l: 10, i: -15, s: 5,  m: -8, msg: '包庇袒护，廉洁指数下降，存在政治风险' },
    },
    achievement: {
      approve: { a: 2, l: 5, i: 0, s: 10, m: 12, msg: '表彰立功干部，政绩显著提升，树立标杆效应' },
      reject:  { a: 0, l: -5, i: 0, s: -8, m: 0,  msg: '未予表彰，干部积极性受损' },
    },
    complaint: {
      punish:  { a: -2, l: -5, i: 0, s: -10, m: 2,  msg: '责令整改，平息群众矛盾，获得信访治理加成' },
      protect: { a: 0,  l: 5,  i: -5, s: 0,  m: -5, msg: '压制投诉，短期维稳，长期埋下隐患' },
    },
    borrow: {
      approve: { a: 3, l: 3, i: 0, s: 5, m: 8, msg: '同意借调，干部开阔视野，获得上级好感加成' },
      reject:  { a: 0, l: 0, i: 0, s: 0, m: -3, msg: '拒绝借调，上级部门关系略有影响' },
    },
  };

  const eff = effectMap[eventType]?.[action] ?? { a: 0, l: 0, i: 0, s: 0, m: 0, msg: '已处理' };

  const { data } = await supabase.from('subordinates')
    .select('ability, loyalty, integrity, satisfaction')
    .eq('id', subId).single();
  if (data) {
    const r = data as Record<string, unknown>;
    await supabase.from('subordinates').update({
      ability:      Math.max(0, Math.min(100, (r.ability as number) + eff.a)),
      loyalty:      Math.max(0, Math.min(100, (r.loyalty as number) + eff.l)),
      integrity:    Math.max(0, Math.min(100, (r.integrity as number) + eff.i)),
      satisfaction: Math.max(0, Math.min(100, (r.satisfaction as number) + eff.s)),
      event_handled: true,
      event_type:    null,
      event_day:     null,
      // 同意调动则立即转移
      ...(eventType === 'transfer_request' && action === 'approve'
        ? { transferred_city: '上级机关', is_appointed: false, appointed_role: null, appointed_dept: null }
        : {}),
      // 同意借调则标记
      ...(eventType === 'borrow' && action === 'approve'
        ? { borrowed_to: '上级机关' }
        : {}),
    }).eq('id', subId);
  }

  return { abilityDelta: eff.a, loyaltyDelta: eff.l, integrityDelta: eff.i, satisfactionDelta: eff.s, meritDelta: eff.m, feedback: eff.msg };
}

/**
 * 五维考核（德能勤绩廉）：
 * 产生随机扰动后记录快照，更新各指标，返回本次五维分数
 */
export async function conductFiveDimReview(
  subId: string,
  currentDay: number,
  grade: '优秀' | '称职' | '基本称职' | '不称职',
): Promise<{ de: number; neng: number; qin: number; ji: number; lian: number; total: number; meritGain: number }> {
  const gradeBase: Record<string, { base: number; merit: number }> = {
    '优秀':   { base: 85, merit: 15 },
    '称职':   { base: 70, merit: 8  },
    '基本称职': { base: 55, merit: 3 },
    '不称职': { base: 40, merit: 0  },
  };
  const g = gradeBase[grade] ?? gradeBase['称职'];
  const r = () => Math.floor(Math.random() * 15) - 7;
  const de   = Math.min(100, Math.max(0, g.base + r()));
  const neng = Math.min(100, Math.max(0, g.base + r()));
  const qin  = Math.min(100, Math.max(0, g.base + r()));
  const ji   = Math.min(100, Math.max(0, g.base + r()));
  const lian = Math.min(100, Math.max(0, g.base + r()));
  const total = Math.round((de + neng + qin + ji + lian) / 5);

  const scores = JSON.stringify({ de, neng, qin, ji, lian, grade, day: currentDay });
  // 指标映射：能→ability，廉→integrity，经→experience，忠诚轻微浮动
  const loyDelta = grade === '优秀' ? 4 : grade === '称职' ? 1 : grade === '基本称职' ? -2 : -6;
  const abiDelta = grade === '优秀' ? 3 : grade === '称职' ? 1 : grade === '基本称职' ? 0 : -3;
  const intDelta = grade === '优秀' ? 2 : grade === '称职' ? 0 : grade === '基本称职' ? -1 : -4;
  const expDelta = grade === '优秀' ? 8 : grade === '称职' ? 5 : grade === '基本称职' ? 2 : 0;

  const { data } = await supabase.from('subordinates').select('ability, loyalty, integrity, experience, satisfaction').eq('id', subId).single();
  if (data) {
    const row = data as Record<string, unknown>;
    const satDelta = grade === '优秀' ? 8 : grade === '称职' ? 2 : grade === '基本称职' ? -3 : -10;
    await supabase.from('subordinates').update({
      ability:           Math.max(0, Math.min(100, (row.ability as number) + abiDelta)),
      loyalty:           Math.max(0, Math.min(100, (row.loyalty as number) + loyDelta)),
      integrity:         Math.max(0, Math.min(100, (row.integrity as number) + intDelta)),
      experience:        Math.max(0, Math.min(100, (row.experience as number) + expDelta)),
      satisfaction:      Math.max(0, Math.min(100, (row.satisfaction as number) + satDelta)),
      last_assessed_day: currentDay,
      last_review_scores: scores,
    }).eq('id', subId);
  }

  return { de, neng, qin, ji, lian, total, meritGain: g.merit };
}

/**
 * 触发干部随机事件（游戏推进时调用，按概率生成）
 * 每个干部每365天最多触发一次事件
 */
export async function triggerSubEvents(saveId: string, currentDay: number): Promise<number> {
  const { data } = await supabase
    .from('subordinates')
    .select('id, ability, loyalty, integrity, sub_level, event_handled, event_day, last_assessed_day, is_appointed, borrowed_to, transferred_city')
    .eq('save_id', saveId)
    .is('transferred_city', null)
    .eq('event_handled', true);
  if (!data) return 0;

  let triggered = 0;
  const eventPool: import('@/types/game').SubEventType[] = ['transfer_request', 'corruption_risk', 'achievement', 'complaint', 'borrow'];

  for (const row of data as Record<string, unknown>[]) {
    const daysSinceEvent = currentDay - ((row.event_day as number) ?? 0);
    if (daysSinceEvent < 365) continue;
    if (Math.random() > 0.08) continue; // 8% 概率触发

    const ability    = (row.ability as number) ?? 50;
    const integrity  = (row.integrity as number) ?? 50;
    const loyalty    = (row.loyalty as number) ?? 50;
    const isAppointed = row.is_appointed as boolean;

    // 权重：廉洁低→更容易腐败风险；能力高→更易被借调；不满→调动请求
    let weights = [10, integrity < 50 ? 30 : 5, ability > 70 ? 25 : 5, 20, ability > 60 ? 20 : 5];
    if (!isAppointed) weights[0] += 20; // 没有职务更想走
    if (loyalty < 40)  weights[0] += 15;
    const total = weights.reduce((a, b) => a + b, 0);
    let rand = Math.random() * total;
    let idx = 0;
    for (let i = 0; i < weights.length; i++) {
      rand -= weights[i];
      if (rand <= 0) { idx = i; break; }
    }

    await supabase.from('subordinates').update({
      event_type:    eventPool[idx],
      event_day:     currentDay,
      event_handled: false,
    }).eq('id', row.id as string);
    triggered++;
  }
  return triggered;
}

/** 玩家自助改名（含违禁词警告/封号，RPC：player_rename_save） */
export async function playerRenameSave(
  saveId: string,
  newName: string,
): Promise<{ ok: boolean; code: string; message: string }> {
  const { data, error } = await supabase.rpc('player_rename_save', {
    p_save_id: saveId,
    p_new_name: newName,
  });
  if (error) return { ok: false, code: 'ERROR', message: error.message };
  const row = Array.isArray(data) ? data[0] : data;
  return {
    ok: Boolean(row?.ok),
    code: String(row?.code ?? 'ERROR'),
    message: String(row?.message ?? '操作失败'),
  };
}

/** 召回借调干部 */
export async function recallBorrowedSub(subId: string): Promise<boolean> {
  const { error } = await supabase.from('subordinates')
    .update({ borrowed_to: null }).eq('id', subId);
  return !error;
}

// ============ 晋升系统 v2：岗位与候选人 ============
import type { NpcPost, NpcCandidate } from '@/types/game';

/** 获取某存档某 tier 的全部岗位 */
export async function getNpcPosts(saveId: string, tier?: number): Promise<NpcPost[]> {
  let query = supabase.from('npc_posts').select('*').eq('save_id', saveId).order('post_key');
  if (tier !== undefined) query = query.eq('tier', tier);
  const { data, error } = await query;
  if (error || !data) return [];
  return data as NpcPost[];
}

/** 获取某 tier 的空缺/公示中岗位 */
export async function getVacantPosts(saveId: string, tier: number): Promise<NpcPost[]> {
  const { data, error } = await supabase.from('npc_posts')
    .select('*')
    .eq('save_id', saveId)
    .eq('tier', tier)
    .in('status', ['vacant', 'publicizing'])
    .order('post_key');
  if (error || !data) return [];
  return data as NpcPost[];
}

/** 初始化某存档某 tier 的岗位编制（若不存在）*/
export async function ensureNpcPosts(saveId: string, tier: number, composition: string[], gameDays: number): Promise<NpcPost[]> {
  const existing = await getNpcPosts(saveId, tier);
  if (existing.length > 0) return existing;
  const rows = composition.map((postName, idx) => ({
    post_key: `${saveId}_t${tier}_${idx}`,
    save_id: saveId,
    tier,
    post_name: postName,
    occupant_name: null,
    occupant_age: null,
    tenure_end_day: null,
    integrity: null,
    status: 'vacant',
    vacancy_start_day: gameDays,
  }));
  const { data, error } = await supabase.from('npc_posts').insert(rows).select();
  if (error || !data) return [];
  return data as NpcPost[];
}

/** 更新岗位状态 */
export async function updateNpcPost(postKey: string, patch: Partial<NpcPost>): Promise<boolean> {
  const { error } = await supabase.from('npc_posts').update(patch).eq('post_key', postKey);
  return !error;
}

/** 获取某 tier 的候选人池 */
export async function getNpcCandidates(saveId: string, tier?: number): Promise<NpcCandidate[]> {
  let query = supabase.from('npc_candidates').select('*').eq('save_id', saveId).order('candidate_key');
  if (tier !== undefined) query = query.eq('tier', tier);
  const { data, error } = await query;
  if (error || !data) return [];
  return data as NpcCandidate[];
}

/** 确保某 tier 候选人池有 N 名候选人 */
export async function ensureNpcCandidates(saveId: string, tier: number, count: number): Promise<NpcCandidate[]> {
  const existing = await getNpcCandidates(saveId, tier);
  if (existing.length >= count) return existing;
  const need = count - existing.length;
  const surnames = ['李', '王', '张', '刘', '陈', '杨', '赵', '黄', '周', '吴', '徐', '孙', '胡', '朱', '高', '林', '何', '郭', '马', '罗'];
  const rows = Array.from({ length: need }, (_, i) => {
    const idx = existing.length + i;
    const surname = surnames[(idx + tier) % surnames.length];
    return {
      candidate_key: `${saveId}_c${tier}_${idx}`,
      save_id: saveId,
      tier,
      name: `${surname}同志`,
      merit_score: 45 + Math.floor(Math.random() * 25),
      popularity_score: 45 + Math.floor(Math.random() * 25),
      assess_score: 50 + Math.floor(Math.random() * 25),
      favor_score: 45 + Math.floor(Math.random() * 25),
      age: 40 + Math.floor(Math.random() * 12),
      tenure_years: 3 + Math.floor(Math.random() * 4),
      integrity: 60 + Math.floor(Math.random() * 35),
      in_competition: false,
      status: 'standby',
    };
  });
  const { data, error } = await supabase.from('npc_candidates').insert(rows).select();
  if (error || !data) return existing;
  return [...existing, ...(data as NpcCandidate[])];
}

/** 更新候选人状态 */
export async function updateNpcCandidate(key: string, patch: Partial<NpcCandidate>): Promise<boolean> {
  const { error } = await supabase.from('npc_candidates').update(patch).eq('candidate_key', key);
  return !error;
}

/** 获取当前登录账号的邮箱与激活该账号的测试码 */
export async function getAccountAndActivationCode(): Promise<{ email: string | null; activationCode: string | null }> {
  const { data: userData } = await supabase.auth.getUser();
  const email = userData.user?.email ?? null;
  const userId = userData.user?.id;
  let activationCode: string | null = null;
  if (userId) {
    const { data: codeRow } = await supabase
      .from('test_codes')
      .select('code')
      .eq('used_by_user_id', userId)
      .order('used_at', { ascending: false })
      .limit(1)
      .maybeSingle();
    activationCode = (codeRow as { code: string } | null)?.code ?? null;
  }
  return { email, activationCode };
}
```

<a id="srcdbsupabasets"></a>
## `src/db/supabase.ts`

```typescript
// Re-export from canonical client\nexport { supabase } from '@/client/supabase';
```
