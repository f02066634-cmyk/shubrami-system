-- الهجرة: القيد العكسي لسندات القبض (transactions)
-- التاريخ: 2026-07-22
-- السبب: إتاحة تصحيح سند قبض خاطئ بقيد عكسي موثّق (لا حذف، لا تعديل) —
--        بنفس نمط القيد العكسي للمصروفات. المدير فقط.
--
-- ⚠️ ترتيب التنفيذ داخل الملف: الأعمدة ← الدوال (الحُرّاس + العكس + تحصين amend)
--    ← الـ triggers. نفّذ الملف كاملاً دفعةً واحدة.

-- =============================================================================
-- 1) الأعمدة الجديدة على transactions (بنمط أعمدة عكس المصروفات)
-- =============================================================================
ALTER TABLE public.transactions
  ADD COLUMN is_reversed             boolean NOT NULL DEFAULT false,
  ADD COLUMN reversed_by             uuid,
  ADD COLUMN reversed_at             timestamptz,
  ADD COLUMN reversal_reason         text,
  ADD COLUMN reverses_transaction_id text;

ALTER TABLE public.transactions
  ADD CONSTRAINT transactions_reversed_by_fkey
    FOREIGN KEY (reversed_by) REFERENCES profiles(id),
  ADD CONSTRAINT transactions_reverses_transaction_id_fkey
    FOREIGN KEY (reverses_transaction_id) REFERENCES transactions(id);

-- =============================================================================
-- 2) حارس الإدراج: يتحقّق من صحّة الصف العكسي عند الإدراج المباشر
-- =============================================================================
CREATE OR REPLACE FUNCTION public.guard_transaction_insert()
 RETURNS trigger
 LANGUAGE plpgsql
 SET search_path TO 'public'
AS $function$
declare
  v_orig public.transactions%rowtype;
begin
  -- صف عادي: لا فحوص
  if NEW.reverses_transaction_id is null then
    return NEW;
  end if;

  -- صف عكسي: يتطلب صلاحية المدير
  if not is_admin() then
    raise exception 'القيد العكسي لسندات القبض متاح لمدير النظام فقط.';
  end if;

  select * into v_orig from public.transactions where id = NEW.reverses_transaction_id;
  if not found then
    raise exception 'القيد العكسي يشير إلى سند غير موجود (%).', NEW.reverses_transaction_id;
  end if;

  if v_orig.reverses_transaction_id is not null then
    raise exception 'لا يمكن عكس قيد عكسي.';
  end if;

  if v_orig.is_reversed then
    raise exception 'هذا السند (%) سبق عكسه.', v_orig.id;
  end if;

  if NEW."paidAmount" <> -v_orig."paidAmount" then
    raise exception 'مبلغ القيد العكسي (%) يجب أن يساوي سالب مبلغ السند الأصلي (%).', NEW."paidAmount", v_orig."paidAmount";
  end if;

  return NEW;
end;
$function$;

-- =============================================================================
-- 3) حارس التحديث: يجمّد الحقول المالية للسندات المعكوسة/العكسية فقط
--    ⚠️ السندات العادية المفتوحة تبقى قابلة للتعديل (دفعات جزئية via rpc_amend_receipt)
-- =============================================================================
CREATE OR REPLACE FUNCTION public.guard_transaction_immutable_columns()
 RETURNS trigger
 LANGUAGE plpgsql
 SET search_path TO 'public'
AS $function$
begin
  -- التجميد يسري فقط على السند المعكوس أو الصف العكسي؛ غيرهما يمرّ بحرية.
  if OLD.is_reversed = false and OLD.reverses_transaction_id is null then
    return NEW;
  end if;

  -- منع فكّ العكس
  if OLD.is_reversed = true and NEW.is_reversed = false then
    raise exception 'لا يمكن إلغاء عكس سند سبق عكسه.';
  end if;

  -- منع تعديل الحقول المالية/الهُويّة على سند معكوس أو عكسي
  if NEW.id                       is distinct from OLD.id
     or NEW."paidAmount"          is distinct from OLD."paidAmount"
     or NEW."targetAmount"        is distinct from OLD."targetAmount"
     or NEW."remainingAmount"     is distinct from OLD."remainingAmount"
     or NEW.shop                  is distinct from OLD.shop
     or NEW.tenant                is distinct from OLD.tenant
     or NEW.type                  is distinct from OLD.type
     or NEW.year                  is distinct from OLD.year
     or NEW.seq                   is distinct from OLD.seq
     or NEW."referenceId"         is distinct from OLD."referenceId"
     or NEW."isDebtReceipt"       is distinct from OLD."isDebtReceipt"
     or NEW.entity_id             is distinct from OLD.entity_id
     or NEW.reverses_transaction_id is distinct from OLD.reverses_transaction_id
  then
    raise exception 'لا يمكن تعديل الحقول المالية لسند مسجَّل (معكوس أو عكسي) — استخدم القيد العكسي.';
  end if;

  return NEW;
end;
$function$;

-- =============================================================================
-- 4) دالة العكس الذرّية: تنشئ الصف العكسي + تعكس الرصيد + تعلّم الأصل
-- =============================================================================
CREATE OR REPLACE FUNCTION public.rpc_reverse_receipt(p_receipt_id text, p_reason text, p_balance_shop_id text DEFAULT NULL::text, p_balance_debt_id text DEFAULT NULL::text)
 RETURNS jsonb
 LANGUAGE plpgsql
 SET search_path TO 'public'
AS $function$
declare
  v_orig          public.transactions%rowtype;
  v_rev           public.transactions%rowtype;
  v_new_collected numeric := null;
  v_new_debt_amt  numeric := null;
  v_year          integer;
  v_year_txt      text;
  v_seq           integer;
  v_id            text;
  v_lock          bigint;
begin
  -- صلاحية المدير
  if not is_admin() then
    raise exception 'عكس سند القبض متاح لمدير النظام فقط.';
  end if;

  if p_reason is null or trim(p_reason) = '' then
    raise exception 'سبب العكس إلزامي.';
  end if;

  -- قفل الأصل والتحقق
  select * into v_orig from public.transactions where id = p_receipt_id for update;
  if not found then
    raise exception 'السند بالمعرّف % غير موجود', p_receipt_id;
  end if;
  if v_orig.reverses_transaction_id is not null then
    raise exception 'لا يمكن عكس قيد عكسي.';
  end if;
  if v_orig.is_reversed then
    raise exception 'هذا السند (%) سبق عكسه.', v_orig.id;
  end if;

  -- هدف رصيد واحد إلزامي (وإلا يُرفض العكس كاملاً — حفاظاً على ثابت: الإيراد والرصيد معاً)
  if p_balance_shop_id is null and p_balance_debt_id is null then
    raise exception 'لا يوجد هدف رصيد لعكسه (يجب تمرير محل أو مديونية).';
  end if;

  -- سنة الأصل: العمود year، أو مقطع السنة من الـ id احتياطاً (للصفوف القديمة)
  -- ⚠️ يرث الصف العكسي فترة الأصل (startDate/updateDate + سنة/id الأصل) كي يتصافى
  --    الصافي في نفس فترة الأصل على كل المحدِّدات: اللوحة/التقارير عبر updateDate،
  --    والأرشيف/الكشف عبر مقطع السنة في الـ id.
  v_year := v_orig.year;
  if v_year is null then
    v_year_txt := split_part(v_orig.id, '-', 2);
    if v_year_txt !~ '^\d{4}$' then
      raise exception 'تعذّر تحديد سنة السند الأصلي % (العمود year فارغ والـ id غير قابل للتحليل) — راجع السند يدوياً قبل العكس.', v_orig.id;
    end if;
    v_year := v_year_txt::integer;
  end if;

  -- ترقيم ذرّي ضمن سنة الأصل (نفس نمط rpc_next_receipt وبنفس قفله لمنع التسابق)
  v_lock := ('x' || substr(md5('rpc_next_receipt_' || v_orig.type), 1, 16))::bit(64)::bigint;
  perform pg_advisory_xact_lock(v_lock);
  select coalesce(max(seq), 0) + 1 into v_seq
    from public.transactions where year = v_year and type = v_orig.type;
  if v_orig.type = 'إيجار' then
    v_id := 'SH-' || v_year || '-' || lpad(v_seq::text, 4, '0');
  else
    v_id := 'SH-' || v_year || '-D' || lpad(v_seq::text, 3, '0');
  end if;

  -- إدراج الصف العكسي مباشرةً (يمرّ عبر guard_transaction_insert للتحقق):
  -- مبلغ سالب + وراثة تاريخ الأصل + سنة الأصل + رابط العكس
  insert into public.transactions (
    id, "startDate", "updateDate", shop, tenant,
    "targetAmount", "paidAmount", "remainingAmount", method, status,
    "referenceId", "isDebtReceipt", year, seq, type, is_external, entity_id,
    reverses_transaction_id
  ) values (
    v_id, v_orig."startDate", v_orig."updateDate", v_orig.shop, v_orig.tenant,
    -v_orig."paidAmount", -v_orig."paidAmount", 0, v_orig.method, 'قيد عكسي',
    null, v_orig."isDebtReceipt", v_year, v_seq, v_orig.type, v_orig.is_external, v_orig.entity_id,
    v_orig.id
  )
  returning * into v_rev;

  -- عكس أثر الرصيد ذرّياً
  if p_balance_shop_id is not null then
    update public.shops set collected = coalesce(collected, 0) - v_orig."paidAmount"
     where id = p_balance_shop_id
    returning collected into v_new_collected;
    if not found then
      raise exception 'المحل بالمعرّف % غير موجود لعكس رصيد التحصيل', p_balance_shop_id;
    end if;
    if v_new_collected < 0 then
      raise exception 'عكس هذا السند سيجعل رصيد تحصيل المحل سالباً (%) — راجع حالة العقد قبل العكس.', v_new_collected;
    end if;
  else
    update public.debts set amount = amount + v_orig."paidAmount"
     where id = p_balance_debt_id
    returning amount into v_new_debt_amt;
    if not found then
      raise exception 'المديونية بالمعرّف % غير موجودة لعكس الرصيد', p_balance_debt_id;
    end if;
  end if;

  -- تعليم الأصل: معكوس (مسموح: الأصل بعدُ غير مجمَّد)
  update public.transactions
     set is_reversed     = true,
         reversed_by     = auth.uid(),
         reversed_at     = now(),
         reversal_reason = p_reason,
         status          = 'معكوس'
   where id = v_orig.id;

  return jsonb_build_object(
    'reversal',       to_jsonb(v_rev),
    'original_id',    v_orig.id,
    'shop_collected', v_new_collected,
    'debt_amount',    v_new_debt_amt
  );
end;
$function$;

-- =============================================================================
-- 5) تحصين rpc_amend_receipt: رفض تعديل سند معكوس أو عكسي (رسالة واضحة)
-- =============================================================================
CREATE OR REPLACE FUNCTION public.rpc_amend_receipt(p_receipt_id text, p_new_paid numeric, p_new_remaining numeric, p_new_status text, p_new_method text, p_update_date text, p_delta numeric, p_balance_shop_id text DEFAULT NULL::text, p_balance_debt_id text DEFAULT NULL::text, p_installment_id text DEFAULT NULL::text)
 RETURNS jsonb
 LANGUAGE plpgsql
 SET search_path TO 'public'
AS $function$
declare
  v_tx            public.transactions%rowtype;
  v_new_collected numeric := null;
  v_new_debt_amt  numeric := null;
  v_inst_deleted  boolean := false;
begin
  -- منع تعديل سند معكوس أو قيد عكسي
  perform 1 from public.transactions
    where id = p_receipt_id and (is_reversed or reverses_transaction_id is not null);
  if found then
    raise exception 'لا يمكن تعديل سند معكوس أو قيد عكسي (%).', p_receipt_id;
  end if;

  -- تحديث السند (فشل التحديث أو غياب السند يرفع استثناءً — لا فشل صامت)
  update public.transactions set
    "paidAmount"      = p_new_paid,
    "remainingAmount" = p_new_remaining,
    status            = p_new_status,
    method            = p_new_method,
    "updateDate"      = p_update_date
   where id = p_receipt_id
  returning * into v_tx;
  if not found then
    raise exception 'السند بالمعرّف % غير موجود', p_receipt_id;
  end if;

  -- فرع الرصيد
  if p_balance_shop_id is not null then
    update public.shops set collected = coalesce(collected, 0) + p_delta
     where id = p_balance_shop_id
    returning collected into v_new_collected;
    if not found then
      raise exception 'المحل بالمعرّف % غير موجود لتحديث رصيد التحصيل', p_balance_shop_id;
    end if;
  elsif p_balance_debt_id is not null then
    update public.debts set amount = amount - p_delta
     where id = p_balance_debt_id
    returning amount into v_new_debt_amt;
    if not found then
      raise exception 'المديونية بالمعرّف % غير موجودة لتحديث الرصيد', p_balance_debt_id;
    end if;
  end if;

  -- حذف الاستحقاق المرتبط إن مُرّر
  if p_installment_id is not null then
    delete from public.installments where id = p_installment_id;
    v_inst_deleted := found;
  end if;

  return jsonb_build_object(
    'receipt',             to_jsonb(v_tx),
    'shop_collected',      v_new_collected,
    'debt_amount',         v_new_debt_amt,
    'installment_deleted', v_inst_deleted
  );
end;
$function$;

-- =============================================================================
-- 6) الـ triggers على transactions
-- =============================================================================
CREATE TRIGGER trg_guard_transaction_insert
  BEFORE INSERT ON public.transactions
  FOR EACH ROW EXECUTE FUNCTION guard_transaction_insert();

CREATE TRIGGER trg_guard_transaction_immutable_columns
  BEFORE UPDATE ON public.transactions
  FOR EACH ROW EXECUTE FUNCTION guard_transaction_immutable_columns();
