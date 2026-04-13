import { getCachedCurrentUser } from "@/lib/auth/get-current-user";
import { redirect } from "next/navigation";

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const user = await getCachedCurrentUser();

  if (!user || user.role !== "ADMIN") {
    redirect("/");
  }

  return <>{children}</>;
}
