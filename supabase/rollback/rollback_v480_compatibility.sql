-- CCE StableOS v4.8.0 — compatibility rollback
-- Keeps the new columns and all financial values. It only removes enforcement
-- triggers/constraints so the previous UI can operate during an emergency rollback.

begin;

drop trigger if exists income_validate_training_instructor on public.income;
drop trigger if exists income_audit_training_revenue_split on public.income;
drop trigger if exists schedule_validate_instructor on public.schedule;

alter table public.income drop constraint if exists income_training_instructor_required;
alter table public.schedule drop constraint if exists schedule_training_instructor_required;

drop function if exists public.cce_validate_training_income_instructor();
drop function if exists public.cce_validate_schedule_instructor();
drop function if exists public.cce_audit_training_revenue_split();
drop function if exists public.cce_instructor_directory();

commit;
