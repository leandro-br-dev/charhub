import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useSceneMutations } from '../shared/hooks/useSceneQueries';
import { useSceneForm } from '../shared/hooks/useSceneForm';
import { SceneFormLayout } from '../shared/components/SceneFormLayout';
import { usePageHeader } from '../../../hooks/usePageHeader';
import { useToast } from '../../../contexts/ToastContext';
import { EMPTY_SCENE_FORM } from '../../../types/scenes';
import { sceneService } from '../../../services/sceneService';

export default function SceneCreatePage() {
  const { t } = useTranslation(['scenes', 'common']);
  const navigate = useNavigate();
  const { createMutation } = useSceneMutations();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { setTitle } = usePageHeader();
  const { addToast } = useToast();

  // Initialize form
  const form = useSceneForm({
    initialValues: EMPTY_SCENE_FORM,
  });

  // Set page title
  useEffect(() => {
    setTitle(t('scenes:form.create', 'Create Scene'));
  }, [setTitle, t]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Validation
    if (!form.values.name || form.values.name.trim().length === 0) {
      setError(t('scenes:messages.nameRequired', 'Scene name is required'));
      return;
    }

    if (!form.values.description || form.values.description.trim().length === 0) {
      setError(t('scenes:messages.descriptionRequired', 'Description is required'));
      return;
    }

    setIsSubmitting(true);
    setError(null);

    try {
      // Sanitize payload: remove base64 data URLs to prevent 413 errors
      // In create mode, base64 images need to be uploaded AFTER scene creation
      // We'll need to handle cover image upload separately after getting sceneId
      const sanitizedPayload = {
        ...form.values,
        coverImageUrl: undefined, // Always undefined for create - upload after
        mapImageUrl: form.values.mapImageUrl?.startsWith('data:')
          ? undefined
          : form.values.mapImageUrl,
      };

      const result = await createMutation.mutateAsync(sanitizedPayload);

      if (result.success && result.scene) {
        // If there was a base64 cover image, upload it now that we have a sceneId
        if (form.values.coverImageUrl?.startsWith('data:') && result.scene.id) {
          try {
            // Convert base64 to blob and upload
            const base64Data = form.values.coverImageUrl.split(',')[1];
            const byteCharacters = atob(base64Data);
            const byteArrays = [];
            for (let offset = 0; offset < byteCharacters.length; offset += 512) {
              const slice = byteCharacters.slice(offset, offset + 512);
              const byteNumbers = new Array(slice.length);
              for (let i = 0; i < slice.length; i++) {
                byteNumbers[i] = slice.charCodeAt(i);
              }
              byteArrays.push(new Uint8Array(byteNumbers));
            }
            const blob = new Blob(byteArrays, { type: 'image/webp' });
            const file = new File([blob], 'scene-cover.webp', { type: 'image/webp' });
            await sceneService.uploadCover({ file, sceneId: result.scene.id });
          } catch (uploadError) {
            console.error('Failed to upload cover after scene creation:', uploadError);
            // Continue anyway - scene was created successfully
          }
        }

        addToast(t('scenes:messages.created', 'Scene created successfully'), 'success');
        // After creating, redirect to edit page
        navigate(`/scenes/${result.scene.id}/edit`);
      } else {
        setError(result.message || t('scenes:messages.errorCreating', 'Failed to create scene'));
      }
    } catch (err) {
      console.error('Error creating scene:', err);
      setError(t('scenes:messages.errorCreating', 'Failed to create scene'));
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCancel = () => {
    navigate('/scenes/hub');
  };

  return (
    <SceneFormLayout
      mode="create"
      sceneName={form.values.name || undefined}
      form={form}
      error={error}
      isSubmitting={isSubmitting}
      onSubmit={handleSubmit}
      onCancel={handleCancel}
      submitLabel={t('scenes:form.create', 'Create Scene')}
      cancelLabel={t('common:cancel', 'Cancel')}
    />
  );
}
