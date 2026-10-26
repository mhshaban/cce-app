-- Compatibility rollback for v4.32.0 (linked horse health).
-- Removes the horse-card and health-profile sync triggers and restores the
-- v4.7.0 record -> horse-card summary (Completed Medication records only).
-- Health records, profiles and horse cards written while v4.32.0 was active
-- are kept as they are. Safe to re-run.

begin;

drop trigger if exists cce_horse_card_sync_health on public.horses;
drop trigger if exists cce_horse_profile_sync_health on public.horse_health_profiles;

create or replace function public.cce_recompute_horse_health_summary(
  p_horse_id bigint,
  p_event_type text
)
returns void
language plpgsql
security definer
set search_path=public,pg_temp
as $$
declare
  v_event public.horse_health_events%rowtype;
  v_date date;
  v_person text;
  v_value text;
begin
  if p_horse_id is null or p_event_type not in ('Farrier','Dental','Deworming','Vaccination','Medication') then
    return;
  end if;

  select e.* into v_event
  from public.horse_health_events e
  where e.horse_id=p_horse_id
    and e.event_type=p_event_type
    and e.status='Completed'
  order by
    (case when e.event_scope='care'
      then coalesce(timezone('Asia/Bahrain',e.completed_at)::date,e.event_date)
      else coalesce(e.event_date,timezone('Asia/Bahrain',e.completed_at)::date)
    end) desc,
    e.completed_at desc nulls last,
    e.id desc
  limit 1;

  if found then
    if v_event.event_scope='care' then
      v_date=coalesce(timezone('Asia/Bahrain',v_event.completed_at)::date,v_event.event_date);
    else
      v_date=coalesce(v_event.event_date,timezone('Asia/Bahrain',v_event.completed_at)::date);
    end if;
    v_person=coalesce(nullif(trim(v_event.assigned_to),''),nullif(trim(v_event.veterinarian),''));
    v_value=coalesce(nullif(trim(v_event.medication),''),nullif(trim(v_event.title),''),v_person);
  else
    v_date=null;
    v_person=null;
    v_value=null;
  end if;

  case p_event_type
    when 'Farrier' then
      update public.horses set farrier_date=v_date,farrier_name=v_person where id=p_horse_id;
    when 'Dental' then
      update public.horses set teeth_date=v_date where id=p_horse_id;
    when 'Deworming' then
      update public.horses set deworm_date=v_date where id=p_horse_id;
    when 'Vaccination' then
      update public.horses set vaccine_date=v_date,vaccine_dr=v_person where id=p_horse_id;
    when 'Medication' then
      update public.horses set med_date=v_date,medicant=v_value where id=p_horse_id;
  end case;
end;
$$;

create or replace function public.cce_recompute_health_summary_after_change()
returns trigger
language plpgsql
security definer
set search_path=public,pg_temp
as $$
begin
  if tg_op='DELETE' then
    perform public.cce_recompute_horse_health_summary(old.horse_id,old.event_type);
    return old;
  end if;

  if tg_op='UPDATE' and (
    old.horse_id is distinct from new.horse_id
    or old.event_type is distinct from new.event_type
  ) then
    perform public.cce_recompute_horse_health_summary(old.horse_id,old.event_type);
  end if;

  perform public.cce_recompute_horse_health_summary(new.horse_id,new.event_type);
  return new;
end;
$$;

drop trigger if exists cce_health_event_sync_horse_summary on public.horse_health_events;
drop trigger if exists cce_health_event_recompute_horse_summary on public.horse_health_events;
create trigger cce_health_event_recompute_horse_summary
after insert or update or delete on public.horse_health_events
for each row execute function public.cce_recompute_health_summary_after_change();

drop function if exists public.cce_sync_horse_card_to_health();
drop function if exists public.cce_sync_horse_profile_to_health();
drop function if exists public.cce_record_card_health_date(bigint,text,date,date,text);
drop function if exists public.cce_record_card_medication(bigint,date,text,date);
drop function if exists public.cce_sync_horse_treatment(bigint,date);
drop function if exists public.cce_health_event_is_active_treatment(text,text,text);
drop function if exists public.cce_health_event_medication(text,text,text,text,text);
drop function if exists public.cce_health_event_done_date(text,date,timestamptz);

revoke all on function public.cce_recompute_horse_health_summary(bigint,text) from public;
revoke all on function public.cce_recompute_health_summary_after_change() from public;

commit;
