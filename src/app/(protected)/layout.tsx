import { redirect } from "next/navigation";
import { getAuthState } from "@/lib/auth";
import { AppShell } from "@/components/layout/AppShell";

export const dynamic = "force-dynamic";

export default async function ProtectedLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const state = await getAuthState();

  if (state.status !== "active") {
    if (state.status === "unauthenticated") {
      redirect("/login");
    }
    redirect(`/login?reason=${state.status}`);
  }

  return <AppShell staff={state.profile}>{children}</AppShell>;
}
