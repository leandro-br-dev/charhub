import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Button, Avatar } from '../../../../components/ui';
import type { Conversation, ConversationParticipant } from '../../../../types/chat';

export interface ConversationHeaderProps {
  conversation: Conversation;
  onTitleEdit?: (newTitle: string) => void;
  onAddParticipant?: () => void;
  onParticipantClick?: (participant: ConversationParticipant) => void;
  onSettings?: () => void;
  onArchive?: () => void;
  onDelete?: () => void;
  className?: string;
}

export const ConversationHeader = ({
  conversation,
  onTitleEdit,
  onAddParticipant,
  onParticipantClick,
  onSettings,
  onArchive,
  onDelete,
  className = '',
}: ConversationHeaderProps) => {
  const { t } = useTranslation('chat');
  const [isEditingTitle, setIsEditingTitle] = useState(false);
  const [editedTitle, setEditedTitle] = useState(conversation.title);
  const [showMenu, setShowMenu] = useState(false);

  const handleTitleSave = () => {
    if (onTitleEdit && editedTitle.trim() !== conversation.title) {
      onTitleEdit(editedTitle.trim());
    }
    setIsEditingTitle(false);
  };

  const handleTitleCancel = () => {
    setEditedTitle(conversation.title);
    setIsEditingTitle(false);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      handleTitleSave();
    } else if (e.key === 'Escape') {
      handleTitleCancel();
    }
  };

  /**
   * Get participant display info
   */
  const getParticipantInfo = (participant: ConversationParticipant) => {
    if (participant.actingCharacter) {
      const char = participant.actingCharacter;
      return {
        name: char.lastName ? `${char.firstName} ${char.lastName}` : char.firstName,
        avatar: char.avatar,
      };
    }
    if (participant.actingAssistant) {
      return {
        name: participant.actingAssistant.name,
        avatar: participant.actingAssistant.avatar,
      };
    }
    if (participant.user) {
      return {
        name: participant.user.displayName || t('participant.user'),
        avatar: participant.user.avatarUrl,
      };
    }
    return {
      name: t('participant.user'),
      avatar: null,
    };
  };

  return (
    <div className={`flex flex-col border-b border-normal bg-background ${className}`}>
      <div className="flex items-center justify-between p-4">
        {/* Title section */}
        <div className="flex-1 min-w-0">
          {isEditingTitle ? (
            <div className="flex items-center gap-2">
              <input
                type="text"
                value={editedTitle}
                onChange={(e) => setEditedTitle(e.target.value)}
                onKeyDown={handleKeyDown}
                onBlur={handleTitleSave}
                className="flex-1 px-2 py-1 text-lg font-semibold bg-light border border-primary rounded focus:outline-none focus:ring-2 focus:ring-primary/20"
                autoFocus
              />
              <Button
                variant="light"
                size="small"
                icon="close"
                onClick={handleTitleCancel}
                title={t('actions.cancel')}
              />
            </div>
          ) : (
            <div className="flex items-center gap-2">
              <h1 className="text-lg font-semibold text-content truncate">
                {conversation.title}
              </h1>
              {onTitleEdit && (
                <Button
                  variant="light"
                  size="small"
                  icon="edit"
                  onClick={() => setIsEditingTitle(true)}
                  title={t('conversation.editTitle')}
                  className="opacity-0 group-hover:opacity-100 transition-opacity"
                />
              )}
            </div>
          )}
        </div>

        {/* Actions */}
        <div className="flex items-center gap-2 ml-4">
          {onAddParticipant && (
            <Button
              variant="light"
              size="small"
              icon="person_add"
              onClick={onAddParticipant}
              title={t('conversation.addParticipant')}
            />
          )}

          {/* Menu dropdown */}
          <div className="relative">
            <Button
              variant="light"
              size="small"
              icon="more_vert"
              onClick={() => setShowMenu(!showMenu)}
              title={t('conversation.settings')}
            />

            {showMenu && (
              <div className="absolute right-0 mt-2 w-48 bg-background border border-normal rounded-lg shadow-lg z-10">
                {onSettings && (
                  <button
                    onClick={() => {
                      onSettings();
                      setShowMenu(false);
                    }}
                    className="flex items-center gap-2 w-full px-4 py-2 text-left text-content hover:bg-light transition-colors"
                  >
                    <span className="material-symbols-outlined text-sm">settings</span>
                    <span>{t('conversation.settings')}</span>
                  </button>
                )}
                {onArchive && (
                  <button
                    onClick={() => {
                      onArchive();
                      setShowMenu(false);
                    }}
                    className="flex items-center gap-2 w-full px-4 py-2 text-left text-content hover:bg-light transition-colors"
                  >
                    <span className="material-symbols-outlined text-sm">archive</span>
                    <span>{t('conversation.archive')}</span>
                  </button>
                )}
                {onDelete && (
                  <button
                    onClick={() => {
                      onDelete();
                      setShowMenu(false);
                    }}
                    className="flex items-center gap-2 w-full px-4 py-2 text-left text-danger hover:bg-danger/10 transition-colors border-t border-normal"
                  >
                    <span className="material-symbols-outlined text-sm">delete</span>
                    <span>{t('conversation.delete')}</span>
                  </button>
                )}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Participants bar */}
      {conversation.participants.length > 0 && (
        <div className="flex items-center gap-2 px-4 pb-3 overflow-x-auto">
          <span className="text-xs text-muted flex-shrink-0">
            {t('conversation.participants')}:
          </span>
          <div className="flex items-center gap-2">
            {conversation.participants.map((participant) => {
              const { name, avatar } = getParticipantInfo(participant);
              return (
                <button
                  key={participant.id}
                  onClick={() => onParticipantClick?.(participant)}
                  className="flex items-center gap-1 px-2 py-1 rounded-full bg-light hover:bg-secondary/10 transition-colors"
                  title={name}
                >
                  <Avatar src={avatar} alt={name} size="mini" />
                  <span className="text-xs text-content">{name}</span>
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
};
