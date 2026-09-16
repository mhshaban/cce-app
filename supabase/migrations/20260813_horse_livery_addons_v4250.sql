-- CCE StableOS v4.25.0 — Per-horse livery add-ons (Extra Care / Feed Selection / Notes)
-- Adds the same Extra Care Add-ons and Feed Selection choices already offered
-- on the electronic "Book Livery" booking form as persistent flags on each
-- horse's record, plus a free-text notes field. Customers differ in which
-- add-ons they actually pay for (some take none, some take several), which
-- is why the monthly amount charged varies between horses. Staff record the
-- actual selection here, and the printed livery contract reflects exactly
-- what was selected.

begin;

do $$
begin
  if to_regclass('public.horses') is null then
    raise exception 'horses table must exist before this migration';
  end if;
end $$;

alter table public.horses
  add column if not exists extra_shower boolean not null default false,
  add column if not exists extra_vip_shower boolean not null default false,
  add column if not exists extra_cleaning boolean not null default false,
  add column if not exists extra_outdoor_leading boolean not null default false,
  add column if not exists extra_training boolean not null default false,
  add column if not exists feed_teben boolean not null default false,
  add column if not exists feed_hay boolean not null default false,
  add column if not exists feed_wood_shavings boolean not null default false,
  add column if not exists livery_notes text;

commit;
