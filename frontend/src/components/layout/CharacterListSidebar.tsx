import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { characterService } from '../../services/characterService';
import type { CharacterSummary } from '../../types/characters';

type CharacterListSidebarProps = {
  onLinkClick?: () => void;
};

export function CharacterListSidebar({ onLinkClick }: CharacterListSidebarProps) {
  const [characters, setCharacters] = useState<CharacterSummary[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchCharacters = async () => {
      try {
        setIsLoading(true);
        const response = await characterService.list();
        setCharacters(response.items.slice(0, 10));
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
      <h2 className="text-base font-semibold text-content px-4">Characters</h2>
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
                  className="flex items-center gap-3 rounded-md p-2 hover:bg-primary/10"
                >
                  <img
                    src={character.avatar ?? '/logo.png'}
                    alt={fullName}
                    className="h-8 w-8 rounded-full object-cover"
                  />
                  <span className="text-sm font-medium text-content">{fullName}</span>
                </Link>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
