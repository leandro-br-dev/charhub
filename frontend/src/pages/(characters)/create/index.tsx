import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import { useCharacterMutations } from '../shared/hooks/useCharacterQueries';
import { useCharacterForm } from '../shared/hooks/useCharacterForm';
import { CharacterFormLayout } from '../shared/components';
import { EMPTY_CHARACTER_FORM } from '../../../types/characters';

export default function CharacterCreatePage(): JSX.Element {
  const { t } = useTranslation(['characters']);
  const navigate = useNavigate();
  const { createMutation } = useCharacterMutations();
  const [error, setError] = useState<string | null>(null);
  const [draftId] = useState(() => {
    if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
      return crypto.randomUUID();
    }
    return `char-draft-${Math.random().toString(36).slice(2, 11)}`;
  });
  const form = useCharacterForm({ initialValues: EMPTY_CHARACTER_FORM });

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError(null);
    try {
      const result = await createMutation.mutateAsync(form.values);
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
    <CharacterFormLayout
      mode="create"
      draftId={draftId}
      form={form}
      error={error}
      isSubmitting={createMutation.isPending}
      onSubmit={handleSubmit}
      onCancel={() => navigate(-1)}
      submitLabel={t('characters:create.saveButton')}
      cancelLabel={t('characters:create.cancelButton')}
    />
  );
}
