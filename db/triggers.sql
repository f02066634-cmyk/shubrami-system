-- =============================================================================
-- triggers.sql — المشغّلات (Triggers) — مرآة Supabase
-- =============================================================================
-- منسوخة حرفياً من ناتج استخراج الـ triggers.
-- التبعية: تعتمد على دوال الحُرّاس (functions.sql) — تُنفَّذ بعد الدوال.
-- =============================================================================

-- حارس التعديل: يمنع تغيير الحقول المالية لمصروف مسجَّل، ويمنع فكّ العكس.
CREATE TRIGGER trg_guard_expense_immutable_columns
  BEFORE UPDATE ON public.expenses
  FOR EACH ROW
  EXECUTE FUNCTION guard_expense_immutable_columns();

-- حارس الإدراج: يتحقّق من صحّة القيد العكسي عند إدراج مصروف.
CREATE TRIGGER trg_guard_expense_insert
  BEFORE INSERT ON public.expenses
  FOR EACH ROW
  EXECUTE FUNCTION guard_expense_insert();

-- =============================================================================
-- ⚠️ فجوة موثّقة — مشغّل auth.users غير مُلتقَط في نواتج الاستخراج
-- =============================================================================
-- الدالة handle_new_user() (في functions.sql) تُنشئ صفّ profiles تلقائياً عند
-- تسجيل مستخدم جديد. هي مُشغَّلة عبر trigger على الجدول auth.users (سكيمة auth
-- المُدارة من Supabase)، والذي لا يظهر في استخراج triggers الخاص بسكيمة public.
--
-- الشكل المتعارف عليه في Supabase (للتوثيق فقط — تحقّق من الاسم الفعلي في لوحة
-- Supabase قبل الاعتماد عليه في استعادة كاملة):
--
--   CREATE TRIGGER on_auth_user_created
--     AFTER INSERT ON auth.users
--     FOR EACH ROW
--     EXECUTE FUNCTION public.handle_new_user();
--
-- إجراء مطلوب: استخرج التعريف الفعلي من auth.users ووثّقه هنا صراحةً. انظر
-- README.md (قسم الفجوات).
