-- CCE StableOS v4.7.0 — post-migration verification (read-only)

select
  to_regclass('public.booking_requests') is not null as booking_requests_installed,
  to_regclass('public.booking_private_details') is not null as private_details_installed,
  to_regclass('public.public_booking_services') is not null as service_catalog_installed,
  to_regprocedure('public.cce_public_submit_booking(text,text,text,text,date,time,text,jsonb,text,text,text,date,text,jsonb,jsonb,boolean,text,text)') is not null as submit_rpc_installed,
  to_regprocedure('public.cce_update_booking_status(bigint,text)') is not null as status_rpc_installed,
  to_regprocedure('public.cce_booking_private_details(bigint)') is not null as private_rpc_installed;

select
  has_table_privilege('anon','public.income','INSERT') as anon_can_insert_income,
  has_function_privilege('anon','public.cce_public_submit_booking(text,text,text,text,date,time,text,jsonb,text,text,text,date,text,jsonb,jsonb,boolean,text,text)','EXECUTE') as anon_can_submit_validated_booking,
  has_table_privilege('authenticated','public.booking_private_details','SELECT') as authenticated_can_directly_read_private_details;

select column_default as profiles_is_active_default
from information_schema.columns
where table_schema='public' and table_name='profiles' and column_name='is_active';

select tgname as trigger_name,tgenabled as enabled
from pg_trigger
where tgrelid='public.horse_health_events'::regclass
  and not tgisinternal
order by tgname;

select schemaname,tablename,policyname,cmd
from pg_policies
where schemaname='public'
  and tablename in ('booking_requests','booking_private_details','horse_health_events')
order by tablename,policyname;

-- Every result below should be zero.
select
  count(*) filter (where i.id is null) as booking_requests_without_income,
  count(*) filter (where i.amount_bd<>br.amount_bd) as booking_income_amount_mismatch,
  count(*) filter (where i.customer_name<>br.customer_name) as booking_income_customer_mismatch
from public.booking_requests br
left join public.income i on i.booking_request_id=br.id;

select
  count(*) filter (where created_at is null or updated_at is null) as income_missing_timestamps
from public.income;
select
  count(*) filter (where created_at is null or updated_at is null) as expenses_missing_timestamps
from public.expenses;
select
  count(*) filter (where created_at is null or updated_at is null) as schedule_missing_timestamps
from public.schedule;

select count(*) as new_finance_notes_containing_phone
from public.income
where booking_request_id is not null
  and coalesce(notes,'') ~ '(^|[^0-9])[367][0-9]{7}([^0-9]|$)';

select count(*) as expired_private_details_pending_deletion
from public.booking_private_details
where retention_expires_at<=now();

with supported(event_type,summary_column) as (
  values ('Farrier','farrier_date'),('Dental','teeth_date'),('Deworming','deworm_date'),
         ('Vaccination','vaccine_date'),('Medication','med_date')
), latest as (
  select distinct on (e.horse_id,e.event_type)
    e.horse_id,e.event_type,
    case when e.event_scope='care'
      then coalesce(timezone('Asia/Bahrain',e.completed_at)::date,e.event_date)
      else coalesce(e.event_date,timezone('Asia/Bahrain',e.completed_at)::date)
    end as expected_date
  from public.horse_health_events e
  join supported s on s.event_type=e.event_type
  where e.status='Completed'
  order by e.horse_id,e.event_type,
    (case when e.event_scope='care'
      then coalesce(timezone('Asia/Bahrain',e.completed_at)::date,e.event_date)
      else coalesce(e.event_date,timezone('Asia/Bahrain',e.completed_at)::date)
    end) desc,e.completed_at desc nulls last,e.id desc
), comparisons as (
  select h.id,s.event_type,l.expected_date,
    case s.event_type
      when 'Farrier' then h.farrier_date
      when 'Dental' then h.teeth_date
      when 'Deworming' then h.deworm_date
      when 'Vaccination' then h.vaccine_date
      when 'Medication' then h.med_date
    end as actual_date
  from public.horses h
  cross join supported s
  left join latest l on l.horse_id=h.id and l.event_type=s.event_type
)
select count(*) as horse_summary_date_mismatches
from comparisons
where actual_date is distinct from expected_date;

select r.code,rp.permission_code,rp.allowed
from public.role_permissions rp
join public.app_roles r on r.id=rp.role_id
where r.code in ('trainer','staff')
  and rp.permission_code in ('horse_events.view','horse_medical.manage')
order by r.code,rp.permission_code;
