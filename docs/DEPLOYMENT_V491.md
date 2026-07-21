# نشر CCE StableOS v4.9.1 — Show Office Sprint 1.1

يضيف هذا الإصدار تصدير JSON كاملًا بتصفح مباشر من Supabase واستعادة JSON للمسابقات مع قيود أطوال في PostgreSQL. النسخ القديمة بلا Show Office تبقى مدعومة، والنسخ الحالية تستعيد `modules.showOffice.competitions`.

## قبل النشر

1. خذ نسخة Supabase واختبر على مشروع تجريبي.
2. إذا لم يطبق Sprint 1، شغّل `preflight_v490.sql` ثم migration v4.9.0 و`verify_v490.sql` أولًا.
3. شغّل `supabase/verification/preflight_v491.sql` وتأكد أن الجدول ودالة الصلاحيات وTrigger التدقيق جاهزة، وأن جميع أعداد الأطوال غير الصالحة تساوي صفرًا.
4. احتفظ بنسخة JSON قديمة وأخرى منشأة من v4.9.0/4.9.1 لاختبار التوافق.

## ترتيب النشر

1. طبّق `supabase/migrations/20260721_show_office_sprint1_v491_backup_restore.sql`.
2. شغّل `supabase/verification/verify_v491.sql`؛ يجب وجود RPC، والسماح لـ `authenticated` فقط، وعدم وجود حالات أو تكرارات غير صالحة.
3. انشر واجهة v4.9.1 وتأكد من مفتاح Cache `20260721-491`.

## اختبار قبول Restore

1. أنشئ بطولتين تجريبيتين وخذ JSON Backup.
2. أعد استيراد النسخة نفسها؛ يجب أن تكون البطولتان `duplicates` وألا يزيد عدد السجلات.
3. احذف سجلًا تجريبيًا ثم استورد النسخة؛ يجب استعادته مرة واحدة بهوية مستخدم الاستعادة.
4. تأكد أن السجل المكرر لم تتغير حالته أو `created_by / updated_by` الخاصة به.
5. جرّب نسخة قديمة بلا `modules`; يجب استعادة الجداول القديمة دون خطأ ودون إنشاء مسابقات.
6. غيّر حالة بطولة في نسخة تجريبية إلى `Archived`; يجب رفض دفعة Show Office دون إدخال أي سجل منها.
7. بحساب بلا `show_office.competitions.create`، يجب أن ترفض RPC الطلب.

استعادة Show Office نفسها ذرية: إما تنجح دفعة الوحدة كاملة أو لا تكتب شيئًا. الاستعادة العامة للجداول القديمة المتعددة تبقى Best-effort وليست معاملة واحدة، وقد تكتمل جزئيًا إذا فشلت صفوف قديمة.

## الرجوع التوافقي

شغّل `supabase/rollback/rollback_v491_compatibility.sql` لإزالة RPC وقيود الأطوال المضافة في v4.9.1. لا يحذف أي بطولة ولا يعطل CRUD في Sprint 1. إذا كان الرجوع يشمل Show Office كاملًا، شغّل rollback v4.9.1 أولًا ثم `rollback_v490_compatibility.sql`.
