import { useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate, useParams } from 'react-router-dom';
import { Button } from '../../../components/ui/Button';
import { CachedImage } from '../../../components/ui/CachedImage';
import { useCharacterMutations, useCharacterQuery } from '../shared/hooks/useCharacterQueries';
import { chatService } from '../../../services/chatService';
import { useAuth } from '../../../hooks/useAuth';

export default function CharacterDetailPage(): JSX.Element {
  const { t } = useTranslation(['characters', 'common']);
  const navigate = useNavigate();
  const params = useParams<{ characterId: string }>();
  const characterId = params.characterId ?? '';
  const { user } = useAuth();

  const { data, isLoading, isError } = useCharacterQuery(characterId);
  const { deleteMutation } = useCharacterMutations();
  const [isStartingChat, setIsStartingChat] = useState(false);

  const fullName = useMemo(() => {
    if (!data) return '';
    const name = [data.firstName, data.lastName].filter(Boolean).join(' ');
    return name || t('characters:labels.untitledCharacter');
  }, [data, t]);

  const isOwner = useMemo(() => {
    return user?.id === data?.userId;
  }, [user, data]);

  // Mock data for stats (substituir com dados reais do backend no futuro)
  const messageCount = 0;
  const favoriteCount = 0;

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
        // Fallback to clipboard
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
    <section className="relative min-h-screen overflow-hidden">
      {/* Background image with blur */}
      <div className="absolute inset-0 -z-10">
        {data.avatar && (
          <div className="h-full w-full">
            <CachedImage
              src={data.avatar}
              alt=""
              className="h-full w-full object-cover opacity-20 blur-3xl"
            />
          </div>
        )}
        <div className="absolute inset-0 bg-gradient-to-b from-background/80 via-background/90 to-background" />
      </div>

      {/* Main content */}
      <div className="container mx-auto px-4 py-8 lg:px-8">
        <div className="mx-auto max-w-7xl">
          {/* Hero section with image and main info */}
          <div className="relative overflow-hidden rounded-3xl border border-border/50 bg-card/80 shadow-2xl backdrop-blur-md">
            <div className="grid gap-6 lg:grid-cols-[400px_1fr] lg:gap-8">
              {/* Left side - Cover image */}
              <div className="relative">
                <div className="relative aspect-[3/4] w-full overflow-hidden lg:h-[600px] lg:rounded-l-3xl">
                  {data.avatar ? (
                    <CachedImage
                      src={data.avatar}
                      alt={fullName}
                      className="h-full w-full object-cover"
                    />
                  ) : (
                    <div className="flex h-full w-full items-center justify-center bg-gradient-to-br from-primary/20 to-primary/5">
                      <span className="material-symbols-outlined text-9xl text-muted/30">person</span>
                    </div>
                  )}

                  {/* Age rating badge on image */}
                  <div className="absolute left-4 top-4">
                    <span className="inline-flex items-center gap-1.5 rounded-full bg-black/70 px-4 py-2 text-sm font-bold uppercase tracking-wide text-white backdrop-blur-sm">
                      <span className="material-symbols-outlined text-base">shield</span>
                      {t(`characters:ageRatings.${data.ageRating}`)}
                    </span>
                  </div>

                  {/* Stats overlay on image */}
                  <div className="absolute bottom-4 left-4 right-4 flex items-center justify-around gap-2 rounded-2xl bg-black/70 px-4 py-3 backdrop-blur-sm">
                    <div className="flex flex-col items-center">
                      <span className="material-symbols-outlined text-2xl text-white">chat_bubble</span>
                      <span className="mt-1 text-sm font-semibold text-white">{messageCount}</span>
                    </div>
                    <div className="h-8 w-px bg-white/30" />
                    <div className="flex flex-col items-center">
                      <span className="material-symbols-outlined text-2xl text-white">favorite</span>
                      <span className="mt-1 text-sm font-semibold text-white">{favoriteCount}</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Right side - Character info */}
              <div className="flex flex-col gap-6 p-6 lg:p-8">
                {/* Header with name and actions */}
                <div className="flex flex-col gap-4">
                  <div className="flex flex-wrap items-start justify-between gap-4">
                    <h1 className="text-4xl font-bold tracking-tight text-title lg:text-5xl">
                      {fullName}
                    </h1>
                    <div className="flex flex-wrap gap-2">
                      <Button
                        type="button"
                        variant="secondary"
                        icon="share"
                        size="small"
                        onClick={handleShare}
                        className="!rounded-full"
                      >
                        {t('characters:detail.actions.share')}
                      </Button>
                      {isOwner && (
                        <Button
                          type="button"
                          variant="secondary"
                          icon="edit"
                          size="small"
                          onClick={() => navigate(`/characters/${data.id}/edit`)}
                          className="!rounded-full"
                        >
                          {t('characters:detail.actions.edit')}
                        </Button>
                      )}
                    </div>
                  </div>

                  {/* Metadata row */}
                  <div className="flex flex-wrap items-center gap-x-4 gap-y-2 text-sm text-muted">
                    <div className="flex items-center gap-1.5">
                      <span className="material-symbols-outlined text-base">calendar_today</span>
                      <span>{new Date(data.createdAt).toLocaleDateString()}</span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <span className="material-symbols-outlined text-base">chat_bubble</span>
                      <span>{t('characters:detail.labels.messageCount', { count: messageCount })}</span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <span className="material-symbols-outlined text-base">favorite</span>
                      <span>{t('characters:detail.labels.favoriteCount', { count: favoriteCount })}</span>
                    </div>
                  </div>

                  {/* Quick info badges */}
                  <div className="flex flex-wrap gap-2">
                    {data.gender && (
                      <span className="inline-flex items-center gap-1.5 rounded-full bg-primary/10 px-3 py-1.5 text-sm font-medium text-primary">
                        <span className="material-symbols-outlined text-base">person</span>
                        {data.gender}
                      </span>
                    )}
                    {data.species && (
                      <span className="inline-flex items-center gap-1.5 rounded-full bg-secondary/10 px-3 py-1.5 text-sm font-medium text-secondary">
                        <span className="material-symbols-outlined text-base">stars</span>
                        {data.species}
                      </span>
                    )}
                    <span className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-sm font-medium ${
                      data.isPublic
                        ? 'bg-success/10 text-success'
                        : 'bg-warning/10 text-warning'
                    }`}>
                      <span className="material-symbols-outlined text-base">
                        {data.isPublic ? 'public' : 'lock'}
                      </span>
                      {data.isPublic
                        ? t('characters:detail.labels.public')
                        : t('characters:detail.labels.private')}
                    </span>
                  </div>
                </div>

                {/* Tags */}
                {data.tags && data.tags.length > 0 && (
                  <div className="space-y-2">
                    <h3 className="text-sm font-semibold uppercase tracking-wide text-muted">
                      {t('characters:detail.sections.metadata')}
                    </h3>
                    <div className="flex flex-wrap gap-2">
                      {data.tags.map(tag => (
                        <span
                          key={tag.id}
                          className="rounded-full border border-border bg-input px-3 py-1 text-sm text-content transition-colors hover:bg-input/70"
                        >
                          {tag.name}
                        </span>
                      ))}
                    </div>
                  </div>
                )}

                {/* Content warnings */}
                {data.contentTags && data.contentTags.length > 0 && (
                  <div className="space-y-2">
                    <h3 className="text-sm font-semibold uppercase tracking-wide text-muted">
                      {t('characters:detail.sections.contentTags')}
                    </h3>
                    <div className="flex flex-wrap gap-2">
                      {data.contentTags.map(tag => (
                        <span
                          key={tag}
                          className="inline-flex items-center gap-1.5 rounded-full border border-warning/30 bg-warning/10 px-3 py-1 text-xs font-semibold uppercase tracking-wide text-warning"
                        >
                          <span className="material-symbols-outlined text-sm">warning</span>
                          {t(`characters:contentTags.${tag}`)}
                        </span>
                      ))}
                    </div>
                  </div>
                )}

                {/* Character description - scrollable area */}
                <div className="flex-1 space-y-4 overflow-y-auto pr-2" style={{ maxHeight: '400px' }}>
                  {data.personality && (
                    <div className="space-y-2">
                      <h2 className="flex items-center gap-2 text-lg font-semibold text-title">
                        <span className="material-symbols-outlined">psychology</span>
                        {t('characters:detail.sections.personality')}
                      </h2>
                      <p className="text-sm leading-relaxed text-content">{data.personality}</p>
                    </div>
                  )}

                  {data.physicalCharacteristics && (
                    <div className="space-y-2">
                      <h2 className="flex items-center gap-2 text-lg font-semibold text-title">
                        <span className="material-symbols-outlined">face</span>
                        {t('characters:detail.sections.physicalCharacteristics')}
                      </h2>
                      <p className="text-sm leading-relaxed text-content">{data.physicalCharacteristics}</p>
                    </div>
                  )}

                  {data.history && (
                    <div className="space-y-2">
                      <h2 className="flex items-center gap-2 text-lg font-semibold text-title">
                        <span className="material-symbols-outlined">auto_stories</span>
                        {t('characters:detail.sections.history')}
                      </h2>
                      <p className="whitespace-pre-line text-sm leading-relaxed text-content">{data.history}</p>
                    </div>
                  )}
                </div>

                {/* Start chat button - always visible */}
                <div className="sticky bottom-0 border-t border-border bg-card/90 pt-4 backdrop-blur-sm">
                  <Button
                    type="button"
                    variant="primary"
                    icon="chat"
                    onClick={handleStartChat}
                    disabled={isStartingChat}
                    className="w-full !rounded-2xl !py-4 text-lg font-semibold shadow-lg transition-all hover:shadow-xl"
                  >
                    {isStartingChat
                      ? t('characters:detail.actions.startingChat')
                      : t('characters:detail.actions.startChat')}
                  </Button>
                </div>
              </div>
            </div>
          </div>

          {/* Additional actions (only for owner) */}
          {isOwner && (
            <div className="mt-6 flex justify-end">
              <Button
                type="button"
                variant="danger"
                icon="delete"
                size="small"
                onClick={handleDelete}
                disabled={deleteMutation.isPending}
                className="!rounded-full"
              >
                {deleteMutation.isPending
                  ? t('characters:detail.actions.deleting')
                  : t('characters:detail.actions.delete')}
              </Button>
            </div>
          )}
        </div>
      </div>
    </section>
  );
}
