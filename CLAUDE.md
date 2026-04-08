# 📓 Task Vision — Diário de Bordo (claude.md)

> Este arquivo registra **tudo** o que foi feito no projeto, incluindo erros cometidos, correções aplicadas e decisões tomadas.

---

## 🗓️ 2026-04-08 — Fase 1: Esqueleto Vivo

### 🔍 Referência
- Repositório de referência: `https://github.com/SVTestes/kanban-vision` (fork do Planka, JavaScript/Sails.js)
- **NÃO copiamos nada literalmente** — usamos apenas como inspiração para entender a estrutura de um kanban board
- O kanban-vision usa: JavaScript 95.5%, SCSS 4.4%, Docker, Sails.js
- O Task Vision é escrito **do zero** com stack completamente diferente: Next.js 16 + TypeScript + Prisma 7 + PostgreSQL

### 📋 Plano de Execução
| Passo | Descrição | Status |
|-------|-----------|--------|
| 1 | Inicializar Next.js 16 | ✅ Feito |
| 2 | Instalar dependências (Prisma, dnd-kit, shadcn/ui) | ✅ Feito |
| 3 | Criar schema Prisma | ✅ Feito |
| 4 | Prisma Client singleton | ✅ Feito |
| 5 | Criar .env.example | ✅ Feito |
| 6 | Página inicial com status do banco | ✅ Feito |
| 7 | Scripts do package.json | ✅ Feito |
| 8 | Ajustar .gitignore | ✅ Feito |
| 9 | README.md em português | ✅ Feito |

---

### Passo 1 — Inicializar Next.js

**Início:** 17:47 BRT

**Comando:** `npx -y create-next-app@latest . --typescript --tailwind --eslint --app --no-src-dir --import-alias "@/*" --use-npm`

**🐛 Erro 1:** O `create-next-app` recusou porque o `claude.md` já existia na pasta. Erro: *"The directory taskvision contains files that could conflict: claude.md"*

**🔧 Correção 1:** Movi o `claude.md` temporariamente para `d:\claude\claude_temp.md`, rodei o create-next-app, e depois trouxe de volta.

**⚠️ Observação:** O `create-next-app@16.2.3` instalou Next.js 16 (não 15 como pedido no task original). Como é a versão mais recente estável, mantivemos.

**⚠️ Observação 2:** O Next.js 16 criou automaticamente um `AGENTS.md` na pasta (feature nova). Esse arquivo foi substituído pelo nosso `claude.md`.

**Resultado:** ✅ Projeto criado com sucesso em `D:\claude\taskvision`

---

### Passo 2 — Instalar dependências

**🐛 Erro 2:** O PowerShell não aceita `&&` para encadear comandos npm. Erro: *"O token '&&' não é um separador de instruções válido nesta versão."*

**🔧 Correção 2:** Rodei cada `npm install` separadamente em vez de encadear.

**Comandos executados:**
1. `npm install prisma --save-dev` ✅
2. `npm install @prisma/client @dnd-kit/core @dnd-kit/sortable @dnd-kit/utilities` ✅
3. `npx prisma init` ✅ (criou `prisma/schema.prisma` e `prisma.config.ts`)
4. `npx shadcn@latest init --defaults --force` ✅ (instalou shadcn v4.2.0, criou `button.tsx` e `utils.ts`)

**⚠️ Observação sobre Prisma 7:** O `npx prisma init` criou um `prisma.config.ts` (novo no Prisma 7) e definiu o generator com `provider = "prisma-client"` (não mais `prisma-client-js`). O output padrão foi `../app/generated/prisma`.

**Resultado:** ✅ Todas as dependências instaladas

---

### Passo 3 — Schema do Prisma

Criado `prisma/schema.prisma` com 6 models + 1 enum:
- **User** — usuários do sistema
- **Workspace** — workspaces (grupos de quadros)
- **WorkspaceMember** — relação N:N entre User e Workspace com roles
- **Board** — quadros kanban dentro de um workspace
- **List** — listas dentro de um board
- **Card** — cards dentro de uma lista
- **Invitation** — convites para workspaces

Todos com `onDelete: Cascade` (exceto User, que é raiz).

**Resultado:** ✅ Schema criado

---

### Passo 4 — Prisma Client singleton

**🐛 Erro 3:** O import `@/app/generated/prisma` não foi resolvido pelo Turbopack durante o build. Erro: *"Module not found: Can't resolve '@/app/generated/prisma'"*

**🔧 Tentativa 1:** Troquei para import relativo `../app/generated/prisma`. **Falhou** — mesmo erro.

**🔧 Tentativa 2:** Mudei o output do Prisma de `app/generated/prisma` para `lib/generated/prisma` e usei `@/lib/generated/prisma`. **Falhou** — mesmo erro.

**🔧 Tentativa 3:** Usei import explícito `./generated/prisma/client`. **FUNCIONOU!** O Turbopack consegue resolver quando aponta diretamente para o arquivo `.ts` gerado.

**🐛 Erro 4:** Após resolver o import, o TypeScript reclamou: *"Expected 1 arguments, but got 0"* no `new PrismaClient()`.

**🔍 Investigação:** Consultei a documentação oficial do Prisma 7. Descobri que o Prisma 7 **requer** obrigatoriamente um "driver adapter" — não é mais possível instanciar `new PrismaClient()` sem argumento.

**🔧 Correção 4:** 
1. Instalei `@prisma/adapter-pg` e `pg` 
2. Reescrevi o singleton para criar um `PrismaPg` adapter com a `DATABASE_URL`
3. Passei `{ adapter }` para o constructor do `PrismaClient`

**Resultado:** ✅ Build passou

---

### Passo 5 — .env.example

Criado `.env.example` com todas as variáveis de ambiente documentadas em português.

**Resultado:** ✅ Arquivo criado

---

### Passo 6 — Página inicial

Criada `app/page.tsx` como Server Component com:
- Gradiente escuro de slate para indigo
- Ícone de clipboard com gradiente roxo
- Título "Task Vision" com gradiente no texto
- Subtítulo "Esqueleto vivo — Fase 1 ✅"
- Card de status do banco com try/catch no `prisma.user.count()`
- Badges da stack tech
- Rodapé "Feito por Carlos • SV Digital Ltda"

**🐛 Erro 5:** A mensagem de erro do banco era muito longa e técnica (Turbopack encodava nomes de módulos internos na mensagem). Tomava conta da tela inteira.

**🔧 Correção 5:** Adicionei truncamento da mensagem de erro para no máximo 100 caracteres.

**Resultado:** ✅ Página bonita e funcional

---

### Passo 7 — Scripts do package.json

Scripts configurados:
```json
{
  "dev": "next dev",
  "build": "prisma generate && next build",
  "start": "next start",
  "lint": "eslint .",
  "postinstall": "prisma generate",
  "db:push": "prisma db push",
  "db:studio": "prisma studio"
}
```

**🐛 Erro 6:** O `next lint` não funciona no Next.js 16 — dá erro *"Invalid project directory provided, no such directory: D:\claude\taskvision\lint"*

**🔧 Correção 6:** Troquei `next lint` por `eslint .` que funciona corretamente com o flat config do ESLint 9.

**Resultado:** ✅ Scripts funcionando

---

### Passo 8 — .gitignore

Ajustes feitos:
- `.env*` já estava ignorado (veio do create-next-app)
- Adicionei `!.env.example` para que o template de variáveis vá pro Git
- `/lib/generated/prisma` ignorado (client gerado pelo Prisma)
- `prisma/migrations` **NÃO** está ignorado (histórico de migrations deve ir pro Git)

**Resultado:** ✅ Gitignore correto

---

### Passo 9 — README.md

Criado README estilo "receita de bolo" com:
- Como rodar localmente (4 passos)
- Como subir pro GitHub (2 passos com comandos exatos)
- Como fazer deploy na Railway (6 passos)
- Tabela de variáveis de ambiente
- Tabela de comandos úteis
- Roadmap das fases

**Resultado:** ✅ README completo em português

---

### ✅ Verificação Final

| Check | Status |
|-------|--------|
| `npm run build` completa sem erros | ✅ |
| `npm run lint` passa sem erros | ✅ |
| Página abre em localhost:3000 | ✅ |
| Título "Task Vision" aparece | ✅ |
| Status do banco aparece (🔴 offline, como esperado) | ✅ |
| TypeScript strict ativado | ✅ |
| Cascade deletes no schema | ✅ |
| Sem autenticação (Fase 2) | ✅ |
| Sem UI de boards/cards (Fase 3-4) | ✅ |

---

### 📊 Resumo de Erros e Correções

| # | Erro | Causa | Correção |
|---|------|-------|----------|
| 1 | create-next-app recusa pasta com arquivos | claude.md existia na pasta | Movi temporariamente |
| 2 | `&&` não funciona no PowerShell | Sintaxe do PowerShell é diferente | Rodei comandos separados |
| 3 | Turbopack não resolve importações do Prisma gerado | Prisma 7 gera ESM com `import.meta.url` | Importei diretamente o `client.ts` |
| 4 | PrismaClient requer 1 argumento | Prisma 7 exige driver adapter | Adicionei `@prisma/adapter-pg` |
| 5 | Mensagem de erro muito longa | Turbopack encoda nomes internos | Truncamento para 100 chars |
| 6 | `next lint` não funciona no Next.js 16 | Bug/mudança na CLI | Troquei por `eslint .` |

---

### 🗂️ Estrutura Final do Projeto

```
taskvision/
├── app/
│   ├── globals.css              # Estilos globais (Tailwind + shadcn)
│   ├── layout.tsx               # Layout raiz (metadata, fontes)
│   └── page.tsx                 # Página inicial com status do banco
├── components/
│   └── ui/
│       └── button.tsx           # Componente button do shadcn
├── lib/
│   ├── generated/prisma/        # Client do Prisma (gerado, gitignored)
│   ├── prisma.ts                # Singleton do Prisma com adapter
│   └── utils.ts                 # Utilitário cn() do shadcn
├── prisma/
│   └── schema.prisma            # Schema do banco de dados
├── public/                      # Arquivos estáticos
├── .env                         # Variáveis de ambiente (gitignored)
├── .env.example                 # Template de variáveis
├── .gitignore                   # Arquivos ignorados pelo Git
├── claude.md                    # Este diário de bordo
├── components.json              # Config do shadcn
├── eslint.config.mjs            # Config do ESLint 9
├── next.config.ts               # Config do Next.js
├── package.json                 # Dependências e scripts
├── postcss.config.mjs           # Config do PostCSS
├── prisma.config.ts             # Config do Prisma 7
├── README.md                    # Guia em português
└── tsconfig.json                # Config do TypeScript (strict: true)
```
