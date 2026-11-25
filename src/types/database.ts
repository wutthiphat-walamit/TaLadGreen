export type StaffRole = "admin" | "staff";
export type SaverStatus = "active" | "suspended";
export type TransactionType = "deposit" | "withdraw";

export interface StaffProfile {
  id: string;
  email: string;
  full_name: string;
  role: StaffRole;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface Saver {
  id: string;
  saver_code: string;
  first_name: string;
  last_name: string;
  phone: string;
  national_id: string | null;
  status: SaverStatus;
  notes: string | null;
  created_by: string;
  created_at: string;
  updated_at: string;
}

export interface SaverWithBalance extends Saver {
  total_deposit_satang: number;
  total_withdraw_satang: number;
  balance_satang: number;
  transaction_count: number;
  last_transaction_at: string | null;
}

export interface TransactionRecord {
  id: string;
  saver_id: string;
  type: TransactionType;
  amount_satang: number;
  balance_after_satang: number;
  transaction_date: string;
  note: string | null;
  recorded_by: string;
  created_at: string;
}

export interface TransactionWithDetails extends TransactionRecord {
  saver_code: string;
  saver_name: string;
  recorder_name: string;
}

export interface DashboardSummary {
  totalSavingsSatang: number;
  activeSaversCount: number;
  totalSaversCount: number;
  todayDepositSatang: number;
  todayWithdrawSatang: number;
  todayTransactionCount: number;
  recentTransactions: TransactionWithDetails[];
}
