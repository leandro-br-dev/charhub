import { useState, useRef, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { Button } from '../../ui/Button';

export interface PromptWithSampleImageInputProps {
  /** Current prompt value */
  prompt?: string;
  /** Callback when prompt changes */
  onPromptChange: (prompt: string) => void;
  /** Optional: current sample image URL */
  sampleImage?: string | null;
  /** Callback when sample image is selected (returns the file) */
  onSampleImageChange?: (file: File | null) => void;
  /** Translation namespace to use (default: 'characters') */
  namespace?: string;
  /** Translation key prefix for labels (default: 'imageGeneration.imagesTab.modals') */
  prefix?: string;
  /** Show sample image upload (default: true) */
  showSampleImage?: boolean;
  /** Disabled state */
  disabled?: boolean;
  /** Maximum sample image size in MB (default: 10) */
  maxFileSize?: number;
  /** Accepted file types (default: 'image/*') */
  accept?: string;
}

export function PromptWithSampleImageInput({
  prompt = '',
  onPromptChange,
  sampleImage = null,
  onSampleImageChange,
  namespace = 'characters',
  prefix = 'imageGeneration.imagesTab.modals',
  showSampleImage = true,
  disabled = false,
  maxFileSize = 10,
  accept = 'image/*',
}: PromptWithSampleImageInputProps): JSX.Element {
  const { t } = useTranslation([namespace]);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [samplePreview, setSamplePreview] = useState<string | null>(sampleImage);
  const [sampleError, setSampleError] = useState<string | null>(null);

  // Update preview when sampleImage prop changes
  useEffect(() => {
    setSamplePreview(sampleImage);
  }, [sampleImage]);

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) {
      setSamplePreview(null);
      if (onSampleImageChange) onSampleImageChange(null);
      return;
    }

    // Validate file size
    const maxSizeBytes = maxFileSize * 1024 * 1024;
    if (file.size > maxSizeBytes) {
      setSampleError(
        t(`${namespace}:errors.imageTooLarge`, `Image must be smaller than ${maxFileSize}MB`)
      );
      return;
    }

    // Validate file type
    if (!file.type.startsWith('image/')) {
      setSampleError(t(`${namespace}:errors.invalidImageType`, 'File must be an image'));
      return;
    }

    setSampleError(null);

    // Create preview
    const reader = new FileReader();
    reader.onloadend = () => {
      setSamplePreview(reader.result as string);
    };
    reader.readAsDataURL(file);

    if (onSampleImageChange) {
      onSampleImageChange(file);
    }
  };

  const handleRemoveSample = () => {
    setSamplePreview(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
    if (onSampleImageChange) {
      onSampleImageChange(null);
    }
  };

  const getLabel = (key: string, fallback: string) => {
    return t(`${namespace}:${prefix}.${key}`, fallback);
  };

  return (
    <div className="space-y-4">
      {/* Prompt Input */}
      <div>
        <label className="mb-1 block text-sm font-medium text-title">
          {getLabel('promptLabel', 'Context/Prompt')}
        </label>
        <textarea
          value={prompt}
          onChange={(e) => onPromptChange(e.target.value)}
          placeholder={getLabel('promptPlaceholder', 'Describe additional context or style...')}
          disabled={disabled}
          rows={3}
          className="w-full rounded-md border border-border bg-input dark:bg-gray-800 p-3 text-sm text-black dark:text-white outline-none focus:ring-2 focus:ring-primary disabled:opacity-50 disabled:cursor-not-allowed resize-y"
        />
      </div>

      {/* Sample Image Upload */}
      {showSampleImage && (
        <div>
          <label className="mb-1 block text-sm font-medium text-title">
            {getLabel('sampleImageLabel', 'Reference Image (Optional)')}
          </label>
          <p className="mb-2 text-xs text-muted">
            {getLabel('sampleImageHint', 'Upload a sample image to use as style reference')}
          </p>

          <input
            ref={fileInputRef}
            type="file"
            accept={accept}
            className="hidden"
            onChange={handleFileChange}
            disabled={disabled}
          />

          <div className="flex items-start gap-3">
            {/* Preview or Placeholder */}
            <div className="flex-shrink-0">
              {samplePreview ? (
                <div className="relative group">
                  <img
                    src={samplePreview}
                    alt={getLabel('sampleImageLabel', 'Reference image')}
                    className="h-24 w-24 rounded-lg object-cover border border-border"
                  />
                  {!disabled && (
                    <button
                      type="button"
                      onClick={handleRemoveSample}
                      className="absolute -top-2 -right-2 bg-red-500 hover:bg-red-600 text-white rounded-full w-6 h-6 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                      title={t(`${namespace}:form.avatar.remove`, 'Remove') ?? 'Remove'}
                    >
                      <span className="material-symbols-outlined text-sm">close</span>
                    </button>
                  )}
                </div>
              ) : (
                <div className="h-24 w-24 rounded-lg border-2 border-dashed border-border bg-muted/10 flex items-center justify-center">
                  <span className="material-symbols-outlined text-2xl text-muted/50">add_photo_alternate</span>
                </div>
              )}
            </div>

            {/* Upload Button */}
            {!samplePreview && (
              <Button
                type="button"
                variant="light"
                size="small"
                icon="upload"
                onClick={() => fileInputRef.current?.click()}
                disabled={disabled}
              >
                {t(`${namespace}:form.images.upload`, 'Upload')}
              </Button>
            )}

            {sampleError && (
              <p className="text-xs text-red-500 dark:text-red-300">{sampleError}</p>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
