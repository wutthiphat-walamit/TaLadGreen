import { z } from "zod";
import { bahtToSatang } from "@/lib/money";

export const loginSchema = z.object({
  email: z
    .string()
    .trim()
    .min(1, "กรุณากรอกอีเมล")
    .email("รูปแบบอีเมลไม่ถูกต้อง"),
  password: z
    .string()
    .min(6, "รหัสผ่านต้องมีอย่างน้อย 6 ตัวอักษร")
    .max(128, "รหัสผ่านยาวเกินไป"),
});

const saverCodeRegex = /^[A-Za-z0-9_-]{2,20}$/;
const thaiPhoneRegex = /^[0-9+\-\s]{9,15}$/;

export const createSaverSchema = z.object({
  saver_code: z
    .string()
    .trim()
    .nullable()
    .optional()
    .transform((v) => (v && v.length > 0 ? v.toUpperCase() : undefined))
    .refine(
      (v) => v === undefined || saverCodeRegex.test(v),
      "รหัสผู้ฝากต้องเป็นตัวอักษรภาษาอังกฤษ ตัวเลข หรือ - _ ความยาว 2-20 ตัว"
    ),
  first_name: z
    .string()
    .trim()
    .min(1, "กรุณากรอกชื่อ")
    .max(80, "ชื่อต้องไม่เกิน 80 ตัวอักษร"),
  last_name: z
    .string()
    .trim()
    .min(1, "กรุณากรอกนามสกุล")
    .max(80, "นามสกุลต้องไม่เกิน 80 ตัวอักษร"),
  phone: z
    .string()
    .trim()
    .regex(thaiPhoneRegex, "กรุณากรอกเบอร์โทรศัพท์ที่ถูกต้อง (9-15 หลัก)"),
  national_id: z
    .string()
    .trim()
    .max(20, "รหัสประจำตัว/รหัสแผงต้องไม่เกิน 20 ตัวอักษร")
    .nullable()
    .optional()
    .transform((v) => (v && v.length > 0 ? v : null)),
  notes: z
    .string()
    .trim()
    .max(500, "หมายเหตุต้องไม่เกิน 500 ตัวอักษร")
    .nullable()
    .optional()
    .transform((v) => (v && v.length > 0 ? v : null)),
});

export const updateSaverSchema = z
  .object({
    first_name: z
      .string()
      .trim()
      .min(1, "กรุณากรอกชื่อ")
      .max(80, "ชื่อต้องไม่เกิน 80 ตัวอักษร")
      .optional(),
    last_name: z
      .string()
      .trim()
      .min(1, "กรุณากรอกนามสกุล")
      .max(80, "นามสกุลต้องไม่เกิน 80 ตัวอักษร")
      .optional(),
    phone: z
      .string()
      .trim()
      .regex(thaiPhoneRegex, "กรุณากรอกเบอร์โทรศัพท์ที่ถูกต้อง (9-15 หลัก)")
      .optional(),
    national_id: z
      .string()
      .trim()
      .max(20, "รหัสประจำตัว/รหัสแผงต้องไม่เกิน 20 ตัวอักษร")
      .nullable()
      .optional()
      .transform((v) =>
        v === undefined ? undefined : v && v.length > 0 ? v : null
      ),
    notes: z
      .string()
      .trim()
      .max(500, "หมายเหตุต้องไม่เกิน 500 ตัวอักษร")
      .nullable()
      .optional()
      .transform((v) =>
        v === undefined ? undefined : v && v.length > 0 ? v : null
      ),
    status: z.enum(["active", "suspended"]).optional(),
  })
  .refine(
    (data) => Object.values(data).some((v) => v !== undefined),
    "กรุณาระบุข้อมูลที่ต้องการแก้ไขอย่างน้อย 1 รายการ"
  );

export const createTransactionSchema = z.object({
  saver_id: z.string().uuid("รหัสอ้างอิงผู้ฝากไม่ถูกต้อง"),
  type: z.enum(["deposit", "withdraw"], {
    message: "ประเภทรายการต้องเป็น deposit หรือ withdraw",
  }),
  amount_baht: z
    .union([z.number(), z.string()])
    .transform((val, ctx) => {
      try {
        return bahtToSatang(val);
      } catch (err) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message:
            err instanceof Error ? err.message : "จำนวนเงินไม่ถูกต้อง",
        });
        return z.NEVER;
      }
    }),
  transaction_date: z
    .string()
    .datetime({ offset: true, message: "รูปแบบวันที่ไม่ถูกต้อง" })
    .nullable()
    .optional()
    .transform((v) => v ?? undefined),
  note: z
    .string()
    .trim()
    .max(300, "หมายเหตุต้องไม่เกิน 300 ตัวอักษร")
    .nullable()
    .optional()
    .transform((v) => (v && v.length > 0 ? v : null)),
});

export type LoginInput = z.infer<typeof loginSchema>;
export type CreateSaverInput = z.infer<typeof createSaverSchema>;
export type UpdateSaverInput = z.infer<typeof updateSaverSchema>;
export type CreateTransactionInput = z.infer<typeof createTransactionSchema>;
