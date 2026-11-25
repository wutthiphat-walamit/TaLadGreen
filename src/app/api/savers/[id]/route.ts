import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { requireStaff } from "@/lib/auth";
import { updateSaverSchema } from "@/lib/validation";

const uuidSchema = z.string().uuid();

export async function GET(
  _request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  const auth = await requireStaff();
  if (!auth.ok) return auth.response;

  const { id } = await context.params;
  if (!uuidSchema.safeParse(id).success) {
    return NextResponse.json(
      { error: "รหัสอ้างอิงผู้ฝากไม่ถูกต้อง" },
      { status: 400 }
    );
  }

  const { data: saver, error: saverError } = await auth.supabase
    .from("saver_balances")
    .select("*")
    .eq("id", id)
    .single();

  if (saverError || !saver) {
    return NextResponse.json(
      { error: "ไม่พบข้อมูลผู้ฝากเงิน" },
      { status: 404 }
    );
  }

  const { data: txRows, error: txError } = await auth.supabase
    .from("transactions")
    .select(
      `
      id,
      saver_id,
      type,
      amount_satang,
      balance_after_satang,
      transaction_date,
      note,
      recorded_by,
      created_at,
      staff_profiles:recorded_by ( full_name )
    `
    )
    .eq("saver_id", id)
    .order("transaction_date", { ascending: false })
    .order("created_at", { ascending: false });

  if (txError) {
    return NextResponse.json(
      { error: "ไม่สามารถโหลดประวัติรายการได้" },
      { status: 500 }
    );
  }

  const transactions = (txRows ?? []).map((row) => {
    const profileRel = row.staff_profiles as
      | { full_name?: string }
      | Array<{ full_name?: string }>
      | null;
    const recorderName = Array.isArray(profileRel)
      ? profileRel[0]?.full_name ?? "เจ้าหน้าที่"
      : profileRel?.full_name ?? "เจ้าหน้าที่";

    return {
      id: row.id,
      saver_id: row.saver_id,
      type: row.type,
      amount_satang: row.amount_satang,
      balance_after_satang: row.balance_after_satang,
      transaction_date: row.transaction_date,
      note: row.note,
      recorded_by: row.recorded_by,
      created_at: row.created_at,
      saver_code: saver.saver_code,
      saver_name: `${saver.first_name} ${saver.last_name}`,
      recorder_name: recorderName,
    };
  });

  return NextResponse.json({
    saver,
    transactions,
    currentStaffRole: auth.staff.role,
  });
}

export async function PATCH(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  const auth = await requireStaff();
  if (!auth.ok) return auth.response;

  const { id } = await context.params;
  if (!uuidSchema.safeParse(id).success) {
    return NextResponse.json(
      { error: "รหัสอ้างอิงผู้ฝากไม่ถูกต้อง" },
      { status: 400 }
    );
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      { error: "รูปแบบข้อมูลคำขอไม่ถูกต้อง" },
      { status: 400 }
    );
  }

  const parsed = updateSaverSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? "ข้อมูลที่แก้ไขไม่ถูกต้อง" },
      { status: 400 }
    );
  }

  // Only Admin is allowed to suspend or reactivate a saver
  if (parsed.data.status !== undefined && auth.staff.role !== "admin") {
    return NextResponse.json(
      { error: "เฉพาะผู้ดูแลระบบ (Admin) เท่านั้นที่เปลี่ยนสถานะผู้ฝากได้" },
      { status: 403 }
    );
  }

  const { data: updated, error: updateError } = await auth.supabase
    .from("savers")
    .update(parsed.data)
    .eq("id", id)
    .select("*")
    .single();

  if (updateError || !updated) {
    return NextResponse.json(
      { error: "ไม่สามารถอัปเดตข้อมูลผู้ฝากได้" },
      { status: updateError?.code === "PGRST116" ? 404 : 500 }
    );
  }

  await auth.supabase.from("audit_logs").insert({
    actor_id: auth.staff.id,
    action:
      parsed.data.status !== undefined
        ? "saver.status_change"
        : "saver.update",
    entity_type: "saver",
    entity_id: id,
    metadata: parsed.data,
  });

  const { data: balanceRow } = await auth.supabase
    .from("saver_balances")
    .select("*")
    .eq("id", id)
    .single();

  return NextResponse.json({ saver: balanceRow ?? updated });
}
