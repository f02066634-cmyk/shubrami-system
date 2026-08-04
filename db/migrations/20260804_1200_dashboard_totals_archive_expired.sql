-- الهجرة: (1) إجماليات المصروفات للوحة المؤشرات (RPC مجمّعة) + (2) أرشفة كمنتهٍ
-- التاريخ: 2026-08-04
-- السبب:
--   1) لوحة المؤشرات إجمالية للمنشأة، لكن مؤشّر المصروفات كان يُحسب من صفوف
--      expenses تحت RLS (الموظف يرى بنوده فقط) → إجمالي ناقص وصافي خاطئ.
--      الحل: دالة SECURITY DEFINER تُرجع مجاميع فقط (لا صفوف) — بلا أي مساس
--      بسياسة expenses_select ولا بتبويب سجل المصروفات (عزل التفاصيل يبقى).
--   2) لم يكن هناك مُنتِج للحالة 'أرشيف - منتهي' (الأرشفة عبر تجديد→مجدد أو
--      إخلاء→مخلى فقط). إضافة معامل p_archive_status لدالة الإخلاء يتيح أرشفة
--      العقد المنتهي بنفس منطق الإخلاء لكن بوسم 'أرشيف - منتهي'.

-- ═══════════════════════════════════════════════════════════════════════════
-- (1) rpc_dashboard_expense_totals() — إجمالي المصروفات + التجميع بالسنة
--     (SECURITY DEFINER: يتجاوز RLS ويُرجع أرقاماً مجمّعة فقط — لا صفوف)
-- ═══════════════════════════════════════════════════════════════════════════
CREATE OR REPLACE FUNCTION public.rpc_dashboard_expense_totals()
 RETURNS jsonb
 LANGUAGE sql
 STABLE
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  SELECT jsonb_build_object(
    -- الإجمالي الكلي (يشمل الصفوف بلا تاريخ، ويُصافي القيود العكسية بالسالب)
    'total_all', COALESCE((SELECT SUM(amount) FROM public.expenses), 0),
    -- التجميع بالسنة (مطابق لـ getYear: الجزء قبل أول '-')؛ يستثني الصفوف بلا تاريخ
    'by_year', COALESCE((
      SELECT jsonb_object_agg(yr, tot)
      FROM (
        SELECT split_part(date, '-', 1) AS yr, SUM(amount) AS tot
        FROM public.expenses
        WHERE date IS NOT NULL AND date <> '-'
        GROUP BY split_part(date, '-', 1)
      ) g
    ), '{}'::jsonb)
  );
$function$;

GRANT EXECUTE ON FUNCTION public.rpc_dashboard_expense_totals() TO authenticated;

-- ═══════════════════════════════════════════════════════════════════════════
-- (2) rpc_vacate_contract(...) — إضافة p_archive_status (وسم الأرشفة)
--     الافتراضي 'أرشيف - مخلى' = سلوك الإخلاء الحالي بلا تغيير؛
--     تمرير 'أرشيف - منتهي' = أرشفة كمنتهٍ بنفس المنطق (تفريغ + دين المتبقّي).
--     (نُسقط التوقيع القديم ذا الخمسة معاملات ثم نعيد الإنشاء بستة — المعامل
--      الجديد اختياري فيبقى الاستدعاء الحالي متوافقاً.)
-- ═══════════════════════════════════════════════════════════════════════════
DROP FUNCTION IF EXISTS public.rpc_vacate_contract(text[], text[], boolean, text, numeric);

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

-- === التراجع (Down) — اختياري ===
-- DROP FUNCTION IF EXISTS public.rpc_dashboard_expense_totals();
-- DROP FUNCTION IF EXISTS public.rpc_vacate_contract(text[], text[], boolean, text, numeric, text);
-- (ولإرجاع دالة الإخلاء، أعِد تعريفها بخمسة معاملات من نسخة functions.sql السابقة.)
