import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Input, Textarea, Button, Select } from '../../../components/ui';
import { CharacterSelector, TagSelector, ObjectivesList, CoverImageUploader } from './components';
import type { StoryFormData, StoryObjective } from '../../../types/story';
import type { AgeRating, ContentTag } from '../../../types/characters';

interface StoryFormProps {
  mode?: 'create' | 'edit';
  storyId?: string;
  initialData?: Partial<StoryFormData>;
  onSubmit: (data: StoryFormData) => Promise<void>;
  onCancel?: () => void;
  isSubmitting?: boolean;
}

const AGE_RATINGS: AgeRating[] = ['L', 'TEN', 'TWELVE', 'FOURTEEN', 'SIXTEEN', 'EIGHTEEN'];

const CONTENT_TAGS: ContentTag[] = [
  'VIOLENCE',
  'GORE',
  'SEXUAL',
  'NUDITY',
  'LANGUAGE',
  'DRUGS',
  'ALCOHOL',
  'HORROR',
  'PSYCHOLOGICAL',
  'DISCRIMINATION',
  'CRIME',
  'GAMBLING',
];

export function StoryForm({ mode = 'create', storyId, initialData, onSubmit, onCancel, isSubmitting = false }: StoryFormProps) {
  const { t } = useTranslation(['story', 'common']);
  const navigate = useNavigate();

  const [formData, setFormData] = useState<StoryFormData>({
    title: initialData?.title || '',
    synopsis: initialData?.synopsis || '',
    initialText: initialData?.initialText || '',
    coverImage: initialData?.coverImage || '',
    objectives: initialData?.objectives || [],
    characterIds: initialData?.characterIds || [],
    tagIds: initialData?.tagIds || [],
    ageRating: initialData?.ageRating || 'L',
    contentTags: initialData?.contentTags || [],
    isPublic: initialData?.isPublic ?? false,
  });

  const [errors, setErrors] = useState<Record<string, string>>({});

  const handleChange = (field: keyof StoryFormData, value: any) => {
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
      newErrors.title = t('story:validation.titleRequired');
    } else if (formData.title.length > 100) {
      newErrors.title = t('story:validation.titleTooLong');
    }

    if (formData.synopsis && formData.synopsis.length > 2000) {
      newErrors.synopsis = t('story:validation.synopsisTooLong');
    }

    if (formData.initialText && formData.initialText.length > 5000) {
      newErrors.initialText = t('story:validation.initialTextTooLong');
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validate()) {
      return;
    }

    try {
      await onSubmit(formData);
    } catch (error) {
      console.error('Error submitting story:', error);
    }
  };

  const handleCancel = () => {
    if (onCancel) {
      onCancel();
    } else {
      navigate('/stories');
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* Title */}
      <div>
        <Input
          label={t('story:form.title')}
          value={formData.title}
          onChange={e => handleChange('title', e.target.value)}
          error={errors.title}
          required
          maxLength={100}
          placeholder={t('story:form.titlePlaceholder')}
        />
      </div>

      {/* Synopsis */}
      <div>
        <Textarea
          label={t('story:form.synopsis')}
          value={formData.synopsis}
          onChange={e => handleChange('synopsis', e.target.value)}
          error={errors.synopsis}
          maxLength={2000}
          rows={4}
          placeholder={t('story:form.synopsisPlaceholder')}
        />
      </div>

      {/* Cover Image */}
      <div>
        <CoverImageUploader
          value={formData.coverImage}
          onChange={url => handleChange('coverImage', url)}
        />
      </div>

      {/* Initial Text */}
      <div>
        <Textarea
          label={t('story:form.initialText')}
          value={formData.initialText}
          onChange={e => handleChange('initialText', e.target.value)}
          error={errors.initialText}
          maxLength={5000}
          rows={8}
          placeholder={t('story:form.initialTextPlaceholder')}
        />
        <p className="mt-1 text-sm text-muted">
          {t('story:form.initialTextHint')}
        </p>
      </div>

      {/* Objectives */}
      <div>
        <ObjectivesList
          objectives={formData.objectives || []}
          onChange={objectives => handleChange('objectives', objectives)}
        />
      </div>

      {/* Character Selection */}
      <div>
        <CharacterSelector
          selectedIds={formData.characterIds || []}
          onChange={ids => handleChange('characterIds', ids)}
        />
      </div>

      {/* Tag Selection */}
      <div>
        <TagSelector
          selectedIds={formData.tagIds || []}
          onChange={ids => handleChange('tagIds', ids)}
          tagType="STORY"
        />
      </div>

      {/* Age Rating */}
      <div>
        <Select
          label={t('story:form.ageRating')}
          value={formData.ageRating || 'L'}
          onChange={value => handleChange('ageRating', value as AgeRating)}
          options={AGE_RATINGS.map(rating => ({
            value: rating,
            label: t(`characters:ageRatings.${rating}`),
          }))}
        />
      </div>

      {/* Content Tags */}
      <div>
        <label className="block text-sm font-medium text-content mb-2">
          {t('story:form.contentTags')}
        </label>
        <div className="flex flex-wrap gap-2">
          {CONTENT_TAGS.map(tag => (
            <button
              key={tag}
              type="button"
              onClick={() => {
                const current = formData.contentTags || [];
                const newTags = current.includes(tag)
                  ? current.filter(t => t !== tag)
                  : [...current, tag];
                handleChange('contentTags', newTags);
              }}
              className={`px-3 py-1 text-sm rounded-full transition-colors ${
                (formData.contentTags || []).includes(tag)
                  ? 'bg-primary text-black'
                  : 'bg-light text-content border border-border hover:bg-border'
              }`}
            >
              {t(`characters:contentTags.${tag}`)}
            </button>
          ))}
        </div>
      </div>

      {/* Public/Private Toggle */}
      <div className="flex items-center gap-2">
        <input
          type="checkbox"
          id="isPublic"
          checked={formData.isPublic}
          onChange={e => handleChange('isPublic', e.target.checked)}
          className="w-4 h-4 text-primary bg-light border-border rounded focus:ring-primary focus:ring-2"
        />
        <label htmlFor="isPublic" className="text-sm font-medium text-content">
          {t('story:form.makePublic')}
        </label>
      </div>

      {/* Actions */}
      <div className="flex gap-4 pt-4">
        <Button
          type="submit"
          disabled={isSubmitting}
          className="flex-1"
        >
          {isSubmitting ? t('common:saving') : t('common:save')}
        </Button>
        <Button
          type="button"
          variant="secondary"
          onClick={handleCancel}
          disabled={isSubmitting}
        >
          {t('common:cancel')}
        </Button>
      </div>
    </form>
  );
}
