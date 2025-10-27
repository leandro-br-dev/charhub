import { useEffect, useMemo, useState } from 'react';
import api from '../../lib/api';
import { Button } from './Button';
import { Modal } from './Modal';
import { ImageCropperModal } from './ImageCropperModal';

type CropShape = 'round' | 'rect';

export interface UrlImageUploaderProps {
  value?: string | null;
  onChange: (url: string | null) => void;

  // Preview/placeholder
  displayInitial?: string;
  placeholderText?: string;
  previewClassName?: string;
  cropShape?: CropShape;
  aspect?: number; // e.g., 1 for avatar, 3/4 for cover

  // Fetch options
  useProxy?: boolean; // When true, uses backend proxy to fetch remote image

  // Optional post processing after crop (e.g., convert to WebP, resize)
  postProcess?: (blob: Blob) => Promise<Blob | string>;

  // Labels (with sensible defaults)
  uploadLabel?: string;
  changeLabel?: string;
  removeLabel?: string;
  urlModalTitle?: string;
  urlLabel?: string;
  invalidUrlMessage?: string;
  loadingMessage?: string;
  useActionLabel?: string;
  cancelLabel?: string;
  previewAlt?: string;
}

export function UrlImageUploader({
  value = null,
  onChange,
  displayInitial = '?',
  placeholderText = 'Image',
  previewClassName = 'h-24 w-24 rounded-full object-cover shadow-sm',
  cropShape = 'round',
  aspect = 1,
  useProxy = true,
  postProcess,
  uploadLabel = 'Select image',
  changeLabel = 'Change image',
  removeLabel = 'Remove',
  urlModalTitle = 'Use image from URL',
  urlLabel = 'Image URL',
  invalidUrlMessage = 'Enter a valid image URL (http/https).',
  loadingMessage = 'Loading...',
  useActionLabel = 'Use',
  cancelLabel = 'Cancel',
  previewAlt = 'Image preview',
}: UrlImageUploaderProps): JSX.Element {
  const [previewUrl, setPreviewUrl] = useState<string | null>(value);
  const [isUrlModalOpen, setIsUrlModalOpen] = useState(false);
  const [urlInput, setUrlInput] = useState('');
  const [urlError, setUrlError] = useState<string | null>(null);
  const [isBusy, setIsBusy] = useState(false);

  const [isCropperOpen, setIsCropperOpen] = useState(false);
  const [imageToCrop, setImageToCrop] = useState<string | null>(null);

  useEffect(() => {
    setPreviewUrl(value ?? null);
  }, [value]);

  const isValidUrl = useMemo(() => /^https?:\/\//i.test(urlInput.trim()), [urlInput]);

  const openUrlFlow = () => {
    setUrlError(null);
    setUrlInput('');
    setIsUrlModalOpen(true);
  };

  const confirmUrlSelection = async () => {
    const trimmed = urlInput.trim();
    const ok = /^https?:\/\//i.test(trimmed);
    if (!ok) {
      setUrlError(invalidUrlMessage);
      return;
    }
    setIsBusy(true);
    setUrlError(null);
    try {
      if (useProxy) {
        const proxiedUrl = `/api/v1/media/proxy?url=${encodeURIComponent(trimmed)}`;
        const response = await api.get(proxiedUrl, { responseType: 'blob' });
        const blob: Blob = response.data;
        if (!blob.type.startsWith('image/')) {
          throw new Error('The fetched file is not an image.');
        }
        const dataUrl = await blobToDataUrl(blob);
        setImageToCrop(dataUrl);
      } else {
        // Directly let cropper load the remote URL; some environments may block this due to CORS
        setImageToCrop(trimmed);
      }
      setIsCropperOpen(true);
      setIsUrlModalOpen(false);
    } catch (e) {
      const message = e instanceof Error ? e.message : 'Unknown error';
      setUrlError(message);
    } finally {
      setIsBusy(false);
    }
  };

  const handleCropSave = async (blob: Blob) => {
    try {
      setIsBusy(true);
      let result: string;
      if (postProcess) {
        const out = await postProcess(blob);
        if (typeof out === 'string') {
          result = out;
        } else {
          result = await blobToDataUrl(out);
        }
      } else {
        // Default: return the cropped image as JPEG data URL
        result = await blobToDataUrl(blob, 'image/jpeg');
      }
      setPreviewUrl(result);
      onChange(result);
      setIsCropperOpen(false);
      setImageToCrop(null);
    } catch (e) {
      // keep modal open so user can retry or cancel
      // eslint-disable-next-line no-console
      console.error('[UrlImageUploader] post-process failed', e);
    } finally {
      setIsBusy(false);
    }
  };

  const handleRemove = () => {
    setPreviewUrl(null);
    onChange(null);
  };

  return (
    <div className="mt-4 flex flex-col items-center gap-4">
      {previewUrl ? (
        <img src={previewUrl} alt={previewAlt} className={previewClassName} />
      ) : (
        cropShape === 'round' ? (
          <div className="flex h-24 w-24 items-center justify-center rounded-full bg-normal text-2xl font-semibold text-content">
            {displayInitial}
          </div>
        ) : (
          <div className="flex h-64 w-48 items-center justify-center rounded-md bg-normal text-2xl font-semibold text-content">
            {placeholderText}
          </div>
        )
      )}

      <div className="flex flex-wrap items-center justify-center gap-3">
        <Button
          type="button"
          variant="light"
          size="small"
          icon="link"
          disabled={isBusy}
          onClick={openUrlFlow}
        >
          {previewUrl ? changeLabel : uploadLabel}
        </Button>
        {previewUrl && (
          <Button type="button" variant="light" size="small" onClick={handleRemove} disabled={isBusy}>
            {removeLabel}
          </Button>
        )}
      </div>

      {isBusy && (
        <p className="text-xs text-muted">{loadingMessage}</p>
      )}

      <Modal isOpen={isUrlModalOpen} onClose={() => setIsUrlModalOpen(false)} title={urlModalTitle} size="md">
        <div className="space-y-4">
          <div>
            <label className="mb-1 block text-sm font-medium text-title">{urlLabel}</label>
            <input
              type="url"
              inputMode="url"
              placeholder="https://example.com/image.jpg"
              className="w-full rounded-md border border-border bg-input dark:bg-gray-800 p-2 text-sm text-black dark:text-white outline-none focus:ring-2 focus:ring-primary"
              value={urlInput}
              onChange={(e) => { setUrlInput(e.target.value); setUrlError(null); }}
            />
            {urlError && <p className="mt-1 text-xs text-red-500 dark:text-red-300">{urlError}</p>}
          </div>

          {isValidUrl && (
            <div>
              <p className="mb-2 text-xs text-muted">Preview</p>
              <div className="flex items-center justify-center rounded-md border border-border bg-card p-3">
                {/* Intentionally not controlled by cropShape to avoid layout jump */}
                <img src={urlInput.trim()} alt={previewAlt} className="max-h-40 rounded-md object-contain" />
              </div>
            </div>
          )}

          <div className="flex justify-end gap-2">
            <Button type="button" variant="light" onClick={() => setIsUrlModalOpen(false)}>
              {cancelLabel}
            </Button>
            <Button type="button" variant="primary" onClick={confirmUrlSelection} disabled={isBusy}>
              {isBusy ? loadingMessage : useActionLabel}
            </Button>
          </div>
        </div>
      </Modal>

      {imageToCrop && (
        <ImageCropperModal
          isOpen={isCropperOpen}
          onClose={() => { setIsCropperOpen(false); setImageToCrop(null); }}
          imageSrc={imageToCrop}
          onSave={handleCropSave}
          aspect={aspect}
          cropShape={cropShape}
        />
      )}
    </div>
  );
}

async function blobToDataUrl(blob: Blob, typeOverride?: string): Promise<string> {
  const b = typeOverride ? new Blob([blob], { type: typeOverride }) : blob;
  return await new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => resolve(String(reader.result));
    reader.onerror = () => reject(new Error('Failed to read image'));
    reader.readAsDataURL(b);
  });
}

