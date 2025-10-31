import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { CachedImage } from '../../../../components/ui/CachedImage';
import { characterService } from '../../../../services/characterService';
import type { CharacterSummary } from '../../../../types/characters';
import { FavoriteButton } from '../../../../components/ui/FavoriteButton';

type CharacterListSidebarProps = {
  onLinkClick?: () => void;
};

interface CharacterWithFavorite extends CharacterSummary {
  isFavorite: boolean;
}

export function CharacterListSidebar({ onLinkClick }: CharacterListSidebarProps) {
  const [characters, setCharacters] = useState<CharacterWithFavorite[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchCharacters = async () => {
      try {
        setIsLoading(true);
        const [favoriteResponse, allResponse] = await Promise.all([
          characterService.getFavorites(100), 
          characterService.list({ limit: 10 }),
        ]);
        const favoriteIds = new Set(favoriteResponse.map(c => c.id));
        const combined = allResponse.items.map(char => ({
          ...char,
          isFavorite: favoriteIds.has(char.id),
        }));
        combined.sort((a, b) => {
          if (a.isFavorite && !b.isFavorite) return -1;
          if (!a.isFavorite && b.isFavorite) return 1;
          return 0;
        });
        setCharacters(combined);
      } catch (err) {
        setError('Failed to load characters.');
        console.error(err);
      } finally {
        setIsLoading(false);
      }
    };
    fetchCharacters();
  }, []);

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
                  <span className="text-sm font-medium text-content flex-grow">{fullName}</span>
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
