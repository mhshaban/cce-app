-- CCE StableOS v4.39.0 — Video movement analysis preflight
-- Every *_ready column must be true (v4.38.0 must be applied first).
-- existing_table should be 0 on a first run.

select
  to_regclass('public.horse_movement_logs') is not null as movement_log_ready,
  to_regclass('public.horse_ride_checks') is not null as ride_checks_ready,
  to_regprocedure('public.cce_movement_can_view()') is not null as can_view_ready,
  to_regprocedure('public.cce_movement_can_record()') is not null as can_record_ready,
  to_regprocedure('public.cce_movement_stamp_author()') is not null as author_stamp_ready,
  (select count(*) from pg_class c join pg_namespace n on n.oid=c.relnamespace
    where n.nspname='public' and c.relname='horse_gait_analyses') as existing_table;
