"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { ConfirmDialog } from "@/components/confirm-dialog";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

interface UserItem {
  id: string;
  email: string;
  username: string | null;
  name: string;
  role: string;
  isDeactivated: boolean;
  createdAt: string;
}

const roleLabels: Record<string, string> = {
  ADMIN: "Admin",
  PROJECT_OWNER: "Project Owner",
  MEMBER: "Membro",
};

const roleBadgeStyles: Record<string, string> = {
  ADMIN: "border-red-500/30 text-red-400",
  PROJECT_OWNER: "border-amber-500/30 text-amber-400",
  MEMBER: "border-indigo-500/30 text-indigo-400",
};

export default function AdminUsersPage() {
  const router = useRouter();
  const [users, setUsers] = useState<UserItem[]>([]);
  const [loading, setLoading] = useState(true);

  // --- Estado: Criar usuário ---
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [creating, setCreating] = useState(false);
  const [createError, setCreateError] = useState("");
  const [newName, setNewName] = useState("");
  const [newEmail, setNewEmail] = useState("");
  const [newUsername, setNewUsername] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [newRole, setNewRole] = useState("MEMBER");

  // --- Estado: Editar usuário ---
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<UserItem | null>(null);
  const [saving, setSaving] = useState(false);
  const [editError, setEditError] = useState("");
  const [editName, setEditName] = useState("");
  const [editEmail, setEditEmail] = useState("");
  const [editUsername, setEditUsername] = useState("");
  const [editRole, setEditRole] = useState("MEMBER");
  const [editPassword, setEditPassword] = useState("");

  const fetchUsers = useCallback(async () => {
    try {
      const res = await fetch("/api/users");
      if (res.status === 401) {
        router.push("/login");
        return;
      }
      const data = await res.json();
      setUsers(data.users || []);
    } catch {
      // ignore
    } finally {
      setLoading(false);
    }
  }, [router]);

  useEffect(() => {
    fetchUsers();
  }, [fetchUsers]);

  // --- Criar usuário ---
  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    setCreateError("");
    setCreating(true);

    try {
      const res = await fetch("/api/users", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: newName,
          email: newEmail,
          username: newUsername || undefined,
          password: newPassword,
          role: newRole,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        setCreateError(data.error || "Erro ao criar usuario");
        return;
      }

      setCreateDialogOpen(false);
      setNewName("");
      setNewEmail("");
      setNewUsername("");
      setNewPassword("");
      setNewRole("MEMBER");
      fetchUsers();
    } catch {
      setCreateError("Erro de conexao");
    } finally {
      setCreating(false);
    }
  }

  // --- Abrir modal de edição ---
  function openEditDialog(user: UserItem) {
    setEditingUser(user);
    setEditName(user.name);
    setEditEmail(user.email);
    setEditUsername(user.username ?? "");
    setEditRole(user.role);
    setEditPassword("");
    setEditError("");
    setEditDialogOpen(true);
  }

  // --- Salvar edição ---
  async function handleEdit(e: React.FormEvent) {
    e.preventDefault();
    if (!editingUser) return;
    setEditError("");
    setSaving(true);

    try {
      const body: Record<string, string> = {
        name: editName,
        email: editEmail,
        username: editUsername,
        role: editRole,
      };
      if (editPassword.trim().length > 0) {
        if (editPassword.trim().length < 6) {
          setEditError("A senha deve ter pelo menos 6 caracteres");
          return;
        }
        body.password = editPassword.trim();
      }

      const res = await fetch(`/api/users/${editingUser.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });

      const data = await res.json();

      if (!res.ok) {
        setEditError(data.error || "Erro ao salvar alterações");
        return;
      }

      setEditDialogOpen(false);
      setEditingUser(null);
      fetchUsers();
    } catch {
      setEditError("Erro de conexao");
    } finally {
      setSaving(false);
    }
  }

  // --- Ativar/Desativar ---
  async function toggleDeactivate(user: UserItem) {
    await fetch(`/api/users/${user.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ isDeactivated: !user.isDeactivated }),
    });
    fetchUsers();
  }

  // --- Deletar ---
  const [deleteTarget, setDeleteTarget] = useState<UserItem | null>(null);

  async function executeDelete() {
    if (!deleteTarget) return;
    await fetch(`/api/users/${deleteTarget.id}`, { method: "DELETE" });
    setDeleteTarget(null);
    fetchUsers();
  }

  if (loading) {
    return (
      <div className="max-w-6xl mx-auto px-6 py-10">
        <p className="text-slate-400">Carregando...</p>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto px-6 py-10">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold text-white">
            Gerenciar Usuarios
          </h1>
          <p className="text-slate-400 mt-1">
            {users.length} usuario{users.length !== 1 ? "s" : ""} cadastrado
            {users.length !== 1 ? "s" : ""}
          </p>
        </div>

        {/* Botão + Modal: Criar Usuário */}
        <Dialog open={createDialogOpen} onOpenChange={setCreateDialogOpen}>
          <DialogTrigger
            render={
              <Button variant="gradient" />
            }
          >
            + Novo Usuario
          </DialogTrigger>
          <DialogContent className="bg-slate-900 border-white/10 text-white">
            <DialogHeader>
              <DialogTitle>Criar Novo Usuario</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleCreate} className="space-y-4 mt-4">
              <div className="space-y-2">
                <Label className="text-slate-300">Nome *</Label>
                <Input
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                  className="bg-white/5 border-white/10 text-white"
                  placeholder="Nome completo"
                  required
                />
              </div>
              <div className="space-y-2">
                <Label className="text-slate-300">Email *</Label>
                <Input
                  type="email"
                  value={newEmail}
                  onChange={(e) => setNewEmail(e.target.value)}
                  className="bg-white/5 border-white/10 text-white"
                  placeholder="usuario@email.com"
                  required
                />
              </div>
              <div className="space-y-2">
                <Label className="text-slate-300">Username (opcional)</Label>
                <Input
                  value={newUsername}
                  onChange={(e) => setNewUsername(e.target.value)}
                  className="bg-white/5 border-white/10 text-white"
                  placeholder="usuario123"
                />
              </div>
              <div className="space-y-2">
                <Label className="text-slate-300">Senha *</Label>
                <Input
                  type="password"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  className="bg-white/5 border-white/10 text-white"
                  placeholder="Minimo 6 caracteres"
                  required
                  minLength={6}
                />
              </div>
              <div className="space-y-2">
                <Label className="text-slate-300">Papel</Label>
                <select
                  value={newRole}
                  onChange={(e) => setNewRole(e.target.value)}
                  className="w-full rounded-md bg-white/5 border border-white/10 text-white px-3 py-2 text-sm"
                >
                  <option value="MEMBER" className="text-slate-900">Membro</option>
                  <option value="PROJECT_OWNER" className="text-slate-900">Project Owner</option>
                  <option value="ADMIN" className="text-slate-900">Admin</option>
                </select>
              </div>

              {createError && (
                <div className="tv-error-box">
                  {createError}
                </div>
              )}

              <Button
                type="submit"
                disabled={creating}
                variant="gradient"
                className="w-full"
              >
                {creating ? "Criando..." : "Criar Usuario"}
              </Button>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {/* Modal: Editar Usuário */}
      <Dialog open={editDialogOpen} onOpenChange={(open) => {
        setEditDialogOpen(open);
        if (!open) setEditingUser(null);
      }}>
        <DialogContent className="bg-slate-900 border-white/10 text-white">
          <DialogHeader>
            <DialogTitle>
              Editar Usuario
              {editingUser && (
                <span className="ml-2 text-slate-400 text-sm font-normal">
                  — {editingUser.name}
                </span>
              )}
            </DialogTitle>
          </DialogHeader>
          <form onSubmit={handleEdit} className="space-y-4 mt-4">
            <div className="space-y-2">
              <Label className="text-slate-300">Nome *</Label>
              <Input
                value={editName}
                onChange={(e) => setEditName(e.target.value)}
                className="bg-white/5 border-white/10 text-white"
                placeholder="Nome completo"
                required
              />
            </div>
            <div className="space-y-2">
              <Label className="text-slate-300">Email *</Label>
              <Input
                type="email"
                value={editEmail}
                onChange={(e) => setEditEmail(e.target.value)}
                className="bg-white/5 border-white/10 text-white"
                placeholder="usuario@email.com"
                required
              />
            </div>
            <div className="space-y-2">
              <Label className="text-slate-300">Username (opcional)</Label>
              <Input
                value={editUsername}
                onChange={(e) => setEditUsername(e.target.value)}
                className="bg-white/5 border-white/10 text-white"
                placeholder="usuario123"
              />
            </div>
            <div className="space-y-2">
              <Label className="text-slate-300">Papel</Label>
              <select
                value={editRole}
                onChange={(e) => setEditRole(e.target.value)}
                className="w-full rounded-md bg-white/5 border border-white/10 text-white px-3 py-2 text-sm"
              >
                <option value="MEMBER" className="text-slate-900">Membro</option>
                <option value="PROJECT_OWNER" className="text-slate-900">Project Owner</option>
                <option value="ADMIN" className="text-slate-900">Admin</option>
              </select>
            </div>
            <div className="space-y-2">
              <Label className="text-slate-300">
                Nova Senha{" "}
                <span className="text-slate-500 text-xs font-normal">(opcional — deixe em branco para manter)</span>
              </Label>
              <Input
                type="password"
                value={editPassword}
                onChange={(e) => setEditPassword(e.target.value)}
                className="bg-white/5 border-white/10 text-white"
                placeholder="Minimo 6 caracteres"
                autoComplete="new-password"
              />
            </div>

            {editError && (
              <div className="tv-error-box">
                {editError}
              </div>
            )}

            <div className="flex gap-3 pt-1">
              <Button
                type="button"
                variant="ghost"
                onClick={() => setEditDialogOpen(false)}
                className="flex-1 text-slate-400 hover:text-white hover:bg-white/5 cursor-pointer"
              >
                Cancelar
              </Button>
              <Button
                type="submit"
                disabled={saving}
                variant="gradient"
                className="flex-1"
              >
                {saving ? "Salvando..." : "Salvar Alterações"}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      {/* Users Table */}
      <div className="bg-white/5 border border-white/10 rounded-2xl overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow className="border-white/10 hover:bg-transparent">
              <TableHead className="text-slate-400">Nome</TableHead>
              <TableHead className="text-slate-400">Email</TableHead>
              <TableHead className="text-slate-400">Username</TableHead>
              <TableHead className="text-slate-400">Papel</TableHead>
              <TableHead className="text-slate-400">Status</TableHead>
              <TableHead className="text-slate-400 text-right">
                Acoes
              </TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {users.map((user) => (
              <TableRow
                key={user.id}
                className="border-white/10 hover:bg-white/5"
              >
                <TableCell className="text-white font-medium">
                  {user.name}
                </TableCell>
                <TableCell className="text-slate-300">{user.email}</TableCell>
                <TableCell className="text-slate-400">
                  {user.username || "—"}
                </TableCell>
                <TableCell>
                  <Badge
                    variant="outline"
                    className={roleBadgeStyles[user.role]}
                  >
                    {roleLabels[user.role]}
                  </Badge>
                </TableCell>
                <TableCell>
                  {user.isDeactivated ? (
                    <Badge
                      variant="outline"
                      className="border-red-500/30 text-red-400"
                    >
                      Desativado
                    </Badge>
                  ) : (
                    <Badge
                      variant="outline"
                      className="border-emerald-500/30 text-emerald-400"
                    >
                      Ativo
                    </Badge>
                  )}
                </TableCell>
                <TableCell className="text-right">
                  <div className="flex items-center justify-end gap-2">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => openEditDialog(user)}
                      className="text-indigo-400 hover:text-indigo-300 hover:bg-indigo-500/10 text-xs cursor-pointer"
                    >
                      Editar
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => toggleDeactivate(user)}
                      className="text-slate-400 hover:text-white hover:bg-white/5 text-xs cursor-pointer"
                    >
                      {user.isDeactivated ? "Ativar" : "Desativar"}
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setDeleteTarget(user)}
                      className="text-red-400 hover:text-red-300 hover:bg-red-500/10 text-xs cursor-pointer"
                    >
                      Deletar
                    </Button>
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      {/* ConfirmDialog para deletar usuario */}
      <ConfirmDialog
        open={!!deleteTarget}
        onOpenChange={(open) => { if (!open) setDeleteTarget(null); }}
        onConfirm={executeDelete}
        title={`Deletar ${deleteTarget?.name ?? "usuario"}?`}
        description="Esta acao e permanente. O usuario e todos os seus dados serao removidos."
        confirmLabel="Deletar usuario"
        variant="destructive"
      />
    </div>
  );
}
