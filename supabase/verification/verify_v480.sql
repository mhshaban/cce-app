-- CCE StableOS v4.8.0 — post-migration verification (read-only)

select
  exists (
    select 1 from information_schema.columns
    where table_schema='public' and table_name='income' and column_name='instructor_id'
  ) as income_instructor_installed,
  exists (
    select 1 from information_schema.columns
    where table_schema='public' and table_name='income' and column_name='stable_share_bd' and is_generated='ALWAYS'
  ) as stable_share_installed,
  exists (
    select 1 from information_schema.columns
    where table_schema='public' and table_name='income' and column_name='instructor_share_bd' and is_generated='ALWAYS'
  ) as instructor_share_installed,
  exists (
    select 1 from information_schema.columns
    where table_schema='public' and table_name='schedule' and column_name='instructor_id'
  ) as schedule_instructor_installed;

select tgname,tgenabled
from pg_trigger
where tgrelid in ('public.income'::regclass,'public.schedule'::regclass)
  and tgname in (
    'income_validate_training_instructor',
    'income_audit_training_revenue_split',
    'schedule_validate_instructor'
  )
order by tgname;

select
  to_regprocedure('public.cce_instructor_directory()') is not null as instructor_directory_installed,
  to_regprocedure('public.cce_member_instructor_schedule()') is not null as trainer_schedule_rpc_installed,
  to_regprocedure('public.cce_member_instructor_update_schedule(bigint,text,text)') is not null as trainer_update_rpc_installed;

-- Every issue_count below should be zero after legacy rows are assigned.
select 'paid_training_without_instructor' as check_name,count(*) as issue_count
from public.income
where lower(trim(coalesce(activity,''))) in ('lesson','training')
  and coalesce(paid_bd,0)>0
  and instructor_id is null
union all
select 'training_share_sum_mismatch',count(*)
from public.income
where stable_share_bd+instructor_share_bd is distinct from coalesce(paid_bd,0)
union all
select 'training_share_ratio_mismatch',count(*)
from public.income
where lower(trim(coalesce(activity,''))) in ('lesson','training')
  and (
    stable_share_bd is distinct from round(coalesce(paid_bd,0)::numeric/2,3)
    or instructor_share_bd is distinct from coalesce(paid_bd,0)-round(coalesce(paid_bd,0)::numeric/2,3)
  )
union all
select 'training_schedule_without_instructor',count(*)
from public.schedule
where lower(trim(coalesce(activity,''))) in ('lesson','training')
  and instructor_id is null
union all
select 'schedule_instructor_name_mismatch',count(*)
from public.schedule s
join public.instructors i on i.id=s.instructor_id
where s.instructor is distinct from i.name
order by check_name;

select
  count(*) as income_rows,
  coalesce(sum(amount_bd),0) as total_amount_bd,
  coalesce(sum(paid_bd),0) as total_paid_bd,
  coalesce(sum(stable_share_bd),0) as total_stable_share_bd,
  coalesce(sum(instructor_share_bd),0) as total_instructor_share_bd
from public.income;

select i.id,i.name,
       count(inc.id) as paid_training_records,
       coalesce(sum(inc.instructor_share_bd),0) as instructor_share_bd
from public.instructors i
left join public.income inc
  on inc.instructor_id=i.id
 and lower(trim(coalesce(inc.activity,''))) in ('lesson','training')
 and coalesce(inc.paid_bd,0)>0
group by i.id,i.name
order by i.name;

-- Rows listed here need manual assignment; this query is read-only.
select id,date,customer_name,activity,amount_bd,paid_bd
from public.income
where lower(trim(coalesce(activity,''))) in ('lesson','training')
  and coalesce(paid_bd,0)>0
  and instructor_id is null
order by date,id;

select id,date,start_time,customer_name,activity,instructor
from public.schedule
where lower(trim(coalesce(activity,''))) in ('lesson','training')
  and instructor_id is null
order by date,start_time,id;
