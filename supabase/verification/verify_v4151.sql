-- CCE StableOS v4.15.1 — Joker doubling fix verification

select
  to_regprocedure('public.cce_save_show_office_fence_score(bigint,text,integer,boolean,boolean,boolean,integer)') is not null
    as confirm_rpc_exists,
  has_function_privilege('authenticated','public.cce_save_show_office_fence_score(bigint,text,integer,boolean,boolean,boolean,integer)','EXECUTE')
    as authenticated_can_confirm_fence_score,
  not has_function_privilege('anon','public.cce_save_show_office_fence_score(bigint,text,integer,boolean,boolean,boolean,integer)','EXECUTE')
    as anon_cannot_confirm_fence_score;

select obj_description('public.cce_save_show_office_fence_score(bigint,text,integer,boolean,boolean,boolean,integer)'::regprocedure) ilike '%only the Joker fence%'
  as fix_comment_present;

-- v4.15.0 schema stays untouched — no columns or tables were dropped or added.
select
  count(*)=2 as class_accumulator_columns_still_exist
from information_schema.columns
where table_schema='public' and table_name='show_office_classes'
  and column_name in ('scoring_format','joker_fence_number');
