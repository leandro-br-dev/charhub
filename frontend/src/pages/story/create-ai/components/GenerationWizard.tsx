import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  useStoryGenerationSocket,
  StoryGenerationStep,
  type StoryGenerationProgress,
} from '../../../../hooks/useStoryGenerationSocket';
import { useToast } from '../../../../contexts/ToastContext';
import { StoryLoadingAnimation } from './StoryLoadingAnimation';
import { StoryRevealScreen } from './StoryRevealScreen';
import { FinalRevealScreen } from './FinalRevealScreen';

interface GenerationWizardProps {
  sessionId: string;
}

export function GenerationWizard({ sessionId }: GenerationWizardProps): JSX.Element {
  const { t } = useTranslation(['story']);
  const { addToast } = useToast();

  const getStepMessage = (step: StoryGenerationStep): string => {
    const messageMap: Record<StoryGenerationStep, string> = {
      [StoryGenerationStep.UPLOADING_IMAGE]: t('story:createAI.progress.uploadingImage', 'Uploading your scene'),
      [StoryGenerationStep.ANALYZING_IMAGE]: t('story:createAI.progress.analyzingImage', 'Analyzing the atmosphere'),
      [StoryGenerationStep.EXTRACTING_DESCRIPTION]: t('story:createAI.progress.extractingDescription', 'Reading the tale'),
      [StoryGenerationStep.GENERATING_CONCEPT]: t('story:createAI.progress.generatingConcept', 'Weaving the narrative'),
      [StoryGenerationStep.GENERATING_PLOT]: t('story:createAI.progress.generatingPlot', 'Crafting the plot'),
      [StoryGenerationStep.WRITING_SCENE]: t('story:createAI.progress.writingScene', 'Writing the opening'),
      [StoryGenerationStep.GENERATING_COVER]: t('story:createAI.progress.generatingCover', 'Creating the cover'),
      [StoryGenerationStep.CREATING_STORY]: t('story:createAI.progress.creatingStory', 'Bringing the story to life'),
      [StoryGenerationStep.COMPLETED]: t('story:createAI.progress.completed', 'Your story awaits'),
      [StoryGenerationStep.ERROR]: t('story:createAI.progress.error', 'An unexpected twist'),
    };
    return messageMap[step];
  };

  const [completedStory, setCompletedStory] = useState<any>(null);
  const [latestProgress, setLatestProgress] = useState<StoryGenerationProgress | null>(null);

  const handleProgress = (progress: StoryGenerationProgress) => {
    console.log('[GenerationWizard] Progress update:', progress);
    setLatestProgress(progress);
  };

  const handleComplete = (story: any) => {
    console.log('[GenerationWizard] Generation completed:', story);
    setCompletedStory(story);
  };

  const handleError = (error: string) => {
    console.error('[GenerationWizard] Generation error:', error);
    addToast(error, 'error');
  };

  const { currentProgress } = useStoryGenerationSocket({
    sessionId,
    onProgress: handleProgress,
    onComplete: handleComplete,
    onError: handleError,
  });

  const progress = currentProgress || latestProgress;

  // Show final reveal screen
  if (progress?.step === StoryGenerationStep.COMPLETED && completedStory) {
    return <FinalRevealScreen story={completedStory} />;
  }

  // Show error screen
  if (progress?.step === StoryGenerationStep.ERROR) {
    return (
      <section className="py-16 px-6 bg-background flex items-center justify-center">
        <div className="max-w-2xl text-center">
          <div className="text-8xl mb-6">⚠️</div>
          <h1 className="text-4xl font-bold text-danger mb-4">{t('story:createAI.generationFailed', 'Generation Failed')}</h1>
          <p className="text-content mb-8 text-lg">{progress.message}</p>
          {progress.data?.error && (
            <p className="text-muted mb-8 text-sm">{progress.data.error}</p>
          )}
          <button
            onClick={() => window.location.reload()}
            className="px-8 py-3 bg-danger hover:bg-danger/90 text-primary-foreground rounded-lg font-semibold transition-colors"
          >
            {t('common:tryAgain', 'Try Again')}
          </button>
        </div>
      </section>
    );
  }

  // Check if we should show story reveal screens
  const shouldShowReveal =
    progress &&
    (progress.step === StoryGenerationStep.GENERATING_CONCEPT ||
      progress.step === StoryGenerationStep.GENERATING_PLOT ||
      progress.step === StoryGenerationStep.WRITING_SCENE ||
      progress.step === StoryGenerationStep.CREATING_STORY) &&
    progress.data;

  if (shouldShowReveal) {
    return <StoryRevealScreen step={progress.step} data={progress.data} />;
  }

  // Default: show story loading animation
  const message = progress ? getStepMessage(progress.step) : t('story:createAI.progress.preparing', 'Preparing your story');
  const progressPercent = progress?.progress || 0;

  return <StoryLoadingAnimation message={message} progress={progressPercent} />;
}
