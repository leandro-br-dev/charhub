import { useTranslation } from 'react-i18next';
import type { UseAssetFormReturn } from '../hooks/useAssetForm';
import { VisualStyle, type AgeRating, type ContentTag } from '../../../../types/characters';
import { Visibility } from '../../../../types/common';
import { ClassificationTab as SharedClassificationTab } from '../../../../components/ui';
import { AssetImagesTab } from './AssetImagesTab';

// ============================================================================
// DETAILS TAB
// ============================================================================

interface DetailsTabProps {
  form: UseAssetFormReturn;
}

export function DetailsTab({ form }: DetailsTabProps): JSX.Element {
  const { t } = useTranslation(['assets']);
  const { values, handleTextChange, handleSelectChange } = form;

  // Asset type options
  const assetTypeOptions = [
    'CLOTHING',
    'ACCESSORY',
    'SCAR',
    'HAIRSTYLE',
    'OBJECT',
    'VEHICLE',
    'FURNITURE',
    'PROP',
  ] as const;

  // Asset category options
  const assetCategoryOptions = [
    'WEARABLE',
    'HOLDABLE',
    'ENVIRONMENTAL',
  ] as const;

  return (
    <div className="space-y-6 rounded-xl border border-border bg-card p-4 sm:p-6 shadow-sm">
      <div>
        <h2 className="text-lg font-semibold text-title">
          {t('assets:form.sections.details')}
        </h2>
        <p className="mt-2 text-sm text-description">
          {t('assets:form.sections.detailsHint')}
        </p>
      </div>

      <div className="space-y-4">
        <label className="flex flex-col gap-2 text-sm">
          <span className="font-medium text-content">
            {t('assets:form.fields.name')} <span className="text-red-500">*</span>
          </span>
          <input
            className="rounded-lg border border-border bg-background px-3 py-2 text-sm text-content shadow-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/40"
            value={values.name}
            onChange={handleTextChange('name')}
            placeholder={t('assets:form.placeholders.name') ?? ''}
            required
          />
        </label>

        <label className="flex flex-col gap-2 text-sm">
          <span className="font-medium text-content">
            {t('assets:form.fields.description')} <span className="text-red-500">*</span>
          </span>
          <textarea
            className="rounded-lg border border-border bg-background px-3 py-2 text-sm text-content shadow-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/40"
            value={values.description ?? ''}
            onChange={handleTextChange('description')}
            placeholder={t('assets:form.placeholders.description') ?? ''}
            rows={4}
            required
          />
        </label>

        <div className="grid gap-4 sm:grid-cols-2">
          <label className="flex flex-col gap-2 text-sm">
            <span className="font-medium text-content">
              {t('assets:form.fields.type')} <span className="text-red-500">*</span>
            </span>
            <select
              className="rounded-lg border border-border bg-background px-3 py-2 text-sm text-content shadow-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/40"
              value={values.type}
              onChange={handleSelectChange('type')}
              required
            >
              {assetTypeOptions.map(option => (
                <option key={option} value={option}>
                  {t(`assets:types.${option}`)}
                </option>
              ))}
            </select>
          </label>

          <label className="flex flex-col gap-2 text-sm">
            <span className="font-medium text-content">
              {t('assets:form.fields.category')} <span className="text-red-500">*</span>
            </span>
            <select
              className="rounded-lg border border-border bg-background px-3 py-2 text-sm text-content shadow-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/40"
              value={values.category}
              onChange={handleSelectChange('category')}
              required
            >
              {assetCategoryOptions.map(option => (
                <option key={option} value={option}>
                  {t(`assets:categories.${option}`)}
                </option>
              ))}
            </select>
          </label>
        </div>

        <label className="flex flex-col gap-2 text-sm">
          <span className="font-medium text-content">
            {t('assets:form.fields.promptPrimary')}
          </span>
          <textarea
            className="rounded-lg border border-border bg-background px-3 py-2 text-sm text-content shadow-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/40"
            value={values.promptPrimary ?? ''}
            onChange={handleTextChange('promptPrimary')}
            placeholder={t('assets:form.placeholders.promptPrimary') ?? ''}
            rows={2}
          />
        </label>

        <label className="flex flex-col gap-2 text-sm">
          <span className="font-medium text-content">
            {t('assets:form.fields.promptContext')}
          </span>
          <textarea
            className="rounded-lg border border-border bg-background px-3 py-2 text-sm text-content shadow-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/40"
            value={values.promptContext ?? ''}
            onChange={handleTextChange('promptContext')}
            placeholder={t('assets:form.placeholders.promptContext') ?? ''}
            rows={2}
          />
        </label>

        <label className="flex flex-col gap-2 text-sm">
          <span className="font-medium text-content">
            {t('assets:form.fields.negativePrompt')}
          </span>
          <textarea
            className="rounded-lg border border-border bg-background px-3 py-2 text-sm text-content shadow-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/40"
            value={values.negativePrompt ?? ''}
            onChange={handleTextChange('negativePrompt')}
            placeholder={t('assets:form.placeholders.negativePrompt') ?? ''}
            rows={2}
          />
        </label>

        <div className="grid gap-4 sm:grid-cols-2">
          <label className="flex flex-col gap-2 text-sm">
            <span className="font-medium text-content">
              {t('assets:form.fields.placementZone')}
            </span>
            <input
              className="rounded-lg border border-border bg-background px-3 py-2 text-sm text-content shadow-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/40"
              value={values.placementZone ?? ''}
              onChange={handleTextChange('placementZone')}
              placeholder={t('assets:form.placeholders.placementZone') ?? ''}
            />
          </label>

          <label className="flex flex-col gap-2 text-sm">
            <span className="font-medium text-content">
              {t('assets:form.fields.placementDetail')}
            </span>
            <input
              className="rounded-lg border border-border bg-background px-3 py-2 text-sm text-content shadow-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/40"
              value={values.placementDetail ?? ''}
              onChange={handleTextChange('placementDetail')}
              placeholder={t('assets:form.placeholders.placementDetail') ?? ''}
            />
          </label>
        </div>
      </div>
    </div>
  );
}

// ============================================================================
// CLASSIFICATION TAB
// ============================================================================

interface ClassificationTabProps {
  form: UseAssetFormReturn;
}

export function ClassificationTab({ form }: ClassificationTabProps): JSX.Element {
  const { t } = useTranslation(['assets']);
  const { values, handleSelectChange, setValues } = form;

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
          {t('assets:form.sections.classification')}
        </h2>
        <p className="mt-2 text-sm text-description">
          {t('assets:form.sections.classificationHint')}
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <label className="flex flex-col gap-2 text-sm">
          <span className="font-medium text-content">
            {t('assets:form.fields.style')}
          </span>
          <select
            className="rounded-lg border border-border bg-background px-3 py-2 text-sm text-content shadow-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/40"
            value={values.style ?? 'ANIME'}
            onChange={handleSelectChange('style')}
          >
            {visualStyleOptions.map(option => (
              <option key={option} value={option}>
                {t(`assets:visualStyles.${option}`)}
              </option>
            ))}
          </select>
        </label>

        <label className="flex flex-col gap-2 text-sm">
          <span className="font-medium text-content">
            {t('assets:form.fields.visibility')}
          </span>
          <select
            className="rounded-lg border border-border bg-background px-3 py-2 text-sm text-content shadow-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/40"
            value={values.visibility}
            onChange={handleSelectChange('visibility')}
          >
            {visibilityOptions.map(option => (
              <option key={option} value={option}>
                {t(`assets:labels.${option.toLowerCase()}`)}
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
  form: UseAssetFormReturn;
  assetId?: string;
}

export function ImagesTab({ form, assetId }: ImagesTabProps): JSX.Element {
  const { t } = useTranslation(['assets']);
  const { values, handleTextChange } = form;

  // For edit mode (when assetId exists), show the image gallery. For create mode, show prompts.
  if (assetId) {
    return <AssetImagesTab assetId={assetId} />;
  }

  return (
    <div className="space-y-6 rounded-xl border border-border bg-card p-4 sm:p-6 shadow-sm">
      <div>
        <h2 className="text-lg font-semibold text-title">
          {t('assets:form.sections.images')}
        </h2>
        <p className="mt-2 text-sm text-description">
          {t('assets:form.sections.imagesHint')}
        </p>
      </div>

      <div className="rounded-lg bg-normal/50 p-6 text-center">
        <span className="material-symbols-outlined text-4xl text-muted">image</span>
        <p className="mt-3 text-sm text-content">
          {t('assets:form.images.saveFirst', 'Save the asset first to add images')}
        </p>
      </div>
    </div>
  );
}
