import { useMemo, useState, useEffect, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate, useParams } from 'react-router-dom';
import { Button } from '../../../components/ui/Button';
import { CachedImage } from '../../../components/ui/CachedImage';
import { Tag as UITag, Dialog } from '../../../components/ui';
import { AgeRatingBadge } from '../../../components/ui/AgeRatingBadge';
import { useCharacterMutations, useCharacterQuery } from '../shared/hooks/useCharacterQueries';
import { chatService } from '../../../services/chatService';
import { useAuth } from '../../../hooks/useAuth';
import { useAdmin } from '../../../hooks/useAdmin';
import { usePageHeader } from '../../../hooks/usePageHeader';
import { characterStatsService, type CharacterStats } from '../../../services/characterStatsService';
import { FavoriteButton } from '../../../components/ui/FavoriteButton';
import { useToast } from '../../../contexts/ToastContext';

/**
 * CharHub Official user ID (UUID constant)
 * Characters owned by this user can only be edited by ADMINs
 */
const CHARHUB_OFFICIAL_ID = '00000000-0000-0000-0000-000000000001';

export default function CharacterDetailPage(): JSX.Element {
  const { t } = useTranslation(['characters', 'common', 'dashboard', 'species']);
  const navigate = useNavigate();
  const params = useParams<{ characterId: string }>();
  const characterId = params.characterId ?? '';
  const { user } = useAuth();
  const { isAdmin } = useAdmin();
  const { setTitle } = usePageHeader();

  const { data, isLoading, isError } = useCharacterQuery(characterId);
  const { deleteMutation } = useCharacterMutations();
  const [isStartingChat, setIsStartingChat] = useState(false);
  const [stats, setStats] = useState<CharacterStats | null>(null);
  const [isLoadingStats, setIsLoadingStats] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const { addToast } = useToast();

  // Collapsible description state - MUST be before any conditional returns
  const [isDescExpanded, setIsDescExpanded] = useState(false);
  const [isDescOverflowing, setIsDescOverflowing] = useState(false);
  const descRef = useRef<HTMLDivElement | null>(null);
  const coverRef = useRef<HTMLDivElement | null>(null);
  const [descMaxHeight, setDescMaxHeight] = useState<number | null>(null);

  const fullName = useMemo(() => {
    if (!data) return '';
    const name = [data.firstName, data.lastName].filter(Boolean).join(' ');
    return name || t('characters:labels.untitledCharacter');
  }, [data, t]);

  const isOwner = useMemo(() => {
    if (!user || !data) return false;
    // User is owner OR (user is ADMIN and character is official)
    return user.id === data.userId || (isAdmin && data.userId === CHARHUB_OFFICIAL_ID);
  }, [user, data, isAdmin]);

  // Get avatar and cover images (max 4)
  const galleryImages = useMemo(() => {
    if (!data?.images) return [];
    return data.images
      .filter(img => img.type === 'AVATAR' || img.type === 'COVER')
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

  // Keep description container max-height in sync with cover height (desktop)
  useEffect(() => {
    const updateForViewport = () => {
      const isDesktop = typeof window !== 'undefined' && window.innerWidth >= 768;
      if (!isDesktop) {
        setDescMaxHeight(null);
        return false;
      }
      return true;
    };

    const measureHeights = () => {
      const shouldMeasure = updateForViewport();
      if (!shouldMeasure) return;
      if (coverRef.current) {
        const rect = coverRef.current.getBoundingClientRect();
        setDescMaxHeight(Math.max(0, Math.round(rect.height)));
      }
    };

    const ro = (typeof ResizeObserver !== 'undefined' && coverRef.current)
      ? new ResizeObserver(() => measureHeights())
      : null;
    if (ro && coverRef.current) ro.observe(coverRef.current);

    measureHeights();
    window.addEventListener('resize', measureHeights);
    return () => {
      window.removeEventListener('resize', measureHeights);
      if (ro && coverRef.current) ro.unobserve(coverRef.current);
    };
  }, []);

  const handleDeleteClick = () => {
    setShowDeleteDialog(true);
  };

  const handleDeleteConfirm = async () => {
    if (!data) return;
    try {
      await deleteMutation.mutateAsync(data.id);
      addToast(t('common:messages.characterDeleted'), 'success');
      navigate('/characters');
    } catch (error) {
      console.error('[CharacterDetail] remove failed', error);
      addToast(t('characters:errors.deleteFailed'), 'error');
    } finally {
      setShowDeleteDialog(false);
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
        addToast(t('common:messages.linkCopied'), 'success');
      });
    } else {
      navigator.clipboard.writeText(url);
      addToast(t('common:messages.linkCopied'), 'success');
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
      addToast(t('common:errors.generic'), 'error');
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

  const resolveSpeciesIcon = (raw?: string | null | { name?: string }): string => {
    const s = typeof raw === 'string' ? raw : (raw?.name || '');
    const clean = s.trim().toLowerCase();
    if (!clean) return 'person';
    if (clean.includes('human') || clean.includes('humano') || clean.includes('humana')) return 'person';
    const animalRegex = /(animal|beast|cat|dog|wolf|fox|lion|tiger|bear|bird|dragon|horse|rodent|bunny|rabbit|fox)/;
    if (animalRegex.test(clean)) return 'pets';
    const hybridRegex = /(half|meio|demi|hybrid|meio\s+animal)/;
    if (hybridRegex.test(clean) && animalRegex.test(clean)) return 'pets';
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
              <div ref={coverRef} className="relative h-[50vh] md:aspect-[2/3] md:h-auto">
                {(() => { const cov = (data.images || []).find((i:any)=>i.type==='COVER' && i.isActive===true)?.url; return cov || data.avatar; })() ? (
                  <CachedImage
                    src={(data.images || []).find((i:any)=>i.type==='COVER' && i.isActive===true)?.url || data.avatar || ''}
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

                {/* Stats overlay - bottom - Visible on both mobile and desktop */}
                <div className="absolute bottom-16 left-4 right-4 z-20 flex gap-3 md:bottom-4">
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
                        onClick={handleDeleteClick}
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

              {/* Tags - right after name */}
              <div className="mb-6 flex flex-wrap gap-2">
                {/* Age rating badge */}
                <AgeRatingBadge
                  ageRating={data.ageRating}
                  variant="inline"
                  size="md"
                />

                {/* Content tags */}
                {data.contentTags && data.contentTags.length > 0 && data.contentTags.map((ct) => (
                  <UITag
                    key={ct}
                    label={t(`characters:contentTags.${ct}`)}
                    tone="secondary"
                    selected
                    disabled
                  />
                ))}

                {/* Gender and species */}
                {data.gender && (
                  <UITag
                    label={t(`filters.genders.${data.gender.toLowerCase()}`, data.gender, { ns: 'dashboard' })}
                    selected
                    icon={<span className="material-symbols-outlined text-sm">{resolveGenderIcon(data.gender)}</span>}
                    disabled
                  />
                )}
                {data.species && (
                  <UITag
                    label={typeof data.species === 'object'
                      ? t(`species:${data.species.name}.name`, data.species.name)
                      : 'Unknown'}
                    selected
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
                    selected
                    icon={<span className="material-symbols-outlined text-sm">sell</span>}
                    disabled
                  />
                ))}
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

            {/* Gallery thumbnails - Only show if avatar/cover images exist */}
            {galleryImages.length > 0 && (
              <div className="mx-0 rounded-2xl bg-card p-4 shadow-lg">
                <h3 className="mb-3 text-sm font-semibold text-title">
                  {t('characters:detail.galleryImages', 'Gallery')}
                </h3>
                <div className="grid grid-cols-4 gap-2">
                  {galleryImages.map((img, i) => (
                    <div
                      key={img.id}
                      className="relative aspect-square overflow-hidden rounded-lg bg-gradient-to-br from-primary/20 to-secondary/20 transition-transform hover:scale-105"
                    >
                      <CachedImage
                        src={img.url}
                        alt={img.description || `${fullName} ${img.type.toLowerCase()} ${i + 1}`}
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

              {/* Description box with collapsible behavior */}
              <div
                className={`relative rounded-2xl border border-border bg-card p-6 ${isDescExpanded ? 'overflow-y-auto' : 'overflow-hidden'}`}
                style={{ maxHeight: descMaxHeight ?? undefined }}
              >
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

            {/* Creator + Update notes (combined) */}
            <div className="mx-0 rounded-2xl bg-card p-6 shadow-lg">
              <div className="grid grid-cols-1 gap-6 md:grid-cols-2 md:items-start md:gap-8 md:divide-x md:divide-border">
                {/* Creator info */}
                <div className="flex items-center gap-3 md:pr-6 min-w-0">
                  {data.creator?.avatarUrl ? (
                    <CachedImage
                      src={data.creator.avatarUrl}
                      alt={data.creator.username || data.creator.displayName || 'Creator'}
                      className="h-12 w-12 rounded-full object-cover"
                    />
                  ) : (
                    <div className="flex h-12 w-12 items-center justify-center rounded-full bg-primary/20">
                      <span className="text-base font-semibold text-primary">
                        {(data.creator?.username || data.creator?.displayName || 'U').charAt(0).toUpperCase()}
                      </span>
                    </div>
                  )}
                  <div className="flex-1 min-w-0">
                    <p className="text-sm text-muted">{t('characters:detail.labels.createdBy', 'Created by')}</p>
                    <p className="font-medium text-content">{data.creator?.username || t('common:anonymousUser', 'Anonymous')}</p>
                  </div>                 
                </div>

                {/* Metadata (created/updated) */}
                <div className="min-w-0 md:pl-6">
                  <div className="space-y-2 text-sm text-content">
                    <div className="flex items-start gap-2">
                      <span className="material-symbols-outlined text-base text-primary">event</span>
                      <span>
                        {t('characters:detail.labels.createdAt', 'Created')}: {data.createdAt ? new Date(data.createdAt).toLocaleDateString() : 'N/A'}
                      </span>
                    </div>
                    <div className="flex items-start gap-2">
                      <span className="material-symbols-outlined text-base text-primary">update</span>
                      <span>
                        {t('characters:detail.labels.updatedAt', 'Updated')}: {data.updatedAt ? new Date(data.updatedAt).toLocaleDateString() : 'N/A'}
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Delete Confirmation Dialog */}
      <Dialog
        isOpen={showDeleteDialog}
        onClose={() => setShowDeleteDialog(false)}
        title={t('characters:detail.confirmDelete.title')}
        description={t('characters:detail.confirmDelete.message')}
        severity="critical"
        actions={[
          {
            label: t('characters:detail.confirmDelete.cancel'),
            onClick: () => setShowDeleteDialog(false),
          },
          {
            label: deleteMutation.isPending
              ? t('characters:detail.actions.deleting')
              : t('characters:detail.confirmDelete.confirm'),
            onClick: handleDeleteConfirm,
            disabled: deleteMutation.isPending,
          },
        ]}
      />
    </>
  );
}
