import type { TransactionType } from "@/types/database";

export const MAX_TRANSACTION_BAHT = 10_000_000;
export const MAX_TRANSACTION_SATANG = MAX_TRANSACTION_BAHT * 100;

export interface LedgerEntryLike {
  type: TransactionType;
  amount_satang: number;
}

/**
 * Convert a Baht amount (number or formatted string like "1,250.50") to integer satang.
 * Throws if invalid, negative, zero, or has more than 2 decimal places.
 */
export function bahtToSatang(input: number | string): number {
  const raw =
    typeof input === "number"
      ? input.toString()
      : input.replace(/,/g, "").trim();

  if (!/^\d+(\.\d{1,2})?$/.test(raw)) {
    throw new Error("จำนวนเงินไม่ถูกต้อง (รองรับทศนิยมไม่เกิน 2 ตำแหน่ง)");
  }

  const [wholePart, decimalPart = ""] = raw.split(".");
  const whole = Number(wholePart);
  const satangPart = Number(decimalPart.padEnd(2, "0"));
  const totalSatang = whole * 100 + satangPart;

  if (!Number.isSafeInteger(totalSatang) || totalSatang <= 0) {
    throw new Error("จำนวนเงินต้องมากกว่า 0 บาท");
  }

  if (totalSatang > MAX_TRANSACTION_SATANG) {
    throw new Error("จำนวนเงินเกินวงเงินสูงสุดต่อรายการ");
  }

  return totalSatang;
}

/**
 * Convert integer satang back to Baht number (rounded to 2 decimals).
 */
export function satangToBaht(satang: number): number {
  if (!Number.isFinite(satang)) return 0;
  return Math.round(satang) / 100;
}

/**
 * Deterministically calculate current balance in satang: SUM(deposits) - SUM(withdrawals).
 */
export function calculateBalanceSatang(entries: readonly LedgerEntryLike[]): number {
  let totalDeposit = 0;
  let totalWithdraw = 0;

  for (const entry of entries) {
    const amount = Math.trunc(entry.amount_satang);
    if (!Number.isFinite(amount) || amount <= 0) {
      throw new Error("Invalid ledger entry amount");
    }
    if (entry.type === "deposit") {
      totalDeposit += amount;
    } else if (entry.type === "withdraw") {
      totalWithdraw += amount;
    }
  }

  return totalDeposit - totalWithdraw;
}

/**
 * Check whether a withdrawal amount in satang is allowed against the current balance.
 */
export function canWithdraw(
  currentBalanceSatang: number,
  withdrawAmountSatang: number
): boolean {
  if (!Number.isInteger(currentBalanceSatang) || currentBalanceSatang < 0) {
    return false;
  }
  if (!Number.isInteger(withdrawAmountSatang) || withdrawAmountSatang <= 0) {
    return false;
  }
  return withdrawAmountSatang <= currentBalanceSatang;
}

/**
 * Format a Baht number with Thai locale commas and 2 decimal places (e.g., "1,250.00").
 */
export function formatBaht(amountBaht: number): string {
  const safe = Number.isFinite(amountBaht) ? amountBaht : 0;
  return new Intl.NumberFormat("th-TH", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(safe);
}

/**
 * Format integer satang directly into Baht string with commas (e.g., "1,250.00").
 */
export function formatSatangAsBaht(satang: number): string {
  return formatBaht(satangToBaht(satang));
}

/**
 * Parse a user-typed Baht input string safely without throwing; returns null if invalid.
 */
export function tryParseBahtToSatang(input: string): number | null {
  try {
    if (!input.trim()) return null;
    return bahtToSatang(input);
  } catch {
    return null;
  }
}
