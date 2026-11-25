import type { Metadata } from "next";
import { Sarabun, Noto_Sans_Thai } from "next/font/google";
import { Toaster } from "sonner";
import "./globals.css";

const sarabun = Sarabun({
  subsets: ["thai", "latin"],
  weight: ["400", "500", "600", "700"],
  variable: "--font-sarabun",
  display: "swap",
});

const notoSansThai = Noto_Sans_Thai({
  subsets: ["thai", "latin"],
  weight: ["400", "500", "600", "700"],
  variable: "--font-noto-sans-thai",
  display: "swap",
});

export const metadata: Metadata = {
  title: "จดเงินออมตลาด — ระบบสมุดออมเงินดิจิทัล",
  description: "ระบบบันทึกและติดตามการออมเงินของสมาชิกในตลาด รวดเร็ว แม่นยำ ตรวจสอบได้",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="th" className={`${sarabun.variable} ${notoSansThai.variable}`}>
      <body className="min-h-screen bg-[#F8FAFC] text-[#1E2937] font-sans">
        {children}
        <Toaster position="top-right" richColors closeButton />
      </body>
    </html>
  );
}
