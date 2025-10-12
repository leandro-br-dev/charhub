import { useState, useCallback, type KeyboardEvent } from 'react';
import { useTranslation } from 'react-i18next';
import { Avatar, Button, Textarea } from '../../../../components/ui';

export interface MessageInputProps {
  user: {
    name?: string;
    avatar?: string | null;
  };
  onSendMessage: (content: string) => Promise<boolean>;
  disabled?: boolean;
  className?: string;
  onUserAvatarClick?: () => void;
}

export const MessageInput = ({
  user,
  onSendMessage,
  disabled = false,
  className = '',
  onUserAvatarClick,
}: MessageInputProps) => {
  const { t } = useTranslation('chat');
  const [message, setMessage] = useState('');
  const [isSending, setIsSending] = useState(false);

  const handleSend = useCallback(async () => {
    const trimmedMessage = message.trim();
    if (!trimmedMessage || disabled || isSending) return;

    setIsSending(true);
    try {
      const success = await onSendMessage(trimmedMessage);
      if (success) {
        setMessage(''); // Clear input only on success
      }
    } catch (error) {
      console.error('[MessageInput] Error sending message:', error);
    } finally {
      setIsSending(false);
    }
  }, [message, disabled, isSending, onSendMessage]);

  const handleKeyPress = useCallback(
    (e: KeyboardEvent<HTMLTextAreaElement>) => {
      if (e.key === 'Enter' && !e.shiftKey && !disabled && !isSending) {
        e.preventDefault();
        handleSend();
      }
    },
    [disabled, isSending, handleSend]
  );

  const isEffectivelyDisabled = disabled || isSending;
  const placeholderText = isSending
    ? t('message.sending')
    : disabled
    ? t('message.placeholder', { defaultValue: 'Waiting...' })
    : t('message.placeholder');

  return (
    <div className={`w-full ${isEffectivelyDisabled ? 'opacity-60 cursor-not-allowed' : ''} ${className}`}>
      {/* User avatar section */}
      <div className="flex items-center justify-between px-4 py-2">
        <div
          className={`flex items-center ${onUserAvatarClick ? 'cursor-pointer' : ''}`}
          onClick={onUserAvatarClick}
          title={
            onUserAvatarClick
              ? t('message.configureUser', {
                  defaultValue: `Configure ${user?.name || t('message.you')}`,
                  name: user?.name || t('message.you'),
                })
              : undefined
          }
        >
          <Avatar src={user?.avatar} size="mini" />
        </div>
      </div>

      {/* Input area */}
      <div className="w-full bg-light rounded-xl shadow-sm p-2 relative">
        <Textarea
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          onKeyDown={handleKeyPress}
          placeholder={placeholderText}
          className={`w-full min-h-[60px] resize-none bg-transparent border-none focus:ring-0 text-content placeholder-muted ${
            isEffectivelyDisabled ? 'opacity-70' : ''
          }`}
          disabled={isEffectivelyDisabled}
          rows={3}
        />

        {/* Action buttons */}
        <div className="flex items-center justify-end mt-1">
          <Button
            variant="dark"
            size="small"
            icon={isSending ? 'progress_activity' : 'send'}
            className={isSending ? 'animate-spin' : ''}
            onClick={handleSend}
            disabled={!message.trim() || isEffectivelyDisabled}
            title={t('message.send')}
          />
        </div>
      </div>
    </div>
  );
};
