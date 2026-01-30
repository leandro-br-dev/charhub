
// frontend/src/pages/(chat)/shared/components/MessageItem.tsx
import React, {
  useState,
  useEffect,
  useRef,
  memo,
  useCallback,
  useMemo,
} from "react";
import { useTranslation } from "react-i18next";
import { useToast } from '../../../../contexts/ToastContext';

import { Avatar } from '../../../../components/ui/Avatar';
import { Button } from '../../../../components/ui/Button';
import { Textarea } from '../../../../components/ui/Textarea';
import { MessageBubble } from './MessageBubble';
import { FormattedMessage } from '../../../../components/ui/FormattedMessage';
import { useMessageTranslations } from '../hooks/useMessageTranslations';

const isLikelyJson = (content: any) =>
  typeof content === "string" &&
  content.trim().startsWith("{") &&
  content.trim().endsWith("}");

interface MessageItemProps {
  messageId: string;
  message: string;
  isSent: boolean;
  sender: any;
  timestamp: string;
  senderType?: string; // 'USER' | 'CHARACTER' | 'ASSISTANT' | 'SYSTEM'
  className?: string;
  onAvatarClick?: () => void;
  onDeleteRequest?: (messageId: string) => void;
  onSaveEditRequest?: (messageId: string, newContent: string) => Promise<boolean>;
  onReprocessRequest?: (messageId: string, isUserMessage: boolean) => void;
  isPlayingAudio?: boolean;
  isAudioLoading?: boolean;
  audioError?: string | null;
  onPlayAudioRequest?: (messageId: string) => void;
  isAudioCached?: boolean;
  creditsConsumed?: number;
  onSendConfirmation?: (friendlyMessage: string, commandToProcess: string) => void;
  isLastMessage?: boolean;
  onReviewFileClick?: (file: any) => void;
  // FEATURE-018: Translation props
  userLanguage?: string;
  socket?: any;
  conversationId?: string;
}

const MessageItem = memo(
  ({
    messageId,
    message,
    isSent,
    sender,
    timestamp,
    senderType,
    className = "",
    onAvatarClick,
    onDeleteRequest,
    onSaveEditRequest,
    onReprocessRequest,
    isPlayingAudio,
    isAudioLoading,
    audioError,
    onPlayAudioRequest,
    isAudioCached,
    creditsConsumed,
    onSendConfirmation,
    isLastMessage,
    onReviewFileClick,
    // FEATURE-018: Translation props
    userLanguage = "en",
    socket,
    conversationId,
  }: MessageItemProps) => {
    const { t } = useTranslation('chat');
    const { addToast } = useToast();
    const [showActions, setShowActions] = useState(false);
    const [isEditing, setIsEditing] = useState(false);
    const [editedContent, setEditedContent] = useState(message);
    const [isSavingEdit, setIsSavingEdit] = useState(false);
    const [confirmationSent, setConfirmationSent] = useState(false);
    const textareaRef = useRef<HTMLTextAreaElement>(null);

    // FEATURE-018: Message translations hook
    const {
      getTranslatedText,
      hasTranslation,
      toggleTranslation,
      requestTranslation,
      isTranslationLoading,
    } = useMessageTranslations({
      socket,
      userLanguage,
      conversationId: conversationId || "",
    });

    // FEATURE-018: Get the text to display (original or translated)
    // Don't translate own messages - only translate messages from others
    const displayText = isSent ? message : getTranslatedText(messageId, message);
    const hasTranslationAvailable = !isSent && hasTranslation(messageId);
    const isLoadingTranslation = !isSent && isTranslationLoading(messageId);

    const confirmationRequest = useMemo(() => {
      if (!isSent && isLikelyJson(message)) {
        try {
          const parsed = JSON.parse(message);
          if (
            (parsed.type === "action_confirmation_request" ||
              parsed.type === "action_confirmation_request_v2") &&
            Array.isArray(parsed.options)
          ) {
            return parsed;
          }
        } catch (e) {}
      }
      return null;
    }, [message, isSent]);

    useEffect(() => {
      if (!isEditing) setEditedContent(displayText);
    }, [displayText, isEditing]);

    useEffect(() => {
      if (isEditing && textareaRef.current) {
        const ta = textareaRef.current;
        ta.style.height = "auto";
        ta.style.height = `${ta.scrollHeight}px`;
        ta.focus();
        const len = ta.value.length;
        ta.setSelectionRange(len, len);
      }
    }, [isEditing, editedContent]);

    const handleDelete = useCallback(
      (e: React.MouseEvent) => {
        e.stopPropagation();
        if (onDeleteRequest && messageId) onDeleteRequest(messageId);
      },
      [onDeleteRequest, messageId]
    );

    const handleReprocess = useCallback(
      (e: React.MouseEvent) => {
        e.stopPropagation();
        if (
          onReprocessRequest &&
          typeof messageId !== "undefined" &&
          typeof isSent !== "undefined"
        ) {
          onReprocessRequest(messageId, isSent);
        }
      },
      [onReprocessRequest, messageId, isSent]
    );

    const handleEditClick = useCallback(
      (e: React.MouseEvent) => {
        e.stopPropagation();
        setEditedContent(displayText);
        setIsEditing(true);
        setShowActions(false);
      },
      [displayText]
    );

    const handleCancelEdit = useCallback(() => {
      setIsEditing(false);
      setEditedContent(message);
    }, [message]);

    const handleSaveEditClick = useCallback(async () => {
      if (!onSaveEditRequest || !messageId) {
        setIsEditing(false);
        return;
      }
      if (editedContent.trim() === displayText.trim()) {
        setIsEditing(false);
        return;
      }
      setIsSavingEdit(true);
      try {
        const success = await onSaveEditRequest(
          messageId,
          editedContent.trim()
        );
        if (success) setIsEditing(false);
      } catch (error) {
        console.error("[MessageItem] Error from onSaveEditRequest:", error);
      } finally {
        setIsSavingEdit(false);
      }
    }, [onSaveEditRequest, messageId, editedContent, displayText]);

    const handlePlayAudioClick = useCallback(
      (e: React.MouseEvent) => {
        e.stopPropagation();
        if (onPlayAudioRequest && messageId && !isAudioLoading) {
          onPlayAudioRequest(messageId);
        }
      },
      [onPlayAudioRequest, messageId, isAudioLoading]
    );

    const handleConfirmationClick = useCallback(
      async (option: any) => {
        if (confirmationSent) return;
        const friendlyMessage = option.value.startsWith("[USER_CONFIRMED_PLAN]")
          ? t("chatActions.actionConfirmedByUser")
          : t("chatActions.actionCancelledByUser");
        let commandToProcess = option.value;
        if (option.value === "[USER_CONFIRMED_PLAN]") {
          try {
            const originalPlan = JSON.parse(confirmationRequest.full_plan);
            const reviewFilesMap = new Map(
              confirmationRequest.files_to_review.map((file: any) => [
                file.relative_path,
                file.version_id,
              ])
            );
            const planToSend = {
              ...originalPlan,
              actions: originalPlan.actions.map((action: any) => {
                if (action.tool_name === "write_file_content") {
                  const path = action.args?.path;
                  const versionId = reviewFilesMap.get(path);
                  const newAction = { ...action, args: { ...action.args } };
                  if (versionId) {
                    newAction.args.version_id = versionId;
                    delete newAction.args.content;
                  }
                  return newAction;
                }
                return action;
              }),
            };
            commandToProcess += JSON.stringify(planToSend);
          } catch (e) {
            console.error(
              "Failed to process and clean development plan for sending:",
              e
            );
            addToast(t('errors.developmentPlanProcessFailed'), "error");
            return;
          }
        }
        if (onSendConfirmation)
          onSendConfirmation(friendlyMessage, commandToProcess);
        setConfirmationSent(true);
      },
      [onSendConfirmation, confirmationSent, t, confirmationRequest]
    );

    const shouldShowActions = showActions && !isEditing && !confirmationRequest;

        const ActionButtons = useCallback(
          () => (
            <div
              className={`flex items-center space-x-0 transition-opacity duration-150 ${
                shouldShowActions ? "opacity-100" : "opacity-0 pointer-events-none" 
              }`}
            >
              {!isSent && !isLikelyJson(message) && onPlayAudioRequest && (
                <button
                  className="px-2 py-1 text-gray-500 dark:text-gray-400 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-700 active:bg-gray-300 dark:active:bg-gray-600"
                  onClick={handlePlayAudioClick}
                  title={
                    isAudioLoading
                      ? t("messageItem.generatingAudio")
                      : isPlayingAudio
                      ? t("messageItem.playingAudio")
                      : audioError
                      ? `${t("messageItem.audioErrorPrefix")}: ${audioError}`
                      : isAudioCached
                      ? t("messageItem.playAudioCachedActionTitle")
                      : t("messageItem.playAudioActionTitle")
                  }
                  disabled={isAudioLoading}
                >
                  <span className="material-symbols-outlined text-base">
                    {isAudioLoading ? "hourglass_top" : isPlayingAudio ? "volume_up" : audioError ? "error_outline" : isAudioCached ? "play_arrow" : "volume_up"}
                  </span>
                </button>
              )}
              <button
                className="px-2 py-1 text-gray-500 dark:text-gray-400 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-700 active:bg-gray-300 dark:active:bg-gray-600"
                onClick={handleDelete}
                title={t("messageItem.deleteActionTitle")}
              >
                <span className="material-symbols-outlined text-base">delete</span>
              </button>
              <button
                className="px-2 py-1 text-gray-500 dark:text-gray-400 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-700 active:bg-gray-300 dark:active:bg-gray-600"
                onClick={handleEditClick}
                title={t("messageItem.editActionTitle")}
              >
                <span className="material-symbols-outlined text-base">edit</span>
              </button>
              <button
                className="px-2 py-1 text-gray-500 dark:text-gray-400 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-700 active:bg-gray-300 dark:active:bg-gray-600"
                onClick={handleReprocess}
                title={t("messageItem.regenerateActionTitle")}
              >
                <span className="material-symbols-outlined text-base">refresh</span>
              </button>
            </div>
          ),
          [
            shouldShowActions,
            isSent,
            message,
            onPlayAudioRequest,
            isAudioLoading,
            isPlayingAudio,
            audioError,
            isAudioCached,
            handleDelete,
            handleEditClick,
            handleReprocess,
            t,
          ]
        );
    const handleAvatarClickInternal = useCallback(() => {
      if (onAvatarClick) {
        onAvatarClick();
      }
    }, [onAvatarClick]);

    const displayName =
      sender?.name ||
      (isSent ? t("messageItem.youSender") : t("messageItem.unknownSender"));
    // Light theme: darker for user, lighter for character
    // Dark theme: lighter for user, darker for character
    const bubbleColorClasses = isSent
      ? "bg-gray-200/70 dark:bg-gray-700/70 text-gray-900 dark:text-gray-100 border border-gray-300 dark:border-gray-600"
      : "bg-gray-100/70 dark:bg-gray-800/70 text-gray-900 dark:text-gray-100 border border-gray-300 dark:border-gray-600";
    const metaColorClasses = isSent ? "text-blue-200" : "text-muted";

    const isNarrator = senderType === 'SYSTEM';

    // Special rendering for narrator/system messages
    if (isNarrator) {
      return (
        <div className={`flex justify-center w-full mb-6 ${className}`}>
          <div className="max-w-[80%] w-full">
            <div className="flex flex-col items-center">
              <div className="bg-light/50 dark:bg-dark/50 backdrop-blur-sm px-6 py-4 rounded-2xl shadow-md border border-border/30 text-center">
                <div className="text-sm italic text-content/90 whitespace-pre-wrap leading-relaxed">
                  <FormattedMessage content={message} />
                </div>
                {timestamp && (
                  <div className="text-xs text-muted/70 mt-2">
                    {new Date(timestamp).toLocaleTimeString([], {
                      hour: "2-digit",
                      minute: "2-digit",
                    })}
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      );
    }

    return (
      <div
        className={`flex ${
          isSent ? "justify-end" : "justify-start"
        } w-full mb-4 group ${className}`}
        onMouseEnter={() => {
          if (!isEditing) setShowActions(true);
        }}
        onMouseLeave={() => setShowActions(false)}
      >
        <div className="max-w-[90%] w-full">
          <div
            className={`flex items-center mb-1 ${ 
              isSent ? "flex-row-reverse" : "flex-row" 
            }`}
          >
            <div
              className={`flex-shrink-0 ${isSent ? "ml-2" : "mr-2"} ${
                onAvatarClick ? "cursor-pointer" : ""
              }`}
              onClick={handleAvatarClickInternal}
              title={
                onAvatarClick
                  ? t("displayAvatarParticipants.configureParticipantTitle", {
                      name: displayName,
                    })
                  : undefined
              }
            >
              <Avatar src={sender?.avatar} alt={displayName} size="mini" />
            </div>
            <div
              className={`flex w-full items-center min-h-[20px] ${ 
                isSent ? "flex-row-reverse" : "flex-row justify-between" 
              }`}
            >
              <span
                className={`text-xs ${metaColorClasses} ${ 
                  isSent ? "ml-2" : "mr-2" 
                }`}
              >
                {displayName}
              </span>
            </div>
          </div>
          <div
            className={`w-full flex flex-col ${ 
              isSent ? "items-end" : "items-start" 
            }`}
          >
            {isEditing ? (
              <div
                className={`w-full rounded-lg shadow-sm ${bubbleColorClasses} ${
                  isSent ? "rounded-tr-none" : "rounded-tl-none"
                } px-4 py-2 flex flex-col`}
              >
                <Textarea
                  ref={textareaRef}
                  value={editedContent}
                  onChange={(e: any) => {
                    setEditedContent(e.target.value);
                  }}
                  className={`w-full min-h-[40px] max-h-[200px] overflow-y-auto text-sm bg-transparent border-none focus:ring-0 resize-none leading-snug ${ 
                    isSent
                      ? "text-white placeholder-gray-300"
                      : "text-gray-800 placeholder-gray-500"
                  }`}
                  style={{ lineHeight: "1.4" }}
                  disabled={isSavingEdit}
                  onKeyDown={(e: any) => {
                    if (e.key === "Enter" && !e.shiftKey) {
                      e.preventDefault();
                      handleSaveEditClick();
                    } else if (e.key === "Escape") {
                      handleCancelEdit();
                    }
                  }}
                />
                <div
                  className={`flex gap-2 mt-2 ${ 
                    isSent ? "self-end" : "self-start" 
                  }`}
                >
                  <Button
                    variant="light"
                    size="small"
                    onClick={handleCancelEdit}
                    disabled={isSavingEdit}
                  >
                    {t("common.cancel")}
                  </Button>
                  <Button
                    variant="primary"
                    size="small"
                    onClick={handleSaveEditClick}
                    disabled={isSavingEdit}
                  >
                    {isSavingEdit ? t("common.saving") : t("common.save")}
                  </Button>
                </div>
              </div>
            ) : confirmationRequest ? (
              <div
                className={`px-4 py-3 rounded-lg ${bubbleColorClasses} ${
                  isSent ? "rounded-tr-none" : "rounded-tl-none"
                } shadow-sm w-full`}
              >
                <p className="text-sm mb-3 whitespace-pre-wrap">
                  {confirmationRequest.message}
                </p>
                <p className="text-sm mb-3 whitespace-pre-wrap">
                  {confirmationRequest.development_plan}
                </p>
                {confirmationRequest.type ===
                  "action_confirmation_request_v2" &&
                  Array.isArray(confirmationRequest.files_to_review) &&
                  confirmationRequest.files_to_review.length > 0 && (
                    <div className="my-3 border-t border-gray-500/50 pt-3">
                      <h4 className="text-sm font-semibold mb-2">
                        {t("messageItem.filesToReviewTitle")}
                      </h4>
                      <ul className="space-y-1">
                        {confirmationRequest.files_to_review.map((file: any) => (
                          <li key={file.version_id}>
                            <button
                              onClick={() => onReviewFileClick?.(file)}
                              className="text-left w-full p-2 rounded hover:bg-black/10 transition-colors"
                            >
                              <p className="font-mono text-xs flex items-center">
                                <span className="material-symbols-outlined text-sm mr-1.5">
                                  draft
                                </span>
                                {file.relative_path}
                              </p>
                              <p className="text-xs italic opacity-80 mt-1 ml-5">
                                {file.summary_of_changes}
                              </p>
                            </button>
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                {!confirmationSent && isLastMessage && (
                  <div className="flex justify-end gap-2 mt-3">
                    {confirmationRequest.options.map((option: any, index: number) => (
                      <Button
                        key={index}
                        variant={index === 0 ? "primary" : "light"}
                        size="small"
                        onClick={() => handleConfirmationClick(option)}
                        disabled={confirmationSent}
                      >
                        {option.label}
                      </Button>
                    ))}
                  </div>
                )}
              </div>
            ) : (
              <div
                className={`px-4 py-2 rounded-xl ${bubbleColorClasses} ${
                  isSent ? "rounded-tr-none" : "rounded-tl-none"
                } shadow-sm relative break-words w-full`}
              >
                {/* FEATURE-018: Display translated or original text */}
                <FormattedMessage content={displayText} />

                {/* FEATURE-018: Translation toggle button */}
                {!isSent && hasTranslationAvailable && (
                  <button
                    onClick={() => toggleTranslation(messageId)}
                    className="mt-1 text-xs opacity-70 hover:opacity-100 flex items-center gap-1 transition-opacity"
                    title={t('translation.toggle')}
                  >
                    <span className="material-symbols-outlined text-[14px]">
                      translate
                    </span>
                  </button>
                )}

                {/* FEATURE-018: Loading indicator for translation */}
                {!isSent && isLoadingTranslation && (
                  <div className="mt-1 text-xs opacity-50 flex items-center gap-1">
                    <span className="material-symbols-outlined text-[14px] animate-spin">
                      hourglass_top
                    </span>
                    <span>{t('translation.translating')}</span>
                  </div>
                )}

                {audioError && (
                  <p className="text-xs text-red-300 mt-1 opacity-80">
                    {audioError}
                  </p>
                )}
              </div>
            )}
            {!isEditing && timestamp && (
              <div
                className={`flex items-center text-xs mt-1 ${metaColorClasses} ${ 
                  isSent ? "self-end" : "self-start" 
                }`}
              >
                <div className={`flex items-center ${isSent ? 'flex-row-reverse' : ''}`}>
                  <span className="mx-2">
                    {new Date(timestamp).toLocaleTimeString([], {
                      hour: "2-digit",
                      minute: "2-digit",
                    })}
                  </span>
                  {!confirmationRequest && <ActionButtons />}
                </div>
                {!isSent &&
                  showActions &&
                  typeof creditsConsumed === "number" &&
                  creditsConsumed > 0 && (
                    <span
                      className="ml-2 flex items-center"
                      title={t("messageItem.creditsUsedTitle", { count: creditsConsumed })}
                    >
                      <span className="material-symbols-outlined text-sm mr-0.5 text-amber-500">
                        monetization_on
                      </span>
                      {creditsConsumed}
                    </span>
                  )}
              </div>
            )}
          </div>
        </div>
      </div>
    );
  }
);

MessageItem.displayName = "MessageItem";
export default MessageItem;
