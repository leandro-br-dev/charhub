# Sistema de Formatação Visual para Mensagens de Roleplay

**Data**: 2025-12-24
**Status**: 📋 Active
**Prioridade**: Média-Alta
**Estimativa**: 2-3 semanas
**Assigned to**: Agent Coder

---

## 📊 Status de Implementação

### Progresso Geral
- [x] Planning complete
- [x] Research on roleplay formatting standards
- [x] Backend implementation (prompt updates)
- [x] Frontend implementation (message parser + styling)
- [ ] Testing
- [x] Documentation
- [ ] Ready for PR

### Completed
- [x] Read architecture docs and existing codebase
- [x] Create `frontend/src/utils/messageParser.ts` with roleplay parsing logic
- [x] Create `frontend/src/components/ui/FormattedMessage.tsx` component
- [x] Add CSS styles to `frontend/src/index.css` for all formatting types
- [x] Create `backend/src/agents/style-guides/roleplayFormattingGuide.ts`
- [x] Update `backend/src/agents/style-guides/index.ts` to include new guide
- [x] Verify TypeScript compilation for both frontend and backend

### In Progress
- [ ] Write unit tests for message parser
- [ ] Local testing with Docker

### Pending
- [ ] Integrate FormattedMessage into existing chat UI components
- [ ] End-to-end testing with real conversations
- [ ] Create pull request

### Bloqueios
- Nenhum

---

## Índice

1. [Visão Geral](#visão-geral)
2. [Contexto e Motivação](#contexto-e-motivação)
3. [Padrões de Formatação Roleplay](#padrões-de-formatação-roleplay)
4. [Objetivos](#objetivos)
5. [Arquitetura da Solução](#arquitetura-da-solução)
6. [Implementação Técnica](#implementação-técnica)
7. [Frontend](#frontend)
8. [Backend](#backend)
9. [Fluxos de Usuário](#fluxos-de-usuário)
10. [Regras de Negócio](#regras-de-negócio)
11. [Testes](#testes)
12. [Roadmap de Implementação](#roadmap-de-implementação)

---

## Visão Geral

Implementar um sistema de formatação visual que interprete e exiba corretamente os padrões de escrita comuns em chats de roleplay e IA, incluindo ações, falas, pensamentos, e outros elementos narrativos.

### Características Principais

- ✅ **Parser de Mensagens**: Detectar e separar diferentes tipos de conteúdo em mensagens
- ✅ **Estilos Visuais Diferenciados**: Aplicar formatação visual distinta para cada tipo
- ✅ **Suporte Bidirecional**: Funcionar tanto para mensagens do usuário quanto do bot
- ✅ **Prompts Atualizados**: Agentes treinados para usar e interpretar os padrões
- ✅ **Retrocompatibilidade**: Mensagens antigas continuam funcionando
- ✅ **Markdown Support**: Integrar com formatação markdown existente

---

## Contexto e Motivação

### Problemas Atuais

```
❌ Interface não interpreta padrões de roleplay
   └─ Usuários usam *asteriscos* mas não há destaque visual
   └─ Difícil distinguir ações de falas
   └─ Experiência de leitura inferior a plataformas especializadas

❌ Agentes não são treinados para padrões consistentes
   └─ Alguns bots usam formatação, outros não
   └─ Falta de padronização nas respostas
   └─ Usuários não sabem como formatar corretamente

❌ Limitação criativa
   └─ Sem suporte para pensamentos, sussurros, etc.
   └─ Narrativa fica plana e sem profundidade
   └─ Perde contexto emocional e descritivo
```

### Por que essa feature é importante?

1. **Imersão**: Formatação visual melhora a experiência de roleplay
2. **Clareza**: Facilita distinção entre ações, falas e pensamentos
3. **Criatividade**: Permite narrativas mais ricas e expressivas
4. **Competitividade**: Padrão em plataformas como Character.AI, Janitor.AI
5. **Acessibilidade**: Facilita leitura e compreensão do contexto

---

## Padrões de Formatação Roleplay

### Pesquisa e Referências

Com base em pesquisas sobre padrões de 2025 em plataformas de IA roleplay:

#### 1. **Ações / Narração** - `*asteriscos*`

**Padrão**: `*Andou pelo quarto e abriu a janela*`

**Uso**: Descrever ações físicas, movimentos, gestos

**Estilo Visual Proposto**:
- Itálico
- Cor: Amarelo suave (#FFA500 ou similar)
- Opcional: ícone de ação (🎭) antes do texto

**Exemplo**:
```
Usuário: Olá! *acena com a mão*
Bot: *sorri gentilmente* Olá, como posso ajudar?
```

#### 2. **Falas / Diálogo** - Texto normal ou `"aspas"`

**Padrão**: `"Olá, tudo bem?"` ou `Olá, tudo bem?`

**Uso**: Diálogo falado pelos personagens

**Estilo Visual Proposto**:
- Normal (sem itálico)
- Cor: Branco/Preto (tema claro/escuro)
- Opcional: aspas decorativas se explicitamente usadas

**Exemplo**:
```
Usuário: "Você pode me ajudar com isso?"
Bot: Claro! Seria um prazer ajudar.
```

#### 3. **Pensamentos** - `<"pensamento">` ou `*itálico interno*`

**Padrão**: `<"Será que ele está com raiva?">` ou context interno

**Uso**: Pensamentos internos, emoções não verbalizadas

**Estilo Visual Proposto**:
- Itálico + sublinhado sutil
- Cor: Azul/Roxo claro (#9370DB)
- Opcional: ícone de pensamento (💭) antes do texto

**Exemplo**:
```
Bot: *estende a mão* <"Espero que ele confie em mim"> Prazer em conhecê-lo.
```

#### 4. **Out of Character (OOC)** - `(parênteses)` ou `((duplos))`

**Padrão**: `((Preciso sair, volto logo))` ou `(OOC: mudança de cenário)`

**Uso**: Comunicação meta, instruções, quebras de roleplay

**Estilo Visual Proposto**:
- Texto menor (80% do tamanho)
- Cor: Cinza (#888888)
- Background: Cinza muito claro (#F5F5F5)
- Border-left: linha cinza

**Exemplo**:
```
Usuário: *olha ao redor* ((vamos mudar para o cenário da praia?))
Bot: ((Claro! Mudando cenário)) *aparece na praia*
```

#### 5. **Gritar / Ênfase** - `>texto<` ou `**TEXTO**`

**Padrão**: `>NÃO!<` ou `**CUIDADO!**`

**Uso**: Fala em volume alto, gritos, exclamações enfáticas

**Estilo Visual Proposto**:
- Bold (negrito)
- Tamanho: 110% do normal
- Cor: Vermelho (#DC143C)

**Exemplo**:
```
Usuário: >CUIDADO!< *empurra o personagem*
Bot: *cai no chão* O que foi?!
```

#### 6. **Sussurrar** - `<texto>` (sem aspas dentro)

**Padrão**: `<não conte para ninguém>`

**Uso**: Fala em volume baixo, sussurros

**Estilo Visual Proposto**:
- Itálico + opacidade 70%
- Tamanho: 90% do normal
- Cor: Mais suave que o normal

**Exemplo**:
```
Bot: *se aproxima* <você sabe onde ele está?>
Usuário: <não posso dizer aqui>
```

#### 7. **Descrições / Contexto** - `[colchetes]`

**Padrão**: `[A sala estava escura e silenciosa]`

**Uso**: Descrições de ambiente, tempo, contexto narrativo

**Estilo Visual Proposto**:
- Itálico
- Cor: Cinza médio (#666666)
- Background: Leve destaque (#F9F9F9)

**Exemplo**:
```
Bot: [Horas depois] *boceja* Que dia longo...
Usuário: [concordando] Realmente.
```

### Tabela de Referência Rápida

| Tipo | Sintaxe | Estilo Visual | Cor Sugerida | Exemplo |
|------|---------|---------------|--------------|---------|
| **Ação/Narração** | `*texto*` | Itálico | Amarelo (#FFA500) | `*acena*` |
| **Fala/Diálogo** | `"texto"` ou normal | Normal | Padrão do tema | `"Olá!"` |
| **Pensamento** | `<"texto">` | Itálico + sublinhado | Roxo (#9370DB) | `<"interessante">` |
| **OOC** | `(texto)` ou `((texto))` | Menor, cinza | Cinza (#888) | `((pausa))` |
| **Gritar** | `>texto<` ou `**TEXTO**` | Bold, maior | Vermelho (#DC143C) | `>CUIDADO!<` |
| **Sussurrar** | `<texto>` | Itálico, opaco | Suave | `<segredo>` |
| **Descrição** | `[texto]` | Itálico, background | Cinza (#666) | `[tarde]` |

### Fontes de Pesquisa

Baseado em:
- [Character.AI Text Formatting](https://approachableai.com/character-ai-text-formatting/)
- [Mastering Text Formatting in Character AI](https://www.toolify.ai/ai-news/mastering-text-formatting-in-character-ai-enhance-your-roleplaying-experience-2450653)
- [Roleplay Chat Formatting Standards](https://rsroleplay.fandom.com/wiki/Roleplaying_Symbols)
- [Advanced Roleplay Guide](https://www.massivecraft.com/documentation/combining-dialogue-and-actions/)

---

## Objetivos

### Objetivos de Negócio

- ✅ Melhorar experiência de roleplay para competir com plataformas especializadas
- ✅ Aumentar engajamento e tempo de sessão
- ✅ Reduzir confusão sobre formatação de mensagens
- ✅ Diferenciar CharHub como plataforma de roleplay avançado

### Objetivos Técnicos

- ✅ Criar parser robusto de mensagens com regex
- ✅ Implementar componente React para renderização formatada
- ✅ Atualizar prompts dos agentes de conversação
- ✅ Garantir performance (parsing não deve atrasar UI)
- ✅ Manter retrocompatibilidade com mensagens antigas

### Objetivos de Produto

- ✅ Interface intuitiva que não requer treinamento
- ✅ Padrões visuais consistentes e acessíveis
- ✅ Funcionar em mobile e desktop
- ✅ Suportar temas claro e escuro

---

## Arquitetura da Solução

### Diagrama de Fluxo

```
┌─────────────────────────────────────────────────────────┐
│                   MENSAGEM ENVIADA                      │
│            (Usuário ou Bot)                             │
└─────────────────────────────────────────────────────────┘
                         ↓
┌─────────────────────────────────────────────────────────┐
│                   MESSAGE PARSER                        │
│                                                         │
│  Input: "Olá! *acena* <"Ele parece legal">"           │
│                                                         │
│  Regex Detection:                                       │
│  1. Detectar *ações*                                    │
│  2. Detectar <"pensamentos">                            │
│  3. Detectar (OOC)                                      │
│  4. Detectar >gritos<                                   │
│  5. Detectar [descrições]                               │
│  6. Manter texto normal como fala                       │
│                                                         │
│  Output: Array de tokens com tipos                     │
│  [                                                      │
│    { type: 'dialogue', content: 'Olá!' },              │
│    { type: 'action', content: 'acena' },               │
│    { type: 'thought', content: 'Ele parece legal' }    │
│  ]                                                      │
└─────────────────────────────────────────────────────────┘
                         ↓
┌─────────────────────────────────────────────────────────┐
│              MESSAGE RENDERER COMPONENT                 │
│                                                         │
│  Map tokens → React elements com estilos:               │
│                                                         │
│  - dialogue → <span className="message-dialogue">       │
│  - action → <span className="message-action">          │
│  - thought → <span className="message-thought">        │
│  - ooc → <span className="message-ooc">                │
│  - shout → <span className="message-shout">            │
│  - whisper → <span className="message-whisper">        │
│  - description → <span className="message-description"> │
└─────────────────────────────────────────────────────────┘
                         ↓
┌─────────────────────────────────────────────────────────┐
│                  CSS STYLING SYSTEM                     │
│                                                         │
│  Theme-aware styles:                                    │
│  - Light mode colors                                    │
│  - Dark mode colors                                     │
│  - Accessibility (WCAG AA compliance)                   │
│  - Responsive (mobile/desktop)                          │
└─────────────────────────────────────────────────────────┘
```

### Componentes Afetados

**Frontend**:
- `frontend/src/components/chat/MessageBubble.tsx` - Renderizar mensagens formatadas
- `frontend/src/utils/messageParser.ts` (novo) - Parser de mensagens
- `frontend/src/components/chat/FormattedMessage.tsx` (novo) - Componente de renderização
- `frontend/src/styles/message-formatting.css` (novo) - Estilos para formatação

**Backend**:
- `backend/src/services/ai/prompts/conversationPrompt.ts` - Atualizar prompts dos agentes
- `backend/src/services/ai/prompts/systemPrompts.ts` - Adicionar instruções de formatação
- `backend/src/types/message.types.ts` - Tipos TypeScript (se necessário)

---

## Implementação Técnica

### 1. Message Parser (Frontend)

**Arquivo**: `frontend/src/utils/messageParser.ts` (novo)

```typescript
export enum MessageTokenType {
  DIALOGUE = 'dialogue',
  ACTION = 'action',
  THOUGHT = 'thought',
  OOC = 'ooc',
  SHOUT = 'shout',
  WHISPER = 'whisper',
  DESCRIPTION = 'description',
}

export interface MessageToken {
  type: MessageTokenType
  content: string
}

/**
 * Parse a message string into formatted tokens
 * Supports roleplay formatting conventions:
 * - *action* → ACTION
 * - <"thought"> → THOUGHT
 * - ((ooc)) or (ooc) → OOC
 * - >shout< or **SHOUT** → SHOUT
 * - <whisper> → WHISPER
 * - [description] → DESCRIPTION
 * - Normal text → DIALOGUE
 */
export function parseMessage(message: string): MessageToken[] {
  const tokens: MessageToken[] = []

  // Regex patterns (order matters!)
  const patterns = [
    // OOC (must check before single parens for whisper)
    {
      regex: /\(\((.*?)\)\)/g,
      type: MessageTokenType.OOC,
    },
    {
      regex: /\((.*?)\)/g,
      type: MessageTokenType.OOC,
    },
    // Thoughts
    {
      regex: /<"(.*?)">/g,
      type: MessageTokenType.THOUGHT,
    },
    // Shout (>text<)
    {
      regex: />(.*?)</g,
      type: MessageTokenType.SHOUT,
    },
    // Whisper (<text> without quotes)
    {
      regex: /<([^"](.*?)[^"])>/g,
      type: MessageTokenType.WHISPER,
    },
    // Description
    {
      regex: /\[(.*?)\]/g,
      type: MessageTokenType.DESCRIPTION,
    },
    // Action (last to not conflict with others)
    {
      regex: /\*(.*?)\*/g,
      type: MessageTokenType.ACTION,
    },
  ]

  let remaining = message
  let lastIndex = 0
  const matches: Array<{ index: number; length: number; token: MessageToken }> = []

  // Find all matches
  patterns.forEach(({ regex, type }) => {
    let match
    const regexClone = new RegExp(regex.source, regex.flags)

    while ((match = regexClone.exec(message)) !== null) {
      matches.push({
        index: match.index,
        length: match[0].length,
        token: {
          type,
          content: match[1].trim(),
        },
      })
    }
  })

  // Sort matches by index
  matches.sort((a, b) => a.index - b.index)

  // Build tokens array with dialogue filling gaps
  matches.forEach(({ index, length, token }) => {
    // Add dialogue before this match
    if (index > lastIndex) {
      const dialogueText = message.substring(lastIndex, index).trim()
      if (dialogueText) {
        tokens.push({
          type: MessageTokenType.DIALOGUE,
          content: dialogueText,
        })
      }
    }

    // Add the matched token
    tokens.push(token)
    lastIndex = index + length
  })

  // Add remaining dialogue
  if (lastIndex < message.length) {
    const dialogueText = message.substring(lastIndex).trim()
    if (dialogueText) {
      tokens.push({
        type: MessageTokenType.DIALOGUE,
        content: dialogueText,
      })
    }
  }

  // If no tokens, treat entire message as dialogue
  if (tokens.length === 0 && message.trim()) {
    tokens.push({
      type: MessageTokenType.DIALOGUE,
      content: message.trim(),
    })
  }

  return tokens
}
```

### 2. Formatted Message Component (Frontend)

**Arquivo**: `frontend/src/components/chat/FormattedMessage.tsx` (novo)

```tsx
import React from 'react'
import { parseMessage, MessageToken, MessageTokenType } from '@/utils/messageParser'
import { cn } from '@/lib/utils'

interface FormattedMessageProps {
  content: string
  className?: string
}

export const FormattedMessage: React.FC<FormattedMessageProps> = ({
  content,
  className,
}) => {
  const tokens = parseMessage(content)

  const renderToken = (token: MessageToken, index: number) => {
    const baseClasses = 'message-token'

    const typeClasses: Record<MessageTokenType, string> = {
      [MessageTokenType.DIALOGUE]: 'message-dialogue',
      [MessageTokenType.ACTION]: 'message-action',
      [MessageTokenType.THOUGHT]: 'message-thought',
      [MessageTokenType.OOC]: 'message-ooc',
      [MessageTokenType.SHOUT]: 'message-shout',
      [MessageTokenType.WHISPER]: 'message-whisper',
      [MessageTokenType.DESCRIPTION]: 'message-description',
    }

    const tokenClass = typeClasses[token.type]

    return (
      <span
        key={`${token.type}-${index}`}
        className={cn(baseClasses, tokenClass)}
      >
        {token.content}
      </span>
    )
  }

  return (
    <div className={cn('formatted-message', className)}>
      {tokens.map((token, index) => (
        <React.Fragment key={index}>
          {renderToken(token, index)}
          {index < tokens.length - 1 && ' '}
        </React.Fragment>
      ))}
    </div>
  )
}
```

### 3. CSS Styling (Frontend)

**Arquivo**: `frontend/src/styles/message-formatting.css` (novo)

```css
/* Base formatted message container */
.formatted-message {
  line-height: 1.6;
  word-wrap: break-word;
}

/* Base token style */
.message-token {
  transition: all 0.2s ease;
}

/* Dialogue (normal speech) */
.message-dialogue {
  color: inherit; /* Use theme default */
  font-style: normal;
}

/* Actions/Narration */
.message-action {
  font-style: italic;
  color: #FFA500; /* Orange/Yellow */
}

.dark .message-action {
  color: #FFB84D; /* Lighter orange for dark mode */
}

/* Thoughts */
.message-thought {
  font-style: italic;
  text-decoration: underline;
  text-decoration-style: dotted;
  text-decoration-thickness: 1px;
  text-underline-offset: 2px;
  color: #9370DB; /* Medium purple */
}

.dark .message-thought {
  color: #B19CD9; /* Lighter purple for dark mode */
}

/* Out of Character (OOC) */
.message-ooc {
  font-size: 0.85em;
  color: #888888;
  background-color: #F5F5F5;
  padding: 2px 6px;
  border-radius: 4px;
  border-left: 2px solid #CCCCCC;
  display: inline-block;
}

.dark .message-ooc {
  color: #AAAAAA;
  background-color: #2A2A2A;
  border-left-color: #555555;
}

/* Shout/Emphasis */
.message-shout {
  font-weight: bold;
  font-size: 1.1em;
  color: #DC143C; /* Crimson red */
}

.dark .message-shout {
  color: #FF6B6B; /* Lighter red for dark mode */
}

/* Whisper */
.message-whisper {
  font-style: italic;
  font-size: 0.9em;
  opacity: 0.7;
}

/* Description/Context */
.message-description {
  font-style: italic;
  color: #666666;
  background-color: #F9F9F9;
  padding: 2px 4px;
  border-radius: 3px;
}

.dark .message-description {
  color: #999999;
  background-color: #1E1E1E;
}

/* Accessibility: ensure WCAG AA compliance */
@media (prefers-reduced-motion: reduce) {
  .message-token {
    transition: none;
  }
}

/* Mobile optimizations */
@media (max-width: 768px) {
  .formatted-message {
    font-size: 0.95em;
  }

  .message-ooc,
  .message-description {
    padding: 1px 4px;
  }
}
```

### 4. Integração com MessageBubble Existente

**Arquivo**: `frontend/src/components/chat/MessageBubble.tsx` (modificar)

```tsx
import { FormattedMessage } from './FormattedMessage'

const MessageBubble = ({ message, isUser }) => {
  // ... código existente

  return (
    <div className={cn('message-bubble', isUser ? 'user' : 'bot')}>
      {/* Substituir renderização de texto plano por FormattedMessage */}
      <FormattedMessage content={message.content} />

      {/* ... resto do código */}
    </div>
  )
}
```

---

## Backend

### Atualização de Prompts dos Agentes

**Arquivo**: `backend/src/services/ai/prompts/conversationPrompt.ts` (modificar)

```typescript
export const conversationSystemPrompt = `
You are a character in an interactive roleplay conversation. Follow these formatting guidelines to enhance the narrative experience:

## Formatting Guidelines

Use the following conventions in your responses:

1. **Actions/Narration**: Wrap physical actions and narrative descriptions in *asterisks*
   Example: *walks slowly towards the window* *looks outside thoughtfully*

2. **Dialogue**: Use normal text for spoken words (quotes optional)
   Example: Hello, how are you today?
   Or: "Hello, how are you today?"

3. **Thoughts**: Express internal thoughts using <"angle brackets with quotes">
   Example: <"I wonder if they trust me">

4. **Descriptions**: Use [square brackets] for scene/context descriptions
   Example: [The room falls silent]

5. **Emphasis/Shouting**: Use >angle brackets< or **bold** for loud speech
   Example: >Look out!< or **WATCH OUT!**

6. **Whispers**: Use <angle brackets> without quotes for quiet speech
   Example: <meet me later>

7. **Out of Character**: Use (parentheses) or ((double parentheses)) for meta-commentary
   Example: ((switching to next scene))

## Response Structure

Combine these elements naturally:

Example 1:
*leans against the doorframe* Hey, got a minute? <"Hope I'm not interrupting">

Example 2:
[After a long pause] *sighs deeply* I suppose you're right. *extends hand* Let's start over.

Example 3:
>Don't you dare!< *rushes forward* <no time to explain>

## Important Notes

- Mix dialogue, actions, and thoughts fluidly
- Don't overuse any single format
- Prioritize natural, engaging conversation
- Match the user's style and energy
- Stay in character at all times

When the user uses these formatting conventions, interpret them correctly:
- User's *actions* should be acknowledged in the narrative
- User's <"thoughts"> may not be known to your character (unless telepathic)
- User's ((OOC)) comments are instructions, not in-character dialogue
`
```

**Arquivo**: `backend/src/services/ai/prompts/systemPrompts.ts` (adicionar instruções)

```typescript
export const roleplayFormattingGuidelines = `
## Roleplay Formatting Recognition

When users send messages with roleplay formatting, interpret them as follows:

- *action* → The user performed a physical action
- <"thought"> → User's internal thought (your character may not know this)
- (comment) or ((comment)) → Out-of-character instruction or meta-comment
- >shout< → User is shouting or speaking loudly
- <whisper> → User is whispering
- [description] → Scene or context description
- Normal text → User is speaking

Respond appropriately to each type:
- React to actions naturally
- Don't reference thoughts unless your character has reason to know
- Follow OOC instructions without breaking character in the response
- Match intensity for shouts/whispers
- Build upon scene descriptions

Example:

User: *approaches cautiously* Hello? <"This place gives me chills"> ((let's make this a mystery scene))

Correct Response:
[The shadows seem to shift] *turns slowly* Oh! I didn't hear you come in. *notices your hesitation* Is everything alright?

Incorrect Response:
I can see you're thinking this place gives you chills. ((ok, mystery scene))
`
```

---

## Frontend

### User Interface Mockups

#### Exemplo de Chat com Formatação

```
┌─────────────────────────────────────────────────────────┐
│  CharHub - Chat with Character                          │
├─────────────────────────────────────────────────────────┤
│                                                         │
│  ┌─ User Message ─────────────────────────────────┐   │
│  │ Hello! *waves hand enthusiastically*            │   │
│  │ <"I hope they're friendly">                     │   │
│  └─────────────────────────────────────────────────┘   │
│                                                         │
│  ┌─ Bot Message ──────────────────────────────────┐   │
│  │ *smiles warmly* Hey there! *walks closer*       │   │
│  │ Nice to meet you. How can I help today?         │   │
│  └─────────────────────────────────────────────────┘   │
│                                                         │
│  ┌─ User Message ─────────────────────────────────┐   │
│  │ I need some advice. <can I trust them?>         │   │
│  │ ((let's make this a serious conversation))      │   │
│  └─────────────────────────────────────────────────┘   │
│                                                         │
│  ┌─ Bot Message ──────────────────────────────────┐   │
│  │ [The atmosphere becomes more focused]           │   │
│  │ *nods thoughtfully* I'm listening. *sits down*  │   │
│  │ What's on your mind? <"They seem troubled">     │   │
│  └─────────────────────────────────────────────────┘   │
│                                                         │
└─────────────────────────────────────────────────────────┘
```

**Com Estilos Aplicados** (representação textual):

```
User: Hello! [waves hand enthusiastically] [I hope they're friendly]
      ↑      ↑                           ↑
      normal italic-orange               italic-purple-underline

Bot: [smiles warmly] Hey there! [walks closer] Nice to meet you.
     ↑               ↑           ↑              ↑
     italic-orange   normal      italic-orange  normal
```

### Configurações de Usuário (Futuro)

Permitir personalização:

```tsx
interface FormattingPreferences {
  enableFormatting: boolean // Toggle global
  actionColor: string
  thoughtColor: string
  shoutColor: string
  // ... outros
}
```

---

## Fluxos de Usuário

### Fluxo 1: Usuário Envia Mensagem Formatada

```
1. Usuário digita: "Olá! *acena* <"Ele parece legal">"
   ↓
2. Mensagem enviada para backend
   ↓
3. Backend processa e salva mensagem
   ↓
4. Frontend recebe mensagem
   ↓
5. Parser detecta tokens:
   - "Olá!" → DIALOGUE
   - "acena" → ACTION
   - "Ele parece legal" → THOUGHT
   ↓
6. FormattedMessage renderiza com estilos
   ↓
7. Usuário vê mensagem formatada no chat
```

### Fluxo 2: Bot Responde com Formatação

```
1. Usuário envia mensagem
   ↓
2. Backend envia para LLM com prompt atualizado
   ↓
3. LLM responde usando convenções de formatação:
   "*sorri* Olá! <"Que pessoa simpática">"
   ↓
4. Backend retorna resposta
   ↓
5. Frontend recebe e parseia
   ↓
6. Renderiza com estilos visuais
   ↓
7. Usuário vê resposta formatada do bot
```

### Fluxo 3: Mensagens Antigas (Retrocompatibilidade)

```
1. Usuário abre chat com mensagens antigas (sem formatação)
   ↓
2. Parser processa mensagens antigas
   ↓
3. Se nenhum padrão detectado → tudo vira DIALOGUE
   ↓
4. Mensagem renderizada como normal
   ↓
5. Sem quebras ou erros
```

---

## Regras de Negócio

### Prioridade de Detecção de Padrões

Quando múltiplos padrões podem conflitar, a ordem de detecção é:

1. **OOC** `((texto))` ou `(texto)` - mais alta prioridade
2. **Pensamentos** `<"texto">`
3. **Gritar** `>texto<`
4. **Sussurrar** `<texto>` (sem aspas)
5. **Descrição** `[texto]`
6. **Ação** `*texto*` - mais baixa prioridade (mais comum)

**Exemplo de Conflito**:
```
Input: "*acena* e diz >OLÁ!<"

Parser detecta:
1. Primeiro: "*acena*" → ACTION
2. Depois: ">OLÁ!<" → SHOUT
3. "e diz" → DIALOGUE

Output visual:
[acena] e diz [OLÁ!]
(itálico-laranja) (normal) (bold-vermelho)
```

### Escape de Caracteres Especiais

Se usuário quiser usar `*` ou `<` literalmente:

**Opção 1**: Usar backslash escape `\*` → `*`
**Opção 2**: Não parsear se não houver par fechado

```
Input: "Custo: *5 dólares (sem ação fechada)"

Parser: Não detecta padrão (sem *)
Output: Texto normal
```

### Limites de Comprimento

- **Ação**: Máximo 200 caracteres (evitar textos gigantes em itálico)
- **Pensamento**: Máximo 150 caracteres
- **OOC**: Máximo 300 caracteres
- **Descrição**: Máximo 250 caracteres

Se exceder → tratar como DIALOGUE normal (sem formatação)

### Acessibilidade

- **Contraste de cores**: WCAG AA compliant (4.5:1 ratio mínimo)
- **Screen readers**: Adicionar `aria-label` descrevendo tipo de conteúdo
- **Navegação por teclado**: Todos os elementos navegáveis

---

## Testes

### Testes Unitários - Parser

**Arquivo**: `frontend/src/utils/__tests__/messageParser.test.ts`

```typescript
import { parseMessage, MessageTokenType } from '../messageParser'

describe('messageParser', () => {
  it('should parse actions correctly', () => {
    const result = parseMessage('Hello *waves hand*')
    expect(result).toEqual([
      { type: MessageTokenType.DIALOGUE, content: 'Hello' },
      { type: MessageTokenType.ACTION, content: 'waves hand' },
    ])
  })

  it('should parse thoughts correctly', () => {
    const result = parseMessage('<"I wonder why">')
    expect(result).toEqual([
      { type: MessageTokenType.THOUGHT, content: 'I wonder why' },
    ])
  })

  it('should parse OOC correctly', () => {
    const result = parseMessage('Hello ((this is ooc))')
    expect(result).toEqual([
      { type: MessageTokenType.DIALOGUE, content: 'Hello' },
      { type: MessageTokenType.OOC, content: 'this is ooc' },
    ])
  })

  it('should parse shouts correctly', () => {
    const result = parseMessage('>WATCH OUT!<')
    expect(result).toEqual([
      { type: MessageTokenType.SHOUT, content: 'WATCH OUT!' },
    ])
  })

  it('should parse whispers correctly', () => {
    const result = parseMessage('<secret message>')
    expect(result).toEqual([
      { type: MessageTokenType.WHISPER, content: 'secret message' },
    ])
  })

  it('should parse descriptions correctly', () => {
    const result = parseMessage('[The room darkens]')
    expect(result).toEqual([
      { type: MessageTokenType.DESCRIPTION, content: 'The room darkens' },
    ])
  })

  it('should handle complex mixed messages', () => {
    const result = parseMessage('*walks in* Hello! <"Nice place"> >HEY!<')
    expect(result).toEqual([
      { type: MessageTokenType.ACTION, content: 'walks in' },
      { type: MessageTokenType.DIALOGUE, content: 'Hello!' },
      { type: MessageTokenType.THOUGHT, content: 'Nice place' },
      { type: MessageTokenType.SHOUT, content: 'HEY!' },
    ])
  })

  it('should handle plain text as dialogue', () => {
    const result = parseMessage('Just a normal message')
    expect(result).toEqual([
      { type: MessageTokenType.DIALOGUE, content: 'Just a normal message' },
    ])
  })

  it('should handle empty messages', () => {
    const result = parseMessage('')
    expect(result).toEqual([])
  })

  it('should handle unclosed patterns as normal text', () => {
    const result = parseMessage('This has an *unclosed asterisk')
    expect(result).toEqual([
      { type: MessageTokenType.DIALOGUE, content: 'This has an *unclosed asterisk' },
    ])
  })
})
```

### Testes de Integração - Componente

**Arquivo**: `frontend/src/components/chat/__tests__/FormattedMessage.test.tsx`

```typescript
import { render, screen } from '@testing-library/react'
import { FormattedMessage } from '../FormattedMessage'

describe('FormattedMessage', () => {
  it('should render formatted actions with correct class', () => {
    render(<FormattedMessage content="*waves*" />)
    const element = screen.getByText('waves')
    expect(element).toHaveClass('message-action')
  })

  it('should render multiple token types correctly', () => {
    render(<FormattedMessage content="Hello *smiles* <"nice">" />)

    expect(screen.getByText('Hello')).toHaveClass('message-dialogue')
    expect(screen.getByText('smiles')).toHaveClass('message-action')
    expect(screen.getByText('nice')).toHaveClass('message-thought')
  })

  it('should handle plain text messages', () => {
    render(<FormattedMessage content="Plain message" />)
    expect(screen.getByText('Plain message')).toHaveClass('message-dialogue')
  })
})
```

### Testes E2E - Fluxo Completo

**Arquivo**: `frontend/e2e/messageFormatting.spec.ts`

```typescript
import { test, expect } from '@playwright/test'

test.describe('Message Formatting', () => {
  test('user can send formatted messages and see them rendered', async ({ page }) => {
    // Login e navegar para chat
    await page.goto('/chat/123')

    // Digitar mensagem formatada
    await page.fill('[data-testid="message-input"]', 'Hello *waves* <"testing">')
    await page.click('[data-testid="send-button"]')

    // Verificar renderização
    await expect(page.locator('.message-action')).toHaveText('waves')
    await expect(page.locator('.message-thought')).toHaveText('testing')
  })

  test('bot responses are formatted correctly', async ({ page }) => {
    await page.goto('/chat/123')

    // Enviar mensagem
    await page.fill('[data-testid="message-input"]', 'Hello')
    await page.click('[data-testid="send-button"]')

    // Aguardar resposta do bot
    await page.waitForSelector('.bot-message .message-action')

    // Verificar se formatação foi aplicada
    const actionElements = page.locator('.bot-message .message-action')
    await expect(actionElements).toHaveCount(1)
  })
})
```

### Checklist de Testes Manuais

**Parser**:
- [ ] Parseia ações `*texto*` corretamente
- [ ] Parseia pensamentos `<"texto">` corretamente
- [ ] Parseia OOC `((texto))` e `(texto)` corretamente
- [ ] Parseia gritos `>texto<` corretamente
- [ ] Parseia sussurros `<texto>` corretamente
- [ ] Parseia descrições `[texto]` corretamente
- [ ] Lida com mensagens mistas complexas
- [ ] Trata texto sem formatação como diálogo
- [ ] Não quebra com padrões incompletos

**Renderização**:
- [ ] Estilos visuais aplicados corretamente (todas as variações)
- [ ] Cores corretas em tema claro
- [ ] Cores corretas em tema escuro
- [ ] Responsivo em mobile
- [ ] Acessível (contraste, screen readers)

**Prompts de IA**:
- [ ] Bot usa formatação em respostas
- [ ] Bot interpreta formatação do usuário corretamente
- [ ] Bot não quebra personagem com OOC
- [ ] Bot respeita pensamentos como internos (não os "lê")

**Integração**:
- [ ] Mensagens antigas continuam funcionando
- [ ] Performance não degradada (parsing rápido)
- [ ] Funciona em todos os navegadores (Chrome, Firefox, Safari)

---

## Roadmap de Implementação

### Fase 1: Planejamento e Pesquisa
**Tempo estimado**: 2 dias

- [x] Pesquisar padrões de roleplay em plataformas existentes
- [x] Documentar convenções e criar tabela de referência
- [ ] Definir prioridade de detecção de padrões
- [ ] Criar mockups de UI

### Fase 2: Backend - Atualização de Prompts
**Tempo estimado**: 2 dias

- [ ] Atualizar `conversationPrompt.ts` com instruções de formatação
- [ ] Adicionar `roleplayFormattingGuidelines` aos system prompts
- [ ] Testar prompts com LLM (verificar se respostas usam formatação)
- [ ] Ajustar prompts baseado em resultados

### Fase 3: Frontend - Parser de Mensagens
**Tempo estimado**: 3 dias

- [ ] Criar `messageParser.ts` com regex patterns
- [ ] Implementar função `parseMessage()`
- [ ] Escrever testes unitários completos
- [ ] Testar com casos edge (mensagens complexas, padrões aninhados)
- [ ] Otimizar performance (benchmark com mensagens grandes)

### Fase 4: Frontend - Componente de Renderização
**Tempo estimado**: 3 dias

- [ ] Criar `FormattedMessage.tsx` component
- [ ] Implementar lógica de renderização de tokens
- [ ] Criar `message-formatting.css` com estilos
- [ ] Adicionar suporte para tema claro/escuro
- [ ] Garantir acessibilidade (ARIA labels, contraste)
- [ ] Escrever testes de componente

### Fase 5: Integração
**Tempo estimado**: 2 dias

- [ ] Integrar `FormattedMessage` em `MessageBubble.tsx`
- [ ] Testar em chat existente
- [ ] Verificar retrocompatibilidade (mensagens antigas)
- [ ] Ajustar estilos para consistência visual

### Fase 6: Testes & Ajustes
**Tempo estimado**: 3 dias

- [ ] Executar testes E2E completos
- [ ] Testar em mobile (iOS e Android)
- [ ] Testar em diferentes navegadores
- [ ] Executar checklist de testes manuais
- [ ] Corrigir bugs encontrados
- [ ] Otimizar performance

### Fase 7: Documentação & Deploy
**Tempo estimado**: 2 dias

- [ ] Documentar API do parser
- [ ] Criar guia de uso para usuários (como formatar mensagens)
- [ ] Atualizar docs técnicas
- [ ] Code review
- [ ] Merge para main
- [ ] Deploy e monitoramento

---

## Riscos e Mitigações

### Risco 1: Parser com Bugs em Casos Edge

**Cenário**: Mensagens complexas ou padrões aninhados causam parsing incorreto

**Mitigação**:
- Testes unitários extensivos com casos edge
- Fallback: se parsing falhar, renderizar como texto normal
- Logging de erros para identificar padrões problemáticos

### Risco 2: Performance com Mensagens Longas

**Cenário**: Parsing de mensagens muito longas causa lag na UI

**Mitigação**:
- Limitar comprimento de tokens (200-300 caracteres)
- Memoização do resultado do parser
- Lazy rendering para chats longos (virtualização)

### Risco 3: LLM Não Segue Formatação Consistentemente

**Cenário**: Bot às vezes usa formatação, às vezes não

**Mitigação**:
- Prompts claros e bem estruturados
- Exemplos de few-shot learning nos prompts
- Monitoramento de qualidade de respostas
- Iteração nos prompts baseado em feedback

### Risco 4: Conflito com Markdown Existente

**Cenário**: Padrões de roleplay conflitam com markdown (ex: `*itálico*`)

**Mitigação**:
- Definir precedência clara (roleplay > markdown)
- Documentar para usuários qual formatação tem prioridade
- Permitir escape characters `\*` para uso literal

### Risco 5: Acessibilidade Comprometida

**Cenário**: Cores ou estilos dificultam leitura para usuários com deficiências visuais

**Mitigação**:
- Testes de contraste (WCAG AA compliance)
- Suporte a high-contrast mode
- ARIA labels descritivos
- Opção de desabilitar formatação (futuro)

---

## Métricas de Sucesso

### KPIs a Monitorar

1. **Adoção de Formatação**
   - % de mensagens de usuários que usam formatação
   - Target: > 30% após 30 dias

2. **Engajamento em Chats**
   - Tempo médio de sessão de chat
   - Target: Aumento de 15-20%

3. **Satisfação de Usuários**
   - Feedback qualitativo sobre feature
   - Target: > 80% feedback positivo

4. **Performance**
   - Tempo de parsing de mensagem
   - Target: < 5ms para 99% das mensagens

5. **Qualidade de Respostas de IA**
   - % de respostas de bots que usam formatação
   - Target: > 70%

### Analytics Events

```typescript
// Eventos a rastrear
trackEvent('message_formatting_used', {
  types: ['action', 'thought'], // Tipos usados na mensagem
  tokenCount: 3,
  messageLength: 120,
})

trackEvent('message_formatting_error', {
  errorType: 'parsing_failed',
  message: '...',
})

trackEvent('bot_response_formatted', {
  characterId: '123',
  types: ['action', 'dialogue'],
})
```

---

## Notas Adicionais

### Considerações Futuras

1. **Configurações de Usuário**:
   - Permitir desabilitar formatação visual
   - Customizar cores dos diferentes tipos
   - Escolher quais tipos de formatação usar

2. **Editor com Preview**:
   - Mostrar preview de formatação enquanto usuário digita
   - Botões de atalho para inserir formatação (ex: botão "*ação*")
   - Syntax highlighting no input

3. **Formatação Avançada**:
   - Suporte para múltiplos personagens (cores diferentes)
   - Formatação de tempo/localização `{tempo: manhã}`
   - Emoções/status `[cansado]`

4. **Export/Share**:
   - Exportar chats com formatação (HTML, PDF)
   - Compartilhar mensagens preservando estilos

5. **Analytics e ML**:
   - Analisar padrões de uso de formatação
   - Sugerir formatação automaticamente
   - Detectar estilo de usuário e adaptar bot

### Compatibilidade

- ✅ Compatível com sistema de markdown existente
- ✅ Compatível com mentions (@usuário)
- ✅ Compatível com emojis
- ✅ Compatível com links
- ✅ Não conflita com sistema de mensagens existente

### Dependências

**NPM Packages** (nenhum adicional necessário):
- Usar regex nativo do JavaScript
- React já instalado
- CSS modules ou Tailwind (já existente)

**APIs**:
- Nenhuma mudança em API backend necessária (apenas prompts)

---

## Fontes e Referências

### Pesquisa de Padrões

- [Character.AI Text Formatting Guide](https://approachableai.com/character-ai-text-formatting/)
- [Mastering Text Formatting in Character AI](https://www.toolify.ai/ai-news/mastering-text-formatting-in-character-ai-enhance-your-roleplaying-experience-2450653)
- [Roleplaying Symbols - RuneScape Roleplay Wiki](https://rsroleplay.fandom.com/wiki/Roleplaying_Symbols)
- [Advanced Roleplay Chat Guide](https://www.massivecraft.com/documentation/combining-dialogue-and-actions/)
- [How to Use Character AI Like a Pro](https://www.roborhythms.com/character-ai-tips/)

### Ferramentas Similares

- Character.AI - padrão de referência
- Janitor.AI - variações de formatação
- AI Dungeon - narrativa com ações
- Replika - contexto emocional

---

**Próximos Passos**:
1. Revisar especificação com stakeholders
2. Aprovar padrões de formatação e estilos visuais
3. Validar prompts de IA com exemplos
4. Iniciar implementação (Fase 2: Backend)
5. Criar PR para revisão
