import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { storyService } from '../../../../services/storyService';
import type { Story } from '../../../../types/story';

type StoryListSidebarProps = {
  onLinkClick?: () => void;
};

export function StoryListSidebar({ onLinkClick }: StoryListSidebarProps) {
  const { t } = useTranslation(['story', 'common']);
  const [stories, setStories] = useState<Story[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchStories = async () => {
      try {
        setIsLoading(true);
        const response = await storyService.getMyStories({ limit: 10 });
        setStories(response.items);
      } catch (err) {
        setError(t('story:errors.failedToLoad', 'Failed to load stories'));
        console.error(err);
      } finally {
        setIsLoading(false);
      }
    };

    fetchStories();
  }, [t]);

  if (isLoading) {
    return <div className="p-4 text-sm text-muted">{t('common:loading', 'Loading...')}</div>;
  }

  if (error) {
    return <div className="p-4 text-sm text-red-500">{error}</div>;
  }

  return (
    <div className="flex flex-col gap-2 py-4">
      <h3 className="text-xs font-semibold text-muted uppercase mb-3 px-4">
        {t('story:sidebar.myStories', 'My Stories')}
      </h3>
      {stories.length === 0 ? (
        <p className="text-sm text-muted px-4">{t('story:sidebar.noStories', 'No stories yet')}</p>
      ) : (
        <ul className="space-y-2">
          {stories.map(story => (
            <li key={story.id}>
              <Link
                to={`/stories/${story.id}`}
                onClick={onLinkClick}
                className="flex items-center gap-3 rounded-md p-2 hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors"
              >
                {story.coverImage ? (
                  <img
                    src={story.coverImage}
                    alt={story.title}
                    className="h-8 w-12 rounded object-cover"
                  />
                ) : (
                  <div className="h-8 w-12 rounded bg-gray-300 dark:bg-gray-600 flex items-center justify-center">
                    <span className="material-symbols-outlined text-sm text-gray-500">
                      book
                    </span>
                  </div>
                )}
                <span className="text-sm font-medium text-content truncate flex-1">
                  {story.title}
                </span>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
