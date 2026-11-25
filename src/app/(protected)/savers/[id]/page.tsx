"use client";

import * as React from "react";
import { useParams } from "next/navigation";
import {
  ArrowLeft,
  ArrowDownLeft,
  ArrowUpRight,
  Edit3,
  Phone,
  IdCard,
  ShieldAlert,
  ShieldCheck,
  AlertCircle,
} from "lucide-react";
import { toast } from "sonner";
import { apiFetch } from "@/lib/api-client";
import { formatSatangAsBaht } from "@/lib/money";
import { formatThaiDateTime, cn } from "@/lib/utils";
import { useApiResource } from "@/hooks/use-api-resource";
import { Button } from "@/components/ui/button";
import { ButtonLink } from "@/components/ui/button-link";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Avatar } from "@/components/ui/avatar";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Dialog,
  DialogBody,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
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
import type {
  SaverWithBalance,
  StaffRole,
  TransactionType,
  TransactionWithDetails,
} from "@/types/database";

interface SaverProfileResponse {
  saver: SaverWithBalance;
  transactions: TransactionWithDetails[];
  currentStaffRole: StaffRole;
}

export default function SaverProfilePage() {
  const params = useParams<{ id: string }>();
  const saverId = params.id;

  const {
    data,
    loading,
    error,
    refetch,
  } = useApiResource<SaverProfileResponse>(
    saverId ? `/api/savers/${saverId}` : null
  );

  const saver = data?.saver ?? null;
  const transactions = data?.transactions ?? [];
  const staffRole = data?.currentStaffRole ?? "staff";

  const [editOpen, setEditOpen] = React.useState(false);
  const [txOpen, setTxOpen] = React.useState(false);
  const [txType, setTxType] = React.useState<TransactionType>("deposit");
  const [statusDialogOpen, setStatusDialogOpen] = React.useState(false);
  const [updatingStatus, setUpdatingStatus] = React.useState(false);

  const handleToggleStatus = async () => {
    if (!saver) return;
    const nextStatus = saver.status === "active" ? "suspended" : "active";
    setUpdatingStatus(true);
    try {
      await apiFetch<{ saver: SaverWithBalance }>(
        `/api/savers/${saver.id}`,
        {
          method: "PATCH",
          body: JSON.stringify({ status: nextStatus }),
        }
      );
      toast.success(
        nextStatus === "suspended"
          ? "ระงับบัญชีผู้ฝากเรียบร้อย"
          : "เปิดใช้งานบัญชีผู้ฝากเรียบร้อย"
      );
      setStatusDialogOpen(false);
      refetch();
    } catch (err) {
      toast.error(
        err instanceof Error ? err.message : "เกิดข้อผิดพลาดในการเปลี่ยนสถานะ"
      );
    } finally {
      setUpdatingStatus(false);
    }
  };

  if (loading) {
    return (
      <div className="space-y-5">
        <Skeleton className="h-10 w-40" />
        <Skeleton className="h-44" />
        <Skeleton className="h-72" />
      </div>
    );
  }

  if (error || !saver) {
    return (
      <div className="space-y-4">
        <ButtonLink href="/savers" variant="outline">
          <ArrowLeft className="h-4 w-4" />
          กลับไปรายชื่อผู้ฝาก
        </ButtonLink>
        <div
          role="alert"
          className="flex items-center gap-2.5 rounded-2xl border border-[#FECACA] bg-[#FEF2F2] p-5 text-sm text-[#DC2626]"
        >
          <AlertCircle className="h-5 w-5 shrink-0" />
          <span>{error ?? "ไม่พบข้อมูลผู้ฝากเงิน"}</span>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-3">
        <ButtonLink href="/savers" variant="outline" size="sm">
          <ArrowLeft className="h-4 w-4" />
          รายชื่อผู้ฝากทั้งหมด
        </ButtonLink>

        <div className="flex flex-wrap items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setEditOpen(true)}
          >
            <Edit3 className="h-4 w-4" />
            แก้ไขข้อมูล
          </Button>

          {staffRole === "admin" && (
            <Button
              variant={saver.status === "active" ? "outline" : "soft"}
              size="sm"
              onClick={() => setStatusDialogOpen(true)}
            >
              {saver.status === "active" ? (
                <>
                  <ShieldAlert className="h-4 w-4 text-[#DC2626]" />
                  ระงับบัญชี
                </>
              ) : (
                <>
                  <ShieldCheck className="h-4 w-4 text-[#0F766E]" />
                  เปิดใช้งานบัญชี
                </>
              )}
            </Button>
          )}
        </div>
      </div>

      {/* Profile Header + Balance Highlight */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardContent className="p-6">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex items-center gap-4">
                <Avatar
                  firstName={saver.first_name}
                  lastName={saver.last_name}
                  size="lg"
                />
                <div>
                  <div className="flex flex-wrap items-center gap-2.5">
                    <h1 className="text-2xl font-bold text-[#1E2937]">
                      {saver.first_name} {saver.last_name}
                    </h1>
                    <Badge
                      variant={saver.status === "active" ? "success" : "danger"}
                    >
                      {saver.status === "active" ? "ใช้งาน" : "ระงับการใช้งาน"}
                    </Badge>
                  </div>
                  <p className="mt-1 font-mono text-sm font-semibold text-[#0F766E]">
                    รหัสผู้ฝาก: {saver.saver_code}
                  </p>
                </div>
              </div>

              <div className="flex flex-wrap gap-2.5">
                <Button
                  variant="success"
                  size="lg"
                  disabled={saver.status !== "active"}
                  onClick={() => {
                    setTxType("deposit");
                    setTxOpen(true);
                  }}
                >
                  <ArrowDownLeft className="h-5 w-5" />
                  ฝากเงิน
                </Button>
                <Button
                  variant="danger"
                  size="lg"
                  disabled={saver.status !== "active"}
                  onClick={() => {
                    setTxType("withdraw");
                    setTxOpen(true);
                  }}
                >
                  <ArrowUpRight className="h-5 w-5" />
                  ถอนเงิน
                </Button>
              </div>
            </div>

            <div className="mt-6 grid grid-cols-1 gap-3 border-t border-[#E2E8F0] pt-4 sm:grid-cols-2 text-sm">
              <div className="flex items-center gap-2 text-[#475569]">
                <Phone className="h-4 w-4 text-[#0F766E]" />
                <span>เบอร์โทร: {saver.phone}</span>
              </div>
              <div className="flex items-center gap-2 text-[#475569]">
                <IdCard className="h-4 w-4 text-[#0F766E]" />
                <span>
                  รหัสประจำตัว/แผง: {saver.national_id ?? "ไม่ได้ระบุ"}
                </span>
              </div>
              {saver.notes && (
                <div className="sm:col-span-2 rounded-xl bg-[#F8FAFC] p-3 text-xs text-[#475569]">
                  <span className="font-semibold text-[#1E2937]">หมายเหตุ: </span>
                  {saver.notes}
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        <Card className="border-[#99F6E4] bg-gradient-to-br from-[#0F766E] to-[#115E59] text-white">
          <CardHeader className="pb-2">
            <p className="text-sm font-medium text-teal-100">
              ยอดคงเหลือปัจจุบัน
            </p>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-4xl font-bold tracking-tight tabular-nums">
              ฿{formatSatangAsBaht(saver.balance_satang)}
            </p>
            <div className="space-y-1.5 border-t border-white/20 pt-3 text-xs tabular-nums">
              <div className="flex items-center justify-between text-teal-100">
                <span>ยอดฝากสะสม</span>
                <span className="font-semibold text-white">
                  +฿{formatSatangAsBaht(saver.total_deposit_satang)}
                </span>
              </div>
              <div className="flex items-center justify-between text-teal-100">
                <span>ยอดถอนสะสม</span>
                <span className="font-semibold text-white">
                  -฿{formatSatangAsBaht(saver.total_withdraw_satang)}
                </span>
              </div>
              <div className="flex items-center justify-between text-teal-100">
                <span>จำนวนรายการทั้งหมด</span>
                <span className="font-semibold text-white">
                  {saver.transaction_count} รายการ
                </span>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Transaction History (Newest-First) */}
      <Card>
        <CardHeader>
          <CardTitle>ประวัติการฝาก-ถอนเงิน</CardTitle>
          <p className="text-sm text-[#64748B]">
            เรียงลำดับจากรายการล่าสุดไปเก่าสุด
          </p>
        </CardHeader>
        <CardContent>
          {transactions.length === 0 ? (
            <div className="rounded-xl border border-dashed border-[#E2E8F0] bg-[#F8FAFC] py-12 text-center">
              <p className="text-sm font-semibold text-[#1E2937]">
                ยังไม่มีประวัติการทำรายการ
              </p>
              <p className="mt-1 text-xs text-[#64748B]">
                กดปุ่ม &quot;ฝากเงิน&quot; ด้านบนเพื่อบันทึกรายการแรก
              </p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>วัน-เวลา</TableHead>
                  <TableHead>ประเภท</TableHead>
                  <TableHead className="text-right">จำนวนเงิน</TableHead>
                  <TableHead className="text-right">ยอดคงเหลือหลังรายการ</TableHead>
                  <TableHead>หมายเหตุ</TableHead>
                  <TableHead>ผู้บันทึก</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {transactions.map((tx) => (
                  <TableRow key={tx.id}>
                    <TableCell className="whitespace-nowrap text-xs text-[#64748B]">
                      {formatThaiDateTime(tx.transaction_date)}
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

      <SaverFormModal
        open={editOpen}
        onOpenChange={setEditOpen}
        saver={saver}
        onSuccess={() => refetch()}
      />

      <TransactionModal
        open={txOpen}
        onOpenChange={setTxOpen}
        initialType={txType}
        preselectedSaver={saver}
        onSuccess={() => refetch()}
      />

      {/* Admin Status Toggle Confirmation */}
      <Dialog open={statusDialogOpen} onOpenChange={setStatusDialogOpen}>
        <DialogHeader onClose={() => setStatusDialogOpen(false)}>
          <DialogTitle>
            {saver.status === "active"
              ? "ยืนยันการระงับบัญชีผู้ฝาก"
              : "ยืนยันการเปิดใช้งานบัญชีผู้ฝาก"}
          </DialogTitle>
          <DialogDescription>
            {saver.status === "active"
              ? "เมื่อระงับบัญชีแล้ว เจ้าหน้าที่จะไม่สามารถบันทึกฝากหรือถอนเงินให้ผู้ฝากรายนี้ได้ชั่วคราว"
              : "ผู้ฝากรายนี้จะกลับมาทำรายการฝาก-ถอนเงินได้ตามปกติ"}
          </DialogDescription>
        </DialogHeader>
        <DialogBody>
          <p className="text-sm text-[#1E2937]">
            ผู้ฝาก:{" "}
            <span className="font-bold">
              {saver.saver_code} — {saver.first_name} {saver.last_name}
            </span>
          </p>
        </DialogBody>
        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => setStatusDialogOpen(false)}
            disabled={updatingStatus}
          >
            ยกเลิก
          </Button>
          <Button
            variant={saver.status === "active" ? "danger" : "success"}
            onClick={handleToggleStatus}
            disabled={updatingStatus}
          >
            {updatingStatus
              ? "กำลังดำเนินการ..."
              : saver.status === "active"
              ? "ยืนยันระงับบัญชี"
              : "ยืนยันเปิดใช้งาน"}
          </Button>
        </DialogFooter>
      </Dialog>
    </div>
  );
}
