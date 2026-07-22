-- CCE StableOS v4.10.0 — non-destructive Show Office Sprint 2 rollback
-- Preserves every class and competition while disabling Sprint 2 browser access.

begin;

revoke all on function public.cce_restore_show_office_module(jsonb) from public,anon,authenticated;
drop function if exists public.cce_restore_show_office_module(jsonb);
revoke all on function public.cce_show_office_class_competitions() from public,anon,authenticated;
drop function if exists public.cce_show_office_class_competitions();

revoke select,insert,update,delete on public.show_office_classes from authenticated;

drop policy if exists cce_show_office_classes_select on public.show_office_classes;
drop policy if exists cce_show_office_classes_insert on public.show_office_classes;
drop policy if exists cce_show_office_classes_update on public.show_office_classes;
drop policy if exists cce_show_office_classes_delete on public.show_office_classes;

update public.role_permissions
set allowed=false
where permission_code like 'show_office.classes.%';

-- Restore the v4.9.1 competition read policy while leaving class rows protected.
drop policy if exists cce_show_office_competitions_select on public.show_office_competitions;
create policy cce_show_office_competitions_select
on public.show_office_competitions for select to authenticated
using (
  public.cce_has_permission('show_office.view')
  or public.cce_has_permission('show_office.competitions.view')
);

commit;
