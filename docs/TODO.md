# TODO & Próximas Tarefas

Este documento contém apenas as tarefas prioritárias em que devemos focar agora. Para histórico completo e checklist detalhado, consulte `docs/MIGRATION/02_PLANO_DE_MIGRACAO.md`.

---

## 📊 Status Atual

- ✅ **FASE 0**: Infraestrutura (BullMQ, R2, Classificação) - **COMPLETA**
- ✅ **FASE 1**: Sistema de Personagens - **COMPLETA**
- ✅ **FASE 2**: Sistema de Chat (WebSocket + REST API) - **COMPLETA**
- ✅ **TRADUÇÃO**: Sistema de Tradução Automática de UGC - **COMPLETA**
- ✅ **UX/UI**: Edição de Personagens + Upload R2 + Toasts - **COMPLETA**
- ✅ **LLM TOOLS**: Tool-Calling + Web Search Integration - **COMPLETA**

**Progresso total**: 70% (6 de 8 features core completas)

### ✨ Sistema Totalmente Funcional

O CharHub possui agora um sistema completo e funcional de:
- 🎭 Criação e edição de personagens com formulários completos
- 💬 Chat em tempo real via WebSocket com múltiplos personagens
- 🌍 Tradução automática de conteúdo (UGC) com cache multinível
- 📸 Upload de imagens para R2 (avatares, covers, galerias)
- 🔔 Sistema de notificações toast
- 🔐 Autenticação OAuth (Google + Facebook)
- 🎨 Interface responsiva com tema cyberpunk
- 🤖 LLM com tool-calling e web search para informações em tempo real

---

## ✅ FASE 2: Sistema de Chat - **COMPLETA**

**Objetivo**: Implementar conversas em tempo real entre usuário e personagens de IA.
**Duração**: 3-4 semanas
**Status**: ✅ **COMPLETA**

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

#### ✅ AGENTE 2: Etapa 2.3 - Frontend Chat Interface - COMPLETA
**Tempo**: 1-2 semanas
**Dependência**: ✅ Etapa 2.1 (schemas Prisma para tipos)
**Status**: ✅ Concluída

**Tarefas**:
- [x] **Tipos TypeScript** (`frontend/src/types/chat.ts`)
- [x] **Serviço API** (`frontend/src/services/chatService.ts`)
- [x] **Hooks customizados**:
  - [x] `useConversations.tsx` - React Query para conversas
  - [x] `useMessages.tsx` - React Query para mensagens
  - [x] `useChatModalsManager.ts` - gerenciamento de modais
- [x] **Componentes UI**:
  - [x] `ConversationList.tsx`
  - [x] `ConversationHeader.tsx`
  - [x] `MessageList.tsx`
  - [x] `MessageBubble.tsx`
  - [x] `MessageInput.tsx`
  - [x] `TypingIndicator.tsx`
  - [x] `ChatContainer.tsx`
  - [x] `ChatView.tsx`
  - [x] `AddParticipantModal.tsx`
  - [x] `ConversationSettingsModal.tsx`
  - [x] `ParticipantConfigModal.tsx`
  - [x] `ImageGalleryModal.tsx`
- [x] **Páginas**:
  - [x] `pages/(chat)/index.tsx`
  - [x] `pages/(chat)/[conversationId]/index.tsx`
  - [x] `pages/(chat)/new/index.tsx`
- [x] **Traduções**:
  - [x] `backend/translations/_source/chat.json`
  - [x] Traduzido para todos os idiomas (12 idiomas)
  - [x] Integrado com i18next

**Arquivos implementados**:
- `frontend/src/types/chat.ts`
- `frontend/src/services/chatService.ts`
- `frontend/src/pages/(chat)/shared/hooks/*`
- `frontend/src/pages/(chat)/shared/components/*` (15 componentes)
- `frontend/src/pages/(chat)/index.tsx`
- `frontend/src/pages/(chat)/[conversationId]/index.tsx`
- `frontend/src/pages/(chat)/new/index.tsx`
- `backend/translations/*/chat.json` (12 idiomas)

---

### ✅ Etapa 2.4: WebSocket em Tempo Real - COMPLETA
**Tempo**: 3-5 dias
**Dependência**: ✅ Etapas 2.2 e 2.3 (REST API e UI funcionais)
**Status**: ✅ Concluída

**Tarefas**:
- [x] **Backend WebSocket**:
  - [x] Socket.IO instalado e configurado
  - [x] `backend/src/websocket/chatHandler.ts` implementado
  - [x] Autenticação via JWT no handshake
  - [x] Gerenciamento de rooms por conversationId
  - [x] Eventos implementados:
    - [x] `join_conversation`
    - [x] `send_message`
    - [x] `message_received`
    - [x] `typing_start` / `typing_stop`
    - [x] `ai_response_start` / `ai_response_chunk` / `ai_response_end`
  - [x] Integração com `assistantService` e BullMQ
- [x] **Frontend WebSocket**:
  - [x] Socket.IO client instalado
  - [x] `frontend/src/hooks/useChatSocket.ts` implementado
  - [x] Conexão com token JWT
  - [x] Auto-reconnect
  - [x] Integrado em `ChatContainer.tsx`
  - [x] `MessageInput` usando WebSocket
  - [x] `TypingIndicator` com eventos real-time
  - [x] Scroll automático

**Arquivos implementados**:
- `backend/src/websocket/chatHandler.ts`
- `frontend/src/hooks/useChatSocket.ts`
- Integrado em `ChatContainer.tsx` e `MessageInput.tsx`

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

---

## 🎯 PRÓXIMAS TAREFAS PRIORITÁRIAS

### 🎨 UX/UI - Melhorias de Interface (Alta Prioridade)
- [x] **Implementar página de edição de personagens** (`/characters/:id/edit`) - ✅ COMPLETO
  - Implementado em `frontend/src/pages/(characters)/[characterId]/edit/index.tsx`
  - Formulário completo com todos os campos
  - Validação com Zod via `useCharacterForm`
  - Upload de avatar integrado
- [x] **Upload de imagens via Cloudflare R2** - ✅ COMPLETO
  - R2Service implementado em `backend/src/services/r2Service.ts`
  - Endpoints de upload:
    - `POST /api/v1/characters/avatar` - Avatar de personagem
    - `POST /api/v1/characters/:id/images` - Imagens do personagem (AVATAR, COVER, SAMPLE, STICKER)
    - `POST /api/v1/users/me/avatar` - Avatar de usuário
  - Multer configurado para upload multipart/form-data
  - Suporte para preview via `GET /api/v1/media/proxy`
- [x] **Sistema de notificações toast** - ✅ COMPLETO
  - Implementado em `frontend/src/contexts/ToastContext.tsx`
  - Hook `useToast()` disponível
  - Integrado em mutations (create/update characters)
  - Animações de entrada/saída
- [ ] **Melhorar feedback visual**
  - Loading skeletons para listas
  - Estados de erro mais informativos
  - Mensagens de confirmação para ações destrutivas

### 🤖 LLM - Tools & Web Browsing - ✅ COMPLETO
- [x] **Adicionar suporte a tool-calling no LLM service** - ✅ COMPLETO
  - [x] Atualizar `backend/src/services/llm/index.ts` para aceitar `tools`, `toolChoice`, `allowBrowsing`
  - [x] Adaptar providers (OpenAI/Gemini/Grok) para passar tool schemas
  - [x] Implementar parser de respostas com tool calls
  - [x] Sistema de auto-execução de tools com `autoExecuteTools`
- [x] **Web Search Tool** - ✅ COMPLETO
  - [x] Criar ferramenta de busca web server-side (`backend/src/services/llm/tools/webSearch.ts`)
  - [x] Integrar com DuckDuckGo API (sem necessidade de API key)
  - [x] Rate limiting com token bucket algorithm (10 req/s)
  - [x] Cache in-memory com TTL de 1 hora
  - [x] Parser de resultados com título, URL e snippet
- [x] **Character Autocomplete com Web Search** - ✅ COMPLETO
  - [x] Atualizar `characterAutocompleteAgent.ts` para usar web search
  - [x] Adicionar citações/fontes nas sugestões via system prompt
  - [x] Melhorar qualidade das sugestões com dados reais
  - [x] Modo 'web' vs 'ai' para controlar uso de web search
- [x] **Test Endpoints** - ✅ COMPLETO
  - [x] `POST /api/v1/llm-test/tool-calling` - teste geral de tool calling
  - [x] `POST /api/v1/llm-test/character-autocomplete` - teste de autocomplete com web search

**Arquivos implementados**:
- `backend/src/services/llm/tools/webSearch.ts` (140 linhas)
- `backend/src/services/llm/tools/index.ts` (90 linhas)
- `backend/src/services/llm/index.ts` (atualizado com tool support)
- `backend/src/services/llm/openai.ts` (atualizado com function calling)
- `backend/src/services/llm/gemini.ts` (atualizado com functionDeclarations)
- `backend/src/services/llm/grok.ts` (marcado como sem suporte a tools)
- `backend/src/agents/characterAutocompleteAgent.ts` (atualizado com web mode)
- `backend/src/routes/v1/llm-test.ts` (105 linhas)

### 📝 Documentação (Média Prioridade)
- [ ] **API Documentation com Swagger/OpenAPI**
  - Instalar `@nestjs/swagger` ou alternativa para Express
  - Documentar todos os endpoints REST
  - Gerar UI interativa
- [ ] **Atualizar BACKEND.md**
  - Documentar novos endpoints de chat
  - Documentar sistema de tradução
  - Adicionar exemplos de uso
- [ ] **Criar CONTRIBUTING.md**
  - Guia de setup local
  - Padrões de código
  - Processo de PR

### 🧪 Testes (Baixa Prioridade - Futuro)
- [ ] Configurar Vitest no backend
- [ ] Testes unitários para services críticos
- [ ] Configurar Vitest no frontend
- [ ] Testes E2E com Playwright

---

## 📚 Documentação de Referência

- **Sistema de Tradução**: `docs/TRANSLATION_SYSTEM.md` ⭐
- **LLM Tool-Calling**: `docs/LLM_TOOLS.md` ⭐ Novo
- **Arquitetura Backend**: `docs/BACKEND.md`
- **Arquitetura Frontend**: `docs/FRONTEND.md`
- **Operações**: `docs/DEV_OPERATIONS.md`
- **Migração Completa**: `docs/MIGRATION/02_PLANO_DE_MIGRACAO.md`

---

**Última atualização**: 2025-11-07
**Fase atual**: Sistema de Tool Calling completo - próximas melhorias de UX/UI e documentação

