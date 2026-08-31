-- CCE StableOS v4.23.4 — Remove Feeding from staff care board preflight

select
  to_regprocedure('public.cce_staff_care_board()') is not null as board_rpc_ready,
  to_regprocedure('public.cce_mark_horse_fed(bigint)') is not null as mark_fed_rpc_still_present;

do $$
begin
  if to_regprocedure('public.cce_staff_care_board()') is null then
    raise exception 'CCE staff care board (v4.22.0) must be applied before this cleanup';
  end if;
end $$;
