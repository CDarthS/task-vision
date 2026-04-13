// scripts/fill-usernames.ts — Preenche usernames vazios baseado no email
//
// Uso: DATABASE_URL="postgres://..." npx tsx scripts/fill-usernames.ts
//
// Necessario apenas uma vez apos tornar username obrigatorio no schema.
// Busca usuarios com username vazio ("") e gera um baseado no email.

import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../lib/generated/prisma/client";
import "dotenv/config";

async function main() {
  const adapter = new PrismaPg({
    connectionString: process.env.DATABASE_URL!,
  });
  const prisma = new PrismaClient({ adapter });

  // Busca usuarios com username vazio (nao mais null, pois o campo e obrigatorio)
  const users = await prisma.user.findMany({
    where: { username: "" },
  });

  if (users.length === 0) {
    console.log("Nenhum usuario sem username encontrado.");
    return;
  }

  console.log(`Encontrados ${users.length} usuarios sem username.`);

  for (const user of users) {
    const baseUsername = user.email.split("@")[0].toLowerCase().replace(/[^a-z0-9_]/g, "");
    let finalUsername = baseUsername || "user";
    let counter = 1;

    while (true) {
      const existing = await prisma.user.findUnique({ where: { username: finalUsername } });
      if (!existing || existing.id === user.id) break;
      finalUsername = `${baseUsername}${counter}`;
      counter++;
    }

    await prisma.user.update({
      where: { id: user.id },
      data: { username: finalUsername },
    });
    console.log(`  ${user.email} -> @${finalUsername}`);
  }

  console.log("Feito!");
}

main()
  .catch(console.error);
