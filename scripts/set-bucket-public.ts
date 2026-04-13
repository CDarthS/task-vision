// scripts/set-bucket-public.ts — Aplica policy de leitura publica no bucket S3 (Tigris/Railway)
// Uso: npx tsx scripts/set-bucket-public.ts
//
// Requer as env vars: AWS_ENDPOINT_URL, AWS_S3_BUCKET_NAME, AWS_ACCESS_KEY_ID, AWS_SECRET_ACCESS_KEY

import { S3Client, PutBucketAclCommand } from "@aws-sdk/client-s3";

const BUCKET_NAME = process.env.AWS_S3_BUCKET_NAME || "";
const ENDPOINT = process.env.AWS_ENDPOINT_URL || "";
const REGION = process.env.AWS_DEFAULT_REGION || "auto";
const ACCESS_KEY = process.env.AWS_ACCESS_KEY_ID || "";
const SECRET_KEY = process.env.AWS_SECRET_ACCESS_KEY || "";

if (!BUCKET_NAME || !ENDPOINT || !ACCESS_KEY || !SECRET_KEY) {
  console.error("Faltam variaveis de ambiente do S3. Verifique .env");
  process.exit(1);
}

const client = new S3Client({
  endpoint: ENDPOINT,
  region: REGION,
  credentials: { accessKeyId: ACCESS_KEY, secretAccessKey: SECRET_KEY },
  forcePathStyle: false,
});

async function main() {
  console.log(`Aplicando ACL public-read ao bucket: ${BUCKET_NAME}`);
  console.log(`Endpoint: ${ENDPOINT}`);

  await client.send(
    new PutBucketAclCommand({
      Bucket: BUCKET_NAME,
      ACL: "public-read",
    })
  );

  console.log("ACL aplicada com sucesso! Bucket agora e publico para leitura.");
}

main().catch((err) => {
  console.error("Falha ao aplicar policy:", err.message);
  process.exit(1);
});
