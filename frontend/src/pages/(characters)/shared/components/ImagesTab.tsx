import { useTranslation } from 'react-i18next';
import type { UseCharacterFormReturn } from '../hooks/useCharacterForm';
import { UrlImageUploader } from '../../../../components/ui/UrlImageUploader';

interface ImagesTabProps {
  form: UseCharacterFormReturn;
}

export function ImagesTab({ form }: ImagesTabProps): JSX.Element {
  const { t } = useTranslation(['characters']);

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-semibold text-title">
          {t('characters:form.images.coverHeader', 'Character cover')}
        </h3>
        <p className="mt-1 text-sm text-description">
          {t('characters:form.images.coverDescription', 'Portrait-oriented image used as the character cover.')}
        </p>
        <UrlImageUploader
          value={form.values.cover ?? null}
          onChange={(url) => form.updateField('cover', url)}
          cropShape="rect"
          aspect={3/4}
          placeholderText="3:4"
          previewClassName="h-64 w-48 rounded-md object-cover shadow-sm"
          uploadLabel={t('characters:form.images.upload', 'Upload cover') ?? 'Upload cover'}
          changeLabel={t('characters:form.images.change', 'Change cover') ?? 'Change cover'}
          removeLabel={t('characters:form.avatar.remove', 'Remove') ?? 'Remove'}
          urlModalTitle={t('characters:form.images.urlModalTitle', 'Use image from URL') ?? 'Use image from URL'}
          urlLabel={t('characters:form.images.urlLabel', 'Image URL') ?? 'Image URL'}
          invalidUrlMessage={t('characters:form.avatar.invalidUrl', 'Enter a valid image URL (http/https).') ?? 'Enter a valid image URL (http/https).'}
          loadingMessage={t('characters:form.images.uploading', 'Uploading...') ?? 'Uploading...'}
          useActionLabel={t('common:use', 'Use') ?? 'Use'}
          cancelLabel={t('common:cancel', 'Cancel') ?? 'Cancel'}
          previewAlt={t('characters:form.images.previewAlt', 'Character cover preview') ?? 'Character cover preview'}
          postProcess={async (blob: Blob) => {
            // Convert to 3:4 portrait WebP with max height 1024px
            const img = document.createElement('img');
            const objectUrl = URL.createObjectURL(blob);
            try {
              await new Promise<void>((resolve, reject) => {
                img.onload = () => resolve();
                img.onerror = () => reject(new Error('Failed to load image for processing'));
                img.src = objectUrl;
              });
              const targetH = Math.min(1024, img.naturalHeight);
              const targetW = Math.round(targetH * (3 / 4));
              const canvas = document.createElement('canvas');
              canvas.width = targetW;
              canvas.height = targetH;
              const ctx = canvas.getContext('2d');
              if (!ctx) throw new Error('Canvas rendering unavailable');
              const scale = Math.min(targetW / img.naturalWidth, targetH / img.naturalHeight);
              const drawW = Math.round(img.naturalWidth * scale);
              const drawH = Math.round(img.naturalHeight * scale);
              const dx = Math.floor((targetW - drawW) / 2);
              const dy = Math.floor((targetH - drawH) / 2);
              ctx.clearRect(0, 0, targetW, targetH);
              ctx.drawImage(img, dx, dy, drawW, drawH);
              const webpBlob: Blob = await new Promise((resolve, reject) => {
                canvas.toBlob(b => (b ? resolve(b) : reject(new Error('Failed to encode WebP'))), 'image/webp', 0.9);
              });
              return webpBlob;
            } finally {
              URL.revokeObjectURL(objectUrl);
            }
          }}
        />
      </div>
    </div>
  );
}
