import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { StoryForm } from './StoryForm';
import { storyService } from '../../../services/storyService';
import type { StoryFormData } from '../../../types/story';

export function CreateStoryPage() {
  const { t } = useTranslation('story');
  const navigate = useNavigate();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (formData: StoryFormData) => {
    setIsSubmitting(true);
    setError(null);

    try {
      const result = await storyService.create(formData);

      if (result.success && result.story) {
        // Navigate to the new story page
        navigate(`/stories/${result.story.id}`);
      } else {
        setError(result.message || t('errors.createFailed'));
      }
    } catch (err) {
      console.error('Error creating story:', err);
      setError(t('errors.createFailed'));
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="container mx-auto px-4 py-8 max-w-4xl">
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-title mb-2">
          {t('create.title')}
        </h1>
        <p className="text-muted">
          {t('create.subtitle')}
        </p>
      </div>

      {error && (
        <div className="mb-6 p-4 bg-error/10 border border-error rounded-lg text-error">
          {error}
        </div>
      )}

      <div className="bg-card rounded-lg shadow-lg p-6">
        <StoryForm
          onSubmit={handleSubmit}
          isSubmitting={isSubmitting}
        />
      </div>
    </div>
  );
}
