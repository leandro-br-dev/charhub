import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../../../hooks/useAuth';
import { Button, Avatar } from '../../../components/ui';
import { Tag as UITag } from '../../../components/ui/Tag';
import { CachedImage } from '../../../components/ui/CachedImage';
import { storyService } from '../../../services/storyService';
import { chatService } from '../../../services/chatService';
import type { Story } from '../../../types/story';
import type { CreateConversationPayload } from '../../../types/chat';
import { usePageHeader } from '../../../hooks/usePageHeader';
import { useToast } from '../../../contexts/ToastContext';

export function StoryDetailPage() {
  const { storyId } = useParams<{ storyId: string }>();
  const navigate = useNavigate();
  const { t } = useTranslation(['story', 'common', 'characters']);
  const { user } = useAuth();
  const { addToast } = useToast();
  const [story, setStory] = useState<Story | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isStarting, setIsStarting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { setTitle } = usePageHeader();

  const isOwner = user?.id === story?.authorId;

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

  // Set page title
  useEffect(() => {
    if (story) {
      setTitle(story.title);
    } else {
      setTitle(t('story:detail.title', 'Story'));
    }
  }, [story, setTitle, t]);

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
          storyContext,
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

  const handleEdit = () => {
    if (story) {
      navigate(`/stories/${story.id}/edit`);
    }
  };

  const handleDelete = async () => {
    if (!story) return;
    if (!window.confirm(t('story:detail.confirmDelete', 'Are you sure you want to delete this story? This action cannot be undone.'))) {
      return;
    }

    try {
      await storyService.remove(story.id);
      navigate('/stories');
    } catch (err) {
      console.error('Error deleting story:', err);
      setError(t('story:errors.deleteFailed', 'Failed to delete story'));
    }
  };

  const handleShare = () => {
    if (!story) return;
    const url = window.location.href;
    navigator.clipboard.writeText(url).then(() => {
      addToast(t('common:messages.linkCopied'), 'success');
    });
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
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="text-center text-muted">
          <span className="material-symbols-outlined animate-spin text-4xl mb-2">progress_activity</span>
          <p>{t('common:loading', 'Loading...')}</p>
        </div>
      </div>
    );
  }

  if (error || !story) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="text-center">
          <span className="material-symbols-outlined text-6xl text-danger mb-4">error</span>
          <p className="text-danger mb-4">{error || t('story:errors.notFound', 'Story not found')}</p>
          <Button onClick={() => navigate('/stories')}>
            {t('common:back', 'Back to Stories')}
          </Button>
        </div>
      </div>
    );
  }

  return (
    <>
      {/* Main content */}
      <div className="-mx-4 -mt-8 md:mx-auto md:mt-0 md:max-w-7xl">
        <div className="grid gap-0 md:gap-6 lg:grid-cols-[420px_1fr]">
          {/* Left side - Cover image */}
          <div className="w-full space-y-4 md:w-full">
            {/* Cover image */}
            <div className="relative overflow-hidden rounded-none bg-card shadow-lg md:rounded-2xl">
              <div className="relative h-[50vh] md:aspect-[2/3] md:h-auto">
                {story.coverImage ? (
                  <CachedImage
                    src={story.coverImage}
                    alt={story.title}
                    className="h-full w-full object-cover"
                  />
                ) : (
                  <div className="flex h-full w-full items-center justify-center bg-gradient-to-br from-primary/20 to-secondary/20">
                    <span className="material-symbols-outlined text-9xl text-primary/40">book</span>
                  </div>
                )}

                {/* Age rating badge - top left */}
                <div className="absolute left-4 top-4 z-10">
                  <UITag
                    label={story.ageRating}
                    icon={<span className="material-symbols-outlined text-sm">verified</span>}
                    tone="success"
                    selected
                    disabled
                  />
                </div>

                {/* Visibility badge - top right */}
                <div className="absolute right-4 top-4 z-10">
                  <UITag
                    label={story.visibility ? t('story:list.public') : t('story:list.private')}
                    icon={<span className="material-symbols-outlined text-sm">{story.visibility ? 'public' : 'lock'}</span>}
                    tone={story.visibility ? 'info' : 'warning'}
                    selected
                    disabled
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Right side - Story info */}
          <div className="relative z-10 -mt-12 space-y-4 md:mt-0">
            {/* Title and action buttons */}
            <div className="mx-4 rounded-2xl bg-card p-6 shadow-lg md:mx-0">
              <div className="mb-4 flex items-start justify-between gap-4">
                <h1 className="text-3xl font-bold text-title lg:text-4xl">
                  {story.title}
                </h1>
                <div className="flex items-center gap-2">
                  <button
                    onClick={handleShare}
                    className="flex h-10 w-10 items-center justify-center rounded-lg text-content transition-colors hover:bg-input hover:text-primary"
                    aria-label="Share story"
                  >
                    <span className="material-symbols-outlined text-xl">share</span>
                  </button>
                  {isOwner && (
                    <>
                      <button
                        onClick={handleEdit}
                        className="flex h-10 w-10 items-center justify-center rounded-lg text-content transition-colors hover:bg-input hover:text-primary"
                        aria-label="Edit story"
                      >
                        <span className="material-symbols-outlined text-xl">edit</span>
                      </button>
                      <button
                        onClick={handleDelete}
                        className="flex h-10 w-10 items-center justify-center rounded-lg text-danger transition-colors hover:bg-danger/10"
                        aria-label="Delete story"
                      >
                        <span className="material-symbols-outlined text-xl">delete</span>
                      </button>
                    </>
                  )}
                </div>
              </div>

              {/* Start story button */}
              <Button
                type="button"
                variant="primary"
                icon="play_arrow"
                onClick={handleStartStory}
                disabled={isStarting}
                className="w-full !rounded-xl !bg-gradient-to-r !from-pink-500 !to-purple-600 !py-4 text-lg font-semibold !text-white shadow-lg transition-all hover:shadow-xl"
              >
                {isStarting
                  ? t('story:starting')
                  : t('story:start')}
              </Button>
            </div>

            {/* Author info */}
            {story.author && (
              <div className="mx-4 rounded-2xl bg-card/50 p-4 md:mx-0">
                <div className="flex items-center gap-3">
                  {story.author.avatarUrl ? (
                    <CachedImage
                      src={story.author.avatarUrl}
                      alt={story.author.displayName || 'Author'}
                      className="h-10 w-10 rounded-full object-cover"
                    />
                  ) : (
                    <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/20">
                      <span className="text-sm font-semibold text-primary">
                        {(story.author.displayName || 'U').charAt(0).toUpperCase()}
                      </span>
                    </div>
                  )}
                  <div className="flex-1">
                    <p className="text-sm text-muted">{t('story:detail.labels.createdBy', 'Created by')}</p>
                    <p className="font-medium text-content">{story.author.displayName || t('common:anonymousUser', 'Anonymous')}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-sm text-muted">{new Date(story.createdAt).toLocaleDateString()}</p>
                  </div>
                </div>
              </div>
            )}

            {/* Synopsis */}
            {story.synopsis && (
              <div className="mx-4 rounded-2xl bg-card p-6 shadow-lg md:mx-0">
                <h2 className="mb-4 text-xl font-semibold text-title">
                  {t('story:detail.synopsis')}
                </h2>
                <p className="whitespace-pre-wrap text-content">{story.synopsis}</p>
              </div>
            )}

            {/* Initial Scene */}
            {story.initialText && (
              <div className="mx-4 rounded-2xl bg-card p-6 shadow-lg md:mx-0">
                <h2 className="mb-4 text-xl font-semibold text-title">
                  {t('story:detail.initialScene')}
                </h2>
                <p className="whitespace-pre-wrap text-content">{story.initialText}</p>
              </div>
            )}

            {/* Objectives */}
            {story.objectives && story.objectives.length > 0 && (
              <div className="mx-4 rounded-2xl bg-card p-6 shadow-lg md:mx-0">
                <h2 className="mb-4 text-xl font-semibold text-title">
                  {t('story:detail.objectives')}
                </h2>
                <ul className="space-y-3">
                  {story.objectives.map((obj, index) => (
                    <li key={index} className="flex items-start gap-3">
                      <span className="material-symbols-outlined text-primary mt-0.5">
                        {obj.completed ? 'check_circle' : 'radio_button_unchecked'}
                      </span>
                      <span className="flex-1 text-content">{obj.description}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {/* Characters */}
            {story.characters && story.characters.length > 0 && (
              <div className="mx-4 rounded-2xl bg-card p-6 shadow-lg md:mx-0">
                <h2 className="mb-4 text-xl font-semibold text-title">
                  {t('story:detail.characters')}
                </h2>
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                  {story.characters.map(character => {
                    const displayName = character.lastName
                      ? `${character.firstName} ${character.lastName}`
                      : character.firstName;

                    return (
                      <div
                        key={character.id}
                        onClick={() => navigate(`/characters/${character.id}`)}
                        className="flex cursor-pointer items-center gap-3 rounded-lg bg-light p-4 transition-colors hover:bg-input"
                      >
                        {character.avatar ? (
                          <CachedImage
                            src={character.avatar}
                            alt={displayName}
                            className="h-12 w-12 rounded-full object-cover"
                          />
                        ) : (
                          <div className="flex h-12 w-12 items-center justify-center rounded-full bg-primary/20">
                            <span className="text-lg font-semibold text-primary">
                              {character.firstName[0]}
                            </span>
                          </div>
                        )}
                        <div className="flex-1 min-w-0">
                          <p className="font-medium text-content truncate">
                            {displayName}
                          </p>
                        </div>
                        <span className="material-symbols-outlined text-muted">arrow_forward</span>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Content Tags */}
            {story.contentTags && story.contentTags.length > 0 && (
              <div className="mx-4 rounded-2xl bg-card p-6 shadow-lg md:mx-0">
                <h2 className="mb-4 text-xl font-semibold text-title">
                  {t('characters:detail.sections.contentTags', 'Content Warnings')}
                </h2>
                <div className="flex flex-wrap gap-2">
                  {story.contentTags.map((tag) => {
                    const isNsfw = tag === 'SEXUAL' || tag === 'NUDITY';
                    return (
                      <UITag
                        key={tag}
                        label={t(`characters:contentTags.${tag}`)}
                        tone={isNsfw ? 'danger' : 'warning'}
                        disabled
                      />
                    );
                  })}
                </div>
              </div>
            )}

            {/* Tags */}
            {story.tags && story.tags.length > 0 && (
              <div className="mx-4 rounded-2xl bg-card p-6 shadow-lg md:mx-0">
                <h2 className="mb-4 text-xl font-semibold text-title">
                  {t('common:tags', 'Tags')}
                </h2>
                <div className="flex flex-wrap gap-2">
                  {story.tags.map((tag) => (
                    <UITag
                      key={tag.id}
                      label={tag.name}
                      tone="info"
                      disabled
                    />
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </>
  );
}
