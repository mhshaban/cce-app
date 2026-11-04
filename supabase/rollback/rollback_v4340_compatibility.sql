-- Compatibility rollback for v4.34.0 (paddock board).
-- Removes the paddock RPCs so the v4.33 interface runs unchanged. The
-- paddock_slots table, its rows and the permission codes are kept, so
-- re-applying the migration restores the board without re-seeding.
-- Safe to re-run.

begin;

drop function if exists public.cce_paddock_board();
drop function if exists public.cce_paddock_save_slot(bigint,text,time,time,text,bigint,text);
drop function if exists public.cce_paddock_delete_slot(bigint);

commit;
