import { useTranslation } from 'react-i18next';
import { StoryGenerationStep } from '../../../../hooks/useStoryGenerationSocket';

interface StoryRevealScreenProps {
  step: StoryGenerationStep;
  data: any;
}

export function StoryRevealScreen({ step, data }: StoryRevealScreenProps): JSX.Element {
  const { t } = useTranslation(['story']);

  const getRevealContent = () => {
    switch (step) {
      case StoryGenerationStep.GENERATING_CONCEPT:
        return {
          title: t('story:createAI.reveal.title', 'Story Concept Created'),
          icon: '',
          items: data?.title ? [
            { label: t('common:title', 'Title'), value: data.title },
          ] : [],
          message: t('story:createAI.reveal.conceptMessage', 'The foundation of your story has been forged...'),
        };

      case StoryGenerationStep.GENERATING_PLOT:
        return {
          title: t('story:createAI.reveal.plotTitle', 'Plot Written'),
          icon: '',
          items: data?.objectives ? [
            { label: t('story:objectives', 'Objectives'), value: data.objectives.map((o: any) => o.description).join(', ') },
          ] : [],
          message: t('story:createAI.reveal.plotMessage', 'The journey ahead has been mapped...'),
        };

      case StoryGenerationStep.WRITING_SCENE:
        return {
          title: t('story:createAI.reveal.sceneTitle', 'Opening Scene Written'),
          icon: '',
          items: data?.initialText ? [
            { label: t('story:initialText', 'Opening'), value: data.initialText.substring(0, 150) + '...' },
          ] : [],
          message: t('story:createAI.reveal.sceneMessage', 'The tale begins to unfold...'),
        };

      case StoryGenerationStep.CREATING_STORY:
        return {
          title: t('story:createAI.reveal.storyTitle', 'Story Created'),
          icon: '',
          items: [],
          message: t('story:createAI.reveal.storyMessage', 'Your story has been brought to life!'),
        };

      default:
        return null as never;
    }
  };

  const content = getRevealContent();

  if (!content) {
    return <></>;
  }

  return (
    <section className="min-h-screen py-16 px-6 bg-background flex items-center justify-center">
      <div className="w-full max-w-2xl text-center">
        {/* Icon */}
        <div className="text-8xl mb-6 animate-bounce">
          {content.icon || '📖'}
        </div>

        {/* Title */}
        <h1 className="text-4xl font-bold text-title mb-4">{content.title}</h1>

        {/* Message */}
        <p className="text-lg text-muted mb-8">{content.message}</p>

        {/* Data display */}
        {content.items.length > 0 && (
          <div className="bg-card rounded-xl border border-border p-6 text-left mb-8">
            {content.items.map((item, index) => (
              <div key={index} className="mb-3 last:mb-0">
                <p className="text-xs font-semibold text-muted uppercase mb-1">{item.label}</p>
                <p className="text-sm text-content">{item.value}</p>
              </div>
            ))}
          </div>
        )}

        {/* Continue indicator */}
        <div className="flex items-center justify-center gap-2 text-muted">
          <span className="text-sm">{t('story:createAI.reveal.continuing', 'Continuing...')}</span>
          <div className="flex gap-1">
            <span className="w-2 h-2 bg-primary rounded-full animate-bounce" style={{ animationDelay: '0s' }}></span>
            <span className="w-2 h-2 bg-primary rounded-full animate-bounce" style={{ animationDelay: '0.1s' }}></span>
            <span className="w-2 h-2 bg-primary rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></span>
          </div>
        </div>
      </div>
    </section>
  );
}
