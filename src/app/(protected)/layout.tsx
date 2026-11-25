import { redirect } from "next/navigation";
import { getCurrentStaff } from "@/lib/auth";
import { AppShell } from "@/components/layout/AppShell";

export const dynamic = "force-dynamic";

export default async function ProtectedLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const staff = await getCurrentStaff();
  if (!staff) {
    redirect("/login");
  }

  return <AppShell staff={staff}>{children}</AppShell>;
}
