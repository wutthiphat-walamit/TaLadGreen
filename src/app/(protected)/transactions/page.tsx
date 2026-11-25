"use client";

import * as React from "react";
import Link from "next/link";
import { ArrowDownLeft, ArrowUpRight, Search } from "lucide-react";
import { formatSatangAsBaht } from "@/lib/money";
import { formatThaiDateTime, cn } from "@/lib/utils";
import { useApiResource } from "@/hooks/use-api-resource";
import { Button } from "@/components/ui/button";
import { ErrorAlert } from "@/components/ui/error-alert";
import { FilterTabs } from "@/components/ui/filter-tabs";
import { PageHeader } from "@/components/ui/page-header";
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

type TransactionFilter = "all" | "deposit" | "withdraw";

const TRANSACTION_TYPE_TABS = [
  { id: "all", label: "ทั้งหมด" },
  { id: "deposit", label: "ฝากเงิน" },
  { id: "withdraw", label: "ถอนเงิน" },
] as const satisfies readonly { id: TransactionFilter; label: string }[];

interface TransactionsResponse {
  transactions: TransactionWithDetails[];
}

export default function TransactionsPage() {
  const [typeFilter, setTypeFilter] =
    React.useState<TransactionFilter>("all");
  const [searchTerm, setSearchTerm] = React.useState("");

  const [modalOpen, setModalOpen] = React.useState(false);
  const [modalType, setModalType] = React.useState<TransactionType>("deposit");

  const listUrl = React.useMemo(() => {
    const params = new URLSearchParams({ limit: "100" });
    if (typeFilter !== "all") params.set("type", typeFilter);
    return `/api/transactions?${params.toString()}`;
  }, [typeFilter]);

  const {
    data,
    loading,
    error,
    refetch,
  } = useApiResource<TransactionsResponse>(listUrl);

  const transactions = React.useMemo(
    () => data?.transactions ?? [],
    [data]
  );

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
      <PageHeader
        title="บันทึกและประวัติรายการ"
        description="บันทึกรายการฝาก-ถอนเงิน และตรวจสอบประวัติทั้งหมด (ใหม่สุดขึ้นก่อน)"
        actions={
          <>
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
          </>
        }
      />

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

            <FilterTabs
              options={TRANSACTION_TYPE_TABS}
              value={typeFilter}
              onChange={setTypeFilter}
              ariaLabel="กรองประเภทรายการ"
            />
          </div>
        </CardContent>
      </Card>

      {error && <ErrorAlert message={error} onRetry={refetch} />}

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
        onSuccess={refetch}
      />
    </div>
  );
}
