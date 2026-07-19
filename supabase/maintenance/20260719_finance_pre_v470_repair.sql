-- CCE StableOS v4.7.0 — audited legacy finance normalization
--
-- Production audit on 2026-07-19 found legacy rows where amount_bd stored the
-- unit price while paid_bd stored the final paid total. The current contract is:
--   amount_bd = final row total, paid_bd = cash received/paid against that total.
--
-- This script is intentionally transactional and fail-closed. It backs up every
-- affected row in a private schema before changing only amount_bd and missing
-- expense dates. Run preflight_v470.sql again immediately after it completes.

begin;

lock table public.income,public.expenses in share row exclusive mode;

do $$
begin
  if exists(
    select 1 from public.income
    where amount_bd<0 or paid_bd<0
  ) or exists(
    select 1 from public.expenses
    where amount_bd<0 or paid_bd<0
  ) then
    raise exception 'Negative finance values require manual review; no rows changed';
  end if;

  if exists(
    select 1 from public.income
    where paid_bd>amount_bd and lower(coalesce(status,''))<>'paid'
  ) or exists(
    select 1 from public.expenses
    where paid_bd>amount_bd and lower(coalesce(status,''))<>'paid'
  ) then
    raise exception 'An overpaid row is not marked Paid; no rows changed';
  end if;

  if exists(select 1 from public.income where date is null) then
    raise exception 'Income contains a missing date that requires manual review; no rows changed';
  end if;

  if exists(
    select 1 from public.expenses where date is null and due_date is null
  ) then
    raise exception 'An expense has neither date nor due_date; no rows changed';
  end if;
end;
$$;

create schema if not exists cce_migration_backup;
revoke all on schema cce_migration_backup from public,anon,authenticated;

create table if not exists cce_migration_backup.finance_pre_v470_20260719 (
  source text not null check(source in ('income','expenses')),
  record_id bigint not null,
  row_data jsonb not null,
  backed_up_at timestamptz not null default now(),
  primary key(source,record_id)
);

revoke all on cce_migration_backup.finance_pre_v470_20260719
from public,anon,authenticated;

insert into cce_migration_backup.finance_pre_v470_20260719(
  source,record_id,row_data
)
select 'income',i.id,to_jsonb(i)
from public.income i
where i.paid_bd>i.amount_bd or i.date is null
on conflict(source,record_id) do nothing;

insert into cce_migration_backup.finance_pre_v470_20260719(
  source,record_id,row_data
)
select 'expenses',e.id,to_jsonb(e)
from public.expenses e
where e.paid_bd>e.amount_bd or e.date is null
on conflict(source,record_id) do nothing;

do $$
begin
  if exists(
    select 1
    from public.income i
    where (i.paid_bd>i.amount_bd or i.date is null)
      and not exists(
        select 1
        from cce_migration_backup.finance_pre_v470_20260719 b
        where b.source='income' and b.record_id=i.id
      )
  ) or exists(
    select 1
    from public.expenses e
    where (e.paid_bd>e.amount_bd or e.date is null)
      and not exists(
        select 1
        from cce_migration_backup.finance_pre_v470_20260719 b
        where b.source='expenses' and b.record_id=e.id
      )
  ) then
    raise exception 'Finance backup verification failed; no rows changed';
  end if;
end;
$$;

-- A Paid row has no outstanding balance. Preserve the cash value and normalize
-- the legacy unit-price row into the final-total contract used by StableOS.
update public.income
set amount_bd=paid_bd,status='Paid'
where paid_bd>amount_bd and lower(coalesce(status,''))='paid';

update public.expenses
set amount_bd=paid_bd,status='Paid'
where paid_bd>amount_bd and lower(coalesce(status,''))='paid';

-- The audited production rows have a due date but no transaction date. The due
-- date is the only durable historical date available, so preserve it as date.
update public.expenses
set date=due_date
where date is null and due_date is not null;

do $$
begin
  if exists(
    select 1 from public.income
    where date is null or amount_bd<0 or paid_bd<0 or paid_bd>amount_bd
  ) or exists(
    select 1 from public.expenses
    where date is null or amount_bd<0 or paid_bd<0 or paid_bd>amount_bd
  ) then
    raise exception 'Post-repair finance verification failed; transaction rolled back';
  end if;
end;
$$;

insert into public.audit_logs(
  actor,action,table_name,record_id,before_data,after_data
)
select
  'Migration v4.7.0',
  'repair_finance_invariants',
  'income,expenses',
  'pre-v470-20260719',
  jsonb_build_object(
    'backup_rows',count(*),
    'backup_table','cce_migration_backup.finance_pre_v470_20260719'
  ),
  jsonb_build_object(
    'overpaid_rows_remaining',0,
    'missing_dates_remaining',0
  )
from cce_migration_backup.finance_pre_v470_20260719;

commit;

select source,count(*) as backup_rows
from cce_migration_backup.finance_pre_v470_20260719
group by source
order by source;

select
  (select count(*) from public.income
    where date is null or amount_bd<0 or paid_bd<0 or paid_bd>amount_bd)
    as income_issues_remaining,
  (select count(*) from public.expenses
    where date is null or amount_bd<0 or paid_bd<0 or paid_bd>amount_bd)
    as expenses_issues_remaining;
