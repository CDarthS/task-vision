"use client";

import { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";

interface SettingsModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function SettingsModal({ open, onOpenChange }: SettingsModalProps) {
  const [hideDeletes, setHideDeletes] = useState(false);

  useEffect(() => {
    if (open) {
      const val = localStorage.getItem("hideDeleteButtons");
      setHideDeletes(val === "true");
    }
  }, [open]);

  const handleToggle = () => {
    const newValue = !hideDeletes;
    setHideDeletes(newValue);
    localStorage.setItem("hideDeleteButtons", String(newValue));
    window.dispatchEvent(new Event("settingsChanged"));
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="tv-modal max-w-md">
        <DialogTitle className="text-xl font-bold text-white mb-2">
          Configurações
        </DialogTitle>
        <DialogDescription className="text-slate-400 text-sm mb-6">
          Ajuste suas preferências pessoais do sistema.
        </DialogDescription>

        <div className="space-y-4">
          <div className="flex items-center justify-between p-4 bg-white/5 rounded-xl border border-white/10">
            <div className="flex-1 mr-4">
              <h4 className="text-sm font-semibold text-white">
                Ocultar Lixeiras de Exclusão
              </h4>
              <p className="text-xs text-slate-400 mt-1">
                Esconde permanentemente os botões de excluir o Workspace e excluir o Board para evitar exclusões acidentais.
              </p>
            </div>
            <button
              type="button"
              role="switch"
              aria-checked={hideDeletes}
              onClick={handleToggle}
              className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer items-center rounded-full transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 focus-visible:ring-offset-2 focus-visible:ring-offset-slate-900 ${
                hideDeletes ? "bg-indigo-500" : "bg-slate-600"
              }`}
            >
              <span className="sr-only">Ocultar lixeiras</span>
              <span
                className={`pointer-events-none block h-4 w-4 rounded-full bg-white shadow-lg ring-0 transition-transform ${
                  hideDeletes ? "translate-x-6" : "translate-x-1"
                }`}
              />
            </button>
          </div>
        </div>

        <div className="mt-8 flex justify-end">
          <button
            onClick={() => onOpenChange(false)}
            className="px-4 py-2 bg-white/10 hover:bg-white/20 text-white rounded-lg transition-colors text-sm font-medium"
          >
            Fechar
          </button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
