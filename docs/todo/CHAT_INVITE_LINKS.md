# Sistema de Links de Convite para Chat (Solução Imediata)

> **Status**: Pronto para implementação
> **Prioridade**: Alta
> **Complexidade**: Baixa
> **Dependências**: Multi-User Chat (Fase 4) - JÁ IMPLEMENTADO
> **Última atualização**: 2025-11-24

## Visão Geral

Sistema de links compartilháveis para convites de chat multi-user. Permite que o dono/moderador de uma conversa gere um link que pode ser compartilhado com outros usuários para juntarem-se à conversa.

## Motivação

Atualmente, quando um usuário é "convidado" via `inviteUser()`:
- ✅ Membership é criado no banco
- ❌ Usuário convidado não sabe que foi convidado
- ❌ Usuário não tem forma de acessar a conversa

**Solução**: Link compartilhável que aceita convite e redireciona para o chat.

## Fluxo de Uso

```
1. João cria conversa multi-user "RPG Adventure"
2. João clica em "Share Invite Link"
3. Modal exibe link: https://dev.charhub.app/chat/abc123/join?token=xyz789
4. João copia e compartilha com Maria (WhatsApp, Discord, etc)
5. Maria clica no link
6. Sistema valida token, adiciona Maria como membro
7. Maria é redirecionada para /chat/abc123
8. Maria começa a participar do chat
```

## Backend Implementation

### 1. Gerar Token de Convite

```typescript
// backend/src/services/membershipService.ts

interface InviteToken {
  conversationId: string;
  inviterId: string;
  expiresAt: number; // Unix timestamp
}

async generateInviteLink(conversationId: string, inviterId: string): Promise<string> {
  // Verificar permissão
  const hasPermission = await this.canInvite(conversationId, inviterId);
  if (!hasPermission) {
    throw new Error('You do not have permission to invite users');
  }

  // Buscar conversa
  const conversation = await prisma.conversation.findUnique({
    where: { id: conversationId }
  });

  if (!conversation) {
    throw new Error('Conversation not found');
  }

  if (!conversation.isMultiUser) {
    throw new Error('Only multi-user conversations support invite links');
  }

  // Gerar JWT token (válido por 7 dias)
  const payload: InviteToken = {
    conversationId,
    inviterId,
    expiresAt: Date.now() + (7 * 24 * 60 * 60 * 1000) // 7 dias
  };

  const token = jwt.sign(payload, process.env.JWT_SECRET!, {
    expiresIn: '7d'
  });

  // Retornar link completo
  const baseUrl = process.env.FRONTEND_URL || 'https://dev.charhub.app';
  return `${baseUrl}/chat/${conversationId}/join?token=${token}`;
}
```

### 2. Validar e Aceitar Convite

```typescript
// backend/src/services/membershipService.ts

async acceptInviteByToken(token: string, userId: string) {
  // Verificar e decodificar token
  let payload: InviteToken;
  try {
    payload = jwt.verify(token, process.env.JWT_SECRET!) as InviteToken;
  } catch (error) {
    throw new Error('Invalid or expired invite link');
  }

  const { conversationId, inviterId } = payload;

  // Verificar se conversa ainda existe
  const conversation = await prisma.conversation.findUnique({
    where: { id: conversationId },
    include: { members: { where: { isActive: true } } }
  });

  if (!conversation) {
    throw new Error('Conversation not found');
  }

  // Verificar se já é membro
  const existingMembership = await prisma.userConversationMembership.findUnique({
    where: {
      conversationId_userId: { conversationId, userId }
    }
  });

  if (existingMembership?.isActive) {
    // Já é membro ativo, apenas retornar sucesso
    return {
      success: true,
      message: 'You are already a member of this conversation',
      conversationId
    };
  }

  // Verificar limite de usuários
  if (conversation.members.length >= conversation.maxUsers) {
    throw new Error(`Conversation has reached maximum users (${conversation.maxUsers})`);
  }

  // Criar ou reativar membership
  if (existingMembership && !existingMembership.isActive) {
    // Reativar
    await prisma.userConversationMembership.update({
      where: { id: existingMembership.id },
      data: {
        isActive: true,
        invitedBy: inviterId
      }
    });
  } else {
    // Criar novo
    await prisma.userConversationMembership.create({
      data: {
        conversationId,
        userId,
        invitedBy: inviterId,
        role: 'MEMBER',
        canWrite: true,
        canInvite: conversation.allowUserInvites,
        canModerate: false
      }
    });
  }

  return {
    success: true,
    message: 'Successfully joined conversation',
    conversationId
  };
}
```

### 3. Rotas REST

```typescript
// backend/src/routes/v1/memberships.ts

/**
 * POST /api/v1/conversations/:conversationId/members/generate-invite-link
 * Gera link de convite compartilhável
 */
router.post('/:conversationId/members/generate-invite-link', requireAuth, async (req, res) => {
  try {
    const { conversationId } = req.params;
    const inviterId = req.auth?.user?.id;

    if (!inviterId) {
      return res.status(401).json({
        success: false,
        message: 'Authentication required'
      });
    }

    const link = await membershipService.generateInviteLink(conversationId, inviterId);

    return res.json({
      success: true,
      data: { link }
    });
  } catch (error) {
    if (error instanceof Error) {
      logger.error({ error, conversationId: req.params.conversationId }, 'Error generating invite link');
      return res.status(400).json({
        success: false,
        message: error.message
      });
    }

    logger.error({ error }, 'Unknown error generating invite link');
    return res.status(500).json({
      success: false,
      message: 'Failed to generate invite link'
    });
  }
});

/**
 * POST /api/v1/conversations/:conversationId/members/join-by-token
 * Aceita convite via token JWT
 */
router.post('/:conversationId/members/join-by-token', requireAuth, async (req, res) => {
  try {
    const { conversationId } = req.params;
    const userId = req.auth?.user?.id;
    const { token } = req.body;

    if (!userId) {
      return res.status(401).json({
        success: false,
        message: 'Authentication required'
      });
    }

    if (!token) {
      return res.status(400).json({
        success: false,
        message: 'Token is required'
      });
    }

    const result = await membershipService.acceptInviteByToken(token, userId);

    return res.json({
      success: true,
      data: result
    });
  } catch (error) {
    if (error instanceof Error) {
      logger.error({ error, conversationId: req.params.conversationId }, 'Error accepting invite');
      return res.status(400).json({
        success: false,
        message: error.message
      });
    }

    logger.error({ error }, 'Unknown error accepting invite');
    return res.status(500).json({
      success: false,
      message: 'Failed to accept invite'
    });
  }
});
```

## Frontend Implementation

### 1. Modal de Compartilhar Link

```tsx
// frontend/src/pages/(chat)/shared/components/ShareInviteLinkModal.tsx

interface ShareInviteLinkModalProps {
  isOpen: boolean;
  onClose: () => void;
  conversationId: string;
}

export const ShareInviteLinkModal: React.FC<ShareInviteLinkModalProps> = ({
  isOpen,
  onClose,
  conversationId
}) => {
  const { t } = useTranslation('chat');
  const [loading, setLoading] = useState(false);
  const [link, setLink] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (isOpen && !link) {
      generateLink();
    }
  }, [isOpen]);

  const generateLink = async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await api.post(
        `/api/v1/conversations/${conversationId}/members/generate-invite-link`
      );
      setLink(response.data.data.link);
    } catch (err) {
      setError(t('shareInvite.generateFailed'));
    } finally {
      setLoading(false);
    }
  };

  const copyToClipboard = () => {
    if (link) {
      navigator.clipboard.writeText(link);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={t('shareInvite.title')} size="md">
      <div className="space-y-4">
        <p className="text-sm text-muted">
          {t('shareInvite.description')}
        </p>

        {loading && (
          <div className="flex justify-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
          </div>
        )}

        {error && (
          <div className="text-danger text-sm text-center p-2 bg-danger/10 rounded">
            {error}
          </div>
        )}

        {link && (
          <>
            <div className="flex gap-2">
              <Input
                type="text"
                value={link}
                readOnly
                className="flex-grow font-mono text-sm"
              />
              <Button
                variant="primary"
                icon={copied ? "check" : "content_copy"}
                onClick={copyToClipboard}
              >
                {copied ? t('shareInvite.copied') : t('shareInvite.copy')}
              </Button>
            </div>

            <p className="text-xs text-muted">
              {t('shareInvite.expiresIn', { days: 7 })}
            </p>
          </>
        )}
      </div>
    </Modal>
  );
};
```

### 2. Botão de Compartilhar no Header

```tsx
// Em ChatView.tsx, adicionar botão ao lado de settings

{conversation?.isMultiUser && (
  <Button
    variant="light"
    size="small"
    icon="share"
    onClick={openShareInviteLinkModal}
    title={t('shareInvite.title')}
    className="p-2 flex-shrink-0"
    disabled={actionLoading || loadingConversationData}
  />
)}
```

### 3. Página de Aceitar Convite

```tsx
// frontend/src/pages/(chat)/join/index.tsx

export const JoinChatPage: React.FC = () => {
  const { conversationId } = useParams();
  const navigate = useNavigate();
  const { t } = useTranslation('chat');
  const [searchParams] = useSearchParams();
  const token = searchParams.get('token');

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!token) {
      setError(t('joinChat.invalidLink'));
      setLoading(false);
      return;
    }

    acceptInvite();
  }, [token]);

  const acceptInvite = async () => {
    try {
      await api.post(
        `/api/v1/conversations/${conversationId}/members/join-by-token`,
        { token }
      );

      // Redirecionar para o chat
      navigate(`/chat/${conversationId}`, { replace: true });
    } catch (err: any) {
      const message = err.response?.data?.message || t('joinChat.failed');
      setError(message);
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mb-4"></div>
        <p className="text-lg">{t('joinChat.accepting')}</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center h-screen">
        <span className="material-symbols-outlined text-6xl text-danger mb-4">error</span>
        <h1 className="text-2xl font-bold mb-2">{t('joinChat.errorTitle')}</h1>
        <p className="text-muted mb-4">{error}</p>
        <Button onClick={() => navigate('/')}>{t('joinChat.goHome')}</Button>
      </div>
    );
  }

  return null;
};
```

### 4. Rota no Router

```tsx
// Em routes.tsx
{
  path: '/chat/:conversationId/join',
  element: <JoinChatPage />
}
```

## Traduções

```json
// backend/translations/_source/chat.json

"shareInvite": {
  "title": "Share Invite Link",
  "description": "Anyone with this link can join the conversation.",
  "generateFailed": "Failed to generate invite link. Please try again.",
  "copy": "Copy Link",
  "copied": "Copied!",
  "expiresIn": "Link expires in {{days}} days"
},
"joinChat": {
  "accepting": "Joining conversation...",
  "invalidLink": "Invalid or missing invite link",
  "failed": "Failed to join conversation",
  "errorTitle": "Unable to Join",
  "goHome": "Go to Home"
}
```

## Tarefas de Implementação

### Backend
- [ ] Adicionar `generateInviteLink()` em `membershipService.ts`
- [ ] Adicionar `acceptInviteByToken()` em `membershipService.ts`
- [ ] Criar rota `POST /:conversationId/members/generate-invite-link`
- [ ] Criar rota `POST /:conversationId/members/join-by-token`
- [ ] Adicionar `canInvite()` helper no membershipService

### Frontend
- [ ] Criar `ShareInviteLinkModal.tsx`
- [ ] Adicionar botão "Share" no header do chat (multi-user only)
- [ ] Criar página `JoinChatPage.tsx` em `/chat/:id/join`
- [ ] Adicionar rota no router
- [ ] Adicionar traduções
- [ ] Hook `useChatModalsManager` - adicionar `openShareInviteLinkModal`

### Testes
- [ ] Testar geração de link
- [ ] Testar aceitar convite válido
- [ ] Testar token expirado
- [ ] Testar conversa cheia (max users)
- [ ] Testar usuário já membro

## Melhorias Futuras

1. **Contador de usos**: Rastrear quantas pessoas usaram cada link
2. **Links de uso único**: Opção de criar link que expira após 1 uso
3. **Revogar links**: Permitir invalidar links antigos
4. **QR Code**: Gerar QR code do link para compartilhamento fácil
5. **Preview da conversa**: Mostrar detalhes antes de aceitar convite

## Segurança

1. **JWT expiration**: Links expiram em 7 dias
2. **Verificação de limite**: Não permite exceder `maxUsers`
3. **Verificação de permissão**: Só owners/mods podem gerar links
4. **Token único por geração**: Cada geração cria novo token
5. **HTTPS only**: Links só funcionam em HTTPS

## Estimativa

- **Esforço**: 1-2 dias
- **Complexidade**: Baixa
- **ROI**: Muito Alto (solução imediata para convites)

---

**Origem**: Solução imediata para convites de chat multi-user (2025-11-24)
