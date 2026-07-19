-- CCE StableOS v4.8.2 verification — read only

select
  to_regprocedure('public.cce_schedule_training_booking(bigint,bigint)') is not null
    as scheduling_function_installed,
  exists(
    select 1 from information_schema.columns
    where table_schema='public' and table_name='schedule'
      and column_name='booking_request_id'
  ) as booking_link_installed,
  exists(
    select 1 from information_schema.columns
    where table_schema='public' and table_name='schedule'
      and column_name='booking_slot_index'
  ) as slot_index_installed;

with materialized as (
  select
    br.id,
    jsonb_array_length(br.session_slots) as expected_sessions,
    count(s.id)::integer as actual_sessions,
    count(*) filter (where s.instructor_id is null)::integer as missing_instructor,
    count(distinct s.booking_slot_index)::integer as distinct_slots
  from public.booking_requests br
  join public.schedule s on s.booking_request_id=br.id
  where br.request_type='training'
  group by br.id,br.session_slots
)
select
  count(*)::integer as materialized_bookings,
  count(*) filter (where actual_sessions<>expected_sessions)::integer as session_count_mismatches,
  count(*) filter (where distinct_slots<>expected_sessions)::integer as slot_index_mismatches,
  coalesce(sum(missing_instructor),0)::integer as sessions_missing_instructor
from materialized;

select
  br.id as booking_request_id,
  br.customer_name,
  br.service_name,
  br.status,
  jsonb_array_length(br.session_slots) as expected_sessions,
  count(s.id)::integer as actual_sessions,
  min(ins.name) as assigned_instructor,
  count(distinct s.instructor_id)::integer as instructor_count
from public.booking_requests br
join public.schedule s on s.booking_request_id=br.id
left join public.instructors ins on ins.id=s.instructor_id
where br.request_type='training'
group by br.id,br.customer_name,br.service_name,br.status,br.session_slots
order by br.id desc;
