-- CCE StableOS v4.12.0 compatibility rollback
-- Preserves Sprint 4 tables, scores and audit history while removing browser
-- access and restoring the v4.11 Show Office backup RPC.

begin;

drop function if exists public.cce_restore_show_office_module(jsonb);
do $$
begin
  if to_regprocedure('public.cce_restore_show_office_through_entries(jsonb)') is not null then
    alter function public.cce_restore_show_office_through_entries(jsonb)
      rename to cce_restore_show_office_module;
  end if;
end $$;
revoke all on function public.cce_restore_show_office_module(jsonb)
  from public,anon,authenticated;
grant execute on function public.cce_restore_show_office_module(jsonb)
  to authenticated;

drop function if exists public.cce_restore_show_office_judging_data(jsonb);
drop function if exists public.cce_reopen_show_office_class(bigint);
drop function if exists public.cce_finalize_show_office_class(bigint);
drop function if exists public.cce_reset_show_office_score(bigint,text,integer);
drop function if exists public.cce_save_show_office_score(bigint,text,integer,numeric,smallint,boolean,boolean,boolean,integer);
drop function if exists public.cce_show_office_judge_panel(bigint);
drop function if exists public.cce_show_office_judging_context();

drop policy if exists cce_show_office_class_judging_select
  on public.show_office_class_judging;
drop policy if exists cce_show_office_entry_rounds_select
  on public.show_office_entry_rounds;
drop policy if exists cce_show_office_score_revisions_select
  on public.show_office_score_revisions;

revoke all on public.show_office_class_judging,
  public.show_office_entry_rounds,
  public.show_office_score_revisions
  from anon,authenticated;
revoke all on sequence public.show_office_entry_rounds_id_seq,
  public.show_office_score_revisions_id_seq
  from anon,authenticated;

update public.role_permissions rp set allowed=false
from public.app_roles r
where rp.role_id=r.id
  and r.code in ('super_admin','manager','judge')
  and rp.permission_code like 'show_office.judging.%';

commit;
