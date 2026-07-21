-- CCE StableOS v4.9.0 — Show Office verification

select
  to_regclass('public.show_office_competitions') is not null as competition_table_exists,
  to_regprocedure('public.cce_show_office_stamp_competition()') is not null as audit_stamp_exists;

select count(*)=5 as all_show_office_permissions_exist
from public.app_permissions
where code in (
  'show_office.view',
  'show_office.competitions.view',
  'show_office.competitions.create',
  'show_office.competitions.update',
  'show_office.competitions.delete'
);

select r.code,count(*)=5 as has_all_show_office_permissions
from public.app_roles r
join public.role_permissions rp on rp.role_id=r.id and rp.allowed=true
where r.code in ('super_admin','manager') and rp.permission_code like 'show_office.%'
group by r.code
order by r.code;

select count(*)=4 as all_competition_policies_exist
from pg_policies
where schemaname='public'
  and tablename='show_office_competitions'
  and policyname in (
    'cce_show_office_competitions_select',
    'cce_show_office_competitions_insert',
    'cce_show_office_competitions_update',
    'cce_show_office_competitions_delete'
  );

select count(*) as invalid_status_count
from public.show_office_competitions
where status not in ('Draft','Open','Running','Finished');

select count(*) as duplicate_name_date_count
from (
  select lower(trim(competition_name)),competition_date
  from public.show_office_competitions
  group by lower(trim(competition_name)),competition_date
  having count(*)>1
) duplicates;
