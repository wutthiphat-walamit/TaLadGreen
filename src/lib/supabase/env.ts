export interface SupabaseEnv {
  url: string;
  key: string;
  configured: boolean;
}

/**
 * Read public Supabase environment variables.
 * Never throws during Next.js static analysis/build; callers verify `configured`.
 */
export function getSupabaseEnv(): SupabaseEnv {
  const url = (process.env.NEXT_PUBLIC_SUPABASE_URL ?? "").trim();
  const key = (
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ??
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ??
    ""
  ).trim();

  const configured = Boolean(
    url &&
      key &&
      !url.includes("your-project-ref") &&
      !key.includes("your_key_here")
  );

  return { url, key, configured };
}
