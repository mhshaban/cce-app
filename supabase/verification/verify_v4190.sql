-- CCE StableOS v4.19.0 — Scheduled livery income creation verification

select
  to_regprocedure('public.cce_create_monthly_livery_income()') is not null as function_exists,
  not has_function_privilege('authenticated','public.cce_create_monthly_livery_income()','EXECUTE')
    as authenticated_cannot_call_directly,
  not has_function_privilege('anon','public.cce_create_monthly_livery_income()','EXECUTE')
    as anon_cannot_call_directly;

select
  exists(select 1 from cron.job where jobname='cce-monthly-livery-income') as cron_job_scheduled;

select jobname,schedule,active from cron.job where jobname='cce-monthly-livery-income';

select obj_description('public.cce_create_monthly_livery_income()'::regprocedure) ilike '%Scheduled daily via pg_cron%'
  as function_comment_present;
