import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getSupabaseEnv } from "@/lib/supabase/env";
import type { StaffProfile } from "@/types/database";

export type AuthResult =
  | { ok: true; staff: StaffProfile; supabase: Awaited<ReturnType<typeof createClient>> }
  | { ok: false; response: NextResponse };

/**
 * Retrieve the currently authenticated and active staff profile for Server Components.
 * Returns null if unauthenticated, inactive, or Supabase is not configured.
 */
export async function getCurrentStaff(): Promise<StaffProfile | null> {
  if (!getSupabaseEnv().configured) {
    return null;
  }

  const supabase = await createClient();
  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();

  if (userError || !user) {
    return null;
  }

  const { data: profile, error: profileError } = await supabase
    .from("staff_profiles")
    .select("id, email, full_name, role, is_active, created_at, updated_at")
    .eq("id", user.id)
    .single();

  if (profileError || !profile || !profile.is_active) {
    return null;
  }

  return profile as StaffProfile;
}

/**
 * Enforce an authenticated, active staff session in Route Handlers.
 */
export async function requireStaff(): Promise<AuthResult> {
  if (!getSupabaseEnv().configured) {
    return {
      ok: false,
      response: NextResponse.json(
        { error: "ระบบยังไม่ได้ตั้งค่าการเชื่อมต่อฐานข้อมูล Supabase" },
        { status: 503 }
      ),
    };
  }

  const supabase = await createClient();
  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();

  if (userError || !user) {
    return {
      ok: false,
      response: NextResponse.json(
        { error: "กรุณาเข้าสู่ระบบก่อนทำรายการ" },
        { status: 401 }
      ),
    };
  }

  const { data: profile, error: profileError } = await supabase
    .from("staff_profiles")
    .select("id, email, full_name, role, is_active, created_at, updated_at")
    .eq("id", user.id)
    .single();

  if (profileError || !profile) {
    return {
      ok: false,
      response: NextResponse.json(
        { error: "ไม่พบข้อมูลบัญชีเจ้าหน้าที่ในระบบ" },
        { status: 403 }
      ),
    };
  }

  if (!profile.is_active) {
    return {
      ok: false,
      response: NextResponse.json(
        { error: "บัญชีเจ้าหน้าที่นี้ถูกระงับการใช้งาน" },
        { status: 403 }
      ),
    };
  }

  return {
    ok: true,
    staff: profile as StaffProfile,
    supabase,
  };
}

/**
 * Enforce an authenticated, active Admin session in Route Handlers.
 */
export async function requireAdmin(): Promise<AuthResult> {
  const result = await requireStaff();
  if (!result.ok) {
    return result;
  }

  if (result.staff.role !== "admin") {
    return {
      ok: false,
      response: NextResponse.json(
        { error: "เฉพาะผู้ดูแลระบบ (Admin) เท่านั้นที่ทำรายการนี้ได้" },
        { status: 403 }
      ),
    };
  }

  return result;
}
