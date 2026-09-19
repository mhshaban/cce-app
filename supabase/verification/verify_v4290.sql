-- CCE StableOS v4.29.0 — Breeding boarding total verification

select column_name, data_type, is_nullable, column_default
from information_schema.columns
where table_schema='public' and table_name='breeding' and column_name='boarding_days';
-- Expected: one row, integer, not null, default 0.
