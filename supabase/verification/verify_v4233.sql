-- CCE StableOS v4.23.3 — cce_my_access() staff portal fix verification

select
  pg_get_functiondef('public.cce_my_access()'::regprocedure) ilike '%r.code=''staff'' then ''staff''%'
    as staff_portal_case_present;

-- No columns or tables were touched — this only changes what cce_my_access()
-- computes for the 'portal' field.
select
  to_regprocedure('public.cce_my_access()') is not null as my_access_still_exists;
