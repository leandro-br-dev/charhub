import { useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import api from '../../../../lib/api';
import { sceneService } from '../../../../services/sceneService';
import { Button } from '../../../../components/ui/Button';
import { CachedImage } from '../../../../components/ui/CachedImage';
import { ImageCropperModal } from '../../../../components/ui/ImageCropperModal';
import { SmartDropdown } from '../../../../components/ui/SmartDropdown';
import { Modal } from '../../../../components/ui/Modal';
import { useToast } from '../../../../contexts/ToastContext';

interface SceneCoverUploaderProps {
  mode: 'create' | 'edit';
  displayName: string;
  currentCover?: string | null;
  sceneId?: string;
  onCoverChange: (url: string | null) => void;
}

export function SceneCoverUploader({
  mode,
  displayName,
  currentCover,
  sceneId,
  onCoverChange,
}: SceneCoverUploaderProps): JSX.Element {
  const { t } = useTranslation(['scenes']);
  const { addToast } = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(currentCover ?? null);
  const [imageToCrop, setImageToCrop] = useState<string | null>(null);
  const [isCropperOpen, setIsCropperOpen] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [isUrlModalOpen, setIsUrlModalOpen] = useState(false);
  const [urlInput, setUrlInput] = useState('');
  const [urlError, setUrlError] = useState<string | null>(null);

  useEffect(() => {
    setPreviewUrl(currentCover ?? null);
  }, [currentCover]);

  const helperText = mode === 'create'
    ? t(
      'scenes:form.cover.helperCreate',
      'Pick a cover image now and we will keep it while you fill out the rest of the form.'
    )
    : t(
      'scenes:form.cover.helperEdit',
      'Update the cover image whenever you like. Changes apply as soon as you save.'
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
      setUrlError(t('scenes:form.cover.invalidUrl', 'Enter a valid image URL (http/https).'));
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

      const resizedDataUrl = await resizeImage(blob, 1200); // Resize to max 1200px for landscape
      setImageToCrop(resizedDataUrl);
      setIsCropperOpen(true);
      setIsUrlModalOpen(false);
    } catch (error) {
      console.error('Failed to load image from URL', error);
      const message = error instanceof Error ? error.message : 'An unknown error occurred.';
      setUrlError(t('scenes:form.cover.error', 'We could not load this image. {{message}}', { message }));
    } finally {
      setIsUploading(false);
    }
  };

  // Client-side post-processing: convert to WebP with landscape aspect ratio
  const COVER_MAX_WIDTH = 1200; // px
  const COVER_MAX_HEIGHT = 800; // px
  const COVER_ASPECT_RATIO = 3 / 2; // 3:2 landscape

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

  async function blobToWebPWithMaxSize(sourceBlob: Blob): Promise<Blob> {
    const img = document.createElement('img');
    const objectUrl = URL.createObjectURL(sourceBlob);
    try {
      await new Promise<void>((resolve, reject) => {
        img.onload = () => resolve();
        img.onerror = () => reject(new Error('Failed to load image for processing'));
        img.src = objectUrl;
      });
      const canvas = document.createElement('canvas');

      // Calculate dimensions maintaining 3:2 aspect ratio
      let targetWidth = img.naturalWidth;
      let targetHeight = img.naturalHeight;

      // Scale down if too large
      if (targetWidth > COVER_MAX_WIDTH || targetHeight > COVER_MAX_HEIGHT) {
        const scaleX = COVER_MAX_WIDTH / targetWidth;
        const scaleY = COVER_MAX_HEIGHT / targetHeight;
        const scale = Math.min(scaleX, scaleY);
        targetWidth = Math.round(targetWidth * scale);
        targetHeight = Math.round(targetHeight * scale);
      }

      canvas.width = targetWidth;
      canvas.height = targetHeight;
      const ctx = canvas.getContext('2d');
      if (!ctx) throw new Error('Canvas rendering unavailable');
      ctx.imageSmoothingEnabled = true;
      ctx.imageSmoothingQuality = 'high';
      ctx.drawImage(img, 0, 0, targetWidth, targetHeight);

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
      const processed = await blobToWebPWithMaxSize(blob);
      const file = new File([processed], 'scene-cover.webp', { type: 'image/webp' });

      // If we have a sceneId, upload to server; otherwise use base64 for new scenes
      if (sceneId) {
        const uploadResult = await sceneService.uploadCover({ file, sceneId });
        setPreviewUrl(uploadResult.url);
        onCoverChange(uploadResult.url);
      } else {
        // For new scenes without ID, use base64 (will be replaced when scene is created)
        // WARNING: This base64 should NOT be sent to backend - must upload first in create flow
        const reader = new FileReader();
        reader.onloadend = () => {
          const dataUrl = reader.result as string;
          setPreviewUrl(dataUrl);
          onCoverChange(dataUrl);
        };
        reader.readAsDataURL(processed);
      }

      setIsCropperOpen(false);
      setImageToCrop(null);
    } catch (error) {
      console.error('[SceneCoverUploader] upload failed', error);
      setUploadError(t('scenes:form.cover.error', 'We could not upload this image. Try another file.'));
    } finally {
      setIsUploading(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  const handleRemove = () => {
    setPreviewUrl(null);
    onCoverChange(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
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
          alt={t('scenes:form.cover.previewAlt', 'Scene cover preview') ?? 'Scene cover preview'}
          className="h-32 w-48 rounded-lg object-cover shadow-sm"
        />
      ) : (
        <div className="flex h-32 w-48 items-center justify-center rounded-lg bg-normal text-3xl text-content">
          <span className="material-symbols-outlined">landscape</span>
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
              disabled={isUploading}
            >
              {previewUrl
                ? t('scenes:form.cover.change', 'Change image')
                : t('scenes:form.cover.upload', 'Select image')}
            </Button>
          }
          menuWidth="w-60"
        >
          <div className="py-1 text-sm">
            <button
              type="button"
              className="flex w-full items-center gap-2 px-3 py-2 hover:bg-primary/10"
              onClick={openFilePicker}
            >
              <span className="material-symbols-outlined text-base">folder_open</span>
              {t('scenes:form.cover.fromDevice', 'Upload from device')}
            </button>
            <button
              type="button"
              className="flex w-full items-center gap-2 px-3 py-2 hover:bg-primary/10"
              onClick={openUrlFlow}
            >
              <span className="material-symbols-outlined text-base">link</span>
              {t('scenes:form.cover.fromUrl', 'Use image URL')}
            </button>
            {mode === 'edit' && sceneId && (
              <>
                <div className="border-t border-border" />
                <button
                  type="button"
                  className="flex w-full items-center gap-2 px-3 py-2 hover:bg-primary/10"
                  onClick={() => {
                    addToast(
                      t('scenes:form.cover.aiComingSoon', 'AI generation coming soon for scenes'),
                      'info'
                    );
                  }}
                >
                  <span className="material-symbols-outlined text-base">auto_awesome</span>
                  {t('scenes:form.cover.generateAI', 'Generate with AI')}
                </button>
              </>
            )}
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
            {t('scenes:form.cover.remove', 'Remove')}
          </Button>
        )}
      </div>

      {isUploading && (
        <p className="text-xs text-muted">{t('scenes:form.cover.uploading', 'Uploading...')}</p>
      )}

      {uploadError && (
        <p className="max-w-[280px] text-center text-xs text-red-500 dark:text-red-300">{uploadError}</p>
      )}

      <Modal
        isOpen={isUrlModalOpen}
        onClose={() => setIsUrlModalOpen(false)}
        title={t('scenes:form.cover.urlModalTitle', 'Use image from URL')}
        size="md"
      >
        <div className="space-y-4">
          <div>
            <label className="mb-1 block text-sm font-medium text-title">
              {t('scenes:form.cover.urlLabel', 'Image URL')}
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
              <p className="mb-2 text-xs text-muted">{t('scenes:form.cover.preview', 'Preview')}</p>
              <div className="flex items-center justify-center rounded-md border border-border bg-card p-3">
                <img
                  src={urlInput.trim()}
                  alt={t('scenes:form.cover.previewAlt', 'Scene cover preview') ?? 'Scene cover preview'}
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
              {isUploading ? t('scenes:form.cover.loading', 'Loading...') : t('common:use', 'Use')}
            </Button>
          </div>
        </div>
      </Modal>

      <p className="max-w-[280px] text-center text-xs text-muted">{helperText}</p>

      {imageToCrop && (
        <ImageCropperModal
          isOpen={isCropperOpen}
          onClose={() => {
            setIsCropperOpen(false);
            setImageToCrop(null);
          }}
          imageSrc={imageToCrop}
          onSave={handleCropSave}
          aspect={COVER_ASPECT_RATIO}
          cropShape="rect"
        />
      )}
    </div>
  );
}
