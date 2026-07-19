-- CCE v3.2.0 — read-only live database inventory.
-- This file does not create, update, move, or delete any data.

-- 1) Public tables and estimated row counts.
select
  n.nspname as schema_name,
  c.relname as table_name,
  c.reltuples::bigint as estimated_rows,
  c.relrowsecurity as rls_enabled
from pg_class c
join pg_namespace n on n.oid = c.relnamespace
where c.relkind = 'r'
  and n.nspname in ('public', 'cce_archive')
order by n.nspname, c.relname;

-- 2) Foreign-key relationships.
select
  tc.table_schema,
  tc.table_name,
  kcu.column_name,
  ccu.table_schema as referenced_schema,
  ccu.table_name as referenced_table,
  ccu.column_name as referenced_column,
  rc.delete_rule,
  rc.update_rule
from information_schema.table_constraints tc
join information_schema.key_column_usage kcu
  on tc.constraint_name = kcu.constraint_name
 and tc.constraint_schema = kcu.constraint_schema
join information_schema.referential_constraints rc
  on tc.constraint_name = rc.constraint_name
 and tc.constraint_schema = rc.constraint_schema
join information_schema.constraint_column_usage ccu
  on rc.unique_constraint_name = ccu.constraint_name
 and rc.unique_constraint_schema = ccu.constraint_schema
where tc.constraint_type = 'FOREIGN KEY'
  and tc.table_schema = 'public'
order by tc.table_name, kcu.column_name;

-- 3) RLS policies.
select schemaname, tablename, policyname, roles, cmd, permissive
from pg_policies
where schemaname = 'public'
order by tablename, policyname;

-- 4) CCE functions and security mode.
select
  n.nspname as schema_name,
  p.proname as function_name,
  pg_get_function_identity_arguments(p.oid) as arguments,
  p.prosecdef as security_definer,
  p.provolatile as volatility
from pg_proc p
join pg_namespace n on n.oid = p.pronamespace
where n.nspname = 'public'
  and p.proname like 'cce_%'
order by p.proname;

-- 5) Core integrity checks.
select 'health profiles without horse' as check_name, count(*) as issue_count
from public.horse_health_profiles hp
left join public.horses h on h.id = hp.horse_id
where h.id is null
union all
select 'health events without horse', count(*)
from public.horse_health_events he
left join public.horses h on h.id = he.horse_id
where h.id is null
union all
select 'duplicate health profiles per horse', count(*)
from (
  select horse_id
  from public.horse_health_profiles
  group by horse_id
  having count(*) > 1
) d
union all
select 'horses with missing operational status', count(*)
from public.horses
where status is null or btrim(status) = ''
union all
select 'profiles with missing role', count(*)
from public.profiles p
left join public.app_roles r on r.id = p.role_id
where r.id is null;
