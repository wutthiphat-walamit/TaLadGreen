import { createBrowserClient } from "@supabase/ssr";
import { getSupabaseEnv } from "@/lib/supabase/env";

/**
 * Create a Supabase client for Client Components using only public publishable key.
 */
export function createClient() {
  const { url, key, configured } = getSupabaseEnv();
  if (!configured) {
    throw new Error(
      "ยังไม่ได้ตั้งค่า NEXT_PUBLIC_SUPABASE_URL และ NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ใน .env.local"
    );
  }
  return createBrowserClient(url, key);
}
