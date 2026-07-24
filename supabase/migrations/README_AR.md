# ترتيب ملفات SQL

## مشروع جديد فارغ

1. شغّل `../baseline/legacy_core_schema.sql` مرة واحدة.
2. شغّل جميع الملفات في هذا المجلد بترتيب أسمائها.
3. شغّل أحدث ملف في `../verification/`.

هذا المسار يُختبر تلقائيًا داخل CI.

## مشروع الإنتاج الحالي

لا تُعد تشغيل الملفات التاريخية التي سبق تطبيقها. للانتقال من v4.6.5 إلى v4.7.0:

1. خذ نسخة احتياطية.
2. شغّل `../verification/preflight_v470.sql` واحفظ النتائج.
3. شغّل `20260719_security_database_foundation_v470.sql` على بيئة تجريبية أولًا.
4. شغّل `../verification/verify_v470.sql`.
5. اتبع `../../docs/DEPLOYMENT_V470.md` قبل الإنتاج.

ملف `../rollback/rollback_v470_compatibility.sql` للطوارئ فقط؛ لا يحذف البيانات لكنه يعيد فتح مسار الإدخال العام القديم مؤقتًا.

للانتقال من v4.7.1 إلى v4.8.0:

1. خذ نسخة احتياطية، ثم شغّل `../verification/preflight_v480.sql` واحفظ النتائج.
2. شغّل `20260719_training_revenue_instructor_v480.sql`؛ لا يغيّر `amount_bd` أو `paid_bd` ويوقف المعاملة إذا تغير مجموعهما.
3. انشر واجهة v4.8.0 مباشرة بعد نجاح الترحيل.
4. عيّن المدرب للسجلات القديمة، ثم شغّل `../verification/verify_v480.sql` حتى تصبح جميع قيم `issue_count` صفرًا.
5. اتبع `../../docs/DEPLOYMENT_V480.md` لاختبارات القبول والرجوع التوافقي.

إذا كان v4.8.0 قد طُبق بالفعل، لا تُسند كل سجلات Lesson القديمة. شغّل `../verification/preflight_v481.sql` ثم `20260719_training_split_cutover_v481.sql` و`../verification/verify_v481.sql`. اتبع `../../docs/DEPLOYMENT_V481.md`؛ التصحيح يحفظ المبالغ التاريخية كما كانت ويطبّق 50/50 على السجلات الجديدة فقط.

للانتقال من Show Office v4.10.0 إلى v4.11.0:

1. خذ نسخة احتياطية ثم شغّل `../verification/preflight_v4110.sql`؛ يجب أن تكون متطلبات v4.10.0 جاهزة وألا توجد بيانات Sprint 3 غير صالحة أو أسماء دليل مكررة.
2. شغّل `20260723_show_office_sprint3_entries_v4110.sql` ثم `../verification/verify_v4110.sql`.
3. انشر واجهة v4.11.0 بمفتاح الأصول `20260723-4110` واختبر Matrix الصلاحيات والنسخ والاستعادة.
4. اتبع `../../docs/DEPLOYMENT_V4110.md`. ملف `../rollback/rollback_v4110_compatibility.sql` يحفظ كل سجلات Sprint 3 لكنه يعطل وصول المتصفح ويعيد RPC الاستعادة إلى عقد v4.10.0.

للانتقال من Show Office v4.11.0 إلى v4.12.0:

1. خذ نسخة احتياطية ثم شغّل `../verification/preflight_v4120.sql`.
2. شغّل `20260724_show_office_sprint4_judging_v4120.sql` ثم `../verification/verify_v4120.sql`.
3. انشر واجهة v4.12.0 بمفتاح الأصول `20260724-4120` واختبر Judge وManager وView-only على iPad والجوال.
4. اتبع `../../docs/DEPLOYMENT_V4120.md`. ملف `../rollback/rollback_v4120_compatibility.sql` يحفظ النتائج وسجل المراجعات لكنه يعطل وصول Sprint 4 ويعيد RPC الاستعادة إلى عقد v4.11.0.
