-- ============ 账号级玩家档案表（排行榜上榜存档归属）============
create table public.player_profiles (
  user_id uuid primary key references auth.users(id) on delete cascade,
  leaderboard_save_id uuid references public.player_saves(id) on delete set null,
  leaderboard_save_changed_at timestamptz not null default now(),
  region_code text not null default '',
  created_at timestamptz not null default now()
);

alter table public.player_profiles enable row level security;

-- player_profiles RLS：本人可读写自己的档案，所有人可读（排行榜需要展示对手大区/派系）
create policy "profiles_select_own" on public.player_profiles
  for select to authenticated using (user_id = auth.uid());
create policy "profiles_select_anon" on public.player_profiles
  for select to anon using (true);
create policy "profiles_insert_own" on public.player_profiles
  for insert to authenticated with check (user_id = auth.uid());
create policy "profiles_update_own" on public.player_profiles
  for update to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());

-- ============ 日榜当日增量表（每日12:00由cron清零）============
create table public.daily_scores (
  id uuid primary key default gen_random_uuid(),
  save_id uuid not null references public.player_saves(id) on delete cascade,
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  metric text not null,            -- merit | contribution | rank | power
  daily_delta integer not null default 0,
  score_date date not null default (now() at time zone 'Asia/Shanghai')::date,
  updated_at timestamptz not null default now(),
  unique (save_id, metric, score_date)
);

create index idx_daily_scores_date_metric on public.daily_scores (score_date, metric, daily_delta desc);
create index idx_daily_scores_save on public.daily_scores (save_id, score_date);

alter table public.daily_scores enable row level security;

-- daily_scores RLS：本人可增改自己当日记录，所有人可读（排行榜聚合需要）
create policy "daily_select_own" on public.daily_scores
  for select to authenticated using (user_id = auth.uid());
create policy "daily_select_anon" on public.daily_scores
  for select to anon using (true);
create policy "daily_insert_own" on public.daily_scores
  for insert to authenticated with check (user_id = auth.uid());
create policy "daily_update_own" on public.daily_scores
  for update to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());

-- ============ 最高榜里程碑奖励记录表（一次性发放，防重复）============
create table public.milestone_rewards (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  milestone text not null,         -- top10 | top3 | top1
  claimed_at timestamptz not null default now(),
  unique (user_id, milestone)
);

alter table public.milestone_rewards enable row level security;

create policy "milestone_select_own" on public.milestone_rewards
  for select to authenticated using (user_id = auth.uid());
create policy "milestone_select_anon" on public.milestone_rewards
  for select to anon using (true);
create policy "milestone_insert_own" on public.milestone_rewards
  for insert to authenticated with check (user_id = auth.uid());

-- ============ 启用 pg_cron 与 pg_net（定时任务所需）============
create extension if not exists pg_cron;
create extension if not exists pg_net;