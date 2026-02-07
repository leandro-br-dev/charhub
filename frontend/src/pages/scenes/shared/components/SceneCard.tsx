import { useMemo, useState, startTransition } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import { type SceneSummary, type Scene } from '../../../../types/scenes';
import { CachedImage } from '../../../../components/ui/CachedImage';
import { AgeRatingBadge } from '../../../../components/ui/AgeRatingBadge';
import { FavoriteButton } from '../../../../components/ui/FavoriteButton';

export interface SceneCardProps {
  scene: SceneSummary | Scene;
  to?: string;
  clickAction?: 'edit' | 'view';
  areaCount?: number;
}

export function SceneCard({
  scene,
  to,
  clickAction = 'view',
  areaCount,
}: SceneCardProps): JSX.Element | null {
  const { t } = useTranslation(['scenes', 'common'], { useSuspense: false });
  const navigate = useNavigate();
  const destination = to ?? `/scenes/${scene.id}`;

  const title = useMemo(() => {
    return scene.name || t('scenes:labels.untitledScene');
  }, [scene.name, t]);

  const subtitle = useMemo(() => {
    const parts: string[] = [];
    if (scene.genre) parts.push(t(`scenes:genres.${scene.genre}`, scene.genre));
    if (scene.era) parts.push(t(`scenes:eras.${scene.era}`, scene.era));
    if (scene.mood) parts.push(t(`scenes:moods.${scene.mood}`, scene.mood));
    return parts.join(' • ');
  }, [scene.genre, scene.era, scene.mood, t]);

  const resolvedAreaCount = areaCount ?? ('areaCount' in scene ? scene.areaCount : ('areas' in scene ? scene.areas?.length : 0));
  const displayAreaCount = resolvedAreaCount && resolvedAreaCount > 0 ? resolvedAreaCount : '—';

  const handleCardClick = (e: React.MouseEvent) => {
    // Don't navigate if clicking on actions
    if ((e.target as HTMLElement).closest('.scene-actions')) {
      return;
    }

    if (clickAction === 'edit') {
      startTransition(() => {
        navigate(`/scenes/${scene.id}/edit`);
      });
    } else if (clickAction === 'view') {
      startTransition(() => {
        navigate(destination);
      });
    }
  };

  return (
    <article
      onClick={handleCardClick}
      className="flex basis-[calc(50%-0.5rem)] sm:w-[180px] md:w-[192px] lg:w-[192px] max-w-[192px] flex-none cursor-pointer flex-col overflow-hidden rounded-lg bg-light shadow-md transition duration-300 hover:-translate-y-1 hover:shadow-xl self-stretch relative"
    >
      {/* Favorite button - top right corner */}
      <div className="scene-actions absolute top-2 right-2 z-10">
        <FavoriteButton sceneId={scene.id} size="medium" />
      </div>

      <div className="relative">
        {scene.coverImageUrl ? (
          <CachedImage
            src={scene.coverImageUrl}
            alt={title}
            loading="lazy"
            className="h-40 w-full rounded-t-lg object-cover"
          />
        ) : (
          <div className="flex h-40 w-full items-center justify-center rounded-t-lg bg-slate-100 text-6xl text-slate-400 dark:bg-slate-800 dark:text-slate-600">
            <span className="material-symbols-outlined text-6xl">landscape</span>
          </div>
        )}

        <AgeRatingBadge
          ageRating={scene.ageRating}
          variant="overlay"
          size="sm"
        />
      </div>

      <div className="flex flex-1 flex-col p-4">
        <h3 className="truncate text-lg font-bold text-content" title={title}>
          {title}
        </h3>

        {subtitle && (
          <p className="text-xs text-muted truncate mb-2">
            {subtitle}
          </p>
        )}

        {scene.shortDescription && (
          <p className="text-sm text-description line-clamp-2 mb-2">
            {scene.shortDescription}
          </p>
        )}

        {/* Stats footer */}
        <div className="mt-auto flex items-center justify-between border-t border-border pt-3 text-xs text-muted">
          <div className="flex items-center gap-1" title={t('scenes:labels.genre', 'Genre')}>
            <span className="material-symbols-outlined text-base">place</span>
            <span className="truncate max-w-[80px]">{scene.genre ? t(`scenes:genres.${scene.genre}`, scene.genre) : '—'}</span>
          </div>
          <div className="flex items-center gap-1" title={t('scenes:labels.style', 'Style')}>
            <span className="material-symbols-outlined text-base">palette</span>
            <span className="truncate max-w-[60px]">{scene.style || '—'}</span>
          </div>
        </div>
      </div>
    </article>
  );
}
