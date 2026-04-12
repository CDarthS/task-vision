import { getCachedCurrentUser } from "@/lib/auth/get-current-user";
import { prisma } from "@/lib/prisma";
import { redirect } from "next/navigation";
import { WorkspaceCard } from "@/components/workspace-card";
import { CreateWorkspaceModal } from "@/components/create-workspace-modal";

export default async function DashboardPage() {
  const user = await getCachedCurrentUser();

  if (!user) {
    redirect("/login");
  }

  const workspaces = await prisma.workspace.findMany({
    where: {
      OR: [
        { ownerId: user.id },
        { members: { some: { userId: user.id } } },
      ],
    },
    include: {
      _count: {
        select: {
          boards: true,
          members: true,
        },
      },
    },
    orderBy: { createdAt: "desc" },
  });

  return (
    <div className="max-w-6xl mx-auto px-6 py-10">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold text-white">
            Bem-vindo, {user.name}!
          </h1>
          <p className="text-slate-400 mt-1">
            {workspaces.length > 0
              ? `${workspaces.length} workspace${workspaces.length !== 1 ? "s" : ""}`
              : "Crie seu primeiro workspace para comecar"}
          </p>
        </div>
        <CreateWorkspaceModal />
      </div>

      {/* Grid de Workspaces */}
      {workspaces.length > 0 ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {workspaces.map((ws) => (
            <WorkspaceCard
              key={ws.id}
              id={ws.id}
              name={ws.name}
              description={ws.description}
              backgroundGradient={ws.backgroundGradient}
              boardCount={ws._count.boards}
              memberCount={ws._count.members}
            />
          ))}
        </div>
      ) : (
        /* Empty state */
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
          <p className="text-slate-400 text-sm mb-6">
            Workspaces sao areas de trabalho onde voce organiza seus boards e
            cards kanban.
          </p>
          <CreateWorkspaceModal />
        </div>
      )}
    </div>
  );
}
