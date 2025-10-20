import { useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { Button } from '../../../../components/ui/Button';
import {
  type CharacterFormValues,
  type ContentTag
} from '../../../../types/characters';
import { useCharacterForm, type UseCharacterFormReturn } from '../hooks/useCharacterForm';
import { AGE_RATING_OPTIONS, CONTENT_TAG_OPTIONS, GENDER_OPTIONS } from '../utils/constants';

export interface CharacterFormProps {
  initialValues?: Partial<CharacterFormValues>;
  onSubmit: (values: CharacterFormValues) => void | Promise<void>;
  onCancel?: () => void;
  isSubmitting?: boolean;
  submitLabel?: string;
  cancelLabel?: string;
  form?: UseCharacterFormReturn;
}

function renderContentTagLabel(tag: ContentTag, t: ReturnType<typeof useTranslation>['t']) {
  return t(`characters:contentTags.${tag}`);
}

export function CharacterForm({
  initialValues,
  onSubmit,
  onCancel,
  isSubmitting = false,
  submitLabel,
  cancelLabel,
  form
}: CharacterFormProps): JSX.Element {
  const { t } = useTranslation(['characters']);
  const formInstance = form ?? useCharacterForm({ initialValues });
  const { values, handleTextChange, handleSelectChange, handleNumberChange, toggleContentTag, isDirty } = formInstance;

  const submitText = submitLabel ?? t('characters:form.submit');
  const cancelText = cancelLabel ?? t('characters:form.cancel');

  const contentTagsByColumn = useMemo(() => {
    const midpoint = Math.ceil(CONTENT_TAG_OPTIONS.length / 2);
    return [
      CONTENT_TAG_OPTIONS.slice(0, midpoint),
      CONTENT_TAG_OPTIONS.slice(midpoint)
    ];
  }, []);

  return (
    <form
      className="space-y-8"
      onSubmit={event => {
        event.preventDefault();
        onSubmit(values);
      }}
    >
      <section>
        <h2 className="text-lg font-semibold text-slate-900 dark:text-white">
          {t('characters:form.sections.identity')}
        </h2>
        <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
          {t('characters:form.sections.identityHint')}
        </p>

        <div className="mt-6 grid gap-4 md:grid-cols-2">
          <label className="flex flex-col gap-2 text-sm">
            <span className="font-medium text-slate-600 dark:text-slate-300">
              {t('characters:form.fields.firstName')} <span className="text-red-500">*</span>
            </span>
            <input
              className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 shadow-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/30 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100"
              value={values.firstName}
              onChange={handleTextChange('firstName')}
              required
            />
          </label>

          <label className="flex flex-col gap-2 text-sm">
            <span className="font-medium text-slate-600 dark:text-slate-300">
              {t('characters:form.fields.lastName')}
            </span>
            <input
              className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 shadow-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/30 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100"
              value={values.lastName ?? ''}
              onChange={handleTextChange('lastName')}
            />
          </label>

          <label className="flex flex-col gap-2 text-sm">
            <span className="font-medium text-slate-600 dark:text-slate-300">
              {t('characters:form.fields.age')}
            </span>
            <input
              type="number"
              min={0}
              className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 shadow-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/30 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100"
              value={values.age ?? ''}
              onChange={handleNumberChange('age')}
            />
          </label>

          <label className="flex flex-col gap-2 text-sm">
            <span className="font-medium text-slate-600 dark:text-slate-300">
              {t('characters:form.fields.gender')}
            </span>
            <select
              className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 shadow-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/30 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100"
              value={values.gender ?? ''}
              onChange={handleSelectChange('gender')}
            >
              <option value="">Select gender</option>
              {GENDER_OPTIONS.map(option => (
                <option key={option} value={option}>
                  {t(`characters:genders.${option}`)}
                </option>
              ))}
            </select>
          </label>
        </div>

        <div className="mt-4 grid gap-4 md:grid-cols-2">
          <label className="flex flex-col gap-2 text-sm md:col-span-2">
            <span className="font-medium text-slate-600 dark:text-slate-300">
              {t('characters:form.fields.species')}
            </span>
            <input
              className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 shadow-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/30 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100"
              value={values.species ?? ''}
              onChange={handleTextChange('species')}
              placeholder={t('characters:form.placeholders.species') ?? ''}
            />
          </label>

          <label className="flex flex-col gap-2 text-sm md:col-span-2">
            <span className="font-medium text-slate-600 dark:text-slate-300">
              {t('characters:form.fields.style')}
            </span>
            <input
              className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 shadow-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/30 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100"
              value={values.style ?? ''}
              onChange={handleTextChange('style')}
              placeholder={t('characters:form.placeholders.style') ?? ''}
            />
          </label>

          <label className="flex flex-col gap-2 text-sm md:col-span-2">
            <span className="font-medium text-slate-600 dark:text-slate-300">
              {t('characters:form.fields.avatar')}
            </span>
            <input
              className="rounded-lg border border-dashed border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 shadow-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/30 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100"
              value={values.avatar ?? ''}
              onChange={handleTextChange('avatar')}
              placeholder={t('characters:form.placeholders.avatar') ?? ''}
            />
            <span className="text-xs text-slate-400">
              {t('characters:form.hints.avatar')}
            </span>
          </label>
        </div>
      </section>

      <section>
        <h2 className="text-lg font-semibold text-slate-900 dark:text-white">
          {t('characters:form.sections.profile')}
        </h2>
        <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
          {t('characters:form.sections.profileHint')}
        </p>

        <div className="mt-6 grid gap-4 md:grid-cols-2">
          <label className="flex flex-col gap-2 text-sm">
            <span className="font-medium text-slate-600 dark:text-slate-300">
              {t('characters:form.fields.physicalCharacteristics')}
            </span>
            <textarea
              rows={3}
              className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 shadow-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/30 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100"
              value={values.physicalCharacteristics ?? ''}
              onChange={handleTextChange('physicalCharacteristics')}
            />
          </label>

          <label className="flex flex-col gap-2 text-sm">
            <span className="font-medium text-slate-600 dark:text-slate-300">
              {t('characters:form.fields.personality')}
            </span>
            <textarea
              rows={3}
              className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 shadow-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/30 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100"
              value={values.personality ?? ''}
              onChange={handleTextChange('personality')}
            />
          </label>

          <label className="md:col-span-2 flex flex-col gap-2 text-sm">
            <span className="font-medium text-slate-600 dark:text-slate-300">
              {t('characters:form.fields.history')}
            </span>
            <textarea
              rows={4}
              className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 shadow-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/30 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100"
              value={values.history ?? ''}
              onChange={handleTextChange('history')}
            />
          </label>
        </div>
      </section>

      <section>
        <h2 className="text-lg font-semibold text-slate-900 dark:text-white">
          {t('characters:form.sections.configuration')}
        </h2>
        <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
          {t('characters:form.sections.configurationHint')}
        </p>

        <div className="mt-6 grid gap-4 md:grid-cols-2">
          <label className="flex flex-col gap-2 text-sm">
            <span className="font-medium text-slate-600 dark:text-slate-300">
              {t('characters:form.fields.isPublic')}
            </span>
            <div className="flex items-center gap-3 rounded-lg border border-slate-300 bg-white px-3 py-2 shadow-sm dark:border-slate-700 dark:bg-slate-900">
              <input
                type="checkbox"
                className="h-4 w-4"
                checked={values.isPublic ?? true}
                onChange={event => formInstance.updateField('isPublic', event.target.checked)}
              />
              <span className="text-sm text-slate-600 dark:text-slate-300">
                {t('characters:form.labels.publicToggle')}
              </span>
            </div>
          </label>

          <label className="flex flex-col gap-2 text-sm md:col-span-2">
            <span className="font-medium text-slate-600 dark:text-slate-300">
              {t('characters:form.fields.ageRating')} <span className="text-red-500">*</span>
            </span>
            <select
              className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 shadow-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/30 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100"
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
          <span className="text-sm font-medium text-slate-600 dark:text-slate-300">
            {t('characters:form.fields.contentTags')}
          </span>
          <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
            {t('characters:form.sections.contentTagsHint')}
          </p>
          <div className="mt-4 grid gap-4 md:grid-cols-2">
            {contentTagsByColumn.map((column, columnIndex) => (
              <div key={`tag-column-${columnIndex}`} className="space-y-2">
                {column.map(tag => {
                  const checked = values.contentTags.includes(tag);
                  return (
                    <label
                      key={tag}
                      className="flex items-center justify-between rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-600 shadow-sm transition hover:border-primary dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300"
                    >
                      <div className="flex flex-col">
                        <span className="font-medium">{renderContentTagLabel(tag, t)}</span>
                        <span className="text-xs text-slate-400">
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
      </section>

      <footer className="flex flex-col gap-3 border-t border-slate-200 pt-4 dark:border-slate-800 sm:flex-row sm:items-center sm:justify-between">
        <span className="text-xs text-slate-500 dark:text-slate-400">
          {isDirty ? t('characters:form.labels.unsavedChanges') : t('characters:form.labels.allSaved')}
        </span>
        <div className="flex flex-col gap-3 sm:flex-row">
          {onCancel && (
            <Button type="button" variant="light" onClick={onCancel} disabled={isSubmitting}>
              {cancelText}
            </Button>
          )}
          <Button type="submit" disabled={isSubmitting} className="sm:min-w-[9rem]">
            {isSubmitting ? t('characters:form.labels.submitting') : submitText}
          </Button>
        </div>
      </footer>
    </form>
  );
}
