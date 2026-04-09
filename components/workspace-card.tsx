"use client";

import Link from "next/link";
import { getGradientByName } from "@/lib/workspace-gradients";

interface WorkspaceCardProps {
  id: string;
  name: string;
  description: string | null;
  backgroundGradient: string | null;
  boardCount: number;
  memberCount: number;
}

export function WorkspaceCard({
  id,
  name,
  description,
  backgroundGradient,
  boardCount,
  memberCount,
}: WorkspaceCardProps) {
  const gradient = backgroundGradient
    ? getGradientByName(backgroundGradient)
    : getGradientByName("ocean-dive");

  return (
    <Link
      href={`/workspaces/${id}`}
      className="group relative block h-[150px] rounded-xl overflow-hidden shadow-lg transition-all duration-200 hover:shadow-xl hover:scale-[1.02]"
    >
      {/* Fundo com gradiente */}
      <div
        className="absolute inset-0 transition-all duration-200 group-hover:brightness-75"
        style={{ background: gradient.css }}
      />

      {/* Overlay escuro sutil */}
      <div className="absolute inset-0 bg-black/20" />

      {/* Conteudo */}
      <div className="relative z-10 h-full flex flex-col justify-between p-4">
        {/* Topo: nome */}
        <h3 className="text-lg font-semibold text-white leading-tight line-clamp-2 drop-shadow-sm">
          {name}
        </h3>

        {/* Base: descricao (aparece no hover) + contagem */}
        <div className="flex flex-col gap-1">
          {description && (
            <p className="text-xs text-white/0 group-hover:text-white/80 line-clamp-2 transition-all duration-200 -translate-y-2 group-hover:translate-y-0">
              {description}
            </p>
          )}
          <div className="flex items-center gap-3 text-xs text-white/60">
            <span className="flex items-center gap-1">
              <svg
                className="w-3.5 h-3.5"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
                strokeWidth={2}
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M3.75 6A2.25 2.25 0 016 3.75h2.25A2.25 2.25 0 0110.5 6v2.25a2.25 2.25 0 01-2.25 2.25H6a2.25 2.25 0 01-2.25-2.25V6zM3.75 15.75A2.25 2.25 0 016 13.5h2.25a2.25 2.25 0 012.25 2.25V18a2.25 2.25 0 01-2.25 2.25H6A2.25 2.25 0 013.75 18v-2.25zM13.5 6a2.25 2.25 0 012.25-2.25H18A2.25 2.25 0 0120.25 6v2.25A2.25 2.25 0 0118 10.5h-2.25a2.25 2.25 0 01-2.25-2.25V6z"
                />
              </svg>
              {boardCount} board{boardCount !== 1 ? "s" : ""}
            </span>
            <span className="flex items-center gap-1">
              <svg
                className="w-3.5 h-3.5"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
                strokeWidth={2}
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M15 19.128a9.38 9.38 0 002.625.372 9.337 9.337 0 004.121-.952 4.125 4.125 0 00-7.533-2.493M15 19.128v-.003c0-1.113-.285-2.16-.786-3.07M15 19.128v.106A12.318 12.318 0 018.624 21c-2.331 0-4.512-.645-6.374-1.766l-.001-.109a6.375 6.375 0 0111.964-3.07M12 6.375a3.375 3.375 0 11-6.75 0 3.375 3.375 0 016.75 0zm8.25 2.25a2.625 2.625 0 11-5.25 0 2.625 2.625 0 015.25 0z"
                />
              </svg>
              {memberCount} membro{memberCount !== 1 ? "s" : ""}
            </span>
          </div>
        </div>
      </div>
    </Link>
  );
}
