# Configuração Multi-User na Criação de Conversa

> **Status**: Pronto para implementação
> **Prioridade**: Alta
> **Complexidade**: Baixa
> **Dependências**: Multi-User Chat (Fase 4) - JÁ IMPLEMENTADO
> **Última atualização**: 2025-11-24

## Visão Geral

Atualmente, conversas são criadas como single-user por padrão. Este documento descreve como adicionar opção de criar conversas multi-user diretamente no modal de criação, com configurações adequadas.

## Problema Atual

Quando usuário cria nova conversa:
- `isMultiUser` é sempre `false`
- `maxUsers` é sempre `1`
- Não há forma de criar conversa multi-user via UI
- Configurações multi-user (`allowUserInvites`, `requireApproval`) não são expostas

## Solução Proposta

Modificar modal de criar conversa para incluir:
1. Toggle "Multi-user conversation"
2. Se ativado, mostrar configurações adicionais
3. Validações e valores padrão adequados

## UI Flow

```
┌─────────────────────────────────────┐
│  New Conversation                   │
├─────────────────────────────────────┤
│                                     │
│  Title: [RPG Adventure Group    ]  │
│                                     │
│  ☑ Multi-user conversation         │
│  └─> Shows advanced options        │
│                                     │
│  ┌─────────────────────────────┐   │
│  │ Multi-user Settings         │   │
│  │                             │   │
│  │ Max Users: [●─────] 4       │   │
│  │ (1-4 human users)           │   │
│  │                             │   │
│  │ ☑ Allow members to invite   │   │
│  │ ☐ Require approval to join  │   │
│  └─────────────────────────────┘   │
│                                     │
│  [ Cancel ]  [ Create Conversation ]│
└─────────────────────────────────────┘
```

## Schema (Já Existe)

```prisma
model Conversation {
  // ... outros campos
  isMultiUser       Boolean  @default(false)
  maxUsers          Int      @default(1)      // 1-4 usuários humanos
  allowUserInvites  Boolean  @default(false)  // Membros podem convidar?
  requireApproval   Boolean  @default(false)  // Convites precisam aprovação?
  // ...
}
```

## Backend Changes

### Atualizar validação de criação

```typescript
// backend/src/validators/conversation.validator.ts

import { z } from 'zod';

export const createConversationSchema = z.object({
  title: z.string().min(1).max(100).optional(),
  visibility: z.enum(['PRIVATE', 'UNLISTED', 'PUBLIC']).default('PRIVATE'),

  // Multi-user settings (opcionais)
  isMultiUser: z.boolean().default(false),
  maxUsers: z.number().int().min(1).max(4).default(1),
  allowUserInvites: z.boolean().default(false),
  requireApproval: z.boolean().default(false),

  // Participants
  participants: z.array(z.object({
    type: z.enum(['CHARACTER', 'ASSISTANT']),
    id: z.string(),
    // ... resto
  }))
});

// Validação cruzada
.refine((data) => {
  // Se não é multi-user, maxUsers deve ser 1
  if (!data.isMultiUser && data.maxUsers > 1) {
    return false;
  }
  return true;
}, {
  message: 'maxUsers must be 1 for single-user conversations'
})
.refine((data) => {
  // Se não é multi-user, flags de convite devem ser false
  if (!data.isMultiUser && (data.allowUserInvites || data.requireApproval)) {
    return false;
  }
  return true;
}, {
  message: 'Invite settings only available for multi-user conversations'
});
```

### Atualizar conversationService

```typescript
// backend/src/services/conversationService.ts

async createConversation(userId: string, data: CreateConversationInput) {
  const conversation = await prisma.conversation.create({
    data: {
      userId,
      title: data.title,
      visibility: data.visibility,

      // Multi-user settings
      isMultiUser: data.isMultiUser || false,
      maxUsers: data.isMultiUser ? (data.maxUsers || 2) : 1,
      allowUserInvites: data.isMultiUser ? (data.allowUserInvites || false) : false,
      requireApproval: data.isMultiUser ? (data.requireApproval || false) : false,

      // ... resto
    }
  });

  // Se multi-user, criar membership do owner
  if (data.isMultiUser) {
    await prisma.userConversationMembership.create({
      data: {
        conversationId: conversation.id,
        userId,
        role: 'OWNER',
        canWrite: true,
        canInvite: true,
        canModerate: true
      }
    });
  }

  return conversation;
}
```

## Frontend Implementation

### 1. Modificar NewConversationModal

```tsx
// frontend/src/pages/(chat)/shared/components/NewConversationModal.tsx

export const NewConversationModal: React.FC<Props> = ({ isOpen, onClose, onCreate }) => {
  const { t } = useTranslation('chat');
  const [title, setTitle] = useState('');
  const [isMultiUser, setIsMultiUser] = useState(false);
  const [maxUsers, setMaxUsers] = useState(2);
  const [allowUserInvites, setAllowUserInvites] = useState(false);
  const [requireApproval, setRequireApproval] = useState(false);

  const handleCreate = () => {
    onCreate({
      title: title.trim() || undefined,
      isMultiUser,
      maxUsers: isMultiUser ? maxUsers : 1,
      allowUserInvites: isMultiUser ? allowUserInvites : false,
      requireApproval: isMultiUser ? requireApproval : false,
      participants: [] // Adicionar depois
    });
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={t('newConversation.title')}>
      <div className="space-y-4">
        {/* Title */}
        <div>
          <label className="block text-sm font-medium mb-2">
            {t('newConversation.titleLabel')}
          </label>
          <Input
            type="text"
            placeholder={t('newConversation.titlePlaceholder')}
            value={title}
            onChange={(e) => setTitle(e.target.value)}
          />
        </div>

        {/* Multi-user toggle */}
        <div className="flex items-center justify-between p-3 bg-light rounded">
          <div>
            <p className="font-medium">{t('newConversation.multiUserLabel')}</p>
            <p className="text-sm text-muted">{t('newConversation.multiUserDescription')}</p>
          </div>
          <Switch
            checked={isMultiUser}
            onChange={setIsMultiUser}
          />
        </div>

        {/* Multi-user settings (conditional) */}
        {isMultiUser && (
          <div className="p-4 bg-light rounded space-y-4">
            <h4 className="font-medium">{t('newConversation.multiUserSettings')}</h4>

            {/* Max Users Slider */}
            <div>
              <label className="block text-sm font-medium mb-2">
                {t('newConversation.maxUsersLabel')}: {maxUsers}
              </label>
              <input
                type="range"
                min="2"
                max="4"
                value={maxUsers}
                onChange={(e) => setMaxUsers(parseInt(e.target.value))}
                className="w-full"
              />
              <p className="text-xs text-muted mt-1">
                {t('newConversation.maxUsersHint')}
              </p>
            </div>

            {/* Allow user invites */}
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium">{t('newConversation.allowInvitesLabel')}</p>
                <p className="text-xs text-muted">{t('newConversation.allowInvitesHint')}</p>
              </div>
              <Switch
                checked={allowUserInvites}
                onChange={setAllowUserInvites}
              />
            </div>

            {/* Require approval */}
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium">{t('newConversation.requireApprovalLabel')}</p>
                <p className="text-xs text-muted">{t('newConversation.requireApprovalHint')}</p>
              </div>
              <Switch
                checked={requireApproval}
                onChange={setRequireApproval}
              />
            </div>
          </div>
        )}

        {/* Actions */}
        <div className="flex justify-end gap-2">
          <Button variant="light" onClick={onClose}>
            {t('common.cancel')}
          </Button>
          <Button variant="primary" onClick={handleCreate}>
            {t('newConversation.create')}
          </Button>
        </div>
      </div>
    </Modal>
  );
};
```

### 2. Switch Component (se não existir)

```tsx
// frontend/src/components/ui/Switch.tsx

export const Switch: React.FC<{
  checked: boolean;
  onChange: (checked: boolean) => void;
  disabled?: boolean;
}> = ({ checked, onChange, disabled = false }) => {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      disabled={disabled}
      onClick={() => onChange(!checked)}
      className={`
        relative inline-flex h-6 w-11 items-center rounded-full
        transition-colors focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2
        ${checked ? 'bg-primary' : 'bg-gray-300 dark:bg-gray-600'}
        ${disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}
      `}
    >
      <span
        className={`
          inline-block h-4 w-4 transform rounded-full bg-white transition-transform
          ${checked ? 'translate-x-6' : 'translate-x-1'}
        `}
      />
    </button>
  );
};
```

## Traduções

```json
// backend/translations/_source/chat.json

"newConversation": {
  "title": "New Conversation",
  "titleLabel": "Title (Optional)",
  "titlePlaceholder": "RPG Adventure Group",
  "multiUserLabel": "Multi-user conversation",
  "multiUserDescription": "Allow multiple users to participate in this conversation",
  "multiUserSettings": "Multi-user Settings",
  "maxUsersLabel": "Maximum users",
  "maxUsersHint": "Up to 4 human users can join (plus unlimited characters)",
  "allowInvitesLabel": "Allow members to invite",
  "allowInvitesHint": "Members can invite other users to join",
  "requireApprovalLabel": "Require approval to join",
  "requireApprovalHint": "Owner must approve new members before they can participate",
  "create": "Create Conversation"
}
```

## Valores Padrão Recomendados

Quando `isMultiUser: true`:

| Campo | Padrão | Razão |
|-------|--------|-------|
| `maxUsers` | 2 | Maioria dos casos são 1-on-1 com friend |
| `allowUserInvites` | false | Owner mantém controle por padrão |
| `requireApproval` | false | Fluxo mais simples para começar |

## Validações UI

```typescript
// Validar antes de criar
if (isMultiUser && maxUsers < 2) {
  toast.error('Multi-user conversations must allow at least 2 users');
  return;
}

if (isMultiUser && maxUsers > 4) {
  toast.error('Maximum 4 users allowed in multi-user conversations');
  return;
}
```

## Comportamento de Upgrade

**Pergunta**: E se usuário quiser converter conversa single-user em multi-user depois?

**Resposta**: Adicionar no modal de settings:

```tsx
// Em ConversationSettingsModal.tsx

{!conversation.isMultiUser && (
  <div className="p-4 bg-light rounded">
    <h4 className="font-medium mb-2">{t('settings.upgradeToMultiUser')}</h4>
    <p className="text-sm text-muted mb-3">
      {t('settings.upgradeToMultiUserDescription')}
    </p>
    <Button
      variant="primary"
      onClick={handleUpgradeToMultiUser}
      icon="people"
    >
      {t('settings.upgradeButton')}
    </Button>
  </div>
)}
```

Backend:

```typescript
// conversationService.ts
async upgradeToMultiUser(conversationId: string, userId: string, settings: {
  maxUsers: number;
  allowUserInvites: boolean;
  requireApproval: boolean;
}) {
  // Verificar ownership
  const conversation = await prisma.conversation.findUnique({
    where: { id: conversationId }
  });

  if (conversation?.userId !== userId) {
    throw new Error('Only owner can upgrade conversation');
  }

  if (conversation.isMultiUser) {
    throw new Error('Conversation is already multi-user');
  }

  // Atualizar conversa
  await prisma.conversation.update({
    where: { id: conversationId },
    data: {
      isMultiUser: true,
      maxUsers: settings.maxUsers,
      allowUserInvites: settings.allowUserInvites,
      requireApproval: settings.requireApproval
    }
  });

  // Criar membership do owner
  await prisma.userConversationMembership.create({
    data: {
      conversationId,
      userId,
      role: 'OWNER',
      canWrite: true,
      canInvite: true,
      canModerate: true
    }
  });

  return true;
}
```

## Tarefas de Implementação

### Backend
- [ ] Atualizar `createConversationSchema` com campos multi-user
- [ ] Modificar `conversationService.createConversation()` para aceitar configs
- [ ] Criar membership do owner quando `isMultiUser: true`
- [ ] (Opcional) Adicionar `upgradeToMultiUser()` no service

### Frontend
- [ ] Modificar `NewConversationModal` com toggle e settings
- [ ] Criar/importar componente `Switch`
- [ ] Adicionar traduções
- [ ] Validações de formulário
- [ ] (Opcional) Botão de upgrade em settings

### Testes
- [ ] Criar conversa single-user (valores padrão)
- [ ] Criar conversa multi-user com configs custom
- [ ] Validar que single-user não pode ter maxUsers > 1
- [ ] Validar limites de maxUsers (2-4)
- [ ] (Opcional) Testar upgrade de single para multi

## Edge Cases

1. **Criar multi-user sem participants**: Permitido, adiciona depois
2. **maxUsers < número de participants**: Não permitir
3. **Mudar maxUsers depois de criado**: Permitir via settings, mas não abaixo do número atual de membros

## Estimativa

- **Esforço**: 1 dia
- **Complexidade**: Baixa
- **ROI**: Alto (UX essencial para multi-user)

---

**Origem**: Necessidade de criar conversas multi-user diretamente via UI (2025-11-24)
