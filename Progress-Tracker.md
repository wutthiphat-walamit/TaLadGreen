# Progress-Tracker.md - จดเงินออมตลาด

> อัปเดตล่าสุด: 25 พฤศจิกายน 2026  
> สถานะโครงการ: 🟢 MVP v1.0 Deployed — Refactor Completed (25 พ.ย. 2026)

## สรุปความคืบหน้า

| Phase | งานทั้งหมด | เสร็จแล้ว | คงเหลือ | % |
|-------|-----------|----------|---------|---|
| Phase 1: Foundation | 4 | 4 | 0 | 100% |
| Phase 2: Core Features | 4 | 4 | 0 | 100% |
| Phase 3: Reports & Polish | 4 | 3 | 1 | 75% |
| **รวม** | **12** | **11** | **1** | **92%** |

> หมายเหตุ: งาน "ระบบรายงานและ Export" (Excel/PDF) ถูกตัดออกจากขอบเขต MVP v1.0 ตาม Strict Scope Approval; ตัวแอปถูก deploy แล้วโดยเจ้าของโครงการ และรอบล่าสุดได้ refactor โครงสร้างพร้อมแก้ redirect loop (ดูบันทึกการทำงานด้านล่าง)

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
- [x] Testing (`typecheck`, `eslint`, `vitest`: 10 files / 38 tests ผ่านทั้งหมด + `next build` — Deploy ดำเนินการโดยเจ้าของโครงการแล้ว)

## บันทึกการทำงาน

### 25 พ.ย. 2026
- สร้างเอกสาร Product, Design, Plan, Progress-Tracker, Agents, Skill
- ตรวจสอบ Pre-Implementation และรับการอนุมัติแนวทางจากเจ้าของโครงการ (Supabase + RLS, Single-market Shared Ledger, Initials Avatar, Role `admin`/`staff`)
- พัฒนาแอป Next.js 15 + TypeScript (strict) + Tailwind v4 + UI Primitives ธีม Teal (`#0F766E`)
- เขียน SQL Migration `supabase/migrations/0001_initial_schema.sql` พร้อม `saver_balances` view (`security_invoker`), `record_transaction` atomic RPC (`SECURITY DEFINER`, `FOR UPDATE`), และ strict RLS
- รัน Independent Security & Code Review และแก้ไขประเด็น P1 (ปิด direct INSERT บน `transactions`, ตั้ง default `is_active = false` ใน `private.handle_new_auth_user()`) และ P2 (ARIA labels, search sanitization)
- ยืนยัน `npm run typecheck`, `npm run lint`, `npm test` (20/20 passed), และ `npm run build`

### 25 พ.ย. 2026 (Refactor รอบที่ 2)
- แยก API client กลาง (`src/lib/api-client.ts`) พร้อม timeout/abort, จัดการ error ภาษาไทย, และ redirect เมื่อเซสชันหมดอายุ
- เพิ่ม hooks กลาง (`use-api-resource`, `use-debounced-value`) และ UI primitives (`ErrorAlert`, `PageHeader`, `FilterTabs`, `ButtonLink`) เพื่อลดโค้ดซ้ำในหน้า dashboard/savers/transactions/saver detail
- แก้ redirect loop ของบัญชี `inactive` / `no_profile` ด้วย `getAuthState` + `/api/auth/session` และปรับ middleware ไม่ให้ redirect `/login` เอง
- Refactor Dialog ให้มี focus trap, focus restoration, scroll lock, และ `aria-labelledby` / `aria-describedby`
- เปลี่ยน `<Link><Button>` เป็น `ButtonLink` เพื่อตัด markup `<a><button>` ที่ไม่ถูกต้องตามมาตรฐาน HTML และปรับโครงสร้าง modal ให้เข้าถึงได้ง่ายขึ้น
- เพิ่ม regression tests: middleware redirect loop, auth state, session route, API client, useApiResource
- ยืนยัน `npm run typecheck`, `npm run lint`, `npm test` (38/38 passed), และ `npm run build` ผ่านทั้งหมด; ไม่มีการเปลี่ยน schema/DB migration

---

## วิธีใช้งาน Tracker นี้
1. เมื่อทำงานเสร็จ ให้เปลี่ยน `[ ]` เป็น `[x]`
2. อัปเดตตารางสรุปด้านบน
3. เพิ่มบันทึกในส่วน "บันทึกการทำงาน"
4. เปลี่ยนสถานะโครงการตามความเหมาะสม:
   - 🔴 ยังไม่เริ่ม
   - 🟡 กำลังทำ
   - 🟢 เสร็จสิ้น
