-- CCE StableOS v4.23.0 — Dashboard financial-summary permission preflight

select
  to_regclass('public.app_permissions') is not null as app_permissions_ready,
  to_regclass('public.role_permissions') is not null as role_permissions_ready,
  not exists(select 1 from public.app_permissions where code='dashboard.financial_summary.view') as permission_not_yet_added;

do $$
begin
  if to_regclass('public.app_permissions') is null
     or to_regclass('public.role_permissions') is null
     or to_regprocedure('public.cce_has_permission(text)') is null then
    raise exception 'CCE unified member portal (v4.7.0) must be applied before this permission';
  end if;
end $$;
