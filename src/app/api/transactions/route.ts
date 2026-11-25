import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { requireStaff } from "@/lib/auth";
import { createTransactionSchema } from "@/lib/validation";
import { formatSatangAsBaht } from "@/lib/money";

const uuidSchema = z.string().uuid();

export async function GET(request: NextRequest) {
  const auth = await requireStaff();
  if (!auth.ok) return auth.response;

  const { searchParams } = request.nextUrl;
  const saverId = searchParams.get("saver_id");
  const typeFilter = searchParams.get("type");
  const limitParam = Number(searchParams.get("limit") ?? "50");
  const limit = Number.isFinite(limitParam)
    ? Math.min(Math.max(Math.trunc(limitParam), 1), 100)
    : 50;

  if (saverId && !uuidSchema.safeParse(saverId).success) {
    return NextResponse.json(
      { error: "รหัสอ้างอิงผู้ฝากไม่ถูกต้อง" },
      { status: 400 }
    );
  }

  let query = auth.supabase
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
      savers:saver_id ( saver_code, first_name, last_name ),
      staff_profiles:recorded_by ( full_name )
    `
    )
    .order("transaction_date", { ascending: false })
    .order("created_at", { ascending: false })
    .limit(limit);

  if (saverId) {
    query = query.eq("saver_id", saverId);
  }
  if (typeFilter === "deposit" || typeFilter === "withdraw") {
    query = query.eq("type", typeFilter);
  }

  const { data, error } = await query;

  if (error) {
    return NextResponse.json(
      { error: "ไม่สามารถโหลดประวัติรายการได้" },
      { status: 500 }
    );
  }

  const transactions = (data ?? []).map((row) => {
    const saverRel = row.savers as
      | { saver_code?: string; first_name?: string; last_name?: string }
      | Array<{ saver_code?: string; first_name?: string; last_name?: string }>
      | null;
    const saverObj = Array.isArray(saverRel) ? saverRel[0] : saverRel;

    const staffRel = row.staff_profiles as
      | { full_name?: string }
      | Array<{ full_name?: string }>
      | null;
    const staffObj = Array.isArray(staffRel) ? staffRel[0] : staffRel;

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
      saver_code: saverObj?.saver_code ?? "-",
      saver_name: saverObj
        ? `${saverObj.first_name ?? ""} ${saverObj.last_name ?? ""}`.trim()
        : "ไม่ทราบชื่อ",
      recorder_name: staffObj?.full_name ?? "เจ้าหน้าที่",
    };
  });

  return NextResponse.json({ transactions });
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

  const parsed = createTransactionSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? "ข้อมูลรายการไม่ถูกต้อง" },
      { status: 400 }
    );
  }

  // Execute atomic PostgreSQL RPC (locks saver row, prevents over-withdrawal, logs audit)
  const { data: tx, error } = await auth.supabase.rpc("record_transaction", {
    p_saver_id: parsed.data.saver_id,
    p_type: parsed.data.type,
    p_amount_satang: parsed.data.amount_baht,
    p_transaction_date: parsed.data.transaction_date ?? new Date().toISOString(),
    p_note: parsed.data.note ?? null,
  });

  if (error) {
    const msg = error.message ?? "";
    if (msg.includes("INSUFFICIENT_BALANCE")) {
      const match = msg.match(/INSUFFICIENT_BALANCE:(\d+)/);
      const currentSatang = match ? Number(match[1]) : null;
      const balanceText =
        currentSatang !== null
          ? ` (ยอดคงเหลือปัจจุบัน ${formatSatangAsBaht(currentSatang)} บาท)`
          : "";
      return NextResponse.json(
        { error: `ไม่สามารถถอนเกินยอดคงเหลือได้${balanceText}` },
        { status: 400 }
      );
    }
    if (msg.includes("SAVER_SUSPENDED")) {
      return NextResponse.json(
        { error: "บัญชีผู้ฝากนี้ถูกระงับการใช้งาน ไม่สามารถทำรายการได้" },
        { status: 400 }
      );
    }
    if (msg.includes("SAVER_NOT_FOUND")) {
      return NextResponse.json(
        { error: "ไม่พบข้อมูลผู้ฝากเงิน" },
        { status: 404 }
      );
    }
    if (msg.includes("INVALID_AMOUNT")) {
      return NextResponse.json(
        { error: "จำนวนเงินต้องมากกว่า 0 บาท" },
        { status: 400 }
      );
    }
    if (msg.includes("UNAUTHORIZED")) {
      return NextResponse.json(
        { error: "ไม่มีสิทธิ์บันทึกรายการ" },
        { status: 403 }
      );
    }

    return NextResponse.json(
      { error: "ไม่สามารถบันทึกรายการได้ กรุณาลองใหม่" },
      { status: 500 }
    );
  }

  return NextResponse.json({ transaction: tx }, { status: 201 });
}
