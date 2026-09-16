-- CCE StableOS v4.25.0 — Per-horse livery add-ons verification

select column_name, data_type, column_default
from information_schema.columns
where table_schema='public' and table_name='horses'
  and column_name in (
    'standard_wash','standard_feed','standard_cleaning',
    'extra_shower','extra_vip_shower','extra_cleaning','extra_outdoor_leading','extra_training',
    'feed_teben','feed_hay','feed_wood_shavings','livery_notes'
  )
order by column_name;
-- Expected: 12 rows. standard_wash/standard_feed/standard_cleaning are boolean,
-- not null, default true. The 8 extra_*/feed_* columns are boolean, not null,
-- default false. livery_notes is text with no default.
