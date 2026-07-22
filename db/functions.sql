-- =============================================================================
-- functions.sql — دوال قاعدة البيانات (مرآة Supabase)
-- =============================================================================
-- منسوخة حرفياً من ناتج pg_get_functiondef — بلا تعديل.
-- الترتيب: الدوال المساعِدة (is_admin, has_tab) والحُرّاس أولاً، لأن السياسات
-- (policies.sql) والـ triggers (triggers.sql) تعتمد عليها. ثم دوال RPC.
--
-- ملاحظة: handle_new_user مُدرجة هنا لكن الـ trigger الذي يشغّلها يقع على
-- الجدول auth.users (وليس ضمن public)، ولم يظهر في نواتج الاستخراج — انظر
-- triggers.sql و README.md (فجوة موثّقة).
-- =============================================================================

-- ---------------------------------------------------------------------------
-- is_admin() — هل المستخدم الحالي مدير؟ (STABLE SECURITY DEFINER)
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.is_admin()
 RETURNS boolean
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  SELECT EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'مدير');
$function$;

-- ---------------------------------------------------------------------------
-- has_tab(tab_name) — هل يملك المستخدم صلاحية تبويب معيّن؟ (المدير يملك الكل)
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.has_tab(tab_name text)
 RETURNS boolean
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  select coalesce(
    (select role = 'مدير' or tab_name = any(allowed_tabs) from public.profiles where id = auth.uid()),
    false
  );
$function$;

-- ---------------------------------------------------------------------------
-- handle_new_user() — يُنشئ صفّ profiles تلقائياً عند تسجيل مستخدم auth جديد
-- (trigger على auth.users — انظر triggers.sql)
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.handle_new_user()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
begin
  insert into public.profiles (id, username, name, role, allowed_tabs)
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'username', split_part(new.email, '@', 1)),
    coalesce(new.raw_user_meta_data->>'name', new.email),
    coalesce(new.raw_user_meta_data->>'role', 'موظف'),
    case
      when new.raw_user_meta_data->'allowed_tabs' is null then '{}'::text[]
      else (select coalesce(array_agg(x), '{}') from jsonb_array_elements_text(new.raw_user_meta_data->'allowed_tabs') x)
    end
  );
  return new;
end;
$function$;

-- ---------------------------------------------------------------------------
-- guard_expense_immutable_columns() — يمنع تعديل الحقول المالية لمصروف مسجَّل
-- (trigger BEFORE UPDATE على expenses)
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.guard_expense_immutable_columns()
 RETURNS trigger
 LANGUAGE plpgsql
 SET search_path TO 'public'
AS $function$
begin
  if NEW.id                  is distinct from OLD.id
     or NEW.amount              is distinct from OLD.amount
     or NEW.category            is distinct from OLD.category
     or NEW.category_id         is distinct from OLD.category_id
     or NEW.date                is distinct from OLD.date
     or NEW.payment_method      is distinct from OLD.payment_method
     or NEW.bank_account_id     is distinct from OLD.bank_account_id
     or NEW.created_by          is distinct from OLD.created_by
     or NEW.reverses_expense_id is distinct from OLD.reverses_expense_id
  then
    raise exception 'لا يمكن تعديل الحقول المالية لمصروف مسجَّل — استخدم القيد العكسي بدلاً من ذلك.';
  end if;

  if OLD.is_reversed = true and NEW.is_reversed = false then
    raise exception 'لا يمكن إلغاء عكس مصروف سبق عكسه — سيؤدي ذلك إلى ازدواج الحساب مع بقاء القيد العكسي.';
  end if;

  return NEW;
end;
$function$;

-- ---------------------------------------------------------------------------
-- guard_expense_insert() — يتحقّق من صحّة القيد العكسي عند الإدراج
-- (trigger BEFORE INSERT على expenses)
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.guard_expense_insert()
 RETURNS trigger
 LANGUAGE plpgsql
 SET search_path TO 'public'
AS $function$
declare
  v_orig public.expenses%rowtype;
begin
  -- صف عادي: القيد CHECK يضمن amount > 0، لا فحوص إضافية
  if NEW.reverses_expense_id is null then
    return NEW;
  end if;

  -- صف عكسي: يتطلب صلاحية المدير
  if not is_admin() then
    raise exception 'القيد العكسي للمصروفات متاح لمدير النظام فقط.';
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

-- ---------------------------------------------------------------------------
-- guard_transaction_insert() — يتحقّق من صحّة الصف العكسي عند إدراج سند قبض
-- (trigger BEFORE INSERT على transactions)
-- ---------------------------------------------------------------------------
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

-- ---------------------------------------------------------------------------
-- guard_transaction_immutable_columns() — يجمّد الحقول المالية للسندات
-- المعكوسة/العكسية فقط (السندات العادية المفتوحة تبقى قابلة للتعديل)
-- (trigger BEFORE UPDATE على transactions)
-- ---------------------------------------------------------------------------
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

-- ---------------------------------------------------------------------------
-- rpc_add_manual_debt(...) — إدراج مديونية يدوية (مدير فقط)
-- ---------------------------------------------------------------------------
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
  IF NOT EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'مدير') THEN
    RAISE EXCEPTION 'الإدراج اليدوي للمديونية متاح لمدير النظام فقط';
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

-- ---------------------------------------------------------------------------
-- rpc_next_receipt(...) — الترقيم الذرّي وإدراج السند (البدائي — لا يُستدعى مباشرة عادةً)
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.rpc_next_receipt(p_type text, p_start_date text, p_update_date text, p_shop text, p_tenant text, p_target_amount numeric, p_paid_amount numeric, p_remaining numeric, p_method text, p_status text, p_reference_id text DEFAULT NULL::text, p_is_debt boolean DEFAULT false, p_is_external boolean DEFAULT false, p_entity_id uuid DEFAULT NULL::uuid)
 RETURNS SETOF transactions
 LANGUAGE plpgsql
 SET search_path TO 'public'
AS $function$
DECLARE
  v_year smallint := EXTRACT(YEAR FROM CURRENT_DATE)::smallint;
  v_seq  integer;
  v_id   text;
  v_lock bigint;
BEGIN
  IF p_type NOT IN ('إيجار', 'مديونية') THEN
    RAISE EXCEPTION 'rpc_next_receipt: قيمة p_type غير صالحة: %. القيم المقبولة: إيجار، مديونية', p_type;
  END IF;
  v_lock := ('x' || substr(md5('rpc_next_receipt_' || p_type), 1, 16))::bit(64)::bigint;
  PERFORM pg_advisory_xact_lock(v_lock);
  SELECT COALESCE(MAX(seq), 0) + 1
    INTO v_seq
    FROM transactions
   WHERE year = v_year
     AND type = p_type;
  IF p_type = 'إيجار' THEN
    v_id := 'SH-' || v_year || '-' || LPAD(v_seq::text, 4, '0');
  ELSE
    v_id := 'SH-' || v_year || '-D' || LPAD(v_seq::text, 3, '0');
  END IF;
  RETURN QUERY
  INSERT INTO transactions (
    id,
    "startDate", "updateDate",
    shop, tenant,
    "targetAmount", "paidAmount", "remainingAmount",
    method, status,
    "referenceId", "isDebtReceipt",
    year, seq, type,
    is_external,
    entity_id
  ) VALUES (
    v_id,
    p_start_date, p_update_date,
    p_shop, p_tenant,
    p_target_amount, p_paid_amount, p_remaining,
    p_method, p_status,
    p_reference_id, p_is_debt,
    v_year, v_seq, p_type,
    p_is_external,
    p_entity_id
  )
  RETURNING *;
END;
$function$;

-- ---------------------------------------------------------------------------
-- rpc_record_receipt(...) — تسجيل سند قبض ذرّياً (السند + الرصيد + حذف الاستحقاق)
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.rpc_record_receipt(p_type text, p_start_date text, p_update_date text, p_shop text, p_tenant text, p_target_amount numeric, p_paid_amount numeric, p_remaining numeric, p_method text, p_status text, p_reference_id text DEFAULT NULL::text, p_is_debt boolean DEFAULT false, p_is_external boolean DEFAULT false, p_entity_id uuid DEFAULT NULL::uuid, p_balance_shop_id text DEFAULT NULL::text, p_balance_debt_id text DEFAULT NULL::text, p_installment_id text DEFAULT NULL::text, p_check_open_tx boolean DEFAULT false)
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
  -- حماية تزامن: منع سند مفتوح مكرر لنفس المحل (تحصيل الإيجار)
  if p_check_open_tx then
    if exists (select 1 from public.transactions
                where shop = p_shop and status = 'مفتوح (قيد التحصيل)') then
      raise exception 'يوجد سند مفتوح (قيد التحصيل) لهذا المحل بالفعل — يجب إغلاقه أولاً.';
    end if;
  end if;

  -- إنشاء السند بالترقيم الذرّي (استدعاء الدالة البدائية بلا لمسها)
  select * into v_tx from public.rpc_next_receipt(
    p_type, p_start_date, p_update_date, p_shop, p_tenant,
    p_target_amount, p_paid_amount, p_remaining, p_method, p_status,
    p_reference_id, p_is_debt, p_is_external, p_entity_id
  );

  -- فرع الرصيد
  if p_balance_shop_id is not null then
    update public.shops set collected = coalesce(collected, 0) + p_paid_amount
     where id = p_balance_shop_id
    returning collected into v_new_collected;
    if not found then
      raise exception 'المحل بالمعرّف % غير موجود لتحديث رصيد التحصيل', p_balance_shop_id;
    end if;
  elsif p_balance_debt_id is not null then
    update public.debts set amount = amount - p_paid_amount
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

-- ---------------------------------------------------------------------------
-- rpc_amend_receipt(...) — تعديل سند قبض ذرّياً (تحديث السند + الرصيد + الاستحقاق)
-- ---------------------------------------------------------------------------
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

-- ---------------------------------------------------------------------------
-- rpc_reverse_receipt(...) — عكس سند قبض ذرّياً (صف عكسي + عكس الرصيد + تعليم الأصل)
-- ---------------------------------------------------------------------------
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

  -- هدف رصيد واحد إلزامي (وإلا يُرفض العكس كاملاً — الإيراد والرصيد يتحرّكان معاً)
  if p_balance_shop_id is null and p_balance_debt_id is null then
    raise exception 'لا يوجد هدف رصيد لعكسه (يجب تمرير محل أو مديونية).';
  end if;

  -- إنشاء الصف العكسي بالترقيم الذرّي (rpc_next_receipt بلا تعديل) — مبلغ سالب
  select * into v_rev from public.rpc_next_receipt(
    v_orig.type,
    v_orig."startDate",
    to_char(current_date, 'YYYY-MM-DD'),
    v_orig.shop,
    v_orig.tenant,
    -v_orig."paidAmount",
    -v_orig."paidAmount",
    0,
    v_orig.method,
    'قيد عكسي',
    null,
    v_orig."isDebtReceipt",
    v_orig.is_external,
    v_orig.entity_id
  );

  -- ربط الصف العكسي بالأصل (مسموح: الصف بعدُ غير مجمَّد)
  update public.transactions
     set reverses_transaction_id = v_orig.id
   where id = v_rev.id
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

-- ---------------------------------------------------------------------------
-- rpc_new_contract(...) — إنشاء عقد جديد لكيان (مع فحص تعارض التواريخ الأرشيفية)
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.rpc_new_contract(p_shop_ids text[], p_tenant text, p_ejar_number text, p_start_date text, p_end_date text, p_annual_rent numeric)
 RETURNS jsonb
 LANGUAGE plpgsql
 SET search_path TO 'public'
AS $function$
declare
  v_shop_id      text;
  v_shop         public.shops%rowtype;
  v_conflict     public.shops%rowtype;
  v_row          jsonb;
  v_updated      jsonb := '[]'::jsonb;
  v_idx          int := 0;
  v_is_main      boolean;
  v_entity_id    uuid := gen_random_uuid();
  v_shop_numbers text[] := '{}';
  v_group_count  int;
begin
  if p_shop_ids is null or array_length(p_shop_ids, 1) is null then
    raise exception 'لا توجد محلات لمعالجتها';
  end if;

  v_group_count := array_length(p_shop_ids, 1);

  foreach v_shop_id in array p_shop_ids loop
    select * into v_shop from public.shops where id = v_shop_id for update;

    if not found then
      raise exception 'المحل بالمعرّف % غير موجود', v_shop_id;
    end if;

    if v_shop.status <> 'شاغر' then
      raise exception '% ضمن كيان نشط أو غير شاغر (الحالة الحالية: %) — لا يمكن التعاقد عليه',
        v_shop."shopNumber", v_shop.status;
    end if;

    select * into v_conflict
      from public.shops
      where "shopNumber" = v_shop."shopNumber"
        and status like 'أرشيف%'
        and "startDate" is not null and "startDate" <> '-'
        and coalesce(actual_end_date, "endDate") <> '-'
        and p_start_date < coalesce(actual_end_date, "endDate")
        and p_end_date   > "startDate"
      order by "startDate" desc
      limit 1;

    if found then
      raise exception 'تعارض تواريخ: % كان مؤجراً للمستأجر "%" خلال الفترة (% إلى %) — لا يمكن أن يبدأ العقد الجديد قبل %',
        v_shop."shopNumber", v_conflict.tenant, v_conflict."startDate",
        coalesce(v_conflict.actual_end_date, v_conflict."endDate"),
        (coalesce(v_conflict.actual_end_date, v_conflict."endDate")::date + 1)::text;
    end if;

    v_shop_numbers := array_append(v_shop_numbers, v_shop."shopNumber");
  end loop;

  v_idx := 0;
  foreach v_shop_id in array p_shop_ids loop
    v_is_main := (v_idx = 0);

    update public.shops
       set status         = case when v_is_main then 'مؤجر' else 'مدمج' end,
           tenant          = p_tenant,
           "ejarNumber"    = p_ejar_number,
           "annualRent"    = case when v_is_main then p_annual_rent else 0 end,
           "startDate"     = p_start_date,
           "endDate"       = p_end_date,
           collected       = 0,
           "isGroupMain"   = case when v_group_count > 1 then v_is_main else false end,
           "groupShops"    = case when v_group_count > 1 then to_jsonb(v_shop_numbers) else null end,
           entity_id       = v_entity_id,
           last_entity_id  = null
     where id = v_shop_id
    returning to_jsonb(shops.*) into v_row;

    v_updated := v_updated || jsonb_build_array(v_row);
    v_idx := v_idx + 1;
  end loop;

  return jsonb_build_object(
    'entity_id',     v_entity_id,
    'updated_shops', v_updated
  );
end;
$function$;

-- ---------------------------------------------------------------------------
-- rpc_renew_contract(...) — تجديد عقد كيان (مع مسار تجاوز إداري للدين المتبقي)
-- ---------------------------------------------------------------------------
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
    if not exists (
      select 1 from public.profiles
      where id = auth.uid() and role = 'مدير'
    ) then
      raise exception 'غير مصرح: التجاوز الاستثنائي متاح لمدير النظام فقط.';
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

-- ---------------------------------------------------------------------------
-- rpc_vacate_contract(...) — إخلاء عقد كيان (مع إنشاء دين المتبقي واستثناء المدير)
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.rpc_vacate_contract(p_shop_ids text[], p_installment_ids text[], p_hard_delete boolean, p_actual_end_date text DEFAULT NULL::text, p_debt_override_amount numeric DEFAULT NULL::numeric)
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
        if not exists (select 1 from public.profiles where id = auth.uid() and role = 'مدير') then
          raise exception 'غير مصرح: تعديل قيمة الدين عند الإخلاء المبكر متاح لمدير النظام فقط.';
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
       set status = 'أرشيف - مخلى',
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
