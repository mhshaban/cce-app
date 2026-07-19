-- CCE StableOS v4.8.2 preflight — read only

with requirements(check_name,passed,detail) as (
  values
    ('booking_requests_table',to_regclass('public.booking_requests') is not null,
      coalesce(to_regclass('public.booking_requests')::text,'missing')),
    ('schedule_table',to_regclass('public.schedule') is not null,
      coalesce(to_regclass('public.schedule')::text,'missing')),
    ('instructors_table',to_regclass('public.instructors') is not null,
      coalesce(to_regclass('public.instructors')::text,'missing')),
    ('v481_training_split',exists(
      select 1 from information_schema.columns
      where table_schema='public' and table_name='income'
        and column_name='training_split_enabled'
    ),'income.training_split_enabled')
)
select * from requirements order by check_name;

select
  br.id as booking_request_id,
  br.customer_name,
  br.service_name,
  br.status as booking_status,
  jsonb_array_length(br.session_slots) as requested_sessions,
  i.id as income_id,
  i.instructor_id,
  ins.name as instructor,
  i.amount_bd,
  i.paid_bd,
  greatest(i.amount_bd-i.paid_bd,0) as remaining_bd
from public.booking_requests br
join public.income i on i.booking_request_id=br.id
left join public.instructors ins on ins.id=i.instructor_id
where br.request_type='training'
  and br.status not in ('Cancelled','Rejected','Completed')
order by br.created_at desc;
