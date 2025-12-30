import { useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { type UseCharacterFormReturn } from '../hooks/useCharacterForm';
import { GENDER_OPTIONS, VISUAL_STYLE_OPTIONS } from '../utils/constants';
import { useSpeciesOptions } from '../hooks/useSpeciesOptions';

interface IdentityTabProps {
  form: UseCharacterFormReturn;
}

export function IdentityTab({ form }: IdentityTabProps): JSX.Element {
  const { t } = useTranslation(['characters', 'species', 'dashboard']);
  const { values, handleTextChange, handleSelectChange, handleNumberChange } = form;
  const { species: speciesOptions, loading: loadingSpecies } = useSpeciesOptions();

  // Helper function to get gender label - using dashboard namespace
  const getGenderLabel = (value: string): string => {
    const labels: Record<string, string> = {
      'MALE': t('filters.genders.male', 'Male', { ns: 'dashboard' }),
      'FEMALE': t('filters.genders.female', 'Female', { ns: 'dashboard' }),
      'NON_BINARY': t('filters.genders.nonBinary', 'Non-Binary', { ns: 'dashboard' }),
      'OTHER': t('filters.genders.other', 'Other', { ns: 'dashboard' }),
      'UNKNOWN': t('filters.genders.unknown', 'Unknown', { ns: 'dashboard' }),
    };
    return labels[value] || value;
  };

  // Sort gender options by translated label
  const sortedGenderOptions = useMemo(() => {
    return [...GENDER_OPTIONS].sort((a, b) => {
      const labelA = getGenderLabel(a);
      const labelB = getGenderLabel(b);
      return labelA.localeCompare(labelB);
    });
  }, [t]);

  // Sort species options by translated name
  const sortedSpeciesOptions = useMemo(() => {
    return [...speciesOptions].sort((a, b) => {
      const nameA = t(`species:${a.name}.name`, a.name);
      const nameB = t(`species:${b.name}.name`, b.name);
      return nameA.localeCompare(nameB);
    });
  }, [speciesOptions, t]);

  return (
    <div className="space-y-6 rounded-xl border border-border bg-card p-4 sm:p-6 shadow-sm">
      <div>
        <h2 className="text-lg font-semibold text-title">
          {t('characters:form.sections.identity')}
        </h2>
        <p className="mt-2 text-sm text-description">
          {t('characters:form.sections.identityHint')}
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <label className="flex flex-col gap-2 text-sm">
          <span className="font-medium text-content">
            {t('characters:form.fields.firstName')} <span className="text-red-500">*</span>
          </span>
          <input
            className="rounded-lg border border-border bg-background px-3 py-2 text-sm text-content shadow-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/40"
            value={values.firstName}
            onChange={handleTextChange('firstName')}
            required
          />
        </label>

        <label className="flex flex-col gap-2 text-sm">
          <span className="font-medium text-content">
            {t('characters:form.fields.lastName')}
          </span>
          <input
            className="rounded-lg border border-border bg-background px-3 py-2 text-sm text-content shadow-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/40"
            value={values.lastName ?? ''}
            onChange={handleTextChange('lastName')}
          />
        </label>

        <label className="flex flex-col gap-2 text-sm">
          <span className="font-medium text-content">
            {t('characters:form.fields.age')}
          </span>
          <input
            type="number"
            min={0}
            className="rounded-lg border border-border bg-background px-3 py-2 text-sm text-content shadow-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/40"
            value={values.age ?? ''}
            onChange={handleNumberChange('age')}
          />
        </label>

        <label className="flex flex-col gap-2 text-sm">
          <span className="font-medium text-content">
            {t('characters:form.fields.gender')}
          </span>
          <select
            className="rounded-lg border border-border bg-background px-3 py-2 text-sm text-content shadow-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/40"
            value={values.gender ?? ''}
            onChange={handleSelectChange('gender')}
          >
            <option value="">{t('characters:form.placeholders.genderSelect', 'Select gender')}</option>
            {sortedGenderOptions.map(option => (
              <option key={option} value={option}>
                {getGenderLabel(option)}
              </option>
            ))}
          </select>
        </label>

        <label className="flex flex-col gap-2 text-sm">
          <span className="font-medium text-content">
            {t('characters:form.fields.species')}
          </span>
          {loadingSpecies ? (
            <div className="h-10 bg-light/50 dark:bg-gray-800/50 rounded-lg animate-pulse" />
          ) : (
            <select
              className="rounded-lg border border-border bg-background px-3 py-2 text-sm text-content shadow-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/40"
              value={values.species ?? ''}
              onChange={handleSelectChange('species')}
            >
              <option value="">{t('characters:form.placeholders.speciesSelect', 'Select species')}</option>
              {sortedSpeciesOptions.map(option => (
                <option key={option.id} value={option.id}>
                  {t(`species:${option.name}.name`, option.name)}
                </option>
              ))}
            </select>
          )}
        </label>

        <label className="flex flex-col gap-2 text-sm">
          <span className="font-medium text-content">
            {t('characters:form.fields.style')}
          </span>
          <select
            className="rounded-lg border border-border bg-background px-3 py-2 text-sm text-content shadow-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/40"
            value={values.style ?? ''}
            onChange={handleSelectChange('style')}
          >
            <option value="">{t('characters:form.placeholders.style')}</option>
            {VISUAL_STYLE_OPTIONS.map(option => (
              <option key={option} value={option}>
                {t(`characters:visualStyles.${option}`)}
              </option>
            ))}
          </select>
        </label>

        <label className="flex flex-col gap-2 text-sm sm:col-span-2">
          <span className="font-medium text-content">
            {t('characters:form.fields.reference')}
          </span>
          <input
            className="rounded-lg border border-border bg-background px-3 py-2 text-sm text-content shadow-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/40"
            value={values.reference ?? ''}
            onChange={handleTextChange('reference')}
            placeholder={t('characters:form.placeholders.reference') ?? ''}
          />
        </label>

      </div>
    </div>
  );
}
