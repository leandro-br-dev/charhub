import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import { useCharacterMutations } from '../shared/hooks/useCharacterQueries';
import { useCharacterForm } from '../shared/hooks/useCharacterForm';
import { CharacterFormLayout } from '../shared/components';
import { useToast } from '../../../contexts/ToastContext';

export default function CharacterCreatePage(): JSX.Element {
  const { t } = useTranslation(['characters']);
  const navigate = useNavigate();
  const { createMutation } = useCharacterMutations();
  const { addToast } = useToast();
  const [error, setError] = useState<string | null>(null);

  const form = useCharacterForm();

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    setError(null);
    try {
      const newCharacter = await createMutation.mutateAsync(form.values);
      // Show success toast and stay on page
      addToast(t('characters:create.saveSuccess', 'Character created successfully'), 'success', 3000);
      // Reset form for new character
      form.reset();
      // Optionally navigate to the created character (commented out per user request)
      // navigate(`/characters/${newCharacter.character?.id}`);
    } catch (mutationError) {
      const fallbackKey = 'characters:errors.createFailed';
      const messageKey = mutationError instanceof Error ? mutationError.message : fallbackKey;
      setError(t(messageKey, { defaultValue: t(fallbackKey) }));
    }
  };

  const handleCancel = () => {
    navigate('/characters');
  };

  return (
    <CharacterFormLayout
      mode="create"
      form={form}
      error={error}
      isSubmitting={createMutation.isPending}
      onSubmit={handleSubmit}
      onCancel={handleCancel}
      submitLabel={t('characters:create.saveButton', 'Save character')}
      cancelLabel={t('characters:create.cancelButton', 'Cancel and go back')}
    />
  );
}
