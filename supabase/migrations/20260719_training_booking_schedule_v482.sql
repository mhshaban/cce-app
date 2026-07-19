-- CCE StableOS v4.8.2 — materialize training packages into instructor schedules
--
-- A public training request stores all selected slots in booking_requests, while
-- income remains the financial record for the package. This migration adds an
-- idempotent, audited operation that creates one schedule row per slot and
-- assigns those rows to the selected instructor. Customer totals, paid cash and
-- remaining balances are guarded and never rewritten.

begin;

do $$
begin
  if to_regclass('public.booking_requests') is null
     or to_regclass('public.income') is null
     or to_regclass('public.schedule') is null
     or to_regclass('public.instructors') is null
     or to_regclass('public.audit_logs') is null
     or to_regprocedure('public.cce_has_permission(text)') is null then
    raise exception 'CCE v4.8.2 requires the v4.8.1 database chain';
  end if;
end;
$$;

create temporary table cce_v482_finance_guard on commit drop as
select count(*)::bigint as row_count,
       coalesce(sum(amount_bd),0)::numeric as total_amount_bd,
       coalesce(sum(paid_bd),0)::numeric as total_paid_bd
from public.income;

alter table public.schedule add column if not exists booking_request_id bigint;
alter table public.schedule add column if not exists booking_slot_index integer;

do $$
begin
  if not exists (
    select 1 from pg_constraint
    where conname='schedule_booking_request_id_fkey'
      and conrelid='public.schedule'::regclass
  ) then
    alter table public.schedule
      add constraint schedule_booking_request_id_fkey
      foreign key (booking_request_id)
      references public.booking_requests(id) on delete restrict;
  end if;
  if not exists (
    select 1 from pg_constraint
    where conname='schedule_booking_slot_pair_check'
      and conrelid='public.schedule'::regclass
  ) then
    alter table public.schedule
      add constraint schedule_booking_slot_pair_check check (
        (booking_request_id is null and booking_slot_index is null)
        or (booking_request_id is not null and booking_slot_index>0)
      );
  end if;
end;
$$;

create unique index if not exists schedule_booking_slot_uidx
  on public.schedule(booking_request_id,booking_slot_index)
  where booking_request_id is not null;

create index if not exists schedule_booking_request_idx
  on public.schedule(booking_request_id,date,start_time)
  where booking_request_id is not null;

-- Linked schedule rows represent the same capacity already reserved by the
-- booking request. Count only unlinked/manual schedule rows as extra capacity.
create or replace function public.cce_reserved_horse_units(
  p_date date,
  p_start_time time,
  p_duration_minutes integer default 30
)
returns bigint
language sql
stable
security definer
set search_path=public,pg_temp
as $$
  with bounds as (
    select p_start_time as starts,
      (p_start_time+make_interval(mins=>greatest(coalesce(p_duration_minutes,30),1)))::time as ends
  ), modern as (
    select coalesce(sum(greatest(coalesce(nullif(slot->>'capacity_units','')::integer,1),1)),0)::bigint as units
    from public.booking_requests br
    cross join lateral jsonb_array_elements(br.session_slots) slot
    cross join bounds b
    where br.status in ('Requested','Confirmed','Scheduled')
      and (slot->>'date')::date=p_date
      and (slot->>'time')::time < b.ends
      and (
        (slot->>'time')::time+
        make_interval(mins=>greatest(coalesce(nullif(slot->>'duration_minutes','')::integer,45),1))
      )::time > b.starts
  ), legacy as (
    select coalesce(sum(
      case when coalesce(i.notes,'') ilike '%TRAINING REQUEST%' then 1
           else greatest(coalesce(i.qty,1),1) end
    ),0)::bigint as units
    from public.income i
    cross join bounds b
    where i.booking_request_id is null
      and i.date::date=p_date
      and i.start_time is not null
      and public.cce_is_booking_record(i.notes)
      and coalesce(lower(i.status),'pending') not in ('cancelled','canceled','rejected')
      and i.start_time::time < b.ends
      and coalesce(i.end_time::time,(i.start_time::time+interval '45 minutes')::time)>b.starts
  ), orphan_schedule as (
    select count(*)::bigint as units
    from public.schedule s
    cross join bounds b
    where s.booking_request_id is null
      and s.date::date=p_date
      and s.start_time is not null
      and coalesce(s.activity,'') ~* '(hack|lesson|ride|training)'
      and coalesce(lower(s.status),'scheduled') not in ('done','cancelled','canceled')
      and s.start_time::time < b.ends
      and coalesce(s.end_time::time,(s.start_time::time+interval '45 minutes')::time)>b.starts
      and not exists (
        select 1 from public.income i
        where i.date::date=s.date::date
          and i.start_time::time=s.start_time::time
          and public.cce_is_booking_record(i.notes)
          and lower(trim(coalesce(i.customer_name,'')))=lower(trim(coalesce(s.customer_name,'')))
      )
  )
  select modern.units+legacy.units+orphan_schedule.units
  from modern,legacy,orphan_schedule;
$$;

create or replace function public.cce_schedule_training_booking(
  p_booking_request_id bigint,
  p_instructor_id bigint
)
returns jsonb
language plpgsql
security definer
set search_path=public,pg_temp
as $$
declare
  v_booking public.booking_requests%rowtype;
  v_income public.income%rowtype;
  v_instructor public.instructors%rowtype;
  v_slot jsonb;
  v_slot_index integer;
  v_slot_count integer;
  v_date date;
  v_start time;
  v_end time;
  v_duration integer;
  v_existing_id bigint;
  v_match_id bigint;
  v_match_count integer;
  v_created integer:=0;
  v_linked integer:=0;
  v_existing integer:=0;
  v_total integer;
  v_before_amount numeric;
  v_before_paid numeric;
  v_old_status text;
begin
  if not public.cce_has_permission('bookings.update')
     or not public.cce_has_permission('schedule.create') then
    raise exception 'Permission denied';
  end if;

  select * into v_booking
  from public.booking_requests
  where id=p_booking_request_id
  for update;
  if not found then raise exception 'Booking request not found'; end if;
  if v_booking.request_type<>'training' then
    raise exception 'Only training bookings can create package sessions';
  end if;
  if v_booking.status in ('Cancelled','Rejected','Completed') then
    raise exception 'This booking is closed and cannot be scheduled';
  end if;
  if jsonb_typeof(v_booking.session_slots)<>'array'
     or jsonb_array_length(v_booking.session_slots)=0 then
    raise exception 'Training booking has no session slots';
  end if;

  select * into v_instructor
  from public.instructors
  where id=p_instructor_id and active is true;
  if not found then raise exception 'The selected instructor is missing or inactive'; end if;

  select * into v_income
  from public.income
  where booking_request_id=p_booking_request_id
  for update;
  if not found then raise exception 'The booking financial record is missing'; end if;

  v_before_amount:=v_income.amount_bd;
  v_before_paid:=v_income.paid_bd;
  v_old_status:=v_booking.status;
  v_slot_count:=jsonb_array_length(v_booking.session_slots);

  if v_income.instructor_id is not null
     and v_income.instructor_id is distinct from v_instructor.id
     and coalesce(v_income.paid_bd,0)>0 then
    raise exception 'This paid package is financially assigned to another instructor; use an audited financial correction';
  end if;
  if exists (
    select 1 from public.schedule
    where booking_request_id=v_booking.id
      and instructor_id is distinct from v_instructor.id
  ) then
    raise exception 'Package sessions already include another instructor; edit individual sessions instead';
  end if;

  -- Instructor assignment is the only financial-row field changed here.
  update public.income
  set instructor_id=v_instructor.id
  where id=v_income.id;

  for v_slot,v_slot_index in
    select slot.value,slot.ordinality::integer
    from jsonb_array_elements(v_booking.session_slots) with ordinality as slot(value,ordinality)
  loop
    begin
      v_date:=(v_slot->>'date')::date;
      v_start:=(v_slot->>'time')::time;
      v_duration:=greatest(coalesce(nullif(v_slot->>'duration_minutes','')::integer,45),1);
      v_end:=(v_start+make_interval(mins=>v_duration))::time;
    exception when others then
      raise exception 'Training session % contains an invalid date or time',v_slot_index;
    end;

    select id into v_existing_id
    from public.schedule
    where booking_request_id=v_booking.id
      and booking_slot_index=v_slot_index;

    if v_existing_id is not null then
      v_existing:=v_existing+1;
      continue;
    end if;

    -- Adopt one exact legacy/manual match instead of creating a duplicate.
    select count(*)::integer,min(id)
    into v_match_count,v_match_id
    from public.schedule
    where booking_request_id is null
      and date=v_date
      and start_time=v_start
      and lower(trim(coalesce(customer_name,'')))=lower(trim(v_booking.customer_name))
      and lower(trim(coalesce(activity,''))) in ('lesson','training');

    if v_match_count>1 then
      raise exception 'Multiple existing sessions match booking slot %; resolve them before scheduling',v_slot_index;
    elsif v_match_count=1 then
      update public.schedule
      set booking_request_id=v_booking.id,
          booking_slot_index=v_slot_index,
          instructor_id=v_instructor.id,
          instructor=v_instructor.name
      where id=v_match_id;
      v_linked:=v_linked+1;
    else
      insert into public.schedule(
        date,start_time,end_time,activity,horse_name,customer_name,
        instructor,instructor_id,status,notes,color,
        booking_request_id,booking_slot_index
      ) values (
        v_date,v_start,v_end,'Lesson',v_booking.horse_name,v_booking.customer_name,
        v_instructor.name,v_instructor.id,'Scheduled',
        'Training booking #'||v_booking.id||' · '||v_booking.service_name||
          ' · Session '||v_slot_index||' of '||v_slot_count,
        '#1E7D4E',v_booking.id,v_slot_index
      );
      v_created:=v_created+1;
    end if;
  end loop;

  select count(*)::integer into v_total
  from public.schedule
  where booking_request_id=v_booking.id;
  if v_total<>v_slot_count then
    raise exception 'Schedule materialization failed: expected % sessions, found %',v_slot_count,v_total;
  end if;

  update public.booking_requests
  set status='Scheduled'
  where id=v_booking.id;

  if exists (
    select 1 from public.income
    where id=v_income.id
      and (amount_bd is distinct from v_before_amount or paid_bd is distinct from v_before_paid)
  ) then
    raise exception 'Finance guard failed: amount_bd or paid_bd changed';
  end if;

  insert into public.audit_logs(actor,action,table_name,record_id,before_data,after_data)
  values(
    'User: '||coalesce(auth.uid()::text,'system'),
    'schedule_training_booking','booking_requests',v_booking.id::text,
    jsonb_build_object(
      'status',v_old_status,'income_instructor_id',v_income.instructor_id,
      'amount_bd',v_before_amount,'paid_bd',v_before_paid
    ),
    jsonb_build_object(
      'status','Scheduled','instructor_id',v_instructor.id,'instructor',v_instructor.name,
      'sessions',v_total,'created',v_created,'linked',v_linked,'existing',v_existing,
      'amount_bd',v_before_amount,'paid_bd',v_before_paid
    )
  );

  return jsonb_build_object(
    'booking_request_id',v_booking.id,
    'instructor_id',v_instructor.id,
    'instructor',v_instructor.name,
    'sessions',v_total,
    'created',v_created,
    'linked',v_linked,
    'existing',v_existing,
    'status','Scheduled'
  );
end;
$$;

revoke all on function public.cce_schedule_training_booking(bigint,bigint) from public,anon;
grant execute on function public.cce_schedule_training_booking(bigint,bigint) to authenticated;

comment on column public.schedule.booking_request_id is
  'Training booking that owns this materialized session; null for manual schedule rows.';
comment on column public.schedule.booking_slot_index is
  'One-based slot position inside booking_requests.session_slots.';
comment on function public.cce_schedule_training_booking(bigint,bigint) is
  'Idempotently creates one schedule row per training package slot and assigns the selected instructor without changing customer money.';

do $$
declare
  v_before record;
  v_after record;
begin
  select * into v_before from cce_v482_finance_guard;
  select count(*)::bigint as row_count,
         coalesce(sum(amount_bd),0)::numeric as total_amount_bd,
         coalesce(sum(paid_bd),0)::numeric as total_paid_bd
  into v_after
  from public.income;
  if v_after.row_count is distinct from v_before.row_count
     or v_after.total_amount_bd is distinct from v_before.total_amount_bd
     or v_after.total_paid_bd is distinct from v_before.total_paid_bd then
    raise exception 'CCE v4.8.2 finance guard failed: amount_bd or paid_bd changed';
  end if;
end;
$$;

commit;
