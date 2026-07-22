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

-- حارس الإدراج: يتحقّق من صحّة الصف العكسي عند إدراج سند قبض.
CREATE TRIGGER trg_guard_transaction_insert
  BEFORE INSERT ON public.transactions
  FOR EACH ROW
  EXECUTE FUNCTION guard_transaction_insert();

-- حارس التحديث: يجمّد الحقول المالية للسندات المعكوسة/العكسية فقط
-- (السندات العادية المفتوحة تبقى قابلة للتعديل عبر rpc_amend_receipt).
CREATE TRIGGER trg_guard_transaction_immutable_columns
  BEFORE UPDATE ON public.transactions
  FOR EACH ROW
  EXECUTE FUNCTION guard_transaction_immutable_columns();

-- =============================================================================
-- مشغّل على auth.users (سكيمة auth المُدارة من Supabase)
-- =============================================================================
-- يُنشئ صفّ profiles تلقائياً عند تسجيل مستخدم جديد، عبر handle_new_user()
-- (في functions.sql). التعريف أدناه مستخرَج حرفياً من القاعدة الحيّة.
--
-- التبعية: يتطلب وجود سكيمة auth وجدول auth.users (تُنشئهما Supabase)، والدالة
-- handle_new_user() (functions.sql). في استعادة كاملة خارج Supabase، تأكّد من
-- وجود auth.users أولاً.
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION handle_new_user();
