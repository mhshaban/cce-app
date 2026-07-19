-- CCE StableOS v4.8.1 — read-only preflight for legacy training gross normalization
--
-- The latest split-enabled training income is the target instructor template.
-- Review its instructor_name before running the maintenance transaction.

with target as (
  select
    inc.id as source_income_id,
    inc.instructor_id,
    instructor.name as instructor_name,
    instructor.active as instructor_active
  from public.income inc
  join public.instructors instructor on instructor.id=inc.instructor_id
  where inc.training_split_enabled is true
    and lower(trim(coalesce(inc.activity,''))) in ('lesson','training')
    and coalesce(inc.paid_bd,0)>0
  order by inc.id desc
  limit 1
), legacy as (
  select
    count(*) as legacy_training_rows,
    count(*) filter (
      where amount_bd=paid_bd
        and paid_bd>0
        and stable_share_bd=paid_bd
        and instructor_share_bd=0
    ) as eligible_rows,
    count(*) filter (
      where amount_bd<>paid_bd
         or paid_bd<=0
         or stable_share_bd is distinct from paid_bd
         or instructor_share_bd<>0
    ) as rows_requiring_manual_review
  from public.income
  where training_split_enabled is false
    and lower(trim(coalesce(activity,''))) in ('lesson','training')
)
select check_name,check_value
from (
  select 1 as display_order,'source_income_id'::text as check_name,
         coalesce((select source_income_id::text from target),'NULL') as check_value
  union all
  select 2,'instructor_id',coalesce((select instructor_id::text from target),'NULL')
  union all
  select 3,'instructor_name',coalesce((select instructor_name from target),'NULL')
  union all
  select 4,'instructor_active',
         coalesce((select instructor_active::text from target),'false')
  union all
  select 5,'legacy_training_rows',legacy_training_rows::text from legacy
  union all
  select 6,'eligible_rows',eligible_rows::text from legacy
  union all
  select 7,'rows_requiring_manual_review',rows_requiring_manual_review::text from legacy
  union all
  select 8,'active_target_instructors',(select count(*)::text from target)
) checks
order by display_order;
