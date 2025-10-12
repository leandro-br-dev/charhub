import { useState, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { Avatar, Button, Textarea } from '../../../../components/ui';
import type { Message } from '../../../../types/chat';

export interface MessageBubbleProps {
  message: Message;
  isSentByUser: boolean;
  senderName: string;
  senderAvatar?: string | null;
  onAvatarClick?: () => void;
  onDelete?: (messageId: string) => void;
  onEdit?: (messageId: string, newContent: string) => Promise<boolean>;
  className?: string;
}

/**
 * Format message content with basic markdown-like parsing
 * Handles italics (*text*) and quotes (> text)
 */
const formatMessage = (content: string): Array<{ type: 'text' | 'italic' | 'quote'; content: string }> => {
  const parts: Array<{ type: 'text' | 'italic' | 'quote'; content: string }> = [];
  const lines = content.split('\n');

  for (const line of lines) {
    // Check for quote
    if (line.trim().startsWith('>')) {
      parts.push({ type: 'quote', content: line.replace(/^>\s*/, '') });
      continue;
    }

    // Check for italics
    const italicRegex = /\*([^*]+)\*/g;
    let lastIndex = 0;
    let match;

    while ((match = italicRegex.exec(line)) !== null) {
      // Add text before italic
      if (match.index > lastIndex) {
        parts.push({ type: 'text', content: line.substring(lastIndex, match.index) });
      }
      // Add italic text
      parts.push({ type: 'italic', content: match[1] });
      lastIndex = italicRegex.lastIndex;
    }

    // Add remaining text
    if (lastIndex < line.length) {
      parts.push({ type: 'text', content: line.substring(lastIndex) });
    }

    // Add newline for next line
    if (lines.indexOf(line) < lines.length - 1) {
      parts.push({ type: 'text', content: '\n' });
    }
  }

  return parts;
};

export const MessageBubble = ({
  message,
  isSentByUser,
  senderName,
  senderAvatar,
  onAvatarClick,
  onDelete,
  onEdit,
  className = '',
}: MessageBubbleProps) => {
  const { t } = useTranslation('chat');
  const [showActions, setShowActions] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [editedContent, setEditedContent] = useState(message.content);
  const [isSaving, setIsSaving] = useState(false);

  const formattedParts = useMemo(() => formatMessage(message.content), [message.content]);

  const handleDelete = () => {
    if (onDelete) {
      onDelete(message.id);
    }
  };

  const handleEditClick = () => {
    setEditedContent(message.content);
    setIsEditing(true);
    setShowActions(false);
  };

  const handleCancelEdit = () => {
    setIsEditing(false);
    setEditedContent(message.content);
  };

  const handleSaveEdit = async () => {
    if (!onEdit) {
      setIsEditing(false);
      return;
    }

    const trimmedContent = editedContent.trim();
    if (trimmedContent === message.content.trim()) {
      setIsEditing(false);
      return;
    }

    setIsSaving(true);
    try {
      const success = await onEdit(message.id, trimmedContent);
      if (success) {
        setIsEditing(false);
      }
    } catch (error) {
      console.error('[MessageBubble] Error saving edit:', error);
    } finally {
      setIsSaving(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSaveEdit();
    } else if (e.key === 'Escape') {
      handleCancelEdit();
    }
  };

  const bubbleColorClasses = isSentByUser
    ? 'bg-primary/10 text-content border border-primary/20'
    : 'bg-light text-content';

  const metaColorClasses = 'text-muted';

  return (
    <div
      className={`flex ${isSentByUser ? 'justify-end' : 'justify-start'} w-full mb-4 group ${className}`}
      onMouseEnter={() => !isEditing && setShowActions(true)}
      onMouseLeave={() => setShowActions(false)}
    >
      <div className="max-w-[90%] w-full">
        {/* Header with avatar and name */}
        <div className={`flex items-center mb-1 ${isSentByUser ? 'flex-row-reverse' : 'flex-row'}`}>
          <div
            className={`flex-shrink-0 ${isSentByUser ? 'ml-2' : 'mr-2'} ${
              !isSentByUser && onAvatarClick ? 'cursor-pointer' : ''
            }`}
            onClick={!isSentByUser ? onAvatarClick : undefined}
            title={
              !isSentByUser && onAvatarClick
                ? t('message.configureParticipant', { defaultValue: `Configure ${senderName}` })
                : undefined
            }
          >
            <Avatar src={senderAvatar} alt={senderName} size="mini" />
          </div>

          <div className={`flex w-full items-center min-h-[20px] ${isSentByUser ? 'flex-row-reverse' : 'flex-row justify-between'}`}>
            <span className={`text-xs ${metaColorClasses} ${isSentByUser ? 'ml-2' : 'mr-2'}`}>
              {senderName}
            </span>

            {/* Action buttons */}
            <div
              className={`flex items-center space-x-1 transition-opacity duration-150 ${
                showActions ? 'opacity-100' : 'opacity-0 pointer-events-none'
              }`}
            >
              {onDelete && (
                <Button
                  variant="light"
                  size="small"
                  icon="delete"
                  className="p-[2px] text-danger/80 hover:bg-danger/10 hover:text-danger"
                  onClick={handleDelete}
                  title={t('message.delete')}
                />
              )}
              {onEdit && isSentByUser && (
                <Button
                  variant="light"
                  size="small"
                  icon="edit"
                  className="p-[2px] text-primary/80 hover:bg-primary/10 hover:text-primary"
                  onClick={handleEditClick}
                  title={t('message.edit')}
                />
              )}
            </div>
          </div>
        </div>

        {/* Message content */}
        <div className={`w-full flex flex-col ${isSentByUser ? 'items-end' : 'items-start'}`}>
          {isEditing ? (
            // Edit mode
            <div
              className={`w-full rounded-lg shadow-sm ${bubbleColorClasses} ${
                isSentByUser ? 'rounded-tr-none' : 'rounded-tl-none'
              } px-4 py-2 flex flex-col`}
            >
              <Textarea
                value={editedContent}
                onChange={(e) => setEditedContent(e.target.value)}
                className="w-full min-h-[40px] max-h-[200px] overflow-y-auto text-sm bg-transparent border-none focus:ring-0 resize-none leading-snug"
                disabled={isSaving}
                onKeyDown={handleKeyDown}
                autoFocus
              />
              <div className={`flex gap-2 mt-2 ${isSentByUser ? 'self-end' : 'self-start'}`}>
                <Button variant="light" size="small" onClick={handleCancelEdit} disabled={isSaving}>
                  {t('actions.cancel')}
                </Button>
                <Button variant="primary" size="small" onClick={handleSaveEdit} disabled={isSaving}>
                  {isSaving ? t('actions.save', { defaultValue: 'Saving...' }) : t('actions.save')}
                </Button>
              </div>
            </div>
          ) : (
            // Display mode
            <div
              className={`px-4 py-2 rounded-lg ${bubbleColorClasses} ${
                isSentByUser ? 'rounded-tr-none' : 'rounded-tl-none'
              } shadow-sm relative break-words w-full`}
            >
              {formattedParts.map((part, index) => {
                if (part.type === 'italic') {
                  return (
                    <em key={index} className="text-current opacity-80 inline">
                      {part.content}
                    </em>
                  );
                }
                if (part.type === 'quote') {
                  return (
                    <blockquote key={index} className="border-l-4 border-muted pl-2 italic my-1">
                      {part.content}
                    </blockquote>
                  );
                }
                return part.content.split('\n').map((line, i) => (
                  <span key={`${index}-${i}`}>
                    {line}
                    {i < part.content.split('\n').length - 1 && <br />}
                  </span>
                ));
              })}
            </div>
          )}

          {/* Timestamp */}
          {!isEditing && message.timestamp && (
            <div className={`flex items-center text-xs mt-1 ${metaColorClasses} ${isSentByUser ? 'self-end' : 'self-start'}`}>
              <span>
                {new Date(message.timestamp).toLocaleTimeString([], {
                  hour: '2-digit',
                  minute: '2-digit',
                })}
              </span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
