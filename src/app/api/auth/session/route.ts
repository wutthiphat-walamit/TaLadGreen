import { NextResponse } from "next/server";
import { getAuthState } from "@/lib/auth";

/**
 * Lightweight session check used by the login page.
 * This route intentionally does not require an active staff profile; it reports
 * why a session cannot access the application so the UI can show a Thai message.
 */
export async function GET() {
  const state = await getAuthState();
  const headers = { "Cache-Control": "no-store" };

  if (state.status === "active") {
    return NextResponse.json(
      {
        active: true,
        staff: {
          full_name: state.profile.full_name,
          role: state.profile.role,
          email: state.profile.email,
        },
      },
      { headers }
    );
  }

  return NextResponse.json(
    { active: false, reason: state.status },
    { headers }
  );
}
