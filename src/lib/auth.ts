import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getSupabaseEnv } from "@/lib/supabase/env";
import type { StaffProfile } from "@/types/database";

export type AuthResult =
  | { ok: true; staff: StaffProfile; supabase: Awaited<ReturnType<typeof createClient>> }
  | { ok: false; response: NextResponse };

/**
 * Detailed authentication state for server layouts and the session endpoint.
 * Distinguishing these states prevents redirect loops for users who are signed in
 * but do not have an active staff profile.
 */
export type AuthState =
  | { status: "unconfigured" }
  | { status: "unauthenticated" }
  | { status: "no_profile" }
  | { status: "inactive"; profile: StaffProfile }
  | { status: "error" }
  | { status: "active"; profile: StaffProfile };

const PROFILE_COLUMNS =
  "id, email, full_name, role, is_active, created_at, updated_at";

interface ProfileLoadResult {
  profile: StaffProfile | null;
  missing: boolean;
  error: boolean;
}

type ServerSupabaseClient = Awaited<ReturnType<typeof createClient>>;

async function loadStaffProfile(
  supabase: ServerSupabaseClient,
  userId: string
): Promise<ProfileLoadResult> {
  const { data, error } = await supabase
    .from("staff_profiles")
    .select(PROFILE_COLUMNS)
    .eq("id", userId)
    .single();

  if (error) {
    // PostgREST returns PGRST116 when .single() matches no row.
    if (error.code === "PGRST116") {
      return { profile: null, missing: true, error: false };
    }
    return { profile: null, missing: false, error: true };
  }

  if (!data) {
    return { profile: null, missing: true, error: false };
  }

  return { profile: data as StaffProfile, missing: false, error: false };
}

/**
 * Resolve the complete authentication state without throwing.
 * Used by the protected layout and the login page's session check.
 */
export async function getAuthState(): Promise<AuthState> {
  if (!getSupabaseEnv().configured) {
    return { status: "unconfigured" };
  }

  try {
    const supabase = await createClient();
    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();

    if (userError || !user) {
      return { status: "unauthenticated" };
    }

    const result = await loadStaffProfile(supabase, user.id);
    if (result.error) {
      return { status: "error" };
    }
    if (!result.profile) {
      return { status: "no_profile" };
    }
    if (!result.profile.is_active) {
      return { status: "inactive", profile: result.profile };
    }

    return { status: "active", profile: result.profile };
  } catch {
    return { status: "error" };
  }
}

/**
 * Retrieve the currently authenticated and active staff profile for Server Components.
 * Returns null for unauthenticated, inactive, missing, or errored states.
 */
export async function getCurrentStaff(): Promise<StaffProfile | null> {
  const state = await getAuthState();
  return state.status === "active" ? state.profile : null;
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

  const result = await loadStaffProfile(supabase, user.id);

  if (result.error || result.missing || !result.profile) {
    return {
      ok: false,
      response: NextResponse.json(
        { error: "ไม่พบข้อมูลบัญชีเจ้าหน้าที่ในระบบ" },
        { status: 403 }
      ),
    };
  }

  if (!result.profile.is_active) {
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
    staff: result.profile,
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
