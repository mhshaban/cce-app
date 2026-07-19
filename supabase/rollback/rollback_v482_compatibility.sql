-- CCE StableOS v4.8.2 compatibility rollback
-- Revert the UI first. This rollback disables new package materialization but
-- intentionally keeps schedule rows, booking links and financial assignments.

begin;

revoke all on function public.cce_schedule_training_booking(bigint,bigint)
  from public,anon,authenticated;
drop function if exists public.cce_schedule_training_booking(bigint,bigint);

commit;
