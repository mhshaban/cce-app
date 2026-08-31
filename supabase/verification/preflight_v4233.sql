-- CCE StableOS v4.23.3 — cce_my_access() staff portal fix preflight

select
  to_regprocedure('public.cce_my_access()') is not null as my_access_ready,
  not (pg_get_functiondef('public.cce_my_access()'::regprocedure) ilike '%r.code=''staff'' then ''staff''%')
    as staff_portal_case_not_yet_added;

do $$
begin
  if to_regprocedure('public.cce_my_access()') is null then
    raise exception 'CCE unified member portal (v4.7.0) must be applied before this fix';
  end if;
end $$;
