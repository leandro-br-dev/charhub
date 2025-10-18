import { useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { type UseCharacterFormReturn } from '../hooks/useCharacterForm';
import {
  AGE_RATING_OPTIONS,
  CHARACTER_PURPOSE_OPTIONS,
  CONTENT_TAG_OPTIONS
} from '../utils/constants';
import { type ContentTag } from '../../../../types/characters';

interface ConfigurationTabProps {
  form: UseCharacterFormReturn;
}

function renderContentTagLabel(tag: ContentTag, t: ReturnType<typeof useTranslation>['t']) {
  return t(`characters:contentTags.${tag}`);
}

export function ConfigurationTab({ form }: ConfigurationTabProps): JSX.Element {
  const { t } = useTranslation(['characters']);
  const { values, handleSelectChange, updateField, toggleContentTag } = form;

  const contentTagsByColumn = useMemo(() => {
    const midpoint = Math.ceil(CONTENT_TAG_OPTIONS.length / 2);
    return [
      CONTENT_TAG_OPTIONS.slice(0, midpoint),
      CONTENT_TAG_OPTIONS.slice(midpoint)
    ];
  }, []);

  return (
    <div className="space-y-6 rounded-xl border border-border bg-card p-6 shadow-sm">
      <div>
        <h2 className="text-lg font-semibold text-title">
          {t('characters:form.sections.configuration')}
        </h2>
        <p className="mt-2 text-sm text-description">
          {t('characters:form.sections.configurationHint')}
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <label className="flex flex-col gap-2 text-sm">
          <span className="font-medium text-content">
            {t('characters:form.fields.purpose')}
          </span>
          <select
            className="rounded-lg border border-border bg-background px-3 py-2 text-sm text-content shadow-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/40"
            value={values.purpose ?? 'chat'}
            onChange={handleSelectChange('purpose')}
          >
            {CHARACTER_PURPOSE_OPTIONS.map(option => (
              <option key={option} value={option}>
                {t(`characters:purposes.${option}`)}
              </option>
            ))}
          </select>
        </label>

        <label className="flex flex-col gap-2 text-sm">
          <span className="font-medium text-content">
            {t('characters:form.fields.isPublic')}
          </span>
          <div className="flex items-center gap-3 rounded-lg border border-border bg-background px-3 py-2 shadow-sm">
            <input
              type="checkbox"
              className="h-4 w-4"
              checked={values.isPublic ?? false}
              onChange={event => updateField('isPublic', event.target.checked)}
            />
            <span className="text-sm text-content">
              {t('characters:form.labels.publicToggle')}
            </span>
          </div>
        </label>

        <label className="flex flex-col gap-2 text-sm sm:col-span-2">
          <span className="font-medium text-content">
            {t('characters:form.fields.ageRating')} <span className="text-red-500">*</span>
          </span>
          <select
            className="rounded-lg border border-border bg-background px-3 py-2 text-sm text-content shadow-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/40"
            value={values.ageRating}
            onChange={handleSelectChange('ageRating')}
          >
            {AGE_RATING_OPTIONS.map(option => (
              <option key={option} value={option}>
                {t(`characters:ageRatings.${option}`)}
              </option>
            ))}
          </select>
        </label>
      </div>

      <div className="mt-6">
        <span className="text-sm font-medium text-content">
          {t('characters:form.fields.contentTags')}
        </span>
        <p className="mt-1 text-xs text-muted">
          {t('characters:form.sections.contentTagsHint')}
        </p>
        <div className="mt-4 grid gap-4 sm:grid-cols-2">
          {contentTagsByColumn.map((column, columnIndex) => (
            <div key={`tag-column-${columnIndex}`} className="space-y-2">
              {column.map(tag => {
                const checked = values.contentTags.includes(tag);
                return (
                  <label
                    key={tag}
                    className="flex items-center justify-between rounded-lg border border-border bg-background px-3 py-2 text-sm text-content shadow-sm transition hover:border-primary"
                  >
                    <div className="flex flex-col">
                      <span className="font-medium">{renderContentTagLabel(tag, t)}</span>
                      <span className="text-xs text-muted">
                        {t(`characters:contentTagHints.${tag}`, { defaultValue: '' })}
                      </span>
                    </div>
                    <input
                      type="checkbox"
                      className="h-4 w-4"
                      checked={checked}
                      onChange={() => toggleContentTag(tag)}
                    />
                  </label>
                );
              })}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
