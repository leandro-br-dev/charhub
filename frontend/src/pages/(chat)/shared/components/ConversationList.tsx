import { useTranslation } from 'react-i18next';
import { Avatar } from '@/components/ui';
import type { Conversation } from '@/types/chat';

export interface ConversationListProps {
  conversations: Conversation[];
  activeConversationId?: string | null;
  onConversationClick: (conversationId: string) => void;
  onNewConversation?: () => void;
  loading?: boolean;
  className?: string;
}

export const ConversationList = ({
  conversations,
  activeConversationId,
  onConversationClick,
  onNewConversation,
  loading = false,
  className = '',
}: ConversationListProps) => {
  const { t } = useTranslation('chat');

  /**
   * Get display info for a conversation (first participant's avatar and name)
   */
  const getConversationDisplayInfo = (conversation: Conversation) => {
    const firstParticipant = conversation.participants[0];

    if (!firstParticipant) {
      return {
        name: conversation.title,
        avatar: null,
      };
    }

    let name = conversation.title;
    let avatar: string | null = null;

    if (firstParticipant.actingCharacter) {
      const char = firstParticipant.actingCharacter;
      name = char.lastName ? `${char.firstName} ${char.lastName}` : char.firstName;
      avatar = char.avatar;
    } else if (firstParticipant.actingAssistant) {
      name = firstParticipant.actingAssistant.name;
      avatar = firstParticipant.actingAssistant.avatar || null;
    } else if (firstParticipant.user) {
      name = firstParticipant.user.displayName || t('participant.user');
      avatar = firstParticipant.user.avatarUrl;
    }

    return { name, avatar };
  };

  /**
   * Get last message preview
   */
  const getLastMessagePreview = (conversation: Conversation): string => {
    if (!conversation.messages || conversation.messages.length === 0) {
      return t('conversation.noMessages');
    }

    const lastMessage = conversation.messages[conversation.messages.length - 1];
    const preview = lastMessage.content.substring(0, 60);
    return preview.length < lastMessage.content.length ? `${preview}...` : preview;
  };

  /**
   * Format last message time
   */
  const formatLastMessageTime = (conversation: Conversation): string | null => {
    if (!conversation.lastMessageAt) return null;

    const date = new Date(conversation.lastMessageAt);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMins / 60);
    const diffDays = Math.floor(diffHours / 24);

    if (diffMins < 1) return t('conversation.justNow', { defaultValue: 'Just now' });
    if (diffMins < 60) return t('conversation.minutesAgo', { defaultValue: `${diffMins}m`, count: diffMins });
    if (diffHours < 24) return t('conversation.hoursAgo', { defaultValue: `${diffHours}h`, count: diffHours });
    if (diffDays < 7) return t('conversation.daysAgo', { defaultValue: `${diffDays}d`, count: diffDays });

    return date.toLocaleDateString();
  };

  if (loading) {
    return (
      <div className={`flex items-center justify-center p-4 ${className}`}>
        <span className="text-muted">{t('loading')}</span>
      </div>
    );
  }

  return (
    <div className={`flex flex-col ${className}`}>
      {/* New conversation button */}
      {onNewConversation && (
        <button
          onClick={onNewConversation}
          className="flex items-center gap-3 p-3 mb-2 rounded-lg bg-primary/10 hover:bg-primary/20 text-primary transition-colors duration-200"
        >
          <span className="material-symbols-outlined">add_circle</span>
          <span className="font-medium">{t('newConversation')}</span>
        </button>
      )}

      {/* Conversations list */}
      {conversations.length === 0 ? (
        <div className="text-center p-6 text-muted">
          <p>{t('noConversations')}</p>
          {onNewConversation && (
            <p className="text-sm mt-2">{t('createFirst')}</p>
          )}
        </div>
      ) : (
        <div className="flex flex-col gap-1">
          {conversations.map((conversation) => {
            const { name, avatar } = getConversationDisplayInfo(conversation);
            const lastMessagePreview = getLastMessagePreview(conversation);
            const lastMessageTime = formatLastMessageTime(conversation);
            const isActive = conversation.id === activeConversationId;

            return (
              <button
                key={conversation.id}
                onClick={() => onConversationClick(conversation.id)}
                className={`flex items-start gap-3 p-3 rounded-lg transition-colors duration-200 text-left ${
                  isActive
                    ? 'bg-primary/10 border-l-4 border-primary'
                    : 'hover:bg-light border-l-4 border-transparent'
                }`}
              >
                {/* Avatar */}
                <Avatar src={avatar} alt={name} size="small" />

                {/* Conversation info */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between mb-1">
                    <h3 className="font-medium text-content truncate">{conversation.title}</h3>
                    {lastMessageTime && (
                      <span className="text-xs text-muted flex-shrink-0 ml-2">
                        {lastMessageTime}
                      </span>
                    )}
                  </div>
                  <p className="text-sm text-muted truncate">{lastMessagePreview}</p>
                  {conversation.participants.length > 1 && (
                    <div className="flex items-center mt-1 text-xs text-muted">
                      <span className="material-symbols-outlined text-sm mr-1">group</span>
                      <span>{conversation.participants.length} {t('conversation.participants')}</span>
                    </div>
                  )}
                </div>
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
};
