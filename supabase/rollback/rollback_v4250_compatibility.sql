-- Compatibility rollback for v4.25.0 (per-horse livery add-ons).
-- Drops the added columns. Emergency use only — any standard-package
-- opt-outs and add-on selections staff have recorded will be lost; the
-- printed livery contract falls back to showing the full standard package
-- as included and "None selected" for Extra Care Add-ons and Feed
-- Selection, identical to pre-v4.25.0 behavior. No other data is affected.

begin;

alter table public.horses
  drop column if exists standard_wash,
  drop column if exists standard_feed,
  drop column if exists standard_cleaning,
  drop column if exists extra_shower,
  drop column if exists extra_vip_shower,
  drop column if exists extra_cleaning,
  drop column if exists extra_outdoor_leading,
  drop column if exists extra_training,
  drop column if exists feed_teben,
  drop column if exists feed_hay,
  drop column if exists feed_wood_shavings,
  drop column if exists livery_notes;

commit;
