"use client";

import * as React from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  LayoutDashboard,
  Users,
  ArrowLeftRight,
  Search,
  LogOut,
  Menu,
  X,
  Wallet,
  ShieldCheck,
} from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import type { StaffProfile } from "@/types/database";

interface AppShellProps {
  staff: StaffProfile;
  children: React.ReactNode;
}

const NAV_ITEMS = [
  {
    href: "/dashboard",
    label: "แดชบอร์ด",
    icon: LayoutDashboard,
  },
  {
    href: "/savers",
    label: "ผู้ฝากเงิน",
    icon: Users,
  },
  {
    href: "/transactions",
    label: "บันทึกรายการ",
    icon: ArrowLeftRight,
  },
];

/**
 * Desktop-first application shell with sidebar, top search bar, and mobile nav.
 */
export function AppShell({ staff, children }: AppShellProps) {
  const pathname = usePathname();
  const router = useRouter();
  const [searchTerm, setSearchTerm] = React.useState("");
  const [mobileMenuOpen, setMobileMenuOpen] = React.useState(false);
  const [loggingOut, setLoggingOut] = React.useState(false);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = searchTerm.trim();
    if (!trimmed) {
      router.push("/savers");
      return;
    }
    router.push(`/savers?q=${encodeURIComponent(trimmed)}`);
    setMobileMenuOpen(false);
  };

  const handleLogout = async () => {
    setLoggingOut(true);
    try {
      const response = await fetch("/api/auth/logout", { method: "POST" });
      if (!response.ok) {
        throw new Error("Logout failed");
      }
      toast.success("ออกจากระบบเรียบร้อยแล้ว");
      router.push("/login");
      router.refresh();
    } catch {
      toast.error("ไม่สามารถออกจากระบบได้ กรุณาลองใหม่");
      setLoggingOut(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#F8FAFC] text-[#1E2937] flex flex-col lg:flex-row">
      {/* Desktop Sidebar */}
      <aside className="hidden lg:flex lg:w-64 lg:flex-col lg:fixed lg:inset-y-0 border-r border-[#E2E8F0] bg-white">
        <div className="flex h-16 items-center gap-3 border-b border-[#E2E8F0] px-6">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#0F766E] text-white shadow-sm">
            <Wallet className="h-5 w-5" />
          </div>
          <div>
            <p className="text-base font-bold leading-tight text-[#1E2937]">
              จดเงินออมตลาด
            </p>
            <p className="text-xs text-[#64748B]">สมุดออมเงินดิจิทัล</p>
          </div>
        </div>

        <nav className="flex-1 space-y-1.5 px-3 py-5" aria-label="เมนูหลัก">
          {NAV_ITEMS.map((item) => {
            const Icon = item.icon;
            const active =
              pathname === item.href || pathname.startsWith(`${item.href}/`);
            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  "flex items-center gap-3 rounded-xl px-3.5 py-2.5 text-sm font-semibold transition-colors",
                  active
                    ? "bg-[#F0FDFA] text-[#0F766E] border border-[#99F6E4]"
                    : "text-[#475569] hover:bg-[#F8FAFC] hover:text-[#1E2937]"
                )}
              >
                <Icon className="h-5 w-5 shrink-0" />
                <span>{item.label}</span>
              </Link>
            );
          })}
        </nav>

        <div className="border-t border-[#E2E8F0] p-4">
          <div className="rounded-xl bg-[#F8FAFC] border border-[#E2E8F0] p-3">
            <div className="flex items-center justify-between gap-2">
              <p className="truncate text-sm font-semibold text-[#1E2937]">
                {staff.full_name}
              </p>
              <Badge variant={staff.role === "admin" ? "default" : "neutral"}>
                {staff.role === "admin" ? "ผู้ดูแล" : "เจ้าหน้าที่"}
              </Badge>
            </div>
            <p className="mt-0.5 truncate text-xs text-[#64748B]">
              {staff.email}
            </p>
            <Button
              variant="outline"
              size="sm"
              className="mt-3 w-full justify-center"
              onClick={handleLogout}
              disabled={loggingOut}
            >
              <LogOut className="h-4 w-4" />
              {loggingOut ? "กำลังออก..." : "ออกจากระบบ"}
            </Button>
          </div>
        </div>
      </aside>

      {/* Main Content Column */}
      <div className="flex-1 lg:pl-64 flex flex-col min-h-screen pb-20 lg:pb-0">
        {/* Top Header */}
        <header className="sticky top-0 z-30 border-b border-[#E2E8F0] bg-white/95 backdrop-blur">
          <div className="flex h-16 items-center justify-between gap-3 px-4 sm:px-6 lg:px-8">
            {/* Mobile Brand + Menu Toggle */}
            <div className="flex items-center gap-2.5 lg:hidden">
              <button
                type="button"
                onClick={() => setMobileMenuOpen((prev) => !prev)}
                aria-label={mobileMenuOpen ? "ปิดเมนู" : "เปิดเมนู"}
                aria-expanded={mobileMenuOpen}
                className="rounded-lg p-2 text-[#1E2937] hover:bg-[#F1F5F9] cursor-pointer"
              >
                {mobileMenuOpen ? (
                  <X className="h-5 w-5" />
                ) : (
                  <Menu className="h-5 w-5" />
                )}
              </button>
              <Link
                href="/dashboard"
                className="flex items-center gap-2 font-bold text-[#0F766E]"
              >
                <Wallet className="h-5 w-5" />
                <span className="text-sm sm:text-base">จดเงินออมตลาด</span>
              </Link>
            </div>

            {/* Global Saver Search */}
            <form
              onSubmit={handleSearchSubmit}
              className="flex-1 max-w-xl"
              role="search"
            >
              <div className="relative">
                <Search className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-[#64748B]" />
                <input
                  type="search"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  placeholder="ค้นหาผู้ฝากด้วยชื่อ, รหัส (เช่น SV-0001) หรือเบอร์โทร..."
                  aria-label="ค้นหาผู้ฝาก"
                  className="h-10 w-full rounded-xl border border-[#E2E8F0] bg-[#F8FAFC] pl-10 pr-4 text-sm text-[#1E2937] placeholder:text-[#94A3B8] focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#0F766E] focus:border-[#0F766E]"
                />
              </div>
            </form>

            {/* Desktop User Pill */}
            <div className="hidden sm:flex items-center gap-2.5">
              <div className="flex items-center gap-1.5 rounded-full border border-[#E2E8F0] bg-[#F8FAFC] px-3 py-1.5 text-xs font-medium text-[#475569]">
                <ShieldCheck className="h-4 w-4 text-[#0F766E]" />
                <span>{staff.full_name}</span>
                <span className="text-[#94A3B8]">•</span>
                <span className="font-semibold text-[#0F766E]">
                  {staff.role === "admin" ? "Admin" : "Staff"}
                </span>
              </div>
            </div>
          </div>

          {/* Mobile Dropdown Menu */}
          {mobileMenuOpen && (
            <div className="border-t border-[#E2E8F0] bg-white px-4 py-3 lg:hidden space-y-2">
              {NAV_ITEMS.map((item) => {
                const Icon = item.icon;
                const active =
                  pathname === item.href ||
                  pathname.startsWith(`${item.href}/`);
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    onClick={() => setMobileMenuOpen(false)}
                    className={cn(
                      "flex items-center gap-3 rounded-xl px-3.5 py-2.5 text-sm font-semibold",
                      active
                        ? "bg-[#F0FDFA] text-[#0F766E]"
                        : "text-[#475569] hover:bg-[#F8FAFC]"
                    )}
                  >
                    <Icon className="h-5 w-5" />
                    <span>{item.label}</span>
                  </Link>
                );
              })}
              <div className="pt-2 border-t border-[#E2E8F0] flex items-center justify-between">
                <div className="text-xs">
                  <p className="font-semibold text-[#1E2937]">{staff.full_name}</p>
                  <p className="text-[#64748B]">{staff.email}</p>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleLogout}
                  disabled={loggingOut}
                >
                  <LogOut className="h-4 w-4" />
                  ออกจากระบบ
                </Button>
              </div>
            </div>
          )}
        </header>

        {/* Page Content */}
        <main className="flex-1 px-4 py-6 sm:px-6 lg:px-8 max-w-7xl w-full mx-auto">
          {children}
        </main>
      </div>

      {/* Mobile Bottom Navigation */}
      <nav
        aria-label="เมนูมือถือ"
        className="fixed bottom-0 inset-x-0 z-30 flex border-t border-[#E2E8F0] bg-white lg:hidden"
      >
        {NAV_ITEMS.map((item) => {
          const Icon = item.icon;
          const active =
            pathname === item.href || pathname.startsWith(`${item.href}/`);
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "flex flex-1 flex-col items-center justify-center gap-1 py-2.5 text-xs font-semibold",
                active ? "text-[#0F766E]" : "text-[#64748B]"
              )}
            >
              <Icon className="h-5 w-5" />
              <span>{item.label}</span>
            </Link>
          );
        })}
      </nav>
    </div>
  );
}
