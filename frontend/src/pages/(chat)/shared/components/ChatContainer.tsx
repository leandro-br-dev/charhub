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
import { useMembersQuery } from '../hooks/useMembership';
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
  if (participant.userId) {
    const user = participant.user;
    const name =
      user?.displayName || `User ${participant.userId.slice(0, 4)}`;
    return {
      id: participant.id,
      actorId: participant.userId,
      actorType: 'USER',
      representation: {
        name,
        avatar: user?.avatarUrl || null,
      },
      raw: participant,
    };
  }

  if (participant.actingCharacterId) {
    const character = participant.actingCharacter;
    const name = character
      ? character.lastName
        ? `${character.firstName} ${character.lastName}`
        : character.firstName
      : `Character ${participant.actingCharacterId.slice(0, 4)}`;
    return {
      id: participant.id,
      actorId: participant.actingCharacterId,
      actorType: 'CHARACTER',
      representation: {
        name,
        avatar: character?.images?.[0]?.url || null,
      },
      raw: participant,
    };
  }

  if (participant.actingAssistantId) {
    const assistant = participant.actingAssistant;
    const persona = participant.representingCharacter;
    const name = persona?.firstName || assistant?.name || `Assistant ${participant.actingAssistantId.slice(0, 4)}`;
    const avatar = persona?.images?.[0]?.url || null;
    return {
      id: participant.id,
      actorId: participant.actingAssistantId,
      actorType: 'ASSISTANT',
      representation: {
        name,
        avatar,
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
  const membersQuery = useMembersQuery(conversationId);

  const conversation = conversationQuery.data ?? null;
  const messages = messagesQuery.data?.items ?? [];
  const members = membersQuery.data?.items ?? [];

  const processedParticipants = useMemo(() => {
    if (!conversation) return [];

    const mapped = mapParticipants(conversation.participants ?? []);

    const ensureParticipant = (
      actorId: string | undefined,
      name: string | undefined,
      avatar: string | null | undefined
    ) => {
      if (!actorId) return;
      const exists = mapped.some((participant) => participant.actorId === actorId);
      if (!exists) {
        mapped.push({
          id: `synthetic-${actorId}`,
          actorId,
          actorType: 'USER',
          representation: {
            name: name || `User ${actorId.slice(0, 4)}`,
            avatar: avatar ?? null,
          },
          raw: {
            id: `synthetic-${actorId}`,
            conversationId: conversation.id,
            userId: actorId,
          } as ConversationParticipant,
        });
      }
    };

    // Ensure owner is represented
    const ownerAvatar: string | undefined = conversation.owner?.avatarUrl ?? undefined;
    ensureParticipant(
      conversation.owner?.id,
      conversation.owner?.displayName ?? undefined,
      ownerAvatar
    );

    // Ensure current authenticated user is represented
    const currentUserAvatar: string | null | undefined = user?.photo;
    ensureParticipant(user?.id, user?.displayName ?? undefined, currentUserAvatar);

    // In multi-user conversations, ensure all members are represented
    if (conversation.isMultiUser && members.length > 0) {
      members.forEach((member) => {
        ensureParticipant(
          member.userId,
          member.user?.displayName ?? member.user?.username ?? undefined,
          member.user?.avatarUrl ?? undefined
        );
      });
    }

    return mapped;
  }, [conversation, user?.id, user?.displayName, user?.photo, members]);

  const currentUserRepresentation = useMemo(() => {
    return processedParticipants.find((participant) => participant.actorType === 'USER')
      ?.representation;
  }, [processedParticipants]);

  const assistantParticipantId = useMemo(() => {
    // Find first bot participant (assistant or character)
    return (conversation?.participants ?? []).find(
      (participant) => participant.actingAssistantId || participant.actingCharacterId
    )?.id;
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
      console.log('[ChatContainer] handleSendMessage called', {
        conversationId,
        content,
        socketIsConnected: socketState.isConnected,
        socketId: socketState.socketId
      });

      if (!conversationId) {
        console.warn('[ChatContainer] No conversationId, returning false');
        return false;
      }

      if (socketState.isConnected) {
        console.log('[ChatContainer] Using WebSocket to send message');
        try {
          const result = await socketState.sendMessage({
            conversationId,
            content,
            assistantParticipantId,
          });

          console.log('[ChatContainer] Message sent successfully via WebSocket', {
            messageId: result.message.id,
            respondingBots: result.respondingBots,
          });

          // The typing indicators are already being emitted by the backend
          // We just need to make sure we're listening to typing_start events
          // which is already handled in useChatSocket

          return true;
        } catch (error) {
          console.warn('[ChatContainer] WebSocket send failed, falling back to REST', error);
        }
      } else {
        console.log('[ChatContainer] WebSocket not connected, using REST fallback');
      }

      console.log('[ChatContainer] Using REST API fallback');
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

        // Extract more detailed error information
        const apiError = error && typeof error === 'object' && 'response' in error
          ? (error as any).response?.data
          : null;

        const errorMessage = apiError?.message ||
                             (error instanceof Error ? error.message : null) ||
                             t('errors.generateAiFailed', { defaultValue: 'Failed to generate response.' });

        console.error('[ChatContainer] Detailed error:', {
          message: errorMessage,
          status: (error as any).response?.status,
          data: apiError,
        });

        setManualError(errorMessage);
      }
    },
    [conversationId, queryClient, t]
  );

  const handleAddParticipant = useCallback(
    async (actorData: { type: string; id: string; defaultCharacterId?: string }) => {
      if (!conversationId) return;

      try {
        if (actorData.type === 'CHARACTER') {
          await chatService.addParticipant(conversationId, {
            actingCharacterId: actorData.id,
          });
        } else if (actorData.type === 'ASSISTANT') {
          await chatService.addParticipant(conversationId, {
            actingAssistantId: actorData.id,
            representingCharacterId: actorData.defaultCharacterId,
          });
        } else {
          throw new Error('Unsupported participant type.');
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
      if (!conversationId || !conversation) return;

      // Count bot participants (characters and assistants)
      const botParticipants = (conversation.participants ?? []).filter(
        p => p.actingCharacterId || p.actingAssistantId
      );

      // Check if trying to remove the last bot participant
      const participantToRemove = (conversation.participants ?? []).find(p => p.id === participantId);
      const isBot = participantToRemove?.actingCharacterId || participantToRemove?.actingAssistantId;

      if (isBot && botParticipants.length === 1) {
        setManualError(
          t('errors.cannotRemoveLastCharacter', {
            defaultValue: 'Cannot remove the last character from the conversation. At least one character or assistant must remain.'
          })
        );
        setTimeout(() => setManualError(null), 5000); // Clear error after 5 seconds
        return;
      }

      try {
        await chatService.removeParticipant(conversationId, participantId);
        await queryClient.invalidateQueries({ queryKey: conversationKeys.detail(conversationId) });
      } catch (error) {
        console.error('[ChatContainer] Error removing participant:', error);
        setManualError(t('errors.removeParticipantFailed', { defaultValue: 'Failed to remove participant.' }));
      }
    },
    [conversationId, conversation, queryClient, t]
  );

  const handleSaveConversationSettings = useCallback(
    async (
      convId: string,
      settingsData: Record<string, unknown>,
      visibility?: 'PRIVATE' | 'UNLISTED' | 'PUBLIC',
      multiUserSettings?: {
        isMultiUser: boolean;
        maxUsers: number;
        allowUserInvites: boolean;
        requireApproval: boolean;
      }
    ) => {
      try {
        const updated = await chatService.updateConversationSettings(
          convId,
          settingsData,
          visibility,
          multiUserSettings
        );
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

  const handleRequestSuggestion = useCallback(async (): Promise<string | null> => {
    if (!conversationId) return null;

    try {
      const result = await chatService.suggestReply(conversationId);
      return result.suggestion;
    } catch (error) {
      console.error('[ChatContainer] Error getting suggestion:', error);
      setManualError(t('errors.suggestionFailed', { defaultValue: 'Failed to generate reply suggestion.' }));
      return null;
    }
  }, [conversationId, t]);

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

      if (!conversationId) {
        console.error('[ChatContainer] No conversationId available');
        return;
      }

      try {
        const messages = messagesQuery.data?.items || [];
        
        if (isUserMessage) {
          // For user messages: delete subsequent messages and regenerate AI response
          const messageIndex = messages.findIndex(m => m.id === messageId);
          if (messageIndex === -1) {
            console.error('[ChatContainer] User message not found for reprocessing:', messageId);
            setManualError('Message not found');
            return;
          }

          // Find the first message after the user's message to delete
          const subsequentMessage = messages[messageIndex + 1];
          if (subsequentMessage) {
            // This will cascade-delete all messages after this point
            await handleDeleteMessage(subsequentMessage.id);
          }
          
          // Now, trigger a new AI response based on the original context
          await handleGenerateAI(assistantParticipantId);

        } else {
          // For bot messages: delete the message itself and all subsequent, then regenerate
          const targetMessage = messages.find(m => m.id === messageId);
          if (!targetMessage) {
            console.error('[ChatContainer] Bot message not found for reprocessing:', messageId);
            setManualError('Message not found');
            return;
          }
          
          // This will cascade-delete the bot message and everything after it
          await handleDeleteMessage(messageId);
          
          // Trigger a new AI response
          await handleGenerateAI(assistantParticipantId);
        }
      } catch (error) {
        console.error('[ChatContainer] Error reprocessing message:', error);
        setManualError(
          t('errors.updateFailed', {
            defaultValue: 'Failed to regenerate message.',
          })
        );
      }
    },
    [assistantParticipantId, conversationId, messagesQuery.data, handleDeleteMessage, handleGenerateAI, t]
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
      onlineUsers={socketState.onlineUsers}
      isMemoryCompressing={socketState.isMemoryCompressing}
      activeBackgroundTasks={{}}
      playingAudioState={{ messageId: null, isLoading: false, error: null, audioDataUrl: null }}
      audioCache={{}}
      onSendMessage={handleSendMessage}
      onAddParticipant={handleAddParticipant}
      onRemoveParticipant={handleRemoveParticipant}
      onConfigureParticipant={async (participantId: string, data: any) => {
        try {
          if (!conversationId) return false;

          const payload: { configOverride?: string | null; representingCharacterId?: string | null } = {};
          if (typeof data.config_override !== 'undefined') {
            payload.configOverride = data.config_override;
          }
          if (typeof data.representing_character_id !== 'undefined') {
            payload.representingCharacterId = data.representing_character_id;
          }

          await chatService.updateParticipant(conversationId, participantId, payload);
          await queryClient.invalidateQueries({ queryKey: conversationKeys.detail(conversationId) });
          return true;
        } catch (error) {
          console.error('[ChatContainer] Error updating participant configuration:', error);
          setManualError(t('errors.updateConversationFailed', { defaultValue: 'Failed to update conversation.' }));
          return false;
        }
      }}
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
      onRequestSuggestion={handleRequestSuggestion}
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
