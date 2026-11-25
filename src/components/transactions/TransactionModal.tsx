"use client";

import * as React from "react";
import {
  ArrowDownLeft,
  ArrowUpRight,
  AlertTriangle,
  CheckCircle2,
  AlertCircle,
} from "lucide-react";
import { toast } from "sonner";
import { apiFetch, isAbortError } from "@/lib/api-client";
import {
  canWithdraw,
  formatSatangAsBaht,
  tryParseBahtToSatang,
} from "@/lib/money";
import { cn } from "@/lib/utils";
import {
  Dialog,
  DialogBody,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import type { SaverWithBalance, TransactionType } from "@/types/database";

interface TransactionModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  initialType?: TransactionType;
  preselectedSaver?: SaverWithBalance | null;
  savers?: SaverWithBalance[];
  onSuccess: () => void;
}

function toLocalDateTimeValue(date: Date): string {
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(
    date.getDate()
  )}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

/**
 * Deposit / Withdraw modal with real-time over-withdrawal guard and mandatory confirmation step.
 */
export function TransactionModal({
  open,
  onOpenChange,
  initialType = "deposit",
  preselectedSaver = null,
  savers: providedSavers,
  onSuccess,
}: TransactionModalProps) {
  const [step, setStep] = React.useState<"form" | "confirm">("form");
  const [type, setType] = React.useState<TransactionType>(initialType);
  const [saverId, setSaverId] = React.useState<string>("");
  const [saverList, setSaverList] = React.useState<SaverWithBalance[]>(
    providedSavers ?? []
  );
  const [loadingSavers, setLoadingSavers] = React.useState(false);
  const [amountInput, setAmountInput] = React.useState("");
  const [transactionDate, setTransactionDate] = React.useState("");
  const [note, setNote] = React.useState("");
  const [submitting, setSubmitting] = React.useState(false);
  const [errorMessage, setErrorMessage] = React.useState<string | null>(null);

  React.useEffect(() => {
    if (!open) return;
    setStep("form");
    setType(initialType);
    setSaverId(preselectedSaver?.id ?? "");
    setAmountInput("");
    setTransactionDate(toLocalDateTimeValue(new Date()));
    setNote("");
    setErrorMessage(null);

    if (providedSavers) {
      setSaverList(providedSavers.filter((s) => s.status === "active"));
      return;
    }

    if (!preselectedSaver) {
      const controller = new AbortController();
      let active = true;

      setLoadingSavers(true);
      apiFetch<{ savers: SaverWithBalance[] }>("/api/savers?status=active", {
        signal: controller.signal,
      })
        .then((payload) => {
          if (active) {
            setSaverList(payload.savers ?? []);
          }
        })
        .catch((err: unknown) => {
          if (!active || isAbortError(err)) return;
          setErrorMessage(
            err instanceof Error
              ? err.message
              : "ไม่สามารถโหลดรายชื่อผู้ฝากเงินได้"
          );
        })
        .finally(() => {
          if (active) {
            setLoadingSavers(false);
          }
        });

      return () => {
        active = false;
        controller.abort();
      };
    }
  }, [open, initialType, preselectedSaver, providedSavers]);

  const selectedSaver = React.useMemo(() => {
    if (preselectedSaver) return preselectedSaver;
    return saverList.find((s) => s.id === saverId) ?? null;
  }, [preselectedSaver, saverList, saverId]);

  const amountSatang = tryParseBahtToSatang(amountInput);
  const currentBalanceSatang = selectedSaver?.balance_satang ?? 0;

  const isOverWithdraw =
    type === "withdraw" &&
    selectedSaver !== null &&
    amountSatang !== null &&
    !canWithdraw(currentBalanceSatang, amountSatang);

  const isSuspended = selectedSaver?.status === "suspended";

  const projectedBalanceSatang =
    amountSatang === null
      ? currentBalanceSatang
      : type === "deposit"
      ? currentBalanceSatang + amountSatang
      : currentBalanceSatang - amountSatang;

  const handleProceedToConfirm = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);

    if (!selectedSaver) {
      setErrorMessage("กรุณาเลือกผู้ฝากเงิน");
      return;
    }
    if (isSuspended) {
      setErrorMessage("ผู้ฝากรายนี้ถูกระงับการใช้งาน ไม่สามารถทำรายการได้");
      return;
    }
    if (amountSatang === null) {
      setErrorMessage(
        "กรุณากรอกจำนวนเงินที่ถูกต้อง (มากกว่า 0 และทศนิยมไม่เกิน 2 ตำแหน่ง)"
      );
      return;
    }
    if (isOverWithdraw) {
      setErrorMessage(
        `ไม่สามารถถอนเกินยอดคงเหลือ (${formatSatangAsBaht(
          currentBalanceSatang
        )} บาท)`
      );
      return;
    }

    setStep("confirm");
  };

  const handleConfirmSubmit = async () => {
    if (!selectedSaver || amountSatang === null) return;
    setErrorMessage(null);
    setSubmitting(true);

    try {
      const isoDate = transactionDate
        ? new Date(transactionDate).toISOString()
        : new Date().toISOString();

      await apiFetch<{ transaction: unknown }>("/api/transactions", {
        method: "POST",
        body: JSON.stringify({
          saver_id: selectedSaver.id,
          type,
          amount_baht: amountInput.replace(/,/g, "").trim(),
          transaction_date: isoDate,
          note: note.trim() || undefined,
        }),
      });

      toast.success(
        type === "deposit"
          ? `บันทึกฝากเงิน ${formatSatangAsBaht(amountSatang)} บาท เรียบร้อย`
          : `บันทึกถอนเงิน ${formatSatangAsBaht(amountSatang)} บาท เรียบร้อย`
      );
      onSuccess();
      onOpenChange(false);
    } catch (err) {
      setErrorMessage(
        err instanceof Error ? err.message : "เกิดข้อผิดพลาดในการบันทึก"
      );
      setStep("form");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogHeader onClose={() => onOpenChange(false)}>
        <DialogTitle>
          {step === "confirm" ? "ยืนยันการบันทึกรายการ" : "บันทึกรายการฝาก-ถอนเงิน"}
        </DialogTitle>
        <DialogDescription>
          {step === "confirm"
            ? "กรุณาตรวจสอบรายละเอียดให้ถูกต้องก่อนกดยืนยัน"
            : "เลือกผู้ฝาก ประเภท และระบุจำนวนเงิน"}
        </DialogDescription>
      </DialogHeader>

      {step === "form" ? (
        <form onSubmit={handleProceedToConfirm} noValidate>
          <DialogBody className="space-y-4">
            {errorMessage && (
              <div
                role="alert"
                className="flex items-start gap-2 rounded-xl border border-[#FECACA] bg-[#FEF2F2] p-3 text-sm text-[#DC2626]"
              >
                <AlertCircle className="h-4 w-4 mt-0.5 shrink-0" />
                <span>{errorMessage}</span>
              </div>
            )}

            {/* Saver Selector or Preselected Card */}
            <div>
              <Label htmlFor="tx-saver-select">ผู้ฝากเงิน *</Label>
              {preselectedSaver ? (
                <div className="flex items-center justify-between rounded-xl border border-[#99F6E4] bg-[#F0FDFA] p-3.5">
                  <div>
                    <p className="font-bold text-[#1E2937]">
                      {preselectedSaver.first_name} {preselectedSaver.last_name}
                    </p>
                    <p className="text-xs text-[#64748B]">
                      รหัส {preselectedSaver.saver_code} • โทร{" "}
                      {preselectedSaver.phone}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="text-xs text-[#64748B]">ยอดคงเหลือ</p>
                    <p className="text-lg font-bold text-[#0F766E] tabular-nums">
                      ฿{formatSatangAsBaht(preselectedSaver.balance_satang)}
                    </p>
                  </div>
                </div>
              ) : (
                <select
                  id="tx-saver-select"
                  value={saverId}
                  onChange={(e) => setSaverId(e.target.value)}
                  disabled={loadingSavers}
                  className="flex h-11 w-full rounded-xl border border-[#E2E8F0] bg-white px-3.5 py-2 text-sm text-[#1E2937] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0F766E]"
                >
                  <option value="">
                    {loadingSavers
                      ? "กำลังโหลดรายชื่อผู้ฝาก..."
                      : "-- เลือกผู้ฝากเงิน --"}
                  </option>
                  {saverList.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.saver_code} — {s.first_name} {s.last_name} (คงเหลือ{" "}
                      {formatSatangAsBaht(s.balance_satang)} ฿)
                    </option>
                  ))}
                </select>
              )}
            </div>

            {selectedSaver && !preselectedSaver && (
              <div className="flex items-center justify-between rounded-xl border border-[#E2E8F0] bg-[#F8FAFC] px-4 py-2.5 text-sm">
                <span className="text-[#64748B]">ยอดคงเหลือปัจจุบัน</span>
                <span className="text-base font-bold text-[#0F766E] tabular-nums">
                  ฿{formatSatangAsBaht(currentBalanceSatang)}
                </span>
              </div>
            )}

            {/* Deposit / Withdraw Type Toggle */}
            <div>
              <Label>ประเภทรายการ *</Label>
              <div className="grid grid-cols-2 gap-3">
                <button
                  type="button"
                  aria-pressed={type === "deposit"}
                  onClick={() => setType("deposit")}
                  className={cn(
                    "flex items-center justify-center gap-2 rounded-xl border-2 py-3 px-4 font-bold text-sm transition-colors cursor-pointer",
                    type === "deposit"
                      ? "border-[#16A34A] bg-[#F0FDF4] text-[#16A34A]"
                      : "border-[#E2E8F0] bg-white text-[#64748B] hover:bg-[#F8FAFC]"
                  )}
                >
                  <ArrowDownLeft className="h-5 w-5" />
                  ฝากเงิน
                </button>
                <button
                  type="button"
                  aria-pressed={type === "withdraw"}
                  onClick={() => setType("withdraw")}
                  className={cn(
                    "flex items-center justify-center gap-2 rounded-xl border-2 py-3 px-4 font-bold text-sm transition-colors cursor-pointer",
                    type === "withdraw"
                      ? "border-[#DC2626] bg-[#FEF2F2] text-[#DC2626]"
                      : "border-[#E2E8F0] bg-white text-[#64748B] hover:bg-[#F8FAFC]"
                  )}
                >
                  <ArrowUpRight className="h-5 w-5" />
                  ถอนเงิน
                </button>
              </div>
            </div>

            {/* Large Amount Input */}
            <div>
              <Label htmlFor="tx-amount">จำนวนเงิน (บาท) *</Label>
              <Input
                id="tx-amount"
                type="text"
                inputMode="decimal"
                value={amountInput}
                onChange={(e) => setAmountInput(e.target.value)}
                placeholder="0.00"
                className="h-14 text-2xl sm:text-3xl font-bold tabular-nums text-right pr-4"
                required
              />
              {amountSatang !== null && (
                <p className="mt-1.5 text-right text-xs text-[#64748B] tabular-nums">
                  จำนวนเงิน:{" "}
                  <span className="font-semibold text-[#1E2937]">
                    {formatSatangAsBaht(amountSatang)} บาท
                  </span>
                </p>
              )}
            </div>

            {isOverWithdraw && (
              <div
                role="alert"
                className="flex items-start gap-2.5 rounded-xl border border-[#FECACA] bg-[#FEF2F2] p-3.5 text-sm text-[#DC2626]"
              >
                <AlertTriangle className="h-5 w-5 shrink-0" />
                <div>
                  <p className="font-bold">ยอดเงินไม่เพียงพอสำหรับการถอน</p>
                  <p className="text-xs mt-0.5 tabular-nums">
                    ยอดคงเหลือปัจจุบัน {formatSatangAsBaht(currentBalanceSatang)}{" "}
                    บาท ไม่สามารถถอน {formatSatangAsBaht(amountSatang ?? 0)} บาทได้
                  </p>
                </div>
              </div>
            )}

            <div className="grid grid-cols-1 gap-4">
              <div>
                <Label htmlFor="tx-date">วันที่และเวลา</Label>
                <Input
                  id="tx-date"
                  type="datetime-local"
                  value={transactionDate}
                  onChange={(e) => setTransactionDate(e.target.value)}
                />
              </div>
              <div>
                <Label htmlFor="tx-note">หมายเหตุ</Label>
                <Textarea
                  id="tx-note"
                  value={note}
                  onChange={(e) => setNote(e.target.value)}
                  placeholder="เช่น ค่าแผงรายวัน, ถอนใช้หมุนเวียน"
                  className="min-h-[72px]"
                />
              </div>
            </div>
          </DialogBody>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
            >
              ยกเลิก
            </Button>
            <Button
              type="submit"
              variant={type === "deposit" ? "success" : "danger"}
              disabled={isOverWithdraw || isSuspended}
            >
              ตรวจสอบรายการ
            </Button>
          </DialogFooter>
        </form>
      ) : (
        <div>
          <DialogBody className="space-y-4">
            {errorMessage && (
              <div
                role="alert"
                className="flex items-start gap-2 rounded-xl border border-[#FECACA] bg-[#FEF2F2] p-3 text-sm text-[#DC2626]"
              >
                <AlertCircle className="h-4 w-4 mt-0.5 shrink-0" />
                <span>{errorMessage}</span>
              </div>
            )}

            <div className="rounded-2xl border border-[#E2E8F0] bg-[#F8FAFC] p-5 space-y-3.5">
              <div className="flex items-center justify-between">
                <span className="text-sm text-[#64748B]">ผู้ฝากเงิน</span>
                <span className="font-bold text-[#1E2937]">
                  {selectedSaver?.saver_code} — {selectedSaver?.first_name}{" "}
                  {selectedSaver?.last_name}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-[#64748B]">ประเภทรายการ</span>
                <Badge variant={type === "deposit" ? "success" : "danger"}>
                  {type === "deposit" ? "ฝากเงิน (Deposit)" : "ถอนเงิน (Withdraw)"}
                </Badge>
              </div>
              <div className="flex items-center justify-between border-t border-[#E2E8F0] pt-3">
                <span className="text-sm font-semibold text-[#1E2937]">
                  จำนวนเงิน
                </span>
                <span
                  className={cn(
                    "text-2xl font-bold tabular-nums",
                    type === "deposit" ? "text-[#16A34A]" : "text-[#DC2626]"
                  )}
                >
                  {type === "deposit" ? "+" : "-"}฿
                  {formatSatangAsBaht(amountSatang ?? 0)}
                </span>
              </div>
              <div className="flex items-center justify-between text-sm">
                <span className="text-[#64748B]">ยอดคงเหลือเดิม</span>
                <span className="tabular-nums font-medium">
                  ฿{formatSatangAsBaht(currentBalanceSatang)}
                </span>
              </div>
              <div className="flex items-center justify-between border-t border-[#E2E8F0] pt-3">
                <span className="text-sm font-semibold text-[#1E2937]">
                  ยอดคงเหลือหลังทำรายการ
                </span>
                <span className="text-xl font-bold text-[#0F766E] tabular-nums">
                  ฿{formatSatangAsBaht(projectedBalanceSatang)}
                </span>
              </div>
              {note.trim() && (
                <div className="border-t border-[#E2E8F0] pt-3 text-sm">
                  <span className="text-[#64748B]">หมายเหตุ: </span>
                  <span className="text-[#1E2937]">{note.trim()}</span>
                </div>
              )}
            </div>
          </DialogBody>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => setStep("form")}
              disabled={submitting}
            >
              แก้ไขข้อมูล
            </Button>
            <Button
              type="button"
              variant={type === "deposit" ? "success" : "danger"}
              onClick={handleConfirmSubmit}
              disabled={submitting}
            >
              <CheckCircle2 className="h-4 w-4" />
              {submitting ? "กำลังบันทึก..." : "ยืนยันบันทึกรายการ"}
            </Button>
          </DialogFooter>
        </div>
      )}
    </Dialog>
  );
}
