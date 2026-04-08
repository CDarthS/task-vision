# 🎯 Task Vision

> Gerenciador de tarefas estilo Kanban — organize seus projetos com quadros, listas e cards arrastáveis.

**Stack:** Next.js 16 • TypeScript • Prisma 7 • PostgreSQL • Tailwind CSS • shadcn/ui • dnd-kit

---

## 📦 Como rodar localmente

### Pré-requisitos

Antes de começar, você precisa ter instalado:
- **Node.js** 18+ → [Baixar aqui](https://nodejs.org/)
- **npm** (já vem com o Node.js)
- **PostgreSQL** instalado localmente OU usar o banco da Railway (veja seção de deploy)

### 1️⃣ Instalar as dependências
> *Por quê?* Baixa todas as bibliotecas que o projeto precisa pra funcionar.

```bash
npm install
```

### 2️⃣ Configurar o banco de dados
> *Por quê?* O projeto precisa de um PostgreSQL pra guardar os dados.

Copie o arquivo de exemplo e preencha com seus dados:
```bash
cp .env.example .env
```

Abra o `.env` e preencha o `DATABASE_URL` com sua conexão PostgreSQL:
```
DATABASE_URL="postgresql://usuario:senha@localhost:5432/taskvision?schema=public"
```

### 3️⃣ Criar as tabelas no banco
> *Por quê?* Manda o Prisma criar todas as tabelas baseado no schema que definimos.

```bash
npm run db:push
```

### 4️⃣ Rodar o projeto
> *Por quê?* Inicia o servidor de desenvolvimento com hot reload (atualiza sozinho quando você muda o código).

```bash
npm run dev
```

Abra [http://localhost:3000](http://localhost:3000) no navegador. Você deve ver a tela do Task Vision com "Fase 1 ✅" 🎉

---

## 🚀 Como subir pro GitHub

### 1️⃣ Criar o repositório no GitHub
- Abra [github.com/new](https://github.com/new)
- Nome: `task-vision`
- Deixe **privado** se quiser
- **NÃO** marque "Initialize with README" (já temos um)
- Clique em **Create repository**

### 2️⃣ Enviar o código
> *Por quê?* Coloca seu código na nuvem, seguro e versionado.

```bash
git add .
git commit -m "feat: Fase 1 - esqueleto vivo do Task Vision"
git branch -M main
git remote add origin https://github.com/SEU_USUARIO/task-vision.git
git push -u origin main
```

> ⚠️ Troque `SEU_USUARIO` pelo seu nome de usuário do GitHub!

---

## 🚂 Como fazer deploy na Railway

### 1️⃣ Criar conta na Railway
- Acesse [railway.app](https://railway.app/) e faça login com GitHub

### 2️⃣ Criar novo projeto
- Clique em **"New Project"**
- Escolha **"Deploy from GitHub repo"**
- Selecione o repositório `task-vision`

### 3️⃣ Adicionar PostgreSQL
> *Por quê?* Seu app precisa de um banco de dados pra guardar as informações.

- No projeto Railway, clique em **"+ New"** → **"Database"** → **"PostgreSQL"**
- A Railway cria o banco automaticamente! 🎉

### 4️⃣ Conectar o banco ao app
> *Por quê?* O app precisa saber onde o banco está.

- Clique no serviço do seu app (task-vision)
- Vá em **"Settings"** → **"Networking"** ou **"Variables"**
- Clique em **"Add Variable Reference"**
- Selecione `DATABASE_URL` do serviço PostgreSQL
- A Railway preenche automaticamente! 🎉

### 5️⃣ Criar as tabelas no banco da Railway
> *Por quê?* O `db push` cria as tabelas que definimos no schema do Prisma.

No seu terminal local, use a `DATABASE_URL` da Railway:

```bash
DATABASE_URL="cole_a_url_da_railway_aqui" npx prisma db push
```

> 💡 Você encontra a URL em: Railway → serviço PostgreSQL → aba **"Connect"** → **"Raw"** ou **"Prisma"**

### 6️⃣ Pronto! 🎉
A Railway faz o build automaticamente a cada `git push`! O Nixpacks detecta que é um projeto Node.js e roda os scripts corretos.

---

## 🔑 Variáveis de Ambiente

| Variável | Descrição | Obrigatória |
|----------|-----------|:-----------:|
| `DATABASE_URL` | Conexão com PostgreSQL | ✅ |
| `NEXTAUTH_URL` | URL base da app (ex: `https://task-vision.up.railway.app`) | 🔜 Fase 2 |
| `NEXTAUTH_SECRET` | Chave secreta para sessões | 🔜 Fase 2 |
| `GOOGLE_CLIENT_ID` | ID do app Google (login) | 🔜 Fase 2 |
| `GOOGLE_CLIENT_SECRET` | Segredo do app Google | 🔜 Fase 2 |

---

## 🛠️ Comandos Úteis

| Comando | O que faz |
|---------|-----------|
| `npm run dev` | Inicia o servidor de desenvolvimento |
| `npm run build` | Compila o projeto pra produção |
| `npm run start` | Roda a versão de produção |
| `npm run lint` | Verifica erros no código |
| `npm run db:push` | Envia o schema pro banco (cria/atualiza tabelas) |
| `npm run db:studio` | Abre uma interface visual pra ver o banco de dados |

---

## 📋 Roadmap

- [x] **Fase 1** — Esqueleto vivo (projeto + banco + deploy)
- [ ] **Fase 2** — Autenticação (NextAuth.js + Google)
- [ ] **Fase 3** — UI de Workspaces e Boards
- [ ] **Fase 4** — Listas e Cards com drag & drop
- [ ] **Fase 5** — Convites e permissões

---

Feito com 💜 por **Carlos** • SV Digital Ltda
