-- الهجرة: توثيق مسار صرف المصروفات عبر الحسابات (رئيسي/فرعي)
-- التاريخ: 2026-07-26
-- السبب:
--   1) تمييز نوع الحساب البنكي (رئيسي مصدر المال / فرعي يُصرف منه بعد تحويل).
--   2) توثيق المسار الكامل على كل مصروف بنكي: من أي حساب رئيسي، وهل صُرف
--      مباشرةً منه أم عبر تحويل إلى حساب فرعي ثم صُرف منه.
--   3) فرض قاعدة «الخطوة الواحدة» على مستوى القاعدة (حارس خفيف) دون كسر
--      القيد العكسي ولا الصفوف النقدية ولا الصفوف القديمة.
--
-- ملاحظات التوافق:
--   - العمود القديم expenses.bank_account_id يبقى كما هو للصفوف القديمة
--     (عرض احتياطي)؛ الصفوف الجديدة البنكية تملأ العمودين الجديدين.
--   - العمودان الجديدان nullable: الصف النقدي يتركهما NULL.
--   - source_main_account_id = الحساب الرئيسي مصدر المال.
--   - spent_from_account_id  = الحساب الفرعي المصروف منه؛ NULL = صرف مباشر.

-- === التطبيق (Up) ===

-- (أ) نوع الحساب على bank_accounts — الموجود سابقاً يصبح 'رئيسي' افتراضياً.
ALTER TABLE public.bank_accounts
  ADD COLUMN IF NOT EXISTS account_type text NOT NULL DEFAULT 'رئيسي';

ALTER TABLE public.bank_accounts
  DROP CONSTRAINT IF EXISTS bank_accounts_account_type_chk;
ALTER TABLE public.bank_accounts
  ADD CONSTRAINT bank_accounts_account_type_chk
  CHECK (account_type IN ('رئيسي', 'فرعي'));

-- (ب) عمودا مسار الصرف على expenses (FK → bank_accounts، nullable).
ALTER TABLE public.expenses
  ADD COLUMN IF NOT EXISTS source_main_account_id uuid,
  ADD COLUMN IF NOT EXISTS spent_from_account_id  uuid;

ALTER TABLE public.expenses
  DROP CONSTRAINT IF EXISTS expenses_source_main_account_id_fkey;
ALTER TABLE public.expenses
  ADD CONSTRAINT expenses_source_main_account_id_fkey
  FOREIGN KEY (source_main_account_id) REFERENCES public.bank_accounts(id);

ALTER TABLE public.expenses
  DROP CONSTRAINT IF EXISTS expenses_spent_from_account_id_fkey;
ALTER TABLE public.expenses
  ADD CONSTRAINT expenses_spent_from_account_id_fkey
  FOREIGN KEY (spent_from_account_id) REFERENCES public.bank_accounts(id);

-- (ج) تحديث حارس التعديل: تجميد العمودين الجديدين ضمن الحقول المالية.
CREATE OR REPLACE FUNCTION public.guard_expense_immutable_columns()
 RETURNS trigger
 LANGUAGE plpgsql
 SET search_path TO 'public'
AS $function$
begin
  if NEW.id                     is distinct from OLD.id
     or NEW.amount                 is distinct from OLD.amount
     or NEW.category               is distinct from OLD.category
     or NEW.category_id            is distinct from OLD.category_id
     or NEW.date                   is distinct from OLD.date
     or NEW.payment_method         is distinct from OLD.payment_method
     or NEW.bank_account_id        is distinct from OLD.bank_account_id
     or NEW.source_main_account_id is distinct from OLD.source_main_account_id
     or NEW.spent_from_account_id  is distinct from OLD.spent_from_account_id
     or NEW.created_by             is distinct from OLD.created_by
     or NEW.reverses_expense_id    is distinct from OLD.reverses_expense_id
  then
    raise exception 'لا يمكن تعديل الحقول المالية لمصروف مسجَّل — استخدم القيد العكسي بدلاً من ذلك.';
  end if;

  if OLD.is_reversed = true and NEW.is_reversed = false then
    raise exception 'لا يمكن إلغاء عكس مصروف سبق عكسه — سيؤدي ذلك إلى ازدواج الحساب مع بقاء القيد العكسي.';
  end if;

  return NEW;
end;
$function$;

-- (د) تحديث حارس الإدراج: فحص مسار الحساب الخفيف للصفوف العادية.
--     يتخطّى الصفوف العكسية (تنسخ قيم الأصل الصحيحة) والنقدية (source_main NULL).
CREATE OR REPLACE FUNCTION public.guard_expense_insert()
 RETURNS trigger
 LANGUAGE plpgsql
 SET search_path TO 'public'
AS $function$
declare
  v_orig public.expenses%rowtype;
begin
  -- صف عادي: القيد CHECK يضمن amount > 0؛ نفحص مسار الحساب فقط.
  if NEW.reverses_expense_id is null then
    if NEW.source_main_account_id is not null then
      -- المصدر يجب أن يكون حساباً رئيسياً.
      if (select account_type from public.bank_accounts
            where id = NEW.source_main_account_id) is distinct from 'رئيسي' then
        raise exception 'حساب المصدر يجب أن يكون حساباً رئيسياً.';
      end if;
      -- حساب الصرف الفرعي (إن وُجد): فرعي ومختلف عن المصدر — قاعدة الخطوة الواحدة.
      if NEW.spent_from_account_id is not null then
        if NEW.spent_from_account_id = NEW.source_main_account_id then
          raise exception 'حساب الصرف الفرعي يجب أن يختلف عن الحساب الرئيسي المصدر.';
        end if;
        if (select account_type from public.bank_accounts
              where id = NEW.spent_from_account_id) is distinct from 'فرعي' then
          raise exception 'حساب الصرف يجب أن يكون حساباً فرعياً.';
        end if;
      end if;
    elsif NEW.spent_from_account_id is not null then
      -- لا يجوز تحديد حساب صرف فرعي بلا حساب رئيسي مصدر.
      raise exception 'لا يمكن تحديد حساب صرف فرعي بدون حساب رئيسي مصدر.';
    end if;
    return NEW;
  end if;

  -- صف عكسي: يتطلب صلاحية المدير.
  if not is_admin() then
    raise exception 'القيد العكسي للمصروفات متاح لمدير النظام فقط.';
  end if;

  -- يجب أن يشير إلى مصروف أصلي موجود.
  select * into v_orig from public.expenses where id = NEW.reverses_expense_id;
  if not found then
    raise exception 'القيد العكسي يشير إلى مصروف غير موجود (%).', NEW.reverses_expense_id;
  end if;

  -- لا يجوز عكس قيد عكسي.
  if v_orig.reverses_expense_id is not null then
    raise exception 'لا يمكن عكس قيد عكسي.';
  end if;

  -- لا يجوز عكس مصروف سبق عكسه.
  if v_orig.is_reversed then
    raise exception 'هذا المصروف (%) سبق عكسه.', v_orig.id;
  end if;

  -- يجب أن يساوي مبلغ القيد العكسي سالب مبلغ الأصلي بالضبط.
  if NEW.amount <> -v_orig.amount then
    raise exception 'مبلغ القيد العكسي (%) يجب أن يساوي سالب مبلغ المصروف الأصلي (%).', NEW.amount, v_orig.amount;
  end if;

  return NEW;
end;
$function$;

-- === التراجع (Down) — اختياري ===
-- ALTER TABLE public.expenses DROP CONSTRAINT IF EXISTS expenses_spent_from_account_id_fkey;
-- ALTER TABLE public.expenses DROP CONSTRAINT IF EXISTS expenses_source_main_account_id_fkey;
-- ALTER TABLE public.expenses DROP COLUMN IF EXISTS spent_from_account_id;
-- ALTER TABLE public.expenses DROP COLUMN IF EXISTS source_main_account_id;
-- ALTER TABLE public.bank_accounts DROP CONSTRAINT IF EXISTS bank_accounts_account_type_chk;
-- ALTER TABLE public.bank_accounts DROP COLUMN IF EXISTS account_type;
-- (ولإرجاع الحُرّاس، أعِد تعريفهما من النسخة السابقة في functions.sql.)
