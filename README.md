# CCE StableOS

Enterprise Stable Management Platform for Country Club Equestrian.

الإصدار الحالي: **4.6.4**

## وثائق المشروع

- [رؤية المشروع](docs/PROJECT_VISION.md)
- [خارطة الطريق](docs/ROADMAP.md)
- [المعمارية](docs/ARCHITECTURE.md)
- [قاعدة البيانات](docs/DATABASE.md)
- [إرشادات الواجهة](docs/UI_GUIDELINES.md)
- [سجل التغييرات](docs/CHANGELOG.md)

## الفحص المحلي

يتطلب Node.js فقط، ثم:

```bash
npm run check
```

## قاعدة البيانات

تغييرات قاعدة البيانات موجودة في `supabase/migrations/`. يجب أخذ نسخة احتياطية وتطبيق الترحيلات على بيئة اختبار قبل الإنتاج. رفع ملفات الواجهة إلى GitHub لا يطبق SQL تلقائيًا على Supabase.

لا ترفع مفاتيح Supabase السرية أو كلمات المرور إلى المستودع.
