import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { CachedImage } from '../../../../components/ui/CachedImage';
import { sceneService } from '../../../../services/sceneService';
import type { SceneSummary } from '../../../../types/scenes';
import { useAuth } from '../../../../hooks/useAuth';

type SceneListSidebarProps = {
  onLinkClick?: () => void;
};

interface SceneWithOwn extends SceneSummary {
  isOwn: boolean;
}

export function SceneListSidebar({ onLinkClick }: SceneListSidebarProps) {
  const [scenes, setScenes] = useState<SceneWithOwn[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { user } = useAuth();
  const { t } = useTranslation('scenes');

  useEffect(() => {
    const fetchScenes = async () => {
      // Only load if user is authenticated
      if (!user) {
        setScenes([]);
        setIsLoading(false);
        return;
      }

      try {
        setIsLoading(true);

        // Fetch user's own scenes, sorted by most recently updated
        const ownResponse = await sceneService.list({ public: false, limit: 15 });

        // Add own scenes with isOwn flag and sort by updatedAt (most recent first)
        const combined: SceneWithOwn[] = ownResponse.items
          .map(scene => ({
            ...scene,
            isOwn: scene.authorId === user.id,
          }))
          .sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime())
          .slice(0, 15);

        setScenes(combined);
      } catch (err) {
        setError(t('messages.errorLoading', 'Failed to load scenes.'));
        console.error(err);
      } finally {
        setIsLoading(false);
      }
    };
    fetchScenes();
  }, [user, t]);

  if (isLoading) {
    return <div className="p-4 text-sm text-muted">{t('hub.states.loading')}</div>;
  }

  if (error) {
    return <div className="p-4 text-sm text-danger">{error}</div>;
  }

  return (
    <div className="flex flex-col gap-2 py-4">
      <h3 className="text-xs font-semibold text-muted uppercase mb-3 px-4">
        {t('stats.scenes')}
      </h3>
      {scenes.length === 0 ? (
        <p className="text-sm text-muted px-4">
          {t('emptyStates.noScenes')}
        </p>
      ) : (
        <ul className="space-y-2">
          {scenes.map(scene => {
            const coverImageUrl = scene.coverImageUrl;
            return (
              <li key={scene.id}>
                <Link
                  to={`/scenes/${scene.id}`}
                  onClick={onLinkClick}
                  className="flex items-center gap-3 rounded-md p-2 hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors"
                >
                  {coverImageUrl ? (
                    <CachedImage
                      src={coverImageUrl}
                      alt={scene.name}
                      className="h-8 w-8 rounded-full object-cover"
                    />
                  ) : (
                    <div className="flex h-8 w-8 items-center justify-center rounded-full bg-slate-100 dark:bg-slate-800">
                      <span className="material-symbols-outlined text-sm text-slate-400 dark:text-slate-600">landscape</span>
                    </div>
                  )}
                  <div className="flex flex-col flex-grow min-w-0">
                    <span className="text-sm font-medium text-content truncate">{scene.name}</span>
                    <div className="flex items-center gap-1">
                      {scene.isOwn && (
                        <span className="text-xs text-muted">{t('sidebar.myScene')}</span>
                      )}
                      {scene.areaCount !== undefined && scene.areaCount > 0 && (
                        <span className="text-xs text-muted">
                          {scene.areaCount} {scene.areaCount === 1 ? t('stats.areas') : t('stats.areas')}
                        </span>
                      )}
                    </div>
                  </div>
                </Link>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
