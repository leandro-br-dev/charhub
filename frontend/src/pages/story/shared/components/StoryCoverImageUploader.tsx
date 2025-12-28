import { useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { CachedImage } from '../../../../components/ui/CachedImage';
import { SmartDropdown } from '../../../../components/ui/SmartDropdown';
import { Modal } from '../../../../components/ui/Modal';
import { Button } from '../../../../components/ui/Button';
import { storyService } from '../../../../services/storyService';

interface StoryCoverImageUploaderProps {
  value?: string;
  onChange: (url: string) => void;
}

export function StoryCoverImageUploader({ value, onChange }: StoryCoverImageUploaderProps) {
  const { t } = useTranslation('story');
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(value || null);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [isUrlModalOpen, setIsUrlModalOpen] = useState(false);
  const [urlInput, setUrlInput] = useState('');
  const [urlError, setUrlError] = useState<string | null>(null);

  const handleFileChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setIsUploading(true);
    setUploadError(null);

    try {
      const result = await storyService.uploadCoverImage(file);
      setPreviewUrl(result.url);
      onChange(result.url);
    } catch (error) {
      console.error('Failed to upload cover image:', error);
      setUploadError(t('form.coverImageError', 'Failed to upload image'));
    } finally {
      setIsUploading(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  const openFilePicker = () => {
    setUploadError(null);
    fileInputRef.current?.click();
  };

  const openUrlFlow = () => {
    setUrlError(null);
    setUrlInput(previewUrl || value || '');
    setIsUrlModalOpen(true);
  };

  const confirmUrlSelection = () => {
    const trimmed = urlInput.trim();
    const isValid = /^https?:\/\//i.test(trimmed);
    if (!isValid) {
      setUrlError(t('form.invalidImageUrl', 'Enter a valid image URL (http/https).'));
      return;
    }

    setPreviewUrl(trimmed);
    onChange(trimmed);
    setIsUrlModalOpen(false);
  };

  const handleRemove = () => {
    setPreviewUrl(null);
    onChange('');
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  return (
    <div className="space-y-3">
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={handleFileChange}
      />

      <label className="block text-sm font-medium text-content">
        {t('form.coverImage')}
      </label>

      {/* Preview */}
      {previewUrl ? (
        <div className="relative w-full aspect-video bg-light border border-border rounded-lg overflow-hidden">
          <CachedImage
            src={previewUrl}
            alt={t('form.coverImagePreview')}
            className="w-full h-full object-cover"
          />
        </div>
      ) : (
        <div className="relative w-full aspect-video bg-light border border-border rounded-lg flex items-center justify-center text-muted">
          <span className="material-symbols-outlined text-4xl">image</span>
        </div>
      )}

      {/* Action Buttons */}
      <div className="flex flex-wrap gap-2">
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
                ? t('form.changeCoverImage', 'Change image')
                : t('form.uploadCoverImage', 'Select image')}
            </Button>
          }
          menuWidth="w-60"
        >
          <div className="py-1 text-sm">
            <button
              type="button"
              className="flex w-full items-center gap-2 px-3 py-2 hover:bg-primary/10"
              onClick={openFilePicker}
              disabled={isUploading}
            >
              <span className="material-symbols-outlined text-base">{isUploading ? 'progress_activity' : 'folder_open'}</span>
              {isUploading
                ? t('form.uploading', 'Uploading...')
                : t('form.uploadFromDevice', 'Upload from device')}
            </button>
            <button
              type="button"
              className="flex w-full items-center gap-2 px-3 py-2 hover:bg-primary/10"
              onClick={openUrlFlow}
            >
              <span className="material-symbols-outlined text-base">link</span>
              {t('form.useImageUrl', 'Use image URL')}
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
            {t('common:remove', 'Remove')}
          </Button>
        )}
      </div>

      {uploadError && (
        <p className="text-xs text-red-500">{uploadError}</p>
      )}

      <p className="text-xs text-muted">
        {t('form.coverImageHint')}
      </p>

      {/* URL Modal */}
      <Modal
        isOpen={isUrlModalOpen}
        onClose={() => setIsUrlModalOpen(false)}
        title={t('form.imageUrlModalTitle', 'Use image from URL')}
        size="md"
      >
        <div className="space-y-4">
          <div>
            <label className="mb-1 block text-sm font-medium text-title">
              {t('form.imageUrlLabel', 'Image URL')}
            </label>
            <input
              type="url"
              inputMode="url"
              placeholder="https://example.com/image.jpg"
              className="w-full rounded-md border border-border bg-input p-2 text-sm text-content outline-none focus:ring-2 focus:ring-primary"
              value={urlInput}
              onChange={e => {
                setUrlInput(e.target.value);
                setUrlError(null);
              }}
            />
            {urlError && <p className="mt-1 text-xs text-red-500">{urlError}</p>}
          </div>

          {/^https?:\/\//i.test(urlInput.trim()) && (
            <div>
              <p className="mb-2 text-xs text-muted">{t('form.preview', 'Preview')}</p>
              <div className="flex items-center justify-center rounded-md border border-border bg-card p-3">
                <img
                  src={urlInput.trim()}
                  alt={t('form.preview')}
                  className="max-h-40 rounded-md object-contain"
                />
              </div>
            </div>
          )}

          <div className="flex justify-end gap-2">
            <Button type="button" variant="light" onClick={() => setIsUrlModalOpen(false)}>
              {t('common:cancel', 'Cancel')}
            </Button>
            <Button type="button" variant="primary" onClick={confirmUrlSelection}>
              {t('common:use', 'Use')}
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
