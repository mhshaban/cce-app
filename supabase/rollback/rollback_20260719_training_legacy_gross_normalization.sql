-- CCE StableOS v4.8.1 — rollback of legacy training gross normalization
-- Restores only fields changed by the maintenance transaction and preserves the
-- private backup for audit and later review.

begin;

lock table public.income in share row exclusive mode;

do $$
begin
  if to_regclass(
    'cce_migration_backup.training_legacy_gross_20260719'
  ) is null then
    raise exception 'Legacy training backup is missing; rollback aborted';
  end if;

  if (
    select count(*)
    from cce_migration_backup.training_legacy_gross_20260719
  )<>126 then
    raise exception 'Legacy training backup row count is not 126; rollback aborted';
  end if;

  if not exists (
    select 1 from pg_trigger
    where tgrelid='public.income'::regclass
      and tgname='income_prepare_training_split'
  ) then
    raise exception 'Training split trigger is missing; rollback aborted';
  end if;
end;
$$;

alter table public.income disable trigger income_prepare_training_split;

update public.income income
set
  amount_bd=(backup.row_data->>'amount_bd')::numeric,
  paid_bd=(backup.row_data->>'paid_bd')::numeric,
  training_split_enabled=(backup.row_data->>'training_split_enabled')::boolean,
  instructor_id=nullif(backup.row_data->>'instructor_id','')::bigint
from cce_migration_backup.training_legacy_gross_20260719 backup
where income.id=backup.record_id;

alter table public.income enable trigger income_prepare_training_split;

do $$
begin
  if exists (
    select 1
    from cce_migration_backup.training_legacy_gross_20260719 backup
    left join public.income income on income.id=backup.record_id
    where income.id is null
       or income.amount_bd is distinct from (backup.row_data->>'amount_bd')::numeric
       or income.paid_bd is distinct from (backup.row_data->>'paid_bd')::numeric
       or income.training_split_enabled
          is distinct from (backup.row_data->>'training_split_enabled')::boolean
       or income.instructor_id
          is distinct from nullif(backup.row_data->>'instructor_id','')::bigint
       or income.stable_share_bd is distinct from (backup.row_data->>'stable_share_bd')::numeric
       or income.instructor_share_bd is distinct from (backup.row_data->>'instructor_share_bd')::numeric
  ) then
    raise exception 'Legacy training rollback verification failed; transaction rolled back';
  end if;
end;
$$;

insert into public.audit_logs(
  actor,action,table_name,record_id,before_data,after_data
) values(
  'Maintenance v4.8.1',
  'rollback_legacy_training_gross',
  'income',
  'legacy-training-20260719',
  jsonb_build_object('source','normalized legacy training rows'),
  jsonb_build_object(
    'restored_from','cce_migration_backup.training_legacy_gross_20260719'
  )
);

commit;

select
  count(*) as restored_rows,
  bool_and(income.amount_bd=(backup.row_data->>'amount_bd')::numeric) as amount_restored,
  bool_and(income.paid_bd=(backup.row_data->>'paid_bd')::numeric) as paid_restored
from cce_migration_backup.training_legacy_gross_20260719 backup
join public.income income on income.id=backup.record_id;
