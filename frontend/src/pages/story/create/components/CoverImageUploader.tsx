import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Input, Button } from '../../../../components/ui';

interface CoverImageUploaderProps {
  value?: string;
  onChange: (url: string) => void;
}

export function CoverImageUploader({ value, onChange }: CoverImageUploaderProps) {
  const { t } = useTranslation('story');
  const [urlInput, setUrlInput] = useState(value || '');
  const [previewError, setPreviewError] = useState(false);

  const handleApply = () => {
    const trimmed = urlInput.trim();
    if (trimmed && /^https?:\/\//i.test(trimmed)) {
      onChange(trimmed);
      setPreviewError(false);
    }
  };

  const handleRemove = () => {
    setUrlInput('');
    onChange('');
    setPreviewError(false);
  };

  const handleImageError = () => {
    setPreviewError(true);
  };

  const handleImageLoad = () => {
    setPreviewError(false);
  };

  return (
    <div className="space-y-3">
      <label className="block text-sm font-medium text-content">
        {t('form.coverImage')}
      </label>

      {/* URL Input */}
      <div className="flex gap-2">
        <Input
          value={urlInput}
          onChange={e => setUrlInput(e.target.value)}
          placeholder={t('form.coverImagePlaceholder')}
          className="flex-grow"
        />
        {urlInput.trim() && (
          <>
            <Button
              type="button"
              onClick={handleApply}
              variant="secondary"
              size="small"
            >
              {t('common:apply')}
            </Button>
            <Button
              type="button"
              onClick={handleRemove}
              variant="light"
              size="small"
            >
              {t('common:remove')}
            </Button>
          </>
        )}
      </div>

      {/* Preview */}
      {value && /^https?:\/\//i.test(value) && (
        <div className="relative w-full aspect-video bg-light border border-border rounded-lg overflow-hidden">
          {!previewError ? (
            <img
              src={value}
              alt={t('form.coverImagePreview')}
              className="w-full h-full object-cover"
              onError={handleImageError}
              onLoad={handleImageLoad}
            />
          ) : (
            <div className="flex items-center justify-center w-full h-full text-sm text-muted">
              {t('form.coverImageError')}
            </div>
          )}
        </div>
      )}

      <p className="text-xs text-muted">
        {t('form.coverImageHint')}
      </p>
    </div>
  );
}
