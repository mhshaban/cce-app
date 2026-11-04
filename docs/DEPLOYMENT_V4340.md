# نشر CCE StableOS v4.34.0 — جدول البادوكات

## التغيير

- صفحة **🏇 Paddocks** في لوحة التحكم (مجموعة Horses) لعرض جدول البادوكات الثلاثة وتعديله.
- قسم **🏇 جدول البادوكات** في بوابة الملاك: المالك يرى خيوله فقط، وكل خانة أخرى «(محجوز)».
- الإخفاء يتم في قاعدة البيانات (`cce_paddock_board`)، فلا يصل للمتصفح اسم خيل لا يخص المالك.

## التطبيق

1. خذ نسخة احتياطية من قاعدة البيانات.
2. شغّل `supabase/verification/preflight_v4340.sql` وتأكد أن `rbac_ready` = true، وراجع قائمة خيول البذر.
3. شغّل `supabase/migrations/20261104_paddock_board_v4340.sql` (آمن لإعادة التشغيل).
4. شغّل `supabase/verification/verify_v4340.sql`: المتوقع `functions_ready` = true و`permissions` = 2 و`rls_enabled` = true و`paddock_overlaps` = 0 و`horse_overlaps` = 0.
5. انشر واجهة v4.34.0 وتأكد أن مفتاح الأصول هو `20261104-4340`.

## الصلاحيات

- `paddocks.view`: يرى الجدول كاملاً بأسماء كل الخيول (Super Admin وManager افتراضياً).
- `paddocks.manage`: يضيف الخانات ويعدّلها ويحذفها (Super Admin وManager افتراضياً).
- الملاك لا يحتاجون صلاحية جديدة؛ تكفي `owner.horses.view` الموجودة.
- لأي دور آخر (Staff أو Trainer مثلاً) امنح `paddocks.view` من Users & Permissions.

## اختبار القبول

1. ادخل بحساب Manager وافتح Horses ← Paddocks: يظهر الجدول بأسماء كل الخيول.
2. أضف خانة تتداخل مع خانة موجودة في البادوك نفسه: تظهر رسالة «The paddock is already booked at that time».
3. ادخل بحساب مالك (مثلاً Abdulla Al Zarqi): تظهر Dark Ash وWarda بأسمائها، وكل الخانات الأخرى «(محجوز)»، وحصص الاسطبل «حصة تدريبية (محجوز)».
4. حساب بدون `paddocks.view` ولا `owner.horses.view` لا يرى الصفحة، وتُرفض `cce_paddock_board` من الخادم.

## الرجوع

`supabase/rollback/rollback_v4340_compatibility.sql` يحذف الدوال الثلاث، ويبقي جدول `paddock_slots` وبياناته والصلاحيات. واجهة v4.34.0 تبقى تعمل: صفحة Paddocks تعرض رسالة خطأ، وقسم بوابة الملاك يختفي.
