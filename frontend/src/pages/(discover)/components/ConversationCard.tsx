import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Users, MessageCircle, Clock } from 'lucide-react';
import { CachedImage } from '../../../components/ui/CachedImage';
import type { PublicConversation } from '../services/discoverService';

interface ConversationCardProps {
  conversation: PublicConversation;
  onWatch?: (conversationId: string) => void;
  onJoin?: (conversationId: string) => void;
}

export function ConversationCard({ conversation, onWatch, onJoin }: ConversationCardProps): JSX.Element {
  const { t } = useTranslation(['discover', 'common']);
  const navigate = useNavigate();

  // Get primary character (first character from participants)
  const primaryCharacter = conversation.participants.find(
    (p) => p.actingCharacter || p.representingCharacter
  );
  const character = primaryCharacter?.actingCharacter || primaryCharacter?.representingCharacter;
  const characterName = character ?
    (character.lastName ? `${character.firstName} ${character.lastName}` : character.firstName)
    : '';
  const characterAvatar = character?.images?.[0]?.url;

  // Format last message time
  const formatLastMessageTime = (timestamp: string | null): string => {
    if (!timestamp) return t('discover:noMessages');

    const date = new Date(timestamp);
    const now = new Date();
    const diffInSeconds = Math.floor((now.getTime() - date.getTime()) / 1000);

    if (diffInSeconds < 60) return t('discover:justNow');
    if (diffInSeconds < 3600) return t('discover:minutesAgo', { count: Math.floor(diffInSeconds / 60) });
    if (diffInSeconds < 86400) return t('discover:hoursAgo', { count: Math.floor(diffInSeconds / 3600) });
    return t('discover:daysAgo', { count: Math.floor(diffInSeconds / 86400) });
  };

  // Get latest message preview
  const latestMessage = conversation.latestMessages[0];
  const messagePreview = latestMessage
    ? latestMessage.content.substring(0, 80) + (latestMessage.content.length > 80 ? '...' : '')
    : t('discover:noMessages');

  // Determine if user can join (multi-user and has slots available)
  const canJoin = conversation.isMultiUser && conversation.memberCount < conversation.maxUsers;

  const handleCardClick = () => {
    if (onWatch) {
      onWatch(conversation.id);
    } else {
      // Default: navigate to watch mode (read-only)
      navigate(`/chat/${conversation.id}?mode=watch`);
    }
  };

  const handleJoinClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (onJoin) {
      onJoin(conversation.id);
    } else {
      navigate(`/chat/join/${conversation.id}`);
    }
  };

  return (
    <div
      className="relative flex flex-col bg-light rounded-lg border border-border overflow-hidden cursor-pointer hover:border-primary transition-colors"
      onClick={handleCardClick}
    >
      {/* Character Avatar Section */}
      <div className="relative h-48 bg-gradient-to-b from-dark to-light">
        {characterAvatar ? (
          <CachedImage
            src={characterAvatar}
            alt={characterName}
            className="w-full h-full object-cover"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center">
            <MessageCircle className="w-16 h-16 text-muted" />
          </div>
        )}

        {/* Online Users Badge */}
        {conversation.onlineCount > 0 && (
          <div className="absolute top-2 right-2 flex items-center gap-1 px-2 py-1 bg-success/90 rounded-full text-xs font-medium text-white">
            <div className="w-2 h-2 bg-white rounded-full animate-pulse" />
            {conversation.onlineCount} {t('discover:online')}
          </div>
        )}

        {/* Multi-User Badge */}
        {conversation.isMultiUser && (
          <div className="absolute top-2 left-2 flex items-center gap-1 px-2 py-1 bg-primary/90 rounded-full text-xs font-medium text-black">
            <Users className="w-3 h-3" />
            {conversation.memberCount}/{conversation.maxUsers}
          </div>
        )}
      </div>

      {/* Content Section */}
      <div className="flex flex-col p-4 gap-3 flex-1">
        {/* Title */}
        <h3 className="text-lg font-semibold text-title line-clamp-1">
          {conversation.title}
        </h3>

        {/* Character Name */}
        {character && (
          <p className="text-sm text-muted">
            {t('discover:withCharacter', { name: characterName })}
          </p>
        )}

        {/* Latest Message Preview */}
        <p className="text-sm text-content line-clamp-2 min-h-[2.5rem]">
          {messagePreview}
        </p>

        {/* Metadata */}
        <div className="flex items-center gap-4 text-xs text-muted mt-auto">
          <div className="flex items-center gap-1">
            <Clock className="w-3 h-3" />
            {formatLastMessageTime(conversation.lastMessageAt)}
          </div>
          <div className="flex items-center gap-1">
            <MessageCircle className="w-3 h-3" />
            {conversation.latestMessages.length} {t('discover:messages')}
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex gap-2 mt-2">
          <button
            onClick={handleCardClick}
            className="flex-1 px-4 py-2 bg-dark text-content rounded-lg hover:bg-darker transition-colors text-sm font-medium"
          >
            {t('discover:watch')}
          </button>

          {canJoin && (
            <button
              onClick={handleJoinClick}
              className="flex-1 px-4 py-2 bg-primary text-black rounded-lg hover:bg-primary/80 transition-colors text-sm font-medium"
            >
              {t('discover:join')}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
