"use client";

import { useState, useEffect, useRef } from "react";

interface CardData {
  id: string;
  title: string;
  description: string | null;
  position: number;
  listId: string;
  createdAt: string;
  updatedAt: string;
}

interface CardDetailModalProps {
  card: CardData;
  listTitle: string;
  userName: string;
  onClose: () => void;
  onUpdate: (card: CardData) => void;
  onDelete: (cardId: string) => void;
}

export function CardDetailModal({
  card,
  listTitle,
  userName,
  onClose,
  onUpdate,
  onDelete,
}: CardDetailModalProps) {
  const [title, setTitle] = useState(card.title);
  const [description, setDescription] = useState(card.description || "");
  const [editingTitle, setEditingTitle] = useState(false);
  const [editingDescription, setEditingDescription] = useState(false);
  const [saving, setSaving] = useState(false);
  const [showDetails, setShowDetails] = useState(false);
  const overlayRef = useRef<HTMLDivElement>(null);
  const titleInputRef = useRef<HTMLInputElement>(null);

  // Fecha ao clicar no overlay
  function handleOverlayClick(e: React.MouseEvent) {
    if (e.target === overlayRef.current) {
      onClose();
    }
  }

  // Fecha com ESC
  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [onClose]);

  // Focus title input when editing
  useEffect(() => {
    if (editingTitle && titleInputRef.current) {
      titleInputRef.current.focus();
      titleInputRef.current.select();
    }
  }, [editingTitle]);

  async function saveTitle() {
    if (!title.trim() || title === card.title) {
      setTitle(card.title);
      setEditingTitle(false);
      return;
    }

    setSaving(true);
    try {
      const res = await fetch(`/api/cards/${card.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title: title.trim() }),
      });
      const data = await res.json();
      if (res.ok) {
        onUpdate(data.card);
      }
    } catch {
      setTitle(card.title);
    } finally {
      setSaving(false);
      setEditingTitle(false);
    }
  }

  async function saveDescription() {
    setSaving(true);
    try {
      const res = await fetch(`/api/cards/${card.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ description: description || null }),
      });
      const data = await res.json();
      if (res.ok) {
        onUpdate(data.card);
      }
    } catch {
      setDescription(card.description || "");
    } finally {
      setSaving(false);
      setEditingDescription(false);
    }
  }

  async function handleDelete() {
    if (!confirm("Tem certeza que deseja excluir este cartao?")) return;
    try {
      const res = await fetch(`/api/cards/${card.id}`, { method: "DELETE" });
      if (res.ok) {
        onDelete(card.id);
      }
    } catch {
      // silently fail
    }
  }

  // Formata data relativa simplificada
  function formatRelativeDate(dateStr: string) {
    const date = new Date(dateStr);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return "agora mesmo";
    if (diffMins < 60) return `ha ${diffMins} minuto${diffMins !== 1 ? "s" : ""}`;
    if (diffHours < 24) return `ha ${diffHours} hora${diffHours !== 1 ? "s" : ""}`;
    if (diffDays < 30) return `ha ${diffDays} dia${diffDays !== 1 ? "s" : ""}`;
    return date.toLocaleDateString("pt-BR", { day: "2-digit", month: "short" });
  }

  // Data formatada para exibição
  const createdDate = new Date(card.createdAt);
  const formattedDate = createdDate.toLocaleDateString("pt-BR", {
    day: "numeric",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  });

  // Verifica se card está "em atraso" (criado ha mais de 24h — placeholder para dueDate futuro)
  const isOverdue = (new Date().getTime() - createdDate.getTime()) > 86400000;

  // Iniciais do usuario
  const userInitials = userName
    .split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);

  return (
    <div
      ref={overlayRef}
      onClick={handleOverlayClick}
      className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-start justify-center pt-12 overflow-y-auto"
    >
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-[768px] mx-4 mb-8 animate-in fade-in zoom-in-95 duration-150">
        {/* Barra de topo — Nome da lista + acoes + fechar */}
        <div className="flex items-center justify-between px-4 py-2 border-b border-gray-100">
          <div className="flex items-center gap-2">
            <span className="text-sm text-gray-600 bg-gray-100 px-2.5 py-1 rounded-md font-medium">
              {listTitle}
            </span>
          </div>
          <div className="flex items-center gap-1">
            {/* Botao cover image (placeholder) */}
            <button className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors cursor-pointer" title="Imagem de capa">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="m2.25 15.75 5.159-5.159a2.25 2.25 0 0 1 3.182 0l5.159 5.159m-1.5-1.5 1.409-1.409a2.25 2.25 0 0 1 3.182 0l2.909 2.909M3.75 21h16.5A2.25 2.25 0 0 0 22.5 18.75V5.25A2.25 2.25 0 0 0 20.25 3H3.75A2.25 2.25 0 0 0 1.5 5.25v13.5A2.25 2.25 0 0 0 3.75 21Z" />
              </svg>
            </button>
            {/* Botao watch (placeholder) */}
            <button className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors cursor-pointer" title="Acompanhar">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M2.036 12.322a1.012 1.012 0 0 1 0-.639C3.423 7.51 7.36 4.5 12 4.5c4.638 0 8.573 3.007 9.963 7.178.07.207.07.431 0 .639C20.577 16.49 16.64 19.5 12 19.5c-4.638 0-8.573-3.007-9.964-7.178Z" />
                <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 1 1-6 0 3 3 0 0 1 6 0Z" />
              </svg>
            </button>
            {/* Botao more options */}
            <button className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors cursor-pointer" title="Mais opcoes">
              <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                <circle cx="12" cy="5" r="1.5" />
                <circle cx="12" cy="12" r="1.5" />
                <circle cx="12" cy="19" r="1.5" />
              </svg>
            </button>
            {/* Fechar */}
            <button
              onClick={onClose}
              className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors cursor-pointer"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>

        {/* Corpo principal — 2 colunas */}
        <div className="flex flex-col md:flex-row">
          {/* Coluna esquerda — conteudo principal */}
          <div className="flex-1 p-6">
            {/* Titulo */}
            <div className="flex items-start gap-3 mb-6">
              {/* Icone circulo (status placeholder) */}
              <div className="mt-1 w-5 h-5 rounded-full border-2 border-gray-300 shrink-0" />
              {editingTitle ? (
                <input
                  ref={titleInputRef}
                  type="text"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  onBlur={saveTitle}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") saveTitle();
                    if (e.key === "Escape") {
                      setTitle(card.title);
                      setEditingTitle(false);
                    }
                  }}
                  className="text-xl font-semibold text-gray-900 outline-none border-b-2 border-violet-500 pb-1 w-full bg-transparent"
                />
              ) : (
                <h2
                  onClick={() => setEditingTitle(true)}
                  className="text-xl font-semibold text-gray-900 cursor-pointer hover:text-violet-700 transition-colors"
                >
                  {card.title}
                </h2>
              )}
            </div>

            {/* Acoes rapidas */}
            <div className="flex flex-wrap gap-2 mb-6">
              <button className="flex items-center gap-1.5 px-3 py-1.5 text-sm text-gray-600 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors cursor-pointer">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
                </svg>
                Adicionar
              </button>
              <button className="flex items-center gap-1.5 px-3 py-1.5 text-sm text-gray-600 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors cursor-pointer">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9.568 3H5.25A2.25 2.25 0 0 0 3 5.25v4.318c0 .597.237 1.17.659 1.591l9.581 9.581c.699.699 1.78.872 2.607.33a18.095 18.095 0 0 0 5.223-5.223c.542-.827.369-1.908-.33-2.607L11.16 3.66A2.25 2.25 0 0 0 9.568 3Z" />
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 6h.008v.008H6V6Z" />
                </svg>
                Etiquetas
              </button>
              <button className="flex items-center gap-1.5 px-3 py-1.5 text-sm text-gray-600 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors cursor-pointer">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75 11.25 15 15 9.75M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z" />
                </svg>
                Checklist
              </button>
              <button className="flex items-center gap-1.5 px-3 py-1.5 text-sm text-gray-600 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors cursor-pointer">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="m18.375 12.739-7.693 7.693a4.5 4.5 0 0 1-6.364-6.364l10.94-10.94A3 3 0 1 1 19.5 7.372L8.552 18.32m.009-.01-.01.01m5.699-9.941-7.81 7.81a1.5 1.5 0 0 0 2.112 2.13" />
                </svg>
                Anexo
              </button>
            </div>

            {/* Membros + Data */}
            <div className="flex items-center gap-6 mb-6">
              <div>
                <p className="text-xs text-gray-500 font-medium mb-1.5">Membros</p>
                <div className="flex items-center gap-1">
                  <div className="w-8 h-8 rounded-full bg-gradient-to-br from-red-500 to-red-600 flex items-center justify-center text-xs font-bold text-white">
                    {userInitials}
                  </div>
                  <button className="w-8 h-8 rounded-full border-2 border-dashed border-gray-300 flex items-center justify-center text-gray-400 hover:border-gray-400 hover:text-gray-500 transition-colors cursor-pointer">
                    <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
                    </svg>
                  </button>
                </div>
              </div>
              <div>
                <p className="text-xs text-gray-500 font-medium mb-1.5">Data Entrega</p>
                <div className="flex items-center gap-2">
                  <span className="text-sm text-gray-700">{formattedDate}</span>
                  {isOverdue && (
                    <span className="text-xs font-medium text-white bg-red-500 px-1.5 py-0.5 rounded">
                      Em Atraso
                    </span>
                  )}
                </div>
              </div>
            </div>

            {/* Descricao */}
            <div className="mb-6">
              <div className="flex items-center gap-2 mb-3">
                <svg className="w-5 h-5 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 6.75h16.5M3.75 12h16.5m-16.5 5.25H12" />
                </svg>
                <h3 className="text-base font-semibold text-gray-800">Descricao</h3>
              </div>
              {editingDescription ? (
                <div>
                  <textarea
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    placeholder="Adicione uma descricao mais detalhada..."
                    className="w-full min-h-[120px] px-4 py-3 text-sm text-gray-700 bg-gray-50 border border-gray-200 rounded-xl outline-none focus:border-violet-400 focus:ring-2 focus:ring-violet-100 resize-none transition-all"
                    autoFocus
                  />
                  <div className="flex items-center gap-2 mt-2">
                    <button
                      onClick={saveDescription}
                      disabled={saving}
                      className="px-4 py-1.5 bg-violet-600 text-white text-sm rounded-lg hover:bg-violet-700 transition-colors disabled:opacity-50 cursor-pointer"
                    >
                      {saving ? "Salvando..." : "Salvar"}
                    </button>
                    <button
                      onClick={() => {
                        setDescription(card.description || "");
                        setEditingDescription(false);
                      }}
                      className="px-4 py-1.5 text-gray-500 text-sm hover:text-gray-700 transition-colors cursor-pointer"
                    >
                      Cancelar
                    </button>
                  </div>
                </div>
              ) : (
                <div
                  onClick={() => setEditingDescription(true)}
                  className="min-h-[80px] px-4 py-3 text-sm text-gray-500 bg-gray-50 border border-gray-200 rounded-xl cursor-pointer hover:bg-gray-100 transition-colors"
                >
                  {card.description || "Adicione uma descricao mais detalhada..."}
                </div>
              )}
            </div>
          </div>

          {/* Coluna direita — atividade */}
          <div className="w-full md:w-80 border-t md:border-t-0 md:border-l border-gray-100 p-6">
            {/* Header atividade */}
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <svg className="w-5 h-5 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 0 0-3.375-3.375h-1.5A1.125 1.125 0 0 1 13.5 7.125v-1.5a3.375 3.375 0 0 0-3.375-3.375H8.25m0 12.75h7.5m-7.5 3H12M10.5 2.25H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 0 0-9-9Z" />
                </svg>
                <h3 className="text-sm font-semibold text-gray-800">Comentarios e atividade</h3>
              </div>
              <button
                onClick={() => setShowDetails(!showDetails)}
                className="text-xs text-gray-500 hover:text-gray-700 px-2 py-1 border border-gray-200 rounded-md hover:bg-gray-50 transition-colors cursor-pointer"
              >
                {showDetails ? "Ocultar Detalhes" : "Mostrar Detalhes"}
              </button>
            </div>

            {/* Campo de comentario */}
            <div className="mb-4">
              <input
                type="text"
                placeholder="Escrever um comentario..."
                className="w-full px-3 py-2.5 text-sm text-gray-700 bg-gray-50 border border-gray-200 rounded-lg outline-none focus:border-violet-400 focus:ring-1 focus:ring-violet-100 transition-all placeholder:text-gray-400"
              />
            </div>

            {/* Atividade recente */}
            <div className="space-y-4">
              <div className="flex items-start gap-3">
                <div className="w-8 h-8 rounded-full bg-gradient-to-br from-red-500 to-red-600 flex items-center justify-center text-xs font-bold text-white shrink-0 mt-0.5">
                  {userInitials}
                </div>
                <div>
                  <p className="text-sm text-gray-700">
                    <span className="font-semibold">{userName}</span>{" "}
                    adicionou este cartao a {listTitle}
                  </p>
                  <p className="text-xs text-violet-600 hover:underline cursor-pointer mt-0.5">
                    {formatRelativeDate(card.createdAt)}
                  </p>
                </div>
              </div>
            </div>

            {/* Detalhes expandidos */}
            {showDetails && (
              <div className="mt-6 pt-4 border-t border-gray-100 space-y-3">
                <div className="flex justify-between text-sm">
                  <span className="text-gray-500">Criado em</span>
                  <span className="text-gray-700">{formattedDate}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-gray-500">Ultima atualizacao</span>
                  <span className="text-gray-700">{formatRelativeDate(card.updatedAt)}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-gray-500">Lista</span>
                  <span className="text-gray-700">{listTitle}</span>
                </div>
                <div className="pt-2">
                  <button
                    onClick={handleDelete}
                    className="w-full px-3 py-2 text-sm text-red-600 border border-red-200 rounded-lg hover:bg-red-50 transition-colors cursor-pointer"
                  >
                    Excluir cartao
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
