-- CCE StableOS v4.7.0 — read-only preflight
-- Save/export the result before applying the migration.

select current_database() as database_name,
       current_user as database_user,
       now() as checked_at,
       current_setting('TimeZone') as database_timezone;

with required(table_name) as (
  values ('income'),('expenses'),('horses'),('schedule'),('profiles'),
         ('app_permissions'),('app_roles'),('role_permissions'),
         ('audit_logs'),('horse_health_profiles'),('horse_health_events')
)
select r.table_name,
       to_regclass('public.'||r.table_name) is not null as exists
from required r
order by r.table_name;

select 'income' as table_name,count(*) as rows from public.income
union all select 'expenses',count(*) from public.expenses
union all select 'horses',count(*) from public.horses
union all select 'schedule',count(*) from public.schedule
union all select 'profiles',count(*) from public.profiles
union all select 'horse_health_events',count(*) from public.horse_health_events
order by table_name;

-- A healthy result returns zero in every issue_count column.
select
  count(*) filter (where date is null) as income_missing_date,
  count(*) filter (where amount_bd<0 or paid_bd<0) as income_negative_amount,
  count(*) filter (where paid_bd>amount_bd) as income_overpaid
from public.income;

select
  count(*) filter (where date is null) as expenses_missing_date,
  count(*) filter (where amount_bd<0 or paid_bd<0) as expenses_negative_amount,
  count(*) filter (where paid_bd>amount_bd) as expenses_overpaid
from public.expenses;

select horse_id,count(*) as duplicate_profiles
from public.horse_health_profiles
group by horse_id
having count(*)>1;

select p.id,p.email,p.is_active,r.code as role_code
from public.profiles p
left join public.app_roles r on r.id=p.role_id
where p.is_active is true and r.id is null;

select p.proname,
       pg_get_function_identity_arguments(p.oid) as arguments,
       p.prosecdef as security_definer
from pg_proc p
join pg_namespace n on n.oid=p.pronamespace
where n.nspname='public'
  and p.proname in ('cce_touch_updated_at','cce_is_booking_record','cce_has_permission')
order by p.proname;
