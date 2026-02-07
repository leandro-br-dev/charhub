import { useMemo, useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate, useParams } from 'react-router-dom';
import { Button } from '../../../components/ui/Button';
import { CachedImage } from '../../../components/ui/CachedImage';
import { Tag as UITag, Dialog } from '../../../components/ui';
import { AgeRatingBadge } from '../../../components/ui/AgeRatingBadge';
import { useSceneDetailQuery, useSceneMutations } from '../shared/hooks/useSceneQueries';
import { useAuth } from '../../../hooks/useAuth';
import { usePageHeader } from '../../../hooks/usePageHeader';
import { useToast } from '../../../contexts/ToastContext';
import { Visibility } from '../../../types/common';
import type { Scene } from '../../../types/scenes';

export default function SceneDetailPage(): JSX.Element {
  const { t } = useTranslation(['scenes', 'common']);
  const navigate = useNavigate();
  const params = useParams<{ sceneId: string }>();
  const sceneId = params.sceneId ?? '';
  const { user } = useAuth();
  const { setTitle } = usePageHeader();
  const { addToast } = useToast();

  const { data, isLoading, isError } = useSceneDetailQuery(sceneId);
  const { deleteMutation } = useSceneMutations();
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);

  const scene = data;

  const isOwner = useMemo(() => {
    if (!user || !scene) return false;
    return user.id === scene.authorId;
  }, [user, scene]);

  const visibilityLabel = useMemo(() => {
    if (!scene) return '';
    switch (scene.visibility) {
      case Visibility.PUBLIC:
        return t('scenes:labels.public');
      case Visibility.PRIVATE:
        return t('scenes:labels.private');
      case Visibility.UNLISTED:
        return t('scenes:labels.unlisted');
      default:
        return scene.visibility;
    }
  }, [scene, t]);

  // Set page title
  useEffect(() => {
    if (scene) {
      setTitle(scene.name || t('scenes:labels.untitledScene'));
    }
  }, [setTitle, scene, t]);

  const handleDeleteClick = () => {
    setShowDeleteDialog(true);
  };

  const handleDeleteConfirm = async () => {
    if (!scene) return;
    try {
      await deleteMutation.mutateAsync(scene.id);
      addToast(t('scenes:messages.deleted'), 'success');
      navigate('/scenes/hub');
    } catch (error) {
      console.error('[SceneDetail] delete failed', error);
      addToast(t('scenes:messages.errorDeleting'), 'error');
    } finally {
      setShowDeleteDialog(false);
    }
  };

  const handleShare = () => {
    const url = window.location.href;
    if (navigator.share) {
      navigator.share({
        title: scene?.name || t('scenes:labels.untitledScene'),
        text: scene?.shortDescription || scene?.description || '',
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

  if (isLoading) {
    return (
      <section className="flex h-[60vh] flex-col items-center justify-center gap-3 text-muted">
        <span className="material-symbols-outlined animate-spin text-5xl">progress_activity</span>
        <p>{t('scenes:detail.states.loading', 'Loading scene...')}</p>
      </section>
    );
  }

  if (isError || !scene) {
    return (
      <section className="flex h-[60vh] flex-col items-center justify-center gap-3 text-muted">
        <span className="material-symbols-outlined text-5xl text-danger">error</span>
        <p>{t('scenes:detail.states.notFound', 'Scene not found')}</p>
        <Button type="button" onClick={() => navigate('/scenes/hub')} icon="arrow_back">
          {t('scenes:detail.actions.backToHub', 'Back to Scenes')}
        </Button>
      </section>
    );
  }

  const areaCount = scene.areas?.length ?? 0;

  return (
    <>
      <div className="-mx-4 -mt-8 md:mx-auto md:mt-0 md:max-w-7xl">
        <div className="grid gap-0 md:gap-6 lg:grid-cols-[420px_1fr]">
          {/* Left side - Scene image */}
          <div className="w-full space-y-4 md:w-full">
            <div className="relative overflow-hidden rounded-2xl bg-card shadow-lg border-2 border-border">
              <div className="relative aspect-[3/4] md:aspect-[3/4] w-full rounded-2xl overflow-hidden">
                {scene.coverImageUrl ? (
                  <CachedImage
                    src={scene.coverImageUrl}
                    alt={scene.name || t('scenes:labels.untitledScene')}
                    className="h-full w-full object-cover rounded-2xl"
                  />
                ) : (
                  <div className="flex h-full w-full items-center justify-center bg-gradient-to-br from-primary/20 to-secondary/20 rounded-2xl">
                    <span className="material-symbols-outlined text-9xl text-muted/30">landscape</span>
                  </div>
                )}

                {/* Gradient fade overlay */}
                <div className="pointer-events-none absolute inset-0 bg-gradient-to-b from-transparent via-transparent to-black/40" />
              </div>
            </div>
          </div>

          {/* Right side - Scene info */}
          <div className="relative z-10 -mt-12 space-y-4 md:mt-0">
            {/* Title and stats */}
            <div className="mx-0 rounded-2xl bg-card p-6 shadow-lg">
              <div className="mb-4 flex items-start justify-between gap-4">
                <h1 className="text-3xl font-bold text-title lg:text-4xl">
                  {scene.name || t('scenes:labels.untitledScene')}
                </h1>
                <div className="flex items-center gap-2">
                  <button
                    onClick={handleShare}
                    className="flex h-10 w-10 items-center justify-center rounded-lg text-content transition-colors hover:bg-input hover:text-primary"
                    aria-label="Share scene"
                  >
                    <span className="material-symbols-outlined text-xl">share</span>
                  </button>
                  {isOwner && (
                    <>
                      <button
                        onClick={() => navigate(`/scenes/${scene.id}/edit`)}
                        className="flex h-10 w-10 items-center justify-center rounded-lg text-content transition-colors hover:bg-input hover:text-primary"
                        aria-label="Edit scene"
                      >
                        <span className="material-symbols-outlined text-xl">edit</span>
                      </button>
                      <button
                        onClick={handleDeleteClick}
                        disabled={deleteMutation.isPending}
                        className="flex h-10 w-10 items-center justify-center rounded-lg text-danger transition-colors hover:bg-danger/10 disabled:opacity-50"
                        aria-label="Delete scene"
                      >
                        <span className="material-symbols-outlined text-xl">delete</span>
                      </button>
                    </>
                  )}
                </div>
              </div>

              {/* Tags */}
              <div className="mb-6 flex flex-wrap gap-2">
                {/* Visibility badge */}
                <UITag
                  label={visibilityLabel}
                  tone="secondary"
                  selected
                  disabled
                />

                {/* Age rating badge */}
                <AgeRatingBadge
                  ageRating={scene.ageRating}
                  variant="inline"
                  size="md"
                />

                {/* Content tags */}
                {scene.contentTags && scene.contentTags.length > 0 && scene.contentTags.map((ct) => (
                  <UITag
                    key={ct}
                    label={t(`scenes:contentTags.${ct}`)}
                    tone="secondary"
                    selected
                    disabled
                  />
                ))}
              </div>

              {/* Stats row */}
              <div className="mb-6 grid grid-cols-2 gap-4">
                <div>
                  <div className="text-2xl font-bold text-content">
                    {areaCount}
                  </div>
                  <div className="text-sm text-muted">
                    {areaCount === 1 ? t('scenes:stats.areas') : t('scenes:stats.areas')}
                  </div>
                </div>
                <div>
                  <div className="text-2xl font-bold text-content">
                    {scene.style || '—'}
                  </div>
                  <div className="text-sm text-muted">{t('scenes:form.fields.style')}</div>
                </div>
              </div>

              {/* Action button */}
              {isOwner && (
                <Button
                  type="button"
                  variant="primary"
                  icon="edit"
                  onClick={() => navigate(`/scenes/${scene.id}/edit`)}
                  className="w-full !rounded-xl !py-4 text-lg font-semibold shadow-lg transition-all hover:shadow-xl"
                >
                  {t('scenes:detail.actions.edit', 'Edit Scene')}
                </Button>
              )}
            </div>

            {/* Description */}
            <div className="mx-0 rounded-2xl bg-card p-6 shadow-lg">
              <h2 className="mb-4 text-xl font-semibold text-title">
                {t('scenes:detail.sections.description', 'Description')}
              </h2>
              <div className="space-y-4 text-sm leading-relaxed text-content">
                {scene.shortDescription && (
                  <p className="italic text-content/90">{scene.shortDescription}</p>
                )}
                <p className="whitespace-pre-line text-content/80">{scene.description}</p>
              </div>
            </div>

            {/* Classification */}
            {(scene.genre || scene.era || scene.mood) && (
              <div className="mx-0 rounded-2xl bg-card p-6 shadow-lg">
                <h2 className="mb-4 text-xl font-semibold text-title">
                  {t('scenes:detail.sections.classification', 'Classification')}
                </h2>
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
                  {scene.genre && (
                    <div>
                      <div className="text-sm text-muted">{t('scenes:form.fields.genre')}</div>
                      <div className="font-medium text-content">{t(`scenes:genres.${scene.genre}`, scene.genre)}</div>
                    </div>
                  )}
                  {scene.era && (
                    <div>
                      <div className="text-sm text-muted">{t('scenes:form.fields.era')}</div>
                      <div className="font-medium text-content">{t(`scenes:eras.${scene.era}`, scene.era)}</div>
                    </div>
                  )}
                  {scene.mood && (
                    <div>
                      <div className="text-sm text-muted">{t('scenes:form.fields.mood')}</div>
                      <div className="font-medium text-content">{t(`scenes:moods.${scene.mood}`, scene.mood)}</div>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Areas preview */}
            {scene.areas && scene.areas.length > 0 && (
              <div className="mx-0 rounded-2xl bg-card p-6 shadow-lg">
                <div className="mb-4 flex items-center justify-between">
                  <h2 className="text-xl font-semibold text-title">
                    {t('scenes:detail.sections.areas', 'Areas')}
                  </h2>
                  <span className="text-sm text-muted">{scene.areas.length}</span>
                </div>
                <div className="space-y-2">
                  {scene.areas.slice(0, 5).map((area) => (
                    <div
                      key={area.id}
                      className="flex items-center gap-3 rounded-lg bg-background p-3"
                    >
                      <span className="material-symbols-outlined text-primary">place</span>
                      <div className="flex-1 min-w-0">
                        <div className="font-medium text-content truncate">{area.name}</div>
                        {area.shortDescription && (
                          <div className="text-xs text-muted truncate">{area.shortDescription}</div>
                        )}
                      </div>
                    </div>
                  ))}
                  {scene.areas.length > 5 && (
                    <div className="text-center text-sm text-muted pt-2">
                      {t('scenes:detail.moreAreas', '+ {{count}} more areas', { count: scene.areas.length - 5 })}
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Creator + Metadata */}
            <div className="mx-0 rounded-2xl bg-card p-6 shadow-lg">
              <div className="grid grid-cols-1 gap-6 md:grid-cols-2 md:items-start md:gap-8 md:divide-x md:divide-border">
                {/* Creator info */}
                <div className="flex items-center gap-3 md:pr-6 min-w-0">
                  {scene.author?.avatarUrl ? (
                    <CachedImage
                      src={scene.author.avatarUrl}
                      alt={scene.author.username || scene.author.displayName || 'Creator'}
                      className="h-12 w-12 rounded-full object-cover"
                    />
                  ) : (
                    <div className="flex h-12 w-12 items-center justify-center rounded-full bg-primary/20">
                      <span className="text-base font-semibold text-primary">
                        {(scene.author?.username || scene.author?.displayName || 'U').charAt(0).toUpperCase()}
                      </span>
                    </div>
                  )}
                  <div className="flex-1 min-w-0">
                    <p className="text-sm text-muted">{t('scenes:detail.labels.createdBy', 'Created by')}</p>
                    <p className="font-medium text-content">
                      {scene.author?.username || t('common:anonymousUser', 'Anonymous')}
                    </p>
                  </div>
                </div>

                {/* Metadata (created/updated) */}
                <div className="min-w-0 md:pl-6">
                  <div className="space-y-2 text-sm text-content">
                    <div className="flex items-start gap-2">
                      <span className="material-symbols-outlined text-base text-primary">event</span>
                      <span>
                        {t('scenes:detail.labels.createdAt', 'Created')}: {scene.createdAt ? new Date(scene.createdAt).toLocaleDateString() : 'N/A'}
                      </span>
                    </div>
                    <div className="flex items-start gap-2">
                      <span className="material-symbols-outlined text-base text-primary">update</span>
                      <span>
                        {t('scenes:detail.labels.updatedAt', 'Updated')}: {scene.updatedAt ? new Date(scene.updatedAt).toLocaleDateString() : 'N/A'}
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
        title={t('scenes:detail.confirmDelete.title', 'Delete Scene?')}
        description={t('scenes:form.sceneDeleteConfirm', 'Are you sure you want to delete this scene? This will also delete all areas and cannot be undone.')}
        severity="critical"
        actions={[
          {
            label: t('scenes:detail.confirmDelete.cancel', 'Cancel'),
            onClick: () => setShowDeleteDialog(false),
          },
          {
            label: deleteMutation.isPending
              ? t('scenes:detail.actions.deleting', 'Deleting...')
              : t('scenes:detail.confirmDelete.confirm', 'Delete'),
            onClick: handleDeleteConfirm,
            disabled: deleteMutation.isPending,
          },
        ]}
      />
    </>
  );
}
