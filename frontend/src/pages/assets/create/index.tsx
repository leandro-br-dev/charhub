import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useAssetMutations } from '../shared/hooks/useAssetQueries';
import { useAssetForm } from '../shared/hooks/useAssetForm';
import { AssetFormLayout } from '../shared/components/AssetFormLayout';
import { usePageHeader } from '../../../hooks/usePageHeader';
import { useToast } from '../../../contexts/ToastContext';
import { EMPTY_ASSET_FORM } from '../../../types/assets';
import { assetService } from '../../../services/assetService';

export default function AssetCreatePage() {
  const { t } = useTranslation(['assets', 'common']);
  const navigate = useNavigate();
  const { createMutation } = useAssetMutations();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { setTitle } = usePageHeader();
  const { addToast } = useToast();

  // Initialize form
  const form = useAssetForm({
    initialValues: EMPTY_ASSET_FORM,
  });

  // Set page title
  useEffect(() => {
    setTitle(t('assets:form.create', 'Create Asset'));
  }, [setTitle, t]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Validation
    if (!form.values.name || form.values.name.trim().length === 0) {
      setError(t('assets:messages.nameRequired', 'Asset name is required'));
      return;
    }

    if (!form.values.description || form.values.description.trim().length === 0) {
      setError(t('assets:messages.descriptionRequired', 'Description is required'));
      return;
    }

    setIsSubmitting(true);
    setError(null);

    try {
      // Sanitize payload: remove base64 data URLs to prevent 413 errors
      // In create mode, base64 images need to be uploaded AFTER asset creation
      // We'll need to handle preview image upload separately after getting assetId
      const sanitizedPayload = {
        ...form.values,
        previewImageUrl: null, // Always null for create - upload after
      };

      const result = await createMutation.mutateAsync(sanitizedPayload);

      if (result.success && result.asset) {
        // If there was a base64 preview image, upload it now that we have an assetId
        if (form.values.previewImageUrl?.startsWith('data:') && result.asset.id) {
          try {
            // Convert base64 to blob and upload
            const base64Data = form.values.previewImageUrl.split(',')[1];
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
            await assetService.uploadImage({
              file: blob,
              assetId: result.asset.id,
              type: 'PREVIEW',
            });
          } catch (uploadError) {
            console.error('Failed to upload preview after asset creation:', uploadError);
            // Continue anyway - asset was created successfully
          }
        }

        addToast(t('assets:messages.created', 'Asset created successfully'), 'success');
        // After creating, redirect to edit page
        navigate(`/assets/${result.asset.id}/edit`);
      } else {
        setError(result.message || t('assets:messages.errorCreating', 'Failed to create asset'));
      }
    } catch (err) {
      console.error('Error creating asset:', err);
      setError(t('assets:messages.errorCreating', 'Failed to create asset'));
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCancel = () => {
    navigate('/assets/hub');
  };

  return (
    <AssetFormLayout
      mode="create"
      assetName={form.values.name || undefined}
      form={form}
      error={error}
      isSubmitting={isSubmitting}
      onSubmit={handleSubmit}
      onCancel={handleCancel}
      submitLabel={t('assets:form.create', 'Create Asset')}
      cancelLabel={t('common:cancel', 'Cancel')}
    />
  );
}
