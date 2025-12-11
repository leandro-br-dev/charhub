import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  useCharacterGenerationSocket,
  CharacterGenerationStep,
  type CharacterGenerationProgress,
} from '../../../../hooks/useCharacterGenerationSocket';
import { useToast } from '../../../../contexts/ToastContext';
import { GameLoadingAnimation } from './GameLoadingAnimation';
import { CharacterRevealScreen } from './CharacterRevealScreen';
import { FinalRevealScreen } from './FinalRevealScreen';

interface GenerationWizardProps {
  sessionId: string;
}

export function GenerationWizard({ sessionId }: GenerationWizardProps): JSX.Element {
  const { t } = useTranslation(['characters']);
  const { addToast } = useToast();

  const getStepMessage = (step: CharacterGenerationStep): string => {
    const messageMap: Record<CharacterGenerationStep, string> = {
      [CharacterGenerationStep.UPLOADING_IMAGE]: t('characters:createAI.progress.uploadingImage', 'Uploading your vision'),
      [CharacterGenerationStep.ANALYZING_IMAGE]: t('characters:createAI.progress.analyzingImage', 'Analyzing the essence'),
      [CharacterGenerationStep.EXTRACTING_DESCRIPTION]: t('characters:createAI.progress.extractingDescription', 'Reading the character'),
      [CharacterGenerationStep.GENERATING_DETAILS]: t('characters:createAI.progress.generatingDetails', 'Forging their identity'),
      [CharacterGenerationStep.GENERATING_HISTORY]: t('characters:createAI.progress.generatingHistory', 'Weaving their tale'),
      [CharacterGenerationStep.CREATING_CHARACTER]: t('characters:createAI.progress.creatingCharacter', 'Bringing them to life'),
      [CharacterGenerationStep.QUEUING_AVATAR]: t('characters:createAI.progress.queuingAvatar', 'Preparing the visual'),
      [CharacterGenerationStep.GENERATING_AVATAR]: t('characters:createAI.progress.generatingAvatar', 'Painting their portrait'),
      [CharacterGenerationStep.COMPLETED]: t('characters:createAI.progress.completed', 'Your hero awaits'),
      [CharacterGenerationStep.ERROR]: t('characters:createAI.progress.error', 'An unexpected twist'),
    };
    return messageMap[step];
  };

  const [completedCharacter, setCompletedCharacter] = useState<any>(null);
  const [latestProgress, setLatestProgress] = useState<CharacterGenerationProgress | null>(null);

  const handleProgress = (progress: CharacterGenerationProgress) => {
    console.log('[GenerationWizard] Progress update:', progress);
    setLatestProgress(progress);
  };

  const handleComplete = (character: any) => {
    console.log('[GenerationWizard] Generation completed:', character);
    setCompletedCharacter(character);
  };

  const handleError = (error: string) => {
    console.error('[GenerationWizard] Generation error:', error);
    addToast(error, 'error');
  };

  const { currentProgress } = useCharacterGenerationSocket({
    sessionId,
    onProgress: handleProgress,
    onComplete: handleComplete,
    onError: handleError,
  });

  const progress = currentProgress || latestProgress;

  // Show final reveal screen
  if (progress?.step === CharacterGenerationStep.COMPLETED && completedCharacter) {
    return <FinalRevealScreen character={completedCharacter} />;
  }

  // Show error screen
  if (progress?.step === CharacterGenerationStep.ERROR) {
    return (
      <section className="py-16 px-6 bg-background flex items-center justify-center">
        <div className="max-w-2xl text-center">
          <div className="text-8xl mb-6">⚠️</div>
          <h1 className="text-4xl font-bold text-danger mb-4">Generation Failed</h1>
          <p className="text-content mb-8 text-lg">{progress.message}</p>
          {progress.data?.error && (
            <p className="text-muted mb-8 text-sm">{progress.data.error}</p>
          )}
          <button
            onClick={() => window.location.reload()}
            className="px-8 py-3 bg-danger hover:bg-danger/90 text-primary-foreground rounded-lg font-semibold transition-colors"
          >
            Try Again
          </button>
        </div>
      </section>
    );
  }

  // Check if we should show character reveal screens
  const shouldShowReveal =
    progress &&
    (progress.step === CharacterGenerationStep.GENERATING_DETAILS ||
      progress.step === CharacterGenerationStep.GENERATING_HISTORY ||
      progress.step === CharacterGenerationStep.CREATING_CHARACTER) &&
    progress.data;

  if (shouldShowReveal) {
    return <CharacterRevealScreen step={progress.step} data={progress.data} />;
  }

  // Default: show game loading animation
  const message = progress ? getStepMessage(progress.step) : t('characters:createAI.progress.preparing', 'Preparing your adventure');
  const progressPercent = progress?.progress || 0;

  return <GameLoadingAnimation message={message} progress={progressPercent} />;
}
