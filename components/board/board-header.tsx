"use client";

interface BoardHeaderProps {
  title: string;
}

export function BoardHeader({ title }: BoardHeaderProps) {
  return (
    <div className="h-12 shrink-0 flex items-center px-5 bg-black/20 backdrop-blur-sm">
      {/* Titulo do board */}
      <h1 className="text-base font-bold text-white truncate">{title}</h1>
    </div>
  );
}
