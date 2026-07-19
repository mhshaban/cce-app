-- CCE StableOS v4.8.1 — post-correction verification (read-only)

select
  exists (
    select 1 from information_schema.columns
    where table_schema='public' and table_name='income'
      and column_name='training_split_enabled' and is_nullable='NO'
  ) as explicit_split_policy_installed,
  exists (
    select 1 from pg_trigger
    where tgrelid='public.income'::regclass
      and tgname='income_prepare_training_split' and tgenabled<>'D'
  ) as new_training_cutover_trigger_active;

-- Every issue_count must be zero.
select 'legacy_share_changed' as check_name,count(*) as issue_count
from public.income
where training_split_enabled is false
  and (stable_share_bd is distinct from coalesce(paid_bd,0) or instructor_share_bd<>0)
union all
select 'enabled_split_without_instructor',count(*)
from public.income
where training_split_enabled is true
  and lower(trim(coalesce(activity,''))) in ('lesson','training')
  and coalesce(paid_bd,0)>0
  and instructor_id is null
union all
select 'enabled_split_ratio_mismatch',count(*)
from public.income
where training_split_enabled is true
  and lower(trim(coalesce(activity,''))) in ('lesson','training')
  and (
    stable_share_bd is distinct from round(coalesce(paid_bd,0)::numeric/2,3)
    or instructor_share_bd is distinct from coalesce(paid_bd,0)-round(coalesce(paid_bd,0)::numeric/2,3)
  )
union all
select 'share_sum_mismatch',count(*)
from public.income
where stable_share_bd+instructor_share_bd is distinct from coalesce(paid_bd,0)
order by check_name;

select
  count(*) filter (
    where lower(trim(coalesce(activity,''))) in ('lesson','training')
      and training_split_enabled is false
  ) as legacy_training_rows_preserved,
  coalesce(sum(paid_bd) filter (
    where lower(trim(coalesce(activity,''))) in ('lesson','training')
      and training_split_enabled is false
  ),0) as legacy_training_paid_preserved_bd,
  count(*) filter (
    where lower(trim(coalesce(activity,''))) in ('lesson','training')
      and training_split_enabled is true
  ) as new_split_training_rows,
  coalesce(sum(stable_share_bd),0) as total_stable_share_bd,
  coalesce(sum(instructor_share_bd),0) as total_instructor_share_bd,
  coalesce(sum(paid_bd),0) as total_paid_bd
from public.income;
