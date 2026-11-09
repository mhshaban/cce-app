-- CCE StableOS v4.35.0 — Bran stock verification
-- Expected: settings 100, one account, 50 ledger rows (2 purchases + 48 issues),
-- October: issued 26, purchased 15, and the November opening balance.

select
  (select stable_monthly_bags from public.feed_settings where item='Bran') as stable_monthly_bags,
  (select count(*) from public.feed_accounts) as accounts,
  (select count(*) from public.feed_ledger) as ledger_rows,
  public.cce_feed_account_month((select id from public.feed_accounts where name='Abdulla & Hashem'),'2026-10-01')
    - 'entries' - 'horses' as october,
  public.cce_feed_account_month((select id from public.feed_accounts where name='Abdulla & Hashem'),'2026-11-01')
    - 'entries' - 'horses' as november;
