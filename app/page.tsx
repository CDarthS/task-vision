// app/page.tsx — Página inicial do Task Vision
// Server Component que mostra o status do banco de dados
// Referência: inspirado no conceito kanban do Planka, mas escrito do zero

import { prisma } from "@/lib/prisma";

async function getDatabaseStatus(): Promise<{
  connected: boolean;
  userCount: number;
  error?: string;
}> {
  try {
    const userCount = await prisma.user.count();
    return { connected: true, userCount };
  } catch (err) {
    const raw = err instanceof Error ? err.message : "Erro desconhecido";
    // Simplificar mensagem técnica para o usuário
    const message = raw.length > 100 ? raw.slice(0, 100) + "…" : raw;
    return { connected: false, userCount: 0, error: message };
  }
}

export default async function HomePage() {
  const dbStatus = await getDatabaseStatus();

  return (
    <main className="flex-1 flex items-center justify-center bg-gradient-to-br from-slate-950 via-slate-900 to-indigo-950 relative overflow-hidden">
      {/* Decoração de fundo — círculos difusos */}
      <div className="absolute top-[-20%] left-[-10%] w-[500px] h-[500px] bg-indigo-500/10 rounded-full blur-3xl" />
      <div className="absolute bottom-[-20%] right-[-10%] w-[600px] h-[600px] bg-violet-500/10 rounded-full blur-3xl" />

      <div className="relative z-10 text-center px-6 max-w-2xl">
        {/* Logo / Ícone */}
        <div className="mx-auto mb-8 w-20 h-20 rounded-2xl bg-gradient-to-br from-indigo-500 to-violet-600 flex items-center justify-center shadow-lg shadow-indigo-500/25">
          <svg
            className="w-10 h-10 text-white"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
            strokeWidth={2}
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2"
            />
          </svg>
        </div>

        {/* Título */}
        <h1 className="text-5xl sm:text-6xl font-bold text-white mb-4 tracking-tight">
          Task{" "}
          <span className="bg-gradient-to-r from-indigo-400 to-violet-400 bg-clip-text text-transparent">
            Vision
          </span>
        </h1>

        {/* Subtítulo */}
        <p className="text-lg sm:text-xl text-slate-400 mb-10">
          Esqueleto vivo — Fase 1 ✅
        </p>

        {/* Card de Status */}
        <div className="bg-white/5 backdrop-blur-sm border border-white/10 rounded-2xl p-6 shadow-xl">
          <h2 className="text-sm font-semibold uppercase tracking-wider text-slate-400 mb-4">
            Status do Sistema
          </h2>

          <div className="flex items-center justify-center gap-3">
            {dbStatus.connected ? (
              <>
                <span className="relative flex h-3 w-3">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
                  <span className="relative inline-flex rounded-full h-3 w-3 bg-emerald-500" />
                </span>
                <span className="text-emerald-400 font-medium">
                  🟢 Banco de dados conectado ({dbStatus.userCount} usuários)
                </span>
              </>
            ) : (
              <>
                <span className="relative flex h-3 w-3">
                  <span className="relative inline-flex rounded-full h-3 w-3 bg-red-500" />
                </span>
                <span className="text-red-400 font-medium">
                  🔴 Banco offline (configure DATABASE_URL)
                </span>
              </>
            )}
          </div>

          {!dbStatus.connected && dbStatus.error && (
            <p className="mt-3 text-xs text-slate-500 font-mono break-all">
              {dbStatus.error}
            </p>
          )}
        </div>

        {/* Info da Stack */}
        <div className="mt-8 flex flex-wrap items-center justify-center gap-3 text-xs text-slate-500">
          <span className="px-3 py-1.5 bg-white/5 rounded-full border border-white/10">
            Next.js 16
          </span>
          <span className="px-3 py-1.5 bg-white/5 rounded-full border border-white/10">
            TypeScript
          </span>
          <span className="px-3 py-1.5 bg-white/5 rounded-full border border-white/10">
            Prisma 7
          </span>
          <span className="px-3 py-1.5 bg-white/5 rounded-full border border-white/10">
            PostgreSQL
          </span>
          <span className="px-3 py-1.5 bg-white/5 rounded-full border border-white/10">
            Tailwind CSS
          </span>
        </div>

        {/* Rodapé */}
        <p className="mt-10 text-xs text-slate-600">
          Feito por Carlos • SV Digital Ltda
        </p>
      </div>
    </main>
  );
}
