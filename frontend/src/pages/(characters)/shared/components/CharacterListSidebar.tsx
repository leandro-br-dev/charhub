import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
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

export function CharacterListSidebar({ onLinkClick }: CharacterListSidebarProps) {
  const [characters, setCharacters] = useState<CharacterWithFavorite[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { user } = useAuth();

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
          characterService.list({ public: false, limit: 10, sortBy: 'updatedAt' }),
          characterService.getFavorites(15),
        ]);

        const favoriteIds = new Set(favoriteResponse.map(c => c.id));

        // Combine and mark ownership/favorite status
        const combined: CharacterWithFavorite[] = [];

        // Add own characters first
        for (const char of ownResponse.items) {
          combined.push({
            ...char,
            isOwn: true,
            isFavorite: favoriteIds.has(char.id),
          });
          // Remove from favorites set to avoid duplicates
          favoriteIds.delete(char.id);
        }

        // Add remaining favorite characters (not owned by user)
        for (const char of favoriteResponse) {
          if (favoriteIds.has(char.id)) {
            combined.push({
              ...char,
              isOwn: false,
              isFavorite: true,
            });
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
      <h3 className="text-xs font-semibold text-muted uppercase mb-3 px-4">Characters</h3>
      {characters.length === 0 ? (
        <p className="text-sm text-muted px-4">No characters found.</p>
      ) : (
        <ul className="space-y-2">
          {characters.map(character => {
            const fullName = [character.firstName, character.lastName].filter(Boolean).join(' ');
            return (
              <li key={character.id}>
                <Link
                  to={`/characters/${character.id}`}
                  onClick={onLinkClick}
                  className="flex items-center gap-3 rounded-md p-2 hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors"
                >
                  {character.avatar ? (
                    <CachedImage src={character.avatar} alt={fullName} className="h-8 w-8 rounded-full object-cover" />
                  ) : (
                    <img src="/logo.png" alt={fullName} className="h-8 w-8 rounded-full object-cover" />
                  )}
                  <div className="flex flex-col flex-grow min-w-0">
                    <span className="text-sm font-medium text-content truncate">{fullName}</span>
                    <div className="flex items-center gap-1">
                      {character.isOwn && (
                        <span className="text-xs text-muted">My character</span>
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
