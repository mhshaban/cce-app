-- Compatibility rollback for v4.29.0 (breeding boarding days + total).
-- Drops the added column. Emergency use only — any recorded boarding-day
-- counts are lost; the printed agreement falls back to showing only the
-- package price (no boarding cost or total line), matching pre-v4.29.0
-- behavior. No other data is affected.

begin;

alter table public.breeding
  drop column if exists boarding_days;

commit;
