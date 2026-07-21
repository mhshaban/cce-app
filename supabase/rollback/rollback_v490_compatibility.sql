-- CCE StableOS v4.9.0 — non-destructive Show Office compatibility rollback
-- Preserves every competition row while disabling browser access.

begin;

revoke select,insert,update,delete on public.show_office_competitions from authenticated;

drop policy if exists cce_show_office_competitions_select on public.show_office_competitions;
drop policy if exists cce_show_office_competitions_insert on public.show_office_competitions;
drop policy if exists cce_show_office_competitions_update on public.show_office_competitions;
drop policy if exists cce_show_office_competitions_delete on public.show_office_competitions;

update public.role_permissions
set allowed=false
where permission_code like 'show_office.%';

commit;
