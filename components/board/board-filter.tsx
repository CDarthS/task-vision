"use client";

import { useState, useRef, useEffect } from "react";
import type { WorkspaceMemberInfo } from "@/lib/types";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";

interface BoardFilterProps {
  workspaceMembers: WorkspaceMemberInfo[];
  userId: string;
  filterKeyword: string;
  setFilterKeyword: (k: string) => void;
  filterNoMembers: boolean;
  setFilterNoMembers: (v: boolean) => void;
  filterMyCards: boolean;
  setFilterMyCards: (v: boolean) => void;
  filterSelectedMembers: string[];
  setFilterSelectedMembers: (ids: string[]) => void;
  hasActiveFilters: boolean;
}

export function BoardFilter({
  workspaceMembers,
  userId,
  filterKeyword,
  setFilterKeyword,
  filterNoMembers,
  setFilterNoMembers,
  filterMyCards,
  setFilterMyCards,
  filterSelectedMembers,
  setFilterSelectedMembers,
  hasActiveFilters,
}: BoardFilterProps) {
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setOpen(false);
      }
    }
    if (open) {
      document.addEventListener("mousedown", handleClickOutside);
    }
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [open]);

  function toggleMember(memberId: string) {
    if (filterSelectedMembers.includes(memberId)) {
      setFilterSelectedMembers(filterSelectedMembers.filter((m) => m !== memberId));
    } else {
      setFilterSelectedMembers([...filterSelectedMembers, memberId]);
    }
  }

  function getInitials(name: string) {
    const parts = name.split(" ");
    if (parts.length >= 2) return (parts[0][0] + parts[1][0]).toUpperCase();
    return name.substring(0, 2).toUpperCase();
  }

  return (
    <div className="relative" ref={containerRef}>
      <button
        onClick={() => setOpen(!open)}
        className={`h-8 px-3 ml-4 rounded flex items-center gap-1.5 text-sm font-medium transition-colors ${
          hasActiveFilters
            ? "bg-violet-100 text-violet-800 hover:bg-violet-200"
            : "bg-white/20 text-white hover:bg-white/30 backdrop-blur-sm"
        }`}
      >
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z" />
        </svg>
        Filtros
        {hasActiveFilters && (
          <span className="w-2 h-2 ml-1 bg-violet-600 rounded-full" />
        )}
      </button>

      {open && (
        <div className="absolute right-0 top-full mt-2 w-80 bg-white rounded-xl shadow-xl border border-gray-200 p-0 text-gray-800 z-50 overflow-hidden outline-none animate-in fade-in slide-in-from-top-2">
          <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100 relative">
            <h3 className="font-semibold text-gray-800 text-center w-full">
              Filtro
            </h3>
            <button
              onClick={() => setOpen(false)}
              className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          <div className="p-4 overflow-y-auto max-h-[70vh]">
            <div className="space-y-4">
              {/* Palavra-chave */}
              <div>
                <label className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2 block">
                  Palavra-chave
                </label>
                <input
                  type="text"
                  placeholder="Insira uma palavra-chave..."
                  className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-1 focus:ring-violet-500 focus:border-violet-500"
                  value={filterKeyword}
                  onChange={(e) => setFilterKeyword(e.target.value)}
                />
                <p className="text-xs text-gray-500 mt-1">
                  Pesquise cartões, membros, etiquetas e muito mais.
                </p>
              </div>

              {/* Membros */}
              <div>
                <label className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2 block">
                  Membros
                </label>
                <div className="space-y-2">
                  <label className="flex items-center gap-3 p-1 hover:bg-gray-50 rounded cursor-pointer group">
                    <input
                      type="checkbox"
                      className="w-4 h-4 rounded border-gray-300 text-violet-600 focus:ring-violet-600 cursor-pointer"
                      checked={filterNoMembers}
                      onChange={(e) => setFilterNoMembers(e.target.checked)}
                    />
                    <div className="w-8 h-8 rounded-full bg-gray-200 flex items-center justify-center shrink-0">
                      <svg className="w-4 h-4 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                      </svg>
                    </div>
                    <span className="text-sm text-gray-700 font-medium select-none group-hover:text-gray-900">
                      Sem membros
                    </span>
                  </label>

                  <label className="flex items-center gap-3 p-1 hover:bg-gray-50 rounded cursor-pointer group">
                    <input
                      type="checkbox"
                      className="w-4 h-4 rounded border-gray-300 text-violet-600 focus:ring-violet-600 cursor-pointer"
                      checked={filterMyCards}
                      onChange={(e) => setFilterMyCards(e.target.checked)}
                    />
                    <div className="w-8 h-8 rounded-full bg-orange-600 text-white flex items-center justify-center shrink-0 text-xs font-bold">
                      ME
                    </div>
                    <span className="text-sm text-gray-700 font-medium select-none group-hover:text-gray-900">
                      Cartões atribuídos a mim
                    </span>
                  </label>
                </div>
              </div>

              {/* Selecionar Membros Dropdown Mocked as list */}
              <div>
                <div className="p-2 bg-gray-50 rounded-md border text-sm text-gray-500 mb-2">
                  Selecionar Membros
                </div>
                
                <div className="mt-2 space-y-1">
                  {workspaceMembers.filter(m => m.id !== userId).map((member) => (
                    <label key={member.id} className="flex items-center gap-3 p-1 hover:bg-gray-50 rounded cursor-pointer group">
                      <input
                        type="checkbox"
                        className="w-4 h-4 rounded border-gray-300 text-violet-600 focus:ring-violet-600 cursor-pointer"
                        checked={filterSelectedMembers.includes(member.id)}
                        onChange={() => toggleMember(member.id)}
                      />
                      <Avatar className="w-8 h-8 bg-violet-600 shrink-0">
                        <AvatarImage src={member.image || ""} />
                        <AvatarFallback className="text-xs bg-violet-600 text-white">
                          {getInitials(member.name)}
                        </AvatarFallback>
                      </Avatar>
                      <span className="text-sm text-gray-700 select-none group-hover:text-gray-900 truncate">
                        {member.name}
                      </span>
                    </label>
                  ))}
                </div>
              </div>

            </div>
          </div>
        </div>
      )}
    </div>
  );
}
