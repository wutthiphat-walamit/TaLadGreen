# Plan.md - จดเงินออมตลาด

## แผนการพัฒนา

### Phase 1: Foundation (สัปดาห์ที่ 1)
**เป้าหมาย**: โครงสร้างพื้นฐานพร้อมใช้งาน

| งาน | รายละเอียด | สถานะ |
|-----|-----------|-------|
| Setup Project | Next.js + TypeScript + Tailwind + shadcn | ⬜ |
| Database Schema | ออกแบบตาราง Users, Savers, Transactions | ⬜ |
| Authentication | Login/Logout + Role | ⬜ |
| Layout หลัก | Sidebar + Header + Responsive | ⬜ |

### Phase 2: Core Features (สัปดาห์ที่ 2-3)
**เป้าหมาย**: บันทึกและติดตามการออมได้จริง

| งาน | รายละเอียด | สถานะ |
|-----|-----------|-------|
| CRUD ผู้ฝาก | เพิ่ม/แก้ไข/ลบ/ค้นหา | ⬜ |
| บันทึกฝาก-ถอน | Form + Validation + คำนวณยอด | ⬜ |
| ประวัติรายการ | Timeline / Table | ⬜ |
| Dashboard | สรุปยอดและรายการล่าสุด | ⬜ |

### Phase 3: Reports & Polish (สัปดาห์ที่ 4)
**เป้าหมาย**: ใช้งานจริงได้และสวยงาม

| งาน | รายละเอียด | สถานะ |
|-----|-----------|-------|
| รายงาน | Export Excel/PDF | ⬜ |
| Responsive | ทดสอบบน Mobile | ⬜ |
| UX Improvements | Loading, Toast, Confirmation | ⬜ |
| Testing | ทดสอบการใช้งานจริง | ⬜ |

### Phase 4: Enhancement (หลัง Launch)
- ระบบผู้ฝากดูยอดเอง
- แจ้งเตือน
- ดอกเบี้ย
- Multi-tenant

## Timeline สรุป

```
สัปดาห์ 1: Foundation
สัปดาห์ 2: ผู้ฝาก + บันทึกรายการ
สัปดาห์ 3: ประวัติ + Dashboard
สัปดาห์ 4: รายงาน + Polish + Deploy
```

## ลำดับความสำคัญ (MoSCoW)

**Must Have (MVP)**
- Login
- จัดการผู้ฝาก
- ฝาก/ถอนเงิน
- ดูยอดและประวัติ
- ค้นหา

**Should Have**
- Dashboard สรุป
- Export รายงาน
- Responsive ดี

**Could Have**
- รูปถ่ายผู้ฝาก
- กราฟ
- Dark mode

**Won't Have (ตอนนี้)**
- ดอกเบี้ยอัตโนมัติ
- แอปมือถือ Native
- เชื่อมต่อธนาคาร

## ความเสี่ยงและการจัดการ

| ความเสี่ยง | ผลกระทบ | วิธีจัดการ |
|-----------|---------|-----------|
| ข้อมูลผิดพลาด | สูง | มี Confirmation + Audit Log |
| ใช้งานยาก | กลาง | ออกแบบให้เรียบง่าย, ทดสอบกับผู้ใช้จริง |
| ข้อมูลสูญหาย | สูง | Backup อัตโนมัติ + Transaction Log |
