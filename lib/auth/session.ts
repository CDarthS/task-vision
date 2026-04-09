import { v4 as uuidv4 } from "uuid";
import { prisma } from "@/lib/prisma";
import { createToken } from "./jwt";

interface CreateSessionInput {
  userId: string;
  remoteAddress?: string;
  userAgent?: string;
}

export async function createSession(input: CreateSessionInput) {
  const accessToken = createToken(input.userId);
  const httpOnlyToken = uuidv4();
  const expiresAt = new Date(Date.now() + 365 * 24 * 60 * 60 * 1000); // 365 days

  const session = await prisma.session.create({
    data: {
      accessToken,
      httpOnlyToken,
      userId: input.userId,
      remoteAddress: input.remoteAddress,
      userAgent: input.userAgent,
      expiresAt,
    },
  });

  return { session, accessToken, httpOnlyToken };
}

export async function getSessionByToken(accessToken: string) {
  return prisma.session.findUnique({
    where: { accessToken },
    include: { user: true },
  });
}

export async function deleteSession(accessToken: string) {
  return prisma.session.delete({ where: { accessToken } });
}

export async function deleteAllUserSessions(userId: string) {
  return prisma.session.deleteMany({ where: { userId } });
}
