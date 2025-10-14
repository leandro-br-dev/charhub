import { useCallback, useMemo, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useQueryClient } from '@tanstack/react-query';

import ChatView from './ChatView';
import { useAuth } from '../../../../hooks/useAuth';
import { useChatSocket } from '../../../../hooks/useChatSocket';
import {
  conversationKeys,
  useConversationQuery,
} from '../hooks/useConversations';
import {
  messageKeys,
  useMessagesQuery,
} from '../hooks/useMessages';
import { chatService } from '../../../../services/chatService';
import type { ConversationParticipant, Message } from '../../../../types/chat';

interface ProcessedParticipant {
  id: string;
  actorId: string;
  actorType: 'USER' | 'CHARACTER' | 'ASSISTANT';
  representation: {
    name: string;
    avatar?: string | null;
  };
  raw: ConversationParticipant;
}

function buildParticipantRepresentation(
  participant: ConversationParticipant
): ProcessedParticipant | null {
  if (participant.userId && participant.user) {
    return {
      id: participant.id,
      actorId: participant.userId,
      actorType: 'USER',
      representation: {
        name: participant.user.displayName || `User ${participant.userId.slice(0, 4)}`,
        avatar: participant.user.avatarUrl,
      },
      raw: participant,
    };
  }

  if (participant.actingCharacterId && participant.actingCharacter) {
    const character = participant.actingCharacter;
    return {
      id: participant.id,
      actorId: participant.actingCharacterId,
      actorType: 'CHARACTER',
      representation: {
        name: character.lastName
          ? `${character.firstName} ${character.lastName}`
          : character.firstName,
        avatar: character.avatar,
      },
      raw: participant,
    };
  }

  if (participant.actingAssistantId && participant.actingAssistant) {
    const assistant = participant.actingAssistant;
    const persona = participant.representingCharacter;
    return {
      id: participant.id,
      actorId: participant.actingAssistantId,
      actorType: 'ASSISTANT',
      representation: {
        name: persona?.firstName || assistant.name,
        avatar: persona?.avatar,
      },
      raw: participant,
    };
  }

  return null;
}

function mapParticipants(participants: ConversationParticipant[]): ProcessedParticipant[] {
  return participants
    .map((participant) => buildParticipantRepresentation(participant))
    .filter((value): value is ProcessedParticipant => Boolean(value));
}

function appendMessageToCache(
  queryClient: ReturnType<typeof useQueryClient>,
  conversationId: string,
  message: Message
) {
  const key = messageKeys.list(conversationId);
  queryClient.setQueryData<{ items: Message[]; total: number }>(key, (previous) => {
    if (!previous) {
      return { items: [message], total: 1 };
    }

    const alreadyExists = previous.items.some((item) => item.id === message.id);
    if (alreadyExists) {
      return previous;
    }

    return {
      items: [...previous.items, message],
      total: previous.total + 1,
    };
  });

  queryClient.invalidateQueries({ queryKey: conversationKeys.lists() });
  queryClient.invalidateQueries({ queryKey: conversationKeys.detail(conversationId) });
}

function removeMessageFromCache(
  queryClient: ReturnType<typeof useQueryClient>,
  conversationId: string,
  messageId: string
) {
  const key = messageKeys.list(conversationId);
  queryClient.setQueryData<{ items: Message[]; total: number }>(key, (previous) => {
    if (!previous) {
      return previous;
    }

    const filtered = previous.items.filter((item) => item.id !== messageId);
    if (filtered.length === previous.items.length) {
      return previous;
    }

    return {
      items: filtered,
      total: Math.max(previous.total - 1, 0),
    };
  });

  queryClient.invalidateQueries({ queryKey: conversationKeys.lists() });
  queryClient.invalidateQueries({ queryKey: conversationKeys.detail(conversationId) });
}

const ChatContainer = () => {
  const { conversationId } = useParams<{ conversationId: string }>();
  const navigate = useNavigate();
  const { t } = useTranslation('chat');
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const [manualError, setManualError] = useState<string | null>(null);

  const conversationQuery = useConversationQuery(conversationId || null);
  const messagesQuery = useMessagesQuery(conversationId || null);

  const conversation = conversationQuery.data ?? null;
  const messages = messagesQuery.data?.items ?? [];

  const processedParticipants = useMemo(() => {
    if (!conversation) return [];
    return mapParticipants(conversation.participants);
  }, [conversation]);

  const currentUserRepresentation = useMemo(() => {
    return processedParticipants.find((participant) => participant.actorType === 'USER')
      ?.representation;
  }, [processedParticipants]);

  const assistantParticipantId = useMemo(() => {
    return conversation?.participants.find((participant) => participant.actingAssistantId)?.id;
  }, [conversation]);

  const socketState = useChatSocket({
    conversationId: conversationId || null,
    currentUserId: user?.id || null,
  });

  const connectionError = manualError || socketState.connectionError || null;

  const getSenderDetailsAndParticipantId = useCallback(
    (senderId: string) => {
      const participant = processedParticipants.find(
        (entry) => entry.actorId === senderId || entry.id === senderId
      );

      if (!participant) return null;
      return {
        representation: participant.representation,
        participantId: participant.id,
      };
    },
    [processedParticipants]
  );

  const handleSendMessage = useCallback(
    async (content: string): Promise<boolean> => {
      if (!conversationId) {
        return false;
      }

      if (socketState.isConnected) {
        try {
          await socketState.sendMessage({
            conversationId,
            content,
            assistantParticipantId,
          });
          return true;
        } catch (error) {
          console.warn('[ChatContainer] WebSocket send failed, falling back to REST', error);
        }
      }

      try {
        const message = await chatService.sendMessage({ conversationId, content });
        appendMessageToCache(queryClient, conversationId, message);
        return true;
      } catch (error) {
        console.error('[ChatContainer] Error sending message via REST:', error);
        setManualError(t('errors.sendMessageFailed', { defaultValue: 'Failed to send message.' }));
        return false;
      }
    },
    [assistantParticipantId, conversationId, queryClient, socketState, t]
  );

  const handleDeleteMessage = useCallback(
    async (messageId: string) => {
      if (!conversationId) return;

      try {
        await chatService.deleteMessage(conversationId, messageId);
        removeMessageFromCache(queryClient, conversationId, messageId);
      } catch (error) {
        console.error('[ChatContainer] Error deleting message:', error);
        setManualError(t('errors.deleteMessageFailed', { defaultValue: 'Failed to delete message.' }));
      }
    },
    [conversationId, queryClient, t]
  );

  const handleGenerateAI = useCallback(
    async (participantId: string) => {
      if (!conversationId) return;

      try {
        const message = await chatService.generateAIResponse(conversationId, { participantId });
        appendMessageToCache(queryClient, conversationId, message);
      } catch (error) {
        console.error('[ChatContainer] Error generating AI response:', error);
        setManualError(t('errors.generateAiFailed', { defaultValue: 'Failed to generate response.' }));
      }
    },
    [conversationId, queryClient, t]
  );

  const handleAddParticipant = useCallback(
    async (actorData: { type: string; id: string }) => {
      if (!conversationId) return;

      try {
        if (actorData.type === 'CHARACTER') {
          await chatService.addParticipant(conversationId, {
            actingCharacterId: actorData.id,
          });
        } else {
          throw new Error('Only character participants are supported right now.');
        }

        await queryClient.invalidateQueries({ queryKey: conversationKeys.detail(conversationId) });
      } catch (error) {
        console.error('[ChatContainer] Error adding participant:', error);
        setManualError(t('errors.addParticipantFailed', { defaultValue: 'Failed to add participant.' }));
      }
    },
    [conversationId, queryClient, t]
  );

  const handleRemoveParticipant = useCallback(
    async (participantId: string) => {
      if (!conversationId) return;

      try {
        await chatService.removeParticipant(conversationId, participantId);
        await queryClient.invalidateQueries({ queryKey: conversationKeys.detail(conversationId) });
      } catch (error) {
        console.error('[ChatContainer] Error removing participant:', error);
        setManualError(t('errors.removeParticipantFailed', { defaultValue: 'Failed to remove participant.' }));
      }
    },
    [conversationId, queryClient, t]
  );

  const handleSaveConversationSettings = useCallback(
    async (convId: string, settingsData: Record<string, unknown>) => {
      try {
        const updated = await chatService.updateConversationSettings(convId, settingsData);
        queryClient.setQueryData(conversationKeys.detail(convId), updated);
        return true;
      } catch (error) {
        console.error('[ChatContainer] Error updating settings:', error);
        setManualError(t('errors.updateConversationFailed', { defaultValue: 'Failed to update conversation.' }));
        return false;
      }
    },
    [queryClient, t]
  );

  const handleEditMessage = useCallback(async () => {
    console.warn('[ChatContainer] Edit message is not implemented yet.');
    return false;
  }, []);

  const handleReprocessMessage = useCallback(
    async (messageId: string, isUserMessage: boolean) => {
      if (!assistantParticipantId) {
        setManualError(
          t('errors.reprocessNotAvailable', {
            defaultValue: 'Reprocessing is not available without an assistant participant.',
          })
        );
        return;
      }

      await handleGenerateAI(assistantParticipantId);
    },
    [assistantParticipantId, handleGenerateAI, t]
  );

  const handleSendConfirmation = useCallback(
    async (content: string) => {
      return handleSendMessage(content);
    },
    [handleSendMessage]
  );

  const handleNavigateBack = useCallback(() => {
    navigate('/chat');
  }, [navigate]);

  if (conversationQuery.isError && !conversation) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-center">
          <p className="text-lg text-danger font-semibold mb-4">
            {t('errors.loadConversationFailed', { defaultValue: 'Failed to load conversation.' })}
          </p>
          <button
            className="px-4 py-2 bg-primary text-white rounded-lg"
            onClick={handleNavigateBack}
          >
            {t('actions.goBack', { defaultValue: 'Back to conversations' })}
          </button>
        </div>
      </div>
    );
  }

  const loadingConversationData = conversationQuery.isLoading || messagesQuery.isLoading;
  const actionLoading = socketState.isConnected === false && loadingConversationData;

  return (
    <ChatView
      userId={user?.id || ''}
      conversation={conversation}
      messages={messages}
      processedParticipants={processedParticipants}
      currentUserRepresentation={currentUserRepresentation}
      actionLoading={actionLoading}
      uiError={connectionError}
      loadingConversationData={loadingConversationData}
      isWebSocketConnected={socketState.isConnected}
      typingCharacters={socketState.typingParticipants}
      activeBackgroundTasks={{}}
      playingAudioState={{ messageId: null, isLoading: false, error: null, audioDataUrl: null }}
      audioCache={{}}
      onSendMessage={handleSendMessage}
      onAddParticipant={handleAddParticipant}
      onRemoveParticipant={handleRemoveParticipant}
      onConfigureParticipant={async () => false}
      onDeleteMessage={handleDeleteMessage}
      onEditMessage={handleEditMessage}
      onReprocessMessage={handleReprocessMessage}
      onRequestImageGeneration={() => {
        setManualError(
          t('errors.imageGenerationUnavailable', {
            defaultValue: 'Image generation is not available yet.',
          })
        );
      }}
      onCloneAssistant={() => {
        setManualError(
          t('errors.cloneAssistantUnavailable', {
            defaultValue: 'Assistant cloning is not available yet.',
          })
        );
      }}
      onPromoteCharacter={() => {
        setManualError(
          t('errors.promoteCharacterUnavailable', {
            defaultValue: 'Character promotion is not available yet.',
          })
        );
      }}
      onPlayAudioRequest={() => {
        setManualError(
          t('errors.audioPlaybackUnavailable', {
            defaultValue: 'Audio playback is not available yet.',
          })
        );
      }}
      onSaveConversationSettings={handleSaveConversationSettings}
      getSenderDetailsAndParticipantId={getSenderDetailsAndParticipantId}
      onSendConfirmation={handleSendConfirmation}
      onReviewFileClick={() => {
        setManualError(
          t('errors.reviewFileUnavailable', {
            defaultValue: 'File review is not available yet.',
          })
        );
      }}
    />
  );
};

export default ChatContainer;
