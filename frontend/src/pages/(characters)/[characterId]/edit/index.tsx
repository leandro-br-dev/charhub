import { useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate, useParams } from 'react-router-dom';
import { useCharacterMutations, useCharacterQuery } from '../../shared/hooks/useCharacterQueries';
import { useCharacterForm } from '../../shared/hooks/useCharacterForm';
import { characterToFormValues } from '../../shared';
import { CharacterFormLayout } from '../../shared/components';
import { useAuth } from '../../../../hooks/useAuth';
import { useAdmin } from '../../../../hooks/useAdmin';
import { useToast } from '../../../../contexts/ToastContext';
import { Button } from '../../../../components/ui/Button';

/**
 * CharHub Official user ID (UUID constant)
 * Characters owned by this user can only be edited by ADMINs
 */
const CHARHUB_OFFICIAL_ID = '00000000-0000-0000-0000-000000000001';

export default function CharacterEditPage(): JSX.Element {
  const { t } = useTranslation(['characters']);
  const navigate = useNavigate();
  const params = useParams<{ characterId: string }>();
  const characterId = params.characterId ?? '';
  const { user } = useAuth();
  const { isAdmin } = useAdmin();
  const { addToast } = useToast();

  const { data, isLoading, isError } = useCharacterQuery(characterId);
  const { updateMutation } = useCharacterMutations();
  const [error, setError] = useState<string | null>(null);

  const initialValues = useMemo(() => data ? characterToFormValues(data) : undefined, [data]);
  const form = useCharacterForm({ initialValues });

  // Check if user can edit this character
  const canEdit = useMemo(() => {
    if (!user || !data) return false;
    // User is owner OR (user is ADMIN and character is official)
    return user.id === data.userId || (isAdmin && data.userId === CHARHUB_OFFICIAL_ID);
  }, [user, data, isAdmin]);

  // Note: We don't need this useEffect anymore because the hook now handles
  // initialValues changes internally. Removing it prevents infinite loops.

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
      // Show success toast and stay on page
      addToast(t('characters:edit.saveSuccess', 'Character saved successfully'), 'success', 3000);
      // Update the form's initial snapshot to mark as not dirty
      form.reset(form.values);
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

  // Access denied - user cannot edit this character
  if (!canEdit) {
    return (
      <section className="flex h-[60vh] flex-col items-center justify-center gap-4 text-muted">
        <span className="material-symbols-outlined text-5xl text-danger">lock</span>
        <h2 className="text-2xl font-bold text-title">{t('characters:edit.accessDenied.title')}</h2>
        <p className="text-center text-content/80">
          {t('characters:edit.accessDenied.message')}
        </p>
        <Button type="button" onClick={() => navigate(`/characters/${characterId}`)} icon="arrow_back">
          {t('characters:edit.accessDenied.backButton')}
        </Button>
      </section>
    );
  }

  const characterName = [data.firstName, data.lastName].filter(Boolean).join(' ');

  return (
    <CharacterFormLayout
      mode="edit"
      characterName={characterName}
      avatarUrl={data.avatar ?? undefined}
      characterId={characterId}
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
