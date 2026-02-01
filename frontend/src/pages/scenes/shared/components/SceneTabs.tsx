import { useTranslation } from 'react-i18next';
import type { UseSceneFormReturn } from '../hooks/useSceneForm';
import { VisualStyle, type AgeRating, type ContentTag } from '../../../../types/characters';
import { Visibility } from '../../../../types/common';
import { ClassificationTab as SharedClassificationTab } from '../../../../components/ui';

// ============================================================================
// DETAILS TAB
// ============================================================================

interface DetailsTabProps {
  form: UseSceneFormReturn;
}

export function DetailsTab({ form }: DetailsTabProps): JSX.Element {
  const { t } = useTranslation(['scenes']);
  const { values, handleTextChange } = form;

  return (
    <div className="space-y-6 rounded-xl border border-border bg-card p-4 sm:p-6 shadow-sm">
      <div>
        <h2 className="text-lg font-semibold text-title">
          {t('scenes:form.sections.details')}
        </h2>
        <p className="mt-2 text-sm text-description">
          {t('scenes:form.sections.detailsHint')}
        </p>
      </div>

      <div className="space-y-4">
        <label className="flex flex-col gap-2 text-sm">
          <span className="font-medium text-content">
            {t('scenes:form.fields.name')} <span className="text-red-500">*</span>
          </span>
          <input
            className="rounded-lg border border-border bg-background px-3 py-2 text-sm text-content shadow-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/40"
            value={values.name}
            onChange={handleTextChange('name')}
            placeholder={t('scenes:form.placeholders.name') ?? ''}
            required
          />
        </label>

        <label className="flex flex-col gap-2 text-sm">
          <span className="font-medium text-content">
            {t('scenes:form.fields.description')} <span className="text-red-500">*</span>
          </span>
          <textarea
            className="rounded-lg border border-border bg-background px-3 py-2 text-sm text-content shadow-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/40"
            value={values.description}
            onChange={handleTextChange('description')}
            placeholder={t('scenes:form.placeholders.description') ?? ''}
            rows={4}
            required
          />
        </label>

        <label className="flex flex-col gap-2 text-sm">
          <span className="font-medium text-content">
            {t('scenes:form.fields.shortDescription')}
          </span>
          <input
            className="rounded-lg border border-border bg-background px-3 py-2 text-sm text-content shadow-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/40"
            value={values.shortDescription ?? ''}
            onChange={handleTextChange('shortDescription')}
            placeholder={t('scenes:form.placeholders.shortDescription') ?? ''}
          />
        </label>
      </div>
    </div>
  );
}

// ============================================================================
// CLASSIFICATION TAB
// ============================================================================

interface ClassificationTabProps {
  form: UseSceneFormReturn;
}

export function ClassificationTab({ form }: ClassificationTabProps): JSX.Element {
  const { t } = useTranslation(['scenes']);
  const { values, handleSelectChange, setValues } = form;

  // Genre options
  const genreOptions = [
    'victorian_manor', 'modern_apartment', 'spaceship', 'fantasy_castle',
    'cyberpunk_city', 'wild_west_town', 'medieval_village', 'futuristic_lab',
    'haunted_house', 'tropical_island', 'underground_bunker', 'ancient_temple',
    'post_apocalyptic', 'steampunk_factory', 'noir_city', 'viking_longhouse',
    'samurai_dojo', 'artificial_reality', 'dungeon', 'forest_camp',
    'pirate_ship', 'underwater_base', 'desert_oasis',
  ];

  // Era options
  const eraOptions = [
    'prehistoric', 'ancient', 'medieval', 'renaissance',
    '1800', '1850', '1890', '1920', '1940', '1980', '1990',
    '2000', '2020', '2024', '2030', '2050', '2100', 'future',
  ];

  // Mood options
  const moodOptions = [
    'dark', 'mysterious', 'cheerful', 'ominous', 'peaceful', 'tense',
    'romantic', 'horror', 'adventurous', 'melancholic', 'whimsical',
    'epic', 'cozy', 'chaotic', 'serene', 'noir', 'surreal',
    'industrial', 'magical', 'gothic',
  ];

  // Visual Style options
  const visualStyleOptions: VisualStyle[] = [
    'ANIME', 'REALISTIC', 'SEMI_REALISTIC', 'CARTOON', 'MANGA',
    'MANHWA', 'COMIC', 'CHIBI', 'PIXEL_ART', 'THREE_D',
  ];

  // Visibility options
  const visibilityOptions = [Visibility.PUBLIC, Visibility.PRIVATE, Visibility.UNLISTED];

  return (
    <div className="space-y-6 rounded-xl border border-border bg-card p-4 sm:p-6 shadow-sm">
      <div>
        <h2 className="text-lg font-semibold text-title">
          {t('scenes:form.sections.classification')}
        </h2>
        <p className="mt-2 text-sm text-description">
          {t('scenes:form.sections.classificationHint')}
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <label className="flex flex-col gap-2 text-sm">
          <span className="font-medium text-content">
            {t('scenes:form.fields.genre')}
          </span>
          <select
            className="rounded-lg border border-border bg-background px-3 py-2 text-sm text-content shadow-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/40"
            value={values.genre ?? ''}
            onChange={handleSelectChange('genre')}
          >
            <option value="">{t('scenes:form.placeholders.genreSelect')}</option>
            {genreOptions.map(option => (
              <option key={option} value={option}>
                {t(`scenes:genres.${option}`)}
              </option>
            ))}
          </select>
        </label>

        <label className="flex flex-col gap-2 text-sm">
          <span className="font-medium text-content">
            {t('scenes:form.fields.era')}
          </span>
          <select
            className="rounded-lg border border-border bg-background px-3 py-2 text-sm text-content shadow-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/40"
            value={values.era ?? ''}
            onChange={handleSelectChange('era')}
          >
            <option value="">{t('scenes:form.placeholders.eraSelect')}</option>
            {eraOptions.map(option => (
              <option key={option} value={option}>
                {t(`scenes:eras.${option}`)}
              </option>
            ))}
          </select>
        </label>

        <label className="flex flex-col gap-2 text-sm">
          <span className="font-medium text-content">
            {t('scenes:form.fields.mood')}
          </span>
          <select
            className="rounded-lg border border-border bg-background px-3 py-2 text-sm text-content shadow-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/40"
            value={values.mood ?? ''}
            onChange={handleSelectChange('mood')}
          >
            <option value="">{t('scenes:form.placeholders.moodSelect')}</option>
            {moodOptions.map(option => (
              <option key={option} value={option}>
                {t(`scenes:moods.${option}`)}
              </option>
            ))}
          </select>
        </label>

        <label className="flex flex-col gap-2 text-sm">
          <span className="font-medium text-content">
            {t('scenes:form.fields.style')}
          </span>
          <select
            className="rounded-lg border border-border bg-background px-3 py-2 text-sm text-content shadow-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/40"
            value={values.style ?? 'ANIME'}
            onChange={handleSelectChange('style')}
          >
            {visualStyleOptions.map(option => (
              <option key={option} value={option}>
                {t(`scenes:visualStyles.${option}`)}
              </option>
            ))}
          </select>
        </label>

        <label className="flex flex-col gap-2 text-sm">
          <span className="font-medium text-content">
            {t('scenes:form.fields.visibility')}
          </span>
          <select
            className="rounded-lg border border-border bg-background px-3 py-2 text-sm text-content shadow-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/40"
            value={values.visibility}
            onChange={handleSelectChange('visibility')}
          >
            {visibilityOptions.map(option => (
              <option key={option} value={option}>
                {t(`scenes:labels.${option.toLowerCase()}`)}
              </option>
            ))}
          </select>
        </label>
      </div>

      {/* Shared ClassificationTab component for Age Rating, Tags, and Content Warnings */}
      <div>
        <SharedClassificationTab
          ageRating={values.ageRating}
          contentTags={values.contentTags}
          tagIds={values.tagIds}
          tagType="SCENE"
          onAgeRatingChange={(value: AgeRating) => setValues(prev => ({ ...prev, ageRating: value }))}
          onContentTagsChange={(tags: ContentTag[]) => setValues(prev => ({ ...prev, contentTags: tags }))}
          onTagIdsChange={(ids: string[]) => setValues(prev => ({ ...prev, tagIds: ids }))}
          hideTagSelector
        />
      </div>
    </div>
  );
}

// ============================================================================
// IMAGES TAB
// ============================================================================

interface ImagesTabProps {
  form: UseSceneFormReturn;
}

export function ImagesTab({ form }: ImagesTabProps): JSX.Element {
  const { t } = useTranslation(['scenes']);
  const { values, handleTextChange } = form;

  return (
    <div className="space-y-6 rounded-xl border border-border bg-card p-4 sm:p-6 shadow-sm">
      <div>
        <h2 className="text-lg font-semibold text-title">
          {t('scenes:form.sections.images')}
        </h2>
        <p className="mt-2 text-sm text-description">
          {t('scenes:form.sections.imagesHint')}
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <label className="flex flex-col gap-2 text-sm sm:col-span-2">
          <span className="font-medium text-content">
            {t('scenes:form.fields.imagePrompt')}
          </span>
          <textarea
            className="rounded-lg border border-border bg-background px-3 py-2 text-sm text-content shadow-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/40"
            value={values.imagePrompt ?? ''}
            onChange={handleTextChange('imagePrompt')}
            placeholder={t('scenes:form.placeholders.imagePrompt') ?? ''}
            rows={2}
          />
          <p className="text-xs text-muted">
            {t('scenes:form.placeholders.promptComingSoon', 'Image generation will be available in FEATURE-023')}
          </p>
        </label>

        <label className="flex flex-col gap-2 text-sm sm:col-span-2">
          <span className="font-medium text-content">
            {t('scenes:form.fields.mapPrompt')}
          </span>
          <textarea
            className="rounded-lg border border-border bg-background px-3 py-2 text-sm text-content shadow-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/40"
            value={values.mapPrompt ?? ''}
            onChange={handleTextChange('mapPrompt')}
            placeholder={t('scenes:form.placeholders.mapPrompt') ?? ''}
            rows={2}
          />
          <p className="text-xs text-muted">
            {t('scenes:form.placeholders.promptComingSoon', 'Map generation will be available in FEATURE-023')}
          </p>
        </label>
      </div>
    </div>
  );
}

// ============================================================================
// AREAS TAB
// ============================================================================

interface AreasTabProps {
  sceneId?: string;
}

export function AreasTab({ sceneId }: AreasTabProps): JSX.Element {
  const { t } = useTranslation(['scenes']);

  return (
    <div className="space-y-6 rounded-xl border border-border bg-card p-4 sm:p-6 shadow-sm">
      <div>
        <h2 className="text-lg font-semibold text-title">
          {t('scenes:form.sections.areas')}
        </h2>
        <p className="mt-2 text-sm text-description">
          {t('scenes:form.sections.areasHint')}
        </p>
      </div>

      <div className="rounded-lg bg-normal/50 p-6 text-center">
        <span className="material-symbols-outlined text-4xl text-muted">location_off</span>
        <p className="mt-3 text-sm text-content">
          {t('scenes:form.areas.comingSoon', 'Areas can be added after creating the scene')}
        </p>
        {sceneId && (
          <a
            href={`/scenes/${sceneId}/areas`}
            className="mt-4 inline-block text-sm text-primary hover:underline"
          >
            {t('scenes:form.areas.manageLink', 'Manage scene areas')}
          </a>
        )}
      </div>
    </div>
  );
}
