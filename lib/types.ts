/**
 * Tipos compartilhados do Task Vision.
 * Interfaces serializadas (datas como string ISO) para uso em Client Components.
 */

export interface CardData {
  id: string;
  title: string;
  description: string | null;
  position: number;
  listId: string;
  dueDate: string | null;
  isDueCompleted: boolean;
  creatorId: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface ListData {
  id: string;
  title: string;
  position: number;
  boardId: string;
  createdAt: string;
  updatedAt: string;
  cards: CardData[];
}

export interface BoardData {
  id: string;
  title: string;
  background: string | null;
  workspaceId: string;
  workspace: {
    id: string;
    name: string;
    ownerId: string;
  };
  lists: ListData[];
}
