"use client";

import * as React from "react";
import Link from "next/link";
import {
  ArrowDownLeft,
  ArrowUpRight,
  Search,
  AlertCircle,
} from "lucide-react";
import { formatSatangAsBaht } from "@/lib/money";
import { formatThaiDateTime, cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
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
import type { TransactionType, TransactionWithDetails } from "@/types/database";

export default function TransactionsPage() {
  const [transactions, setTransactions] = React.useState<
    TransactionWithDetails[]
  >([]);
  const [typeFilter, setTypeFilter] = React.useState<
    "all" | "deposit" | "withdraw"
  >("all");
  const [searchTerm, setSearchTerm] = React.useState("");
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);

  const [modalOpen, setModalOpen] = React.useState(false);
  const [modalType, setModalType] = React.useState<TransactionType>("deposit");

  const loadTransactions = React.useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams({ limit: "100" });
      if (typeFilter !== "all") params.set("type", typeFilter);

      const res = await fetch(`/api/transactions?${params.toString()}`, {
        cache: "no-store",
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error ?? "ไม่สามารถโหลดประวัติรายการได้");
      }
      setTransactions(data.transactions ?? []);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "เกิดข้อผิดพลาดในการโหลดข้อมูล"
      );
    } finally {
      setLoading(false);
    }
  }, [typeFilter]);

  React.useEffect(() => {
    loadTransactions();
  }, [loadTransactions]);

  const filteredTransactions = React.useMemo(() => {
    const q = searchTerm.trim().toLowerCase();
    if (!q) return transactions;
    return transactions.filter(
      (tx) =>
        tx.saver_name.toLowerCase().includes(q) ||
        tx.saver_code.toLowerCase().includes(q) ||
        (tx.note ?? "").toLowerCase().includes(q)
    );
  }, [transactions, searchTerm]);

  const openModal = (type: TransactionType) => {
    setModalType(type);
    setModalOpen(true);
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-[#1E2937]">
            บันทึกและประวัติรายการ
          </h1>
          <p className="text-sm text-[#64748B]">
            บันทึกรายการฝาก-ถอนเงิน และตรวจสอบประวัติทั้งหมด (ใหม่สุดขึ้นก่อน)
          </p>
        </div>

        <div className="flex flex-wrap gap-2.5">
          <Button
            variant="success"
            size="lg"
            onClick={() => openModal("deposit")}
          >
            <ArrowDownLeft className="h-5 w-5" />
            ฝากเงิน
          </Button>
          <Button
            variant="danger"
            size="lg"
            onClick={() => openModal("withdraw")}
          >
            <ArrowUpRight className="h-5 w-5" />
            ถอนเงิน
          </Button>
        </div>
      </div>

      <Card>
        <CardContent className="pt-5 sm:pt-6">
          <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
            <div className="relative flex-1 max-w-md">
              <Search className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-[#64748B]" />
              <Input
                type="search"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="กรองด้วยชื่อผู้ฝาก, รหัส หรือหมายเหตุ..."
                aria-label="กรองรายการด้วยชื่อผู้ฝาก รหัส หรือหมายเหตุ"
                className="pl-10"
              />
            </div>

            <div className="flex items-center gap-2">
              {(
                [
                  { id: "all", label: "ทั้งหมด" },
                  { id: "deposit", label: "ฝากเงิน" },
                  { id: "withdraw", label: "ถอนเงิน" },
                ] as const
              ).map((tab) => (
                <button
                  key={tab.id}
                  type="button"
                  aria-pressed={typeFilter === tab.id}
                  onClick={() => setTypeFilter(tab.id)}
                  className={cn(
                    "rounded-xl px-4 py-2 text-sm font-semibold transition-colors cursor-pointer",
                    typeFilter === tab.id
                      ? "bg-[#0F766E] text-white"
                      : "bg-[#F1F5F9] text-[#475569] hover:bg-[#E2E8F0]"
                  )}
                >
                  {tab.label}
                </button>
              ))}
            </div>
          </div>
        </CardContent>
      </Card>

      {error && (
        <div
          role="alert"
          className="flex items-center gap-2.5 rounded-2xl border border-[#FECACA] bg-[#FEF2F2] p-4 text-sm text-[#DC2626]"
        >
          <AlertCircle className="h-5 w-5 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      <Card>
        <CardContent className="p-0 sm:p-2">
          {loading ? (
            <div className="p-6 space-y-3">
              <Skeleton className="h-12" />
              <Skeleton className="h-12" />
              <Skeleton className="h-12" />
            </div>
          ) : filteredTransactions.length === 0 ? (
            <div className="py-12 text-center">
              <p className="text-sm font-semibold text-[#1E2937]">
                ไม่พบรายการฝาก-ถอน
              </p>
              <p className="mt-1 text-xs text-[#64748B]">
                ลองเปลี่ยนตัวกรองหรือกดปุ่มฝากเงิน / ถอนเงินด้านบน
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
                  <TableHead>หมายเหตุ</TableHead>
                  <TableHead>ผู้บันทึก</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredTransactions.map((tx) => (
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
                    <TableCell className="text-xs text-[#475569] max-w-xs">
                      {tx.note ?? "-"}
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
        open={modalOpen}
        onOpenChange={setModalOpen}
        initialType={modalType}
        onSuccess={loadTransactions}
      />
    </div>
  );
}
