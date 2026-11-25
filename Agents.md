# Agents.md - จดเงินออมตลาด

## บทบาทของ AI Agents ในการพัฒนาโปรเจกต์นี้

เอกสารนี้กำหนดแนวทางให้ AI Agents (เช่น Grok, Cursor Agent, Claude, etc.) ทำงานร่วมกันในการพัฒนา **จดเงินออมตลาด**

## หลักการทำงานของ Agent

1. **อ่านเอกสารก่อนเสมอ**: Product.md → Design.md → Plan.md
2. **ทำตามลำดับใน Plan.md**
3. **อัปเดต Progress-Tracker.md ทุกครั้งที่ทำงานเสร็จ**
4. **เขียนโค้ดให้สะอาดและมี TypeScript เต็มรูปแบบ**
5. **รองรับภาษาไทยในทุกส่วนของ UI**

## Agent Roles

### 1. Architect Agent
**หน้าที่**:
- ออกแบบ Database Schema
- กำหนดโครงสร้างโฟลเดอร์
- ตัดสินใจเรื่อง Tech Stack
- Review สถาปัตยกรรม

**Prompt เริ่มต้น**:
```
คุณเป็น Architect ของโปรเจกต์จดเงินออมตลาด
อ่าน Product.md และ Design.md แล้วออกแบบ Database Schema ที่สมบูรณ์
พร้อมกับโครงสร้างโฟลเดอร์ของ Next.js
```

### 2. Frontend Agent
**หน้าที่**:
- สร้าง UI Components
- ทำหน้า Dashboard, รายการผู้ฝาก, Form ฝาก-ถอน
- ทำให้ Responsive
- ใช้ Tailwind + shadcn/ui

**Prompt เริ่มต้น**:
```
คุณเป็น Frontend Developer ของจดเงินออมตลาด
สร้างหน้า [ชื่อหน้า] ตาม Design.md
ใช้ Next.js App Router + Tailwind + shadcn/ui
รองรับทั้ง Desktop และ Mobile
```

### 3. Backend Agent
**หน้าที่**:
- สร้าง API Routes
- จัดการ Business Logic (คำนวณยอด, ตรวจสอบยอดถอน)
- Validation
- เชื่อมต่อ Database

### 4. QA Agent
**หน้าที่**:
- เขียน Test Cases
- ทดสอบ Edge Cases (ถอนเกินยอด, ข้อมูลซ้ำ, ฯลฯ)
- ตรวจสอบ UX Flow

## แนวทางการเขียนโค้ด

### Naming Convention
- Component: `PascalCase` (เช่น `SaverCard.tsx`)
- Function: `camelCase`
- Database Table: `snake_case`
- ตัวแปรภาษาไทย: ใช้ภาษาอังกฤษในโค้ด แต่แสดงภาษาไทยใน UI

### โครงสร้างโฟลเดอร์แนะนำ
```
src/
├── app/
│   ├── (auth)/
│   ├── dashboard/
│   ├── savers/
│   └── api/
├── components/
│   ├── ui/          # shadcn
│   ├── savers/
│   └── transactions/
├── lib/
│   ├── db.ts
│   └── utils.ts
└── types/
```

## Checklist ก่อน Commit
- [ ] TypeScript ไม่มี Error
- [ ] รองรับภาษาไทย
- [ ] Responsive บน Mobile
- [ ] มี Loading และ Error State
- [ ] อัปเดต Progress-Tracker.md แล้ว
