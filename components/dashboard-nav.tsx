"use client";

import { useRouter } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Badge } from "@/components/ui/badge";
import { NotificationBell } from "@/components/notification-bell";
import { UserProfileModal } from "@/components/user-profile-modal";
import { SettingsModal } from "@/components/settings-modal";
import type { SafeUser } from "@/lib/auth/get-current-user";
import { useState } from "react";

export function DashboardNav({ user }: { user: SafeUser }) {
  const router = useRouter();
  const [profileModalOpen, setProfileModalOpen] = useState(false);
  const [settingsModalOpen, setSettingsModalOpen] = useState(false);

  async function handleLogout() {
    await fetch("/api/auth/logout", { method: "DELETE" });
    router.push("/login");
    router.refresh();
  }

  const roleLabels: Record<string, string> = {
    ADMIN: "Admin",
    PROJECT_OWNER: "Project Owner",
    MEMBER: "Membro",
  };

  return (
    <header className="border-b border-white/10 bg-slate-950/80 backdrop-blur-sm sticky top-0 z-50">
      <div className="max-w-6xl mx-auto px-6 h-16 flex items-center justify-between">
        {/* Logo */}
        <Link href="/" className="flex items-center gap-3">
          <Image
            src="/logo.png"
            alt="Task Vision Logo"
            width={32}
            height={32}
            className="rounded-lg shadow-sm"
          />
          <span className="text-lg font-semibold text-white">
            Task{" "}
            <span className="bg-gradient-to-r from-indigo-400 to-violet-400 bg-clip-text text-transparent">
              Vision
            </span>
          </span>
        </Link>

        {/* Nav links */}
        <div className="flex items-center gap-4">
          {user.role === "ADMIN" && (
            <Link
              href="/admin/users"
              className="text-sm text-slate-400 hover:text-white transition-colors"
            >
              Gerenciar Usuarios
            </Link>
          )}

          {/* Notification bell */}
          <NotificationBell />

          {/* User menu */}
          <DropdownMenu>
            <DropdownMenuTrigger
              render={
                <Button
                  variant="ghost"
                  className="flex items-center gap-2 text-slate-300 hover:text-white hover:bg-white/5 cursor-pointer"
                />
              }
            >
              <div className="w-7 h-7 rounded-full bg-gradient-to-br from-indigo-500 to-violet-600 flex items-center justify-center text-xs font-medium text-white overflow-hidden shadow-sm">
                {user.image ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={user.image} alt={user.name} className="w-full h-full object-cover" />
                ) : (
                  user.name.charAt(0).toUpperCase()
                )}
              </div>
              <span className="text-sm">{user.name}</span>
            </DropdownMenuTrigger>
            <DropdownMenuContent
              align="end"
              className="bg-slate-900 border-white/10 text-slate-300 min-w-48"
            >
              <div className="px-3 py-2">
                <p className="text-sm font-medium text-white">{user.name}</p>
                <p className="text-xs text-slate-400">{user.email}</p>
                <Badge
                  variant="outline"
                  className="mt-1 text-xs border-indigo-500/30 text-indigo-400"
                >
                  {roleLabels[user.role]}
                </Badge>
              </div>
              <DropdownMenuItem
                onClick={() => setProfileModalOpen(true)}
                className="focus:bg-white/10 cursor-pointer"
              >
                Meu Perfil
              </DropdownMenuItem>
              {user.role === "ADMIN" && (
                <DropdownMenuItem
                  onClick={() => setSettingsModalOpen(true)}
                  className="focus:bg-white/10 cursor-pointer"
                >
                  Configurações
                </DropdownMenuItem>
              )}
              <DropdownMenuSeparator className="bg-white/10" />
              <DropdownMenuItem
                onClick={handleLogout}
                className="text-red-400 focus:text-red-300 focus:bg-red-500/10 cursor-pointer"
              >
                Sair
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      <UserProfileModal 
        user={{
          id: user.id,
          name: user.name,
          email: user.email,
          image: user.image
        }}
        open={profileModalOpen}
        onOpenChange={setProfileModalOpen}
      />
      
      {user.role === "ADMIN" && (
        <SettingsModal 
          open={settingsModalOpen}
          onOpenChange={setSettingsModalOpen}
        />
      )}
    </header>
  );
}
