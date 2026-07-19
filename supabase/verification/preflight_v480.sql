-- CCE StableOS v4.8.0 — read-only preflight
-- Export this result before applying the migration. No values are changed.

select current_database() as database_name,
       current_user as database_user,
       now() as checked_at;

with required(table_name) as (
  values ('income'),('schedule'),('instructors'),('profiles'),('audit_logs')
)
select r.table_name,
       to_regclass('public.'||r.table_name) is not null as exists
from required r
order by r.table_name;

select code,price_bd,session_count,active
from public.public_booking_services
where code in ('training_single','training_4','training_8','training_12')
order by session_count;

select
  count(*) filter (
    where lower(trim(coalesce(activity,''))) in ('lesson','training')
      and coalesce(paid_bd,0)>0
  ) as paid_training_rows,
  coalesce(sum(paid_bd) filter (
    where lower(trim(coalesce(activity,''))) in ('lesson','training')
      and coalesce(paid_bd,0)>0
  ),0) as paid_training_gross_bd
from public.income;

select
  count(*) filter (
    where lower(trim(coalesce(s.activity,''))) in ('lesson','training')
  ) as training_schedule_rows,
  count(*) filter (
    where lower(trim(coalesce(s.activity,''))) in ('lesson','training')
      and not exists (
        select 1 from public.instructors i
        where lower(trim(i.name))=lower(trim(coalesce(s.instructor,'')))
      )
  ) as training_schedule_names_not_linked
from public.schedule s;

select id,name,active
from public.instructors
order by active desc,name;
