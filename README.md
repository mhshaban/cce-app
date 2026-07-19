# CCE StableOS

Enterprise Stable Management Platform for Country Club Equestrian.

الإصدار الحالي: **4.8.3**

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
