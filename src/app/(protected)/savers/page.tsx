"use client";

import * as React from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import {
  Plus,
  Search,
  ArrowDownLeft,
  ArrowUpRight,
  Phone,
  UserPlus,
} from "lucide-react";
import { formatSatangAsBaht } from "@/lib/money";
import { useApiResource } from "@/hooks/use-api-resource";
import { useDebouncedValue } from "@/hooks/use-debounced-value";
import { Button } from "@/components/ui/button";
import { ButtonLink } from "@/components/ui/button-link";
import { ErrorAlert } from "@/components/ui/error-alert";
import { FilterTabs } from "@/components/ui/filter-tabs";
import { PageHeader } from "@/components/ui/page-header";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Avatar } from "@/components/ui/avatar";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { SaverFormModal } from "@/components/savers/SaverFormModal";
import { TransactionModal } from "@/components/transactions/TransactionModal";
import type { SaverWithBalance, TransactionType } from "@/types/database";

type SaverStatusFilter = "all" | "active" | "suspended";

const SAVER_STATUS_TABS = [
  { id: "all", label: "ทั้งหมด" },
  { id: "active", label: "ใช้งาน" },
  { id: "suspended", label: "ระงับ" },
] as const satisfies readonly { id: SaverStatusFilter; label: string }[];

interface SaversResponse {
  savers: SaverWithBalance[];
}

function SaversContent() {
  const searchParams = useSearchParams();
  const initialQuery = searchParams.get("q") ?? "";

  const [query, setQuery] = React.useState(initialQuery);
  const debouncedQuery = useDebouncedValue(query, 200);
  const [statusFilter, setStatusFilter] =
    React.useState<SaverStatusFilter>("all");

  const [addModalOpen, setAddModalOpen] = React.useState(false);
  const [txModalOpen, setTxModalOpen] = React.useState(false);
  const [txType, setTxType] = React.useState<TransactionType>("deposit");
  const [selectedSaver, setSelectedSaver] =
    React.useState<SaverWithBalance | null>(null);

  React.useEffect(() => {
    setQuery(searchParams.get("q") ?? "");
  }, [searchParams]);

  const listUrl = React.useMemo(() => {
    const params = new URLSearchParams();
    const trimmedQuery = debouncedQuery.trim();
    if (trimmedQuery) params.set("q", trimmedQuery);
    if (statusFilter !== "all") params.set("status", statusFilter);

    const queryString = params.toString();
    return queryString ? `/api/savers?${queryString}` : "/api/savers";
  }, [debouncedQuery, statusFilter]);

  const {
    data,
    loading,
    error,
    refetch,
  } = useApiResource<SaversResponse>(listUrl);

  const savers = data?.savers ?? [];

  const openQuickTx = (saver: SaverWithBalance, type: TransactionType) => {
    setSelectedSaver(saver);
    setTxType(type);
    setTxModalOpen(true);
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="รายชื่อผู้ฝากเงิน"
        description="ค้นหาด้วยชื่อ รหัสประจำตัว หรือเบอร์โทรศัพท์ พร้อมทำรายการได้ทันที"
        actions={
          <Button size="lg" onClick={() => setAddModalOpen(true)}>
            <UserPlus className="h-5 w-5" />
            เพิ่มผู้ฝากใหม่
          </Button>
        }
      />

      {/* Search & Status Filters */}
      <Card>
        <CardContent className="pt-5 sm:pt-6">
          <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
            <div className="relative flex-1 max-w-xl">
              <Search className="pointer-events-none absolute left-3.5 top-1/2 h-5 w-5 -translate-y-1/2 text-[#64748B]" />
              <Input
                type="search"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="พิมพ์ชื่อ, นามสกุล, รหัส SV-0001 หรือเบอร์โทร..."
                className="h-12 pl-11 text-base"
                aria-label="ค้นหารายชื่อผู้ฝาก"
              />
            </div>

            <FilterTabs
              options={SAVER_STATUS_TABS}
              value={statusFilter}
              onChange={setStatusFilter}
              ariaLabel="กรองสถานะผู้ฝาก"
            />
          </div>
        </CardContent>
      </Card>

      {error && <ErrorAlert message={error} onRetry={refetch} />}

      {/* Results: Desktop Table & Mobile Cards */}
      {loading ? (
        <div className="space-y-3">
          <Skeleton className="h-20" />
          <Skeleton className="h-20" />
          <Skeleton className="h-20" />
        </div>
      ) : savers.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <p className="text-base font-semibold text-[#1E2937]">
              ไม่พบข้อมูลผู้ฝากเงิน
            </p>
            <p className="mt-1 text-sm text-[#64748B]">
              ลองเปลี่ยนคำค้นหา หรือกดปุ่ม &quot;เพิ่มผู้ฝากใหม่&quot;
            </p>
            <Button className="mt-4" onClick={() => setAddModalOpen(true)}>
              <Plus className="h-4 w-4" />
              เพิ่มผู้ฝากใหม่
            </Button>
          </CardContent>
        </Card>
      ) : (
        <>
          {/* Desktop Table */}
          <Card className="hidden md:block">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>ผู้ฝากเงิน</TableHead>
                  <TableHead>รหัส</TableHead>
                  <TableHead>เบอร์โทร</TableHead>
                  <TableHead>สถานะ</TableHead>
                  <TableHead className="text-right">ยอดคงเหลือ</TableHead>
                  <TableHead className="text-right">ทำรายการด่วน</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {savers.map((saver) => (
                  <TableRow key={saver.id}>
                    <TableCell>
                      <Link
                        href={`/savers/${saver.id}`}
                        className="flex items-center gap-3 group"
                      >
                        <Avatar
                          firstName={saver.first_name}
                          lastName={saver.last_name}
                        />
                        <div>
                          <p className="font-bold text-[#1E2937] group-hover:text-[#0F766E]">
                            {saver.first_name} {saver.last_name}
                          </p>
                          {saver.national_id && (
                            <p className="text-xs text-[#64748B]">
                              {saver.national_id}
                            </p>
                          )}
                        </div>
                      </Link>
                    </TableCell>
                    <TableCell className="font-mono text-xs font-semibold text-[#475569]">
                      {saver.saver_code}
                    </TableCell>
                    <TableCell className="text-sm text-[#475569]">
                      {saver.phone}
                    </TableCell>
                    <TableCell>
                      <Badge
                        variant={
                          saver.status === "active" ? "success" : "danger"
                        }
                      >
                        {saver.status === "active" ? "ใช้งาน" : "ระงับ"}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      <span className="text-lg font-bold text-[#0F766E] tabular-nums">
                        ฿{formatSatangAsBaht(saver.balance_satang)}
                      </span>
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="inline-flex items-center gap-2">
                        <Button
                          size="sm"
                          variant="success"
                          disabled={saver.status !== "active"}
                          onClick={() => openQuickTx(saver, "deposit")}
                        >
                          <ArrowDownLeft className="h-3.5 w-3.5" />
                          ฝาก
                        </Button>
                        <Button
                          size="sm"
                          variant="danger"
                          disabled={saver.status !== "active"}
                          onClick={() => openQuickTx(saver, "withdraw")}
                        >
                          <ArrowUpRight className="h-3.5 w-3.5" />
                          ถอน
                        </Button>
                        <ButtonLink
                          href={`/savers/${saver.id}`}
                          size="sm"
                          variant="outline"
                        >
                          โปรไฟล์
                        </ButtonLink>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </Card>

          {/* Mobile Cards */}
          <div className="grid grid-cols-1 gap-3 md:hidden">
            {savers.map((saver) => (
              <Card key={saver.id}>
                <CardContent className="p-4 space-y-3">
                  <div className="flex items-start justify-between gap-3">
                    <Link
                      href={`/savers/${saver.id}`}
                      className="flex items-center gap-3"
                    >
                      <Avatar
                        firstName={saver.first_name}
                        lastName={saver.last_name}
                      />
                      <div>
                        <p className="font-bold text-[#1E2937]">
                          {saver.first_name} {saver.last_name}
                        </p>
                        <p className="text-xs text-[#64748B]">
                          {saver.saver_code}
                        </p>
                      </div>
                    </Link>
                    <Badge
                      variant={saver.status === "active" ? "success" : "danger"}
                    >
                      {saver.status === "active" ? "ใช้งาน" : "ระงับ"}
                    </Badge>
                  </div>

                  <div className="flex items-center justify-between border-y border-[#E2E8F0] py-2.5">
                    <div className="flex items-center gap-1.5 text-xs text-[#64748B]">
                      <Phone className="h-3.5 w-3.5" />
                      <span>{saver.phone}</span>
                    </div>
                    <div className="text-right">
                      <p className="text-[11px] text-[#64748B]">ยอดคงเหลือ</p>
                      <p className="text-xl font-bold text-[#0F766E] tabular-nums">
                        ฿{formatSatangAsBaht(saver.balance_satang)}
                      </p>
                    </div>
                  </div>

                  <div className="grid grid-cols-3 gap-2">
                    <Button
                      size="sm"
                      variant="success"
                      disabled={saver.status !== "active"}
                      onClick={() => openQuickTx(saver, "deposit")}
                    >
                      ฝากเงิน
                    </Button>
                    <Button
                      size="sm"
                      variant="danger"
                      disabled={saver.status !== "active"}
                      onClick={() => openQuickTx(saver, "withdraw")}
                    >
                      ถอนเงิน
                    </Button>
                    <ButtonLink
                      href={`/savers/${saver.id}`}
                      size="sm"
                      variant="outline"
                      className="w-full"
                    >
                      ดูประวัติ
                    </ButtonLink>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </>
      )}

      <SaverFormModal
        open={addModalOpen}
        onOpenChange={setAddModalOpen}
        onSuccess={() => refetch()}
      />

      <TransactionModal
        open={txModalOpen}
        onOpenChange={setTxModalOpen}
        initialType={txType}
        preselectedSaver={selectedSaver}
        onSuccess={() => refetch()}
      />
    </div>
  );
}

export default function SaversPage() {
  return (
    <React.Suspense
      fallback={
        <div className="space-y-4">
          <Skeleton className="h-12 w-64" />
          <Skeleton className="h-24" />
          <Skeleton className="h-64" />
        </div>
      }
    >
      <SaversContent />
    </React.Suspense>
  );
}
