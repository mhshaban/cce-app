-- Compatibility rollback for v4.19.0 (scheduled livery income creation).
-- Unschedules the cron job and drops the function. Does NOT disable the
-- pg_cron extension itself (other jobs may depend on it) and does not
-- touch any income/horses data already created. Emergency use only.

begin;

do $$
begin
  if exists (select 1 from pg_extension where extname='pg_cron') then
    if exists (select 1 from cron.job where jobname='cce-monthly-livery-income') then
      perform cron.unschedule('cce-monthly-livery-income');
    end if;
  end if;
end $$;

drop function if exists public.cce_create_monthly_livery_income();

commit;
