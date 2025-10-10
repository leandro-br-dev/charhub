import { useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate, useParams } from 'react-router-dom';
import { CharacterForm } from '../../shared/components/CharacterForm';
import { useCharacterMutations, useCharacterQuery } from '../../shared/hooks/useCharacterQueries';
import { characterToFormValues } from '../../shared';
import { type CharacterFormValues } from '../../../../types/characters';

export default function CharacterEditPage(): JSX.Element {
  const { t } = useTranslation(['characters']);
  const navigate = useNavigate();
  const params = useParams<{ characterId: string }>();
  const characterId = params.characterId ?? '';

  const { data, isLoading, isError } = useCharacterQuery(characterId);
  const { updateMutation } = useCharacterMutations();
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (isError) {
      setError(t('characters:errors.detailUnavailable'));
    }
  }, [isError, t]);

  const handleSubmit = async (values: CharacterFormValues) => {
    if (!characterId) return;
    setError(null);
    try {
      await updateMutation.mutateAsync({ characterId, payload: values });
      navigate(`/characters/${characterId}`);
    } catch (mutationError) {
      const fallbackKey = 'characters:errors.updateFailed';
      const messageKey = mutationError instanceof Error ? mutationError.message : fallbackKey;
      setError(t(messageKey, { defaultValue: t(fallbackKey) }));
    }
  };

  if (isLoading || !data) {
    return (
      <section className="flex h-[60vh] flex-col items-center justify-center gap-3 text-slate-500 dark:text-slate-300">
        <span className="material-symbols-outlined animate-spin text-5xl">progress_activity</span>
        <p>{t('characters:edit.states.loading')}</p>
      </section>
    );
  }

  const initialValues = useMemo(() => characterToFormValues(data), [data]);

  return (
    <section className="mx-auto flex max-w-5xl flex-col gap-8 px-6 py-10">
      <header className="space-y-2">
        <h1 className="text-3xl font-semibold text-slate-900 dark:text-white">
          {t('characters:edit.title')}
        </h1>
        <p className="text-sm text-slate-600 dark:text-slate-300">
          {t('characters:edit.subtitle', { name: [data.firstName, data.lastName].filter(Boolean).join(' ') || t('characters:labels.untitledCharacter') })}
        </p>
      </header>

      {error && (
        <div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700 dark:border-red-500/40 dark:bg-red-500/10 dark:text-red-200">
          {error}
        </div>
      )}

      <div className="rounded-3xl border border-slate-200 bg-white/80 p-6 shadow-lg dark:border-slate-800 dark:bg-slate-900/80">
        <CharacterForm
          initialValues={initialValues}
          onSubmit={handleSubmit}
          onCancel={() => navigate(`/characters/${characterId}`)}
          isSubmitting={updateMutation.isPending}
          submitLabel={t('characters:edit.saveButton')}
          cancelLabel={t('characters:edit.cancelButton')}
        />
      </div>
    </section>
  );
}
