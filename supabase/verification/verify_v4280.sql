-- CCE StableOS v4.28.0 — Breeding agreement verification

select column_name, data_type, column_default
from information_schema.columns
where table_schema='public' and table_name='breeding'
  and column_name in (
    'stallion_name','stallion_breed','mare_breed','owner_id','owner_email',
    'package_price_bd','boarding_plan','agreement_date'
  )
order by column_name;
-- Expected: 8 rows. package_price_bd is numeric, not null, default 0. The rest are nullable with no default.
