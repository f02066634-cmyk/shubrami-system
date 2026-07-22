-- =============================================================================
-- schema.sql — بنية قاعدة بيانات نظام أسواق الشبرمي (مرآة Supabase)
-- =============================================================================
-- المحتوى: الجداول + القيود (PK / FK / UNIQUE / CHECK) + الفهارس + تفعيل RLS.
-- الترتيب: الجداول مرتّبة بالتبعية (المرجوع إليه قبل المُشير) حتى تصحّ الـ FKs.
-- المصدر: نواتج استعلامات information_schema / pg_catalog حرفياً — بلا اختراع.
--
-- ترتيب التنفيذ للاستعادة الكاملة: schema.sql ← functions.sql ← policies.sql
-- ← triggers.sql  (انظر README.md).
-- =============================================================================

-- -----------------------------------------------------------------------------
-- 1) profiles — يشير إلى auth.users (يُنشأ صفّه تلقائياً عبر handle_new_user)
-- -----------------------------------------------------------------------------
CREATE TABLE public.profiles (
  id            uuid    NOT NULL,
  username      text    NOT NULL,
  name          text    NOT NULL,
  role          text    NOT NULL DEFAULT 'موظف'::text,
  allowed_tabs  text[]  NOT NULL DEFAULT '{}'::text[],
  created_at    timestamptz DEFAULT now(),
  CONSTRAINT profiles_pkey          PRIMARY KEY (id),
  CONSTRAINT profiles_username_key  UNIQUE (username),
  CONSTRAINT profiles_role_check    CHECK ((role = ANY (ARRAY['مدير'::text, 'موظف'::text]))),
  CONSTRAINT profiles_id_fkey       FOREIGN KEY (id) REFERENCES auth.users(id) ON DELETE CASCADE
);

-- -----------------------------------------------------------------------------
-- 2) bank_accounts — لا تبعيات
-- -----------------------------------------------------------------------------
CREATE TABLE public.bank_accounts (
  id              uuid    NOT NULL DEFAULT gen_random_uuid(),
  name            text    NOT NULL,
  bank_name       text    NOT NULL,
  account_number  text    NOT NULL,
  is_active       boolean NOT NULL DEFAULT true,
  created_at      timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT bank_accounts_pkey PRIMARY KEY (id)
);

-- -----------------------------------------------------------------------------
-- 3) expense_categories — FK → profiles(created_by)
-- -----------------------------------------------------------------------------
CREATE TABLE public.expense_categories (
  id          uuid    NOT NULL DEFAULT gen_random_uuid(),
  name        text    NOT NULL,
  created_at  timestamptz NOT NULL DEFAULT now(),
  created_by  uuid    DEFAULT auth.uid(),
  is_active   boolean NOT NULL DEFAULT true,
  CONSTRAINT expense_categories_pkey        PRIMARY KEY (id),
  CONSTRAINT expense_categories_name_key    UNIQUE (name),
  CONSTRAINT expense_categories_created_by_fkey FOREIGN KEY (created_by) REFERENCES profiles(id)
);

-- -----------------------------------------------------------------------------
-- 4) expenses — FK → expense_categories, bank_accounts, profiles، ونفسها
--    القيد expenses_amount_sign_chk: الصف العادي amount>0، والعكسي amount<0.
-- -----------------------------------------------------------------------------
CREATE TABLE public.expenses (
  id                  text    NOT NULL,
  date                text,
  category            text,
  amount              numeric,
  notes               text,
  category_id         uuid,
  created_by          uuid    DEFAULT auth.uid(),
  payment_method      text,
  bank_account_id     uuid,
  is_reversed         boolean NOT NULL DEFAULT false,
  reversed_by         uuid,
  reversed_at         timestamptz,
  reversal_reason     text,
  reverses_expense_id text,
  CONSTRAINT expenses_pkey                  PRIMARY KEY (id),
  CONSTRAINT expenses_amount_sign_chk       CHECK ((((reverses_expense_id IS NULL) AND (amount > (0)::numeric)) OR ((reverses_expense_id IS NOT NULL) AND (amount < (0)::numeric)))),
  CONSTRAINT expenses_category_id_fkey      FOREIGN KEY (category_id) REFERENCES expense_categories(id),
  CONSTRAINT expenses_bank_account_id_fkey  FOREIGN KEY (bank_account_id) REFERENCES bank_accounts(id),
  CONSTRAINT expenses_created_by_fkey       FOREIGN KEY (created_by) REFERENCES profiles(id),
  CONSTRAINT expenses_reversed_by_fkey      FOREIGN KEY (reversed_by) REFERENCES profiles(id),
  CONSTRAINT expenses_reverses_expense_id_fkey FOREIGN KEY (reverses_expense_id) REFERENCES expenses(id)
);

-- -----------------------------------------------------------------------------
-- 5) bank_account_assignments — FK → bank_accounts, profiles (كلاهما CASCADE)
-- -----------------------------------------------------------------------------
CREATE TABLE public.bank_account_assignments (
  id          uuid NOT NULL DEFAULT gen_random_uuid(),
  account_id  uuid NOT NULL,
  user_id     uuid NOT NULL,
  CONSTRAINT bank_account_assignments_pkey PRIMARY KEY (id),
  CONSTRAINT bank_account_assignments_account_id_user_id_key UNIQUE (account_id, user_id),
  CONSTRAINT bank_account_assignments_account_id_fkey FOREIGN KEY (account_id) REFERENCES bank_accounts(id) ON DELETE CASCADE,
  CONSTRAINT bank_account_assignments_user_id_fkey    FOREIGN KEY (user_id)    REFERENCES profiles(id)      ON DELETE CASCADE
);

-- -----------------------------------------------------------------------------
-- 6) expense_category_assignments — PK مركّب، FK → expense_categories, profiles
-- -----------------------------------------------------------------------------
CREATE TABLE public.expense_category_assignments (
  category_id  uuid NOT NULL,
  user_id      uuid NOT NULL,
  assigned_at  timestamptz NOT NULL DEFAULT now(),
  assigned_by  uuid DEFAULT auth.uid(),
  CONSTRAINT expense_category_assignments_pkey PRIMARY KEY (category_id, user_id),
  CONSTRAINT expense_category_assignments_category_id_fkey FOREIGN KEY (category_id) REFERENCES expense_categories(id) ON DELETE CASCADE,
  CONSTRAINT expense_category_assignments_user_id_fkey     FOREIGN KEY (user_id)     REFERENCES profiles(id)            ON DELETE CASCADE,
  CONSTRAINT expense_category_assignments_assigned_by_fkey FOREIGN KEY (assigned_by) REFERENCES profiles(id)
);

-- -----------------------------------------------------------------------------
-- 7) shops — لا تبعيات FK (أعمدة camelCase مقتبسة)
-- -----------------------------------------------------------------------------
CREATE TABLE public.shops (
  id              text    NOT NULL,
  "shopNumber"    text,
  area            numeric,
  status          text,
  tenant          text,
  "ejarNumber"    text,
  "annualRent"    numeric,
  "startDate"     text,
  "endDate"       text,
  collected       numeric,
  "isGroupMain"   boolean DEFAULT false,
  "groupShops"    jsonb   DEFAULT 'null'::jsonb,
  entity_id       uuid,
  last_entity_id  uuid,
  actual_end_date text,
  CONSTRAINT shops_pkey PRIMARY KEY (id)
);

-- -----------------------------------------------------------------------------
-- 8) transactions — لا تبعيات FK (أعمدة camelCase مقتبسة)
-- -----------------------------------------------------------------------------
CREATE TABLE public.transactions (
  id                text    NOT NULL,
  "startDate"       text,
  "updateDate"      text,
  shop              text,
  tenant            text,
  "targetAmount"    numeric,
  "paidAmount"      numeric,
  "remainingAmount" numeric,
  method            text,
  status            text,
  "referenceId"     text,
  "isDebtReceipt"   boolean DEFAULT false,
  year              integer,
  seq               integer,
  type              text,
  is_external       boolean NOT NULL DEFAULT false,
  entity_id         uuid,
  CONSTRAINT transactions_pkey PRIMARY KEY (id),
  CONSTRAINT transactions_year_seq_type_unique UNIQUE (year, seq, type)
);

-- -----------------------------------------------------------------------------
-- 9) debts — لا تبعيات FK
-- -----------------------------------------------------------------------------
CREATE TABLE public.debts (
  id              text    NOT NULL,
  year            text,
  tenant          text,
  details         text,
  amount          numeric,
  is_external     boolean NOT NULL DEFAULT false,
  original_amount numeric,
  entity_id       uuid,
  CONSTRAINT debts_pkey PRIMARY KEY (id)
);

-- -----------------------------------------------------------------------------
-- 10) installments — لا تبعيات FK
-- -----------------------------------------------------------------------------
CREATE TABLE public.installments (
  id            text NOT NULL,
  shop          text,
  amount        numeric,
  date          text,
  status        text NOT NULL DEFAULT 'مجدول'::text,
  cancel_reason text,
  cancelled_at  timestamptz,
  CONSTRAINT installments_pkey PRIMARY KEY (id)
);

-- -----------------------------------------------------------------------------
-- 11) audit_log — سجلّ غير قابل للتعديل (INSERT + SELECT فقط عبر السياسات)
-- -----------------------------------------------------------------------------
CREATE TABLE public.audit_log (
  id          uuid NOT NULL DEFAULT gen_random_uuid(),
  created_at  timestamptz NOT NULL DEFAULT now(),
  user_id     uuid,
  user_name   text,
  action_type text NOT NULL,
  entity_type text,
  entity_ref  text,
  details     jsonb,
  summary     text,
  CONSTRAINT audit_log_pkey PRIMARY KEY (id)
);

-- =============================================================================
-- الفهارس المستقلّة (غير المدعومة بقيد) — فهارس entity_id للأداء
-- =============================================================================
CREATE INDEX idx_debts_entity_id        ON public.debts        USING btree (entity_id);
CREATE INDEX idx_shops_entity_id        ON public.shops        USING btree (entity_id);
CREATE INDEX idx_shops_last_entity_id   ON public.shops        USING btree (last_entity_id);
CREATE INDEX idx_transactions_entity_id ON public.transactions USING btree (entity_id);

-- =============================================================================
-- تفعيل Row Level Security على كل الجداول (السياسات في policies.sql)
-- =============================================================================
ALTER TABLE public.profiles                     ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.bank_accounts                ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.expense_categories           ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.expenses                     ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.bank_account_assignments     ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.expense_category_assignments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.shops                        ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.transactions                 ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.debts                        ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.installments                 ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.audit_log                    ENABLE ROW LEVEL SECURITY;
