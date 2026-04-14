import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/auth/get-current-user";
import { uploadToS3, deleteFromS3, getS3Key, extractS3KeyFromUrl, replaceWithPresignedUrl } from "@/lib/s3";
import { randomUUID } from "crypto";

// ─── Constantes de validacao ─────────────────────
const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB
// Prefixos permitidos — aceita codec suffixes (ex: audio/webm;codecs=opus)
const ALLOWED_MIME_PREFIXES = [
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/gif",
  "audio/webm",
  "audio/mp4",
  "audio/ogg",
  "audio/mpeg",
];

// ─── Helper: verificar permissao ──────────────────
async function checkCardAccess(cardId: string, userId: string, userRole: string) {
  const card = await prisma.card.findUnique({
    where: { id: cardId },
    include: { list: { include: { board: { select: { id: true, workspaceId: true } } } } },
  });
  if (!card) return null;

  const membership = await prisma.workspaceMember.findUnique({
    where: { workspaceId_userId: { workspaceId: card.list.board.workspaceId, userId } },
  });
  if (!membership && userRole !== "ADMIN") return null;

  return card;
}

// GET /api/cards/[id]/attachments — listar anexos do card
export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await requireUser();
    const { id } = await params;

    const card = await checkCardAccess(id, user.id, user.role);
    if (!card) return NextResponse.json({ error: "Card nao encontrado ou sem permissao" }, { status: 404 });

    const attachments = await prisma.attachment.findMany({
      where: { cardId: id },
      include: { creator: { select: { id: true, name: true } } },
      orderBy: { createdAt: "desc" },
    });

    // Substituir URLs do S3 por pre-signed URLs para arquivos (nao links)
    const signedAttachments = await Promise.all(
      attachments.map(async (a) => {
        if (a.type === "link") return a;
        const signedUrl = await replaceWithPresignedUrl(a.url);
        return { ...a, url: signedUrl };
      })
    );

    return NextResponse.json({ attachments: signedAttachments });
  } catch (err) {
    if (err instanceof Error && err.message === "Unauthorized") return NextResponse.json({ error: "Nao autenticado" }, { status: 401 });
    return NextResponse.json({ error: "Erro interno" }, { status: 500 });
  }
}

// POST /api/cards/[id]/attachments — criar anexo (link OU arquivo)
//
// Se content-type = multipart/form-data → upload de arquivo para S3
// Se content-type = application/json → link (comportamento original)
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await requireUser();
    const { id } = await params;

    const card = await checkCardAccess(id, user.id, user.role);
    if (!card) return NextResponse.json({ error: "Card nao encontrado ou sem permissao" }, { status: 404 });

    const contentType = request.headers.get("content-type") || "";

    // ─── Upload de arquivo via FormData ─────────────
    if (contentType.includes("multipart/form-data")) {
      const formData = await request.formData();
      const file = formData.get("file") as File | null;

      if (!file) {
        return NextResponse.json({ error: "Arquivo nao enviado" }, { status: 400 });
      }

      // Validacao de tamanho
      if (file.size > MAX_FILE_SIZE) {
        return NextResponse.json(
          { error: `Arquivo muito grande. Maximo: ${MAX_FILE_SIZE / 1024 / 1024}MB` },
          { status: 400 }
        );
      }

      // Validacao de tipo MIME (aceita codec suffixes como audio/webm;codecs=opus)
      const baseMime = file.type.split(";")[0].trim();
      if (!ALLOWED_MIME_PREFIXES.includes(baseMime)) {
        return NextResponse.json(
          { error: `Tipo de arquivo nao permitido: ${file.type}` },
          { status: 400 }
        );
      }

      // Determinar tipo do attachment (image ou audio)
      const attachmentType = file.type.startsWith("image/") ? "image" : "audio";

      // Gerar chave S3
      const attachmentId = randomUUID().replace(/-/g, "").slice(0, 24);
      const extension = file.name.split(".").pop() || (attachmentType === "image" ? "jpg" : "webm");
      const s3Key = getS3Key(attachmentId, extension);

      // Converter File para Buffer
      const arrayBuffer = await file.arrayBuffer();
      const buffer = Buffer.from(arrayBuffer);

      // Upload para S3
      const fileUrl = await uploadToS3(s3Key, buffer, file.type);

      // Criar registro no banco
      const attachment = await prisma.attachment.create({
        data: {
          id: attachmentId,
          name: file.name,
          url: fileUrl,
          type: attachmentType,
          mimeType: file.type,
          size: file.size,
          cardId: id,
          creatorId: user.id,
        },
        include: { creator: { select: { id: true, name: true } } },
      });

      // Retornar com URL pre-assinada para reproduzir imediatamente no client
      const signedUrl = await replaceWithPresignedUrl(fileUrl);
      return NextResponse.json({ attachment: { ...attachment, url: signedUrl } }, { status: 201 });
    }

    // ─── Link via JSON (comportamento original) ─────
    const { name, url } = await request.json();

    if (!url || !url.trim()) {
      return NextResponse.json({ error: "URL e obrigatoria" }, { status: 400 });
    }

    const attachment = await prisma.attachment.create({
      data: {
        name: name?.trim() || url.trim(),
        url: url.trim(),
        type: "link",
        cardId: id,
        creatorId: user.id,
      },
      include: { creator: { select: { id: true, name: true } } },
    });

    return NextResponse.json({ attachment }, { status: 201 });
  } catch (err) {
    if (err instanceof Error && err.message === "Unauthorized") return NextResponse.json({ error: "Nao autenticado" }, { status: 401 });
    console.error("[Attachments POST Error]", err);
    return NextResponse.json({ error: "Erro interno" }, { status: 500 });
  }
}

// DELETE /api/cards/[id]/attachments — deletar anexo
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await requireUser();
    const { id } = await params;
    const { attachmentId } = await request.json();

    if (!attachmentId) return NextResponse.json({ error: "attachmentId e obrigatorio" }, { status: 400 });

    const card = await checkCardAccess(id, user.id, user.role);
    if (!card) return NextResponse.json({ error: "Card nao encontrado ou sem permissao" }, { status: 404 });

    // Buscar attachment para limpar S3 se for arquivo
    const attachment = await prisma.attachment.findUnique({ where: { id: attachmentId } });
    if (!attachment) return NextResponse.json({ error: "Anexo nao encontrado" }, { status: 404 });

    // Verificar que o anexo pertence a este card (evita exclusao cross-card)
    if (attachment.cardId !== id) {
      return NextResponse.json({ error: "Anexo nao pertence a este card" }, { status: 403 });
    }

    // Se for arquivo (nao link), deletar do S3
    if (attachment.type !== "link") {
      const s3Key = extractS3KeyFromUrl(attachment.url);
      if (s3Key) {
        deleteFromS3(s3Key).catch(() => {}); // Fire-and-forget
      }
    }

    await prisma.attachment.delete({ where: { id: attachmentId } });

    return NextResponse.json({ success: true });
  } catch (err) {
    if (err instanceof Error && err.message === "Unauthorized") return NextResponse.json({ error: "Nao autenticado" }, { status: 401 });
    return NextResponse.json({ error: "Erro interno" }, { status: 500 });
  }
}
