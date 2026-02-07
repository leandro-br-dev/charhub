import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useAssetMutations, useAssetDetailQuery } from '../../shared/hooks/useAssetQueries';
import { useAssetForm } from '../../shared/hooks/useAssetForm';
import { AssetFormLayout } from '../../shared/components/AssetFormLayout';
import { usePageHeader } from '../../../../hooks/usePageHeader';
import { useToast } from '../../../../contexts/ToastContext';
import type { AssetFormValues } from '../../../../types/assets';
import type { ContentTag } from '../../../../types/characters';

export default function AssetEditPage() {
  const { t } = useTranslation(['assets', 'common']);
  const { assetId } = useParams<{ assetId: string }>();
  const navigate = useNavigate();
  const { updateMutation } = useAssetMutations();
  const { data: asset, isLoading, isError } = useAssetDetailQuery(assetId || '');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { setTitle } = usePageHeader();
  const { addToast } = useToast();

  // Initialize form with asset data
  const form = useAssetForm({
    initialValues: asset ? {
      name: asset.name,
      description: asset.description,
      type: asset.type,
      category: asset.category,
      previewImageUrl: asset.previewImageUrl || null,
      style: asset.style || null,
      ageRating: asset.ageRating,
      contentTags: asset.contentTags,
      visibility: asset.visibility,
      tagIds: asset.tagObjects?.map(t => t.id) || [],
    } : undefined,
  });

  useEffect(() => {
    if (asset) {
      setTitle(t('assets:edit.title', 'Edit Asset'));
    }
  }, [asset, setTitle, t]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!assetId) return;

    if (!form.values.name || form.values.name.trim().length === 0) {
      setError(t('assets:messages.nameRequired', 'Asset name is required'));
      return;
    }

    setIsSubmitting(true);
    setError(null);

    try {
      // Sanitize payload: remove base64 data URLs to prevent 413 errors
      // In edit mode, previewImageUrl should always be a valid URL, not base64
      const sanitizedPayload: AssetFormValues = {
        ...form.values,
        previewImageUrl: form.values.previewImageUrl?.startsWith('data:')
          ? null // Remove base64, backend should keep existing URL
          : form.values.previewImageUrl,
      };

      const result = await updateMutation.mutateAsync({ assetId, payload: sanitizedPayload });

      if (result.success) {
        addToast(t('assets:messages.updated', 'Asset updated successfully'), 'success');
        // Stay on page - just show success message
      } else {
        setError(result.message || t('assets:messages.errorUpdating', 'Failed to update asset'));
      }
    } catch (err) {
      console.error('Error updating asset:', err);
      setError(t('assets:messages.errorUpdating', 'Failed to update asset'));
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCancel = () => {
    navigate('/assets/hub');
  };

  if (isLoading) {
    return (
      <div className="flex h-64 flex-col items-center justify-center gap-3 text-description">
        <span className="material-symbols-outlined animate-spin text-5xl">progress_activity</span>
        <p>{t('assets:edit.states.loading', 'Loading asset...')}</p>
      </div>
    );
  }

  if (isError || !asset) {
    return (
      <div className="flex h-64 flex-col items-center justify-center gap-4 text-center text-description">
        <span className="material-symbols-outlined text-6xl text-red-500">error</span>
        <p>{t('assets:edit.states.notFound', 'Asset not found')}</p>
        <button
          type="button"
          className="text-primary underline-offset-2 hover:underline"
          onClick={() => navigate('/assets/hub')}
        >
          {t('assets:edit.actions.backToHub', 'Back to Assets')}
        </button>
      </div>
    );
  }

  return (
    <AssetFormLayout
      mode="edit"
      assetName={asset.name}
      coverUrl={asset.previewImageUrl || undefined}
      assetId={assetId}
      images={asset.images}
      form={form}
      error={error}
      isSubmitting={isSubmitting}
      onSubmit={handleSubmit}
      onCancel={handleCancel}
      submitLabel={t('assets:form.saveChanges', 'Save Changes')}
      cancelLabel={t('common:cancel', 'Cancel')}
    />
  );
}
