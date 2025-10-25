import { Link } from 'react-router-dom';
import { useState } from 'react';

interface Character {
  id: string;
  firstName: string;
  lastName?: string | null;
  avatar?: string | null;
  ageRating?: string;
  contentTags?: string[];
  personality?: string | null;
  creator?: {
    id: string;
    displayName: string | null;
    avatarUrl: string | null;
  };
  tags?: Array<{ id: string; name: string }>;
}

interface CharacterCardProps {
  character: Character;
  isFavorite?: boolean;
  onFavoriteToggle?: (characterId: string, shouldBeFavorite: boolean) => void;
  clickAction?: 'view' | 'chat';
  blurNsfw?: boolean;
}

export function CharacterCard({
  character,
  isFavorite = false,
  onFavoriteToggle,
  clickAction = 'view',
  blurNsfw = false,
}: CharacterCardProps) {
  const [imageLoaded, setImageLoaded] = useState(false);

  const fullName = character.lastName
    ? `${character.firstName} ${character.lastName}`
    : character.firstName;

  const shouldBlur = blurNsfw && character.contentTags?.includes('SEXUAL');

  const linkTo =
    clickAction === 'chat' ? `/chat/new?characterId=${character.id}` : `/characters/${character.id}`;

  const handleFavoriteClick = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (onFavoriteToggle) {
      onFavoriteToggle(character.id, !isFavorite);
    }
  };

  return (
    <Link
      to={linkTo}
      className="block bg-light rounded-lg shadow-md hover:shadow-xl transition-shadow duration-300 transform hover:-translate-y-1 cursor-pointer h-full flex flex-col"
    >
      <div className="relative">
        {!imageLoaded && (
          <div className="w-full h-48 bg-gray-700 animate-pulse rounded-t-lg" />
        )}
        <img
          src={character.avatar || '/placeholder-character.png'}
          alt={fullName}
          className={`w-full h-48 object-cover rounded-t-lg ${
            shouldBlur ? 'blur-md' : ''
          } ${imageLoaded ? 'opacity-100' : 'opacity-0'}`}
          onLoad={() => setImageLoaded(true)}
        />

        {/* Favorite button */}
        {onFavoriteToggle && (
          <button
            onClick={handleFavoriteClick}
            className="absolute top-2 right-2 w-8 h-8 flex items-center justify-center bg-black/50 rounded-full text-white hover:bg-black/70 transition-colors"
            aria-label={isFavorite ? 'Remove from favorites' : 'Add to favorites'}
          >
            <span
              className={`material-symbols-outlined text-xl transition-colors ${
                isFavorite ? 'text-yellow-400' : 'text-white/80'
              }`}
            >
              {isFavorite ? 'star' : 'star_outline'}
            </span>
          </button>
        )}

        {/* Age rating badge */}
        {character.ageRating && character.ageRating !== 'L' && (
          <span className="absolute top-2 left-2 px-2 py-1 text-xs font-semibold bg-black/70 text-white rounded">
            {character.ageRating}
          </span>
        )}
      </div>

      <div className="p-4 flex flex-col flex-grow">
        <h3 className="text-lg font-bold text-content truncate" title={fullName}>
          {fullName}
        </h3>
        <p className="text-xs text-muted mb-2">
          por <span className="font-semibold">{character.creator?.displayName || 'desconhecido'}</span>
        </p>
        <p className={`text-sm text-description line-clamp-2 flex-grow ${shouldBlur ? 'blur-sm select-none' : ''}`}>
          {character.personality || 'Sem descrição.'}
        </p>
        <div className={`flex flex-nowrap gap-1.5 mt-3 overflow-hidden ${shouldBlur ? 'blur-sm select-none' : ''}`}>
          {(character.tags || []).slice(0, 3).map(tag => (
            <span key={tag.id} className="flex-shrink-0 px-2 py-0.5 text-xs bg-primary text-black rounded-full">
              {tag.name}
            </span>
          ))}
        </div>
      </div>
    </Link>
  );
}
