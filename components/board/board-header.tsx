"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { EditableTitle } from "@/components/editable-title";

interface BoardHeaderProps {
  title: string;
  boardId: string;
  children?: React.ReactNode;
}

export function BoardHeader({ title, boardId, children }: BoardHeaderProps) {
  const router = useRouter();
  const [currentTitle, setCurrentTitle] = useState(title);

  async function handleSaveTitle(newTitle: string) {
    const res = await fetch(`/api/boards/${boardId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ title: newTitle }),
    });

    if (!res.ok) {
      throw new Error("Falha ao salvar");
    }

    setCurrentTitle(newTitle);
    router.refresh();
  }

  return (
    <div className="h-12 shrink-0 flex items-center px-5 bg-black/20 backdrop-blur-sm relative z-20">
      {/* Titulo do board — editavel inline */}
      <EditableTitle
        value={currentTitle}
        onSave={handleSaveTitle}
        tag="h1"
        className="text-base font-bold text-white shrink-0"
        inputClassName="text-base font-bold text-white w-64"
      />
      
      {/* Actions / Children */}
      <div className="flex-1 flex justify-end items-center">
        {children}
      </div>
    </div>
  );
}
