-- CCE StableOS v4.8.1 — audited legacy training gross normalization
--
-- Historical training rows stored only the stable's 50% cash share in both
-- amount_bd and paid_bd. This one-off transaction converts each historical row
-- to gross customer cash while preserving the stable share and zero remaining:
--   new amount/paid = old amount/paid * 2
--   stable share    = old paid
--   instructor share= old paid
--
-- The target instructor is resolved from the latest paid, split-enabled training
-- row. Run the read-only preflight first and confirm that instructor manually.

begin;

lock table public.income in share row exclusive mode;
lock table public.instructors in share mode;

do $$
begin
  if to_regclass('public.income') is null
     or to_regclass('public.instructors') is null
     or not exists (
       select 1 from information_schema.columns
       where table_schema='public' and table_name='income'
         and column_name='training_split_enabled'
     ) then
    raise exception 'CCE v4.8.1 training split is required; no rows changed';
  end if;

  if to_regclass(
    'cce_migration_backup.training_legacy_gross_20260719'
  ) is not null then
    raise exception 'Legacy training backup already exists; do not run this transaction twice';
  end if;
end;
$$;

create temporary table cce_training_target on commit drop as
select
  inc.id as source_income_id,
  instructor.id as instructor_id,
  instructor.name as instructor_name
from public.income inc
join public.instructors instructor on instructor.id=inc.instructor_id
where inc.training_split_enabled is true
  and lower(trim(coalesce(inc.activity,''))) in ('lesson','training')
  and coalesce(inc.paid_bd,0)>0
  and instructor.active is true
order by inc.id desc
limit 1;

do $$
declare
  v_target_count integer;
  v_legacy_count integer;
begin
  select count(*) into v_target_count from cce_training_target;
  if v_target_count<>1 then
    raise exception 'Exactly one verified active target instructor is required; no rows changed';
  end if;

  if exists (
    select 1 from cce_training_target where source_income_id is null
  ) then
    raise exception 'The target instructor has no verified split-enabled training template; no rows changed';
  end if;

  select count(*) into v_legacy_count
  from public.income
  where training_split_enabled is false
    and lower(trim(coalesce(activity,''))) in ('lesson','training');

  if v_legacy_count<>126 then
    raise exception 'Expected 126 remaining legacy training rows, found %; no rows changed',v_legacy_count;
  end if;

  if exists (
    select 1
    from public.income
    where training_split_enabled is false
      and lower(trim(coalesce(activity,''))) in ('lesson','training')
      and (
        amount_bd<>paid_bd
        or paid_bd<=0
        or stable_share_bd is distinct from paid_bd
        or instructor_share_bd<>0
      )
  ) then
    raise exception 'A legacy training row does not match the approved 50%%-only shape; no rows changed';
  end if;
end;
$$;

create temporary table cce_training_finance_guard on commit drop as
select
  count(*)::bigint as row_count,
  coalesce(sum(amount_bd),0)::numeric as total_amount_bd,
  coalesce(sum(paid_bd),0)::numeric as total_paid_bd,
  coalesce(sum(amount_bd-paid_bd),0)::numeric as total_remaining_bd,
  coalesce(sum(stable_share_bd),0)::numeric as total_stable_share_bd,
  coalesce(sum(instructor_share_bd),0)::numeric as total_instructor_share_bd
from public.income;

create schema if not exists cce_migration_backup;
revoke all on schema cce_migration_backup from public,anon,authenticated;

create table cce_migration_backup.training_legacy_gross_20260719 (
  record_id bigint primary key,
  source_income_id bigint not null,
  target_instructor_id bigint not null,
  row_data jsonb not null,
  backed_up_at timestamptz not null default now()
);

revoke all on cce_migration_backup.training_legacy_gross_20260719
from public,anon,authenticated;

insert into cce_migration_backup.training_legacy_gross_20260719(
  record_id,source_income_id,target_instructor_id,row_data
)
select
  income.id,target.source_income_id,target.instructor_id,to_jsonb(income)
from public.income income
cross join cce_training_target target
where income.training_split_enabled is false
  and lower(trim(coalesce(income.activity,''))) in ('lesson','training');

do $$
begin
  if (
    select count(*)
    from cce_migration_backup.training_legacy_gross_20260719
  )<>126 then
    raise exception 'The private backup does not contain all 126 remaining rows; no rows changed';
  end if;
end;
$$;

update public.income income
set
  amount_bd=round((backup.row_data->>'amount_bd')::numeric*2,3),
  paid_bd=round((backup.row_data->>'paid_bd')::numeric*2,3),
  training_split_enabled=true,
  instructor_id=backup.target_instructor_id
from cce_migration_backup.training_legacy_gross_20260719 backup
where income.id=backup.record_id;

do $$
declare
  v_old_amount numeric;
  v_old_paid numeric;
  v_row_count bigint;
  v_total_amount numeric;
  v_total_paid numeric;
  v_total_remaining numeric;
  v_total_stable numeric;
  v_total_instructor numeric;
begin
  select
    coalesce(sum((row_data->>'amount_bd')::numeric),0),
    coalesce(sum((row_data->>'paid_bd')::numeric),0)
  into v_old_amount,v_old_paid
  from cce_migration_backup.training_legacy_gross_20260719;

  if exists (
    select 1
    from cce_migration_backup.training_legacy_gross_20260719 backup
    join public.income income on income.id=backup.record_id
    where income.amount_bd is distinct from round((backup.row_data->>'amount_bd')::numeric*2,3)
       or income.paid_bd is distinct from round((backup.row_data->>'paid_bd')::numeric*2,3)
       or income.training_split_enabled is not true
       or income.instructor_id is distinct from backup.target_instructor_id
       or income.stable_share_bd is distinct from (backup.row_data->>'paid_bd')::numeric
       or income.instructor_share_bd is distinct from (backup.row_data->>'paid_bd')::numeric
       or income.amount_bd-income.paid_bd
          is distinct from (backup.row_data->>'amount_bd')::numeric-(backup.row_data->>'paid_bd')::numeric
  ) then
    raise exception 'Per-row training normalization verification failed; transaction rolled back';
  end if;

  select
    count(*)::bigint,
    coalesce(sum(amount_bd),0)::numeric,
    coalesce(sum(paid_bd),0)::numeric,
    coalesce(sum(amount_bd-paid_bd),0)::numeric,
    coalesce(sum(stable_share_bd),0)::numeric,
    coalesce(sum(instructor_share_bd),0)::numeric
  into
    v_row_count,v_total_amount,v_total_paid,v_total_remaining,
    v_total_stable,v_total_instructor
  from public.income;

  if exists (
    select 1
    from cce_training_finance_guard guard
    where v_row_count<>guard.row_count
       or v_total_amount<>guard.total_amount_bd+v_old_amount
       or v_total_paid<>guard.total_paid_bd+v_old_paid
       or v_total_remaining<>guard.total_remaining_bd
       or v_total_stable<>guard.total_stable_share_bd
       or v_total_instructor<>guard.total_instructor_share_bd+v_old_paid
  ) then
    raise exception 'Aggregate finance verification failed; transaction rolled back';
  end if;
end;
$$;

insert into public.audit_logs(
  actor,action,table_name,record_id,before_data,after_data
)
select
  'Maintenance v4.8.1',
  'normalize_legacy_training_gross',
  'income',
  'legacy-training-20260719',
  jsonb_build_object(
    'backup_table','cce_migration_backup.training_legacy_gross_20260719',
    'rows',count(*)
  ),
  jsonb_build_object(
    'formula','gross=legacy_share*2; stable=legacy_share; instructor=legacy_share',
    'source_income_id',min(source_income_id),
    'target_instructor_id',min(target_instructor_id)
  )
from cce_migration_backup.training_legacy_gross_20260719;

commit;

select
  count(*) as converted_rows,
  min(instructor.name) as target_instructor,
  bool_and(income.amount_bd=income.paid_bd) as zero_remaining_preserved,
  bool_and(income.stable_share_bd=income.instructor_share_bd) as equal_split_verified
from cce_migration_backup.training_legacy_gross_20260719 backup
join public.income income on income.id=backup.record_id
join public.instructors instructor on instructor.id=backup.target_instructor_id;
