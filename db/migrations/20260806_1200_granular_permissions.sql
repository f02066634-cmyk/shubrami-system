-- الهجرة: نظام الصلاحيات الدقيقة (user_permissions + has_permission)
-- التاريخ: 2026-08-06
-- السبب: تحويل الإجراءات الحصرية للمدير إلى صلاحيات دقيقة يمنحها المدير لأي
--        مستخدم، مفروضة في القاعدة (لا الواجهة فقط). المدير فوق الجميع ضمنياً،
--        وإدارة المستخدمين/منح الصلاحيات تبقى حكراً على المدير.

-- ═══ (1) جدول الصلاحيات + RLS ═══
CREATE TABLE IF NOT EXISTS public.user_permissions (
  user_id        uuid        NOT NULL,
  permission_key text        NOT NULL,
  granted_by     uuid,
  granted_at     timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT user_permissions_pkey PRIMARY KEY (user_id, permission_key),
  CONSTRAINT user_permissions_key_chk CHECK (permission_key IN (
    'reverse_expense', 'reverse_transfer_expense', 'reverse_receipt', 'manual_debt',
    'renew_override', 'vacate_override', 'archive_expired',
    'manage_expense_categories', 'manage_bank_accounts', 'view_audit_log'
  )),
  CONSTRAINT user_permissions_user_fkey    FOREIGN KEY (user_id)    REFERENCES public.profiles(id) ON DELETE CASCADE,
  CONSTRAINT user_permissions_granted_fkey FOREIGN KEY (granted_by) REFERENCES public.profiles(id)
);
ALTER TABLE public.user_permissions ENABLE ROW LEVEL SECURITY;

-- ═══ (2) دالة الفحص + الدوال المعدّلة ═══
CREATE OR REPLACE FUNCTION public.has_permission(perm text)
 RETURNS boolean
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  SELECT is_admin() OR EXISTS (
    SELECT 1 FROM public.user_permissions
    WHERE user_id = auth.uid() AND permission_key = perm
  );
$function$;

CREATE OR REPLACE FUNCTION public.guard_expense_insert()
 RETURNS trigger
 LANGUAGE plpgsql
 SET search_path TO 'public'
AS $function$
declare
  v_orig public.expenses%rowtype;
  v_transfer public.transfers%rowtype;
begin
  -- المصروفات المرتبطة بتحويل تُسجَّل حصراً عبر دوال التحويل (علم GUC يمنع التحايل).
  if NEW.transfer_id is not null then
    if coalesce(current_setting('app.transfer_rpc', true), '') <> '1' then
      raise exception 'المصروفات المرتبطة بتحويل تُسجَّل حصراً عبر دوال التحويل — لا يُسمح بالإدراج المباشر.';
    end if;
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

  -- صف عكسي: صلاحية reverse_expense — إلا حين يقوده مسار عكس التحويل (علم GUC)،
  -- فحينها rpc_reverse_transfer_expense هي السلطة عبر صلاحية reverse_transfer_expense.
  if coalesce(current_setting('app.transfer_rpc', true), '') <> '1'
     and not has_permission('reverse_expense') then
    raise exception 'عكس قيد المصروف يتطلب صلاحية reverse_expense.';
  end if;

  -- يجب أن يشير إلى مصروف أصلي موجود
  select * into v_orig from public.expenses where id = NEW.reverses_expense_id;
  if not found then
    raise exception 'القيد العكسي يشير إلى مصروف غير موجود (%).', NEW.reverses_expense_id;
  end if;

  -- لا يجوز عكس قيد عكسي
  if v_orig.reverses_expense_id is not null then
    raise exception 'لا يمكن عكس قيد عكسي.';
  end if;

  -- لا يجوز عكس مصروف سبق عكسه
  if v_orig.is_reversed then
    raise exception 'هذا المصروف (%) سبق عكسه.', v_orig.id;
  end if;

  -- يجب أن يساوي مبلغ القيد العكسي سالب مبلغ الأصلي بالضبط
  if NEW.amount <> -v_orig.amount then
    raise exception 'مبلغ القيد العكسي (%) يجب أن يساوي سالب مبلغ المصروف الأصلي (%).', NEW.amount, v_orig.amount;
  end if;

  return NEW;
end;
$function$;

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

  -- صف عكسي: صلاحية reverse_receipt
  if not has_permission('reverse_receipt') then
    raise exception 'عكس سند القبض يتطلب صلاحية reverse_receipt.';
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

CREATE OR REPLACE FUNCTION public.rpc_add_manual_debt(p_tenant text, p_year text, p_reason text, p_details text, p_amount numeric, p_is_external boolean DEFAULT false)
 RETURNS SETOF debts
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_id            text;
  v_full_details  text;
BEGIN
  IF NOT has_permission('manual_debt') THEN
    RAISE EXCEPTION 'الإدراج اليدوي للمديونية يتطلب صلاحية manual_debt';
  END IF;

  IF p_tenant IS NULL OR trim(p_tenant) = '' THEN
    RAISE EXCEPTION 'rpc_add_manual_debt: اسم المستأجر مطلوب';
  END IF;

  IF p_reason IS NULL OR trim(p_reason) = '' THEN
    RAISE EXCEPTION 'rpc_add_manual_debt: سبب المديونية مطلوب';
  END IF;

  IF p_amount IS NULL OR p_amount <= 0 THEN
    RAISE EXCEPTION 'rpc_add_manual_debt: المبلغ يجب أن يكون أكبر من صفر';
  END IF;

  v_id := 'D-' || extract(epoch FROM clock_timestamp())::bigint;
  v_full_details := 'السبب: ' || p_reason || COALESCE(E'\n' || NULLIF(trim(p_details), ''), '');

  RETURN QUERY
  INSERT INTO debts (id, year, tenant, details, amount, is_external, original_amount)
  VALUES (v_id, p_year, trim(p_tenant), v_full_details, p_amount, p_is_external, p_amount)
  RETURNING *;
END;
$function$;

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
  -- صلاحية reverse_receipt
  if not has_permission('reverse_receipt') then
    raise exception 'عكس سند القبض يتطلب صلاحية reverse_receipt.';
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

  -- هدف رصيد واحد إلزامي (وإلا يُرفض العكس كاملاً — الإيراد والرصيد يتحرّكان معاً)
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

CREATE OR REPLACE FUNCTION public.rpc_reverse_transfer_expense(p_expense_id text, p_reversal_id text, p_reason text)
 RETURNS jsonb
 LANGUAGE plpgsql
 SET search_path TO 'public'
AS $function$
declare
  v_orig     public.expenses%rowtype;
  v_transfer public.transfers%rowtype;
  v_rev      public.expenses%rowtype;
begin
  if not has_permission('reverse_transfer_expense') then
    raise exception 'عكس بند مصروف من تحويل يتطلب صلاحية reverse_transfer_expense.';
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

CREATE OR REPLACE FUNCTION public.rpc_renew_contract(p_shop_ids text[], p_tenant text, p_ejar_number text, p_start_date text, p_end_date text, p_annual_rent numeric, p_admin_override boolean DEFAULT false, p_entity_id uuid DEFAULT NULL::uuid)
 RETURNS jsonb
 LANGUAGE plpgsql
 SET search_path TO 'public'
AS $function$
declare
  v_shop_id      text;
  v_shop         public.shops%rowtype;
  v_row          jsonb;
  v_debts        jsonb := '[]'::jsonb;   -- ← جديد (يُعبأ فقط في مسار التجاوز)
  v_archived     jsonb := '[]'::jsonb;
  v_new_shops    jsonb := '[]'::jsonb;
  v_remaining    numeric;
  v_new_id       text;
  v_idx          int := 0;
  v_is_main      boolean;
  v_shop_numbers text[] := '{}';
  v_group_count  int;
begin
  if p_shop_ids is null or array_length(p_shop_ids, 1) is null then
    raise exception 'لا توجد محلات لمعالجتها';
  end if;

  if p_entity_id is null then
    raise exception 'p_entity_id مطلوب - لا يمكن التجديد بدون تحديد هوية الكيان المستمر';
  end if;

  v_group_count := array_length(p_shop_ids, 1);

  -- التحقق من صلاحية المدير مرة واحدة قبل الحلقة (إن طُلب التجاوز)
  if p_admin_override then
    if not has_permission('renew_override') then
      raise exception 'غير مصرح: التجديد الاستثنائي يتطلب صلاحية renew_override.';
    end if;
  end if;

  -- المرحلة 1: قفل الصفوف + التحقق من الحالة + تطابق entity_id + معالجة الدين
  foreach v_shop_id in array p_shop_ids loop
    select * into v_shop from public.shops where id = v_shop_id for update;

    if not found then
      raise exception 'المحل بالمعرّف % غير موجود', v_shop_id;
    end if;

    if v_shop.status not in ('أرشيف - منتهي', 'مؤجر', 'مدمج') then
      raise exception 'المحل % ليس في حالة قابلة للتجديد (الحالة الحالية: %)',
        v_shop."shopNumber", v_shop.status;
    end if;

    if v_shop.entity_id is distinct from p_entity_id then
      raise exception 'تعارض: المحل % لا ينتمي لنفس الكيان الممرَّر (entity_id غير متطابق)',
        v_shop."shopNumber";
    end if;

    v_remaining := greatest(0, coalesce(v_shop."annualRent", 0) - coalesce(v_shop.collected, 0));

    if v_remaining > 0 then
      if not p_admin_override then
        -- المسار العادي: رفض التجديد مع وجود دين
        raise exception 'لا يمكن التجديد - يوجد دين متبقٍّ قدره % ريال على المحل %. يجب سداد الدين بالكامل قبل التجديد.',
          v_remaining, v_shop."shopNumber";
      end if;

      -- مسار التجاوز الاستثنائي: إدراج الدين ثم متابعة التجديد
      v_new_id := 'D-' || floor(extract(epoch from clock_timestamp()) * 1000)::bigint::text
                       || '-' || v_shop."shopNumber";
      insert into public.debts (id, year, tenant, details, amount, original_amount, entity_id)
      values (
        v_new_id,
        to_char(current_date, 'YYYY-MM-DD'),
        v_shop.tenant,
        'دين متبقٍ من تجديد استثنائي (بموافقة المدير) - المحل ' || v_shop."shopNumber"
          || ' (عقد سابق رقم ' || v_shop."ejarNumber" || ')',
        v_remaining,
        v_remaining,
        p_entity_id
      )
      returning to_jsonb(debts.*) into v_row;
      v_debts := v_debts || jsonb_build_array(v_row);
    end if;

    v_shop_numbers := array_append(v_shop_numbers, v_shop."shopNumber");
  end loop;

  -- المرحلة 2: أرشفة الصف القديم (مع تسجيل actual_end_date) + إنشاء الصف الجديد
  v_idx := 0;
  foreach v_shop_id in array p_shop_ids loop
    select * into v_shop from public.shops where id = v_shop_id;
    v_is_main := (v_idx = 0);

    update public.shops
       set status = 'أرشيف - مجدد',
           actual_end_date = "endDate"
     where id = v_shop_id
    returning to_jsonb(shops.*) into v_row;
    v_archived := v_archived || jsonb_build_array(v_row);

    v_new_id := 'row-' || floor(extract(epoch from clock_timestamp()) * 1000)::bigint::text
                       || '-' || v_shop."shopNumber";

    insert into public.shops (
      id, "shopNumber", area, status, tenant, "ejarNumber",
      "annualRent", "startDate", "endDate", collected, "isGroupMain", "groupShops",
      entity_id, last_entity_id
    )
    values (
      v_new_id,
      v_shop."shopNumber",
      60,  -- عيب area:60 الثابت محفوظ كما هو بقرار صريح
      case when v_is_main then 'مؤجر' else 'مدمج' end,
      p_tenant,
      p_ejar_number,
      case when v_is_main then p_annual_rent else 0 end,
      p_start_date,
      p_end_date,
      0,
      case when v_group_count > 1 then v_is_main else false end,
      case when v_group_count > 1 then to_jsonb(v_shop_numbers) else null end,
      p_entity_id,
      null
    )
    returning to_jsonb(shops.*) into v_row;
    v_new_shops := v_new_shops || jsonb_build_array(v_row);

    v_idx := v_idx + 1;
  end loop;

  return jsonb_build_object(
    'debts',          v_debts,        -- ← مضاف (فارغ [] في المسار العادي، مُعبأ في التجاوز)
    'archived_shops', v_archived,
    'new_shops',      v_new_shops
  );
end;
$function$;

CREATE OR REPLACE FUNCTION public.rpc_vacate_contract(p_shop_ids text[], p_installment_ids text[], p_hard_delete boolean, p_actual_end_date text DEFAULT NULL::text, p_debt_override_amount numeric DEFAULT NULL::numeric, p_archive_status text DEFAULT 'أرشيف - مخلى'::text)
 RETURNS jsonb
 LANGUAGE plpgsql
 SET search_path TO 'public'
AS $function$
declare
  v_shop_id       text;
  v_inst_id       text;
  v_shop          public.shops%rowtype;
  v_row           jsonb;
  v_debts         jsonb := '[]'::jsonb;
  v_archived      jsonb := '[]'::jsonb;
  v_vacant        jsonb := '[]'::jsonb;
  v_deleted_ids   jsonb := '[]'::jsonb;
  v_cancelled     jsonb := '[]'::jsonb;
  v_remaining     numeric;
  v_debt_amount   numeric;
  v_new_id        text;
  v_cancelled_at  timestamptz := now();
begin
  if p_shop_ids is null or array_length(p_shop_ids, 1) is null then
    raise exception 'لا توجد محلات لمعالجتها';
  end if;

  -- وسم الأرشفة: إخلاء أو منتهٍ فقط
  if p_archive_status not in ('أرشيف - مخلى', 'أرشيف - منتهي') then
    raise exception 'وسم الأرشفة غير صالح (%).', p_archive_status;
  end if;

  -- سدّ الثغرة: أرشفة العقد كمنتهٍ تتطلب صلاحية archive_expired
  -- (الإخلاء العادي 'أرشيف - مخلى' يبقى مفروضاً بصلاحية التبويب shops update).
  if p_archive_status = 'أرشيف - منتهي' and not has_permission('archive_expired') then
    raise exception 'أرشفة العقد كمنتهٍ تتطلب صلاحية archive_expired.';
  end if;

  foreach v_shop_id in array p_shop_ids loop
    select * into v_shop from public.shops where id = v_shop_id for update;

    if not found then
      raise exception 'المحل بالمعرّف % غير موجود', v_shop_id;
    end if;

    if v_shop.status not in ('مؤجر', 'مدمج', 'أرشيف - منتهي') then
      raise exception 'المحل % ليس في حالة قابلة للإخلاء (الحالة الحالية: %)',
        v_shop."shopNumber", v_shop.status;
    end if;

    if p_actual_end_date is not null and (p_actual_end_date < v_shop."startDate" or p_actual_end_date > v_shop."endDate") then
      raise exception 'تاريخ المغادرة الفعلي (%) يجب أن يقع بين تاريخ بداية العقد (%) ونهايته (%) للمحل %',
        p_actual_end_date, v_shop."startDate", v_shop."endDate", v_shop."shopNumber";
    end if;

    v_remaining := greatest(0, coalesce(v_shop."annualRent", 0) - coalesce(v_shop.collected, 0));

    if v_remaining > 0 then
      if p_debt_override_amount is not null then
        if not has_permission('vacate_override') then
          raise exception 'غير مصرح: الإخلاء المبكر بدين مخفّض يتطلب صلاحية vacate_override.';
        end if;
        if p_debt_override_amount < 0 or p_debt_override_amount > v_remaining then
          raise exception 'قيمة الدين المعتمدة (%) يجب أن تكون بين 0 والمتبقي الفعلي (%) للمحل %',
            p_debt_override_amount, v_remaining, v_shop."shopNumber";
        end if;
        v_debt_amount := p_debt_override_amount;
      else
        v_debt_amount := v_remaining;
      end if;

      if v_debt_amount > 0 then
        v_new_id := 'D-' || floor(extract(epoch from clock_timestamp()) * 1000)::bigint::text
                         || '-' || v_shop."shopNumber";
        insert into public.debts (id, year, tenant, details, amount, original_amount, entity_id)
        values (
          v_new_id,
          to_char(current_date, 'YYYY-MM-DD'),
          v_shop.tenant,
          case when p_debt_override_amount is not null and p_debt_override_amount < v_remaining then
            'دين متبقٍ من مغادرة مبكرة (استثناء إداري) - المحل ' || v_shop."shopNumber"
              || ' — اعتماد مبلغ مخفّض (' || v_debt_amount || ' ريال) من أصل متبقٍ فعلي (' || v_remaining || ' ريال)'
          else
            'دين متبقٍ من مغادرة المستأجر - المحل ' || v_shop."shopNumber"
              || ' (عقد سابق رقم ' || v_shop."ejarNumber" || ')'
          end,
          v_debt_amount,
          v_debt_amount,
          v_shop.entity_id
        )
        returning to_jsonb(debts.*) into v_row;
        v_debts := v_debts || jsonb_build_array(v_row);
      end if;
    end if;

    update public.shops
       set status = p_archive_status,
           actual_end_date = coalesce(p_actual_end_date, "endDate")
     where id = v_shop_id
    returning to_jsonb(shops.*) into v_row;
    v_archived := v_archived || jsonb_build_array(v_row);

    v_new_id := 'row-' || floor(extract(epoch from clock_timestamp()) * 1000)::bigint::text
                       || '-' || v_shop."shopNumber";
    insert into public.shops (
      id, "shopNumber", area, status, tenant, "ejarNumber",
      "annualRent", "startDate", "endDate", collected, "isGroupMain", "groupShops",
      entity_id, last_entity_id
    )
    values (
      v_new_id,
      v_shop."shopNumber",
      coalesce(v_shop.area, 60),
      'شاغر',
      '-', '-',
      coalesce(v_shop."annualRent", 15000),
      '-', '-',
      0, false, null,
      null, v_shop.entity_id
    )
    returning to_jsonb(shops.*) into v_row;
    v_vacant := v_vacant || jsonb_build_array(v_row);
  end loop;

  if p_installment_ids is not null and array_length(p_installment_ids, 1) > 0 then
    if p_hard_delete then
      foreach v_inst_id in array p_installment_ids loop
        delete from public.installments where id = v_inst_id;
        if found then
          v_deleted_ids := v_deleted_ids || to_jsonb(v_inst_id);
        end if;
      end loop;
    else
      foreach v_inst_id in array p_installment_ids loop
        update public.installments
           set status = 'ملغى',
               cancel_reason = 'مغادرة المستأجر',
               cancelled_at = v_cancelled_at
         where id = v_inst_id
        returning to_jsonb(installments.*) into v_row;
        if found then
          v_cancelled := v_cancelled || jsonb_build_array(v_row);
        end if;
      end loop;
    end if;
  end if;

  return jsonb_build_object(
    'debts',                    v_debts,
    'archived_shops',           v_archived,
    'vacant_shops',             v_vacant,
    'deleted_installment_ids',  v_deleted_ids,
    'cancelled_installments',   v_cancelled
  );
end;
$function$;
GRANT EXECUTE ON FUNCTION public.has_permission(text) TO authenticated;

-- ═══ (3) السياسات المعدّلة (DROP ثم CREATE) ═══
DROP POLICY IF EXISTS "audit select admin" ON public.audit_log;
CREATE POLICY "audit select admin" ON public.audit_log
  FOR SELECT TO public
  USING (has_permission('view_audit_log'));

DROP POLICY IF EXISTS "bank_account_assignments_delete" ON public.bank_account_assignments;
CREATE POLICY "bank_account_assignments_delete" ON public.bank_account_assignments
  FOR DELETE TO public
  USING (has_permission('manage_bank_accounts'));

DROP POLICY IF EXISTS "bank_account_assignments_insert" ON public.bank_account_assignments;
CREATE POLICY "bank_account_assignments_insert" ON public.bank_account_assignments
  FOR INSERT TO public
  WITH CHECK (has_permission('manage_bank_accounts'));

DROP POLICY IF EXISTS "bank_account_assignments_select" ON public.bank_account_assignments;
CREATE POLICY "bank_account_assignments_select" ON public.bank_account_assignments
  FOR SELECT TO public
  USING (has_permission('manage_bank_accounts') OR (user_id = auth.uid()));

DROP POLICY IF EXISTS "bank_accounts_delete" ON public.bank_accounts;
CREATE POLICY "bank_accounts_delete" ON public.bank_accounts
  FOR DELETE TO public
  USING (has_permission('manage_bank_accounts'));

DROP POLICY IF EXISTS "bank_accounts_insert" ON public.bank_accounts;
CREATE POLICY "bank_accounts_insert" ON public.bank_accounts
  FOR INSERT TO public
  WITH CHECK (has_permission('manage_bank_accounts'));

DROP POLICY IF EXISTS "bank_accounts_select" ON public.bank_accounts;
CREATE POLICY "bank_accounts_select" ON public.bank_accounts
  FOR SELECT TO public
  USING (has_permission('manage_bank_accounts') OR (EXISTS ( SELECT 1
     FROM bank_account_assignments a
    WHERE ((a.account_id = bank_accounts.id) AND (a.user_id = auth.uid())))));

DROP POLICY IF EXISTS "bank_accounts_update" ON public.bank_accounts;
CREATE POLICY "bank_accounts_update" ON public.bank_accounts
  FOR UPDATE TO public
  USING (has_permission('manage_bank_accounts'))
  WITH CHECK (has_permission('manage_bank_accounts'));

DROP POLICY IF EXISTS "transfers_delete" ON public.transfers;
CREATE POLICY "transfers_delete" ON public.transfers
  FOR DELETE TO public
  USING (has_permission('manage_bank_accounts'));

DROP POLICY IF EXISTS "expense_categories_delete" ON public.expense_categories;
CREATE POLICY "expense_categories_delete" ON public.expense_categories
  FOR DELETE TO public
  USING (has_permission('manage_expense_categories'));

DROP POLICY IF EXISTS "expense_categories_insert" ON public.expense_categories;
CREATE POLICY "expense_categories_insert" ON public.expense_categories
  FOR INSERT TO public
  WITH CHECK (has_permission('manage_expense_categories'));

DROP POLICY IF EXISTS "expense_categories_select" ON public.expense_categories;
CREATE POLICY "expense_categories_select" ON public.expense_categories
  FOR SELECT TO public
  USING (has_permission('manage_expense_categories') OR (EXISTS ( SELECT 1
     FROM expense_category_assignments a
    WHERE ((a.category_id = expense_categories.id) AND (a.user_id = auth.uid())))));

DROP POLICY IF EXISTS "expense_categories_update" ON public.expense_categories;
CREATE POLICY "expense_categories_update" ON public.expense_categories
  FOR UPDATE TO public
  USING (has_permission('manage_expense_categories'))
  WITH CHECK (has_permission('manage_expense_categories'));

DROP POLICY IF EXISTS "expense_category_assignments_delete" ON public.expense_category_assignments;
CREATE POLICY "expense_category_assignments_delete" ON public.expense_category_assignments
  FOR DELETE TO public
  USING (has_permission('manage_expense_categories'));

DROP POLICY IF EXISTS "expense_category_assignments_insert" ON public.expense_category_assignments;
CREATE POLICY "expense_category_assignments_insert" ON public.expense_category_assignments
  FOR INSERT TO public
  WITH CHECK (has_permission('manage_expense_categories'));

DROP POLICY IF EXISTS "expense_category_assignments_select" ON public.expense_category_assignments;
CREATE POLICY "expense_category_assignments_select" ON public.expense_category_assignments
  FOR SELECT TO public
  USING (has_permission('manage_expense_categories') OR (user_id = auth.uid()));

DROP POLICY IF EXISTS "expenses_update_admin" ON public.expenses;
CREATE POLICY "expenses_update_admin" ON public.expenses
  FOR UPDATE TO public
  USING (has_permission('reverse_expense') OR has_permission('reverse_transfer_expense'))
  WITH CHECK (has_permission('reverse_expense') OR has_permission('reverse_transfer_expense'));

-- ═══ (4) سياسات جدول الصلاحيات ═══
DROP POLICY IF EXISTS "user_permissions_select" ON public.user_permissions;
CREATE POLICY "user_permissions_select" ON public.user_permissions
  FOR SELECT TO public
  USING (is_admin() OR (user_id = auth.uid()));

DROP POLICY IF EXISTS "user_permissions_insert" ON public.user_permissions;
CREATE POLICY "user_permissions_insert" ON public.user_permissions
  FOR INSERT TO public
  WITH CHECK (is_admin());

DROP POLICY IF EXISTS "user_permissions_update" ON public.user_permissions;
CREATE POLICY "user_permissions_update" ON public.user_permissions
  FOR UPDATE TO public
  USING (is_admin())
  WITH CHECK (is_admin());

DROP POLICY IF EXISTS "user_permissions_delete" ON public.user_permissions;
CREATE POLICY "user_permissions_delete" ON public.user_permissions
  FOR DELETE TO public
  USING (is_admin());
