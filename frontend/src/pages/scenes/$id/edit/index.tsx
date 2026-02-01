import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useSceneMutations, useSceneDetailQuery } from '../../shared/hooks/useSceneQueries';
import { useSceneForm } from '../../shared/hooks/useSceneForm';
import { SceneFormLayout } from '../../shared/components/SceneFormLayout';
import { usePageHeader } from '../../../../hooks/usePageHeader';
import { useToast } from '../../../../contexts/ToastContext';

export default function SceneEditPage() {
  const { t } = useTranslation(['scenes', 'common']);
  const { sceneId } = useParams<{ sceneId: string }>();
  const navigate = useNavigate();
  const { updateMutation } = useSceneMutations();
  const { data: scene, isLoading, isError } = useSceneDetailQuery(sceneId || '');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { setTitle } = usePageHeader();
  const { addToast } = useToast();

  // Initialize form with scene data
  const form = useSceneForm({
    initialValues: scene ? {
      name: scene.name,
      description: scene.description,
      shortDescription: scene.shortDescription || undefined,
      genre: scene.genre || undefined,
      era: scene.era || undefined,
      mood: scene.mood || undefined,
      style: scene.style || undefined,
      imagePrompt: scene.imagePrompt || undefined,
      mapPrompt: scene.mapPrompt || undefined,
      coverImageUrl: scene.coverImageUrl || undefined,
      mapImageUrl: scene.mapImageUrl || undefined,
      ageRating: scene.ageRating,
      contentTags: scene.contentTags,
      visibility: scene.visibility,
      tagIds: scene.tags?.map(t => t.id) || [],
    } : undefined,
  });

  useEffect(() => {
    if (scene) {
      setTitle(t('scenes:edit.title', 'Edit Scene'));
    }
  }, [scene, setTitle, t]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!sceneId) return;

    if (!form.values.name || form.values.name.trim().length === 0) {
      setError(t('scenes:messages.nameRequired', 'Scene name is required'));
      return;
    }

    setIsSubmitting(true);
    setError(null);

    try {
      // Sanitize payload: remove base64 data URLs to prevent 413 errors
      // In edit mode, coverImageUrl should always be a valid URL, not base64
      const sanitizedPayload = {
        ...form.values,
        coverImageUrl: form.values.coverImageUrl?.startsWith('data:')
          ? undefined // Remove base64, backend should keep existing URL
          : form.values.coverImageUrl,
        mapImageUrl: form.values.mapImageUrl?.startsWith('data:')
          ? undefined
          : form.values.mapImageUrl,
      };

      const result = await updateMutation.mutateAsync({ sceneId, payload: sanitizedPayload });

      if (result.success) {
        addToast(t('scenes:messages.updated', 'Scene updated successfully'), 'success');
        // Stay on page - just show success message
      } else {
        setError(result.message || t('scenes:messages.errorUpdating', 'Failed to update scene'));
      }
    } catch (err) {
      console.error('Error updating scene:', err);
      setError(t('scenes:messages.errorUpdating', 'Failed to update scene'));
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCancel = () => {
    navigate('/scenes/hub');
  };

  if (isLoading) {
    return (
      <div className="flex h-64 flex-col items-center justify-center gap-3 text-description">
        <span className="material-symbols-outlined animate-spin text-5xl">progress_activity</span>
        <p>{t('scenes:edit.states.loading', 'Loading scene...')}</p>
      </div>
    );
  }

  if (isError || !scene) {
    return (
      <div className="flex h-64 flex-col items-center justify-center gap-4 text-center text-description">
        <span className="material-symbols-outlined text-6xl text-red-500">error</span>
        <p>{t('scenes:edit.states.notFound', 'Scene not found')}</p>
        <button
          type="button"
          className="text-primary underline-offset-2 hover:underline"
          onClick={() => navigate('/scenes/hub')}
        >
          {t('scenes:edit.actions.backToHub', 'Back to Scenes')}
        </button>
      </div>
    );
  }

  return (
    <SceneFormLayout
      mode="edit"
      sceneName={scene.name}
      coverUrl={scene.coverImageUrl || undefined}
      sceneId={sceneId}
      form={form}
      error={error}
      isSubmitting={isSubmitting}
      onSubmit={handleSubmit}
      onCancel={handleCancel}
      submitLabel={t('scenes:form.saveChanges', 'Save Changes')}
      cancelLabel={t('common:cancel', 'Cancel')}
    />
  );
}
