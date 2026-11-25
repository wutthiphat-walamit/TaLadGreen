# Progress-Tracker.md - จดเงินออมตลาด

> อัปเดตล่าสุด: 25 พฤศจิกายน 2026  
> สถานะโครงการ: 🟡 Ready for Supabase Provisioning & Deployment (MVP v1.0 Code & Tests Complete)

## สรุปความคืบหน้า

| Phase | งานทั้งหมด | เสร็จแล้ว | คงเหลือ | % |
|-------|-----------|----------|---------|---|
| Phase 1: Foundation | 4 | 4 | 0 | 100% |
| Phase 2: Core Features | 4 | 4 | 0 | 100% |
| Phase 3: Reports & Polish | 4 | 3 | 1 | 75% |
| **รวม** | **12** | **11** | **1** | **92%** |

> หมายเหตุ: งาน "ระบบรายงานและ Export" (Excel/PDF) ถูกตัดออกจากขอบเขต MVP v1.0 ตาม Strict Scope Approval และงาน "Deploy" รอการ Provision Supabase Project และใส่ค่า `.env.local` โดยเจ้าของโครงการ

## รายละเอียดงาน

### Phase 1: Foundation
- [x] Setup Next.js + TypeScript + Tailwind + shadcn/ui (`package.json`, `src/app/globals.css`, `src/components/ui/*`)
- [x] ออกแบบและสร้าง Database Schema (`supabase/migrations/0001_initial_schema.sql`, `supabase/seed_admin.sql`)
- [x] ระบบ Authentication (`src/app/login/page.tsx`, `src/lib/auth.ts`, `src/middleware.ts`, Role `admin` / `staff`)
- [x] Layout หลัก (`src/components/layout/AppShell.tsx` Sidebar + Header + Responsive Mobile Nav)

### Phase 2: Core Features
- [x] หน้าจัดการผู้ฝาก (`src/app/(protected)/savers/page.tsx`, `src/app/(protected)/savers/[id]/page.tsx`, `/api/savers`)
- [x] ระบบบันทึกฝาก-ถอนเงิน (`src/components/transactions/TransactionModal.tsx`, `/api/transactions`, atomic RPC `record_transaction`)
- [x] หน้าประวัติการทำรายการ (`src/app/(protected)/transactions/page.tsx` เรียงใหม่สุดก่อน)
- [x] Dashboard สรุปข้อมูล (`src/app/(protected)/dashboard/page.tsx`, `/api/dashboard`)

### Phase 3: Reports & Polish
- [ ] ระบบรายงานและ Export *(อยู่นอกขอบเขต MVP v1.0 — Phase 3)*
- [x] ปรับแต่ง Responsive สำหรับ Mobile (Desktop-first table + Mobile cards + Bottom Nav)
- [x] UX Improvements (Toast, Skeleton Loading, Confirmation 2 ขั้นตอนก่อนบันทึกรายการ)
- [x] Testing (`typecheck`, `eslint`, `vitest`: 5 files / 20 tests ผ่านทั้งหมด + `next build` — เหลือ Deploy หลัง Provision Supabase)

## บันทึกการทำงาน

### 25 พ.ย. 2026
- สร้างเอกสาร Product, Design, Plan, Progress-Tracker, Agents, Skill
- ตรวจสอบ Pre-Implementation และรับการอนุมัติแนวทางจากเจ้าของโครงการ (Supabase + RLS, Single-market Shared Ledger, Initials Avatar, Role `admin`/`staff`)
- พัฒนาแอป Next.js 15 + TypeScript (strict) + Tailwind v4 + UI Primitives ธีม Teal (`#0F766E`)
- เขียน SQL Migration `supabase/migrations/0001_initial_schema.sql` พร้อม `saver_balances` view (`security_invoker`), `record_transaction` atomic RPC (`SECURITY DEFINER`, `FOR UPDATE`), และ strict RLS
- รัน Independent Security & Code Review และแก้ไขประเด็น P1 (ปิด direct INSERT บน `transactions`, ตั้ง default `is_active = false` ใน `private.handle_new_auth_user()`) และ P2 (ARIA labels, search sanitization)
- ยืนยัน `npm run typecheck`, `npm run lint`, `npm test` (20/20 passed), และ `npm run build`

---

## วิธีใช้งาน Tracker นี้
1. เมื่อทำงานเสร็จ ให้เปลี่ยน `[ ]` เป็น `[x]`
2. อัปเดตตารางสรุปด้านบน
3. เพิ่มบันทึกในส่วน "บันทึกการทำงาน"
4. เปลี่ยนสถานะโครงการตามความเหมาะสม:
   - 🔴 ยังไม่เริ่ม
   - 🟡 กำลังทำ
   - 🟢 เสร็จสิ้น
