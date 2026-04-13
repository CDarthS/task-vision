"use client";

import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";

interface CardMemberInfo {
  id: string;
  name: string;
  image: string | null;
}

interface KanbanCardProps {
  id: string;
  title: string;
  hasDescription?: boolean;
  dueDate?: string | null;
  isDueCompleted?: boolean;
  members?: CardMemberInfo[];
  onClick?: () => void;
}

const avatarColors = [
  "from-orange-400 to-orange-600",
  "from-blue-400 to-blue-600",
  "from-green-400 to-green-600",
  "from-purple-400 to-purple-600",
  "from-pink-400 to-pink-600",
  "from-teal-400 to-teal-600",
  "from-red-400 to-red-600",
  "from-indigo-400 to-indigo-600",
];

export function KanbanCard({ id, title, hasDescription, dueDate, isDueCompleted, members = [], onClick }: KanbanCardProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id });

  // Due date display helpers
  const hasDue = !!dueDate;
  const dueDateObj = hasDue ? new Date(dueDate) : null;
  const isOverdue = hasDue && !isDueCompleted && dueDateObj && dueDateObj < new Date();
  const formattedDue = dueDateObj
    ? dueDateObj.toLocaleDateString("pt-BR", { day: "numeric", month: "short" })
    : "";

  const style: React.CSSProperties = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.4 : 1,
    cursor: isDragging ? "grabbing" : "grab",
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...attributes}
      {...listeners}
      onClick={(e) => {
        // Só dispara onClick se não estiver a arrastar
        if (!isDragging && onClick) onClick();
        e.stopPropagation();
      }}
      className={`bg-white rounded-lg shadow-sm border px-3 py-2.5 group transition-all duration-150 select-none
        ${isDragging
          ? "shadow-xl border-violet-400 rotate-[2deg] scale-[1.03] z-50"
          : "border-gray-200/80 hover:bg-gray-50 hover:border-gray-300 hover:shadow-md active:scale-[0.98]"
        }`}
    >
      <p className="text-sm text-gray-800 leading-snug">{title}</p>
      {/* Indicadores visuais + membros */}
      {(hasDescription || hasDue || members.length > 0) && (
        <div className="mt-1.5 flex items-center gap-2">
          {/* Indicadores a esquerda */}
          <div className="flex items-center gap-2 flex-wrap flex-1 min-w-0">
            {hasDescription && (
              <svg className="w-3.5 h-3.5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 6.75h16.5M3.75 12h16.5m-16.5 5.25H12" />
              </svg>
            )}
            {hasDue && (
              <span
                className={`inline-flex items-center gap-1 text-xs px-1.5 py-0.5 rounded font-medium ${
                  isDueCompleted
                    ? "bg-green-100 text-green-700"
                    : isOverdue
                    ? "bg-red-100 text-red-700"
                    : "bg-yellow-50 text-yellow-700"
                }`}
              >
                <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6h4.5m4.5 0a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z" />
                </svg>
                {formattedDue}
                {isDueCompleted && " ✓"}
              </span>
            )}
          </div>
          {/* Avatares dos membros a direita */}
          {members.length > 0 && (
            <div className="flex -space-x-1.5 shrink-0 flex-wrap justify-end gap-y-1">
              {members.map((member) => {
                const colorIdx = member.name.charCodeAt(0) % avatarColors.length;
                const initials = member.name.split(" ").map((n) => n[0]).join("").toUpperCase().slice(0, 2);
                return (
                  <div
                    key={member.id}
                    title={member.name}
                    className={`w-7 h-7 rounded-full flex items-center justify-center text-[10px] font-bold text-white ring-2 ring-white overflow-hidden shadow-sm ${
                      member.image ? "" : `bg-gradient-to-br ${avatarColors[colorIdx]}`
                    }`}
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
            </div>
          )}
        </div>
      )}
    </div>
  );
}
