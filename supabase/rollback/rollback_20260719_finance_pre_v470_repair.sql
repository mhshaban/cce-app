-- CCE StableOS v4.7.0 — rollback for the audited finance normalization only
--
-- Use only if the finance repair itself must be reversed. This restores the two
-- fields changed by that repair (amount_bd and date) from the private snapshot.
-- It intentionally leaves the backup table in place for audit and recovery.

begin;

lock table public.income,public.expenses in share row exclusive mode;

do $$
begin
  if to_regclass(
    'cce_migration_backup.finance_pre_v470_20260719'
  ) is null then
    raise exception 'Finance repair backup is missing; rollback aborted';
  end if;
end;
$$;

update public.income i
set
  amount_bd=(b.row_data->>'amount_bd')::numeric,
  date=nullif(b.row_data->>'date','')::date
from cce_migration_backup.finance_pre_v470_20260719 b
where b.source='income' and b.record_id=i.id;

update public.expenses e
set
  amount_bd=(b.row_data->>'amount_bd')::numeric,
  date=nullif(b.row_data->>'date','')::date
from cce_migration_backup.finance_pre_v470_20260719 b
where b.source='expenses' and b.record_id=e.id;

insert into public.audit_logs(
  actor,action,table_name,record_id,before_data,after_data
) values(
  'Migration v4.7.0',
  'rollback_finance_invariants',
  'income,expenses',
  'pre-v470-20260719',
  jsonb_build_object('source','normalized finance rows'),
  jsonb_build_object(
    'restored_from','cce_migration_backup.finance_pre_v470_20260719'
  )
);

commit;

select source,count(*) as restored_snapshot_rows
from cce_migration_backup.finance_pre_v470_20260719
group by source
order by source;
