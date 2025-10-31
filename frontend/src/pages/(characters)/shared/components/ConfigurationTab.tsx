import { useTranslation } from 'react-i18next';
import Switch from '../../../../components/ui/switch';
import { ContentTagsSelector } from '../../../../components/features/content-guidelines/ContentTagsSelector';
import { normalizeAllowedContentTags, haveSameContentTags } from '../../../../components/features/content-guidelines/rules';
import { AGE_RATING_OPTIONS } from '../utils/constants';
import { type UseCharacterFormReturn } from '../hooks/useCharacterForm';
import { type AgeRating } from '../../../../types/characters';

interface ConfigurationTabProps {
  form: UseCharacterFormReturn;
}

export function ConfigurationTab({ form }: ConfigurationTabProps): JSX.Element {
  const { t } = useTranslation(['characters']);
  const { values, updateField } = form;

  const handleAgeRatingChange = (event: React.ChangeEvent<HTMLSelectElement>) => {
    const nextRating = event.target.value as AgeRating;
    updateField('ageRating', nextRating);
    const normalizedTags = normalizeAllowedContentTags(nextRating, values.contentTags);
    if (!haveSameContentTags(normalizedTags, values.contentTags)) {
      updateField('contentTags', normalizedTags);
    }
  };

  return (
    <div className="space-y-6 rounded-xl border border-border bg-card p-4 sm:p-6 shadow-sm">
      <div>
        <h2 className="text-lg font-semibold text-title">
          {t('characters:form.sections.configuration')}
        </h2>
        <p className="mt-2 text-sm text-description">
          {t('characters:form.sections.configurationHint')}
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <Switch
          label={t('characters:form.fields.visibility')}
          stateLabels={{
            true: t('characters:form.labels.visibilityPublic'),
            false: t('characters:form.labels.visibilityPrivate'),
          }}
          checked={values.isPublic ?? true}
          onChange={(nextValue: boolean) => updateField('isPublic', nextValue)}
        />

        <label className="flex flex-col gap-2 text-sm sm:col-span-2">
          <span className="font-medium text-content">
            {t('characters:form.fields.ageRating')} <span className="text-red-500">*</span>
          </span>
          <select
            className="rounded-lg border border-border bg-background px-3 py-2 text-sm text-content shadow-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/40"
            value={values.ageRating}
            onChange={handleAgeRatingChange}
          >
            {AGE_RATING_OPTIONS.map(option => (
              <option key={option} value={option}>
                {t('characters:ageRatings.' + option)}
              </option>
            ))}
          </select>
        </label>
      </div>

      <div className="mt-6">
        <span className="text-sm font-medium text-content">
          {t('characters:form.fields.contentTags')}
        </span>
        <ContentTagsSelector
          mode="character"
          ageRating={values.ageRating}
          allowedTags={values.contentTags}
          onChange={next => updateField('contentTags', next)}
        />
      </div>
    </div>
  );
}
