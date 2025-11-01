import { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { StoryForm } from '../../create/StoryForm';
import { storyService } from '../../../../services/storyService';
import type { StoryFormData } from '../../../../types/story';
import { usePageHeader } from '../../../../hooks/usePageHeader';
import { useToast } from '../../../../contexts/ToastContext';

export default function StoryEditPage() {
  const { t } = useTranslation(['story', 'common']);
  const navigate = useNavigate();
  const { storyId } = useParams<{ storyId: string }>();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [initialData, setInitialData] = useState<StoryFormData | null>(null);
  const { setTitle } = usePageHeader();
  const { addToast } = useToast();

  // Load story data
  useEffect(() => {
    const loadStory = async () => {
      if (!storyId) return;

      try {
        setIsLoading(true);
        const story = await storyService.getById(storyId);

        // Convert story to form data
        const formData: StoryFormData = {
          title: story.title,
          synopsis: story.synopsis || '',
          initialText: story.initialText || '',
          coverImage: story.coverImage || '',
          objectives: story.objectives || [],
          characterIds: story.characters?.map(c => c.id) || [],
          tagIds: story.tags?.map(t => t.id) || [],
          ageRating: story.ageRating,
          contentTags: story.contentTags || [],
          isPublic: story.isPublic,
        };

        setInitialData(formData);
        setTitle(t('story:edit.title', 'Edit Story'));
      } catch (err) {
        console.error('Error loading story:', err);
        setError(t('story:errors.failedToLoad', 'Failed to load story'));
      } finally {
        setIsLoading(false);
      }
    };

    loadStory();
  }, [storyId, setTitle, t]);

  const handleSubmit = async (formData: StoryFormData) => {
    if (!storyId) return;

    setIsSubmitting(true);
    setError(null);

    try {
      const result = await storyService.update(storyId, formData);

      if (result.success) {
        addToast(t('story:edit.saved', 'Changes saved'), 'success');
        navigate(`/stories/${storyId}`);
      } else {
        setError(result.message || t('story:errors.updateFailed'));
      }
    } catch (err) {
      console.error('Error updating story:', err);
      setError(t('story:errors.updateFailed'));
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCancel = () => {
    if (storyId) {
      navigate(`/stories/${storyId}`);
    } else {
      navigate('/stories');
    }
  };

  if (isLoading) {
    return (
      <section className="flex h-[60vh] flex-col items-center justify-center gap-3 text-muted">
        <span className="material-symbols-outlined animate-spin text-5xl">progress_activity</span>
        <p>{t('common:loading', 'Loading...')}</p>
      </section>
    );
  }

  if (error && !initialData) {
    return (
      <section className="flex h-[60vh] flex-col items-center justify-center gap-3">
        <span className="material-symbols-outlined text-6xl text-danger">error</span>
        <p className="text-danger">{error}</p>
        <button
          onClick={() => navigate('/stories')}
          className="px-4 py-2 rounded-lg bg-primary text-white hover:bg-primary/90 transition-colors"
        >
          {t('common:back', 'Back to Stories')}
        </button>
      </section>
    );
  }

  return (
    <section className="flex flex-col gap-8">
      <header className="space-y-2">
        <h1 className="text-3xl font-semibold text-title">
          {t('story:edit.title', 'Edit Story')}
        </h1>
        <p className="max-w-2xl text-sm text-description">
          {t('story:edit.subtitle', 'Update your story details')}
        </p>
      </header>

      {error && (
        <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700 dark:border-red-500/40 dark:bg-red-500/10 dark:text-red-200">
          {error}
        </div>
      )}

      {initialData && (
        <div className="rounded-xl border border-border bg-normal p-6">
          <StoryForm
            mode="edit"
            storyId={storyId}
            initialData={initialData}
            onSubmit={handleSubmit}
            onCancel={handleCancel}
            isSubmitting={isSubmitting}
          />
        </div>
      )}
    </section>
  );
}
