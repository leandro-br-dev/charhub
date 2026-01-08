// frontend/src/pages/(chat)/shared/components/MessageInput.tsx
import React, { useState, useRef, useEffect, useCallback, Fragment } from "react";
import { useTranslation } from "react-i18next";
import { Menu, Transition } from "@headlessui/react";
import EmojiPicker from 'emoji-picker-react';

import { Textarea } from '../../../../components/ui/Textarea';
import { Button } from '../../../../components/ui/Button';
import { Avatar } from '../../../../components/ui/Avatar';
import { audioService } from '../../../../services/audioService';
import { MessageFormattingToolbar } from './MessageFormattingToolbar';

interface MessageInputProps {
  user: any;
  onSendMessage: (message: string) => Promise<boolean>;
  disabled?: boolean;
  className?: string;
  onUserAvatarClick?: () => void;
  onRequestImageGeneration?: () => void;
  onRequestSuggestion?: () => Promise<string | null>;
}

const MessageInput = React.memo(
  ({
    user,
    onSendMessage,
    disabled = false,
    className = "",
    onUserAvatarClick,
    onRequestImageGeneration,
    onRequestSuggestion,
  }: MessageInputProps) => {
    const { t } = useTranslation(['chat', 'common']);
    const [message, setMessage] = useState("");
    const textareaRef = useRef<HTMLTextAreaElement>(null);
    const [isSending, setIsSending] = useState(false);

    const [isRecording, setIsRecording] = useState(false);
    const [isTranscribing, setIsTranscribing] = useState(false);
    const [isLoadingSuggestion, setIsLoadingSuggestion] = useState(false);
    const [transcriptionError, setTranscriptionError] = useState<string | null>(null);
    const mediaRecorderRef = useRef<MediaRecorder | null>(null);
    const audioChunksRef = useRef<Blob[]>([]);
    const holdTimeoutRef = useRef<NodeJS.Timeout | null>(null);
    const clickTimeoutRef = useRef<NodeJS.Timeout | null>(null);
    const HOLD_TO_START_THRESHOLD = 300;
    const MAX_CLICK_DURATION = 250;

    const [showEmojiPicker, setShowEmojiPicker] = useState(false);

    const onEmojiClick = (emojiObject: any) => {
      setMessage(prevMessage => prevMessage + emojiObject.emoji);
      setShowEmojiPicker(false);
    };

    useEffect(() => {
      if (message && transcriptionError) {
        setTranscriptionError(null);
      }
    }, [message, transcriptionError]);

    const handleSendMessageInternal = useCallback(async () => {
      console.log('[MessageInput] handleSendMessageInternal called', {
        hasMessage: !!message,
        messageTrim: message.trim(),
        messageLength: message.length,
        disabled,
        isSending,
        hasOnSendMessage: typeof onSendMessage === 'function'
      });

      if (message.trim() && !disabled && !isSending) {
        setIsSending(true);
        setTranscriptionError(null);
        try {
          console.log('[MessageInput] Calling onSendMessage...');
          const success = await onSendMessage(message);
          console.log('[MessageInput] onSendMessage returned', success);
          if (success) {
            setMessage("");
          }
        } catch (error) {
          console.error("Input: Error onSendMessage:", error);
        } finally {
          setIsSending(false);
        }
      } else {
        console.warn('[MessageInput] Cannot send message', {
          messageTrim: message.trim(),
          disabled,
          isSending
        });
      }
    }, [message, disabled, isSending, onSendMessage]);

    const handleKeyPress = useCallback(
      (e: React.KeyboardEvent) => {
        if (e.key === "Enter" && !e.shiftKey && !disabled && !isSending && !isRecording) {
          e.preventDefault();
          handleSendMessageInternal();
        }
      },
      [disabled, isSending, isRecording, handleSendMessageInternal]
    );

    const handleRequestSuggestion = useCallback(async () => {
      if (!onRequestSuggestion || isLoadingSuggestion || disabled) return;

      setIsLoadingSuggestion(true);
      try {
        const suggestion = await onRequestSuggestion();
        if (suggestion) {
          setMessage(suggestion);
          textareaRef.current?.focus();
        }
      } catch (error) {
        console.error('[MessageInput] Error requesting suggestion:', error);
      } finally {
        setIsLoadingSuggestion(false);
      }
    }, [onRequestSuggestion, isLoadingSuggestion, disabled]);

    const handleInsertFormatting = useCallback((prefix: string, suffix: string, placeholder: string) => {
      const textarea = textareaRef.current;
      if (!textarea) return;

      const start = textarea.selectionStart;
      const end = textarea.selectionEnd;
      const text = message;

      const before = text.substring(0, start);
      const selection = text.substring(start, end);
      const after = text.substring(end);

      // If there's selected text, wrap it; otherwise use placeholder
      const newText = selection
        ? before + prefix + selection + suffix + after
        : before + prefix + placeholder + suffix + after;

      setMessage(newText);

      // Set cursor position after the formatting
      setTimeout(() => {
        const newPosition = selection
          ? start + prefix.length + selection.length + suffix.length
          : start + prefix.length + placeholder.length + suffix.length;
        textarea.setSelectionRange(newPosition, newPosition);
        textarea.focus();
      }, 0);
    }, [message]);

    const startRecording = useCallback(async () => {
      if (isRecording) return;
      if (!(navigator.mediaDevices && navigator.mediaDevices.getUserMedia)) {
        setTranscriptionError(t("messageInput.micNotSupportedError"));
        return;
      }
      setTranscriptionError(null);
      setIsRecording(true);
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        mediaRecorderRef.current = new MediaRecorder(stream, { mimeType: "audio/webm; codecs=opus" });
        audioChunksRef.current = [];
        mediaRecorderRef.current.ondataavailable = (event) => { if (event.data.size > 0) audioChunksRef.current.push(event.data); };
        mediaRecorderRef.current.onstop = async () => {
          stream.getTracks().forEach((track) => track.stop());
          setIsRecording(false);
          if (audioChunksRef.current.length === 0) return;
          const audioBlob = new Blob(audioChunksRef.current, { type: "audio/webm; codecs=opus" });
          audioChunksRef.current = [];
          if (audioBlob.size > 1000) {
            setIsTranscribing(true);
            try {
              const result = await audioService.transcribeAudio(audioBlob);
              if (result.success && result.data?.text) {
                setMessage((prev) => prev + result.data.text + " ");
                if (textareaRef.current) textareaRef.current.focus();
              } else {
                setTranscriptionError((result as any).error || t("messageInput.transcriptionFailedError"));
              }
            } catch (err: any) {
              setTranscriptionError(err.message || t("messageInput.transcriptionServiceError"));
            } finally {
              setIsTranscribing(false);
            }
          }
        };
        mediaRecorderRef.current.onerror = (event: any) => {
          setTranscriptionError(`MediaRecorder error: ${event.error?.name || "Unknown error"}`);
          setIsRecording(false);
          stream.getTracks().forEach((track) => track.stop());
        };
        mediaRecorderRef.current.start();
      } catch (err) {
        setTranscriptionError(t("messageInput.micAccessError"));
        setIsRecording(false);
      }
    }, [t, isRecording]);

    const stopRecording = useCallback(() => {
      if (mediaRecorderRef.current && mediaRecorderRef.current.state === "recording") {
        mediaRecorderRef.current.stop();
      } else {
        if (isRecording) setIsRecording(false);
      }
    }, [isRecording]);

    const handleMouseDownMic = useCallback((e: React.MouseEvent) => {
      if (e.button !== 0 || isTranscribing || disabled || isSending) return;
      e.preventDefault();
      setTranscriptionError(null);
      if (holdTimeoutRef.current) clearTimeout(holdTimeoutRef.current);
      if (clickTimeoutRef.current) clearTimeout(clickTimeoutRef.current);
      if (isRecording) return;
      holdTimeoutRef.current = setTimeout(() => {
        holdTimeoutRef.current = null;
        if (!isRecording) startRecording();
      }, HOLD_TO_START_THRESHOLD);
      clickTimeoutRef.current = setTimeout(() => {
        clickTimeoutRef.current = null;
      }, MAX_CLICK_DURATION);
    }, [isTranscribing, disabled, isSending, isRecording, startRecording]);

    const handleMouseUpMic = useCallback(() => {
      if (holdTimeoutRef.current) {
        clearTimeout(holdTimeoutRef.current);
        holdTimeoutRef.current = null;
      }
      if (clickTimeoutRef.current) {
        clearTimeout(clickTimeoutRef.current);
        clickTimeoutRef.current = null;
        if (isRecording) {
          stopRecording();
        } else if (!disabled && !isSending && !isTranscribing) {
          startRecording();
        }
        return;
      }
      if (isRecording) stopRecording();
    }, [isRecording, stopRecording, startRecording, disabled, isSending, isTranscribing]);

    useEffect(() => {
      return () => {
        if (holdTimeoutRef.current) clearTimeout(holdTimeoutRef.current);
        if (clickTimeoutRef.current) clearTimeout(clickTimeoutRef.current);
        if (mediaRecorderRef.current && (mediaRecorderRef.current as any).stream) {
          (mediaRecorderRef.current as any).stream.getTracks().forEach((track: any) => track.stop());
        }
      };
    }, []);

    const isEffectivelyDisabled = disabled || isSending || isTranscribing;
    const micButtonIcon = isTranscribing ? "hourglass_top" : isRecording ? "stop_circle" : "mic";
    const micButtonVariant = isRecording ? "danger" : isTranscribing ? "secondary" : "light";
    const micButtonClasses = [
      isRecording ? 'animate-pulse' : '',
      isTranscribing ? 'animate-spin' : '',
      !isRecording && !isTranscribing
        ? 'bg-slate-200 text-slate-800 hover:bg-slate-300 dark:bg-slate-700 dark:text-slate-100 dark:hover:bg-slate-600'
        : ''
    ].join(' ').trim();
    const placeholderText = isTranscribing ? t("messageInput.placeholderProcessingAudio") : isRecording ? t("messageInput.placeholderRecording") : isSending ? t("messageInput.placeholderSending") : disabled ? t("messageInput.placeholderWaiting") : t("messageInput.placeholderDefault");

    return (
      <div className={`w-full ${isEffectivelyDisabled && !isRecording ? "opacity-60 cursor-not-allowed" : ""} ${className}`}>
        <div className="flex items-center justify-between px-4 py-2">
          <div className={`flex items-center ${onUserAvatarClick ? "cursor-pointer" : ""}`} onClick={onUserAvatarClick} title={onUserAvatarClick ? t("messageInput.configureUser", { name: user?.name || t("messageInput.you") }) : undefined}>
            <Avatar src={user?.avatar} size="mini" />
          </div>
          {transcriptionError && (<span className="text-xs text-danger ml-2">{transcriptionError}</span>)}
        </div>

        <div className="w-full bg-light rounded-xl shadow-sm p-2 relative">
          {showEmojiPicker && (
            <div className="absolute bottom-full right-0 z-20 mb-2">
              <EmojiPicker onEmojiClick={onEmojiClick} autoFocusSearch={false} />
            </div>
          )}
          <Textarea
            ref={textareaRef}
            value={message}
            onChange={(e: any) => setMessage(e.target.value)}
            onKeyDown={handleKeyPress}
            placeholder={placeholderText}
            className={`w-full min-h-[60px] resize-none bg-transparent border-none focus:ring-0 text-content placeholder-gray-500 ${ (isEffectivelyDisabled && !isRecording) || isRecording ? "opacity-70" : "" }`}
            disabled={(isEffectivelyDisabled && !isRecording) || isRecording}
            rows={3}
          />
          <div className="flex items-center justify-between mt-1">
            <div className="flex items-center gap-1">
              <Menu as="div" className="relative inline-block text-left">
                <div>
                  <Menu.Button as="div">
                    <Button variant="light" size="small" icon="add_circle" disabled={isEffectivelyDisabled || isRecording} title={t("messageInput.actionsMenuTitle")} className="text-muted hover:text-primary" />
                  </Menu.Button>
                </div>
                <Transition as={Fragment} enter="transition ease-out duration-100" enterFrom="transform opacity-0 scale-95" enterTo="transform opacity-100 scale-100" leave="transition ease-in duration-75" leaveFrom="transform opacity-100 scale-100" leaveTo="transform opacity-0 scale-95">
                  <Menu.Items className="absolute bottom-full left-0 mb-2 w-56 origin-bottom-left rounded-md bg-light shadow-lg ring-1 ring-black ring-opacity-5 focus:outline-none z-10">
                    <div className="px-1 py-1">
                      <Menu.Item>
                        {({ active }: any) => (
                          <button onClick={() => { if (typeof onRequestImageGeneration === "function") { onRequestImageGeneration(); } }} disabled={isEffectivelyDisabled || isRecording} className={`${active ? "bg-primary-100 text-primary" : "text-content"} group flex w-full items-center rounded-md px-2 py-2 text-sm`}>
                            <span className="material-symbols-outlined mr-2 h-5 w-5">image</span>
                            {t("messageInput.generateImageAction", "Gerar Imagem")}
                          </button>
                        )}
                      </Menu.Item>
                    </div>
                  </Menu.Items>
                </Transition>
              </Menu>
              <MessageFormattingToolbar
                onInsertFormatting={handleInsertFormatting}
                disabled={isEffectivelyDisabled || isRecording}
              />
              <Button variant="light" size="small" icon="mood" onClick={() => setShowEmojiPicker(!showEmojiPicker)} disabled={isEffectivelyDisabled || isRecording} className="text-muted hover:text-primary" />
            </div>
            
            <div className="flex items-center gap-2">
              {onRequestSuggestion && (
                <Button
                  variant="light"
                  size="small"
                  icon={isLoadingSuggestion ? "progress_activity" : "auto_awesome"}
                  className={`${isLoadingSuggestion ? 'animate-spin' : ''} text-muted hover:text-primary`}
                  onClick={handleRequestSuggestion}
                  disabled={isEffectivelyDisabled || isRecording || isLoadingSuggestion}
                  title={isLoadingSuggestion ? t("messageInput.generatingSuggestion") : t("messageInput.suggestReplyAction")}
                />
              )}
              <Button
                variant={micButtonVariant}
                size="small"
                icon={micButtonIcon}
                className={micButtonClasses}
                onMouseDown={handleMouseDownMic}
                onMouseUp={handleMouseUpMic}
                disabled={isEffectivelyDisabled && !isRecording}
                title={isRecording ? t("messageInput.micButtonStopRecordingTitle") : isTranscribing ? t("messageInput.micButtonProcessingTitle") : t("messageInput.micButtonRecordTitle")}
              />
              <Button
                variant="primary"
                size="small"
                icon={isSending ? "progress_activity" : "send"}
                className={`${isSending ? 'animate-spin' : ''} rounded-full text-black hover:opacity-90 dark:text-black`}
                onClick={handleSendMessageInternal}
                disabled={!message.trim() || isEffectivelyDisabled || isRecording}
              />
            </div>
          </div>
        </div>
      </div>
    );
  }
);

MessageInput.displayName = "MessageInput";
export default MessageInput;
