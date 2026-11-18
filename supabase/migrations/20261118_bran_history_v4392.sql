-- v4.39.2 Bran stock: cce_feed_account_month also returns `history`, one row
-- per month from the account's first entry to the selected month:
-- opening (carried over), purchased, adjusted, allocation (share), total,
-- issued, closing. The app shows it as a single monthly balance table.
-- Balance logic is unchanged from v4.39.0.

CREATE OR REPLACE FUNCTION public.cce_feed_account_month(p_account_id bigint, p_month date)
 RETURNS jsonb
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO 'public', 'pg_temp'
AS $function$
declare
  v_acc public.feed_accounts%rowtype;
  v_month date:=date_trunc('month',p_month)::date;
  v_stable numeric;
  v_total int;
  v_horses jsonb;
  v_count int;
  v_alloc numeric;
  v_first date;
  v_open numeric:=0;
  v_row record;
  v_result jsonb;
  v_hist jsonb:='[]'::jsonb;
  v_close numeric;
begin
  select * into v_acc from public.feed_accounts where id=p_account_id;
  if not found then return null; end if;
  select stable_monthly_bags into v_stable from public.feed_settings where item=v_acc.item;
  select count(*) into v_total from public.horses where status='Available';
  select coalesce(jsonb_agg(jsonb_build_object('horse_name',trim(h.horse_name),'owner',h.owner,'stable_no',h.stable_no) order by h.stable_no,h.horse_name),'[]'::jsonb),count(*)
    into v_horses,v_count
  from public.horses h
  where h.status='Available' and lower(trim(h.owner))=any(select lower(trim(o)) from unnest(v_acc.owners) o);
  v_alloc:=coalesce(v_acc.monthly_allocation,round(coalesce(v_stable,0)*v_count/nullif(v_total,0),1),0);
  select date_trunc('month',min(entry_date))::date into v_first from public.feed_ledger where account_id=v_acc.id;
  v_first:=least(coalesce(v_first,v_month),v_month);
  for v_row in
    select m::date as month,
      coalesce(sum(l.qty) filter (where l.kind='issue'),0) as issued,
      coalesce(sum(l.qty) filter (where l.kind='purchase'),0) as purchased,
      coalesce(sum(l.qty) filter (where l.kind='adjust'),0) as adjusted
    from generate_series(v_first,v_month,interval '1 month') m
    left join public.feed_ledger l on l.account_id=v_acc.id and date_trunc('month',l.entry_date)=m
    group by m order by m
  loop
    v_close:=v_open+v_row.purchased+v_row.adjusted+v_alloc-v_row.issued;
    v_hist:=v_hist||jsonb_build_array(jsonb_build_object(
      'month',to_char(v_row.month,'YYYY-MM'),'opening',v_open,'purchased',v_row.purchased,'adjusted',v_row.adjusted,
      'allocation',v_alloc,'total',v_open+v_row.purchased+v_row.adjusted+v_alloc,'issued',v_row.issued,'closing',v_close));
    if v_row.month<v_month then
      v_open:=v_close;
    else
      v_result:=jsonb_build_object(
        'id',v_acc.id,'name',v_acc.name,'item',v_acc.item,'owners',to_jsonb(v_acc.owners),
        'month',to_char(v_month,'YYYY-MM'),'horses',v_horses,'horse_count',v_count,
        'stable_monthly_bags',v_stable,'total_horses',v_total,
        'allocation',v_alloc,'allocation_fixed',v_acc.monthly_allocation is not null,
        'issued',v_row.issued,'purchased',v_row.purchased,'adjusted',v_row.adjusted,
        'from_own',greatest(v_row.issued-v_alloc,0),'allocation_left',greatest(v_alloc-v_row.issued,0),
        'opening_balance',v_open,
        'closing_balance',v_close,
        'history',v_hist,
        'entries',coalesce((select jsonb_agg(jsonb_build_object('id',l.id,'date',to_char(l.entry_date,'YYYY-MM-DD'),'kind',l.kind,'qty',l.qty,'note',l.note) order by l.entry_date,l.id)
          from public.feed_ledger l where l.account_id=v_acc.id and date_trunc('month',l.entry_date)=v_month),'[]'::jsonb));
    end if;
  end loop;
  return v_result;
end;
$function$;
