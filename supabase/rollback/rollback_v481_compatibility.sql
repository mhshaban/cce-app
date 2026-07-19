-- CCE StableOS v4.8.1 — compatibility rollback
-- Keeps the explicit cutover column and the corrected generated shares. It
-- removes enforcement only; it never restores the unsafe retroactive split.

begin;

drop trigger if exists income_prepare_training_split on public.income;
drop trigger if exists income_validate_training_instructor on public.income;
drop trigger if exists income_audit_training_revenue_split on public.income;

alter table public.income drop constraint if exists income_training_instructor_required;

drop function if exists public.cce_prepare_training_split();

commit;
