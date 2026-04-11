import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Task Vision — Gerenciador de Tarefas Kanban",
  description:
    "Organize seus projetos com quadros kanban colaborativos. Crie workspaces, boards, listas e cards com drag & drop.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="pt-BR" className="h-full antialiased font-sans">
      <body className="min-h-full flex flex-col bg-background text-foreground">{children}</body>
    </html>
  );
}
