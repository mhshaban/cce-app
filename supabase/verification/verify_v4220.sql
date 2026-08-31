-- CCE StableOS v4.22.0 — Staff care board verification

select
  to_regprocedure('public.cce_staff_care_board()') is not null as board_rpc_exists,
  to_regprocedure('public.cce_mark_horse_fed(bigint)') is not null as mark_fed_rpc_exists,
  to_regprocedure('public.cce_mark_farrier_done(bigint)') is not null as mark_farrier_rpc_exists,
  has_function_privilege('authenticated','public.cce_staff_care_board()','EXECUTE') as authenticated_can_read_board,
  has_function_privilege('authenticated','public.cce_mark_horse_fed(bigint)','EXECUTE') as authenticated_can_mark_fed,
  has_function_privilege('authenticated','public.cce_mark_farrier_done(bigint)','EXECUTE') as authenticated_can_mark_farrier,
  not has_function_privilege('anon','public.cce_staff_care_board()','EXECUTE') as anon_cannot_read_board;

select
  obj_description('public.cce_mark_horse_fed(bigint)'::regprocedure) ilike '%horse_care.manage%' as mark_fed_comment_present,
  obj_description('public.cce_mark_farrier_done(bigint)'::regprocedure) ilike '%horse_care.manage%' as mark_farrier_comment_present;

-- No columns or tables were dropped; horses.farrier_date remains the same column.
select
  count(*)>0 as horses_farrier_date_intact
from information_schema.columns
where table_schema='public' and table_name='horses' and column_name='farrier_date';

-- event_type whitelist was widened (not narrowed) to add 'Feeding'.
select pg_get_constraintdef(oid) ilike '%''Feeding''%' as feeding_event_type_allowed
from pg_constraint
where conname='horse_health_events_event_type_check';
