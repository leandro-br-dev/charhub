import { useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import api from '../../../../lib/api';
import { Button } from '../../../../components/ui/Button';
import { SmartDropdown } from '../../../../components/ui/SmartDropdown';
import { Modal } from '../../../../components/ui/Modal';
import { sceneService } from '../../../../services/sceneService';
import { useToast } from '../../../../contexts/ToastContext';

interface SceneImageUploaderProps {
  sceneId: string;
  areaId?: string;
  imageType: string;
  onUploadComplete: (imageUrl: string, imageType: string, caption?: string) => void;
  isUploading: boolean;
  setIsUploading: (value: boolean) => void;
  disabled?: boolean;
  caption?: string;
  setCaption?: (caption: string) => void;
}

export function SceneImageUploader({
  sceneId,
  areaId,
  imageType,
  onUploadComplete,
  isUploading,
  setIsUploading,
  disabled = false,
  caption: externalCaption,
  setCaption: setExternalCaption,
}: SceneImageUploaderProps): JSX.Element {
  const { t } = useTranslation(['scenes', 'common']);
  const { addToast } = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isUrlModalOpen, setIsUrlModalOpen] = useState(false);
  const [urlInput, setUrlInput] = useState('');
  const [urlError, setUrlError] = useState<string | null>(null);
  const [internalCaption, setInternalCaption] = useState(externalCaption || '');

  // Use external caption if provided, otherwise use internal state
  const captionValue = externalCaption !== undefined ? externalCaption : internalCaption;
  const handleCaptionChange = setExternalCaption || setInternalCaption;

  const handleFileChange = async (file: File) => {
    setIsUploading(true);
    try {
      let result;
      if (areaId) {
        result = await sceneService.uploadAreaImage(sceneId, areaId, file, {
          imageType: imageType as any,
          caption: captionValue || undefined,
        });
      } else {
        result = await sceneService.uploadSceneImage(sceneId, file, {
          imageType: imageType as any,
          caption: captionValue || undefined,
        });
      }
      onUploadComplete(result.imageUrl, result.imageType, result.caption || undefined);
      if (!setExternalCaption) {
        setInternalCaption('');
      }
      addToast(t('scenes:messages.imageUploaded'), 'success');
    } catch (error) {
      console.error('[SceneImageUploader] Upload failed:', error);
      addToast(t('scenes:images.uploadFailed'), 'error');
    } finally {
      setIsUploading(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  const onFileInputChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    handleFileChange(file);
  };

  const openFilePicker = () => {
    setUrlError(null);
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
      setUrlError(t('scenes:form.avatar.invalidUrl', 'Enter a valid image URL (http/https).'));
      return;
    }

    setIsUploading(true);
    setUrlError(null);

    try {
      // Fetch image from URL via proxy to avoid CORS
      const proxiedUrl = `/api/v1/media/proxy?url=${encodeURIComponent(trimmed)}`;
      const response = await api.get(proxiedUrl, { responseType: 'blob' });
      const blob = response.data;

      if (!blob.type.startsWith('image/')) {
        throw new Error('The fetched file is not an image.');
      }

      // Convert blob to File
      const file = new File([blob], 'image-from-url.webp', { type: 'image/webp' });
      await handleFileChange(file);
      setIsUrlModalOpen(false);
    } catch (error) {
      console.error('[SceneImageUploader] URL upload failed:', error);
      const message = error instanceof Error ? error.message : 'An unknown error occurred.';
      setUrlError(t('scenes:form.avatar.error', 'We could not load this image. {{message}}', { message }));
      addToast(t('scenes:images.uploadFailed'), 'error');
    } finally {
      setIsUploading(false);
    }
  };

  const handleAIGeneration = () => {
    addToast(
      t('scenes:form.avatar.aiComingSoon', 'AI generation coming soon for scenes'),
      'info'
    );
  };

  return (
    <>
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={onFileInputChange}
      />

      <SmartDropdown
        buttonContent={
          <Button
            type="button"
            variant="primary"
            size="small"
            icon="add_photo_alternate"
            disabled={isUploading || disabled}
          >
            {t('scenes:images.addImage')}
          </Button>
        }
        menuWidth="w-60"
      >
        <div className="py-1 text-sm">
          <button
            type="button"
            className="flex w-full items-center gap-2 px-3 py-2 hover:bg-primary/10"
            onClick={handleAIGeneration}
            disabled={isUploading}
          >
            <span className="material-symbols-outlined text-base">auto_awesome</span>
            <span>{t('scenes:form.avatar.generateAI', 'Generate with AI')}</span>
          </button>
          <div className="border-t border-border" />
          <button
            type="button"
            className="flex w-full items-center gap-2 px-3 py-2 hover:bg-primary/10"
            onClick={openFilePicker}
            disabled={isUploading}
          >
            <span className="material-symbols-outlined text-base">folder_open</span>
            <span>{t('scenes:form.avatar.fromDevice', 'Upload from device')}</span>
          </button>
          <button
            type="button"
            className="flex w-full items-center gap-2 px-3 py-2 hover:bg-primary/10"
            onClick={openUrlFlow}
            disabled={isUploading}
          >
            <span className="material-symbols-outlined text-base">link</span>
            <span>{t('scenes:form.avatar.fromUrl', 'Use image URL')}</span>
          </button>
        </div>
      </SmartDropdown>

      <Modal
        isOpen={isUrlModalOpen}
        onClose={() => setIsUrlModalOpen(false)}
        title={t('scenes:form.avatar.urlModalTitle', 'Use image from URL')}
        size="md"
      >
        <div className="space-y-4">
          <div>
            <label className="mb-1 block text-sm font-medium text-title">
              {t('scenes:form.avatar.urlLabel', 'Image URL')}
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
              <p className="mb-2 text-xs text-muted">{t('scenes:form.avatar.preview', 'Preview')}</p>
              <div className="flex items-center justify-center rounded-md border border-border bg-card p-3">
                <img
                  src={urlInput.trim()}
                  alt={t('scenes:form.avatar.previewAlt', 'Image preview') ?? 'Image preview'}
                  className="max-h-40 rounded-md object-contain"
                />
              </div>
            </div>
          )}

          <div className="flex justify-end gap-2">
            <Button
              type="button"
              variant="light"
              onClick={() => setIsUrlModalOpen(false)}
            >
              {t('common:cancel', 'Cancel')}
            </Button>
            <Button
              type="button"
              variant="primary"
              onClick={confirmUrlSelection}
              disabled={isUploading}
            >
              {isUploading ? t('scenes:form.avatar.loading', 'Loading...') : t('common:use', 'Use')}
            </Button>
          </div>
        </div>
      </Modal>
    </>
  );
}
