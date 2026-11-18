-- v4.39.1 Bran stock: Abdulla & Hashem fixed share changed from 21.7 to 21
-- bags/month (owner decision 2026-11-18). Carry-over logic unchanged.
update public.feed_accounts
   set monthly_allocation=21, updated_at=now()
 where item='Bran' and name='Abdulla & Hashem';
