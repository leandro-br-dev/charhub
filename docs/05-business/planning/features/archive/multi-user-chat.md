# Chat Multi-Usuário - Plano de Implementação Detalhado

**Feature**: #4 Chat Multi-Usuário (Collaborative Roleplay)
**Branch**: `feature/multi-user-chat`
**Status**: 🚧 Em Desenvolvimento
**Duração Estimada**: 3-4 semanas
**Complexidade**: ⭐⭐⭐⭐ Muito Alta

---

## 📋 Índice

1. [Visão Geral](#visão-geral)
2. [Requisitos](#requisitos)
3. [Arquitetura](#arquitetura)
4. [Fases de Implementação](#fases-de-implementação)
5. [Schema Changes](#schema-changes)
6. [Backend Implementation](#backend-implementation)
7. [Frontend Implementation](#frontend-implementation)
8. [Testing Strategy](#testing-strategy)
9. [Deployment Plan](#deployment-plan)
10. [Rollback Strategy](#rollback-strategy)

---

## Visão Geral

### O Que É

Transformar conversas de **single-user** (1 usuário + N bots) para **multi-user** (até 4 usuários + N bots), permitindo **roleplay colaborativo** onde múltiplos humanos interagem com personagens de IA simultaneamente.

### Caso de Uso Principal

**Exemplo**: Alice e Bob querem fazer roleplay juntos em uma taverna medieval com 2 NPCs (bartender e mysterious stranger).

**Fluxo**:
1. Alice cria conversa "Medieval Tavern"
2. Alice adiciona 2 personagens (Bartender, Stranger)
3. Alice convida Bob
4. Bob aceita e entra na conversa
5. Alice e Bob conversam entre si E com os NPCs
6. NPCs respondem quando mencionados ou quando faz sentido no contexto

---

## Requisitos

### Funcionais

| # | Requisito | Prioridade | MVP? |
|---|-----------|------------|------|
| F1 | Suportar até 4 usuários humanos por conversa | 🔴 Alta | ✅ |
| F2 | Sistema de convite (invite/accept/reject) | 🔴 Alta | ✅ |
| F3 | Indicadores de presença (online/offline/typing) | 🔴 Alta | ✅ |
| F4 | Orquestração de IA (decidir quando responder) | 🔴 Alta | ✅ |
| F5 | Sistema de permissões (owner/mod/member/viewer) | 🟡 Média | ✅ |
| F6 | Transferir ownership | 🟢 Baixa | ❌ |
| F7 | Kick/ban usuários | 🟢 Baixa | ❌ |
| F8 | Message read receipts | 🟢 Baixa | ❌ |

### Não-Funcionais

| # | Requisito | Métrica |
|---|-----------|---------|
| NF1 | Latência de sincronização | < 500ms |
| NF2 | Suporte a 100+ conversas ativas simultâneas | 100 rooms |
| NF3 | Presença atualizada em tempo real | < 1s |
| NF4 | Escalabilidade horizontal (Redis pub/sub) | Future |

---

## Arquitetura

### Diagrama de Componentes

```
┌─────────────────────────────────────────────────────────────┐
│                      FRONTEND                                │
├─────────────────────────────────────────────────────────────┤
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐         │
│  │ MembersList │  │ InviteModal │  │PresenceBar  │         │
│  └─────────────┘  └─────────────┘  └─────────────┘         │
│         ▲                ▲                 ▲                 │
│         └────────────────┴─────────────────┘                │
│                          │                                   │
│                   useChatSocket                              │
│                          │                                   │
└──────────────────────────┼───────────────────────────────────┘
                           │ Socket.IO
┌──────────────────────────┼───────────────────────────────────┐
│                          ▼                                   │
│                    WEBSOCKET LAYER                           │
│  ┌──────────────────────────────────────────────────────┐  │
│  │ chatHandler.ts                                        │  │
│  │  • join_conversation (multi-user aware)              │  │
│  │  • send_message (broadcast to all members)           │  │
│  │  • typing_start/stop (with userId)                   │  │
│  │  • user_presence (online/offline)                    │  │
│  └──────────────────────────────────────────────────────┘  │
└──────────────────────────┼───────────────────────────────────┘
                           │
┌──────────────────────────┼───────────────────────────────────┐
│                          ▼                                   │
│                   BACKEND SERVICES                           │
│  ┌─────────────────┐  ┌─────────────────┐  ┌──────────────┐│
│  │MembershipService│  │PresenceService  │  │AIOrchestrator││
│  ├─────────────────┤  ├─────────────────┤  ├──────────────┤│
│  │ joinConv()      │  │ trackPresence() │  │shouldRespond│││
│  │ inviteUser()    │  │ getOnlineUsers()│  │  (context)  ││
│  │ leaveConv()     │  │ emitTyping()    │  │             ││
│  │ kickUser()      │  │                 │  │             ││
│  └─────────────────┘  └─────────────────┘  └──────────────┘│
│         │                    │                    │          │
│         └────────────────────┴────────────────────┘          │
│                              │                                │
│                              ▼                                │
│                         PRISMA ORM                            │
│  ┌────────────────────────────────────────────────────────┐ │
│  │ UserConversationMembership                             │ │
│  │ Conversation (updated with multiuser fields)           │ │
│  └────────────────────────────────────────────────────────┘ │
└───────────────────────────────────────────────────────────────┘
```

### Fluxo de Dados: Envio de Mensagem em Conversa Multi-User

```
User A envia mensagem "Hello!"
         │
         ▼
┌────────────────────────┐
│ Frontend: send_message │
└───────────┬────────────┘
            │
            ▼ Socket.IO
┌────────────────────────────────────────────┐
│ chatHandler: receive 'send_message' event  │
└───────────┬────────────────────────────────┘
            │
            ▼
┌───────────────────────────────────────────┐
│ 1. Save message to DB                     │
│    • senderType: USER                     │
│    • senderId: userA.id                   │
└───────────┬───────────────────────────────┘
            │
            ▼
┌────────────────────────────────────────────┐
│ 2. Broadcast to room members               │
│    io.to(room).emit('message_received')    │
│    • All users (A, B, C, D) receive        │
└───────────┬────────────────────────────────┘
            │
            ▼
┌────────────────────────────────────────────┐
│ 3. AI Orchestration                        │
│    • shouldAssistantRespond()?             │
│    • Check mentions, context, turn         │
│    • Decide which bots respond             │
└───────────┬────────────────────────────────┘
            │
            ▼
┌────────────────────────────────────────────┐
│ 4. Queue AI responses                      │
│    • For each bot that should respond:     │
│      - Queue job                           │
│      - Emit typing indicator               │
└────────────────────────────────────────────┘
```

---

## Fases de Implementação

### Fase 1: Schema & Core Services (Semana 1) ✅ CONCLUÍDA
**Objetivo**: Preparar infraestrutura de dados e serviços básicos

- [x] ~~Schema changes (Prisma migration)~~ ✅
- [x] ~~MembershipService (CRUD de membros)~~ ✅
- [x] ~~Atualizar conversationService para multi-user~~ ✅
- [x] ~~API Routes para membership~~ ✅
- [x] ~~Validação Zod~~ ✅
- [x] ~~Data migration script~~ ✅
- [ ] Testes unitários dos services (Pendente)

### Fase 2: WebSocket & Presence (Semana 2) ✅ CONCLUÍDA
**Objetivo**: Sistema de presença e broadcast multi-user

- [x] ~~PresenceService (track online/offline)~~ ✅
- [x] ~~Atualizar chatHandler para broadcast multi-user~~ ✅
- [x] ~~Typing indicators com userId~~ ✅
- [x] ~~User joined/left events~~ ✅
- [ ] Testes de integração WebSocket (Pendente)

### Fase 3: AI Orchestration (Semana 2-3)
**Objetivo**: Lógica de quando bots respondem

- [ ] AIOrchestrationService
- [ ] Detecção de menções (`@Character`)
- [ ] Análise de contexto (quem está falando com quem)
- [ ] Turn-based logic (evitar user-to-user interruption)
- [ ] Testes de orquestração

### Fase 4: Frontend UI (Semana 3-4)
**Objetivo**: Interface completa para multi-user

- [ ] MembersList component
- [ ] InviteModal + search users
- [ ] PresenceIndicators
- [ ] Message attribution (mostrar user + character)
- [ ] Accept/reject invite flow
- [ ] Permissions UI (role badges)

### Fase 5: Testing & Polish (Semana 4)
**Objetivo**: Testes end-to-end e refinamentos

- [ ] Testes E2E (Playwright)
- [ ] Load testing (100 concurrent users)
- [ ] Bug fixes
- [ ] Documentation
- [ ] Deployment plan

---

## Schema Changes

### Migration 1: Multi-User Core

```prisma
// backend/prisma/schema.prisma

model Conversation {
  id             String   @id @default(uuid())
  userId         String   // DEPRECATED: Use ownerUserId
  user           User     @relation("UserConversations", fields: [userId], references: [id], onDelete: Cascade)

  // NEW: Multi-user fields
  ownerUserId    String   // Criador da conversa
  owner          User     @relation("ConversationOwner", fields: [ownerUserId], references: [id])
  isMultiUser    Boolean  @default(false)
  maxUsers       Int      @default(1) // Limite de usuários humanos (1-4)

  // NEW: Permissions
  allowUserInvites    Boolean @default(false) // Membros podem convidar?
  requireApproval     Boolean @default(false) // Owner precisa aprovar joins?

  // ... campos existentes
  title          String?
  description    String?
  visibility     Visibility @default(PRIVATE)

  // Relations
  messages       Message[]
  participants   ConversationParticipant[]
  members        UserConversationMembership[] // NEW

  createdAt      DateTime @default(now())
  updatedAt      DateTime @updatedAt
  lastMessageAt  DateTime?

  @@index([userId])
  @@index([ownerUserId])
  @@index([visibility])
  @@index([isMultiUser])
}

// NEW MODEL
model UserConversationMembership {
  id             String       @id @default(uuid())
  conversationId String
  conversation   Conversation @relation(fields: [conversationId], references: [id], onDelete: Cascade)
  userId         String
  user           User         @relation("ConversationMemberships", fields: [userId], references: [id], onDelete: Cascade)

  // Role
  role           MembershipRole @default(MEMBER)

  // Join metadata
  joinedAt       DateTime     @default(now())
  invitedBy      String?
  inviter        User?        @relation("SentInvites", fields: [invitedBy], references: [id])

  // Permissions
  canWrite       Boolean      @default(true)  // Pode enviar mensagens?
  canInvite      Boolean      @default(false) // Pode convidar outros?
  canModerate    Boolean      @default(false) // Pode kick/mute?

  // Status
  isActive       Boolean      @default(true)  // false = kicked/left

  @@unique([conversationId, userId])
  @@index([userId])
  @@index([conversationId])
  @@index([role])
}

enum MembershipRole {
  OWNER      // Criador, controle total
  MODERATOR  // Pode kick, mute, invite
  MEMBER     // Pode enviar mensagens
  VIEWER     // Read-only (para discovery)
}

// Update User model
model User {
  // ... campos existentes

  // NEW: Multi-user relations
  ownedConversations  Conversation[] @relation("ConversationOwner")
  memberships         UserConversationMembership[] @relation("ConversationMemberships")
  sentInvites         UserConversationMembership[] @relation("SentInvites")
}
```

### Migration Command

```bash
# Criar migration
docker compose exec backend npx prisma migrate dev --name add_multi_user_support

# Apply to production (later)
docker compose exec backend npx prisma migrate deploy
```

### Data Migration Script

Para conversas existentes, criar memberships automaticamente:

```typescript
// backend/scripts/migrate-conversations-to-multiuser.ts
import { prisma } from '../src/config/database';

async function migrateExistingConversations() {
  const conversations = await prisma.conversation.findMany({
    where: { isMultiUser: false }
  });

  for (const conv of conversations) {
    // Criar membership para o owner
    await prisma.userConversationMembership.create({
      data: {
        conversationId: conv.id,
        userId: conv.userId, // userId original
        role: 'OWNER',
        canWrite: true,
        canInvite: true,
        canModerate: true,
        joinedAt: conv.createdAt
      }
    });

    // Atualizar conversa
    await prisma.conversation.update({
      where: { id: conv.id },
      data: {
        ownerUserId: conv.userId,
        isMultiUser: false, // Mantém como single-user por padrão
        maxUsers: 1
      }
    });
  }

  console.log(`Migrated ${conversations.length} conversations`);
}

migrateExistingConversations();
```

---

## Backend Implementation

### 1. MembershipService

```typescript
// backend/src/services/membershipService.ts
import { prisma } from '../config/database';
import { logger } from '../config/logger';
import { MembershipRole } from '../generated/prisma';

export class MembershipService {
  /**
   * Convida usuário para conversa
   */
  async inviteUser(
    conversationId: string,
    invitedUserId: string,
    inviterId: string
  ) {
    // Verificar se inviter tem permissão
    const inviter = await prisma.userConversationMembership.findUnique({
      where: {
        conversationId_userId: { conversationId, userId: inviterId }
      }
    });

    if (!inviter || !inviter.canInvite) {
      throw new Error('You do not have permission to invite users');
    }

    // Verificar limite de usuários
    const conversation = await prisma.conversation.findUnique({
      where: { id: conversationId },
      include: {
        members: { where: { isActive: true } }
      }
    });

    if (!conversation) {
      throw new Error('Conversation not found');
    }

    if (conversation.members.length >= conversation.maxUsers) {
      throw new Error(`Conversation has reached maximum users (${conversation.maxUsers})`);
    }

    // Verificar se já é membro
    const existing = await prisma.userConversationMembership.findUnique({
      where: {
        conversationId_userId: { conversationId, userId: invitedUserId }
      }
    });

    if (existing) {
      if (existing.isActive) {
        throw new Error('User is already a member');
      } else {
        // Reativar membership
        return await prisma.userConversationMembership.update({
          where: { id: existing.id },
          data: { isActive: true, invitedBy: inviterId }
        });
      }
    }

    // Criar membership
    return await prisma.userConversationMembership.create({
      data: {
        conversationId,
        userId: invitedUserId,
        invitedBy: inviterId,
        role: 'MEMBER',
        canWrite: true,
        canInvite: conversation.allowUserInvites,
        canModerate: false
      }
    });
  }

  /**
   * Usuário aceita convite (join conversation)
   */
  async joinConversation(conversationId: string, userId: string) {
    const membership = await prisma.userConversationMembership.findUnique({
      where: {
        conversationId_userId: { conversationId, userId }
      }
    });

    if (!membership) {
      throw new Error('No invitation found');
    }

    if (membership.isActive) {
      throw new Error('Already a member');
    }

    return await prisma.userConversationMembership.update({
      where: { id: membership.id },
      data: { isActive: true }
    });
  }

  /**
   * Sair da conversa
   */
  async leaveConversation(conversationId: string, userId: string) {
    const membership = await prisma.userConversationMembership.findUnique({
      where: {
        conversationId_userId: { conversationId, userId }
      }
    });

    if (!membership) {
      throw new Error('Not a member');
    }

    if (membership.role === 'OWNER') {
      throw new Error('Owner cannot leave. Transfer ownership first.');
    }

    return await prisma.userConversationMembership.update({
      where: { id: membership.id },
      data: { isActive: false }
    });
  }

  /**
   * Kick usuário (requer permissão de moderação)
   */
  async kickUser(
    conversationId: string,
    targetUserId: string,
    moderatorUserId: string
  ) {
    // Verificar permissão do moderator
    const moderator = await prisma.userConversationMembership.findUnique({
      where: {
        conversationId_userId: { conversationId, userId: moderatorUserId }
      }
    });

    if (!moderator || !moderator.canModerate) {
      throw new Error('You do not have permission to kick users');
    }

    // Não pode kick owner
    const target = await prisma.userConversationMembership.findUnique({
      where: {
        conversationId_userId: { conversationId, userId: targetUserId }
      }
    });

    if (!target) {
      throw new Error('User is not a member');
    }

    if (target.role === 'OWNER') {
      throw new Error('Cannot kick the owner');
    }

    return await prisma.userConversationMembership.update({
      where: { id: target.id },
      data: { isActive: false }
    });
  }

  /**
   * Lista membros ativos
   */
  async getActiveMembers(conversationId: string) {
    return await prisma.userConversationMembership.findMany({
      where: {
        conversationId,
        isActive: true
      },
      include: {
        user: {
          select: {
            id: true,
            username: true,
            displayName: true,
            photo: true,
            preferredLanguage: true
          }
        }
      },
      orderBy: [
        { role: 'asc' }, // OWNER first
        { joinedAt: 'asc' }
      ]
    });
  }

  /**
   * Verificar se usuário tem acesso à conversa
   */
  async hasAccess(conversationId: string, userId: string): Promise<boolean> {
    const membership = await prisma.userConversationMembership.findUnique({
      where: {
        conversationId_userId: { conversationId, userId }
      }
    });

    return membership?.isActive || false;
  }
}

export const membershipService = new MembershipService();
```

---

### 2. PresenceService

```typescript
// backend/src/services/presenceService.ts
import { Server as SocketIOServer } from 'socket.io';
import { logger } from '../config/logger';

interface PresenceData {
  userId: string;
  socketId: string;
  conversationId: string;
  joinedAt: Date;
}

export class PresenceService {
  private presence: Map<string, PresenceData[]> = new Map(); // conversationId -> users[]

  /**
   * Usuário entrou na conversa
   */
  userJoined(conversationId: string, userId: string, socketId: string) {
    const conversationUsers = this.presence.get(conversationId) || [];

    // Verificar se já está presente (múltiplas tabs)
    const existing = conversationUsers.find(p => p.userId === userId);
    if (!existing) {
      conversationUsers.push({
        userId,
        socketId,
        conversationId,
        joinedAt: new Date()
      });
      this.presence.set(conversationId, conversationUsers);
      logger.debug({ conversationId, userId }, 'User joined conversation');
    } else {
      // Atualizar socketId (tab reload)
      existing.socketId = socketId;
    }

    return this.getOnlineUsers(conversationId);
  }

  /**
   * Usuário saiu da conversa
   */
  userLeft(conversationId: string, userId: string, socketId: string) {
    const conversationUsers = this.presence.get(conversationId) || [];
    const filtered = conversationUsers.filter(
      p => !(p.userId === userId && p.socketId === socketId)
    );

    if (filtered.length === 0) {
      this.presence.delete(conversationId);
    } else {
      this.presence.set(conversationId, filtered);
    }

    logger.debug({ conversationId, userId }, 'User left conversation');
    return this.getOnlineUsers(conversationId);
  }

  /**
   * Obter usuários online
   */
  getOnlineUsers(conversationId: string): string[] {
    const users = this.presence.get(conversationId) || [];
    return [...new Set(users.map(p => p.userId))]; // Deduplicate
  }

  /**
   * Limpar socket desconectado
   */
  cleanupSocket(socketId: string) {
    for (const [conversationId, users] of this.presence.entries()) {
      const filtered = users.filter(p => p.socketId !== socketId);
      if (filtered.length === 0) {
        this.presence.delete(conversationId);
      } else {
        this.presence.set(conversationId, filtered);
      }
    }
  }

  /**
   * Broadcast typing indicator
   */
  emitTyping(
    io: SocketIOServer,
    conversationId: string,
    userId: string,
    isTyping: boolean
  ) {
    const room = `conversation:${conversationId}`;
    io.to(room).emit(isTyping ? 'user_typing_start' : 'user_typing_stop', {
      conversationId,
      userId
    });
  }

  /**
   * Broadcast presence update
   */
  broadcastPresence(io: SocketIOServer, conversationId: string) {
    const onlineUsers = this.getOnlineUsers(conversationId);
    const room = `conversation:${conversationId}`;

    io.to(room).emit('presence_update', {
      conversationId,
      onlineUsers
    });
  }
}

export const presenceService = new PresenceService();
```

---

### 3. AIOrchestrationService

```typescript
// backend/src/services/aiOrchestrationService.ts
import { Message, ConversationParticipant } from '../generated/prisma';
import { logger } from '../config/logger';

interface OrchestrationContext {
  conversation: {
    id: string;
    isMultiUser: boolean;
    participants: ConversationParticipant[];
  };
  message: Message;
  lastMessages: Message[]; // Last 5 messages
  onlineUsers: string[];
}

export class AIOrchestrationService {
  /**
   * Determina quais assistentes devem responder
   * @returns Array de participantIds que devem responder
   */
  async shouldRespond(context: OrchestrationContext): Promise<string[]> {
    const { conversation, message, lastMessages } = context;

    // Single-user: comportamento antigo (todos os bots respondem)
    if (!conversation.isMultiUser) {
      return conversation.participants
        .filter(p => p.actorType !== 'USER')
        .map(p => p.id);
    }

    // Multi-user: lógica avançada
    const respondingParticipants: string[] = [];

    for (const participant of conversation.participants) {
      if (participant.actorType === 'USER') continue; // Skip users

      const shouldRespond = await this.shouldParticipantRespond(
        participant,
        message,
        lastMessages,
        context
      );

      if (shouldRespond) {
        respondingParticipants.push(participant.id);
      }
    }

    logger.debug({
      conversationId: conversation.id,
      messageId: message.id,
      respondingCount: respondingParticipants.length
    }, 'AI orchestration decision made');

    return respondingParticipants;
  }

  /**
   * Verifica se um participante específico deve responder
   */
  private async shouldParticipantRespond(
    participant: ConversationParticipant,
    message: Message,
    lastMessages: Message[],
    context: OrchestrationContext
  ): Promise<boolean> {
    const characterName = participant.representingCharacter?.firstName ||
                         participant.actingCharacter?.firstName ||
                         participant.actingAssistant?.name ||
                         'Assistant';

    // Regra 1: Mencionado explicitamente (@CharacterName)
    if (this.isMentioned(message.content, characterName)) {
      logger.debug({ characterName, messageId: message.id }, 'Character mentioned');
      return true;
    }

    // Regra 2: Pergunta direta detectada (NLP simples)
    if (this.isDirectQuestion(message.content, characterName)) {
      logger.debug({ characterName, messageId: message.id }, 'Direct question detected');
      return true;
    }

    // Regra 3: Evitar user-to-user conversation interruption
    const last2Messages = lastMessages.slice(-2);
    const isUserToUserConvo = last2Messages.every(m => m.senderType === 'USER');

    if (isUserToUserConvo) {
      logger.debug({ characterName }, 'Skipping user-to-user conversation');
      return false; // Deixar usuários conversarem entre si
    }

    // Regra 4: Responder se foi o último a ser mencionado
    const lastBotMention = this.getLastMentionedCharacter(lastMessages);
    if (lastBotMention === characterName) {
      logger.debug({ characterName }, 'Was last mentioned character');
      return true;
    }

    // Regra 5: Contexto relevante (análise semântica simples)
    // TODO: Implementar NLP avançado com embeddings
    const isContextual = await this.isContextuallyRelevant(
      message.content,
      participant,
      lastMessages
    );

    if (isContextual) {
      logger.debug({ characterName }, 'Contextually relevant');
      return true;
    }

    // Default: não responder (evitar spam de bots)
    return false;
  }

  /**
   * Detecta menções (@CharacterName)
   */
  private isMentioned(content: string, characterName: string): boolean {
    const mentionPattern = new RegExp(`@${characterName}\\b`, 'i');
    return mentionPattern.test(content);
  }

  /**
   * Detecta perguntas diretas (NLP simples)
   */
  private isDirectQuestion(content: string, characterName: string): boolean {
    // Patterns: "CharacterName, what do you think?"
    const directPattern = new RegExp(
      `^${characterName},?\\s|\\s${characterName}[,!?]|^(hey|hi)\\s${characterName}`,
      'i'
    );
    return directPattern.test(content);
  }

  /**
   * Obtém último personagem mencionado
   */
  private getLastMentionedCharacter(messages: Message[]): string | null {
    for (let i = messages.length - 1; i >= 0; i--) {
      const msg = messages[i];
      const match = msg.content.match(/@(\w+)/);
      if (match) {
        return match[1];
      }
    }
    return null;
  }

  /**
   * Análise de relevância contextual
   * TODO: Implementar com embeddings + similarity search
   */
  private async isContextuallyRelevant(
    content: string,
    participant: ConversationParticipant,
    lastMessages: Message[]
  ): Promise<boolean> {
    // Placeholder: implementação futura com vector search
    // Por enquanto, retornar false (conservador)
    return false;
  }
}

export const aiOrchestrationService = new AIOrchestrationService();
```

---

## Frontend Implementation

### 1. MembersList Component

```tsx
// frontend/src/pages/(chat)/shared/components/MembersList.tsx
import React from 'react';
import { useTranslation } from 'react-i18next';
import { Avatar } from '../../../../components/ui/Avatar';
import { Button } from '../../../../components/ui/Button';

interface Member {
  id: string;
  userId: string;
  role: 'OWNER' | 'MODERATOR' | 'MEMBER' | 'VIEWER';
  user: {
    id: string;
    username: string;
    displayName: string;
    photo: string | null;
  };
  canWrite: boolean;
  canInvite: boolean;
}

interface MembersListProps {
  members: Member[];
  onlineUsers: string[];
  currentUserId: string;
  onInviteClick?: () => void;
  onKickUser?: (userId: string) => void;
  canInvite: boolean;
  canModerate: boolean;
}

export function MembersList({
  members,
  onlineUsers,
  currentUserId,
  onInviteClick,
  onKickUser,
  canInvite,
  canModerate
}: MembersListProps) {
  const { t } = useTranslation('chat');

  const getRoleBadge = (role: string) => {
    const badges = {
      OWNER: { label: t('members.roles.owner'), color: 'bg-yellow-500/20 text-yellow-700 dark:text-yellow-300' },
      MODERATOR: { label: t('members.roles.moderator'), color: 'bg-blue-500/20 text-blue-700 dark:text-blue-300' },
      MEMBER: { label: t('members.roles.member'), color: 'bg-gray-500/20 text-gray-700 dark:text-gray-300' },
      VIEWER: { label: t('members.roles.viewer'), color: 'bg-gray-400/20 text-gray-600 dark:text-gray-400' }
    };
    return badges[role as keyof typeof badges] || badges.MEMBER;
  };

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold">
          {t('members.title')} ({members.length})
        </h3>
        {canInvite && onInviteClick && (
          <Button
            variant="light"
            size="small"
            icon="person_add"
            onClick={onInviteClick}
          >
            {t('members.invite')}
          </Button>
        )}
      </div>

      {/* Members list */}
      <div className="space-y-2">
        {members.map((member) => {
          const isOnline = onlineUsers.includes(member.userId);
          const isCurrentUser = member.userId === currentUserId;
          const badge = getRoleBadge(member.role);

          return (
            <div
              key={member.id}
              className="flex items-center justify-between p-3 bg-elevated rounded-lg hover:bg-normal transition-colors"
            >
              <div className="flex items-center gap-3">
                {/* Avatar with online indicator */}
                <div className="relative">
                  <Avatar
                    src={member.user.photo || undefined}
                    alt={member.user.displayName}
                    size="medium"
                  />
                  {isOnline && (
                    <div className="absolute bottom-0 right-0 w-3 h-3 bg-green-500 border-2 border-elevated rounded-full" />
                  )}
                </div>

                {/* User info */}
                <div>
                  <p className="font-medium">
                    {member.user.displayName}
                    {isCurrentUser && (
                      <span className="ml-2 text-xs text-muted">
                        ({t('members.you')})
                      </span>
                    )}
                  </p>
                  <p className="text-sm text-muted">@{member.user.username}</p>
                </div>
              </div>

              <div className="flex items-center gap-2">
                {/* Role badge */}
                <span className={`px-2 py-1 rounded-full text-xs font-medium ${badge.color}`}>
                  {badge.label}
                </span>

                {/* Kick button (only for moderators) */}
                {canModerate && member.role !== 'OWNER' && !isCurrentUser && onKickUser && (
                  <Button
                    variant="ghost"
                    size="small"
                    icon="person_remove"
                    onClick={() => onKickUser(member.userId)}
                    className="text-red-500 hover:bg-red-500/10"
                  >
                    {t('members.kick')}
                  </Button>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
```

---

## Testing Strategy

### Unit Tests

```typescript
// backend/tests/services/membershipService.test.ts
describe('MembershipService', () => {
  it('should invite user successfully', async () => {
    const result = await membershipService.inviteUser(
      'conv-123',
      'user-456',
      'owner-789'
    );
    expect(result.userId).toBe('user-456');
    expect(result.role).toBe('MEMBER');
  });

  it('should reject invite if limit reached', async () => {
    await expect(
      membershipService.inviteUser('full-conv', 'user-new', 'owner')
    ).rejects.toThrow('maximum users');
  });

  it('should prevent non-moderator from kicking users', async () => {
    await expect(
      membershipService.kickUser('conv', 'target', 'regular-user')
    ).rejects.toThrow('permission');
  });
});
```

### Integration Tests

```typescript
// backend/tests/integration/multiUserChat.test.ts
describe('Multi-User Chat Flow', () => {
  it('should handle complete multi-user conversation', async () => {
    // 1. User A creates conversation
    const conv = await createConversation(userA.id, { isMultiUser: true, maxUsers: 2 });

    // 2. User A invites User B
    await membershipService.inviteUser(conv.id, userB.id, userA.id);

    // 3. User B joins
    await membershipService.joinConversation(conv.id, userB.id);

    // 4. User A sends message
    const msgA = await messageService.createMessage({
      conversationId: conv.id,
      senderId: userA.id,
      senderType: 'USER',
      content: 'Hello!'
    });

    // 5. User B sends message
    const msgB = await messageService.createMessage({
      conversationId: conv.id,
      senderId: userB.id,
      senderType: 'USER',
      content: 'Hi there!'
    });

    // 6. Verify both users can see messages
    const messages = await messageService.getConversationMessages(conv.id);
    expect(messages).toHaveLength(2);
  });
});
```

### E2E Tests (Playwright)

```typescript
// tests/e2e/multiUserChat.spec.ts
import { test, expect } from '@playwright/test';

test.describe('Multi-User Chat', () => {
  test('should allow two users to chat together', async ({ context }) => {
    // Create two browser contexts (two users)
    const pageA = await context.newPage();
    const pageB = await context.newPage();

    // User A logs in and creates conversation
    await pageA.goto('/login');
    await pageA.fill('[name="email"]', 'userA@test.com');
    await pageA.click('button:has-text("Login")');
    await pageA.click('button:has-text("New Chat")');
    await pageA.fill('[name="title"]', 'Multi-User Test');
    await pageA.check('[name="isMultiUser"]');
    await pageA.click('button:has-text("Create")');

    // User A invites User B
    await pageA.click('button:has-text("Invite")');
    await pageA.fill('[placeholder="Search users"]', 'userB');
    await pageA.click('[data-user-id="userB"]');
    await pageA.click('button:has-text("Send Invite")');

    // User B accepts invite
    await pageB.goto('/login');
    await pageB.fill('[name="email"]', 'userB@test.com');
    await pageB.click('button:has-text("Login")');
    await pageB.click('[data-notification-type="invite"]');
    await pageB.click('button:has-text("Accept")');

    // User A sends message
    await pageA.fill('[data-testid="message-input"]', 'Hello from User A!');
    await pageA.press('[data-testid="message-input"]', 'Enter');

    // User B sees message
    await expect(pageB.locator('text=Hello from User A!')).toBeVisible();

    // User B responds
    await pageB.fill('[data-testid="message-input"]', 'Hi from User B!');
    await pageB.press('[data-testid="message-input"]', 'Enter');

    // User A sees response
    await expect(pageA.locator('text=Hi from User B!')).toBeVisible();
  });
});
```

---

## Deployment Plan

### Pre-Deployment Checklist

- [ ] All tests passing (unit, integration, E2E)
- [ ] Migration script tested on staging
- [ ] Rollback plan documented
- [ ] Monitoring alerts configured
- [ ] Documentation updated
- [ ] Feature flag ready (if using)

### Deployment Steps

```bash
# 1. Backup production database
pg_dump charhub_db > backup_$(date +%Y%m%d).sql

# 2. Apply migration
docker compose exec backend npx prisma migrate deploy

# 3. Run data migration script
docker compose exec backend npm run migrate:multiuser

# 4. Restart backend
docker compose restart backend

# 5. Verify health
curl https://charhub.app/api/v1/health

# 6. Monitor logs
docker compose logs -f backend | grep "error\|warning"
```

### Rollback Strategy

```bash
# 1. Restore database backup
psql charhub_db < backup_YYYYMMDD.sql

# 2. Revert code
git revert <commit-hash>

# 3. Redeploy
git push origin main

# 4. Notify users
# (via banner/notification system)
```

---

## Documentação Adicional

### API Endpoints (Novos)

```
POST   /api/v1/conversations/:id/invite
POST   /api/v1/conversations/:id/join
POST   /api/v1/conversations/:id/leave
POST   /api/v1/conversations/:id/kick
GET    /api/v1/conversations/:id/members
PATCH  /api/v1/conversations/:id/members/:userId
```

### WebSocket Events (Novos)

```
// Client → Server
join_conversation_multi
leave_conversation_multi
user_typing_start
user_typing_stop

// Server → Client
user_joined
user_left
user_typing_start
user_typing_stop
presence_update
member_kicked
```

---

## Conclusão

Este documento serve como **blueprint completo** para a implementação do Chat Multi-Usuário. A complexidade é alta, mas a arquitetura está bem definida e dividida em fases gerenciáveis.

**Status Atual**: 🚧 Schema changes prontos para começar
**Próximo Passo**: Implementar MembershipService (Fase 1)

---

**Última Atualização**: 2025-11-20
**Autor**: Claude (AI Assistant) + Leandro (Product Owner)
**Branch**: `feature/multi-user-chat`
