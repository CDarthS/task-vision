"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";

interface CreateBoardModalProps {
  workspaceId: string;
}

export function CreateBoardModal({ workspaceId }: CreateBoardModalProps) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [title, setTitle] = useState("");
  const [error, setError] = useState("");
  const [creating, setCreating] = useState(false);

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setCreating(true);

    try {
      const res = await fetch("/api/boards", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title, workspaceId }),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error || "Erro ao criar board");
        return;
      }

      setTitle("");
      setOpen(false);
      // Navega pro board recem-criado
      router.push(`/boards/${data.board.id}`);
    } catch {
      setError("Erro de conexao com o servidor");
    } finally {
      setCreating(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger
        render={
          <Button variant="gradient" />
        }
      >
        + Novo Board
      </DialogTrigger>
      <DialogContent className="bg-slate-900 border-white/10 text-white">
        <DialogHeader>
          <DialogTitle>Criar Board</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleCreate} className="space-y-4 mt-4">
          <div className="space-y-2">
            <Label className="text-slate-300">Titulo *</Label>
            <Input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="bg-white/5 border-white/10 text-white"
              placeholder="Ex: Sprint 1, Backlog, Marketing..."
              maxLength={128}
              required
              autoFocus
            />
          </div>

          {error && (
            <div className="tv-error-box">
              {error}
            </div>
          )}

          <Button
            type="submit"
            disabled={creating || !title.trim()}
            variant="gradient"
            className="w-full"
          >
            {creating ? "Criando..." : "Criar Board"}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}
