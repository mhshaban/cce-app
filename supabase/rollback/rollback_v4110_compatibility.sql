-- CCE StableOS v4.11.0 compatibility rollback
-- Preserves all Sprint 3 tables and records while removing browser access and
-- restoring the v4.10 competitions/classes backup RPC.

begin;

drop function if exists public.cce_restore_show_office_module(jsonb);
do $$
begin
  if to_regprocedure('public.cce_restore_show_office_competitions_classes(jsonb)') is not null then
    alter function public.cce_restore_show_office_competitions_classes(jsonb)
      rename to cce_restore_show_office_module;
  end if;
end $$;
revoke all on function public.cce_restore_show_office_module(jsonb) from public,anon,authenticated;
grant execute on function public.cce_restore_show_office_module(jsonb) to authenticated;

drop function if exists public.cce_restore_show_office_entry_data(jsonb);
drop function if exists public.cce_save_show_office_entry(bigint,integer,bigint,bigint,text,bigint,bigint,text,bigint,text);
drop function if exists public.cce_show_office_entries_page(bigint,text,integer,integer);
drop function if exists public.cce_show_office_entry_directory(text,integer);
drop function if exists public.cce_show_office_entry_context();

drop policy if exists cce_show_office_entries_select on public.show_office_entries;
drop policy if exists cce_show_office_entries_insert on public.show_office_entries;
drop policy if exists cce_show_office_entries_update on public.show_office_entries;
drop policy if exists cce_show_office_entries_delete on public.show_office_entries;
drop policy if exists cce_show_office_riders_select on public.show_office_riders;
drop policy if exists cce_show_office_horses_select on public.show_office_horses;
drop policy if exists cce_show_office_stables_select on public.show_office_stables;

revoke all on public.show_office_riders,public.show_office_horses,
  public.show_office_stables,public.show_office_entries from anon,authenticated;
revoke all on sequence public.show_office_entries_id_seq from anon,authenticated;

update public.role_permissions rp set allowed=false
from public.app_roles r
where rp.role_id=r.id
  and r.code in ('super_admin','manager')
  and rp.permission_code like 'show_office.entries.%';

commit;
