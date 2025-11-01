import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { StoryForm } from './StoryForm';
import { storyService } from '../../../services/storyService';
import type { StoryFormData } from '../../../types/story';
import { usePageHeader } from '../../../hooks/usePageHeader';
import { useToast } from '../../../contexts/ToastContext';

export default function StoryCreatePage() {
  const { t } = useTranslation(['story', 'common']);
  const navigate = useNavigate();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [createdId, setCreatedId] = useState<string | null>(null);
  const { setTitle } = usePageHeader();
  const { addToast } = useToast();

  // Set page title
  useEffect(() => {
    setTitle(t('story:create.title', 'Create Story'));
  }, [setTitle, t]);

  const handleSubmit = async (formData: StoryFormData) => {
    setIsSubmitting(true);
    setError(null);

    try {
      if (!createdId) {
        // Create mode
        const result = await storyService.create(formData);

        if (result.success && result.story) {
          setCreatedId(result.story.id);
          addToast(t('story:create.saved', 'Story saved'), 'success');
        } else {
          setError(result.message || t('story:errors.createFailed'));
        }
      } else {
        // Update mode (after initial creation)
        const result = await storyService.update(createdId, formData);

        if (result.success) {
          addToast(t('story:edit.saved', 'Changes saved'), 'success');
        } else {
          setError(result.message || t('story:errors.updateFailed'));
        }
      }
    } catch (err) {
      console.error('Error saving story:', err);
      setError(
        createdId
          ? t('story:errors.updateFailed')
          : t('story:errors.createFailed')
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCancel = () => {
    if (createdId) {
      navigate(`/stories/${createdId}`);
    } else {
      navigate('/stories');
    }
  };

  const handleViewStory = () => {
    if (createdId) {
      navigate(`/stories/${createdId}`);
    }
  };

  return (
    <section className="flex flex-col gap-8">
      <header className="space-y-2">
        <h1 className="text-3xl font-semibold text-title">
          {t('story:create.title', 'Create Story')}
        </h1>
        <p className="max-w-2xl text-sm text-description">
          {t('story:create.subtitle', 'Create an interactive story with characters')}
        </p>
      </header>

      {error && (
        <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700 dark:border-red-500/40 dark:bg-red-500/10 dark:text-red-200">
          {error}
        </div>
      )}

      <div className="rounded-xl border border-border bg-normal p-6">
        <StoryForm
          mode={createdId ? 'edit' : 'create'}
          storyId={createdId ?? undefined}
          onSubmit={handleSubmit}
          onCancel={handleCancel}
          isSubmitting={isSubmitting}
        />
      </div>

      {createdId && (
        <div className="flex justify-end gap-3">
          <button
            type="button"
            onClick={handleViewStory}
            className="px-4 py-2 rounded-lg border border-border bg-light text-content hover:bg-input transition-colors"
          >
            {t('story:create.viewStory', 'View Story')}
          </button>
        </div>
      )}
    </section>
  );
}
