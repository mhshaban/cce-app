-- CCE StableOS v4.6.4
-- Keep the canonical horse_health_events timeline and the legacy horse summary
-- columns in sync. The summary columns remain for backward-compatible cards,
-- reports and owner views; horse_health_events remains the source of truth.

begin;

do $$
begin
  if to_regclass('public.horse_health_events') is null then
    raise exception 'horse_health_events is missing; apply the database consolidation migration first';
  end if;
  if to_regclass('public.horses') is null then
    raise exception 'horses is missing';
  end if;
end $$;

create or replace function public.cce_prepare_health_event_completion()
returns trigger
language plpgsql
set search_path=public
as $$
begin
  if new.status='Completed' and new.completed_at is null then
    new.completed_at=now();
  end if;
  return new;
end $$;

drop trigger if exists cce_health_event_prepare_completion on public.horse_health_events;
create trigger cce_health_event_prepare_completion
before insert or update of status,completed_at on public.horse_health_events
for each row execute function public.cce_prepare_health_event_completion();

create or replace function public.cce_sync_completed_health_event_to_horse()
returns trigger
language plpgsql
security definer
set search_path=public,pg_temp
as $$
declare
  v_date date;
  v_person text;
  v_value text;
begin
  if new.status<>'Completed'
     or new.event_type not in ('Farrier','Dental','Deworming','Vaccination','Medication') then
    return new;
  end if;

  -- Care tasks use the actual Bahrain completion date. Historical medical and
  -- vaccination records retain their explicitly entered event date.
  if new.event_scope='care' then
    v_date=coalesce(timezone('Asia/Bahrain',new.completed_at)::date,new.event_date,current_date);
  else
    v_date=coalesce(new.event_date,timezone('Asia/Bahrain',new.completed_at)::date,current_date);
  end if;
  v_person=coalesce(nullif(trim(new.assigned_to),''),nullif(trim(new.veterinarian),''));
  v_value=coalesce(nullif(trim(new.medication),''),nullif(trim(new.title),''),v_person);

  case new.event_type
    when 'Farrier' then
      update public.horses h set
        farrier_name=case when v_person is not null and (h.farrier_date is null or v_date>=h.farrier_date) then v_person else h.farrier_name end,
        farrier_date=case when h.farrier_date is null or v_date>=h.farrier_date then v_date else h.farrier_date end
      where h.id=new.horse_id;
    when 'Dental' then
      update public.horses h set
        teeth_date=case when h.teeth_date is null or v_date>=h.teeth_date then v_date else h.teeth_date end
      where h.id=new.horse_id;
    when 'Deworming' then
      update public.horses h set
        deworm_date=case when h.deworm_date is null or v_date>=h.deworm_date then v_date else h.deworm_date end
      where h.id=new.horse_id;
    when 'Vaccination' then
      update public.horses h set
        vaccine_dr=case when v_person is not null and (h.vaccine_date is null or v_date>=h.vaccine_date) then v_person else h.vaccine_dr end,
        vaccine_date=case when h.vaccine_date is null or v_date>=h.vaccine_date then v_date else h.vaccine_date end
      where h.id=new.horse_id;
    when 'Medication' then
      update public.horses h set
        medicant=case when v_value is not null and (h.med_date is null or v_date>=h.med_date) then v_value else h.medicant end,
        med_date=case when h.med_date is null or v_date>=h.med_date then v_date else h.med_date end
      where h.id=new.horse_id;
  end case;

  return new;
end $$;

drop trigger if exists cce_health_event_sync_horse_summary on public.horse_health_events;
create trigger cce_health_event_sync_horse_summary
after insert or update of status,completed_at,event_date,event_type,event_scope,assigned_to,veterinarian,medication,title
on public.horse_health_events
for each row execute function public.cce_sync_completed_health_event_to_horse();

-- Backfill existing completed care so cards and alerts immediately agree with
-- the canonical event history when this migration is installed.
update public.horse_health_events
set completed_at=coalesce(completed_at,event_date::timestamp at time zone 'Asia/Bahrain')
where status='Completed'
  and event_type in ('Farrier','Dental','Deworming','Vaccination','Medication');

revoke all on function public.cce_prepare_health_event_completion() from public;
revoke all on function public.cce_sync_completed_health_event_to_horse() from public;

comment on function public.cce_sync_completed_health_event_to_horse() is
  'Synchronizes completed canonical health events to backward-compatible horse summary fields.';

commit;
