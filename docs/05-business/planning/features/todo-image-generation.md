# Sistema de Geracao de Imagens com ComfyUI

> **Status**: ✅ Implementacao Concluida - Fase 1, 2, 3, 4 e 5
> **Prioridade**: Alta
> **Complexidade**: Alta
> **Ultima atualizacao**: 2025-11-27

## 🎉 Progresso de Implementacao

### ✅ Concluido (2025-11-27)

**Fase 1: Infraestrutura Base**
- ✅ Configuracao de Filas BullMQ (`IMAGE_GENERATION` queue)
- ✅ Job types para avatar e sticker generation
- ✅ Retry policy e timeouts configurados
- ✅ Conectividade Docker → ComfyUI via `host.docker.internal`

**Fase 2: Servico de Geracao de Imagens**
- ✅ ComfyUI Client Service (`comfyuiService.ts`)
- ✅ Workflows JSON (avatar, sticker)
- ✅ Sistema de queue/polling implementado
- ✅ Prompt Engineering Service com traducao automatica PT→EN usando Gemini
- ✅ Suporte a LoRAs

**Fase 3: Worker de Processamento**
- ✅ Image Generation Worker (`imageGenerationWorker.ts`)
- ✅ Integracao com ComfyUI
- ✅ Upload automatico para Cloudflare R2
- ✅ Atualizacao de status no banco (CharacterImage, CharacterSticker)
- ✅ Worker registrado e funcional

**Fase 4: APIs e Integracao**
- ✅ `POST /api/v1/image-generation/avatar` - Gerar avatar
- ✅ `POST /api/v1/image-generation/sticker` - Gerar sticker individual
- ✅ `POST /api/v1/image-generation/stickers/bulk` - Gerar multiplos stickers
- ✅ `GET /api/v1/image-generation/status/:jobId` - Verificar status do job
- ✅ `GET /api/v1/image-generation/health` - Health check do ComfyUI

**Fase 5: Utilitarios e Qualidade**
- ✅ Image Utils (`imageUtils.ts`)
- ✅ Conversao para WebP com metadados (prompt, character, timestamp)
- ✅ Deteccao de cor dominante para chroma key
- ✅ Resize com Sharp library
- ✅ Compressao WebP (reducao de ~90% no tamanho)

**Melhorias Criticas Implementadas:**
- ✅ **Traducao automatica de prompts PT→EN**: Sistema usa Gemini 2.5 Flash Lite para converter descricoes em portugues para tags Stable Diffusion em ingles
- ✅ **Prompts 100% em ingles**: Todos os prompts agora sao gerados exclusivamente em en-US, melhorando significativamente a qualidade das imagens
- ✅ **Extracao inteligente de features**: LLM extrai apenas caracteristicas visuais (cabelo, olhos, corpo, roupas) no formato danbooru

### 📊 Resultados de Testes

**Teste de Avatar (Rem Dragneel):**
- ✅ Geracao concluida em ~40 segundos
- ✅ Imagem original: 616 KB (PNG)
- ✅ Imagem final: 58 KB (WebP) - 90% de reducao
- ✅ Upload bem-sucedido para R2
- ✅ URL publica: `https://media.charhub.app/characters/{userId}/{characterId}/avatar/avatar_{timestamp}.webp`

**Prompt Gerado (com traducao automatica):**
```
(score_9, score_8_up, score_7_up), masterpiece, best quality, ultra-detailed,
cinematic lighting, (ANIME), (close-up portrait:1.2), (detailed face:1.1),
looking at viewer, headshot, solo, 1girl, (Rem Dragneel:1.2), blue hair,
blue eyes, heterochromia, left eye visible, bang covering eye, slender,
154cm, oni, horn
```

### ⚠️ Pendente

**Fase 1.1: Cloudflare Tunnel (Producao)**
- ⏳ Criar tunnel dedicado `comfyui-worker` (atualmente usando `host.docker.internal` para dev)
- ⏳ Configurar DNS `comfyui.charhub.app`
- ⏳ Implementar Cloudflare Access
- ⏳ Service Token para autenticacao

**Fase 4.2: WebSocket para Status**
- ⏳ Notificacao em tempo real de progresso
- ⏳ Integracao com sistema de chat

**Fase 4.3: Integracao com Chat/Stories**
- ⏳ Geracao automatica durante conversa
- ⏳ Rate limiting por usuario

**Workflows Adicionais:**
- ⏳ Cover template (1024x1024 com FaceDetailer)
- ⏳ Scene template (dimensoes variaveis)

## Resumo

Implementar sistema de geracao de imagens AI utilizando Stable Diffusion via ComfyUI API. O sistema permitira geracao automatica de:
- **Avatares** de personagens
- **Stickers** (emotes) com diferentes emocoes
- **Covers** para historias e personagens
- **Imagens de cena** durante chat/stories

A particularidade deste sistema e que o **servidor ComfyUI roda localmente** na maquina do desenvolvedor (com GPU RTX 3060 TI -> RTX 5070 TI), enquanto o backend de producao roda na Google Cloud.

---

## Arquitetura Proposta

### Visao Geral

```
[Frontend] --> [Backend GCP] --> [Queue BullMQ] --> [ComfyUI Worker]
                    |                                      |
                    |                                      v
                    |                              [ComfyUI Local]
                    |                                      |
                    v                                      v
               [R2 Storage] <------------------------ [Image Upload]
```

### Componentes

1. **Backend (GCP)**: Recebe requisicoes, enfileira jobs, gerencia estado
2. **Worker (Local)**: Processa jobs da fila, comunica com ComfyUI
3. **ComfyUI (Local)**: Gera imagens com Stable Diffusion
4. **R2 (Cloudflare)**: Armazena imagens geradas

---

## Problema de Conectividade: GCP <-> Maquina Local

### Desafio

O backend em producao (GCP) precisa se comunicar com o ComfyUI que roda localmente. Solucoes precisam ser:
- **Estavel**: Conexao persistente 24/7 quando necessario
- **Segura**: Nao expor servicos publicamente sem autenticacao
- **Baixo Custo**: Preferencialmente gratuito ou muito barato

### Solucoes Avaliadas

#### 1. Cloudflare Tunnel (RECOMENDADO)

**Vantagens:**
- Gratuito (plano free)
- Ja usamos Cloudflare no projeto (tunnel para frontend/backend)
- Zero Trust com autenticacao
- Conexao estavel e rapida
- Sem necessidade de IP fixo ou port forwarding

**Implementacao:**
```powershell
# Criar tunnel para ComfyUI
cloudflared tunnel create comfyui-worker

# Configurar DNS
cloudflared tunnel route dns comfyui-worker comfyui.charhub.app

# Config (cloudflared/config/comfyui/config.yml)
tunnel: <TUNNEL_ID>
credentials-file: /path/to/credentials.json
ingress:
  - hostname: comfyui.charhub.app
    service: http://localhost:8188
  - service: http_status:404
```

**Seguranca adicional:**
- Cloudflare Access para autenticacao
- Service Token para API calls
- IP filtering opcional

#### 2. Tailscale

**Vantagens:**
- Gratuito para uso pessoal (ate 100 devices)
- VPN mesh - todos devices na mesma rede virtual
- Facil setup, sem configuracao de firewall

**Desvantagens:**
- Adiciona dependencia extra
- Latencia pode ser maior que Cloudflare

**Implementacao:**
```bash
# Na maquina local
tailscale up

# Obter IP da maquina local no Tailscale
tailscale ip -4  # Exemplo: 100.64.x.x

# Backend usa esse IP para conectar
COMFYUI_URL=http://100.64.x.x:8188
```

#### 3. ngrok

**Vantagens:**
- Setup muito simples
- Funciona imediatamente

**Desvantagens:**
- URL muda a cada reinicio (versao free)
- Plano pago para URL fixa (~$8/mes)
- Menos confiavel para producao

#### 4. Worker Separado com Polling

**Conceito:**
O worker local nao recebe conexoes - ele **busca** jobs da fila.

**Vantagens:**
- Zero configuracao de rede
- Firewall-friendly
- Worker pode rodar em qualquer lugar

**Desvantagens:**
- Latencia de polling (mitigavel com WebSocket)
- Worker precisa ter acesso ao Redis

**Implementacao:**
```typescript
// Worker local conecta no Redis da GCP via SSL
const worker = new Worker('image-generation', async (job) => {
  // Processa localmente com ComfyUI
}, {
  connection: {
    host: 'redis.charhub.app',
    port: 6380,
    tls: true,
    password: process.env.REDIS_PASSWORD
  }
});
```

### Recomendacao Final

**Cloudflare Tunnel** e a melhor opcao porque:
1. Ja temos infraestrutura Cloudflare
2. Gratuito e estavel
3. Seguranca built-in com Zero Trust
4. Performance excelente

**Arquitetura recomendada:**
```
Backend (GCP) ---> Cloudflare Tunnel ---> ComfyUI (Local)
     |                                        |
     v                                        v
Redis (GCP) <---- BullMQ Worker (Local) ---- GPU RTX
```

---

## Plano de Implementacao

### Fase 1: Infraestrutura Base

#### 1.1 Setup do Cloudflare Tunnel para ComfyUI
- [ ] Criar tunnel dedicado `comfyui-worker`
- [ ] Configurar DNS `comfyui.charhub.app` (interno)
- [ ] Implementar Cloudflare Access para autenticacao
- [ ] Criar Service Token para o backend
- [ ] Documentar processo de setup

#### 1.2 Configuracao de Filas BullMQ
- [x] Adicionar `IMAGE_GENERATION` ao enum `QueueName`
- [x] Criar job types para cada tipo de geracao (avatar, sticker)
- [x] Configurar retry policy e timeouts especificos
- [ ] Implementar dead letter queue para falhas (opcional - pode ser adicionado depois)

```typescript
// backend/src/queues/config.ts
export enum QueueName {
  // ... existing
  IMAGE_GENERATION = 'image-generation',
}

// Job types
export type ImageGenerationJob = {
  type: 'avatar' | 'sticker' | 'cover' | 'scene';
  characterId?: string;
  storyId?: string;
  userId: string;
  prompt?: string;
  options: ImageGenerationOptions;
};
```

### Fase 2: Servico de Geracao de Imagens

#### 2.1 ComfyUI Client Service
- [x] Criar `comfyuiService.ts` - cliente HTTP para ComfyUI API
- [x] Implementar workflows como templates JSON (avatar, sticker)
- [x] Sistema de queue/polling do ComfyUI
- [x] Tratamento de erros e timeouts

```typescript
// backend/src/services/comfyuiService.ts
interface ComfyUIConfig {
  baseUrl: string;
  serviceToken?: string;
  timeout?: number;
}

class ComfyUIService {
  async queuePrompt(workflow: ComfyWorkflow): Promise<string>;
  async getHistory(promptId: string): Promise<ComfyHistory>;
  async getImage(filename: string): Promise<Buffer>;
  async freeMemory(): Promise<void>;
}
```

#### 2.2 Workflows ComfyUI
- [x] Template para Avatar (768x768, sem FaceDetailer)
- [x] Template para Sticker (768x1152, com background removal)
- [ ] Template para Cover (1024x1024, com FaceDetailer) - pendente
- [ ] Template para Scene (dimensoes variaveis) - pendente

```typescript
// backend/src/services/comfyui/workflows/
avatar.workflow.json
sticker.workflow.json
cover.workflow.json
scene.workflow.json
```

#### 2.3 Prompt Engineering Service
- [x] Sistema de construcao de prompts
- [x] Conversao de descricao para tags SD (PT→EN com Gemini 2.5 Flash Lite)
- [x] Negative prompts por tipo de geracao
- [x] Suporte a LoRAs

```typescript
// backend/src/services/promptEngineering.ts
interface PromptBuilder {
  buildAvatarPrompt(character: Character): SDPrompt;
  buildStickerPrompt(character: Character, emotion: string): SDPrompt;
  buildCoverPrompt(story: Story): SDPrompt;
  buildScenePrompt(context: SceneContext): SDPrompt;
}

interface SDPrompt {
  positive: string;
  negative: string;
  loras?: LoraConfig[];
}
```

### Fase 3: Worker de Processamento

#### 3.1 Image Generation Worker
- [x] Worker BullMQ para processar jobs
- [x] Integracao com ComfyUI Service
- [x] Upload automatico para R2
- [x] Atualizacao de status no banco (CharacterImage, CharacterSticker)

```typescript
// backend/src/queues/workers/imageGenerationWorker.ts
export async function processImageGeneration(job: Job<ImageGenerationJob>) {
  const { type, characterId, userId, options } = job.data;

  // 1. Construir prompt
  const prompt = await promptBuilder.build(type, options);

  // 2. Enviar para ComfyUI
  const result = await comfyuiService.generate(prompt);

  // 3. Converter para WebP
  const webpBuffer = await imageUtils.convertToWebP(result.imageBytes);

  // 4. Upload para R2
  const { publicUrl } = await r2Service.uploadObject({
    key: `characters/${characterId}/avatar.webp`,
    body: webpBuffer,
    contentType: 'image/webp'
  });

  // 5. Atualizar banco
  await prisma.characterImage.create({ ... });

  return { success: true, url: publicUrl };
}
```

#### 3.2 Configuracao do Worker Local
- [x] Script de inicializacao do worker (integrado ao backend)
- [x] Configuracao de ambiente local (via .env)
- [x] Monitoramento e logs (Pino logger)
- [x] Auto-restart em falhas (Docker restart policy)

```typescript
// workers/image-generation/index.ts
// Roda na maquina local com GPU
import { Worker } from 'bullmq';

const worker = new Worker('image-generation', processor, {
  connection: {
    host: process.env.REDIS_HOST, // Redis da GCP via tunnel
    port: 6380,
    tls: true
  },
  concurrency: 1, // Uma imagem por vez (limitacao GPU)
  limiter: {
    max: 10,
    duration: 60000 // Max 10 jobs por minuto
  }
});
```

### Fase 4: APIs e Integracao

#### 4.1 Endpoints de Geracao
- [x] `POST /api/v1/image-generation/avatar` - Gerar avatar de personagem
- [x] `POST /api/v1/image-generation/sticker` - Gerar sticker individual
- [x] `POST /api/v1/image-generation/stickers/bulk` - Gerar multiplos stickers
- [x] `GET /api/v1/image-generation/status/:jobId` - Verificar status do job
- [x] `GET /api/v1/image-generation/health` - Health check do ComfyUI
- [ ] `POST /api/v1/stories/:id/generate-cover` - pendente

#### 4.2 WebSocket para Status
- [ ] Notificacao em tempo real de progresso
- [ ] Atualizacao quando imagem esta pronta
- [ ] Integracao com sistema de chat existente

#### 4.3 Integracao com Chat/Stories
- [ ] Geracao de imagens durante conversa (sob demanda)
- [ ] Analise de contexto para geracao automatica
- [ ] Cooldown e rate limiting por usuario

### Fase 5: Utilitarios e Qualidade

#### 5.1 Image Utils
- [x] Conversao para WebP com metadados (prompt, character, timestamp)
- [x] Deteccao de cor dominante para chroma key (algoritmo RGB oposto)
- [x] Resize e crop inteligente (Sharp library)
- [x] Validacao de qualidade (metadados e dimensoes)

```typescript
// backend/src/utils/imageUtils.ts
export async function convertToWebP(buffer: Buffer, metadata?: object): Promise<Buffer>;
export function getContrastingChromaKey(buffer: Buffer): { name: string; hex: string };
export async function resize(buffer: Buffer, width: number, height: number): Promise<Buffer>;
```

#### 5.2 Sistema de Cache
- [ ] Cache de prompts gerados
- [ ] Cache de imagens frequentes
- [ ] Invalidacao inteligente

#### 5.3 Monitoramento
- [ ] Metricas de geracao (tempo, sucesso, falha)
- [ ] Alertas de fila congestionada
- [ ] Dashboard de status do worker

---

## Modelos e Dependencias

### Hardware Necessario
- GPU: RTX 3060 TI (atual) -> RTX 5070 TI (futuro)
- VRAM: 8GB+ recomendado
- RAM: 16GB+ para ComfyUI
- Armazenamento: SSD para modelos

### Software ComfyUI
- ComfyUI base
- Nodes customizados necessarios:
  - `rgthree-comfy` (Lora Loader Stack)
  - `ComfyUI-Impact-Pack` (FaceDetailer, UltralyticsDetectorProvider)
  - `comfyui_essentials` (MaskBoundingBox+)
  - `ComfyUI-Easy-Use` (easy imageRemBg)

### Modelos Stable Diffusion
- Checkpoint: `waiNSFWIllustrious_v130.safetensors` (ou similar)
- Face detector: `bbox/face_yolov8m.pt`
- Background remover: RMBG-1.4

### Dependencias Node.js
```json
{
  "sharp": "^0.33.x",  // Processamento de imagens
  "piexif": "^1.x",    // Metadados EXIF (se necessario)
  "bullmq": "^5.x",    // Ja instalado
  "@aws-sdk/client-s3": "^3.x"  // Ja instalado
}
```

---

## Consideracoes de Seguranca

### Autenticacao ComfyUI
- Service Token via Cloudflare Access
- Whitelist de IPs (opcional)
- Rate limiting

### Protecao de Conteudo
- Validacao de prompts (filtro de conteudo)
- Classificacao automatica de imagens geradas
- Bloqueio de conteudo CSAM

### Privacidade
- Imagens temporarias deletadas apos upload
- Logs sem dados sensiveis
- Metadados anonimizados

---

## Estimativas de Recursos

### Tempo de Geracao (RTX 3060 TI)
| Tipo | Resolucao | Tempo Estimado |
|------|-----------|----------------|
| Avatar | 768x768 | 15-20s |
| Sticker | 768x1152 | 20-30s |
| Cover | 1024x1024 | 25-35s |
| Scene | 1024x1024 | 30-40s |

### Com RTX 5070 TI (estimado)
- Reducao de 40-50% no tempo
- Maior VRAM permite batch processing
- Modelos maiores (SDXL nativo)

### Consumo de Creditos (proposta)
| Tipo | Creditos |
|------|----------|
| Avatar | 5 |
| Sticker (por emocao) | 3 |
| Sticker Set (8 emocoes) | 20 |
| Cover | 8 |
| Scene (chat) | 5 |

---

## Referencias

### Documentacao
- [ComfyUI API](https://github.com/comfyanonymous/ComfyUI)
- [Cloudflare Tunnel](https://developers.cloudflare.com/cloudflare-one/connections/connect-networks/)
- [BullMQ](https://docs.bullmq.io/)

### Codigo de Referencia (Projeto Anterior)
- `old_project_reference/backend/app/services/image_generator.py`
- `old_project_reference/backend/app/tasks/character_asset_tasks.py`
- `old_project_reference/backend/app/utils/image_utils.py`

### Issues Relacionadas
- Migracao do sistema de geracao de imagens
- Integracao ComfyUI com arquitetura Node.js

---

## Checklist de Entrega

### MVP (Fase 1-3)
- [ ] Tunnel configurado e funcionando
- [ ] Worker processando jobs da fila
- [ ] Geracao de avatares funcionando
- [ ] Upload automatico para R2

### Completo (Fase 4-5)
- [ ] Todos os tipos de geracao
- [ ] APIs documentadas
- [ ] WebSocket para status
- [ ] Sistema de creditos integrado
- [ ] Monitoramento em producao

---

**Proximos Passos:**
1. Configurar Cloudflare Tunnel para ComfyUI
2. Implementar ComfyUI Service no backend
3. Criar worker local de processamento
4. Testar fluxo completo avatar -> R2
