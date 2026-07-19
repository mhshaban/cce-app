-- CCE StableOS v4.7.0 — Security & Database Foundation
--
-- This migration is intentionally additive and transactional. It:
--   * makes self-created Auth profiles inactive and role-less by default;
--   * moves public booking intake out of finance notes;
--   * validates price, dates, slots and capacity inside one database transaction;
--   * removes direct anonymous INSERT access to income;
--   * scopes horse-health RLS by event scope;
--   * recomputes legacy horse health summaries after insert/update/delete;
--   * adds durable created_at/updated_at timestamps to operational rows.

begin;

do $$
begin
  if to_regclass('public.income') is null then
    raise exception 'public.income is missing; restore the legacy core schema before v4.7.0';
  end if;
  if to_regclass('public.expenses') is null then
    raise exception 'public.expenses is missing; restore the legacy core schema before v4.7.0';
  end if;
  if to_regclass('public.horses') is null then
    raise exception 'public.horses is missing; restore the legacy core schema before v4.7.0';
  end if;
  if to_regclass('public.schedule') is null then
    raise exception 'public.schedule is missing; restore the legacy core schema before v4.7.0';
  end if;
  if to_regclass('public.profiles') is null
     or to_regclass('public.app_permissions') is null
     or to_regclass('public.app_roles') is null
     or to_regclass('public.role_permissions') is null then
    raise exception 'Unified member portal migrations must be applied before v4.7.0';
  end if;
  if to_regclass('public.horse_health_events') is null
     or to_regclass('public.horse_health_profiles') is null then
    raise exception 'Database consolidation migration must be applied before v4.7.0';
  end if;
  if to_regclass('public.audit_logs') is null
     or to_regprocedure('public.cce_touch_updated_at()') is null
     or to_regprocedure('public.cce_is_booking_record(text)') is null
     or to_regprocedure('public.cce_has_permission(text)') is null then
    raise exception 'Unified member portal database helpers are missing before v4.7.0';
  end if;
end $$;

-- ---------------------------------------------------------------------------
-- 1) Durable operation timestamps
-- ---------------------------------------------------------------------------
alter table public.income add column if not exists created_at timestamptz;
alter table public.income add column if not exists updated_at timestamptz;
update public.income
set created_at=coalesce(created_at,date::timestamp at time zone 'Asia/Bahrain',now()),
    updated_at=coalesce(updated_at,created_at,date::timestamp at time zone 'Asia/Bahrain',now())
where created_at is null or updated_at is null;
alter table public.income alter column created_at set default now();
alter table public.income alter column updated_at set default now();
alter table public.income alter column created_at set not null;
alter table public.income alter column updated_at set not null;

alter table public.expenses add column if not exists created_at timestamptz;
alter table public.expenses add column if not exists updated_at timestamptz;
update public.expenses
set created_at=coalesce(created_at,date::timestamp at time zone 'Asia/Bahrain',now()),
    updated_at=coalesce(updated_at,created_at,date::timestamp at time zone 'Asia/Bahrain',now())
where created_at is null or updated_at is null;
alter table public.expenses alter column created_at set default now();
alter table public.expenses alter column updated_at set default now();
alter table public.expenses alter column created_at set not null;
alter table public.expenses alter column updated_at set not null;

alter table public.schedule add column if not exists created_at timestamptz;
alter table public.schedule add column if not exists updated_at timestamptz;
update public.schedule
set created_at=coalesce(created_at,date::timestamp at time zone 'Asia/Bahrain',now()),
    updated_at=coalesce(updated_at,created_at,date::timestamp at time zone 'Asia/Bahrain',now())
where created_at is null or updated_at is null;
alter table public.schedule alter column created_at set default now();
alter table public.schedule alter column updated_at set default now();
alter table public.schedule alter column created_at set not null;
alter table public.schedule alter column updated_at set not null;

drop trigger if exists income_touch_updated_at on public.income;
create trigger income_touch_updated_at before update on public.income
for each row execute function public.cce_touch_updated_at();
drop trigger if exists expenses_touch_updated_at on public.expenses;
create trigger expenses_touch_updated_at before update on public.expenses
for each row execute function public.cce_touch_updated_at();
drop trigger if exists schedule_touch_updated_at on public.schedule;
create trigger schedule_touch_updated_at before update on public.schedule
for each row execute function public.cce_touch_updated_at();

-- ---------------------------------------------------------------------------
-- 2) Closed-by-default member provisioning
-- ---------------------------------------------------------------------------
alter table public.profiles alter column is_active set default false;

create or replace function public.cce_handle_new_auth_user()
returns trigger
language plpgsql
security definer
set search_path=public,pg_temp
as $$
begin
  -- Accounts created through the public Auth API never receive an active role.
  -- The guarded admin-users Edge Function activates and assigns an approved role.
  insert into public.profiles(id,email,full_name,phone,role_id,is_active)
  values(
    new.id,
    new.email,
    coalesce(new.raw_user_meta_data->>'full_name',''),
    new.phone,
    null,
    false
  )
  on conflict (id) do update set email=excluded.email;
  return new;
end;
$$;

revoke all on function public.cce_handle_new_auth_user() from public;

-- ---------------------------------------------------------------------------
-- 3) Public service catalog and separated booking intake
-- ---------------------------------------------------------------------------
insert into public.app_permissions(code,category,name_en,name_ar) values
('bookings.sensitive.view','Bookings','View protected rider safety details','عرض بيانات سلامة الراكب المحمية'),
('bookings.sensitive.manage','Bookings','Manage protected rider safety details','إدارة بيانات سلامة الراكب المحمية')
on conflict(code) do update set
  category=excluded.category,name_en=excluded.name_en,name_ar=excluded.name_ar;

insert into public.role_permissions(role_id,permission_code,allowed)
select r.id,p.code,true
from public.app_roles r
join public.app_permissions p on p.code in ('bookings.sensitive.view','bookings.sensitive.manage')
where r.code in ('super_admin','manager')
on conflict(role_id,permission_code) do update set allowed=true;

create table if not exists public.public_booking_services (
  code text primary key,
  request_type text not null check (request_type in ('ride','training','livery')),
  activity text not null,
  display_name text not null,
  price_bd numeric(12,3) not null check (price_bd>=0),
  duration_minutes integer not null default 30 check (duration_minutes between 1 and 720),
  session_count integer not null default 1 check (session_count between 1 and 32),
  capacity_units integer not null default 1 check (capacity_units between 1 and 20),
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

insert into public.public_booking_services(
  code,request_type,activity,display_name,price_bd,duration_minutes,session_count,capacity_units,active
) values
('ride_half_hour','ride','Half Hour Ride','Half Hour Ride',5.000,30,1,1,true),
('ride_one_hour','ride','1 Hour Hack Ride','1 Hour Hack Ride',7.000,60,1,1,true),
('ride_photo','ride','Photo Session + Ride','Photo Session + Ride',10.000,30,1,1,true),
('ride_family','ride','Family Package','Family Package',22.000,30,1,4,true),
('training_single','training','Lesson','Single Session',10.000,45,1,1,true),
('training_4','training','Lesson','4 Sessions Package',35.000,45,4,1,true),
('training_8','training','Lesson','8 Sessions Package',70.000,45,8,1,true),
('training_12','training','Lesson','12 Sessions Package',100.000,45,12,1,true),
('livery_full','livery','Livery','Full Livery',80.000,1,1,1,true),
('livery_ac','livery','Livery','AC Livery',150.000,1,1,1,true)
on conflict(code) do update set
  request_type=excluded.request_type,
  activity=excluded.activity,
  display_name=excluded.display_name,
  price_bd=excluded.price_bd,
  duration_minutes=excluded.duration_minutes,
  session_count=excluded.session_count,
  capacity_units=excluded.capacity_units,
  active=excluded.active,
  updated_at=now();

create table if not exists public.booking_requests (
  id bigint generated by default as identity primary key,
  request_type text not null check (request_type in ('ride','training','livery')),
  service_code text not null references public.public_booking_services(code) on update cascade,
  service_name text not null,
  customer_name text not null,
  phone text not null,
  horse_name text,
  requested_date date not null,
  start_time time,
  end_time time,
  rider_level text,
  session_slots jsonb not null default '[]'::jsonb check (jsonb_typeof(session_slots)='array'),
  services jsonb not null default '[]'::jsonb check (jsonb_typeof(services)='array'),
  request_metadata jsonb not null default '{}'::jsonb check (jsonb_typeof(request_metadata)='object'),
  status text not null default 'Requested' check (status in ('Requested','Confirmed','Scheduled','Completed','Cancelled','Rejected')),
  amount_bd numeric(12,3) not null check (amount_bd>=0),
  terms_version text not null,
  terms_accepted_at timestamptz not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.booking_private_details (
  booking_request_id bigint primary key references public.booking_requests(id) on delete cascade,
  personal_id text,
  emergency_contact text,
  birth_date date,
  health_notes text,
  retention_expires_at timestamptz not null default (now()+interval '180 days'),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.income add column if not exists booking_request_id bigint;
do $$
begin
  if not exists (
    select 1 from pg_constraint
    where conname='income_booking_request_id_fkey'
      and conrelid='public.income'::regclass
  ) then
    alter table public.income
      add constraint income_booking_request_id_fkey
      foreign key (booking_request_id) references public.booking_requests(id) on delete set null;
  end if;
end $$;

create unique index if not exists income_booking_request_id_uidx
  on public.income(booking_request_id) where booking_request_id is not null;
create index if not exists booking_requests_created_idx on public.booking_requests(created_at desc);
create index if not exists booking_requests_phone_created_idx on public.booking_requests(phone,created_at desc);
create index if not exists booking_requests_slot_gin_idx on public.booking_requests using gin(session_slots);
create index if not exists booking_requests_status_idx on public.booking_requests(status,requested_date);

drop trigger if exists public_booking_services_touch on public.public_booking_services;
create trigger public_booking_services_touch before update on public.public_booking_services
for each row execute function public.cce_touch_updated_at();
drop trigger if exists booking_requests_touch on public.booking_requests;
create trigger booking_requests_touch before update on public.booking_requests
for each row execute function public.cce_touch_updated_at();
drop trigger if exists booking_private_details_touch on public.booking_private_details;
create trigger booking_private_details_touch before update on public.booking_private_details
for each row execute function public.cce_touch_updated_at();

alter table public.public_booking_services enable row level security;
alter table public.booking_requests enable row level security;
alter table public.booking_private_details enable row level security;

revoke all on public.public_booking_services,public.booking_requests,public.booking_private_details from anon,authenticated;
grant select,insert,update,delete on public.public_booking_services to authenticated;
grant select on public.booking_requests to authenticated;

drop policy if exists cce_booking_services_select on public.public_booking_services;
create policy cce_booking_services_select on public.public_booking_services for select to authenticated
using (public.cce_has_permission('bookings.view') or public.cce_has_permission('settings.manage'));
drop policy if exists cce_booking_services_manage on public.public_booking_services;
create policy cce_booking_services_manage on public.public_booking_services for all to authenticated
using (public.cce_has_permission('settings.manage'))
with check (public.cce_has_permission('settings.manage'));

drop policy if exists cce_booking_requests_select on public.booking_requests;
create policy cce_booking_requests_select on public.booking_requests for select to authenticated
using (public.cce_has_permission('bookings.view'));
drop policy if exists cce_booking_requests_insert on public.booking_requests;
drop policy if exists cce_booking_requests_update on public.booking_requests;
drop policy if exists cce_booking_requests_delete on public.booking_requests;

drop policy if exists cce_booking_private_select on public.booking_private_details;
drop policy if exists cce_booking_private_insert on public.booking_private_details;
drop policy if exists cce_booking_private_update on public.booking_private_details;
drop policy if exists cce_booking_private_delete on public.booking_private_details;

-- Anonymous callers may submit only through the validated transaction RPC.
drop policy if exists income_public_request_insert on public.income;
drop policy if exists cce_income_public_insert on public.income;
revoke insert on public.income from anon;
do $$
declare v_income_seq text;
begin
  v_income_seq:=pg_get_serial_sequence('public.income','id');
  if v_income_seq is not null then
    execute format('revoke usage,select on sequence %s from anon',v_income_seq);
  end if;
end $$;

-- ---------------------------------------------------------------------------
-- 4) Capacity helpers and atomic public submission
-- ---------------------------------------------------------------------------
create or replace function public.cce_public_eligible_horse_count()
returns bigint
language sql
stable
security definer
set search_path=public,pg_temp
as $$
  select count(*)::bigint
  from public.horses h
  left join public.horse_health_profiles hp on hp.horse_id=h.id
  where lower(trim(coalesce(h.owner,'')))='cc'
    and lower(trim(coalesce(h.status,'')))='available'
    and h.horse_name is not null
    and coalesce(hp.health_status,'Healthy') in ('Healthy','Training');
$$;

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
    where s.date::date=p_date
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

create or replace function public.cce_public_ride_capacity(
  p_date date default null,
  p_start_time time default null,
  p_duration_minutes integer default 30
)
returns table(total_horses bigint,reserved_horses bigint,available_horses bigint)
language sql
stable
security definer
set search_path=public,pg_temp
as $$
  select total,
    least(case when p_date is null or p_start_time is null then 0 else reserved end,total),
    greatest(total-(case when p_date is null or p_start_time is null then 0 else reserved end),0::bigint)
  from (
    select public.cce_public_eligible_horse_count() as total,
      case when p_date is null or p_start_time is null then 0::bigint
           else public.cce_reserved_horse_units(p_date,p_start_time,p_duration_minutes) end as reserved
  ) counts;
$$;

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
    request_metadata,status,amount_bd,terms_version,terms_accepted_at
  ) values (
    v_type,v_service.code,v_service.display_name,v_name,v_phone,v_horse,
    v_first_date,v_first_time,v_end_time,nullif(trim(coalesce(p_rider_level,'')),''),
    v_slots,coalesce(p_services,'[]'::jsonb),coalesce(p_metadata,'{}'::jsonb),
    'Requested',v_service.price_bd,left(coalesce(nullif(trim(p_terms_version),''),'2026-07'),40),now()
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
    'status','Requested'
  );
end;
$$;

create or replace function public.cce_update_booking_status(
  p_booking_request_id bigint,
  p_status text
)
returns jsonb
language plpgsql
security definer
set search_path=public,pg_temp
as $$
declare
  v_old_status text;
  v_new_status text:=initcap(lower(trim(coalesce(p_status,''))));
  v_result jsonb;
begin
  if not public.cce_has_permission('bookings.update') then
    raise exception 'Permission denied';
  end if;
  if v_new_status not in ('Requested','Confirmed','Scheduled','Completed','Cancelled','Rejected') then
    raise exception 'Invalid booking status';
  end if;

  select status into v_old_status
  from public.booking_requests
  where id=p_booking_request_id
  for update;
  if not found then raise exception 'Booking request not found'; end if;

  if v_old_status<>v_new_status and not (
    (v_old_status='Requested' and v_new_status in ('Confirmed','Cancelled','Rejected'))
    or (v_old_status='Confirmed' and v_new_status in ('Requested','Scheduled','Completed','Cancelled'))
    or (v_old_status='Scheduled' and v_new_status in ('Confirmed','Completed','Cancelled'))
    or (v_old_status in ('Completed','Cancelled','Rejected') and v_new_status='Requested')
  ) then
    raise exception 'Invalid booking status transition from % to %',v_old_status,v_new_status;
  end if;

  update public.booking_requests
  set status=v_new_status
  where id=p_booking_request_id
  returning jsonb_build_object('id',id,'status',status,'updated_at',updated_at) into v_result;

  if v_old_status<>v_new_status then
    insert into public.audit_logs(actor,action,table_name,record_id,before_data,after_data)
    values(
      'User: '||coalesce(auth.uid()::text,'unknown'),
      'update_status','booking_requests',p_booking_request_id::text,
      jsonb_build_object('status',v_old_status),jsonb_build_object('status',v_new_status)
    );
  end if;
  return v_result;
end;
$$;

create or replace function public.cce_booking_private_details(p_booking_request_id bigint)
returns jsonb
language plpgsql
security definer
set search_path=public,pg_temp
as $$
declare v_result jsonb;
begin
  if not public.cce_has_permission('bookings.sensitive.view') then
    raise exception 'Permission denied';
  end if;
  select jsonb_build_object(
    'booking_request_id',br.id,
    'customer_name',br.customer_name,
    'phone',br.phone,
    'personal_id',pd.personal_id,
    'emergency_contact',pd.emergency_contact,
    'birth_date',pd.birth_date,
    'health_notes',pd.health_notes,
    'retention_expires_at',pd.retention_expires_at
  ) into v_result
  from public.booking_requests br
  left join public.booking_private_details pd
    on pd.booking_request_id=br.id and pd.retention_expires_at>now()
  where br.id=p_booking_request_id;
  if v_result is not null then
    insert into public.audit_logs(actor,action,table_name,record_id,after_data)
    values(
      'User: '||coalesce(auth.uid()::text,'unknown'),
      'read_sensitive','booking_private_details',p_booking_request_id::text,
      jsonb_build_object('access','protected rider safety details')
    );
  end if;
  return v_result;
end;
$$;

revoke all on function public.cce_public_eligible_horse_count() from public;
revoke all on function public.cce_reserved_horse_units(date,time,integer) from public;
revoke all on function public.cce_public_ride_capacity(date,time,integer) from public;
revoke all on function public.cce_public_submit_booking(text,text,text,text,date,time,text,jsonb,text,text,text,date,text,jsonb,jsonb,boolean,text,text) from public;
revoke all on function public.cce_update_booking_status(bigint,text) from public;
revoke all on function public.cce_booking_private_details(bigint) from public;
grant execute on function public.cce_public_ride_capacity(date,time,integer) to anon,authenticated;
grant execute on function public.cce_public_submit_booking(text,text,text,text,date,time,text,jsonb,text,text,text,date,text,jsonb,jsonb,boolean,text,text) to anon,authenticated;
grant execute on function public.cce_update_booking_status(bigint,text) to authenticated;
grant execute on function public.cce_booking_private_details(bigint) to authenticated;

-- ---------------------------------------------------------------------------
-- 5) Scope-aware RLS for the consolidated horse-health event table
-- ---------------------------------------------------------------------------
-- Remove the historical global event-view grant from broad operational roles;
-- their existing medical/vaccination/care view permissions remain effective.
update public.role_permissions rp
set allowed=false
from public.app_roles r
where rp.role_id=r.id
  and r.code in ('trainer','staff')
  and rp.permission_code='horse_events.view';

-- Trainers and generic staff should not manage medical records by default.
update public.role_permissions rp
set allowed=false
from public.app_roles r
where rp.role_id=r.id
  and r.code in ('trainer','staff')
  and rp.permission_code='horse_medical.manage';

drop policy if exists cce_hhe_select on public.horse_health_events;
create policy cce_hhe_select on public.horse_health_events for select to authenticated
using (
  public.cce_has_permission('horse_events.view')
  or (event_scope='medical' and public.cce_has_permission('horse_medical.view'))
  or (event_scope='vaccination' and public.cce_has_permission('horse_vaccinations.view'))
  or (event_scope='care' and public.cce_has_permission('horse_care.view'))
);

drop policy if exists cce_hhe_insert on public.horse_health_events;
create policy cce_hhe_insert on public.horse_health_events for insert to authenticated
with check (
  public.cce_has_permission('horse_events.manage')
  or (event_scope='medical' and public.cce_has_permission('horse_medical.manage'))
  or (event_scope='vaccination' and public.cce_has_permission('horse_vaccinations.manage'))
  or (event_scope='care' and public.cce_has_permission('horse_care.manage'))
);

drop policy if exists cce_hhe_update on public.horse_health_events;
create policy cce_hhe_update on public.horse_health_events for update to authenticated
using (
  public.cce_has_permission('horse_events.manage')
  or (event_scope='medical' and public.cce_has_permission('horse_medical.manage'))
  or (event_scope='vaccination' and public.cce_has_permission('horse_vaccinations.manage'))
  or (event_scope='care' and public.cce_has_permission('horse_care.manage'))
)
with check (
  public.cce_has_permission('horse_events.manage')
  or (event_scope='medical' and public.cce_has_permission('horse_medical.manage'))
  or (event_scope='vaccination' and public.cce_has_permission('horse_vaccinations.manage'))
  or (event_scope='care' and public.cce_has_permission('horse_care.manage'))
);

drop policy if exists cce_hhe_delete on public.horse_health_events;
create policy cce_hhe_delete on public.horse_health_events for delete to authenticated
using (
  public.cce_has_permission('horse_events.manage')
  or (event_scope='medical' and public.cce_has_permission('horse_medical.manage'))
  or (event_scope='vaccination' and public.cce_has_permission('horse_vaccinations.manage'))
  or (event_scope='care' and public.cce_has_permission('horse_care.manage'))
);

-- ---------------------------------------------------------------------------
-- 6) Rebuildable horse health summaries
-- ---------------------------------------------------------------------------
-- Preserve legacy horse summary dates as canonical historical events before
-- the recompute trigger is allowed to clear a summary with no remaining event.
insert into public.horse_health_events(
  horse_id,event_scope,event_type,event_date,title,status,priority,severity,
  assigned_to,completed_at,source_table,source_id,notes
)
select h.id,'care','Farrier',h.farrier_date,'Legacy farrier summary','Completed','Normal','None',
  h.farrier_name,h.farrier_date::timestamp at time zone 'Asia/Bahrain',
  'horses_legacy_farrier',h.id,'Imported from horses.farrier_date by v4.7.0'
from public.horses h
where h.farrier_date is not null
on conflict(source_table,source_id) do nothing;

insert into public.horse_health_events(
  horse_id,event_scope,event_type,event_date,title,status,priority,severity,
  completed_at,source_table,source_id,notes
)
select h.id,'medical','Dental',h.teeth_date,'Legacy dental summary','Completed','Normal','None',
  h.teeth_date::timestamp at time zone 'Asia/Bahrain',
  'horses_legacy_dental',h.id,'Imported from horses.teeth_date by v4.7.0'
from public.horses h
where h.teeth_date is not null
on conflict(source_table,source_id) do nothing;

insert into public.horse_health_events(
  horse_id,event_scope,event_type,event_date,title,status,priority,severity,
  completed_at,source_table,source_id,notes
)
select h.id,'care','Deworming',h.deworm_date,'Legacy deworming summary','Completed','Normal','None',
  h.deworm_date::timestamp at time zone 'Asia/Bahrain',
  'horses_legacy_deworming',h.id,'Imported from horses.deworm_date by v4.7.0'
from public.horses h
where h.deworm_date is not null
on conflict(source_table,source_id) do nothing;

insert into public.horse_health_events(
  horse_id,event_scope,event_type,event_date,title,status,priority,severity,
  veterinarian,completed_at,source_table,source_id,notes
)
select h.id,'vaccination','Vaccination',h.vaccine_date,'Legacy vaccination summary','Completed','Normal','None',
  h.vaccine_dr,h.vaccine_date::timestamp at time zone 'Asia/Bahrain',
  'horses_legacy_vaccination',h.id,'Imported from horses.vaccine_date by v4.7.0'
from public.horses h
where h.vaccine_date is not null
on conflict(source_table,source_id) do nothing;

insert into public.horse_health_events(
  horse_id,event_scope,event_type,event_date,title,status,priority,severity,
  medication,completed_at,source_table,source_id,notes
)
select h.id,'medical','Medication',h.med_date,coalesce(nullif(trim(h.medicant),''),'Legacy medication summary'),
  'Completed','Normal','None',h.medicant,h.med_date::timestamp at time zone 'Asia/Bahrain',
  'horses_legacy_medication',h.id,'Imported from horses.med_date by v4.7.0'
from public.horses h
where h.med_date is not null
on conflict(source_table,source_id) do nothing;

create or replace function public.cce_prepare_health_event_completion()
returns trigger
language plpgsql
set search_path=public,pg_temp
as $$
begin
  if new.status='Completed' and new.completed_at is null then
    new.completed_at=now();
  elsif new.status<>'Completed' and tg_op='UPDATE' and old.status='Completed' then
    new.completed_at=null;
  end if;
  return new;
end;
$$;

drop trigger if exists cce_health_event_prepare_completion on public.horse_health_events;
create trigger cce_health_event_prepare_completion
before insert or update of status,completed_at on public.horse_health_events
for each row execute function public.cce_prepare_health_event_completion();

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

-- Recompute every supported summary once after the legacy backfill.
do $$
declare v_horse record; v_type text;
begin
  for v_horse in select id from public.horses loop
    foreach v_type in array array['Farrier','Dental','Deworming','Vaccination','Medication'] loop
      perform public.cce_recompute_horse_health_summary(v_horse.id,v_type);
    end loop;
  end loop;
end $$;

revoke all on function public.cce_prepare_health_event_completion() from public;
revoke all on function public.cce_recompute_horse_health_summary(bigint,text) from public;
revoke all on function public.cce_recompute_health_summary_after_change() from public;

comment on table public.booking_private_details is
  'Protected rider identification, emergency and health intake. Not part of finance records.';
comment on function public.cce_public_submit_booking(text,text,text,text,date,time,text,jsonb,text,text,text,date,text,jsonb,jsonb,boolean,text,text) is
  'Validates and atomically stores a public ride, training or livery request at server-owned prices.';
comment on function public.cce_recompute_horse_health_summary(bigint,text) is
  'Rebuilds a legacy horse summary field from the latest completed canonical health event.';

commit;
