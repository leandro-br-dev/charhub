import { useTranslation } from 'react-i18next';
import { type UseCharacterFormReturn } from '../hooks/useCharacterForm';

interface ProfileTabProps {
  form: UseCharacterFormReturn;
}

export function ProfileTab({ form }: ProfileTabProps): JSX.Element {
  const { t } = useTranslation(['characters']);
  const { values, handleTextChange } = form;

  return (
    <div className="space-y-6 rounded-xl border border-border bg-card p-6 shadow-sm">
      <div>
        <h2 className="text-lg font-semibold text-title">
          {t('characters:form.sections.profile')}
        </h2>
        <p className="mt-2 text-sm text-description">
          {t('characters:form.sections.profileHint')}
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <label className="flex flex-col gap-2 text-sm">
          <span className="font-medium text-content">
            {t('characters:form.fields.physicalCharacteristics')}
          </span>
          <textarea
            rows={5}
            className="rounded-lg border border-border bg-background px-3 py-2 text-sm text-content shadow-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/40"
            value={values.physicalCharacteristics ?? ''}
            onChange={handleTextChange('physicalCharacteristics')}
          />
        </label>

        <label className="flex flex-col gap-2 text-sm">
          <span className="font-medium text-content">
            {t('characters:form.fields.personality')}
          </span>
          <textarea
            rows={5}
            className="rounded-lg border border-border bg-background px-3 py-2 text-sm text-content shadow-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/40"
            value={values.personality ?? ''}
            onChange={handleTextChange('personality')}
          />
        </label>

        <label className="flex flex-col gap-2 text-sm sm:col-span-2">
          <span className="font-medium text-content">
            {t('characters:form.fields.history')}
          </span>
          <textarea
            rows={6}
            className="rounded-lg border border-border bg-background px-3 py-2 text-sm text-content shadow-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/40"
            value={values.history ?? ''}
            onChange={handleTextChange('history')}
          />
        </label>
      </div>
    </div>
  );
}
