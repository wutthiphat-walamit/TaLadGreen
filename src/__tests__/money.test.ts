import { describe, it, expect } from "vitest";
import {
  bahtToSatang,
  satangToBaht,
  calculateBalanceSatang,
  canWithdraw,
  formatBaht,
  formatSatangAsBaht,
  MAX_TRANSACTION_BAHT,
} from "@/lib/money";

describe("Financial calculations (satang precision)", () => {
  it("converts Baht strings and numbers to integer satang without floating-point drift", () => {
    expect(bahtToSatang("0.1")).toBe(10);
    expect(bahtToSatang("0.2")).toBe(20);
    expect(bahtToSatang("0.1") + bahtToSatang("0.2")).toBe(30);
    expect(bahtToSatang("1,250.50")).toBe(125050);
    expect(bahtToSatang(500)).toBe(50000);
    expect(satangToBaht(125050)).toBe(1250.5);
  });

  it("rejects zero, negative, malformed, or >2 decimal place amounts", () => {
    expect(() => bahtToSatang(0)).toThrow();
    expect(() => bahtToSatang("0")).toThrow();
    expect(() => bahtToSatang("-100")).toThrow();
    expect(() => bahtToSatang("10.123")).toThrow();
    expect(() => bahtToSatang("abc")).toThrow();
    expect(() => bahtToSatang(MAX_TRANSACTION_BAHT + 1)).toThrow();
  });

  it("computes deterministic balance = total deposits - total withdrawals", () => {
    const balance = calculateBalanceSatang([
      { type: "deposit", amount_satang: 100000 },
      { type: "deposit", amount_satang: 50025 },
      { type: "withdraw", amount_satang: 30000 },
      { type: "withdraw", amount_satang: 25 },
    ]);
    expect(balance).toBe(120000);
  });

  it("prevents over-withdrawal even by 1 satang and allows exact full withdrawal", () => {
    expect(canWithdraw(50000, 50000)).toBe(true);
    expect(canWithdraw(50000, 50001)).toBe(false);
    expect(canWithdraw(0, 1)).toBe(false);
    expect(canWithdraw(50000, 0)).toBe(false);
    expect(canWithdraw(50000, -100)).toBe(false);
  });

  it("formats Baht and satang with Thai comma grouping and 2 decimal places", () => {
    expect(formatBaht(1250.5)).toBe("1,250.50");
    expect(formatSatangAsBaht(123456789)).toBe("1,234,567.89");
    expect(formatSatangAsBaht(0)).toBe("0.00");
  });
});
