# Melhorias do Sistema de Chat - Fases 3-5

> **Status**: Fases 1-4 COMPLETAS + Correções Críticas, Fase 5 pendente
> **Prioridade**: Alta
> **Complexidade**: Alta
> **Última atualização**: 2025-11-25

## Status Atual

### Fases Completadas

| Fase | Melhorias | Status |
|------|-----------|--------|
| 1 - Quick Wins | #1 Avatares, #2 Auto-BG | ✅ COMPLETO |
| 2 - Fundacao Social | #6 Privacy, #8 Auto-Reply | ✅ COMPLETO |
| 3 - Memoria LLM | Backend + Frontend | ✅ COMPLETO |
| 4 - Multi-User | Backend + Frontend | ✅ COMPLETO |

### Entregas Anteriores (Fases 1-2)

1. **Avatares Proeminentes** - Display permanente no topo
2. **Background Automatico** - Auto-deteccao de conversas 1-on-1
3. **Sistema de Privacidade** - 3 niveis (PRIVATE, UNLISTED, PUBLIC)
4. **AI Auto-Reply** - Sugestoes contextuais

### Entregas Fase 3 - Sistema de Memoria (Nov 2025)

5. **memoryService.ts** - Servico completo com:
   - `shouldGenerateMemory()` - Verifica threshold de mensagens
   - `generateMemory()` - Gera resumo via LLM
   - `saveMemory()` - Persiste memoria no banco
   - `getLatestMemory()` - Recupera memoria mais recente
   - `buildContextWithMemory()` - Constroi contexto otimizado
6. **BullMQ Integration** - Job assincrono para geracao
7. **WebSocket Events** - `memory_compression_started/complete`
8. **MemoryIndicator.tsx** - Componente visual de status

### Entregas Fase 4 - Multi-User Chat (Nov 2025)

9. **membershipService.ts** - Gerenciamento de membros:
   - `joinConversation()`, `leaveConversation()`
   - `inviteUser()`, `kickUser()`
   - `updatePermissions()`, `transferOwnership()`
10. **presenceService.ts** - Tracking de presença via Socket.IO
11. **Rotas REST** - `/api/v1/conversations/:id/members/*`
12. **useMembership.ts** - Hook React Query para frontend
13. **OnlineUsersIndicator.tsx** - Indicador de usuários online
14. **useChatSocket.ts** - Eventos de presença integrados
15. **AddParticipantModal.tsx** - Aba "Users" integrada para convidar usuários
16. **MemberRoleBadge.tsx** - Badge visual de role (owner/mod/member/viewer)
17. **GET /api/v1/users/search** - Rota de busca de usuários

### Correções Críticas Pós-Fase 4 (Nov 25, 2025)

18. **Sistema de Cobrança de Créditos** - Corrigido cobrança em multi-user:
   - Problema: Créditos sempre cobrados do owner
   - Solução: Adicionado `requestingUserId` em ResponseJobData
   - Worker agora cobra de quem acionou a mensagem/reprocess
   - Arquivos: `responseQueue.ts`, `chatHandler.ts`, `conversations.ts`

19. **Decriptação no Contexto LLM** - Bot agora vê conteúdo real:
   - Problema: Mensagens criptografadas sendo enviadas ao LLM
   - Solução: Adicionado `decryptMessage()` em `memoryService.buildContextWithMemory()`
   - Bot agora responde com contexto correto
   - Arquivo: `memoryService.ts:378-426`

20. **WebSocket Broadcast em DELETE** - Delete em tempo real:
   - Endpoint DELETE agora emite evento `message_deleted`
   - Todos os usuários veem deleção instantaneamente
   - Cache React Query invalidado automaticamente
   - Arquivo: `conversations.ts:580-631`

21. **WebSocket Broadcast em REPROCESS** - Reprocess em tempo real:
   - Endpoint POST /generate agora emite `message_received`
   - Mensagens reprocessadas aparecem para todos
   - Créditos cobrados de quem acionou
   - Arquivo: `conversations.ts:559-582`

### Correções Críticas de Multi-User (Nov 26, 2025)

22. **Identificação de Usuários em Multi-User** - Agent agora reconhece todos os usuários:
   - Problema: Agent respondia sempre ao owner, mesmo quando outro usuário enviava mensagem
   - Causa: Queue worker (`responseQueue.ts`) não incluía membros convidados no `allUsers` Map
   - Solução: Adicionado fetch de `UserConversationMembership` para conversas multi-user
   - Agent agora recebe informações completas de todos os usuários
   - Arquivo: `responseQueue.ts:108-125`

23. **Nomes de Remetentes no Histórico** - Contexto correto para multi-user:
   - Problema: Mensagens apareciam como "Desconhecido" no histórico
   - Solução: `memoryService.ts` agora mapeia todos os membros via `UserConversationMembership`
   - Formato de mensagem específico para multi-user: `[Message from {nome}]\n{conteúdo}`
   - Arquivo: `memoryService.ts:172-198, 484-490`

24. **Prompts Específicos Multi-User** - LLM ciente de múltiplos usuários:
   - Adicionado prompt crítico alertando sobre múltiplos usuários
   - LLM agora verifica nome do remetente de cada mensagem
   - Destaca quem enviou a última mensagem para resposta correta
   - Arquivo: `responseGenerationAgent.ts:205, 211`

25. **Display de Membros no Frontend** - Todos os usuários visíveis:
   - `ChatContainer.tsx` agora usa `useMembersQuery` para buscar membros
   - `processedParticipants` inclui todos os membros em conversas multi-user
   - Elimina display de "Desconhecido (ID)" para usuários convidados
   - Arquivo: `ChatContainer.tsx:159, 207-216`

### Documentação de Entregas

26. **RECENT_DELIVERIES_REVIEW.md** - Revisão completa:
   - Documenta todas as 21 entregas da Fase 4
   - Inclui métricas de código (~3,030 LOC)
   - Testes realizados e cenários validados
   - Próximos passos sugeridos
   - Localização: `docs/todo/RECENT_DELIVERIES_REVIEW.md`

---

## Fase 3: Sistema de Memoria LLM (Alta Prioridade)

### Problema

Conversas longas (>100 mensagens) enfrentam:
- Limite de contexto atingido (LLM context window)
- Custo elevado de tokens
- Perda de informacoes antigas

### Solucao: Summarization Pipeline

Sistema de resumo incremental que:
1. Detecta quando conversa atinge threshold (50 msgs)
2. Gera resumo dos eventos principais
3. Armazena resumo estruturado
4. Usa resumo + mensagens recentes como contexto

### Schema Changes

```prisma
model Conversation {
  // ... campos existentes
  memoryLastUpdatedAt DateTime?
  memories ConversationMemory[]
}

model ConversationMemory {
  id             String   @id @default(uuid())
  conversationId String
  conversation   Conversation @relation(...)

  summary        String   @db.Text
  keyEvents      Json     // Array de eventos estruturados
  characters     Json     // Estado dos personagens
  plotFlags      Json     // Flags de narrativa

  startMessageId String?
  endMessageId   String?
  messageCount   Int

  createdAt      DateTime @default(now())
}
```

### Tarefas Backend

- [x] Criar modelo ConversationMemory
- [x] Criar migracao Prisma (MANUAL - seguir regras do CLAUDE.md)
- [x] Implementar `memoryService.ts`:
  - [x] `shouldGenerateMemory(conversationId)`
  - [x] `generateMemory(params)`
  - [x] `saveMemory(conversationId, memory, ...)`
  - [x] `getLatestMemory(conversationId)`
  - [x] `buildContextWithMemory(conversationId)`
- [x] Criar BullMQ job para geracao assincrona
- [x] Atualizar WebSocket handler para trigger automatico
- [x] Atualizar assistantService para usar memoria

### Tarefas Frontend

- [x] Componente `MemoryIndicator.tsx`
- [x] Socket listener para `memory_update_started/complete`
- [x] UI de indicador de memoria ativa

### Estimativa

- **Esforco**: 2 semanas
- **Custo LLM**: ~$5/mes para 1000 usuarios

---

## Fase 4: Chat Multi-Usuario (Game-Changer)

### Visao Geral

Permitir multiplos usuarios humanos em uma conversa:
- **Limite**: 4 usuarios humanos + N personagens
- **Orquestracao**: Assistente responde baseado em contexto/mencao
- **Presenca**: Indicadores de online/offline/digitando

### Schema Changes

```prisma
model Conversation {
  // ... existentes
  maxUsers       Int      @default(1)
  isMultiUser    Boolean  @default(false)
  ownerUserId    String
  permissions    Json?
}

model UserConversationMembership {
  id             String       @id @default(uuid())
  conversationId String
  userId         String
  role           MembershipRole @default(MEMBER)
  joinedAt       DateTime     @default(now())
  invitedBy      String?
  canWrite       Boolean      @default(true)
  canInvite      Boolean      @default(false)

  @@unique([conversationId, userId])
}

enum MembershipRole {
  OWNER
  MODERATOR
  MEMBER
  VIEWER
}
```

### Tarefas Backend

- [x] Criar migracao para novos campos
- [x] Implementar `membershipService.ts`:
  - [x] `joinConversation(conversationId, userId)`
  - [x] `leaveConversation(conversationId, userId)`
  - [x] `inviteUser(conversationId, invitedUserId, inviterId)`
  - [x] `kickUser(conversationId, userId, kickerId)`
- [x] Implementar `presenceService.ts`:
  - [x] Tracking via Socket.IO
  - [x] `getUsersOnline(conversationId)`
  - [x] Events: user_joined, user_left, user_typing
- [x] Implementar AI Orchestration:
  - [x] Decidir quando assistente deve responder
  - [x] Detectar mencoes (@NomePersonagem)
  - [x] Analisar intent via NLP
- [x] Atualizar WebSocket para broadcast multi-user

### Tarefas Frontend

- [x] Lista de usuários online (avatares) - OnlineUsersIndicator
- [x] Notifications de presença - useChatSocket eventos
- [x] useMembership hook - Query e mutations
- [x] Badge de role (owner/mod/member) - MemberRoleBadge.tsx
- [x] Convite de usuários - Aba "Users" integrada no AddParticipantModal
- [x] Rota de busca de usuários - GET /api/v1/users/search
- [x] Message attribution (mostrar nome de usuário) - ChatView.tsx
- [x] WebSocket handlers para delete e presença - useChatSocket.ts
- [ ] Cores diferentes por usuário (opcional)
- [ ] Accept/reject invite (opcional)
- [ ] Upgrade single → multi-user via settings (opcional)

### Estimativa

- **Esforco**: 3-4 semanas
- **Complexidade**: Muito Alta

---

## Fase 5: Discovery de Chats Publicos

### Requisitos

Dashboard com aba "Conversas Ativas" mostrando:
- Grid de conversas publicas
- Preview de ultimas mensagens
- Indicador de usuarios online
- Filtros: genero, tags, popularidade
- Botao "Assistir" ou "Entrar"

### Dependencias

- Sistema de Privacidade (Fase 2) - COMPLETO
- Chat Multi-Usuario (Fase 4) - Para funcao "Entrar"

### Tarefas

- [ ] Criar pagina `/discover-chats`
- [ ] Componente `ConversationCard.tsx`
- [ ] Filtros por genero, tags, popularidade
- [ ] Modo "Assistir" (read-only)
- [ ] Modo "Entrar" (requer Fase 4)

### Estimativa

- **Esforco**: 1 semana (apos Fase 4)

---

## Fase 5b: Traducao Real-Time Multi-User

### Requisitos

Em chats com multiplos usuarios de diferentes idiomas:
- Traduzir mensagens automaticamente
- Cache de traducoes (1 msg x N idiomas)
- Toggle "Ver original" vs "Traduzido"

### Dependencias

- Sistema de Traducao UGC - JA IMPLEMENTADO
- Chat Multi-Usuario (Fase 4)

### Schema

```prisma
model MessageTranslation {
  id              String   @id @default(uuid())
  messageId       String
  targetLanguage  String
  translatedText  String   @db.Text
  provider        String
  createdAt       DateTime @default(now())

  @@unique([messageId, targetLanguage])
}
```

### Tarefas

- [ ] Modelo MessageTranslation
- [ ] Extensao do translationService
- [ ] WebSocket com broadcast de traducoes
- [ ] UI com toggle original/traduzido

### Estimativa

- **Esforco**: 1.5 semanas
- **Custo**: ~$20/mes para 100k traducoes

---

## Resumo de Esforco

| Fase | Esforco | Complexidade | Dependencias |
|------|---------|--------------|--------------|
| 3 - Memoria | 2 semanas | Alta | Nenhuma |
| 4 - Multi-User | 3-4 semanas | Muito Alta | Nenhuma |
| 5 - Discovery | 1 semana | Media | Fase 4 |
| 5b - Traducao RT | 1.5 semanas | Alta | Fase 4 |
| **Total** | **7.5-8.5 semanas** | | |

## Recomendacao

**Iniciar pela Fase 3 (Memoria)**:
- Alto impacto para conversas longas
- Fundacao para escalabilidade
- ROI excelente (reduz custos + melhora UX)
- Independente das outras fases

---

## Referencias

- `docs/features/CHAT_IMPROVEMENTS.md` - Documento original completo
- `docs/features/MULTI_USER_CHAT_DETAILED.md` - Spec detalhada de multi-user

---

**Origem**: Extraido de `docs/features/CHAT_IMPROVEMENTS.md` (Fases 3-5)
