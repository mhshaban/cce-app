-- Compatibility rollback for v4.23.3 (cce_my_access staff portal fix).
-- Restores the pre-fix function body (portal falls back to 'dashboard' for
-- the staff role again). No columns, tables or data are affected.
-- Emergency use only.

begin;

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
    'portal',case when r.code='owner' then 'owner' when r.code='trainer' then 'trainer' else 'dashboard' end,
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
