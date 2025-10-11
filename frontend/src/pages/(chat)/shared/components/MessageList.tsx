import { useEffect, useRef, type ReactNode } from 'react';
import { useTranslation } from 'react-i18next';
import { MessageBubble } from './MessageBubble';
import { TypingIndicator } from './TypingIndicator';
import type { Message, ConversationParticipant } from '@/types/chat';

export interface MessageListProps {
  messages: Message[];
  participants: ConversationParticipant[];
  currentUserId: string;
  loading?: boolean;
  error?: string | null;
  typingParticipants?: Set<string>; // Set of participant IDs currently typing
  className?: string;
  onAvatarClick?: (participant: ConversationParticipant) => void;
  onDeleteMessage?: (messageId: string) => void;
  onEditMessage?: (messageId: string, newContent: string) => Promise<boolean>;
}

export const MessageList = ({
  messages = [],
  participants = [],
  currentUserId,
  loading = false,
  error = null,
  typingParticipants = new Set(),
  className = '',
  onAvatarClick,
  onDeleteMessage,
  onEditMessage,
}: MessageListProps) => {
  const { t } = useTranslation('chat');
  const scrollRef = useRef<HTMLDivElement>(null);

  // Auto-scroll to bottom when messages or typing indicators change
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollIntoView({ behavior: 'smooth', block: 'end' });
    }
  }, [messages, typingParticipants]);

  /**
   * Get sender details for a message
   */
  const getSenderInfo = (message: Message) => {
    let participantId: string | null = null;
    let name = t('message.system'); // Default for SYSTEM messages
    let avatar: string | null = null;

    if (message.senderType === 'USER') {
      // For USER messages, check if it's the current user
      if (message.senderId === currentUserId) {
        name = t('message.you');
      } else {
        // Find user participant
        const participant = participants.find(
          (p) => p.userId === message.senderId
        );
        if (participant) {
          participantId = participant.id;
          name = participant.user?.name || t('message.you');
          avatar = participant.user?.avatar || null;
        }
      }
    } else if (message.senderType === 'CHARACTER') {
      // Find character participant
      const participant = participants.find(
        (p) => p.actingCharacterId === message.senderId
      );
      if (participant) {
        participantId = participant.id;
        name = participant.actingCharacter?.name || t('participant.character');
        avatar = participant.actingCharacter?.avatar || null;
      }
    } else if (message.senderType === 'ASSISTANT') {
      // Find assistant participant
      const participant = participants.find(
        (p) => p.actingAssistantId === message.senderId
      );
      if (participant) {
        participantId = participant.id;
        name = participant.actingAssistant?.name || t('participant.assistant');
        avatar = participant.actingAssistant?.avatar || null;
      }
    }

    return { participantId, name, avatar };
  };

  /**
   * Get typing participants data
   */
  const typingParticipantsData = Array.from(typingParticipants)
    .map((participantId) => {
      const participant = participants.find((p) => p.id === participantId);
      if (!participant) return null;

      let name = '';
      let avatar: string | null = null;

      if (participant.actingCharacter) {
        name = participant.actingCharacter.name;
        avatar = participant.actingCharacter.avatar;
      } else if (participant.actingAssistant) {
        name = participant.actingAssistant.name;
        avatar = participant.actingAssistant.avatar;
      } else if (participant.user) {
        name = participant.user.name || t('message.you');
        avatar = participant.user.avatar;
      }

      return { participantId, name, avatar };
    })
    .filter((data): data is NonNullable<typeof data> => data !== null);

  return (
    <div className={`flex flex-col overflow-x-hidden ${className}`}>
      {/* Loading state */}
      {loading && (
        <div className="text-center text-muted p-4">
          {t('loading')}
        </div>
      )}

      {/* Error state */}
      {error && (
        <div className="text-center text-danger p-4">{error}</div>
      )}

      {/* Messages */}
      {messages.map((message) => {
        const { participantId, name, avatar } = getSenderInfo(message);
        const isSentByUser = message.senderType === 'USER' && message.senderId === currentUserId;
        const participant = participantId ? participants.find((p) => p.id === participantId) : null;

        return (
          <MessageBubble
            key={message.id}
            message={message}
            isSentByUser={isSentByUser}
            senderName={name}
            senderAvatar={avatar}
            onAvatarClick={participant && onAvatarClick ? () => onAvatarClick(participant) : undefined}
            onDelete={onDeleteMessage}
            onEdit={onEditMessage}
          />
        );
      })}

      {/* Typing indicators */}
      {typingParticipantsData.map((data) => (
        <TypingIndicator key={data.participantId} avatar={data.avatar} name={data.name} />
      ))}

      {/* Auto-scroll anchor */}
      <div ref={scrollRef} style={{ height: '1px' }} />
    </div>
  );
};
