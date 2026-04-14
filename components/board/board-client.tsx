"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import {
  DndContext,
  DragEndEvent,
  DragOverEvent,
  DragStartEvent,
  DragOverlay,
  PointerSensor,
  useSensor,
  useSensors,
  closestCorners,
} from "@dnd-kit/core";
import { arrayMove } from "@dnd-kit/sortable";
import { BoardHeader } from "./board-header";
import { KanbanList } from "./kanban-list";
import { KanbanCard } from "./kanban-card";
import { CardDetailModal } from "./card-detail-modal";
import { BoardFilter } from "./board-filter";
import type { CardData, ListData, BoardData, WorkspaceMemberInfo } from "@/lib/types";
import { ConfirmDialog } from "@/components/confirm-dialog";

interface BoardClientProps {
  board: BoardData;
  userName: string;
  userId: string;
  initialCardId?: string;
  workspaceMembers?: WorkspaceMemberInfo[];
  isGlobalAdmin?: boolean;
}

// ─── Helpers de posição ────────────────────────────────────────────────
/** Calcula a posição de um card que acabou de ser inserido num índice específico. */
function calcPosition(items: CardData[], toIndex: number, movedId: string): number {
  // Remove o próprio item para calcular adjacentes correctamente
  const others = items.filter((c) => c.id !== movedId);
  const prev = others[toIndex - 1];
  const next = others[toIndex];

  if (!prev && !next) return 1000;
  if (!prev) return (next.position ?? 1000) / 2;
  if (!next) return (prev.position ?? 1000) + 1000;
  return ((prev.position ?? 0) + (next.position ?? 0)) / 2;
}

export function BoardClient({ board, userName, userId, initialCardId, workspaceMembers = [], isGlobalAdmin = false }: BoardClientProps) {
  const router = useRouter();
  const [lists, setLists] = useState<ListData[]>(board.lists);
  const [addingList, setAddingList] = useState(false);
  const [newListTitle, setNewListTitle] = useState("");
  const [creatingList, setCreatingList] = useState(false);

  // Sincronizar lists sempre que os dados do servidor (board prop) mudarem (ex: router.refresh)
  useEffect(() => {
    setLists(board.lists);
  }, [board]);

  // Card detail modal state
  const [selectedCard, setSelectedCard] = useState<CardData | null>(null);
  const [selectedListTitle, setSelectedListTitle] = useState("");

  // Drag state — card que está a ser arrastado agora
  const [activeCard, setActiveCard] = useState<CardData | null>(null);

  // Filter state
  const [filterKeyword, setFilterKeyword] = useState("");
  const [filterNoMembers, setFilterNoMembers] = useState(false);
  const [filterMyCards, setFilterMyCards] = useState(false);
  const [filterSelectedMembers, setFilterSelectedMembers] = useState<string[]>([]);

  const hasActiveFilters =
    filterKeyword.trim().length > 0 ||
    filterNoMembers ||
    filterMyCards ||
    filterSelectedMembers.length > 0;

  // Delete Board State
  const [deleteBoardOpen, setDeleteBoardOpen] = useState(false);
  const [deletingBoard, setDeletingBoard] = useState(false);
  const [hideDeletes, setHideDeletes] = useState(false);

  useEffect(() => {
    const handleSettingsChanged = () => {
      const val = localStorage.getItem("hideDeleteButtons");
      setHideDeletes(val === "true");
    };
    handleSettingsChanged();
    window.addEventListener("settingsChanged", handleSettingsChanged);
    return () => window.removeEventListener("settingsChanged", handleSettingsChanged);
  }, []);

  const canDeleteBoard = (board.workspace?.ownerId === userId || isGlobalAdmin) && !hideDeletes;

  async function handleDeleteBoard() {
    setDeletingBoard(true);
    try {
      const res = await fetch(`/api/boards/${board.id}`, { method: "DELETE" });
      if (!res.ok) throw new Error("Falha ao deletar board");
      router.push(`/workspaces/${board.workspaceId}`);
    } catch {
      setDeletingBoard(false);
    }
  }

  // Filtered lists computation
  const filteredLists = lists.map((list) => {
    if (!hasActiveFilters) return list;

    const lowerKeyword = filterKeyword.toLowerCase();

    const filteredCards = list.cards.filter((card) => {
      let matches = true;

      // 1. Keyword search (title, description)
      if (lowerKeyword) {
        const text = `${card.title} ${card.description || ""}`.toLowerCase();
        if (!text.includes(lowerKeyword)) matches = false;
      }

      // 2. Members filter - treat as OR logic for member conditions
      const membersCount = card.members ? card.members.length : 0;
      const isAssignedToMe = card.members?.some((m) => m.userId === userId) ?? false;
      const hasSelectedMember = filterSelectedMembers.length > 0
        ? card.members?.some((m) => filterSelectedMembers.includes(m.userId)) ?? false
        : false;

      // Se nenhum filtro de membro estiver ativo, a condição de membro passa.
      // Se pelo menos UM filtro de membro estiver ativo, o cartão DEVE casar com um deles.
      const hasMemberFilters = filterNoMembers || filterMyCards || filterSelectedMembers.length > 0;
      if (hasMemberFilters) {
        let memberMatch = false;
        if (filterNoMembers && membersCount === 0) memberMatch = true;
        if (filterMyCards && isAssignedToMe) memberMatch = true;
        if (hasSelectedMember) memberMatch = true;
        
        if (!memberMatch) matches = false;
      }

      return matches;
    });

    return { ...list, cards: filteredCards };
  });

  // =======================================================================
  // DnD sensors: PointerSensor com distância mínima de 8px para evitar
  // conflito com o onClick do card (clique rápido vs arrasto intencional)
  // =======================================================================
  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: { distance: 8 },
    })
  );

  // Deep-linking: Abre ou atualiza o card caso o ID esteja na URL
  useEffect(() => {
    if (initialCardId && lists.length > 0) {
      for (const list of lists) {
        const card = list.cards.find((c) => c.id === initialCardId);
        if (card) {
          setSelectedCard(card);
          setSelectedListTitle(list.title);
          break;
        }
      }
    }
  }, [initialCardId, lists]);

  // ─── DnD Handlers ────────────────────────────────────────────────────
  function handleDragStart(event: DragStartEvent) {
    const { active } = event;
    for (const list of lists) {
      const found = list.cards.find((c) => c.id === active.id);
      if (found) {
        setActiveCard(found);
        break;
      }
    }
  }

  function handleDragOver(event: DragOverEvent) {
    const { active, over } = event;
    if (!over || active.id === over.id) return;

    const activeId = active.id as string;
    const overId = over.id as string;

    // FIX: todo o calculo acontece dentro de setLists(prev => ...) para
    // usar o estado mais recente (prev), evitando closure stale.
    setLists((prev) => {
      const fromList = prev.find((l) => l.cards.some((c) => c.id === activeId));
      if (!fromList) return prev;

      const toList = prev.find(
        (l) => l.id === overId || l.cards.some((c) => c.id === overId)
      );
      if (!toList || fromList.id === toList.id) return prev;

      const card = fromList.cards.find((c) => c.id === activeId);
      if (!card) return prev;

      const overIndex = toList.cards.findIndex((c) => c.id === overId);
      const insertAt = overIndex >= 0 ? overIndex : toList.cards.length;

      return prev.map((l) => {
        if (l.id === fromList.id) {
          return { ...l, cards: l.cards.filter((c) => c.id !== activeId) };
        }
        if (l.id === toList.id) {
          const newCards = [...l.cards];
          newCards.splice(insertAt, 0, { ...card, listId: toList.id });
          return { ...l, cards: newCards };
        }
        return l;
      });
    });
  }

  function handleDragEnd(event: DragEndEvent) {
    setActiveCard(null);
    const { active, over } = event;
    if (!over) return;

    const activeId = active.id as string;
    const overId = over.id as string;

    // FIX: calcula o novo estado e persiste FORA do setLists para evitar
    // chamadas duplicadas do fetch pelo React.
    setLists((prev) => {
      const currentList = prev.find((l) => l.cards.some((c) => c.id === activeId));
      if (!currentList) return prev;

      // Se over.id e um card irmao na mesma lista, reordena
      const overIndex = currentList.cards.findIndex((c) => c.id === overId);

      if (overIndex >= 0 && activeId !== overId) {
        const oldIndex = currentList.cards.findIndex((c) => c.id === activeId);
        const reordered = arrayMove(currentList.cards, oldIndex, overIndex);
        const newPos = calcPosition(currentList.cards, overIndex, activeId);

        // Persiste (fire-and-forget)
        persistCardMove(activeId, currentList.id, newPos);

        return prev.map((l) =>
          l.id === currentList.id ? { ...l, cards: reordered } : l
        );
      }

      // Card foi movido entre listas pelo handleDragOver — persiste a posicao atual
      const cardIndex = currentList.cards.findIndex((c) => c.id === activeId);
      const newPos = calcPosition(currentList.cards, cardIndex, activeId);
      persistCardMove(activeId, currentList.id, newPos);

      return prev;
    });
  }

  /** Persiste a posicao do card no banco (fire-and-forget). */
  function persistCardMove(cardId: string, listId: string, position: number) {
    fetch(`/api/cards/${cardId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ listId, position }),
    }).catch(() => {/* silently ignore */});
  }

  // ─── Handlers normais ────────────────────────────────────────────────
  async function handleCreateList() {
    if (!newListTitle.trim() || creatingList) return;
    setCreatingList(true);

    try {
      const res = await fetch("/api/lists", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: newListTitle.trim(),
          boardId: board.id,
        }),
      });

      const data = await res.json();
      if (res.ok) {
        setLists((prev) => [...prev, data.list]);
        setNewListTitle("");
        setAddingList(false);
      }
    } catch {
      // silently fail
    } finally {
      setCreatingList(false);
    }
  }

  async function handleCreateCard(listId: string, title: string) {
    try {
      const res = await fetch("/api/cards", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title, listId }),
      });

      const data = await res.json();
      if (res.ok) {
        setLists((prev) =>
          prev.map((list) =>
            list.id === listId
              ? { ...list, cards: [...list.cards, data.card] }
              : list
          )
        );
      }
    } catch {
      // silently fail
    }
  }

  function handleUpdateListTitle(listId: string, newTitle: string) {
    setLists((prev) =>
      prev.map((list) =>
        list.id === listId ? { ...list, title: newTitle } : list
      )
    );
  }

  function handleCardClick(card: CardData, listTitle: string) {
    setSelectedCard(card);
    setSelectedListTitle(listTitle);
  }

  function handleCardUpdate(updatedCard: CardData) {
    setLists((prev) =>
      prev.map((list) => ({
        ...list,
        cards: list.cards.map((c) => {
          if (c.id !== updatedCard.id) return c;
          // Merge: preserva members/watchers/labels do estado atual se a API nao retornou
          return {
            ...c,
            ...updatedCard,
            members: updatedCard.members ?? c.members,
            watchers: updatedCard.watchers ?? c.watchers,
            labels: updatedCard.labels ?? c.labels,
          };
        }),
      }))
    );
    setSelectedCard((prev) => {
      if (!prev || prev.id !== updatedCard.id) return updatedCard;
      return {
        ...prev,
        ...updatedCard,
        members: updatedCard.members ?? prev.members,
        watchers: updatedCard.watchers ?? prev.watchers,
        labels: updatedCard.labels ?? prev.labels,
      };
    });
  }

  function handleCardDelete(cardId: string) {
    setLists((prev) =>
      prev.map((list) => ({
        ...list,
        cards: list.cards.filter((c) => c.id !== cardId),
      }))
    );
    setSelectedCard(null);
  }

  return (
    <div className="h-full flex flex-col bg-gradient-to-br from-purple-600 via-violet-500 to-pink-400">
      {/* Board Header e Filtros */}
      <BoardHeader title={board.title} boardId={board.id}>
        <BoardFilter
          workspaceMembers={workspaceMembers}
          userId={userId}
          filterKeyword={filterKeyword}
          setFilterKeyword={setFilterKeyword}
          filterNoMembers={filterNoMembers}
          setFilterNoMembers={setFilterNoMembers}
          filterMyCards={filterMyCards}
          setFilterMyCards={setFilterMyCards}
          filterSelectedMembers={filterSelectedMembers}
          setFilterSelectedMembers={setFilterSelectedMembers}
          hasActiveFilters={hasActiveFilters}
        />
        
        {canDeleteBoard && (
          <button
            onClick={() => setDeleteBoardOpen(true)}
            className="ml-4 shrink-0 text-red-300 hover:text-red-400 hover:bg-black/20 p-2 rounded-lg transition-colors"
            title="Deletar Board"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M14.74 9l-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 01-2.244 2.077H8.084a2.25 2.25 0 01-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 00-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 013.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 00-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 00-7.5 0" />
            </svg>
          </button>
        )}
      </BoardHeader>

      <ConfirmDialog
        open={deleteBoardOpen}
        onOpenChange={setDeleteBoardOpen}
        onConfirm={handleDeleteBoard}
        title="Deletar Board?"
        description="Esta acao e permanente. O board e todas as suas listas e cards serao removidos."
        confirmLabel="Deletar board"
      />

      {/* Kanban Canvas — scroll horizontal */}
      <DndContext
        sensors={sensors}
        collisionDetection={closestCorners}
        onDragStart={handleDragStart}
        onDragOver={handleDragOver}
        onDragEnd={handleDragEnd}
      >
        <div className="flex-1 overflow-x-auto overflow-y-hidden p-6">
          <div className="flex items-start gap-4 h-full">
            {/* Listas */}
            {filteredLists.map((list) => (
              <KanbanList
                key={list.id}
                id={list.id}
                title={list.title}
                cards={list.cards}
                workspaceMembers={workspaceMembers}
                onCreateCard={(title) => handleCreateCard(list.id, title)}
                onCardClick={(card) => handleCardClick(card, list.title)}
                onUpdateTitle={(newTitle) => handleUpdateListTitle(list.id, newTitle)}
              />
            ))}

            {/* Botao / Input adicionar outra lista */}
            {addingList ? (
              <div className="w-72 shrink-0 bg-slate-100 rounded-2xl p-3 shadow-md">
                <input
                  type="text"
                  value={newListTitle}
                  onChange={(e) => setNewListTitle(e.target.value)}
                  placeholder="Insira o titulo da lista..."
                  className="w-full px-3 py-2 text-sm rounded-lg border border-gray-300 focus:border-violet-500 focus:ring-1 focus:ring-violet-500/30 outline-none text-gray-800"
                  autoFocus
                  onKeyDown={(e) => {
                    if (e.key === "Enter") handleCreateList();
                    if (e.key === "Escape") {
                      setAddingList(false);
                      setNewListTitle("");
                    }
                  }}
                />
                <div className="flex items-center gap-2 mt-2">
                  <button
                    onClick={handleCreateList}
                    disabled={creatingList || !newListTitle.trim()}
                    className="px-3 py-1.5 bg-violet-600 text-white text-sm rounded-lg hover:bg-violet-700 transition-colors disabled:opacity-50 cursor-pointer"
                  >
                    {creatingList ? "Criando..." : "Adicionar lista"}
                  </button>
                  <button
                    onClick={() => {
                      setAddingList(false);
                      setNewListTitle("");
                    }}
                    className="p-1.5 text-gray-500 hover:text-gray-700 transition-colors cursor-pointer"
                  >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                </div>
              </div>
            ) : (
              <button
                onClick={() => setAddingList(true)}
                className="w-72 shrink-0 h-12 rounded-2xl bg-white/20 hover:bg-white/30 backdrop-blur-sm text-white/80 hover:text-white text-sm font-medium flex items-center justify-center gap-2 transition-all duration-200 cursor-pointer active:scale-[0.97]"
              >
                <svg
                  className="w-4 h-4"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                  strokeWidth={2}
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M12 4.5v15m7.5-7.5h-15"
                  />
                </svg>
                Adicionar outra lista
              </button>
            )}
          </div>
        </div>

        {/* DragOverlay — o card "fantasma" que voa pela tela durante o arrasto */}
        <DragOverlay dropAnimation={{
          duration: 200,
          easing: "cubic-bezier(0.18, 0.67, 0.6, 1.22)",
        }}>
          {activeCard ? (
            <div className="w-64 bg-white rounded-lg shadow-2xl border border-violet-400 px-3 py-2.5 rotate-[2deg] scale-105 opacity-95 pointer-events-none">
              <p className="text-sm text-gray-800 leading-snug font-medium">{activeCard.title}</p>
            </div>
          ) : null}
        </DragOverlay>
      </DndContext>

      {/* Card Detail Modal */}
      {selectedCard && (
        <CardDetailModal
          card={selectedCard}
          listTitle={selectedListTitle}
          userName={userName}
          userId={userId}
          boardId={board.id}
          workspaceId={board.workspaceId}
          isAdmin={isGlobalAdmin}
          onClose={() => {
            setSelectedCard(null);
            router.replace(`/boards/${board.id}`, { scroll: false });
          }}
          onUpdate={handleCardUpdate}
          onDelete={handleCardDelete}
        />
      )}
    </div>
  );
}
