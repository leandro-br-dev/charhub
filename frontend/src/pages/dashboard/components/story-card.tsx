import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Button } from '../../../components/ui';
import type { Story } from '../../../types/story';
import { useContentFilter } from '../../../contexts/ContentFilterContext';

interface StoryCardProps {
  story: Story;
  onPlay?: (story: Story) => void | Promise<void>;
  blurNsfw?: boolean;
}

export function StoryCard({ story, onPlay, blurNsfw = false }: StoryCardProps) {
  const [imageLoaded, setImageLoaded] = useState(false);
  const { shouldHideContent } = useContentFilter();
  const { t } = useTranslation(['dashboard']);

  const shouldHide = shouldHideContent(story.ageRating as any, (story.contentTags as any) || []);
  const shouldBlur = blurNsfw && story.contentTags?.includes('SEXUAL');

  const handlePlayClick = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (onPlay) {
      onPlay(story);
    }
  };

  if (shouldHide) {
    return null;
  }

  return (
    <div className="block bg-light rounded-lg shadow-md hover:shadow-xl transition-all min-h-[18rem] h-full flex flex-col group basis-[calc(50%-0.5rem)] sm:w-[180px] md:w-[192px] lg:w-[192px] max-w-[192px] overflow-hidden">
      <div className="relative h-48 overflow-hidden">
        {!imageLoaded && <div className="absolute inset-0 bg-gray-700 animate-pulse" />}
        <img
          src={story.coverImage || '/placeholder-story.png'}
          alt={t('dashboard:storyCard.alt', { title: story.title })}
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
            {t('dashboard:storyCard.play')}
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
          <div className="mt-1 min-h-[40px]">
            {story.synopsis ? (
              <p className="text-sm text-muted line-clamp-2">{story.synopsis}</p>
            ) : null}
          </div>
        </div>
      </div>
    </div>
  );
}
