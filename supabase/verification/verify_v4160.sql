-- CCE StableOS v4.16.0 — Joker alternate fence choice verification

select
  to_regprocedure('public.cce_show_office_choose_joker_fence(bigint,text,smallint,boolean,integer)') is not null
    as choose_joker_fence_exists,
  has_function_privilege('authenticated','public.cce_show_office_choose_joker_fence(bigint,text,smallint,boolean,integer)','EXECUTE')
    as authenticated_can_choose_joker_fence,
  not has_function_privilege('anon','public.cce_show_office_choose_joker_fence(bigint,text,smallint,boolean,integer)','EXECUTE')
    as anon_cannot_choose_joker_fence,
  to_regprocedure('public.cce_show_office_toggle_fence(bigint,text,smallint,text,integer)') is not null
    as toggle_fence_signature_unchanged;

select
  exists(
    select 1 from information_schema.columns
    where table_schema='public' and table_name='show_office_entry_fences' and column_name='joker_chosen'
      and data_type='boolean' and is_nullable='NO'
  ) as joker_chosen_column_ready;

select obj_description('public.cce_show_office_choose_joker_fence(bigint,text,smallint,boolean,integer)'::regprocedure) ilike '%Joker%'
  as choose_joker_fence_comment_present;
select obj_description('public.cce_save_show_office_fence_score(bigint,text,integer,boolean,boolean,boolean,integer)'::regprocedure) ilike '%joker_chosen%'
  as save_fence_score_comment_updated;
select obj_description('public.cce_show_office_judge_panel(bigint)'::regprocedure) ilike '%joker_chosen%'
  as judge_panel_comment_updated;

-- v4.15.x schema stays untouched — no columns or tables were dropped.
select
  count(*)=2 as class_accumulator_columns_still_exist
from information_schema.columns
where table_schema='public' and table_name='show_office_classes'
  and column_name in ('scoring_format','joker_fence_number');
