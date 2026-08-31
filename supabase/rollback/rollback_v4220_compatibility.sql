-- Compatibility rollback for v4.22.0 (staff care board).
-- Drops the three new functions only. No columns, tables or data are
-- affected — any Feeding/Farrier care events already logged stay in
-- horse_health_events untouched, and the widened event_type check
-- constraint (adding 'Feeding' to the existing whitelist) is left in place
-- since narrowing it back could reject rows already inserted. Emergency
-- use only.

begin;

drop function if exists public.cce_staff_care_board();
drop function if exists public.cce_mark_horse_fed(bigint);
drop function if exists public.cce_mark_farrier_done(bigint);

commit;
