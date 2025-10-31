import { useMemo, useState, useEffect, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate, useParams } from 'react-router-dom';
import { Button } from '../../../components/ui/Button';
import { CachedImage } from '../../../components/ui/CachedImage';
import { Tag as UITag } from '../../../components/ui';
import { useCharacterMutations, useCharacterQuery } from '../shared/hooks/useCharacterQueries';
import { chatService } from '../../../services/chatService';
import { useAuth } from '../../../hooks/useAuth';
import { usePageHeader } from '../../../hooks/usePageHeader';
import { characterStatsService, type CharacterStats } from '../../../services/characterStatsService';
import { FavoriteButton } from '../../../components/ui/FavoriteButton';

export default function CharacterDetailPage(): JSX.Element {
  const { t } = useTranslation(['characters', 'common']);
  const navigate = useNavigate();
  const params = useParams<{ characterId: string }>();
  const characterId = params.characterId ?? '';
  const { user } = useAuth();
  const { setTitle } = usePageHeader();

  const { data, isLoading, isError } = useCharacterQuery(characterId);
  const { deleteMutation } = useCharacterMutations();
  const [isStartingChat, setIsStartingChat] = useState(false);
  const [stats, setStats] = useState<CharacterStats | null>(null);
  const [isLoadingStats, setIsLoadingStats] = useState(false);

  // Collapsible description state - MUST be before any conditional returns
  const [isDescExpanded, setIsDescExpanded] = useState(false);
  const [isDescOverflowing, setIsDescOverflowing] = useState(false);
  const descRef = useRef<HTMLDivElement | null>(null);

  const fullName = useMemo(() => {
    if (!data) return '';
    const name = [data.firstName, data.lastName].filter(Boolean).join(' ');
    return name || t('characters:labels.untitledCharacter');
  }, [data, t]);

  const isOwner = useMemo(() => {
    return user?.id === data?.userId;
  }, [user, data]);

  // Get sample images (max 4)
  const sampleImages = useMemo(() => {
    if (!data?.images) return [];
    return data.images
      .filter(img => img.type === 'SAMPLE')
      .slice(0, 4);
  }, [data]);

  // Load character stats
  useEffect(() => {
    if (characterId) {
      setIsLoadingStats(true);
      characterStatsService
        .getStats(characterId)
        .then(setStats)
        .catch((error) => {
          console.error('[CharacterDetail] Failed to load stats', error);
        })
        .finally(() => {
          setIsLoadingStats(false);
        });
    }
  }, [characterId]);

  // Set page title
  useEffect(() => {
    setTitle(t('characters:hub.title', 'Characters'));
  }, [setTitle, t]);

  // Measure description overflow
  useEffect(() => {
    const measure = () => {
      const el = descRef.current;
      if (!el) return;
      // Measure after layout
      const overflowing = el.scrollHeight > el.clientHeight + 1;
      setIsDescOverflowing(overflowing);
    };
    measure();
    const onResize = () => setTimeout(measure, 0);
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, [data?.personality, data?.history, data?.physicalCharacteristics, isDescExpanded]);

  const handleDelete = async () => {
    if (!data) return;
    const confirmation = window.confirm(t('characters:detail.confirmDelete'));
    if (!confirmation) return;
    try {
      await deleteMutation.mutateAsync(data.id);
      navigate('/characters');
    } catch (error) {
      console.error('[CharacterDetail] remove failed', error);
    }
  };

  const handleShare = () => {
    const url = window.location.href;
    if (navigator.share) {
      navigator.share({
        title: fullName,
        text: data?.personality || '',
        url: url,
      }).catch(() => {
        navigator.clipboard.writeText(url);
        alert(t('common:messages.linkCopied'));
      });
    } else {
      navigator.clipboard.writeText(url);
      alert(t('common:messages.linkCopied'));
    }
  };

  const handleStartChat = async () => {
    if (!data) return;
    setIsStartingChat(true);
    try {
      const conversation = await chatService.createConversation({
        title: `${t('common:chat.with')} ${fullName}`,
        participantIds: [data.id],
      });
      navigate(`/chat/${conversation.id}`);
    } catch (error) {
      console.error('[CharacterDetail] Failed to start chat', error);
      alert(t('common:errors.generic'));
    } finally {
      setIsStartingChat(false);
    }
  };

  const resolveGenderIcon = (raw?: string | null): string => {
    const g = (raw || '').trim().toLowerCase();
    if (!g) return 'person';
    if (['female', 'feminino', 'mulher', 'fêmea', 'femea', 'woman'].includes(g)) return 'female';
    if (['male', 'masculino', 'homem', 'macho', 'man'].includes(g)) return 'male';
    if (['non-binary', 'nonbinary', 'não-binário', 'nao-binario', 'genderqueer', 'outro', 'other'].includes(g)) return 'transgender';
    return 'person';
  };

  const resolveSpeciesIcon = (raw?: string | null): string => {
    const s = (raw || '').trim().toLowerCase();
    if (!s) return 'person';
    if (s.includes('human') || s.includes('humano') || s.includes('humana')) return 'person';
    const animalRegex = /(animal|beast|cat|dog|wolf|fox|lion|tiger|bear|bird|dragon|horse|rodent|bunny|rabbit|fox)/;
    if (animalRegex.test(s)) return 'pets';
    const hybridRegex = /(half|meio|demi|hybrid|meio\s+animal)/;
    if (hybridRegex.test(s) && animalRegex.test(s)) return 'pets';
    return 'person';
  };

  if (isLoading) {
    return (
      <section className="flex h-[60vh] flex-col items-center justify-center gap-3 text-muted">
        <span className="material-symbols-outlined animate-spin text-5xl">progress_activity</span>
        <p>{t('characters:detail.states.loading')}</p>
      </section>
    );
  }

  if (isError || !data) {
    return (
      <section className="flex h-[60vh] flex-col items-center justify-center gap-3 text-muted">
        <span className="material-symbols-outlined text-5xl text-danger">error</span>
        <p>{t('characters:detail.states.notFound')}</p>
        <Button type="button" onClick={() => navigate('/characters')} icon="arrow_back">
          {t('characters:detail.actions.backToHub')}
        </Button>
      </section>
    );
  }

  return (
    <>
      {/* Main content */}
      <div className="-mx-4 -mt-8 md:mx-auto md:mt-0 md:max-w-7xl">
        <div className="grid gap-0 md:gap-6 lg:grid-cols-[420px_1fr]">
          {/* Left side - Character card */}
          <div className="w-full space-y-4 md:w-full">
            {/* Character image with overlay stats */}
            <div className="relative overflow-hidden rounded-none bg-card shadow-lg md:rounded-2xl">
              <div className="relative h-[50vh] md:aspect-[2/3] md:h-auto">
                {(() => { const cov = (data.images || []).find((i:any)=>i.type==='COVER')?.url; return cov || data.avatar; })() ? (
                  <CachedImage
                    src={(data.images || []).find((i:any)=>i.type==='COVER')?.url || data.avatar || ''}
                    alt={fullName}
                    className="h-full w-full object-cover"
                  />
                ) : (
                  <div className="flex h-full w-full items-center justify-center bg-gradient-to-br from-primary/20 to-secondary/20">
                    <span className="material-symbols-outlined text-9xl text-muted/30">person</span>
                  </div>
                )}

                {/* Gradient fade overlay - darkens bottom */}
                <div className="pointer-events-none absolute inset-0 bg-gradient-to-b from-transparent via-transparent to-black/40" />

                {/* Favorite button - top right */}
                <FavoriteButton
                  characterId={characterId}
                  initialIsFavorited={Boolean(stats?.isFavoritedByUser)}
                  onToggle={(fav) => {
                    // Keep local stats in sync if we have them
                    setStats((prev) => prev ? {
                      ...prev,
                      isFavoritedByUser: fav,
                      favoriteCount: prev.favoriteCount + (fav ? 1 : -1)
                    } : prev);
                  }}
                  className="absolute top-4 right-4"
                />

                {/* Stats overlay - bottom - Hidden on mobile */}
                <div className="absolute bottom-4 left-4 right-4 z-10 hidden gap-3 md:flex">
                  <div className="flex flex-1 items-center justify-center gap-2 rounded-full bg-white/20 px-4 py-3 backdrop-blur-sm">
                    <span className="material-symbols-outlined text-xl text-content">chat</span>
                    <span className="text-lg font-semibold text-content">
                      {isLoadingStats ? '...' : characterStatsService.formatCount(stats?.conversationCount || 0)}
                    </span>
                  </div>
                  <div className="flex flex-1 items-center justify-center gap-2 rounded-full bg-white/20 px-4 py-3 backdrop-blur-sm">
                    <span className="material-symbols-outlined text-xl text-content">favorite</span>
                    <span className="text-lg font-semibold text-content">
                      {isLoadingStats ? '...' : characterStatsService.formatCount(stats?.favoriteCount || 0)}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Right side - Character info */}
          <div className="relative z-10 -mt-12 space-y-4 md:mt-0">
            {/* Title and stats */}
            <div className="mx-0 rounded-2xl bg-card p-6 shadow-lg">
              <div className="mb-4 flex items-start justify-between gap-4">
                <h1 className="text-3xl font-bold text-title lg:text-4xl">
                  {fullName}
                </h1>
                <div className="flex items-center gap-2">
                  <button
                    onClick={handleShare}
                    className="flex h-10 w-10 items-center justify-center rounded-lg text-content transition-colors hover:bg-input hover:text-primary"
                    aria-label="Share character"
                  >
                    <span className="material-symbols-outlined text-xl">share</span>
                  </button>
                  {isOwner && (
                    <>
                      <button
                        onClick={() => navigate(`/characters/${data.id}/edit`)}
                        className="flex h-10 w-10 items-center justify-center rounded-lg text-content transition-colors hover:bg-input hover:text-primary"
                        aria-label="Edit character"
                      >
                        <span className="material-symbols-outlined text-xl">edit</span>
                      </button>
                      <button
                        onClick={handleDelete}
                        disabled={deleteMutation.isPending}
                        className="flex h-10 w-10 items-center justify-center rounded-lg text-danger transition-colors hover:bg-danger/10 disabled:opacity-50"
                        aria-label="Delete character"
                      >
                        <span className="material-symbols-outlined text-xl">delete</span>
                      </button>
                    </>
                  )}
                </div>
              </div>

              {/* Stats row */}
              <div className="mb-6 grid grid-cols-2 gap-4">
                <div>
                  <div className="text-2xl font-bold text-content">
                    {isLoadingStats ? '...' : (stats?.conversationCount || 0).toLocaleString()}
                  </div>
                  <div className="text-sm text-muted">{t('characters:stats.conversations')}</div>
                </div>
                <div>
                  <div className="text-2xl font-bold text-content">
                    {isLoadingStats ? '...' : (stats?.favoriteCount || 0).toLocaleString()}
                  </div>
                  <div className="text-sm text-muted">{t('characters:stats.favorites')}</div>
                </div>
              </div>

              {/* Start chat button */}
              <Button
                type="button"
                variant="primary"
                icon="chat"
                onClick={handleStartChat}
                disabled={isStartingChat}
                className="w-full !rounded-xl !bg-gradient-to-r !from-pink-500 !to-purple-600 !py-4 text-lg font-semibold !text-white shadow-lg transition-all hover:shadow-xl"
              >
                {isStartingChat
                  ? t('characters:detail.actions.startingChat')
                  : t('characters:detail.actions.startChat')}
              </Button>
            </div>            

            {/* Gallery thumbnails - Only show if sample images exist */}
            {sampleImages.length > 0 && (
              <div className="mx-0 rounded-2xl bg-card p-4 shadow-lg">
                <h3 className="mb-3 text-sm font-semibold text-title">
                  {t('characters:detail.sampleImages', 'Sample Images')}
                </h3>
                <div className="grid grid-cols-4 gap-2">
                  {sampleImages.map((img, i) => (
                    <div
                      key={img.id}
                      className="relative aspect-square overflow-hidden rounded-lg bg-gradient-to-br from-primary/20 to-secondary/20 transition-transform hover:scale-105"
                    >
                      <CachedImage
                        src={img.url}
                        alt={img.description || `${fullName} sample ${i + 1}`}
                        className="h-full w-full object-cover"
                      />
                    </div>
                  ))}
                </div>
              </div>
            )}

              {/* Introduction */}
              <div className="mx-0 rounded-2xl bg-card p-6 shadow-lg">
                <h2 className="mb-4 text-xl font-semibold text-title">{t('characters:detail.sections.introduction')}</h2>

              {/* Tags */}
              <div className="mb-4 flex flex-wrap gap-2">
                {/* Age rating badge */}
                <UITag
                  label={t(`characters:ageRatings.${data.ageRating}`)}
                  icon={<span className="material-symbols-outlined text-sm">verified</span>}
                  tone="success"
                  selected
                  disabled
                />

                {/* Content tags */}
                {data.contentTags && data.contentTags.length > 0 && data.contentTags.map((ct) => {
                  const isNsfw = ct === 'SEXUAL' || ct === 'NUDITY';
                  return (
                    <UITag
                      key={ct}
                      label={t(`characters:contentTags.${ct}`)}
                      tone={isNsfw ? 'nsfw' : 'info'}
                      disabled
                    />
                  );
                })}
               
                {/* Gender and species */}
                {data.gender && (
                  <UITag
                    label={data.gender}
                    tone="warning"
                    icon={<span className="material-symbols-outlined text-sm">{resolveGenderIcon(data.gender)}</span>}
                    disabled
                  />
                )}
                {data.species && (
                  <UITag
                    label={data.species}
                    tone="warning"
                    icon={<span className="material-symbols-outlined text-sm">{resolveSpeciesIcon(data.species)}</span>}
                    disabled
                  />
                )}

                {/* Regular tags */}
                {data.tags && data.tags.length > 0 && data.tags.map((tag) => (
                  <UITag
                    key={tag.id}
                    label={t('tags-character:' + tag.name + '.name', tag.name)}
                    title={t('tags-character:' + tag.name + '.description', '')}
                    tone={tag.ageRating === 'EIGHTEEN' ? 'nsfw' : 'default'}
                    icon={<span className="material-symbols-outlined text-sm">sell</span>}
                    disabled
                  />
                ))}

              </div>

              {/* Description box with collapsible behavior */}
              <div className="relative rounded-2xl bg-gradient-to-br from-purple-100 to-pink-100 p-6 dark:from-purple-900/30 dark:to-pink-900/30">
                <div
                  ref={descRef}
                  className={
                    isDescExpanded
                      ? 'space-y-4 text-sm leading-relaxed pr-0'
                      : 'space-y-4 text-sm leading-relaxed max-h-56 overflow-hidden pr-0'
                  }
                >
                  {data.personality && (
                    <div>
                      <p className="italic text-content/90">"{data.personality}"</p>
                    </div>
                  )}

                  {data.history && (
                    <div>
                      <p className="whitespace-pre-line text-content/80">{data.history}</p>
                    </div>
                  )}

                  {data.physicalCharacteristics && (
                    <div>
                      <p className="text-content/80">{data.physicalCharacteristics}</p>
                    </div>
                  )}
                </div>

                {/* Fade gradient overlay when collapsed and overflowing */}
                {!isDescExpanded && isDescOverflowing && (
                  <div className="pointer-events-none absolute inset-x-0 bottom-12 h-16 bg-gradient-to-b from-transparent to-card/80 dark:to-card/70" />
                )}

                {/* Toggle button */}
                {isDescOverflowing || isDescExpanded ? (
                  <button
                    type="button"
                    onClick={() => setIsDescExpanded((v) => !v)}
                    className="mt-4 flex items-center gap-1 text-sm font-medium text-primary hover:text-primary/80"
                  >
                    <span>
                      {isDescExpanded
                        ? t('common:seeLess', 'Ocultar texto')
                        : t('common:seeMore', 'Veja mais')}
                    </span>
                    <span className="material-symbols-outlined text-base">
                      {isDescExpanded ? 'expand_less' : 'expand_more'}
                    </span>
                  </button>
                ) : null}
              </div>
            </div>

            {/* Creator info */}
            <div className="mx-0 rounded-2xl bg-card/50 p-4">
              <div className="flex items-center gap-3">
                {data.creator?.avatarUrl ? (
                  <CachedImage
                    src={data.creator.avatarUrl}
                    alt={data.creator.displayName || 'Creator'}
                    className="h-10 w-10 rounded-full object-cover"
                  />
                ) : (
                  <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/20">
                    <span className="text-sm font-semibold text-primary">
                      {(data.creator?.displayName || 'U').charAt(0).toUpperCase()}
                    </span>
                  </div>
                )}
                <div className="flex-1">
                  <p className="text-sm text-muted">{t('characters:detail.labels.createdBy', 'Created by')}</p>
                  <p className="font-medium text-content">{data.creator?.displayName || t('common:anonymousUser', 'Anonymous')}</p>
                </div>
                <div className="text-right">
                  <p className="text-sm text-muted">{new Date(data.createdAt).toLocaleDateString()}</p>
                </div>
              </div>
            </div>

            {/* Update notes */}
            <div className="mx-0 rounded-2xl bg-card p-6 shadow-lg">
              <div className="mb-2 flex items-center justify-between">
                <h2 className="text-xl font-semibold text-title">{t('characters:detail.sections.updateNotes')}</h2>
                <button
                  type="button"
                  onClick={() => navigate(`/characters/${data.id}/edit`)}
                  className="text-sm font-medium text-primary hover:text-primary/80"
                >
                  {t('common:seeMoreArrow', 'Veja mais →')}
                </button>
              </div>
              <div className="space-y-2 text-sm text-content">
                <div className="flex items-start gap-2">
                  <span className="text-primary">•</span>
                  <span>{t('characters:detail.labels.updatedAt')} {new Date(data.updatedAt).toLocaleDateString()}</span>
              </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
