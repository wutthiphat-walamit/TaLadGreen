import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { TransactionModal } from "@/components/transactions/TransactionModal";
import type { SaverWithBalance } from "@/types/database";

const mockSaver: SaverWithBalance = {
  id: "550e8400-e29b-41d4-a716-446655440000",
  saver_code: "SV-0001",
  first_name: "สมชาย",
  last_name: "ใจดี",
  phone: "0812345678",
  national_id: "แผง A-01",
  status: "active",
  notes: null,
  created_by: "staff-1",
  created_at: "2026-11-25T08:00:00Z",
  updated_at: "2026-11-25T08:00:00Z",
  total_deposit_satang: 100000,
  total_withdraw_satang: 20000,
  balance_satang: 80000,
  transaction_count: 2,
  last_transaction_at: "2026-11-25T09:00:00Z",
};

describe("TransactionModal workflow", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it("shows over-withdrawal warning and disables submit when withdraw exceeds balance", () => {
    render(
      <TransactionModal
        open={true}
        onOpenChange={() => {}}
        initialType="withdraw"
        preselectedSaver={mockSaver}
        onSuccess={() => {}}
      />
    );

    const amountInput = screen.getByLabelText(/จำนวนเงิน/i);
    fireEvent.change(amountInput, { target: { value: "900" } });

    expect(
      screen.getByText(/ยอดเงินไม่เพียงพอสำหรับการถอน/i)
    ).toBeInTheDocument();

    const checkBtn = screen.getByRole("button", { name: /ตรวจสอบรายการ/i });
    expect(checkBtn).toBeDisabled();
  });

  it("requires confirmation step before posting deposit transaction", async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ transaction: { id: "tx-123" } }),
    });
    vi.stubGlobal("fetch", fetchMock);

    const onSuccess = vi.fn();
    render(
      <TransactionModal
        open={true}
        onOpenChange={() => {}}
        initialType="deposit"
        preselectedSaver={mockSaver}
        onSuccess={onSuccess}
      />
    );

    const amountInput = screen.getByLabelText(/จำนวนเงิน/i);
    fireEvent.change(amountInput, { target: { value: "250" } });

    // Click to enter confirmation view — must NOT have called fetch yet
    fireEvent.click(screen.getByRole("button", { name: /ตรวจสอบรายการ/i }));
    expect(fetchMock).not.toHaveBeenCalled();

    expect(
      screen.getByText(/ยืนยันการบันทึกรายการ/i)
    ).toBeInTheDocument();
    expect(screen.getByText(/฿1,050\.00/)).toBeInTheDocument();

    fireEvent.click(
      screen.getByRole("button", { name: /ยืนยันบันทึกรายการ/i })
    );

    await waitFor(() => {
      expect(fetchMock).toHaveBeenCalledTimes(1);
      expect(onSuccess).toHaveBeenCalledTimes(1);
    });
  });
});
