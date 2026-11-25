"use client";

import * as React from "react";
import { AlertCircle } from "lucide-react";
import { toast } from "sonner";
import { createSaverSchema, updateSaverSchema } from "@/lib/validation";
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
import type { SaverWithBalance } from "@/types/database";

interface SaverFormModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  saver?: SaverWithBalance | null;
  onSuccess: (saver: SaverWithBalance) => void;
}

/**
 * Modal form for creating a new saver or editing an existing saver's profile.
 */
export function SaverFormModal({
  open,
  onOpenChange,
  saver,
  onSuccess,
}: SaverFormModalProps) {
  const isEditing = Boolean(saver);
  const [saverCode, setSaverCode] = React.useState("");
  const [firstName, setFirstName] = React.useState("");
  const [lastName, setLastName] = React.useState("");
  const [phone, setPhone] = React.useState("");
  const [nationalId, setNationalId] = React.useState("");
  const [notes, setNotes] = React.useState("");
  const [submitting, setSubmitting] = React.useState(false);
  const [errorMessage, setErrorMessage] = React.useState<string | null>(null);

  React.useEffect(() => {
    if (open) {
      setErrorMessage(null);
      setSaverCode(saver?.saver_code ?? "");
      setFirstName(saver?.first_name ?? "");
      setLastName(saver?.last_name ?? "");
      setPhone(saver?.phone ?? "");
      setNationalId(saver?.national_id ?? "");
      setNotes(saver?.notes ?? "");
    }
  }, [open, saver]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);

    if (isEditing && saver) {
      const parsed = updateSaverSchema.safeParse({
        first_name: firstName,
        last_name: lastName,
        phone,
        national_id: nationalId,
        notes,
      });

      if (!parsed.success) {
        setErrorMessage(parsed.error.issues[0]?.message ?? "ข้อมูลไม่ถูกต้อง");
        return;
      }

      setSubmitting(true);
      try {
        const res = await fetch(`/api/savers/${saver.id}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(parsed.data),
        });
        const data = await res.json();
        if (!res.ok) {
          throw new Error(data.error ?? "ไม่สามารถแก้ไขข้อมูลผู้ฝากได้");
        }
        toast.success("บันทึกการแก้ไขข้อมูลผู้ฝากเรียบร้อย");
        onSuccess(data.saver);
        onOpenChange(false);
      } catch (err) {
        setErrorMessage(
          err instanceof Error ? err.message : "เกิดข้อผิดพลาดในการบันทึก"
        );
      } finally {
        setSubmitting(false);
      }
      return;
    }

    const parsed = createSaverSchema.safeParse({
      saver_code: saverCode || undefined,
      first_name: firstName,
      last_name: lastName,
      phone,
      national_id: nationalId || undefined,
      notes: notes || undefined,
    });

    if (!parsed.success) {
      setErrorMessage(parsed.error.issues[0]?.message ?? "ข้อมูลไม่ถูกต้อง");
      return;
    }

    setSubmitting(true);
    try {
      const res = await fetch("/api/savers", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(parsed.data),
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error ?? "ไม่สามารถเพิ่มผู้ฝากได้");
      }
      toast.success("เพิ่มผู้ฝากเงินใหม่เรียบร้อย");
      onSuccess(data.saver);
      onOpenChange(false);
    } catch (err) {
      setErrorMessage(
        err instanceof Error ? err.message : "เกิดข้อผิดพลาดในการบันทึก"
      );
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogHeader onClose={() => onOpenChange(false)}>
        <DialogTitle>
          {isEditing ? "แก้ไขข้อมูลผู้ฝากเงิน" : "เพิ่มผู้ฝากเงินใหม่"}
        </DialogTitle>
        <DialogDescription>
          {isEditing
            ? `รหัสผู้ฝาก ${saver?.saver_code}`
            : "กรอกข้อมูลสมาชิกในตลาดเพื่อเปิดสมุดออมเงินดิจิทัล"}
        </DialogDescription>
      </DialogHeader>

      <form onSubmit={handleSubmit} noValidate>
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

          {!isEditing && (
            <div>
              <Label htmlFor="saver-code">
                รหัสผู้ฝาก (เว้นว่างเพื่อสร้างอัตโนมัติ)
              </Label>
              <Input
                id="saver-code"
                value={saverCode}
                onChange={(e) => setSaverCode(e.target.value.toUpperCase())}
                placeholder="เช่น SV-0001"
                disabled={submitting}
              />
            </div>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <Label htmlFor="saver-first-name">ชื่อ *</Label>
              <Input
                id="saver-first-name"
                required
                value={firstName}
                onChange={(e) => setFirstName(e.target.value)}
                placeholder="เช่น สมชาย"
                disabled={submitting}
              />
            </div>
            <div>
              <Label htmlFor="saver-last-name">นามสกุล *</Label>
              <Input
                id="saver-last-name"
                required
                value={lastName}
                onChange={(e) => setLastName(e.target.value)}
                placeholder="เช่น ใจดี"
                disabled={submitting}
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <Label htmlFor="saver-phone">เบอร์โทรศัพท์ *</Label>
              <Input
                id="saver-phone"
                type="tel"
                required
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="081-234-5678"
                disabled={submitting}
              />
            </div>
            <div>
              <Label htmlFor="saver-national-id">รหัสประจำตัว / รหัสแผง</Label>
              <Input
                id="saver-national-id"
                value={nationalId}
                onChange={(e) => setNationalId(e.target.value)}
                placeholder="เช่น แผง A-12"
                disabled={submitting}
              />
            </div>
          </div>

          <div>
            <Label htmlFor="saver-notes">หมายเหตุ</Label>
            <Textarea
              id="saver-notes"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="รายละเอียดเพิ่มเติม เช่น ประเภทสินค้า หรือจุดขาย"
              disabled={submitting}
            />
          </div>
        </DialogBody>

        <DialogFooter>
          <Button
            type="button"
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={submitting}
          >
            ยกเลิก
          </Button>
          <Button type="submit" disabled={submitting}>
            {submitting
              ? "กำลังบันทึก..."
              : isEditing
              ? "บันทึกการแก้ไข"
              : "เพิ่มผู้ฝากเงิน"}
          </Button>
        </DialogFooter>
      </form>
    </Dialog>
  );
}
