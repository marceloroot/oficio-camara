import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"


import { Sidebar } from "@/components/layout/siderbar";
import { Header } from "@/components/layout/header";
import { redirect } from "next/navigation";
import type { menuByRole } from "@/lib/permissions";

export const dynamic = "force-dynamic";

export default async function ProtectedLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await getServerSession(authOptions)
  if (!session) {
    redirect("/login");
  }

  const role =
    ((session.user as unknown) as { role?: keyof typeof menuByRole })?.role ?? ("MASTER" as keyof typeof menuByRole);
  const nome = session.user?.name ?? "Usuário";
  const cookieStore = await import("next/headers").then(mod => mod.cookies());
  const collapsed = cookieStore.get("sidebar-collapsed")?.value === "true"
  return (
    <div className="flex min-h-screen bg-muted/30">
      <Sidebar role={role} defaultCollapsed={collapsed}/>
      <div className="flex min-w-0 flex-1 flex-col">
        <Header />
        <main className="min-w-0 p-6">{children}</main>
      </div>
    </div>
  );
}
