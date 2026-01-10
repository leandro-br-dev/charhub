import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { Button } from '../../../../components/ui/Button';
import { CachedImage } from '../../../../components/ui/CachedImage';
import { Modal } from '../../../../components/ui/Modal';
import { ImageViewerModal } from '../../../../components/ui/ImageViewerModal';
import { imageGenerationService, type GeneratedImage, type ImagesByType } from '../../../../services/imageGenerationService';
import { useToast } from '../../../../contexts/ToastContext';

interface ImageGalleryProps {
  characterId: string;
  imageType: 'AVATAR' | 'COVER';
  onImageActivated?: () => void;
}

export function ImageGallery({ characterId, imageType, onImageActivated }: ImageGalleryProps): JSX.Element {
  const { t } = useTranslation(['characters', 'common']);
  const { addToast } = useToast();
  const [images, setImages] = useState<GeneratedImage[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [activatingId, setActivatingId] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);
  const [viewerImage, setViewerImage] = useState<{ url: string; title: string } | null>(null);

  useEffect(() => {
    loadImages();
  }, [characterId, imageType]);

  const loadImages = async () => {
    try {
      setIsLoading(true);
      const data = await imageGenerationService.listCharacterImages(characterId);
      setImages(data[imageType] || []);
    } catch (error) {
      console.error('Failed to load images:', error);
      addToast(
        t('characters:errors.failedToLoadImages', 'Failed to load images'),
        'error'
      );
    } finally {
      setIsLoading(false);
    }
  };

  const handleActivate = async (imageId: string) => {
    try {
      setActivatingId(imageId);
      await imageGenerationService.activateImage(characterId, imageId);

      // Update local state
      setImages((prev) =>
        prev.map((img) => ({
          ...img,
          isActive: img.id === imageId,
        }))
      );

      addToast(
        t('characters:images.imageActivated', 'Image activated successfully'),
        'success'
      );

      if (onImageActivated) {
        onImageActivated();
      }
    } catch (error) {
      console.error('Failed to activate image:', error);
      addToast(
        t('characters:errors.failedToActivateImage', 'Failed to activate image'),
        'error'
      );
    } finally {
      setActivatingId(null);
    }
  };

  const handleDelete = async (imageId: string) => {
    try {
      setDeletingId(imageId);
      await imageGenerationService.deleteImage(characterId, imageId);

      // Remove from local state
      setImages((prev) => prev.filter((img) => img.id !== imageId));

      addToast(
        t('characters:images.imageDeleted', 'Image deleted successfully'),
        'success'
      );

      setDeleteConfirmId(null);
    } catch (error) {
      console.error('Failed to delete image:', error);
      addToast(
        t('characters:errors.failedToDeleteImage', 'Failed to delete image'),
        'error'
      );
    } finally {
      setDeletingId(null);
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <span className="material-symbols-outlined animate-spin text-4xl text-muted">
          progress_activity
        </span>
      </div>
    );
  }

  if (images.length === 0) {
    return (
      <div className="rounded-xl border border-border bg-card p-8 text-center">
        <p className="text-sm text-description">
          {t('characters:images.noImagesYet', 'No images generated yet')}
        </p>
      </div>
    );
  }

  return (
    <>
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4">
        {images.map((image) => (
          <div
            key={image.id}
            className={`group relative overflow-hidden rounded-xl border transition-all ${
              image.isActive
                ? 'border-accent shadow-lg ring-2 ring-accent/20'
                : 'border-border hover:border-accent/50'
            }`}
          >
            <CachedImage
              src={image.url}
              alt={`${imageType} image`}
              className="aspect-square w-full object-cover cursor-pointer"
              onClick={() => setViewerImage({ url: image.url, title: `${imageType} image` })}
            />

            {image.isActive && (
              <div className="absolute left-2 top-2 rounded-full bg-accent px-2 py-1 text-xs font-medium text-white">
                {t('characters:images.active', 'Active')}
              </div>
            )}

            {/* Action buttons overlay */}
            {!image.isActive && (
              <div className="absolute inset-0 flex items-center justify-center gap-2 bg-black/60 opacity-0 transition-opacity group-hover:opacity-100">
                <Button
                  onClick={() => handleActivate(image.id)}
                  disabled={activatingId === image.id}
                  className="bg-accent text-white hover:bg-accent/90"
                  size="small"
                >
                  {activatingId === image.id ? (
                    <span className="material-symbols-outlined animate-spin text-lg">
                      progress_activity
                    </span>
                  ) : (
                    t('characters:images.setAsActive', 'Set as active')
                  )}
                </Button>
              </div>
            )}

            {/* Delete button - always visible on hover, positioned at top right */}
            <div className="absolute right-2 top-2 opacity-0 transition-opacity group-hover:opacity-100">
              <button
                type="button"
                onClick={() => setDeleteConfirmId(image.id)}
                disabled={deletingId === image.id}
                className="flex h-8 w-8 items-center justify-center rounded-full bg-red-500 text-white shadow-lg hover:bg-red-600 disabled:opacity-50"
                title={t('characters:images.delete', 'Delete image') ?? 'Delete image'}
              >
                <span className="material-symbols-outlined text-base">delete</span>
              </button>
            </div>

            <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/80 to-transparent p-2">
              <p className="text-xs text-white">
                {new Date(image.createdAt).toLocaleDateString()}
              </p>
              {image.sizeBytes && (
                <p className="text-xs text-white/70">
                  {(image.sizeBytes / 1024).toFixed(1)} KB
                </p>
              )}
            </div>
          </div>
        ))}
      </div>

      {/* Delete confirmation modal */}
      {deleteConfirmId && (
        <Modal
          isOpen={true}
          onClose={() => setDeleteConfirmId(null)}
          title={t('characters:images.deleteConfirmTitle', 'Delete image?')}
          size="sm"
        >
          <div className="space-y-4">
            <p className="text-sm text-description">
              {t(
                'characters:images.deleteConfirmMessage',
                'Are you sure you want to delete this image? This action cannot be undone.'
              )}
            </p>
            <div className="flex justify-end gap-2">
              <Button
                type="button"
                variant="light"
                onClick={() => setDeleteConfirmId(null)}
                disabled={deletingId === deleteConfirmId}
              >
                {t('common:cancel', 'Cancel')}
              </Button>
              <Button
                type="button"
                variant="primary"
                onClick={() => handleDelete(deleteConfirmId)}
                disabled={deletingId === deleteConfirmId}
                className="bg-red-500 hover:bg-red-600"
              >
                {deletingId === deleteConfirmId ? (
                  <span className="material-symbols-outlined animate-spin text-lg">
                    progress_activity
                  </span>
                ) : (
                  t('characters:images.delete', 'Delete')
                )}
              </Button>
            </div>
          </div>
        </Modal>
      )}

      {/* Image viewer modal */}
      {viewerImage && (
        <ImageViewerModal
          isOpen={true}
          onClose={() => setViewerImage(null)}
          src={viewerImage.url}
          title={viewerImage.title}
        />
      )}
    </>
  );
}
