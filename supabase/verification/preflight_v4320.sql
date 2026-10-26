-- CCE StableOS v4.32.0 — Linked horse health preflight
-- Run before 20261026_linked_horse_health_v4320.sql. Every *_ready column
-- must be true. The counts show how much the one-time reconciliation will
-- touch (card values without a matching record, open treatments).

select
  to_regclass('public.horse_health_events') is not null as events_ready,
  to_regclass('public.horse_health_profiles') is not null as profiles_ready,
  to_regprocedure('public.cce_recompute_horse_health_summary(bigint,text)') is not null as v470_summary_ready,
  exists(
    select 1 from pg_indexes
    where schemaname='public' and tablename='horse_health_profiles' and indexdef ilike '%unique%(horse_id)%'
  ) as profile_per_horse_ready,
  (select count(*) from public.horses h where h.farrier_date is not null and not exists(
    select 1 from public.horse_health_events e where e.horse_id=h.id and e.event_type='Farrier' and e.status='Completed'
      and (case when e.event_scope='care' then coalesce(timezone('Asia/Bahrain',e.completed_at)::date,e.event_date)
           else coalesce(e.event_date,timezone('Asia/Bahrain',e.completed_at)::date) end)=h.farrier_date
  )) as farrier_dates_without_record,
  (select count(*) from public.horses h where h.teeth_date is not null and not exists(
    select 1 from public.horse_health_events e where e.horse_id=h.id and e.event_type='Dental' and e.status='Completed'
      and (case when e.event_scope='care' then coalesce(timezone('Asia/Bahrain',e.completed_at)::date,e.event_date)
           else coalesce(e.event_date,timezone('Asia/Bahrain',e.completed_at)::date) end)=h.teeth_date
  )) as dental_dates_without_record,
  (select count(distinct e.horse_id) from public.horse_health_events e
    where e.event_scope='medical' and e.status in ('Open','Monitoring','Pending','Overdue')
      and nullif(trim(e.medication),'') is not null) as horses_with_open_treatment;

do $$
begin
  if to_regclass('public.horse_health_events') is null
     or to_regclass('public.horse_health_profiles') is null
     or to_regprocedure('public.cce_recompute_horse_health_summary(bigint,text)') is null then
    raise exception 'v4.7.0 horse health foundation must be applied before this migration';
  end if;
end $$;
