# دليل نشر CCE StableOS v4.7.0

هذا الإصدار يربط الواجهة بترحيل قاعدة بيانات جديد. لا تنشر أحد الجانبين منفردًا خارج نافذة صيانة قصيرة للحجوزات العامة.

## قبل النشر

1. تأكد من وجود نسخة احتياطية حديثة من البيانات ومن معرفة مشروع Supabase المستهدف.
2. لا تلصق Service Role Key أو أي سر داخل GitHub أو الواجهة.
3. شغّل `supabase/verification/preflight_v470.sql` في SQL Editor واحفظ النتائج.
4. يجب ألا توجد جداول مطلوبة مفقودة، مبالغ سالبة، Profiles نشطة بلا دور، أو Health Profiles مكررة.
5. إذا كشف الفحص بيانات مالية قديمة فيها `paid_bd > amount_bd` أو تاريخ مصروف مفقود، شغّل `supabase/maintenance/20260719_finance_pre_v470_repair.sql`. ينشئ الملف نسخة خاصة قابلة للرجوع، ويتوقف تلقائيًا إذا وجد حالة غير مدفوعة أو بلا تاريخ بديل. بعده أعد تشغيل `preflight_v470.sql` ويجب أن تصبح جميع عدادات المشاكل صفرًا.
6. اختبر العملية كاملة على مشروع Supabase تجريبي إن توفر.

## ترتيب نافذة النشر

1. أوقف استقبال الحجوزات العامة أو أعلن صيانة قصيرة.
2. طبّق `supabase/migrations/20260719_security_database_foundation_v470.sql` على Supabase.
3. شغّل `supabase/verification/verify_v470.sql` فورًا.
4. النتائج المتوقعة الأساسية:
   - `anon_can_insert_income = false`.
   - `anon_can_submit_validated_booking = true`.
   - `authenticated_can_directly_read_private_details = false`.
   - Default الخاص بـ`profiles.is_active` يساوي `false`.
   - جميع عدادات Orphan/Mismatch/Null تساوي صفرًا.
5. ادمج فرع v4.7.0 في `main` وانتظر اكتمال نشر GitHub Pages.
6. افتح التطبيق في نافذة خاصة وتحقق من تحميل مفتاح Cache `20260719-470`.

## اختبار القبول

- أرسل طلب Ride وتأكد من ظهور Booking=`Requested` وPayment=`Pending`.
- جرّب Family Package عندما تقل السعة عن أربعة وتأكد من الرفض.
- أرسل Training Package وتأكد من عدد الحصص والسعر.
- أرسل Livery وتأكد من ظهوره كـLivery لا Ride.
- بحساب Manager، غيّر الحالة إلى Confirmed ثم Scheduled.
- تحقق من أن زر بيانات السلامة يظهر فقط للصلاحية الحساسة وأن القراءة تسجل في Audit.
- أنشئ Farrier Task، أكمله، ثم ألغِه/احذفه وتأكد من رجوع ملخص الخيل إلى الحدث السابق.
- تحقق من Trainer Portal وOwner Portal والتنبيهات والدخل والمصروفات.

## إعداد Auth اليدوي

بعد نجاح النشر، افتح إعدادات Supabase Auth وعطّل التسجيل العام. أنشئ الحسابات من واجهة الإدارة فقط. يبقى الحساب الخارجي غير نشط وبدون دور كحماية إضافية، لكنه لا يغني عن تعطيل التسجيل.

## الرجوع عند الطوارئ

- إذا نجح SQL وفشل نشر الواجهة، أصلح/أعد نشر الواجهة أولًا.
- لإلغاء معالجة البيانات المالية فقط، استخدم `supabase/rollback/rollback_20260719_finance_pre_v470_repair.sql`. لا تحذف مخطط `cce_migration_backup`.
- إذا اضطررت مؤقتًا للعودة إلى v4.6.5، شغّل `supabase/rollback/rollback_v470_compatibility.sql` ثم أعد نشر الواجهة القديمة.
- هذا Rollback لا يحذف بيانات v4.7.0 لكنه يعيد فتح الإدخال العام المباشر، ولذلك يضعف الأمان. بعد إصلاح الواجهة، أعد تشغيل ترحيل v4.7.0 ثم ملف التحقق.
- لا تسقط جداول `booking_requests` أو `booking_private_details` ولا تحذف بيانات أثناء الاستجابة للحادث.
