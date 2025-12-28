import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import { Button } from '../../../../components/ui/Button';

interface FinalRevealScreenProps {
  story: any;
}

export function FinalRevealScreen({ story }: FinalRevealScreenProps): JSX.Element {
  const { t } = useTranslation(['story', 'common']);
  const navigate = useNavigate();

  const handleViewStory = () => {
    navigate(`/stories/${story.id}`);
  };

  const handleEditStory = () => {
    navigate(`/stories/${story.id}/edit`);
  };

  return (
    <section className="min-h-screen py-16 px-6 bg-background flex items-center justify-center">
      <div className="w-full max-w-2xl">
        <div className="text-center mb-8">
          {/* Success icon */}
          <div className="text-8xl mb-6">🎉</div>

          {/* Title */}
          <h1 className="text-4xl font-bold text-title mb-4">
            {t('story:createAI.final.title', 'Your Story Has Been Created!')}
          </h1>

          {/* Story title */}
          <h2 className="text-2xl font-semibold text-primary mb-4">{story.title}</h2>

          {/* Message */}
          <p className="text-lg text-muted">
            {t('story:createAI.final.message', 'Your story has been generated and is ready to read. A cover image is being generated in the background.')}
          </p>
        </div>

        {/* Story preview card */}
        <div className="bg-card rounded-xl border border-border p-6 mb-6 shadow-lg">
          <div className="mb-4">
            <p className="text-xs font-semibold text-muted uppercase mb-2">
              {t('story:detail.synopsis', 'Synopsis')}
            </p>
            <p className="text-sm text-content">{story.synopsis}</p>
          </div>

          {story.initialText && (
            <div className="mb-4">
              <p className="text-xs font-semibold text-muted uppercase mb-2">
                {t('story:detail.initialScene', 'Opening Scene')}
              </p>
              <p className="text-sm text-content line-clamp-4">{story.initialText}</p>
            </div>
          )}

          {story.objectives && story.objectives.length > 0 && (
            <div>
              <p className="text-xs font-semibold text-muted uppercase mb-2">
                {t('story:detail.objectives', 'Story Objectives')}
              </p>
              <ul className="text-sm text-content space-y-1">
                {story.objectives.map((objective: any, index: number) => (
                  <li key={objective.id || index} className="flex items-start gap-2">
                    <span className="text-primary mt-1">•</span>
                    <span>{objective.description}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>

        {/* Action buttons */}
        <div className="flex flex-col-reverse sm:flex-row justify-center gap-3">
          <Button
            variant="light"
            onClick={handleEditStory}
            className="w-full sm:w-auto"
          >
            {t('common:edit', 'Edit')}
          </Button>
          <Button
            variant="primary"
            onClick={handleViewStory}
            className="w-full sm:w-auto"
          >
            {t('story:view', 'View Story')}
          </Button>
        </div>

        {/* Additional actions */}
        <div className="text-center mt-6">
          <button
            onClick={() => navigate('/stories/create-ai')}
            className="text-sm text-muted hover:text-primary transition-colors"
          >
            {t('story:createAI.final.createAnother', 'Create another story')}
          </button>
        </div>
      </div>
    </section>
  );
}
