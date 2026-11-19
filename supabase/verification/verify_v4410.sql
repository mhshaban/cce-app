-- CCE StableOS v4.41.0 — staff training booking RPC verification
select
  to_regprocedure('public.cce_admin_create_training_booking(text,text,text,jsonb,text,text,text,date,text,numeric)') is not null as function_exists,
  has_function_privilege('authenticated','public.cce_admin_create_training_booking(text,text,text,jsonb,text,text,text,date,text,numeric)','EXECUTE') as authenticated_can_execute,
  not has_function_privilege('anon','public.cce_admin_create_training_booking(text,text,text,jsonb,text,text,text,date,text,numeric)','EXECUTE') as anon_cannot_execute;
