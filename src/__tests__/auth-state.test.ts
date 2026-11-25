import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  configured: true,
  getUser: vi.fn(),
  from: vi.fn(),
}));

vi.mock("@/lib/supabase/env", () => ({
  getSupabaseEnv: () => ({
    url: "https://example.supabase.co",
    key: "sb_publishable_test",
    configured: mocks.configured,
  }),
}));

vi.mock("@/lib/supabase/server", () => ({
  createClient: vi.fn(async () => ({
    auth: { getUser: mocks.getUser },
    from: mocks.from,
  })),
}));

import { getAuthState } from "@/lib/auth";

const activeProfile = {
  id: "staff-1",
  email: "staff@market.th",
  full_name: "Staff One",
  role: "staff",
  is_active: true,
  created_at: "2026-11-25T08:00:00Z",
  updated_at: "2026-11-25T08:00:00Z",
};

function mockProfileQuery(data: unknown, error: unknown = null) {
  mocks.from.mockReturnValue({
    select: () => ({
      eq: () => ({
        single: async () => ({ data, error }),
      }),
    }),
  });
}

describe("getAuthState", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.configured = true;
    mocks.getUser.mockResolvedValue({
      data: { user: { id: "staff-1" } },
      error: null,
    });
  });

  it("returns active state for an active staff profile", async () => {
    mockProfileQuery(activeProfile);

    const state = await getAuthState();

    expect(state.status).toBe("active");
    if (state.status === "active") {
      expect(state.profile.email).toBe("staff@market.th");
    }
  });

  it("returns inactive state without treating the user as unauthenticated", async () => {
    mockProfileQuery({ ...activeProfile, is_active: false });

    const state = await getAuthState();

    expect(state.status).toBe("inactive");
    if (state.status === "inactive") {
      expect(state.profile.id).toBe("staff-1");
    }
  });

  it("returns no_profile for a signed-in user without a staff row", async () => {
    mockProfileQuery(null, { code: "PGRST116" });

    const state = await getAuthState();

    expect(state.status).toBe("no_profile");
  });

  it("returns error when the profile query fails", async () => {
    mockProfileQuery(null, { code: "XX000" });

    const state = await getAuthState();

    expect(state.status).toBe("error");
  });

  it("returns unauthenticated when there is no session", async () => {
    mocks.getUser.mockResolvedValue({ data: { user: null }, error: null });

    const state = await getAuthState();

    expect(state.status).toBe("unauthenticated");
  });

  it("returns unconfigured when Supabase env is missing", async () => {
    mocks.configured = false;

    const state = await getAuthState();

    expect(state.status).toBe("unconfigured");
  });
});
