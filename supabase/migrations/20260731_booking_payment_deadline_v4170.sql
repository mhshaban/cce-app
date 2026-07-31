-- CCE StableOS v4.17.0 — Booking payment deadline
-- Customers were completing payment (WhatsApp proof) but never clicking the
-- final submit button, believing payment alone finished the booking. The
-- public forms now submit-and-show-payment in one action ("Send Request &
-- Pay"), and every booking request gets a 24-hour payment_due_at deadline.
-- Any request still 'Requested' past that deadline is auto-cancelled the
-- next time staff open the Bookings dashboard, freeing the horse capacity
-- it was holding (cce_reserved_horse_units only counts Requested/Confirmed/
-- Scheduled) for other customers.

begin;

do $$
begin
  if to_regclass('public.booking_requests') is null
     or to_regprocedure('public.cce_public_submit_booking(text,text,text,text,date,time,text,jsonb,text,text,text,date,text,jsonb,jsonb,boolean,text,text)') is null
     or to_regprocedure('public.cce_update_booking_status(bigint,text)') is null then
    raise exception 'CCE v4.7.0 booking foundation must be applied before the payment deadline';
  end if;
end $$;

alter table public.booking_requests
  add column if not exists payment_due_at timestamptz;

create index if not exists booking_requests_payment_due_idx
  on public.booking_requests(payment_due_at)
  where status='Requested';

-- Same body as v4.7.0's cce_public_submit_booking, plus payment_due_at set
-- to 24 hours from submission on the initial insert.
create or replace function public.cce_public_submit_booking(
  p_request_type text,
  p_service_code text,
  p_customer_name text,
  p_phone text,
  p_requested_date date default null,
  p_start_time time default null,
  p_rider_level text default null,
  p_session_slots jsonb default '[]'::jsonb,
  p_horse_name text default null,
  p_personal_id text default null,
  p_emergency_contact text default null,
  p_birth_date date default null,
  p_health_notes text default null,
  p_services jsonb default '[]'::jsonb,
  p_metadata jsonb default '{}'::jsonb,
  p_terms_accepted boolean default false,
  p_terms_version text default '2026-07',
  p_honeypot text default null
)
returns jsonb
language plpgsql
security definer
set search_path=public,pg_temp
as $$
declare
  v_type text:=lower(trim(coalesce(p_request_type,'')));
  v_code text:=lower(trim(coalesce(p_service_code,'')));
  v_name text:=trim(coalesce(p_customer_name,''));
  v_phone text:=regexp_replace(coalesce(p_phone,''),'[^0-9]','','g');
  v_personal_id text:=nullif(trim(coalesce(p_personal_id,'')),'');
  v_emergency text:=nullif(trim(coalesce(p_emergency_contact,'')),'');
  v_health text:=nullif(trim(coalesce(p_health_notes,'')),'');
  v_horse text:=nullif(trim(coalesce(p_horse_name,'')),'');
  v_service public.public_booking_services%rowtype;
  v_slots jsonb:='[]'::jsonb;
  v_slot jsonb;
  v_date date;
  v_time time;
  v_first_date date;
  v_first_time time;
  v_end_time time;
  v_total bigint;
  v_reserved bigint;
  v_units integer;
  v_booking_id bigint;
  v_income_id bigint;
  v_notes text;
  v_today date:=(timezone('Asia/Bahrain',now()))::date;
begin
  if nullif(trim(coalesce(p_honeypot,'')),'') is not null then
    raise exception 'Booking request could not be accepted';
  end if;
  if not p_terms_accepted then
    raise exception 'Terms must be accepted';
  end if;
  if char_length(v_name) not between 2 and 120 then
    raise exception 'Customer name must contain 2 to 120 characters';
  end if;
  if v_phone !~ '^[0-9]{8}$' then
    raise exception 'A valid 8-digit Bahrain phone number is required';
  end if;
  if p_birth_date is not null and p_birth_date>v_today then
    raise exception 'Birth date cannot be in the future';
  end if;
  if v_personal_id is not null and char_length(v_personal_id)>40 then
    raise exception 'Personal ID is too long';
  end if;
  if v_emergency is not null and char_length(v_emergency)>32 then
    raise exception 'Emergency contact is too long';
  end if;
  if v_health is not null and char_length(v_health)>500 then
    raise exception 'Health information is too long';
  end if;
  if coalesce(trim(p_terms_version),'')<>'2026-07-v1' then
    raise exception 'Unsupported terms version';
  end if;
  if jsonb_typeof(coalesce(p_services,'[]'::jsonb))<>'array' or length(coalesce(p_services,'[]'::jsonb)::text)>4000 then
    raise exception 'Invalid services list';
  end if;
  if jsonb_typeof(coalesce(p_metadata,'{}'::jsonb))<>'object' or length(coalesce(p_metadata,'{}'::jsonb)::text)>5000 then
    raise exception 'Invalid request metadata';
  end if;

  select * into v_service
  from public.public_booking_services
  where code=v_code and request_type=v_type and active is true;
  if not found then
    raise exception 'Unknown or inactive booking service';
  end if;

  -- Serialize duplicate submissions from the same phone, then throttle retries.
  perform pg_advisory_xact_lock(hashtextextended('cce-public-rate:'||v_phone,0));
  if exists (
    select 1 from public.booking_requests
    where phone=v_phone and created_at>now()-interval '45 seconds'
  ) then
    raise exception 'Please wait before sending another booking request';
  end if;

  if v_type='ride' then
    if p_requested_date is null or p_start_time is null then
      raise exception 'Ride date and time are required';
    end if;
    if p_requested_date<v_today or p_requested_date>v_today+365 then
      raise exception 'Ride date is outside the allowed booking window';
    end if;
    if coalesce(p_rider_level,'') not in ('never','beginner','intermediate','advanced') then
      raise exception 'A valid rider level is required';
    end if;
    if v_personal_id is null or char_length(v_personal_id)<3 then
      raise exception 'Personal ID is required';
    end if;
    v_slots:=jsonb_build_array(jsonb_build_object(
      'date',p_requested_date,
      'time',to_char(p_start_time,'HH24:MI'),
      'duration_minutes',v_service.duration_minutes,
      'capacity_units',v_service.capacity_units
    ));
  elsif v_type='training' then
    if jsonb_typeof(coalesce(p_session_slots,'[]'::jsonb))<>'array'
       or jsonb_array_length(coalesce(p_session_slots,'[]'::jsonb))<>v_service.session_count then
      raise exception 'Training session count does not match the selected package';
    end if;
    if v_personal_id is null or char_length(v_personal_id)<3 then
      raise exception 'Personal ID is required';
    end if;
    for v_slot in select value from jsonb_array_elements(p_session_slots)
    loop
      begin
        v_date:=(v_slot->>'date')::date;
        v_time:=(v_slot->>'time')::time;
      exception when others then
        raise exception 'Training session date or time is invalid';
      end;
      if v_date<v_today or v_date>v_today+365 then
        raise exception 'Training date is outside the allowed booking window';
      end if;
      if not (to_char(v_time,'HH24:MI')=any(array[
        '08:00','08:45','09:30','10:15','11:00','11:45',
        '16:00','16:45','17:30','18:15','19:00','19:45'
      ]::text[])) then
        raise exception 'Training time is outside the available slots';
      end if;
      v_slots:=v_slots||jsonb_build_array(jsonb_build_object(
        'date',v_date,
        'time',to_char(v_time,'HH24:MI'),
        'duration_minutes',v_service.duration_minutes,
        'capacity_units',v_service.capacity_units
      ));
    end loop;
    if exists (
      select 1 from jsonb_array_elements(v_slots) slot
      group by slot->>'date',slot->>'time' having count(*)>1
    ) then
      raise exception 'Duplicate training session slots are not allowed';
    end if;
  elsif v_type='livery' then
    if v_horse is null or char_length(v_horse)>120 then
      raise exception 'Horse name is required';
    end if;
    if coalesce(p_requested_date,v_today)<v_today-1 or coalesce(p_requested_date,v_today)>v_today+365 then
      raise exception 'Livery start date is outside the allowed window';
    end if;
  else
    raise exception 'Unsupported booking request type';
  end if;

  if v_type in ('ride','training') then
    -- Lock each booking date in sorted order so overlapping public requests cannot race.
    for v_date in
      select distinct (slot->>'date')::date
      from jsonb_array_elements(v_slots) slot
      order by 1
    loop
      perform pg_advisory_xact_lock(hashtextextended('cce-public-capacity:'||v_date::text,0));
    end loop;

    for v_slot in select value from jsonb_array_elements(v_slots)
    loop
      v_date:=(v_slot->>'date')::date;
      v_time:=(v_slot->>'time')::time;
      v_units:=greatest(coalesce(nullif(v_slot->>'capacity_units','')::integer,1),1);
      v_total:=public.cce_public_eligible_horse_count();
      v_reserved:=public.cce_reserved_horse_units(
        v_date,v_time,greatest(coalesce(nullif(v_slot->>'duration_minutes','')::integer,45),1)
      );
      if v_total=0 or v_reserved+v_units>v_total then
        raise exception 'No horse capacity is available for % at %',v_date,to_char(v_time,'HH24:MI');
      end if;
    end loop;
  end if;

  if jsonb_array_length(v_slots)>0 then
    v_first_date:=((v_slots->0)->>'date')::date;
    v_first_time:=((v_slots->0)->>'time')::time;
    v_end_time:=(v_first_time+make_interval(mins=>v_service.duration_minutes))::time;
  else
    v_first_date:=coalesce(p_requested_date,v_today);
    v_first_time:=null;
    v_end_time:=null;
  end if;

  insert into public.booking_requests(
    request_type,service_code,service_name,customer_name,phone,horse_name,
    requested_date,start_time,end_time,rider_level,session_slots,services,
    request_metadata,status,amount_bd,terms_version,terms_accepted_at,payment_due_at
  ) values (
    v_type,v_service.code,v_service.display_name,v_name,v_phone,v_horse,
    v_first_date,v_first_time,v_end_time,nullif(trim(coalesce(p_rider_level,'')),''),
    v_slots,coalesce(p_services,'[]'::jsonb),coalesce(p_metadata,'{}'::jsonb),
    'Requested',v_service.price_bd,left(coalesce(nullif(trim(p_terms_version),''),'2026-07'),40),now(),
    now()+interval '24 hours'
  ) returning id into v_booking_id;

  if v_personal_id is not null or v_emergency is not null or p_birth_date is not null or v_health is not null then
    insert into public.booking_private_details(
      booking_request_id,personal_id,emergency_contact,birth_date,health_notes
    ) values (v_booking_id,v_personal_id,v_emergency,p_birth_date,v_health);
  end if;

  if v_type='ride' then
    v_notes:='BOOKING REQUEST — Ref #'||v_booking_id||' | Service: '||v_service.display_name||
      ' | Rider Level: '||p_rider_level;
  elsif v_type='training' then
    v_notes:='TRAINING REQUEST — Ref #'||v_booking_id||' | Package: '||v_service.display_name||
      ' | Sessions: '||(
        select string_agg('حصة '||ordinality||': '||(slot->>'date')||' @ '||(slot->>'time'),' | ' order by ordinality)
        from jsonb_array_elements(v_slots) with ordinality as rows(slot,ordinality)
      );
  else
    v_notes:='LIVERY REQUEST — Ref #'||v_booking_id||' | Horse: '||v_horse||
      ' | Service: '||v_service.display_name;
  end if;

  insert into public.income(
    date,start_time,end_time,customer_name,horse_name,activity,qty,
    amount_bd,paid_bd,notes,status,booking_request_id
  ) values (
    v_first_date,v_first_time,v_end_time,v_name,
    case when v_type='livery' then v_horse else null end,
    v_service.activity,
    case when v_type='training' then v_service.session_count else 1 end,
    v_service.price_bd,0,v_notes,'Pending',v_booking_id
  ) returning id into v_income_id;

  return jsonb_build_object(
    'booking_request_id',v_booking_id,
    'income_id',v_income_id,
    'request_type',v_type,
    'service_code',v_service.code,
    'service_name',v_service.display_name,
    'amount_bd',v_service.price_bd,
    'status','Requested',
    'payment_due_at',now()+interval '24 hours'
  );
end;
$$;

-- Cancels any 'Requested' booking whose 24-hour payment window has passed.
-- Cancelled requests drop out of cce_reserved_horse_units' counted statuses,
-- freeing the slot they were holding for other customers.
create or replace function public.cce_expire_stale_booking_requests()
returns integer
language plpgsql
security definer
set search_path=public,pg_temp
as $$
declare
  v_ids bigint[];
begin
  if not public.cce_has_permission('bookings.view') then
    raise exception 'Permission denied';
  end if;
  with expired as (
    update public.booking_requests
    set status='Cancelled'
    where status='Requested'
      and payment_due_at is not null
      and payment_due_at<now()
    returning id
  )
  select coalesce(array_agg(id),'{}') into v_ids from expired;
  if array_length(v_ids,1)>0 then
    insert into public.audit_logs(actor,action,table_name,record_id,before_data,after_data)
    select
      'System: payment deadline','update_status','booking_requests',x::text,
      jsonb_build_object('status','Requested'),
      jsonb_build_object('status','Cancelled','reason','Payment not received within 24 hours')
    from unnest(v_ids) as x;
  end if;
  return coalesce(array_length(v_ids,1),0);
end;
$$;

-- Expires stale requests first, then returns the current booking list —
-- the Bookings dashboard now calls this instead of selecting the table
-- directly, so opening the dashboard always reflects the deadline.
create or replace function public.cce_list_booking_requests()
returns setof public.booking_requests
language plpgsql
security definer
set search_path=public,pg_temp
as $$
begin
  if not public.cce_has_permission('bookings.view') then
    raise exception 'Permission denied';
  end if;
  perform public.cce_expire_stale_booking_requests();
  return query
    select * from public.booking_requests
    order by created_at desc
    limit 1500;
end;
$$;

revoke all on function public.cce_expire_stale_booking_requests() from public,anon;
revoke all on function public.cce_list_booking_requests() from public,anon;
grant execute on function public.cce_expire_stale_booking_requests() to authenticated;
grant execute on function public.cce_list_booking_requests() to authenticated;

comment on column public.booking_requests.payment_due_at is
  '24 hours after submission by default. A Requested booking past this deadline is auto-cancelled by cce_expire_stale_booking_requests.';
comment on function public.cce_expire_stale_booking_requests() is
  'Cancels Requested bookings past their payment_due_at deadline, freeing the horse capacity they held.';
comment on function public.cce_list_booking_requests() is
  'Expires stale unpaid booking requests, then returns the booking list for the dashboard.';

commit;
