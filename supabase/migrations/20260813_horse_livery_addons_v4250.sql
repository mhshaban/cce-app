-- CCE StableOS v4.25.0 — Per-horse livery add-ons (Standard Package / Extra Care / Feed Selection / Notes)
-- Adds the same Standard Package components (wash, feed, stable cleaning),
-- Extra Care Add-ons, and Feed Selection choices already offered on the
-- electronic "Book Livery" booking form as persistent flags on each horse's
-- record, plus a free-text notes field. Customers differ in which parts of
-- the standard package and which add-ons they actually receive (some opt
-- out of parts of the standard package, some take none of the extras, some
-- take several), which is why the monthly amount charged varies between
-- horses. Staff record the actual selection here, and the printed livery
-- contract reflects exactly what was selected. Standard-package columns
-- default to true so every existing horse keeps today's assumed behavior
-- (all three included) until staff explicitly opts one out.

begin;

do $$
begin
  if to_regclass('public.horses') is null then
    raise exception 'horses table must exist before this migration';
  end if;
end $$;

alter table public.horses
  add column if not exists standard_wash boolean not null default true,
  add column if not exists standard_feed boolean not null default true,
  add column if not exists standard_cleaning boolean not null default true,
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
