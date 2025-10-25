import { useState } from 'react';
import { Button } from '../../../components/ui';

interface Story {
  id: string;
  title: string;
  synopsis?: string;
  coverImage?: string;
  ageRating?: string;
  contentTags?: string[];
}

interface StoryCardProps {
  story: Story;
  onPlay?: (story: Story) => void | Promise<void>;
  blurNsfw?: boolean;
}

export function StoryCard({ story, onPlay, blurNsfw = false }: StoryCardProps) {
  const [imageLoaded, setImageLoaded] = useState(false);

  const shouldBlur = blurNsfw && story.contentTags?.includes('SEXUAL');

  const handlePlayClick = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (onPlay) {
      onPlay(story);
    }
  };

  return (
    <div className="block bg-light rounded-lg shadow-md hover:shadow-xl transition-all h-full flex flex-col group">
      <div className="relative h-48 overflow-hidden">
        {!imageLoaded && <div className="absolute inset-0 bg-gray-700 animate-pulse" />}
        <img
          src={story.coverImage || '/placeholder-story.png'}
          alt={story.title}
          className={`w-full h-full object-cover rounded-t-lg transition-all duration-300 group-hover:scale-105 ${
            shouldBlur ? 'blur-md' : ''
          } ${imageLoaded ? 'opacity-100' : 'opacity-0'}`}
          onLoad={() => setImageLoaded(true)}
        />

        {/* Play button overlay */}
        <div className="absolute inset-0 bg-black/0 group-hover:bg-black/40 transition-colors flex items-center justify-center">
          <Button
            variant="primary"
            size="regular"
            icon="play_arrow"
            onClick={handlePlayClick}
            className="opacity-0 group-hover:opacity-100 transition-opacity"
          >
            Play
          </Button>
        </div>

        {/* Age rating badge */}
        {story.ageRating && story.ageRating !== 'L' && (
          <span className="absolute bottom-2 left-2 px-2 py-1 text-xs font-semibold bg-black/70 text-white rounded">
            {story.ageRating}
          </span>
        )}
      </div>

      <div className="p-4 flex-grow flex flex-col justify-between">
        <div>
          <h3 className="font-semibold text-content truncate text-base">{story.title}</h3>
          {story.synopsis && (
            <p className="text-sm text-muted mt-1 line-clamp-2">{story.synopsis}</p>
          )}
        </div>
      </div>
    </div>
  );
}
