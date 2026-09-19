-- CCE StableOS v4.28.0 — Breeding/covering agreement fields + printable contract
-- The existing `breeding` table already tracks a mare, its owner, and up to
-- three 3-day covering cycles (day1..day9) — matching the club's real
-- "اتفاقية تنسيل" (covering/breeding agreement) paper form exactly. This
-- migration adds the remaining fields that form needs but the table didn't
-- yet capture, so the agreement can be filled in and printed entirely from
-- the app: which stallion the mare is covered by, breed info, the owner's
-- ID and email, the selected package price, the boarding plan chosen
-- during the covering cycles, and the agreement's own draft date.

begin;

do $$
begin
  if to_regclass('public.breeding') is null then
    raise exception 'breeding table must exist before this migration';
  end if;
end $$;

alter table public.breeding
  add column if not exists stallion_name text,
  add column if not exists stallion_breed text,
  add column if not exists mare_breed text,
  add column if not exists owner_id text,
  add column if not exists owner_email text,
  add column if not exists package_price_bd numeric not null default 0,
  add column if not exists boarding_plan text,
  add column if not exists agreement_date date;

commit;
