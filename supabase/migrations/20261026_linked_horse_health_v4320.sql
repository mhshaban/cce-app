-- CCE StableOS v4.32.0 — Linked horse health
-- The horse card (horses.*_date / medicant), the health profile
-- (horse_health_profiles) and the health records (horse_health_events) are
-- kept in step by the database itself, so every entry point (staff app,
-- profile modal, horse edit form, direct SQL) stays consistent:
--
--   * Health records stay the source of truth. The horse card shows the
--     latest farrier / dental / deworming / vaccination date and the latest
--     medication (now including medical records that carry a medication,
--     e.g. an open Treatment), recomputed after every record change.
--   * An open medical record with a medication puts the horse's profile
--     Under Treatment and copies medication, veterinarian, review date and
--     diagnosis into it. Completing, cancelling or deleting the last one
--     clears the current medication and returns Under Treatment to Healthy.
--   * Editing a date, farrier, vaccine doctor or medicant on the horse card
--     records (or corrects) the matching health record.
--   * Changing the profile's current medication updates the open treatment
--     record (or opens one); clearing it, or setting the horse Healthy,
--     completes the open treatment records.
--
-- A transaction-local setting (cce.health_sync) marks which side started a
-- change so the triggers never echo a change back to where it came from.
-- Safe to re-run.

begin;

do $$
begin
  if to_regclass('public.horse_health_events') is null
     or to_regclass('public.horse_health_profiles') is null
     or to_regprocedure('public.cce_recompute_horse_health_summary(bigint,text)') is null then
    raise exception 'v4.7.0 horse health foundation must be applied before this migration';
  end if;
end $$;

-- ---------------------------------------------------------------------------
-- 1) Shared helpers
-- ---------------------------------------------------------------------------
create or replace function public.cce_health_event_done_date(
  p_scope text,p_event_date date,p_completed_at timestamptz
)
returns date
language sql
stable
set search_path=public,pg_temp
as $$
  select case when p_scope='care'
    then coalesce(timezone('Asia/Bahrain',p_completed_at)::date,p_event_date)
    else coalesce(p_event_date,timezone('Asia/Bahrain',p_completed_at)::date)
  end
$$;

-- The medication a record contributes to the horse card, or null.
create or replace function public.cce_health_event_medication(
  p_scope text,p_type text,p_status text,p_medication text,p_title text
)
returns text
language sql
immutable
set search_path=public,pg_temp
as $$
  select case
    when p_status='Cancelled' then null
    when p_scope='medical' then coalesce(
      nullif(trim(p_medication),''),
      case when p_type='Medication' and p_status='Completed' then nullif(trim(p_title),'') end
    )
    when p_type='Medication' and p_status='Completed' then coalesce(nullif(trim(p_medication),''),nullif(trim(p_title),''))
  end
$$;

-- An open medical record that carries a medication is an active treatment.
create or replace function public.cce_health_event_is_active_treatment(
  p_scope text,p_status text,p_medication text
)
returns boolean
language sql
immutable
set search_path=public,pg_temp
as $$
  select coalesce(p_scope='medical'
    and p_status in ('Open','Monitoring','Pending','Overdue')
    and nullif(trim(p_medication),'') is not null,false)
$$;

-- ---------------------------------------------------------------------------
-- 2) Records -> horse card
-- ---------------------------------------------------------------------------
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

  if p_event_type='Medication' then
    select e.* into v_event
    from public.horse_health_events e
    where e.horse_id=p_horse_id
      and public.cce_health_event_medication(e.event_scope,e.event_type,e.status,e.medication,e.title) is not null
    order by e.event_date desc,e.id desc
    limit 1;

    if found then
      v_date=v_event.event_date;
      v_value=public.cce_health_event_medication(v_event.event_scope,v_event.event_type,v_event.status,v_event.medication,v_event.title);
    end if;
    update public.horses set med_date=v_date,medicant=v_value
    where id=p_horse_id and (med_date is distinct from v_date or medicant is distinct from v_value);
    return;
  end if;

  select e.* into v_event
  from public.horse_health_events e
  where e.horse_id=p_horse_id
    and e.event_type=p_event_type
    and e.status='Completed'
  order by
    public.cce_health_event_done_date(e.event_scope,e.event_date,e.completed_at) desc,
    e.completed_at desc nulls last,
    e.id desc
  limit 1;

  if found then
    v_date=public.cce_health_event_done_date(v_event.event_scope,v_event.event_date,v_event.completed_at);
    v_person=coalesce(nullif(trim(v_event.assigned_to),''),nullif(trim(v_event.veterinarian),''));
  end if;

  case p_event_type
    when 'Farrier' then
      update public.horses set farrier_date=v_date,farrier_name=v_person
      where id=p_horse_id and (farrier_date is distinct from v_date or farrier_name is distinct from v_person);
    when 'Dental' then
      update public.horses set teeth_date=v_date
      where id=p_horse_id and teeth_date is distinct from v_date;
    when 'Deworming' then
      update public.horses set deworm_date=v_date
      where id=p_horse_id and deworm_date is distinct from v_date;
    when 'Vaccination' then
      update public.horses set vaccine_date=v_date,vaccine_dr=v_person
      where id=p_horse_id and (vaccine_date is distinct from v_date or vaccine_dr is distinct from v_person);
  end case;
end;
$$;

-- ---------------------------------------------------------------------------
-- 3) Records -> health profile
-- ---------------------------------------------------------------------------
-- Mirrors the latest active treatment into the profile, or releases the
-- profile when no active treatment is left.
create or replace function public.cce_sync_horse_treatment(
  p_horse_id bigint,
  p_released_due date default null
)
returns void
language plpgsql
security definer
set search_path=public,pg_temp
as $$
declare
  v_event public.horse_health_events%rowtype;
  v_med text;
  v_vet text;
  v_diag text;
begin
  if p_horse_id is null or not exists(select 1 from public.horses where id=p_horse_id) then
    return;
  end if;

  select e.* into v_event
  from public.horse_health_events e
  where e.horse_id=p_horse_id
    and public.cce_health_event_is_active_treatment(e.event_scope,e.status,e.medication)
  order by e.event_date desc,e.id desc
  limit 1;

  if not found then
    update public.horse_health_profiles set
      current_medication=null,
      next_review_date=case when p_released_due is not null and next_review_date=p_released_due then null else next_review_date end,
      health_status=case when health_status='Under Treatment' then 'Healthy' else health_status end
    where horse_id=p_horse_id
      and (current_medication is not null or health_status='Under Treatment'
        or (p_released_due is not null and next_review_date=p_released_due));
    return;
  end if;

  v_med=trim(v_event.medication);
  v_vet=nullif(trim(v_event.veterinarian),'');
  v_diag=nullif(trim(v_event.diagnosis),'');

  insert into public.horse_health_profiles as p (
    horse_id,health_status,current_medication,veterinarian,next_review_date,diagnosis
  ) values (
    p_horse_id,'Under Treatment',v_med,v_vet,v_event.due_date,v_diag
  )
  on conflict(horse_id) do update set
    current_medication=excluded.current_medication,
    veterinarian=coalesce(excluded.veterinarian,p.veterinarian),
    next_review_date=coalesce(excluded.next_review_date,p.next_review_date),
    diagnosis=coalesce(excluded.diagnosis,p.diagnosis),
    health_status=case when p.health_status in ('Healthy','Training','Resting') then 'Under Treatment' else p.health_status end
  where p.current_medication is distinct from excluded.current_medication
    or (excluded.veterinarian is not null and p.veterinarian is distinct from excluded.veterinarian)
    or (excluded.next_review_date is not null and p.next_review_date is distinct from excluded.next_review_date)
    or (excluded.diagnosis is not null and p.diagnosis is distinct from excluded.diagnosis)
    or p.health_status in ('Healthy','Training','Resting');
end;
$$;

create or replace function public.cce_recompute_health_summary_after_change()
returns trigger
language plpgsql
security definer
set search_path=public,pg_temp
as $$
declare
  v_origin text:=coalesce(current_setting('cce.health_sync',true),'');
  v_was boolean:=false;
  v_is boolean:=false;
  v_moved boolean:=false;
  v_changed boolean:=false;
begin
  perform set_config('cce.health_sync','event',true);

  if tg_op='DELETE' then
    v_was=public.cce_health_event_is_active_treatment(old.event_scope,old.status,old.medication);
    perform public.cce_recompute_horse_health_summary(old.horse_id,old.event_type);
    if old.event_type<>'Medication' then
      perform public.cce_recompute_horse_health_summary(old.horse_id,'Medication');
    end if;
    if v_origin<>'profile' and v_was then
      perform public.cce_sync_horse_treatment(old.horse_id,old.due_date);
    end if;
    perform set_config('cce.health_sync',v_origin,true);
    return old;
  end if;

  v_is=public.cce_health_event_is_active_treatment(new.event_scope,new.status,new.medication);
  if tg_op='UPDATE' then
    v_was=public.cce_health_event_is_active_treatment(old.event_scope,old.status,old.medication);
    v_moved=old.horse_id is distinct from new.horse_id;
    v_changed=old.medication is distinct from new.medication
      or old.veterinarian is distinct from new.veterinarian
      or old.due_date is distinct from new.due_date
      or old.diagnosis is distinct from new.diagnosis
      or old.event_date is distinct from new.event_date;
    if v_moved or old.event_type is distinct from new.event_type then
      perform public.cce_recompute_horse_health_summary(old.horse_id,old.event_type);
    end if;
    if v_moved then
      perform public.cce_recompute_horse_health_summary(old.horse_id,'Medication');
    end if;
  end if;

  perform public.cce_recompute_horse_health_summary(new.horse_id,new.event_type);
  if new.event_type<>'Medication' then
    perform public.cce_recompute_horse_health_summary(new.horse_id,'Medication');
  end if;

  if v_origin<>'profile' then
    if v_was and (v_moved or not v_is) then
      perform public.cce_sync_horse_treatment(old.horse_id,old.due_date);
    end if;
    if v_is and (tg_op='INSERT' or not v_was or v_moved or v_changed) then
      perform public.cce_sync_horse_treatment(new.horse_id);
    end if;
  end if;

  perform set_config('cce.health_sync',v_origin,true);
  return new;
end;
$$;

drop trigger if exists cce_health_event_recompute_horse_summary on public.horse_health_events;
create trigger cce_health_event_recompute_horse_summary
after insert or update or delete on public.horse_health_events
for each row execute function public.cce_recompute_health_summary_after_change();

-- ---------------------------------------------------------------------------
-- 4) Horse card -> records
-- ---------------------------------------------------------------------------
create or replace function public.cce_record_card_health_date(
  p_horse_id bigint,
  p_type text,
  p_old_date date,
  p_new_date date,
  p_person text
)
returns void
language plpgsql
security definer
set search_path=public,pg_temp
as $$
declare
  v_person text:=nullif(trim(p_person),'');
  v_id bigint;
  v_latest_id bigint;
  v_latest_date date;
begin
  if p_horse_id is null or p_new_date is null
     or p_type not in ('Farrier','Dental','Deworming','Vaccination') then
    return;
  end if;

  -- Same visit already recorded: only bring the name across.
  select e.id into v_id
  from public.horse_health_events e
  where e.horse_id=p_horse_id and e.event_type=p_type and e.status='Completed'
    and public.cce_health_event_done_date(e.event_scope,e.event_date,e.completed_at)=p_new_date
  order by e.id desc
  limit 1;

  -- An earlier date replacing the card's latest date is a correction.
  if v_id is null and p_old_date is not null and p_new_date<p_old_date then
    select e.id,public.cce_health_event_done_date(e.event_scope,e.event_date,e.completed_at)
      into v_latest_id,v_latest_date
    from public.horse_health_events e
    where e.horse_id=p_horse_id and e.event_type=p_type and e.status='Completed'
    order by 2 desc,e.completed_at desc nulls last,e.id desc
    limit 1;
    if v_latest_date=p_old_date then
      update public.horse_health_events
      set event_date=p_new_date,completed_at=(p_new_date+time '12:00') at time zone 'Asia/Bahrain'
      where id=v_latest_id;
      v_id=v_latest_id;
    end if;
  end if;

  if v_id is not null then
    if v_person is not null then
      if p_type='Vaccination' then
        update public.horse_health_events set veterinarian=v_person,assigned_to=null
        where id=v_id and (veterinarian is distinct from v_person or assigned_to is not null);
      else
        update public.horse_health_events set assigned_to=v_person
        where id=v_id and assigned_to is distinct from v_person;
      end if;
    end if;
    return;
  end if;

  insert into public.horse_health_events(
    horse_id,event_scope,event_type,event_date,title,status,priority,severity,
    assigned_to,veterinarian,completed_at,notes
  ) values (
    p_horse_id,
    case when p_type='Vaccination' then 'vaccination' else 'care' end,
    p_type,
    p_new_date,
    case p_type when 'Farrier' then 'Farrier visit' when 'Dental' then 'Dental check'
      when 'Deworming' then 'Deworming' else 'Vaccination' end,
    'Completed','Normal','None',
    case when p_type<>'Vaccination' then v_person end,
    case when p_type='Vaccination' then v_person end,
    (p_new_date+time '12:00') at time zone 'Asia/Bahrain',
    'Recorded from the horse card'
  );
end;
$$;

create or replace function public.cce_record_card_medication(
  p_horse_id bigint,
  p_old_date date,
  p_new_text text,
  p_new_date date
)
returns void
language plpgsql
security definer
set search_path=public,pg_temp
as $$
declare
  v_text text:=nullif(trim(p_new_text),'');
  v_date date;
  v_src public.horse_health_events%rowtype;
  v_move boolean:=false;
begin
  if p_horse_id is null or v_text is null then
    return;
  end if;
  v_date=coalesce(p_new_date,timezone('Asia/Bahrain',now())::date);

  select e.* into v_src
  from public.horse_health_events e
  where e.horse_id=p_horse_id
    and public.cce_health_event_medication(e.event_scope,e.event_type,e.status,e.medication,e.title) is not null
  order by e.event_date desc,e.id desc
  limit 1;

  if found then
    v_move=p_old_date is not null and v_src.event_date=p_old_date and v_date<p_old_date;
    -- Same date, unchanged date, or a correction: edit the latest record.
    if v_src.event_date=v_date or p_new_date is not distinct from p_old_date or v_move then
      update public.horse_health_events set
        medication=v_text,
        title=case when event_type='Medication' and (medication is null or trim(title)=trim(medication)) then v_text else title end,
        event_date=case when v_move then v_date else event_date end
      where id=v_src.id
        and (public.cce_health_event_medication(event_scope,event_type,status,medication,title) is distinct from v_text
          or (v_move and event_date is distinct from v_date));
      return;
    end if;
  end if;

  insert into public.horse_health_events(
    horse_id,event_scope,event_type,event_date,title,medication,status,priority,severity,notes
  ) values (
    p_horse_id,'medical','Medication',v_date,left(v_text,200),v_text,'Completed','Normal','None',
    'Recorded from the horse card'
  );
end;
$$;

create or replace function public.cce_sync_horse_card_to_health()
returns trigger
language plpgsql
security definer
set search_path=public,pg_temp
as $$
begin
  if coalesce(current_setting('cce.health_sync',true),'')<>'' then
    return new;
  end if;
  perform set_config('cce.health_sync','card',true);

  if tg_op='INSERT' then
    perform public.cce_record_card_health_date(new.id,'Farrier',null,new.farrier_date,new.farrier_name);
    perform public.cce_record_card_health_date(new.id,'Dental',null,new.teeth_date,null);
    perform public.cce_record_card_health_date(new.id,'Deworming',null,new.deworm_date,null);
    perform public.cce_record_card_health_date(new.id,'Vaccination',null,new.vaccine_date,new.vaccine_dr);
    perform public.cce_record_card_medication(new.id,null,new.medicant,new.med_date);
  else
    if old.farrier_date is distinct from new.farrier_date or old.farrier_name is distinct from new.farrier_name then
      perform public.cce_record_card_health_date(new.id,'Farrier',old.farrier_date,new.farrier_date,new.farrier_name);
    end if;
    if old.teeth_date is distinct from new.teeth_date then
      perform public.cce_record_card_health_date(new.id,'Dental',old.teeth_date,new.teeth_date,null);
    end if;
    if old.deworm_date is distinct from new.deworm_date then
      perform public.cce_record_card_health_date(new.id,'Deworming',old.deworm_date,new.deworm_date,null);
    end if;
    if old.vaccine_date is distinct from new.vaccine_date or old.vaccine_dr is distinct from new.vaccine_dr then
      perform public.cce_record_card_health_date(new.id,'Vaccination',old.vaccine_date,new.vaccine_date,new.vaccine_dr);
    end if;
    if old.medicant is distinct from new.medicant or old.med_date is distinct from new.med_date then
      perform public.cce_record_card_medication(new.id,old.med_date,new.medicant,new.med_date);
    end if;
  end if;

  perform set_config('cce.health_sync','',true);
  return new;
end;
$$;

drop trigger if exists cce_horse_card_sync_health on public.horses;
create trigger cce_horse_card_sync_health
after insert or update of farrier_date,farrier_name,teeth_date,deworm_date,vaccine_date,vaccine_dr,medicant,med_date
on public.horses
for each row execute function public.cce_sync_horse_card_to_health();

-- ---------------------------------------------------------------------------
-- 5) Health profile -> records
-- ---------------------------------------------------------------------------
create or replace function public.cce_sync_horse_profile_to_health()
returns trigger
language plpgsql
security definer
set search_path=public,pg_temp
as $$
declare
  v_old_med text;
  v_new_med text:=nullif(trim(new.current_medication),'');
  v_healed boolean:=false;
  v_active public.horse_health_events%rowtype;
begin
  if coalesce(current_setting('cce.health_sync',true),'')<>'' then
    return new;
  end if;
  if tg_op='UPDATE' then
    v_old_med=nullif(trim(old.current_medication),'');
    v_healed=new.health_status='Healthy' and old.health_status is distinct from 'Healthy';
  end if;
  if not v_healed and v_new_med is not distinct from v_old_med then
    return new;
  end if;

  perform set_config('cce.health_sync','profile',true);

  select e.* into v_active
  from public.horse_health_events e
  where e.horse_id=new.horse_id
    and public.cce_health_event_is_active_treatment(e.event_scope,e.status,e.medication)
  order by e.event_date desc,e.id desc
  limit 1;

  if v_healed then
    -- Marked Healthy: the open medical records are finished.
    update public.horse_health_events set status='Completed'
    where horse_id=new.horse_id and event_scope='medical'
      and status in ('Open','Monitoring','Pending','Overdue');
    -- A medication left untouched in the form belonged to that treatment.
    if v_new_med is not null and v_active.id is not null and v_new_med=trim(v_active.medication) then
      update public.horse_health_profiles set current_medication=null where id=new.id;
    end if;
  elsif v_new_med is null then
    -- Current medication cleared: the treatment is finished.
    update public.horse_health_events set status='Completed'
    where horse_id=new.horse_id
      and public.cce_health_event_is_active_treatment(event_scope,status,medication);
  elsif v_active.id is not null then
    update public.horse_health_events set
      medication=v_new_med,
      veterinarian=coalesce(nullif(trim(veterinarian),''),nullif(trim(new.veterinarian),''))
    where id=v_active.id;
  else
    insert into public.horse_health_events(
      horse_id,event_scope,event_type,event_date,due_date,title,diagnosis,medication,
      veterinarian,status,priority,severity,notes,created_by
    ) values (
      new.horse_id,'medical','Treatment',timezone('Asia/Bahrain',now())::date,new.next_review_date,
      left(v_new_med,200),nullif(trim(new.diagnosis),''),v_new_med,nullif(trim(new.veterinarian),''),
      'Open','Normal','None','Recorded from the health profile',auth.uid()
    );
  end if;

  perform set_config('cce.health_sync','',true);
  return new;
end;
$$;

drop trigger if exists cce_horse_profile_sync_health on public.horse_health_profiles;
create trigger cce_horse_profile_sync_health
after insert or update of current_medication,health_status on public.horse_health_profiles
for each row execute function public.cce_sync_horse_profile_to_health();

revoke all on function public.cce_health_event_done_date(text,date,timestamptz) from public;
revoke all on function public.cce_health_event_medication(text,text,text,text,text) from public;
revoke all on function public.cce_health_event_is_active_treatment(text,text,text) from public;
revoke all on function public.cce_recompute_horse_health_summary(bigint,text) from public;
revoke all on function public.cce_recompute_health_summary_after_change() from public;
revoke all on function public.cce_sync_horse_treatment(bigint,date) from public;
revoke all on function public.cce_record_card_health_date(bigint,text,date,date,text) from public;
revoke all on function public.cce_record_card_medication(bigint,date,text,date) from public;
revoke all on function public.cce_sync_horse_card_to_health() from public;
revoke all on function public.cce_sync_horse_profile_to_health() from public;

-- ---------------------------------------------------------------------------
-- 6) One-time reconciliation of existing data
-- ---------------------------------------------------------------------------
do $$
declare
  v_horse record;
  v_type text;
  v_event public.horse_health_events%rowtype;
  v_profile_med text;
begin
  perform set_config('cce.health_sync','backfill',true);

  -- Card values typed directly into the horse card become health records.
  for v_horse in
    select id,farrier_date,farrier_name,teeth_date,deworm_date,vaccine_date,vaccine_dr,medicant,med_date
    from public.horses
  loop
    perform public.cce_record_card_health_date(v_horse.id,'Farrier',null,v_horse.farrier_date,v_horse.farrier_name);
    perform public.cce_record_card_health_date(v_horse.id,'Dental',null,v_horse.teeth_date,null);
    perform public.cce_record_card_health_date(v_horse.id,'Deworming',null,v_horse.deworm_date,null);
    perform public.cce_record_card_health_date(v_horse.id,'Vaccination',null,v_horse.vaccine_date,v_horse.vaccine_dr);
    perform public.cce_record_card_medication(v_horse.id,null,v_horse.medicant,v_horse.med_date);
  end loop;

  -- Open treatments reach the profile; a profile's own wording wins.
  for v_horse in
    select distinct e.horse_id as id
    from public.horse_health_events e
    where public.cce_health_event_is_active_treatment(e.event_scope,e.status,e.medication)
  loop
    select e.* into v_event
    from public.horse_health_events e
    where e.horse_id=v_horse.id
      and public.cce_health_event_is_active_treatment(e.event_scope,e.status,e.medication)
    order by e.event_date desc,e.id desc
    limit 1;
    select nullif(trim(p.current_medication),'') into v_profile_med
    from public.horse_health_profiles p where p.horse_id=v_horse.id;
    if v_profile_med is not null and v_profile_med is distinct from trim(v_event.medication) then
      update public.horse_health_events set medication=v_profile_med where id=v_event.id;
    end if;
    perform public.cce_sync_horse_treatment(v_horse.id);
  end loop;

  for v_horse in select id from public.horses loop
    foreach v_type in array array['Farrier','Dental','Deworming','Vaccination','Medication'] loop
      perform public.cce_recompute_horse_health_summary(v_horse.id,v_type);
    end loop;
  end loop;

  perform set_config('cce.health_sync','',true);
end $$;

commit;
