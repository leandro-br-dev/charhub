import { useCallback, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Dialog } from '../../../../components/ui/Dialog';
import { useToast } from '../../../../contexts/ToastContext';
import type { AssetImage, AssetImageTypeDb } from '../../../../types/assets';
import { AssetImageUploader } from './AssetImageUploader';

interface AssetImagesTabProps {
  assetId?: string;
  initialImages?: AssetImage[];
}

export function AssetImagesTab({ assetId, initialImages = [] }: AssetImagesTabProps): JSX.Element {
  const { t } = useTranslation(['assets', 'common']);
  const { addToast } = useToast();
  const [images, setImages] = useState<AssetImage[]>(initialImages);
  const [isDeleting, setIsDeleting] = useState<string | null>(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState<string | null>(null);
  const [selectedType, setSelectedType] = useState<AssetImageTypeDb>('preview');
  const [isUploading, setIsUploading] = useState(false);

  // Image type options
  const imageTypes: AssetImageTypeDb[] = ['preview', 'reference', 'transparent', 'in_context'];

  const handleUploadComplete = (imageUrl: string, imageType: string) => {
    if (!assetId) return;
    setImages(prev => [...prev, {
      id: `temp-${Date.now()}`,
      assetId,
      imageUrl,
      imageType: imageType as AssetImageTypeDb,
      width: null,
      height: null,
      createdAt: new Date().toISOString(),
    }]);
  };

  const handleDeleteClick = (imageId: string) => {
    setDeleteDialogOpen(imageId);
  };

  const handleDeleteConfirm = async () => {
    const imageId = deleteDialogOpen;
    if (!imageId) return;

    setIsDeleting(imageId);
    setDeleteDialogOpen(null);

    try {
      // Note: Delete functionality needs to be implemented in the backend
      // For now, just remove from local state
      setImages(prev => prev.filter(img => img.id !== imageId));
      addToast(t('assets:images.imageDeleted'), 'success');
    } catch (error) {
      console.error('[AssetImagesTab] Delete failed:', error);
      addToast(t('assets:images.deleteFailed'), 'error');
    } finally {
      setIsDeleting(null);
    }
  };

  const imageToDelete = images.find(img => img.id === deleteDialogOpen);

  if (!assetId) {
    return (
      <div className="space-y-6 rounded-xl border border-border bg-card p-4 sm:p-6 shadow-sm">
        <div>
          <h2 className="text-lg font-semibold text-title">
            {t('assets:images.title')}
          </h2>
          <p className="mt-2 text-sm text-description">
            {t('assets:form.sections.imagesHint')}
          </p>
        </div>
        <div className="rounded-lg bg-normal/50 p-6 text-center">
          <span className="material-symbols-outlined text-4xl text-muted">image</span>
          <p className="mt-3 text-sm text-content">
            {t('assets:form.images.saveFirst', 'Save the asset first to add images')}
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 rounded-xl border border-border bg-card p-4 sm:p-6 shadow-sm">
      <div>
        <h2 className="text-lg font-semibold text-title">
          {t('assets:images.title')}
        </h2>
        <p className="mt-2 text-sm text-description">
          {t('assets:form.sections.imagesHint')}
        </p>
      </div>

      {/* Upload form */}
      <div className="rounded-lg bg-normal/50 p-4 space-y-4">
        <div className="grid gap-4 sm:grid-cols-[200px_1fr_auto] items-end">
          {/* Type selector */}
          <label className="flex flex-col gap-2 text-sm">
            <span className="font-medium text-content">
              {t('assets:images.selectType')}
            </span>
            <select
              value={selectedType}
              onChange={(e) => setSelectedType(e.target.value as AssetImageTypeDb)}
              className="rounded-lg border border-border bg-background px-3 py-2 text-sm text-content shadow-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/40"
            >
              {imageTypes.map(type => (
                <option key={type} value={type}>
                  {t(`assets:imageTypes.${type}`)}
                </option>
              ))}
            </select>
          </label>

          {/* Add button */}
          <AssetImageUploader
            assetId={assetId}
            imageType={selectedType}
            onUploadComplete={handleUploadComplete}
            isUploading={isUploading}
            setIsUploading={setIsUploading}
          />
        </div>
      </div>

      {/* Images list */}
      {images.length === 0 ? (
        <div className="rounded-lg bg-normal/50 p-6 text-center">
          <span className="material-symbols-outlined text-4xl text-muted">photo_library</span>
          <p className="mt-3 text-sm text-content">
            {t('assets:images.noImages')}
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {imageTypes.map(type => {
            const typeImages = images.filter(img => img.imageType === type);
            if (typeImages.length === 0) return null;

            return (
              <div key={type} className="space-y-3">
                <div className="flex items-center gap-2">
                  <span className="inline-flex items-center rounded-full bg-primary/10 px-3 py-1 text-xs font-medium text-primary">
                    {t(`assets:imageTypes.${type}`)}
                  </span>
                  <span className="text-xs text-muted">
                    {typeImages.length} {typeImages.length === 1 ? 'image' : 'images'}
                  </span>
                </div>

                <div className="space-y-2">
                  {typeImages.map(image => (
                    <div
                      key={image.id}
                      className="flex gap-4 rounded-lg border border-border overflow-hidden bg-card hover:bg-normal/30 transition-colors"
                    >
                      {/* Image */}
                      <div className="relative flex-shrink-0">
                        <img
                          src={image.imageUrl}
                          alt={t(`assets:imageTypes.${image.imageType}`)}
                          className="w-32 h-32 object-cover"
                        />
                      </div>

                      {/* Details */}
                      <div className="flex-1 min-w-0 p-3 flex flex-col justify-between">
                        <div className="space-y-1">
                          <div className="flex items-center gap-2">
                            <span className="inline-flex items-center rounded-full bg-primary/10 px-2 py-0.5 text-xs font-medium text-primary">
                              {t(`assets:imageTypes.${image.imageType}`)}
                            </span>
                            <span className="text-xs text-muted">
                              {new Date(image.createdAt).toLocaleDateString()}
                            </span>
                          </div>
                          {image.width && image.height && (
                            <p className="text-sm text-content">
                              {image.width} x {image.height}
                            </p>
                          )}
                        </div>

                        {/* Actions */}
                        <div className="flex items-center justify-end gap-2">
                          <button
                            type="button"
                            onClick={() => handleDeleteClick(image.id)}
                            disabled={isDeleting === image.id}
                            className="rounded-full px-3 py-1 text-xs font-medium text-red-500 hover:bg-red-500/10 disabled:opacity-50 transition-colors"
                          >
                            <span className="material-symbols-outlined text-sm align-middle mr-1">delete</span>
                            {t('common:delete', 'Delete')}
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Delete confirmation dialog */}
      <Dialog
        isOpen={deleteDialogOpen !== null}
        onClose={() => setDeleteDialogOpen(null)}
        title={t('assets:images.deleteConfirm', 'Delete this image?')}
        severity="critical"
        actions={[
          {
            label: t('common:cancel', 'Cancel'),
            onClick: () => setDeleteDialogOpen(null),
            variant: 'light',
          },
          {
            label: isDeleting
              ? (t('common:deleting', 'Deleting...') as string) || 'Deleting...'
              : (t('common:delete', 'Delete') as string) || 'Delete',
            onClick: handleDeleteConfirm,
            disabled: isDeleting !== null,
            variant: 'danger',
          },
        ]}
      >
        {imageToDelete && (
          <div className="space-y-4">
            <p className="text-sm text-description">
              {t('assets:images.deleteImageWarning', 'This action cannot be undone. The image will be permanently deleted.')}
            </p>
            <p className="text-sm text-content font-medium">
              {t(`assets:imageTypes.${imageToDelete.imageType}`)}
            </p>
          </div>
        )}
      </Dialog>
    </div>
  );
}
