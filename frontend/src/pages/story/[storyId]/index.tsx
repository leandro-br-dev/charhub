import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../../../hooks/useAuth';
import { Button, Avatar } from '../../../components/ui';
import { Tag as UITag } from '../../../components/ui/Tag';
import { CachedImage } from '../../../components/ui/CachedImage';
import { FavoriteButton } from '../../../components/ui/FavoriteButton';
import { storyService } from '../../../services/storyService';
import { storyStatsService, type StoryStats } from '../../../services/storyStatsService';
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
  const [stats, setStats] = useState<StoryStats | null>(null);
  const [isLoadingStats, setIsLoadingStats] = useState(false);
  const { setTitle } = usePageHeader();

  const isOwner = user?.id === story?.authorId;

  // Format age rating for display (e.g., "SIXTEEN" -> "16+")
  const formatAgeRating = (rating: string): string => {
    const ageMap: Record<string, string> = {
      'C': 'C+',
      'L': 'L+',
      'FO': '14+',
      'SIXTEEN': '16+',
      'EIGHTEEN': '18+',
    };
    return ageMap[rating] || rating;
  };

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

  // Load story stats
  useEffect(() => {
    if (storyId) {
      setIsLoadingStats(true);
      storyStatsService
        .getStats(storyId)
        .then(setStats)
        .catch((error) => {
          console.error('[StoryDetail] Failed to load stats', error);
        })
        .finally(() => {
          setIsLoadingStats(false);
        });
    }
  }, [storyId]);

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
    if (navigator.share) {
      navigator.share({
        title: story.title,
        text: story.synopsis || '',
        url: url,
      }).catch(() => {
        navigator.clipboard.writeText(url);
        addToast(t('common:messages.linkCopied'), 'success');
      });
    } else {
      navigator.clipboard.writeText(url);
      addToast(t('common:messages.linkCopied'), 'success');
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
            {/* Cover image with overlay stats */}
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

                {/* Gradient fade overlay - darkens bottom */}
                <div className="pointer-events-none absolute inset-0 bg-gradient-to-b from-transparent via-transparent to-black/40" />

                {/* Favorite button - top right */}
                <FavoriteButton
                  storyId={story.id}
                  initialIsFavorited={Boolean(stats?.isFavoritedByUser)}
                  onToggle={(fav) => {
                    setStats((prev) => prev ? {
                      ...prev,
                      isFavoritedByUser: fav,
                      favoriteCount: prev.favoriteCount + (fav ? 1 : -1)
                    } : prev);
                  }}
                  className="absolute top-4 right-4"
                />

                {/* Age rating badge - top left */}
                <div className="absolute left-4 top-4 z-10">
                  <UITag
                    label={formatAgeRating(story.ageRating)}
                    icon={<span className="material-symbols-outlined text-sm">verified</span>}
                    tone="success"
                    selected
                    disabled
                    className="h-8"
                  />
                </div>

                {/* Stats overlay - bottom - Hidden on mobile */}
                <div className="absolute bottom-4 left-4 right-4 z-10 hidden gap-3 md:flex">
                  <div className="flex flex-1 items-center justify-center gap-2 rounded-full bg-white/20 px-4 py-3 backdrop-blur-sm">
                    <span className="material-symbols-outlined text-xl text-content">chat</span>
                    <span className="text-lg font-semibold text-content">
                      {isLoadingStats ? '...' : storyStatsService.formatCount(stats?.conversationCount || 0)}
                    </span>
                  </div>
                  <div className="flex flex-1 items-center justify-center gap-2 rounded-full bg-white/20 px-4 py-3 backdrop-blur-sm">
                    <span className="material-symbols-outlined text-xl text-content">favorite</span>
                    <span className="text-lg font-semibold text-content">
                      {isLoadingStats ? '...' : storyStatsService.formatCount(stats?.favoriteCount || 0)}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Right side - Story info */}
          <div className="relative z-10 -mt-12 space-y-4 md:mt-0">
            {/* Title and stats */}
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

              {/* Tags */}
              <div className="mb-6 flex flex-wrap gap-2">
                {/* Age rating badge */}
                <UITag
                  label={formatAgeRating(story.ageRating)}
                  icon={<span className="material-symbols-outlined text-sm">verified</span>}
                  tone="success"
                  selected
                  disabled
                  className="h-8"
                />

                {/* Content tags */}
                {story.contentTags && story.contentTags.length > 0 && story.contentTags.map((tag) => {
                  const isNsfw = tag === 'SEXUAL' || tag === 'NUDITY';
                  return (
                    <UITag
                      key={tag}
                      label={t(`characters:contentTags.${tag}`)}
                      tone={isNsfw ? 'danger' : 'warning'}
                      selected
                      disabled
                      className="h-8"
                    />
                  );
                })}

                {/* Story genre tags */}
                {story.tags && story.tags.length > 0 && story.tags.map((tag) => (
                  <UITag
                    key={tag.id}
                    label={tag.name}
                    selected
                    icon={<span className="material-symbols-outlined text-sm">sell</span>}
                    disabled
                    className="h-8"
                  />
                ))}
              </div>

              {/* Stats row */}
              <div className="mb-6 grid grid-cols-2 gap-4">
                <div>
                  <div className="text-2xl font-bold text-content">
                    {isLoadingStats ? '...' : (stats?.conversationCount || 0).toLocaleString()}
                  </div>
                  <div className="text-sm text-muted">{t('story:stats.conversations', 'Conversations')}</div>
                </div>
                <div>
                  <div className="text-2xl font-bold text-content">
                    {isLoadingStats ? '...' : (stats?.favoriteCount || 0).toLocaleString()}
                  </div>
                  <div className="text-sm text-muted">{t('story:stats.favorites', 'Favorites')}</div>
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

            {/* Synopsis */}
            {story.synopsis && (
              <div className="mx-4 rounded-2xl bg-card p-6 shadow-lg md:mx-0">
                <h2 className="mb-4 text-xl font-semibold text-title">
                  {t('story:detail.synopsis')}
                </h2>
                <p className="whitespace-pre-wrap text-content">{story.synopsis}</p>
              </div>
            )}

            {/* Characters */}
            {story.characters && story.characters.length > 0 && (
              <div className="mx-4 rounded-2xl bg-card p-4 shadow-lg md:mx-0">
                <h2 className="mb-3 text-lg font-semibold text-title">
                  {t('story:detail.characters')}
                </h2>
                <div className="flex flex-wrap gap-2">
                  {story.characters
                    .sort((a, b) => {
                      // Main character first
                      if (a.role === 'MAIN') return -1;
                      if (b.role === 'MAIN') return 1;
                      return 0;
                    })
                    .map(character => {
                    const displayName = character.lastName
                      ? `${character.firstName} ${character.lastName}`
                      : character.firstName;
                    const isMain = character.role === 'MAIN';

                    return (
                      <div
                        key={character.id}
                        onClick={() => navigate(`/characters/${character.id}`)}
                        className={`group flex cursor-pointer items-center gap-2 rounded-full pl-1 pr-3 transition-colors hover:bg-input ${
                          isMain
                            ? 'bg-amber-50 dark:bg-amber-500/10'
                            : 'bg-light'
                        }`}
                      >
                        {isMain && (
                          <span className="material-symbols-outlined text-amber-500 text-sm">star</span>
                        )}
                        {character.avatar ? (
                          <CachedImage
                            src={character.avatar}
                            alt={displayName}
                            className="h-8 w-8 rounded-full object-cover"
                          />
                        ) : (
                          <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary/20">
                            <span className="text-xs font-semibold text-primary">
                              {character.firstName[0]}
                            </span>
                          </div>
                        )}
                        <span className="text-sm font-medium text-content group-hover:text-primary">
                          {displayName}
                        </span>
                      </div>
                    );
                  })}
                </div>
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

            {/* Author + Metadata (combined) */}
            {story.author && (
              <div className="mx-4 rounded-2xl bg-card p-6 shadow-lg md:mx-0">
                <div className="grid grid-cols-1 gap-6 md:grid-cols-2 md:items-start md:gap-8 md:divide-x md:divide-border">
                  {/* Creator info */}
                  <div className="flex items-center gap-3 md:pr-6 min-w-0">
                    {story.author.avatarUrl ? (
                      <CachedImage
                        src={story.author.avatarUrl}
                        alt={story.author.displayName || 'Author'}
                        className="h-12 w-12 rounded-full object-cover"
                      />
                    ) : (
                      <div className="flex h-12 w-12 items-center justify-center rounded-full bg-primary/20">
                        <span className="text-base font-semibold text-primary">
                          {(story.author.displayName || 'U').charAt(0).toUpperCase()}
                        </span>
                      </div>
                    )}
                    <div className="flex-1 min-w-0">
                      <p className="text-sm text-muted">{t('story:detail.labels.createdBy', 'Created by')}</p>
                      <p className="font-medium text-content truncate">{story.author.displayName || t('common:anonymousUser', 'Anonymous')}</p>
                    </div>
                  </div>

                  {/* Metadata (created/updated) */}
                  <div className="min-w-0 md:pl-6">
                    <div className="space-y-2 text-sm text-content">
                      <div className="flex items-start gap-2">
                        <span className="material-symbols-outlined text-base text-primary">event</span>
                        <span>
                          {t('characters:detail.labels.createdAt', 'Created')}: {new Date(story.createdAt).toLocaleDateString()}
                        </span>
                      </div>
                      <div className="flex items-start gap-2">
                        <span className="material-symbols-outlined text-base text-primary">update</span>
                        <span>
                          {t('characters:detail.labels.updatedAt', 'Updated')}: {new Date(story.updatedAt).toLocaleDateString()}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </>
  );
}
