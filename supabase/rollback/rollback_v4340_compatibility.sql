-- Compatibility rollback for v4.34.0 (daily paddock schedule).
-- Drops the paddock schedule RPC, the paddock_slots table (the board's
-- slots are lost) and the paddocks.* permissions. Nothing else is touched.
-- Emergency use only.

begin;

drop function if exists public.cce_paddock_schedule(date);
drop function if exists public.cce_paddock_schedule();
drop function if exists public.cce_paddock_lessons(date);
drop table if exists public.paddock_slots;
delete from public.user_permissions where permission_code in ('paddocks.view','paddocks.manage');
delete from public.role_permissions where permission_code in ('paddocks.view','paddocks.manage');
delete from public.app_permissions where code in ('paddocks.view','paddocks.manage');

commit;
