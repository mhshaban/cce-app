# نشر CCE StableOS v4.19.0 — جدولة دفعات الإيواء الشهرية تلقائيًا

## التغيير

تذكير دفعة الإيواء الشهرية (الذي صُحح في v4.18.1 ليشمل Full Livery وAC Livery معًا) كان يعمل فقط عند فتح لوحة التحكم — إذا لم يفتح أحد التطبيق بعد اليوم الأول من الشهر، لا يظهر أي سجل في Overdue Income حتى يفتحه أحد لاحقًا.

الآن تعمل دالة نظامية مجدولة **يوميًا عبر pg_cron** تُنشئ سجل الدفع تلقائيًا (idempotent — لا تُنشئ نسخًا مكررة إذا كان السجل موجودًا لهذا الشهر بالفعل)، دون الحاجة لأي تدخل بشري.

## قبل التطبيق

1. تأكد أن جداول `horses` و`income` موجودة.
2. خذ نسخة PostgreSQL كاملة.
3. شغّل `supabase/verification/preflight_v4190.sql`.

## التطبيق

1. طبّق `supabase/migrations/20260802_livery_income_cron_v4190.sql` كعملية واحدة.
   - **مهم**: إذا فشل السطر `create extension if not exists pg_cron with schema extensions;` برسالة صلاحيات (permission denied to create extension)، يجب تفعيل امتداد `pg_cron` يدويًا أولاً من لوحة تحكم Supabase: **Database → Extensions → ابحث عن pg_cron → فعّله**، ثم أعد تشغيل الـ migration كاملاً.
2. شغّل `supabase/verification/verify_v4190.sql`؛ يجب أن تكون كل الفحوص `true`، وتحقق من ظهور صف `cce-monthly-livery-income` في نتيجة `select * from cron.job`.
3. انشر واجهة v4.19.0 وتأكد أن مفتاح الأصول هو `20260802-4190`.

## اختبار القبول

1. تأكد من وجود خيل بحالة "Available" وله قيمة Livery أو AC Livery > 0.
2. شغّل يدويًا في SQL Editor: `select public.cce_create_monthly_livery_income();` — يجب أن تُنشئ سجل دفع "Pending" لهذا الشهر لهذا الخيل (أو تُرجع 0 إذا كان السجل موجودًا مسبقًا).
3. شغّل الاستدعاء نفسه مرة ثانية وتأكد أنه لا يُنشئ سجلًا مكررًا (idempotent).
4. تحقق من `select * from cron.job where jobname='cce-monthly-livery-income';` أن الجدولة `0 3 * * *` (يوميًا الساعة 3 فجرًا) والحالة `active=true`.
5. تأكد أن استدعاء الدالة مباشرة من حساب `authenticated` أو `anon` (وليس كنظام) يُرفض (الصلاحية غير ممنوحة لأي دور تطبيق).

## الرجوع التوافقي

شغّل `supabase/rollback/rollback_v4190_compatibility.sql` للطوارئ فقط — يلغي جدولة المهمة ويحذف الدالة، دون تعطيل امتداد pg_cron نفسه (قد تعتمد عليه مهام أخرى) ودون التأثير على أي بيانات إيراد مُنشأة مسبقًا. لا تستخدمه إلا إذا تسبب هذا التغيير بمشكلة تحتاج وقتًا لمعالجتها.
