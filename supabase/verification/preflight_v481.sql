-- CCE StableOS v4.8.1 — read-only corrective preflight
-- Run after v4.8.0 and before the v4.8.1 cutover migration.

select current_database() as database_name,current_user as database_user,now() as checked_at;

select
  count(*) as historical_paid_lesson_rows,
  coalesce(sum(paid_bd),0) as historical_paid_lesson_bd,
  coalesce(sum(stable_share_bd),0) as current_stable_share_bd,
  coalesce(sum(instructor_share_bd),0) as current_instructor_share_bd
from public.income
where lower(trim(coalesce(activity,''))) in ('lesson','training')
  and coalesce(paid_bd,0)>0
  and instructor_id is null;

select count(*) as income_rows,
       coalesce(sum(amount_bd),0) as total_amount_bd,
       coalesce(sum(paid_bd),0) as total_paid_bd
from public.income;
