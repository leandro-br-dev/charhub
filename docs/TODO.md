# TODO & Próximas Tarefas

Este documento contém apenas as tarefas prioritárias em que devemos focar agora. Para histórico completo e checklist detalhado, consulte `docs/MIGRATION/02_PLANO_DE_MIGRACAO.md`.

---

## 📊 Status Atual

- ✅ **FASE 0**: Infraestrutura (BullMQ, R2, Classificação) - **COMPLETA**
- ✅ **FASE 1**: Sistema de Personagens - **COMPLETA**
- 🎯 **FASE 2**: Sistema de Chat - **PRÓXIMA**

**Progresso total**: 33% (2 de 6 fases completas)

---

## 🎯 FASE 2: Sistema de Chat (PRÓXIMA PRIORIDADE)

**Objetivo**: Implementar conversas em tempo real entre usuário e personagens de IA.
**Duração estimada**: 3-4 semanas
**Status**: 🚧 Pronto para iniciar

### 📋 Tarefas Sequenciais

#### ✅ Etapa 2.1: Modelos de Dados (FUNDAÇÃO) - COMPLETA
**Tempo**: 2-3 dias
**Responsável**: 1 agente
**Status**: ✅ Concluída em 2025-10-11

**Tarefas**:
- [x] Criar schemas Prisma:
  - [x] `Conversation` (id, title, settings, timestamps, userId)
  - [x] `ConversationParticipant` (id, conversationId, userId/characterId/assistantId, configOverride)
  - [x] `Message` (id, conversationId, senderId, senderType, content, attachments, metadata)
  - [x] `Assistant` (id, name, instructions, defaultCharacterId, userId)
- [x] Definir relacionamentos:
  - [x] Conversation ↔ User (1:N)
  - [x] Conversation ↔ ConversationParticipant (1:N)
  - [x] ConversationParticipant ↔ Character (N:1)
  - [x] ConversationParticipant ↔ Assistant (N:1)
  - [x] Conversation ↔ Message (1:N)
- [x] Executar migração: `20251011000000_baseline_all_tables`
- [x] Schemas validados e prontos para uso

**Arquivos implementados**:
- `backend/prisma/schema.prisma` (linhas 322-464)
- `backend/prisma/migrations/20251011000000_baseline_all_tables/`

---

### 🔀 Tarefas em PARALELO (após Etapa 2.1)

Estas tarefas podem ser executadas simultaneamente por 2 agentes diferentes:

#### ✅ AGENTE 1: Etapa 2.2 - Backend Chat (API REST + Services) - COMPLETA
**Tempo**: 1-2 semanas
**Dependência**: ✅ Etapa 2.1 (schemas Prisma)
**Status**: ✅ Concluída em 2025-10-11

**Tarefas**:
- [x] **Validadores Zod**:
  - [x] `CreateConversationSchema` (title, participantIds[], settings, projectId)
  - [x] `SendMessageSchema` (conversationId, content, attachments, metadata)
  - [x] `UpdateConversationSchema` (title, settings, isTitleUserEdited)
  - [x] `AddParticipantSchema` com validação XOR (userId/characterId/assistantId)
- [x] **Services**:
  - [x] `conversationService.ts` (380 linhas):
    - [x] `createConversation(userId, data)` - criar conversa com participantes
    - [x] `getConversationById(conversationId, userId)` - buscar com mensagens
    - [x] `listConversations(userId, filters)` - listar conversas com paginação
    - [x] `updateConversation(conversationId, userId, data)`
    - [x] `addParticipant(conversationId, userId, participantData)`
    - [x] `removeParticipant(conversationId, userId, participantId)`
    - [x] `archiveConversation(conversationId, userId)`
    - [x] `isConversationOwner(conversationId, userId)`
  - [x] `messageService.ts` (192 linhas):
    - [x] `createMessage(data)` - criar mensagem + update lastMessageAt
    - [x] `listMessages(conversationId, userId, query)` - paginação com before/after
    - [x] `getMessageById(messageId, userId)`
    - [x] `deleteMessage(messageId, userId)`
    - [x] `getMessageCount(conversationId)`
    - [x] `getLastMessages(conversationId, limit)`
  - [x] `assistantService.ts` (160 linhas):
    - [x] `generateResponse(conversationId, participantId)` - placeholder LLM
    - [x] `buildSystemPrompt(instructions, character)` - construir contexto
    - [x] `buildConversationHistory(conversationId, limit)`
    - [x] `sendAIMessage(conversationId, participantId)`
- [x] **Rotas Express** (`routes/v1/conversations.ts` - 532 linhas):
  - [x] `POST /conversations` - criar conversa
  - [x] `GET /conversations` - listar conversas do usuário
  - [x] `GET /conversations/:id` - detalhes + mensagens
  - [x] `PATCH /conversations/:id` - atualizar título/settings
  - [x] `POST /conversations/:id/participants` - adicionar participante
  - [x] `DELETE /conversations/:id/participants/:participantId` - remover participante
  - [x] `POST /conversations/:id/messages` - enviar mensagem do usuário
  - [x] `GET /conversations/:id/messages` - paginação de histórico
  - [x] `POST /conversations/:id/generate` - gerar resposta de IA
- [x] **Middleware**:
  - [x] Usar `requireAuth` em todas as rotas
  - [x] Ownership verification em cada service
- [x] Integrar rotas em `routes/v1/index.ts`

**Arquivos implementados**:
- `backend/src/validators/conversation.validator.ts` (70 linhas)
- `backend/src/validators/message.validator.ts` (40 linhas)
- `backend/src/services/conversationService.ts` (380 linhas)
- `backend/src/services/messageService.ts` (192 linhas)
- `backend/src/services/assistantService.ts` (160 linhas)
- `backend/src/routes/v1/conversations.ts` (532 linhas)

---

#### 👤 AGENTE 2: Etapa 2.3 - Frontend Chat Interface
**Tempo**: 1-2 semanas
**Dependência**: ✅ Etapa 2.1 (schemas Prisma para tipos)

**Tarefas**:
- [ ] **Tipos TypeScript** (`frontend/src/types/chat.ts`):
  - [ ] `Conversation`, `Message`, `ConversationParticipant`
  - [ ] `CreateConversationPayload`, `SendMessagePayload`
- [ ] **Serviço API** (`frontend/src/services/chatService.ts`):
  - [ ] `createConversation(data)`
  - [ ] `getConversation(id)`
  - [ ] `listConversations(filters?)`
  - [ ] `sendMessage(conversationId, content)`
  - [ ] `getMessages(conversationId, pagination?)`
  - [ ] `addParticipant(conversationId, characterId)`
  - [ ] `archiveConversation(id)`
- [ ] **Hooks customizados**:
  - [ ] `useConversationListQuery()` - React Query
  - [ ] `useConversationQuery(id)` - buscar conversa específica
  - [ ] `useMessagesQuery(conversationId, pagination)` - histórico
  - [ ] `useConversationMutations()` - create, update, archive
  - [ ] `useMessageMutations()` - send, delete
- [ ] **Componentes UI** (padrão colocation em `pages/(chat)/shared/components/`):
  - [ ] `ConversationList.tsx` - lista lateral de conversas
  - [ ] `ConversationHeader.tsx` - título, participantes, ações
  - [ ] `MessageList.tsx` - lista de mensagens com scroll infinito
  - [ ] `MessageBubble.tsx` - balão individual (user/character)
  - [ ] `MessageInput.tsx` - campo de texto + enviar
  - [ ] `CharacterAvatar.tsx` - avatar do participante
  - [ ] `TypingIndicator.tsx` - animação "digitando..."
- [ ] **Páginas** (usando padrão colocation):
  - [ ] `pages/(chat)/index.tsx` - lista de conversas (vazia: placeholder)
  - [ ] `pages/(chat)/[id]/index.tsx` - interface de chat ativa
  - [ ] `pages/(chat)/new/index.tsx` - criar nova conversa
- [ ] **Traduções**:
  - [ ] Criar `backend/translations/en/chat.json`
  - [ ] Adicionar 'chat' a SUPPORTED_NAMESPACES
  - [ ] Rodar `npm run build:translations`
- [ ] **Integração com Sidebar**:
  - [ ] Atualizar `Sidebar.tsx` para mostrar lista de conversas em `/chat/*`

**Arquivos criados**:
- `frontend/src/types/chat.ts`
- `frontend/src/services/chatService.ts`
- `frontend/src/pages/(chat)/shared/hooks/*`
- `frontend/src/pages/(chat)/shared/components/*`
- `frontend/src/pages/(chat)/index.tsx`
- `frontend/src/pages/(chat)/[id]/index.tsx`
- `frontend/src/pages/(chat)/new/index.tsx`
- `backend/translations/en/chat.json`

**Referência**: `E:\Projects\charhub_dev_old_version\frontend\src\components\chat\`

---

### 🔄 Etapa 2.4: WebSocket em Tempo Real (APÓS 2.2 e 2.3)
**Tempo**: 3-5 dias
**Responsável**: 1 agente (preferencialmente quem fez backend)
**Dependência**: ✅ Etapas 2.2 e 2.3 (REST API e UI funcionais)

**Tarefas**:
- [ ] **Backend WebSocket**:
  - [ ] Instalar Socket.IO: `npm install socket.io`
  - [ ] Configurar Socket.IO no `backend/src/index.ts`
  - [ ] Criar `backend/src/websocket/chatHandler.ts`:
    - [ ] Autenticação via JWT no handshake
    - [ ] Gerenciar rooms por conversationId
    - [ ] Eventos:
      - [ ] `join_conversation` - entrar na sala
      - [ ] `send_message` - enviar mensagem
      - [ ] `message_received` - broadcast para sala
      - [ ] `typing_start` / `typing_stop` - indicadores
      - [ ] `ai_response_start` / `ai_response_chunk` - streaming LLM
  - [ ] Integrar com `assistantService` para respostas de IA
- [ ] **Frontend WebSocket**:
  - [ ] Instalar Socket.IO client: `npm install socket.io-client`
  - [ ] Criar `frontend/src/hooks/useChatSocket.ts`:
    - [ ] Conectar ao servidor com token JWT
    - [ ] Gerenciar estado da conexão
    - [ ] Emitir e escutar eventos
    - [ ] Auto-reconnect em caso de desconexão
  - [ ] Integrar hook na página de chat (`pages/(chat)/[id]/index.tsx`)
  - [ ] Atualizar `MessageInput` para usar WebSocket
  - [ ] Adicionar `TypingIndicator` com eventos real-time
  - [ ] Implementar scroll automático ao receber mensagens

**Arquivos criados**:
- `backend/src/websocket/chatHandler.ts`
- `frontend/src/hooks/useChatSocket.ts`

**Referência**: `E:\Projects\charhub_dev_old_version\backend\app\websocket\chat_handler.py`

---

### ✅ Critério de Sucesso da Fase 2

Um usuário deve conseguir:
- ✅ Criar uma conversa com 1 ou mais personagens
- ✅ Enviar mensagens via REST API (Etapas 2.2 + 2.3)
- ✅ Receber respostas de IA contextuais baseadas no personagem
- ✅ Ver histórico de mensagens com scroll infinito
- ✅ Enviar/receber mensagens em tempo real via WebSocket (Etapa 2.4)
- ✅ Ver indicador "digitando..." quando a IA está respondendo

---

## 🔧 Tarefas de Manutenção e Melhorias (Paralelo à Fase 2)

Estas tarefas podem ser feitas em paralelo por um 3º agente ou nos intervalos:

### 🎨 UX/UI - Melhorias de Interface
- [ ] Implementar página de edição de personagens (`/characters/edit/:id`)
- [ ] Implementar página de visualização detalhada (`/characters/view/:id`)
- [ ] Adicionar upload de imagens de avatar via R2
- [ ] Melhorar feedback visual de loading e erros
- [ ] Implementar sistema de notificações toast

### 🌐 Internacionalização
- [ ] Revisar traduções existentes com falantes nativos
- [ ] Adicionar mais idiomas (pt-PT, en-GB, etc.)

### 📝 Documentação
- [ ] Gerar documentação da API com Swagger/OpenAPI
- [ ] Atualizar `BACKEND.md` com novos endpoints
- [ ] Criar guia de contribuição (`CONTRIBUTING.md`)

### 🧪 Testes
- [ ] Configurar Vitest no backend
- [ ] Escrever testes unitários para services críticos
- [ ] Configurar Vitest no frontend
- [ ] Testes E2E com Playwright

---

## 📚 Documentação de Referência

- **Migração Completa**: `docs/MIGRATION/02_PLANO_DE_MIGRACAO.md`
- **Inventário Antigo**: `docs/MIGRATION/04_OLD_PROJECT_INVENTORY.md`
- **Arquitetura Backend**: `docs/BACKEND.md`
- **Arquitetura Frontend**: `docs/FRONTEND.md`
- **Operações**: `docs/DEV_OPERATIONS.md`

---

## 🚀 Como Começar

1. **Para Fase 2.1** (Fundação - Sequencial):
   ```bash
   # Editar prisma/schema.prisma
   # Adicionar models: Conversation, ConversationParticipant, Message, Assistant
   npx prisma migrate dev --name add_chat_models
   npx prisma studio  # Validar estrutura
   ```

2. **Para Fase 2.2** (Backend - Paralelo):
   ```bash
   # Após 2.1 estar completa
   # Criar validators, services, routes conforme checklist acima
   # Testar com Postman/Insomnia
   ```

3. **Para Fase 2.3** (Frontend - Paralelo):
   ```bash
   # Após 2.1 estar completa
   # Pode começar com tipos mock enquanto 2.2 está em desenvolvimento
   # Criar pages, components, hooks conforme checklist acima
   ```

4. **Para Fase 2.4** (WebSocket - Após 2.2 e 2.3):
   ```bash
   npm install socket.io socket.io-client
   # Implementar chatHandler e useChatSocket
   ```

---

## ⚡ Estratégia de Desenvolvimento Paralelo

### Cenário Ideal (2 Agentes):
1. **Agente 1**: Fazer Etapa 2.1 (Fundação) sozinho
2. **Após 2.1 concluída**:
   - **Agente 1**: Iniciar Etapa 2.2 (Backend)
   - **Agente 2**: Iniciar Etapa 2.3 (Frontend)
3. **Após 2.2 e 2.3 concluídas**:
   - **Agente 1**: Fazer Etapa 2.4 (WebSocket)

### Cenário com 3 Agentes:
1. **Agente 1**: Etapa 2.1 → Etapa 2.2 → Etapa 2.4
2. **Agente 2**: (aguardar 2.1) → Etapa 2.3
3. **Agente 3**: Tarefas de manutenção em paralelo

---

**Última atualização**: 2025-10-10
**Fase atual**: Preparação para iniciar Fase 2 (Chat)


## LLM: Tools & Web Browsing Support (New)
- Add structured tool-calling support to LLM service
  - backend/src/services/llm/index.ts: wire tools, toolChoice, allowBrowsing
  - Update provider adapters (OpenAI/Gemini/Grok) to pass tool schemas
  - Add a simple web-search fetcher tool (server-side HTTP + parser)
- Character Autocomplete (web mode)
  - Switch to actual web search tool when available
  - Ground suggestions with citations in agent output (optional)
  - Rate-limit and cache queries

