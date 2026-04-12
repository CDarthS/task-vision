import { redirect } from "next/navigation";
import { getCachedCurrentUser } from "@/lib/auth/get-current-user";
import { DashboardNav } from "@/components/dashboard-nav";

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const user = await getCachedCurrentUser();

  if (!user) {
    redirect("/login");
  }

  return (
    <div className="min-h-screen bg-slate-950 flex flex-col">
      <DashboardNav user={user} />
      <main className="flex-1">{children}</main>
    </div>
  );
}
