// frontend/src/pages/(chat)/shared/components/MessageList.tsx
import React, { useEffect, useRef, useMemo } from "react";
import { useTranslation } from 'react-i18next';

import MessageItem from './MessageItem';
import { TypingIndicator } from './TypingIndicator';
import { CachedImage } from '../../../../components/ui/CachedImage';
import type { Message } from '../../../../types/chat';
import { SenderType } from '../../../../types/chat';

interface BackgroundTaskIndicatorProps {
  name?: string;
  taskType?: string;
  avatar?: string | null;
}

const BackgroundTaskIndicator: React.FC<BackgroundTaskIndicatorProps> = ({
  name,
  taskType,
  avatar,
}) => (
  <div className="flex items-center gap-2 text-xs text-muted">
    {avatar ? (
      <span className="inline-flex h-6 w-6 items-center justify-center overflow-hidden rounded-full bg-light text-[10px] text-muted">
        <CachedImage src={avatar} alt={name || 'Assistant'} className="h-full w-full object-cover" />
      </span>
    ) : null}
    <span>{name || 'Assistant'}</span>
    <span className="text-muted/70">•</span>
    <span>{taskType || 'Processing'}</span>
  </div>
);

const ImageMessageItem: React.FC<{ messageData?: any }> = ({ messageData }) => (
  <div className="text-sm text-muted italic">
    [Image message placeholder]
    {messageData?.content ? ` (${messageData.content.substring(0, 16)}…)` : ''}
  </div>
);

interface ProcessedParticipant {
  id: string;
  actorId: string;
  actorType: string;
  representation: {
    name?: string;
    avatar?: string | null;
  };
  [key: string]: unknown;
}

interface MessageListProps {
  messages?: Message[];
  loading?: boolean;
  error?: string | null;
  participants?: ProcessedParticipant[];
  userId?: string;
  typingCharacters?: Set<string>;
  activeBackgroundTasks?: Record<string, string>;
  className?: string;
  onAvatarClick?: (participant: any) => void;
  onDeleteClick?: (messageId: string) => void;
  onSaveEdit?: (messageId: string, content: string) => Promise<boolean>;
  onReprocessClick?: (messageId: string, isUserMessage: boolean) => void;
  getSenderDetailsAndParticipantId?: (
    senderId: string
  ) => {
    representation: { name?: string; avatar?: string | null };
    participantId: string | null;
  } | null;
  playingAudioState?: {
    messageId: string | null;
    isLoading: boolean;
    error: string | null;
    audioDataUrl: string | null;
  };
  onPlayAudioRequest?: (options: any) => void;
  audioCache?: Record<string, boolean>;
  onSendConfirmation?: (content: string) => Promise<boolean>;
  onReviewFileClick?: (file: any) => void;
}

// Componente espaçador invisível que ocupa o mesmo espaço do input fixo
const InputSpacer: React.FC = () => {
  return (
    <div className="w-full pointer-events-none" style={{ height: '200px' }} aria-hidden="true" />
  );
};

const MessageList: React.FC<MessageListProps> = ({
  messages = [],
  loading,
  error,
  participants,
  userId,
  typingCharacters,
  activeBackgroundTasks = {},
  className = "",
  onAvatarClick,
  onDeleteClick,
  onSaveEdit,
  onReprocessClick,
  getSenderDetailsAndParticipantId,
  playingAudioState,
  onPlayAudioRequest,
  audioCache = {},
  onSendConfirmation,
  onReviewFileClick,
}) => {
  const { t, i18n } = useTranslation('chat');
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollIntoView({ behavior: "smooth", block: "end" });
    }
  }, [messages, typingCharacters, activeBackgroundTasks]);

  const getDateKey = (ts: any): string => {
    const d = ts instanceof Date ? ts : new Date(ts);
    if (Number.isNaN(d.getTime())) return '';
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${y}-${m}-${day}`;
  };

  const formatDateLabel = (ts: any): string => {
    const d = ts instanceof Date ? ts : new Date(ts);
    if (Number.isNaN(d.getTime())) return '';
    return d.toLocaleDateString(i18n.language || undefined, {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
    });
  };

  const DateSeparator: React.FC<{ timestamp: any }> = ({ timestamp }) => (
    <div className="my-4 flex items-center justify-center text-xs text-muted relative">
      <div className="absolute left-0 right-0 h-px bg-border" />
      <span className="relative z-10 rounded-full border border-border bg-background px-2 py-0.5">
        {formatDateLabel(timestamp)}
      </span>
    </div>
  );

  const checkAndParseImageContent = (content: any) => {
    if (!content || typeof content !== "string") return null;
    try {
      if (content.trim().startsWith("{") && content.trim().endsWith("}")) {
        const parsed = JSON.parse(content);
        if (parsed && parsed.type === "image" && parsed.image_url)
          return parsed;
      }
    } catch (e) {}
    return null;
  };

  const currentlyTypingParticipantsData = useMemo(() => {
    if (!typingCharacters || typingCharacters.size === 0 || !Array.isArray(participants)) return [];
    const typingData: any[] = [];
    typingCharacters.forEach((participantId: any) => {
      // Try to find by participant ID first, then by actor ID (for backwards compatibility)
      const participantInfo = participants.find((p) => String(p.id) === String(participantId) || String(p.actorId) === String(participantId));
      if (participantInfo && participantInfo.representation) {
        const actorId = participantInfo.actorId || participantId;
        if (!activeBackgroundTasks[actorId]) {
          typingData.push({
            actorId: actorId,
            name: participantInfo.representation.name,
            avatar: participantInfo.representation.avatar,
          });
        }
      }
    });
    return typingData;
  }, [typingCharacters, participants, activeBackgroundTasks]);

  const participantsWithActiveTasksData = useMemo(() => {
    if (Object.keys(activeBackgroundTasks).length === 0 || !Array.isArray(participants)) return [];
    const taskDataArray: any[] = [];
    for (const [actorId, taskType] of Object.entries(activeBackgroundTasks)) {
      const participantInfo = participants.find((p) => String(p.actorId) === String(actorId));
      if (participantInfo && participantInfo.representation) {
        taskDataArray.push({
          actorId: actorId,
          name: participantInfo.representation.name,
          avatar: participantInfo.representation.avatar,
          taskType: taskType,
        });
      }
    }
    return taskDataArray;
  }, [activeBackgroundTasks, participants]);


  return (
    <div className={`flex flex-col overflow-x-hidden ${className}`}>
      {loading && <div className="text-center text-muted p-4">Carregando...</div>}
      {error && <div className="text-center text-danger p-4">{error}</div>}

      {Array.isArray(messages) &&
        messages.map((msg, index) => {
          // Insert a date separator when the date changes compared to previous message
          const currentKey = getDateKey(msg.timestamp);
          const prevKey = index > 0 ? getDateKey(messages[index - 1]?.timestamp) : null;
          const showDateSeparator = !prevKey || currentKey !== prevKey;
          const senderId = msg.senderId;
          const isSentByUser = msg.senderType === SenderType.USER && String(senderId) === String(userId);
          const key = msg.id || `message-${index}-${msg.timestamp || Date.now()}`;
          const senderInfo =
            typeof getSenderDetailsAndParticipantId === 'function'
              ? getSenderDetailsAndParticipantId(senderId)
              : null;
          const participantId = senderInfo?.participantId ?? null;
          const fallbackName = isSentByUser
            ? t('message.you', { defaultValue: 'You' })
            : t('unknownParticipant', {
                defaultValue: 'Unknown ({{id}})',
                id: String(senderId || '').substring(0, 4),
              });
          const senderDetails = {
            name: senderInfo?.representation?.name || fallbackName,
            avatar: senderInfo?.representation?.avatar ?? null,
          };

          const participantForThisMessage = Array.isArray(participants)
            ? participants.find((p) => p.id === participantId)
            : undefined;
          let imageContentData = null;
          if (msg.senderType !== SenderType.USER) {
            imageContentData = checkAndParseImageContent(msg.content);
          }
          const creditsConsumedForThisMessage = (msg as any).credits_consumed_for_message;
          const isLastMessage = index === messages.length - 1;
          const isThisMessagePlaying = playingAudioState?.messageId === msg.id && !!playingAudioState?.audioDataUrl;
          const isThisMessageLoadingAudio = playingAudioState?.messageId === msg.id && playingAudioState?.isLoading;
          const audioErrorForThisMessage = playingAudioState?.messageId === msg.id ? playingAudioState?.error : null;
          const isAudioCachedForThisMessage = !!audioCache[msg.id];

          const contentNode = imageContentData ? (
            <ImageMessageItem key={key} messageData={msg} />
          ) : (
            <MessageItem
              key={key}
              messageId={msg.id}
              message={msg.content}
              isSent={isSentByUser}
              sender={senderDetails}
              timestamp={msg.timestamp}
              senderType={msg.senderType}
              onAvatarClick={() => {
                if (participantForThisMessage && onAvatarClick) {
                  onAvatarClick(participantForThisMessage);
                }
              }}
              onDeleteRequest={onDeleteClick}
              onSaveEditRequest={onSaveEdit}
              onReprocessRequest={onReprocessClick}
              isPlayingAudio={isThisMessagePlaying}
              isAudioLoading={isThisMessageLoadingAudio}
              audioError={audioErrorForThisMessage}
              onPlayAudioRequest={onPlayAudioRequest}
              isAudioCached={isAudioCachedForThisMessage}
              creditsConsumed={creditsConsumedForThisMessage}
              onSendConfirmation={onSendConfirmation}
              isLastMessage={isLastMessage}
              onReviewFileClick={onReviewFileClick}
            />
          );

          return (
            <React.Fragment key={`wrap-${key}`}>
              {showDateSeparator && <DateSeparator timestamp={msg.timestamp} />}
              {contentNode}
            </React.Fragment>
          );
        })}

      {participantsWithActiveTasksData.map((taskData) => (
        <BackgroundTaskIndicator
          key={`task-${taskData.actorId}`}
          avatar={taskData.avatar}
          name={taskData.name}
          taskType={String(taskData.taskType)}
        />
      ))}
      {currentlyTypingParticipantsData.map((typingData) => (
        <TypingIndicator
          key={`typing-${typingData.actorId}`}
          avatar={typingData.avatar}
          name={typingData.name}
        />
      ))}

      {/* Espaçador invisível que ocupa o espaço do input fixo */}
      <InputSpacer />

      {/* Marcador de scroll - rola até aqui para manter a última mensagem visível */}
      <div ref={scrollRef} style={{ height: "1px" }} />
    </div>
  );
};

export default MessageList;
