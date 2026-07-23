# Edge Function: `admin-users` — مرآة الدالة الحيّة في Supabase

هذا المجلد **مرآة نصّية ملتزَمة في git** لدالة Supabase Edge Function المسؤولة عن
**إنشاء وحذف مستخدمي Supabase Auth** لنظام أسواق الشبرمي — على نفس مبدأ مجلد `db/`
(مرجع الاستعادة + سجلّ التغييرات + مصدر الحقيقة للمراجعة).

> ⚠️ **هذا الملف لا يُنشر تلقائياً.** Supabase هو النظام الحيّ؛ وهذه نسخة موثّقة
> تعكسه. المزامنة **يدوية** (انظر القاعدة الذهبية أدناه).

---

## القاعدة الذهبية

> **أي تعديل في دالة Supabase = commit مقابل في هذا المجلد.**

عند تعديل الدالة في Supabase (أو نشر نسخة جديدة): حدِّث `index.ts` هنا **في نفس
الـ commit**، لتبقى المرآة صادقة.

---

## ما الذي تفعله الدالة

| الإجراء (`action`) | العملية | الصلاحية |
|--------------------|---------|----------|
| `create` | إنشاء مستخدم Auth عبر `auth.admin.createUser` (مع `email_confirm: true` و`user_metadata`: username/name/role/allowed_tabs) | مدير فقط |
| `delete` | حذف مستخدم Auth فعلياً عبر `auth.admin.deleteUser` | مدير فقط |

تُستدعى من الواجهة عبر `supabase.functions.invoke('admin-users', { body: { action, ... } })`
(انظر `handleAddUser` / `handleDeleteUser` في `app/page.js`).

### البريد الداخلي الاصطناعي
تُبنى هوية الدخول من اسم المستخدم: `<username>@shubrami.internal`. الثابت
`AUTH_EMAIL_DOMAIN` **يجب أن يطابق** نفس القيمة المستخدمة في الواجهة.

---

## طبقات الأمان

1. **CORS Preflight**: طلب `OPTIONS` يُردّ عليه فوراً بـ `"ok"` قبل أي فحص مصادقة
   (سلوك CORS طبيعي — الطلب التمهيدي لا يحمل بيانات مصادقة).
2. **مصادقة المستخدم**: `withSupabase({ auth: "user" })` + `getUser()` — يرفض غير
   المسجّل (401).
3. **صلاحية المدير**: يقرأ `profiles.role` للمستدعي ويرفض غير المدير (403).
4. **service_role**: عمليات الإنشاء/الحذف تُنفَّذ عبر `ctx.supabaseAdmin` (صلاحية
   `service_role`) — ولذلك **لا يمكن تنفيذها من المتصفح مباشرةً**، ولا تخضع لإعداد
   `Enable Sign Ups`. إيقاف التسجيل الذاتي (Sign Ups = OFF) **آمن** ولا يؤثّر على
   هذا المسار.

---

## الاعتماديات

الدالة تستورد عبر مُحدِّدات `jsr:` مباشرة (Deno يحلّها بلا وسيط):

```ts
import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { withSupabase } from "jsr:@supabase/server@^1";
```

**لا تحتاج `import_map.json`** لأن كل المُحدِّدات كاملة inline. لا يوجد `deno.json`
خاص بالدالة ضمن هذه المرآة؛ إن أُضيف لاحقاً أيّ إعداد على مستوى المشروع
(`supabase/config.toml` لهذه الدالة، أو `deno.json`) فيُستخرَج ويُضاف هنا بنفس
المبدأ.

---

## متغيّرات البيئة (secrets)

تعتمد الدالة على مفاتيح Supabase القياسية التي تُحقنها المنصّة تلقائياً لبيئة
التشغيل (عبر `withSupabase`)، وأهمّها `SUPABASE_SERVICE_ROLE_KEY` لعمليات الإدارة.
**لا تُخزَّن أي مفاتيح في هذا المستودع.**

---

## إعادة النشر عند الحاجة

باستخدام Supabase CLI (يتطلب تسجيل الدخول وربط المشروع):

```bash
# نشر هذه الدالة تحديداً
supabase functions deploy admin-users

# ضبط الأسرار إن لزم (لا تضعها في git)
supabase secrets set SUPABASE_SERVICE_ROLE_KEY=***
```

> الأسرار القياسية (`SUPABASE_URL`, `SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`)
> تُوفّرها المنصّة افتراضياً لدوال Edge؛ راجع لوحة Supabase قبل النشر.
