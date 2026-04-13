"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

interface MemberItem {
  id: string;
  role: string;
  user: {
    id: string;
    name: string;
    email: string;
    image?: string | null;
  };
}

interface WorkspaceMembersProps {
  workspaceId: string;
  members: MemberItem[];
  ownerId: string;
  canManage?: boolean;
}

export function WorkspaceMembers({ workspaceId, members: initialMembers, ownerId, canManage = false }: WorkspaceMembersProps) {
  const router = useRouter();
  
  const sortMembers = (mList: MemberItem[]) => {
    const roleOrder: Record<string, number> = { OWNER: 0, ADMIN: 1, MEMBER: 2 };
    return [...mList].sort((a, b) => (roleOrder[a.role] ?? 99) - (roleOrder[b.role] ?? 99));
  };
  
  const [members, setMembers] = useState(() => sortMembers(initialMembers));
  const [showAddForm, setShowAddForm] = useState(false);
  const [email, setEmail] = useState("");
  const [adding, setAdding] = useState(false);
  const [error, setError] = useState("");
  const [removingId, setRemovingId] = useState<string | null>(null);
  const [confirmRemoveId, setConfirmRemoveId] = useState<string | null>(null);

  async function handleAddMember(e: React.FormEvent) {
    e.preventDefault();
    if (!email.trim() || adding) return;
    setError("");
    setAdding(true);

    try {
      const res = await fetch(`/api/workspaces/${workspaceId}/members`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: email.trim() }),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error || "Erro ao adicionar membro");
        return;
      }

      setMembers((prev) => sortMembers([...prev, data.member]));
      setEmail("");
      setShowAddForm(false);
      router.refresh();
    } catch {
      setError("Erro de conexao");
    } finally {
      setAdding(false);
    }
  }

  async function handleRemoveMember(userId: string) {
    setRemovingId(userId);
    try {
      const res = await fetch(`/api/workspaces/${workspaceId}/members`, {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId }),
      });

      if (res.ok) {
        setMembers((prev) => prev.filter((m) => m.user.id !== userId));
        router.refresh();
      }
    } catch {
      // silently fail
    } finally {
      setRemovingId(null);
      setConfirmRemoveId(null);
    }
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-xl font-semibold text-white">Membros</h2>
        {canManage && (
          <button
            onClick={() => { setShowAddForm(!showAddForm); setError(""); }}
            className="px-4 py-2 text-sm font-medium rounded-full bg-gradient-to-r from-indigo-500 to-violet-600 hover:from-indigo-600 hover:to-violet-700 text-white transition-all cursor-pointer"
          >
            + Adicionar Membro
          </button>
        )}
      </div>

      {/* Formulario de adicionar membro */}
      {showAddForm && (
        <div className="mb-4 p-4 bg-white/5 border border-white/10 rounded-xl">
          <form onSubmit={handleAddMember} className="flex items-end gap-3">
            <div className="flex-1">
              <label className="block text-sm text-slate-400 mb-1">Email do usuario</label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="usuario@email.com"
                className="w-full px-3 py-2 bg-white/5 border border-white/10 text-white rounded-lg text-sm outline-none focus:border-violet-400 focus:ring-1 focus:ring-violet-400/30 placeholder:text-slate-500"
                autoFocus
                required
              />
            </div>
            <button
              type="submit"
              disabled={adding || !email.trim()}
              className="px-4 py-2 bg-violet-600 text-white text-sm rounded-lg hover:bg-violet-700 transition-colors disabled:opacity-50 cursor-pointer"
            >
              {adding ? "Adicionando..." : "Adicionar"}
            </button>
            <button
              type="button"
              onClick={() => { setShowAddForm(false); setError(""); setEmail(""); }}
              className="px-3 py-2 text-slate-400 hover:text-white text-sm transition-colors cursor-pointer"
            >
              Cancelar
            </button>
          </form>
          {error && (
            <div className="mt-2 px-3 py-2 bg-red-500/10 border border-red-500/20 text-red-400 text-sm rounded-lg">
              {error}
            </div>
          )}
        </div>
      )}

      {/* Lista de membros */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
        {members.map((member) => {
          const isOwner = member.user.id === ownerId;
          const isConfirming = confirmRemoveId === member.user.id;
          const isRemoving = removingId === member.user.id;
          return (
            <div
              key={member.id}
              className="flex items-center gap-3 bg-white/5 border border-white/10 rounded-xl px-4 py-3"
            >
              <div className="w-9 h-9 rounded-full bg-gradient-to-br from-indigo-500 to-violet-600 flex items-center justify-center text-sm font-medium text-white shrink-0 overflow-hidden shadow-sm">
                {member.user.image ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={member.user.image} alt={member.user.name} className="w-full h-full object-cover" />
                ) : (
                  member.user.name.charAt(0).toUpperCase()
                )}
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-sm font-medium text-white truncate">
                  {member.user.name}
                </p>
                <p className="text-xs text-slate-400 truncate">
                  {member.role === "OWNER" ? "Admin" : member.role === "ADMIN" ? "Admin" : "Membro"}
                </p>
              </div>
              {/* Botao remover — nao mostra para o dono, só se canManage for true */}
              {canManage && !isOwner && (
                <div className="shrink-0">
                  {isConfirming ? (
                    <div className="flex items-center gap-1">
                      <button
                        onClick={() => handleRemoveMember(member.user.id)}
                        disabled={isRemoving}
                        className="px-2 py-1 text-xs bg-red-500/20 text-red-400 hover:bg-red-500/30 rounded transition-colors cursor-pointer disabled:opacity-50"
                      >
                        {isRemoving ? "..." : "Sim"}
                      </button>
                      <button
                        onClick={() => setConfirmRemoveId(null)}
                        className="px-2 py-1 text-xs text-slate-400 hover:text-white rounded transition-colors cursor-pointer"
                      >
                        Nao
                      </button>
                    </div>
                  ) : (
                    <button
                      onClick={() => setConfirmRemoveId(member.user.id)}
                      title="Remover membro"
                      className="px-2 py-1 text-xs text-slate-500 hover:text-red-400 hover:bg-red-500/10 rounded transition-all cursor-pointer"
                    >
                      Remover
                    </button>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
