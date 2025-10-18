import { useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate, useParams } from 'react-router-dom';
import { useCharacterMutations, useCharacterQuery } from '../../shared/hooks/useCharacterQueries';
import { useCharacterForm } from '../../shared/hooks/useCharacterForm';
import { characterToFormValues } from '../../shared';
import { CharacterFormLayout } from '../../shared/components';

export default function CharacterEditPage(): JSX.Element {
  const { t } = useTranslation(['characters']);
  const navigate = useNavigate();
  const params = useParams<{ characterId: string }>();
  const characterId = params.characterId ?? '';

  const { data, isLoading, isError } = useCharacterQuery(characterId);
  const { updateMutation } = useCharacterMutations();
  const [error, setError] = useState<string | null>(null);

  const initialValues = useMemo(() => data ? characterToFormValues(data) : undefined, [data]);
  const form = useCharacterForm({ initialValues });

  useEffect(() => {
    if (isError) {
      setError(t('characters:errors.detailUnavailable'));
    }
  }, [isError, t]);

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!characterId) return;

    setError(null);
    try {
      await updateMutation.mutateAsync({ characterId, payload: form.values });
      navigate(`/characters/${characterId}`);
    } catch (mutationError) {
      const fallbackKey = 'characters:errors.updateFailed';
      const messageKey = mutationError instanceof Error ? mutationError.message : fallbackKey;
      setError(t(messageKey, { defaultValue: t(fallbackKey) }));
    }
  };

  if (isLoading || !data) {
    return (
      <section className="flex h-[60vh] flex-col items-center justify-center gap-3 text-muted">
        <span className="material-symbols-outlined animate-spin text-5xl">progress_activity</span>
        <p>{t('characters:edit.states.loading')}</p>
      </section>
    );
  }

  const characterName = [data.firstName, data.lastName].filter(Boolean).join(' ');

  return (
    <CharacterFormLayout
      mode="edit"
      characterName={characterName}
      avatarUrl={data.avatar ?? undefined}
      form={form}
      error={error}
      isSubmitting={updateMutation.isPending}
      onSubmit={handleSubmit}
      onCancel={() => navigate(`/characters/${characterId}`)}
      submitLabel={t('characters:edit.saveButton')}
      cancelLabel={t('characters:edit.cancelButton')}
    />
  );
}
