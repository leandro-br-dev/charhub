import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { characterService } from '../../../../services/characterService';
import { Avatar, Input } from '../../../../components/ui';
import type { Character } from '../../../../types/characters';

interface CharacterSelectorProps {
  selectedIds: string[];
  onChange: (ids: string[]) => void;
}

export function CharacterSelector({ selectedIds, onChange }: CharacterSelectorProps) {
  const { t } = useTranslation('story');
  const [characters, setCharacters] = useState<Character[]>([]);
  const [search, setSearch] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    loadCharacters();
  }, [search]);

  const loadCharacters = async () => {
    setIsLoading(true);
    try {
      const response = await characterService.list({
        search: search || undefined,
        isPublic: false, // Only user's characters
        limit: 20,
      });
      setCharacters(response.items);
    } catch (error) {
      console.error('Error loading characters:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const toggleCharacter = (id: string) => {
    if (selectedIds.includes(id)) {
      onChange(selectedIds.filter(cid => cid !== id));
    } else {
      onChange([...selectedIds, id]);
    }
  };

  const selectedCharacters = characters.filter(c => selectedIds.includes(c.id));
  const availableCharacters = characters.filter(c => !selectedIds.includes(c.id));

  return (
    <div className="space-y-3">
      <label className="block text-sm font-medium text-content">
        {t('form.characters')}
      </label>

      {/* Selected Characters */}
      {selectedCharacters.length > 0 && (
        <div className="space-y-2">
          <p className="text-xs text-muted">{t('form.selectedCharacters')}</p>
          <div className="flex flex-wrap gap-2">
            {selectedCharacters.map(character => (
              <div
                key={character.id}
                className="flex items-center gap-2 px-3 py-2 bg-primary/10 border border-primary rounded-lg"
              >
                <Avatar
                  src={character.avatar || undefined}
                  alt={character.firstName}
                  size="small"
                />
                <span className="text-sm font-medium text-content">
                  {character.firstName} {character.lastName || ''}
                </span>
                <button
                  type="button"
                  onClick={() => toggleCharacter(character.id)}
                  className="ml-2 text-error hover:text-error/80"
                >
                  ×
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Search */}
      <Input
        value={search}
        onChange={e => setSearch(e.target.value)}
        placeholder={t('form.searchCharacters')}
      />

      {/* Available Characters */}
      <div className="max-h-60 overflow-y-auto space-y-1 border border-border rounded-lg p-2">
        {isLoading && (
          <p className="text-sm text-muted text-center py-4">{t('common:loading')}</p>
        )}

        {!isLoading && availableCharacters.length === 0 && (
          <p className="text-sm text-muted text-center py-4">
            {search ? t('form.noCharactersFound') : t('form.noCharactersAvailable')}
          </p>
        )}

        {!isLoading && availableCharacters.map(character => (
          <button
            key={character.id}
            type="button"
            onClick={() => toggleCharacter(character.id)}
            className="w-full flex items-center gap-3 p-2 hover:bg-light rounded-lg transition-colors"
          >
            <Avatar
              src={character.avatar || undefined}
              alt={character.firstName}
              size="small"
            />
            <div className="flex-grow text-left">
              <p className="text-sm font-medium text-content">
                {character.firstName} {character.lastName || ''}
              </p>
              {character.personality && (
                <p className="text-xs text-muted truncate">
                  {character.personality.substring(0, 60)}...
                </p>
              )}
            </div>
          </button>
        ))}
      </div>
    </div>
  );
}
