import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";

const mockGetUser = vi.fn();
const mockFrom = vi.fn();
const mockRpc = vi.fn();

vi.mock("@/lib/supabase/env", () => ({
  getSupabaseEnv: () => ({
    url: "https://example.supabase.co",
    key: "sb_publishable_test",
    configured: true,
  }),
}));

vi.mock("@/lib/supabase/server", () => ({
  createClient: vi.fn(async () => ({
    auth: { getUser: mockGetUser },
    from: mockFrom,
    rpc: mockRpc,
  })),
}));

import { GET as getTransactions, POST as postTransaction } from "@/app/api/transactions/route";

function setupActiveStaff() {
  mockGetUser.mockResolvedValue({
    data: { user: { id: "staff-1" } },
    error: null,
  });
  mockFrom.mockImplementation((table: string) => {
    if (table === "staff_profiles") {
      return {
        select: () => ({
          eq: () => ({
            single: async () => ({
              data: {
                id: "staff-1",
                email: "staff@market.th",
                full_name: "Staff One",
                role: "staff",
                is_active: true,
              },
              error: null,
            }),
          }),
        }),
      };
    }
    return {
      select: () => ({
        order: () => ({
          order: () => ({
            limit: async () => ({
              data: [
                {
                  id: "tx-2",
                  saver_id: "550e8400-e29b-41d4-a716-446655440000",
                  type: "withdraw",
                  amount_satang: 20000,
                  balance_after_satang: 80000,
                  transaction_date: "2026-11-25T10:00:00Z",
                  note: "ถอน",
                  recorded_by: "staff-1",
                  created_at: "2026-11-25T10:00:00Z",
                  savers: { saver_code: "SV-0001", first_name: "สมชาย", last_name: "ใจดี" },
                  staff_profiles: { full_name: "Staff One" },
                },
                {
                  id: "tx-1",
                  saver_id: "550e8400-e29b-41d4-a716-446655440000",
                  type: "deposit",
                  amount_satang: 100000,
                  balance_after_satang: 100000,
                  transaction_date: "2026-11-25T09:00:00Z",
                  note: "ฝากแรก",
                  recorded_by: "staff-1",
                  created_at: "2026-11-25T09:00:00Z",
                  savers: { saver_code: "SV-0001", first_name: "สมชาย", last_name: "ใจดี" },
                  staff_profiles: { full_name: "Staff One" },
                },
              ],
              error: null,
            }),
          }),
        }),
      }),
    };
  });
}

describe("Transactions API", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("records a valid deposit via atomic record_transaction RPC", async () => {
    setupActiveStaff();
    mockRpc.mockResolvedValue({
      data: {
        id: "tx-new",
        saver_id: "550e8400-e29b-41d4-a716-446655440000",
        type: "deposit",
        amount_satang: 50000,
        balance_after_satang: 150000,
      },
      error: null,
    });

    const res = await postTransaction(
      new NextRequest("http://localhost/api/transactions", {
        method: "POST",
        body: JSON.stringify({
          saver_id: "550e8400-e29b-41d4-a716-446655440000",
          type: "deposit",
          amount_baht: "500.00",
          note: "ฝากประจำวัน",
        }),
      })
    );

    expect(res.status).toBe(201);
    expect(mockRpc).toHaveBeenCalledWith(
      "record_transaction",
      expect.objectContaining({
        p_saver_id: "550e8400-e29b-41d4-a716-446655440000",
        p_type: "deposit",
        p_amount_satang: 50000,
      })
    );
  });

  it("rejects over-withdrawal with 400 and Thai message showing remaining balance", async () => {
    setupActiveStaff();
    mockRpc.mockResolvedValue({
      data: null,
      error: { message: "INSUFFICIENT_BALANCE:25000" },
    });

    const res = await postTransaction(
      new NextRequest("http://localhost/api/transactions", {
        method: "POST",
        body: JSON.stringify({
          saver_id: "550e8400-e29b-41d4-a716-446655440000",
          type: "withdraw",
          amount_baht: "300",
        }),
      })
    );

    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error).toContain("ไม่สามารถถอนเกินยอดคงเหลือได้");
    expect(body.error).toContain("250.00");
  });

  it("rejects transactions for suspended savers with 400", async () => {
    setupActiveStaff();
    mockRpc.mockResolvedValue({
      data: null,
      error: { message: "SAVER_SUSPENDED: Cannot record transactions" },
    });

    const res = await postTransaction(
      new NextRequest("http://localhost/api/transactions", {
        method: "POST",
        body: JSON.stringify({
          saver_id: "550e8400-e29b-41d4-a716-446655440000",
          type: "deposit",
          amount_baht: "100",
        }),
      })
    );

    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error).toContain("ถูกระงับ");
  });

  it("returns newest-first transactions from GET /api/transactions", async () => {
    setupActiveStaff();
    const res = await getTransactions(
      new NextRequest("http://localhost/api/transactions")
    );
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.transactions).toHaveLength(2);
    expect(body.transactions[0].id).toBe("tx-2");
    expect(body.transactions[1].id).toBe("tx-1");
  });
});
