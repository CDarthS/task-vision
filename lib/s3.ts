// lib/s3.ts — Singleton do AWS S3 Client para Railway Bucket
//
// Usa o padrao globalThis para evitar multiplas instancias durante
// hot reload em desenvolvimento (mesmo pattern de lib/prisma.ts e lib/redis.ts).
//
// Em producao (Railway), o bucket injeta automaticamente as variaveis:
// AWS_ENDPOINT_URL, AWS_S3_BUCKET_NAME, AWS_DEFAULT_REGION, AWS_ACCESS_KEY_ID, AWS_SECRET_ACCESS_KEY

import {
  S3Client,
  PutObjectCommand,
  DeleteObjectCommand,
  GetObjectCommand,
} from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";

// ─── Configuracao ─────────────────────────────

export const BUCKET_NAME = process.env.AWS_S3_BUCKET_NAME || "";
const ENDPOINT = process.env.AWS_ENDPOINT_URL || "";
const REGION = process.env.AWS_DEFAULT_REGION || "auto";
const ACCESS_KEY = process.env.AWS_ACCESS_KEY_ID || "";
const SECRET_KEY = process.env.AWS_SECRET_ACCESS_KEY || "";

/**
 * URL publica para acessar arquivos do bucket.
 * Railway usa virtual-hosted-style: https://{bucket}.{endpoint_host}
 */
export function getPublicUrl(key: string): string {
  if (!ENDPOINT || !BUCKET_NAME) return "";
  // Extrai o host do endpoint (ex: t3.storageapi.dev)
  const endpointHost = ENDPOINT.replace("https://", "").replace("http://", "");
  return `https://${BUCKET_NAME}.${endpointHost}/${key}`;
}

// ─── Singleton S3 Client ─────────────────────

function createS3Client(): S3Client | null {
  if (!ENDPOINT || !ACCESS_KEY || !SECRET_KEY) {
    console.warn("[S3] Variaveis do bucket nao configuradas. Upload de arquivos desabilitado.");
    return null;
  }

  return new S3Client({
    endpoint: ENDPOINT,
    region: REGION,
    credentials: {
      accessKeyId: ACCESS_KEY,
      secretAccessKey: SECRET_KEY,
    },
    forcePathStyle: false, // Railway usa virtual-hosted-style
  });
}

const globalForS3 = globalThis as unknown as {
  s3Client: S3Client | null | undefined;
};

export const s3Client = globalForS3.s3Client ?? createS3Client();

if (process.env.NODE_ENV !== "production") {
  globalForS3.s3Client = s3Client;
}

// ─── Helpers ────────────────────────────────────

/**
 * Gera a chave S3 para um attachment.
 * Formato: attachments/{id}.{ext}
 */
export function getS3Key(attachmentId: string, extension: string): string {
  return `attachments/${attachmentId}.${extension}`;
}

/**
 * Extrai a chave S3 de uma URL publica do bucket.
 * Ex: https://bucket.t3.storageapi.dev/attachments/abc123.jpg → attachments/abc123.jpg
 */
export function extractS3KeyFromUrl(url: string): string | null {
  if (!BUCKET_NAME) return null;
  try {
    const u = new URL(url);
    // Remove a / inicial do pathname
    return u.pathname.startsWith("/") ? u.pathname.slice(1) : u.pathname;
  } catch {
    return null;
  }
}

/**
 * Faz upload de um arquivo para o bucket S3.
 * Retorna a URL publica do arquivo.
 */
export async function uploadToS3(
  key: string,
  body: Buffer,
  contentType: string
): Promise<string> {
  if (!s3Client) {
    throw new Error("[S3] Client nao configurado. Verifique as variaveis de ambiente.");
  }

  await s3Client.send(
    new PutObjectCommand({
      Bucket: BUCKET_NAME,
      Key: key,
      Body: body,
      ContentType: contentType,
    })
  );

  return getPublicUrl(key);
}

/**
 * Gera uma URL pre-assinada para acessar um arquivo do S3.
 * Valida por 1 hora (3600 segundos).
 */
export async function getPresignedUrl(key: string): Promise<string | null> {
  if (!s3Client) return null;
  try {
    return await getSignedUrl(
      s3Client,
      new GetObjectCommand({ Bucket: BUCKET_NAME, Key: key }),
      { expiresIn: 3600 }
    );
  } catch {
    return null;
  }
}

/**
 * Substitui URLs do bucket por URLs pre-assinadas.
 * Usado no GET de attachments para servir arquivos acessiveis.
 */
export async function replaceWithPresignedUrl(url: string): Promise<string> {
  const key = extractS3KeyFromUrl(url);
  if (!key) return url;
  const signed = await getPresignedUrl(key);
  return signed || url;
}

/**
 * Deleta um arquivo do bucket S3.
 * Silencioso — nao lanca erro se o arquivo nao existir.
 */
export async function deleteFromS3(key: string): Promise<void> {
  if (!s3Client) return;

  try {
    await s3Client.send(
      new DeleteObjectCommand({
        Bucket: BUCKET_NAME,
        Key: key,
      })
    );
  } catch (err) {
    console.error(`[S3] Falha ao deletar ${key}:`, err);
    // Silencioso — nao bloqueia a operacao principal
  }
}
