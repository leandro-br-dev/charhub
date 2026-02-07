import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { CachedImage } from '../../../../components/ui/CachedImage';
import { characterService } from '../../../../services/characterService';
import type { CharacterSummary } from '../../../../types/characters';
import { FavoriteButton } from '../../../../components/ui/FavoriteButton';
import { useAuth } from '../../../../hooks/useAuth';

type CharacterListSidebarProps = {
  onLinkClick?: () => void;
};

interface CharacterWithFavorite extends CharacterSummary {
  isFavorite: boolean;
  isOwn: boolean;
}

// Helper function to extract avatar URL from character
const getAvatarUrl = (character: CharacterSummary): string | null => {
  // First check if avatar field exists
  if (character.avatar) {
    return character.avatar;
  }
  // Otherwise, extract from images array
  if ('images' in character && character.images && Array.isArray(character.images) && character.images.length > 0) {
    const avatarImage = (character.images as any[]).find((img: any) => img.type === 'AVATAR' && img.isActive);
    if (avatarImage) {
      return avatarImage.url;
    }
  }
  return null;
};

export function CharacterListSidebar({ onLinkClick }: CharacterListSidebarProps) {
  const [characters, setCharacters] = useState<CharacterWithFavorite[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { user } = useAuth();
  const { t } = useTranslation('characters');

  useEffect(() => {
    const fetchCharacters = async () => {
      // Only load if user is authenticated
      if (!user) {
        setCharacters([]);
        setIsLoading(false);
        return;
      }

      try {
        setIsLoading(true);

        // Fetch user's own characters and favorites in parallel
        const [ownResponse, favoriteResponse] = await Promise.all([
          characterService.list({ public: false, limit: 15, sortBy: 'updatedAt' }),
          characterService.getFavorites(15),
        ]);

        // Track which IDs are already added to avoid duplicates
        const addedIds = new Set<string>();
        const combined: CharacterWithFavorite[] = [];

        // Add favorite characters FIRST
        for (const char of favoriteResponse) {
          if (!addedIds.has(char.id)) {
            // Normalize avatar URL from images array if needed
            const normalizedChar = { ...char };
            if (!char.avatar && 'images' in char && char.images && Array.isArray(char.images)) {
              const avatarImage = (char.images as any[]).find((img: any) => img.type === 'AVATAR' && img.isActive);
              if (avatarImage) {
                (normalizedChar as any).avatar = avatarImage.url;
              }
            }
            combined.push({
              ...normalizedChar,
              isOwn: char.userId === user.id,
              isFavorite: true,
            });
            addedIds.add(char.id);
          }
        }

        // Add remaining own characters (not already in favorites)
        for (const char of ownResponse.items) {
          if (!addedIds.has(char.id)) {
            combined.push({
              ...char,
              isOwn: true,
              isFavorite: false,
            });
            addedIds.add(char.id);
          }
        }

        // Limit to 15 total
        const limited = combined.slice(0, 15);

        setCharacters(limited);
      } catch (err) {
        setError('Failed to load characters.');
        console.error(err);
      } finally {
        setIsLoading(false);
      }
    };
    fetchCharacters();
  }, [user]);

  if (isLoading) {
    return <div className="p-4 text-sm text-muted">Loading characters...</div>;
  }

  if (error) {
    return <div className="p-4 text-sm text-danger">{error}</div>;
  }

  return (
    <div className="flex flex-col gap-2 py-4">
      <h3 className="text-xs font-semibold text-muted uppercase mb-3 px-4">
        {t('stats.characters')}
      </h3>
      {characters.length === 0 ? (
        <p className="text-sm text-muted px-4">{t('emptyStates.noCharacters')}</p>
      ) : (
        <ul className="space-y-2">
          {characters.map(character => {
            const fullName = [character.firstName, character.lastName].filter(Boolean).join(' ');
            const avatarUrl = getAvatarUrl(character);
            return (
              <li key={character.id}>
                <Link
                  to={`/characters/${character.id}`}
                  onClick={onLinkClick}
                  className="flex items-center gap-3 rounded-md p-2 hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors"
                >
                  {avatarUrl ? (
                    <CachedImage src={avatarUrl} alt={fullName} className="h-8 w-8 rounded-full object-cover" />
                  ) : (
                    <img src="/logo.png" alt={fullName} className="h-8 w-8 rounded-full object-cover" />
                  )}
                  <div className="flex flex-col flex-grow min-w-0">
                    <span className="text-sm font-medium text-content truncate">{fullName}</span>
                    <div className="flex items-center gap-1">
                      {character.isOwn && (
                        <span className="text-xs text-muted">{t('sidebar.myCharacter')}</span>
                      )}
                    </div>
                  </div>
                  {character.isFavorite && (
                    <FavoriteButton
                      characterId={character.id}
                      initialIsFavorited={true}
                      size="small"
                      readOnly={true}
                    />
                  )}
                </Link>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
