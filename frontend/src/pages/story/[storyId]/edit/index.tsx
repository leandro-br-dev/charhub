import { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { StoryFormLayout } from '../../shared/components';
import { storyService } from '../../../../services/storyService';
import type { StoryFormData } from '../../../../types/story';
import { usePageHeader } from '../../../../hooks/usePageHeader';
import { useToast } from '../../../../contexts/ToastContext';
import { Visibility } from '../../../../types/common';
import type { AgeRating, ContentTag } from '../../../../types/characters';

export default function StoryEditPage() {
  const { t } = useTranslation(['story', 'common']);
  const navigate = useNavigate();
  const { storyId } = useParams<{ storyId: string }>();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [formData, setFormData] = useState<StoryFormData>({
    title: '',
    synopsis: '',
    initialText: '',
    coverImage: '',
    objectives: [],
    characterIds: [],
    mainCharacterId: undefined,
    tagIds: [],
    ageRating: 'L' as AgeRating,
    contentTags: [] as ContentTag[],
    visibility: Visibility.PRIVATE,
  });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const { setTitle } = usePageHeader();
  const { addToast } = useToast();

  // Load story data
  useEffect(() => {
    const loadStory = async () => {
      if (!storyId) return;

      try {
        setIsLoading(true);
        const story = await storyService.getById(storyId);

        if (!story) {
          setError(t('story:errors.notFound', 'Story not found'));
          return;
        }

        // Convert story to form data
        const data: StoryFormData = {
          title: story.title,
          synopsis: story.synopsis || '',
          initialText: story.initialText || '',
          coverImage: story.coverImage || '',
          objectives: story.objectives || [],
          characterIds: story.characters?.map(c => c.id) || [],
          mainCharacterId: story.characters?.find(c => c.role === 'MAIN')?.id,
          tagIds: story.tags?.map(t => t.id) || [],
          ageRating: story.ageRating,
          contentTags: story.contentTags || [],
          visibility: story.visibility,
        };

        setFormData(data);
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

  const handleFieldChange = (field: keyof StoryFormData, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    // Clear error when field is modified
    if (errors[field]) {
      setErrors(prev => {
        const newErrors = { ...prev };
        delete newErrors[field];
        return newErrors;
      });
    }
  };

  const validate = (): boolean => {
    const newErrors: Record<string, string> = {};

    if (!formData.title || formData.title.trim().length === 0) {
      newErrors.title = t('story:validation.titleRequired', 'Title is required');
    } else if (formData.title.length > 100) {
      newErrors.title = t('story:validation.titleTooLong', 'Title is too long (max 100 characters)');
    }

    if (formData.synopsis && formData.synopsis.length > 2000) {
      newErrors.synopsis = t('story:validation.synopsisTooLong', 'Synopsis is too long (max 2000 characters)');
    }

    if (formData.initialText && formData.initialText.length > 5000) {
      newErrors.initialText = t('story:validation.initialTextTooLong', 'Opening scene is too long (max 5000 characters)');
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!storyId) return;

    if (!validate()) {
      return;
    }

    setIsSubmitting(true);
    setError(null);

    try {
      const result = await storyService.update(storyId, formData);

      if (result.success) {
        addToast(t('story:edit.saved', 'Changes saved'), 'success');
        navigate(`/stories/${storyId}`);
      } else {
        setError(result.message || t('story:errors.updateFailed', 'Failed to update story'));
      }
    } catch (err) {
      console.error('Error updating story:', err);
      setError(t('story:errors.updateFailed', 'Failed to update story'));
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

  if (error && !formData.title) {
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
    <StoryFormLayout
      mode="edit"
      storyId={storyId}
      data={formData}
      errors={errors}
      isSubmitting={isSubmitting}
      onFieldChange={handleFieldChange}
      onSubmit={handleSubmit}
      onCancel={handleCancel}
      submitLabel={t('common:save', 'Save Changes')}
      cancelLabel={t('common:cancel', 'Cancel')}
    />
  );
}
