import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Button } from '../../../../components/ui/Button';
import { imageGenerationService, type JobStatus } from '../../../../services/imageGenerationService';
import { useToast } from '../../../../contexts/ToastContext';

interface ImageGenerationPanelProps {
  characterId: string;
  imageType: 'AVATAR' | 'COVER';
  onImageGenerated?: () => void;
}

export function ImageGenerationPanel({ characterId, imageType, onImageGenerated }: ImageGenerationPanelProps): JSX.Element {
  const { t } = useTranslation(['characters', 'common']);
  const { addToast } = useToast();
  const [isGenerating, setIsGenerating] = useState(false);
  const [progress, setProgress] = useState('');
  const [generatedImageUrl, setGeneratedImageUrl] = useState<string | null>(null);

  const handleGenerate = async () => {
    if (imageType !== 'AVATAR') {
      addToast({
        type: 'info',
        message: t('characters:images.onlyAvatarSupported', 'Only avatar generation is supported at the moment'),
      });
      return;
    }

    try {
      setIsGenerating(true);
      setProgress(t('characters:images.startingGeneration', 'Starting generation...'));
      setGeneratedImageUrl(null);

      // Queue generation job
      const { jobId } = await imageGenerationService.generateAvatar({ characterId });

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

        addToast({
          type: 'success',
          message: t('characters:images.imageGeneratedSuccess', 'Image generated successfully!'),
        });

        if (onImageGenerated) {
          onImageGenerated();
        }
      } else {
        throw new Error(result.failedReason || 'Generation failed');
      }
    } catch (error) {
      console.error('Failed to generate image:', error);
      setProgress('');
      addToast({
        type: 'error',
        message: t('characters:errors.failedToGenerateImage', 'Failed to generate image. Please try again.'),
      });
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <div className="space-y-4">
      <div className="rounded-xl border border-border bg-card p-6">
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <h4 className="font-semibold text-title">
              {t('characters:images.generateNew', 'Generate new {{type}}', {
                type: imageType.toLowerCase(),
              })}
            </h4>
            <p className="mt-1 text-sm text-description">
              {imageType === 'AVATAR'
                ? t(
                    'characters:images.avatarDescription',
                    'Generate a new avatar using AI. The character description will be used to create the image.'
                  )
                : t(
                    'characters:images.coverDescription',
                    'Generate a new cover image using AI based on character description.'
                  )}
            </p>
          </div>

          <Button
            onClick={handleGenerate}
            disabled={isGenerating}
            className="ml-4 flex items-center gap-2 bg-accent text-white hover:bg-accent/90"
          >
            {isGenerating ? (
              <>
                <span className="material-symbols-outlined animate-spin text-lg">progress_activity</span>
                {t('common:generating', 'Generating...')}
              </>
            ) : (
              <>
                <span className="material-symbols-outlined text-lg">auto_awesome</span>
                {t('common:generate', 'Generate')}
              </>
            )}
          </Button>
        </div>

        {progress && (
          <div className="mt-4 rounded-lg bg-accent/10 p-3 text-sm text-accent">
            <div className="flex items-center gap-2">
              <span className="material-symbols-outlined animate-pulse text-base">hourglass_empty</span>
              {progress}
            </div>
          </div>
        )}

        {generatedImageUrl && (
          <div className="mt-4">
            <p className="mb-2 text-sm font-medium text-title">
              {t('characters:images.preview', 'Preview')}:
            </p>
            <img
              src={generatedImageUrl}
              alt="Generated preview"
              className="max-h-64 rounded-lg border border-border shadow-md"
            />
          </div>
        )}
      </div>

      <div className="rounded-lg bg-muted/30 p-4">
        <div className="flex items-start gap-2 text-sm text-description">
          <span className="material-symbols-outlined text-base">info</span>
          <div>
            <p className="font-medium">
              {t('characters:images.generationInfo', 'About image generation')}:
            </p>
            <ul className="mt-1 list-inside list-disc space-y-1">
              <li>
                {t(
                  'characters:images.infoPrompt',
                  'The AI will use your character description to create the image'
                )}
              </li>
              <li>
                {t('characters:images.infoTime', 'Generation takes approximately 30-60 seconds')}
              </li>
              <li>
                {t('characters:images.infoActive', 'New images are automatically set as active')}
              </li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}
