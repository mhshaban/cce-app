-- CCE StableOS v4.9.0 — Show Office preflight (read-only)

select
  to_regclass('public.app_permissions') is not null as permissions_ready,
  to_regclass('public.app_roles') is not null as roles_ready,
  to_regclass('public.role_permissions') is not null as role_permissions_ready,
  to_regprocedure('public.cce_has_permission(text)') is not null as permission_function_ready,
  to_regprocedure('public.cce_touch_updated_at()') is not null as timestamp_function_ready;

select
  to_regclass('public.show_office_competitions') is not null as competition_table_already_exists,
  case when to_regclass('public.show_office_competitions') is null then 'Ready for first application'
       else 'Existing table detected — verify its columns before reapplying' end as note;
