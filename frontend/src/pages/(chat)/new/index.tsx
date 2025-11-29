import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useQuery } from '@tanstack/react-query';
import { useConversationMutations } from '../shared/hooks/useConversations';
import { Button, Avatar } from '../../../components/ui';
import MultiUserSettings from '../shared/components/MultiUserSettings';
import { characterService } from '../../../services/characterService';
import type { Character } from '../../../types/characters';
import { usePageHeader } from '../../../hooks/usePageHeader';
import { useToast } from '../../../contexts/ToastContext';

export default function NewConversationPage() {
  const { t } = useTranslation('chat');
  const navigate = useNavigate();
  const [selectedCharacterId, setSelectedCharacterId] = useState<string | null>(null);
  const [conversationTitle, setConversationTitle] = useState('');

  // Multi-user settings
  const [isMultiUser, setIsMultiUser] = useState(false);
  const [maxUsers, setMaxUsers] = useState(2);
  const [allowUserInvites, setAllowUserInvites] = useState(false);
  const [requireApproval, setRequireApproval] = useState(false);

  const { setTitle } = usePageHeader();
  const { addToast } = useToast();

  const { createWithCharacter } = useConversationMutations();

  // Fetch user's characters
  const { data: charactersData, isLoading: charactersLoading } = useQuery({
    queryKey: ['characters', 'my-characters'],
    queryFn: () => characterService.list(),
  });

  const characters = charactersData?.items || [];

  // Set page title
  useEffect(() => {
    setTitle(t('newConversation'));
  }, [setTitle, t]);

  const handleCreate = async () => {
    if (!selectedCharacterId) {
      addToast(t('participant.selectCharacter'), 'warning');
      return;
    }

    try {
      const conversation = await createWithCharacter.mutateAsync({
        characterId: selectedCharacterId,
        title: conversationTitle.trim() || undefined,
        isMultiUser,
        maxUsers: isMultiUser ? maxUsers : 1,
        allowUserInvites: isMultiUser ? allowUserInvites : false,
        requireApproval: isMultiUser ? requireApproval : false,
      });

      navigate(`/chat/${conversation.id}`);
    } catch (error) {
      console.error('[NewConversation] Error creating conversation:', error);
      addToast(t('errors.createFailed'), 'error');
    }
  };

  return (
    <div className="flex flex-col h-full w-full overflow-x-hidden">
      <div className="w-full px-2 py-4 md:px-6 border-b border-normal">
        <h1 className="text-2xl font-bold text-content">{t('newConversation')}</h1>
        <p className="text-sm text-muted mt-1">
          {t('conversation.selectCharacterToStart', { defaultValue: 'Select a character to start chatting' })}
        </p>
      </div>

      <div className="flex-1 w-full overflow-y-auto overflow-x-hidden px-2 py-4 md:px-6">
        {/* Conversation title input */}
        <div className="mb-6 w-full">
          <label className="block text-sm font-medium text-content mb-2">
            {t('conversation.title', { defaultValue: 'Conversation Title' })} ({t('common.optional', { defaultValue: 'optional' })})
          </label>
          <input
            type="text"
            value={conversationTitle}
            onChange={(e) => setConversationTitle(e.target.value)}
            placeholder={t('conversation.titlePlaceholder', { defaultValue: 'Enter a title...' })}
            className="w-full px-4 py-2 bg-light border border-normal rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary text-content"
            maxLength={200}
          />
        </div>

        {/* Multi-user settings */}
        <div className="mb-6 w-full">
          <div className="p-4 bg-light/50 border border-normal rounded-lg">
            <MultiUserSettings
              isMultiUser={isMultiUser}
              onIsMultiUserChange={setIsMultiUser}
              maxUsers={maxUsers}
              onMaxUsersChange={setMaxUsers}
              allowUserInvites={allowUserInvites}
              onAllowUserInvitesChange={setAllowUserInvites}
              requireApproval={requireApproval}
              onRequireApprovalChange={setRequireApproval}
            />
          </div>
        </div>

        {/* Character selection */}
        <div className="w-full">
          <label className="block text-sm font-medium text-content mb-2">
            {t('participant.selectCharacter')}
          </label>

          {charactersLoading ? (
            <div className="text-center p-8 text-muted">
              {t('loading')}
            </div>
          ) : characters.length === 0 ? (
            <div className="text-center p-8 text-muted">
              <p>{t('participant.noCharacters')}</p>
              <button
                onClick={() => navigate('/characters/create')}
                className="mt-4 px-4 py-2 bg-primary text-white rounded-lg hover:opacity-90 transition-opacity"
              >
                {t('participant.createCharacter', { defaultValue: 'Create a character' })}
              </button>
            </div>
          ) : (
            <div className="w-full space-y-2 md:space-y-0 md:grid md:grid-cols-2 lg:grid-cols-3 md:gap-4">
              {characters.map((character: Character) => {
                const displayName = character.lastName
                  ? `${character.firstName} ${character.lastName}`
                  : character.firstName;
                const avatarUrl = (character as any).images?.find((img: any) => img.type === 'AVATAR' && img.isActive)?.url;

                return (
                  <button
                    key={character.id}
                    onClick={() => setSelectedCharacterId(character.id)}
                    className={`w-full flex items-center gap-2 p-2.5 md:p-4 rounded-lg border-2 transition-all duration-200 ${
                      selectedCharacterId === character.id
                        ? 'border-primary bg-primary/5'
                        : 'border-normal hover:border-primary/50 hover:bg-light'
                    }`}
                  >
                    <div className="flex-shrink-0">
                      <Avatar
                        src={avatarUrl}
                        alt={displayName}
                        size="medium"
                      />
                    </div>
                    <div className="flex-1 min-w-0 text-left pr-1">
                      <h3 className="font-medium text-content text-sm md:text-base truncate">
                        {displayName}
                      </h3>
                      {character.personality && (
                        <p className="text-xs md:text-sm text-muted mt-0.5 line-clamp-2 break-words">
                          {character.personality}
                        </p>
                      )}
                    </div>
                    {selectedCharacterId === character.id && (
                      <div className="flex-shrink-0">
                        <span className="material-symbols-outlined text-primary text-lg md:text-xl">
                          check_circle
                        </span>
                      </div>
                    )}
                  </button>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* Footer actions */}
      <div className="border-t border-normal p-4 flex items-center justify-end gap-3">
        <Button
          variant="light"
          onClick={() => navigate('/chat')}
          disabled={createWithCharacter.isPending}
        >
          {t('actions.cancel')}
        </Button>
        <Button
          variant="primary"
          onClick={handleCreate}
          disabled={!selectedCharacterId || createWithCharacter.isPending}
        >
          {createWithCharacter.isPending ? t('actions.creating', { defaultValue: 'Creating...' }) : t('actions.create')}
        </Button>
      </div>
    </div>
  );
}
