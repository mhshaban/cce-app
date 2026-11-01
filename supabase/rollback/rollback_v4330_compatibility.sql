-- Compatibility rollback for v4.33.0 (seasonal monthly livery income).
-- Restores the v4.19.0 monthly livery function (A/C price whenever set,
-- exact horse-name match) and drops the seasonal price helper. Income rows
-- are left as they are. Safe to re-run.

begin;

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

drop function if exists public.cce_livery_monthly_amount(numeric,numeric,integer);

commit;
