import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getSupabaseEnv } from "@/lib/supabase/env";

export async function POST() {
  if (!getSupabaseEnv().configured) {
    return NextResponse.json({ ok: true });
  }

  const supabase = await createClient();
  const { error } = await supabase.auth.signOut();

  if (error) {
    return NextResponse.json(
      { error: "ไม่สามารถออกจากระบบได้" },
      { status: 500 }
    );
  }

  return NextResponse.json({ ok: true });
}
