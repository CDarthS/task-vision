# Plano de Implementação de Anexos (Imagens e Áudios) - Task Vision

## 🎯 Objetivo
Implementar um sistema de envio de arquivos (fotos e áudios) atrelados a cartões Kanban e comentários. O foco principal é maximizar a economia de espaço utilizando **extrema compressão diretamente no Frontend (Navegador)** e uma estratégia de **Garbage Collection (Limpeza)** automática no banco de dados.
A meta é fazer com que os 10GB de storage oferecidos pela Railway durem indefinidamente sem sacrificar muito a experiência do usuário. Nenhum serviço terceirizado (como S3, Cloudinary ou Uploadthing) será utilizado; todo o fluxo usará o Bucket nativo da Railway.

---

## 1️⃣ Configuração do Bucket na Railway

A Railway laçou suporte nativo para Object Storage (Buckets), baseados no protocolo S3-Compatible.

### Passos de Configuração Visual na Railway
1. **Criação:** No seu painel da Railway, clique em `+ New` (ou Add) e selecione a opção **Bucket**.
2. **Variáveis de Ambiente:** Ao criar o Bucket, a Railway vai injetar variáveis automaticamente no seu ambiente. Anote ou certifique-se de que o backend Next.js tenha acesso a elas (via "Variable References"):
   - `AWS_ACCESS_KEY_ID`
   - `AWS_SECRET_ACCESS_KEY`
   - `AWS_REGION` (Costuma ser um padrão da região ou `us-east-1` por simulação S3).
   - `S3_ENDPOINT_URL` (URL customizada do Cloudflare/Railway).
   - `BUCKET_NAME`
3. **Visibilidade (ACL / CORS):** 
   - Habilite o CORS para aceitar origens `*` ou do seu domínio (para permitir presigned uploads do navegador ou apenas ler a imagem futuramente).
   - Defina os arquivos como "Public Read" para que você possa colocar a URL direto na tag `<img>` sem expirar links, mas caso preze por hiper segurança, mantenha restrito e gere links temporários (`SignedUrl`) que duram X minutos ao abrir o Modal do Kanban.

---

## 2️⃣ Compressão Agressiva de Imagens (Frontend)

O objetivo é que, ao invés de enviar uma foto de 5~10MB direto para a Railway, o computador/celular do usuário faça o trabalho pesado de encolher a foto.

### Stack sugerida:
- Biblioteca: `browser-image-compression`

### Lógica de Código do Componente de Upload
Ao disparar o evento `onChange` do `<input type="file" accept="image/*">`, execute a compressão ANTES de enviar o formulário e ANTES do upload da Railway:

```javascript
import imageCompression from 'browser-image-compression';

async function handleImageUpload(event) {
  const imageFile = event.target.files[0];
  
  const options = {
    maxSizeMB: 0.1, // Alvo: no máximo 100kb
    maxWidthOrHeight: 1024, // Nunca maior do que HD em altura/largura
    useWebWorker: true, // Usa multithread no navegador para não travar a UI
    initialQuality: 0.6 // Reduz levemente a profundidade da imagem
  };

  try {
    const compressedFile = await imageCompression(imageFile, options);
    // ✅ Envie esta variável `compressedFile` para a API, e NÃO o `imageFile` original!
    await uploadFileToServer(compressedFile);
  } catch (error) {
    console.error('Erro ao comprimir imagem:', error);
  }
}
```

---

## 3️⃣ Gravação de Áudio Otimizada (Frontend)

Vamos aproveitar APIS nativas modernas (WebRTC) instaladas nos navegadores, logo não precisaremos de bibliotecas externas para a gravação.

### Lógica da Gravação de Áudio
Usar o protocolo nativo `MediaRecorder` para gravar diretamente em `<Formato>` WebM contendo o `<Codec>` Opus a uma taxa de bits muito baixa. Um arquivo Opus comprimido gasta quase menos banda que um texto longo!

```javascript
let mediaRecorder;
let audioChunks = [];

async function startRecording() {
  const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
  
  // Parâmetro de ouro: audioBitsPerSecond baixíssimo para economia!
  // Configurando em 16 Kpbs a 32 Kpbs.
  const options = { mimeType: 'audio/webm;codecs=opus', audioBitsPerSecond: 16000 };
  
  mediaRecorder = new MediaRecorder(stream, options);
  
  mediaRecorder.ondataavailable = (event) => {
    if (event.data.size > 0) {
      audioChunks.push(event.data);
    }
  };

  mediaRecorder.onstop = async () => {
    const audioBlob = new Blob(audioChunks, { type: 'audio/webm;codecs=opus' });
    // Transforme em um objeto do tipo 'File' para ser mandando para a sua API!
    const audioFile = new File([audioBlob], `audio-${Date.now()}.webm`, { type: 'audio/webm' });
    
    // Faça a requisição para a sua API (que vai salvar no bucket da Railway)
    await uploadAudioToServer(audioFile);
    audioChunks = []; // limpar memoria para a proxima
  };

  mediaRecorder.start();
}
```

---

## 4️⃣ Backend: Salvar, Assinar e Relacionar 

Na API (`/api/cards/[id]/attachments`), que recebe os dados já minúsculos das imagens e áudios, você deve interagir com seu projeto Next.js usando a S3 AWS SDK padrão.

**Fluxo de POST API:**
1. A API recebe o arquivo (via Server Actions / FormData).
2. Usando `@aws-sdk/client-s3`, instancie o cliente da mesma forma que configurou pelas chaves da Railway no Passo 1.
3. Suba para o Bucket via o comando `PutObjectCommand`.
4. Capture o Caminho Único que a Railway disponibilizou após o envio.
5. Em seu ORM (Drizzle Prisma ou similar), grave o URL e as propriedades na tabela de `Attachment`.

**Modelo no Banco de Dados (Exemplo):**
Tabela `Attachment`
- `id` (uuid)
- `cardId` -> Chave Estrangeira com a Card/Tarefa 
- `userId` -> Chave Estrangeira com Autor
- `fileUrl` (string - URL salva pela railway)
- `fileType` ('IMG' | 'AUDIO')
- `fileName` (string - Ex: "audio-XYZ.webm" ou "imagem-XYZ.jpeg")

---

## 5️⃣ Garbage Collection (Limpeza Automática - Muito Importante)

Evite o efeito onde registros são apagados, mas seus arquivos ficam fantasmas no bucket comendo os 10GB gratuitos.

Na ação do servidor ou na API responsável por DELETAR um Comentário ou um Cartão permanente do quadro:
1. ANTES de rodar `db.delete(cards).where(id=xxx)`...
2. O sistema faz um SELECT nas imagens atreladas a ele: `SELECT fileUrl FROM attachments WHERE cardId = xxx`
3. O Backend faz uma rápida conexão na AWS SDK do Bucket na Railway executando `DeleteObjectCommand`.
4. Depois de apagado os arquivos físicos, o banco de dados pode apagar o Cartão livremente usando `CASCADE`.

---

## Conclusão de Setup
Esta solução provê um esquema praticamente profissional para gerenciamento de Storage Pessoal ou Empresarial, removendo qualquer desperdício através da pré-combustão dos dados (na parte do cliente/frontend). A Railway cuidará apens disso como pequenos 'cache', assegurando longevidade extrema ao projeto.
