import { NextRequest, NextResponse } from "next/server";
import { requireStaff } from "@/lib/auth";
import { createSaverSchema } from "@/lib/validation";

/**
 * Sanitize search input before placing inside PostgREST filter strings.
 */
function sanitizeSearchPattern(input: string): string {
  return input.replace(/[%_,()*\\]/g, " ").trim().slice(0, 60);
}

/**
 * Generate a readable saver code such as SV-0001 using existing max code.
 */
async function generateNextSaverCode(
  supabase: Awaited<ReturnType<typeof import("@/lib/supabase/server").createClient>>
): Promise<string> {
  const { data } = await supabase
    .from("savers")
    .select("saver_code")
    .ilike("saver_code", "SV-%")
    .order("saver_code", { ascending: false })
    .limit(1);

  const latestCode = data?.[0]?.saver_code;
  const match = latestCode?.match(/^SV-(\d+)$/i);
  const nextNumber = match ? Number(match[1]) + 1 : 1;
  return `SV-${String(nextNumber).padStart(4, "0")}`;
}

export async function GET(request: NextRequest) {
  const auth = await requireStaff();
  if (!auth.ok) return auth.response;

  const { searchParams } = request.nextUrl;
  const rawQuery = sanitizeSearchPattern(searchParams.get("q") ?? "");
  const statusFilter = searchParams.get("status");

  let query = auth.supabase
    .from("saver_balances")
    .select("*")
    .order("created_at", { ascending: false });

  if (statusFilter === "active" || statusFilter === "suspended") {
    query = query.eq("status", statusFilter);
  }

  if (rawQuery.length > 0) {
    const pattern = `%${rawQuery}%`;
    query = query.or(
      `first_name.ilike.${pattern},last_name.ilike.${pattern},saver_code.ilike.${pattern},phone.ilike.${pattern}`
    );
  }

  const { data, error } = await query;

  if (error) {
    return NextResponse.json(
      { error: "ไม่สามารถโหลดรายชื่อผู้ฝากเงินได้" },
      { status: 500 }
    );
  }

  return NextResponse.json({ savers: data ?? [] });
}

export async function POST(request: NextRequest) {
  const auth = await requireStaff();
  if (!auth.ok) return auth.response;

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      { error: "รูปแบบข้อมูลคำขอไม่ถูกต้อง" },
      { status: 400 }
    );
  }

  const parsed = createSaverSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? "ข้อมูลผู้ฝากไม่ถูกต้อง" },
      { status: 400 }
    );
  }

  const saverCode =
    parsed.data.saver_code ?? (await generateNextSaverCode(auth.supabase));

  const { data: inserted, error } = await auth.supabase
    .from("savers")
    .insert({
      saver_code: saverCode,
      first_name: parsed.data.first_name,
      last_name: parsed.data.last_name,
      phone: parsed.data.phone,
      national_id: parsed.data.national_id ?? null,
      notes: parsed.data.notes ?? null,
      status: "active",
      created_by: auth.staff.id,
    })
    .select("*")
    .single();

  if (error) {
    if (error.code === "23505") {
      return NextResponse.json(
        { error: `รหัสผู้ฝาก ${saverCode} มีอยู่ในระบบแล้ว` },
        { status: 409 }
      );
    }
    return NextResponse.json(
      { error: "ไม่สามารถบันทึกข้อมูลผู้ฝากได้" },
      { status: 500 }
    );
  }

  // Record audit trail for saver creation
  await auth.supabase.from("audit_logs").insert({
    actor_id: auth.staff.id,
    action: "saver.create",
    entity_type: "saver",
    entity_id: inserted.id,
    metadata: {
      saver_code: inserted.saver_code,
      full_name: `${inserted.first_name} ${inserted.last_name}`,
    },
  });

  return NextResponse.json(
    {
      saver: {
        ...inserted,
        total_deposit_satang: 0,
        total_withdraw_satang: 0,
        balance_satang: 0,
        transaction_count: 0,
        last_transaction_at: null,
      },
    },
    { status: 201 }
  );
}
