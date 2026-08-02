-- CCE StableOS v4.19.0 — Scheduled livery income creation preflight

select
  to_regclass('public.horses') is not null as horses_ready,
  to_regclass('public.income') is not null as income_ready,
  to_regprocedure('public.cce_create_monthly_livery_income()') is null as function_not_yet_added;

do $$
begin
  if to_regclass('public.horses') is null or to_regclass('public.income') is null then
    raise exception 'Core horses/income tables must exist before scheduling livery income creation';
  end if;
end $$;
