import { useNavigate } from 'react-router-dom';
import { CachedImage } from '../../../../components/ui/CachedImage';
import { Tag as UITag } from '../../../../components/ui/Tag';
import type { Story } from '../../../../types/story';

export interface StoryCardProps {
  story: Story;
  clickAction?: 'view' | 'play';
  blurNsfw?: boolean;
}

export function StoryCard({ story, clickAction = 'view', blurNsfw = false }: StoryCardProps) {
  const navigate = useNavigate();

  const isNsfw = story.contentTags?.some(
    tag => tag === 'SEXUAL' || tag === 'NUDITY'
  ) || false;

  const shouldBlur = blurNsfw && isNsfw;

  const handleCardClick = () => {
    if (clickAction === 'play') {
      // TODO: Implement play story logic
      navigate(`/stories/${story.id}`);
    } else {
      navigate(`/stories/${story.id}`);
    }
  };

  const displayTitle = story.title;

  return (
    <div
      className="group relative flex h-full cursor-pointer flex-col overflow-hidden rounded-2xl bg-card shadow-md transition-all duration-200 hover:shadow-xl hover:-translate-y-1"
      onClick={handleCardClick}
    >
      {/* Cover Image */}
      <div className="relative aspect-[2/3] w-full overflow-hidden bg-light">
        {story.coverImage ? (
          <CachedImage
            src={story.coverImage}
            alt={displayTitle}
            className={`h-full w-full object-cover transition-transform duration-300 group-hover:scale-105 ${
              shouldBlur ? 'blur-xl' : ''
            }`}
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center bg-gradient-to-br from-primary/20 to-secondary/20">
            <span className="material-symbols-outlined text-9xl text-primary/40">book</span>
          </div>
        )}

        {/* Age Rating Badge - Top Left */}
        {story.ageRating && (
          <div className="absolute left-2 top-2 z-10">
            <UITag
              label={story.ageRating}
              icon={<span className="material-symbols-outlined text-xs">verified</span>}
              tone="success"
              selected
              disabled
            />
          </div>
        )}

        {/* Visibility Badge - Top Right */}
        <div className="absolute right-2 top-2 z-10">
          <UITag
            label={story.isPublic ? 'Public' : 'Private'}
            icon={<span className="material-symbols-outlined text-xs">{story.isPublic ? 'public' : 'lock'}</span>}
            tone={story.isPublic ? 'info' : 'warning'}
            selected
            disabled
          />
        </div>

        {/* NSFW Blur Overlay */}
        {shouldBlur && (
          <div className="absolute inset-0 z-20 flex items-center justify-center bg-black/60 backdrop-blur-sm">
            <div className="text-center">
              <span className="material-symbols-outlined text-5xl text-white mb-2">18_up_rating</span>
              <p className="text-sm font-medium text-white">NSFW Content</p>
            </div>
          </div>
        )}

        {/* Gradient overlay for better text readability */}
        <div className="pointer-events-none absolute inset-x-0 bottom-0 h-24 bg-gradient-to-t from-black/60 to-transparent" />
      </div>

      {/* Story Info */}
      <div className="flex flex-1 flex-col gap-2 p-4">
        {/* Title */}
        <h3 className="line-clamp-2 text-base font-semibold text-title leading-tight">
          {displayTitle}
        </h3>

        {/* Synopsis */}
        {story.synopsis && (
          <p className="line-clamp-2 text-xs text-muted leading-snug flex-1">
            {story.synopsis}
          </p>
        )}

        {/* Action Button */}
        <div className="mt-auto pt-2">
          <button
            onClick={(e) => {
              e.stopPropagation();
              handleCardClick();
            }}
            className="w-full rounded-lg bg-primary/10 px-3 py-2 text-sm font-medium text-primary transition-colors hover:bg-primary/20"
          >
            {clickAction === 'play' ? (
              <div className="flex items-center justify-center gap-2">
                <span className="material-symbols-outlined text-base">play_arrow</span>
                <span>Play Story</span>
              </div>
            ) : (
              <div className="flex items-center justify-center gap-2">
                <span className="material-symbols-outlined text-base">visibility</span>
                <span>View Details</span>
              </div>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
