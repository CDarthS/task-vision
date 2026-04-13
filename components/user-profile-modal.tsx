"use client";

import { useState, useRef, useEffect } from "react";
import { useRouter } from "next/navigation";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";

interface UserProfileModalProps {
  user: {
    id: string;
    email: string;
    name: string;
    image?: string | null;
  };
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function UserProfileModal({ user, open, onOpenChange }: UserProfileModalProps) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [editName, setEditName] = useState(user.name);
  const [editPassword, setEditPassword] = useState("");
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Sincroniza o nome quando o prop user muda (ex: apos router.refresh)
  useEffect(() => {
    setEditName(user.name);
  }, [user.name]);

  // Resize and compress the image using HTML5 Canvas
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith("image/")) {
      setError("Por favor, selecione uma imagem válida.");
      return;
    }

    setLoading(true);
    setError("");
    setSuccess("");

    const reader = new FileReader();
    reader.onload = (event) => {
      const img = new Image();
      img.onload = async () => {
        // Define canvas dimensions (max 150x150)
        const MAX_SIZE = 150;
        let width = img.width;
        let height = img.height;

        if (width > height) {
          if (width > MAX_SIZE) {
            height *= MAX_SIZE / width;
            width = MAX_SIZE;
          }
        } else {
          if (height > MAX_SIZE) {
            width *= MAX_SIZE / height;
            height = MAX_SIZE;
          }
        }

        const canvas = document.createElement("canvas");
        canvas.width = width;
        canvas.height = height;

        const ctx = canvas.getContext("2d");
        if (!ctx) {
          setError("Erro ao processar a imagem.");
          setLoading(false);
          return;
        }

        // Draw and compress to 80% JPEG
        ctx.drawImage(img, 0, 0, width, height);
        const base64String = canvas.toDataURL("image/jpeg", 0.8);

        try {
          const res = await fetch("/api/users/me", {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ image: base64String }),
          });

          if (!res.ok) throw new Error("Falha ao salvar a imagem.");

          router.refresh();
          window.dispatchEvent(new Event("user-profile-updated"));
        } catch {
          setError("Erro ao se conectar com o servidor.");
        } finally {
          setLoading(false);
        }
      };
      img.src = event.target?.result as string;
    };
    reader.readAsDataURL(file);
  };

  const handleRemoveImage = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/users/me", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ image: null }),
      });
      if (!res.ok) throw new Error("Falha ao remover.");
      router.refresh();
      window.dispatchEvent(new Event("user-profile-updated"));
    } catch {
      setError("Erro ao remover a imagem.");
    } finally {
      setLoading(false);
    }
  };

  const handleSaveProfile = async () => {
    if (!editName.trim()) {
      setError("O nome e obrigatorio.");
      return;
    }

    setLoading(true);
    setError("");
    setSuccess("");

    try {
      const payload: Record<string, string> = { name: editName.trim() };
      if (editPassword.trim()) {
        payload.password = editPassword.trim();
      }

      const res = await fetch("/api/users/me", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!res.ok) throw new Error("Falha ao atualizar o perfil.");

      setSuccess("Perfil atualizado com sucesso!");
      setEditPassword(""); // clear password field
      router.refresh();
      // Dispara evento global para que outras paginas (ex: admin/users) re-busquem dados
      window.dispatchEvent(new Event("user-profile-updated"));
    } catch {
      setError("Erro ao salvar as alteracoes.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="tv-modal sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle className="text-white">Meu Perfil</DialogTitle>
        </DialogHeader>

        <div className="flex flex-col items-center gap-6 py-4">
          <div className="relative group">
            {/* Avatar display */}
            <div className="w-24 h-24 tv-avatar border-4 border-white/10 text-3xl">
              {user.image ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={user.image} alt={user.name} className="w-full h-full object-cover" />
              ) : (
                user.name.charAt(0).toUpperCase()
              )}
            </div>

            {/* Hover overlay to change picture */}
            <div 
              onClick={() => fileInputRef.current?.click()}
              className="absolute inset-0 bg-black/50 text-white rounded-full flex flex-col items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer"
            >
              <svg className="w-6 h-6 mb-1" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M6.827 6.175A2.31 2.31 0 0 1 5.186 7.23c-.38.054-.757.112-1.134.175C2.999 7.58 2.25 8.507 2.25 9.574V18a2.25 2.25 0 0 0 2.25 2.25h15A2.25 2.25 0 0 0 21.75 18V9.574c0-1.067-.75-1.994-1.802-2.169a47.865 47.865 0 0 0-1.134-.175 2.31 2.31 0 0 1-1.64-1.055l-.822-1.316a2.192 2.192 0 0 0-1.736-1.039 48.774 48.774 0 0 0-5.232 0 2.192 2.192 0 0 0-1.736 1.039l-.821 1.316Z" />
                <path strokeLinecap="round" strokeLinejoin="round" d="M16.5 12.75a4.5 4.5 0 1 1-9 0 4.5 4.5 0 0 1 9 0ZM18.75 10.5h.008v.008h-.008V10.5Z" />
              </svg>
              <span className="text-[10px] font-semibold text-center leading-tight">Mudar<br/>Foto</span>
            </div>
            
            {/* Hidden file input */}
            <input 
              type="file" 
              ref={fileInputRef} 
              className="hidden" 
              accept="image/jpeg, image/png, image/webp" 
              onChange={handleFileChange}
            />
          </div>

          <div className="flex flex-col items-center gap-1 text-center">
            <h3 className="font-semibold text-white text-lg">{user.name}</h3>
            <p className="text-sm text-slate-400">{user.email}</p>
          </div>

          {error && <p className="tv-error-box mt-2">{error}</p>}

          <div className="flex gap-2 w-full mt-4">
            <Button
              variant="gradient"
              className="flex-1"
              onClick={() => fileInputRef.current?.click()}
              disabled={loading}
            >
              {loading ? "Salvando..." : user.image ? "Trocar Foto" : "Adicionar Foto"}
            </Button>

            {user.image && (
              <Button
                variant="destructive"
                className="flex-shrink-0"
                onClick={handleRemoveImage}
                disabled={loading}
              >
                Remover
              </Button>
            )}
          </div>

          {/* Edit Profile Form */}
          <div className="w-full mt-4 space-y-4 pt-4 border-t border-white/10 text-left">
            <div>
              <label className="text-xs text-slate-400 mb-1 block">Nome</label>
              <input 
                type="text" 
                value={editName}
                onChange={(e) => setEditName(e.target.value)}
                className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm text-white focus:border-violet-400 focus:outline-none" 
              />
            </div>
            <div>
              <label className="text-xs text-slate-400 mb-1 block">Nova Senha (opcional)</label>
              <input 
                type="password" 
                placeholder="••••••••" 
                value={editPassword}
                onChange={(e) => setEditPassword(e.target.value)}
                className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm text-white focus:border-violet-400 focus:outline-none placeholder:text-slate-600" 
              />
            </div>
            <Button 
              onClick={handleSaveProfile} 
              disabled={loading} 
              variant="gradient"
              className="w-full mt-2"
            >
              {loading ? "Salvando..." : "Salvar Alteraçoes"}
            </Button>
            {success && <p className="text-sm text-green-400 mt-2 text-center">{success}</p>}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
