import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Button } from '../../../components/ui';
import { storyService } from '../../../services/storyService';
import { chatService } from '../../../services/chatService';
import type { Story } from '../../../types/story';
import type { CreateConversationPayload } from '../../../types/chat';

export function StoryDetailPage() {
  const { storyId } = useParams<{ storyId: string }>();
  const navigate = useNavigate();
  const { t } = useTranslation(['story', 'common']);
  const [story, setStory] = useState<Story | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isStarting, setIsStarting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!storyId) return;

    const fetchStory = async () => {
      try {
        setIsLoading(true);
        const data = await storyService.getById(storyId);
        setStory(data);
      } catch (err) {
        console.error('Error loading story:', err);
        setError(t('story:errors.failedToLoad', 'Failed to load story'));
      } finally {
        setIsLoading(false);
      }
    };

    fetchStory();
  }, [storyId, t]);

  const handleStartStory = async () => {
    if (!story) return;

    try {
      setIsStarting(true);

      // Construir o contexto da história para o chat
      const storyContext = buildStoryContext(story);

      // Criar nova conversa com os personagens da história
      const characterIds = story.characters?.map(c => c.id) || [];

      if (characterIds.length === 0) {
        setError(t('story:errors.noCharacters', 'This story has no characters'));
        setIsStarting(false);
        return;
      }

      // Criar a conversa com contexto da história
      const payload: CreateConversationPayload = {
        title: story.title,
        participantIds: characterIds,
        settings: {
          storyId: story.id,
          storyContext, // Contexto completo da história
          isStoryMode: true,
          initialMessage: story.initialText || undefined,
          objectives: story.objectives,
        },
      };

      const conversation = await chatService.createConversation(payload);

      // Redirecionar para o chat
      navigate(`/chat/${conversation.id}`);
    } catch (err) {
      console.error('Error starting story:', err);
      setError(t('story:errors.failedToStart', 'Failed to start story'));
      setIsStarting(false);
    }
  };

  const buildStoryContext = (story: Story): string => {
    let context = `STORY: ${story.title}\n\n`;

    if (story.synopsis) {
      context += `SYNOPSIS:\n${story.synopsis}\n\n`;
    }

    if (story.objectives && story.objectives.length > 0) {
      context += `OBJECTIVES:\n`;
      story.objectives.forEach((obj, index) => {
        context += `${index + 1}. ${obj.description}\n`;
      });
      context += '\n';
    }

    if (story.initialText) {
      context += `INITIAL SCENE:\n${story.initialText}\n\n`;
    }

    context += `CHARACTERS IN THIS STORY:\n`;
    story.characters?.forEach(char => {
      context += `- ${char.firstName} ${char.lastName || ''}\n`;
    });

    context += `\nIMPORTANT: You are participating in an interactive story. Stay in character and respond according to the story context and objectives above.`;

    return context;
  };

  if (isLoading) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="text-center text-muted">{t('common:loading', 'Loading...')}</div>
      </div>
    );
  }

  if (error || !story) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="text-center text-red-500">{error || t('story:errors.notFound', 'Story not found')}</div>
        <div className="text-center mt-4">
          <Button onClick={() => navigate('/stories')}>
            {t('common:back', 'Back')}
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8 max-w-4xl">
      {/* Header */}
      <div className="mb-6">
        <button
          onClick={() => navigate('/stories')}
          className="text-primary hover:text-primary/80 mb-4 flex items-center gap-2"
        >
          <span className="material-symbols-outlined">arrow_back</span>
          {t('common:back', 'Back')}
        </button>
      </div>

      {/* Cover Image */}
      {story.coverImage && (
        <div className="w-full aspect-video mb-6 rounded-lg overflow-hidden">
          <img
            src={story.coverImage}
            alt={story.title}
            className="w-full h-full object-cover"
          />
        </div>
      )}

      {/* Story Info */}
      <div className="bg-card rounded-lg shadow-lg p-6 mb-6">
        <div className="flex items-start justify-between mb-4">
          <div className="flex-1">
            <h1 className="text-3xl font-bold text-title mb-2">{story.title}</h1>
            <div className="flex items-center gap-4 text-sm text-muted">
              <span>
                {story.isPublic
                  ? t('story:list.public', 'Public')
                  : t('story:list.private', 'Private')}
              </span>
              {story.ageRating && (
                <span className="px-2 py-1 bg-gray-200 dark:bg-gray-700 rounded">
                  {story.ageRating}
                </span>
              )}
            </div>
          </div>
          <Button
            icon="play_arrow"
            onClick={handleStartStory}
            disabled={isStarting}
            size="large"
          >
            {isStarting ? t('story:starting', 'Starting...') : t('story:start', 'Start Story')}
          </Button>
        </div>

        {story.synopsis && (
          <div className="mb-6">
            <h2 className="text-xl font-semibold text-content mb-2">
              {t('story:detail.synopsis', 'Synopsis')}
            </h2>
            <p className="text-muted whitespace-pre-wrap">{story.synopsis}</p>
          </div>
        )}

        {story.initialText && (
          <div className="mb-6">
            <h2 className="text-xl font-semibold text-content mb-2">
              {t('story:detail.initialScene', 'Opening Scene')}
            </h2>
            <p className="text-muted whitespace-pre-wrap">{story.initialText}</p>
          </div>
        )}

        {story.objectives && story.objectives.length > 0 && (
          <div className="mb-6">
            <h2 className="text-xl font-semibold text-content mb-2">
              {t('story:detail.objectives', 'Story Objectives')}
            </h2>
            <ul className="space-y-2">
              {story.objectives.map((obj, index) => (
                <li key={index} className="flex items-start gap-2">
                  <span className="material-symbols-outlined text-primary mt-1">
                    {obj.completed ? 'check_circle' : 'radio_button_unchecked'}
                  </span>
                  <span className="text-muted">{obj.description}</span>
                </li>
              ))}
            </ul>
          </div>
        )}

        {story.characters && story.characters.length > 0 && (
          <div>
            <h2 className="text-xl font-semibold text-content mb-3">
              {t('story:detail.characters', 'Characters')}
            </h2>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
              {story.characters.map(character => (
                <div
                  key={character.id}
                  className="flex items-center gap-3 p-3 bg-light rounded-lg"
                >
                  {character.avatar ? (
                    <img
                      src={character.avatar}
                      alt={character.firstName}
                      className="w-12 h-12 rounded-full object-cover"
                    />
                  ) : (
                    <div className="w-12 h-12 rounded-full bg-gray-300 dark:bg-gray-600 flex items-center justify-center">
                      <span className="text-lg font-semibold">
                        {character.firstName[0]}
                      </span>
                    </div>
                  )}
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-content truncate">
                      {character.firstName} {character.lastName || ''}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
