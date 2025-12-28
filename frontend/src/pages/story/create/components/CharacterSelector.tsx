import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { characterService } from '../../../../services/characterService';
import { Avatar, Input } from '../../../../components/ui';
import type { Character } from '../../../../types/characters';

interface CharacterSelectorProps {
  selectedIds: string[];
  mainCharacterId?: string; // ID of the MAIN character
  onChange: (ids: string[]) => void;
  onMainCharacterChange?: (id: string) => void; // Callback when MAIN character changes
}

export function CharacterSelector({ selectedIds, mainCharacterId, onChange, onMainCharacterChange }: CharacterSelectorProps) {
  const { t } = useTranslation('story');
  const [characters, setCharacters] = useState<Character[]>([]);
  const [search, setSearch] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);

  useEffect(() => {
    loadCharacters();
  }, [search]);

  const loadCharacters = async () => {
    setIsLoading(true);
    try {
      const response = await characterService.list({
        search: search || undefined,
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

  const selectedCharacters = characters
    .filter(c => selectedIds.includes(c.id))
    .sort((a, b) => {
      // Main character first
      if (a.id === mainCharacterId) return -1;
      if (b.id === mainCharacterId) return 1;
      return 0;
    });
  const availableCharacters = characters.filter(c => !selectedIds.includes(c.id));

  const mainCharacter = selectedCharacters.find(c => c.id === mainCharacterId);

  return (
    <div className="space-y-3">
      <label className="block text-sm font-medium text-content">
        {t('form.characters')}
      </label>

      {/* Main Character Selector Dropdown */}
      {selectedCharacters.length > 0 && (
        <div className="space-y-2">
          <label className="block text-xs font-medium text-muted flex items-center gap-1">
            <span className="material-symbols-outlined text-sm">star</span>
            {t('form.mainCharacterLabel', 'Main Character (played by you)')}
          </label>
          <div className="relative">
            <button
              type="button"
              onClick={() => setIsDropdownOpen(!isDropdownOpen)}
              className="w-full flex items-center justify-between px-3 py-2 bg-light border border-border rounded-lg hover:bg-border transition-colors"
            >
              <div className="flex items-center gap-2">
                {mainCharacter ? (
                  <>
                    <span className="material-symbols-outlined text-amber-500">star</span>
                    <Avatar
                      src={mainCharacter.avatar || undefined}
                      alt={mainCharacter.firstName}
                      size="small"
                    />
                    <span className="text-sm font-medium text-content">
                      {mainCharacter.firstName} {mainCharacter.lastName || ''}
                    </span>
                  </>
                ) : (
                  <span className="text-sm text-muted">
                    {t('form.selectMainCharacter', 'Select main character...')}
                  </span>
                )}
              </div>
              <span className="material-symbols-outlined text-muted">
                {isDropdownOpen ? 'expand_less' : 'expand_more'}
              </span>
            </button>

            {/* Dropdown Menu */}
            {isDropdownOpen && (
              <>
                <div
                  className="fixed inset-0 z-10"
                  onClick={() => setIsDropdownOpen(false)}
                />
                <div className="absolute z-20 w-full mt-1 bg-normal border border-border rounded-lg shadow-lg max-h-48 overflow-y-auto">
                  {selectedCharacters.map(character => {
                    const isMain = character.id === mainCharacterId;
                    return (
                      <button
                        key={character.id}
                        type="button"
                        onClick={() => {
                          if (onMainCharacterChange) {
                            onMainCharacterChange(character.id);
                          }
                          setIsDropdownOpen(false);
                        }}
                        className={`w-full flex items-center gap-2 px-3 py-2 hover:bg-light transition-colors ${
                          isMain ? 'bg-light/50' : ''
                        }`}
                      >
                        <Avatar
                          src={character.avatar || undefined}
                          alt={character.firstName}
                          size="small"
                        />
                        <span className="text-sm flex-grow text-left">
                          {character.firstName} {character.lastName || ''}
                        </span>
                        {isMain && (
                          <span className="material-symbols-outlined text-amber-500 text-sm">check</span>
                        )}
                      </button>
                    );
                  })}
                </div>
              </>
            )}
          </div>
        </div>
      )}

      {/* Selected Characters List */}
      {selectedCharacters.length > 0 && (
        <div className="space-y-2">
          <p className="text-xs text-muted">
            {t('form.selectedCharacters')} ({selectedCharacters.length})
          </p>
          <div className="flex flex-wrap gap-2">
            {selectedCharacters.map(character => {
              const isMain = character.id === mainCharacterId;
              return (
                <div
                  key={character.id}
                  className={`flex items-center gap-2 px-3 py-2 border rounded-lg transition-all ${
                    isMain
                      ? 'bg-amber-50 border-amber-200 dark:bg-amber-500/10 dark:border-amber-500/30'
                      : 'bg-light border-border hover:bg-border'
                  }`}
                >
                  {isMain && (
                    <span className="material-symbols-outlined text-amber-500 text-sm">star</span>
                  )}
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
                    className="ml-1 text-muted hover:text-error transition-colors"
                    title={t('form.removeCharacter', 'Remove')}
                  >
                    <span className="material-symbols-outlined text-sm">close</span>
                  </button>
                </div>
              );
            })}
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
