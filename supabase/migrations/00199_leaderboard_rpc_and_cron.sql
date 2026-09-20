-- ============ 原子累加当日增量（仅上榜存档生效）============
create or replace function public.record_daily_gain(
  p_save_id uuid,
  p_metric text,
  p_delta integer
) returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid uuid;
  v_today date := (now() at time zone 'Asia/Shanghai')::date;
  v_new integer;
begin
  if p_delta = 0 then return 0; end if;

  -- 校验该存档是否为当前账号的上榜存档
  select s.user_id into v_uid
  from player_saves s
  join player_profiles p on p.leaderboard_save_id = s.id
  where s.id = p_save_id;

  if v_uid is null then
    return 0; -- 非上榜存档，不计入
  end if;

  insert into daily_scores (save_id, user_id, metric, daily_delta, score_date, updated_at)
  values (p_save_id, v_uid, p_metric, p_delta, v_today, now())
  on conflict (save_id, metric, score_date)
  do update set daily_delta = daily_scores.daily_delta + p_delta,
               updated_at = now()
  returning daily_delta into v_new;

  return v_new;
end;
$$;

grant execute on function public.record_daily_gain(uuid, text, integer) to authenticated;

-- ============ 每日12:00（UTC+8 → 04:00 UTC）清零日榜并结算日榜奖励 ============
select cron.schedule(
  'daily_leaderboard_reset',
  '0 4 * * *', -- 04:00 UTC = 12:00 Asia/Shanghai
  $$
  select net.http_post(
    url := (select decrypted_secret from vault.decrypted_secrets where name = 'project_url') || '/functions/v1/daily-leaderboard-reset',
    headers := jsonb_build_object(
      'Content-type', 'application/json',
      'apikey', (select decrypted_secret from vault.decrypted_secrets where name = 'publishable_key')
    ),
    body := concat('{"time": "', now(), '"}')::jsonb
  ) as request_id;
  $$
);