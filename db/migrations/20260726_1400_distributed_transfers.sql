-- الهجرة: التحويل الموزّع (رئيسي → فرعي → توزيع على بنود)
-- التاريخ: 2026-07-26
-- السبب:
--   نمذجة التحويل الداخلي (رئيسي → فرعي) ككيان مستقل بمبلغ ومتبقٍّ وحالة،
--   وتُصرف البنود منه على دفعات عبر دوال ذرّية. امتداد لميزة مسار المصروفات (#65).
--
-- المفاهيم:
--   • رصيد التحويل = المحوَّل (amount) مقابل الموزّع؛ المتبقّي = amount − Σ(البنود غير المعكوسة).
--   • تحويل مفتوح واحد فقط لكل حساب فرعي في آنٍ واحد (فهرس فريد جزئي).
--   • البنود الموزّعة تُسجَّل حصراً عبر rpc_distribute_transfer_expense (علم GUC يمنع التحايل).
--   • العكس يُرجع المبلغ لمتبقّي التحويل ويعيد فتحه إن لزم.
--   • توافق #65: transfer_id NULL = صرف مباشر أو تحويل مضمّن قديم (بلا مساس).

-- ═══════════════════════════════════════════════════════════════════════════
-- (1) جدول transfers
-- ═══════════════════════════════════════════════════════════════════════════
CREATE TABLE IF NOT EXISTS public.transfers (
  id                     text        NOT NULL,
  source_main_account_id uuid        NOT NULL,
  dest_sub_account_id    uuid        NOT NULL,
  amount                 numeric     NOT NULL,
  remaining_amount       numeric     NOT NULL,
  status                 text        NOT NULL DEFAULT 'مفتوح',
  date                   text,
  notes                  text,
  created_by             uuid        DEFAULT auth.uid(),
  created_at             timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT transfers_pkey PRIMARY KEY (id),
  CONSTRAINT transfers_amount_chk              CHECK (amount > 0),
  CONSTRAINT transfers_remaining_range_chk     CHECK (remaining_amount >= 0 AND remaining_amount <= amount),
  CONSTRAINT transfers_status_chk              CHECK (status IN ('مفتوح', 'مكتمل')),
  CONSTRAINT transfers_status_remaining_chk    CHECK ((status = 'مكتمل') = (remaining_amount = 0)),
  CONSTRAINT transfers_source_main_fkey  FOREIGN KEY (source_main_account_id) REFERENCES public.bank_accounts(id),
  CONSTRAINT transfers_dest_sub_fkey     FOREIGN KEY (dest_sub_account_id)    REFERENCES public.bank_accounts(id),
  CONSTRAINT transfers_created_by_fkey   FOREIGN KEY (created_by)             REFERENCES public.profiles(id)
);

-- تحويل مفتوح واحد لكل حساب فرعي (الضمان الصلب للقاعدة)
CREATE UNIQUE INDEX IF NOT EXISTS uq_open_transfer_per_sub
  ON public.transfers (dest_sub_account_id) WHERE status = 'مفتوح';

ALTER TABLE public.transfers ENABLE ROW LEVEL SECURITY;

-- ═══════════════════════════════════════════════════════════════════════════
-- (2) عمود transfer_id على expenses
-- ═══════════════════════════════════════════════════════════════════════════
ALTER TABLE public.expenses ADD COLUMN IF NOT EXISTS transfer_id text;

ALTER TABLE public.expenses DROP CONSTRAINT IF EXISTS expenses_transfer_id_fkey;
ALTER TABLE public.expenses
  ADD CONSTRAINT expenses_transfer_id_fkey
  FOREIGN KEY (transfer_id) REFERENCES public.transfers(id);

-- ═══════════════════════════════════════════════════════════════════════════
-- (3) الحُرّاس
-- ═══════════════════════════════════════════════════════════════════════════

-- (3.أ) حارس إدراج التحويل — يتحقّق من النوعين والاتساق الابتدائي (يحمي الإدراج المباشر).
CREATE OR REPLACE FUNCTION public.guard_transfer_insert()
 RETURNS trigger
 LANGUAGE plpgsql
 SET search_path TO 'public'
AS $function$
begin
  if (select account_type from public.bank_accounts where id = NEW.source_main_account_id) is distinct from 'رئيسي' then
    raise exception 'حساب المصدر يجب أن يكون حساباً رئيسياً.';
  end if;
  if (select account_type from public.bank_accounts where id = NEW.dest_sub_account_id) is distinct from 'فرعي' then
    raise exception 'حساب الوجهة يجب أن يكون حساباً فرعياً.';
  end if;
  if NEW.dest_sub_account_id = NEW.source_main_account_id then
    raise exception 'حساب الوجهة يجب أن يختلف عن حساب المصدر.';
  end if;
  if NEW.remaining_amount is distinct from NEW.amount then
    raise exception 'المتبقّي عند إنشاء التحويل يجب أن يساوي المبلغ المحوَّل.';
  end if;
  if NEW.status is distinct from 'مفتوح' then
    raise exception 'التحويل يُنشأ بحالة "مفتوح".';
  end if;
  return NEW;
end;
$function$;

-- (3.ب) حارس تعديل التحويل — يجمّد الحقول الأساسية؛ المتبقّي/الحالة عبر علم الـRPC فقط.
CREATE OR REPLACE FUNCTION public.guard_transfer_immutable_columns()
 RETURNS trigger
 LANGUAGE plpgsql
 SET search_path TO 'public'
AS $function$
begin
  if NEW.id                     is distinct from OLD.id
     or NEW.amount                 is distinct from OLD.amount
     or NEW.source_main_account_id is distinct from OLD.source_main_account_id
     or NEW.dest_sub_account_id    is distinct from OLD.dest_sub_account_id
     or NEW.created_by             is distinct from OLD.created_by
     or NEW.date                   is distinct from OLD.date
  then
    raise exception 'لا يمكن تعديل الحقول الأساسية للتحويل (المبلغ/الحسابات/المُنشئ/التاريخ).';
  end if;

  if (NEW.remaining_amount is distinct from OLD.remaining_amount
      or NEW.status is distinct from OLD.status)
     and coalesce(current_setting('app.transfer_rpc', true), '') <> '1'
  then
    raise exception 'رصيد/حالة التحويل يتغيّران حصراً عبر دوال التوزيع/العكس.';
  end if;

  return NEW;
end;
$function$;

-- (3.ج) تحديث حارس إدراج المصروف — فرع transfer_id (منع التحايل + اتساق الحسابات).
CREATE OR REPLACE FUNCTION public.guard_expense_insert()
 RETURNS trigger
 LANGUAGE plpgsql
 SET search_path TO 'public'
AS $function$
declare
  v_orig public.expenses%rowtype;
  v_transfer public.transfers%rowtype;
begin
  -- المصروفات المرتبطة بتحويل تُسجَّل حصراً عبر دوال التحويل (علم GUC).
  if NEW.transfer_id is not null then
    if coalesce(current_setting('app.transfer_rpc', true), '') <> '1' then
      raise exception 'المصروفات المرتبطة بتحويل تُسجَّل حصراً عبر دوال التحويل — لا يُسمح بالإدراج المباشر.';
    end if;
    -- اتساق الحسابات مع التحويل المرجعي.
    select * into v_transfer from public.transfers where id = NEW.transfer_id;
    if not found then
      raise exception 'المصروف يشير إلى تحويل غير موجود (%).', NEW.transfer_id;
    end if;
    if NEW.source_main_account_id is distinct from v_transfer.source_main_account_id
       or NEW.spent_from_account_id is distinct from v_transfer.dest_sub_account_id then
      raise exception 'حسابات المصروف يجب أن تطابق حسابات التحويل المرجعي.';
    end if;
  end if;

  -- صف عادي: القيد CHECK يضمن amount > 0؛ نفحص مسار الحساب فقط.
  if NEW.reverses_expense_id is null then
    if NEW.source_main_account_id is not null then
      if (select account_type from public.bank_accounts
            where id = NEW.source_main_account_id) is distinct from 'رئيسي' then
        raise exception 'حساب المصدر يجب أن يكون حساباً رئيسياً.';
      end if;
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
      raise exception 'لا يمكن تحديد حساب صرف فرعي بدون حساب رئيسي مصدر.';
    end if;
    return NEW;
  end if;

  -- صف عكسي: يتطلب صلاحية المدير.
  if not is_admin() then
    raise exception 'القيد العكسي للمصروفات متاح لمدير النظام فقط.';
  end if;

  select * into v_orig from public.expenses where id = NEW.reverses_expense_id;
  if not found then
    raise exception 'القيد العكسي يشير إلى مصروف غير موجود (%).', NEW.reverses_expense_id;
  end if;

  if v_orig.reverses_expense_id is not null then
    raise exception 'لا يمكن عكس قيد عكسي.';
  end if;

  if v_orig.is_reversed then
    raise exception 'هذا المصروف (%) سبق عكسه.', v_orig.id;
  end if;

  if NEW.amount <> -v_orig.amount then
    raise exception 'مبلغ القيد العكسي (%) يجب أن يساوي سالب مبلغ المصروف الأصلي (%).', NEW.amount, v_orig.amount;
  end if;

  return NEW;
end;
$function$;

-- (3.د) تحديث حارس تعديل المصروف — تجميد transfer_id.
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
     or NEW.transfer_id            is distinct from OLD.transfer_id
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

-- ═══════════════════════════════════════════════════════════════════════════
-- (4) المشغّلات على transfers
-- ═══════════════════════════════════════════════════════════════════════════
DROP TRIGGER IF EXISTS trg_guard_transfer_insert ON public.transfers;
CREATE TRIGGER trg_guard_transfer_insert
  BEFORE INSERT ON public.transfers
  FOR EACH ROW EXECUTE FUNCTION guard_transfer_insert();

DROP TRIGGER IF EXISTS trg_guard_transfer_immutable_columns ON public.transfers;
CREATE TRIGGER trg_guard_transfer_immutable_columns
  BEFORE UPDATE ON public.transfers
  FOR EACH ROW EXECUTE FUNCTION guard_transfer_immutable_columns();

-- ═══════════════════════════════════════════════════════════════════════════
-- (5) الدوال الذرّية (RPC)
-- ═══════════════════════════════════════════════════════════════════════════

-- (5.أ) صرف بند من تحويل — قفل + تحقّق مفتوح/عدم تجاوز + إدراج + إنقاص + تحديث حالة.
CREATE OR REPLACE FUNCTION public.rpc_distribute_transfer_expense(
  p_expense_id text, p_transfer_id text, p_category_id uuid,
  p_amount numeric, p_date text, p_notes text
) RETURNS jsonb
 LANGUAGE plpgsql
 SET search_path TO 'public'
AS $function$
declare
  v_transfer public.transfers%rowtype;
  v_category text;
  v_expense  public.expenses%rowtype;
begin
  if p_amount is null or p_amount <= 0 then
    raise exception 'مبلغ الصرف يجب أن يكون أكبر من صفر.';
  end if;

  -- قفل صف التحويل لتسلسل التزامن.
  select * into v_transfer from public.transfers where id = p_transfer_id for update;
  if not found then
    raise exception 'التحويل بالمعرّف % غير موجود.', p_transfer_id;
  end if;
  if v_transfer.status <> 'مفتوح' then
    raise exception 'التحويل % مكتمل — لا يمكن الصرف منه.', p_transfer_id;
  end if;
  if p_amount > v_transfer.remaining_amount then
    raise exception 'مبلغ الصرف (%) يتجاوز المتبقّي في التحويل (%).', p_amount, v_transfer.remaining_amount;
  end if;

  select name into v_category from public.expense_categories where id = p_category_id;

  -- علم يسمح لحُرّاس المصروف/التحويل بقبول العملية.
  perform set_config('app.transfer_rpc', '1', true);

  insert into public.expenses (
    id, date, category, category_id, created_by, amount, payment_method,
    bank_account_id, source_main_account_id, spent_from_account_id, transfer_id, notes
  ) values (
    p_expense_id, p_date, v_category, p_category_id, auth.uid(), p_amount, 'تحويل بنكي',
    null, v_transfer.source_main_account_id, v_transfer.dest_sub_account_id, p_transfer_id, p_notes
  ) returning * into v_expense;

  update public.transfers
     set remaining_amount = remaining_amount - p_amount,
         status = case when remaining_amount - p_amount = 0 then 'مكتمل' else 'مفتوح' end
   where id = p_transfer_id
  returning * into v_transfer;

  return jsonb_build_object('expense', to_jsonb(v_expense), 'transfer', to_jsonb(v_transfer));
end;
$function$;

-- (5.ب) عكس بند مصروف من تحويل — صف عكسي (مدير) + إرجاع المبلغ للمتبقّي + إعادة فتح.
CREATE OR REPLACE FUNCTION public.rpc_reverse_transfer_expense(
  p_expense_id text, p_reversal_id text, p_reason text
) RETURNS jsonb
 LANGUAGE plpgsql
 SET search_path TO 'public'
AS $function$
declare
  v_orig     public.expenses%rowtype;
  v_transfer public.transfers%rowtype;
  v_rev      public.expenses%rowtype;
begin
  if not is_admin() then
    raise exception 'القيد العكسي للمصروفات متاح لمدير النظام فقط.';
  end if;
  if p_reason is null or btrim(p_reason) = '' then
    raise exception 'سبب العكس إلزامي.';
  end if;

  select * into v_orig from public.expenses where id = p_expense_id;
  if not found then
    raise exception 'المصروف بالمعرّف % غير موجود.', p_expense_id;
  end if;
  if v_orig.transfer_id is null then
    raise exception 'هذا المصروف غير مرتبط بتحويل — استخدم مسار العكس العادي.';
  end if;
  if v_orig.reverses_expense_id is not null then
    raise exception 'لا يمكن عكس قيد عكسي.';
  end if;
  if v_orig.is_reversed then
    raise exception 'هذا المصروف (%) سبق عكسه.', v_orig.id;
  end if;

  -- قفل التحويل.
  select * into v_transfer from public.transfers where id = v_orig.transfer_id for update;

  -- تعارض إعادة الفتح: تحويل مكتمل + وجود تحويل مفتوح آخر لنفس الفرعي → رفض مؤقت.
  if v_transfer.status = 'مكتمل'
     and exists (select 1 from public.transfers t
                  where t.dest_sub_account_id = v_transfer.dest_sub_account_id
                    and t.status = 'مفتوح' and t.id <> v_transfer.id) then
    raise exception 'يوجد تحويل مفتوح آخر لنفس الحساب الفرعي — أكمِل توزيعه أولاً قبل عكس هذا البند.';
  end if;

  perform set_config('app.transfer_rpc', '1', true);

  insert into public.expenses (
    id, date, category, category_id, created_by, amount, payment_method,
    bank_account_id, source_main_account_id, spent_from_account_id, transfer_id,
    notes, reverses_expense_id
  ) values (
    p_reversal_id, v_orig.date, v_orig.category, v_orig.category_id, auth.uid(), -v_orig.amount, v_orig.payment_method,
    v_orig.bank_account_id, v_orig.source_main_account_id, v_orig.spent_from_account_id, v_orig.transfer_id,
    'قيد عكسي للمصروف ' || v_orig.id || ' — السبب: ' || p_reason, v_orig.id
  ) returning * into v_rev;

  update public.expenses
     set is_reversed = true, reversed_by = auth.uid(), reversed_at = now(), reversal_reason = p_reason
   where id = v_orig.id;

  update public.transfers
     set remaining_amount = remaining_amount + v_orig.amount,
         status = 'مفتوح'
   where id = v_transfer.id
  returning * into v_transfer;

  return jsonb_build_object('reversal', to_jsonb(v_rev), 'transfer', to_jsonb(v_transfer));
end;
$function$;

-- ═══════════════════════════════════════════════════════════════════════════
-- (6) سياسات RLS على transfers (بنمط bank_accounts؛ الموظف يحتاج تخصيص الحسابين)
-- ═══════════════════════════════════════════════════════════════════════════
DROP POLICY IF EXISTS "transfers_select" ON public.transfers;
CREATE POLICY "transfers_select" ON public.transfers
  FOR SELECT TO public
  USING (is_admin() OR (
    EXISTS (SELECT 1 FROM bank_account_assignments a
             WHERE a.account_id = transfers.source_main_account_id AND a.user_id = auth.uid())
    AND EXISTS (SELECT 1 FROM bank_account_assignments a
                 WHERE a.account_id = transfers.dest_sub_account_id AND a.user_id = auth.uid())
  ));

DROP POLICY IF EXISTS "transfers_insert" ON public.transfers;
CREATE POLICY "transfers_insert" ON public.transfers
  FOR INSERT TO public
  WITH CHECK (is_admin() OR ((created_by = auth.uid()) AND (
    EXISTS (SELECT 1 FROM bank_account_assignments a
             WHERE a.account_id = transfers.source_main_account_id AND a.user_id = auth.uid())
    AND EXISTS (SELECT 1 FROM bank_account_assignments a
                 WHERE a.account_id = transfers.dest_sub_account_id AND a.user_id = auth.uid())
  )));

DROP POLICY IF EXISTS "transfers_update" ON public.transfers;
CREATE POLICY "transfers_update" ON public.transfers
  FOR UPDATE TO public
  USING (is_admin() OR (
    EXISTS (SELECT 1 FROM bank_account_assignments a
             WHERE a.account_id = transfers.source_main_account_id AND a.user_id = auth.uid())
    AND EXISTS (SELECT 1 FROM bank_account_assignments a
                 WHERE a.account_id = transfers.dest_sub_account_id AND a.user_id = auth.uid())
  ))
  WITH CHECK (is_admin() OR (
    EXISTS (SELECT 1 FROM bank_account_assignments a
             WHERE a.account_id = transfers.source_main_account_id AND a.user_id = auth.uid())
    AND EXISTS (SELECT 1 FROM bank_account_assignments a
                 WHERE a.account_id = transfers.dest_sub_account_id AND a.user_id = auth.uid())
  ));

DROP POLICY IF EXISTS "transfers_delete" ON public.transfers;
CREATE POLICY "transfers_delete" ON public.transfers
  FOR DELETE TO public
  USING (is_admin());

-- ملاحظة (8): حذف حساب بنكي مُشار إليه في transfers (مصدر/وجهة) يُمنع تلقائياً عبر
-- قيدَي FK (transfers_source_main_fkey / transfers_dest_sub_fkey) — لا حاجة لفحص SQL إضافي.
-- توسيع الفحص الودّي في الواجهة يأتي في الطبقة الثانية.

-- === التراجع (Down) — اختياري ===
-- DROP FUNCTION IF EXISTS public.rpc_reverse_transfer_expense(text,text,text);
-- DROP FUNCTION IF EXISTS public.rpc_distribute_transfer_expense(text,text,uuid,numeric,text,text);
-- DROP TRIGGER IF EXISTS trg_guard_transfer_immutable_columns ON public.transfers;
-- DROP TRIGGER IF EXISTS trg_guard_transfer_insert ON public.transfers;
-- DROP FUNCTION IF EXISTS public.guard_transfer_immutable_columns();
-- DROP FUNCTION IF EXISTS public.guard_transfer_insert();
-- ALTER TABLE public.expenses DROP CONSTRAINT IF EXISTS expenses_transfer_id_fkey;
-- ALTER TABLE public.expenses DROP COLUMN IF EXISTS transfer_id;
-- DROP TABLE IF EXISTS public.transfers;
-- (ولإرجاع حارسَي المصروف، أعِد تعريفهما من نسخة #65 في functions.sql.)
