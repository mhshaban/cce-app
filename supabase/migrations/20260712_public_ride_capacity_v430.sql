-- CCE StableOS v4.3.0 — public ride capacity without exposing horse identities
begin;

create or replace function public.cce_public_ride_capacity(
  p_date date default null,
  p_start_time time default null,
  p_duration_minutes integer default 30
)
returns table(total_horses bigint,reserved_horses bigint,available_horses bigint)
language sql
stable
security definer
set search_path=public
as $$
  with eligible as (
    select h.id
    from public.horses h
    left join public.horse_health_profiles hp on hp.horse_id=h.id
    where lower(trim(coalesce(h.owner,'')))='cc'
      and lower(trim(coalesce(h.status,'')))='available'
      and h.horse_name is not null
      and coalesce(hp.health_status,'Healthy') in ('Healthy','Training')
  ), reserved as (
    select coalesce(sum(greatest(coalesce(i.qty,1),1)),0)::bigint as count
    from public.income i
    where p_date is not null and p_start_time is not null
      and i.date::date=p_date
      and coalesce(i.notes,'') ilike '%BOOKING REQUEST%'
      and coalesce(lower(i.status),'pending') not in ('cancelled','canceled','rejected')
      and coalesce(i.activity,'') not ilike '%lesson%'
      and coalesce(i.start_time::time,'00:00'::time) < (p_start_time + make_interval(mins=>greatest(coalesce(p_duration_minutes,30),1)))::time
      and coalesce(i.end_time::time,(i.start_time::time + interval '30 minutes')::time) > p_start_time
  )
  select count(e.id)::bigint,
         least((select count from reserved),count(e.id)::bigint),
         greatest(count(e.id)::bigint-(select count from reserved),0::bigint)
  from eligible e;
$$;

revoke all on function public.cce_public_ride_capacity(date,time,integer) from public;
grant execute on function public.cce_public_ride_capacity(date,time,integer) to anon,authenticated;

commit;
