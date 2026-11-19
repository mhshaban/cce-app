-- v4.41.0 Lesson income + booking in one step.
-- Staff choose Category = Lesson in the income form and fill the same
-- details as the public Training Packages form (package, rider details,
-- session dates/times). This RPC creates the booking request and its
-- protected details; the app then saves the income row linked to it
-- (income.booking_request_id), so income triggers/audit stay unchanged.
-- Differences from cce_public_submit_booking (staff entry, not public):
--   * needs bookings.create + income.create
--   * past dates and any HH:MM time allowed (recording lessons already given)
--   * no rate limit, no 24h payment deadline, status starts as Confirmed
--   * phone / personal ID optional; amount defaults to the package price

create or replace function public.cce_admin_create_training_booking(
  p_service_code text,
  p_customer_name text,
  p_phone text default null,
  p_session_slots jsonb default '[]'::jsonb,
  p_horse_name text default null,
  p_personal_id text default null,
  p_emergency_contact text default null,
  p_birth_date date default null,
  p_health_notes text default null,
  p_amount_bd numeric default null
) returns jsonb
language plpgsql
security definer
set search_path to 'public','pg_temp'
as $function$
declare
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
  v_amount numeric;
  v_booking_id bigint;
begin
  if not public.cce_has_permission('bookings.create')
     or not public.cce_has_permission('income.create') then
    raise exception 'Permission denied';
  end if;
  if char_length(v_name) not between 2 and 120 then
    raise exception 'Customer name must contain 2 to 120 characters';
  end if;
  if v_phone<>'' and v_phone !~ '^[0-9]{8}$' then
    raise exception 'Phone number must be 8 digits';
  end if;
  if p_birth_date is not null and p_birth_date>(timezone('Asia/Bahrain',now()))::date then
    raise exception 'Birth date cannot be in the future';
  end if;
  if char_length(coalesce(v_personal_id,''))>40 then raise exception 'Personal ID is too long'; end if;
  if char_length(coalesce(v_emergency,''))>32 then raise exception 'Emergency contact is too long'; end if;
  if char_length(coalesce(v_health,''))>500 then raise exception 'Health information is too long'; end if;
  if char_length(coalesce(v_horse,''))>120 then raise exception 'Horse name is too long'; end if;

  select * into v_service
  from public.public_booking_services
  where code=v_code and request_type='training' and active is true;
  if not found then raise exception 'Unknown or inactive training package'; end if;

  if jsonb_typeof(coalesce(p_session_slots,'[]'::jsonb))<>'array'
     or jsonb_array_length(coalesce(p_session_slots,'[]'::jsonb))<>v_service.session_count then
    raise exception 'Training session count does not match the selected package';
  end if;
  for v_slot in select value from jsonb_array_elements(p_session_slots)
  loop
    begin
      v_date:=(v_slot->>'date')::date;
      v_time:=(v_slot->>'time')::time;
    exception when others then
      raise exception 'Training session date or time is invalid';
    end;
    if v_date is null or v_time is null then
      raise exception 'Training session date or time is invalid';
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

  v_first_date:=((v_slots->0)->>'date')::date;
  v_first_time:=((v_slots->0)->>'time')::time;
  v_amount:=coalesce(p_amount_bd,v_service.price_bd);
  if v_amount<0 then raise exception 'Amount cannot be negative'; end if;

  insert into public.booking_requests(
    request_type,service_code,service_name,customer_name,phone,horse_name,
    requested_date,start_time,end_time,rider_level,session_slots,services,
    request_metadata,status,amount_bd,terms_version,terms_accepted_at,payment_due_at
  ) values (
    'training',v_service.code,v_service.display_name,v_name,v_phone,v_horse,
    v_first_date,v_first_time,(v_first_time+make_interval(mins=>v_service.duration_minutes))::time,null,
    v_slots,'[]'::jsonb,jsonb_build_object('source','staff','created_by',auth.uid()),
    'Confirmed',v_amount,'staff-entry',now(),null
  ) returning id into v_booking_id;

  if v_personal_id is not null or v_emergency is not null or p_birth_date is not null or v_health is not null then
    insert into public.booking_private_details(
      booking_request_id,personal_id,emergency_contact,birth_date,health_notes
    ) values (v_booking_id,v_personal_id,v_emergency,p_birth_date,v_health);
  end if;

  insert into public.audit_logs(actor,action,table_name,record_id,before_data,after_data)
  values(
    'User: '||coalesce(auth.uid()::text,'unknown'),
    'staff_create_training_booking','booking_requests',v_booking_id::text,
    null,jsonb_build_object('service_code',v_service.code,'customer_name',v_name,'sessions',jsonb_array_length(v_slots))
  );

  return jsonb_build_object(
    'booking_request_id',v_booking_id,
    'service_code',v_service.code,
    'service_name',v_service.display_name,
    'session_count',v_service.session_count,
    'amount_bd',v_amount,
    'session_slots',v_slots,
    'status','Confirmed'
  );
end;
$function$;

revoke all on function public.cce_admin_create_training_booking(text,text,text,jsonb,text,text,text,date,text,numeric) from public,anon;
grant execute on function public.cce_admin_create_training_booking(text,text,text,jsonb,text,text,text,date,text,numeric) to authenticated;
