-- CCE StableOS v4.32.0 — Linked horse health verification
-- Expected: three triggers, and every mismatch count = 0.

select tgrelid::regclass as table_name, tgname
from pg_trigger
where not tgisinternal and tgname in (
  'cce_health_event_recompute_horse_summary',
  'cce_horse_card_sync_health',
  'cce_horse_profile_sync_health'
)
order by tgname;

with latest_med as (
  select distinct on (e.horse_id) e.horse_id,e.event_date,
    public.cce_health_event_medication(e.event_scope,e.event_type,e.status,e.medication,e.title) as medication
  from public.horse_health_events e
  where public.cce_health_event_medication(e.event_scope,e.event_type,e.status,e.medication,e.title) is not null
  order by e.horse_id,e.event_date desc,e.id desc
), latest_treatment as (
  select distinct on (e.horse_id) e.horse_id,trim(e.medication) as medication
  from public.horse_health_events e
  where public.cce_health_event_is_active_treatment(e.event_scope,e.status,e.medication)
  order by e.horse_id,e.event_date desc,e.id desc
)
select
  (select count(*) from public.horses h left join latest_med m on m.horse_id=h.id
    where h.medicant is distinct from m.medication or h.med_date is distinct from m.event_date) as card_medication_mismatches,
  (select count(*) from latest_treatment t left join public.horse_health_profiles p on p.horse_id=t.horse_id
    where p.current_medication is distinct from t.medication
      or p.health_status in ('Healthy','Training','Resting')) as open_treatments_missing_from_profile,
  (select count(*) from public.horses h where h.farrier_date is not null and not exists(
    select 1 from public.horse_health_events e where e.horse_id=h.id and e.event_type='Farrier' and e.status='Completed'
      and public.cce_health_event_done_date(e.event_scope,e.event_date,e.completed_at)=h.farrier_date
  )) as farrier_dates_without_record,
  (select count(*) from public.horses h where h.vaccine_date is not null and not exists(
    select 1 from public.horse_health_events e where e.horse_id=h.id and e.event_type='Vaccination' and e.status='Completed'
      and public.cce_health_event_done_date(e.event_scope,e.event_date,e.completed_at)=h.vaccine_date
  )) as vaccine_dates_without_record;
