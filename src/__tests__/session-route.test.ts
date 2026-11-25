import { beforeEach, describe, expect, it, vi } from "vitest";

const getAuthStateMock = vi.hoisted(() => vi.fn());

vi.mock("@/lib/auth", () => ({
  getAuthState: getAuthStateMock,
}));

import { GET } from "@/app/api/auth/session/route";

const profile = {
  id: "staff-1",
  email: "staff@market.th",
  full_name: "Staff One",
  role: "staff",
  is_active: true,
  created_at: "2026-11-25T08:00:00Z",
  updated_at: "2026-11-25T08:00:00Z",
};

describe("GET /api/auth/session", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("reports an active staff session", async () => {
    getAuthStateMock.mockResolvedValue({ status: "active", profile });

    const response = await GET();
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(response.headers.get("Cache-Control")).toBe("no-store");
    expect(body).toMatchObject({
      active: true,
      staff: { full_name: "Staff One", role: "staff" },
    });
  });

  it("reports the reason when the session cannot access the app", async () => {
    getAuthStateMock.mockResolvedValue({ status: "inactive", profile });

    const response = await GET();
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body).toEqual({ active: false, reason: "inactive" });
  });

  it("does not expose the staff profile for unauthenticated users", async () => {
    getAuthStateMock.mockResolvedValue({ status: "unauthenticated" });

    const response = await GET();
    const body = await response.json();

    expect(body).toEqual({ active: false, reason: "unauthenticated" });
    expect(body).not.toHaveProperty("staff");
  });
});
