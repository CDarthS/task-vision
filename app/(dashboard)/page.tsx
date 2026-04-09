import { getCurrentUser } from "@/lib/auth/get-current-user";
import { redirect } from "next/navigation";

export default async function DashboardPage() {
  const user = await getCurrentUser();

  if (!user) {
    redirect("/login");
  }

  return (
    <div className="max-w-6xl mx-auto px-6 py-10">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-white">
          Bem-vindo, {user.name}!
        </h1>
        <p className="text-slate-400 mt-2">
          Gerencie seus projetos com quadros kanban colaborativos.
        </p>
      </div>

      {/* Placeholder para workspaces */}
      <div className="bg-white/5 border border-white/10 rounded-2xl p-12 text-center">
        <div className="mx-auto mb-4 w-16 h-16 rounded-2xl bg-indigo-500/10 flex items-center justify-center">
          <svg
            className="w-8 h-8 text-indigo-400"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
            strokeWidth={1.5}
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M2.25 7.125C2.25 6.504 2.754 6 3.375 6h6c.621 0 1.125.504 1.125 1.125v3.75c0 .621-.504 1.125-1.125 1.125h-6a1.125 1.125 0 01-1.125-1.125v-3.75zM14.25 8.625c0-.621.504-1.125 1.125-1.125h5.25c.621 0 1.125.504 1.125 1.125v8.25c0 .621-.504 1.125-1.125 1.125h-5.25a1.125 1.125 0 01-1.125-1.125v-8.25zM3.75 16.125c0-.621.504-1.125 1.125-1.125h5.25c.621 0 1.125.504 1.125 1.125v2.25c0 .621-.504 1.125-1.125 1.125h-5.25a1.125 1.125 0 01-1.125-1.125v-2.25z"
            />
          </svg>
        </div>
        <h2 className="text-lg font-semibold text-white mb-2">
          Nenhum workspace ainda
        </h2>
        <p className="text-slate-400 text-sm">
          Workspaces e boards estarão disponíveis na Fase 3.
        </p>
      </div>
    </div>
  );
}
