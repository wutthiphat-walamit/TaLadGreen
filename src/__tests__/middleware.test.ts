// @vitest-environment node
import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";

const getUserMock = vi.hoisted(() => vi.fn());

vi.mock("@supabase/ssr", () => ({
  createServerClient: vi.fn(() => ({
    auth: { getUser: getUserMock },
  })),
}));

vi.mock("@/lib/supabase/env", () => ({
  getSupabaseEnv: () => ({
    url: "https://example.supabase.co",
    key: "sb_publishable_test",
    configured: true,
  }),
}));

import { updateSession } from "@/lib/supabase/middleware";

describe("updateSession", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("does not redirect an authenticated user away from /login", async () => {
    getUserMock.mockResolvedValue({
      data: { user: { id: "staff-1" } },
      error: null,
    });

    const response = await updateSession(
      new NextRequest("http://localhost/login")
    );

    // The old behaviour redirected to /dashboard here, which looped with the
    // protected layout for inactive staff. /login must remain reachable.
    expect(response.status).toBe(200);
    expect(response.headers.get("location")).toBeNull();
  });

  it("redirects unauthenticated users away from protected pages", async () => {
    getUserMock.mockResolvedValue({ data: { user: null }, error: null });

    const response = await updateSession(
      new NextRequest("http://localhost/dashboard")
    );

    expect(response.status).toBe(307);
    expect(response.headers.get("location")).toContain("/login");
  });

  it("allows unauthenticated users to open /login", async () => {
    getUserMock.mockResolvedValue({ data: { user: null }, error: null });

    const response = await updateSession(
      new NextRequest("http://localhost/login")
    );

    expect(response.status).toBe(200);
  });
});
