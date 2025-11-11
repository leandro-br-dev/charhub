import { useCallback } from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { HorizontalScroller, Avatar } from '../../../components/ui';
import { useConversationListQuery } from '../../(chat)/shared/hooks/useConversations';
import type { Conversation, ConversationParticipant } from '../../../types/chat';

interface RecentConversationsProps {
  limit?: number;
  wrap?: boolean; // when true, render as wrapped grid instead of horizontal scroller
}

export function RecentConversations({ limit = 8, wrap = false }: RecentConversationsProps) {
  const { t, i18n } = useTranslation(['common', 'dashboard']);
  const { data, isLoading } = useConversationListQuery({
    limit,
    sortBy: 'lastMessageAt',
    sortOrder: 'desc',
  });
  const conversations = (data?.items ?? []) as Conversation[];

  const formatTimestamp = useCallback(
    (timestamp?: string | null) => {
      if (!timestamp) return '';
      const date = new Date(timestamp);
      return date.toLocaleString(i18n.language, {
        day: '2-digit',
        month: '2-digit',
        hour: '2-digit',
        minute: '2-digit',
      });
    },
    [i18n.language]
  );

  if (isLoading) return null;

  if (conversations.length === 0) return null;

  if (wrap) {
    return (
      <section>
        <h2 className="mb-3 text-lg font-semibold text-title">
          {t('dashboard:recentConversations')}
        </h2>
        <div className="flex flex-wrap gap-4">
          {conversations.map((conv) => {
            // Prefer representingCharacter, fallback to actingCharacter or assistant avatar/name
            const pickDisplay = (p: ConversationParticipant) =>
              p.representingCharacter || p.actingCharacter || p.actingAssistant || null;

            const mainParticipant = conv.participants?.map(pickDisplay).find(Boolean) as any;
            const otherParticipants = (conv.participants || [])
              .map(pickDisplay)
              .filter(Boolean)
              .slice(1, 3) as any[];

            return (
              <Link
                to={`/chat/${conv.id}`}
                key={conv.id}
                className="block bg-light rounded-lg shadow-md hover:shadow-xl transition-shadow min-h-[18rem] h-full flex flex-col group basis-[calc(50%-0.5rem)] sm:w-[180px] md:w-[192px] lg:w-[192px] max-w-[192px] overflow-hidden"
              >
                <div className="relative h-40">
                  <img
                    src={mainParticipant?.avatar || '/placeholder-character.png'}
                    alt={mainParticipant?.firstName || mainParticipant?.name || t('common:character')}
                    className="w-full h-full object-cover rounded-t-lg transition-transform duration-300 group-hover:scale-105"
                  />
                  {otherParticipants && otherParticipants.length > 0 && (
                    <div className="absolute bottom-2 right-2 flex items-center space-x-[-10px]">
                      {otherParticipants.map((p: any, idx: number) => (
                        <Avatar
                          key={idx}
                          src={p.avatar}
                          alt={p.firstName || p.name || t('common:character')}
                          size="small"
                          className="border-2 border-light"
                        />
                      ))}
                    </div>
                  )}
                </div>
                <div className="p-4 flex-grow flex flex-col justify-between">
                  <h3 className="font-semibold text-content truncate text-base">
                    {conv.title || t('dashboard:newConversation')}
                  </h3>
                  <p className="text-xs text-muted text-right mt-2">
                    {formatTimestamp(conv.lastMessageAt)}
                  </p>
                </div>
              </Link>
            );
          })}
        </div>
      </section>
    );
  }

  return (
    <HorizontalScroller
      title={t('dashboard:recentConversations')}
      cardType="vertical"
      itemClassName="w-[180px] max-w-[180px] flex-none"
    >
      {conversations.map((conv) => {
        // Prefer representingCharacter, fallback to actingCharacter or assistant avatar/name
        const pickDisplay = (p: ConversationParticipant) =>
          p.representingCharacter || p.actingCharacter || p.actingAssistant || null;

        const mainParticipant = conv.participants?.map(pickDisplay).find(Boolean) as any;
        const otherParticipants = (conv.participants || [])
          .map(pickDisplay)
          .filter(Boolean)
          .slice(1, 3) as any[];

        return (
          <Link
            to={`/chat/${conv.id}`}
            key={conv.id}
            className="block bg-light rounded-lg shadow-md hover:shadow-xl transition-shadow h-full flex flex-col group w-[180px] max-w-[180px]"
          >
            <div className="relative h-40">
              <img
                src={mainParticipant?.avatar || '/placeholder-character.png'}
                alt={mainParticipant?.firstName || mainParticipant?.name || t('common:character')}
                className="w-full h-full object-cover rounded-t-lg transition-transform duration-300 group-hover:scale-105"
              />
              {otherParticipants && otherParticipants.length > 0 && (
                <div className="absolute bottom-2 right-2 flex items-center space-x-[-10px]">
                  {otherParticipants.map((p: any, idx: number) => (
                    <Avatar
                      key={idx}
                      src={p.avatar}
                      alt={p.firstName || p.name || t('common:character')}
                      size="small"
                      className="border-2 border-light"
                    />
                  ))}
                </div>
              )}
            </div>
            <div className="p-4 flex-grow flex flex-col justify-between">
              <h3 className="font-semibold text-content truncate text-base">
                {conv.title || t('dashboard:newConversation')}
              </h3>
              <p className="text-xs text-muted text-right mt-2">
                {formatTimestamp(conv.lastMessageAt)}
              </p>
            </div>
          </Link>
        );
      })}
    </HorizontalScroller>
  );
}
