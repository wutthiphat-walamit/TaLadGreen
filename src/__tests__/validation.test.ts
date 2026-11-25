import { describe, it, expect } from "vitest";
import {
  loginSchema,
  createSaverSchema,
  updateSaverSchema,
  createTransactionSchema,
} from "@/lib/validation";

describe("Input validation schemas", () => {
  it("validates login credentials", () => {
    expect(
      loginSchema.safeParse({
        email: "staff@market.th",
        password: "secret123",
      }).success
    ).toBe(true);

    expect(
      loginSchema.safeParse({
        email: "not-an-email",
        password: "secret123",
      }).success
    ).toBe(false);

    expect(
      loginSchema.safeParse({
        email: "staff@market.th",
        password: "123",
      }).success
    ).toBe(false);
  });

  it("validates saver creation and normalizes saver_code", () => {
    const valid = createSaverSchema.safeParse({
      saver_code: "sv-0012",
      first_name: "สมหญิง",
      last_name: "รักดี",
      phone: "081-234-5678",
    });
    expect(valid.success).toBe(true);
    if (valid.success) {
      expect(valid.data.saver_code).toBe("SV-0012");
    }

    expect(
      createSaverSchema.safeParse({
        first_name: "",
        last_name: "รักดี",
        phone: "0812345678",
      }).success
    ).toBe(false);

    expect(
      createSaverSchema.safeParse({
        first_name: "สมหญิง",
        last_name: "รักดี",
        phone: "123",
      }).success
    ).toBe(false);
  });

  it("rejects empty updateSaverSchema payloads and invalid status values", () => {
    expect(updateSaverSchema.safeParse({}).success).toBe(false);
    expect(
      updateSaverSchema.safeParse({ status: "deleted" }).success
    ).toBe(false);
    const statusOnly = updateSaverSchema.safeParse({ status: "suspended" });
    expect(statusOnly.success).toBe(true);
    if (statusOnly.success) {
      expect(statusOnly.data.national_id).toBeUndefined();
      expect(statusOnly.data.notes).toBeUndefined();
    }
  });

  it("validates transaction schema and converts Baht to integer satang", () => {
    const valid = createTransactionSchema.safeParse({
      saver_id: "550e8400-e29b-41d4-a716-446655440000",
      type: "deposit",
      amount_baht: "1,500.75",
      note: "ฝากรายวัน",
    });
    expect(valid.success).toBe(true);
    if (valid.success) {
      expect(valid.data.amount_baht).toBe(150075);
    }

    expect(
      createTransactionSchema.safeParse({
        saver_id: "invalid-uuid",
        type: "deposit",
        amount_baht: "100",
      }).success
    ).toBe(false);

    expect(
      createTransactionSchema.safeParse({
        saver_id: "550e8400-e29b-41d4-a716-446655440000",
        type: "withdraw",
        amount_baht: "-50",
      }).success
    ).toBe(false);
  });
});
