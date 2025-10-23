
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

import { Avatar } from '../../../../components/ui/Avatar';
import { Button } from '../../../../components/ui/Button';
import { Textarea } from '../../../../components/ui/Textarea';
const formatMessage = (message: string) => [{ type: 'text', content: message }];

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
}

const MessageItem = memo(
  ({ 
    messageId,
    message,
    isSent,
    sender,
    timestamp,
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
  }: MessageItemProps) => {
    const { t } = useTranslation();
    const [showActions, setShowActions] = useState(false);
    const [isEditing, setIsEditing] = useState(false);
    const [editedContent, setEditedContent] = useState(message);
    const [isSavingEdit, setIsSavingEdit] = useState(false);
    const [confirmationSent, setConfirmationSent] = useState(false);
    const textareaRef = useRef<HTMLTextAreaElement>(null);

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
      if (!isEditing) setEditedContent(message);
    }, [message, isEditing]);

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
        setEditedContent(message);
        setIsEditing(true);
        setShowActions(false);
      },
      [message]
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
      if (editedContent.trim() === message.trim()) {
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
    }, [onSaveEditRequest, messageId, editedContent, message]);

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
            alert("Error processing the development plan. Could not proceed.");
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
      if (!isSent && onAvatarClick) {
        onAvatarClick();
      }
    }, [isSent, onAvatarClick]);

    const displayName =
      sender?.name ||
      (isSent ? t("messageItem.youSender") : t("messageItem.unknownSender"));
    const bubbleColorClasses = isSent
      ? "bg-light text-content"
      : "bg-light text-content";
    const metaColorClasses = isSent ? "text-blue-200" : "text-muted";
    const formattedOriginalMessageParts = useMemo(
      () => formatMessage(message),
      [message]
    );

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
                !isSent && onAvatarClick ? "cursor-pointer" : ""
              }`}
              onClick={handleAvatarClickInternal}
              title={
                !isSent && onAvatarClick
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
                        Arquivos para Revisão:
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
                {formattedOriginalMessageParts.map((part: any, index: number) => {
                  if (part.type === "italic")
                    return (
                      <em
                        key={index}
                        className="text-current opacity-80 inline"
                      >
                        {part.content}
                      </em>
                    );
                  if (part.type === "quote")
                    return (
                      <blockquote
                        key={index}
                        className="border-l-4 border-gray-400 pl-2 italic my-1"
                      >
                        {part.content}
                      </blockquote>
                    );
                  return part.content.split("\n").map((line: string, i: number) => (
                    <React.Fragment key={`${index}-${i}`}>
                      {line}
                      {i < part.content.split("\n").length - 1 && <br />}
                    </React.Fragment>
                  ));
                })}
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
                  typeof creditsConsumed === "number" &&
                  creditsConsumed > 0 && (
                    <span
                      className="ml-2 flex items-center"
                      title={`${creditsConsumed} créditos usados`}
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
