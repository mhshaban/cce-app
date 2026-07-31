# CCE StableOS

Enterprise Stable Management Platform for Country Club Equestrian.

الإصدار الحالي: **4.17.2**

## وثائق المشروع

- [رؤية المشروع](docs/PROJECT_VISION.md)
- [خارطة الطريق](docs/ROADMAP.md)
- [المعمارية](docs/ARCHITECTURE.md)
- [قاعدة البيانات](docs/DATABASE.md)
- [إرشادات الواجهة](docs/UI_GUIDELINES.md)
- [الأمان والصلاحيات](docs/SECURITY.md)
- [دليل نشر v4.7.0](docs/DEPLOYMENT_V470.md)
- [دليل التصحيح والنشر v4.8.1](docs/DEPLOYMENT_V481.md)
- [دليل نشر v4.8.2](docs/DEPLOYMENT_V482.md)
- [دليل نشر Show Office v4.9.0](docs/DEPLOYMENT_V490.md)
- [دليل نشر Show Office Sprint 1.1 v4.9.1](docs/DEPLOYMENT_V491.md)
- [دليل نشر Show Office Sprint 2 v4.10.0](docs/DEPLOYMENT_V4100.md)
- [دليل نشر Show Office Sprint 3 v4.11.0](docs/DEPLOYMENT_V4110.md)
- [دليل نشر Show Office Sprint 4 v4.12.0](docs/DEPLOYMENT_V4120.md)
- [دليل نشر Show Office Sprint 5 v4.13.0](docs/DEPLOYMENT_V4130.md)
- [دليل نشر تسجيل الحواجز v4.14.0](docs/DEPLOYMENT_V4140.md)
- [دليل نشر Accumulator with Joker v4.15.0](docs/DEPLOYMENT_V4150.md)
- [دليل تصحيح مضاعفة Joker v4.15.1](docs/DEPLOYMENT_V4151.md)
- [دليل نشر اختيار حاجز الجوكر البديل v4.16.0](docs/DEPLOYMENT_V4160.md)
- [دليل نشر مهلة دفع الحجوزات v4.17.0](docs/DEPLOYMENT_V4170.md)
- [سجل التغييرات](docs/CHANGELOG.md)

## الفحص المحلي

يتطلب Node.js، ثم:

```bash
npm ci
npm run check
```

## قاعدة البيانات

لقطة إعادة البناء الأولية موجودة في `supabase/baseline/`، والتغييرات المرتبة في `supabase/migrations/`. يجب أخذ نسخة احتياطية وتشغيل ملف Preflight وتطبيق الترحيلات على بيئة اختبار قبل الإنتاج. رفع ملفات الواجهة إلى GitHub لا يطبق SQL تلقائيًا على Supabase.

لا ترفع مفاتيح Supabase السرية أو كلمات المرور إلى المستودع.
