import { useState, useEffect, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import type { UseCharacterFormReturn } from '../hooks/useCharacterForm';
import { imageGenerationService, type GeneratedImage } from '../../../../services/imageGenerationService';
import type { ImagesByType } from '../../../../services/imageGenerationService';
import { useToast } from '../../../../contexts/ToastContext';
import { Modal } from '../../../../components/ui/Modal';
import { Button } from '../../../../components/ui/Button';
import { SmartDropdown } from '../../../../components/ui/SmartDropdown';
import { ImageCropperModal } from '../../../../components/ui/ImageCropperModal';
import { ImageViewerModal } from '../../../../components/ui/ImageViewerModal';
import { UnifiedImageGenerationModal, type ImageGenerationType } from './UnifiedImageGenerationModal';
import { ReferenceGenerationModal } from './ReferenceGenerationModal';
import { Dialog } from '../../../../components/ui';
import { characterService } from '../../../../services/characterService';
import api from '../../../../lib/api';

interface ImagesTabProps {
  form: UseCharacterFormReturn;
  characterId?: string;
  onAvatarActivated?: () => void;
}

type ActiveModal = 'image-generate' | 'reference' | 'avatar-url' | 'cover-url' | null;
type UploadType = 'avatar' | 'cover' | null;

export function ImagesTab({ form, characterId, onAvatarActivated }: ImagesTabProps): JSX.Element {
  const { t } = useTranslation(['characters', 'common']);
  const { addToast } = useToast();
  const [refreshKey, setRefreshKey] = useState(0);
  const [allImages, setAllImages] = useState<ImagesByType>({});
  const [activeModal, setActiveModal] = useState<ActiveModal>(null);
  const [viewImageModal, setViewImageModal] = useState<{ url: string; title: string } | null>(null);
  const [imageCreditCost, setImageCreditCost] = useState<number>(10);
  const [generatingImageType, setGeneratingImageType] = useState<ImageGenerationType>('AVATAR');

  // Upload state
  const avatarFileInputRef = useRef<HTMLInputElement>(null);
  const coverFileInputRef = useRef<HTMLInputElement>(null);
  const [imageToCrop, setImageToCrop] = useState<{ type: UploadType; data: string } | null>(null);
  const [isCropperOpen, setIsCropperOpen] = useState(false);
  const [isUploading, setIsUploading] = useState(false);

  // URL modal state
  const [urlModalOpen, setUrlModalOpen] = useState(false);
  const [urlInput, setUrlInput] = useState('');
  const [urlError, setUrlError] = useState<string | null>(null);
  const [urlUploadType, setUrlUploadType] = useState<UploadType>(null);

  // Fetch service costs on mount
  useEffect(() => {
    const fetchServiceCosts = async () => {
      try {
        const response = await api.get<{ success: boolean; data: any[] }>('/api/v1/credits/service-costs');
        const imageGenCost = response.data.data.find((cost) => cost.serviceIdentifier === 'IMAGE_GENERATION');
        if (imageGenCost) {
          setImageCreditCost(imageGenCost.creditsPerUnit);
        }
      } catch (error) {
        console.error('Failed to fetch service costs:', error);
      }
    };

    fetchServiceCosts();
  }, []);

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

  const handleModalComplete = () => {
    // Only refresh images, don't close the modal
    // The modal will show the result screen and let user decide what to do
    handleImageUpdate();
  };

  const openImageGenerateModal = (type: ImageGenerationType) => () => {
    setGeneratingImageType(type);
    setActiveModal('image-generate');
  };

  // Upload handlers
  const handleFileChange = (type: UploadType) => (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onloadend = () => {
      setImageToCrop({ type, data: reader.result as string });
      setIsCropperOpen(true);
    };
    reader.readAsDataURL(file);
  };

  const openUrlModal = (type: UploadType) => () => {
    setUrlUploadType(type);
    setUrlError(null);
    setUrlInput('');
    setUrlModalOpen(true);
  };

  const confirmUrlSelection = async () => {
    const trimmed = urlInput.trim();
    const isValid = /^https?:\/\//i.test(trimmed);
    if (!isValid) {
      setUrlError(t('characters:form.avatar.invalidUrl', 'Enter a valid image URL (http/https).'));
      return;
    }

    setIsUploading(true);
    setUrlError(null);

    try {
      const response = await api.get(`/api/v1/media/proxy?url=${encodeURIComponent(trimmed)}`, { responseType: 'blob' });
      const blob = response.data;

      if (!blob.type.startsWith('image/')) {
        throw new Error('The fetched file is not an image.');
      }

      const resizedDataUrl = await resizeImage(blob, 800);
      setImageToCrop({ type: urlUploadType, data: resizedDataUrl });
      setIsCropperOpen(true);
      setUrlModalOpen(false);
    } catch (error) {
      console.error('Failed to load image from URL', error);
      setUrlError(t('characters:form.avatar.error', 'We could not load this image.'));
    } finally {
      setIsUploading(false);
    }
  };

  async function resizeImage(sourceBlob: Blob, maxSize: number): Promise<string> {
    const img = document.createElement('img');
    const objectUrl = URL.createObjectURL(sourceBlob);
    try {
      await new Promise<void>((resolve, reject) => {
        img.onload = () => resolve();
        img.onerror = () => reject(new Error('Failed to load image for processing'));
        img.src = objectUrl;
      });
      const canvas = document.createElement('canvas');
      const scale = Math.min(maxSize / img.naturalWidth, maxSize / img.naturalHeight, 1);
      const drawW = Math.round(img.naturalWidth * scale);
      const drawH = Math.round(img.naturalHeight * scale);
      canvas.width = drawW;
      canvas.height = drawH;
      const ctx = canvas.getContext('2d');
      if (!ctx) throw new Error('Canvas rendering unavailable');
      ctx.drawImage(img, 0, 0, drawW, drawH);
      return canvas.toDataURL('image/jpeg', 0.9);
    } finally {
      URL.revokeObjectURL(objectUrl);
    }
  }

  async function blobToWebP(sourceBlob: Blob, maxSize: number): Promise<Blob> {
    const img = document.createElement('img');
    const objectUrl = URL.createObjectURL(sourceBlob);
    try {
      await new Promise<void>((resolve, reject) => {
        img.onload = () => resolve();
        img.onerror = () => reject(new Error('Failed to load image'));
        img.src = objectUrl;
      });
      const canvas = document.createElement('canvas');
      const targetSize = Math.min(Math.max(img.naturalWidth, img.naturalHeight), maxSize);
      canvas.width = targetSize;
      canvas.height = targetSize;
      const ctx = canvas.getContext('2d');
      if (!ctx) throw new Error('Canvas rendering unavailable');
      ctx.imageSmoothingEnabled = true;
      ctx.imageSmoothingQuality = 'high';
      const scale = Math.min(targetSize / img.naturalWidth, targetSize / img.naturalHeight);
      const drawW = Math.round(img.naturalWidth * scale);
      const drawH = Math.round(img.naturalHeight * scale);
      const dx = Math.floor((targetSize - drawW) / 2);
      const dy = Math.floor((targetSize - drawH) / 2);
      ctx.clearRect(0, 0, targetSize, targetSize);
      ctx.drawImage(img, dx, dy, drawW, drawH);
      const webpBlob: Blob = await new Promise((resolve, reject) => {
        canvas.toBlob(b => (b ? resolve(b) : reject(new Error('Failed to encode'))), 'image/webp', 0.9);
      });
      return webpBlob;
    } finally {
      URL.revokeObjectURL(objectUrl);
    }
  }

  const handleCropSave = async (blob: Blob) => {
    if (!imageToCrop || !characterId) return;

    setIsUploading(true);

    try {
      const processed = await blobToWebP(blob, 512);
      const file = new File([processed], `character-${imageToCrop.type}.webp`, { type: 'image/webp' });

      await characterService.uploadCharacterImage({
        characterId,
        file,
        type: imageToCrop.type === 'avatar' ? 'AVATAR' : 'COVER',
      });

      addToast(t('characters:images.generationComplete', 'Image uploaded successfully!'), 'success');

      setIsCropperOpen(false);
      setImageToCrop(null);
      handleImageUpdate();
    } catch (error) {
      console.error('Upload failed', error);
      addToast(t('characters:errors.generationFailed', 'Failed to upload image'), 'error');
    } finally {
      setIsUploading(false);
    }
  };

  const getCropConfig = () => {
    if (imageToCrop?.type === 'avatar') {
      return { aspect: 1, cropShape: 'round' as const };
    }
    return { aspect: 3 / 4, cropShape: 'rect' as const };
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
  const coverCount = allImages.COVER?.length || 0;
  const referenceImages = allImages.REFERENCE || [];

  return (
    <div className="space-y-6">
      {/* Avatar and Cover Sections - Side by Side */}
      <div className="grid grid-cols-2 gap-4">
        <ImageSection
          title={t('characters:imageGeneration.imagesTab.avatarSection.title', 'Avatars')}
          description={t('characters:imageGeneration.imagesTab.avatarSection.shortDescription', 'Profile pictures')}
          images={allImages.AVATAR || []}
          count={avatarCount}
          maxImages={2}
          emptyMessage={t('characters:imageGeneration.imagesTab.noAvatars', 'No avatars yet')}
          characterId={characterId}
          onImageActivated={handleImageUpdate}
          onImageDeleted={handleImageUpdate}
          onGenerateClick={openImageGenerateModal('AVATAR')}
          onUploadDevice={() => avatarFileInputRef.current?.click()}
          onUploadUrl={() => openUrlModal('avatar')()}
          onViewImage={(url) => setViewImageModal({ url, title: t('characters:imageGeneration.imagesTab.avatarSection.title', 'Avatar') })}
          t={t}
          isUploading={isUploading}
          imageCreditCost={imageCreditCost}
        />

        <ImageSection
          title={t('characters:imageGeneration.imagesTab.coverSection.title', 'Cover Images')}
          description={t('characters:imageGeneration.imagesTab.coverSection.shortDescription', 'Portrait full-body')}
          images={allImages.COVER || []}
          count={coverCount}
          maxImages={2}
          emptyMessage={t('characters:imageGeneration.imagesTab.noCovers', 'No covers yet')}
          characterId={characterId}
          onImageActivated={handleImageUpdate}
          onImageDeleted={handleImageUpdate}
          onGenerateClick={openImageGenerateModal('COVER')}
          onUploadDevice={() => coverFileInputRef.current?.click()}
          onUploadUrl={() => openUrlModal('cover')()}
          onViewImage={(url) => setViewImageModal({ url, title: t('characters:imageGeneration.imagesTab.coverSection.title', 'Cover') })}
          t={t}
          isUploading={isUploading}
          imageCreditCost={imageCreditCost}
        />
      </div>

      {/* Reference Images Section */}
      <ReferenceSection
        title={t('characters:imageGeneration.referenceImages.title', 'Reference Images')}
        description={t('characters:imageGeneration.imagesTab.referenceSection.shortDescription', '4-view reference dataset')}
        referenceImages={referenceImages}
        emptyMessage={t('characters:imageGeneration.imagesTab.noReferenceImages', 'No reference images yet')}
        onUploadClick={() => setActiveModal('reference')}
        onViewImage={(url) => setViewImageModal({ url, title: t('characters:imageGeneration.referenceImages.title', 'Reference') })}
        t={t}
        imageCreditCost={imageCreditCost * 4}
      />

      {/* Hidden file inputs */}
      <input
        ref={avatarFileInputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={handleFileChange('avatar')}
      />
      <input
        ref={coverFileInputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={handleFileChange('cover')}
      />

      {/* Generation Modals */}
      <UnifiedImageGenerationModal
        isOpen={activeModal === 'image-generate'}
        onClose={() => setActiveModal(null)}
        characterId={characterId || ''}
        imageType={generatingImageType}
        onComplete={handleModalComplete}
      />

      <ReferenceGenerationModal
        isOpen={activeModal === 'reference'}
        onClose={() => setActiveModal(null)}
        characterId={characterId}
        form={form}
        onComplete={handleModalComplete}
      />

      {/* URL Modal */}
      <Modal
        isOpen={urlModalOpen}
        onClose={() => setUrlModalOpen(false)}
        title={t('characters:form.avatar.urlModalTitle', 'Use image from URL')}
        size="md"
      >
        <div className="space-y-4">
          <div>
            <label className="mb-1 block text-sm font-medium text-title">
              {t('characters:form.avatar.urlLabel', 'Image URL')}
            </label>
            <input
              type="url"
              inputMode="url"
              placeholder="https://example.com/image.jpg"
              className="w-full rounded-md border border-border bg-input dark:bg-gray-800 p-2 text-sm text-black dark:text-white outline-none focus:ring-2 focus:ring-primary"
              value={urlInput}
              onChange={e => {
                setUrlInput(e.target.value);
                setUrlError(null);
              }}
            />
            {urlError && <p className="mt-1 text-xs text-red-500 dark:text-red-300">{urlError}</p>}
          </div>

          {/^https?:\/\//i.test(urlInput.trim()) && (
            <div>
              <p className="mb-2 text-xs text-muted">{t('characters:form.avatar.preview', 'Preview')}</p>
              <div className="flex items-center justify-center rounded-md border border-border bg-card p-3">
                <img
                  src={urlInput.trim()}
                  alt={t('characters:form.avatar.previewAlt', 'Image preview') ?? 'Preview'}
                  className="max-h-40 rounded-md object-contain"
                />
              </div>
            </div>
          )}

          <div className="flex justify-end gap-2">
            <Button type="button" variant="light" onClick={() => setUrlModalOpen(false)}>
              {t('common:cancel', 'Cancel')}
            </Button>
            <Button type="button" variant="primary" onClick={confirmUrlSelection} disabled={isUploading}>
              {isUploading ? t('characters:form.avatar.loading', 'Loading...') : t('common:use', 'Use')}
            </Button>
          </div>
        </div>
      </Modal>

      {/* Image Crop Modal */}
      {imageToCrop && (
        <ImageCropperModal
          isOpen={isCropperOpen}
          onClose={() => {
            setIsCropperOpen(false);
            setImageToCrop(null);
          }}
          imageSrc={imageToCrop.data}
          onSave={handleCropSave}
          aspect={getCropConfig().aspect}
          cropShape={getCropConfig().cropShape}
        />
      )}

      {/* Image View Modal - Full screen viewer with zoom */}
      {viewImageModal && (
        <ImageViewerModal
          isOpen={true}
          onClose={() => setViewImageModal(null)}
          src={viewImageModal.url}
          title={viewImageModal.title}
        />
      )}
    </div>
  );
}

interface ImageSectionProps {
  title: string;
  description: string;
  images: GeneratedImage[];
  count: number;
  maxImages: number;
  emptyMessage: string;
  characterId: string;
  onImageActivated?: () => void;
  onImageDeleted?: () => void;
  onGenerateClick: () => void;
  onUploadDevice: () => void;
  onUploadUrl: () => void;
  onViewImage: (url: string) => void;
  t: any;
  isUploading: boolean;
  imageCreditCost: number;
}

function ImageSection({
  title,
  description,
  images,
  count,
  maxImages,
  emptyMessage,
  characterId,
  onImageActivated,
  onImageDeleted,
  onGenerateClick,
  onUploadDevice,
  onUploadUrl,
  onViewImage,
  t,
  isUploading,
  imageCreditCost,
}: ImageSectionProps): JSX.Element {
  const { addToast } = useToast();
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);
  const [activatingId, setActivatingId] = useState<string | null>(null);

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

  const handleActivate = async (img: GeneratedImage) => {
    if (!characterId) return;
    // Se já está ativa, não faz nada
    if (img.isActive) return;

    try {
      setActivatingId(img.id);
      await imageGenerationService.activateImage(characterId, img.id);
      addToast(t('characters:images.imageActivated', 'Image set as active'), 'success');
      if (onImageActivated) {
        onImageActivated();
      }
    } catch (error) {
      console.error('Failed to activate image:', error);
      addToast(t('characters:errors.failedToActivateImage', 'Failed to activate image'), 'error');
    } finally {
      setActivatingId(null);
    }
  };

  return (
    <div className="p-3 rounded-lg border border-border bg-card">
      {/* Header - Two Columns */}
      <div className="flex items-start justify-between mb-2 gap-2">
        {/* Left: Title + Description */}
        <div className="flex-1 min-w-0">
          <h3 className="text-sm font-semibold text-title">{title}</h3>
          <p className="text-[10px] text-muted leading-tight">{description}</p>
        </div>

        {/* Right: Single Button with Dropdown */}
        <SmartDropdown
          buttonContent={
            <Button
              type="button"
              variant="primary"
              size="small"
              icon="add"
              disabled={isUploading}
            >
              {t('common:add', 'Add')}
            </Button>
          }
          menuWidth="w-48"
        >
          <div className="py-1 text-xs">
            <button
              type="button"
              className="flex w-full items-center justify-between gap-2 px-3 py-2 hover:bg-primary/10"
              onClick={onGenerateClick}
              disabled={isUploading}
            >
              <span className="material-symbols-outlined text-sm">auto_awesome</span>
              <span className="flex-1 text-left">
                {t('characters:form.avatar.generateAI', 'Generate with AI')}
              </span>
              <span className="text-[10px] text-accent">
                {imageCreditCost} {t('common:credits', 'credits')}
              </span>
            </button>
            <button
              type="button"
              className="flex w-full items-center gap-2 px-3 py-2 hover:bg-primary/10"
              onClick={onUploadDevice}
              disabled={isUploading}
            >
              <span className="material-symbols-outlined text-sm">folder_open</span>
              {t('characters:form.avatar.fromDevice', 'Upload from device')}
            </button>
            <button
              type="button"
              className="flex w-full items-center gap-2 px-3 py-2 hover:bg-primary/10"
              onClick={onUploadUrl}
              disabled={isUploading}
            >
              <span className="material-symbols-outlined text-sm">link</span>
              {t('characters:form.avatar.fromUrl', 'Use image URL')}
            </button>
          </div>
        </SmartDropdown>
      </div>

      {/* Images Grid */}
      {!images || images.length === 0 ? (
        <div className="text-center py-6 rounded-lg border border-dashed border-border bg-muted/10">
          <span className="material-symbols-outlined text-xl text-muted/30 mb-1">add_photo_alternate</span>
          <p className="text-[10px] text-muted">{emptyMessage}</p>
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-2 p-1">
          {images.map((img) => (
            <div key={img.id} className="relative group">
              <img
                src={img.url}
                alt={title}
                className="w-full aspect-square object-cover rounded-lg border-2 transition-colors cursor-pointer"
                style={{
                  borderColor: img.isActive ? 'rgb(var(--primary))' : 'rgb(var(--border))',
                }}
              />
              {img.isActive && (
                <div className="absolute top-1 left-1 bg-primary text-white text-xs px-2 py-1 rounded-md font-medium shadow-sm">
                  {t('characters:imageGeneration.imagesTab.active', 'Active')}
                </div>
              )}

              {/* Hover actions overlay - simplified */}
              <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity rounded-lg">
                <div className="absolute top-1 right-1 flex gap-1">
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      onViewImage(img.url);
                    }}
                    className="w-8 h-8 flex items-center justify-center bg-white/90 rounded-md hover:bg-white"
                    title={t('characters:imageGeneration.imagesTab.buttons.view', 'View')}
                  >
                    <span className="material-symbols-outlined text-base text-black">visibility</span>
                  </button>
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      setDeleteConfirmId(img.id);
                    }}
                    disabled={deletingId === img.id}
                    className="w-8 h-8 flex items-center justify-center bg-red-500 rounded-md hover:bg-red-600"
                    title={t('characters:imageGeneration.imagesTab.buttons.delete', 'Delete')}
                  >
                    <span className="material-symbols-outlined text-base text-white">delete</span>
                  </button>
                </div>
                {/* Activate button at bottom - show if not active OR if there are multiple images */}
                {(img.isActive || images.length > 1) && (
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleActivate(img);
                    }}
                    disabled={activatingId === img.id || img.isActive}
                    className="absolute bottom-1 left-1 right-1 bg-primary text-white text-[9px] py-1 rounded-md hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {activatingId === img.id
                      ? t('common:loading', 'Loading...')
                      : img.isActive
                      ? t('characters:imageGeneration.imagesTab.active', 'Active')
                      : t('characters:imageGeneration.imagesTab.buttons.setActive', 'Set Active')
                    }
                  </button>
                )}
              </div>
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

interface ReferenceSectionProps {
  title: string;
  description: string;
  referenceImages: GeneratedImage[];
  emptyMessage: string;
  onUploadClick: () => void;
  onViewImage: (url: string) => void;
  t: any;
  imageCreditCost: number;
}

function ReferenceSection({
  title,
  description,
  referenceImages,
  emptyMessage,
  onUploadClick,
  onViewImage,
  t,
  imageCreditCost,
}: ReferenceSectionProps): JSX.Element {
  const views: Array<{
    content: 'face' | 'front' | 'side' | 'back';
    labelKey: string;
  }> = [
    { content: 'face', labelKey: t('characters:imageGeneration.referenceImages.stages.face', 'Face') },
    { content: 'front', labelKey: t('characters:imageGeneration.referenceImages.stages.front', 'Front') },
    { content: 'side', labelKey: t('characters:imageGeneration.referenceImages.stages.side', 'Side') },
    { content: 'back', labelKey: t('characters:imageGeneration.referenceImages.stages.back', 'Back') },
  ];

  const hasAnyImages = referenceImages.length > 0;

  return (
    <div className="p-3 rounded-lg border border-border bg-card">
      {/* Header - Two Columns */}
      <div className="flex items-start justify-between mb-2 gap-2">
        {/* Left: Title + Description */}
        <div className="flex-1 min-w-0">
          <h3 className="text-sm font-semibold text-title">{title}</h3>
          <p className="text-[10px] text-muted leading-tight">{description}</p>
        </div>

        {/* Right: Single Button with Dropdown */}
        <SmartDropdown
          buttonContent={
            <Button
              type="button"
              variant="primary"
              size="small"
              icon="add"
            >
              {t('common:add', 'Add')}
            </Button>
          }
          menuWidth="w-48"
        >
          <div className="py-1 text-xs">
            <button
              type="button"
              className="flex w-full items-center justify-between gap-2 px-3 py-2 hover:bg-primary/10"
              onClick={onUploadClick}
            >
              <span className="material-symbols-outlined text-sm">auto_awesome</span>
              <span className="flex-1 text-left">
                {t('characters:form.avatar.generateAI', 'Generate with AI')}
              </span>
              <span className="text-[10px] text-accent">
                {imageCreditCost} {t('common:credits', 'credits')}
              </span>
            </button>
          </div>
        </SmartDropdown>
      </div>

      {/* Reference Images Grid */}
      {!hasAnyImages ? (
        <div className="text-center py-6 rounded-lg border border-dashed border-border bg-muted/10">
          <span className="material-symbols-outlined text-xl text-muted/30 mb-1">grid_view</span>
          <p className="text-[10px] text-muted">{emptyMessage}</p>
        </div>
      ) : (
        <div className="grid grid-cols-4 gap-2">
          {views.map((view) => {
            const displayImg = referenceImages.find(img => img.content === view.content);

            if (!displayImg) {
              return (
                <div key={view.content} className="aspect-square bg-muted/5 rounded-lg border border-dashed border-border/50 flex items-center justify-center">
                  <span className="text-[10px] text-muted/50">{view.labelKey}</span>
                </div>
              );
            }

            return (
              <div key={view.content} className="relative group">
                <img
                  src={displayImg.url}
                  alt={view.labelKey}
                  className="w-full aspect-square object-cover rounded-lg border border-border hover:border-primary transition-colors cursor-pointer"
                  onClick={() => onViewImage(displayImg.url)}
                />
                <div className="absolute bottom-0 left-0 right-0 bg-black/70 text-white text-[8px] px-1 py-0.5 rounded-b-lg text-center">
                  {view.labelKey}
                </div>

                {/* View button on hover */}
                <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity rounded-lg">
                  <button
                    type="button"
                    onClick={() => onViewImage(displayImg.url)}
                    className="absolute top-1 right-1 w-8 h-8 flex items-center justify-center bg-white/90 rounded-md hover:bg-white"
                    title={t('characters:imageGeneration.imagesTab.buttons.view', 'View')}
                  >
                    <span className="material-symbols-outlined text-base text-black">visibility</span>
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
