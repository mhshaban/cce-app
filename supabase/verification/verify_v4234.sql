-- CCE StableOS v4.23.4 — Remove Feeding from staff care board verification

select
  to_regprocedure('public.cce_mark_horse_fed(bigint)') is null as mark_fed_rpc_removed,
  to_regprocedure('public.cce_staff_care_board()') is not null as board_rpc_still_exists,
  has_function_privilege('authenticated','public.cce_staff_care_board()','EXECUTE') as authenticated_can_read_board;

select pg_get_functiondef('public.cce_staff_care_board()'::regprocedure) not ilike '%''feeding''%'
  as board_no_longer_computes_feeding;

-- No columns or tables were dropped; horses.farrier_date remains the same column.
select
  count(*)>0 as horses_farrier_date_intact
from information_schema.columns
where table_schema='public' and table_name='horses' and column_name='farrier_date';
