-- CCE StableOS v4.27.0 — Horse Lease booking type
-- Adds a fourth public booking type: long-term horse lease requests. Unlike
-- Livery/Training/Ride, a lease has no fixed public price list — the
-- monthly price, farrier arrangement and trainer are negotiated by staff
-- per lease, so the public form only captures the lessee's interest and
-- contact/ID details; no payment deadline or income row is created at
-- request time. Staff later finalize the negotiated terms on the horse's
-- record (mirroring how Livery pricing is finalized via Edit Horse) and
-- can then print the Horse Lease Agreement contract.

begin;

do $$
begin
  if to_regclass('public.public_booking_services') is null
     or to_regclass('public.booking_requests') is null
     or to_regclass('public.horses') is null
     or to_regprocedure('public.cce_public_submit_booking(text,text,text,text,date,time,text,jsonb,text,text,text,date,text,jsonb,jsonb,boolean,text,text)') is null then
    raise exception 'CCE public booking foundation must be applied before this migration';
  end if;
end $$;

alter table public.public_booking_services drop constraint public_booking_services_request_type_check;
alter table public.public_booking_services add constraint public_booking_services_request_type_check
  check (request_type = any (array['ride'::text,'training'::text,'livery'::text,'lease'::text]));

alter table public.booking_requests drop constraint booking_requests_request_type_check;
alter table public.booking_requests add constraint booking_requests_request_type_check
  check (request_type = any (array['ride'::text,'training'::text,'livery'::text,'lease'::text]));

insert into public.public_booking_services(code,request_type,activity,display_name,price_bd,duration_minutes,session_count,capacity_units,active)
values('lease_request','lease','Lease Inquiry','Horse Lease Request',0,30,1,1,true)
on conflict (code) do update set
  active=true,request_type=excluded.request_type,activity=excluded.activity,display_name=excluded.display_name,
  price_bd=excluded.price_bd,duration_minutes=excluded.duration_minutes,session_count=excluded.session_count,
  capacity_units=excluded.capacity_units,updated_at=now();

alter table public.horses
  add column if not exists lease_active boolean not null default false,
  add column if not exists lease_customer_name text,
  add column if not exists lease_cpr text,
  add column if not exists lease_address text,
  add column if not exists lease_mobile text,
  add column if not exists lease_monthly_price numeric not null default 0,
  add column if not exists lease_farrier_share text,
  add column if not exists lease_farrier_weeks integer,
  add column if not exists lease_farrier_name text,
  add column if not exists lease_trainer_name text,
  add column if not exists lease_start_date date;

create or replace function public.cce_public_submit_booking(
  p_request_type text, p_service_code text, p_customer_name text, p_phone text,
  p_requested_date date default null::date, p_start_time time without time zone default null::time without time zone,
  p_rider_level text default null::text, p_session_slots jsonb default '[]'::jsonb, p_horse_name text default null::text,
  p_personal_id text default null::text, p_emergency_contact text default null::text, p_birth_date date default null::date,
  p_health_notes text default null::text, p_services jsonb default '[]'::jsonb, p_metadata jsonb default '{}'::jsonb,
  p_terms_accepted boolean default false, p_terms_version text default '2026-07'::text, p_honeypot text default null::text
)
returns jsonb
language plpgsql
security definer
set search_path to 'public', 'pg_temp'
as $function$
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
  v_payment_due timestamptz;
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
  elsif v_type='lease' then
    if v_personal_id is null or char_length(v_personal_id)<3 then
      raise exception 'Personal ID is required';
    end if;
    if v_horse is not null and char_length(v_horse)>120 then
      raise exception 'Preferred horse name is too long';
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

  v_payment_due:=case when v_type='lease' then null else now()+interval '24 hours' end;

  insert into public.booking_requests(
    request_type,service_code,service_name,customer_name,phone,horse_name,
    requested_date,start_time,end_time,rider_level,session_slots,services,
    request_metadata,status,amount_bd,terms_version,terms_accepted_at,payment_due_at
  ) values (
    v_type,v_service.code,v_service.display_name,v_name,v_phone,v_horse,
    v_first_date,v_first_time,v_end_time,nullif(trim(coalesce(p_rider_level,'')),''),
    v_slots,coalesce(p_services,'[]'::jsonb),coalesce(p_metadata,'{}'::jsonb),
    'Requested',v_service.price_bd,left(coalesce(nullif(trim(p_terms_version),''),'2026-07'),40),now(),
    v_payment_due
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
  elsif v_type='livery' then
    v_notes:='LIVERY REQUEST — Ref #'||v_booking_id||' | Horse: '||v_horse||
      ' | Service: '||v_service.display_name;
  else
    v_notes:='LEASE REQUEST — Ref #'||v_booking_id||' | Preferred horse: '||coalesce(v_horse,'Any available');
  end if;

  if v_type<>'lease' then
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
  end if;

  return jsonb_build_object(
    'booking_request_id',v_booking_id,
    'income_id',v_income_id,
    'request_type',v_type,
    'service_code',v_service.code,
    'service_name',v_service.display_name,
    'amount_bd',v_service.price_bd,
    'status','Requested',
    'payment_due_at',v_payment_due
  );
end;
$function$;

commit;
