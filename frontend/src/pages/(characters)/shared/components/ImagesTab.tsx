import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import type { UseCharacterFormReturn } from '../hooks/useCharacterForm';
import { ImageGenerationModal } from './ImageGenerationModal';
import { imageGenerationService } from '../../../../services/imageGenerationService';
import type { ImagesByType, GeneratedImage } from '../../../../services/imageGenerationService';
import { useToast } from '../../../../contexts/ToastContext';
import { Modal } from '../../../../components/ui/Modal';
import { Button } from '../../../../components/ui/Button';

interface ImagesTabProps {
  form: UseCharacterFormReturn;
  characterId?: string;
  onAvatarActivated?: () => void;
}

type ModalMode = 'avatar' | 'multi-stage' | 'upload-cover' | null;

export function ImagesTab({ form, characterId, onAvatarActivated }: ImagesTabProps): JSX.Element {
  const { t } = useTranslation(['characters']);
  const { addToast } = useToast();
  const [refreshKey, setRefreshKey] = useState(0);
  const [allImages, setAllImages] = useState<ImagesByType>({});
  const [modalMode, setModalMode] = useState<ModalMode>(null);

  // Load all images when characterId or refreshKey changes
  useEffect(() => {
    if (!characterId) return;

    const loadAllImages = async () => {
      try {
        const images = await imageGenerationService.listCharacterImages(characterId);
        setAllImages(images);
      } catch (error) {
        console.error('Failed to load images:', error);
      }
    };

    loadAllImages();
  }, [characterId, refreshKey]);

  const handleImageUpdate = () => {
    setRefreshKey((prev) => prev + 1);
    if (onAvatarActivated) {
      onAvatarActivated();
    }
  };

  if (!characterId) {
    return (
      <div className="rounded-xl border border-border bg-card p-8 text-center">
        <p className="text-sm text-description">
          {t('characters:images.saveFirst', 'Save the character first to manage images')}
        </p>
      </div>
    );
  }

  const avatarCount = allImages.AVATAR?.length || 0;
  const referenceCount = allImages.REFERENCE?.length || 0;
  const coverCount = allImages.COVER?.length || 0;

  return (
    <div className="space-y-4">
      {/* Header with dropdown */}
      <div className="flex items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <select
            value={modalMode || ''}
            onChange={(e) => {
              const value = e.target.value as ModalMode;
              if (value) {
                setModalMode(value);
                e.target.value = '';
              }
            }}
            className="px-3 py-2 text-sm border border-border rounded-lg bg-background text-content focus:ring-2 focus:ring-primary focus:border-transparent min-w-[200px]"
          >
            <option value="">{t('characters:imageGeneration.imagesTab.dropdownLabel', 'Generate or upload...')}</option>
            <option value="avatar">{t('characters:imageGeneration.imagesTab.generateAvatar', 'Generate Avatar')}</option>
            <option value="multi-stage">{t('characters:imageGeneration.imagesTab.generateReferenceDataset', 'Generate Reference Dataset (4 views)')}</option>
            <option value="upload-cover">{t('characters:imageGeneration.imagesTab.uploadCover', 'Upload Cover Image')}</option>
          </select>

          {/* Stats */}
          <div className="text-xs text-muted">
            <span>{t('characters:imageGeneration.imagesTab.avatarsCount', { count: avatarCount })}</span>
            <span className="mx-2">•</span>
            <span>{t('characters:imageGeneration.imagesTab.referenceCount', { count: referenceCount })}</span>
            <span className="mx-2">•</span>
            <span>{t('characters:imageGeneration.imagesTab.coverCount', { count: coverCount })}</span>
          </div>
        </div>
      </div>

      {/* Images Display - Compact Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Avatars Section */}
        <ImageSection
          title={t('characters:imageGeneration.imagesTab.avatarsSection', 'Avatars')}
          images={allImages.AVATAR || []}
          emptyMessage={t('characters:imageGeneration.imagesTab.noAvatars', 'No avatars yet')}
          characterId={characterId}
          onImageActivated={handleImageUpdate}
          onImageDeleted={handleImageUpdate}
          t={t}
        />

        {/* Reference Dataset Section */}
        <ImageSection
          title={t('characters:imageGeneration.multiStage.title', 'Reference Dataset')}
          referenceImages={allImages}
          emptyMessage={t('characters:imageGeneration.imagesTab.noReferenceImages', 'No reference images yet')}
          onImageDeleted={handleImageUpdate}
          t={t}
        />

        {/* Cover Images Section */}
        <ImageSection
          title={t('characters:imageGeneration.imagesTab.coversSection', 'Cover Images')}
          images={allImages.COVER || []}
          emptyMessage={t('characters:imageGeneration.imagesTab.noCovers', 'No cover images yet')}
          characterId={characterId}
          onImageDeleted={handleImageUpdate}
          t={t}
        />
      </div>

      {/* Modal for generation/upload */}
      {modalMode && (
        <ImageGenerationModal
          mode={modalMode}
          characterId={characterId}
          form={form}
          onClose={() => setModalMode(null)}
          onComplete={() => {
            handleImageUpdate();
            setModalMode(null);
          }}
        />
      )}
    </div>
  );
}

interface ImageSectionProps {
  title: string;
  images?: GeneratedImage[];
  referenceImages?: ImagesByType;
  emptyMessage: string;
  characterId?: string;
  onImageActivated?: () => void;
  onImageDeleted?: () => void;
  t: any;
}

function ImageSection({
  title,
  images,
  referenceImages,
  emptyMessage,
  characterId,
  onImageActivated,
  onImageDeleted,
  t
}: ImageSectionProps): JSX.Element {
  const { addToast } = useToast();
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);

  const handleDelete = async (imageId: string) => {
    if (!characterId) return;
    try {
      setDeletingId(imageId);
      await imageGenerationService.deleteImage(characterId, imageId);
      addToast(t('characters:images.imageDeleted', 'Image deleted successfully'), 'success');
      setDeleteConfirmId(null);
      if (onImageDeleted) {
        onImageDeleted();
      }
    } catch (error) {
      console.error('Failed to delete image:', error);
      addToast(t('characters:errors.failedToDeleteImage', 'Failed to delete image'), 'error');
    } finally {
      setDeletingId(null);
    }
  };
  // Reference images mode
  if (referenceImages) {
    const views: Array<{
      content: 'avatar' | 'front' | 'side' | 'back';
      labelKey: string;
    }> = [
      { content: 'avatar', labelKey: t('characters:imageGeneration.multiStage.stages.avatar', 'Avatar (Face)') },
      { content: 'front', labelKey: t('characters:imageGeneration.multiStage.stages.front', 'Front Body') },
      { content: 'side', labelKey: t('characters:imageGeneration.multiStage.stages.side', 'Side Body') },
      { content: 'back', labelKey: t('characters:imageGeneration.multiStage.stages.back', 'Back Body') },
    ];

    const referenceList = referenceImages.REFERENCE || [];
    const hasAnyImages = referenceList.length > 0;

    return (
      <div className="p-3 rounded-lg border border-border bg-card">
        <h3 className="text-xs font-semibold text-title mb-2">{title}</h3>

        {!hasAnyImages ? (
          <div className="text-center py-8 rounded border border-dashed border-border bg-muted/10">
            <p className="text-xs text-muted">{emptyMessage}</p>
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-2">
            {views.map((view) => {
              const displayImg = referenceList.find(img => img.content === view.content);

              if (!displayImg) {
                return (
                  <div key={view.content} className="aspect-square bg-muted/5 rounded border border-dashed border-border/50 flex items-center justify-center">
                    <span className="text-xs text-muted/50">{view.labelKey.split(' ')[0]}</span>
                  </div>
                );
              }

              return (
                <div key={view.content} className="relative group">
                  <img
                    src={displayImg.url}
                    alt={view.labelKey}
                    className="w-full aspect-square object-cover rounded border border-border"
                  />
                  <div className="absolute bottom-0 left-0 right-0 bg-black/70 text-white text-[9px] px-1.5 py-0.5 rounded-b text-center">
                    {view.labelKey}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    );
  }

  // Standard images mode (avatar, cover, etc)
  if (!characterId) {
    return <div>Invalid section configuration</div>;
  }

  return (
    <div className="p-3 rounded-lg border border-border bg-card">
      <h3 className="text-xs font-semibold text-title mb-2">{title}</h3>

      {!images || images.length === 0 ? (
        <div className="text-center py-8 rounded border border-dashed border-border bg-muted/10">
          <p className="text-xs text-muted">{emptyMessage}</p>
        </div>
      ) : (
        <div className="grid grid-cols-4 gap-2 max-h-48 overflow-y-auto pr-1">
          {images.map((img) => (
            <div key={img.id} className="relative group">
              <img
                src={img.url}
                alt={title}
                className="w-full aspect-square object-cover rounded border border-border hover:border-primary transition-colors cursor-pointer"
                onClick={() => {
                  if (onImageActivated && !img.isActive) {
                    imageGenerationService.activateImage(characterId!, img.id).then(() => {
                      onImageActivated();
                    });
                  }
                }}
              />
              {img.isActive && (
                <div className="absolute top-1 right-1 bg-primary text-white text-[8px] px-1 py-0.5 rounded-full">
                  {t('characters:imageGeneration.imagesTab.active', 'Active')}
                </div>
              )}
              {/* Delete button - visible on hover */}
              <button
                type="button"
                onClick={() => setDeleteConfirmId(img.id)}
                disabled={deletingId === img.id}
                className="absolute top-1 left-1 opacity-0 group-hover:opacity-100 transition-opacity bg-red-500 hover:bg-red-600 text-white rounded-full w-5 h-5 flex items-center justify-center disabled:opacity-50"
                title={t('characters:images.delete', 'Delete image') ?? 'Delete image'}
              >
                {deletingId === img.id ? (
                  <span className="material-symbols-outlined text-[10px] animate-spin">progress_activity</span>
                ) : (
                  <span className="material-symbols-outlined text-[10px]">delete</span>
                )}
              </button>
            </div>
          ))}
        </div>
      )}

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
              {t('characters:images.deleteConfirmMessage', 'Are you sure you want to delete this image? This action cannot be undone.')}
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
                  <span className="material-symbols-outlined animate-spin text-lg">progress_activity</span>
                ) : (
                  t('characters:images.delete', 'Delete')
                )}
              </Button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
}
