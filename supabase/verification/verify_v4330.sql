-- CCE StableOS v4.33.0 — Seasonal monthly livery income verification
-- Expected: winter_price=65, summer_price=100, and zero unpaid automatic
-- rows this month that still carry the off-season price.

select
  public.cce_livery_monthly_amount(65,100,11) as winter_price,
  public.cce_livery_monthly_amount(65,100,7) as summer_price,
  (select count(*) from public.income i join public.horses h on trim(h.horse_name)=trim(i.horse_name)
    where i.activity='Livery' and i.status='Pending' and coalesce(i.paid_bd,0)=0
      and i.notes like 'Automatic monthly livery payment%'
      and to_char(i.due_date,'YYYY-MM')=to_char(timezone('Asia/Bahrain',now()),'YYYY-MM')
      and i.amount_bd<>public.cce_livery_monthly_amount(h.livery_bd,h.ac_livery_bd,extract(month from i.due_date)::integer)
  ) as current_month_off_season_rows;
