"use client";

import * as React from "react";
import { apiFetch, isAbortError } from "@/lib/api-client";

export interface ApiResource<T> {
  data: T | null;
  loading: boolean;
  error: string | null;
  refetch: () => void;
}

/**
 * Load a JSON API endpoint with loading/error state, cancellation on URL change,
 * and a stable `refetch` function.
 */
export function useApiResource<T>(url: string | null): ApiResource<T> {
  const [data, setData] = React.useState<T | null>(null);
  const [loading, setLoading] = React.useState(Boolean(url));
  const [error, setError] = React.useState<string | null>(null);
  const [refreshKey, setRefreshKey] = React.useState(0);

  const refetch = React.useCallback(() => {
    setRefreshKey((current) => current + 1);
  }, []);

  React.useEffect(() => {
    if (!url) {
      setLoading(false);
      setError(null);
      return;
    }

    const controller = new AbortController();
    let active = true;

    setLoading(true);
    setError(null);

    apiFetch<T>(url, { signal: controller.signal })
      .then((payload) => {
        if (active) {
          setData(payload);
        }
      })
      .catch((fetchError: unknown) => {
        if (!active || isAbortError(fetchError)) return;
        setError(
          fetchError instanceof Error
            ? fetchError.message
            : "เกิดข้อผิดพลาดในการโหลดข้อมูล"
        );
      })
      .finally(() => {
        if (active) {
          setLoading(false);
        }
      });

    return () => {
      active = false;
      controller.abort();
    };
  }, [url, refreshKey]);

  return { data, loading, error, refetch };
}
