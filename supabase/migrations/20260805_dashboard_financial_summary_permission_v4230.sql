-- CCE StableOS v4.23.0 — Dashboard financial-summary visibility permission
-- Adds a permission that gates the revenue/expense aggregate stat tiles on
-- the main Dashboard page (Gross Collected, Stable Revenue, Instructor
-- Shares, Total Expenses, Net Overdue, Total Lessons, Total Hack), separate
-- from dashboard.view itself. Granted by default to the roles that already
-- see the full dashboard today (super_admin, manager, reception) so their
-- experience is unchanged; a read-only/limited role such as accountant is
-- not granted it, and instead sees a simple read-only Overdue list inline
-- on the Dashboard.

begin;

do $$
begin
  if to_regclass('public.app_permissions') is null
     or to_regclass('public.role_permissions') is null
     or to_regprocedure('public.cce_has_permission(text)') is null then
    raise exception 'CCE unified member portal (v4.7.0) must be applied before this permission';
  end if;
end $$;

insert into public.app_permissions(code,category,name_en,name_ar)
values('dashboard.financial_summary.view','Finance','View dashboard financial summary','عرض الملخص المالي في لوحة التحكم')
on conflict (code) do nothing;

insert into public.role_permissions(role_id,permission_code,allowed)
select r.id,'dashboard.financial_summary.view',true
from public.app_roles r
where r.code in ('super_admin','manager','reception')
on conflict (role_id,permission_code) do update set allowed=true;

commit;
