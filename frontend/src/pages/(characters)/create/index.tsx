import { useState, useMemo, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import { useCharacterMutations } from '../shared/hooks/useCharacterQueries';
import { useCharacterForm } from '../shared/hooks/useCharacterForm';
import { CharacterFormLayout } from '../shared/components';
import { EMPTY_CHARACTER_FORM } from '../../../types/characters';
import { useToast } from '../../../contexts/ToastContext';
import { characterToFormValues } from '../shared/utils/mappers';
import { useAuth } from '../../../hooks/useAuth';

export default function CharacterCreatePage(): JSX.Element {
  const { t, i18n } = useTranslation(['characters']);
  const navigate = useNavigate();
  const { user } = useAuth();
  const { createMutation, updateMutation } = useCharacterMutations();
  const { addToast } = useToast();
  const [error, setError] = useState<string | null>(null);
  const [createdId, setCreatedId] = useState<string | null>(null);
  const [draftId] = useState(() => {
    if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
      return crypto.randomUUID();
    }
    return `char-draft-${Math.random().toString(36).slice(2, 11)}`;
  });

  // Initialize form with current interface language from i18next
  const initialValues = useMemo(() => ({
    ...EMPTY_CHARACTER_FORM,
    originalLanguageCode: i18n.language || 'en'
  }), [i18n.language]);

  const form = useCharacterForm({ initialValues });

  // Update originalLanguageCode when interface language changes
  useEffect(() => {
    if (form.values.originalLanguageCode !== i18n.language) {
      form.updateField('originalLanguageCode', i18n.language || 'en');
    }
  }, [i18n.language, form]);

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError(null);
    try {
      if (!createdId) {
        const result = await createMutation.mutateAsync(form.values);
        if (result.character) {
          // Switch into edit mode without navigating
          setCreatedId(result.character.id);
          // Merge server fields but keep local-only fields like cover
          form.setValues(prev => ({ ...prev, ...characterToFormValues(result.character!) }));
          addToast(t('characters:create.saved', 'Character saved.'), 'success');
          // Persist cover locally for this character
          if (form.values.cover) {
            try { window.localStorage.setItem(`charhub.cover.${result.character.id}`, form.values.cover); } catch {}
          }
        }
      } else {
        const result = await updateMutation.mutateAsync({ characterId: createdId, payload: form.values });
        if (result.character) {
          // Merge server updates but keep local-only fields like cover
          form.setValues(prev => ({ ...prev, ...characterToFormValues(result.character!) }));
        }
        addToast(t('characters:edit.saved', 'Changes saved.'), 'success');
        if (form.values.cover) {
          try { window.localStorage.setItem(`charhub.cover.${createdId}`, form.values.cover); } catch {}
        }
      }
    } catch (mutationError) {
      const fallbackKey = 'characters:errors.createFailed';
      const messageKey = mutationError instanceof Error ? mutationError.message : fallbackKey;
      setError(t(messageKey, { defaultValue: t(fallbackKey) }));
    }
  };

  return (
    <CharacterFormLayout
      mode={createdId ? 'edit' : 'create'}
      characterId={createdId ?? undefined}
      draftId={draftId}
      form={form}
      error={error}
      isSubmitting={createMutation.isPending || updateMutation.isPending}
      onSubmit={handleSubmit}
      onCancel={() => navigate(-1)}
      submitLabel={t('characters:create.saveButton')}
      cancelLabel={t('characters:create.cancelButton')}
    />
  );
}
