-- =============================================================================
-- policies.sql — سياسات Row Level Security (مرآة Supabase)
-- =============================================================================
-- منسوخة حرفياً من ناتج pg_policies. كل السياسات للدور public.
-- التبعية: تعتمد على is_admin() و has_tab() (functions.sql) — تُنفَّذ بعد الدوال.
-- ملاحظة تنفيذ: تفعيل RLS ذاته يتم في schema.sql (ENABLE ROW LEVEL SECURITY).
--
-- الترميز:
--   INSERT        → WITH CHECK فقط
--   SELECT/DELETE → USING فقط
--   UPDATE        → USING + WITH CHECK
-- =============================================================================

-- ----------------------------- audit_log ------------------------------------
CREATE POLICY "audit insert authenticated" ON public.audit_log
  FOR INSERT TO public
  WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "audit select admin" ON public.audit_log
  FOR SELECT TO public
  USING (is_admin());

-- ------------------------ bank_account_assignments --------------------------
CREATE POLICY "bank_account_assignments_delete" ON public.bank_account_assignments
  FOR DELETE TO public
  USING (is_admin());

CREATE POLICY "bank_account_assignments_insert" ON public.bank_account_assignments
  FOR INSERT TO public
  WITH CHECK (is_admin());

CREATE POLICY "bank_account_assignments_select" ON public.bank_account_assignments
  FOR SELECT TO public
  USING (is_admin() OR (user_id = auth.uid()));

-- ----------------------------- bank_accounts --------------------------------
CREATE POLICY "bank_accounts_delete" ON public.bank_accounts
  FOR DELETE TO public
  USING (is_admin());

CREATE POLICY "bank_accounts_insert" ON public.bank_accounts
  FOR INSERT TO public
  WITH CHECK (is_admin());

CREATE POLICY "bank_accounts_select" ON public.bank_accounts
  FOR SELECT TO public
  USING (is_admin() OR (EXISTS ( SELECT 1
     FROM bank_account_assignments a
    WHERE ((a.account_id = bank_accounts.id) AND (a.user_id = auth.uid())))));

CREATE POLICY "bank_accounts_update" ON public.bank_accounts
  FOR UPDATE TO public
  USING (is_admin())
  WITH CHECK (is_admin());

-- -------------------------------- debts -------------------------------------
CREATE POLICY "debts insert" ON public.debts
  FOR INSERT TO public
  WITH CHECK (has_tab('debts'::text));

CREATE POLICY "debts select" ON public.debts
  FOR SELECT TO public
  USING (auth.uid() IS NOT NULL);

CREATE POLICY "debts update" ON public.debts
  FOR UPDATE TO public
  USING (has_tab('debts'::text))
  WITH CHECK (has_tab('debts'::text));

-- -------------------------- expense_categories ------------------------------
CREATE POLICY "expense_categories_delete" ON public.expense_categories
  FOR DELETE TO public
  USING (is_admin());

CREATE POLICY "expense_categories_insert" ON public.expense_categories
  FOR INSERT TO public
  WITH CHECK (is_admin());

CREATE POLICY "expense_categories_select" ON public.expense_categories
  FOR SELECT TO public
  USING (is_admin() OR (EXISTS ( SELECT 1
     FROM expense_category_assignments a
    WHERE ((a.category_id = expense_categories.id) AND (a.user_id = auth.uid())))));

CREATE POLICY "expense_categories_update" ON public.expense_categories
  FOR UPDATE TO public
  USING (is_admin())
  WITH CHECK (is_admin());

-- --------------------- expense_category_assignments -------------------------
CREATE POLICY "expense_category_assignments_delete" ON public.expense_category_assignments
  FOR DELETE TO public
  USING (is_admin());

CREATE POLICY "expense_category_assignments_insert" ON public.expense_category_assignments
  FOR INSERT TO public
  WITH CHECK (is_admin());

CREATE POLICY "expense_category_assignments_select" ON public.expense_category_assignments
  FOR SELECT TO public
  USING (is_admin() OR (user_id = auth.uid()));

-- ------------------------------- expenses -----------------------------------
CREATE POLICY "expenses_insert" ON public.expenses
  FOR INSERT TO public
  WITH CHECK ((created_by = auth.uid()) AND (is_admin() OR (EXISTS ( SELECT 1
     FROM expense_category_assignments a
    WHERE ((a.category_id = expenses.category_id) AND (a.user_id = auth.uid()))))));

CREATE POLICY "expenses_select" ON public.expenses
  FOR SELECT TO public
  USING (is_admin() OR (EXISTS ( SELECT 1
     FROM expense_category_assignments a
    WHERE ((a.category_id = expenses.category_id) AND (a.user_id = auth.uid())))));

CREATE POLICY "expenses_update_admin" ON public.expenses
  FOR UPDATE TO public
  USING (is_admin())
  WITH CHECK (is_admin());

-- ----------------------------- installments ---------------------------------
CREATE POLICY "installments delete" ON public.installments
  FOR DELETE TO public
  USING (has_tab('payments'::text));

CREATE POLICY "installments insert" ON public.installments
  FOR INSERT TO public
  WITH CHECK (has_tab('payments'::text));

CREATE POLICY "installments select" ON public.installments
  FOR SELECT TO public
  USING (auth.uid() IS NOT NULL);

-- ------------------------------- profiles -----------------------------------
CREATE POLICY "select own or admin" ON public.profiles
  FOR SELECT TO public
  USING ((id = auth.uid()) OR is_admin());

CREATE POLICY "admin update profiles" ON public.profiles
  FOR UPDATE TO public
  USING (is_admin())
  WITH CHECK (is_admin());

-- -------------------------------- shops -------------------------------------
CREATE POLICY "shops insert" ON public.shops
  FOR INSERT TO public
  WITH CHECK (has_tab('contracts'::text));

CREATE POLICY "shops select" ON public.shops
  FOR SELECT TO public
  USING (auth.uid() IS NOT NULL);

CREATE POLICY "shops update" ON public.shops
  FOR UPDATE TO public
  USING (has_tab('contracts'::text) OR has_tab('payments'::text) OR has_tab('debts'::text))
  WITH CHECK (has_tab('contracts'::text) OR has_tab('payments'::text) OR has_tab('debts'::text));

-- ----------------------------- transactions ---------------------------------
CREATE POLICY "tx insert" ON public.transactions
  FOR INSERT TO public
  WITH CHECK (has_tab('payments'::text) OR has_tab('debts'::text));

CREATE POLICY "tx select" ON public.transactions
  FOR SELECT TO public
  USING (auth.uid() IS NOT NULL);

CREATE POLICY "tx update" ON public.transactions
  FOR UPDATE TO public
  USING (has_tab('payments'::text) OR has_tab('debts'::text))
  WITH CHECK (has_tab('payments'::text) OR has_tab('debts'::text));
