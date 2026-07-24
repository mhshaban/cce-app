-- CCE StableOS v4.13.0 — Show Office Sprint 5 preflight

select
  to_regclass('public.show_office_class_judging') is not null as judging_table_ready,
  to_regclass('public.show_office_entry_rounds') is not null as score_table_ready,
  to_regprocedure('public.cce_show_office_judging_context()') is not null as context_rpc_ready,
  to_regprocedure('public.cce_show_office_judge_panel(bigint)') is not null as panel_rpc_ready,
  to_regprocedure('public.cce_has_permission(text)') is not null as permissions_ready;

select
  count(*) as results_permission_already_exists
from public.app_permissions
where code='show_office.results.view';

do $$
begin
  if to_regclass('public.show_office_class_judging') is null
     or to_regclass('public.show_office_entry_rounds') is null
     or to_regprocedure('public.cce_show_office_judging_context()') is null
     or to_regprocedure('public.cce_show_office_judge_panel(bigint)') is null then
    raise exception 'Show Office v4.12.0 must be applied before Sprint 5 preflight can pass';
  end if;
  if not exists(select 1 from public.app_roles where code in ('reception','staff','judge')) then
    raise exception 'Sprint 5 preflight expected reception, staff and judge roles to already exist';
  end if;
end $$;
