-- Compatibility rollback for v4.28.0 (breeding agreement fields).
-- Drops the added columns. Emergency use only — any stallion/owner ID/
-- pricing/boarding details staff have recorded will be lost; the printed
-- breeding agreement falls back to being unavailable (Print button is
-- gated on stallion_name being set). No other data is affected — the
-- original mare/owner/mobile/day1..day9 cycle-tracking fields are untouched.

begin;

alter table public.breeding
  drop column if exists stallion_name,
  drop column if exists stallion_breed,
  drop column if exists mare_breed,
  drop column if exists owner_id,
  drop column if exists owner_email,
  drop column if exists package_price_bd,
  drop column if exists boarding_plan,
  drop column if exists agreement_date;

commit;
