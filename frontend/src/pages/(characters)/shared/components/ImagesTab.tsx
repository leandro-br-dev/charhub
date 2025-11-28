import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import type { UseCharacterFormReturn } from '../hooks/useCharacterForm';
import { UrlImageUploader } from '../../../../components/ui/UrlImageUploader';
import { ImageGallery } from './ImageGallery';
import { ImageGenerationPanel } from './ImageGenerationPanel';

interface ImagesTabProps {
  form: UseCharacterFormReturn;
  characterId?: string;
}

export function ImagesTab({ form, characterId }: ImagesTabProps): JSX.Element {
  const { t } = useTranslation(['characters']);
  const [refreshKey, setRefreshKey] = useState(0);

  const handleImageUpdate = () => {
    // Trigger refresh of gallery
    setRefreshKey((prev) => prev + 1);
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

  return (
    <div className="space-y-8">
      {/* Avatar Section */}
      <div>
        <div className="mb-4 flex items-center justify-between">
          <div>
            <h3 className="text-lg font-semibold text-title">
              {t('characters:form.images.avatarHeader', 'Avatars')}
            </h3>
            <p className="mt-1 text-sm text-description">
              {t('characters:form.images.avatarDescription', 'Generated avatar images for this character')}
            </p>
          </div>
        </div>

        <ImageGenerationPanel
          characterId={characterId}
          imageType="AVATAR"
          onImageGenerated={handleImageUpdate}
        />

        <div className="mt-6">
          <h4 className="mb-3 text-sm font-medium text-title">
            {t('characters:images.gallery', 'Generated images')}
          </h4>
          <ImageGallery
            key={`avatar-${refreshKey}`}
            characterId={characterId}
            imageType="AVATAR"
            onImageActivated={handleImageUpdate}
          />
        </div>
      </div>

      <div className="border-t border-border" />

      {/* Cover Section */}
      <div>
        <div className="mb-4">
          <h3 className="text-lg font-semibold text-title">
            {t('characters:form.images.coverHeader', 'Character cover')}
          </h3>
          <p className="mt-1 text-sm text-description">
            {t('characters:form.images.coverDescription', 'Portrait-oriented image used as the character cover.')}
          </p>
        </div>

        <UrlImageUploader
          value={form.values.cover ?? null}
          onChange={(url) => form.updateField('cover', url)}
          cropShape="rect"
          aspect={3 / 4}
          placeholderText="3:4"
          previewClassName="h-64 w-48 rounded-md object-cover shadow-sm"
          enableDeviceUpload
          uploadLabel={t('characters:form.images.upload', 'Upload cover') ?? 'Upload cover'}
          changeLabel={t('characters:form.images.change', 'Change cover') ?? 'Change cover'}
          removeLabel={t('characters:form.avatar.remove', 'Remove') ?? 'Remove'}
          urlModalTitle={
            t('characters:form.images.urlModalTitle', 'Use image from URL') ?? 'Use image from URL'
          }
          urlLabel={t('characters:form.images.urlLabel', 'Image URL') ?? 'Image URL'}
          invalidUrlMessage={
            t('characters:form.avatar.invalidUrl', 'Enter a valid image URL (http/https).') ??
            'Enter a valid image URL (http/https).'
          }
          loadingMessage={t('characters:form.images.uploading', 'Uploading...') ?? 'Uploading...'}
          useActionLabel={t('common:use', 'Use') ?? 'Use'}
          cancelLabel={t('common:cancel', 'Cancel') ?? 'Cancel'}
          previewAlt={
            t('characters:form.images.previewAlt', 'Character cover preview') ?? 'Character cover preview'
          }
          disabled={!characterId}
          afterCropSave={async (blob: Blob) => {
            if (!characterId) return null;
            const file = new File([blob], 'character-cover.webp', { type: 'image/webp' });
            const created = await import('../../../../services/characterService').then((m) =>
              m.characterService.uploadCharacterImage({ characterId, file, type: 'COVER' })
            );
            return created?.url || null;
          }}
        />
      </div>
    </div>
  );
}
