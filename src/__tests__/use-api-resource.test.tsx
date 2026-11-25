import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, renderHook, waitFor } from "@testing-library/react";
import { useApiResource } from "@/hooks/use-api-resource";

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});

describe("useApiResource", () => {
  it("loads data and clears the loading state", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(
        new Response(JSON.stringify({ value: "ok" }), { status: 200 })
      )
    );

    const { result } = renderHook(() =>
      useApiResource<{ value: string }>("/api/test")
    );

    await waitFor(() => expect(result.current.loading).toBe(false));

    expect(result.current.data).toEqual({ value: "ok" });
    expect(result.current.error).toBeNull();
  });

  it("surfaces the API error message", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(
        new Response(JSON.stringify({ error: "โหลดข้อมูลไม่สำเร็จ" }), {
          status: 500,
        })
      )
    );

    const { result } = renderHook(() => useApiResource("/api/test"));

    await waitFor(() => expect(result.current.error).toBe("โหลดข้อมูลไม่สำเร็จ"));
    expect(result.current.loading).toBe(false);
  });
});
