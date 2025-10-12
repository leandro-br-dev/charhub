import { useParams, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useState } from 'react';
import { useConversationQuery, useConversationMutations } from '../shared/hooks/useConversations';
import { useMessagesQuery, useMessageMutations } from '../shared/hooks/useMessages';
import { ConversationHeader, MessageList, MessageInput } from '../shared/components';
import { useAuth } from '@/hooks/useAuth';

export default function ConversationDetailPage() {
  const { conversationId } = useParams<{ conversationId: string }>();
  const navigate = useNavigate();
  const { t } = useTranslation('chat');
  const { user } = useAuth();

  const [typingParticipants] = useState<Set<string>>(new Set()); // Will be populated by WebSocket in Phase 2.4

  // Queries
  const { data: conversation, isLoading: conversationLoading } = useConversationQuery(conversationId || null);
  const { data: messagesData, isLoading: messagesLoading } = useMessagesQuery(conversationId || null);

  // Mutations
  const { updateTitle, delete: deleteConversation } = useConversationMutations();
  const { send: sendMessage, delete: deleteMessage } = useMessageMutations(conversationId || '');

  if (!conversationId) {
    return (
      <div className="flex items-center justify-center h-full">
        <p className="text-muted">{t('errors.notFound')}</p>
      </div>
    );
  }

  if (conversationLoading) {
    return (
      <div className="flex items-center justify-center h-full">
        <p className="text-muted">{t('loading')}</p>
      </div>
    );
  }

  if (!conversation) {
    return (
      <div className="flex flex-col items-center justify-center h-full gap-4">
        <p className="text-muted">{t('errors.notFound')}</p>
        <button
          onClick={() => navigate('/chat')}
          className="px-4 py-2 bg-primary text-white rounded-lg hover:opacity-90 transition-opacity"
        >
          {t('actions.close', { defaultValue: 'Back to conversations' })}
        </button>
      </div>
    );
  }

  const messages = messagesData?.items || [];

  const handleSendMessage = async (content: string): Promise<boolean> => {
    try {
      await sendMessage.mutateAsync({
        content,
        conversationId: conversation.id,
      });
      return true;
    } catch (error) {
      console.error('[ConversationDetail] Error sending message:', error);
      return false;
    }
  };

  const handleTitleEdit = async (newTitle: string) => {
    try {
      await updateTitle.mutateAsync({
        conversationId: conversation.id,
        title: newTitle,
      });
    } catch (error) {
      console.error('[ConversationDetail] Error updating title:', error);
    }
  };

  const handleDeleteConversation = async () => {
    if (!window.confirm(t('conversation.confirmDelete', { defaultValue: 'Are you sure you want to delete this conversation?' }))) {
      return;
    }

    try {
      await deleteConversation.mutateAsync(conversation.id);
      navigate('/chat');
    } catch (error) {
      console.error('[ConversationDetail] Error deleting conversation:', error);
    }
  };

  const handleDeleteMessage = async (messageId: string) => {
    try {
      await deleteMessage.mutateAsync(messageId);
    } catch (error) {
      console.error('[ConversationDetail] Error deleting message:', error);
    }
  };

  const handleEditMessage = async (messageId: string, newContent: string): Promise<boolean> => {
    // TODO: Implement message edit in Phase 2.4
    console.log('[ConversationDetail] Edit message not implemented yet:', messageId, newContent);
    return false;
  };

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <ConversationHeader
        conversation={conversation}
        onTitleEdit={handleTitleEdit}
        onDelete={handleDeleteConversation}
        className="group"
      />

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4">
        <MessageList
          messages={messages}
          participants={conversation.participants}
          currentUserId={user?.id || ''}
          loading={messagesLoading}
          typingParticipants={typingParticipants}
          onDeleteMessage={handleDeleteMessage}
          onEditMessage={handleEditMessage}
        />
      </div>

      {/* Input */}
      <div className="border-t border-normal p-4">
        <MessageInput
          user={{
            name: user?.displayName || user?.email || t('message.you'),
            avatar: user?.photo,
          }}
          onSendMessage={handleSendMessage}
          disabled={sendMessage.isPending}
        />
      </div>
    </div>
  );
}
