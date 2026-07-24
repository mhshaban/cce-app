-- CCE StableOS v4.13.0 — Show Office Sprint 5 verification

select
  to_regprocedure('public.cce_show_office_judging_context()') is not null as context_rpc_exists,
  to_regprocedure('public.cce_show_office_judge_panel(bigint)') is not null as panel_rpc_exists;

select count(*)=1 as results_permission_exists
from public.app_permissions
where code='show_office.results.view';

select
  count(*) filter(where r.code in ('super_admin','manager','judge','reception','staff') and rp.allowed)=5
    as results_view_defaults_exist,
  count(*) filter(where r.code not in ('super_admin','manager','judge','reception','staff') and rp.allowed)=0
    as no_unexpected_results_view_grants
from public.role_permissions rp
join public.app_roles r on r.id=rp.role_id
where rp.permission_code='show_office.results.view';

select
  has_function_privilege('authenticated','public.cce_show_office_judging_context()','EXECUTE')
    as authenticated_can_read_context,
  not has_function_privilege('anon','public.cce_show_office_judging_context()','EXECUTE')
    as anon_cannot_read_context,
  has_function_privilege('authenticated','public.cce_show_office_judge_panel(bigint)','EXECUTE')
    as authenticated_can_read_panel,
  not has_function_privilege('anon','public.cce_show_office_judge_panel(bigint)','EXECUTE')
    as anon_cannot_read_panel;

-- Sprint 4 objects and data stay untouched by Sprint 5.
select
  to_regclass('public.show_office_class_judging') is not null as judging_table_exists,
  to_regclass('public.show_office_entry_rounds') is not null as score_table_exists,
  to_regclass('public.show_office_score_revisions') is not null as audit_table_exists,
  count(*)=4 as judging_permissions_exist
from public.app_permissions
where code in (
  'show_office.judging.view','show_office.judging.score',
  'show_office.judging.finalize','show_office.judging.reopen'
);
