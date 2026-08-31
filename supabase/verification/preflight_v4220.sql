-- CCE StableOS v4.22.0 — Staff care board preflight

select
  to_regclass('public.horses') is not null as horses_ready,
  to_regclass('public.horse_health_events') is not null as health_events_ready,
  to_regprocedure('public.cce_sync_completed_health_event_to_horse()') is not null as sync_trigger_ready,
  to_regprocedure('public.cce_staff_care_board()') is null as board_rpc_not_yet_added;

do $$
begin
  if to_regclass('public.horses') is null
     or to_regclass('public.horse_health_events') is null
     or to_regprocedure('public.cce_has_permission(text)') is null
     or to_regprocedure('public.cce_sync_completed_health_event_to_horse()') is null then
    raise exception 'CCE horse health foundation (v4.6.4) must be applied before the staff care board';
  end if;
end $$;
