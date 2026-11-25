-- Migration: 0002_harden_rpc_and_indexes.sql
-- Revoke anon EXECUTE on public.record_transaction (default PUBLIC/anon grant on public functions)
-- and add covering indexes for foreign keys flagged by Supabase Performance Advisor.

REVOKE EXECUTE ON FUNCTION public.record_transaction(
  UUID,
  public.transaction_type,
  BIGINT,
  TIMESTAMPTZ,
  TEXT
) FROM anon;

CREATE INDEX IF NOT EXISTS idx_audit_logs_actor_id
  ON public.audit_logs (actor_id);

CREATE INDEX IF NOT EXISTS idx_savers_created_by
  ON public.savers (created_by);

CREATE INDEX IF NOT EXISTS idx_transactions_recorded_by
  ON public.transactions (recorded_by);
