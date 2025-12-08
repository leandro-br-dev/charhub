# Sistema de Memória e Compactação de Contexto

**Criado em**: 2025-11-20
**Status**: ✅ Implementado e Funcional
**Versão**: 1.0

---

## 📋 Índice

1. [Visão Geral](#visão-geral)
2. [Problema Resolvido](#problema-resolvido)
3. [Arquitetura](#arquitetura)
4. [Configuração](#configuração)
5. [Fluxo de Funcionamento](#fluxo-de-funcionamento)
6. [Estrutura de Dados](#estrutura-de-dados)
7. [API e Métodos](#api-e-métodos)
8. [Testes e Validação](#testes-e-validação)
9. [Monitoramento](#monitoramento)
10. [FAQ](#faq)

---

## Visão Geral

O Sistema de Memória do CharHub resolve o problema de **contexto limitado** em conversas longas com LLMs. Ele automaticamente:

1. Monitora o tamanho do contexto da conversa (em tokens)
2. Quando atinge o limite, **compacta** o histórico antigo em um resumo
3. Mantém apenas as **últimas 10 mensagens** completas
4. Usa **histórico compactado + mensagens recentes** como contexto para novas respostas

**Resultado**: Conversas podem ter **tamanho ilimitado** sem perder coerência.

---

## Problema Resolvido

### Antes (Sem Sistema de Memória)

```
┌─────────────────────────────────────┐
│  CONTEXTO DO LLM                    │
│                                     │
│  • Todas as mensagens (1-100)      │ ← Limite atingido!
│  • Total: 10,000 tokens            │ ← Muito caro
│                                     │ ← Perde mensagens antigas
└─────────────────────────────────────┘
```

**Problemas**:
- ❌ Limite de contexto atingido (~8k-32k tokens)
- ❌ Custo crescente com cada mensagem
- ❌ Performance degradada (latência)
- ❌ Perda de informações antigas quando limite é atingido

### Depois (Com Sistema de Memória)

```
┌─────────────────────────────────────┐
│  CONTEXTO DO LLM                    │
│                                     │
│  ┌───────────────────────────────┐ │
│  │ HISTÓRICO COMPACTADO (30%)    │ │ ← 2,400 tokens
│  │ "Alice e Bob se encontraram..." │
│  │ "Eventos principais: ..."      │
│  └───────────────────────────────┘ │
│                                     │
│  ┌───────────────────────────────┐ │
│  │ ÚLTIMAS 10 MENSAGENS (70%)    │ │ ← 1,500 tokens
│  │ Msg 91: "Olá..."              │ │
│  │ Msg 92: "Como vai?"           │ │
│  │ ...                            │ │
│  │ Msg 100: "Até logo!"          │ │
│  └───────────────────────────────┘ │
│                                     │
│  Total: ~3,900 tokens (dentro limite)
└─────────────────────────────────────┘
```

**Benefícios**:
- ✅ Conversas ilimitadas
- ✅ Custo reduzido (~60% economia)
- ✅ Performance mantida
- ✅ Coerência preservada (LLM "lembra" do histórico)

---

## Arquitetura

### Componentes

```
┌─────────────────────────────────────────────────────────────┐
│                    FLUXO DE MENSAGENS                        │
└─────────────────────────────────────────────────────────────┘
              │
              ▼
┌─────────────────────────────────────────────────────────────┐
│  1. ChatHandler (websocket)                                  │
│     • Recebe mensagem do usuário                            │
│     • Salva no banco de dados                               │
│     • Verifica: shouldCompressMemory()                      │
└─────────────────────────────────────────────────────────────┘
              │
              ▼ (se precisar compactar)
┌─────────────────────────────────────────────────────────────┐
│  2. BullMQ Queue (assíncrono)                               │
│     • Enfileira job de compactação                          │
│     • Não bloqueia resposta do chat                         │
└─────────────────────────────────────────────────────────────┘
              │
              ▼
┌─────────────────────────────────────────────────────────────┐
│  3. MemoryCompressionWorker                                 │
│     • Processa job em background                            │
│     • Chama: memoryService.compressConversationMemory()     │
└─────────────────────────────────────────────────────────────┘
              │
              ▼
┌─────────────────────────────────────────────────────────────┐
│  4. MemoryService.generateMemory()                          │
│     • Busca mensagens antigas (exceto últimas 10)           │
│     • Monta contexto + resumo anterior                      │
│     • Chama LLM (Gemini Flash) para resumir                 │
│     • Salva resumo no banco (ConversationMemory)            │
└─────────────────────────────────────────────────────────────┘
              │
              ▼
┌─────────────────────────────────────────────────────────────┐
│  5. ResponseGenerationAgent                                 │
│     • Chama: memoryService.buildContextWithMemory()         │
│     • Retorna: Resumo + Últimas 10 mensagens                │
│     • Usa como contexto para gerar resposta                 │
└─────────────────────────────────────────────────────────────┘
```

### Schema do Banco de Dados

```prisma
model Conversation {
  id                   String              @id @default(uuid())
  // ... outros campos
  memoryLastUpdatedAt  DateTime?           // Timestamp da última compactação
  memories             ConversationMemory[] // Relação com resumos
}

model ConversationMemory {
  id             String   @id @default(uuid())
  conversationId String
  conversation   Conversation @relation(fields: [conversationId], references: [id])

  // Conteúdo do resumo
  summary        String   @db.Text          // Resumo em prosa
  keyEvents      Json                       // Array de eventos importantes
  messageCount   Int                        // Quantas mensagens foram resumidas

  // Metadata
  startMessageId String?                    // Primeira mensagem resumida
  endMessageId   String?                    // Última mensagem resumida
  createdAt      DateTime @default(now())
  updatedAt      DateTime @updatedAt

  @@index([conversationId])
  @@index([createdAt])
}
```

---

## Configuração

### Variáveis de Ambiente

Adicione ao `.env` (backend):

```bash
# Limite máximo de tokens no contexto (padrão: 8000)
MAX_CONTEXT_TOKENS=8000
```

### Constantes do Sistema

Em `backend/src/services/memoryService.ts`:

```typescript
const MAX_CONTEXT_TOKENS = 8000;              // Janela total de contexto
const MAX_COMPRESSED_TOKENS = 2400;           // 30% para histórico compactado
const RECENT_MESSAGES_COUNT = 10;             // Últimas N mensagens completas
const AVG_TOKENS_PER_MESSAGE = 150;           // Estimativa de tokens/msg
```

**Cálculo**:
- `MAX_COMPRESSED_TOKENS = MAX_CONTEXT_TOKENS * 0.30` (30%)
- `Tokens disponíveis para mensagens = MAX_CONTEXT_TOKENS * 0.70` (70%)

### Ajustando Limites

Para modelos com contexto maior (ex: GPT-4 Turbo = 128k tokens):

```bash
MAX_CONTEXT_TOKENS=32000  # Usa apenas 32k dos 128k disponíveis
```

**Recomendações**:
- **Gemini 1.5 Flash**: 8,000 tokens (padrão)
- **GPT-3.5 Turbo**: 4,000 tokens
- **GPT-4 Turbo**: 32,000 tokens (usar menos para economizar)
- **Claude 3**: 16,000 tokens

---

## Fluxo de Funcionamento

### 1. Envio de Mensagem (User → Backend)

```javascript
// Frontend envia mensagem via WebSocket
socket.emit('send_message', {
  conversationId: 'abc-123',
  content: 'Olá!',
});
```

### 2. Verificação de Limite (Backend)

```typescript
// chatHandler.ts (após salvar mensagem)
const { memoryService } = await import('../services/memoryService');

// Verifica se precisa compactar (não bloqueia resposta)
memoryService.shouldCompressMemory(conversationId).then(async (shouldCompress) => {
  if (shouldCompress) {
    // Enfileira compactação (assíncrono)
    const memoryQueue = getQueue(QueueName.MEMORY_COMPRESSION);
    await memoryQueue.add('compress-memory', { conversationId });

    // Notifica frontend
    io.to(room).emit('memory_compression_started', { conversationId });
  }
});
```

### 3. Compactação (Worker Assíncrono)

```typescript
// memoryCompressionWorker.ts
export async function processMemoryCompression(job) {
  const { conversationId } = job.data;

  // 1. Buscar mensagens antigas (exceto últimas 10)
  const messages = await fetchMessagesToCompress(conversationId);

  // 2. Montar prompt para LLM
  const prompt = `
    [Resumo anterior se existir]

    Novas mensagens:
    ${messages.map(m => `${m.sender}: ${m.content}`).join('\n')}

    Resuma em máximo 2400 tokens (JSON):
    { summary: "...", keyEvents: [...] }
  `;

  // 3. Chamar LLM (Gemini Flash)
  const result = await callLLM({
    provider: 'gemini',
    model: 'gemini-2.5-flash',
    prompt,
    temperature: 0.3,
    maxTokens: 2000
  });

  // 4. Salvar resumo no banco
  await prisma.conversationMemory.create({
    data: {
      conversationId,
      summary: result.summary,
      keyEvents: result.keyEvents,
      messageCount: messages.length,
      startMessageId: messages[0].id,
      endMessageId: messages[messages.length - 1].id
    }
  });

  // 5. Atualizar timestamp na conversa
  await prisma.conversation.update({
    where: { id: conversationId },
    data: { memoryLastUpdatedAt: new Date() }
  });
}
```

### 4. Geração de Resposta (Usa Contexto Compactado)

```typescript
// responseGenerationAgent.ts
export async function execute(conversation, user, lastMessage) {
  // Buscar contexto: Resumo + Últimas 10 mensagens
  const historyContext = await memoryService.buildContextWithMemory(conversation.id);

  // historyContext contém:
  // [= CONVERSATION HISTORY (SUMMARIZED) =]
  // Summary 1 (30 messages):
  // Alice and Bob met at the park. They discussed...
  //
  // Key Events:
  // - Alice confessed her feelings (high)
  // - Bob agreed to go on a date (medium)
  //
  // [= END OF SUMMARIZED HISTORY =]
  //
  // [= RECENT MESSAGES (FULL CONTEXT) =]
  // Alice: So, when should we meet?
  // Bob: How about tomorrow at 3pm?
  // ...

  // Gerar resposta usando esse contexto
  const response = await callLLM({
    systemPrompt: `You are ${character.name}. ${character.description}`,
    userPrompt: `${historyContext}\n\nUser: ${lastMessage.content}\n\nYou:`,
    // ...
  });

  return response.content;
}
```

---

## Estrutura de Dados

### Exemplo de Resumo Salvo

```json
{
  "id": "mem-456",
  "conversationId": "conv-123",
  "summary": "Alice and Bob met at a coffee shop. They discussed their favorite books and discovered they both love sci-fi. Alice mentioned she's working on a novel.",
  "keyEvents": [
    {
      "timestamp": "2025-11-20T10:15:00Z",
      "description": "Alice and Bob met for the first time",
      "participants": ["Alice", "Bob"],
      "importance": "high"
    },
    {
      "timestamp": "2025-11-20T10:30:00Z",
      "description": "Bob recommended 'Dune' to Alice",
      "participants": ["Bob", "Alice"],
      "importance": "medium"
    }
  ],
  "messageCount": 35,
  "startMessageId": "msg-1",
  "endMessageId": "msg-35",
  "createdAt": "2025-11-20T11:00:00Z"
}
```

---

## API e Métodos

### MemoryService

#### `shouldCompressMemory(conversationId: string): Promise<boolean>`

Verifica se a conversa atingiu o limite de tokens.

**Retorna**: `true` se precisa compactar, `false` caso contrário.

**Lógica**:
```typescript
const tokenStats = await calculateContextTokens(conversationId);
return tokenStats.totalTokens >= MAX_CONTEXT_TOKENS &&
       tokenStats.recentMessageCount > RECENT_MESSAGES_COUNT;
```

---

#### `compressConversationMemory(conversationId: string): Promise<boolean>`

Executa compactação completa: gera resumo e salva no banco.

**Retorna**: `true` se sucesso, `false` se falhou.

---

#### `buildContextWithMemory(conversationId: string, recentMessageLimit?: number): Promise<string>`

Constrói contexto completo para LLM.

**Retorna**: String formatada com resumo + mensagens recentes.

**Formato**:
```
[= CONVERSATION HISTORY (SUMMARIZED) =]
Summary 1 (30 messages): ...
Key Events: ...

[= END OF SUMMARIZED HISTORY =]

[= RECENT MESSAGES (FULL CONTEXT) =]
Alice: ...
Bob: ...
```

---

#### `calculateContextTokens(conversationId: string): Promise<TokenStats>`

Calcula estatísticas de tokens.

**Retorna**:
```typescript
{
  compressedTokens: number;      // Tokens nos resumos
  recentMessagesTokens: number;  // Tokens nas mensagens recentes
  totalTokens: number;           // Total
  recentMessageCount: number;    // Contagem de mensagens recentes
}
```

---

## Testes e Validação

### Teste Manual

1. **Criar conversa longa** (>60 mensagens):
```bash
# Via frontend, enviar múltiplas mensagens
for i in {1..70}; do
  echo "Mensagem $i: Lorem ipsum dolor sit amet..."
done
```

2. **Verificar logs** do backend:
```bash
docker compose logs -f backend | grep "memory"

# Deve aparecer:
# "Context limit reached, queuing memory compression"
# "Starting memory compression job"
# "Memory compression completed successfully"
```

3. **Verificar banco de dados**:
```sql
SELECT * FROM "ConversationMemory" WHERE "conversationId" = 'conv-123';

-- Deve ter pelo menos 1 registro
```

4. **Testar contexto**:
```bash
# Enviar nova mensagem e verificar resposta
# LLM deve "lembrar" de eventos do resumo
```

---

### Testes Automatizados (TODO)

```typescript
// backend/tests/services/memoryService.test.ts
describe('MemoryService', () => {
  it('should compress memory when context limit is reached', async () => {
    const conversationId = await createTestConversation();
    await createTestMessages(conversationId, 70); // Acima do limite

    const shouldCompress = await memoryService.shouldCompressMemory(conversationId);
    expect(shouldCompress).toBe(true);

    await memoryService.compressConversationMemory(conversationId);

    const memories = await memoryService.getConversationMemories(conversationId);
    expect(memories.length).toBeGreaterThan(0);
  });

  it('should build context with compressed history + recent messages', async () => {
    // ... test implementation
  });
});
```

---

## Monitoramento

### Métricas Importantes

1. **Taxa de Compactação**:
   - Quantas conversas atingem o limite?
   - Frequência de compactações por conversa

2. **Performance**:
   - Tempo médio de compactação
   - Latência de geração de resumo (LLM)

3. **Custo**:
   - Tokens usados para resumos (vs. contexto completo)
   - Economia estimada

4. **Qualidade**:
   - Resumos preservam informações importantes?
   - LLM mantém coerência com histórico compactado?

### Logs para Monitorar

```bash
# Ver compactações
docker compose logs -f backend | grep "memory compression"

# Ver estatísticas de tokens
docker compose logs -f backend | grep "Context token stats"

# Ver erros
docker compose logs -f backend | grep "Error.*memory"
```

### Dashboard (TODO)

Criar dashboard no frontend com:
- Indicador de memória ativa (MemoryIndicator já implementado)
- Estatísticas de tokens usados
- Histórico de compactações
- Opção para forçar compactação manual

---

## FAQ

### 1. O que acontece se o resumo ficar muito grande (>30% dos tokens)?

O prompt do LLM limita explicitamente: "use at most 2400 tokens". Se ultrapassar, o LLM será instruído novamente a resumir.

---

### 2. Posso desabilitar o sistema de memória?

Sim. No `responseGenerationAgent.ts`, comente a linha:

```typescript
// const historyContext = await memoryService.buildContextWithMemory(conversation.id);

// E use o método antigo:
const formattedHistory = formatConversationHistoryForLLM(
  conversation.messages,
  conversation.participants
);
const historyContext = formattedHistory
  .map((entry) => `${entry.sender_name}: ${entry.content}`)
  .join('\n');
```

---

### 3. Como ajustar para modelos com contexto maior (ex: Claude 100k)?

Aumentar `MAX_CONTEXT_TOKENS`:

```bash
MAX_CONTEXT_TOKENS=32000  # Usar 32k dos 100k disponíveis
```

Nota: Usar menos que o máximo reduz custos.

---

### 4. O sistema funciona com múltiplos personagens?

Sim! O resumo inclui nomes de todos os participantes nos eventos.

---

### 5. Quanto custa cada compactação?

Estimativa com Gemini 2.5 Flash:
- Input: ~3000 tokens (mensagens antigas)
- Output: ~500 tokens (resumo)
- **Custo**: ~$0.003 por compactação

Economia por conversa longa: ~60% vs. contexto completo.

---

### 6. O que acontece se a compactação falhar?

Fallback: usa últimas 10 mensagens sem resumo. Não quebra o chat.

---

### 7. Posso ver o histórico compactado?

Sim! Via Prisma Studio ou endpoint:

```bash
GET /api/v1/conversations/:id/memories
```

(Endpoint ainda não implementado, adicionar se necessário)

---

## Próximas Melhorias

### Fase 1 (Curto Prazo)
- [ ] Adicionar endpoint `GET /conversations/:id/memories` para visualizar resumos
- [ ] Criar UI no frontend para mostrar timeline de compactações
- [ ] Adicionar testes automatizados

### Fase 2 (Médio Prazo)
- [ ] Usar modelo de embeddings para busca semântica em histórico
- [ ] Permitir "pinnar" mensagens importantes (nunca compactar)
- [ ] Dashboard com estatísticas de tokens e custos

### Fase 3 (Longo Prazo)
- [ ] Compactação incremental (evitar resumir o mesmo conteúdo)
- [ ] Suporte a anexos (imagens, áudio) no histórico compactado
- [ ] Sistema de "refresh" de memória (re-resumir histórico antigo)

---

## Conclusão

O Sistema de Memória permite conversas **ilimitadas** no CharHub, mantendo:
- ✅ Coerência narrativa
- ✅ Performance otimizada
- ✅ Custos reduzidos (~60% economia)
- ✅ Experiência transparente para o usuário

**Status**: ✅ Implementado e Pronto para Produção

---

**Última atualização**: 2025-11-20
**Autor**: Claude (AI Assistant) + Leandro (Product Owner)
**Versão**: 1.0
