import { useTranslation } from 'react-i18next';
import type { UseCharacterFormReturn } from '../hooks/useCharacterForm';
import { ImageGenerationPanel } from './ImageGenerationPanel';
import { MultiStageProgress } from '../../../../components/features/image-generation';
import { UrlImageUploader } from '../../../../components/ui/UrlImageUploader';
import { IMAGE_GENERATION_COSTS } from '../../../../config/credits';

type ModalMode = 'avatar' | 'multi-stage' | 'upload-cover' | null;

interface ImageGenerationModalProps {
  mode: ModalMode;
  characterId: string;
  form: UseCharacterFormReturn;
  onClose: () => void;
  onComplete: () => void;
}

export function ImageGenerationModal({
  mode,
  characterId,
  form,
  onClose,
  onComplete
}: ImageGenerationModalProps): JSX.Element {
  const { t } = useTranslation(['characters']);

  const getModalTitle = (): string => {
    switch (mode) {
      case 'avatar':
        return 'Generate Avatar';
      case 'multi-stage':
        return t('characters:imageGeneration.multiStage.title', 'Multi-Stage Reference Dataset');
      case 'upload-cover':
        return 'Upload Cover Image';
      default:
        return '';
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50" onClick={onClose}>
      <div
        className="bg-background rounded-xl shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-border">
          <h2 className="text-lg font-semibold text-title">{getModalTitle()}</h2>
          <button
            onClick={onClose}
            className="text-muted hover:text-title transition-colors"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Content */}
        <div className="p-4">
          {mode === 'avatar' && (
            <ImageGenerationPanel
              characterId={characterId}
              imageType="AVATAR"
              onImageGenerated={onComplete}
            />
          )}

          {mode === 'multi-stage' && (
            <div className="space-y-4">
              {/* Cost Information */}
              <div className="p-4 bg-gray-50 dark:bg-gray-800 rounded-lg">
                <h3 className="font-semibold mb-2">{t('characters:imageGeneration.multiStage.costInfo')}</h3>
                <div className="text-sm space-y-1">
                  <div className="flex justify-between">
                    <span>{t('characters:imageGeneration.multiStage.costDescription')}</span>
                    <span className="font-bold">{IMAGE_GENERATION_COSTS.REFERENCE_SET} {t('common:credits')}</span>
                  </div>
                </div>
              </div>

              {/* Progress Component */}
              <MultiStageProgress
                characterId={characterId}
                onComplete={onComplete}
                onError={(error) => {
                  console.error('Multi-stage generation failed:', error);
                }}
              />
            </div>
          )}

          {mode === 'upload-cover' && (
            <div className="space-y-4">
              <p className="text-sm text-muted">
                Upload a portrait-oriented image (3:4 ratio) to use as the character cover.
              </p>

              <div className="flex justify-center">
                <UrlImageUploader
                  value={form.values.cover ?? null}
                  onChange={(url) => form.updateField('cover', url)}
                  cropShape="rect"
                  aspect={3 / 4}
                  placeholderText="3:4"
                  previewClassName="h-80 w-60 rounded-lg object-cover shadow-lg"
                  enableDeviceUpload
                  uploadLabel="Upload Cover"
                  changeLabel="Change Cover"
                  removeLabel={t('characters:form.avatar.remove', 'Remove') ?? 'Remove'}
                  urlModalTitle={t('characters:form.images.urlModalTitle', 'Use image from URL') ?? 'Use image from URL'}
                  urlLabel={t('characters:form.images.urlLabel', 'Image URL') ?? 'Image URL'}
                  invalidUrlMessage={t('characters:form.avatar.invalidUrl', 'Enter a valid image URL (http/https).') ?? 'Enter a valid image URL (http/https).'}
                  loadingMessage={t('characters:form.images.uploading', 'Uploading...') ?? 'Uploading...'}
                  useActionLabel={t('common:use', 'Use') ?? 'Use'}
                  cancelLabel={t('common:cancel', 'Cancel') ?? 'Cancel'}
                  previewAlt={t('characters:form.images.previewAlt', 'Character cover preview') ?? 'Character cover preview'}
                  disabled={!characterId}
                  afterCropSave={async (blob: Blob) => {
                    if (!characterId) return null;
                    const file = new File([blob], 'character-cover.webp', { type: 'image/webp' });
                    const created = await import('../../../../services/characterService').then((m) =>
                      m.characterService.uploadCharacterImage({ characterId, file, type: 'COVER' })
                    );
                    onComplete();
                    return created?.url || null;
                  }}
                />
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-border flex justify-end">
          <button
            onClick={onClose}
            className="px-4 py-2 text-sm border border-border rounded-lg hover:bg-muted transition-colors"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
