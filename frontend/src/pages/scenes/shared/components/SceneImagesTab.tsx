import { useCallback, useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Dialog } from '../../../../components/ui/Dialog';
import { useToast } from '../../../../contexts/ToastContext';
import { sceneService } from '../../../../services/sceneService';
import type { SceneImage, SceneImageType } from '../../../../types/scenes';
import { SceneImageUploader } from './SceneImageUploader';

interface SceneImagesTabProps {
  sceneId?: string;
}

export function SceneImagesTab({ sceneId }: SceneImagesTabProps): JSX.Element {
  const { t } = useTranslation(['scenes', 'common']);
  const { addToast } = useToast();
  const [images, setImages] = useState<SceneImage[]>([]);
  const [isDeleting, setIsDeleting] = useState<string | null>(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState<string | null>(null);
  const [selectedType, setSelectedType] = useState<SceneImageType>('COVER');
  const [isUploading, setIsUploading] = useState(false);
  const [caption, setCaption] = useState('');

  // Image type options
  const imageTypes: SceneImageType[] = ['COVER', 'MAP', 'EXTERIOR', 'INTERIOR', 'DETAIL', 'PANORAMA', 'MISC'];

  // Load images when sceneId is available
  const loadImages = useCallback(async () => {
    if (!sceneId) return;
    try {
      const data = await sceneService.listSceneImages(sceneId);
      setImages(data);
    } catch (error) {
      console.error('[SceneImagesTab] Failed to load images:', error);
    }
  }, [sceneId]);

  // Load images on mount
  useEffect(() => {
    if (sceneId) {
      loadImages();
    }
  }, [sceneId, loadImages]);

  const handleUploadComplete = (imageUrl: string, imageType: string, uploadedCaption?: string) => {
    if (!sceneId) return;
    setImages(prev => [...prev, {
      id: `temp-${Date.now()}`,
      sceneId,
      imageUrl,
      imageType: imageType as SceneImageType,
      caption: uploadedCaption || caption || null,
      createdAt: new Date().toISOString(),
    }]);
    setCaption('');
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
      await sceneService.deleteSceneImage(imageId);
      setImages(prev => prev.filter(img => img.id !== imageId));
      addToast(t('scenes:images.imageDeleted'), 'success');
    } catch (error) {
      console.error('[SceneImagesTab] Delete failed:', error);
      addToast(t('scenes:images.deleteFailed'), 'error');
    } finally {
      setIsDeleting(null);
    }
  };

  const imageToDelete = images.find(img => img.id === deleteDialogOpen);

  if (!sceneId) {
    return (
      <div className="space-y-6 rounded-xl border border-border bg-card p-4 sm:p-6 shadow-sm">
        <div>
          <h2 className="text-lg font-semibold text-title">
            {t('scenes:images.title')}
          </h2>
          <p className="mt-2 text-sm text-description">
            {t('scenes:form.sections.imagesHint')}
          </p>
        </div>
        <div className="rounded-lg bg-normal/50 p-6 text-center">
          <span className="material-symbols-outlined text-4xl text-muted">image</span>
          <p className="mt-3 text-sm text-content">
            {t('scenes:form.areas.comingSoon', 'Save the scene first to add images')}
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 rounded-xl border border-border bg-card p-4 sm:p-6 shadow-sm">
      <div>
        <h2 className="text-lg font-semibold text-title">
          {t('scenes:images.title')}
        </h2>
        <p className="mt-2 text-sm text-description">
          {t('scenes:form.sections.imagesHint')}
        </p>
      </div>

      {/* Upload form */}
      <div className="rounded-lg bg-normal/50 p-4 space-y-4">
        <div className="grid gap-4 sm:grid-cols-[200px_1fr_auto] items-end">
          {/* Type selector */}
          <label className="flex flex-col gap-2 text-sm">
            <span className="font-medium text-content">
              {t('scenes:images.selectType')}
            </span>
            <select
              value={selectedType}
              onChange={(e) => setSelectedType(e.target.value as SceneImageType)}
              className="rounded-lg border border-border bg-background px-3 py-2 text-sm text-content shadow-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/40"
            >
              {imageTypes.map(type => (
                <option key={type} value={type}>
                  {t(`scenes:imageTypes.${type}`)}
                </option>
              ))}
            </select>
          </label>

          {/* Caption input */}
          <label className="flex flex-col gap-2 text-sm">
            <span className="font-medium text-content">
              {t('scenes:images.caption')}
            </span>
            <input
              type="text"
              value={caption}
              onChange={(e) => setCaption(e.target.value)}
              placeholder={t('scenes:images.captionPlaceholder') ?? ''}
              className="rounded-lg border border-border bg-background px-3 py-2 text-sm text-content shadow-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/40"
            />
          </label>

          {/* Add button */}
          <SceneImageUploader
            sceneId={sceneId}
            imageType={selectedType}
            caption={caption}
            setCaption={setCaption}
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
            {t('scenes:images.noImages')}
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
                    {t(`scenes:imageTypes.${type}`)}
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
                          alt={image.caption || t(`scenes:imageTypes.${image.imageType}`)}
                          className="w-32 h-32 object-cover"
                        />
                      </div>

                      {/* Details */}
                      <div className="flex-1 min-w-0 p-3 flex flex-col justify-between">
                        <div className="space-y-1">
                          <div className="flex items-center gap-2">
                            <span className="inline-flex items-center rounded-full bg-primary/10 px-2 py-0.5 text-xs font-medium text-primary">
                              {t(`scenes:imageTypes.${image.imageType}`)}
                            </span>
                            <span className="text-xs text-muted">
                              {new Date(image.createdAt).toLocaleDateString()}
                            </span>
                          </div>
                          {image.caption && (
                            <p className="text-sm text-content">
                              {image.caption}
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
        title={t('scenes:images.deleteConfirm', 'Delete this image?')}
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
              {t('scenes:images.deleteImageWarning', 'This action cannot be undone. The image will be permanently deleted.')}
            </p>
            {imageToDelete.caption && (
              <p className="text-sm text-content font-medium">
                {imageToDelete.caption}
              </p>
            )}
          </div>
        )}
      </Dialog>
    </div>
  );
}
