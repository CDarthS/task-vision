// lib/prisma.ts — Singleton do Prisma Client com Driver Adapter (Prisma 7)
//
// O Prisma 7 requer um "driver adapter" para conectar ao banco.
// Para PostgreSQL, usamos @prisma/adapter-pg com a lib pg.
//
// No dev, o Next.js faz hot reload e recriaria o PrismaClient a cada mudança.
// Sem singleton, isso esgota o limite de conexões do PostgreSQL rapidamente.
// A solução é guardar a instância no globalThis (que sobrevive ao hot reload).

import { PrismaClient } from "./generated/prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";

function createPrismaClient(): PrismaClient {
  const adapter = new PrismaPg({
    connectionString: process.env.DATABASE_URL!,
  });
  return new PrismaClient({ adapter });
}

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

export const prisma = globalForPrisma.prisma ?? createPrismaClient();

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.prisma = prisma;
}
