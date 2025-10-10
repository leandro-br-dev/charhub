import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import { CharacterForm } from '../shared/components/CharacterForm';
import { useCharacterMutations } from '../shared/hooks/useCharacterQueries';
import { EMPTY_CHARACTER_FORM, type CharacterFormValues } from '../../../types/characters';

export default function CharacterCreatePage(): JSX.Element {
  const { t } = useTranslation(['characters']);
  const navigate = useNavigate();
  const { createMutation } = useCharacterMutations();
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (values: CharacterFormValues) => {
    setError(null);
    try {
      const result = await createMutation.mutateAsync(values);
      if (result.character) {
        navigate(`/characters/${result.character.id}`);
      }
    } catch (mutationError) {
      const fallbackKey = 'characters:errors.createFailed';
      const messageKey = mutationError instanceof Error ? mutationError.message : fallbackKey;
      setError(t(messageKey, { defaultValue: t(fallbackKey) }));
    }
  };

  return (
    <section className="mx-auto flex max-w-5xl flex-col gap-8 px-6 py-10">
      <header className="space-y-2">
        <h1 className="text-3xl font-semibold text-slate-900 dark:text-white">
          {t('characters:create.title')}
        </h1>
        <p className="text-sm text-slate-600 dark:text-slate-300">
          {t('characters:create.subtitle')}
        </p>
      </header>

      {error && (
        <div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700 dark:border-red-500/40 dark:bg-red-500/10 dark:text-red-200">
          {error}
        </div>
      )}

      <div className="rounded-3xl border border-slate-200 bg-white/80 p-6 shadow-lg dark:border-slate-800 dark:bg-slate-900/80">
        <CharacterForm
          initialValues={EMPTY_CHARACTER_FORM}
          onSubmit={handleSubmit}
          onCancel={() => navigate(-1)}
          isSubmitting={createMutation.isPending}
          submitLabel={t('characters:create.saveButton')}
          cancelLabel={t('characters:create.cancelButton')}
        />
      </div>
    </section>
  );
}
