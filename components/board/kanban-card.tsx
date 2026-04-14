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
  labels?: { label: { id: string; name: string | null; color: string } }[];
  onClick?: () => void;
}

// Paleta de cores — mesma usada no card-detail-modal
const LABEL_COLORS_MAP: Record<string, string> = {
  green_subtle: "#4BCE97", yellow_subtle: "#F5CD47", orange_subtle: "#FEA362", red_subtle: "#F87168", purple_subtle: "#9F8FEF",
  green: "#1F845A", yellow: "#946F00", orange: "#C25100", red: "#C9372C", purple: "#6E5DC6",
  green_bold: "#216E4E", yellow_bold: "#7F5F01", orange_bold: "#A54800", red_bold: "#AE2E24", purple_bold: "#5E4DB2",
  blue_subtle: "#579DFF", cyan_subtle: "#6CC3E0", lime_subtle: "#94C748", pink_subtle: "#E774BB", black_subtle: "#8590A2",
  blue: "#0C66E4", cyan: "#227D9B", lime: "#5B7F24", pink: "#AE4787", black: "#626F86",
  blue_bold: "#09326C", cyan_bold: "#164555", lime_bold: "#37471F", pink_bold: "#943D73", black_bold: "#44546F",
};

function getLabelHex(color: string): string {
  return LABEL_COLORS_MAP[color] || "#8590A2";
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

export function KanbanCard({ id, title, hasDescription, dueDate, isDueCompleted, members = [], labels = [], onClick }: KanbanCardProps) {
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
      className={`bg-white rounded-xl shadow-sm border px-3.5 py-3 group transition-all duration-150 select-none flex flex-col gap-2 relative
        ${isDragging
          ? "shadow-xl border-violet-400 rotate-[2deg] scale-[1.03] z-50"
          : "border-gray-200/80 hover:bg-gray-50 hover:border-gray-300 hover:shadow-md active:scale-[0.98]"
        }`}
    >
      {/* Etiquetas / Labels */}
      {labels && labels.length > 0 && (
        <div className="flex flex-wrap gap-1 mb-1">
          {labels.map(({ label }) => (
            <span
              key={label.id}
              title={label.name || undefined}
              className={`inline-block rounded-full shadow-sm ${
                label.name ? "px-2 py-[2px] text-[10px] font-bold text-white max-w-full truncate" : "w-10 h-2"
              }`}
              style={{ backgroundColor: getLabelHex(label.color) }}
            >
              {label.name}
            </span>
          ))}
        </div>
      )}
      
      <p className="text-sm text-gray-800 leading-snug break-words">{title}</p>
      
      {/* Indicadores visuais + membros */}
      {(hasDescription || hasDue || members.length > 0) && (
        <div className="flex items-end justify-between gap-2 mt-auto pt-1">
          {/* Indicadores a esquerda */}
          <div className="flex flex-wrap items-center gap-1.5 flex-1 min-w-0">
            {hasDescription && (
              <span className="flex items-center justify-center text-gray-400 hover:text-gray-600 rounded px-1 py-0.5" title="Este cartão tem uma descrição">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 6.75h16.5M3.75 12h16.5m-16.5 5.25H12" />
                </svg>
              </span>
            )}
            {hasDue && (
              <span
                className={`inline-flex items-center whitespace-nowrap gap-1 text-[11px] px-1.5 py-0.5 rounded font-medium transition-colors ${
                  isDueCompleted
                    ? "bg-green-500 text-white"
                    : isOverdue
                    ? "bg-red-500 text-white"
                    : "bg-transparent text-gray-500 hover:bg-gray-200 hover:text-gray-700"
                }`}
                title={isDueCompleted ? "Concluído" : isOverdue ? "Atrasado" : "Data de entrega"}
              >
                <svg className="w-3 h-3 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6h4.5m4.5 0a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z" />
                </svg>
                {formattedDue}
                {isDueCompleted && " ✓"}
              </span>
            )}
          </div>
          
          {/* Avatares dos membros a direita */}
          {members.length > 0 && (
            <div className="flex justify-end -space-x-1 shrink-0 ml-2" title={members.map((m) => m.name).join(", ")}>
              {members.slice(0, 5).map((member) => {
                const colorIdx = member.name.charCodeAt(0) % avatarColors.length;
                const initials = member.name.split(" ").map((n) => n[0]).join("").toUpperCase().slice(0, 2);
                return (
                  <div
                    key={member.id}
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
              {members.length > 5 && (
                <div className="w-7 h-7 rounded-full bg-gray-100 flex items-center justify-center text-[10px] font-medium text-gray-600 ring-2 ring-white shadow-sm">
                  +{members.length - 5}
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
