# نشر CCE StableOS v4.13.0 — Show Office Sprint 5

## قبل التطبيق

1. تأكد أن v4.12.0 مطبق وأن `show_office_class_judging` و`show_office_entry_rounds` وRPCs `cce_show_office_judging_context()` و`cce_show_office_judge_panel(bigint)` موجودة.
2. خذ نسخة PostgreSQL كاملة. لا حاجة لنسخة JSON إضافية؛ Sprint 5 لا يضيف جداول ولا يغيّر شكل بيانات النسخ الاحتياطي.
3. شغّل `supabase/verification/preflight_v4130.sql`. يجب أن تكون متطلبات Sprint 4 بقيمة `true` وألا تكون صلاحية `show_office.results.view` موجودة مسبقًا (أو أن تكون قيمتها متوقعة إذا أُعيد التطبيق).

## التطبيق

1. طبّق `supabase/migrations/20260725_show_office_sprint5_live_results_v4130.sql` كعملية واحدة.
2. شغّل `supabase/verification/verify_v4130.sql`. يجب أن تكون فحوص الصلاحية والمنح والRPCs بقيمة `true`، وأن تبقى فحوص جداول وصلاحيات Sprint 4 كما هي دون نقصان.
3. انشر واجهة v4.13.0 وتأكد أن مفتاح الأصول هو `20260725-4130`.
4. لا تنشر الواجهة قبل نجاح الترحيل؛ لوحة Live Results تعتمد على صلاحية `show_office.results.view` الجديدة على RPCs القائمة.

## اختبار القبول

ملاحظة (v4.14.1): أُزيل التحديث التلقائي الدوري كليًا لتخفيف الحمل على قاعدة البيانات (كان يستطلع كل 8 ثوانٍ). الآن تُجلب البيانات فقط عند فتح الصفحة أو الضغط على زر Refresh — لا يوجد أي استطلاع في الخلفية.

1. بدور Reception أو Staff بلا أي صلاحية Show Office أخرى، امنحه `show_office.results.view` فقط وتحقق أنه يفتح Live Results ويشاهد الترتيب دون أي زر تسجيل أو Finalize/Reopen.
2. افتح بطولة حالتها `Running` وفئة قيد التحكيم على جهازين: الأول في Judge Panel يسجل نتيجة، والثاني في Live Results بنفس الفئة. يجب ألا يتغيّر الترتيب المعروض في الجهاز الثاني تلقائيًا؛ اضغط زر **↻ Refresh** أو أعد فتح الصفحة ليظهر الترتيب الجديد.
3. تحقق أنه لا توجد أي طلبات Supabase دورية في الخلفية (أدوات المطوّر ← Network) أثناء ترك الصفحة مفتوحة دون تفاعل.
4. اختبر وضع Big Screen: يجب أن يكبّر الترتيب ويخفي المحددات وأزرار الإجراءات، وأن يعمل زر الخروج منه لاستعادة العرض العادي.
5. اقطع الشبكة مؤقتًا ثم اضغط Refresh: يجب أن تظهر رسالة خطأ واضحة قابلة لإعادة المحاولة.
6. بدور غير مخوّل بأي من `show_office.view` أو `show_office.results.view` أو صلاحيات Judge Panel، تحقق من رفض RPC ومن عدم ظهور Live Results في التنقل.
7. اختبر Desktop وTablet وiPhone، خصوصًا اختيار البطولة والفئة وقراءة بطاقات الترتيب وزر Big Screen بأهداف لمس لا تقل عن 44px.

## الرجوع التوافقي

شغّل `supabase/rollback/rollback_v4130_compatibility.sql` للطوارئ فقط. يعيد صلاحيات القراءة على `cce_show_office_judging_context()` و`cce_show_office_judge_panel(bigint)` إلى نطاق Sprint 4 فقط ويسحب منح `show_office.results.view`، دون حذف الصلاحية نفسها أو أي بيانات نتائج أو تحكيم. يمكن إعادة تطبيق migration v4.13.0 لاحقًا بأمان.

إذا نُشرت واجهة v4.13.0 أثناء الرجوع، أعد الواجهة إلى v4.12.0 في النافذة نفسها حتى لا تظهر صفحة Live Results لمستخدمين فقدوا صلاحية `show_office.results.view` فجأة.
