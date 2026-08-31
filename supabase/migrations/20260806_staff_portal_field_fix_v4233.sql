-- CCE StableOS v4.23.3 — Hotfix: cce_my_access() never returned 'staff' as portal
-- Root cause of "Lakh Singh's page never changed" across every device: the
-- server-computed 'portal' field only special-cased owner/trainer roles and
-- fell back to the literal string 'dashboard' for every other role
-- (including staff) — never null/empty. The client's routeForMember() reads
-- memberAccess.portal first and only falls back to role.code when portal is
-- falsy, so it always saw 'dashboard' for a staff-role account and could
-- never match its `portal === 'staff'` check, no matter what permissions
-- were granted. This was broken from v4.22.0's very first release.

begin;

do $$
begin
  if to_regprocedure('public.cce_my_access()') is null then
    raise exception 'CCE unified member portal (v4.7.0) must be applied before this fix';
  end if;
end $$;

create or replace function public.cce_my_access()
returns jsonb
language sql
stable
security definer
set search_path=public
as $$
  select jsonb_build_object(
    'profile',jsonb_build_object(
      'id',p.id,'email',p.email,'username',p.username,'full_name',p.full_name,'phone',p.phone,
      'role_id',p.role_id,'is_active',p.is_active,'owner_name',p.owner_name,'instructor_id',p.instructor_id
    ),
    'role',jsonb_build_object('id',r.id,'code',r.code,'name_en',r.name_en,'name_ar',r.name_ar),
    'portal',case when r.code='owner' then 'owner' when r.code='trainer' then 'trainer' when r.code='staff' then 'staff' else 'dashboard' end,
    'instructor_name',(select i.name from public.instructors i where i.id=p.instructor_id limit 1),
    'permissions',coalesce((
      select jsonb_agg(ap.code order by ap.code)
      from public.app_permissions ap
      where public.cce_has_permission(ap.code)
    ),'[]'::jsonb)
  )
  from public.profiles p
  left join public.app_roles r on r.id=p.role_id
  where p.id=auth.uid() and p.is_active is true
  limit 1;
$$;

commit;
