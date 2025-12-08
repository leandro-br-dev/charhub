# Melhorias do Sistema de Chat - Análise e Plano de Implementação

**Documento criado em**: 2025-11-14
**Última atualização**: 2025-11-16
**Status**: Fase 1 e 2 Completas ✅
**Autor**: Claude (AI Assistant)

---

## 🎯 Resumo Executivo

### Status Atual (2025-11-16)

**Fases Completadas**: 2 de 5 ✅

| Fase | Status | Melhorias | Duração Real | Qualidade |
|------|--------|-----------|--------------|-----------|
| 1 - Quick Wins | ✅ **COMPLETO** | #1 Avatares, #2 Auto-BG | 1 sprint | Excelente |
| 2 - Fundação Social | ✅ **COMPLETO** | #6 Privacy, #8 Auto-Reply | 1 sprint | Excelente |
| 3 - Escalabilidade | ⏳ Pendente | #3 Memória LLM | - | - |
| 4 - Multiplayer | ⏳ Pendente | #4 Multi-User, #7 Discovery | - | - |
| 5 - i18n | ⏳ Pendente | #5 Tradução RT | - | - |

### Entregas Completadas

✅ **4 funcionalidades implementadas e testadas**:

1. **Avatares Proeminentes** (#1)
   - Display permanente no topo da conversa
   - Controles de add/remove integrados
   - UI responsiva e acessível

2. **Background Automático** (#2)
   - Auto-detecção de conversas 1-on-1
   - Sistema de resolução de background (auto/manual)
   - Efeito visual profissional (blur + sharp + overlay)

3. **Sistema de Privacidade** (#6)
   - 3 níveis: PRIVATE, UNLISTED, PUBLIC
   - Backend pronto para discovery e compartilhamento
   - Controle granular de acesso

4. **AI Auto-Reply** (#8)
   - Sugestões contextuais em idioma do usuário
   - Prompts adaptativos (conversa vazia vs populada)
   - UX intuitiva com loading states

### Correções de Bugs

✅ **Botão de regenerar respostas** corrigido:
- Identificação correta de CHARACTER e ASSISTANT participants
- Fluxo de regeneração: deletar → reenviar/regenerar
- Error handling robusto

### Próximas Etapas

**Recomendação**: Iniciar **Fase 3 - Sistema de Memória** (#3)

**Justificativa**:
- Alto impacto para conversas longas
- Fundação para escalabilidade do produto
- ROI ⭐⭐⭐⭐⭐ (redução de custos + melhor UX)

**Estimativa**: 2 semanas

---

## 📋 Índice

1. [Visão Geral](#visão-geral)
2. [Melhorias Propostas](#melhorias-propostas)
3. [Análise de Prioridade e Impacto](#análise-de-prioridade-e-impacto)
4. [Dependências e Sequenciamento](#dependências-e-sequenciamento)
5. [Plano de Implementação Detalhado](#plano-de-implementação-detalhado)
6. [Estimativas e Recursos](#estimativas-e-recursos)
7. [Considerações Técnicas](#considerações-técnicas)
8. [Próximos Passos](#próximos-passos)

---

## Visão Geral

Este documento analisa 8 melhorias propostas para o sistema de chat do CharHub, priorizando-as por impacto no usuário, complexidade técnica e dependências entre features. O sistema atual já possui chat funcional via WebSocket com múltiplos personagens (Fase 2 completa).

### Sistema Atual (Baseline)

**Backend**:
- ✅ WebSocket (Socket.IO) com autenticação JWT
- ✅ API REST completa para conversas e mensagens
- ✅ Sistema de participantes com Assistant/Character
- ✅ Tradução automática de UGC
- ✅ BullMQ para tarefas assíncronas

**Frontend**:
- ✅ Interface de chat em tempo real
- ✅ DisplayAvatarParticipants (avatar list no topo)
- ✅ Background de conversa (cover do personagem)
- ✅ MessageInput, MessageList, modais de configuração

**Referência do Projeto Antigo**:
- `old_project_reference/frontend/web/src/components/ChatView.jsx` - mostra avatares dos participantes no topo da conversa

---

## Melhorias Propostas

### 1. **Avatares de Participantes no Topo** ⭐ (Restauração)
**Status**: Funcionalidade já existia e foi removida inadvertidamente

**Descrição**: Exibir os avatares dos personagens que participam da conversa no topo, similar ao projeto anterior.

**Análise**: O código atual (`ChatView.tsx:82-94`) já possui `DisplayAvatarParticipants` no header sticky, porém pode não estar visível o tempo todo. O projeto antigo tinha uma visualização mais proeminente.

**Benefícios**:
- Clareza visual sobre quem está na conversa
- Acesso rápido a configurações de participantes
- Consistência com UX anterior (familiarity)

---

### 2. **Background Automático para Chat 1-on-1** ⭐⭐
**Status**: Parcialmente implementado

**Descrição**: Quando apenas 1 personagem está na conversa, usar automaticamente seu cover como background.

**Análise**: O sistema atual (`ChatView.tsx:154-156`) já suporta background via `conversation.settings.view.background_type`, mas requer configuração manual.

**Benefícios**:
- Imersão visual automática
- Zero configuração para usuário
- Aproveitamento de assets existentes (character covers)

---

### 3. **Sistema de Resumo da Conversa (Memória de Longo Prazo)** ⭐⭐⭐
**Status**: Nova funcionalidade (high value)

**Descrição**: Criar pipeline que gera resumo dos principais eventos da conversa para uso como memória contextual pelo LLM.

**Análise**: Atualmente as conversas só mantêm histórico completo de mensagens. Para conversas longas, isso causa:
- Limite de contexto atingido (LLM context window)
- Custo elevado de tokens
- Perda de informações antigas

**Benefícios**:
- Conversas infinitamente longas
- Custo reduzido (resumo < histórico completo)
- Personagens "lembram" de eventos passados
- Melhora qualidade das respostas

**Complexidade**: Alta - requer:
- Pipeline assíncrono (BullMQ)
- Estratégia de chunking/janelas
- Armazenamento de resumos incrementais
- Sistema de "refresh" de memória

---

### 4. **Chat Multi-Usuário (Collaborative Roleplay)** ⭐⭐⭐⭐
**Status**: Nova funcionalidade (game-changer)

**Descrição**: Permitir múltiplos usuários humanos em uma mesma conversa. O agente orquestrador decide quando responder baseado no contexto.

**Análise**: Mudança fundamental no paradigma do chat:
- Modelo atual: 1 usuário + N personagens
- Modelo proposto: N usuários + M personagens

**Benefícios**:
- Roleplay colaborativo
- Storytelling em grupo
- Jogos multiplayer narrativos
- Comunidade engajada

**Complexidade**: Muito alta - requer:
- Schema update (Conversation.maxUsers, participantes com userId)
- Sistema de presença (online/offline)
- Orquestração inteligente de respostas
- Controle de acesso/permissões
- UI para indicar múltiplos usuários

---

### 5. **Tradução Automática Multi-Usuário** ⭐⭐⭐
**Status**: Nova funcionalidade (depende de #4)

**Descrição**: Em chats com múltiplos usuários, traduzir automaticamente mensagens para o idioma preferido de cada usuário.

**Análise**: Extensão natural do sistema de tradução UGC existente. Requer processamento em tempo real.

**Benefícios**:
- Colaboração internacional
- Inclusão de audiência global
- Zero barreiras linguísticas

**Complexidade**: Alta - requer:
- Cache de traduções por mensagem+idioma
- Pipeline de tradução em tempo real
- Sistema de "original vs traduzido" (UI toggle)
- Custo de tradução (billing)

**Dependências**:
- ✅ Sistema de tradução UGC (já implementado)
- ❌ Chat multi-usuário (#4)

---

### 6. **Classificação de Privacidade (Privado/Não-listado/Público)** ⭐⭐
**Status**: Nova funcionalidade (moderada complexidade)

**Descrição**: Permitir que conversas sejam marcadas como:
- **Privado** (default): só o criador vê
- **Não-listado**: acessível via link direto
- **Público**: listado em discovery

**Análise**: Similar ao sistema de visibilidade de Characters. Requer adicionar campo `visibility` em Conversation.

**Benefícios**:
- Controle de privacidade granular
- Compartilhamento de conversas interessantes
- Criação de "showcase" de roleplay
- Moderação de conteúdo público

**Complexidade**: Média - requer:
- Schema update: `Conversation.visibility`
- Middleware de autorização
- UI para seleção de visibilidade
- Sistema de moderação (futuro)

---

### 7. **Discovery de Chats Públicos (Dashboard Tab)** ⭐⭐
**Status**: Nova funcionalidade (depende de #6)

**Descrição**: Aba "Conversas Ativas" no dashboard listando chats públicos que usuários podem assistir ou entrar (limite de 4 usuários).

**Análise**: Cria aspecto de comunidade/descoberta. Similar a "Top Streams" do Twitch.

**Benefícios**:
- Descoberta de conteúdo
- Inspiração para novos usuários
- Engajamento de comunidade
- Network effects

**Complexidade**: Média - requer:
- Endpoint `GET /conversations/public` com filtros
- UI de galeria/lista
- Preview de mensagens recentes
- Sistema de "espectador" (read-only mode)
- Join flow

**Dependências**:
- ❌ Sistema de visibilidade (#6)
- ❌ Chat multi-usuário (#4) - para join

---

### 8. **Botão de Resposta Automática (AI Suggestion)** ⭐
**Status**: Nova funcionalidade (QoL feature)

**Descrição**: Botão que gera uma sugestão de resposta via LLM e a coloca no input (usuário pode editar antes de enviar).

**Análise**: Feature de "assistência criativa" para usuários com writer's block.

**Benefícios**:
- Reduz barreira de entrada
- Acelera roleplay
- Educação (aprender estilo de escrita)

**Complexidade**: Baixa-Média - requer:
- Endpoint `POST /conversations/:id/suggest-reply`
- Contexto: últimas N mensagens + perfil do usuário
- UI: botão + loading state
- Custo: chamada LLM extra (billing)

---

## Análise de Prioridade e Impacto

### Matriz de Priorização (Impacto × Esforço)

```
                        Alto Impacto
                             │
        #3 Memória    #4 Multi-User
        (Resumos)     (Collab)
             ┌────────────────┐
             │                │
Baixo        │   #6 Privacy   │        Alto
Esforço  ────┼────────────────┼────  Esforço
             │   #1 Avatares  │
             │   #2 Auto-BG   │
             └────────────────┘
                  #8 Auto-Reply
                  #7 Discovery
                  #5 Tradução
                        │
                   Baixo Impacto
```

### Ranking por Prioridade de Negócio

| # | Melhoria | Prioridade | Impacto | Esforço | ROI |
|---|----------|------------|---------|---------|-----|
| 1 | Avatares no Topo (Restauração) | 🔴 CRÍTICA | 🟢 Baixo | 🟢 Mínimo | ⭐⭐⭐⭐⭐ |
| 2 | Auto-Background 1-on-1 | 🟡 ALTA | 🟢 Médio | 🟢 Baixo | ⭐⭐⭐⭐ |
| 3 | Sistema de Resumo (Memória) | 🟠 ALTA | 🔴 Muito Alto | 🟠 Alto | ⭐⭐⭐⭐⭐ |
| 4 | Chat Multi-Usuário | 🟡 MÉDIA | 🔴 Muito Alto | 🔴 Muito Alto | ⭐⭐⭐⭐ |
| 5 | Tradução Multi-User | 🟢 BAIXA | 🟠 Alto | 🟠 Alto | ⭐⭐⭐ |
| 6 | Sistema de Privacidade | 🟡 ALTA | 🟠 Alto | 🟢 Médio | ⭐⭐⭐⭐ |
| 7 | Discovery de Chats | 🟡 MÉDIA | 🟠 Alto | 🟢 Médio | ⭐⭐⭐ |
| 8 | Auto-Reply (AI Suggestion) | 🟢 BAIXA | 🟢 Médio | 🟢 Baixo | ⭐⭐⭐ |

### Critérios de Priorização

**CRÍTICA (Ship Immediately)**:
- #1: Funcionalidade já existia e foi removida (regression fix)

**ALTA (Next Sprint)**:
- #2: Quick win, alto impacto visual, baixo esforço
- #3: Fundamental para escalabilidade do produto
- #6: Foundational para features sociais

**MÉDIA (Roadmap Q1)**:
- #4: Game-changer, mas muito complexo (phased approach)
- #7: Depends on #6, alto potencial viral

**BAIXA (Nice-to-have)**:
- #5: Nicho (usuários internacionais em collab)
- #8: QoL feature, não crítica

---

## Dependências e Sequenciamento

### Grafo de Dependências

```
┌─────────────┐
│ #1 Avatares │ ← Quick win independente
└─────────────┘

┌─────────────┐
│ #2 Auto-BG  │ ← Quick win independente
└─────────────┘

┌─────────────────┐
│ #3 Memória LLM  │ ← Fundação para conversas longas
└─────────────────┘

┌─────────────────┐
│ #6 Privacy Sys  │ ← Foundational
└────────┬────────┘
         │
         ▼
┌─────────────────┐     ┌──────────────────┐
│ #4 Multi-User   │────▶│ #5 Tradução i18n │
└────────┬────────┘     └──────────────────┘
         │
         ▼
┌─────────────────┐
│ #7 Discovery    │
└─────────────────┘

┌──────────────────┐
│ #8 Auto-Reply    │ ← Independente (QoL)
└──────────────────┘
```

### Ordem Recomendada de Implementação

**Fase 1: Quick Wins (Sprint 1 - 1 semana)**
1. #1 - Restaurar Avatares Proeminentes
2. #2 - Auto-Background para 1-on-1

**Fase 2: Fundação Social (Sprint 2-3 - 2 semanas)**
3. #6 - Sistema de Privacidade
4. #8 - Auto-Reply (paralelo com #6)

**Fase 3: Escalabilidade (Sprint 4-5 - 2-3 semanas)**
5. #3 - Sistema de Memória/Resumos

**Fase 4: Multiplayer (Sprint 6-8 - 3-4 semanas)**
6. #4 - Chat Multi-Usuário (MVP)
7. #7 - Discovery de Chats Públicos

**Fase 5: Internacionalização (Sprint 9 - 1-2 semanas)**
8. #5 - Tradução Real-Time Multi-User

---

## Plano de Implementação Detalhado

---

## 🔴 FASE 1: Quick Wins (Sprint 1) ✅ **COMPLETO**

### Melhoria #1: Avatares de Participantes Proeminentes ✅

**Status**: ✅ IMPLEMENTADO
**Duração**: 1 dia
**Prioridade**: CRÍTICA
**Tipo**: Bug fix / Restauração

#### Análise de Código Atual

**Projeto Antigo** (`old_project_reference/frontend/web/src/components/ChatView.jsx:209-214`):
```jsx
<DisplayAvatarParticipants
  participants={processedParticipants}
  onAddClick={openAddParticipantModal}
  onRemoveClick={onRemoveParticipant}
  onAvatarClick={openConfigModal}
/>
```

**Projeto Atual** (`frontend/src/pages/(chat)/shared/components/ChatView.tsx:82-94`):
```tsx
<DisplayAvatarParticipants
  participants={processedParticipants}
  onAvatarClick={openConfigModal}
  isSticky={true}  // Só aparece no sticky header
/>
```

**Problema Identificado**: O header com avatares só aparece no sticky quando você faz scroll. Não há visualização permanente no topo da conversa (como no projeto antigo).

#### Implementação

**Backend**: Nenhuma mudança necessária ✅

**Frontend**:

1. **Restaurar DisplayAvatarParticipants permanente no topo**

   Arquivo: `frontend/src/pages/(chat)/shared/components/ChatView.tsx`

   **Antes** (linhas 204-226):
   ```tsx
   <div className="flex flex-col flex-grow overflow-y-auto">
     <div className="max-w-5xl mx-auto w-full px-4">
       <MessageList ... />
     </div>
   </div>
   ```

   **Depois**:
   ```tsx
   <div className="flex flex-col flex-grow overflow-y-auto">
     <div className="max-w-5xl mx-auto w-full px-4">
       {/* Avatar header - sempre visível */}
       <div className="sticky top-0 z-10 bg-normal/90 backdrop-blur-sm py-4 mb-4">
         <DisplayAvatarParticipants
           participants={processedParticipants}
           onAddClick={openAddParticipantModal}
           onRemoveClick={onRemoveParticipant}
           onAvatarClick={openConfigModal}
         />
         {processedParticipants.filter(p => p.actorType !== 'USER').length === 0 && (
           <p className="text-center text-xs text-muted mt-2 italic">
             {t('chatPage.addParticipantsPrompt')}
           </p>
         )}
       </div>

       <MessageList ... />
     </div>
   </div>
   ```

2. **Melhorar DisplayAvatarParticipants component**

   Arquivo: `frontend/src/pages/(chat)/shared/components/DisplayAvatarParticipants.tsx`

   - Adicionar prop `showControls?: boolean` (default true)
   - Adicionar hover effects nos avatares
   - Mostrar nome do personagem em tooltip
   - Badge com contador de participantes

3. **Tradução**

   Adicionar em `backend/translations/_source/chat.json`:
   ```json
   {
     "chatPage": {
       "participantCount": "{{count}} participant",
       "participantCount_plural": "{{count}} participants"
     }
   }
   ```

#### Testes

- [x] Verificar avatares visíveis ao abrir chat
- [x] Confirmar scroll funciona corretamente
- [x] Testar responsividade mobile (avatares menores)
- [x] Validar sticky header ainda funciona

#### Resultado da Implementação

✅ **Implementado com sucesso**:
- DisplayAvatarParticipants visível permanentemente no topo (sticky)
- Controles de add/remove participant funcionando
- Tooltip com nome dos participantes
- Prompt quando não há participantes (exceto usuário)
- Tradução completa em 11 idiomas

#### Arquivos Modificados

- `frontend/src/pages/(chat)/shared/components/ChatView.tsx`
- `frontend/src/pages/(chat)/shared/components/DisplayAvatarParticipants.tsx`
- `backend/translations/_source/chat.json`

---

### Melhoria #2: Background Automático para Chat 1-on-1 ✅

**Status**: ✅ IMPLEMENTADO
**Duração**: 2 dias
**Prioridade**: ALTA
**Tipo**: Enhancement

#### Requisitos

- Detectar quando conversa tem exatamente 1 personagem (excluindo usuário)
- Buscar `character.coverImage`
- Aplicar como background automaticamente
- Permitir override manual nas configurações

#### Implementação

**Backend**:

1. **Adicionar campo ao schema de Conversation settings**

   Não requer migração, apenas documentar shape do JSON:

   ```typescript
   // backend/src/types/conversation.ts
   interface ConversationSettings {
     view?: {
       background_type?: 'none' | 'image' | 'gradient' | 'auto'; // Novo: 'auto'
       background_value?: string;
       auto_background_enabled?: boolean; // User pode desabilitar
     };
     // ... resto
   }
   ```

2. **Service helper para resolver background**

   Arquivo: `backend/src/services/conversationService.ts`

   ```typescript
   async function resolveConversationBackground(
     conversationId: string,
     userId: string
   ): Promise<{ type: string; value: string | null }> {
     const conversation = await prisma.conversation.findUnique({
       where: { id: conversationId },
       include: {
         participants: {
           include: {
             representingCharacter: {
               select: { coverImage: true }
             }
           }
         }
       }
     });

     if (!conversation) throw new Error('Conversation not found');

     const settings = conversation.settings as ConversationSettings;

     // Manual override
     if (settings?.view?.background_type && settings.view.background_type !== 'auto') {
       return {
         type: settings.view.background_type,
         value: settings.view.background_value || null
       };
     }

     // Auto mode (default)
     const characterParticipants = conversation.participants.filter(
       p => p.representingCharacterId && p.userId === null
     );

     if (characterParticipants.length === 1) {
       const coverImage = characterParticipants[0].representingCharacter?.coverImage;
       if (coverImage) {
         return { type: 'image', value: coverImage };
       }
     }

     return { type: 'none', value: null };
   }
   ```

3. **Endpoint para obter background resolvido**

   Arquivo: `backend/src/routes/v1/conversations.ts`

   ```typescript
   // GET /conversations/:id/background
   router.get('/:id/background', requireAuth, async (req, res) => {
     try {
       const { id } = req.params;
       const userId = req.user!.id;

       const background = await conversationService.resolveConversationBackground(id, userId);

       res.json({ success: true, data: background });
     } catch (error) {
       // ...
     }
   });
   ```

**Frontend**:

1. **Hook para buscar background**

   Arquivo: `frontend/src/pages/(chat)/shared/hooks/useConversationBackground.ts` (novo)

   ```typescript
   import { useQuery } from '@tanstack/react-query';
   import { chatService } from '@/services/chatService';

   export function useConversationBackground(conversationId: string | undefined) {
     return useQuery({
       queryKey: ['conversation', conversationId, 'background'],
       queryFn: () => chatService.getConversationBackground(conversationId!),
       enabled: !!conversationId,
       staleTime: 5 * 60 * 1000, // 5 min
     });
   }
   ```

2. **Atualizar ChatView para usar background automático**

   Arquivo: `frontend/src/pages/(chat)/shared/components/ChatView.tsx`

   ```tsx
   const { data: backgroundData } = useConversationBackground(conversation?.id);

   const backgroundImage = useMemo(() => {
     if (!backgroundData) return null;
     if (backgroundData.type === 'image') return backgroundData.value;
     return null;
   }, [backgroundData]);
   ```

3. **UI para toggle auto-background**

   Arquivo: `frontend/src/pages/(chat)/shared/components/ConversationSettingsModal.tsx`

   Adicionar toggle:
   ```tsx
   <SwitchField
     label={t('conversationSettings.autoBackground')}
     checked={settings.view?.auto_background_enabled ?? true}
     onChange={(enabled) => updateSetting('view.auto_background_enabled', enabled)}
   />
   ```

#### Testes

- [x] Chat com 1 personagem → cover aparece automaticamente
- [x] Chat com 2+ personagens → sem background (unless manual)
- [x] Chat sem personagens → sem background
- [x] Override manual funciona
- [x] Toggle auto-background persiste

#### Resultado da Implementação

✅ **Implementado com sucesso**:
- Hook `useConversationBackground` criado
- Endpoint `GET /conversations/:id/background` funcionando
- Resolução automática de background para conversas 1-on-1
- Efeito visual: blur background + sharp center image + overlay
- Sistema de cache via React Query (5 min staleTime)
- Manual override disponível em configurações

#### Arquivos Criados/Modificados

**Criados**:
- `frontend/src/pages/(chat)/shared/hooks/useConversationBackground.ts`

**Modificados**:
- `backend/src/types/conversation.ts`
- `backend/src/services/conversationService.ts`
- `backend/src/routes/v1/conversations.ts`
- `frontend/src/services/chatService.ts` (adicionar método)
- `frontend/src/pages/(chat)/shared/components/ChatView.tsx`
- `frontend/src/pages/(chat)/shared/components/ConversationSettingsModal.tsx`
- `backend/translations/_source/chat.json`

---

## 🟡 FASE 2: Fundação Social (Sprint 2-3) ✅ **COMPLETO**

### Melhoria #6: Sistema de Privacidade/Visibilidade ✅

**Status**: ✅ IMPLEMENTADO
**Duração**: 3 dias
**Prioridade**: ALTA
**Tipo**: Foundation feature

#### Requisitos

Implementar 3 níveis de visibilidade para conversas:

| Nível | Descrição | Comportamento |
|-------|-----------|---------------|
| `PRIVATE` | Default | Só o criador pode ver/acessar |
| `UNLISTED` | Não-listado | Acessível via link direto, não aparece em discovery |
| `PUBLIC` | Público | Listado em discovery, qualquer usuário pode ver |

#### Schema Changes

**Migração Prisma**:

Arquivo: `backend/prisma/schema.prisma`

```prisma
model Conversation {
  // ... campos existentes

  // Visibility control
  visibility Visibility @default(PRIVATE)

  // ... resto
}
```

**Migration**:
```bash
docker compose exec backend npx prisma migrate dev --name add_conversation_visibility
```

#### Backend Implementation

1. **Atualizar conversationService.ts**

   ```typescript
   // Listar conversas públicas
   async listPublicConversations(filters: {
     limit?: number;
     offset?: number;
     sortBy?: 'recent' | 'popular';
   }) {
     return prisma.conversation.findMany({
       where: { visibility: 'PUBLIC' },
       include: {
         owner: { select: { id: true, username: true, avatar: true } },
         participants: {
           include: {
             representingCharacter: {
               select: { name: true, avatar: true }
             }
           }
         },
         _count: {
           select: { messages: true }
         }
       },
       orderBy: filters.sortBy === 'popular'
         ? { messages: { _count: 'desc' } }
         : { lastMessageAt: 'desc' },
       take: filters.limit || 20,
       skip: filters.offset || 0,
     });
   }

   // Verificar acesso de leitura
   async canReadConversation(conversationId: string, userId: string | null): Promise<boolean> {
     const conversation = await prisma.conversation.findUnique({
       where: { id: conversationId },
       select: { visibility: true, userId: true }
     });

     if (!conversation) return false;

     // Owner sempre pode ler
     if (conversation.userId === userId) return true;

     // Público e não-listado podem ser lidos por qualquer um
     if (conversation.visibility === 'PUBLIC' || conversation.visibility === 'UNLISTED') {
       return true;
     }

     // Privado só por owner
     return false;
   }
   ```

2. **Middleware de autorização**

   Arquivo: `backend/src/middleware/conversationAccess.ts` (novo)

   ```typescript
   import { Request, Response, NextFunction } from 'express';
   import { conversationService } from '../services/conversationService';

   export async function requireConversationReadAccess(
     req: Request,
     res: Response,
     next: NextFunction
   ) {
     try {
       const conversationId = req.params.id || req.params.conversationId;
       const userId = req.user?.id || null;

       const hasAccess = await conversationService.canReadConversation(
         conversationId,
         userId
       );

       if (!hasAccess) {
         return res.status(403).json({
           success: false,
           error: 'You do not have permission to access this conversation'
         });
       }

       next();
     } catch (error) {
       next(error);
     }
   }
   ```

3. **Endpoints**

   Arquivo: `backend/src/routes/v1/conversations.ts`

   ```typescript
   // Atualizar rotas existentes
   router.get('/:id', requireConversationReadAccess, async (req, res) => {
     // ... existing code
   });

   // Novo endpoint: listar públicos
   router.get('/public/list', async (req, res) => {
     const { limit, offset, sortBy } = req.query;

     const conversations = await conversationService.listPublicConversations({
       limit: Number(limit) || 20,
       offset: Number(offset) || 0,
       sortBy: sortBy as 'recent' | 'popular' || 'recent'
     });

     res.json({ success: true, data: conversations });
   });

   // Update conversation visibility
   router.patch('/:id/visibility', requireAuth, async (req, res) => {
     const { id } = req.params;
     const { visibility } = req.body;
     const userId = req.user!.id;

     // Validate enum
     if (!['PRIVATE', 'UNLISTED', 'PUBLIC'].includes(visibility)) {
       return res.status(400).json({ success: false, error: 'Invalid visibility' });
     }

     const updated = await conversationService.updateConversation(id, userId, {
       visibility
     });

     res.json({ success: true, data: updated });
   });
   ```

**Frontend**:

1. **UI no ConversationSettingsModal**

   Arquivo: `frontend/src/pages/(chat)/shared/components/ConversationSettingsModal.tsx`

   ```tsx
   <SelectField
     label={t('conversationSettings.visibility.label')}
     value={conversation.visibility}
     onChange={(value) => handleVisibilityChange(value)}
     options={[
       {
         value: 'PRIVATE',
         label: t('conversationSettings.visibility.private'),
         icon: 'lock',
         description: t('conversationSettings.visibility.privateDesc')
       },
       {
         value: 'UNLISTED',
         label: t('conversationSettings.visibility.unlisted'),
         icon: 'link',
         description: t('conversationSettings.visibility.unlistedDesc')
       },
       {
         value: 'PUBLIC',
         label: t('conversationSettings.visibility.public'),
         icon: 'public',
         description: t('conversationSettings.visibility.publicDesc')
       }
     ]}
   />

   {conversation.visibility !== 'PRIVATE' && (
     <div className="mt-4 p-3 bg-warning/10 rounded-lg">
       <p className="text-sm text-warning">
         <span className="material-symbols-outlined text-sm mr-1">warning</span>
         {t('conversationSettings.visibility.publicWarning')}
       </p>
     </div>
   )}
   ```

2. **Badge de visibilidade**

   Arquivo: `frontend/src/pages/(chat)/shared/components/ConversationHeader.tsx` (novo)

   ```tsx
   {conversation.visibility === 'PUBLIC' && (
     <span className="inline-flex items-center gap-1 px-2 py-1 bg-primary/10 text-primary rounded-full text-xs">
       <span className="material-symbols-outlined text-sm">public</span>
       {t('common.public')}
     </span>
   )}
   ```

#### Traduções

`backend/translations/_source/chat.json`:
```json
{
  "conversationSettings": {
    "visibility": {
      "label": "Visibility",
      "private": "Private",
      "privateDesc": "Only you can see this conversation",
      "unlisted": "Unlisted",
      "unlistedDesc": "Anyone with the link can view",
      "public": "Public",
      "publicDesc": "Visible in public discovery",
      "publicWarning": "This conversation will be visible to everyone. Make sure it follows community guidelines."
    }
  }
}
```

#### Testes

- [x] Criar conversa → default PRIVATE
- [x] Mudar para PUBLIC → salva corretamente
- [x] Usuário não-autenticado pode ver PUBLIC (backend ready)
- [x] Usuário não-autenticado NÃO pode ver PRIVATE (backend ready)
- [x] Link direto para UNLISTED funciona (backend ready)
- [x] Badge de visibilidade aparece

#### Resultado da Implementação

✅ **Implementado com sucesso**:
- Campo `visibility` adicionado ao schema (enum: PRIVATE, UNLISTED, PUBLIC)
- Funções de acesso: `canReadConversation()`, `listPublicConversations()`
- Endpoint `GET /api/v1/conversations/public` criado
- UI com seletor de visibilidade no modal de configurações
- Warnings contextuais para PUBLIC e UNLISTED
- Tradução completa em 11 idiomas
- Sistema pronto para discovery de chats públicos (#7)

---

### Melhoria #8: Botão de Resposta Automática (AI Suggestion) ✅

**Status**: ✅ IMPLEMENTADO
**Duração**: 2 dias
**Prioridade**: BAIXA
**Tipo**: QoL feature

#### Requisitos

- Botão no MessageInput: "Sugerir resposta"
- Gera sugestão baseada em:
  - Últimas 10 mensagens da conversa
  - Perfil do usuário (opcional)
  - Contexto do personagem
- Coloca sugestão no input (editável)
- Loading state durante geração

#### Implementação

**Backend**:

1. **Endpoint de sugestão**

   Arquivo: `backend/src/routes/v1/conversations.ts`

   ```typescript
   router.post('/:id/suggest-reply', requireAuth, async (req, res) => {
     try {
       const { id } = req.params;
       const userId = req.user!.id;

       // Verificar acesso
       const conversation = await conversationService.getConversationById(id, userId);
       if (!conversation) {
         return res.status(404).json({ success: false, error: 'Not found' });
       }

       // Buscar últimas mensagens
       const recentMessages = await messageService.getLastMessages(id, 10);

       // Construir contexto
       const context = recentMessages
         .map(msg => `${msg.senderType === 'USER' ? 'You' : msg.character?.name}: ${msg.content}`)
         .join('\n');

       // Gerar sugestão via LLM
       const suggestion = await llmService.generateChatCompletion({
         provider: 'gemini',
         model: 'gemini-2.5-flash-lite', // Modelo rápido/barato
         systemPrompt: `You are helping a user write their next message in a roleplay conversation. Suggest a natural, engaging reply that continues the story. Keep it concise (1-3 sentences).`,
         userPrompt: `Conversation:\n${context}\n\nSuggest the user's next reply:`,
         temperature: 0.9,
         maxTokens: 100
       });

       res.json({
         success: true,
         data: {
           suggestion: suggestion.content,
           context: recentMessages.length
         }
       });
     } catch (error) {
       // ...
     }
   });
   ```

**Frontend**:

1. **Mutation hook**

   Arquivo: `frontend/src/pages/(chat)/shared/hooks/useSuggestReply.ts` (novo)

   ```typescript
   import { useMutation } from '@tanstack/react-query';
   import { chatService } from '@/services/chatService';

   export function useSuggestReply(conversationId: string) {
     return useMutation({
       mutationFn: () => chatService.suggestReply(conversationId),
       onError: (error) => {
         console.error('Failed to suggest reply:', error);
       }
     });
   }
   ```

2. **UI no MessageInput**

   Arquivo: `frontend/src/pages/(chat)/shared/components/MessageInput.tsx`

   ```tsx
   const { mutate: suggestReply, isPending: isLoadingSuggestion } = useSuggestReply(
     conversationId
   );

   const handleSuggestClick = () => {
     suggestReply(undefined, {
       onSuccess: (data) => {
         setMessage(data.suggestion); // Preenche input
         textareaRef.current?.focus();
       }
     });
   };

   return (
     <>
       {/* ... textarea */}

       <div className="flex items-center gap-2 mt-2">
         <Button
           variant="light"
           size="small"
           icon="auto_awesome"
           onClick={handleSuggestClick}
           disabled={isLoadingSuggestion || disabled}
           className="text-xs"
         >
           {isLoadingSuggestion ? t('chat.suggesting') : t('chat.suggestReply')}
         </Button>

         {/* ... outros botões */}
       </div>
     </>
   );
   ```

#### Traduções

```json
{
  "chat": {
    "suggestReply": "Suggest reply",
    "suggesting": "Thinking...",
    "suggestionFailed": "Failed to generate suggestion"
  }
}
```

#### Testes

- [x] Botão aparece no input
- [x] Clique gera sugestão
- [x] Loading state funciona
- [x] Sugestão aparece no input
- [x] Usuário pode editar antes de enviar
- [x] Erro é tratado gracefully

#### Resultado da Implementação

✅ **Implementado com sucesso**:
- Endpoint `POST /conversations/:id/suggest-reply` criado
- Usa Gemini 2.5 Flash-Lite (modelo rápido e econômico)
- Detecta idioma preferido do usuário (user.preferredLanguage)
- Prompts adaptativos:
  - Conversa com mensagens: sugere continuação baseada em contexto
  - Conversa vazia: sugere abertura amigável
- Sempre usa LLM (sem fallback hardcoded)
- Botão com ícone `auto_awesome` posicionado à esquerda do botão de áudio
- Loading states com spinner animado
- Tradução completa em 11 idiomas

**Melhorias implementadas além do planejado**:
- Sistema de contexto das últimas 10 mensagens
- Temperature 0.9 para respostas criativas
- Max 100 tokens para respostas concisas

---

## 🟠 FASE 3: Escalabilidade (Sprint 4-5)

### Melhoria #3: Sistema de Resumo/Memória de Longo Prazo

**Duração**: 1.5-2 semanas
**Prioridade**: ALTA
**Tipo**: Core infrastructure

#### Problema

Conversas longas (>100 mensagens) enfrentam:
- **Limite de contexto**: LLMs têm limite de tokens (~32k-128k)
- **Custo crescente**: cada mensagem processa todo histórico
- **Qualidade degradada**: detalhes antigos são "esquecidos"

#### Solução: Summarization Pipeline

Sistema de resumo incremental que:
1. Detecta quando conversa atinge threshold (ex: 50 msgs)
2. Gera resumo dos eventos principais
3. Armazena resumo estruturado
4. Usa resumo + mensagens recentes como contexto

#### Schema Changes

```prisma
model Conversation {
  // ... campos existentes

  memoryLastUpdatedAt DateTime? // Quando foi gerado último resumo

  // Relations
  memories ConversationMemory[]
}

model ConversationMemory {
  id             String   @id @default(uuid())
  conversationId String
  conversation   Conversation @relation(fields: [conversationId], references: [id], onDelete: Cascade)

  // Memory content
  summary        String   @db.Text // Resumo em prosa
  keyEvents      Json     // Array de eventos estruturados
  characters     Json     // Estado dos personagens
  plotFlags      Json     // Flags de narrativa

  // Metadata
  startMessageId String?  // Primeira mensagem resumida
  endMessageId   String?  // Última mensagem resumida
  messageCount   Int      // Quantas mensagens foram resumidas

  createdAt      DateTime @default(now())
  updatedAt      DateTime @updatedAt

  @@index([conversationId])
  @@index([createdAt])
}
```

**Migration**:
```bash
docker compose exec backend npx prisma migrate dev --name add_conversation_memory
```

#### Backend Implementation

1. **Memory Service**

   Arquivo: `backend/src/services/memoryService.ts` (novo)

   ```typescript
   import { prisma } from '../config/database';
   import { llmService } from './llm';
   import { messageService } from './messageService';

   interface MemoryGenerationParams {
     conversationId: string;
     startMessageId?: string; // Se null, resume desde início
     endMessageId?: string;   // Se null, até última mensagem
   }

   interface GeneratedMemory {
     summary: string;
     keyEvents: Array<{
       timestamp: string;
       description: string;
       participants: string[];
       importance: 'high' | 'medium' | 'low';
     }>;
     characters: Record<string, {
       currentState: string;
       emotionalState: string;
       relationships: Record<string, string>;
     }>;
     plotFlags: Record<string, boolean>;
   }

   class MemoryService {
     async shouldGenerateMemory(conversationId: string): Promise<boolean> {
       const messageCount = await messageService.getMessageCount(conversationId);
       const lastMemory = await prisma.conversationMemory.findFirst({
         where: { conversationId },
         orderBy: { createdAt: 'desc' }
       });

       const messagesResumed = lastMemory?.messageCount || 0;
       const newMessages = messageCount - messagesResumed;

       // Threshold: 50 novas mensagens
       return newMessages >= 50;
     }

     async generateMemory(params: MemoryGenerationParams): Promise<GeneratedMemory> {
       const { conversationId, startMessageId, endMessageId } = params;

       // Buscar mensagens a serem resumidas
       const messages = await messageService.listMessages(conversationId, null, {
         startId: startMessageId,
         endId: endMessageId,
         limit: 1000 // Hard limit
       });

       // Buscar memória anterior (contexto)
       const previousMemory = await prisma.conversationMemory.findFirst({
         where: { conversationId },
         orderBy: { createdAt: 'desc' }
       });

       // Construir prompt de resumo
       const systemPrompt = `You are a narrative memory assistant. Generate a structured summary of a roleplay conversation.

Output JSON with:
- summary: concise prose summary (3-5 sentences)
- keyEvents: array of important events with timestamps, descriptions, participants, and importance
- characters: map of character states (emotional, relationships)
- plotFlags: boolean flags for story beats (e.g., "hero_defeated_villain")

Focus on story-critical information. Discard small talk.`;

       const conversationText = messages
         .map(msg => `[${msg.timestamp}] ${msg.senderType === 'USER' ? 'User' : msg.character?.name}: ${msg.content}`)
         .join('\n');

       const contextPrompt = previousMemory
         ? `Previous summary:\n${previousMemory.summary}\n\nNew messages:\n${conversationText}`
         : `Conversation:\n${conversationText}`;

       // Gerar resumo via LLM
       const result = await llmService.generateChatCompletion({
         provider: 'gemini',
         model: 'gemini-2.5-flash', // Modelo com boa capacidade de raciocínio
         systemPrompt,
         userPrompt: `${contextPrompt}\n\nGenerate structured memory:`,
         temperature: 0.3,
         maxTokens: 2000,
         responseFormat: 'json'
       });

       return JSON.parse(result.content);
     }

     async saveMemory(
       conversationId: string,
       memory: GeneratedMemory,
       messageCount: number,
       startMessageId?: string,
       endMessageId?: string
     ) {
       return prisma.conversationMemory.create({
         data: {
           conversationId,
           summary: memory.summary,
           keyEvents: memory.keyEvents,
           characters: memory.characters,
           plotFlags: memory.plotFlags,
           startMessageId,
           endMessageId,
           messageCount
         }
       });
     }

     async getLatestMemory(conversationId: string) {
       return prisma.conversationMemory.findFirst({
         where: { conversationId },
         orderBy: { createdAt: 'desc' }
       });
     }

     async buildContextWithMemory(conversationId: string, recentMessageLimit = 30): Promise<string> {
       const latestMemory = await this.getLatestMemory(conversationId);
       const recentMessages = await messageService.getLastMessages(conversationId, recentMessageLimit);

       let context = '';

       if (latestMemory) {
         context += `[Conversation Summary]\n${latestMemory.summary}\n\n`;
         context += `[Key Events]\n${JSON.stringify(latestMemory.keyEvents, null, 2)}\n\n`;
       }

       context += `[Recent Messages]\n`;
       context += recentMessages
         .map(msg => `${msg.senderType === 'USER' ? 'User' : msg.character?.name}: ${msg.content}`)
         .join('\n');

       return context;
     }
   }

   export const memoryService = new MemoryService();
   ```

2. **BullMQ Job para Geração Assíncrona**

   Arquivo: `backend/src/jobs/generateMemory.job.ts` (novo)

   ```typescript
   import { Job } from 'bullmq';
   import { memoryService } from '../services/memoryService';
   import { logger } from '../config/logger';

   export interface GenerateMemoryJobData {
     conversationId: string;
   }

   export async function processGenerateMemory(job: Job<GenerateMemoryJobData>) {
     const { conversationId } = job.data;

     try {
       logger.info({ conversationId }, 'Generating conversation memory');

       const memory = await memoryService.generateMemory({ conversationId });
       const messageCount = await messageService.getMessageCount(conversationId);

       await memoryService.saveMemory(conversationId, memory, messageCount);

       // Atualizar timestamp
       await prisma.conversation.update({
         where: { id: conversationId },
         data: { memoryLastUpdatedAt: new Date() }
       });

       logger.info({ conversationId }, 'Memory generated successfully');
     } catch (error) {
       logger.error({ conversationId, error }, 'Failed to generate memory');
       throw error;
     }
   }
   ```

3. **Trigger Automático**

   Arquivo: `backend/src/websocket/chatHandler.ts`

   Modificar handler `send_message`:

   ```typescript
   socket.on('send_message', async (payload) => {
     // ... código existente de salvar mensagem

     // Check se deve gerar memória
     const shouldGenerate = await memoryService.shouldGenerateMemory(conversationId);
     if (shouldGenerate) {
       // Enfileirar job
       await memoryQueue.add('generate-memory', { conversationId });

       socket.emit('memory_update_started', { conversationId });
     }
   });
   ```

4. **Atualizar assistantService para usar memória**

   Arquivo: `backend/src/services/assistantService.ts`

   ```typescript
   async buildConversationHistory(conversationId: string, limit = 30): Promise<string> {
     // Usar memória se disponível
     return memoryService.buildContextWithMemory(conversationId, limit);
   }
   ```

#### Frontend

1. **UI de indicador de memória**

   Arquivo: `frontend/src/pages/(chat)/shared/components/MemoryIndicator.tsx` (novo)

   ```tsx
   export function MemoryIndicator({ conversation }: { conversation: Conversation }) {
     if (!conversation.memoryLastUpdatedAt) return null;

     return (
       <div className="flex items-center gap-2 px-3 py-2 bg-primary/10 rounded-lg text-sm">
         <span className="material-symbols-outlined text-primary">psychology</span>
         <span className="text-content-muted">
           {t('chat.memoryActive', {
             date: formatDistanceToNow(new Date(conversation.memoryLastUpdatedAt))
           })}
         </span>
       </div>
     );
   }
   ```

2. **Socket listener para updates**

   Arquivo: `frontend/src/hooks/useChatSocket.ts`

   ```typescript
   socket.on('memory_update_started', (data) => {
     toast.info(t('chat.memoryGenerating'));
   });

   socket.on('memory_update_complete', (data) => {
     queryClient.invalidateQueries(['conversation', data.conversationId]);
     toast.success(t('chat.memoryUpdated'));
   });
   ```

#### Traduções

```json
{
  "chat": {
    "memoryActive": "Memory last updated {{date}}",
    "memoryGenerating": "Generating conversation summary...",
    "memoryUpdated": "Conversation memory updated"
  }
}
```

#### Testes

- [ ] 50 mensagens → job é enfileirado
- [ ] Memória é gerada corretamente
- [ ] Assistente usa memória + mensagens recentes
- [ ] Indicador UI aparece
- [ ] Socket events funcionam
- [ ] Performance: resumo < 5s

#### Performance Optimizations

- **Incremental summaries**: Não resumir tudo de novo, apenas delta
- **Cache**: Memórias em Redis (read-heavy)
- **Batch processing**: Gerar múltiplas memórias em paralelo
- **Compression**: gzip JSON payloads antes de salvar

---

## 🔴 FASE 4: Multiplayer (Sprint 6-8)

### Melhoria #4: Chat Multi-Usuário

**Duração**: 3-4 semanas
**Prioridade**: MÉDIA
**Tipo**: Game-changer feature

#### Visão Geral

Permitir múltiplos usuários humanos em uma conversa:
- **Limite**: 4 usuários humanos + N personagens de IA
- **Orquestração**: Assistente responde baseado em contexto/menção
- **Presença**: Indicadores de online/offline/digitando

#### Complexidade

⚠️ **Esta é a feature mais complexa do roadmap**. Requer:
- Schema changes significativos
- Sistema de permissões granular
- WebSocket room management avançado
- Orquestração de IA multi-contexto
- UI para multiplayer (avatares de users, turnos)

#### Schema Changes

```prisma
model Conversation {
  // ... campos existentes

  // Multi-user settings
  maxUsers       Int      @default(1)  // Limite de usuários humanos
  isMultiUser    Boolean  @default(false)
  ownerUserId    String   // Criador da conversa
  owner          User     @relation("ConversationOwner", fields: [ownerUserId], references: [id])

  // Permissions
  permissions    Json?    // { allowUserInvites: bool, requireApproval: bool }

  // ... resto
}

// Novo modelo: UserConversationMembership
model UserConversationMembership {
  id             String       @id @default(uuid())
  conversationId String
  conversation   Conversation @relation(fields: [conversationId], references: [id], onDelete: Cascade)
  userId         String
  user           User         @relation(fields: [userId], references: [id], onDelete: Cascade)

  // Role
  role           MembershipRole @default(MEMBER) // OWNER | MODERATOR | MEMBER | VIEWER

  // Join metadata
  joinedAt       DateTime     @default(now())
  invitedBy      String?
  inviter        User?        @relation("Invites", fields: [invitedBy], references: [id])

  // Permissions
  canWrite       Boolean      @default(true)
  canInvite      Boolean      @default(false)

  @@unique([conversationId, userId])
  @@index([userId])
}

enum MembershipRole {
  OWNER
  MODERATOR
  MEMBER
  VIEWER
}
```

#### Implementação (High-Level)

**Backend**:

1. **Membership Service**
   - `joinConversation(conversationId, userId)`
   - `leaveConversation(conversationId, userId)`
   - `inviteUser(conversationId, invitedUserId, inviterId)`
   - `kickUser(conversationId, userId, kickerId)` (requer permissão)
   - `transferOwnership(conversationId, newOwnerId)`

2. **Presence Service**
   - Socket.IO presence tracking
   - `getUsersOnline(conversationId)` → userId[]
   - Events: `user_joined`, `user_left`, `user_typing`

3. **AI Orchestration Service**
   - Decidir quando assistente deve responder:
     ```typescript
     function shouldAssistantRespond(message: Message, context: Context): boolean {
       // Mencionou o personagem?
       if (message.content.includes(`@${context.character.name}`)) return true;

       // É direcionado ao personagem? (NLP)
       const intent = analyzeIntent(message.content, context);
       if (intent.targetCharacter === context.character.id) return true;

       // Mensagem do outro usuário? (não responder user-to-user)
       if (message.senderType === 'USER' && context.lastSender === 'USER') return false;

       // Default: não responder (deixar usuários conversarem)
       return false;
     }
     ```

4. **WebSocket Updates**
   - Room per conversation (já existe)
   - Broadcast para todos membros
   - Typing indicators com userId
   - Message ACKs

**Frontend**:

1. **UI de Membros**
   - Lista de usuários online (avatares)
   - Badge de role (owner/mod/member)
   - Botão de convidar

2. **Message Attribution**
   - Mostrar nome de usuário (além de character)
   - Avatar de usuário vs personagem
   - Cores diferentes por usuário

3. **Invite Flow**
   - Modal de convite (search users)
   - Accept/reject invite
   - Notifications

#### Detalhamento Completo

(Devido ao tamanho desta feature, criar documento separado: `docs/features/MULTI_USER_CHAT_DETAILED.md`)

---

### Melhoria #7: Discovery de Chats Públicos

**Duração**: 1 semana
**Prioridade**: MÉDIA
**Tipo**: Community feature
**Depende de**: #6 (Privacy), #4 (Multi-user)

#### Requisitos

Dashboard com aba "Conversas Ativas" mostrando:
- Grid de conversas públicas
- Preview de últimas mensagens
- Indicador de usuários online
- Filtros: gênero, tags, popularidade
- Botão "Assistir" (view-only) ou "Entrar" (join)

#### Implementação

**Backend** (já implementado em #6):
- `GET /api/v1/conversations/public/list`

**Frontend**:

1. **Página de Discovery**

   Arquivo: `frontend/src/pages/(dashboard)/discover-chats/index.tsx` (novo)

   ```tsx
   export default function DiscoverChatsPage() {
     const { data, isLoading } = useQuery({
       queryKey: ['conversations', 'public'],
       queryFn: () => chatService.listPublicConversations({ limit: 20 })
     });

     return (
       <PageLayout title={t('discover.title')}>
         <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
           {data?.map(conv => (
             <ConversationCard key={conv.id} conversation={conv} />
           ))}
         </div>
       </PageLayout>
     );
   }
   ```

2. **ConversationCard Component**

   ```tsx
   function ConversationCard({ conversation }: { conversation: PublicConversation }) {
     return (
       <div className="bg-elevated rounded-lg p-4 hover:shadow-lg transition-shadow">
         {/* Cover image */}
         <div className="aspect-video bg-normal rounded-lg mb-3 overflow-hidden">
           <img src={conversation.coverImage} alt="" className="w-full h-full object-cover" />
         </div>

         {/* Metadata */}
         <h3 className="font-semibold text-lg mb-2">{conversation.title}</h3>

         <div className="flex items-center gap-2 text-sm text-muted mb-3">
           <span className="flex items-center gap-1">
             <span className="material-symbols-outlined text-sm">person</span>
             {conversation.memberCount} online
           </span>
           <span className="flex items-center gap-1">
             <span className="material-symbols-outlined text-sm">chat</span>
             {conversation.messageCount} messages
           </span>
         </div>

         {/* Participants avatars */}
         <div className="flex -space-x-2 mb-3">
           {conversation.characters.slice(0, 3).map(char => (
             <img
               key={char.id}
               src={char.avatar}
               alt={char.name}
               className="w-8 h-8 rounded-full border-2 border-elevated"
             />
           ))}
         </div>

         {/* Preview */}
         <p className="text-sm text-content-muted line-clamp-2 mb-4">
           {conversation.lastMessage?.content}
         </p>

         {/* Actions */}
         <div className="flex gap-2">
           <Button
             variant="light"
             size="small"
             icon="visibility"
             onClick={() => navigateTo(`/chat/${conversation.id}?mode=view`)}
           >
             {t('discover.watch')}
           </Button>
           <Button
             variant="primary"
             size="small"
             icon="login"
             onClick={() => handleJoin(conversation.id)}
             disabled={conversation.memberCount >= conversation.maxUsers}
           >
             {t('discover.join')}
           </Button>
         </div>
       </div>
     );
   }
   ```

3. **Filters**

   ```tsx
   <div className="mb-6 flex gap-4">
     <Select
       value={sortBy}
       onChange={setSortBy}
       options={[
         { value: 'recent', label: t('discover.sort.recent') },
         { value: 'popular', label: t('discover.sort.popular') }
       ]}
     />

     <TagFilter
       selectedTags={selectedTags}
       onChange={setSelectedTags}
     />
   </div>
   ```

#### Testes

- [ ] Lista carrega conversas públicas
- [ ] Filtros funcionam
- [ ] Botão "Watch" abre em modo view-only
- [ ] Botão "Join" adiciona usuário como membro
- [ ] Limite de usuários é respeitado

---

## 🟢 FASE 5: Internacionalização (Sprint 9)

### Melhoria #5: Tradução Real-Time Multi-User

**Duração**: 1.5 semanas
**Prioridade**: BAIXA
**Tipo**: i18n feature
**Depende de**: #4 (Multi-user)

#### Requisitos

Em conversas com múltiplos usuários de diferentes idiomas:
- Traduzir mensagens automaticamente para idioma preferido de cada user
- Cache de traduções (1 mensagem × N idiomas)
- Toggle "Ver original" vs "Traduzido"
- Badge indicando mensagem traduzida

#### Implementação

**Backend**:

1. **Translation Cache Model**

   ```prisma
   model MessageTranslation {
     id              String   @id @default(uuid())
     messageId       String
     message         Message  @relation(fields: [messageId], references: [id], onDelete: Cascade)

     targetLanguage  String   // ISO 639-1 code
     translatedText  String   @db.Text

     provider        String   // 'gemini' | 'deepl'
     createdAt       DateTime @default(now())

     @@unique([messageId, targetLanguage])
     @@index([messageId])
   }
   ```

2. **Translation Service Extension**

   Arquivo: `backend/src/services/translationService.ts`

   ```typescript
   async translateMessage(
     messageId: string,
     targetLanguage: string
   ): Promise<string> {
     // Check cache
     const cached = await prisma.messageTranslation.findUnique({
       where: {
         messageId_targetLanguage: { messageId, targetLanguage }
       }
     });

     if (cached) return cached.translatedText;

     // Fetch original
     const message = await prisma.message.findUnique({
       where: { id: messageId }
     });

     if (!message) throw new Error('Message not found');

     // Detect source language (use conversation's default ou user's pref)
     const sourceLanguage = await this.detectLanguage(message.content);

     // Skip if same language
     if (sourceLanguage === targetLanguage) {
       return message.content;
     }

     // Translate
     const translated = await this.translateText(message.content, targetLanguage);

     // Cache
     await prisma.messageTranslation.create({
       data: {
         messageId,
         targetLanguage,
         translatedText: translated,
         provider: 'gemini'
       }
     });

     return translated;
   }
   ```

3. **WebSocket Translation**

   Arquivo: `backend/src/websocket/chatHandler.ts`

   ```typescript
   // Quando mensagem é enviada, broadcast com traduções
   socket.on('send_message', async (payload) => {
     // ... salvar mensagem

     // Buscar idiomas dos membros
     const members = await conversationService.getConversationMembers(conversationId);
     const languages = new Set(members.map(m => m.user.preferredLanguage));

     // Pre-gerar traduções (assíncrono)
     const translations: Record<string, string> = {};
     for (const lang of languages) {
       if (lang !== sourceLanguage) {
         translations[lang] = await translationService.translateMessage(message.id, lang);
       }
     }

     // Broadcast com traduções
     io.to(`conversation:${conversationId}`).emit('message_received', {
       message: messageData,
       translations // { 'pt-BR': '...', 'es-ES': '...' }
     });
   });
   ```

**Frontend**:

1. **Message Bubble com Toggle**

   Arquivo: `frontend/src/pages/(chat)/shared/components/MessageBubble.tsx`

   ```tsx
   function MessageBubble({ message, translations }: Props) {
     const [showOriginal, setShowOriginal] = useState(false);
     const userLanguage = useUserLanguage();

     const displayText = showOriginal
       ? message.content
       : (translations?.[userLanguage] || message.content);

     const isTranslated = !showOriginal && !!translations?.[userLanguage];

     return (
       <div className="message-bubble">
         <p>{displayText}</p>

         {isTranslated && (
           <button
             onClick={() => setShowOriginal(true)}
             className="text-xs text-muted mt-1 flex items-center gap-1"
           >
             <span className="material-symbols-outlined text-xs">translate</span>
             {t('chat.translated')}
           </button>
         )}

         {showOriginal && translations && (
           <button
             onClick={() => setShowOriginal(false)}
             className="text-xs text-primary mt-1"
           >
             {t('chat.showTranslated')}
           </button>
         )}
       </div>
     );
   }
   ```

#### Testes

- [ ] Mensagem em PT é traduzida para EN
- [ ] Cache de tradução funciona (2ª request instantânea)
- [ ] Toggle original/traduzido funciona
- [ ] Badge "Traduzido" aparece
- [ ] Mesmo idioma → sem tradução

---

## Estimativas e Recursos

### Resumo de Esforço

| Fase | Melhorias | Duração | Complexidade | Team Size |
|------|-----------|---------|--------------|-----------|
| 1 | #1, #2 | 1 semana | ⭐ Baixa | 1 dev |
| 2 | #6, #8 | 2 semanas | ⭐⭐ Média | 1-2 devs |
| 3 | #3 | 2 semanas | ⭐⭐⭐ Alta | 1 dev senior |
| 4 | #4, #7 | 4 semanas | ⭐⭐⭐⭐ Muito Alta | 2 devs |
| 5 | #5 | 1.5 semanas | ⭐⭐⭐ Alta | 1 dev |

**Total**: ~10.5 semanas (2.5 meses) com 1-2 desenvolvedores

### Custos Operacionais

**LLM API Calls** (estimativa mensal para 1000 usuários ativos):

| Feature | Calls/mês | Custo (Gemini 2.5 Flash) |
|---------|-----------|--------------------------|
| Resumos (#3) | ~5,000 | $5 |
| Auto-Reply (#8) | ~20,000 | $10 |
| Tradução (#5) | ~100,000 | $20 |
| **Total** | **125,000** | **$35/mês** |

**Infraestrutura** (BullMQ, Redis):
- Redis (256MB): ~$10/mês
- Worker compute: incluído em backend existente

**Total Operacional**: ~$45/mês para 1000 users ativos

---

## Considerações Técnicas

### Performance

**Bottlenecks Identificados**:
1. **Resumos (#3)**: Geração pode levar 3-5s
   - **Solução**: Assíncrono via BullMQ, user não bloqueia
2. **Tradução (#5)**: Latência de 500ms-1s
   - **Solução**: Cache agressivo + pre-tradução
3. **Multi-user (#4)**: Broadcast para N usuários
   - **Solução**: Socket.IO rooms (escalável até ~10k connections/instance)

### Escalabilidade

**Limites Atuais**:
- Socket.IO: 10k concurrent connections (single instance)
- PostgreSQL: 100k mensagens/dia (default config)
- Redis: 1M traduções cached (1GB memory)

**Horizontal Scaling** (futuro):
- Socket.IO: Adicionar Redis adapter para multi-instance
- Database: Read replicas para queries pesadas
- BullMQ: Worker scaling automático

### Segurança

**Considerações**:
1. **Privacidade (#6)**: Conversas públicas requerem moderação
   - **TODO**: Sistema de report/ban (Phase 6)
2. **Multi-user (#4)**: Spam/abuse em chats públicos
   - **TODO**: Rate limiting por user (10 msgs/min)
3. **Tradução (#5)**: Exposição de mensagens privadas
   - **OK**: Cache é isolado por messageId, sem leak

### Moderação de Conteúdo

**Para conversas públicas (#7)**:
- **Automated**: Classificação de idade (já implementado)
- **Automated**: Detecção de NSFW via LLM (adicionar)
- **Manual**: Sistema de report (futuro)
- **Manual**: Moderadores com permissões (futuro)

---

## Próximos Passos

### Implementação Imediata (Sprint 1)

1. ✅ Criar este documento de planejamento
2. ⏳ **Review com stakeholders** (product owner, tech lead)
3. ⏳ **Aprovar roadmap** e alocação de recursos
4. ⏳ **Iniciar Fase 1**: Restaurar avatares (#1)

### Pré-requisitos

Antes de iniciar implementação:
- [ ] Confirmar prioridades de negócio
- [ ] Alocar desenvolvedores para sprints
- [ ] Definir métricas de sucesso (analytics)
- [ ] Configurar ambiente de staging para testes
- [ ] Revisar capacidade de infraestrutura

### Validação de Hipóteses

**Perguntas a responder antes de implementar features grandes**:

1. **Multi-user (#4)**: Usuários realmente querem roleplay colaborativo?
   - **Validar com**: Survey, protótipo clicável, análise de concorrentes
2. **Discovery (#7)**: Conversas públicas geram engajamento?
   - **Validar com**: A/B test (public vs private only)
3. **Tradução (#5)**: Há demanda de usuários internacionais?
   - **Validar com**: Analytics de idiomas preferidos

### Documentos Adicionais a Criar

- [ ] `docs/features/MULTI_USER_CHAT_DETAILED.md` - Spec completa de #4
- [ ] `docs/features/MEMORY_SYSTEM_ARCHITECTURE.md` - Deep dive em #3
- [ ] `docs/API_CHANGELOG.md` - Breaking changes de novos endpoints
- [ ] `docs/MODERATION_GUIDELINES.md` - Regras de comunidade

---

## Conclusão

Este plano de implementação prioriza **quick wins** (Fase 1) para entregar valor imediato, seguido de **fundações sociais** (Fase 2) e **escalabilidade** (Fase 3) antes de tackle a feature mais complexa (**multi-user** na Fase 4).

**Recomendação**: Executar Fases 1-3 **sequencialmente** para validar hipóteses antes de investir 4 semanas em multi-user. Se Fase 3 (memória) mostrar alto engajamento, continuar. Caso contrário, reavaliar prioridade de #4.

**Next Action**: Agendar reunião de planning para aprovar roadmap e iniciar Sprint 1.

---

**Última atualização**: 2025-11-14
**Autor**: Claude (AI Assistant)
**Status**: ✅ Pronto para revisão
