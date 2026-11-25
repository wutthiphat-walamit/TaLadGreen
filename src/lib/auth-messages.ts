/**
 * Central Thai messages for authentication and authorization states.
 */

export interface AuthErrorLike {
  message?: string;
  code?: string;
  status?: number;
}

const LOGIN_REASON_MESSAGES: Record<string, string> = {
  inactive: "บัญชีเจ้าหน้าที่นี้ถูกระงับการใช้งาน กรุณาติดต่อผู้ดูแลระบบ",
  no_profile:
    "ไม่พบข้อมูลเจ้าหน้าที่สำหรับบัญชีนี้ กรุณาติดต่อผู้ดูแลระบบ",
  error: "ไม่สามารถตรวจสอบสิทธิ์การใช้งานได้ กรุณาลองใหม่อีกครั้ง",
  unconfigured: "ระบบยังไม่ได้ตั้งค่าการเชื่อมต่อฐานข้อมูล Supabase",
  session: "เซสชันหมดอายุแล้ว กรุณาเข้าสู่ระบบใหม่",
};

export function getLoginReasonMessage(reason: string | null): string | null {
  if (!reason) return null;
  return LOGIN_REASON_MESSAGES[reason] ?? null;
}

export function getLoginErrorMessage(error: AuthErrorLike): string {
  const message = (error.message ?? "").toLowerCase();

  if (
    error.code === "email_not_confirmed" ||
    message.includes("email not confirmed")
  ) {
    return "อีเมลนี้ยังไม่ได้รับการยืนยัน กรุณาตรวจสอบกล่องจดหมายแล้วลองใหม่";
  }

  if (
    error.code === "over_email_send_rate_limit" ||
    message.includes("too many") ||
    message.includes("rate limit")
  ) {
    return "พยายามเข้าสู่ระบบบ่อยเกินไป กรุณารอสักครู่แล้วลองใหม่";
  }

  if (
    message.includes("invalid login credentials") ||
    message.includes("invalid credentials")
  ) {
    return "อีเมลหรือรหัสผ่านไม่ถูกต้อง กรุณาตรวจสอบอีกครั้ง";
  }

  if (
    message.includes("fetch") ||
    message.includes("network") ||
    error.status === 0
  ) {
    return "ไม่สามารถเชื่อมต่อระบบได้ กรุณาตรวจสอบอินเทอร์เน็ตแล้วลองใหม่";
  }

  return "ไม่สามารถเข้าสู่ระบบได้ กรุณาลองใหม่อีกครั้ง";
}

export function getSessionBlockedMessage(reason?: string): string {
  return (
    LOGIN_REASON_MESSAGES[reason ?? ""] ??
    "ไม่สามารถยืนยันสิทธิ์การใช้งานได้ กรุณาลองใหม่อีกครั้ง"
  );
}
