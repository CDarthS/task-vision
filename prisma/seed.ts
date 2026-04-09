import "dotenv/config";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../lib/generated/prisma/client";
import bcrypt from "bcrypt";

async function main() {
  const adapter = new PrismaPg({
    connectionString: process.env.DATABASE_URL!,
  });
  const prisma = new PrismaClient({ adapter });

  const email = process.env.DEFAULT_ADMIN_EMAIL;
  const password = process.env.DEFAULT_ADMIN_PASSWORD;
  const name = process.env.DEFAULT_ADMIN_NAME || "Administrador";

  if (!email || !password) {
    console.log(
      "⚠️  DEFAULT_ADMIN_EMAIL e DEFAULT_ADMIN_PASSWORD não definidos. Pulando seed."
    );
    return;
  }

  const existing = await prisma.user.findUnique({ where: { email } });

  if (existing) {
    console.log(`✅ Admin "${email}" já existe. Nada a fazer.`);
    return;
  }

  const hashedPassword = await bcrypt.hash(password, 10);

  await prisma.user.create({
    data: {
      email,
      password: hashedPassword,
      name,
      role: "ADMIN",
    },
  });

  console.log(`✅ Admin "${email}" criado com sucesso!`);
}

main().catch((err) => {
  console.error("❌ Erro no seed:", err);
  process.exit(1);
});
