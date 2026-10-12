-- CCE StableOS v4.30.0 — Rename the "Shuwar" category to "Bran"
-- The finance/activity category "Shuwar" is now called "Bran" in the app.
-- This rewrites existing rows so filters, reports and edit forms match the
-- new name. Data-only: no schema change. Safe to re-run.

begin;

update public.income   set activity='Bran' where activity='Shuwar';
update public.expenses set category='Bran' where category='Shuwar';
update public.schedule set activity='Bran' where activity='Shuwar';

commit;
