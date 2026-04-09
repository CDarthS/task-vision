"use client";

interface KanbanCardProps {
  id: string;
  title: string;
  hasDescription?: boolean;
  onClick?: () => void;
}

export function KanbanCard({ title, hasDescription, onClick }: KanbanCardProps) {
  return (
    <div
      onClick={onClick}
      className="bg-white rounded-lg shadow-sm border border-gray-200/80 px-3 py-2.5 cursor-pointer hover:bg-gray-50 hover:border-gray-300 hover:shadow-md transition-all duration-150 group active:scale-[0.98]"
    >
      <p className="text-sm text-gray-800 leading-snug select-none">{title}</p>
      {/* Indicadores visuais */}
      {hasDescription && (
        <div className="mt-1.5 flex items-center gap-1">
          <svg className="w-3.5 h-3.5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 6.75h16.5M3.75 12h16.5m-16.5 5.25H12" />
          </svg>
        </div>
      )}
    </div>
  );
}
