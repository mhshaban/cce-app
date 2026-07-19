-- CCE StableOS v4.8.1 — read-only verification after legacy gross normalization

with normalized as (
  select
    backup.*,
    income.amount_bd,
    income.paid_bd,
    income.stable_share_bd,
    income.instructor_share_bd,
    income.training_split_enabled,
    income.instructor_id,
    instructor.name as instructor_name
  from cce_migration_backup.training_legacy_gross_20260719 backup
  join public.income income on income.id=backup.record_id
  join public.instructors instructor on instructor.id=backup.target_instructor_id
)
select jsonb_build_object(
  'backup_row_count_mismatch',abs(126-count(*))::bigint,
  'gross_not_doubled',count(*) filter (
    where amount_bd is distinct from round((row_data->>'amount_bd')::numeric*2,3)
       or paid_bd is distinct from round((row_data->>'paid_bd')::numeric*2,3)
  ),
  'stable_share_changed',count(*) filter (
    where stable_share_bd is distinct from (row_data->>'paid_bd')::numeric
  ),
  'instructor_share_mismatch',count(*) filter (
    where instructor_share_bd is distinct from (row_data->>'paid_bd')::numeric
  ),
  'instructor_assignment_mismatch',count(*) filter (
    where instructor_id is distinct from target_instructor_id
  ),
  'remaining_changed',count(*) filter (
    where amount_bd-paid_bd
      is distinct from (row_data->>'amount_bd')::numeric-(row_data->>'paid_bd')::numeric
  ),
  'verified_rows',count(*),
  'target_instructor',min(instructor_name),
  'split_enabled',bool_and(training_split_enabled),
  'zero_remaining_preserved',bool_and(amount_bd=paid_bd),
  'equal_split_verified',bool_and(stable_share_bd=instructor_share_bd)
) as verification
from normalized;
