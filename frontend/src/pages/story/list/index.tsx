import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Button } from '../../../components/ui';
import { storyService } from '../../../services/storyService';
import type { Story } from '../../../types/story';

export function StoryListPage() {
  const { t } = useTranslation(['story', 'common']);
  const navigate = useNavigate();
  const [stories, setStories] = useState<Story[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchStories = async () => {
      try {
        setIsLoading(true);
        const response = await storyService.getMyStories({ limit: 50 });
        setStories(response.items);
      } catch (err) {
        console.error('Error loading stories:', err);
        setError(t('story:errors.failedToLoad', 'Failed to load stories'));
      } finally {
        setIsLoading(false);
      }
    };

    fetchStories();
  }, [t]);

  const handleCreateStory = () => {
    navigate('/stories/create');
  };

  const handleStoryClick = (storyId: string) => {
    navigate(`/stories/${storyId}`);
  };

  if (isLoading) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="text-center text-muted">{t('common:loading', 'Loading...')}</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="text-center text-red-500">{error}</div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8 max-w-7xl">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-3xl font-bold text-title">
            {t('story:list.title', 'My Stories')}
          </h1>
          <p className="text-muted mt-2">
            {t('story:list.subtitle', 'Manage your interactive stories')}
          </p>
        </div>
        <Button icon="add" onClick={handleCreateStory}>
          {t('common:create', 'Create')}
        </Button>
      </div>

      {stories.length === 0 ? (
        <div className="text-center py-12">
          <div className="mb-4">
            <span className="material-symbols-outlined text-6xl text-muted">book</span>
          </div>
          <h2 className="text-xl font-semibold text-content mb-2">
            {t('story:list.empty.title', 'No stories yet')}
          </h2>
          <p className="text-muted mb-6">
            {t('story:list.empty.description', 'Create your first interactive story')}
          </p>
          <Button icon="add" onClick={handleCreateStory}>
            {t('story:list.empty.action', 'Create Story')}
          </Button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {stories.map(story => (
            <div
              key={story.id}
              onClick={() => handleStoryClick(story.id)}
              className="bg-card rounded-lg shadow-md hover:shadow-xl transition-shadow cursor-pointer overflow-hidden"
            >
              {story.coverImage ? (
                <div className="h-48 w-full">
                  <img
                    src={story.coverImage}
                    alt={story.title}
                    className="w-full h-full object-cover"
                  />
                </div>
              ) : (
                <div className="h-48 w-full bg-gray-300 dark:bg-gray-600 flex items-center justify-center">
                  <span className="material-symbols-outlined text-6xl text-gray-500">
                    book
                  </span>
                </div>
              )}

              <div className="p-4">
                <h3 className="font-semibold text-content text-lg mb-2 truncate">
                  {story.title}
                </h3>
                {story.synopsis && (
                  <p className="text-sm text-muted line-clamp-2 mb-3">
                    {story.synopsis}
                  </p>
                )}
                <div className="flex items-center justify-between text-xs text-muted">
                  <span>
                    {story.isPublic
                      ? t('story:list.public', 'Public')
                      : t('story:list.private', 'Private')}
                  </span>
                  {story.ageRating && (
                    <span className="px-2 py-1 bg-gray-200 dark:bg-gray-700 rounded">
                      {story.ageRating}
                    </span>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
