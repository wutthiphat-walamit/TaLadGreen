/**
 * Small shared fetch wrapper for client-side API calls.
 * Keeps error parsing, timeouts, and expired-session handling in one place.
 */

export class ApiError extends Error {
  readonly status: number;

  constructor(message: string, status: number) {
    super(message);
    this.name = "ApiError";
    this.status = status;
  }
}

export function isAbortError(error: unknown): boolean {
  return (
    typeof error === "object" &&
    error !== null &&
    "name" in error &&
    (error as { name?: string }).name === "AbortError"
  );
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function fallbackMessage(status: number): string {
  if (status >= 500) {
    return "ระบบขัดข้อง กรุณาลองใหม่";
  }
  if (status === 403) {
    return "ไม่มีสิทธิ์ทำรายการนี้";
  }
  if (status === 404) {
    return "ไม่พบข้อมูลที่ต้องการ";
  }
  return "ไม่สามารถดำเนินการได้ กรุณาลองใหม่";
}

export function redirectToLogin(reason = "session"): void {
  if (typeof window === "undefined") return;

  const url = new URL("/login", window.location.origin);
  url.searchParams.set("reason", reason);

  try {
    window.location.assign(url.toString());
  } catch {
    // jsdom and some embedded webviews do not implement navigation.
    window.location.href = url.toString();
  }
}

export interface ApiFetchOptions extends RequestInit {
  timeoutMs?: number;
}

/**
 * Fetch JSON from an API route and throw an `ApiError` with a Thai message on failure.
 * Pass `signal` to cancel the request; calls are aborted after `timeoutMs` by default.
 */
export async function apiFetch<T>(
  input: string,
  init?: ApiFetchOptions
): Promise<T> {
  const { timeoutMs = 15_000, headers, signal: externalSignal, ...rest } = init ?? {};

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

  const abortFromExternal = () => controller.abort();
  if (externalSignal) {
    if (externalSignal.aborted) {
      controller.abort();
    } else {
      externalSignal.addEventListener("abort", abortFromExternal, { once: true });
    }
  }

  const requestHeaders = new Headers(headers);
  if (!requestHeaders.has("Accept")) {
    requestHeaders.set("Accept", "application/json");
  }
  if (rest.body !== undefined && !requestHeaders.has("Content-Type")) {
    requestHeaders.set("Content-Type", "application/json");
  }

  try {
    const response = await fetch(input, {
      ...rest,
      cache: rest.cache ?? "no-store",
      headers: requestHeaders,
      signal: controller.signal,
    });

    const text = await response.text();
    let payload: unknown = null;
    if (text.length > 0) {
      try {
        payload = JSON.parse(text);
      } catch {
        payload = null;
      }
    }

    if (!response.ok) {
      const message =
        isRecord(payload) && typeof payload.error === "string" && payload.error
          ? payload.error
          : fallbackMessage(response.status);

      if (response.status === 401) {
        redirectToLogin("session");
      }

      throw new ApiError(message, response.status);
    }

    return payload as T;
  } catch (error) {
    if (error instanceof ApiError) {
      throw error;
    }

    if (isAbortError(error)) {
      if (externalSignal?.aborted) {
        throw error;
      }
      throw new ApiError("การเชื่อมต่อใช้เวลานานเกินไป กรุณาลองใหม่", 0);
    }

    throw new ApiError(
      "ไม่สามารถเชื่อมต่อระบบได้ กรุณาตรวจสอบการเชื่อมต่ออินเทอร์เน็ต",
      0
    );
  } finally {
    clearTimeout(timeoutId);
    externalSignal?.removeEventListener("abort", abortFromExternal);
  }
}
