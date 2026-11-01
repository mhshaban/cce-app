-- CCE StableOS v4.33.0 — Seasonal monthly livery income preflight
-- v4190_ready must be true. The list shows the AC horses whose monthly
-- price changes with the season (winter = livery_bd, summer = ac_livery_bd).

select to_regprocedure('public.cce_create_monthly_livery_income()') is not null as v4190_ready;

select stable_no,horse_name,livery_type,livery_bd as winter_bd,ac_livery_bd as summer_bd
from public.horses
where status='Available' and coalesce(livery_bd,0)>0 and coalesce(ac_livery_bd,0)>0 and livery_bd<>ac_livery_bd
order by stable_no;

do $$
begin
  if to_regprocedure('public.cce_create_monthly_livery_income()') is null then
    raise exception 'v4.19.0 monthly livery income must be applied before this migration';
  end if;
end $$;
