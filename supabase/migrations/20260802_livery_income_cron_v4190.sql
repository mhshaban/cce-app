-- CCE StableOS v4.19.0 — Scheduled monthly livery income creation
-- The monthly livery payment reminder (v4.18.1 fix) only ran when someone
-- opened the dashboard, so owners never showed up in Overdue Income until
-- staff happened to log in after the 1st. This adds a pg_cron job that
-- runs cce_create_monthly_livery_income() daily — idempotent per month,
-- so current-month Pending rows exist automatically without anyone
-- opening the app. The client-side check in app-core.js is left in place
-- as a redundant safety net (both use the same "skip if a row already
-- exists this month" guard, so running both is harmless).
--
-- NOTE: enabling pg_cron may require a manual step in the Supabase
-- dashboard (Database -> Extensions -> pg_cron) on some projects; see
-- docs/DEPLOYMENT_V4190.md if the CREATE EXTENSION statement below fails.

begin;

do $$
begin
  if to_regclass('public.horses') is null or to_regclass('public.income') is null then
    raise exception 'Core horses/income tables must exist before scheduling livery income creation';
  end if;
end $$;

-- pg_cron is unavailable on some Postgres environments (e.g. local test
-- databases); create it best-effort so the function below still gets
-- created and is independently testable even where scheduling can't run.
do $$
begin
  create extension if not exists pg_cron with schema extensions;
exception when others then
  raise notice 'pg_cron extension unavailable in this environment — cce_create_monthly_livery_income() will be created but not scheduled here.';
end $$;

-- System-only maintenance function: invoked by pg_cron, never by client
-- roles (no cce_has_permission check — there is no authenticated session
-- when pg_cron fires it, and EXECUTE is revoked from anon/authenticated).
create or replace function public.cce_create_monthly_livery_income()
returns integer
language plpgsql
security definer
set search_path=public,pg_temp
as $$
declare
  v_month text:=to_char(timezone('Asia/Bahrain',now()),'YYYY-MM');
  v_due_date date:=(v_month||'-01')::date;
  v_today date:=timezone('Asia/Bahrain',now())::date;
  v_created integer:=0;
  v_horse record;
  v_amount numeric(12,3);
begin
  for v_horse in
    select horse_name,owner,livery_bd,ac_livery_bd
    from public.horses
    where status='Available'
      and (coalesce(livery_bd,0)>0 or coalesce(ac_livery_bd,0)>0)
  loop
    if exists (
      select 1 from public.income
      where horse_name=v_horse.horse_name
        and activity like 'Livery%'
        and due_date is not null
        and to_char(due_date,'YYYY-MM')=v_month
    ) then
      continue;
    end if;
    v_amount:=case when coalesce(v_horse.ac_livery_bd,0)>0 then v_horse.ac_livery_bd else v_horse.livery_bd end;
    insert into public.income(date,due_date,customer_name,horse_name,activity,qty,amount_bd,paid_bd,notes,status)
    values(
      v_today,v_due_date,coalesce(v_horse.owner,'Owner'),v_horse.horse_name,'Livery',1,v_amount,0,
      'Automatic monthly livery payment — '||v_horse.horse_name,'Pending'
    );
    v_created:=v_created+1;
  end loop;
  return v_created;
end;
$$;

revoke all on function public.cce_create_monthly_livery_income() from public,anon,authenticated;

do $$
begin
  if exists (select 1 from pg_extension where extname='pg_cron') then
    if exists (select 1 from cron.job where jobname='cce-monthly-livery-income') then
      perform cron.unschedule('cce-monthly-livery-income');
    end if;
    perform cron.schedule(
      'cce-monthly-livery-income',
      '0 3 * * *',
      $sched$select public.cce_create_monthly_livery_income();$sched$
    );
  else
    raise notice 'pg_cron not installed — cce_create_monthly_livery_income() exists but is not scheduled. Enable pg_cron (Database > Extensions in Supabase) and re-run this migration to schedule it.';
  end if;
end $$;

comment on function public.cce_create_monthly_livery_income() is
  'System-only: creates the current month''s Pending livery income row for each Available horse with Livery or AC Livery set, if one does not already exist. Scheduled daily via pg_cron (job cce-monthly-livery-income); not callable by any client role.';

commit;
