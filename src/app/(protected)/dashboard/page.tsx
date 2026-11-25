"use client";

import * as React from "react";
import Link from "next/link";
import {
  Wallet,
  Users,
  ArrowDownLeft,
  ArrowUpRight,
  Search,
  RefreshCw,
  AlertCircle,
  Clock,
} from "lucide-react";
import { formatSatangAsBaht } from "@/lib/money";
import { formatThaiDateTime, cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { TransactionModal } from "@/components/transactions/TransactionModal";
import type { DashboardSummary, TransactionType } from "@/types/database";

export default function DashboardPage() {
  const [summary, setSummary] = React.useState<DashboardSummary | null>(null);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);
  const [txModalOpen, setTxModalOpen] = React.useState(false);
  const [txInitialType, setTxInitialType] =
    React.useState<TransactionType>("deposit");

  const loadDashboard = React.useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/dashboard", { cache: "no-store" });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error ?? "ไม่สามารถโหลดข้อมูลแดชบอร์ดได้");
      }
      setSummary(data);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "เกิดข้อผิดพลาดในการโหลดข้อมูล"
      );
    } finally {
      setLoading(false);
    }
  }, []);

  React.useEffect(() => {
    loadDashboard();
  }, [loadDashboard]);

  const openTransaction = (type: TransactionType) => {
    setTxInitialType(type);
    setTxModalOpen(true);
  };

  return (
    <div className="space-y-6">
      {/* Header & Quick Actions */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-[#1E2937]">ภาพรวมการออมตลาด</h1>
          <p className="text-sm text-[#64748B]">
            สรุปยอดเงินออมรวม จำนวนผู้ฝาก และความเคลื่อนไหวล่าสุด
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          <Button
            variant="success"
            size="lg"
            onClick={() => openTransaction("deposit")}
          >
            <ArrowDownLeft className="h-5 w-5" />
            ฝากเงิน
          </Button>
          <Button
            variant="danger"
            size="lg"
            onClick={() => openTransaction("withdraw")}
          >
            <ArrowUpRight className="h-5 w-5" />
            ถอนเงิน
          </Button>
          <Link href="/savers">
            <Button variant="outline" size="lg">
              <Search className="h-4 w-4" />
              ค้นหาผู้ฝาก
            </Button>
          </Link>
        </div>
      </div>

      {error && (
        <div
          role="alert"
          className="flex items-center justify-between gap-3 rounded-2xl border border-[#FECACA] bg-[#FEF2F2] p-4 text-sm text-[#DC2626]"
        >
          <div className="flex items-center gap-2.5">
            <AlertCircle className="h-5 w-5 shrink-0" />
            <span>{error}</span>
          </div>
          <Button variant="outline" size="sm" onClick={loadDashboard}>
            <RefreshCw className="h-4 w-4" />
            ลองใหม่
          </Button>
        </div>
      )}

      {/* Summary Cards */}
      {loading ? (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
          <Skeleton className="h-36" />
          <Skeleton className="h-36" />
          <Skeleton className="h-36" />
        </div>
      ) : summary ? (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
          <Card className="border-[#99F6E4] bg-gradient-to-br from-[#0F766E] to-[#115E59] text-white">
            <CardHeader className="pb-2">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium text-teal-100">
                  ยอดเงินออมรวมทั้งหมด
                </span>
                <div className="rounded-xl bg-white/15 p-2">
                  <Wallet className="h-5 w-5 text-white" />
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <p className="text-3xl sm:text-4xl font-bold tracking-tight tabular-nums">
                ฿{formatSatangAsBaht(summary.totalSavingsSatang)}
              </p>
              <p className="mt-1.5 text-xs text-teal-100">
                คำนวณจากยอดฝากสะสมหักยอดถอนสะสมจริง
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <div className="flex items-center justify-between">
                <span className="text-sm font-semibold text-[#64748B]">
                  จำนวนผู้ฝากเงิน
                </span>
                <div className="rounded-xl bg-[#F0FDFA] p-2 text-[#0F766E]">
                  <Users className="h-5 w-5" />
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <p className="text-3xl sm:text-4xl font-bold text-[#1E2937] tabular-nums">
                {summary.activeSaversCount.toLocaleString("th-TH")}{" "}
                <span className="text-base font-medium text-[#64748B]">
                  คนใช้งาน
                </span>
              </p>
              <p className="mt-1.5 text-xs text-[#64748B]">
                ผู้ฝากทั้งหมดในระบบ {summary.totalSaversCount.toLocaleString("th-TH")} คน
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <div className="flex items-center justify-between">
                <span className="text-sm font-semibold text-[#64748B]">
                  รายการวันนี้
                </span>
                <div className="rounded-xl bg-[#F1F5F9] p-2 text-[#475569]">
                  <Clock className="h-5 w-5" />
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <p className="text-3xl sm:text-4xl font-bold text-[#1E2937] tabular-nums">
                {summary.todayTransactionCount.toLocaleString("th-TH")}{" "}
                <span className="text-base font-medium text-[#64748B]">
                  รายการ
                </span>
              </p>
              <div className="mt-1.5 flex flex-wrap gap-3 text-xs tabular-nums">
                <span className="font-semibold text-[#16A34A]">
                  ฝาก +฿{formatSatangAsBaht(summary.todayDepositSatang)}
                </span>
                <span className="font-semibold text-[#DC2626]">
                  ถอน -฿{formatSatangAsBaht(summary.todayWithdrawSatang)}
                </span>
              </div>
            </CardContent>
          </Card>
        </div>
      ) : null}

      {/* Recent Transactions */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle>รายการล่าสุด</CardTitle>
            <p className="text-sm text-[#64748B]">
              แสดง 10 รายการล่าสุดเรียงตามเวลาใหม่สุดไปเก่าสุด
            </p>
          </div>
          <Link href="/transactions">
            <Button variant="outline" size="sm">
              ดูทั้งหมด
            </Button>
          </Link>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="space-y-3">
              <Skeleton className="h-12" />
              <Skeleton className="h-12" />
              <Skeleton className="h-12" />
            </div>
          ) : !summary || summary.recentTransactions.length === 0 ? (
            <div className="rounded-xl border border-dashed border-[#E2E8F0] bg-[#F8FAFC] py-12 text-center">
              <p className="text-sm font-semibold text-[#1E2937]">
                ยังไม่มีรายการฝาก-ถอนในระบบ
              </p>
              <p className="mt-1 text-xs text-[#64748B]">
                เริ่มต้นด้วยการเพิ่มผู้ฝากเงินหรือกดปุ่มฝากเงินด้านบน
              </p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>วัน-เวลา</TableHead>
                  <TableHead>ผู้ฝาก</TableHead>
                  <TableHead>ประเภท</TableHead>
                  <TableHead className="text-right">จำนวนเงิน</TableHead>
                  <TableHead className="text-right">ยอดคงเหลือ</TableHead>
                  <TableHead>ผู้บันทึก</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {summary.recentTransactions.map((tx) => (
                  <TableRow key={tx.id}>
                    <TableCell className="whitespace-nowrap text-xs text-[#64748B]">
                      {formatThaiDateTime(tx.transaction_date)}
                    </TableCell>
                    <TableCell>
                      <Link
                        href={`/savers/${tx.saver_id}`}
                        className="font-semibold text-[#0F766E] hover:underline"
                      >
                        {tx.saver_name}
                      </Link>
                      <p className="text-xs text-[#64748B]">{tx.saver_code}</p>
                    </TableCell>
                    <TableCell>
                      <Badge
                        variant={tx.type === "deposit" ? "success" : "danger"}
                      >
                        {tx.type === "deposit" ? "ฝากเงิน" : "ถอนเงิน"}
                      </Badge>
                    </TableCell>
                    <TableCell
                      className={cn(
                        "text-right font-bold tabular-nums whitespace-nowrap",
                        tx.type === "deposit"
                          ? "text-[#16A34A]"
                          : "text-[#DC2626]"
                      )}
                    >
                      {tx.type === "deposit" ? "+" : "-"}฿
                      {formatSatangAsBaht(tx.amount_satang)}
                    </TableCell>
                    <TableCell className="text-right font-semibold tabular-nums whitespace-nowrap">
                      ฿{formatSatangAsBaht(tx.balance_after_satang)}
                    </TableCell>
                    <TableCell className="text-xs text-[#64748B]">
                      {tx.recorder_name}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <TransactionModal
        open={txModalOpen}
        onOpenChange={setTxModalOpen}
        initialType={txInitialType}
        onSuccess={loadDashboard}
      />
    </div>
  );
}
