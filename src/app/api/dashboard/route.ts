import { NextResponse } from "next/server";
import { requireStaff } from "@/lib/auth";

/**
 * Compute the UTC ISO timestamp for 00:00:00 of the current day in Asia/Bangkok (UTC+7).
 */
function getBangkokStartOfTodayIso(): string {
  const now = new Date();
  const bangkokNow = new Date(now.getTime() + 7 * 60 * 60 * 1000);
  const year = bangkokNow.getUTCFullYear();
  const month = String(bangkokNow.getUTCMonth() + 1).padStart(2, "0");
  const day = String(bangkokNow.getUTCDate()).padStart(2, "0");
  return new Date(`${year}-${month}-${day}T00:00:00+07:00`).toISOString();
}

export async function GET() {
  const auth = await requireStaff();
  if (!auth.ok) return auth.response;

  const startOfTodayIso = getBangkokStartOfTodayIso();

  const [saversResult, todayTxResult, recentTxResult] = await Promise.all([
    auth.supabase
      .from("saver_balances")
      .select("id, status, balance_satang"),
    auth.supabase
      .from("transactions")
      .select("type, amount_satang")
      .gte("transaction_date", startOfTodayIso),
    auth.supabase
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
      .limit(10),
  ]);

  if (saversResult.error || todayTxResult.error || recentTxResult.error) {
    return NextResponse.json(
      { error: "ไม่สามารถโหลดข้อมูลสรุปแดชบอร์ดได้" },
      { status: 500 }
    );
  }

  const saverRows = saversResult.data ?? [];
  const totalSavingsSatang = saverRows.reduce(
    (sum, row) => sum + Number(row.balance_satang ?? 0),
    0
  );
  const activeSaversCount = saverRows.filter(
    (row) => row.status === "active"
  ).length;
  const totalSaversCount = saverRows.length;

  const todayRows = todayTxResult.data ?? [];
  let todayDepositSatang = 0;
  let todayWithdrawSatang = 0;
  for (const row of todayRows) {
    if (row.type === "deposit") {
      todayDepositSatang += Number(row.amount_satang ?? 0);
    } else if (row.type === "withdraw") {
      todayWithdrawSatang += Number(row.amount_satang ?? 0);
    }
  }

  const recentTransactions = (recentTxResult.data ?? []).map((row) => {
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

  return NextResponse.json({
    totalSavingsSatang,
    activeSaversCount,
    totalSaversCount,
    todayDepositSatang,
    todayWithdrawSatang,
    todayTransactionCount: todayRows.length,
    recentTransactions,
  });
}
