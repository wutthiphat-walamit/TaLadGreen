"use client";

import * as React from "react";

/**
 * Return `value` after it has stopped changing for `delayMs`.
 * Useful for search boxes so every keystroke does not trigger a request.
 */
export function useDebouncedValue<T>(value: T, delayMs = 200): T {
  const [debouncedValue, setDebouncedValue] = React.useState(value);

  React.useEffect(() => {
    const timer = setTimeout(() => setDebouncedValue(value), delayMs);
    return () => clearTimeout(timer);
  }, [value, delayMs]);

  return debouncedValue;
}
