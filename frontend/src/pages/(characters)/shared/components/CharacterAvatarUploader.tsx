import { useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import api from '../../../../lib/api';
import { Button } from '../../../../components/ui/Button';
import { CachedImage } from '../../../../components/ui/CachedImage';
import { ImageCropperModal } from '../../../../components/ui/ImageCropperModal';
import { SmartDropdown } from '../../../../components/ui/SmartDropdown';
import { Modal } from '../../../../components/ui/Modal';
import { characterService } from '../../../../services/characterService';
import { imageGenerationService } from '../../../../services/imageGenerationService';
import { useToast } from '../../../../contexts/ToastContext';
import { UnifiedImageGenerationModal } from './UnifiedImageGenerationModal';

interface CharacterAvatarUploaderProps {
  mode: 'create' | 'edit';
  displayInitial: string;
  currentAvatar?: string | null;
  draftId?: string;
  characterId?: string;
  onAvatarChange: (url: string | null) => void;
  refreshTrigger?: number; // Increment to trigger refresh of current avatar from server
}

export function CharacterAvatarUploader({
  mode,
  displayInitial,
  currentAvatar,
  draftId,
  characterId,
  onAvatarChange,
  refreshTrigger,
}: CharacterAvatarUploaderProps): JSX.Element {
  const { t } = useTranslation(['characters']);
  const { addToast } = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(currentAvatar ?? null);
  const [imageToCrop, setImageToCrop] = useState<string | null>(null);
  const [isCropperOpen, setIsCropperOpen] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [isUrlModalOpen, setIsUrlModalOpen] = useState(false);
  const [urlInput, setUrlInput] = useState('');
  const [urlError, setUrlError] = useState<string | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [imageCreditCost, setImageCreditCost] = useState<number>(10); // Default 10 credits
  const [isGenerationModalOpen, setIsGenerationModalOpen] = useState(false);
  const [refreshTriggerLocal, setRefreshTriggerLocal] = useState(0);

  useEffect(() => {
    setPreviewUrl(currentAvatar ?? null);
  }, [currentAvatar]);

  // Fetch active avatar when refreshTrigger changes
  useEffect(() => {
    if (!characterId || refreshTrigger === undefined) return;

    const fetchActiveAvatar = async () => {
      try {
        const images = await import('../../../../services/imageGenerationService').then((m) =>
          m.imageGenerationService.listCharacterImages(characterId)
        );
        const activeAvatar = images.AVATAR?.find((img) => img.isActive);
        if (activeAvatar) {
          setPreviewUrl(activeAvatar.url);
          onAvatarChange(activeAvatar.url);
        }
      } catch (error) {
        console.error('Failed to fetch active avatar:', error);
      }
    };

    fetchActiveAvatar();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [refreshTrigger, characterId]);

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

  // Fetch active avatar when local refresh trigger changes
  useEffect(() => {
    if (!characterId || refreshTriggerLocal === 0) return;

    const fetchActiveAvatar = async () => {
      try {
        const images = await imageGenerationService.listCharacterImages(characterId);
        const activeAvatar = images.AVATAR?.find((img) => img.isActive);
        if (activeAvatar) {
          setPreviewUrl(activeAvatar.url);
          onAvatarChange(activeAvatar.url);
        }
      } catch (error) {
        console.error('Failed to fetch active avatar:', error);
      }
    };

    fetchActiveAvatar();
  }, [refreshTriggerLocal, characterId, onAvatarChange]);

  const helperText = mode === 'create'
    ? t(
      'characters:form.avatar.helperCreate',
      'Pick an avatar now and we will keep it while you fill out the rest of the form.'
    )
    : t(
      'characters:form.avatar.helperEdit',
      'Update the avatar whenever you like. Changes apply as soon as you save.'
    );

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) {
      return;
    }

    const reader = new FileReader();
    reader.onloadend = () => {
      setImageToCrop(reader.result as string);
      setIsCropperOpen(true);
    };
    reader.readAsDataURL(file);
  };

  const openFilePicker = () => {
    setUploadError(null);
    fileInputRef.current?.click();
  };

  const openUrlFlow = () => {
    setUrlError(null);
    setUrlInput('');
    setIsUrlModalOpen(true);
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
      // Use backend proxy to avoid CORS issues
      const proxiedUrl = `/api/v1/media/proxy?url=${encodeURIComponent(trimmed)}`;
      const response = await api.get(proxiedUrl, { responseType: 'blob' });

      const blob = response.data;
      if (!blob.type.startsWith('image/')) {
        throw new Error('The fetched file is not an image.');
      }

      const resizedDataUrl = await resizeImage(blob, 800); // Resize to max 800px
      setImageToCrop(resizedDataUrl);
      setIsCropperOpen(true);
      setIsUrlModalOpen(false);
    } catch (error) {
      console.error('Failed to load image from URL', error);
      const message = error instanceof Error ? error.message : 'An unknown error occurred.';
      setUrlError(t('characters:form.avatar.error', 'We could not load this image. {{message}}', { message }));
    } finally {
      setIsUploading(false);
    }
  };

  // Client-side post-processing: convert to WebP and limit dimensions (e.g., 256x256 for avatars)
  const AVATAR_MAX_SIZE = 256; // px

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

  async function blobToWebPWithMaxSize(sourceBlob: Blob, maxSize: number): Promise<Blob> {
    const img = document.createElement('img');
    const objectUrl = URL.createObjectURL(sourceBlob);
    try {
      await new Promise<void>((resolve, reject) => {
        img.onload = () => resolve();
        img.onerror = () => reject(new Error('Failed to load image for processing'));
        img.src = objectUrl;
      });
      const canvas = document.createElement('canvas');
      // Maintain square output; cropper already outputs 1:1
      const targetSize = Math.min(Math.max(img.naturalWidth, img.naturalHeight), maxSize);
      canvas.width = targetSize;
      canvas.height = targetSize;
      const ctx = canvas.getContext('2d');
      if (!ctx) throw new Error('Canvas rendering unavailable');
      ctx.imageSmoothingEnabled = true;
      ctx.imageSmoothingQuality = 'high';
      // Fit image into square canvas
      const scale = Math.min(targetSize / img.naturalWidth, targetSize / img.naturalHeight);
      const drawW = Math.round(img.naturalWidth * scale);
      const drawH = Math.round(img.naturalHeight * scale);
      const dx = Math.floor((targetSize - drawW) / 2);
      const dy = Math.floor((targetSize - drawH) / 2);
      ctx.clearRect(0, 0, targetSize, targetSize);
      ctx.drawImage(img, dx, dy, drawW, drawH);
      const webpBlob: Blob = await new Promise((resolve, reject) => {
        canvas.toBlob(
          b => (b ? resolve(b) : reject(new Error('Failed to encode WebP'))),
          'image/webp',
          0.9
        );
      });
      return webpBlob;
    } finally {
      URL.revokeObjectURL(objectUrl);
    }
  }

  const handleCropSave = async (blob: Blob) => {
    setIsUploading(true);
    setUploadError(null);

    try {
      const processed = await blobToWebPWithMaxSize(blob, AVATAR_MAX_SIZE);
      const file = new File([processed], 'character-avatar.webp', { type: 'image/webp' });
      const uploadResult = await characterService.uploadAvatar({
        file,
        characterId,
        draftId,
      });

      setPreviewUrl(uploadResult.url);
      onAvatarChange(uploadResult.url);
      setIsCropperOpen(false);
      setImageToCrop(null);
    } catch (error) {
      console.error('[CharacterAvatarUploader] upload failed', error);
      setUploadError(t('characters:form.avatar.error', 'We could not upload this image. Try another file.'));
    } finally {
      setIsUploading(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  const handleRemove = () => {
    setPreviewUrl(null);
    onAvatarChange(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleAIGeneration = () => {
    if (!characterId) {
      addToast(
        t('characters:form.avatar.saveFirst', 'Please save the character first before generating avatar'),
        'error'
      );
      return;
    }
    setIsGenerationModalOpen(true);
  };

  const handleGenerationComplete = () => {
    // Refresh avatar from server - DON'T close modal, let user see result
    setRefreshTriggerLocal(prev => prev + 1);
  };

  return (
    <div className="mt-6 flex flex-col items-center gap-4">
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={handleFileChange}
      />

      {previewUrl ? (
        <CachedImage
          src={previewUrl}
          alt={t('characters:form.avatar.previewAlt', 'Character avatar preview') ?? 'Character avatar preview'}
          className="h-24 w-24 rounded-full object-cover shadow-sm"
        />
      ) : (
        <div className="flex h-24 w-24 items-center justify-center rounded-full bg-normal text-2xl font-semibold text-content">
          {displayInitial}
        </div>
      )}

      <div className="flex flex-wrap items-center justify-center gap-3">
        <SmartDropdown
          buttonContent={
            <Button
              type="button"
              variant="light"
              size="small"
              icon="upload"
              disabled={isUploading || isGenerating}
            >
              {previewUrl
                ? t('characters:form.avatar.change', 'Change image')
                : t('characters:form.avatar.upload', 'Select image')}
            </Button>
          }
          menuWidth="w-60"
        >
          <div className="py-1 text-sm">
            {mode === 'edit' && characterId && (
              <>
                <button
                  type="button"
                  className="flex w-full items-center gap-2 px-3 py-2 hover:bg-primary/10"
                  onClick={handleAIGeneration}
                  disabled={isGenerating}
                >
                  <span className="material-symbols-outlined text-base">
                    {isGenerating ? 'progress_activity' : 'auto_awesome'}
                  </span>
                  <div className="flex flex-1 items-center justify-between">
                    <span>
                      {isGenerating
                        ? t('characters:form.avatar.generating', 'Generating...')
                        : t('characters:form.avatar.generateAI', 'Generate with AI')}
                    </span>
                    <span className="ml-2 text-xs text-accent">
                      {imageCreditCost} {t('common:credits', 'credits')}
                    </span>
                  </div>
                </button>
                <div className="border-t border-border" />
              </>
            )}
            <button
              type="button"
              className="flex w-full items-center gap-2 px-3 py-2 hover:bg-primary/10"
              onClick={openFilePicker}
            >
              <span className="material-symbols-outlined text-base">folder_open</span>
              {t('characters:form.avatar.fromDevice', 'Upload from device')}
            </button>
            <button
              type="button"
              className="flex w-full items-center gap-2 px-3 py-2 hover:bg-primary/10"
              onClick={openUrlFlow}
            >
              <span className="material-symbols-outlined text-base">link</span>
              {t('characters:form.avatar.fromUrl', 'Use image URL')}
            </button>
          </div>
        </SmartDropdown>

        {previewUrl && (
          <Button
            type="button"
            variant="light"
            size="small"
            onClick={handleRemove}
            disabled={isUploading}
          >
            {t('characters:form.avatar.remove', 'Remove')}
          </Button>
        )}
      </div>

      {isUploading && (
        <p className="text-xs text-muted">{t('characters:form.avatar.uploading', 'Uploading...')}</p>
      )}

      {uploadError && (
        <p className="max-w-[220px] text-center text-xs text-red-500 dark:text-red-300">{uploadError}</p>
      )}

      <Modal
        isOpen={isUrlModalOpen}
        onClose={() => setIsUrlModalOpen(false)}
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
                  alt={t('characters:form.avatar.previewAlt', 'Character avatar preview') ?? 'Character avatar preview'}
                  className="max-h-40 rounded-md object-contain"
                />
              </div>
            </div>
          )}

          <div className="flex justify-end gap-2">
            <Button type="button" variant="light" onClick={() => setIsUrlModalOpen(false)}>
              {t('common:cancel', 'Cancel')}
            </Button>
            <Button type="button" variant="primary" onClick={confirmUrlSelection} disabled={isUploading}>
              {isUploading ? t('characters:form.avatar.loading', 'Loading...') : t('common:use', 'Use')}
            </Button>
          </div>
        </div>
      </Modal>

      <p className="max-w-[240px] text-center text-xs text-muted">{helperText}</p>

      {imageToCrop && (
        <ImageCropperModal
          isOpen={isCropperOpen}
          onClose={() => {
            setIsCropperOpen(false);
            setImageToCrop(null);
          }}
          imageSrc={imageToCrop}
          onSave={handleCropSave}
          aspect={1}
          cropShape="round"
        />
      )}

      {/* Unified Image Generation Modal */}
      <UnifiedImageGenerationModal
        isOpen={isGenerationModalOpen}
        onClose={() => setIsGenerationModalOpen(false)}
        characterId={characterId || ''}
        imageType="AVATAR"
        onComplete={handleGenerationComplete}
      />
    </div>
  );
}
