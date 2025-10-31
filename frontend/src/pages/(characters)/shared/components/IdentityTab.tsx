import { useTranslation } from 'react-i18next';
import { type UseCharacterFormReturn } from '../hooks/useCharacterForm';
import { GENDER_OPTIONS } from '../utils/constants';

interface IdentityTabProps {
  form: UseCharacterFormReturn;
}

export function IdentityTab({ form }: IdentityTabProps): JSX.Element {
  const { t } = useTranslation(['characters']);
  const { values, handleTextChange, handleSelectChange, handleNumberChange } = form;

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
            {GENDER_OPTIONS.map(option => (
              <option key={option} value={option}>
                {t(`characters:genders.${option}`)}
              </option>
            ))}
          </select>
        </label>

        <label className="flex flex-col gap-2 text-sm sm:col-span-2">
          <span className="font-medium text-content">
            {t('characters:form.fields.species')}
          </span>
          <input
            className="rounded-lg border border-border bg-background px-3 py-2 text-sm text-content shadow-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/40"
            value={values.species ?? ''}
            onChange={handleTextChange('species')}
            placeholder={t('characters:form.placeholders.species') ?? ''}
          />
        </label>

        <label className="flex flex-col gap-2 text-sm sm:col-span-2">
          <span className="font-medium text-content">
            {t('characters:form.fields.style')}
          </span>
          <input
            className="rounded-lg border border-border bg-background px-3 py-2 text-sm text-content shadow-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/40"
            value={values.style ?? ''}
            onChange={handleTextChange('style')}
            placeholder={t('characters:form.placeholders.style') ?? ''}
          />
        </label>

      </div>
    </div>
  );
}
