-- 统计各上榜存档的门生数（下属 + 门客）
create or replace function public.count_students_by_save(save_ids uuid[])
returns table(save_id uuid, cnt bigint)
language sql
security definer
set search_path = public
as $$
  select s.save_id, count(*) as cnt
  from (
    select save_id from subordinates where save_id = any($1)
    union all
    select save_id from retainers where save_id = any($1)
  ) s
  group by s.save_id;
$$;

grant execute on function public.count_students_by_save(uuid[]) to authenticated;