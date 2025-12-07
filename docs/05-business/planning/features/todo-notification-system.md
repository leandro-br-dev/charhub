# Sistema de Notificações e Inbox

> **Status**: Planejamento
> **Prioridade**: Média-Alta
> **Complexidade**: Alta
> **Dependências**: Multi-User Chat (Fase 4)
> **Última atualização**: 2025-11-24

## Visão Geral

Sistema centralizado de notificações e mensagens do sistema, permitindo que usuários recebam:
- Convites para conversas multi-user
- Notificações do sistema (updates, alertas)
- Futuro: Mensagens diretas, menções, etc.

## Motivação

Atualmente, convites para conversas são criados no banco mas o usuário não é notificado. O sistema precisa de uma forma centralizada de comunicação com usuários.

## Objetivos

1. **Inbox centralizado** - Caixa de entrada única para todas notificações
2. **Notificações em tempo real** - WebSocket para alertas instantâneos
3. **Histórico persistente** - Guardar notificações antigas
4. **Ações diretas** - Accept/Reject/Dismiss inline
5. **Suporte a múltiplos tipos** - Extensível para novos tipos de notificação

## Schema Changes

### Modelo Principal

```prisma
model Notification {
  id          String            @id @default(uuid())
  userId      String
  user        User              @relation(fields: [userId], references: [id], onDelete: Cascade)

  type        NotificationType
  priority    NotificationPriority @default(NORMAL)

  title       String
  message     String?           @db.Text
  metadata    Json?             // Dados específicos por tipo

  actionUrl   String?           // Link para ação (opcional)
  actionLabel String?           // Label do botão de ação

  read        Boolean           @default(false)
  readAt      DateTime?

  dismissed   Boolean           @default(false)
  dismissedAt DateTime?

  expiresAt   DateTime?         // Notificações temporárias
  createdAt   DateTime          @default(now())

  @@index([userId, createdAt(sort: Desc)])
  @@index([userId, read])
}

enum NotificationType {
  SYSTEM              // Mensagens do sistema
  CHAT_INVITE         // Convite para conversa
  CHAT_MENTION        // Menção em conversa
  CHAT_MESSAGE        // Nova mensagem em conversa seguida
  FRIEND_REQUEST      // Pedido de amizade (futuro)
  DIRECT_MESSAGE      // Mensagem direta (futuro)
  ACHIEVEMENT         // Conquista desbloqueada (futuro)
  SUBSCRIPTION        // Mudanças em assinatura
}

enum NotificationPriority {
  LOW
  NORMAL
  HIGH
  URGENT
}
```

### Preferências de Notificação

```prisma
model UserNotificationPreferences {
  id                    String   @id @default(uuid())
  userId                String   @unique
  user                  User     @relation(fields: [userId], references: [id], onDelete: Cascade)

  // Preferências por tipo
  enableChatInvites     Boolean  @default(true)
  enableChatMentions    Boolean  @default(true)
  enableChatMessages    Boolean  @default(true)
  enableSystemMessages  Boolean  @default(true)

  // Canais de notificação
  emailNotifications    Boolean  @default(false)
  pushNotifications     Boolean  @default(false)  // Para PWA futuro

  createdAt             DateTime @default(now())
  updatedAt             DateTime @updatedAt
}
```

## Backend Implementation

### notificationService.ts

```typescript
interface CreateNotificationParams {
  userId: string;
  type: NotificationType;
  title: string;
  message?: string;
  metadata?: Record<string, any>;
  actionUrl?: string;
  actionLabel?: string;
  priority?: NotificationPriority;
  expiresAt?: Date;
}

class NotificationService {
  // Criar notificação
  async create(params: CreateNotificationParams): Promise<Notification>

  // Listar notificações do usuário (com paginação)
  async list(userId: string, options: {
    unreadOnly?: boolean;
    type?: NotificationType;
    limit?: number;
    offset?: number;
  }): Promise<{ items: Notification[]; total: number }>

  // Marcar como lida
  async markAsRead(notificationId: string, userId: string): Promise<void>

  // Marcar todas como lidas
  async markAllAsRead(userId: string): Promise<void>

  // Descartar notificação
  async dismiss(notificationId: string, userId: string): Promise<void>

  // Contar não lidas
  async getUnreadCount(userId: string): Promise<number>

  // Limpar expiradas
  async cleanupExpired(): Promise<number>

  // Helpers para tipos específicos
  async createChatInvite(params: {
    userId: string;
    conversationId: string;
    conversationTitle: string;
    inviterId: string;
    inviterName: string;
  }): Promise<Notification>
}
```

### WebSocket Events

```typescript
// Servidor → Cliente
{
  event: 'notification_new',
  data: {
    notification: Notification,
    unreadCount: number
  }
}

{
  event: 'notification_read',
  data: {
    notificationId: string,
    unreadCount: number
  }
}

// Cliente → Servidor
{
  event: 'notification_mark_read',
  data: { notificationId: string }
}
```

### Rotas REST

```
GET    /api/v1/notifications                 # Listar notificações
GET    /api/v1/notifications/unread/count    # Contador de não lidas
POST   /api/v1/notifications/:id/read        # Marcar como lida
POST   /api/v1/notifications/read-all        # Marcar todas como lidas
DELETE /api/v1/notifications/:id             # Descartar notificação
GET    /api/v1/notifications/preferences     # Preferências
PATCH  /api/v1/notifications/preferences     # Atualizar preferências
```

### Integração com Chat Invites

Quando usuário é convidado para chat:

```typescript
// Em membershipService.inviteUser()
const notification = await notificationService.createChatInvite({
  userId: invitedUserId,
  conversationId,
  conversationTitle: conversation.title || 'Untitled Chat',
  inviterId,
  inviterName: inviter.displayName || inviter.username || 'Someone'
});

// Enviar via WebSocket
socketService.emitToUser(invitedUserId, 'notification_new', {
  notification,
  unreadCount: await notificationService.getUnreadCount(invitedUserId)
});
```

## Frontend Implementation

### useNotifications Hook

```typescript
export function useNotifications() {
  const { data, refetch } = useQuery({
    queryKey: ['notifications'],
    queryFn: async () => {
      const response = await api.get('/api/v1/notifications');
      return response.data.data;
    },
    refetchInterval: 30000, // Poll a cada 30s como fallback
  });

  const { data: unreadCount } = useQuery({
    queryKey: ['notifications', 'unread-count'],
    queryFn: async () => {
      const response = await api.get('/api/v1/notifications/unread/count');
      return response.data.count;
    },
    refetchInterval: 10000,
  });

  // WebSocket listener
  useEffect(() => {
    socket.on('notification_new', (data) => {
      queryClient.invalidateQueries(['notifications']);
      queryClient.setQueryData(['notifications', 'unread-count'], data.unreadCount);

      // Mostrar toast
      toast.info(data.notification.title);
    });

    return () => {
      socket.off('notification_new');
    };
  }, []);

  const markAsRead = useMutation({
    mutationFn: (id: string) => api.post(`/api/v1/notifications/${id}/read`),
    onSuccess: () => {
      queryClient.invalidateQueries(['notifications']);
    }
  });

  return {
    notifications: data?.items || [],
    unreadCount: unreadCount || 0,
    markAsRead,
    refetch
  };
}
```

### NotificationBell Component

```tsx
export const NotificationBell: React.FC = () => {
  const { unreadCount } = useNotifications();
  const [isOpen, setIsOpen] = useState(false);

  return (
    <div className="relative">
      <button onClick={() => setIsOpen(!isOpen)}>
        <span className="material-symbols-outlined">notifications</span>
        {unreadCount > 0 && (
          <span className="absolute -top-1 -right-1 bg-danger text-white rounded-full text-xs w-5 h-5 flex items-center justify-center">
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
        )}
      </button>

      {isOpen && <NotificationDropdown onClose={() => setIsOpen(false)} />}
    </div>
  );
};
```

### NotificationDropdown Component

```tsx
export const NotificationDropdown: React.FC<{ onClose: () => void }> = ({ onClose }) => {
  const { notifications, markAsRead } = useNotifications();

  return (
    <div className="absolute right-0 mt-2 w-96 bg-normal shadow-lg rounded-lg max-h-96 overflow-y-auto">
      <div className="p-4 border-b">
        <h3 className="font-semibold">Notifications</h3>
      </div>

      {notifications.length === 0 ? (
        <div className="p-4 text-center text-muted">
          No notifications
        </div>
      ) : (
        <ul>
          {notifications.map((notification) => (
            <NotificationItem
              key={notification.id}
              notification={notification}
              onRead={() => markAsRead.mutate(notification.id)}
            />
          ))}
        </ul>
      )}
    </div>
  );
};
```

### NotificationItem Component

```tsx
const NotificationItem: React.FC<{
  notification: Notification;
  onRead: () => void;
}> = ({ notification, onRead }) => {
  const navigate = useNavigate();

  const handleClick = () => {
    if (!notification.read) {
      onRead();
    }

    if (notification.actionUrl) {
      navigate(notification.actionUrl);
    }
  };

  return (
    <li
      className={`p-4 border-b cursor-pointer hover:bg-light ${
        !notification.read ? 'bg-primary/5' : ''
      }`}
      onClick={handleClick}
    >
      <div className="flex items-start gap-3">
        <NotificationIcon type={notification.type} priority={notification.priority} />
        <div className="flex-1">
          <p className="font-medium">{notification.title}</p>
          {notification.message && (
            <p className="text-sm text-muted mt-1">{notification.message}</p>
          )}
          <p className="text-xs text-muted mt-1">
            {formatDistanceToNow(new Date(notification.createdAt), { addSuffix: true })}
          </p>
        </div>
        {!notification.read && (
          <div className="w-2 h-2 bg-primary rounded-full mt-2"></div>
        )}
      </div>
    </li>
  );
};
```

## Casos de Uso Específicos

### 1. Convite para Chat Multi-User

**Quando**: Usuário é convidado via `inviteUser()`

**Notificação**:
```json
{
  "type": "CHAT_INVITE",
  "title": "Chat Invite from João",
  "message": "You've been invited to join 'RPG Adventure Group'",
  "actionUrl": "/chat/abc123/join?token=xyz",
  "actionLabel": "Join Chat",
  "metadata": {
    "conversationId": "abc123",
    "inviterId": "user456",
    "inviterName": "João"
  }
}
```

**Ação**: Clicar abre página de aceitar convite

### 2. Menção em Chat

**Quando**: Usuário é mencionado com @username

**Notificação**:
```json
{
  "type": "CHAT_MENTION",
  "title": "Maria mentioned you",
  "message": "In 'Project Discussion': @you what do you think?",
  "actionUrl": "/chat/xyz789#message-123",
  "actionLabel": "View Message"
}
```

### 3. Notificação do Sistema

**Quando**: Manutenção, novos recursos, etc.

**Notificação**:
```json
{
  "type": "SYSTEM",
  "priority": "HIGH",
  "title": "New Feature: Voice Messages!",
  "message": "You can now send voice messages in chats. Try it out!",
  "actionUrl": "/changelog",
  "actionLabel": "Learn More",
  "expiresAt": "2025-12-31T23:59:59Z"
}
```

## UI/UX Considerations

### Posicionamento
- Badge no header (ao lado do avatar do usuário)
- Contador de não lidas sempre visível
- Dropdown expansível ao clicar

### Estados
- **Não lida**: Fundo destacado + dot azul
- **Lida**: Fundo normal
- **Descartada**: Removida da lista

### Agrupamento
- Por dia (Hoje, Ontem, Esta semana, Mais antigas)
- Por tipo (opcional, via filtros)

### Paginação
- Carrega 20 inicialmente
- Infinite scroll ou "Load More"

## Performance Considerations

### Backend
- **Índices**: `userId` + `createdAt` para queries rápidas
- **Cleanup job**: BullMQ job diário para deletar notificações expiradas
- **Rate limiting**: Limitar criação de notificações (anti-spam)

### Frontend
- **WebSocket preferred**: Menos polling, mais eficiente
- **Polling fallback**: A cada 30s se WebSocket falhar
- **Cache**: React Query com staleTime adequado
- **Optimistic updates**: Marcar como lida instantaneamente

## Security Considerations

1. **Autorização**: Usuário só pode ver suas próprias notificações
2. **XSS**: Sanitizar conteúdo de `title` e `message`
3. **Token validation**: Links de convite devem usar JWT com expiração
4. **Rate limiting**: Prevenir spam de notificações

## Testing Strategy

### Unit Tests
- `notificationService.create()`
- `notificationService.markAsRead()`
- Cleanup de expiradas

### Integration Tests
- Criar convite → gera notificação
- WebSocket entrega notificação
- Marcar como lida via API

### E2E Tests
- Fluxo completo de convite
- Badge atualiza contador
- Click navega para ação

## Migration Path

### Fase 1: Core Infrastructure
1. Criar schema de notificações
2. Implementar `notificationService`
3. Rotas REST básicas
4. WebSocket events

### Fase 2: UI Components
1. `NotificationBell` no header
2. `NotificationDropdown`
3. `NotificationItem`

### Fase 3: Integration
1. Integrar com chat invites
2. Notificações do sistema
3. Preferências de usuário

### Fase 4: Advanced Features
1. Notificações de menções
2. Email notifications
3. Push notifications (PWA)

## Estimativa

- **Esforço total**: 2-3 semanas
- **Complexidade**: Alta
- **ROI**: Muito Alto (funcionalidade essencial)

## Dependências

- Multi-User Chat (para convites)
- WebSocket infrastructure (já existe)
- BullMQ (para cleanup jobs)

## Próximos Passos

1. Aprovar spec
2. Criar migration manual (seguir `CLAUDE.md`)
3. Implementar `notificationService`
4. Criar rotas REST
5. Implementar componentes UI
6. Integrar com chat invites
7. Testes e deploy

---

**Referências**:
- `docs/features/MULTI_USER_CHAT_DETAILED.md` - Spec de multi-user
- `docs/todo/CHAT_IMPROVEMENTS.md` - Melhorias de chat
- Discord, Slack - Referências de UX

---

**Origem**: Planejamento para suportar convites de chat multi-user (2025-11-24)
