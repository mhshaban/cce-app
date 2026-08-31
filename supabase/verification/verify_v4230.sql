-- CCE StableOS v4.23.0 — Dashboard financial-summary permission verification

select
  exists(select 1 from public.app_permissions where code='dashboard.financial_summary.view') as permission_exists;

select r.code, coalesce(rp.allowed,false) as allowed
from public.app_roles r
left join public.role_permissions rp
  on rp.role_id=r.id and rp.permission_code='dashboard.financial_summary.view'
where r.code in ('super_admin','manager','reception','accountant')
order by r.code;
-- Expected: super_admin/manager/reception = true, accountant = false.
