import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { StoryFormLayout } from '../shared/components';
import { storyService } from '../../../services/storyService';
import { usePageHeader } from '../../../hooks/usePageHeader';
import { useToast } from '../../../contexts/ToastContext';
import type { StoryFormData } from '../../../types/story';
import { Visibility } from '../../../types/common';
import type { AgeRating, ContentTag } from '../../../types/characters';
import type { StoryObjective } from '../../../types/story';

export default function StoryNewPage() {
  const { t } = useTranslation(['story', 'common']);
  const navigate = useNavigate();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [createdId, setCreatedId] = useState<string | null>(null);
  const { setTitle } = usePageHeader();
  const { addToast } = useToast();

  // Form data state
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
    visibility: Visibility.PUBLIC,
  });

  const [errors, setErrors] = useState<Record<string, string>>({});

  // Set page title
  useEffect(() => {
    setTitle(t('story:new.title', 'Create Story Manually'));
  }, [setTitle, t]);

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

    if (!validate()) {
      return;
    }

    setIsSubmitting(true);
    setError(null);

    try {
      if (!createdId) {
        // Create mode
        const result = await storyService.create(formData);

        if (result.success && result.story) {
          setCreatedId(result.story.id);
          addToast(t('story:create.saved', 'Story created successfully'), 'success');
          navigate(`/stories/${result.story.id}`);
        } else {
          setError(result.message || t('story:errors.createFailed', 'Failed to create story'));
        }
      }
    } catch (err) {
      console.error('Error creating story:', err);
      setError(t('story:errors.createFailed', 'Failed to create story'));
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCancel = () => {
    navigate('/stories');
  };

  return (
    <StoryFormLayout
      mode="create"
      data={formData}
      errors={errors}
      isSubmitting={isSubmitting}
      onFieldChange={handleFieldChange}
      onSubmit={handleSubmit}
      onCancel={handleCancel}
      submitLabel={t('common:save', 'Save')}
      cancelLabel={t('common:cancel', 'Cancel')}
    />
  );
}
