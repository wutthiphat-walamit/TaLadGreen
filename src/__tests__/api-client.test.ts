import { afterEach, describe, expect, it, vi } from "vitest";
import { apiFetch, ApiError } from "@/lib/api-client";

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("apiFetch", () => {
  it("returns parsed JSON on success", async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      new Response(JSON.stringify({ value: 1 }), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      })
    );
    vi.stubGlobal("fetch", fetchMock);

    await expect(apiFetch<{ value: number }>("/api/test")).resolves.toEqual({
      value: 1,
    });
    expect(fetchMock).toHaveBeenCalledWith(
      "/api/test",
      expect.objectContaining({ cache: "no-store" })
    );
  });

  it("throws ApiError with the server's Thai error message", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(
        new Response(JSON.stringify({ error: "ไม่สามารถบันทึกได้" }), {
          status: 400,
        })
      )
    );

    await expect(apiFetch("/api/test")).rejects.toMatchObject({
      name: "ApiError",
      status: 400,
      message: "ไม่สามารถบันทึกได้",
    });
  });

  it("wraps network failures in a Thai ApiError", async () => {
    vi.stubGlobal("fetch", vi.fn().mockRejectedValue(new Error("offline")));

    const error = await apiFetch("/api/test").catch(
      (caught: unknown) => caught
    );

    expect(error).toBeInstanceOf(ApiError);
    expect((error as Error).message).toContain("เชื่อมต่อ");
  });

  it("falls back to a generic message for non-JSON error responses", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(new Response("Internal Server Error", { status: 500 }))
    );

    await expect(apiFetch("/api/test")).rejects.toMatchObject({
      status: 500,
      message: "ระบบขัดข้อง กรุณาลองใหม่",
    });
  });
});
