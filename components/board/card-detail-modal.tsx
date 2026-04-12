"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { ConfirmDialog } from "@/components/confirm-dialog";

// ─── InlineEdit: texto editavel com clique ─────────────────────────────
function InlineEdit({
  value,
  onSave,
  className = "",
}: {
  value: string;
  onSave: (newValue: string) => Promise<void>;
  className?: string;
}) {
  const [editing, setEditing] = useState(false);
  const [text, setText] = useState(value);
  const [saving, setSaving] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => { setText(value); }, [value]);
  useEffect(() => {
    if (editing && inputRef.current) {
      inputRef.current.focus();
      inputRef.current.select();
    }
  }, [editing]);

  const save = useCallback(async () => {
    const trimmed = text.trim();
    if (!trimmed || trimmed === value) {
      setText(value);
      setEditing(false);
      return;
    }
    setSaving(true);
    try {
      await onSave(trimmed);
    } catch {
      setText(value);
    } finally {
      setSaving(false);
      setEditing(false);
    }
  }, [text, value, onSave]);

  if (editing) {
    return (
      <input
        ref={inputRef}
        value={text}
        onChange={(e) => setText(e.target.value)}
        onBlur={save}
        onKeyDown={(e) => {
          if (e.key === "Enter") { e.preventDefault(); save(); }
          if (e.key === "Escape") { setText(value); setEditing(false); }
        }}
        disabled={saving}
        className={`flex-1 bg-white border border-violet-300 rounded px-2 py-0.5 outline-none focus:ring-1 focus:ring-violet-400/50 ${className}`}
      />
    );
  }

  return (
    <span
      onClick={() => setEditing(true)}
      title="Clique para editar"
      className={`flex-1 cursor-pointer hover:bg-gray-100 rounded px-2 py-0.5 -mx-2 -my-0.5 transition-colors ${className}`}
    >
      {value}
    </span>
  );
}

// ─── Interfaces ─────────────────────────────────────────────────────────

interface CommentData {
  id: string;
  text: string;
  createdAt: string;
  user: { id: string; name: string; email: string; image?: string | null };
}

interface ChecklistItemData {
  id: string;
  title: string;
  isCompleted: boolean;
  position: number;
  assigneeId?: string | null;
  dueDate?: string | null;
  assignee?: { id: string; name: string; email: string; image?: string | null } | null;
}

interface ChecklistData {
  id: string;
  title: string;
  position: number;
  items: ChecklistItemData[];
}

interface LabelData {
  id: string;
  name: string | null;
  color: string;
  position: number;
}

interface MemberData {
  id: string;
  name: string;
  email: string;
  image?: string | null;
}

import type { CardData } from "@/lib/types";

interface CardDetailModalProps {
  card: CardData;
  listTitle: string;
  userName: string;
  boardId: string;
  workspaceId: string;
  onClose: () => void;
  onUpdate: (card: CardData) => void;
  onDelete: (cardId: string) => void;
}

const LABEL_COLORS = [
  { value: "red", bg: "bg-red-500", label: "Vermelho" },
  { value: "blue", bg: "bg-blue-500", label: "Azul" },
  { value: "green", bg: "bg-green-500", label: "Verde" },
  { value: "yellow", bg: "bg-yellow-400", label: "Amarelo" },
  { value: "purple", bg: "bg-purple-500", label: "Roxo" },
  { value: "orange", bg: "bg-orange-500", label: "Laranja" },
  { value: "pink", bg: "bg-pink-500", label: "Rosa" },
  { value: "cyan", bg: "bg-cyan-500", label: "Ciano" },
];

function getLabelBg(color: string) {
  return LABEL_COLORS.find((c) => c.value === color)?.bg || "bg-gray-500";
}

export function CardDetailModal({
  card,
  listTitle,
  userName,
  boardId,
  workspaceId,
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

  // ConfirmDialog state — um unico estado para todas as confirmacoes
  const [confirmAction, setConfirmAction] = useState<{
    title: string;
    description: string;
    label: string;
    action: () => Promise<void>;
  } | null>(null);
  const [showActionsMenu, setShowActionsMenu] = useState(false);

  // Due date state
  const [dueDate, setDueDate] = useState(card.dueDate || "");
  const [isDueCompleted, setIsDueCompleted] = useState(card.isDueCompleted || false);
  const [showDatePicker, setShowDatePicker] = useState(false);

  // Comments state
  const [comments, setComments] = useState<CommentData[]>([]);
  const [commentText, setCommentText] = useState("");
  const [loadingComments, setLoadingComments] = useState(false);
  const [postingComment, setPostingComment] = useState(false);

  // Checklists state
  const [checklists, setChecklists] = useState<ChecklistData[]>([]);
  const [newItemTexts, setNewItemTexts] = useState<Record<string, string>>({});
  const [addingChecklist, setAddingChecklist] = useState(false);

  // Labels state
  const [cardLabels, setCardLabels] = useState<LabelData[]>([]);
  const [boardLabels, setBoardLabels] = useState<LabelData[]>([]);
  const [showLabelPicker, setShowLabelPicker] = useState(false);
  const [newLabelColor, setNewLabelColor] = useState("");
  const [newLabelName, setNewLabelName] = useState("");

  // Members state
  const [cardMembers, setCardMembers] = useState<MemberData[]>([]);
  const [workspaceMembers, setWorkspaceMembers] = useState<MemberData[]>([]);
  const [showMemberPicker, setShowMemberPicker] = useState(false);

  // Checklist item assignee/dueDate pickers
  const [activeItemMemberPicker, setActiveItemMemberPicker] = useState<string | null>(null); // itemId
  const [activeItemDatePicker, setActiveItemDatePicker] = useState<string | null>(null); // itemId
  const [itemDateInputs, setItemDateInputs] = useState<Record<string, string>>({}); // itemId -> ISO string

  // Activities state
  interface ActivityData {
    id: string;
    type: string;
    data: Record<string, string>;
    createdAt: string;
    user: { id: string; name: string; email: string; image?: string | null } | null;
  }
  const [activities, setActivities] = useState<ActivityData[]>([]);
  const [loadingActivities, setLoadingActivities] = useState(false);

  const overlayRef = useRef<HTMLDivElement>(null);
  const titleInputRef = useRef<HTMLInputElement>(null);
  const memberPickerRef = useRef<HTMLDivElement>(null);
  const actionsMenuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (memberPickerRef.current && !memberPickerRef.current.contains(event.target as Node)) {
        setShowMemberPicker(false);
      }
      if (actionsMenuRef.current && !actionsMenuRef.current.contains(event.target as Node)) {
        setShowActionsMenu(false);
      }
    }
    if (showMemberPicker || showActionsMenu) {
      document.addEventListener("mousedown", handleClickOutside);
    }
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [showMemberPicker, showActionsMenu]);

  // Carrega comentarios, checklists, labels, membros e atividades ao abrir
  useEffect(() => {
    loadComments();
    loadChecklists();
    loadLabels();
    loadMembers();
    loadActivities();
  }, [card.id]); // eslint-disable-line react-hooks/exhaustive-deps

  async function loadComments() {
    setLoadingComments(true);
    try {
      const res = await fetch(`/api/cards/${card.id}/comments`);
      const data = await res.json();
      if (res.ok) {
        setComments(data.comments);
      }
    } catch {
      // silently fail
    } finally {
      setLoadingComments(false);
    }
  }

  async function loadChecklists() {
    try {
      const res = await fetch(`/api/cards/${card.id}/checklists`);
      const data = await res.json();
      if (res.ok) setChecklists(data.checklists);
    } catch { /* silently fail */ }
  }

  async function loadLabels() {
    try {
      const [cardRes, boardRes] = await Promise.all([
        fetch(`/api/cards/${card.id}/labels`),
        fetch(`/api/boards/${boardId}/labels`),
      ]);
      const cardData = await cardRes.json();
      const boardData = await boardRes.json();
      if (cardRes.ok) setCardLabels(cardData.labels);
      if (boardRes.ok) setBoardLabels(boardData.labels);
    } catch { /* silently fail */ }
  }

  async function loadMembers() {
    try {
      const [cardRes, wsRes] = await Promise.all([
        fetch(`/api/cards/${card.id}/members`),
        fetch(`/api/workspaces/${workspaceId}/members`),
      ]);
      const cardData = await cardRes.json();
      const wsData = await wsRes.json();
      if (cardRes.ok) setCardMembers(cardData.members);
      if (wsRes.ok && wsData.members) {
        setWorkspaceMembers(wsData.members);
      }
    } catch { /* silently fail */ }
  }

  async function loadActivities() {
    setLoadingActivities(true);
    try {
      const res = await fetch(`/api/cards/${card.id}/activities`);
      const data = await res.json();
      if (res.ok) setActivities(data.activities);
    } catch { /* silently fail */ }
    finally { setLoadingActivities(false); }
  }

  async function toggleMember(userId: string) {
    const isAssigned = cardMembers.some((m) => m.id === userId);
    if (isAssigned) {
      // Optimistic remove
      setCardMembers((prev) => prev.filter((m) => m.id !== userId));
      try {
        await fetch(`/api/cards/${card.id}/members`, {
          method: "DELETE",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ userId }),
        });
      } catch { loadMembers(); }
    } else {
      // Optimistic add
      const member = workspaceMembers.find((m) => m.id === userId);
      if (member) setCardMembers((prev) => [...prev, member]);
      try {
        await fetch(`/api/cards/${card.id}/members`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ userId }),
        });
      } catch { loadMembers(); }
    }
  }

  async function toggleLabel(labelId: string) {
    const isAssigned = cardLabels.some((l) => l.id === labelId);
    if (isAssigned) {
      setCardLabels((prev) => prev.filter((l) => l.id !== labelId));
      try {
        await fetch(`/api/cards/${card.id}/labels`, {
          method: "DELETE",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ labelId }),
        });
      } catch { loadLabels(); }
    } else {
      const label = boardLabels.find((l) => l.id === labelId);
      if (label) setCardLabels((prev) => [...prev, label]);
      try {
        await fetch(`/api/cards/${card.id}/labels`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ labelId }),
        });
      } catch { loadLabels(); }
    }
  }

  async function createLabel() {
    if (!newLabelColor) return;
    try {
      const res = await fetch(`/api/boards/${boardId}/labels`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: newLabelName.trim() || null, color: newLabelColor }),
      });
      const data = await res.json();
      if (res.ok) {
        setBoardLabels((prev) => [...prev, data.label]);
        setNewLabelColor("");
        setNewLabelName("");
      }
    } catch { /* silently fail */ }
  }

  async function createChecklist() {
    setAddingChecklist(true);
    try {
      const res = await fetch(`/api/cards/${card.id}/checklists`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title: "Checklist" }),
      });
      const data = await res.json();
      if (res.ok) setChecklists((prev) => [...prev, data.checklist]);
    } catch { /* silently fail */ }
    finally { setAddingChecklist(false); }
  }

  function deleteChecklist(checklistId: string) {
    setConfirmAction({
      title: "Excluir Checklist?",
      description: "A exclusao de uma checklist e permanente e nao e possivel recupera-la. Todos os itens serao removidos.",
      label: "Excluir checklist",
      action: async () => {
        const res = await fetch(`/api/checklists/${checklistId}`, { method: "DELETE" });
        if (res.ok) setChecklists((prev) => prev.filter((c) => c.id !== checklistId));
      },
    });
  }

  async function addChecklistItem(checklistId: string) {
    const text = newItemTexts[checklistId]?.trim();
    if (!text) return;
    try {
      const res = await fetch(`/api/checklists/${checklistId}/items`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title: text }),
      });
      const data = await res.json();
      if (res.ok) {
        setChecklists((prev) =>
          prev.map((c) =>
            c.id === checklistId ? { ...c, items: [...c.items, data.item] } : c
          )
        );
        setNewItemTexts((prev) => ({ ...prev, [checklistId]: "" }));
      }
    } catch { /* silently fail */ }
  }

  async function toggleChecklistItem(checklistId: string, itemId: string, isCompleted: boolean) {
    // Optimistic update
    setChecklists((prev) =>
      prev.map((c) =>
        c.id === checklistId
          ? { ...c, items: c.items.map((i) => i.id === itemId ? { ...i, isCompleted: !isCompleted } : i) }
          : c
      )
    );
    try {
      await fetch(`/api/checklist-items/${itemId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isCompleted: !isCompleted }),
      });
    } catch {
      // Revert on failure
      setChecklists((prev) =>
        prev.map((c) =>
          c.id === checklistId
            ? { ...c, items: c.items.map((i) => i.id === itemId ? { ...i, isCompleted } : i) }
            : c
        )
      );
    }
  }

  function deleteChecklistItem(checklistId: string, itemId: string) {
    setConfirmAction({
      title: "Excluir item?",
      description: "Este item sera removido permanentemente da checklist.",
      label: "Excluir item",
      action: async () => {
        const res = await fetch(`/api/checklist-items/${itemId}`, { method: "DELETE" });
        if (res.ok) {
          setChecklists((prev) =>
            prev.map((c) =>
              c.id === checklistId ? { ...c, items: c.items.filter((i) => i.id !== itemId) } : c
            )
          );
        }
      },
    });
  }

  async function setItemAssignee(checklistId: string, itemId: string, assigneeId: string | null) {
    // Optimistic update
    setChecklists((prev) =>
      prev.map((c) =>
        c.id === checklistId
          ? {
              ...c,
              items: c.items.map((i) =>
                i.id === itemId
                  ? {
                      ...i,
                      assigneeId,
                      assignee: assigneeId
                        ? (workspaceMembers.find((m) => m.id === assigneeId) ?? null)
                        : null,
                    }
                  : i
              ),
            }
          : c
      )
    );
    setActiveItemMemberPicker(null);
    try {
      await fetch(`/api/checklist-items/${itemId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ assigneeId }),
      });
    } catch {
      loadChecklists(); // revert
    }
  }

  async function setItemDueDate(checklistId: string, itemId: string, dueDate: string | null) {
    // Optimistic update
    setChecklists((prev) =>
      prev.map((c) =>
        c.id === checklistId
          ? { ...c, items: c.items.map((i) => (i.id === itemId ? { ...i, dueDate } : i)) }
          : c
      )
    );
    setActiveItemDatePicker(null);
    try {
      await fetch(`/api/checklist-items/${itemId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ dueDate }),
      });
    } catch {
      loadChecklists(); // revert
    }
  }

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

  async function saveDueDate(newDate: string | null) {
    setSaving(true);
    try {
      const res = await fetch(`/api/cards/${card.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ dueDate: newDate }),
      });
      const data = await res.json();
      if (res.ok) {
        setDueDate(data.card.dueDate || "");
        onUpdate(data.card);
      }
    } catch {
      // revert
    } finally {
      setSaving(false);
      setShowDatePicker(false);
    }
  }

  async function toggleDueCompleted() {
    const newVal = !isDueCompleted;
    setIsDueCompleted(newVal);

    let updatedDueDate = dueDate;
    // Auto-setar dueDate se estiver concluindo e nao tiver data
    if (newVal && !dueDate) {
      updatedDueDate = new Date().toISOString();
      setDueDate(updatedDueDate);
    }

    try {
      const res = await fetch(`/api/cards/${card.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isDueCompleted: newVal, dueDate: updatedDueDate }),
      });
      const data = await res.json();
      if (res.ok) {
        onUpdate(data.card);
      }
    } catch {
      setIsDueCompleted(!newVal);
      // rollback do optimista update da data é omisso por simplicidade
    }
  }

  async function postComment() {
    if (!commentText.trim() || postingComment) return;
    setPostingComment(true);
    try {
      const res = await fetch(`/api/cards/${card.id}/comments`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text: commentText.trim() }),
      });
      const data = await res.json();
      if (res.ok) {
        setComments((prev) => [data.comment, ...prev]);
        setCommentText("");
      }
    } catch {
      // silently fail
    } finally {
      setPostingComment(false);
    }
  }

  // Traduz tipo de atividade para texto legivel
  function getActivityText(activity: ActivityData): string {
    const data = activity.data || {};
    switch (activity.type) {
      case "CARD_CREATED":
        return `adicionou este cartão a ${data.listTitle || listTitle}`;
      case "CARD_TITLE_UPDATED":
        return `renomeou este cartão de \"${data.oldTitle}\" para \"${data.newTitle}\"`;
      case "CARD_DESCRIPTION_UPDATED":
        return "atualizou a descrição deste cartão";
      case "CARD_MOVED":
        return `moveu este cartão de ${data.fromList} para ${data.toList}`;
      case "CARD_COMPLETED":
        return "marcou este cartão como completo";
      case "CARD_UNCOMPLETED":
        return "desmarcou este cartão como completo";
      case "DUE_DATE_SET":
        return `definiu a data de entrega para ${data.dueDate}`;
      case "DUE_DATE_REMOVED":
        return "removeu a data de entrega deste cartão";
      case "MEMBER_ADDED":
        return `adicionou ${data.memberName} a este cartão`;
      case "MEMBER_REMOVED":
        return `removeu ${data.memberName} deste cartão`;
      case "LABEL_ADDED":
        return `adicionou ${data.labelName} a este cartão`;
      case "LABEL_REMOVED":
        return `removeu ${data.labelName} deste cartão`;
      case "CHECKLIST_ADDED":
        return `adicionou ${data.checklistTitle} a este cartão`;
      case "CHECKLIST_REMOVED":
        return `removeu ${data.checklistTitle} deste cartão`;
      case "COMMENT_ADDED":
        return `comentou: \"${data.commentText}\"`;
      default:
        return `realizou uma ação (${activity.type})`;
    }
  }

  function handleDelete() {
    setConfirmAction({
      title: "Excluir cartao?",
      description: "O cartao e todo o seu conteudo (checklists, comentarios, anexos) serao excluidos permanentemente.",
      label: "Excluir cartao",
      action: async () => {
        const res = await fetch(`/api/cards/${card.id}`, { method: "DELETE" });
        if (res.ok) {
          onDelete(card.id);
        } else {
          const data = await res.json().catch(() => ({}));
          throw new Error(data.error || `Erro ${res.status}`);
        }
      },
    });
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

  // Due date helpers
  const hasDueDate = !!dueDate;
  const dueDateObj = hasDueDate ? new Date(dueDate) : null;
  const isOverdue = hasDueDate && !isDueCompleted && dueDateObj && dueDateObj < new Date();
  const formattedDueDate = dueDateObj
    ? dueDateObj.toLocaleDateString("pt-BR", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" })
    : "";

  // Data de criacao formatada
  const createdDate = new Date(card.createdAt);
  const formattedCreated = createdDate.toLocaleDateString("pt-BR", {
    day: "numeric", month: "short", hour: "2-digit", minute: "2-digit",
  });

  // Iniciais do usuario
  const userInitials = userName
    .split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);

  // Input date value (YYYY-MM-DDTHH:mm)
  const dateInputValue = dueDate ? new Date(dueDate).toISOString().slice(0, 16) : "";

  return (
    <div
      ref={overlayRef}
      onClick={handleOverlayClick}
      className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-start justify-center pt-12 overflow-y-auto"
    >
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-[900px] mx-4 mb-8 animate-in fade-in zoom-in-95 duration-150">
        {/* Barra de topo */}
        <div className="flex items-center justify-between px-4 py-2 border-b border-gray-100">
          <div className="flex items-center gap-2">
            <span className="text-sm text-gray-600 bg-gray-100 px-2.5 py-1 rounded-md font-medium">
              {listTitle}
            </span>
          </div>
          <div className="flex items-center gap-1">
            <button className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors cursor-pointer" title="Imagem de capa">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="m2.25 15.75 5.159-5.159a2.25 2.25 0 0 1 3.182 0l5.159 5.159m-1.5-1.5 1.409-1.409a2.25 2.25 0 0 1 3.182 0l2.909 2.909M3.75 21h16.5A2.25 2.25 0 0 0 22.5 18.75V5.25A2.25 2.25 0 0 0 20.25 3H3.75A2.25 2.25 0 0 0 1.5 5.25v13.5A2.25 2.25 0 0 0 3.75 21Z" />
              </svg>
            </button>
            {/* Menu 3 pontinhos */}
            <div ref={actionsMenuRef} className="relative">
              <button
                onClick={() => setShowActionsMenu(!showActionsMenu)}
                className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors cursor-pointer"
                title="Ações do cartão"
              >
                <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                  <circle cx="5" cy="12" r="2" />
                  <circle cx="12" cy="12" r="2" />
                  <circle cx="19" cy="12" r="2" />
                </svg>
              </button>
              {showActionsMenu && (
                <div className="absolute right-0 top-full mt-1 w-52 bg-white border border-gray-200 rounded-xl shadow-xl z-50 py-1 animate-in fade-in slide-in-from-top-1 duration-100">
                  <button
                    onClick={() => {
                      setShowActionsMenu(false);
                      onClose();
                    }}
                    className="w-full flex items-center gap-2.5 px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 transition-colors cursor-pointer"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 9V5.25A2.25 2.25 0 0 0 13.5 3h-6a2.25 2.25 0 0 0-2.25 2.25v13.5A2.25 2.25 0 0 0 7.5 21h6a2.25 2.25 0 0 0 2.25-2.25V15m3 0 3-3m0 0-3-3m3 3H9" />
                    </svg>
                    Sair
                  </button>
                  <button
                    disabled
                    className="w-full flex items-center gap-2.5 px-4 py-2 text-sm text-gray-400 cursor-not-allowed"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 4.5 21 12m0 0-7.5 7.5M21 12H3" />
                    </svg>
                    Mover
                  </button>
                  <button
                    disabled
                    className="w-full flex items-center gap-2.5 px-4 py-2 text-sm text-gray-400 cursor-not-allowed"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 17.25v3.375c0 .621-.504 1.125-1.125 1.125h-9.75a1.125 1.125 0 0 1-1.125-1.125V7.875c0-.621.504-1.125 1.125-1.125H6.75a9.06 9.06 0 0 1 1.5.124m7.5 10.376h3.375c.621 0 1.125-.504 1.125-1.125V11.25c0-4.46-3.243-8.161-7.5-8.876a9.06 9.06 0 0 0-1.5-.124H9.375c-.621 0-1.125.504-1.125 1.125v3.5m7.5 10.375H9.375a1.125 1.125 0 0 1-1.125-1.125v-9.25m12 6.625v-1.875a3.375 3.375 0 0 0-3.375-3.375h-1.5a1.125 1.125 0 0 1-1.125-1.125v-1.5a3.375 3.375 0 0 0-3.375-3.375H9.75" />
                    </svg>
                    Copiar
                  </button>
                  <button
                    disabled
                    className="w-full flex items-center gap-2.5 px-4 py-2 text-sm text-gray-400 cursor-not-allowed"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 0 0-3.375-3.375h-1.5A1.125 1.125 0 0 1 13.5 7.125v-1.5a3.375 3.375 0 0 0-3.375-3.375H8.25m2.25 0H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 0 0-9-9Z" />
                    </svg>
                    Criar template
                  </button>
                  <button
                    disabled
                    className="w-full flex items-center gap-2.5 px-4 py-2 text-sm text-gray-400 cursor-not-allowed"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M2.036 12.322a1.012 1.012 0 0 1 0-.639C3.423 7.51 7.36 4.5 12 4.5c4.638 0 8.573 3.007 9.963 7.178.07.207.07.431 0 .639C20.577 16.49 16.64 19.5 12 19.5c-4.638 0-8.573-3.007-9.963-7.178Z" />
                      <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 1 1-6 0 3 3 0 0 1 6 0Z" />
                    </svg>
                    Seguir
                  </button>
                  <button
                    disabled
                    className="w-full flex items-center gap-2.5 px-4 py-2 text-sm text-gray-400 cursor-not-allowed"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M7.217 10.907a2.25 2.25 0 1 0 0 2.186m0-2.186c.18.324.283.696.283 1.093s-.103.77-.283 1.093m0-2.186 9.566-5.314m-9.566 7.5 9.566 5.314m0 0a2.25 2.25 0 1 0 3.935 2.186 2.25 2.25 0 0 0-3.935-2.186Zm0-12.814a2.25 2.25 0 1 0 3.933-2.185 2.25 2.25 0 0 0-3.933 2.185Z" />
                    </svg>
                    Compartilhar
                  </button>
                  <button
                    disabled
                    className="w-full flex items-center gap-2.5 px-4 py-2 text-sm text-gray-400 cursor-not-allowed"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="m20.25 7.5-.625 10.632a2.25 2.25 0 0 1-2.247 2.118H6.622a2.25 2.25 0 0 1-2.247-2.118L3.75 7.5m8.25 3v6.75m0 0-3-3m3 3 3-3M3.375 7.5h17.25c.621 0 1.125-.504 1.125-1.125v-1.5c0-.621-.504-1.125-1.125-1.125H3.375c-.621 0-1.125.504-1.125 1.125v1.5c0 .621.504 1.125 1.125 1.125Z" />
                    </svg>
                    Arquivar
                  </button>
                  <div className="border-t border-gray-100 my-1" />
                  <button
                    onClick={() => {
                      setShowActionsMenu(false);
                      handleDelete();
                    }}
                    className="w-full flex items-center gap-2.5 px-4 py-2 text-sm text-red-600 hover:bg-red-50 transition-colors cursor-pointer"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="m14.74 9-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 0 1-2.244 2.077H8.084a2.25 2.25 0 0 1-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 0 0-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 0 1 3.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 0 0-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 0 0-7.5 0" />
                    </svg>
                    Excluir cartão
                  </button>
                </div>
              )}
            </div>
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
              <button
                onClick={toggleDueCompleted}
                className={`mt-1 w-6 h-6 rounded-full border-2 flex items-center justify-center shrink-0 transition-colors cursor-pointer ${
                  isDueCompleted
                    ? "bg-green-500 border-green-500 text-white shadow-sm"
                    : "border-gray-300 hover:border-gray-400"
                }`}
                title={isDueCompleted ? "Marcar como não concluído" : "Marcar como concluído"}
              >
                {isDueCompleted && (
                  <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={3}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
                  </svg>
                )}
              </button>
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

            {/* Label badges */}
            {cardLabels.length > 0 && (
              <div className="flex flex-wrap gap-1.5 mb-4">
                {cardLabels.map((label) => (
                  <span
                    key={label.id}
                    className={`${getLabelBg(label.color)} text-white text-xs font-medium px-2.5 py-1 rounded-md`}
                  >
                    {label.name || label.color}
                  </span>
                ))}
              </div>
            )}

            {/* Acoes rapidas */}
            <div className="flex flex-wrap gap-2 mb-6">
              <button className="flex items-center gap-1.5 px-3 py-1.5 text-sm text-gray-600 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors cursor-pointer">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
                </svg>
                Adicionar
              </button>
              <button
                onClick={() => setShowLabelPicker(!showLabelPicker)}
                className="flex items-center gap-1.5 px-3 py-1.5 text-sm text-gray-600 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors cursor-pointer"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9.568 3H5.25A2.25 2.25 0 0 0 3 5.25v4.318c0 .597.237 1.17.659 1.591l9.581 9.581c.699.699 1.78.872 2.607.33a18.095 18.095 0 0 0 5.223-5.223c.542-.827.369-1.908-.33-2.607L11.16 3.66A2.25 2.25 0 0 0 9.568 3Z" />
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 6h.008v.008H6V6Z" />
                </svg>
                Etiquetas
              </button>
              <button
                onClick={createChecklist}
                disabled={addingChecklist}
                className="flex items-center gap-1.5 px-3 py-1.5 text-sm text-gray-600 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors cursor-pointer disabled:opacity-50"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75 11.25 15 15 9.75M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z" />
                </svg>
                {addingChecklist ? "Criando..." : "Checklist"}
              </button>
              <button className="flex items-center gap-1.5 px-3 py-1.5 text-sm text-gray-600 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors cursor-pointer">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="m18.375 12.739-7.693 7.693a4.5 4.5 0 0 1-6.364-6.364l10.94-10.94A3 3 0 1 1 19.5 7.372L8.552 18.32m.009-.01-.01.01m5.699-9.941-7.81 7.81a1.5 1.5 0 0 0 2.112 2.13" />
                </svg>
                Anexo
              </button>
            </div>

            {/* Label Picker Popover */}
            {showLabelPicker && (
              <div className="mb-6 p-4 bg-gray-50 border border-gray-200 rounded-xl">
                <div className="flex items-center justify-between mb-3">
                  <h4 className="text-sm font-semibold text-gray-700">Etiquetas</h4>
                  <button
                    onClick={() => setShowLabelPicker(false)}
                    className="text-gray-400 hover:text-gray-600 transition-colors cursor-pointer"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                </div>

                {/* Labels existentes do board */}
                {boardLabels.length > 0 && (
                  <div className="space-y-1.5 mb-3">
                    {boardLabels.map((label) => {
                      const isAssigned = cardLabels.some((l) => l.id === label.id);
                      return (
                        <button
                          key={label.id}
                          onClick={() => toggleLabel(label.id)}
                          className={`w-full flex items-center gap-2 px-3 py-2 rounded-lg text-sm text-left transition-all cursor-pointer ${
                            isAssigned ? "ring-2 ring-violet-400 bg-white" : "hover:bg-gray-100"
                          }`}
                        >
                          <div className={`w-8 h-5 rounded ${getLabelBg(label.color)}`} />
                          <span className="flex-1 text-gray-700">{label.name || label.color}</span>
                          {isAssigned && (
                            <svg className="w-4 h-4 text-violet-500" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
                              <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
                            </svg>
                          )}
                        </button>
                      );
                    })}
                  </div>
                )}

                {/* Criar nova label */}
                <div className="border-t border-gray-200 pt-3">
                  <p className="text-xs text-gray-500 mb-2">Criar nova etiqueta</p>
                  <div className="flex flex-wrap gap-1.5 mb-2">
                    {LABEL_COLORS.map((c) => (
                      <button
                        key={c.value}
                        onClick={() => setNewLabelColor(c.value)}
                        className={`w-7 h-5 rounded ${c.bg} transition-all cursor-pointer ${
                          newLabelColor === c.value ? "ring-2 ring-offset-1 ring-violet-500 scale-110" : "hover:scale-105"
                        }`}
                        title={c.label}
                      />
                    ))}
                  </div>
                  {newLabelColor && (
                    <div className="flex gap-2">
                      <input
                        type="text"
                        value={newLabelName}
                        onChange={(e) => setNewLabelName(e.target.value)}
                        placeholder="Nome (opcional)"
                        className="flex-1 px-2 py-1.5 text-sm border border-gray-200 rounded-lg outline-none focus:border-violet-400"
                      />
                      <button
                        onClick={createLabel}
                        className="px-3 py-1.5 bg-violet-600 text-white text-xs rounded-lg hover:bg-violet-700 transition-colors cursor-pointer"
                      >
                        Criar
                      </button>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Membros + Data Entrega */}
            <div className="flex items-center gap-6 mb-6">
              <div ref={memberPickerRef} className="relative">
                <p className="text-xs text-gray-500 font-medium mb-1.5">Membros</p>
                <div className="flex items-center gap-1">
                  {cardMembers.map((member) => {
                    const initials = member.name
                      .split(" ")
                      .map((n) => n[0])
                      .join("")
                      .toUpperCase()
                      .slice(0, 2);
                    const colors = [
                      "from-red-500 to-red-600",
                      "from-blue-500 to-blue-600",
                      "from-green-500 to-green-600",
                      "from-amber-500 to-amber-600",
                      "from-purple-500 to-purple-600",
                      "from-pink-500 to-pink-600",
                    ];
                    const colorIdx = member.name.charCodeAt(0) % colors.length;
                    return (
                      <div
                        key={member.id}
                        title={`${member.name} (${member.email})`}
                        className={`w-8 h-8 rounded-full bg-gradient-to-br ${colors[colorIdx]} flex items-center justify-center text-xs font-bold text-white overflow-hidden shadow-sm`}
                      >
                        {member.image ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img src={member.image} alt={member.name} className="w-full h-full object-cover" />
                        ) : (
                          initials
                        )}
                      </div>
                    );
                  })}
                  {/* Removido o placeholder de membro inicial */}
                  <button
                    onClick={() => setShowMemberPicker(!showMemberPicker)}
                    className="w-8 h-8 rounded-full border-2 border-dashed border-gray-300 flex items-center justify-center text-gray-400 hover:border-gray-400 hover:text-gray-500 transition-colors cursor-pointer"
                  >
                    <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
                    </svg>
                  </button>
                </div>

                {/* Member Picker Popup */}
                {showMemberPicker && (
                  <div className="absolute top-full left-0 mt-2 w-64 bg-white border border-gray-200 rounded-xl shadow-lg z-10 p-3">
                    <div className="flex items-center justify-between mb-2">
                      <h4 className="text-sm font-semibold text-gray-700">Membros do Workspace</h4>
                      <button
                        onClick={() => setShowMemberPicker(false)}
                        className="text-gray-400 hover:text-gray-600 transition-colors cursor-pointer"
                      >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                        </svg>
                      </button>
                    </div>
                    {workspaceMembers.length === 0 ? (
                      <p className="text-xs text-gray-400 py-2">Nenhum membro encontrado</p>
                    ) : (
                      <div className="space-y-1 max-h-48 overflow-y-auto">
                        {workspaceMembers.map((member) => {
                          const isAssigned = cardMembers.some((m) => m.id === member.id);
                          const initials = member.name
                            .split(" ")
                            .map((n) => n[0])
                            .join("")
                            .toUpperCase()
                            .slice(0, 2);
                          return (
                            <button
                              key={member.id}
                              onClick={() => toggleMember(member.id)}
                              className={`w-full flex items-center gap-2 px-2 py-1.5 rounded-lg text-sm text-left transition-all cursor-pointer ${
                                isAssigned ? "bg-violet-50 ring-1 ring-violet-300" : "hover:bg-gray-50"
                              }`}
                            >
                              <div className="w-7 h-7 rounded-full bg-gradient-to-br from-violet-500 to-violet-600 flex items-center justify-center text-[10px] font-bold text-white shrink-0 overflow-hidden shadow-sm">
                                {member.image ? (
                                  // eslint-disable-next-line @next/next/no-img-element
                                  <img src={member.image} alt={member.name} className="w-full h-full object-cover" />
                                ) : (
                                  initials
                                )}
                              </div>
                              <div className="flex-1 min-w-0">
                                <p className="text-gray-800 text-sm truncate">{member.name}</p>
                                <p className="text-gray-400 text-[11px] truncate">{member.email}</p>
                              </div>
                              {isAssigned && (
                                <svg className="w-4 h-4 text-violet-500 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
                                  <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
                                </svg>
                              )}
                            </button>
                          );
                        })}
                      </div>
                    )}
                  </div>
                )}
              </div>
              <div>
                <p className="text-xs text-gray-500 font-medium mb-1.5">Data Entrega</p>
                <div className="flex items-center gap-2">
                  {hasDueDate ? (
                    <>
                      <button
                        onClick={toggleDueCompleted}
                        className={`w-5 h-5 rounded border-2 flex items-center justify-center transition-colors cursor-pointer ${
                          isDueCompleted
                            ? "bg-green-500 border-green-500 text-white"
                            : "border-gray-300 hover:border-gray-400"
                        }`}
                      >
                        {isDueCompleted && (
                          <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={3}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
                          </svg>
                        )}
                      </button>
                      <button
                        onClick={() => setShowDatePicker(!showDatePicker)}
                        className={`text-sm px-2 py-0.5 rounded cursor-pointer transition-colors ${
                          isDueCompleted
                            ? "text-green-700 bg-green-100"
                            : isOverdue
                            ? "text-red-700 bg-red-100"
                            : "text-gray-700 hover:bg-gray-100"
                        }`}
                      >
                        {formattedDueDate}
                      </button>
                      {isDueCompleted && (
                        <span className="text-xs font-medium text-white bg-green-500 px-1.5 py-0.5 rounded">
                          Concluido
                        </span>
                      )}
                      {isOverdue && (
                        <span className="text-xs font-medium text-white bg-red-500 px-1.5 py-0.5 rounded">
                          Em Atraso
                        </span>
                      )}
                    </>
                  ) : (
                    <button
                      onClick={() => setShowDatePicker(true)}
                      className="text-sm text-gray-500 px-2 py-1 border border-dashed border-gray-300 rounded-lg hover:border-gray-400 hover:text-gray-600 cursor-pointer transition-colors"
                    >
                      Definir data
                    </button>
                  )}
                </div>
                {/* Date picker inline */}
                {showDatePicker && (
                  <div className="mt-2 p-3 bg-gray-50 border border-gray-200 rounded-xl space-y-2">
                    <input
                      type="datetime-local"
                      value={dateInputValue}
                      onChange={(e) => setDueDate(e.target.value ? new Date(e.target.value).toISOString() : "")}
                      className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg outline-none focus:border-violet-400 focus:ring-1 focus:ring-violet-100"
                    />
                    <div className="flex gap-2">
                      <button
                        onClick={() => saveDueDate(dueDate || null)}
                        disabled={saving}
                        className="px-3 py-1.5 bg-violet-600 text-white text-sm rounded-lg hover:bg-violet-700 transition-colors disabled:opacity-50 cursor-pointer"
                      >
                        {saving ? "..." : "Salvar"}
                      </button>
                      {hasDueDate && (
                        <button
                          onClick={() => saveDueDate(null)}
                          className="px-3 py-1.5 text-red-600 text-sm border border-red-200 rounded-lg hover:bg-red-50 cursor-pointer transition-colors"
                        >
                          Remover
                        </button>
                      )}
                      <button
                        onClick={() => setShowDatePicker(false)}
                        className="px-3 py-1.5 text-gray-500 text-sm hover:text-gray-700 cursor-pointer transition-colors"
                      >
                        Cancelar
                      </button>
                    </div>
                  </div>
                )}
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

            {/* Checklists */}
            {checklists.map((checklist) => {
              const total = checklist.items.length;
              const completed = checklist.items.filter((i) => i.isCompleted).length;
              const percent = total > 0 ? Math.round((completed / total) * 100) : 0;

              return (
                <div key={checklist.id} className="mb-6">
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2 flex-1 min-w-0">
                      <svg className="w-5 h-5 text-gray-500 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75 11.25 15 15 9.75M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z" />
                      </svg>
                      <InlineEdit
                        value={checklist.title}
                        onSave={async (newTitle) => {
                          const res = await fetch(`/api/checklists/${checklist.id}`, {
                            method: "PATCH",
                            headers: { "Content-Type": "application/json" },
                            body: JSON.stringify({ title: newTitle }),
                          });
                          if (res.ok) {
                            const data = await res.json();
                            setChecklists((prev) =>
                              prev.map((cl) =>
                                cl.id === checklist.id ? { ...cl, title: data.checklist.title } : cl
                              )
                            );
                          }
                        }}
                        className="text-base font-semibold text-gray-800"
                      />
                    </div>
                    <button
                      onClick={() => deleteChecklist(checklist.id)}
                      className="text-xs text-gray-400 hover:text-red-500 px-2 py-1 border border-gray-200 rounded-md hover:bg-gray-50 transition-colors cursor-pointer shrink-0 ml-2"
                    >
                      Excluir
                    </button>
                  </div>

                  {/* Progress bar */}
                  {total > 0 && (
                    <div className="flex items-center gap-2 mb-3">
                      <span className="text-xs text-gray-500 w-8">{percent}%</span>
                      <div className="flex-1 h-2 bg-gray-200 rounded-full overflow-hidden">
                        <div
                          className={`h-full rounded-full transition-all duration-300 ${percent === 100 ? 'bg-green-500' : 'bg-violet-500'}`}
                          style={{ width: `${percent}%` }}
                        />
                      </div>
                    </div>
                  )}

                  {/* Items */}
                  <div className="space-y-1 mb-2">
                    {checklist.items.map((item) => {
                      const itemIsOverdue =
                        item.dueDate &&
                        !item.isCompleted &&
                        new Date(item.dueDate) < new Date();
                      const formattedItemDate = item.dueDate
                        ? new Date(item.dueDate).toLocaleDateString("pt-BR", {
                            day: "numeric",
                            month: "short",
                            hour: "2-digit",
                            minute: "2-digit",
                          })
                        : null;

                      return (
                        <div key={item.id} className="group">
                          <div className="flex items-center gap-2 py-1 px-1 rounded hover:bg-gray-50 transition-colors">
                            {/* Checkbox */}
                            <button
                              onClick={() => toggleChecklistItem(checklist.id, item.id, item.isCompleted)}
                              className={`w-4 h-4 rounded border-2 flex items-center justify-center shrink-0 transition-colors cursor-pointer ${
                                item.isCompleted
                                  ? "bg-violet-500 border-violet-500 text-white"
                                  : "border-gray-300 hover:border-violet-400"
                              }`}
                            >
                              {item.isCompleted && (
                                <svg className="w-2.5 h-2.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={3}>
                                  <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
                                </svg>
                              )}
                            </button>

                            {/* Texto — editavel inline */}
                            <InlineEdit
                              value={item.title}
                              onSave={async (newTitle) => {
                                const res = await fetch(`/api/checklist-items/${item.id}`, {
                                  method: "PATCH",
                                  headers: { "Content-Type": "application/json" },
                                  body: JSON.stringify({ title: newTitle }),
                                });
                                if (res.ok) {
                                  const data = await res.json();
                                  setChecklists((prev) =>
                                    prev.map((cl) =>
                                      cl.id === checklist.id
                                        ? {
                                            ...cl,
                                            items: cl.items.map((it) =>
                                              it.id === item.id ? { ...it, title: data.item.title } : it
                                            ),
                                          }
                                        : cl
                                    )
                                  );
                                }
                              }}
                              className={`text-sm ${
                                item.isCompleted ? "text-gray-400 line-through" : "text-gray-700"
                              }`}
                            />

                            {/* Assignee mini-badge */}
                            {item.assignee && (
                              <div
                                title={`Responsável: ${item.assignee.name}`}
                                className="w-5 h-5 rounded-full bg-gradient-to-br from-indigo-500 to-violet-600 flex items-center justify-center text-[9px] font-bold text-white shrink-0 cursor-pointer overflow-hidden shadow-sm"
                                onClick={() =>
                                  setActiveItemMemberPicker(
                                    activeItemMemberPicker === item.id ? null : item.id
                                  )
                                }
                              >
                                {item.assignee.image ? (
                                  // eslint-disable-next-line @next/next/no-img-element
                                  <img src={item.assignee.image} alt={item.assignee.name} className="w-full h-full object-cover" />
                                ) : (
                                  item.assignee.name
                                    .split(" ")
                                    .map((n) => n[0])
                                    .join("")
                                    .toUpperCase()
                                    .slice(0, 2)
                                )}
                              </div>
                            )}

                            {/* Date mini-badge */}
                            {item.dueDate && (
                              <span
                                title={`Prazo: ${formattedItemDate}`}
                                onClick={() =>
                                  setActiveItemDatePicker(
                                    activeItemDatePicker === item.id ? null : item.id
                                  )
                                }
                                className={`text-xs font-medium px-1.5 py-0.5 rounded cursor-pointer ${
                                  item.isCompleted
                                    ? "bg-green-100 text-green-700"
                                    : itemIsOverdue
                                    ? "bg-red-100 text-red-700"
                                    : "bg-gray-100 text-gray-600"
                                }`}
                              >
                                {formattedItemDate}
                              </span>
                            )}

                            {/* Botões de ação (sempre visíveis minimizados) */}
                            <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
                              {/* Botão assignee */}
                              <button
                                title={item.assignee ? "Trocar responsável" : "Atribuir responsável"}
                                onClick={() =>
                                  setActiveItemMemberPicker(
                                    activeItemMemberPicker === item.id ? null : item.id
                                  )
                                }
                                className="p-0.5 text-gray-400 hover:text-indigo-500 transition-colors cursor-pointer rounded"
                              >
                                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
                                  <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 6a3.75 3.75 0 1 1-7.5 0 3.75 3.75 0 0 1 7.5 0ZM4.501 20.118a7.5 7.5 0 0 1 14.998 0A17.933 17.933 0 0 1 12 21.75c-2.676 0-5.216-.584-7.499-1.632Z" />
                                </svg>
                              </button>

                              {/* Botão data */}
                              <button
                                title={item.dueDate ? "Editar prazo" : "Definir prazo"}
                                onClick={() => {
                                  setItemDateInputs((prev) => ({
                                    ...prev,
                                    [item.id]: item.dueDate
                                      ? new Date(item.dueDate).toISOString().slice(0, 16)
                                      : "",
                                  }));
                                  setActiveItemDatePicker(
                                    activeItemDatePicker === item.id ? null : item.id
                                  );
                                }}
                                className="p-0.5 text-gray-400 hover:text-indigo-500 transition-colors cursor-pointer rounded"
                              >
                                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
                                  <path strokeLinecap="round" strokeLinejoin="round" d="M6.75 3v2.25M17.25 3v2.25M3 18.75V7.5a2.25 2.25 0 0 1 2.25-2.25h13.5A2.25 2.25 0 0 1 21 7.5v11.25m-18 0A2.25 2.25 0 0 0 5.25 21h13.5A2.25 2.25 0 0 0 21 18.75m-18 0v-7.5A2.25 2.25 0 0 1 5.25 9h13.5A2.25 2.25 0 0 1 21 11.25v7.5" />
                                </svg>
                              </button>

                              {/* Botão deletar item */}
                              <button
                                onClick={() => deleteChecklistItem(checklist.id, item.id)}
                                className="p-0.5 text-gray-400 hover:text-red-500 transition-colors cursor-pointer rounded"
                              >
                                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
                                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                                </svg>
                              </button>
                            </div>
                          </div>

                          {/* Popover: Assignee picker do item */}
                          {activeItemMemberPicker === item.id && (
                            <div className="ml-6 mt-1 mb-2 p-2 bg-white border border-gray-200 rounded-xl shadow-lg z-10">
                              <p className="text-[10px] text-gray-400 font-medium mb-1.5 px-1">Atribuir responsável</p>
                              <div className="space-y-0.5 max-h-40 overflow-y-auto">
                                {workspaceMembers.map((member) => {
                                  const isAssigned = item.assigneeId === member.id;
                                  const initials = member.name
                                    .split(" ")
                                    .map((n) => n[0])
                                    .join("")
                                    .toUpperCase()
                                    .slice(0, 2);
                                  return (
                                    <button
                                      key={member.id}
                                      onClick={() => setItemAssignee(checklist.id, item.id, isAssigned ? null : member.id)}
                                      className={`w-full flex items-center gap-2 px-2 py-1.5 rounded-lg text-sm text-left transition-all cursor-pointer ${
                                        isAssigned ? "bg-indigo-50 ring-1 ring-indigo-300" : "hover:bg-gray-50"
                                      }`}
                                    >
                                      <div className="w-6 h-6 rounded-full bg-gradient-to-br from-indigo-500 to-violet-600 flex items-center justify-center text-[9px] font-bold text-white shrink-0 overflow-hidden shadow-sm">
                                        {member.image ? (
                                          // eslint-disable-next-line @next/next/no-img-element
                                          <img src={member.image} alt={member.name} className="w-full h-full object-cover" />
                                        ) : (
                                          initials
                                        )}
                                      </div>
                                      <div className="flex-1 min-w-0">
                                        <p className="text-gray-800 text-xs truncate">{member.name}</p>
                                      </div>
                                      {isAssigned && (
                                        <svg className="w-3.5 h-3.5 text-indigo-500 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
                                          <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
                                        </svg>
                                      )}
                                    </button>
                                  );
                                })}
                              </div>
                            </div>
                          )}

                          {/* Popover: Date picker do item */}
                          {activeItemDatePicker === item.id && (
                            <div className="ml-6 mt-1 mb-2 p-2 bg-white border border-gray-200 rounded-xl shadow-lg z-10">
                              <p className="text-[10px] text-gray-400 font-medium mb-1.5 px-1">Prazo do item</p>
                              <input
                                type="datetime-local"
                                value={itemDateInputs[item.id] ?? ""}
                                onChange={(e) =>
                                  setItemDateInputs((prev) => ({ ...prev, [item.id]: e.target.value }))
                                }
                                className="w-full px-2 py-1.5 text-xs border border-gray-200 rounded-lg outline-none focus:border-indigo-400"
                              />
                              <div className="flex gap-1.5 mt-1.5">
                                <button
                                  onClick={() =>
                                    setItemDueDate(
                                      checklist.id,
                                      item.id,
                                      itemDateInputs[item.id]
                                        ? new Date(itemDateInputs[item.id]).toISOString()
                                        : null
                                    )
                                  }
                                  className="flex-1 px-2 py-1 bg-indigo-600 text-white text-xs rounded-lg hover:bg-indigo-700 transition-colors cursor-pointer"
                                >
                                  Salvar
                                </button>
                                {item.dueDate && (
                                  <button
                                    onClick={() => setItemDueDate(checklist.id, item.id, null)}
                                    className="px-2 py-1 text-red-600 text-xs border border-red-200 rounded-lg hover:bg-red-50 cursor-pointer"
                                  >
                                    Remover
                                  </button>
                                )}
                                <button
                                  onClick={() => setActiveItemDatePicker(null)}
                                  className="px-2 py-1 text-gray-500 text-xs hover:text-gray-700 cursor-pointer"
                                >
                                  Cancelar
                                </button>
                              </div>
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>

                  {/* Add item input */}
                  <div className="flex gap-2">
                    <input
                      type="text"
                      value={newItemTexts[checklist.id] || ""}
                      onChange={(e) => setNewItemTexts((prev) => ({ ...prev, [checklist.id]: e.target.value }))}
                      onKeyDown={(e) => {
                        if (e.key === "Enter") addChecklistItem(checklist.id);
                      }}
                      placeholder="Adicionar um item..."
                      className="flex-1 px-3 py-1.5 text-sm bg-gray-50 border border-gray-200 rounded-lg outline-none focus:border-violet-400 focus:ring-1 focus:ring-violet-100 transition-all placeholder:text-gray-400"
                    />
                    {(newItemTexts[checklist.id] || "").trim() && (
                      <button
                        onClick={() => addChecklistItem(checklist.id)}
                        className="px-3 py-1.5 bg-violet-600 text-white text-xs rounded-lg hover:bg-violet-700 transition-colors cursor-pointer"
                      >
                        Adicionar
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>

          {/* Coluna direita — atividade */}
          <div className="w-full md:w-80 border-t md:border-t-0 md:border-l border-gray-100 p-6">
            {/* Header atividade */}
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <svg className="w-5 h-5 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 0 0-3.375-3.375h-1.5A1.125 1.125 0 0 1 13.5 7.125v-1.5a3.375 3.375 0 0 0-3.375-3.375H8.25m0 12.75h7.5m-7.5 3H12M10.5 2.25H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 0 0-9-9Z" />
                </svg>
                <h3 className="text-sm font-semibold text-gray-800">Comentários e atividade</h3>
              </div>
              <button
                onClick={() => setShowDetails(!showDetails)}
                className="text-xs text-gray-500 hover:text-gray-700 px-2 py-1 border border-gray-200 rounded-md hover:bg-gray-50 transition-colors cursor-pointer"
              >
                {showDetails ? "Ocultar detalhes" : "Mostrar Detalhes"}
              </button>
            </div>

            {/* Campo de comentario */}
            <div className="mb-4">
              <div className="flex gap-2">
                <input
                  type="text"
                  value={commentText}
                  onChange={(e) => setCommentText(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && commentText.trim()) postComment();
                  }}
                  placeholder="Escrever um comentário..."
                  className="flex-1 px-3 py-2.5 text-sm text-gray-700 bg-gray-50 border border-gray-200 rounded-lg outline-none focus:border-violet-400 focus:ring-1 focus:ring-violet-100 transition-all placeholder:text-gray-400"
                />
                {commentText.trim() && (
                  <button
                    onClick={postComment}
                    disabled={postingComment}
                    className="px-3 py-2 bg-violet-600 text-white text-sm rounded-lg hover:bg-violet-700 transition-colors disabled:opacity-50 cursor-pointer shrink-0"
                  >
                    {postingComment ? "..." : "Enviar"}
                  </button>
                )}
              </div>
            </div>

            {/* Timeline unificada: Comentários + Atividades */}
            <div className="space-y-4 max-h-[500px] overflow-y-auto pr-1">
              {(loadingComments || loadingActivities) && (
                <p className="text-xs text-gray-400">Carregando...</p>
              )}
              {(() => {
                // Monta array unificado
                type TimelineItem = {
                  id: string;
                  kind: "comment" | "activity";
                  createdAt: string;
                  user: { id: string; name: string; email: string; image?: string | null } | null;
                  // Comment fields
                  text?: string;
                  // Activity fields
                  type?: string;
                  data?: Record<string, string>;
                };

                const items: TimelineItem[] = [];

                // Comentários sempre aparecem
                comments.forEach((c) =>
                  items.push({
                    id: c.id,
                    kind: "comment",
                    createdAt: c.createdAt,
                    user: c.user,
                    text: c.text,
                  })
                );

                // Atividades de sistema (inclui CARD_CREATED com o criador real)
                // Só mostra quando showDetails = true
                if (showDetails) {
                  activities
                    .filter((a) => a.type !== "COMMENT_ADDED")
                    .forEach((a) =>
                      items.push({
                        id: a.id,
                        kind: "activity",
                        createdAt: a.createdAt,
                        user: a.user,
                        type: a.type,
                        data: a.data,
                      })
                    );
                }

                // Ordena por data desc
                items.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

                return items.map((item) => {
                  const itemUser = item.user;
                  const itemInitials = itemUser
                    ? itemUser.name
                        .split(" ")
                        .map((n) => n[0])
                        .join("")
                        .toUpperCase()
                        .slice(0, 2)
                    : userInitials;
                  const itemUserName = itemUser ? itemUser.name : userName;

                  // Cores de avatar pelas iniciais
                  const avatarColors = [
                    "from-red-500 to-red-600",
                    "from-blue-500 to-blue-600",
                    "from-green-500 to-green-600",
                    "from-amber-500 to-amber-600",
                    "from-purple-500 to-purple-600",
                    "from-pink-500 to-pink-600",
                  ];
                  const colorIdx = itemUserName.charCodeAt(0) % avatarColors.length;

                  if (item.kind === "comment") {
                    return (
                      <div key={item.id} className="flex items-start gap-3">
                        <div className={`w-8 h-8 rounded-full bg-gradient-to-br ${avatarColors[colorIdx]} flex items-center justify-center text-xs font-bold text-white shrink-0 mt-0.5 overflow-hidden shadow-sm`}>
                          {itemUser?.image ? (
                            // eslint-disable-next-line @next/next/no-img-element
                            <img src={itemUser.image} alt={itemUserName} className="w-full h-full object-cover" />
                          ) : (
                            itemInitials
                          )}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-semibold text-gray-700">{itemUserName}</p>
                          <div className="mt-1 px-3 py-2 bg-gray-50 border border-gray-100 rounded-lg text-sm text-gray-700 break-words">
                            {item.text}
                          </div>
                          <p className="text-xs text-gray-400 mt-1">
                            {formatRelativeDate(item.createdAt)}
                          </p>
                        </div>
                      </div>
                    );
                  }

                  // Atividade de sistema
                  return (
                    <div key={item.id} className="flex items-start gap-3">
                      <div className={`w-8 h-8 rounded-full bg-gradient-to-br ${avatarColors[colorIdx]} flex items-center justify-center text-xs font-bold text-white shrink-0 mt-0.5 overflow-hidden shadow-sm`}>
                        {itemUser?.image ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img src={itemUser.image} alt={itemUserName} className="w-full h-full object-cover" />
                        ) : (
                          itemInitials
                        )}
                      </div>
                      <div>
                        <p className="text-sm text-gray-700">
                          <span className="font-semibold">{itemUserName}</span>{" "}
                          {getActivityText(item as ActivityData)}
                        </p>
                        <p className="text-xs text-violet-600 hover:underline cursor-pointer mt-0.5">
                          {formatRelativeDate(item.createdAt)}
                        </p>
                      </div>
                    </div>
                  );
                });
              })()}
            </div>
          </div>
        </div>
      </div>

      {/* ConfirmDialog reutilizavel para todas as exclusoes */}
      <ConfirmDialog
        open={!!confirmAction}
        onOpenChange={(open) => { if (!open) setConfirmAction(null); }}
        onConfirm={confirmAction?.action ?? (async () => {})}
        title={confirmAction?.title ?? ""}
        description={confirmAction?.description ?? ""}
        confirmLabel={confirmAction?.label ?? "Confirmar"}
        variant="destructive"
      />
    </div>
  );
}
