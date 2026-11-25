import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";

const mockGetUser = vi.fn();
const mockFrom = vi.fn();

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
  })),
}));

import { requireStaff, requireAdmin } from "@/lib/auth";
import { POST as createSaverPost } from "@/app/api/savers/route";
import { PATCH as patchSaver } from "@/app/api/savers/[id]/route";

describe("Authentication and RBAC enforcement", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns 401 when no authenticated user is present", async () => {
    mockGetUser.mockResolvedValue({ data: { user: null }, error: null });
    const result = await requireStaff();
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.response.status).toBe(401);
    }
  });

  it("returns 403 when staff profile is inactive", async () => {
    mockGetUser.mockResolvedValue({
      data: { user: { id: "user-1" } },
      error: null,
    });
    mockFrom.mockReturnValue({
      select: () => ({
        eq: () => ({
          single: async () => ({
            data: {
              id: "user-1",
              email: "inactive@market.th",
              full_name: "Inactive Staff",
              role: "staff",
              is_active: false,
            },
            error: null,
          }),
        }),
      }),
    });

    const result = await requireStaff();
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.response.status).toBe(403);
    }
  });

  it("blocks non-admin staff from requireAdmin()", async () => {
    mockGetUser.mockResolvedValue({
      data: { user: { id: "staff-1" } },
      error: null,
    });
    mockFrom.mockReturnValue({
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
    });

    const result = await requireAdmin();
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.response.status).toBe(403);
    }
  });

  it("blocks staff from suspending a saver via PATCH /api/savers/[id] while allowing admin", async () => {
    const saverId = "550e8400-e29b-41d4-a716-446655440000";

    // First test: regular staff tries to suspend
    mockGetUser.mockResolvedValue({
      data: { user: { id: "staff-1" } },
      error: null,
    });
    mockFrom.mockReturnValue({
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
    });

    const staffRes = await patchSaver(
      new NextRequest(`http://localhost/api/savers/${saverId}`, {
        method: "PATCH",
        body: JSON.stringify({ status: "suspended" }),
      }),
      { params: Promise.resolve({ id: saverId }) }
    );
    expect(staffRes.status).toBe(403);

    // Second test: admin suspends saver
    mockGetUser.mockResolvedValue({
      data: { user: { id: "admin-1" } },
      error: null,
    });
    mockFrom.mockImplementation((table: string) => {
      if (table === "staff_profiles") {
        return {
          select: () => ({
            eq: () => ({
              single: async () => ({
                data: {
                  id: "admin-1",
                  email: "admin@market.th",
                  full_name: "Admin User",
                  role: "admin",
                  is_active: true,
                },
                error: null,
              }),
            }),
          }),
        };
      }
      if (table === "savers") {
        return {
          update: () => ({
            eq: () => ({
              select: () => ({
                single: async () => ({
                  data: { id: saverId, status: "suspended" },
                  error: null,
                }),
              }),
            }),
          }),
        };
      }
      if (table === "saver_balances") {
        return {
          select: () => ({
            eq: () => ({
              single: async () => ({
                data: { id: saverId, status: "suspended", balance_satang: 0 },
                error: null,
              }),
            }),
          }),
        };
      }
      return {
        insert: async () => ({ error: null }),
      };
    });

    const adminRes = await patchSaver(
      new NextRequest(`http://localhost/api/savers/${saverId}`, {
        method: "PATCH",
        body: JSON.stringify({ status: "suspended" }),
      }),
      { params: Promise.resolve({ id: saverId }) }
    );
    expect(adminRes.status).toBe(200);
  });

  it("ignores any client-supplied created_by and enforces authenticated staff.id", async () => {
    const insertSpy = vi.fn(() => ({
      select: () => ({
        single: async () => ({
          data: {
            id: "saver-123",
            saver_code: "SV-0001",
            first_name: "สมชาย",
            last_name: "ใจดี",
            phone: "0812345678",
            status: "active",
            created_by: "staff-real-id",
          },
          error: null,
        }),
      }),
    }));

    mockGetUser.mockResolvedValue({
      data: { user: { id: "staff-real-id" } },
      error: null,
    });
    mockFrom.mockImplementation((table: string) => {
      if (table === "staff_profiles") {
        return {
          select: () => ({
            eq: () => ({
              single: async () => ({
                data: {
                  id: "staff-real-id",
                  email: "staff@market.th",
                  full_name: "Real Staff",
                  role: "staff",
                  is_active: true,
                },
                error: null,
              }),
            }),
          }),
        };
      }
      if (table === "savers") {
        return {
          select: () => ({
            ilike: () => ({
              order: () => ({
                limit: async () => ({ data: [], error: null }),
              }),
            }),
          }),
          insert: insertSpy,
        };
      }
      return { insert: async () => ({ error: null }) };
    });

    const req = new NextRequest("http://localhost/api/savers", {
      method: "POST",
      body: JSON.stringify({
        saver_code: "SV-0001",
        first_name: "สมชาย",
        last_name: "ใจดี",
        phone: "0812345678",
        created_by: "spoofed-attacker-id",
      }),
    });

    const res = await createSaverPost(req);
    expect(res.status).toBe(201);
    expect(insertSpy).toHaveBeenCalledWith(
      expect.objectContaining({
        created_by: "staff-real-id",
      })
    );
  });
});
