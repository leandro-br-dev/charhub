import { useMemo, useState, type FormEvent } from 'react';
import { useTranslation } from 'react-i18next';
import { Button } from '../../../components/ui/Button';
import { AGE_RATING_OPTIONS, CONTENT_TAG_OPTIONS } from '../../(characters)/shared/utils/constants';
import { type ContentTag } from '../../../types/characters';
import { useAuth } from '../../../hooks/useAuth';
import { userService } from '../../../services/userService';

type ContentClassificationFormState = {
  ageRating: string;
  contentTags: ContentTag[];
};

export function ContentClassificationTab() {
  const { user, updateUser } = useAuth();
  const { t } = useTranslation(['profile', 'characters']);

  const [formState, setFormState] = useState<ContentClassificationFormState>(() => ({
    ageRating: user?.ageRating ?? 'sfw',
    contentTags: user?.contentTags ?? [],
  }));

  const [isSaving, setIsSaving] = useState(false);
  const [status, setStatus] = useState<'idle' | 'success' | 'error'>('idle');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const toggleContentTag = (tag: ContentTag) => {
    setFormState(prev => {
      const newTags = prev.contentTags.includes(tag)
        ? prev.contentTags.filter(t => t !== tag)
        : [...prev.contentTags, tag];
      return { ...prev, contentTags: newTags };
    });
  };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setIsSaving(true);
    setStatus('idle');
    setErrorMessage(null);

    try {
      const payload = {
        ageRating: formState.ageRating,
        contentTags: formState.contentTags,
      };

      const updated = await userService.updateProfile(payload);
      updateUser({
        ageRating: updated.ageRating ?? undefined,
        contentTags: updated.contentTags ?? undefined,
      });

      setFormState(prev => ({
        ...prev,
        ageRating: updated.ageRating ?? 'sfw',
        contentTags: updated.contentTags ?? [],
      }));

      setStatus('success');
    } catch (error) {
      console.error('[profile] failed to update content classification', error);
      const apiError = (error as { response?: { data?: { error?: string; message?: string } } }).response?.data;
      setErrorMessage(apiError?.error || apiError?.message || 'profile:errors.updateFailed');
      setStatus('error');
    } finally {
      setIsSaving(false);
    }
  };

  const contentTagsByColumn = useMemo(() => {
    const midpoint = Math.ceil(CONTENT_TAG_OPTIONS.length / 2);
    return [
      CONTENT_TAG_OPTIONS.slice(0, midpoint),
      CONTENT_TAG_OPTIONS.slice(midpoint),
    ];
  }, []);

  return (
    <form onSubmit={handleSubmit} className="space-y-6 rounded-xl border border-border bg-card p-6 shadow-sm">
      <h2 className="text-lg font-semibold text-title">{t('profile:contentClassification.header', 'Content Classification')}</h2>
      <p className="text-sm text-description">
        {t('profile:contentClassification.description', 'These settings help us to recommend you better content and characters.')}
      </p>

      <div className="grid gap-4 sm:grid-cols-2">
        <label className="flex flex-col gap-2 text-sm">
          <span className="font-medium text-content">{t('characters:form.fields.ageRating')}</span>
          <select
            className="rounded-lg border border-border bg-background px-3 py-2 text-sm text-content shadow-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/40"
            name="ageRating"
            value={formState.ageRating}
            onChange={(e) => setFormState(prev => ({ ...prev, ageRating: e.target.value }))}
          >
            {AGE_RATING_OPTIONS.map(option => (
              <option key={option} value={option}>
                {t(`characters:ageRatings.${option}`)}
              </option>
            ))}
          </select>
        </label>
      </div>

      <div>
        <span className="text-sm font-medium text-content">{t('characters:form.fields.contentTags')}</span>
        <p className="mt-1 text-xs text-description">
          {t('characters:form.sections.contentTagsHint')}
        </p>
        <div className="mt-4 grid gap-4 md:grid-cols-2">
          {contentTagsByColumn.map((column, columnIndex) => (
            <div key={`tag-column-${columnIndex}`} className="space-y-2">
              {column.map(tag => {
                const checked = formState.contentTags.includes(tag);
                return (
                  <label
                    key={tag}
                    className="flex items-center justify-between rounded-lg border border-border bg-background px-3 py-2 text-sm text-content shadow-sm transition hover:border-primary"
                  >
                    <div className="flex flex-col">
                      <span className="font-medium">{t(`characters:contentTags.${tag}`)}</span>
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

      <div className="flex flex-col gap-2">
        <div className="flex flex-wrap justify-end gap-3">
          <Button type="submit" variant="primary" disabled={isSaving}>
            {isSaving ? t('profile:actions.saving', 'Saving...') : t('profile:actions.save', 'Save changes')}
          </Button>
        </div>
        {status === 'success' ? (
          <p className="text-sm text-success">{t('profile:feedback.success', 'Profile updated successfully.')}</p>
        ) : null}
        {status === 'error' ? (
          <p className="text-sm text-danger">
            {t(errorMessage ?? 'profile:feedback.error', { defaultValue: errorMessage ?? 'We could not save your changes.' })}
          </p>
        ) : null}
      </div>
    </form>
  );
}
