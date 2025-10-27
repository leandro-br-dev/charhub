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
  const messageCount = 380300;
  const favoriteCount = 12700;

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
    <div className="min-h-screen bg-background">
      {/* Header bar */}
      <div className="sticky top-0 z-10 flex items-center justify-between border-b border-border bg-card/95 px-4 py-3 backdrop-blur-sm">
        <button
          onClick={() => navigate('/characters')}
          className="flex items-center gap-2 text-content transition-colors hover:text-primary"
        >
          <span className="material-symbols-outlined">arrow_back</span>
        </button>
        <div className="flex items-center gap-2">
          <button
            onClick={handleShare}
            className="flex items-center gap-2 rounded-lg px-3 py-2 text-content transition-colors hover:bg-input"
          >
            <span className="material-symbols-outlined text-xl">share</span>
          </button>
          {isOwner && (
            <>
              <button
                onClick={() => navigate(`/characters/${data.id}/edit`)}
                className="flex items-center gap-2 rounded-lg px-3 py-2 text-content transition-colors hover:bg-input"
              >
                <span className="material-symbols-outlined text-xl">edit</span>
              </button>
              <button
                onClick={handleDelete}
                disabled={deleteMutation.isPending}
                className="flex items-center gap-2 rounded-lg px-3 py-2 text-danger transition-colors hover:bg-danger/10"
              >
                <span className="material-symbols-outlined text-xl">delete</span>
              </button>
            </>
          )}
        </div>
      </div>

      {/* Main content */}
      <div className="mx-auto max-w-7xl px-4 py-6 lg:px-8">
        <div className="grid gap-6 lg:grid-cols-[320px_1fr]">
          {/* Left side - Character card */}
          <div className="space-y-4">
            {/* Character image */}
            <div className="overflow-hidden rounded-2xl bg-card shadow-lg">
              <div className="relative aspect-[3/4]">
                {data.avatar ? (
                  <CachedImage
                    src={data.avatar}
                    alt={fullName}
                    className="h-full w-full object-cover"
                  />
                ) : (
                  <div className="flex h-full w-full items-center justify-center bg-gradient-to-br from-primary/20 to-secondary/20">
                    <span className="material-symbols-outlined text-9xl text-muted/30">person</span>
                  </div>
                )}
              </div>

              {/* Stats bar */}
              <div className="grid grid-cols-3 border-t border-border bg-card">
                <button className="flex flex-col items-center gap-1 border-r border-border px-4 py-3 transition-colors hover:bg-input">
                  <div className="flex items-center gap-1">
                    <span className="material-symbols-outlined text-xl text-primary">thumb_up</span>
                    <span className="text-lg font-semibold text-content">316</span>
                  </div>
                </button>
                <button className="flex flex-col items-center gap-1 border-r border-border px-4 py-3 transition-colors hover:bg-input">
                  <div className="flex items-center gap-1">
                    <span className="material-symbols-outlined text-xl text-primary">star</span>
                    <span className="text-lg font-semibold text-content">2.2K</span>
                  </div>
                </button>
                <button className="flex flex-col items-center gap-1 px-4 py-3 transition-colors hover:bg-input">
                  <div className="flex items-center gap-1">
                    <span className="material-symbols-outlined text-xl text-danger">favorite</span>
                    <span className="text-lg font-semibold text-content">1.2K</span>
                  </div>
                </button>
              </div>
            </div>

            {/* Supporters section (if owner) */}
            {isOwner && (
              <div className="rounded-2xl bg-card p-4 shadow-lg">
                <h3 className="mb-3 text-sm font-semibold text-title">
                  Apoiadores
                </h3>
                <div className="flex items-center gap-3">
                  <div className="flex h-12 w-12 items-center justify-center rounded-full bg-gradient-to-br from-primary to-secondary">
                    <span className="material-symbols-outlined text-2xl text-white">person_add</span>
                  </div>
                  <span className="text-sm text-muted">Seja o primeiro apoiador!</span>
                </div>
                <Button
                  type="button"
                  variant="primary"
                  className="mt-4 w-full !rounded-xl"
                  size="small"
                >
                  Personagem de suporte
                </Button>
              </div>
            )}
          </div>

          {/* Right side - Character info */}
          <div className="space-y-4">
            {/* Title and stats */}
            <div className="rounded-2xl bg-card p-6 shadow-lg">
              <h1 className="mb-4 text-3xl font-bold text-title lg:text-4xl">
                {fullName}
              </h1>

              {/* Stats row */}
              <div className="mb-6 grid grid-cols-3 gap-4">
                <div>
                  <div className="text-2xl font-bold text-content">{messageCount.toLocaleString()}</div>
                  <div className="text-sm text-muted">Mensagens</div>
                </div>
                <div>
                  <div className="text-2xl font-bold text-content">{favoriteCount.toLocaleString()}</div>
                  <div className="text-sm text-muted">Total de caracteres</div>
                </div>
                <div>
                  <div className="text-2xl font-bold text-content">{new Date(data.createdAt).toLocaleDateString()}</div>
                  <div className="text-sm text-muted">Criar tempo</div>
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
                  : 'Início o bate-papo'}
              </Button>
            </div>

            {/* Gallery thumbnails */}
            {data.avatar && (
              <div className="rounded-2xl bg-card p-4 shadow-lg">
                <div className="grid grid-cols-4 gap-2">
                  {[1, 2, 3, 4].map((i) => (
                    <div
                      key={i}
                      className="relative aspect-square overflow-hidden rounded-lg bg-gradient-to-br from-primary/20 to-secondary/20"
                    >
                      <CachedImage
                        src={data.avatar}
                        alt={`${fullName} ${i}`}
                        className="h-full w-full object-cover opacity-80"
                      />
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Introduction */}
            <div className="rounded-2xl bg-card p-6 shadow-lg">
              <h2 className="mb-4 text-xl font-semibold text-title">Introdução</h2>

              {/* Tags */}
              <div className="mb-4 flex flex-wrap gap-2">
                {/* Age rating badge */}
                <span className="inline-flex items-center gap-1.5 rounded-full bg-success/20 px-3 py-1.5 text-xs font-semibold text-success">
                  <span className="material-symbols-outlined text-sm">verified</span>
                  {t(`characters:ageRatings.${data.ageRating}`)}
                </span>

                {/* Content tags */}
                {data.contentTags && data.contentTags.length > 0 && data.contentTags.map(tag => (
                  <span
                    key={tag}
                    className="rounded-full bg-muted/20 px-3 py-1.5 text-xs font-medium text-muted"
                  >
                    {t(`characters:contentTags.${tag}`)}
                  </span>
                ))}

                {/* Regular tags */}
                {data.tags && data.tags.length > 0 && data.tags.map(tag => (
                  <span
                    key={tag.id}
                    className="rounded-full bg-muted/20 px-3 py-1.5 text-xs font-medium text-muted"
                  >
                    {tag.name}
                  </span>
                ))}

                {/* Gender and species */}
                {data.gender && (
                  <span className="rounded-full bg-muted/20 px-3 py-1.5 text-xs font-medium text-muted">
                    {data.gender}
                  </span>
                )}
                {data.species && (
                  <span className="rounded-full bg-muted/20 px-3 py-1.5 text-xs font-medium text-muted">
                    {data.species}
                  </span>
                )}
              </div>

              {/* Description box with gradient background */}
              <div className="rounded-2xl bg-gradient-to-br from-purple-100 to-pink-100 p-6 dark:from-purple-900/30 dark:to-pink-900/30">
                <div className="space-y-4 text-sm leading-relaxed">
                  {data.personality && (
                    <div>
                      <p className="italic text-content/90">"{data.personality.substring(0, 100)}..."</p>
                    </div>
                  )}

                  {data.history && (
                    <div className="max-h-[300px] overflow-y-auto pr-2">
                      <p className="whitespace-pre-line text-content/80">{data.history}</p>
                    </div>
                  )}

                  {data.physicalCharacteristics && (
                    <div>
                      <p className="text-content/80">{data.physicalCharacteristics}</p>
                    </div>
                  )}
                </div>

                {/* Expand button */}
                <button className="mt-4 flex items-center gap-1 text-sm font-medium text-primary hover:text-primary/80">
                  <span>Veja mais</span>
                  <span className="material-symbols-outlined text-base">expand_more</span>
                </button>
              </div>
            </div>

            {/* Update notes */}
            <div className="rounded-2xl bg-card p-6 shadow-lg">
              <div className="mb-2 flex items-center justify-between">
                <h2 className="text-xl font-semibold text-title">Nota de atualização</h2>
                <button className="text-sm font-medium text-primary hover:text-primary/80">
                  Veja mais →
                </button>
              </div>
              <div className="space-y-2 text-sm text-content">
                <div className="flex items-start gap-2">
                  <span className="text-primary">•</span>
                  <span>Última atualização: {new Date(data.updatedAt).toLocaleDateString()}</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
