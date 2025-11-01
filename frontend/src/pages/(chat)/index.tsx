import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useConversationListQuery } from './shared/hooks/useConversations';
import { ConversationList } from './shared/components';
import { useAuth } from '../../hooks/useAuth';
import { usePageHeader } from '../../hooks/usePageHeader';

export default function ChatIndexPage() {
  const { t } = useTranslation('chat');
  const navigate = useNavigate();
  const { user } = useAuth();
  const { setTitle } = usePageHeader();

  const { data: conversationsData, isLoading } = useConversationListQuery();

  const conversations = conversationsData?.items || [];

  const handleConversationClick = (conversationId: string) => {
    navigate(`/chat/${conversationId}`);
  };

  const handleNewConversation = () => {
    navigate('/chat/new');
  };

  // Set page title
  useEffect(() => {
    setTitle(t('title'));
  }, [setTitle, t]);

  return (
    <div className="flex flex-col h-full">
      <div className="p-6 border-b border-normal">
        <h1 className="text-2xl font-bold text-content">{t('title')}</h1>
        <p className="text-sm text-muted mt-1">
          {t('conversations', { defaultValue: 'Conversations' })}
        </p>
      </div>

      <div className="flex-1 overflow-y-auto p-4">
        <ConversationList
          conversations={conversations}
          onConversationClick={handleConversationClick}
          onNewConversation={handleNewConversation}
          loading={isLoading}
        />
      </div>
    </div>
  );
}
