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

type ModalState = 'form' | 'generating' | 'result';

export function UnifiedImageGenerationModal({
  isOpen,
  onClose,
  characterId,
  imageType,
  onComplete,
}: UnifiedImageGenerationModalProps): JSX.Element {
  const { t } = useTranslation(['characters', 'common']);
  const { addToast } = useToast();

  const [modalState, setModalState] = useState<ModalState>('form');
  const [prompt, setPrompt] = useState('');
  const [sampleImage, setSampleImage] = useState<File | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [progressMessage, setProgressMessage] = useState('');
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
      setModalState('generating');
      setProgressMessage(t('characters:images.startingGeneration', 'Starting generation...'));
      setGeneratedImageUrl(null);

      // Upload sample image if provided
      let uploadedSampleUrl: string | null = null;
      if (sampleImage) {
        setIsUploading(true);
        setProgressMessage(t('characters:imageGeneration.imagesTab.modals.uploading', 'Uploading sample image...'));

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

      setProgressMessage(t('characters:images.generatingImage', 'Generating image with AI...'));

      // Poll for completion
      const result = await imageGenerationService.pollJobStatus(
        jobId,
        (status: JobStatus) => {
          if (status.state === 'active') {
            setProgressMessage(t('characters:images.processing', 'Processing image with AI...'));
          }
        },
        60, // 60 attempts
        5000 // 5 seconds interval
      );

      if (result.state === 'completed' && result.result?.imageUrl) {
        setGeneratedImageUrl(result.result.imageUrl);
        setModalState('result');

        if (onComplete) {
          onComplete();
        }
      } else {
        throw new Error(result.failedReason || 'Generation failed');
      }
    } catch (error) {
      console.error('Failed to generate image:', error);
      setModalState('form');
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
      setProgressMessage('');
      setModalState('form');
      onClose();
    }
  };

  const handleBackToForm = () => {
    setModalState('form');
    setGeneratedImageUrl(null);
  };

  const handleRegenerate = () => {
    handleGenerate();
  };

  // Form state
  if (modalState === 'form') {
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
              {t('characters:images.coverAspectInfo', 'Cover images use a 3:4 portrait aspect ratio.')}
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
            <>
              <span className="material-symbols-outlined text-lg">auto_awesome</span>
              {t('common:generate', 'Generate')}
            </>
          </Button>
        </div>
      </Modal>
    );
  }

  // Generating state
  if (modalState === 'generating') {
    return (
      <Modal
        isOpen={isOpen}
        onClose={() => {}}
        title={title}
        size="md"
        showCloseButton={false}
      >
        <div className="flex min-h-[300px] flex-col items-center justify-center space-y-6">
          {/* Spinner */}
          <span className="material-symbols-outlined animate-spin text-6xl text-accent">progress_activity</span>

          {/* Progress message */}
          <div className="text-center">
            <p className="text-lg font-medium text-title">
              {t('characters:images.generatingImage', 'Generating your image...')}
            </p>
            <p className="mt-2 text-sm text-muted">
              {progressMessage}
            </p>
          </div>

          {/* Info message */}
          <p className="max-w-md text-center text-xs text-muted">
            {t('characters:images.generatingInfo', 'This usually takes 30-60 seconds. Please don\'t close this window.')}
          </p>
        </div>
      </Modal>
    );
  }

  // Result state
  return (
    <Modal
      isOpen={isOpen}
      onClose={handleClose}
      title={t('characters:images.generationComplete', 'Generation Complete!')}
      size="md"
    >
      <div className="space-y-4">
        {/* Generated Image */}
        {generatedImageUrl && (
          <div className="flex justify-center">
            <img
              src={generatedImageUrl}
              alt={title}
              className="max-h-96 rounded-lg border border-border shadow-lg"
            />
          </div>
        )}

        {/* Success message */}
        <p className="text-center text-sm text-description">
          {t('characters:images.generationSuccessMessage', 'Your image has been generated and saved!')}
        </p>
      </div>

      {/* Footer with 3 buttons */}
      <div className="flex justify-between mt-4">
        <Button
          type="button"
          variant="light"
          onClick={handleBackToForm}
          disabled={isGenerating}
        >
          <span className="material-symbols-outlined text-lg">arrow_back</span>
          {t('common:back', 'Back')}
        </Button>

        <div className="flex gap-2">
          <Button
            type="button"
            variant="secondary"
            onClick={handleRegenerate}
            disabled={isGenerating}
          >
            <span className="material-symbols-outlined text-lg">refresh</span>
            {t('common:generateAgain', 'Generate Again')}
          </Button>

          <Button
            type="button"
            variant="primary"
            onClick={handleClose}
          >
            {t('common:close', 'Close')}
          </Button>
        </div>
      </div>
    </Modal>
  );
}
