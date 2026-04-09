"use client";

interface KanbanCardProps {
  id: string;
  title: string;
}

export function KanbanCard({ title }: KanbanCardProps) {
  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200/80 px-3 py-2.5 cursor-pointer hover:bg-gray-50 hover:border-gray-300 hover:shadow-md transition-all duration-150 group active:scale-[0.98]">
      <p className="text-sm text-gray-800 leading-snug select-none">{title}</p>
    </div>
  );
}
