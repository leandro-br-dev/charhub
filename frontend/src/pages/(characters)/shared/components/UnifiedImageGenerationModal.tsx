import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Modal } from '../../../../components/ui/Modal';
import { Button } from '../../../../components/ui/Button';
import { PromptWithSampleImageInput } from '../../../../components/features/image-generation';
import { imageGenerationService, type JobStatus } from '../../../../services/imageGenerationService';
import { useToast } from '../../../../contexts/ToastContext';
import { characterService } from '../../../../services/characterService';

export type ImageGenerationType = 'AVATAR' | 'COVER';

export interface UnifiedImageGenerationModalProps {
  /** Whether the modal is open */
  isOpen: boolean;
  /** Callback to close the modal */
  onClose: () => void;
  /** Character ID */
  characterId: string;
  /** Type of image to generate */
  imageType: ImageGenerationType;
  /** Callback when generation completes */
  onComplete: () => void;
}

export function UnifiedImageGenerationModal({
  isOpen,
  onClose,
  characterId,
  imageType,
  onComplete,
}: UnifiedImageGenerationModalProps): JSX.Element {
  const { t } = useTranslation(['characters', 'common']);
  const { addToast } = useToast();

  const [prompt, setPrompt] = useState('');
  const [sampleImage, setSampleImage] = useState<File | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [progress, setProgress] = useState('');
  const [generatedImageUrl, setGeneratedImageUrl] = useState<string | null>(null);

  const isAvatar = imageType === 'AVATAR';
  const title = isAvatar
    ? t('characters:images.avatarHeader', 'Generate Avatar')
    : t('characters:images.coverHeader', 'Generate Cover Image');

  const description = isAvatar
    ? t('characters:images.avatarDescription', 'Generate a new avatar using AI. You can provide additional context and a sample image for style reference.')
    : t('characters:images.coverDescription', 'Generate a portrait-oriented cover image using AI. Provide additional context and a sample image for style reference.');

  const handleGenerate = async () => {
    if (!characterId) return;

    try {
      setIsGenerating(true);
      setProgress(t('characters:images.startingGeneration', 'Starting generation...'));
      setGeneratedImageUrl(null);

      // Upload sample image if provided
      let uploadedSampleUrl: string | null = null;
      if (sampleImage) {
        setIsUploading(true);
        setProgress(t('characters:imageGeneration.imagesTab.modals.uploading', 'Uploading sample image...'));

        const uploadResult = await characterService.uploadCharacterImage({
          characterId,
          file: sampleImage,
          type: 'SAMPLE',
        });

        uploadedSampleUrl = uploadResult?.url || null;
        setIsUploading(false);
      }

      // Queue generation job with prompt and sample image
      const { jobId } = await imageGenerationService.generateAvatar({
        characterId,
        prompt: prompt || undefined,
        referenceImageUrl: uploadedSampleUrl || undefined,
        imageType: imageType,
      });

      setProgress(t('characters:images.generatingImage', 'Generating image... This may take up to 1 minute'));

      // Poll for completion
      const result = await imageGenerationService.pollJobStatus(
        jobId,
        (status: JobStatus) => {
          if (status.state === 'active') {
            setProgress(t('characters:images.processing', 'Processing image with AI...'));
          }
        },
        60, // 60 attempts
        5000 // 5 seconds interval
      );

      if (result.state === 'completed' && result.result?.imageUrl) {
        setProgress(t('characters:images.generationComplete', 'Generation complete!'));
        setGeneratedImageUrl(result.result.imageUrl);

        addToast(
          t('characters:images.imageGeneratedSuccess', 'Image generated successfully!'),
          'success'
        );

        if (onComplete) {
          onComplete();
        }
      } else {
        throw new Error(result.failedReason || 'Generation failed');
      }
    } catch (error) {
      console.error('Failed to generate image:', error);
      setProgress('');
      addToast(
        t('characters:errors.failedToGenerateImage', 'Failed to generate image. Please try again.'),
        'error'
      );
    } finally {
      setIsGenerating(false);
      setIsUploading(false);
    }
  };

  const handleClose = () => {
    if (!isGenerating && !isUploading) {
      setPrompt('');
      setSampleImage(null);
      setGeneratedImageUrl(null);
      setProgress('');
      onClose();
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={handleClose}
      title={title}
      size="md"
    >
      <div className="space-y-4">
        {/* Description */}
        <p className="text-sm text-description">
          {description}
        </p>

        {/* Note about aspect ratio for cover */}
        {!isAvatar && (
          <div className="rounded-lg bg-muted/30 p-3 text-xs text-muted">
            <span className="material-symbols-outlined text-sm align-middle mr-1">info</span>
            Cover images use a 3:4 portrait aspect ratio.
          </div>
        )}

        {/* Prompt + Sample Image Input */}
        <PromptWithSampleImageInput
          prompt={prompt}
          onPromptChange={setPrompt}
          sampleImage={sampleImage ? URL.createObjectURL(sampleImage) : null}
          onSampleImageChange={(file: File | null) => setSampleImage(file)}
          disabled={isGenerating || isUploading}
        />

        {/* Progress Message */}
        {progress && (
          <div className="rounded-lg bg-accent/10 p-3 text-sm text-accent">
            <div className="flex items-center gap-2">
              <span className="material-symbols-outlined animate-pulse text-base">hourglass_empty</span>
              {progress}
            </div>
          </div>
        )}

        {/* Generated Image Preview */}
        {generatedImageUrl && (
          <div>
            <p className="mb-2 text-sm font-medium text-title">
              {t('characters:images.preview', 'Preview')}:
            </p>
            <img
              src={generatedImageUrl}
              alt={title}
              className="max-h-64 rounded-lg border border-border shadow-md mx-auto"
            />
          </div>
        )}
      </div>

      {/* Footer */}
      <div className="flex justify-end gap-2 mt-4">
        <Button
          type="button"
          variant="light"
          onClick={handleClose}
          disabled={isGenerating || isUploading}
        >
          {t('common:cancel', 'Cancel')}
        </Button>
        <Button
          type="button"
          variant="primary"
          onClick={handleGenerate}
          disabled={isGenerating || isUploading}
        >
          {isGenerating || isUploading ? (
            <>
              <span className="material-symbols-outlined animate-spin text-lg">progress_activity</span>
              {t('characters:imageGeneration.imagesTab.modals.generating', 'Generating...')}
            </>
          ) : (
            <>
              <span className="material-symbols-outlined text-lg">auto_awesome</span>
              {t('common:generate', 'Generate')}
            </>
          )}
        </Button>
      </div>
    </Modal>
  );
}
