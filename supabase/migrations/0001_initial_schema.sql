-- Migration: 0001_initial_schema.sql
-- Project: จดเงินออมตลาด (Talad Kheaw Saving) MVP v1.0
-- Security model: Single-market Shared Ledger with strict RLS, immutable financial ledger,
-- atomic withdrawal row locking, and server-verified staff roles.

BEGIN;

-- 1. Create domain enums
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'staff_role' AND typnamespace = 'public'::regnamespace) THEN
    CREATE TYPE public.staff_role AS ENUM ('admin', 'staff');
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'saver_status' AND typnamespace = 'public'::regnamespace) THEN
    CREATE TYPE public.saver_status AS ENUM ('active', 'suspended');
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'transaction_type' AND typnamespace = 'public'::regnamespace) THEN
    CREATE TYPE public.transaction_type AS ENUM ('deposit', 'withdraw');
  END IF;
END $$;

-- 2. Private schema for SECURITY DEFINER authorization helpers (not exposed via PostgREST)
CREATE SCHEMA IF NOT EXISTS private;
REVOKE ALL ON SCHEMA private FROM PUBLIC;
GRANT USAGE ON SCHEMA private TO authenticated;

-- 3. Tables
CREATE TABLE IF NOT EXISTS public.staff_profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT NOT NULL UNIQUE,
  full_name TEXT NOT NULL,
  role public.staff_role NOT NULL DEFAULT 'staff',
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.savers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  saver_code TEXT NOT NULL UNIQUE,
  first_name TEXT NOT NULL,
  last_name TEXT NOT NULL,
  phone TEXT NOT NULL,
  national_id TEXT,
  status public.saver_status NOT NULL DEFAULT 'active',
  notes TEXT,
  created_by UUID NOT NULL REFERENCES public.staff_profiles(id) ON DELETE RESTRICT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT savers_code_nonempty CHECK (length(btrim(saver_code)) > 0),
  CONSTRAINT savers_first_name_nonempty CHECK (length(btrim(first_name)) > 0),
  CONSTRAINT savers_last_name_nonempty CHECK (length(btrim(last_name)) > 0),
  CONSTRAINT savers_phone_nonempty CHECK (length(btrim(phone)) > 0)
);

-- Append-only financial ledger; amounts are stored in integer satang (1 THB = 100 satang)
CREATE TABLE IF NOT EXISTS public.transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  saver_id UUID NOT NULL REFERENCES public.savers(id) ON DELETE RESTRICT,
  type public.transaction_type NOT NULL,
  amount_satang BIGINT NOT NULL CHECK (amount_satang > 0),
  balance_after_satang BIGINT NOT NULL CHECK (balance_after_satang >= 0),
  transaction_date TIMESTAMPTZ NOT NULL DEFAULT now(),
  note TEXT,
  recorded_by UUID NOT NULL REFERENCES public.staff_profiles(id) ON DELETE RESTRICT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Append-only audit log
CREATE TABLE IF NOT EXISTS public.audit_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  actor_id UUID NOT NULL REFERENCES public.staff_profiles(id) ON DELETE RESTRICT,
  action TEXT NOT NULL,
  entity_type TEXT NOT NULL,
  entity_id UUID NOT NULL,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 4. Indexes for search, newest-first timelines, and audit queries
CREATE INDEX IF NOT EXISTS idx_transactions_saver_date
  ON public.transactions (saver_id, transaction_date DESC, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_transactions_date
  ON public.transactions (transaction_date DESC, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_savers_status
  ON public.savers (status);

CREATE INDEX IF NOT EXISTS idx_savers_phone
  ON public.savers (phone);

CREATE INDEX IF NOT EXISTS idx_audit_logs_entity
  ON public.audit_logs (entity_type, entity_id, created_at DESC);

-- 5. Deterministic balance view with security_invoker = true
CREATE OR REPLACE VIEW public.saver_balances
WITH (security_invoker = true) AS
SELECT
  s.id,
  s.saver_code,
  s.first_name,
  s.last_name,
  s.phone,
  s.national_id,
  s.status,
  s.notes,
  s.created_by,
  s.created_at,
  s.updated_at,
  COALESCE(SUM(CASE WHEN t.type = 'deposit' THEN t.amount_satang ELSE 0 END), 0)::BIGINT AS total_deposit_satang,
  COALESCE(SUM(CASE WHEN t.type = 'withdraw' THEN t.amount_satang ELSE 0 END), 0)::BIGINT AS total_withdraw_satang,
  COALESCE(SUM(CASE WHEN t.type = 'deposit' THEN t.amount_satang ELSE -t.amount_satang END), 0)::BIGINT AS balance_satang,
  COUNT(t.id)::INTEGER AS transaction_count,
  MAX(t.transaction_date) AS last_transaction_at
FROM public.savers s
LEFT JOIN public.transactions t ON t.saver_id = s.id
GROUP BY s.id;

-- 6. Private helper functions for RLS and triggers
CREATE OR REPLACE FUNCTION private.is_active_staff()
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.staff_profiles sp
    WHERE sp.id = (SELECT auth.uid())
      AND sp.is_active = true
  );
$$;

CREATE OR REPLACE FUNCTION private.is_admin()
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.staff_profiles sp
    WHERE sp.id = (SELECT auth.uid())
      AND sp.is_active = true
      AND sp.role = 'admin'::public.staff_role
  );
$$;

REVOKE ALL ON FUNCTION private.is_active_staff() FROM PUBLIC;
REVOKE ALL ON FUNCTION private.is_admin() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION private.is_active_staff() TO authenticated;
GRANT EXECUTE ON FUNCTION private.is_admin() TO authenticated;

-- 7. Trigger helpers (timestamp updates, admin-only saver status change, auth.users sync)
CREATE OR REPLACE FUNCTION public.touch_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = ''
AS $$
BEGIN
  NEW.updated_at := now();
  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION public.enforce_saver_status_admin_only()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = ''
AS $$
BEGIN
  IF NEW.status IS DISTINCT FROM OLD.status THEN
    IF NOT private.is_admin() THEN
      RAISE EXCEPTION 'FORBIDDEN_STATUS_CHANGE: Only administrators can change saver status'
        USING ERRCODE = '42501';
    END IF;
  END IF;

  -- Prevent tampering with immutable creation ownership
  NEW.created_by := OLD.created_by;
  NEW.created_at := OLD.created_at;
  NEW.updated_at := now();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_staff_profiles_updated_at ON public.staff_profiles;
CREATE TRIGGER trg_staff_profiles_updated_at
  BEFORE UPDATE ON public.staff_profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.touch_updated_at();

DROP TRIGGER IF EXISTS trg_savers_enforce_update ON public.savers;
CREATE TRIGGER trg_savers_enforce_update
  BEFORE UPDATE ON public.savers
  FOR EACH ROW
  EXECUTE FUNCTION public.enforce_saver_status_admin_only();

-- Auto-create staff_profiles when an auth user is provisioned.
-- Security rule: Never read role from user_metadata; always default to role = 'staff'
-- and is_active = false so unapproved signups cannot access market ledger data until activated.
CREATE OR REPLACE FUNCTION private.handle_new_auth_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_full_name TEXT;
BEGIN
  v_full_name := COALESCE(
    NULLIF(btrim(NEW.raw_user_meta_data ->> 'full_name'), ''),
    split_part(COALESCE(NEW.email, 'staff@market.local'), '@', 1)
  );

  INSERT INTO public.staff_profiles (id, email, full_name, role, is_active)
  VALUES (
    NEW.id,
    COALESCE(NEW.email, ''),
    v_full_name,
    'staff'::public.staff_role,
    false
  )
  ON CONFLICT (id) DO NOTHING;

  RETURN NEW;
END;
$$;

REVOKE ALL ON FUNCTION private.handle_new_auth_user() FROM PUBLIC;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION private.handle_new_auth_user();

-- 8. Atomic transaction recording RPC (SECURITY DEFINER so direct INSERT on transactions is blocked)
-- Locks saver row, prevents over-withdrawal, inserts immutable ledger row + audit log atomically.
CREATE OR REPLACE FUNCTION public.record_transaction(
  p_saver_id UUID,
  p_type public.transaction_type,
  p_amount_satang BIGINT,
  p_transaction_date TIMESTAMPTZ DEFAULT now(),
  p_note TEXT DEFAULT NULL
)
RETURNS public.transactions
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_actor_id UUID;
  v_saver_status public.saver_status;
  v_current_balance BIGINT;
  v_new_balance BIGINT;
  v_inserted public.transactions;
  v_clean_note TEXT;
BEGIN
  v_actor_id := (SELECT auth.uid());
  IF v_actor_id IS NULL OR NOT private.is_active_staff() THEN
    RAISE EXCEPTION 'UNAUTHORIZED: Active staff session required'
      USING ERRCODE = '42501';
  END IF;

  IF p_amount_satang IS NULL OR p_amount_satang <= 0 THEN
    RAISE EXCEPTION 'INVALID_AMOUNT: Transaction amount must be greater than zero'
      USING ERRCODE = '22023';
  END IF;

  -- Lock saver row to serialize concurrent balance checks and prevent race conditions
  SELECT s.status
  INTO v_saver_status
  FROM public.savers s
  WHERE s.id = p_saver_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'SAVER_NOT_FOUND: Saver does not exist'
      USING ERRCODE = 'P0002';
  END IF;

  IF v_saver_status <> 'active'::public.saver_status THEN
    RAISE EXCEPTION 'SAVER_SUSPENDED: Cannot record transactions for a suspended saver'
      USING ERRCODE = 'P0001';
  END IF;

  -- Deterministic balance calculation: SUM(deposit) - SUM(withdraw)
  SELECT COALESCE(
    SUM(CASE WHEN t.type = 'deposit' THEN t.amount_satang ELSE -t.amount_satang END),
    0
  )::BIGINT
  INTO v_current_balance
  FROM public.transactions t
  WHERE t.saver_id = p_saver_id;

  IF p_type = 'withdraw'::public.transaction_type AND p_amount_satang > v_current_balance THEN
    RAISE EXCEPTION 'INSUFFICIENT_BALANCE:%', v_current_balance
      USING ERRCODE = 'P0001',
            DETAIL = format('current_balance_satang=%s', v_current_balance);
  END IF;

  v_new_balance := CASE
    WHEN p_type = 'deposit'::public.transaction_type THEN v_current_balance + p_amount_satang
    ELSE v_current_balance - p_amount_satang
  END;

  v_clean_note := NULLIF(btrim(COALESCE(p_note, '')), '');

  INSERT INTO public.transactions (
    saver_id,
    type,
    amount_satang,
    balance_after_satang,
    transaction_date,
    note,
    recorded_by
  )
  VALUES (
    p_saver_id,
    p_type,
    p_amount_satang,
    v_new_balance,
    COALESCE(p_transaction_date, now()),
    v_clean_note,
    v_actor_id
  )
  RETURNING * INTO v_inserted;

  INSERT INTO public.audit_logs (
    actor_id,
    action,
    entity_type,
    entity_id,
    metadata
  )
  VALUES (
    v_actor_id,
    CASE
      WHEN p_type = 'deposit'::public.transaction_type THEN 'transaction.deposit'
      ELSE 'transaction.withdraw'
    END,
    'transaction',
    v_inserted.id,
    jsonb_build_object(
      'saver_id', p_saver_id,
      'type', p_type,
      'amount_satang', p_amount_satang,
      'balance_after_satang', v_new_balance
    )
  );

  RETURN v_inserted;
END;
$$;

REVOKE ALL ON FUNCTION public.record_transaction(UUID, public.transaction_type, BIGINT, TIMESTAMPTZ, TEXT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.record_transaction(UUID, public.transaction_type, BIGINT, TIMESTAMPTZ, TEXT) TO authenticated;

-- 9. Grants & Row-Level Security (RLS)
-- Block anonymous access completely; allow authenticated users only through RLS policies
REVOKE ALL ON public.staff_profiles FROM anon;
REVOKE ALL ON public.savers FROM anon;
REVOKE ALL ON public.transactions FROM anon;
REVOKE ALL ON public.audit_logs FROM anon;
REVOKE ALL ON public.saver_balances FROM anon;

GRANT SELECT, UPDATE ON public.staff_profiles TO authenticated;
GRANT SELECT, INSERT, UPDATE ON public.savers TO authenticated;
-- Direct INSERT on transactions is intentionally revoked; all writes must go through public.record_transaction()
GRANT SELECT ON public.transactions TO authenticated;
GRANT SELECT, INSERT ON public.audit_logs TO authenticated;
GRANT SELECT ON public.saver_balances TO authenticated;

ALTER TABLE public.staff_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.savers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;

-- staff_profiles policies
DROP POLICY IF EXISTS "staff_profiles_select_authenticated" ON public.staff_profiles;
CREATE POLICY "staff_profiles_select_authenticated"
  ON public.staff_profiles
  FOR SELECT
  TO authenticated
  USING ((SELECT auth.uid()) = id OR private.is_active_staff());

DROP POLICY IF EXISTS "staff_profiles_update_admin" ON public.staff_profiles;
CREATE POLICY "staff_profiles_update_admin"
  ON public.staff_profiles
  FOR UPDATE
  TO authenticated
  USING (private.is_admin())
  WITH CHECK (private.is_admin());

-- savers policies (no DELETE policy to preserve audit integrity)
DROP POLICY IF EXISTS "savers_select_active_staff" ON public.savers;
CREATE POLICY "savers_select_active_staff"
  ON public.savers
  FOR SELECT
  TO authenticated
  USING (private.is_active_staff());

DROP POLICY IF EXISTS "savers_insert_active_staff" ON public.savers;
CREATE POLICY "savers_insert_active_staff"
  ON public.savers
  FOR INSERT
  TO authenticated
  WITH CHECK (
    private.is_active_staff()
    AND created_by = (SELECT auth.uid())
  );

DROP POLICY IF EXISTS "savers_update_active_staff" ON public.savers;
CREATE POLICY "savers_update_active_staff"
  ON public.savers
  FOR UPDATE
  TO authenticated
  USING (private.is_active_staff())
  WITH CHECK (private.is_active_staff());

-- transactions policies (read-only for authenticated via PostgREST; writes only via record_transaction RPC)
DROP POLICY IF EXISTS "transactions_select_active_staff" ON public.transactions;
DROP POLICY IF EXISTS "transactions_insert_active_staff" ON public.transactions;
CREATE POLICY "transactions_select_active_staff"
  ON public.transactions
  FOR SELECT
  TO authenticated
  USING (private.is_active_staff());

-- audit_logs policies (append-only: SELECT and INSERT only, no UPDATE or DELETE)
DROP POLICY IF EXISTS "audit_logs_select_active_staff" ON public.audit_logs;
CREATE POLICY "audit_logs_select_active_staff"
  ON public.audit_logs
  FOR SELECT
  TO authenticated
  USING (private.is_active_staff());

DROP POLICY IF EXISTS "audit_logs_insert_active_staff" ON public.audit_logs;
CREATE POLICY "audit_logs_insert_active_staff"
  ON public.audit_logs
  FOR INSERT
  TO authenticated
  WITH CHECK (
    private.is_active_staff()
    AND actor_id = (SELECT auth.uid())
  );

COMMIT;
